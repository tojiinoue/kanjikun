import { NextResponse } from "next/server";

import { assertEventAdmin } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import {
  AccountingStatus,
  ScheduleStatus,
  AttendanceSource,
  VoteResponse,
} from "@prisma/client";

type SchedulePayload = {
  candidateDateId?: string;
  ownerClientId?: string | null;
};

type Params = {
  params: Promise<{ publicId: string }>;
};

export async function POST(request: Request, { params }: Params) {
  const body = (await request.json()) as SchedulePayload;
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

  if (!body.candidateDateId) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  if (event.scheduleStatus === ScheduleStatus.CONFIRMED) {
    return NextResponse.json({ error: "Already confirmed" }, { status: 409 });
  }

  const candidate = await prisma.candidateDate.findFirst({
    where: { id: body.candidateDateId, eventId: event.id },
  });

  if (!candidate) {
    return NextResponse.json({ error: "Invalid candidate" }, { status: 400 });
  }

  const votes = await prisma.vote.findMany({
    where: { eventId: event.id },
    include: {
      choices: true,
    },
  });

  const attendanceData = votes
    .filter((vote) =>
      vote.choices.some(
        (choice) =>
          choice.candidateDateId === body.candidateDateId &&
          (choice.response === VoteResponse.YES ||
            choice.response === VoteResponse.MAYBE)
      )
    )
    .map((vote) => ({
      eventId: event.id,
      name: vote.name,
      source: AttendanceSource.VOTE,
    }));

  const formattedSchedule = new Date(candidate.startsAt).toISOString();

  await prisma.$transaction([
    prisma.event.update({
      where: { id: event.id },
      data: {
        confirmedCandidateDateId: body.candidateDateId,
        scheduleStatus: ScheduleStatus.CONFIRMED,
        shopSchedule: event.shopSchedule ?? formattedSchedule,
      },
    }),
    prisma.attendance.createMany({
      data: attendanceData,
      skipDuplicates: false,
    }),
  ]);

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request, { params }: Params) {
  const body = (await request.json()) as SchedulePayload;
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

  if (event.scheduleStatus !== ScheduleStatus.CONFIRMED) {
    return NextResponse.json({ error: "Not confirmed" }, { status: 409 });
  }

  await prisma.$transaction([
    prisma.payment.deleteMany({ where: { eventId: event.id } }),
    prisma.attendance.deleteMany({ where: { eventId: event.id } }),
    prisma.event.update({
      where: { id: event.id },
      data: {
        confirmedCandidateDateId: null,
        scheduleStatus: ScheduleStatus.PENDING,
        accountingStatus: AccountingStatus.PENDING,
        totalAmount: null,
        perPersonAmount: null,
      },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
