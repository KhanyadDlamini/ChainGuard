import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  BrainCircuit,
  CheckCircle2,
  CircleAlert,
  CircleHelp,
  FileSearch,
  Fingerprint,
  ListChecks,
  XCircle,
} from "lucide-react";
import {
  fetchCaseDossier,
  type DossierAIAssessment,
  type DossierAuditEvent,
  type DossierReport,
  type EvidenceRecord,
} from "@/lib/api";
import { fetchShellData } from "@/lib/pageData";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import ResultBadge from "@/components/ResultBadge";
import DossierActionButton from "@/components/DossierActionButton";

export const metadata = { title: "Case dossier" };
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

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function truncateMiddle(value: string, head = 12, tail = 8) {
  if (value.length <= head + tail + 1) return value;
  return `${value.slice(0, head)}…${value.slice(-tail)}`;
}

const SEVERITY_STYLES: Record<string, string> = {
  info: "bg-[#e8f3ef] text-[#147d69]",
  medium: "bg-[#fef3cd] text-[#a87932]",
  high: "bg-[#fdecea] text-[#bd554d]",
};

const CONFIDENCE_STYLES: Record<string, string> = {
  HIGH: "bg-[#fdecea] text-[#bd554d]",
  MODERATE: "bg-[#fef3cd] text-[#a87932]",
  LOW: "bg-[#e8eef3] text-[#1a6fa8]",
};

