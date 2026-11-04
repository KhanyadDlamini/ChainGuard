/**
 * ChainGuard API client.
 *
 * All server-side fetches go through `apiFetch` so the base URL is resolved
 * from the environment variable once. Client components that need to fire
 * requests after hydration import the same helpers — the base URL is safe
 * to expose because it points to a local FastAPI server.
 */

// Server components: direct to backend. Browser: direct to backend too —
// the Next.js rewrite proxy times out long AI calls, so the browser
// bypasses it (the API allows the local UI origins via CORS).
export const API_BASE =
  typeof window === "undefined"
    ? (process.env.API_ORIGIN ?? "http://127.0.0.1:8000")
    : (process.env.NEXT_PUBLIC_API_ORIGIN ?? "http://127.0.0.1:8000");

// ---------------------------------------------------------------------------
// Core helper
// ---------------------------------------------------------------------------

async function apiFetch<T>(
  path: string,
  init?: RequestInit & { next?: { revalidate?: number; tags?: string[] } }
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body?.detail ?? detail;
    } catch {
      // ignore parse errors
    }
    throw new ApiError(res.status, detail);
  }

  return res.json() as Promise<T>;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ServiceStatus = {
  label: string;
  connected: boolean | null;
  detail: string;
};

export type BlockchainStatus = {
  rpc_connected: boolean;
  rpc_url: string;
  chain_id: number;
  expected_chain_id: number;
  chain_matches: boolean;
  token_address: string;
  contract_deployed: boolean;
  contract_verified: boolean;
  latest_block: number;
};

export type DatabaseStatus = {
  status: "UP" | string;
  database: string;
  connected_role: string;
  server_version: string;
};

export type Payment = {
  id: string;
  external_reference: string;
  chain_id: number;
  asset_symbol: string;
  token_address: string;
  expected_amount: string;
  expected_sender: string | null;
  expected_recipient: string;
  expected_tx_hash: string | null;
  status: string;
};

export type PagedResponse<T> = {
  total: number;
  page: number;
  page_size: number;
  items: T[];
};

export type ReconciliationCase = {
  case_id: string;
  payment_id: string;
  external_reference: string;
  asset_symbol: string;
  status: string;
  result: "MATCHED" | "DISCREPANCY" | "FAILED" | "PENDING" | "UNVERIFIED";
  expected_amount: string;
  observed_amount: string | null;
  difference: string | null;
  summary: string | null;
  created_at: string;
  resolved_at: string | null;
};

export type InvestigationSummary = {
  payments: { total: number };
  cases: {
    total: number;
    by_result: Record<string, number>;
    discrepancies: number;
    matched: number;
    failed: number;
    pending: number;
    unverified: number;
  };
  evidence: { total: number };
  investigations: { total: number; ai_total: number };
};

// ---------------------------------------------------------------------------
// Health / infra
// ---------------------------------------------------------------------------

export async function fetchHealth(): Promise<{ status: string; service: string }> {
  return apiFetch("/health");
}

export async function fetchBlockchainStatus(): Promise<BlockchainStatus> {
  return apiFetch("/api/v1/blockchain/status");
}

export async function fetchDatabaseStatus(): Promise<DatabaseStatus> {
  return apiFetch("/api/v1/database/status");
}

/** Runs all three infra checks in parallel; never throws — returns structured statuses. */
export async function fetchInfraStatus(): Promise<ServiceStatus[]> {
  const [api, chain, db] = await Promise.allSettled([
    fetchHealth(),
    fetchBlockchainStatus(),
    fetchDatabaseStatus(),
  ]);

  return [
    {
      label: "API service",
      connected: api.status === "fulfilled",
      detail:
        api.status === "fulfilled"
          ? `FastAPI · ${(api.value as { service: string }).service}`
          : "Unable to reach API",
    },
    {
      label: "Blockchain",
      connected:
        chain.status === "fulfilled"
          ? Boolean(
              (chain.value as BlockchainStatus).rpc_connected &&
                (chain.value as BlockchainStatus).chain_matches
            )
          : false,
      detail:
        chain.status === "fulfilled"
          ? (chain.value as BlockchainStatus).contract_deployed
            ? `Network ${(chain.value as BlockchainStatus).chain_id} · Contract deployed · Block ${(chain.value as BlockchainStatus).latest_block}`
            : `Network ${(chain.value as BlockchainStatus).chain_id} · Contract not deployed`
          : "RPC connection unavailable",
    },
    {
      label: "Database",
      connected:
        db.status === "fulfilled"
          ? (db.value as DatabaseStatus).status === "UP"
          : false,
      detail:
        db.status === "fulfilled"
          ? `PostgreSQL · ${(db.value as DatabaseStatus).database}`
          : "Database unavailable",
    },
  ];
}

// ---------------------------------------------------------------------------
// Payments
// ---------------------------------------------------------------------------

export async function fetchPayments(
  page = 1,
  pageSize = 20,
  status?: string
): Promise<PagedResponse<Payment>> {
  const params = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
  });
  if (status) params.set("status", status);
  return apiFetch(`/api/v1/payments?${params}`);
}

export async function fetchPayment(id: string): Promise<Payment> {
  return apiFetch(`/api/v1/payments/${id}`);
}

