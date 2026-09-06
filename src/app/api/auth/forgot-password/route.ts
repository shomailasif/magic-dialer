import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/db";
import { sendNotification } from "@/lib/mailer";

export async function POST(request: Request) {
  let body: { email?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const email = (body.email || "").trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });

  // Always return success to avoid leaking account existence.
  if (user) {
    const token = randomBytes(32).toString("hex");
    await prisma.passwordReset.create({
      data: {
        token,
        userId: user.id,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/reset-password?token=${token}`;

    try {
      await sendNotification({
        to: user.email,
        subject: "Reset your AutoDial AI password",
        text: `Hello${user.name ? ` ${user.name}` : ""},\n\nWe received a request to reset your password. Click the link below to choose a new one:\n\n${resetUrl}\n\nThis link expires in 1 hour.\n\n— AutoDial AI`,
      });
    } catch {}
  }

  return NextResponse.json({ ok: true });
}
