import type { Metadata } from "next";
import "@/styles/globals.css";
import { Sidebar } from "@/components/layout/sidebar";
import { MainShell } from "@/components/layout/main-shell";

export const metadata: Metadata = {
  title: "充电站动态定价与运营辅助决策系统",
  description:
    "基于空间杜宾模型的深圳充电站定价与运营辅助决策系统 - 一区一策，一时一价。"
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" className="dark">
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased">
        <div className="flex min-h-screen">
          <Sidebar />
          <MainShell>{children}</MainShell>
        </div>
      </body>
    </html>
  );
}

