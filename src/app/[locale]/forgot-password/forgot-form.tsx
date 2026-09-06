"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button, Input, Label } from "@/components/ui";

export function ForgotPasswordForm() {
  const t = useTranslations("forgotForm");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || t("error"));
        setLoading(false);
        return;
      }
      setSent(true);
    } catch {
      setError(t("networkError"));
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-800">
        {t("success", { email })}
      </div>
    );
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
          placeholder={t("emailPlaceholder")}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <Button type="submit" className="w-full" loading={loading} size="lg">
        {t("submit")}
      </Button>
    </form>
  );
}
