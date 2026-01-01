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

function buildEmailLayout(title: string, bodyHtml: string, ctaUrl: string) {
  return `
  <div style="margin:0;background:#f6f1ea;padding:32px 16px;color:#1f1b16;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #eadbcf;border-radius:24px;overflow:hidden;">
      <div style="padding:24px 28px;border-bottom:1px solid #f0e3d8;text-align:center;">
        <div style="font-size:20px;font-weight:700;color:#2f7f3b;">幹事くん</div>
      </div>
      <div style="padding:24px 28px;">
        <div style="font-size:18px;font-weight:700;margin-bottom:8px;">${title}</div>
        ${bodyHtml}
        <div style="margin-top:20px;text-align:center;">
          <a href="${ctaUrl}" style="display:inline-block;padding:10px 18px;border-radius:999px;background:#2f7f3b;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;">イベントページを確認する</a>
        </div>
      </div>
    </div>
    <div style="max-width:560px;margin:16px auto 0;color:#7a6453;font-size:12px;text-align:center;">
      幹事くん | ${ctaUrl}
    </div>
  </div>
  `;
}

export async function notifyNewVote(event: EventSummary, vote: VoteSummary) {
  if (!event.ownerEmail) {
    return;
  }

  const ctaUrl = `${process.env.NEXTAUTH_URL}/e/${event.publicId}/admin`;
  const bodyHtml = `
    <div style="font-size:14px;color:#5e4c3d;line-height:1.6;">
      <div>イベント: <strong>${event.name}</strong></div>
      <div>投票者: <strong>${vote.name}</strong></div>
      ${
        vote.comment
          ? `<div style="margin-top:8px;padding:12px 14px;background:#f3f6ef;border-radius:12px;border:1px solid #d9e7d7;">コメント: ${vote.comment}</div>`
          : ""
      }
    </div>
  `;

  await sendEmail({
    to: event.ownerEmail,
    subject: `【幹事くん】新規投票：${event.name}`,
    text: [
      `イベント: ${event.name}`,
      `投票者: ${vote.name}`,
      vote.comment ? `コメント: ${vote.comment}` : null,
      `URL: ${ctaUrl}`,
    ]
      .filter(Boolean)
      .join("\n"),
    html: buildEmailLayout("新しい投票が届きました", bodyHtml, ctaUrl),
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

  const ctaUrl = `${process.env.NEXTAUTH_URL}/e/${event.publicId}/admin`;
  const bodyHtml = `
    <div style="font-size:14px;color:#5e4c3d;line-height:1.6;">
      <div>イベント: <strong>${event.name}</strong></div>
      <div>参加者: <strong>${attendanceName}</strong></div>
      <div>金額: <strong>${payment.amount}円</strong></div>
      <div>方法: <strong>${payment.method ?? "未選択"}</strong></div>
    </div>
  `;

  await sendEmail({
    to: event.ownerEmail,
    subject: `【幹事くん】支払申請：${event.name}`,
    text: [
      `イベント: ${event.name}`,
      `参加者: ${attendanceName}`,
      `金額: ${payment.amount}円`,
      `方法: ${payment.method ?? "未選択"}`,
      `URL: ${ctaUrl}`,
    ].join("\n"),
    html: buildEmailLayout("支払申請が届きました", bodyHtml, ctaUrl),
  });
}
