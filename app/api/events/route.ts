import { NextResponse } from "next/server";
import { randomUUID } from "crypto";

import { prisma } from "@/lib/prisma";
import { getServerAuthSession } from "@/lib/session";

type CandidateInput = {
  startsAt: string;
};

type CreateEventPayload = {
  name?: string;
  memo?: string | null;
  candidates?: CandidateInput[];
  ownerClientId?: string | null;
};

export async function POST(request: Request) {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as CreateEventPayload;
  const name = body.name?.trim();
  const memo = body.memo?.trim() || null;
  const candidates = body.candidates ?? [];
  const ownerClientId = body.ownerClientId?.trim() || null;

  if (!name || candidates.length === 0) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const event = await prisma.event.create({
    data: {
      name,
      memo,
      publicId: randomUUID(),
      ownerUserId: session.user.id,
      ownerClientId,
      candidateDates: {
        create: candidates.map((candidate) => ({
          startsAt: new Date(candidate.startsAt),
        })),
      },
    },
    include: {
      candidateDates: true,
    },
  });

  return NextResponse.json(
    {
      id: event.id,
      publicId: event.publicId,
      name: event.name,
      memo: event.memo,
      candidateDates: event.candidateDates,
    },
    { status: 201 }
  );
}
