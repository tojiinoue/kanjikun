import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { notifyNewVote } from "@/lib/notifications";
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
  params: Promise<{ publicId: string }>;
};

export async function POST(request: Request, { params }: Params) {
  const body = (await request.json()) as VotePayload;
  const { publicId } = await params;

  const event = await prisma.event.findUnique({
    where: { publicId },
    include: { candidateDates: true, ownerUser: true },
  });

  if (!event) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (event.votingLocked) {
    return NextResponse.json({ error: "Voting locked" }, { status: 403 });
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

  const vote = await prisma.vote.create({
    data: {
      eventId: event.id,
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

  if (event.ownerUser?.email) {
    void notifyNewVote(
      {
        name: event.name,
        publicId: event.publicId,
        ownerEmail: event.ownerUser.email,
      },
      { name: vote.name, comment: vote.comment }
    ).catch(() => null);
  }

  return NextResponse.json({ vote }, { status: 201 });
}
