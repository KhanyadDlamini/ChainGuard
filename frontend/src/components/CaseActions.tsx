"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, BrainCircuit, FileSearch } from "lucide-react";
import {
  ApiError,
  analyzeCaseWithAI,
  investigateCase,
  type AIAssessment,
  type DeterministicReport,
} from "@/lib/api";

type Job = "report" | "ai" | null;

const CONFIDENCE_STYLES: Record<string, string> = {
  HIGH: "bg-[#fdecea] text-[#bd554d]",
  MODERATE: "bg-[#fef3cd] text-[#a87932]",
  LOW: "bg-[#f0f1ee] text-[#68706a]",
};

function errorText(err: unknown): string {
  return err instanceof ApiError
    ? `Error ${err.status}: ${err.message}`
    : "Could not reach the API.";
}

export default function CaseActions({ caseId }: { caseId: string }) {
  const router = useRouter();
  const [job, setJob] = useState<Job>(null);
  const [report, setReport] = useState<DeterministicReport | null>(null);
  const [ai, setAi] = useState<AIAssessment | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(kind: Exclude<Job, null>) {
    setJob(kind);
    setError(null);
    try {
      if (kind === "report") {
        setReport(await investigateCase(caseId));
      } else {
        setAi(await analyzeCaseWithAI(caseId));
      }
      router.refresh();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setJob(null);
    }
  }

  return (
    <div className="min-w-[240px]">
      <div className="flex flex-wrap gap-2">
        <Link
          href={`/investigations/${caseId}`}
          className="flex items-center gap-1.5 rounded-lg bg-[#147d69] px-3 py-1.5 text-xs font-medium text-white transition hover:bg-[#106653]"
        >
          Dossier <ArrowRight size={12} />
        </Link>
        <button
          onClick={() => run("report")}
          disabled={job !== null}
          className="flex items-center gap-1.5 rounded-lg border border-[#eaece7] px-3 py-1.5 text-xs font-medium text-[#68706a] transition hover:border-[#147d69]/40 hover:text-[#147d69] disabled:opacity-50"
        >
          <FileSearch size={12} />
          {job === "report" ? "Working…" : "Report"}
        </button>
        <button
          onClick={() => run("ai")}
          disabled={job !== null}
          title="Requires a deterministic report first"
          className="flex items-center gap-1.5 rounded-lg border border-[#d0e8fc] bg-[#f0f8ff] px-3 py-1.5 text-xs font-medium text-[#1a6fa8] transition hover:border-[#a8cff5] disabled:opacity-50"
        >
          <BrainCircuit size={12} />
          {job === "ai" ? "Analyzing…" : "AI assess"}
        </button>
      </div>

      {error && (
        <p className="mt-2 max-w-[300px] text-[11px] text-[#bd554d]">
          {error}
        </p>
      )}

      {report && (
        <div className="mt-2 max-w-[320px] rounded-xl border border-[#eaece7] bg-[#faf9f6] p-3">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[#858b85]">
            Deterministic report
          </p>
          <ul className="mt-2 space-y-2">
            {report.report.findings.map((f) => (
              <li key={f.code} className="text-[11px] text-[#68706a]">
                <span className="font-semibold text-[#1a1d1a]">
                  {f.code}
                </span>{" "}
                · {f.severity} — {f.message}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[11px] tabular-nums text-[#858b85]">
            {report.report.evidence.length} evidence items ·{" "}
            {report.report.unknowns.length} unknowns recorded
          </p>
        </div>
      )}

      {ai && (
        <div className="mt-2 max-h-[320px] max-w-[340px] overflow-y-auto rounded-xl border border-[#d0e8fc] bg-[#f0f8ff] p-3">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[#1a6fa8]">
            AI assessment · {ai.model}
          </p>
          <p className="mt-2 text-[11px] leading-relaxed text-[#1a3a5c]">
            {ai.assessment.executive_summary}
          </p>
          <ul className="mt-2 space-y-2">
            {ai.assessment.hypotheses.map((h) => (
              <li
                key={h.title}
                className="rounded-lg bg-white/70 p-2 text-[11px] text-[#1a3a5c]"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold">{h.title}</span>
                  <span
                    className={`shrink-0 rounded-md px-1.5 py-0.5 text-[9px] font-semibold ${CONFIDENCE_STYLES[h.confidence] ?? "bg-[#f0f1ee] text-[#68706a]"}`}
                  >
                    {h.confidence}
                  </span>
                </div>
                <p className="mt-1 leading-relaxed">{h.explanation}</p>
              </li>
            ))}
          </ul>
          {ai.assessment.additional_evidence_needed.length > 0 && (
            <div className="mt-2 text-[11px] text-[#1a3a5c]">
              <p className="font-semibold">Evidence to gather next:</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-4">
                {ai.assessment.additional_evidence_needed.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
