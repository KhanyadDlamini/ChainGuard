type Result =
  | "MATCHED"
  | "DISCREPANCY"
  | "FAILED"
  | "PENDING"
  | "UNVERIFIED"
  | string;

const STYLES: Record<string, string> = {
  MATCHED: "bg-[#e8f3ef] text-[#147d69]",
  DISCREPANCY: "bg-[#fef3cd] text-[#a87932]",
  FAILED: "bg-[#fdecea] text-[#bd554d]",
  PENDING: "bg-[#f0f1ee] text-[#68706a]",
  UNVERIFIED: "bg-[#f0f1ee] text-[#68706a]",
};

export default function ResultBadge({ result }: { result: Result }) {
  const cls = STYLES[result] ?? "bg-[#f0f1ee] text-[#68706a]";
  return (
    <span className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${cls}`}>
      {result}
    </span>
  );
}
