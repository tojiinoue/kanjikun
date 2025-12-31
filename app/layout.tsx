import type { Metadata } from "next";

import SiteHeader from "@/app/_components/site-header";
import "./globals.css";

export const metadata: Metadata = {
  title: "幹事くん",
  description: "飲み会の準備から支払いまでを一気通貫で管理する幹事向けサービス",
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
