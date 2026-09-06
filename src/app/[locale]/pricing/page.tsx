import { Link } from "@/i18n/navigation";
import { PLANS } from "@/lib/constants";
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
  const t = await getTranslations({ locale, namespace: "metadata.pricing" });
  return { title: t("title") };
}

export default async function PricingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("pricing");
  const tc = await getTranslations("common");
  const tpl = await getTranslations("plans");

  const images = PLANS.map((p) => ({
    id: p.id,
    highlighted: p.highlighted,
    name: tpl(`names.${p.id}`),
    price: tpl(`prices.${p.id}`),
    blurb: tpl(`blurbs.${p.id}`),
    calls: tpl(`calls.${p.id}`),
    features: p.features.map((_, i) => tpl(`features.${p.id}_${i + 1}`)),
  }));

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 5.25h4.5l2.25 5.25L12 5.25H15V18.75m0 0h-1.5M15 18.75H9m6 0a1.5 1.5 0 100 3 1.5 1.5 0 000-3zM9 18.75a1.5 1.5 0 100 3 1.5 1.5 0 000-3z" />
              </svg>
            </div>
            <span className="text-lg font-bold text-slate-900">AutoDial AI</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-medium text-slate-700 hover:text-slate-900">{tc("load")}</Link>
            <Link href="/register" className="inline-flex h-9 items-center rounded-lg bg-indigo-600 px-4 text-sm font-medium text-white hover:bg-indigo-700">{tc("getStarted")}</Link>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-16 sm:px-6">
        <div className="text-center">
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">{t("title")}</h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">
            {t("subtitle")}
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-4">
          {images.map((p) => (
            <div
              key={p.id}
              className={
                p.highlighted
                  ? "relative flex flex-col rounded-2xl border-2 border-indigo-600 bg-white p-6 shadow-lg"
                  : "relative flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
              }
            >
              {p.highlighted && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-indigo-600 px-3 py-0.5 text-xs font-medium text-white">
                  {tc("mostPopular")}
                </span>
              )}
              <h2 className="text-lg font-semibold text-slate-900">{p.name}</h2>
              <p className="mt-1 text-4xl font-extrabold text-slate-900">{p.price}</p>
              <p className="mt-1 text-sm text-slate-500">{p.calls}</p>
              <p className="mt-3 text-sm text-slate-600">{p.blurb}</p>
              <ul className="mt-5 flex-1 space-y-2 text-sm text-slate-600">
                {p.features.map((f, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <svg className="mt-0.5 h-4 w-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/register"
                className={
                  p.highlighted
                    ? "mt-6 inline-flex h-10 w-full items-center justify-center rounded-lg bg-indigo-600 text-sm font-medium text-white hover:bg-indigo-700"
                    : "mt-6 inline-flex h-10 w-full items-center justify-center rounded-lg border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-50"
                }
              >
                {t("cta")}
              </Link>
            </div>
          ))}
        </div>

        <div className="mt-16 rounded-2xl border border-slate-200 bg-white p-8 text-center">
          <h2 className="text-xl font-semibold text-slate-900">{t("helpTitle")}</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm text-slate-600">
            {t("helpText")}
          </p>
          <Link href="/register" className="mt-4 inline-flex h-11 items-center rounded-lg bg-indigo-600 px-6 text-sm font-semibold text-white hover:bg-indigo-700">
            {t("helpCta")}
          </Link>
        </div>
      </main>

      <footer className="border-t border-slate-200 bg-white py-6 text-center text-sm text-slate-500">
        {tc("copyright", { year: new Date().getFullYear() })}
      </footer>
    </div>
  );
}