function SectionHeading({
  index,
  title,
  note,
}: {
  index: string;
  title: string;
  note?: string;
}) {
  return (
    <div className="flex items-baseline gap-3">
      <span className="text-sm font-semibold tabular-nums text-[#c0c5be]">
        {index}
      </span>
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      {note && <span className="text-xs text-[#858b85]">{note}</span>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Deterministic report section
// ---------------------------------------------------------------------------

function DeterministicSection({ report }: { report: DossierReport }) {
  return (
    <div className="mt-4 rounded-2xl border border-[#eaece7] bg-white p-6 md:p-8">
      <ul className="space-y-5">
        {report.report.findings.map((f, i) => (
          <li key={f.code} className="flex gap-4">
            <span className="mt-0.5 text-xl font-semibold tabular-nums text-[#c9cec7]">
              {String(i + 1).padStart(2, "0")}
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-[13px] font-semibold">
                  {f.code}
                </span>
                <span
                  className={`rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${SEVERITY_STYLES[f.severity] ?? "bg-[#f0f1ee] text-[#68706a]"}`}
                >
                  {f.severity}
                </span>
              </div>
              <p className="mt-1.5 text-sm leading-relaxed text-[#3d4340]">
                {f.message}
              </p>
              {f.evidence_basis.length > 0 && (
                <p className="mt-1.5 font-mono text-[11px] text-[#858b85]">
                  basis: {f.evidence_basis.join(" · ")}
                </p>
              )}
            </div>
          </li>
        ))}
      </ul>

      {report.report.unknowns.length > 0 && (
        <div className="mt-7 border-t border-[#eaece7] pt-5">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[#858b85]">
            <CircleHelp size={13} /> Explicitly unknown
          </p>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-[13px] leading-relaxed text-[#68706a]">
            {report.report.unknowns.map((u) => (
              <li key={u}>{u}</li>
            ))}
          </ul>
        </div>
      )}

      <p className="mt-6 border-t border-[#eaece7] pt-4 font-mono text-[11px] text-[#9a9f99]">
        {report.report_type} · {fmtDateTime(report.created_at)} ·{" "}
        {report.investigation_id.slice(0, 8)}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// AI assessment section — layered reading order:
// summary → hypotheses → observations → next evidence → limitations
// ---------------------------------------------------------------------------

function AISection({ item }: { item: DossierAIAssessment }) {
  const a = item.assessment;

  return (
    <div className="mt-4 overflow-hidden rounded-2xl border border-[#d0e8fc] bg-white">
      {/* Executive summary — the lead */}
      <div className="bg-[#f0f8ff] p-6 md:p-8">
        <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-[#1a6fa8]">
          <BrainCircuit size={13} /> Executive summary
        </p>
        <p className="mt-3 max-w-[72ch] text-[15px] leading-relaxed text-[#14324a]">
          {a.executive_summary}
        </p>
      </div>

      <div className="space-y-8 p-6 md:p-8">
        {/* Hypotheses */}
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-[#858b85]">
            Competing hypotheses · {a.hypotheses.length}
          </p>
          <div className="mt-4 space-y-4">
            {a.hypotheses.map((h, i) => (
              <article
                key={h.title}
                className="rounded-2xl border border-[#eaece7] bg-[#faf9f6] p-5 md:p-6"
              >
                <div className="flex gap-4">
                  <span className="text-2xl font-semibold tabular-nums text-[#c9cec7]">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="font-semibold tracking-tight">
                        {h.title}
                      </h3>
                      <span
                        className={`rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${CONFIDENCE_STYLES[h.confidence] ?? "bg-[#f0f1ee] text-[#68706a]"}`}
                      >
                        {h.confidence} confidence
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-[#3d4340]">
                      {h.explanation}
                    </p>

                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      <div className="rounded-xl bg-white p-4">
                        <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#147d69]">
                          <CheckCircle2 size={12} /> Supporting
                        </p>
                        {h.supporting_evidence.length > 0 ? (
                          <ul className="mt-2 list-disc space-y-1 pl-4 text-[13px] leading-relaxed text-[#3d4340]">
                            {h.supporting_evidence.map((s) => (
                              <li key={s}>{s}</li>
                            ))}
                          </ul>
                        ) : (
                          <p className="mt-2 text-[13px] italic text-[#858b85]">
                            No direct supporting evidence — unverified.
                          </p>
                        )}
                      </div>
                      <div className="rounded-xl bg-white p-4">
                        <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#bd554d]">
                          <XCircle size={12} /> Contradicting
                        </p>
                        {h.contradicting_evidence.length > 0 ? (
                          <ul className="mt-2 list-disc space-y-1 pl-4 text-[13px] leading-relaxed text-[#3d4340]">
                            {h.contradicting_evidence.map((s) => (
                              <li key={s}>{s}</li>
                            ))}
                          </ul>
                        ) : (
                          <p className="mt-2 text-[13px] italic text-[#858b85]">
                            Nothing on record contradicts this hypothesis.
                          </p>
                        )}
                      </div>
                    </div>

                    {h.unresolved_questions.length > 0 && (
                      <div className="mt-3 rounded-xl border border-dashed border-[#d8dcd5] p-4">
                        <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#68706a]">
                          <CircleHelp size={12} /> Still unresolved
                        </p>
                        <ul className="mt-2 list-disc space-y-1 pl-4 text-[13px] leading-relaxed text-[#3d4340]">
                          {h.unresolved_questions.map((q) => (
                            <li key={q}>{q}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>

        {/* Observations + next evidence */}
        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-[#858b85]">
              <ListChecks size={13} /> Key observations
            </p>
            <ul className="mt-3 space-y-2">
              {a.key_observations.map((o) => (
                <li
                  key={o}
                  className="rounded-xl border border-[#eaece7] px-4 py-2.5 text-[13px] leading-relaxed text-[#3d4340]"
                >
                  {o}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-[#858b85]">
              <Fingerprint size={13} /> Evidence to gather next
            </p>
            <ol className="mt-3 space-y-2">
              {a.additional_evidence_needed.map((e, i) => (
                <li key={e} className="flex gap-3 text-[13px] leading-relaxed">
                  <span className="font-semibold tabular-nums text-[#1a6fa8]">
                    {i + 1}.
                  </span>
                  <span className="text-[#3d4340]">{e}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>

        {/* Limitations + provenance */}
        <div className="border-t border-[#eaece7] pt-5">
          <ul className="space-y-1 text-xs italic leading-relaxed text-[#858b85]">
            {a.limitations.map((l) => (
              <li key={l}>— {l}</li>
            ))}
          </ul>
          <p className="mt-4 font-mono text-[11px] text-[#9a9f99]">
            {item.model} · prompt {item.prompt_version} ·{" "}
            {fmtDateTime(item.created_at)} · report{" "}
            {item.deterministic_investigation_id.slice(0, 8)}
          </p>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Evidence section
// ---------------------------------------------------------------------------

function EvidenceSection({ evidence }: { evidence: EvidenceRecord[] }) {
  if (evidence.length === 0) {
    return (
      <div className="mt-4 flex items-center gap-3 rounded-2xl border border-[#f0dcb0] bg-[#fffbf0] p-5 text-sm text-[#a87932]">
        <CircleAlert size={16} />
        No persisted on-chain evidence is linked to this case yet.
      </div>
    );
  }

  return (
    <div className="mt-4 overflow-x-auto rounded-2xl border border-[#eaece7] bg-white p-6">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[#eaece7] text-left">
            {["Tx hash", "Block", "From → To", "Amount (raw)", "Log"].map(
              (h) => (
                <th
                  key={h}
                  className="pb-3 pr-4 text-xs font-medium text-[#858b85] last:pr-0"
                >
                  {h}
                </th>
              )
            )}
          </tr>
        </thead>
        <tbody>
          {evidence.map((e) => (
            <tr
              key={e.evidence_id}
              className="border-b border-[#f5f6f2] last:border-0"
            >
              <td
                className="py-3 pr-4 font-mono text-xs text-[#858b85]"
                title={e.transaction_hash}
              >
                {truncateMiddle(e.transaction_hash, 10, 6)}
              </td>
              <td className="py-3 pr-4 tabular-nums text-[#68706a]">
                {e.block_number}
              </td>
              <td
                className="py-3 pr-4 font-mono text-xs text-[#68706a]"
                title={`${e.sender_address} → ${e.recipient_address}`}
              >
                {truncateMiddle(e.sender_address, 6, 4)} →{" "}
                {truncateMiddle(e.recipient_address, 6, 4)}
              </td>
              <td className="py-3 pr-4 font-mono text-xs tabular-nums text-[#68706a]">
                {e.amount_raw}
              </td>
              <td className="py-3 tabular-nums text-[#858b85]">
                {e.log_index}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Audit trail section
// ---------------------------------------------------------------------------

function auditSummary(details: Record<string, unknown>): string | null {
  const parts: string[] = [];
  const tx = details.transaction_hash;
  if (typeof tx === "string") parts.push(`tx ${truncateMiddle(tx, 8, 6)}`);
  for (const [key, label] of [
    ["expected_amount", "expected"],
    ["observed_amount", "observed"],
    ["receipt_status", "receipt"],
    ["transfer_event_count", "transfers"],
    ["linked_evidence_count", "linked"],
  ] as const) {
    const v = details[key];
    if (v !== null && v !== undefined) parts.push(`${label} ${String(v)}`);
  }
  return parts.length > 0 ? parts.join(" · ") : null;
}

function AuditSection({ events }: { events: DossierAuditEvent[] }) {
  if (events.length === 0) {
    return (
      <p className="mt-4 text-sm text-[#858b85]">
        No audit events recorded for this case yet.
      </p>
    );
  }

  return (
    <ol className="mt-4 rounded-2xl border border-[#eaece7] bg-white p-6">
      {events.map((e, i) => {
        const summary = auditSummary(e.details);
        return (
          <li key={e.event_id} className="relative flex gap-4 pb-6 last:pb-0">
            {i < events.length - 1 && (
              <span className="absolute left-[5px] top-4 h-[calc(100%-12px)] w-px bg-[#eaece7]" />
            )}
            <span className="mt-1.5 h-[11px] w-[11px] shrink-0 rounded-full border-2 border-[#147d69] bg-white" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-[13px] font-semibold">
                  {e.event_type}
                </span>
                <span className="text-[11px] text-[#858b85]">
                  by {e.actor} · {fmtDateTime(e.created_at)}
                </span>
              </div>
              {summary && (
                <p className="mt-1 font-mono text-[11px] tabular-nums text-[#68706a]">
                  {summary}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

// ---------------------------------------------------------------------------
// Empty state with action
// ---------------------------------------------------------------------------

function EmptySection({
  icon,
  title,
  body,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-4 rounded-2xl border border-dashed border-[#d8dcd5] bg-white p-8 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f5f6f2] text-[#858b85]">
        {icon}
      </div>
      <h3 className="mt-3 text-sm font-semibold">{title}</h3>
      <p className="mx-auto mt-1.5 max-w-md text-[13px] leading-relaxed text-[#858b85]">
        {body}
      </p>
      <div className="mt-4 flex justify-center">{children}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function CaseDossierPage({
  params,
}: PageProps<"/investigations/[caseId]">) {
  const { caseId } = await params;
  const { connectedCount, modelName } = await fetchShellData();
  const dossier = await fetchCaseDossier(caseId).catch(() => null);

  if (dossier === null) {
    notFound();
  }

  const { case: c, payment: p } = dossier;
  const latestReport = dossier.reports[0] ?? null;
  const latestAI = dossier.ai_assessments[0] ?? null;
  const diff = c.difference ? parseFloat(c.difference) : null;

  const figures = [
    {
      label: "Expected",
      value: fmtAmount(c.expected_amount, c.asset_symbol),
    },
    {
      label: "Observed",
      value: c.observed_amount
        ? fmtAmount(c.observed_amount, c.asset_symbol)
        : "—",
    },
    {
      label: "Difference",
      value: c.difference ? fmtAmount(c.difference, c.asset_symbol) : "—",
      tone:
        diff === null ? "" : diff === 0 ? "text-[#147d69]" : "text-[#bd554d]",
    },
  ];

  return (
    <main className="flex min-h-screen">
      <Sidebar connectedCount={connectedCount} modelName={modelName} />

      <section className="min-w-0 flex-1">
        <TopBar />

        <div className="mx-auto max-w-[1100px] px-5 py-8 md:px-9 md:py-10">
          <Link
            href="/investigations"
            className="flex w-fit items-center gap-1.5 text-xs font-medium text-[#858b85] hover:text-[#147d69]"
          >
            <ArrowLeft size={13} /> All investigations
          </Link>

          {/* Header */}
          <div className="mt-4">
            <div className="mb-2 flex items-center gap-2 text-xs font-medium text-[#147d69]">
              <span className="h-2 w-2 rounded-full bg-[#147d69]" />
              CASE DOSSIER
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-semibold tracking-tight">
                {c.external_reference}
              </h1>
              <ResultBadge result={c.result} />
            </div>
            {c.summary && (
              <p className="mt-2 max-w-[72ch] text-sm leading-relaxed text-[#68706a]">
                {c.summary}
              </p>
            )}
            <p className="mt-2 font-mono text-[11px] text-[#9a9f99]">
              case {c.case_id} · opened {fmtDateTime(c.created_at)}
              {c.resolved_at && ` · resolved ${fmtDateTime(c.resolved_at)}`}
            </p>
          </div>

          {/* Key figures */}
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {figures.map(({ label, value, tone }) => (
              <div
                key={label}
                className="rounded-2xl border border-[#eaece7] bg-white px-5 py-4"
              >
                <p className="text-xs text-[#858b85]">{label}</p>
                <p
                  className={`mt-1 text-xl font-semibold tabular-nums tracking-tight ${tone ?? ""}`}
                >
                  {value}
                </p>
              </div>
            ))}
          </div>

          {/* Payment facts */}
          <div className="mt-4 grid gap-3 rounded-2xl border border-[#eaece7] bg-white p-6 text-[13px] sm:grid-cols-2">
            <div>
              <p className="text-[11px] font-medium text-[#858b85]">
                Transaction
              </p>
              <p
                className="mt-1 break-all font-mono text-xs text-[#3d4340]"
                title={p.expected_tx_hash ?? ""}
              >
                {p.expected_tx_hash ?? "—"}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-medium text-[#858b85]">Route</p>
              <p
                className="mt-1 break-all font-mono text-xs text-[#3d4340]"
                title={`${p.expected_sender ?? "?"} → ${p.expected_recipient}`}
              >
                {truncateMiddle(p.expected_sender ?? "any sender", 8, 4)} →{" "}
                {truncateMiddle(p.expected_recipient, 8, 4)}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-medium text-[#858b85]">
                Token · Chain
              </p>
              <p
                className="mt-1 break-all font-mono text-xs text-[#3d4340]"
                title={p.token_address}
              >
                {truncateMiddle(p.token_address, 10, 6)} · {p.chain_id}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-medium text-[#858b85]">
                Payment status
              </p>
              <p className="mt-1.5">
                <ResultBadge result={p.status} />
              </p>
            </div>
          </div>

          {/* 01 Deterministic */}
          <div className="mt-10">
            <SectionHeading
              index="01"
              title="Verified findings"
              note="deterministic · facts only"
            />
            {latestReport ? (
              <>
                <DeterministicSection report={latestReport} />
                {dossier.reports.length > 1 && (
                  <p className="mt-2 text-xs text-[#858b85]">
                    Showing the latest of {dossier.reports.length} reports.
                  </p>
                )}
              </>
            ) : (
              <EmptySection
                icon={<FileSearch size={22} />}
                title="No deterministic report yet"
                body="Generate one to state exactly what the stored reconciliation and evidence records establish — before any AI interpretation."
              >
                <DossierActionButton caseId={c.case_id} kind="report" />
              </EmptySection>
            )}
          </div>

          {/* 02 AI */}
          <div className="mt-10">
            <SectionHeading
              index="02"
              title="AI assessment"
              note="interpretation · hypotheses, not verdicts"
            />
            {latestAI ? (
              <>
                <AISection item={latestAI} />
                {dossier.ai_assessments.length > 1 && (
                  <p className="mt-2 text-xs text-[#858b85]">
                    Showing the latest of {dossier.ai_assessments.length}{" "}
                    assessments.
                  </p>
                )}
                <div className="mt-4">
                  <DossierActionButton caseId={c.case_id} kind="ai" />
                </div>
              </>
            ) : (
              <EmptySection
                icon={<BrainCircuit size={22} />}
                title="No AI assessment yet"
                body={
                  latestReport
                    ? "Ask the AI investigator to weigh competing explanations of this case and recommend what evidence to gather next."
                    : "Generate the deterministic report first — the AI reasons only from verified facts."
                }
              >
                <DossierActionButton caseId={c.case_id} kind="ai" />
              </EmptySection>
            )}
          </div>

          {/* 03 Evidence */}
          <div className="mt-10">
            <SectionHeading
              index="03"
              title="Linked on-chain evidence"
              note={`${dossier.evidence.length} records`}
            />
            <EvidenceSection evidence={dossier.evidence} />
          </div>

          {/* 04 Audit trail */}
          <div className="mt-10">
            <SectionHeading
              index="04"
              title="Audit trail"
              note={`${dossier.audit_events.length} events`}
            />
            <AuditSection events={dossier.audit_events} />
          </div>
        </div>
      </section>
    </main>
  );
}
