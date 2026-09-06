import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export function SubscriptionBanner({ status }: { status?: string }) {
  const t = useTranslations("subscriptionBanner");
  if (!status || status === "ACTIVE") return null;

  const map: Record<string, { title: string; desc: string; tone: string }> = {
    PENDING: {
      title: t("pendingTitle"),
      desc: t("pendingDesc"),
      tone: "bg-amber-50 border-amber-200 text-amber-800",
    },
    SUSPENDED: {
      title: t("suspendedTitle"),
      desc: t("suspendedDesc"),
      tone: "bg-rose-50 border-rose-200 text-rose-800",
    },
    DEACTIVATED: {
      title: t("deactivatedTitle"),
      desc: t("deactivatedDesc"),
      tone: "bg-rose-50 border-rose-200 text-rose-800",
    },
  };

  const info = map[status] || map.PENDING;

  return (
    <div className={`mb-6 flex items-start justify-between gap-4 rounded-lg border px-4 py-3 ${info.tone}`}>
      <div>
        <p className="text-sm font-semibold">{info.title}</p>
        <p className="text-sm opacity-90">{info.desc}</p>
      </div>
      <Link href="/account" className="shrink-0 text-sm font-medium underline">
        {t("viewStatus")}
      </Link>
    </div>
  );
}
