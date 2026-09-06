import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import type { LeadStatus } from "@prisma/client";

interface Ctx {
  params: Promise<{ id: string }>;
}

export async function DELETE(_: Request, { params }: Ctx) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const lead = await prisma.lead.findFirst({ where: { id, userId: user.id } });
  if (!lead) return NextResponse.json({ error: "Lead not found." }, { status: 404 });

  await prisma.lead.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

const validStatus: LeadStatus[] = [
  "PENDING",
  "CALLED",
  "INTERESTED",
  "CONVERTED",
  "NOT_INTERESTED",
  "FAILED",
];

export async function PATCH(request: Request, { params }: Ctx) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  let body: { status?: string; disposition?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const lead = await prisma.lead.findFirst({ where: { id, userId: user.id } });
  if (!lead) return NextResponse.json({ error: "Lead not found." }, { status: 404 });

  const data: { status?: LeadStatus; disposition?: string } = {};
  if (body.status) {
    if (!validStatus.includes(body.status as LeadStatus)) {
      return NextResponse.json({ error: "Invalid status." }, { status: 400 });
    }
    data.status = body.status as LeadStatus;
  }
  if (body.disposition !== undefined) data.disposition = body.disposition;

  const updated = await prisma.lead.update({ where: { id }, data });
  return NextResponse.json({ ok: true, lead: updated });
}
