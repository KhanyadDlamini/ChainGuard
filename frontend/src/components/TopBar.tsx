"use client";

import { Bell, ChevronDown, Search } from "lucide-react";
import { usePathname } from "next/navigation";

const BREADCRUMBS: Record<string, { section: string; title: string }> = {
  "/": { section: "Workspace / Overview", title: "Investigation centre" },
  "/payments": { section: "Workspace / Payments", title: "Payment register" },
  "/investigations": {
    section: "Workspace / Investigations",
    title: "Reconciliation cases",
  },
  "/evidence": { section: "Workspace / Evidence", title: "Evidence records" },
  "/connections": {
    section: "Workspace / System",
    title: "Connection status",
  },
};

export default function TopBar() {
  const pathname = usePathname();
  const crumb =
    BREADCRUMBS[pathname] ??
    BREADCRUMBS[Object.keys(BREADCRUMBS).find((k) => pathname.startsWith(k) && k !== "/") ?? "/"];

  return (
    <header className="flex h-[76px] items-center justify-between border-b border-[#eaece7] bg-white px-5 md:px-9">
      <div>
        <div className="text-xs text-[#858b85]">{crumb.section}</div>
        <div className="mt-1 text-sm font-semibold">{crumb.title}</div>
      </div>
      <div className="flex items-center gap-3">
        <button
          aria-label="Search"
          className="hidden rounded-lg border border-[#eaece7] p-2.5 text-[#68706a] hover:bg-[#faf9f6] sm:block"
        >
          <Search size={17} />
        </button>
        <button
          aria-label="Notifications"
          className="relative rounded-lg border border-[#eaece7] p-2.5 text-[#68706a] hover:bg-[#faf9f6]"
        >
          <Bell size={17} />
          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-[#147d69]" />
        </button>
        <div className="flex items-center gap-2 border-l border-[#eaece7] pl-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#e8f3ef] text-xs font-semibold text-[#147d69]">
            CG
          </div>
          <div className="hidden sm:block">
            <div className="text-xs font-semibold">Workspace</div>
            <div className="text-[10px] text-[#858b85]">Administrator</div>
          </div>
          <ChevronDown size={14} className="hidden text-[#858b85] sm:block" />
        </div>
      </div>
    </header>
  );
}
