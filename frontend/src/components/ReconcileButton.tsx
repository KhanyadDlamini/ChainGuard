"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, RefreshCcw } from "lucide-react";
import {
  ApiError,
  reconcilePayment,
  type ReconcileResult,
} from "@/lib/api";
import ResultBadge from "@/components/ResultBadge";

export default function ReconcileButton({
  paymentId,
  hasTxHash,
}: {
  paymentId: string;
  hasTxHash: boolean;
}) {
  const router = useRouter();
  const [working, setWorking] = useState(false);
  const [result, setResult] = useState<ReconcileResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onReconcile() {
    setWorking(true);
    setError(null);
    try {
      const res = await reconcilePayment(paymentId);
      setResult(res);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? `Error ${err.status}: ${err.message}`
          : "Could not reach the API."
      );
    } finally {
      setWorking(false);
    }
  }

  if (!hasTxHash) {
    return <span className="text-xs text-[#858b85]">No tx hash</span>;
  }

  return (
    <div className="min-w-[220px]">
      <button
        onClick={onReconcile}
        disabled={working}
        className="flex items-center gap-1.5 rounded-lg border border-[#eaece7] px-3 py-1.5 text-xs font-medium text-[#68706a] transition hover:border-[#147d69]/40 hover:text-[#147d69] disabled:opacity-50"
      >
        <RefreshCcw size={12} className={working ? "animate-spin" : ""} />
        {working ? "Reconciling…" : "Reconcile"}
      </button>

      {error && (
        <p className="mt-2 max-w-[260px] text-[11px] text-[#bd554d]">
          {error}
        </p>
      )}

      {result && (
        <div className="mt-2 max-w-[280px] rounded-xl border border-[#eaece7] bg-[#faf9f6] p-3">
          <div className="flex items-center gap-2">
            <ResultBadge result={result.result} />
            {result.replayed && (
              <span className="text-[10px] text-[#858b85]">replayed</span>
            )}
          </div>
          <dl className="mt-2 space-y-1 text-[11px] tabular-nums text-[#68706a]">
            <div className="flex justify-between gap-3">
              <dt>Observed</dt>
              <dd>{result.observed_amount ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt>Difference</dt>
              <dd>{result.difference ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt>Evidence</dt>
              <dd>{result.evidence_count} records</dd>
            </div>
          </dl>
          <Link
            href={`/investigations/${result.case_id}`}
            className="mt-2 flex items-center gap-1 text-[11px] font-medium text-[#147d69] hover:underline"
          >
            Open case dossier <ArrowRight size={11} />
          </Link>
        </div>
      )}
    </div>
  );
}
