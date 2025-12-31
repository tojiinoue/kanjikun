import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getServerAuthSession } from "@/lib/session";

export async function GET() {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const events = await prisma.event.findMany({
    where: { ownerUserId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: {
      candidateDates: {
        orderBy: { startsAt: "asc" },
      },
    },
  });

  return NextResponse.json({
    events: events.map((event) => ({
      id: event.id,
      publicId: event.publicId,
      name: event.name,
      createdAt: event.createdAt,
      confirmedCandidateDateId: event.confirmedCandidateDateId,
      candidateDates: event.candidateDates,
    })),
  });
}
