"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Button, Card, CardHeader, Select, Label, Alert } from "@/components/ui";

const PLANS = ["FREE", "STARTER", "PRO", "ENTERPRISE"] as const;
const STATUSES = ["PENDING", "ACTIVE", "SUSPENDED", "DEACTIVATED"] as const;

export function CustomerActions({
  customerId,
  currentPlan,
  currentStatus,
}: {
  customerId: string;
  currentPlan: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const t = useTranslations("customerActions");
  const tpl = useTranslations("plans");
  const te = useTranslations("enums");
  const [plan, setPlan] = useState(currentPlan || "STARTER");
  const [status, setStatus] = useState(currentStatus || "PENDING");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  async function update() {
    setMessage(null);
    setSaving(true);
    const res = await fetch(`/api/admin/customers/${customerId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan, status }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setMessage({ type: "error", text: data.error || t("saveError") });
      return;
    }
    setMessage({
      type: "success",
      text: t("updateSuccess", {
        plan: tpl(`names.${plan}` as never),
        statusLabel: te(`subscriptionStatus.${status}` as never),
      }),
    });
    router.refresh();
  }

  async function quickAction(statusVal: string) {
    setStatus(statusVal);
    setMessage(null);
    setSaving(true);
    const res = await fetch(`/api/admin/customers/${customerId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: statusVal }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setMessage({ type: "error", text: data.error || t("quickError") });
      return;
    }
    setMessage({
      type: "success",
      text: t("quickSuccess", { statusLabel: te(`subscriptionStatus.${statusVal}` as never) }),
    });
    router.refresh();
  }

  return (
    <Card>
      <CardHeader title={t("title")} description={t("desc")} />
      <div className="space-y-4 p-5">
        {message && (
          <Alert tone={message.type === "success" ? "success" : "error"}>{message.text}</Alert>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>{t("planLabel")}</Label>
            <Select value={plan} onChange={(e) => setPlan(e.target.value)}>
              {PLANS.map((p) => (
                <option key={p} value={p}>
                  {tpl(`names.${p}` as never)}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>{t("statusLabel")}</Label>
            <Select value={status} onChange={(e) => setStatus(e.target.value)}>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {te(`subscriptionStatus.${s}` as never)}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <Button onClick={update} loading={saving} className="w-full">
          {t("saveButton")}
        </Button>

        <div className="border-t border-slate-100 pt-4">
          <p className="mb-2 text-sm font-semibold text-slate-900">{t("quickTitle")}</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => quickAction("ACTIVE")} disabled={saving}>{t("activate")}</Button>
            <Button variant="outline" onClick={() => quickAction("SUSPENDED")} disabled={saving}>{t("suspend")}</Button>
            <Button variant="danger" onClick={() => quickAction("DEACTIVATED")} disabled={saving}>{t("deactivate")}</Button>
            <Button variant="outline" onClick={() => quickAction("PENDING")} disabled={saving}>{t("markPending")}</Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
