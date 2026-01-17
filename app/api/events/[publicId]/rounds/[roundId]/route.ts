import { NextResponse } from "next/server";

import { assertEventAdmin } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import { AccountingStatus } from "@prisma/client";

type DeletePayload = {
  ownerClientId?: string | null;
};

type Params = {
  params: Promise<{ publicId: string; roundId: string }>;
};

export async function DELETE(request: Request, { params }: Params) {
  const body = (await request.json()) as DeletePayload;
  const { publicId, roundId } = await params;

  const event = await prisma.event.findUnique({
    where: { publicId },
    include: { rounds: true },
  });

  if (!event) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const auth = await assertEventAdmin(event.id, body.ownerClientId);
  if (!auth.ok) {
    return NextResponse.json({ error: "Forbidden" }, { status: auth.status });
  }

  const round = event.rounds.find((item) => item.id === roundId);
  if (!round) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (round.order === 1) {
    return NextResponse.json({ error: "Primary round" }, { status: 409 });
  }

  const remaining = event.rounds
    .filter((item) => item.id !== roundId)
    .sort((a, b) => a.order - b.order);
  const updates = remaining.map((item, index) => ({
    id: item.id,
    order: index + 1,
    name: `${index + 1}次会`,
    accountingStatus: item.accountingStatus,
    totalAmount: item.totalAmount ?? 0,
  }));
  const allConfirmed = updates.every(
    (item) => item.accountingStatus === AccountingStatus.CONFIRMED
  );
  const totalSum = updates.reduce((sum, item) => sum + item.totalAmount, 0);

  await prisma.$transaction([
    prisma.payment.deleteMany({
      where: { eventId: event.id, roundId },
    }),
    prisma.attendance.deleteMany({
      where: { eventId: event.id, roundId },
    }),
    prisma.eventRound.delete({
      where: { id: roundId },
    }),
    ...updates.map((item) =>
      prisma.eventRound.update({
        where: { id: item.id },
        data: {
          order: item.order,
          name: item.name,
        },
      })
    ),
    prisma.event.update({
      where: { id: event.id },
      data: {
        accountingStatus: allConfirmed
          ? AccountingStatus.CONFIRMED
          : AccountingStatus.PENDING,
        totalAmount: allConfirmed ? totalSum : null,
        perPersonAmount: null,
      },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
