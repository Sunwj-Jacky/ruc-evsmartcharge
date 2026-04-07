import { ReactNode } from "react";

export function MainShell({ children }: { children: ReactNode }) {
  return (
    <main className="flex-1 bg-slate-950">
      <div className="flex h-16 items-center justify-between border-b border-slate-800 px-6">
        <div className="space-y-0.5">
          <h1 className="text-lg font-semibold tracking-tight text-slate-50">
            充电站动态定价与运营辅助决策系统
          </h1>
          <p className="text-xs text-slate-400">
            利用空间杜宾模型刻画跨区域溢出效应，支持“一区一策、一时一价”的精细化运营。
          </p>
        </div>
        <div className="text-xs text-slate-500">
          深圳市 · 实证面板数据（示意版）
        </div>
      </div>

      <div className="h-[calc(100vh-4rem)] overflow-hidden p-4">
        <div className="h-full rounded-xl border border-slate-800 bg-slate-900/60 p-3 shadow-lg shadow-sky-900/30">
          {children}
        </div>
      </div>
    </main>
  );
}

