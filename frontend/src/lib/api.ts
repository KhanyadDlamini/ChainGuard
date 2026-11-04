/**
 * ChainGuard API client.
 *
 * All server-side fetches go through `apiFetch` so the base URL is resolved
 * from the environment variable once. Client components that need to fire
 * requests after hydration import the same helpers — the base URL is safe
 * to expose because it points to a local FastAPI server.
 */

// Server components: direct to backend. Browser: proxied via Next.js rewrites.
export const API_BASE =
  typeof window === "undefined"
    ? (process.env.API_ORIGIN ?? "http://127.0.0.1:8000")
    : "";

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

export async function reconcilePayment(paymentId: string) {
  return apiFetch(`/api/v1/payments/${paymentId}/reconcile`, {
    method: "POST",
  });
}

export async function investigateCase(caseId: string) {
  return apiFetch(`/api/v1/investigations/cases/${caseId}`, {
    method: "POST",
  });
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
