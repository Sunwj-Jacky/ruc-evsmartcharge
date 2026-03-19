import type { StationWithMetrics } from "@/lib/types/station";

export const mockTop30Stations: StationWithMetrics[] = [
  {
    id: "SZ-001",
    name: "深圳湾商务中心充电站",
    lat: 22.515,
    lng: 113.941,
    poiCategory: "商务住宅",
    utilization: 0.78,
    demandScore: 0.86,
    basePrice: 1.8,
    optimizedPrice: 2.05,
    district: "南山区"
  },
  {
    id: "SZ-002",
    name: "科技园核心区充电站",
    lat: 22.542,
    lng: 113.948,
    poiCategory: "商务住宅",
    utilization: 0.72,
    demandScore: 0.82,
    basePrice: 1.75,
    optimizedPrice: 1.98,
    district: "南山区"
  }
];

export const poiCategoryColor: Record<string, string> = {
  商务住宅: "#1d4ed8",
  餐饮服务: "#0f766e",
  生活服务: "#b91c1c"
};

export async function fetchTopStationsMock(): Promise<StationWithMetrics[]> {
  await new Promise((resolve) => setTimeout(resolve, 200));
  return mockTop30Stations;
}

