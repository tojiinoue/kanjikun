import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getServerAuthSession } from "@/lib/session";

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
