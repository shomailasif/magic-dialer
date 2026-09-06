import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { generateLeads } from "@/lib/ai-leads";
import { z } from "zod";

const schema = z.object({
  industry: z.string().optional(),
  geography: z.string().optional(),
  companySize: z.string().optional(),
  keyword: z.string().optional(),
  count: z.number().int().min(1).max(50).optional(),
});

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.subscription?.status !== "ACTIVE") {
    return NextResponse.json(
      { error: "An active subscription is required for AI lead generation." },
      { status: 403 },
    );
  }

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

  const result = await generateLeads(user.id, parsed.data);
  return NextResponse.json(result);
}
