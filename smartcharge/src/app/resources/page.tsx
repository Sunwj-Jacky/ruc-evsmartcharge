import { mockPapers } from "@/lib/mock/resources";

export default function ResourcesPage() {
  return (
    <div className="flex h-full flex-col gap-3">
      <header className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/60 px-4 py-2 text-xs text-slate-400">
        <div>
          <div className="text-sm font-medium text-slate-100">
            文献与研究支持
          </div>
          <div>支撑本系统的理论与实证研究</div>
        </div>
        <div>示意版 · 可扩展文献清单</div>
      </header>

      <div className="grid flex-1 grid-cols-2 gap-3 overflow-y-auto pr-1">
        {mockPapers.map((paper) => (
          <article
            key={paper.id}
            className="flex flex-col justify-between rounded-lg border border-slate-800 bg-slate-950/80 p-4 text-xs"
          >
            <div>
              <h2 className="mb-1 text-sm font-semibold text-slate-50">
                {paper.title}
              </h2>
              <div className="mb-2 text-[11px] text-slate-400">
                {paper.authors}
              </div>
              <p className="line-clamp-4 text-[11px] text-slate-300">
                {paper.abstract}
              </p>
            </div>

            <div className="mt-3 flex gap-2">
              <a
                href={paper.sourceUrl}
                className="inline-flex flex-1 items-center justify-center rounded-md border border-sky-500/70 bg-sky-500/10 px-3 py-1.5 text-[11px] font-medium text-sky-300 transition-colors hover:bg-sky-500/20"
              >
                来源链接
              </a>
              <a
                href={paper.pdfUrl}
                className="inline-flex flex-1 items-center justify-center rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-[11px] font-medium text-slate-200 transition-colors hover:bg-slate-800"
              >
                下载 PDF
              </a>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

