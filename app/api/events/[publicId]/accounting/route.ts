import { NextResponse } from "next/server";

import { assertEventAdmin } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import { AccountingStatus, PaymentStatus } from "@prisma/client";

type Adjustment = {
  attendanceId: string;
  amount: number;
};

type AccountingPayload = {
  totalAmount?: number;
  adjustments?: Adjustment[];
  ownerClientId?: string | null;
};

type Params = {
  params: Promise<{ publicId: string }>;
};

function ceilDivide(total: number, count: number) {
  return Math.ceil(total / count);
}

export async function POST(request: Request, { params }: Params) {
  const body = (await request.json()) as AccountingPayload;
  const { publicId } = await params;
  const event = await prisma.event.findUnique({
    where: { publicId },
  });

  if (!event) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const auth = await assertEventAdmin(event.id, body.ownerClientId);
  if (!auth.ok) {
    return NextResponse.json({ error: "Forbidden" }, { status: auth.status });
  }

  if (event.accountingStatus === AccountingStatus.CONFIRMED) {
    return NextResponse.json({ error: "Already confirmed" }, { status: 409 });
  }

  if (!body.totalAmount || body.totalAmount <= 0) {
    return NextResponse.json({ error: "Invalid total" }, { status: 400 });
  }

  const actualAttendances = await prisma.attendance.findMany({
    where: { eventId: event.id, isActual: true },
  });

  if (actualAttendances.length === 0) {
    return NextResponse.json({ error: "No actual attendance" }, { status: 400 });
  }

  const adjustments = new Map(
    (body.adjustments ?? [])
      .filter(
        (adjustment) =>
          Number.isFinite(adjustment.amount) && adjustment.amount >= 0
      )
      .map((adjustment) => [adjustment.attendanceId, adjustment.amount])
  );
  const totalAdjustments = Array.from(adjustments.values()).reduce(
    (sum, amount) => sum + amount,
    0
  );
  const remainingCount = Math.max(
    0,
    actualAttendances.length - adjustments.size
  );
  const remainingTotal = Math.round(body.totalAmount) - totalAdjustments;

  if (remainingTotal < 0) {
    return NextResponse.json({ error: "Invalid adjustments" }, { status: 400 });
  }
  if (remainingCount === 0 && remainingTotal !== 0) {
    return NextResponse.json({ error: "Invalid adjustments" }, { status: 400 });
  }

  const perPerson =
    remainingCount > 0 ? ceilDivide(remainingTotal, remainingCount) : 0;

  await prisma.$transaction([
    prisma.event.update({
      where: { id: event.id },
      data: {
        totalAmount: Math.round(body.totalAmount),
        perPersonAmount: perPerson,
        accountingStatus: AccountingStatus.CONFIRMED,
      },
    }),
    ...actualAttendances.map((attendance) =>
      prisma.payment.upsert({
        where: { attendanceId: attendance.id },
        update: {
          amount: adjustments.get(attendance.id) ?? perPerson,
          status: PaymentStatus.UNSUBMITTED,
        },
        create: {
          eventId: event.id,
          attendanceId: attendance.id,
          amount: adjustments.get(attendance.id) ?? perPerson,
          status: PaymentStatus.UNSUBMITTED,
        },
      })
    ),
  ]);

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request, { params }: Params) {
  const body = (await request.json()) as AccountingPayload;
  const { publicId } = await params;
  const event = await prisma.event.findUnique({
    where: { publicId },
  });

  if (!event) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const auth = await assertEventAdmin(event.id, body.ownerClientId);
  if (!auth.ok) {
    return NextResponse.json({ error: "Forbidden" }, { status: auth.status });
  }

  if (event.accountingStatus !== AccountingStatus.CONFIRMED) {
    return NextResponse.json({ error: "Not confirmed" }, { status: 409 });
  }

  await prisma.$transaction([
    prisma.payment.deleteMany({
      where: { eventId: event.id },
    }),
    prisma.event.update({
      where: { id: event.id },
      data: {
        totalAmount: null,
        perPersonAmount: null,
        accountingStatus: AccountingStatus.PENDING,
      },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
