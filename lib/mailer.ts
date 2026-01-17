import { Resend } from "resend";

type EmailPayload = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

export async function sendEmail({ to, subject, text, html }: EmailPayload) {
  const enabled = process.env.MAIL_SEND_ENABLED === "true";
  if (!enabled) {
    console.info("[mailer] skipped (MAIL_SEND_ENABLED!=true)", { to, subject });
    return;
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY is not configured.");

  const resend = new Resend(apiKey);

  const from = process.env.MAIL_FROM;
  if (!from) throw new Error("MAIL_FROM is not configured.");

  await resend.emails.send({
    from,
    to,
    subject,
    text,
    ...(html ? { html } : {}),
  });
}