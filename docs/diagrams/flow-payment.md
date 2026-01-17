# 支払申請/承認フロー

```mermaid
sequenceDiagram
  participant P as 参加者
  participant A as 幹事
  participant UI as Web UI
  participant API as /api/events/{publicId}/payments
  participant DB as PostgreSQL
  participant Mail as Resend

  P->>UI: 支払申請（全回合計）
  UI->>API: POST /payments/apply (attendeeName)
  API->>DB: Payment 更新（PENDING, 全回分）
  DB-->>API: 更新結果
  API-->>Mail: 通知送信（非同期）
  API-->>UI: OK

  A->>UI: 承認
  UI->>API: POST /payments/{paymentId}/approve
  API->>DB: Payment 更新（APPROVED, 全回分）
  DB-->>API: 更新結果
  API-->>UI: OK

  A->>UI: 承認を取り消す
  UI->>API: POST /payments/{paymentId}/unapprove
  API->>DB: Payment 更新（PENDING, 全回分）
  DB-->>API: 更新結果
  API-->>UI: OK

  A->>UI: 差し戻し
  UI->>API: POST /payments/{paymentId}/reject
  API->>DB: Payment 更新（UNSUBMITTED, 全回分）
  DB-->>API: 更新結果
  API-->>UI: OK

  P->>UI: 申請取消
  UI->>API: POST /payments/cancel (attendeeName)
  API->>DB: Payment 更新（UNSUBMITTED, 全回分）
  DB-->>API: 更新結果
  API-->>UI: OK
```
