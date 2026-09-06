"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button, Input, Label } from "@/components/ui";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations("loginForm");
  const next = searchParams.get("next") || "/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || t("error"));
        return;
      }
      const dest = data.role === "SUPER_ADMIN" ? "/admin" : next;
      router.push(dest);
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
          autoComplete="current-password"
          placeholder={t("passwordPlaceholder")}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      <Button type="submit" className="w-full" loading={loading} size="lg">
        {t("submit")}
      </Button>
    </form>
  );
}
