import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getServerAuthSession } from "@/lib/session";

type Payload = {
  paypayId?: string | null;
};

export async function PATCH(request: Request) {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as Payload;
  const raw = body.paypayId ?? "";
  const paypayId = raw.trim();

  if (paypayId.length > 64) {
    return NextResponse.json({ error: "Too long" }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id: session.user.id },
    data: { paypayId: paypayId || null },
    select: { paypayId: true },
  });

  return NextResponse.json({ paypayId: updated.paypayId });
}
