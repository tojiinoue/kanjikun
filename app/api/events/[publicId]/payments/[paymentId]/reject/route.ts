import { NextResponse } from "next/server";

import { assertEventAdmin } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import { PaymentStatus } from "@prisma/client";

type RejectPayload = {
  ownerClientId?: string | null;
};

type Params = {
  params: Promise<{ publicId: string; paymentId: string }>;
};

export async function POST(request: Request, { params }: Params) {
  const body = (await request.json()) as RejectPayload;
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

  if (payment.status !== PaymentStatus.PENDING) {
    return NextResponse.json({ error: "Not pending" }, { status: 409 });
  }

  const updated = await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: PaymentStatus.UNSUBMITTED,
      method: null,
      appliedAt: null,
      approvedAt: null,
    },
  });

  return NextResponse.json({ payment: updated });
}
