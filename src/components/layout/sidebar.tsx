\"use client\";

import Link from \"next/link\";
import { usePathname } from \"next/navigation\";
import { BarChart3, Map, BookOpen } from \"lucide-react\";
import { cn } from \"@/lib/utils\";

const navItems = [
  {
    href: \"/\",
    label: \"全域洞察与定价模拟\",
    icon: Map
  },
  {
    href: \"/analytics\",
    label: \"模型洞察与数据看板\",
    icon: BarChart3
  },
  {
    href: \"/resources\",
    label: \"文献与研究支持\",
    icon: BookOpen
  }
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className=\"flex w-72 flex-col border-r border-slate-800 bg-slate-950/80 backdrop-blur\">
      <div className=\"flex h-16 items-center border-b border-slate-800 px-5\">
        <div className=\"flex flex-col\">
          <span className=\"text-sm font-semibold tracking-widest text-sky-400\">
            EV PRICING LAB
          </span>
          <span className=\"text-xs text-slate-400\">
            深圳充电站 · 一区一策
          </span>
        </div>
      </div>

      <nav className=\"flex-1 space-y-1 px-3 py-4\">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active =
            item.href === \"/\" ? pathname === \"/\" : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                \"flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors\",
                \"text-slate-300 hover:bg-slate-800/70 hover:text-slate-50\",
                active &&
                  \"bg-slate-800 text-slate-50 shadow-[0_0_0_1px_rgba(56,189,248,0.5)]\"
              )}
            >
              <Icon className=\"h-4 w-4 text-sky-400\" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className=\"border-t border-slate-800 px-4 py-3 text-xs text-slate-500\">
        <div>基于空间杜宾模型 · 实证深圳</div>
        <div className=\"mt-1 text-slate-600\">v0.1 · 内部研究工具</div>
      </div>
    </aside>
  );
}

