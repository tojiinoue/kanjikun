import { NextResponse } from "next/server";

import { assertEventAdmin } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import { PaymentStatus } from "@prisma/client";

type ApprovePayload = {
  ownerClientId?: string | null;
};

type Params = {
  params: Promise<{ publicId: string; paymentId: string }>;
};

export async function POST(request: Request, { params }: Params) {
  const body = (await request.json()) as ApprovePayload;
  const { publicId, paymentId } = await params;

  const event = await prisma.event.findUnique({ where: { publicId } });
  if (!event) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const auth = await assertEventAdmin(event.id, body.ownerClientId);
  if (!auth.ok) {
    return NextResponse.json({ error: "Forbidden" }, { status: auth.status });
  }

  const payment = await prisma.payment.findFirst({
    where: { id: paymentId, eventId: event.id },
  });

  if (!payment) {
    return NextResponse.json({ error: "Payment missing" }, { status: 404 });
  }

  const attendance = await prisma.attendance.findFirst({
    where: { id: payment.attendanceId, eventId: event.id },
    select: { name: true },
  });

  if (!attendance) {
    return NextResponse.json({ error: "Payment missing" }, { status: 404 });
  }

  const attendances = await prisma.attendance.findMany({
    where: { eventId: event.id, name: attendance.name },
    select: { id: true },
  });

  const payments = await prisma.payment.findMany({
    where: {
      eventId: event.id,
      attendanceId: { in: attendances.map((item) => item.id) },
    },
  });

  if (payments.some((item) => item.status !== PaymentStatus.PENDING)) {
    return NextResponse.json({ error: "Not pending" }, { status: 409 });
  }

  const updated = await prisma.$transaction(
    payments.map((item) =>
      prisma.payment.update({
        where: { id: item.id },
        data: {
          status: PaymentStatus.APPROVED,
          approvedAt: new Date(),
        },
      })
    )
  );

  return NextResponse.json({ payments: updated });
}
