"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CircleAlert, CircleCheck, Plus } from "lucide-react";
import { ApiError, createPayment } from "@/lib/api";

// ---------------------------------------------------------------------------
// Defaults matching the local demo chain (Ganache) and seeded transfer.
// A judge can submit the form untouched for a MATCH, or pick the
// shortfall scenario for a DISCREPANCY.
// ---------------------------------------------------------------------------

const DEMO_DEFAULTS = {
  chain_id: 1337,
  asset_symbol: "CGT",
  token_address: "0x681E80b26B8ceDDa33367e2E156903D7240ebdAe",
  expected_sender: "0xC132E290aA2f59855610ee1DaA45D9BB021FE5A0",
  expected_recipient: "0x44035e176d8361567164eFa2b8Ff49afa2E7dc97",
  expected_tx_hash:
    "0x36a32e97ef88c334a2cdc5144188dccc5433dc1a8a0d7b9473d2983f6b839b67",
};

function newReference() {
  return `DEMO-${Date.now().toString(36).toUpperCase()}`;
}

const inputCls =
  "w-full rounded-lg border border-[#eaece7] bg-white px-3 py-2 font-mono text-xs text-[#1a1d1a] outline-none transition placeholder:font-sans focus:border-[#147d69]/60";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-medium text-[#68706a]">
        {label}
      </span>
      {children}
    </label>
  );
}

export default function CreatePaymentForm() {
  const router = useRouter();
  const [reference, setReference] = useState(newReference);
  const [amount, setAmount] = useState("50");
  const [token, setToken] = useState(DEMO_DEFAULTS.token_address);
  const [sender, setSender] = useState(DEMO_DEFAULTS.expected_sender);
  const [recipient, setRecipient] = useState(DEMO_DEFAULTS.expected_recipient);
  const [txHash, setTxHash] = useState(DEMO_DEFAULTS.expected_tx_hash);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setCreated(null);
    try {
      const payment = await createPayment({
        external_reference: reference.trim(),
        chain_id: DEMO_DEFAULTS.chain_id,
        asset_symbol: DEMO_DEFAULTS.asset_symbol,
        token_address: token.trim(),
        expected_amount: amount.trim(),
        expected_sender: sender.trim() || null,
        expected_recipient: recipient.trim(),
        expected_tx_hash: txHash.trim() || null,
      });
      setCreated(payment.external_reference);
      setReference(newReference());
      router.refresh();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? `Error ${err.status}: ${err.message}`
          : "Could not reach the API."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-2xl border border-[#eaece7] bg-white p-6"
    >
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="font-semibold tracking-tight">Register payment</h2>
          <p className="mt-1 text-xs text-[#858b85]">
            Pre-filled with the local demo chain values. Submit untouched for
            a match, or switch to the shortfall amount for a discrepancy.
            After re-seeding, paste the fresh values from the seed output.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setAmount("50")}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
              amount === "50"
                ? "bg-[#147d69] text-white"
                : "border border-[#eaece7] text-[#68706a] hover:bg-[#f5f6f2]"
            }`}
          >
            Match · 50 CGT
          </button>
          <button
            type="button"
            onClick={() => setAmount("100")}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
              amount === "100"
                ? "bg-[#147d69] text-white"
                : "border border-[#eaece7] text-[#68706a] hover:bg-[#f5f6f2]"
            }`}
          >
            Shortfall · 100 CGT
          </button>
        </div>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Field label="External reference">
          <input
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            required
            className={inputCls}
          />
        </Field>
        <Field label="Expected amount (CGT)">
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            inputMode="decimal"
            className={inputCls}
          />
        </Field>
        <Field label="Token address">
          <input
            value={token}
            onChange={(e) => setToken(e.target.value)}
            required
            spellCheck={false}
            className={inputCls}
          />
        </Field>
        <Field label="Expected tx hash">
          <input
            value={txHash}
            onChange={(e) => setTxHash(e.target.value)}
            spellCheck={false}
            placeholder="0x… (empty = cannot reconcile yet)"
            className={inputCls}
          />
        </Field>
        <Field label="Expected sender">
          <input
            value={sender}
            onChange={(e) => setSender(e.target.value)}
            spellCheck={false}
            placeholder="0x… (empty = any sender)"
            className={inputCls}
          />
        </Field>
        <Field label="Expected recipient">
          <input
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            required
            spellCheck={false}
            className={inputCls}
          />
        </Field>
      </div>

      {error && (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-[#fdecea] bg-[#fff8f8] px-4 py-3 text-xs text-[#bd554d]">
          <CircleAlert size={14} className="shrink-0" />
          {error}
        </div>
      )}
      {created && (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-[#c6e6de] bg-[#f0faf7] px-4 py-3 text-xs text-[#147d69]">
          <CircleCheck size={14} className="shrink-0" />
          Payment {created} registered. Reconcile it from the table below.
        </div>
      )}

      <div className="mt-5">
        <button
          type="submit"
          disabled={submitting}
          className="flex items-center gap-2 rounded-xl bg-[#147d69] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#106653] disabled:opacity-50"
        >
          <Plus size={15} />
          {submitting ? "Registering…" : "Register payment"}
        </button>
      </div>
    </form>
  );
}
