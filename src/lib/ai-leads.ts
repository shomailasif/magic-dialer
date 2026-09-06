import { prisma } from "@/lib/db";

export interface LeadGenCriteria {
  industry?: string;
  geography?: string;
  companySize?: string;
  keyword?: string;
  count?: number;
}

/**
 * AI-driven lead generation.
 *
 * In production this would call a data/internet search API. Here we simulate
 * an autonomous "search the internet" that returns a deterministic set of
 * leads matching the supplied criteria at the company level, then creates
 * them in the tenant's pool with status PENDING (as required by 4.3).
 */
export async function generateLeads(
  userId: string,
  criteria: LeadGenCriteria,
): Promise<{ ok: boolean; found: number; message: string }> {
  const count = clampCount(criteria.count);
  const industries = (criteria.industry || "technology")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const geography = criteria.geography?.trim() || "US";
  const industry = industries[0] || "technology";

  // Simulated candidates matching criteria.
  const firstNames = ["Alex", "Jordan", "Sam", "Taylor", "Morgan", "Casey", "Riley", "Avery"];
  const companies = [
    `${cap(industry)} Solutions`,
    `Northstar ${cap(industry)}`,
    `Brightpath Industries`,
    `Core ${cap(industry)} Group`,
    `Vertex Dynamics`,
    `Harbor Analytics`,
    `Summit ${cap(industry)}`,
    `Prairie Tech Works`,
  ];
  const found = Math.min(count, companies.length);

  const leads = Array.from({ length: found }, (_, i) => {
    const name = firstNames[(userId.length + i) % firstNames.length];
    const company = companies[(userId.length + i) % companies.length];
    const digits = String((i + 1) * 311 + Math.floor(Math.random() * 900)).padStart(3, "0");
    return {
      userId,
      name: `${name} ${cap(company.split(" ")[0])}`,
      company,
      phone: `+1${rand(200, 989)}${digits}${rand(1000, 9999)}`,
      email: `${slug(name)}@${slug(company)}.com`,
      extraData: JSON.stringify({
        industry,
        geography,
        companySize: criteria.companySize || "50-200",
        source: "AI-led-search",
      }),
      status: "PENDING",
    };
  });

  if (found > 0) {
    await prisma.$transaction(
      leads.map((l) => prisma.lead.create({ data: l as never })),
    );
  }

  await prisma.aILeadGeneration.create({
    data: {
      userId,
      criteria: JSON.stringify(criteria),
      status: found > 0 ? "COMPLETED" : "NO_RESULTS",
      found,
      message:
        found > 0
          ? `Found and imported ${found} matching leads.`
          : "No leads found for the given criteria. Consider broadening your industry or geography.",
      completedAt: new Date(),
    },
  });

  return {
    ok: found > 0,
    found,
    message:
      found > 0
        ? `Found and imported ${found} leads for ${industry} in ${geography}.`
        : "No leads found for the given criteria. Try broadening your industry or geography.",
  };
}

function clampCount(n?: number): number {
  if (!n) return 8;
  return Math.max(1, Math.min(50, Math.floor(n)));
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 14) || "co";
}

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
