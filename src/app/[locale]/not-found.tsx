import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export default function NotFound() {
  const t = useTranslations("metadata");
  const tc = useTranslations("common");
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4">
      <p className="text-6xl font-bold text-slate-900">404</p>
      <h1 className="mt-2 text-xl font-semibold text-slate-900">
        {t("notFound.title")}
      </h1>
      <p className="mt-1 text-sm text-slate-500">{t("notFound.desc")}</p>
      <Link
        href="/"
        className="mt-6 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
      >
        {tc("backToHome")}
      </Link>
    </div>
  );
}
