import { NextResponse } from "next/server";

import { assertEventAdmin } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import { ScheduleStatus } from "@prisma/client";

type CandidateInput = {
  id?: string;
  startsAt: string;
};

type CandidatesPayload = {
  candidates?: CandidateInput[];
  ownerClientId?: string | null;
};

type Params = {
  params: Promise<{ publicId: string }>;
};

export async function PUT(request: Request, { params }: Params) {
  const body = (await request.json()) as CandidatesPayload;
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

  if (event.scheduleStatus === ScheduleStatus.CONFIRMED) {
    return NextResponse.json({ error: "Schedule locked" }, { status: 409 });
  }

  const incoming = body.candidates ?? [];
  if (incoming.length === 0) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const existing = await prisma.candidateDate.findMany({
    where: { eventId: event.id },
  });
  const incomingIds = new Set(incoming.map((candidate) => candidate.id).filter(Boolean));

  await prisma.$transaction([
    ...incoming.map((candidate) => {
      const startsAt = new Date(candidate.startsAt);
      if (candidate.id) {
        return prisma.candidateDate.update({
          where: { id: candidate.id },
          data: { startsAt },
        });
      }
      return prisma.candidateDate.create({
        data: { eventId: event.id, startsAt },
      });
    }),
    ...existing
      .filter((candidate) => !incomingIds.has(candidate.id))
      .map((candidate) =>
        prisma.candidateDate.delete({
          where: { id: candidate.id },
        })
      ),
  ]);

  const updated = await prisma.candidateDate.findMany({
    where: { eventId: event.id },
    orderBy: { startsAt: "asc" },
  });

  return NextResponse.json({ candidateDates: updated });
}
