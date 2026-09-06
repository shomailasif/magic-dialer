import { Link } from "@/i18n/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata.registerSuccess" });
  return { title: t("title") };
}

export default async function RegisterSuccessPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("registerSuccess");

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
          <svg className="h-7 w-7 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="mt-4 text-2xl font-bold text-slate-900">{t("title")}</h1>
        <p className="mt-2 text-sm text-slate-600">
          {t("p1")}
        </p>
        <p className="mt-2 text-sm text-slate-600">
          {t("p2")}
        </p>
        <Link
          href="/login"
          className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-lg bg-indigo-600 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          {t("goLogin")}
        </Link>
      </div>
    </div>
  );
}
