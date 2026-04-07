export type PoiCategory = "商务住宅" | "餐饮服务" | "生活服务";

export interface StationBase {
  id: string;
  name: string;
  lat: number;
  lng: number;
  poiCategory: PoiCategory;
}

export interface StationWithMetrics extends StationBase {
  utilization: number;
  demandScore: number;
  basePrice: number;
  optimizedPrice?: number;
  district?: string;
}

