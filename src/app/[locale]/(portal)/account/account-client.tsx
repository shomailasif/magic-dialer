"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Button, Card, CardHeader, Input, Label, Badge, Alert } from "@/components/ui";

const statusTone: Record<string, string> = {
  ACTIVE: "green",
  PENDING: "amber",
  SUSPENDED: "red",
  DEACTIVATED: "red",
};

interface AccountClientProps {
  user: { name: string | null; email: string };
  subscription: {
    plan: string | null;
    planName: string;
    status: string;
    statusLabel: string;
    startedAt: string | null;
    nextBilling: string | null;
  };
  history: { plan: string; status: string; changedAt: string }[];
  notifications: { id: string; subject: string; leadName: string | null; status: string; createdAt: string }[];
}

export function AccountClient({ user, subscription, history, notifications }: AccountClientProps) {
  const router = useRouter();
  const t = useTranslations("accountClient");
  const te = useTranslations("enums");
  const [name, setName] = useState(user.name || "");
  const [email, setEmail] = useState(user.email);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  async function saveProfile() {
    setMessage(null);
    setSaving(true);
    const payload: Record<string, string> = { name, email };
    if (newPassword) {
      payload.currentPassword = currentPassword;
      payload.password = newPassword;
    }
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setMessage({ type: "error", text: data.error || t("saveError") });
      return;
    }
    setMessage({ type: "success", text: t("saveSuccess") });
    setCurrentPassword("");
    setNewPassword("");
    router.refresh();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader
          title={t("subTitle")}
          action={
            <Badge tone={statusTone[subscription.status] || "slate"}>
              {subscription.statusLabel}
            </Badge>
          }
        />
        <div className="space-y-4 p-5">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-slate-500">{t("planLabel")}</p>
              <p className="font-semibold text-slate-900">{subscription.planName}</p>
            </div>
            <div>
              <p className="text-slate-500">{t("statusLabel")}</p>
              <p className="font-semibold text-slate-900">{subscription.statusLabel}</p>
            </div>
            <div>
              <p className="text-slate-500">{t("activatedLabel")}</p>
              <p className="font-semibold text-slate-900">
                {subscription.startedAt ? new Date(subscription.startedAt).toLocaleDateString() : "—"}
              </p>
            </div>
            <div>
              <p className="text-slate-500">{t("nextBillingLabel")}</p>
              <p className="font-semibold text-slate-900">
                {subscription.nextBilling ? new Date(subscription.nextBilling).toLocaleDateString() : "—"}
              </p>
            </div>
          </div>
          <p className="rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
            {t("note")}
          </p>

          {history.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-semibold text-slate-900">{t("historyTitle")}</p>
              <ul className="space-y-2 text-sm">
                {history.map((h, i) => (
                  <li key={i} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2">
                    <span className="text-slate-700">
                      {h.plan} · {h.status}
                    </span>
                    <span className="text-xs text-slate-400">{new Date(h.changedAt).toLocaleDateString()}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </Card>

      <Card>
        <CardHeader title={t("profileTitle")} description={t("profileDesc")} />
        <div className="space-y-4 p-5">
          {message && (
            <Alert tone={message.type === "success" ? "success" : "error"}>{message.text}</Alert>
          )}
          <div>
            <Label>{t("nameLabel")}</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label>{t("emailLabel")}</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <hr className="border-slate-100" />
          <p className="text-sm font-semibold text-slate-900">{t("passwordTitle")}</p>
          <div>
            <Label>{t("currentPasswordLabel")}</Label>
            <Input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          <div>
            <Label>{t("newPasswordLabel")}</Label>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          <Button onClick={saveProfile} loading={saving}>{t("saveButton")}</Button>
        </div>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader title={t("notificationsTitle")} description={t("notificationsDesc")} />
        {notifications.length === 0 ? (
          <p className="p-5 text-sm text-slate-500">{t("notificationsEmpty")}</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {notifications.map((n) => (
              <li key={n.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    {n.subject} {n.leadName && <span className="font-normal text-slate-500">— {n.leadName}</span>}
                  </p>
                  <p className="text-xs text-slate-400">{new Date(n.createdAt).toLocaleString()}</p>
                </div>
                <Badge tone={n.status === "SENT" ? "green" : n.status === "FAILED" ? "red" : "amber"}>
                  {te(`notificationStatus.${n.status}`)}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
