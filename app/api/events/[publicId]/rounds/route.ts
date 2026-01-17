import { NextResponse } from "next/server";

import { assertEventAdmin } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import { AttendanceSource } from "@prisma/client";

type RoundPayload = {
  name?: string;
  ownerClientId?: string | null;
};

type Params = {
  params: Promise<{ publicId: string }>;
};

export async function POST(request: Request, { params }: Params) {
  const body = (await request.json()) as RoundPayload;
  const { publicId } = await params;

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

  const nextOrder =
    event.rounds.reduce((max, round) => Math.max(max, round.order), 0) + 1;
  const name = body.name?.trim() || `${nextOrder}次会`;

  const round = await prisma.eventRound.create({
    data: {
      eventId: event.id,
      order: nextOrder,
      name,
    },
  });

  const baseRound = event.rounds.find((item) => item.order === 1);
  if (baseRound) {
    const baseAttendances = await prisma.attendance.findMany({
      where: { eventId: event.id, roundId: baseRound.id },
      select: { name: true },
    });
    if (baseAttendances.length > 0) {
      await prisma.attendance.createMany({
        data: baseAttendances.map((attendance) => ({
          eventId: event.id,
          roundId: round.id,
          name: attendance.name,
          isActual: false,
          source: AttendanceSource.MANUAL,
        })),
        skipDuplicates: false,
      });
    }
  }

  return NextResponse.json({ round });
}
