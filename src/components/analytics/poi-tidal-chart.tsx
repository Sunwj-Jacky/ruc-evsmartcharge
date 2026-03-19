"use client";

import dynamic from "next/dynamic";

const ReactECharts = dynamic(() => import("echarts-for-react"), {
  ssr: false
});

export function PoiTidalChart() {
  const option = {
    darkMode: true,
    tooltip: { trigger: "axis" },
    legend: {
      data: ["商务住宅", "餐饮服务", "生活服务"],
      textStyle: { color: "#cbd5f5", fontSize: 10 }
    },
    grid: { left: 40, right: 10, top: 30, bottom: 25 },
    xAxis: {
      type: "category",
      boundaryGap: false,
      data: ["0", "4", "8", "12", "16", "20", "24"],
      axisLine: { lineStyle: { color: "#64748b" } },
      axisLabel: { color: "#94a3b8", fontSize: 10 }
    },
    yAxis: {
      type: "value",
      axisLine: { lineStyle: { color: "#64748b" } },
      splitLine: { lineStyle: { color: "rgba(148,163,184,0.3)" } },
      axisLabel: { color: "#94a3b8", fontSize: 10 }
    },
    series: [
      {
        name: "商务住宅",
        type: "line",
        smooth: true,
        data: [20, 30, 55, 70, 65, 50, 30],
        lineStyle: { color: "#38bdf8" }
      },
      {
        name: "餐饮服务",
        type: "line",
        smooth: true,
        data: [10, 15, 35, 55, 75, 60, 25],
        lineStyle: { color: "#14b8a6" }
      },
      {
        name: "生活服务",
        type: "line",
        smooth: true,
        data: [8, 12, 25, 40, 45, 35, 18],
        lineStyle: { color: "#fb7185" }
      }
    ]
  };

  return (
    <div className="h-full w-full">
      <ReactECharts
        option={option}
        style={{ height: "100%", width: "100%" }}
        notMerge
        lazyUpdate
      />
    </div>
  );
}

