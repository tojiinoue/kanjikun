import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { notifyPaymentApplied } from "@/lib/notifications";
import { AccountingStatus, PaymentMethod, PaymentStatus } from "@prisma/client";

type ApplyPayload = {
  attendanceId?: string;
  attendeeName?: string;
  method?: PaymentMethod;
};

type Params = {
  params: Promise<{ publicId: string }>;
};

export async function POST(request: Request, { params }: Params) {
  const body = (await request.json()) as ApplyPayload;
  const { publicId } = await params;

  if ((!body.attendanceId && !body.attendeeName) || !body.method) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const event = await prisma.event.findUnique({
    where: { publicId },
    include: { ownerUser: true },
  });

  if (!event) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let attendeeName = body.attendeeName?.trim();
  if (!attendeeName && body.attendanceId) {
    const attendance = await prisma.attendance.findFirst({
      where: { id: body.attendanceId, eventId: event.id },
      select: { name: true, isActual: true },
    });
    if (!attendance || !attendance.isActual) {
      return NextResponse.json({ error: "Not eligible" }, { status: 403 });
    }
    attendeeName = attendance.name;
  }

  if (!attendeeName) {
    return NextResponse.json({ error: "Not eligible" }, { status: 403 });
  }

  const attendances = await prisma.attendance.findMany({
    where: { eventId: event.id, name: attendeeName, isActual: true },
    select: { id: true, roundId: true },
  });

  if (attendances.length === 0) {
    return NextResponse.json({ error: "Not eligible" }, { status: 403 });
  }

  const rounds = await prisma.eventRound.findMany({
    where: { eventId: event.id },
    select: { id: true, accountingStatus: true },
  });
  const roundStatusById = new Map(
    rounds.map((round) => [round.id, round.accountingStatus])
  );
  const hasPendingRound = attendances.some(
    (attendance) =>
      roundStatusById.get(attendance.roundId) !== AccountingStatus.CONFIRMED
  );
  if (hasPendingRound) {
    return NextResponse.json({ error: "Accounting pending" }, { status: 409 });
  }

  const payments = await prisma.payment.findMany({
    where: {
      eventId: event.id,
      attendanceId: { in: attendances.map((attendance) => attendance.id) },
    },
  });

  if (payments.length === 0) {
    return NextResponse.json({ error: "Payment missing" }, { status: 404 });
  }

  if (payments.some((payment) => payment.status === PaymentStatus.APPROVED)) {
    return NextResponse.json({ error: "Already approved" }, { status: 409 });
  }

  if (payments.some((payment) => payment.status === PaymentStatus.PENDING)) {
    return NextResponse.json({ error: "Already pending" }, { status: 409 });
  }

  const updated = await prisma.$transaction(
    payments.map((payment) =>
      prisma.payment.update({
        where: { id: payment.id },
        data: {
          method: body.method,
          status: PaymentStatus.PENDING,
          appliedAt: new Date(),
        },
      })
    )
  );
  const totalAmount = updated.reduce((sum, payment) => sum + payment.amount, 0);

  if (event.ownerUser?.email) {
    void notifyPaymentApplied(
      {
        name: event.name,
        publicId: event.publicId,
        ownerEmail: event.ownerUser.email,
      },
      { amount: totalAmount, method: body.method },
      attendeeName
    ).catch(() => null);
  }

  return NextResponse.json({ payments: updated });
}
