"use client";

import { useState } from "react";
import type { AIAgentConfig } from "@prisma/client";
import { useTranslations } from "next-intl";
import { Button, Card, CardHeader, Input, Textarea, Select, Label, FormField, Alert } from "@/components/ui";

type Tone = "CONSULTATIVE" | "DIRECT" | "FRIENDLY";

const LANGUAGES: string[] = [
  "en", "fr", "es", "de", "pt", "it", "nl", "ru", "uk", "pl",
  "tr", "ar", "he", "zh", "ja", "ko", "hi", "id", "vi", "ur",
];

interface AgentFormProps {
  initial: AIAgentConfig | null;
  disabled: boolean;
}

const empty = {
  productName: "",
  productDesc: "",
  valueProps: "",
  pricing: "",
  targetAudience: "",
  pitch: "",
  tone: "CONSULTATIVE" as Tone,
  defaultLanguage: "en",
  objectionHandling: "",
  followUpAttempts: 2,
  followUpIntervalHours: 24,
};

export function AgentForm({ initial, disabled }: AgentFormProps) {
  const t = useTranslations("agentForm");
  const te = useTranslations("enums");
  const [form, setForm] = useState(() => ({
    productName: initial?.productName ?? "",
    productDesc: initial?.productDesc ?? "",
    valueProps: initial?.valueProps ?? "",
    pricing: initial?.pricing ?? "",
    targetAudience: initial?.targetAudience ?? "",
    pitch: initial?.pitch ?? "",
    tone: (initial?.tone as Tone) ?? "CONSULTATIVE",
    defaultLanguage: initial?.defaultLanguage ?? "en",
    objectionHandling: initial?.objectionHandling ?? "",
    followUpAttempts: initial?.followUpAttempts ?? 2,
    followUpIntervalHours: initial?.followUpIntervalHours ?? 24,
  }));
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function save() {
    setMessage(null);
    setSaving(true);
    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: "error", text: data.error || t("saveError") });
        return;
      }
      setMessage({ type: "success", text: t("saveSuccess") });
    } catch {
      setMessage({ type: "error", text: t("networkError") });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {disabled && (
        <Alert tone="warning">
          {t("disabledWarning")}
        </Alert>
      )}
      {message && (
        <Alert tone={message.type === "success" ? "success" : "error"}>{message.text}</Alert>
      )}

      <Card>
        <CardHeader
          title={t("productTitle")}
          description={t("productDesc")}
        />
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <FormField label={t("productNameLabel")}>
            <Input
              value={form.productName}
              onChange={(e) => set("productName", e.target.value)}
              placeholder={t("productNamePlaceholder")}
            />
          </FormField>
          <FormField label={t("audienceLabel")}>
            <Input
              value={form.targetAudience}
              onChange={(e) => set("targetAudience", e.target.value)}
              placeholder={t("audiencePlaceholder")}
            />
          </FormField>
          <div className="sm:col-span-2">
            <FormField label={t("descriptionLabel")}>
              <Textarea
                rows={3}
                value={form.productDesc}
                onChange={(e) => set("productDesc", e.target.value)}
                placeholder={t("descriptionPlaceholder")}
              />
            </FormField>
          </div>
          <div className="sm:col-span-2">
            <FormField label={t("valuePropsLabel")} hint={t("valuePropsHint")}>
              <Textarea
                rows={2}
                value={form.valueProps}
                onChange={(e) => set("valueProps", e.target.value)}
                placeholder={t("valuePropsPlaceholder")}
              />
            </FormField>
          </div>
          <div className="sm:col-span-2">
            <FormField label={t("pricingLabel")}>
              <Input
                value={form.pricing}
                onChange={(e) => set("pricing", e.target.value)}
                placeholder={t("pricingPlaceholder")}
              />
            </FormField>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader title={t("pitchTitle")} description={t("pitchDesc")} />
        <div className="grid gap-4 p-5">
          <FormField label={t("pitchLabel")} hint={t("pitchHint")}>
            <Textarea
              rows={4}
              value={form.pitch}
              onChange={(e) => set("pitch", e.target.value)}
              placeholder={t("pitchPlaceholder")}
            />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-4">
            <FormField label={t("toneLabel")}>
              <Select value={form.tone} onChange={(e) => set("tone", e.target.value as Tone)}>
                <option value="CONSULTATIVE">{te("agentTone.CONSULTATIVE")}</option>
                <option value="DIRECT">{te("agentTone.DIRECT")}</option>
                <option value="FRIENDLY">{te("agentTone.FRIENDLY")}</option>
              </Select>
            </FormField>
            <FormField label={t("defaultLanguageLabel")}>
              <Select
                value={form.defaultLanguage}
                onChange={(e) => set("defaultLanguage", e.target.value)}
              >
                {LANGUAGES.map((code) => (
                  <option key={code} value={code}>
                    {te(`languages.${code}`)}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label={t("followUpsLabel")}>
              <Input
                type="number"
                min={0}
                max={20}
                value={form.followUpAttempts}
                onChange={(e) => set("followUpAttempts", Number(e.target.value))}
              />
            </FormField>
            <FormField label={t("intervalLabel")}>
              <Input
                type="number"
                min={1}
                max={720}
                value={form.followUpIntervalHours}
                onChange={(e) => set("followUpIntervalHours", Number(e.target.value))}
              />
            </FormField>
          </div>
          <FormField
            label={t("objectionLabel")}
            hint={t("objectionHint")}
          >
            <Textarea
              rows={4}
              value={form.objectionHandling}
              onChange={(e) => set("objectionHandling", e.target.value)}
              placeholder={t("objectionPlaceholder")}
            />
          </FormField>
        </div>
      </Card>

      <div className="flex justify-end">
        <Button onClick={save} loading={saving} size="lg">
          {t("save")}
        </Button>
      </div>
    </div>
  );
}
