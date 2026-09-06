import { Link } from "@/i18n/navigation";
import { ForgotPasswordForm } from "./forgot-form";
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
  const t = await getTranslations({ locale, namespace: "metadata.forgotPassword" });
  return { title: t("title") };
}

export default async function ForgotPasswordPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("forgotPassword");
  const tc = await getTranslations("common");

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">{t("title")}</h1>
        <p className="mt-1 text-sm text-slate-500">
          {t("subtitle")}
        </p>
        <div className="mt-6">
          <ForgotPasswordForm />
        </div>
        <p className="mt-6 text-center text-sm text-slate-500">
          <Link href="/login" className="font-medium text-indigo-600 hover:text-indigo-700">
            {tc("backToLogin")}
          </Link>
        </p>
      </div>
    </div>
  );
}
