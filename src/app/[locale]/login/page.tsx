import { Suspense } from "react";
import { Link } from "@/i18n/navigation";
import { LoginForm } from "./login-form";
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
  const t = await getTranslations({ locale, namespace: "metadata.login" });
  return { title: t("title") };
}

export default async function LoginPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("login");
  const tc = await getTranslations("common");

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 5.25h4.5l2.25 5.25L12 5.25H15V18.75m0 0h-1.5M15 18.75H9m6 0a1.5 1.5 0 100 3 1.5 1.5 0 000-3zM9 18.75a1.5 1.5 0 100 3 1.5 1.5 0 000-3z" />
            </svg>
          </div>
          <span className="text-lg font-bold text-slate-900">AutoDial AI</span>
        </Link>
        <Link href="/" className="text-sm font-medium text-slate-600 hover:text-slate-900">{tc("backToHome")}</Link>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <h1 className="text-2xl font-bold text-slate-900">{t("title")}</h1>
            <p className="mt-1 text-sm text-slate-500">{t("subtitle")}</p>
            <div className="mt-6">
              <Suspense fallback={null}>
                <LoginForm />
              </Suspense>
            </div>
            <p className="mt-6 text-center text-sm text-slate-500">
              {t("noAccount")}{" "}
              <Link href="/register" className="font-medium text-indigo-600 hover:text-indigo-700">
                {t("registerLink")}
              </Link>
            </p>
            <p className="mt-2 text-center text-sm text-slate-500">
              <Link href="/forgot-password" className="font-medium text-indigo-600 hover:text-indigo-700">
                {t("forgotLink")}
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
