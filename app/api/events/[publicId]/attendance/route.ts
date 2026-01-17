import { NextResponse } from "next/server";

import { assertEventAdmin } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import { AttendanceSource } from "@prisma/client";

type AttendanceUpdate = {
  id: string;
  isActual: boolean;
};

type AttendanceAddition = {
  name: string;
};

type AttendancePayload = {
  updates?: AttendanceUpdate[];
  additions?: AttendanceAddition[];
  roundId?: string;
  ownerClientId?: string | null;
};

type Params = {
  params: Promise<{ publicId: string }>;
};

export async function POST(request: Request, { params }: Params) {
  const body = (await request.json()) as AttendancePayload;
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

  const updates = body.updates ?? [];
  const additions = body.additions ?? [];
  const roundId = body.roundId?.trim() ?? null;

  if (additions.length > 0 && !roundId) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  if (roundId) {
    const round = await prisma.eventRound.findFirst({
      where: { id: roundId, eventId: event.id },
      select: { id: true },
    });
    if (!round) {
      return NextResponse.json({ error: "Invalid round" }, { status: 400 });
    }
  }

  await prisma.$transaction([
    ...updates.map((update) =>
      prisma.attendance.update({
        where: { id: update.id },
        data: { isActual: update.isActual },
      })
    ),
    ...additions
      .filter((addition) => addition.name.trim().length > 0)
      .map((addition) =>
        prisma.attendance.create({
          data: {
            eventId: event.id,
            roundId: roundId as string,
            name: addition.name.trim(),
            source: AttendanceSource.MANUAL,
            isActual: true,
          },
        })
      ),
  ]);

  return NextResponse.json({ ok: true });
}
