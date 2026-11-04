import {
  Activity,
  BrainCircuit,
  CheckCircle2,
  CircleAlert,
  Clock3,
  Database,
  KeyRound,
  Link2,
  Network,
  Cpu,
} from "lucide-react";
import {
  fetchBlockchainStatus,
  fetchDatabaseStatus,
  fetchHealth,
  fetchModelInfo,
  type ModelInfo,
} from "@/lib/api";
import { fetchShellData } from "@/lib/pageData";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";

export const metadata = { title: "Connections" };
export const instant = false;

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span
      className={`inline-flex h-2.5 w-2.5 rounded-full ${ok ? "bg-[#147d69]" : "bg-[#bd554d]"}`}
    />
  );
}

function SectionCard({
  icon: Icon,
  title,
  ok,
  children,
}: {
  icon: React.ElementType;
  title: string;
  ok: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-2xl border bg-white p-6 ${ok ? "border-[#eaece7]" : "border-[#f5c6c3]"}`}
    >
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-xl ${ok ? "bg-[#e8f3ef] text-[#147d69]" : "bg-[#fdecea] text-[#bd554d]"}`}
          >
            <Icon size={20} />
          </div>
          <h2 className="font-semibold tracking-tight">{title}</h2>
        </div>
        <div className="flex items-center gap-2">
          <StatusDot ok={ok} />
          <span
            className={`text-xs font-semibold ${ok ? "text-[#147d69]" : "text-[#bd554d]"}`}
          >
            {ok ? "CONNECTED" : "OFFLINE"}
          </span>
        </div>
      </div>
      <dl className="space-y-3">{children}</dl>
    </div>
  );
}

