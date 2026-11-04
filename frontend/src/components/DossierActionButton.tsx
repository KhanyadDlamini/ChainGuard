"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BrainCircuit, FileSearch } from "lucide-react";
import {
  ApiError,
  analyzeCaseWithAI,
  investigateCase,
} from "@/lib/api";

export default function DossierActionButton({
  caseId,
  kind,
}: {
  caseId: string;
  kind: "report" | "ai";
}) {
  const router = useRouter();
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    setWorking(true);
    setError(null);
    try {
      if (kind === "report") {
        await investigateCase(caseId);
      } else {
        await analyzeCaseWithAI(caseId);
      }
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

  const isAI = kind === "ai";

  return (
    <div>
      <button
        onClick={onClick}
        disabled={working}
        className={
          isAI
            ? "flex items-center gap-2 rounded-xl bg-[#1a6fa8] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#155a8a] disabled:opacity-50"
            : "flex items-center gap-2 rounded-xl bg-[#147d69] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#106653] disabled:opacity-50"
        }
      >
        {isAI ? <BrainCircuit size={15} /> : <FileSearch size={15} />}
        {working
          ? isAI
            ? "Analyzing…"
            : "Working…"
          : isAI
            ? "Request AI assessment"
            : "Generate deterministic report"}
      </button>
      {error && (
        <p className="mt-2 max-w-md text-xs text-[#bd554d]">{error}</p>
      )}
    </div>
  );
}
