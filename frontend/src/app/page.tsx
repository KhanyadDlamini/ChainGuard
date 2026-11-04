import { Suspense } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Blocks,
  BrainCircuit,
  CircleAlert,
  FileSearch,
  Fingerprint,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import {
  fetchSummary,
  fetchPayments,
  fetchCases,
  type InvestigationSummary,
  type Payment,
  type ReconciliationCase,
} from "@/lib/api";
import { fetchShellData } from "@/lib/pageData";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import InfraPanel from "@/components/InfraPanel";
import ResultBadge from "@/components/ResultBadge";

export const metadata = { title: "Overview" };
export const instant = false;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function truncateHash(hash: string | null) {
  if (!hash) return "—";
  return `${hash.slice(0, 10)}…${hash.slice(-6)}`;
}

function fmtAmount(amount: string, symbol: string) {
  const n = parseFloat(amount);
  if (isNaN(n)) return amount;
  return `${n.toLocaleString(undefined, { maximumFractionDigits: 4 })} ${symbol}`;
}

// ---------------------------------------------------------------------------
// Stat cards — server-rendered from summary
// ---------------------------------------------------------------------------

function StatCards({ summary }: { summary: InvestigationSummary }) {
  const cards = [
    {
      title: "Payments monitored",
      value: summary.payments.total.toLocaleString(),
      note: "Total payments registered",
      icon: Wallet,
      href: "/payments",
    },
    {
      title: "Discrepancies",
      value: summary.cases.discrepancies.toLocaleString(),
      note: `${summary.cases.total} reconciliation cases total`,
      icon: CircleAlert,
      href: "/investigations?result=DISCREPANCY",
      warn: summary.cases.discrepancies > 0,
    },
    {
      title: "Investigations",
      value: summary.investigations.total.toLocaleString(),
      note: `${summary.investigations.ai_total} AI assessments`,
      icon: FileSearch,
      href: "/investigations",
    },
    {
      title: "Evidence records",
      value: summary.evidence.total.toLocaleString(),
      note: "On-chain transfer events captured",
      icon: Fingerprint,
      href: "/evidence",
    },
  ];

  return (
    <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map(({ title, value, note, icon: Icon, href, warn }) => (
        <Link
          key={title}
          href={href}
          className="group rounded-2xl border border-[#eaece7] bg-white p-5 transition hover:border-[#147d69]/40 hover:shadow-sm"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#858b85]">{title}</span>
            <Icon
              size={18}
              className={warn ? "text-[#a87932]" : "text-[#858b85]"}
            />
          </div>
          <div
            className={`mt-5 text-3xl font-semibold tracking-tight tabular-nums ${warn ? "text-[#a87932]" : ""}`}
          >
            {value}
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-[11px] text-[#9a9f99]">{note}</span>
            <ArrowRight
              size={13}
              className="text-[#c0c5be] transition group-hover:text-[#147d69]"
            />
          </div>
        </Link>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stat cards skeleton
// ---------------------------------------------------------------------------

function StatCardsSkeleton() {
  return (
    <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse rounded-2xl border border-[#eaece7] bg-white p-5"
        >
          <div className="h-3 w-2/3 rounded bg-[#eaece7]" />
          <div className="mt-5 h-8 w-1/2 rounded bg-[#eaece7]" />
          <div className="mt-2 h-3 w-3/4 rounded bg-[#eaece7]" />
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Recent payments table
// ---------------------------------------------------------------------------

function RecentPayments({ payments }: { payments: Payment[] }) {
  if (payments.length === 0) {
    return (
      <div className="flex min-h-[200px] flex-col items-center justify-center text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f5f6f2] text-[#858b85]">
          <Wallet size={22} />
        </div>
        <p className="mt-3 text-sm text-[#858b85]">No payments yet.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[#eaece7] text-left">
            <th className="pb-3 pr-4 text-xs font-medium text-[#858b85]">
              Reference
            </th>
            <th className="pb-3 pr-4 text-xs font-medium text-[#858b85]">
              Amount
            </th>
            <th className="pb-3 pr-4 text-xs font-medium text-[#858b85]">
              Tx hash
            </th>
            <th className="pb-3 text-xs font-medium text-[#858b85]">Status</th>
          </tr>
        </thead>
        <tbody>
          {payments.map((p) => (
            <tr
              key={p.id}
              className="border-b border-[#f5f6f2] last:border-0"
            >
              <td className="py-3 pr-4 font-medium">
                {p.external_reference}
              </td>
              <td className="py-3 pr-4 tabular-nums text-[#68706a]">
                {fmtAmount(p.expected_amount, p.asset_symbol)}
              </td>
              <td className="py-3 pr-4 font-mono text-xs text-[#858b85]">
                {truncateHash(p.expected_tx_hash)}
              </td>
              <td className="py-3">
                <ResultBadge result={p.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Recent cases table
// ---------------------------------------------------------------------------

function RecentCases({ cases }: { cases: ReconciliationCase[] }) {
  if (cases.length === 0) {
    return (
      <div className="flex min-h-[200px] flex-col items-center justify-center text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f5f6f2] text-[#858b85]">
          <Blocks size={22} />
        </div>
        <p className="mt-3 text-sm text-[#858b85]">No reconciliation cases yet.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[#eaece7] text-left">
            <th className="pb-3 pr-4 text-xs font-medium text-[#858b85]">
              Reference
            </th>
            <th className="pb-3 pr-4 text-xs font-medium text-[#858b85]">
              Expected
            </th>
            <th className="pb-3 pr-4 text-xs font-medium text-[#858b85]">
              Observed
            </th>
            <th className="pb-3 text-xs font-medium text-[#858b85]">Result</th>
          </tr>
        </thead>
        <tbody>
          {cases.map((c) => (
            <tr
              key={c.case_id}
              className="border-b border-[#f5f6f2] last:border-0"
            >
              <td className="py-3 pr-4 font-medium">
                {c.external_reference}
              </td>
              <td className="py-3 pr-4 tabular-nums text-[#68706a]">
                {fmtAmount(c.expected_amount, c.asset_symbol)}
              </td>
              <td className="py-3 pr-4 tabular-nums text-[#68706a]">
                {c.observed_amount
                  ? fmtAmount(c.observed_amount, c.asset_symbol)
                  : "—"}
              </td>
              <td className="py-3">
                <ResultBadge result={c.result} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Table skeleton
// ---------------------------------------------------------------------------

function TableSkeleton() {
  return (
    <div className="animate-pulse space-y-3 pt-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex gap-4">
          <div className="h-4 flex-1 rounded bg-[#eaece7]" />
          <div className="h-4 w-24 rounded bg-[#eaece7]" />
          <div className="h-4 w-32 rounded bg-[#eaece7]" />
          <div className="h-4 w-20 rounded bg-[#eaece7]" />
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Async data-fetching sub-components (streamed with Suspense)
// ---------------------------------------------------------------------------

async function SummaryCards() {
  let summary: InvestigationSummary;
  try {
    summary = await fetchSummary();
  } catch {
    return (
      <div className="mt-8 rounded-2xl border border-[#fdecea] bg-white px-5 py-4 text-sm text-[#bd554d]">
        Could not load summary data — the API may be starting up.
      </div>
    );
  }
  return <StatCards summary={summary} />;
}

async function PaymentsSection() {
  let data;
  try {
    data = await fetchPayments(1, 5);
  } catch {
    return (
      <p className="text-sm text-[#bd554d]">
        Could not load payments — the API may be starting up.
      </p>
    );
  }
  return <RecentPayments payments={data.items} />;
}

async function CasesSection() {
  let data;
  try {
    data = await fetchCases(1, 5);
  } catch {
    return (
      <p className="text-sm text-[#bd554d]">
        Could not load cases — the API may be starting up.
      </p>
    );
  }
  return <RecentCases cases={data.items} />;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function DashboardPage() {
  // Fetch shell data (infra status + model name) for sidebar.
  const { statuses: infraStatuses, connectedCount, modelName } =
    await fetchShellData();

  return (
    <main className="flex min-h-screen">
      {/* Sidebar — server-rendered with live connected count + model name */}
      <Sidebar connectedCount={connectedCount} modelName={modelName} />

      <section className="min-w-0 flex-1">
        {/* Top bar */}
        <TopBar />

        <div className="mx-auto max-w-[1450px] px-5 py-8 md:px-9 md:py-10">
          {/* Page heading */}
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <div className="mb-2 flex items-center gap-2 text-xs font-medium text-[#147d69]">
                <span className="h-2 w-2 rounded-full bg-[#147d69]" />
                EVIDENCE-DRIVEN RECONCILIATION
              </div>
              <h1 className="text-3xl font-semibold tracking-tight md:text-[34px]">
                Good to see you.
              </h1>
              <p className="mt-2 text-sm text-[#858b85]">
                Monitor transactions, discrepancies and ongoing investigations.
              </p>
            </div>
            <Link
              href="/payments"
              className="flex items-center gap-2 rounded-xl bg-[#147d69] px-4 py-3 text-sm font-medium text-white transition hover:bg-[#106653]"
            >
              <Wallet size={15} />
              View all payments
            </Link>
          </div>

          {/* Stat cards — streamed */}
          <Suspense fallback={<StatCardsSkeleton />}>
            <SummaryCards />
          </Suspense>

          {/* Activity grid */}
          <div className="mt-7 grid gap-5 xl:grid-cols-[1.55fr_1fr]">
            {/* Recent activity — two stacked panels */}
            <div className="space-y-5">
              {/* Recent payments */}
              <div className="rounded-2xl border border-[#eaece7] bg-white p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-semibold tracking-tight">
                      Recent payments
                    </h2>
                    <p className="mt-1 text-xs text-[#858b85]">
                      Latest 5 registered payments
                    </p>
                  </div>
                  <Link
                    href="/payments"
                    className="flex items-center gap-1.5 rounded-lg bg-[#f5f6f2] px-3 py-1.5 text-[11px] text-[#68706a] hover:bg-[#eaece7]"
                  >
                    All payments
                    <ArrowRight size={12} />
                  </Link>
                </div>
                <div className="mt-5">
                  <Suspense fallback={<TableSkeleton />}>
                    <PaymentsSection />
                  </Suspense>
                </div>
              </div>

              {/* Recent reconciliation cases */}
              <div className="rounded-2xl border border-[#eaece7] bg-white p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-semibold tracking-tight">
                      Reconciliation activity
                    </h2>
                    <p className="mt-1 text-xs text-[#858b85]">
                      Latest 5 reconciliation cases
                    </p>
                  </div>
                  <Link
                    href="/investigations"
                    className="flex items-center gap-1.5 rounded-lg bg-[#f5f6f2] px-3 py-1.5 text-[11px] text-[#68706a] hover:bg-[#eaece7]"
                  >
                    All cases
                    <ArrowRight size={12} />
                  </Link>
                </div>
                <div className="mt-5">
                  <Suspense fallback={<TableSkeleton />}>
                    <CasesSection />
                  </Suspense>
                </div>
              </div>
            </div>

            {/* Infrastructure panel — client component seeded with server data */}
            <InfraPanel initial={infraStatuses} />
          </div>

          {/* Footer banner */}
          <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-[#eaece7] bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e8f3ef] text-[#147d69]">
                <ShieldCheck size={20} />
              </div>
              <div>
                <div className="text-sm font-semibold">
                  Evidence before conclusions.
                </div>
                <div className="mt-1 text-xs text-[#858b85]">
                  Verified facts remain separate from AI-generated assessments.
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1.5 rounded-lg border border-[#d0e8fc] bg-[#f0f8ff] px-3 py-1.5 text-[11px] font-semibold text-[#1a6fa8]">
                <BrainCircuit size={12} />
                {modelName}
              </span>
              <span className="text-[11px] font-medium text-[#147d69]">
                CHAINGUARD · LOCAL ENVIRONMENT
              </span>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
