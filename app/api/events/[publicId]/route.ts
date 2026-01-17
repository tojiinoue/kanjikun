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
      ownerUser: {
        select: { paypayId: true },
      },
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
    shopSchedule: event.shopSchedule,
    shopName: event.shopName,
    shopUrl: event.shopUrl,
    courseName: event.courseName,
    courseUrl: event.courseUrl,
    shopAddress: event.shopAddress,
    shopPrice: event.shopPrice,
    areaPrefCode: event.areaPrefCode,
    areaMunicipalityName: event.areaMunicipalityName,
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
    ownerPaypayId: event.ownerUser?.paypayId ?? null,
    isOwnerUser,
  });
}

type UpdatePayload = {
  name?: string;
  memo?: string | null;
  shopSchedule?: string | null;
  shopName?: string | null;
  shopUrl?: string | null;
  courseName?: string | null;
  courseUrl?: string | null;
  shopAddress?: string | null;
  shopPrice?: string | null;
  areaPrefCode?: string | null;
  areaMunicipalityName?: string | null;
  ownerClientId?: string | null;
};

export async function PATCH(request: Request, { params }: Params) {
  const { publicId } = await params;
  const body = (await request.json()) as UpdatePayload;
  const name = body.name?.trim();
  const memo = body.memo?.trim() || null;
  const shopSchedule = body.shopSchedule?.trim() || null;
  const shopName = body.shopName?.trim() || null;
  const shopUrl = body.shopUrl?.trim() || null;
  const courseName = body.courseName?.trim() || null;
  const courseUrl = body.courseUrl?.trim() || null;
  const shopAddress = body.shopAddress?.trim() || null;
  const shopPrice = body.shopPrice?.trim() || null;
  const areaPrefCode = body.areaPrefCode?.trim() || null;
  const areaMunicipalityName = body.areaMunicipalityName?.trim() || null;

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
      shopSchedule,
      shopName,
      shopUrl,
      courseName,
      courseUrl,
      shopAddress,
      shopPrice,
      areaPrefCode,
      areaMunicipalityName,
    },
  });

  return NextResponse.json({
    publicId: updated.publicId,
    name: updated.name,
    memo: updated.memo,
    shopSchedule: updated.shopSchedule,
    shopName: updated.shopName,
    shopUrl: updated.shopUrl,
    courseName: updated.courseName,
    courseUrl: updated.courseUrl,
    shopAddress: updated.shopAddress,
    shopPrice: updated.shopPrice,
    areaPrefCode: updated.areaPrefCode,
    areaMunicipalityName: updated.areaMunicipalityName,
  });
}

export async function DELETE(_: Request, { params }: Params) {
  const { publicId } = await params;
  const session = await getServerAuthSession();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const event = await prisma.event.findUnique({
    where: { publicId },
    select: { id: true, ownerUserId: true },
  });

  if (!event) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (event.ownerUserId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.$transaction([
    prisma.payment.deleteMany({ where: { eventId: event.id } }),
    prisma.attendance.deleteMany({ where: { eventId: event.id } }),
    prisma.voteChoice.deleteMany({
      where: { vote: { eventId: event.id } },
    }),
    prisma.vote.deleteMany({ where: { eventId: event.id } }),
    prisma.candidateDate.deleteMany({ where: { eventId: event.id } }),
    prisma.event.delete({ where: { id: event.id } }),
  ]);

  return NextResponse.json({ ok: true });
}
