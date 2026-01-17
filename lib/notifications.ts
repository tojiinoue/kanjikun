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

const APP_BASE_URL = "https://kanjikun.com";

function buildEmailLayout(
  title: string,
  bodyHtml: string,
  ctaUrl: string,
  ctaLabel: string
) {
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
          <a href="${ctaUrl}" style="display:inline-block;padding:10px 18px;border-radius:999px;background:#2f7f3b;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;">${ctaLabel}</a>
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

  const ctaUrl = `${APP_BASE_URL}/e/${event.publicId}`;
  const bodyHtml = `
    <div style="font-size:14px;color:#5e4c3d;line-height:1.6;">
      <div>イベント「<strong>${event.name}</strong>」に新しい投票がありました。</div>
      <div style="margin-top:12px;">投票者: <strong>${vote.name}</strong></div>
      ${
        vote.comment
          ? `<div style="margin-top:12px;padding:12px 14px;background:#f3f6ef;border-radius:12px;border:1px solid #d9e7d7;">コメント: ${vote.comment}</div>`
          : ""
      }
      <div style="margin-top:12px;">現在の投票状況は、以下のイベントページから確認できます。</div>
    </div>
  `;

  await sendEmail({
    to: event.ownerEmail,
    subject: `【幹事くん】新しい投票がありました｜${event.name}`,
    text: [
      `イベント「${event.name}」に新しい投票がありました。`,
      "",
      `投票者：${vote.name}`,
      vote.comment ? `コメント: ${vote.comment}` : null,
      "",
      "現在の投票状況は、以下のイベントページから確認できます。",
      ctaUrl,
    ]
      .filter(Boolean)
      .join("\n"),
    html: buildEmailLayout(
      "新しい投票がありました",
      bodyHtml,
      ctaUrl,
      "イベントページを確認する"
    ),
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

  const ctaUrl = `${APP_BASE_URL}/e/${event.publicId}/admin`;
  const bodyHtml = `
    <div style="font-size:14px;color:#5e4c3d;line-height:1.6;">
      <div>イベント「<strong>${event.name}</strong>」にて、支払申請が届いています。</div>
      <div style="margin-top:12px;">申請者: <strong>${attendanceName}</strong></div>
      <div>金額: <strong>${payment.amount}円</strong></div>
      <div>支払方法: <strong>${payment.method ?? "未選択"}</strong></div>
      <div style="margin-top:12px;">内容の確認・対応は、幹事ページから行ってください。</div>
    </div>
  `;

  await sendEmail({
    to: event.ownerEmail,
    subject: `【幹事くん】支払申請が届いています｜${event.name}`,
    text: [
      `イベント「${event.name}」にて、支払申請が届いています。`,
      "",
      `申請者：${attendanceName}`,
      `金額：${payment.amount}円`,
      `支払方法：${payment.method ?? "未選択"}`,
      "",
      "内容の確認・対応は、幹事ページから行ってください。",
      ctaUrl,
    ].join("\n"),
    html: buildEmailLayout(
      "支払申請が届いています",
      bodyHtml,
      ctaUrl,
      "幹事ページを確認する"
    ),
  });
}
