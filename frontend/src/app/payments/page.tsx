import Link from "next/link";
import {
  CircleAlert,
  Wallet,
} from "lucide-react";
import { fetchPayments, type Payment } from "@/lib/api";
import { fetchShellData } from "@/lib/pageData";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import ResultBadge from "@/components/ResultBadge";

export const metadata = { title: "Payments" };
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
  return isNaN(n)
    ? amount
    : `${n.toLocaleString(undefined, { maximumFractionDigits: 6 })} ${symbol}`;
}

const STATUS_FILTER_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "PENDING", label: "Pending" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "RECONCILIATION_REQUIRED", label: "Reconciliation required" },
  { value: "FAILED", label: "Failed" },
];

// ---------------------------------------------------------------------------
// Payment row
// ---------------------------------------------------------------------------

function PaymentRow({ p }: { p: Payment }) {
  return (
    <tr className="group border-b border-[#f5f6f2] last:border-0 hover:bg-[#faf9f6]">
      <td className="py-3.5 pr-4">
        <div className="font-medium">{p.external_reference}</div>
        <div className="mt-0.5 font-mono text-[10px] text-[#858b85]">
          {p.id.slice(0, 8)}…
        </div>
      </td>
      <td className="py-3.5 pr-4 text-sm tabular-nums text-[#68706a]">
        {fmtAmount(p.expected_amount, p.asset_symbol)}
      </td>
      <td className="py-3.5 pr-4 font-mono text-xs text-[#858b85]">
        {truncateHash(p.expected_tx_hash)}
      </td>
      <td className="py-3.5 pr-4 text-sm text-[#858b85]">
        {p.chain_id}
      </td>
      <td className="py-3.5">
        <ResultBadge result={p.status} />
      </td>
    </tr>
  );
}

// ---------------------------------------------------------------------------
// Payments table
// ---------------------------------------------------------------------------

function PaymentsTable({ payments, total, page, pageSize, status }: {
  payments: Payment[];
  total: number;
  page: number;
  pageSize: number;
  status: string;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const prevHref = page > 1
    ? `/payments?page=${page - 1}${status ? `&status=${status}` : ""}`
    : null;
  const nextHref = page < totalPages
    ? `/payments?page=${page + 1}${status ? `&status=${status}` : ""}`
    : null;

  if (payments.length === 0) {
    return (
      <div className="flex min-h-[280px] flex-col items-center justify-center text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f5f6f2] text-[#858b85]">
          <Wallet size={26} />
        </div>
        <h3 className="mt-4 text-sm font-semibold">No payments found</h3>
        <p className="mt-2 max-w-sm text-xs text-[#858b85]">
          {status
            ? `No payments with status "${status}".`
            : "No payments have been registered yet."}
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
              {["Reference / ID", "Expected amount", "Tx hash", "Chain", "Status"].map((h) => (
                <th key={h} className="pb-3 pr-4 text-left text-xs font-medium text-[#858b85] last:pr-0">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {payments.map((p) => (
              <PaymentRow key={p.id} p={p} />
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="mt-5 flex items-center justify-between border-t border-[#eaece7] pt-4 text-xs text-[#858b85]">
        <span>
          {Math.min((page - 1) * pageSize + 1, total)}–{Math.min(page * pageSize, total)} of{" "}
          {total} payments
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

export default async function PaymentsPage({
  searchParams,
}: PageProps<"/payments">) {
  const sp = await searchParams;
  const page = Math.max(1, parseInt(String(sp.page ?? "1"), 10));
  const statusFilter = String(sp.status ?? "");

  const [{ connectedCount, modelName }, paymentsData] = await Promise.all([
    fetchShellData(),
    fetchPayments(page, 20, statusFilter || undefined).catch(() => null),
  ]);

  return (
    <main className="flex min-h-screen">
      <Sidebar connectedCount={connectedCount} modelName={modelName} />

      <section className="min-w-0 flex-1">
        <TopBar />

        <div className="mx-auto max-w-[1450px] px-5 py-8 md:px-9 md:py-10">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <div className="mb-2 flex items-center gap-2 text-xs font-medium text-[#147d69]">
                <span className="h-2 w-2 rounded-full bg-[#147d69]" />
                PAYMENT REGISTER
              </div>
              <h1 className="text-3xl font-semibold tracking-tight">
                Payments
              </h1>
              <p className="mt-2 text-sm text-[#858b85]">
                All registered blockchain payments and their reconciliation statuses.
              </p>
            </div>
          </div>

          <div className="mt-8 rounded-2xl border border-[#eaece7] bg-white p-6">
            {/* Filter bar */}
            <div className="mb-6 flex flex-wrap items-center gap-2">
              {STATUS_FILTER_OPTIONS.map(({ value, label }) => (
                <Link
                  key={value}
                  href={`/payments${value ? `?status=${value}` : ""}`}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                    statusFilter === value
                      ? "bg-[#147d69] text-white"
                      : "border border-[#eaece7] text-[#68706a] hover:bg-[#f5f6f2]"
                  }`}
                >
                  {label}
                </Link>
              ))}
            </div>

            {paymentsData === null ? (
              <div className="flex items-center gap-3 rounded-xl border border-[#fdecea] bg-[#fff8f8] p-4 text-sm text-[#bd554d]">
                <CircleAlert size={16} />
                Could not load payments — the API may be offline.
              </div>
            ) : (
              <PaymentsTable
                payments={paymentsData.items}
                total={paymentsData.total}
                page={page}
                pageSize={20}
                status={statusFilter}
              />
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
