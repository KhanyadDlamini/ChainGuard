"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  BrainCircuit,
  FileSearch,
  Fingerprint,
  LayoutDashboard,
  Network,
  ShieldCheck,
  Wallet,
} from "lucide-react";

type NavItem = {
  label: string;
  href: string;
  icon: React.ElementType;
};

const NAV_ITEMS: NavItem[] = [
  { label: "Overview", href: "/", icon: LayoutDashboard },
  { label: "Payments", href: "/payments", icon: Wallet },
  { label: "Investigations", href: "/investigations", icon: FileSearch },
  { label: "Evidence", href: "/evidence", icon: Fingerprint },
];

type Props = {
  connectedCount: number;
  /** Active AI model name passed in from server component. */
  modelName?: string;
};

export default function Sidebar({ connectedCount, modelName }: Props) {
  const pathname = usePathname();

  return (
    <aside className="hidden w-[250px] shrink-0 border-r border-[#eaece7] bg-white px-5 py-7 lg:flex lg:flex-col">
      {/* Logo */}
      <div className="mb-12 flex items-center gap-3 px-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#147d69] text-white">
          <ShieldCheck size={23} />
        </div>
        <div>
          <div className="text-lg font-semibold tracking-tight">ChainGuard</div>
          <div className="text-[11px] tracking-wide text-[#858b85]">
            INVESTIGATION PLATFORM
          </div>
        </div>
      </div>

      {/* Workspace nav */}
      <div className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#9a9f99]">
        Workspace
      </div>
      <nav className="space-y-1">
        {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
          const active =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={label}
              href={href}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm transition ${
                active
                  ? "bg-[#e8f3ef] font-semibold text-[#147d69]"
                  : "text-[#68706a] hover:bg-[#f7f8f5]"
              }`}
            >
              <Icon size={18} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* System */}
      <div className="mb-3 mt-10 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#9a9f99]">
        System
      </div>
      <Link
        href="/connections"
        className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm transition ${
          pathname === "/connections"
            ? "bg-[#e8f3ef] font-semibold text-[#147d69]"
            : "text-[#68706a] hover:bg-[#f7f8f5]"
        }`}
      >
        <Network size={18} />
        Connections
      </Link>

      {/* Active model badge */}
      {modelName && (
        <Link
          href="/connections"
          className="mt-3 flex w-full items-center gap-2.5 rounded-xl border border-[#d0e8fc] bg-[#f0f8ff] px-3 py-2.5 transition hover:border-[#a8cff5]"
          title="View AI model details"
        >
          <BrainCircuit size={15} className="shrink-0 text-[#1a6fa8]" />
          <div className="min-w-0">
            <div className="text-[9px] font-semibold uppercase tracking-widest text-[#1a6fa8]">
              AI Model
            </div>
            <div className="truncate text-[11px] font-semibold text-[#1a3a5c]">
              {modelName}
            </div>
          </div>
        </Link>
      )}

      {/* Health badge */}
      <div className="mt-auto rounded-2xl border border-[#eaece7] bg-[#faf9f6] p-4">
        <div className="mb-2 flex items-center gap-2 text-xs font-semibold">
          <Activity size={15} className="text-[#147d69]" />
          System health
        </div>
        <div className="text-2xl font-semibold tabular-nums">
          {connectedCount}
          <span className="text-sm font-normal text-[#858b85]"> / 3</span>
        </div>
        <div className="mt-1 text-xs text-[#858b85]">Services connected</div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#e7e9e4]">
          <div
            className="h-full rounded-full bg-[#147d69] transition-all"
            style={{ width: `${(connectedCount / 3) * 100}%` }}
          />
        </div>
      </div>
    </aside>
  );
}
