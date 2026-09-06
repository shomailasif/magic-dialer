import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { LeadsManager } from "./leads-manager";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LeadsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("leads");
  const user = await getCurrentUser();
  const active = user?.subscription?.status === "ACTIVE";

  const [leads, counts] = await Promise.all([
    prisma.lead.findMany({
      where: { userId: user!.id },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.lead.groupBy({
      by: ["status"],
      where: { userId: user!.id },
      _count: true,
    }),
  ]);

  const countMap = Object.fromEntries(counts.map((c) => [c.status, c._count]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{t("title")}</h1>
        <p className="text-sm text-slate-500">
          {t("subtitle")}
        </p>
      </div>
      <LeadsManager
        initialLeads={leads.map((l) => ({
          ...l,
          extraData: l.extraData ? JSON.parse(l.extraData) : null,
        }))}
        initialCounts={countMap}
        active={active}
      />
    </div>
  );
}
