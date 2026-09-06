import { PortalShell, dashboardIcon, agentIcon, leadsIcon, callsIcon, dialerIcon, accountIcon } from "@/components/portal-shell";
import { getCurrentUser } from "@/lib/auth";
import { SubscriptionBanner } from "@/components/subscription-banner";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function PortalLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("portal");
  const user = await getCurrentUser();

  const nav = [
    { href: "/dashboard", label: t("navDashboard"), icon: dashboardIcon },
    { href: "/agent", label: t("navAgent"), icon: agentIcon },
    { href: "/leads", label: t("navLeads"), icon: leadsIcon },
    { href: "/calls", label: t("navCalls"), icon: callsIcon },
    { href: "/dialer", label: t("navDialer"), icon: dialerIcon },
    { href: "/account", label: t("navAccount"), icon: accountIcon },
  ];

  return (
    <PortalShell
      user={{
        name: user?.name || user?.companyName || null,
        companyName: user?.companyName || null,
        email: user?.email || "",
      }}
      nav={nav}
      activePath="/"
      roleLabel={t("roleLabel")}
    >
      <SubscriptionBanner status={user?.subscription?.status} />
      {children}
    </PortalShell>
  );
}
