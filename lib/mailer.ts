import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY ?? "");

type EmailPayload = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

export async function sendEmail({ to, subject, text, html }: EmailPayload) {
  if (process.env.NODE_ENV !== "production") {
    console.info("[mailer] skipped in non-production", { to, subject });
    return;
  }

  const from = process.env.MAIL_FROM;
  if (!from) {
    throw new Error("MAIL_FROM is not configured.");
  }

  await resend.emails.send({
    from,
    to,
    subject,
    text,
    ...(html ? { html } : {}),
  });
}
