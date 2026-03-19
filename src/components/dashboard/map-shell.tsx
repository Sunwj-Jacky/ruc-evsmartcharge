"use client";

export function MapShell() {
  return (
    <div className="flex h-full gap-3">
      <section className="flex-[0.65] rounded-lg border border-slate-800 bg-slate-950/60">
        <div className="flex h-10 items-center justify-between border-b border-slate-800 px-3 text-xs text-slate-400">
          <span className="font-medium text-slate-200">
            深圳市 · 充电站空间分布
          </span>
          <span>缩放/平移 · Hover 查看站点信息（待接入）</span>
        </div>
        <div className="h-[calc(100%-2.5rem)]">
          <div className="flex h-full items-center justify-center text-sm text-slate-500">
            地图加载中（占位）——后续接入深圳 GeoJSON 与 275 个站点散点层
          </div>
        </div>
      </section>

      <section className="flex-[0.35] rounded-lg border border-slate-800 bg-slate-950/80">
        <div className="flex h-10 items-center justify-between border-b border-slate-800 px-3 text-xs text-slate-400">
          <span className="font-medium text-slate-200">
            决策分析面板 · 定价模拟器
          </span>
          <span>全局统计 / 站点详情 / 策略对比</span>
        </div>

        <div className="flex h-[calc(100%-2.5rem)] flex-col gap-3 overflow-y-auto p-3 text-xs">
          <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-3">
            <div className="mb-2 text-xs font-medium text-slate-200">
              深圳市全局概览（示意）
            </div>
            <div className="grid grid-cols-3 gap-3 text-[11px]">
              <div>
                <div className="text-slate-400">总站点数</div>
                <div className="mt-1 text-lg font-semibold text-sky-400">275</div>
              </div>
              <div>
                <div className="text-slate-400">平均利用率</div>
                <div className="mt-1 text-lg font-semibold text-emerald-400">63%</div>
              </div>
              <div>
                <div className="text-slate-400">高需求区域占比</div>
                <div className="mt-1 text-lg font-semibold text-rose-400">41%</div>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-dashed border-slate-800/80 bg-slate-900/40 p-3">
            <div className="mb-1 text-xs font-medium text-slate-200">
              站点详情 &amp; 定价优化沙盘
            </div>
            <p className="text-[11px] text-slate-500">
              选择地图上的任一站点后，将在此展示：基础属性、历史价格趋势迷你折线图、
              当前策略 vs AI 优化策略收益对比，以及交互滑块和分时定价表。
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

