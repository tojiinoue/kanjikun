import type { Metadata } from "next";

import SiteHeader from "@/app/_components/site-header";
import "./globals.css";

const siteUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
const siteDescription =
  "飲み会の日程調整、出欠、会計、支払申請までを一気通貫で管理できる幹事向けサービス。";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "幹事くん",
    template: "%s | 幹事くん",
  },
  description: siteDescription,
  applicationName: "幹事くん",
  openGraph: {
    title: "幹事くん",
    description: siteDescription,
    url: "/",
    siteName: "幹事くん",
    locale: "ja_JP",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "幹事くん",
    description: siteDescription,
  },
  robots: {
    index: true,
    follow: true,
  },
  verification: {
    google: "googleb4ed30b11ea7ecb0",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="antialiased">
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}
