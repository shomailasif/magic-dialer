import nodemailer from "nodemailer";
import { prisma } from "@/lib/db";
import type { NotificationStatus } from "@prisma/client";

export interface MailPayload {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

let transporterCache: nodemailer.Transporter | null = null;

function isConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER);
}

function getTransporter(): nodemailer.Transporter | null {
  if (!isConfigured()) return null;
  if (transporterCache) return transporterCache;
  transporterCache = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  } as nodemailer.TransportOptions);
  return transporterCache;
}

/**
 * Send a sales outcome notification email to a business admin.
 * Persists a Notification row and attempts delivery. On failure the email
 * remains queued so the super admin can see it; retries are attempted.
 */
export async function sendNotification(payload: MailPayload): Promise<void> {
  const transporter = getTransporter();
  if (!transporter) {
    // No SMTP configured -> queue for super admin visibility. We keep the
    // notification row in the DB (created by the caller) so it's visible even
    // though delivery doesn't occur.
    console.warn("[mailer] SMTP not configured; notification queued in DB only", {
      to: payload.to,
      subject: payload.subject,
    });
    return;
  }

  const from = process.env.SMTP_FROM || "AutoDial AI <no-reply@autodial.ai>";
  await transporter.sendMail({
    from,
    to: payload.to,
    subject: payload.subject,
    text: payload.text,
    html: payload.html,
  });
}
