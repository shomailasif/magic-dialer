"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button, Input, Label } from "@/components/ui";

export function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const t = useTranslations("resetForm");
  const token = searchParams.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!token) {
      setError(t("missingToken"));
      return;
    }
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
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || t("error"));
        setLoading(false);
        return;
      }
      setDone(true);
    } catch {
      setError(t("networkError"));
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-800">
          {t("success")}
        </div>
        <Button
          className="w-full"
          onClick={() => {
            router.push("/login");
          }}
        >
          {t("goLogin")}
        </Button>
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
        <Label htmlFor="password">{t("newPasswordLabel")}</Label>
        <Input
          id="password"
          type="password"
          required
          autoComplete="new-password"
          placeholder={t("newPasswordPlaceholder")}
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
    </form>
  );
}