function Row({ label, value, mono = false }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-[#f5f6f2] pb-3 last:border-0 last:pb-0">
      <dt className="shrink-0 text-xs text-[#858b85]">{label}</dt>
      <dd className={`text-right text-xs font-medium ${mono ? "font-mono text-[#68706a]" : ""}`}>
        {value}
      </dd>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Model card — prominently shows the active AI model
// ---------------------------------------------------------------------------

function ModelCard({ info }: { info: ModelInfo }) {
  return (
    <div className="rounded-2xl border border-[#d0e8fc] bg-gradient-to-br from-[#f0f8ff] to-[#e8f3ef] p-6">
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm text-[#1a6fa8]">
            <BrainCircuit size={20} />
          </div>
          <div>
            <h2 className="font-semibold tracking-tight">AI Investigation Model</h2>
            <p className="text-xs text-[#858b85]">
              Powers deterministic + AI assessment pipeline
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusDot ok={info.api_key_configured} />
          <span
            className={`text-xs font-semibold ${info.api_key_configured ? "text-[#147d69]" : "text-[#a87932]"}`}
          >
            {info.api_key_configured ? "KEY CONFIGURED" : "NO KEY"}
          </span>
        </div>
      </div>

      {/* Model name — hero display */}
      <div className="mb-5 rounded-xl border border-[#c2dff7] bg-white px-5 py-4">
        <div className="text-[10px] font-semibold uppercase tracking-widest text-[#858b85]">
          Active model
        </div>
        <div className="mt-1.5 flex items-center gap-3">
          <Cpu size={22} className="shrink-0 text-[#1a6fa8]" />
          <span className="text-2xl font-semibold tracking-tight text-[#1a3a5c]">
            {info.model_name}
          </span>
        </div>
        <div className="mt-1 text-xs text-[#858b85]">
          Provider:{" "}
          <span className="font-semibold capitalize text-[#1a6fa8]">
            {info.provider}
          </span>
        </div>
      </div>

      <dl className="space-y-3">
        <Row label="Provider" value={<span className="capitalize">{info.provider}</span>} />
        <Row label="Model name" value={info.model_name} mono />
        <Row label="API base URL" value={info.model_base_url} mono />
        <Row
          label="API key"
          value={
            <span
              className={`flex items-center gap-1.5 ${info.api_key_configured ? "text-[#147d69]" : "text-[#a87932]"}`}
            >
              <KeyRound size={12} />
              {info.api_key_configured ? "Configured" : "Not set"}
            </span>
          }
        />
      </dl>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function ConnectionsPage() {
  const [shell, chainResult, dbResult, apiResult, modelResult] =
    await Promise.all([
      fetchShellData(),
      fetchBlockchainStatus().catch(() => null),
      fetchDatabaseStatus().catch(() => null),
      fetchHealth().catch(() => null),
      fetchModelInfo().catch(() => null),
    ]);

  const { statuses, connectedCount } = shell;

  const chain = chainResult;
  const db = dbResult;
  const apiOk = apiResult !== null;
  const model = modelResult ?? {
    provider: "meta",
    model_name: "muse-spark-1.3",
    model_base_url: "—",
    api_key_configured: false,
  };

  return (
    <main className="flex min-h-screen">
      <Sidebar connectedCount={connectedCount} modelName={model.model_name} />

      <section className="min-w-0 flex-1">
        <TopBar />

        <div className="mx-auto max-w-[1100px] px-5 py-8 md:px-9 md:py-10">
          <div className="mb-8">
            <div className="mb-2 flex items-center gap-2 text-xs font-medium text-[#147d69]">
              <span className="h-2 w-2 rounded-full bg-[#147d69]" />
              SYSTEM CONNECTIONS
            </div>
            <h1 className="text-3xl font-semibold tracking-tight">
              Connection status
            </h1>
            <p className="mt-2 text-sm text-[#858b85]">
              Live configuration and connectivity for all ChainGuard
              infrastructure and the active AI model.
            </p>
          </div>

          {/* Summary strip */}
          <div className="mb-7 flex flex-wrap gap-3">
            {statuses.map((s) => (
              <div
                key={s.label}
                className="flex items-center gap-2 rounded-xl border border-[#eaece7] bg-white px-4 py-3"
              >
                {s.connected === null ? (
                  <Clock3 size={15} className="text-[#a87932]" />
                ) : s.connected ? (
                  <CheckCircle2 size={15} className="text-[#147d69]" />
                ) : (
                  <CircleAlert size={15} className="text-[#bd554d]" />
                )}
                <span className="text-sm font-medium">{s.label}</span>
                <span
                  className={`text-[10px] font-semibold ${
                    s.connected ? "text-[#147d69]" : "text-[#bd554d]"
                  }`}
                >
                  {s.connected ? "UP" : "DOWN"}
                </span>
              </div>
            ))}
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            {/* AI Model — spans full width for prominence */}
            <div className="lg:col-span-2">
              <ModelCard info={model} />
            </div>

            {/* API Service */}
            <SectionCard icon={Activity} title="API Service" ok={apiOk}>
              <Row label="Status" value={apiOk ? "Operational" : "Unreachable"} />
              <Row label="Framework" value="FastAPI" />
              <Row label="Base URL" value="http://127.0.0.1:8000" mono />
              <Row label="Health endpoint" value="/health" mono />
            </SectionCard>

            {/* Blockchain RPC */}
            <SectionCard
              icon={Network}
              title="Blockchain RPC"
              ok={chain?.rpc_connected === true && chain?.chain_matches === true}
            >
              {chain ? (
                <>
                  <Row
                    label="RPC URL"
                    value={chain.rpc_url}
                    mono
                  />
                  <Row
                    label="Chain ID"
                    value={
                      <span className="flex items-center gap-1.5">
                        {chain.chain_id}
                        {chain.chain_matches ? (
                          <CheckCircle2 size={11} className="text-[#147d69]" />
                        ) : (
                          <CircleAlert size={11} className="text-[#bd554d]" />
                        )}
                      </span>
                    }
                  />
                  <Row
                    label="Expected chain ID"
                    value={chain.expected_chain_id}
                  />
                  <Row
                    label="Latest block"
                    value={chain.latest_block.toLocaleString()}
                  />
                  <Row
                    label="Token address"
                    value={`${chain.token_address.slice(0, 10)}…${chain.token_address.slice(-6)}`}
                    mono
                  />
                  <Row
                    label="Contract deployed"
                    value={
                      <span
                        className={
                          chain.contract_deployed
                            ? "text-[#147d69]"
                            : "text-[#bd554d]"
                        }
                      >
                        {chain.contract_deployed ? "Yes" : "No"}
                      </span>
                    }
                  />
                </>
              ) : (
                <Row label="Status" value="RPC unreachable" />
              )}
            </SectionCard>

            {/* Database */}
            <SectionCard
              icon={Database}
              title="PostgreSQL Database"
              ok={db?.status === "UP"}
            >
              {db ? (
                <>
                  <Row label="Status" value={db.status} />
                  <Row label="Database" value={db.database} mono />
                  <Row label="Connected role" value={db.connected_role} mono />
                  <Row
                    label="Server version"
                    value={db.server_version.split(" ").slice(0, 2).join(" ")}
                  />
                </>
              ) : (
                <Row label="Status" value="Unreachable" />
              )}
            </SectionCard>

            {/* Network summary */}
            <SectionCard icon={Link2} title="Network summary" ok={connectedCount === 3}>
              <Row
                label="Services up"
                value={`${connectedCount} / 3`}
              />
              <Row
                label="Overall health"
                value={
                  <span
                    className={
                      connectedCount === 3
                        ? "text-[#147d69]"
                        : connectedCount > 0
                          ? "text-[#a87932]"
                          : "text-[#bd554d]"
                    }
                  >
                    {connectedCount === 3
                      ? "Healthy"
                      : connectedCount > 0
                        ? "Degraded"
                        : "Down"}
                  </span>
                }
              />
              <Row label="Environment" value="Local development" />
            </SectionCard>
          </div>
        </div>
      </section>
    </main>
  );
}
