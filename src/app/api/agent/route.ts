import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { SUPPORTED_LOCALES } from "@/lib/ai-agent";
import { z } from "zod";

const schema = z.object({
  productName: z.string().max(120).optional().default(""),
  productDesc: z.string().max(3000).optional().default(""),
  valueProps: z.string().max(3000).optional().default(""),
  pricing: z.string().max(1000).optional().default(""),
  targetAudience: z.string().max(1000).optional().default(""),
  pitch: z.string().max(5000).optional().default(""),
  tone: z.enum(["CONSULTATIVE", "DIRECT", "FRIENDLY"]),
  defaultLanguage: z
    .enum([...SUPPORTED_LOCALES] as [string, ...string[]])
    .optional()
    .default("en"),
  objectionHandling: z.string().max(3000).optional().default(""),
  followUpAttempts: z.number().int().min(0).max(20),
  followUpIntervalHours: z.number().int().min(1).max(720),
});

function zip(s: string | undefined) {
  if (!s) return null;
  const t = s.trim();
  return t === "" ? null : t;
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const config = await prisma.aIAgentConfig.findUnique({ where: { userId: user.id } });
  return NextResponse.json({ config });
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
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const d = parsed.data;

  const config = await prisma.aIAgentConfig.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      productName: zip(d.productName),
      productDesc: zip(d.productDesc),
      valueProps: zip(d.valueProps),
      pricing: zip(d.pricing),
      targetAudience: zip(d.targetAudience),
      pitch: zip(d.pitch),
      tone: d.tone,
      defaultLanguage: d.defaultLanguage,
      objectionHandling: zip(d.objectionHandling),
      followUpAttempts: d.followUpAttempts,
      followUpIntervalHours: d.followUpIntervalHours,
    },
    update: {
      productName: zip(d.productName),
      productDesc: zip(d.productDesc),
      valueProps: zip(d.valueProps),
      pricing: zip(d.pricing),
      targetAudience: zip(d.targetAudience),
      pitch: zip(d.pitch),
      tone: d.tone,
      defaultLanguage: d.defaultLanguage,
      objectionHandling: zip(d.objectionHandling),
      followUpAttempts: d.followUpAttempts,
      followUpIntervalHours: d.followUpIntervalHours,
    },
  });

  return NextResponse.json({ ok: true, config });
}
