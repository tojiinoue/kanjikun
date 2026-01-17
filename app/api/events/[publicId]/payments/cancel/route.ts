import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { PaymentStatus } from "@prisma/client";

type CancelPayload = {
  attendanceId?: string;
  attendeeName?: string;
};

type Params = {
  params: Promise<{ publicId: string }>;
};

export async function POST(request: Request, { params }: Params) {
  const body = (await request.json()) as CancelPayload;
  const { publicId } = await params;

  if (!body.attendanceId && !body.attendeeName) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const event = await prisma.event.findUnique({
    where: { publicId },
  });

  if (!event) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let attendeeName = body.attendeeName?.trim();
  if (!attendeeName && body.attendanceId) {
    const attendance = await prisma.attendance.findFirst({
      where: { id: body.attendanceId, eventId: event.id },
      select: { name: true },
    });
    attendeeName = attendance?.name;
  }

  if (!attendeeName) {
    return NextResponse.json({ error: "Payment missing" }, { status: 404 });
  }

  const attendances = await prisma.attendance.findMany({
    where: { eventId: event.id, name: attendeeName },
    select: { id: true },
  });

  const payments = await prisma.payment.findMany({
    where: {
      eventId: event.id,
      attendanceId: { in: attendances.map((attendance) => attendance.id) },
    },
  });

  if (payments.length === 0) {
    return NextResponse.json({ error: "Payment missing" }, { status: 404 });
  }

  if (payments.some((payment) => payment.status !== PaymentStatus.PENDING)) {
    return NextResponse.json({ error: "Not pending" }, { status: 409 });
  }

  const updated = await prisma.$transaction(
    payments.map((payment) =>
      prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.UNSUBMITTED,
          method: null,
          appliedAt: null,
        },
      })
    )
  );

  return NextResponse.json({ payments: updated });
}
