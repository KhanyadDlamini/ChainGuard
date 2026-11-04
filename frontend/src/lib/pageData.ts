/**
 * Shared server-side data loader for layout shell data:
 * infra status (connected count for sidebar health badge) +
 * model name (for sidebar AI model badge).
 *
 * Used at the top of every page server component.
 */
import { fetchInfraStatus, fetchModelInfo, type ServiceStatus } from "./api";

export type ShellData = {
  statuses: ServiceStatus[];
  connectedCount: number;
  modelName: string;
};

export async function fetchShellData(): Promise<ShellData> {
  const [infraResult, modelResult] = await Promise.allSettled([
    fetchInfraStatus(),
    fetchModelInfo(),
  ]);

  const statuses =
    infraResult.status === "fulfilled"
      ? infraResult.value
      : [
          { label: "API service", connected: false, detail: "Unavailable" },
          { label: "Blockchain", connected: false, detail: "Unavailable" },
          { label: "Database", connected: false, detail: "Unavailable" },
        ];

  const modelName =
    modelResult.status === "fulfilled"
      ? modelResult.value.model_name
      : "muse-spark-1.3";

  return {
    statuses,
    connectedCount: statuses.filter((s) => s.connected).length,
    modelName,
  };
}
