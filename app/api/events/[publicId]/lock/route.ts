import { NextResponse } from "next/server";

import { assertEventAdmin } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";

type LockPayload = {
  locked?: boolean;
  ownerClientId?: string | null;
};

type Params = {
  params: Promise<{ publicId: string }>;
};

export async function POST(request: Request, { params }: Params) {
  const body = (await request.json()) as LockPayload;
  const { publicId } = await params;
  const event = await prisma.event.findUnique({ where: { publicId } });

  if (!event) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const auth = await assertEventAdmin(event.id, body.ownerClientId);
  if (!auth.ok) {
    return NextResponse.json({ error: "Forbidden" }, { status: auth.status });
  }

  if (typeof body.locked !== "boolean") {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const updated = await prisma.event.update({
    where: { id: event.id },
    data: { votingLocked: body.locked },
  });

  return NextResponse.json({ votingLocked: updated.votingLocked });
}
