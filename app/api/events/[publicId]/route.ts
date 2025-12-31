import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getServerAuthSession } from "@/lib/session";
import { assertEventAdmin } from "@/lib/authorization";

type Params = {
  params: Promise<{ publicId: string }>;
};

export async function GET(_: Request, { params }: Params) {
  const { publicId } = await params;
  const session = await getServerAuthSession();
  const event = await prisma.event.findUnique({
    where: { publicId },
    include: {
      candidateDates: true,
      votes: {
        include: {
          choices: true,
        },
      },
      attendances: true,
      payments: true,
    },
  });

  if (!event) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const isOwnerUser =
    Boolean(session?.user?.id) && session?.user?.id === event.ownerUserId;

  return NextResponse.json({
    publicId: event.publicId,
    name: event.name,
    memo: event.memo,
    votingLocked: event.votingLocked,
    scheduleStatus: event.scheduleStatus,
    confirmedCandidateDateId: event.confirmedCandidateDateId,
    accountingStatus: event.accountingStatus,
    totalAmount: event.totalAmount,
    perPersonAmount: event.perPersonAmount,
    candidateDates: event.candidateDates,
    votes: event.votes,
    attendances: event.attendances,
    payments: event.payments,
    isOwnerUser,
  });
}

type UpdatePayload = {
  name?: string;
  memo?: string | null;
  ownerClientId?: string | null;
};

export async function PATCH(request: Request, { params }: Params) {
  const { publicId } = await params;
  const body = (await request.json()) as UpdatePayload;
  const name = body.name?.trim();
  const memo = body.memo?.trim() || null;

  if (!name) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const event = await prisma.event.findUnique({
    where: { publicId },
    select: { id: true },
  });

  if (!event) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const auth = await assertEventAdmin(event.id, body.ownerClientId);
  if (!auth.ok) {
    return NextResponse.json({ error: "Forbidden" }, { status: auth.status });
  }

  const updated = await prisma.event.update({
    where: { id: event.id },
    data: {
      name,
      memo,
    },
  });

  return NextResponse.json({
    publicId: updated.publicId,
    name: updated.name,
    memo: updated.memo,
  });
}
