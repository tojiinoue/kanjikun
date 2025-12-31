import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";

type SignupPayload = {
  email?: string;
  password?: string;
  name?: string;
};

export async function POST(request: Request) {
  const body = (await request.json()) as SignupPayload;
  const email = body.email?.trim().toLowerCase();
  const password = body.password ?? "";
  const name = body.name?.trim();

  if (!email || password.length < 8) {
    return NextResponse.json(
      { error: "Invalid input." },
      { status: 400 }
    );
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "Email already exists." }, { status: 409 });
  }

  const passwordHash = await hashPassword(password);
  await prisma.user.create({
    data: {
      email,
      name: name || null,
      passwordHash,
    },
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