export type PaymentCreate = {
  external_reference: string;
  chain_id: number;
  asset_symbol: string;
  token_address: string;
  expected_amount: string;
  expected_sender: string | null;
  expected_recipient: string;
  expected_tx_hash: string | null;
};

export async function createPayment(
  payload: PaymentCreate
): Promise<Payment> {
  return apiFetch("/api/v1/payments", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// ---------------------------------------------------------------------------
// Investigations / cases
// ---------------------------------------------------------------------------

export async function fetchCases(
  page = 1,
  pageSize = 20,
  result?: string
): Promise<PagedResponse<ReconciliationCase>> {
  const params = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
  });
  if (result) params.set("result", result);
  return apiFetch(`/api/v1/investigations/cases?${params}`);
}

export async function fetchSummary(): Promise<InvestigationSummary> {
  return apiFetch("/api/v1/investigations/summary");
}

// ---------------------------------------------------------------------------
// Blockchain
// ---------------------------------------------------------------------------

export async function fetchTransaction(txHash: string) {
  return apiFetch(`/api/v1/blockchain/transactions/${txHash}`);
}

// ---------------------------------------------------------------------------
// Reconciliation actions (POST — used from client components)
// ---------------------------------------------------------------------------

export type ReconcileResult = {
  case_id: string;
  payment_id: string;
  external_reference: string;
  result: string;
  payment_status: string;
  expected_amount: string;
  observed_amount: string | null;
  difference: string | null;
  transaction_hash: string | null;
  chain_id: number;
  receipt_status: number | null;
  transfer_event_count: number;
  evidence_count: number;
  summary: string | null;
  replayed: boolean;
};

export async function reconcilePayment(
  paymentId: string
): Promise<ReconcileResult> {
  return apiFetch(`/api/v1/payments/${paymentId}/reconcile`, {
    method: "POST",
  });
}

export type InvestigationFinding = {
  code: string;
  severity: string;
  message: string;
  evidence_basis: string[];
};

export type DeterministicReport = {
  investigation_id: string;
  case_id: string;
  report_type: string;
  report: {
    findings: InvestigationFinding[];
    evidence: unknown[];
    unknowns: string[];
    limitations: string[];
  };
};

export async function investigateCase(
  caseId: string
): Promise<DeterministicReport> {
  return apiFetch(`/api/v1/investigations/cases/${caseId}`, {
    method: "POST",
  });
}

export type AIHypothesis = {
  title: string;
  explanation: string;
  supporting_evidence: string[];
  contradicting_evidence: string[];
  unresolved_questions: string[];
  confidence: "LOW" | "MODERATE" | "HIGH";
};

export type AIAssessment = {
  ai_investigation_id: string;
  case_id: string;
  deterministic_investigation_id: string;
  provider: string;
  model: string;
  prompt_version: string;
  created_at: string;
  assessment: {
    executive_summary: string;
    hypotheses: AIHypothesis[];
    key_observations: string[];
    additional_evidence_needed: string[];
    limitations: string[];
  };
};

export async function analyzeCaseWithAI(
  caseId: string
): Promise<AIAssessment> {
  return apiFetch(`/api/v1/investigations/cases/${caseId}/ai`, {
    method: "POST",
  });
}

export type DossierReport = {
  investigation_id: string;
  report_type: string;
  created_at: string;
  report: {
    findings: InvestigationFinding[];
    evidence: unknown[];
    unknowns: string[];
    limitations: string[];
  };
};

export type DossierAIAssessment = {
  ai_investigation_id: string;
  deterministic_investigation_id: string;
  provider: string;
  model: string;
  prompt_version: string;
  created_at: string;
  assessment: AIAssessment["assessment"];
};

export type DossierAuditEvent = {
  event_id: string;
  event_type: string;
  actor: string;
  created_at: string;
  details: Record<string, unknown>;
};

export type CaseDossier = {
  case: ReconciliationCase & { summary: string | null };
  payment: Payment & { status: string };
  evidence: EvidenceRecord[];
  reports: DossierReport[];
  ai_assessments: DossierAIAssessment[];
  audit_events: DossierAuditEvent[];
};

export async function fetchCaseDossier(
  caseId: string
): Promise<CaseDossier> {
  // Single-case dossier for the investigation detail page.
  return apiFetch(`/api/v1/investigations/cases/${caseId}`);
}

// ---------------------------------------------------------------------------
// Model info
// ---------------------------------------------------------------------------

export type ModelInfo = {
  provider: string;
  model_name: string;
  model_base_url: string;
  api_key_configured: boolean;
};

export async function fetchModelInfo(): Promise<ModelInfo> {
  return apiFetch("/api/v1/model/info");
}

// ---------------------------------------------------------------------------
// Evidence records
// ---------------------------------------------------------------------------

export type EvidenceRecord = {
  evidence_id: string;
  case_id: string;
  payment_reference: string;
  transaction_hash: string;
  chain_id: number;
  block_number: number;
  receipt_status: number;
  token_address: string;
  sender_address: string;
  recipient_address: string;
  amount_raw: string;
  log_index: number;
  source: string;
  recorded_at: string;
};

export async function fetchEvidence(
  page = 1,
  pageSize = 20,
  txHash?: string
): Promise<PagedResponse<EvidenceRecord>> {
  const params = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
  });
  if (txHash) params.set("transaction_hash", txHash);
  return apiFetch(`/api/v1/evidence?${params}`);
}
