import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const prefCode = searchParams.get("pref")?.trim();
  const q = searchParams.get("q")?.trim() ?? "";
  const limitParam = Number(searchParams.get("limit") ?? "30");
  const offsetParam = Number(searchParams.get("offset") ?? "0");
  const limit = Number.isFinite(limitParam) ? Math.min(limitParam, 200) : 30;
  const offset = Number.isFinite(offsetParam) && offsetParam >= 0 ? offsetParam : 0;

  if (!prefCode) {
    return NextResponse.json({ municipalities: [] });
  }

  const municipalities = await prisma.municipality.findMany({
    where: {
      prefCode,
      name: q
        ? {
            contains: q,
            mode: "insensitive",
          }
        : undefined,
    },
    orderBy: {
      name: "asc",
    },
    skip: offset,
    take: limit + 1,
    select: {
      id: true,
      name: true,
    },
  });

  const hasMore = municipalities.length > limit;
  const trimmed = hasMore ? municipalities.slice(0, limit) : municipalities;
  const nextOffset = hasMore ? offset + limit : null;

  return NextResponse.json({ municipalities: trimmed, nextOffset });
}
