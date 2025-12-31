import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { VoteResponse } from "@prisma/client";

type VoteChoiceInput = {
  candidateDateId: string;
  response: VoteResponse;
};

type VotePayload = {
  name?: string;
  comment?: string | null;
  choices?: VoteChoiceInput[];
};

type Params = {
  params: Promise<{ publicId: string; voteId: string }>;
};

export async function PATCH(request: Request, { params }: Params) {
  const body = (await request.json()) as VotePayload;
  const { publicId, voteId } = await params;

  const event = await prisma.event.findUnique({
    where: { publicId },
    include: { candidateDates: true },
  });

  if (!event) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (event.votingLocked) {
    return NextResponse.json({ error: "Voting locked" }, { status: 403 });
  }

  const vote = await prisma.vote.findFirst({
    where: { id: voteId, eventId: event.id },
  });

  if (!vote) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const name = body.name?.trim();
  const comment = body.comment?.trim() || null;
  const choices = body.choices ?? [];

  if (!name || choices.length === 0) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const candidateIds = new Set(event.candidateDates.map((c) => c.id));
  const invalidChoice = choices.find(
    (choice) => !candidateIds.has(choice.candidateDateId)
  );
  if (invalidChoice) {
    return NextResponse.json({ error: "Invalid candidate" }, { status: 400 });
  }

  const updated = await prisma.$transaction(async (tx) => {
    await tx.voteChoice.deleteMany({ where: { voteId } });
    return tx.vote.update({
      where: { id: voteId },
      data: {
        name,
        comment,
        choices: {
          create: choices.map((choice) => ({
            candidateDateId: choice.candidateDateId,
            response: choice.response,
          })),
        },
      },
      include: { choices: true },
    });
  });

  return NextResponse.json({ vote: updated });
}

export async function DELETE(_: Request, { params }: Params) {
  const { publicId, voteId } = await params;

  const event = await prisma.event.findUnique({
    where: { publicId },
  });

  if (!event) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (event.votingLocked) {
    return NextResponse.json({ error: "Voting locked" }, { status: 403 });
  }

  const vote = await prisma.vote.findFirst({
    where: { id: voteId, eventId: event.id },
  });

  if (!vote) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.vote.delete({ where: { id: voteId } });

  return NextResponse.json({ ok: true });
}
