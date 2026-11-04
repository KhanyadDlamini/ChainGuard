import Link from "next/link";
import {
  CircleAlert,
  FileSearch,
} from "lucide-react";
import {
  fetchCases,
  fetchSummary,
  type ReconciliationCase,
  type InvestigationSummary,
} from "@/lib/api";
import { fetchShellData } from "@/lib/pageData";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import ResultBadge from "@/components/ResultBadge";

export const metadata = { title: "Investigations" };
export const instant = false;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmtAmount(amount: string, symbol: string) {
  const n = parseFloat(amount);
  return isNaN(n)
    ? amount
    : `${n.toLocaleString(undefined, { maximumFractionDigits: 6 })} ${symbol}`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

const RESULT_FILTERS = [
  { value: "", label: "All results" },
  { value: "MATCHED", label: "Matched" },
  { value: "DISCREPANCY", label: "Discrepancy" },
  { value: "FAILED", label: "Failed" },
  { value: "PENDING", label: "Pending" },
  { value: "UNVERIFIED", label: "Unverified" },
];

// ---------------------------------------------------------------------------
// Summary pills
// ---------------------------------------------------------------------------

function SummaryPills({ summary }: { summary: InvestigationSummary }) {
  const items = [
    { label: "Total cases", value: summary.cases.total },
    { label: "Matched", value: summary.cases.matched, good: true },
    { label: "Discrepancies", value: summary.cases.discrepancies, warn: summary.cases.discrepancies > 0 },
    { label: "Failed", value: summary.cases.failed, bad: summary.cases.failed > 0 },
    { label: "Evidence records", value: summary.evidence.total },
    { label: "Reports generated", value: summary.investigations.total },
    { label: "AI assessments", value: summary.investigations.ai_total },
  ];

  return (
    <div className="mt-8 flex flex-wrap gap-3">
      {items.map(({ label, value, good, warn, bad }) => (
        <div
          key={label}
          className={`flex items-center gap-2 rounded-xl border px-4 py-3 ${
            good
              ? "border-[#c6e6de] bg-[#f0faf7]"
              : warn
                ? "border-[#f0dcb0] bg-[#fffbf0]"
                : bad
                  ? "border-[#f5c6c3] bg-[#fff8f8]"
                  : "border-[#eaece7] bg-white"
          }`}
        >
          <span
            className={`text-2xl font-semibold tabular-nums ${
              good ? "text-[#147d69]" : warn ? "text-[#a87932]" : bad ? "text-[#bd554d]" : ""
            }`}
          >
            {value.toLocaleString()}
          </span>
          <span className="text-xs text-[#858b85]">{label}</span>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Cases table
// ---------------------------------------------------------------------------

function CasesTable({
  cases,
  total,
  page,
  pageSize,
  result,
}: {
  cases: ReconciliationCase[];
  total: number;
  page: number;
  pageSize: number;
  result: string;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const prevHref =
    page > 1
      ? `/investigations?page=${page - 1}${result ? `&result=${result}` : ""}`
      : null;
  const nextHref =
    page < totalPages
      ? `/investigations?page=${page + 1}${result ? `&result=${result}` : ""}`
      : null;

  if (cases.length === 0) {
    return (
      <div className="flex min-h-[280px] flex-col items-center justify-center text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f5f6f2] text-[#858b85]">
          <FileSearch size={26} />
        </div>
        <h3 className="mt-4 text-sm font-semibold">No cases found</h3>
        <p className="mt-2 max-w-sm text-xs text-[#858b85]">
          {result
            ? `No reconciliation cases with result "${result}".`
            : "No reconciliation cases have been created yet."}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#eaece7]">
              {[
                "Reference",
                "Asset",
                "Expected",
                "Observed",
                "Difference",
                "Result",
                "Created",
              ].map((h) => (
                <th
                  key={h}
                  className="pb-3 pr-4 text-left text-xs font-medium text-[#858b85] last:pr-0"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cases.map((c) => {
              const diff = c.difference ? parseFloat(c.difference) : null;
              const diffColour =
                diff === null
                  ? "text-[#858b85]"
                  : diff < 0
                    ? "text-[#bd554d]"
                    : diff > 0
                      ? "text-[#a87932]"
                      : "text-[#147d69]";

              return (
                <tr
                  key={c.case_id}
                  className="border-b border-[#f5f6f2] last:border-0 hover:bg-[#faf9f6]"
                >
                  <td className="py-3.5 pr-4">
                    <div className="font-medium">{c.external_reference}</div>
                    <div className="mt-0.5 font-mono text-[10px] text-[#858b85]">
                      {c.case_id.slice(0, 8)}…
                    </div>
                  </td>
                  <td className="py-3.5 pr-4 text-sm text-[#68706a]">
                    {c.asset_symbol}
                  </td>
                  <td className="py-3.5 pr-4 tabular-nums text-sm text-[#68706a]">
                    {fmtAmount(c.expected_amount, c.asset_symbol)}
                  </td>
                  <td className="py-3.5 pr-4 tabular-nums text-sm text-[#68706a]">
                    {c.observed_amount
                      ? fmtAmount(c.observed_amount, c.asset_symbol)
                      : "—"}
                  </td>
                  <td className={`py-3.5 pr-4 tabular-nums text-sm font-medium ${diffColour}`}>
                    {c.difference
                      ? fmtAmount(c.difference, c.asset_symbol)
                      : "—"}
                  </td>
                  <td className="py-3.5 pr-4">
                    <ResultBadge result={c.result} />
                  </td>
                  <td className="py-3.5 text-xs text-[#858b85]">
                    {fmtDate(c.created_at)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="mt-5 flex items-center justify-between border-t border-[#eaece7] pt-4 text-xs text-[#858b85]">
        <span>
          {Math.min((page - 1) * pageSize + 1, total)}–
          {Math.min(page * pageSize, total)} of {total} cases
        </span>
        <div className="flex gap-2">
          {prevHref ? (
            <Link
              href={prevHref}
              className="rounded-lg border border-[#eaece7] px-3 py-1.5 text-[#68706a] hover:bg-[#faf9f6]"
            >
              Previous
            </Link>
          ) : (
            <span className="rounded-lg border border-[#eaece7] px-3 py-1.5 opacity-40">
              Previous
            </span>
          )}
          {nextHref ? (
            <Link
              href={nextHref}
              className="rounded-lg border border-[#eaece7] px-3 py-1.5 text-[#68706a] hover:bg-[#faf9f6]"
            >
              Next
            </Link>
          ) : (
            <span className="rounded-lg border border-[#eaece7] px-3 py-1.5 opacity-40">
              Next
            </span>
          )}
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function InvestigationsPage({
  searchParams,
}: PageProps<"/investigations">) {
  const sp = await searchParams;
  const page = Math.max(1, parseInt(String(sp.page ?? "1"), 10));
  const resultFilter = String(sp.result ?? "");

  const [shell, casesData, summaryData] = await Promise.all([
    fetchShellData(),
    fetchCases(page, 20, resultFilter || undefined).catch(() => null),
    fetchSummary().catch(() => null),
  ]);

  const { connectedCount, modelName } = shell;

  return (
    <main className="flex min-h-screen">
      <Sidebar connectedCount={connectedCount} modelName={modelName} />

      <section className="min-w-0 flex-1">
        <TopBar />

        <div className="mx-auto max-w-[1450px] px-5 py-8 md:px-9 md:py-10">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-medium text-[#147d69]">
              <span className="h-2 w-2 rounded-full bg-[#147d69]" />
              RECONCILIATION CASES
            </div>
            <h1 className="text-3xl font-semibold tracking-tight">
              Investigations
            </h1>
            <p className="mt-2 text-sm text-[#858b85]">
              Reconciliation outcomes and discrepancy investigations.
            </p>
          </div>

          {/* Summary pills */}
          {summaryData !== null && (
            <SummaryPills summary={summaryData} />
          )}

          {/* Cases table */}
          <div className="mt-6 rounded-2xl border border-[#eaece7] bg-white p-6">
            {/* Filter bar */}
            <div className="mb-6 flex flex-wrap items-center gap-2">
              {RESULT_FILTERS.map(({ value, label }) => (
                <Link
                  key={value}
                  href={`/investigations${value ? `?result=${value}` : ""}`}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                    resultFilter === value
                      ? "bg-[#147d69] text-white"
                      : "border border-[#eaece7] text-[#68706a] hover:bg-[#f5f6f2]"
                  }`}
                >
                  {label}
                </Link>
              ))}
            </div>

            {casesData === null ? (
              <div className="flex items-center gap-3 rounded-xl border border-[#fdecea] bg-[#fff8f8] p-4 text-sm text-[#bd554d]">
                <CircleAlert size={16} />
                Could not load cases — the API may be offline.
              </div>
            ) : (
              <CasesTable
                cases={casesData.items}
                total={casesData.total}
                page={page}
                pageSize={20}
                result={resultFilter}
              />
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
