"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button, Input, Label } from "@/components/ui";

export function RegisterForm() {
  const router = useRouter();
  const t = useTranslations("registerForm");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError(t("passwordLength"));
      return;
    }
    if (password !== confirm) {
      setError(t("passwordMismatch"));
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyName, email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || t("error"));
        return;
      }
      router.push("/register/success");
      router.refresh();
    } catch {
      setError(t("networkError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </div>
      )}
      <div>
        <Label htmlFor="company">{t("companyLabel")}</Label>
        <Input
          id="company"
          required
          placeholder={t("companyPlaceholder")}
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
        />
      </div>
      <div>
        <Label htmlFor="email">{t("emailLabel")}</Label>
        <Input
          id="email"
          type="email"
          required
          autoComplete="email"
          placeholder={t("emailPlaceholder")}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div>
        <Label htmlFor="password">{t("passwordLabel")}</Label>
        <Input
          id="password"
          type="password"
          required
          autoComplete="new-password"
          placeholder={t("passwordPlaceholder")}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      <div>
        <Label htmlFor="confirm">{t("confirmLabel")}</Label>
        <Input
          id="confirm"
          type="password"
          required
          autoComplete="new-password"
          placeholder={t("confirmPlaceholder")}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
      </div>
      <Button type="submit" className="w-full" loading={loading} size="lg">
        {t("submit")}
      </Button>
      <p className="text-center text-xs text-slate-400">
        {t("finePrint")}
      </p>
    </form>
  );
}
