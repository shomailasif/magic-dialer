"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";

export function LogoutButton() {
  const router = useRouter();
  const t = useTranslations("logoutButton");
  const [loading, setLoading] = useState(false);

  async function logout() {
    setLoading(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={logout}
      disabled={loading}
      className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-300 hover:bg-white/10 hover:text-white disabled:opacity-50"
    >
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6A2.25 2.25 0 005.25 5.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
      </svg>
      {loading ? t("loading") : t("idle")}
    </button>
  );
}
