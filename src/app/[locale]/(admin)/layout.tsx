import { PortalShell, dashboardIcon, leadsIcon, accountIcon } from "@/components/portal-shell";
import { requireAdmin } from "@/lib/auth";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin");
  const user = await requireAdmin();

  const nav = [
    { href: "/admin", label: t("navOverview"), icon: dashboardIcon },
    { href: "/admin/customers", label: t("navCustomers"), icon: leadsIcon },
    { href: "/admin/subscriptions", label: t("navSubscriptions"), icon: accountIcon },
  ];

  return (
    <PortalShell
      user={{
        name: user?.name || t("fallbackName"),
        companyName: null,
        email: user?.email || "",
      }}
      nav={nav}
      activePath="/admin"
      roleLabel={t("roleLabel")}
    >
      {children}
    </PortalShell>
  );
}
