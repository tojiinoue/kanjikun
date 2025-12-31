import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

const sesClient = new SESClient({
  region: process.env.AWS_SES_REGION,
  credentials: {
    accessKeyId: process.env.AWS_SES_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.AWS_SES_SECRET_ACCESS_KEY ?? "",
  },
});

type EmailPayload = {
  to: string;
  subject: string;
  text: string;
};

export async function sendEmail({ to, subject, text }: EmailPayload) {
  if (process.env.NODE_ENV !== "production") {
    console.info("[mailer] skipped in non-production", { to, subject });
    return;
  }

  const from = process.env.MAIL_FROM;
  if (!from) {
    throw new Error("MAIL_FROM is not configured.");
  }

  const command = new SendEmailCommand({
    Destination: { ToAddresses: [to] },
    Message: {
      Subject: { Data: subject },
      Body: {
        Text: { Data: text },
      },
    },
    Source: from,
  });

  await sesClient.send(command);
}
