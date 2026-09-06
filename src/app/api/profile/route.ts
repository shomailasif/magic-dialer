import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { hashPassword, verifyPassword } from "@/lib/password";

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { email?: string; name?: string; password?: string; currentPassword?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const data: { email?: string; name?: string; passwordHash?: string } = {};

  if (body.email !== undefined && body.email !== user.email) {
    const email = body.email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Invalid email address." }, { status: 400 });
    }
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Email already in use." }, { status: 409 });
    }
    data.email = email;
  }

  if (body.name !== undefined) data.name = body.name.trim();

  if (body.password) {
    if (!body.currentPassword) {
      return NextResponse.json(
        { error: "Current password is required to change your password." },
        { status: 400 },
      );
    }
    const ok = await verifyPassword(body.currentPassword, user.passwordHash);
    if (!ok) {
      return NextResponse.json({ error: "Current password is incorrect." }, { status: 400 });
    }
    if (body.password.length < 8) {
      return NextResponse.json(
        { error: "New password must be at least 8 characters." },
        { status: 400 },
      );
    }
    data.passwordHash = await hashPassword(body.password);
  }

  if (!data.email && !data.name && !data.passwordHash) {
    return NextResponse.json({ ok: true, message: "No changes made." });
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data,
    select: { id: true, name: true, email: true, companyName: true },
  });

  return NextResponse.json({ ok: true, user: updated });
}
