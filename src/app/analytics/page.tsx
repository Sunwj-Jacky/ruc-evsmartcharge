import { PoiTidalChart } from "@/components/analytics/poi-tidal-chart";
import { SpilloverNetwork } from "@/components/analytics/spillover-network";

export default function AnalyticsPage() {
  return (
    <div className="flex h-full flex-col gap-3">
      <header className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/60 px-4 py-2 text-xs text-slate-400">
        <div>
          <div className="text-sm font-medium text-slate-100">
            模型洞察与数据看板
          </div>
          <div>空间杜宾模型结果 & 区域需求特征</div>
        </div>
        <div>示意版 · 待接入真实回归结果</div>
      </header>

      <div className="grid flex-1 grid-cols-2 gap-3">
        <section className="flex flex-col rounded-lg border border-slate-800 bg-slate-950/70 p-3">
          <div className="mb-2 flex items-center justify-between text-xs">
            <div className="font-medium text-slate-100">
              三类 POI 区域 · 24 小时潮汐特征
            </div>
            <div className="text-slate-500">需求强度指数（示意）</div>
          </div>
          <div className="flex-1">
            <PoiTidalChart />
          </div>
        </section>

        <section className="flex flex-col rounded-lg border border-slate-800 bg-slate-950/70 p-3">
          <div className="mb-2 flex items-center justify-between text-xs">
            <div className="font-medium text-slate-100">
              充电站空间溢出效应 · 关系网络
            </div>
            <div className="text-slate-500">
              功能区之间的需求联动强度（示意）
            </div>
          </div>
          <div className="flex-1">
            <SpilloverNetwork />
          </div>
        </section>
      </div>
    </div>
  );
}

