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
  const t = await getTranslations({ locale, namespace: "metadata.home" });
  return {
    title: t("title"),
    description: t("description"),
  };
}

export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("landing");
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
    <div className="flex min-h-screen flex-col bg-white">
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 5.25h4.5l2.25 5.25L12 5.25H15V18.75m0 0h-1.5M15 18.75H9m6 0a1.5 1.5 0 100 3 1.5 1.5 0 000-3zM9 18.75a1.5 1.5 0 100 3 1.5 1.5 0 000-3z" />
              </svg>
            </div>
            <span className="text-lg font-bold text-slate-900">AutoDial AI</span>
          </Link>
          <nav className="hidden items-center gap-6 text-sm font-medium text-slate-600 md:flex">
            <Link href="/pricing" className="hover:text-slate-900">{t("navPricing")}</Link>
            <a href="#how" className="hover:text-slate-900">{t("navHowItWorks")}</a>
            <a href="#features" className="hover:text-slate-900">{t("navFeatures")}</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-medium text-slate-700 hover:text-slate-900">
              {tc("load")}
            </Link>
            <Link
              href="/register"
              className="inline-flex h-9 items-center rounded-lg bg-indigo-600 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
            >
              {tc("getStarted")}
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-indigo-50 via-white to-white">
        <div className="mx-auto max-w-6xl px-4 pb-16 pt-20 text-center sm:px-6">
          <span className="inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">
            {t("heroBadge")}
          </span>
          <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-extrabold tracking-tight text-slate-900 sm:text-6xl">
            {t("heroHeading1")}{" "}
            <span className="bg-gradient-to-r from-indigo-600 to-violet-500 bg-clip-text text-transparent">
              {t("heroHeadingHighlight")}
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600">
            {t("heroSub")}
          </p>
          <div className="mt-8 flex items-center justify-center gap-4">
            <Link
              href="/register"
              className="inline-flex h-12 items-center rounded-lg bg-indigo-600 px-6 text-base font-semibold text-white shadow-sm hover:bg-indigo-700"
            >
              {t("heroCta")}
            </Link>
            <a
              href="#features"
              className="inline-flex h-12 items-center rounded-lg border border-slate-300 bg-white px-6 text-base font-medium text-slate-700 hover:bg-slate-50"
            >
              {t("heroSeeFeatures")}
            </a>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="border-t border-slate-100 bg-white py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900">{t("howTitle")}</h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-slate-600">
            {t("howSubtitle")}
          </p>
          <div className="mt-12 grid gap-6 md:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="rounded-xl border border-slate-200 p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 text-sm font-bold text-indigo-700">
                  {i}
                </div>
                <h3 className="mt-4 text-lg font-semibold text-slate-900">{t(`howStep${i}Title`)}</h3>
                <p className="mt-2 text-sm text-slate-600">{t(`howStep${i}Desc`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="bg-slate-50 py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900">{t("featuresTitle")}</h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-slate-600">
            {t("featuresSubtitle")}
          </p>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900">{t(`feature${i}Title`)}</h3>
                <p className="mt-2 text-sm text-slate-600">{t(`feature${i}Desc`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing preview */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900">{t("pricingTitle")}</h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-slate-600">
            {t("pricingSubtitle")}
          </p>
          <div className="mt-12 grid gap-6 md:grid-cols-4">
            {images.map((p) => (
              <div
                key={p.id}
                className={
                  p.highlighted
                    ? "relative rounded-xl border-2 border-indigo-600 bg-white p-6 shadow-lg"
                    : "rounded-xl border border-slate-200 bg-white p-6"
                }
              >
                {p.highlighted && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-indigo-600 px-3 py-0.5 text-xs font-medium text-white">
                    {tc("mostPopular")}
                  </span>
                )}
                <h3 className="text-lg font-semibold text-slate-900">{p.name}</h3>
                <p className="mt-1 text-3xl font-bold text-slate-900">{p.price}</p>
                <p className="mt-1 text-sm text-slate-500">{p.blurb}</p>
                <ul className="mt-4 space-y-2 text-sm text-slate-600">
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
                  {tc("getStarted")}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-indigo-600 py-16">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
          <h2 className="text-3xl font-bold text-white">{t("ctaTitle")}</h2>
          <p className="mx-auto mt-3 max-w-xl text-indigo-100">
            {t("ctaSubtitle")}
          </p>
          <Link
            href="/register"
            className="mt-6 inline-flex h-12 items-center rounded-lg bg-white px-6 text-base font-semibold text-indigo-700 hover:bg-indigo-50"
          >
            {t("ctaButton")}
          </Link>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-10 text-center text-sm text-slate-500 sm:px-6">
          <p>{tc("copyright", { year: new Date().getFullYear() })}</p>
        </div>
      </footer>
    </div>
  );
}
