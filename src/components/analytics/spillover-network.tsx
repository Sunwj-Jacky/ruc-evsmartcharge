"use client";

import dynamic from "next/dynamic";

const ReactECharts = dynamic(() => import("echarts-for-react"), {
  ssr: false
});

export function SpilloverNetwork() {
  const option = {
    darkMode: true,
    tooltip: {},
    xAxis: { show: false },
    yAxis: { show: false },
    series: [
      {
        type: "graph",
        layout: "force",
        roam: true,
        label: {
          show: true,
          color: "#cbd5f5",
          fontSize: 10
        },
        force: {
          repulsion: 140,
          edgeLength: 80
        },
        lineStyle: {
          color: "rgba(56,189,248,0.6)",
          width: 1
        },
        data: [
          { name: "南山商务圈", value: 10, symbolSize: 26, itemStyle: { color: "#38bdf8" } },
          { name: "福田CBD", value: 9, symbolSize: 24, itemStyle: { color: "#22c55e" } },
          { name: "前海自贸区", value: 8, symbolSize: 22, itemStyle: { color: "#fb7185" } },
          { name: "宝安生活区", value: 6, symbolSize: 18, itemStyle: { color: "#a855f7" } },
          { name: "龙华生活区", value: 5, symbolSize: 16, itemStyle: { color: "#eab308" } }
        ],
        links: [
          { source: "南山商务圈", target: "福田CBD", value: 0.42 },
          { source: "南山商务圈", target: "前海自贸区", value: 0.38 },
          { source: "福田CBD", target: "宝安生活区", value: 0.26 },
          { source: "前海自贸区", target: "宝安生活区", value: 0.22 },
          { source: "前海自贸区", target: "龙华生活区", value: 0.18 }
        ]
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

