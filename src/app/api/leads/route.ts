import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { parseAndImportLeads } from "@/lib/leads";
import type { LeadStatus } from "@prisma/client";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const q = searchParams.get("q") || "";

  const where: Record<string, unknown> = { userId: user.id };
  if (status && status !== "ALL") where.status = status as LeadStatus;
  if (q) {
    where.OR = [
      { name: { contains: q } },
      { phone: { contains: q } },
      { email: { contains: q } },
      { company: { contains: q } },
    ];
  }

  const leads = await prisma.lead.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  const counts = await prisma.lead.groupBy({
    by: ["status"],
    where: { userId: user.id },
    _count: true,
  });

  return NextResponse.json({
    leads,
    counts: Object.fromEntries(counts.map((c) => [c.status, c._count])),
  });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart form data." }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  try {
    const result = await parseAndImportLeads(user.id, file.name, buffer);
    return NextResponse.json({ ok: true, ...result });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Import failed.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
