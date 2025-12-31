import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { notifyPaymentApplied } from "@/lib/notifications";
import { AccountingStatus, PaymentMethod, PaymentStatus } from "@prisma/client";

type ApplyPayload = {
  attendanceId?: string;
  method?: PaymentMethod;
};

type Params = {
  params: Promise<{ publicId: string }>;
};

export async function POST(request: Request, { params }: Params) {
  const body = (await request.json()) as ApplyPayload;
  const { publicId } = await params;

  if (!body.attendanceId || !body.method) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const event = await prisma.event.findUnique({
    where: { publicId },
    include: { ownerUser: true },
  });

  if (!event) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (event.accountingStatus !== AccountingStatus.CONFIRMED) {
    return NextResponse.json({ error: "Accounting pending" }, { status: 409 });
  }

  const attendance = await prisma.attendance.findFirst({
    where: { id: body.attendanceId, eventId: event.id },
  });

  if (!attendance || !attendance.isActual) {
    return NextResponse.json({ error: "Not eligible" }, { status: 403 });
  }

  const payment = await prisma.payment.findFirst({
    where: { attendanceId: body.attendanceId, eventId: event.id },
  });

  if (!payment) {
    return NextResponse.json({ error: "Payment missing" }, { status: 404 });
  }

  if (payment.status === PaymentStatus.APPROVED) {
    return NextResponse.json({ error: "Already approved" }, { status: 409 });
  }

  const updated = await prisma.payment.update({
    where: { id: payment.id },
    data: {
      method: body.method,
      status: PaymentStatus.PENDING,
      appliedAt: new Date(),
    },
  });

  if (event.ownerUser?.email) {
    void notifyPaymentApplied(
      {
        name: event.name,
        publicId: event.publicId,
        ownerEmail: event.ownerUser.email,
      },
      { amount: updated.amount, method: updated.method },
      attendance.name
    ).catch(() => null);
  }

  return NextResponse.json({ payment: updated });
}
