import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { validateProvider } from "@/lib/dialer";
import { z } from "zod";
import type { DialerProvider } from "@prisma/client";

const schema = z.object({
  provider: z.enum(["TWILIO", "RINGCENTRAL", "VONAGE"]),
  apiKey: z.string().optional().default(""),
  accountSid: z.string().optional().default(""),
  outboundNumber: z.string().optional().default(""),
});

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const config = await prisma.dialerConfig.findUnique({ where: { userId: user.id } });
  return NextResponse.json({
    config: config
      ? { ...config, apiKey: config.apiKey ? "••••••••" : "", accountSid: config.accountSid ? "••••••••" : "" }
      : null,
  });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed." }, { status: 400 });
  }
  const d = parsed.data;

  const existing = await prisma.dialerConfig.findUnique({ where: { userId: user.id } });
  const prevApiKey = existing?.apiKey || "";
  const prevSid = existing?.accountSid || "";

  const apiKey = d.apiKey && d.apiKey !== "••••••••" ? d.apiKey : prevApiKey;
  const accountSid = d.accountSid && d.accountSid !== "••••••••" ? d.accountSid : prevSid;

  const temp = {
    provider: d.provider as DialerProvider,
    apiKey,
    accountSid,
    outboundNumber: d.outboundNumber,
  };

  const check = await validateProvider(temp as never);
  if (!check.ok) {
    return NextResponse.json({ error: check.error }, { status: 400 });
  }

  const config = await prisma.dialerConfig.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      provider: d.provider as DialerProvider,
      apiKey,
      accountSid,
      outboundNumber: d.outboundNumber,
      validated: true,
    },
    update: {
      provider: d.provider as DialerProvider,
      apiKey,
      accountSid,
      outboundNumber: d.outboundNumber,
      validated: true,
    },
  });

  return NextResponse.json({ ok: true, validated: true, config });
}
