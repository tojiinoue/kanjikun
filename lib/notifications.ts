import { sendEmail } from "@/lib/mailer";

type EventSummary = {
  name: string;
  publicId: string;
  ownerEmail: string | null;
};

type VoteSummary = {
  name: string;
  comment?: string | null;
};

type PaymentSummary = {
  amount: number;
  method: string | null;
};

export async function notifyNewVote(event: EventSummary, vote: VoteSummary) {
  if (!event.ownerEmail) {
    return;
  }

  await sendEmail({
    to: event.ownerEmail,
    subject: `【幹事くん】新規投票：${event.name}`,
    text: [
      `イベント: ${event.name}`,
      `投票者: ${vote.name}`,
      vote.comment ? `コメント: ${vote.comment}` : null,
      `URL: ${process.env.NEXTAUTH_URL}/e/${event.publicId}/admin`,
    ]
      .filter(Boolean)
      .join("\n"),
  });
}

export async function notifyPaymentApplied(
  event: EventSummary,
  payment: PaymentSummary,
  attendanceName: string
) {
  if (!event.ownerEmail) {
    return;
  }

  await sendEmail({
    to: event.ownerEmail,
    subject: `【幹事くん】支払申請：${event.name}`,
    text: [
      `イベント: ${event.name}`,
      `参加者: ${attendanceName}`,
      `金額: ${payment.amount}円`,
      `方法: ${payment.method ?? "未選択"}`,
      `URL: ${process.env.NEXTAUTH_URL}/e/${event.publicId}/admin`,
    ].join("\n"),
  });
}
