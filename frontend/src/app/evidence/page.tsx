import Link from "next/link";
import { CircleAlert, Fingerprint } from "lucide-react";
import { fetchEvidence, type EvidenceRecord } from "@/lib/api";
import { fetchShellData } from "@/lib/pageData";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";

export const metadata = { title: "Evidence" };
export const instant = false;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function truncateAddr(addr: string) {
  return `${addr.slice(0, 8)}…${addr.slice(-6)}`;
}

function truncateHash(hash: string) {
  return `${hash.slice(0, 10)}…${hash.slice(-6)}`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ---------------------------------------------------------------------------
// Evidence table
// ---------------------------------------------------------------------------

function EvidenceTable({
  records,
  total,
  page,
  pageSize,
}: {
  records: EvidenceRecord[];
  total: number;
  page: number;
  pageSize: number;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const prevHref = page > 1 ? `/evidence?page=${page - 1}` : null;
  const nextHref = page < totalPages ? `/evidence?page=${page + 1}` : null;

  if (records.length === 0) {
    return (
      <div className="flex min-h-[280px] flex-col items-center justify-center text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f5f6f2] text-[#858b85]">
          <Fingerprint size={26} />
        </div>
        <h3 className="mt-4 text-sm font-semibold">No evidence records yet</h3>
        <p className="mt-2 max-w-sm text-xs text-[#858b85]">
          Evidence is captured automatically when a payment is reconciled
          against the blockchain.
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
                "Payment ref",
                "Tx hash",
                "Block",
                "Sender",
                "Recipient",
                "Amount (raw)",
                "Log",
                "Status",
                "Recorded",
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
            {records.map((r) => (
              <tr
                key={r.evidence_id}
                className="border-b border-[#f5f6f2] last:border-0 hover:bg-[#faf9f6]"
              >
                <td className="py-3.5 pr-4">
                  <div className="font-medium">{r.payment_reference}</div>
                  <div className="mt-0.5 font-mono text-[10px] text-[#858b85]">
                    {r.evidence_id.slice(0, 8)}…
                  </div>
                </td>
                <td className="py-3.5 pr-4 font-mono text-xs text-[#858b85]">
                  {truncateHash(r.transaction_hash)}
                </td>
                <td className="py-3.5 pr-4 tabular-nums text-sm text-[#68706a]">
                  {r.block_number.toLocaleString()}
                </td>
                <td className="py-3.5 pr-4 font-mono text-xs text-[#858b85]">
                  {truncateAddr(r.sender_address)}
                </td>
                <td className="py-3.5 pr-4 font-mono text-xs text-[#858b85]">
                  {truncateAddr(r.recipient_address)}
                </td>
                <td className="py-3.5 pr-4 tabular-nums text-xs text-[#68706a]">
                  {BigInt(r.amount_raw).toLocaleString()}
                </td>
                <td className="py-3.5 pr-4 tabular-nums text-xs text-[#858b85]">
                  {r.log_index}
                </td>
                <td className="py-3.5 pr-4">
                  <span
                    className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${
                      r.receipt_status === 1
                        ? "bg-[#e8f3ef] text-[#147d69]"
                        : "bg-[#fdecea] text-[#bd554d]"
                    }`}
                  >
                    {r.receipt_status === 1 ? "SUCCESS" : "FAILED"}
                  </span>
                </td>
                <td className="py-3.5 text-xs text-[#858b85]">
                  {fmtDate(r.recorded_at)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="mt-5 flex items-center justify-between border-t border-[#eaece7] pt-4 text-xs text-[#858b85]">
        <span>
          {Math.min((page - 1) * pageSize + 1, total)}–
          {Math.min(page * pageSize, total)} of {total} records
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

export default async function EvidencePage({
  searchParams,
}: PageProps<"/evidence">) {
  const sp = await searchParams;
  const page = Math.max(1, parseInt(String(sp.page ?? "1"), 10));

  const [shell, evidenceResult] = await Promise.all([
    fetchShellData(),
    fetchEvidence(page, 20).catch(() => null),
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
              ON-CHAIN TRANSFER EVENTS
            </div>
            <h1 className="text-3xl font-semibold tracking-tight">
              Evidence records
            </h1>
            <p className="mt-2 text-sm text-[#858b85]">
              Immutable on-chain transfer events captured during reconciliation.
              Each row is a decoded ERC-20 Transfer log.
            </p>
          </div>

          <div className="mt-8 rounded-2xl border border-[#eaece7] bg-white p-6">
            {evidenceResult === null ? (
              <div className="flex items-center gap-3 rounded-xl border border-[#fdecea] bg-[#fff8f8] p-4 text-sm text-[#bd554d]">
                <CircleAlert size={16} />
                Could not load evidence records — the API may be offline.
              </div>
            ) : (
              <EvidenceTable
                records={evidenceResult.items}
                total={evidenceResult.total}
                page={page}
                pageSize={20}
              />
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
