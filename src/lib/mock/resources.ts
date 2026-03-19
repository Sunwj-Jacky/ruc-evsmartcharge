export interface PaperResource {
  id: string;
  title: string;
  authors: string;
  abstract: string;
  sourceUrl: string;
  pdfUrl: string;
}

export const mockPapers: PaperResource[] = [
  {
    id: "paper-1",
    title: "空间杜宾模型下的城市充电需求空间溢出效应研究——以深圳为例",
    authors: "张三, 李四",
    abstract:
      "基于深圳市充电大数据，构建空间杜宾模型，刻画不同功能区充电需求的空间相关性与溢出效应，为充电站布局与动态定价提供实证依据。",
    sourceUrl: "#",
    pdfUrl: "#"
  },
  {
    id: "paper-2",
    title: "一区一策视角下的充电基础设施精细化定价机制",
    authors: "王五, 赵六",
    abstract:
      "从生活服务、餐饮服务与商务住宅三类 POI 功能区出发，分析充电需求弹性差异，提出分区分时段的动态定价框架。",
    sourceUrl: "#",
    pdfUrl: "#"
  }
];

