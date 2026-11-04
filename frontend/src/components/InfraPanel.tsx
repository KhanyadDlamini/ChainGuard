"use client";

import { useCallback, useState } from "react";
import { Activity, CheckCircle2, CircleAlert, Clock3, RefreshCw } from "lucide-react";
import { fetchInfraStatus, type ServiceStatus } from "@/lib/api";

type Props = {
  /** Initial statuses server-fetched and passed in as props. */
  initial: ServiceStatus[];
  /** Called after a successful refresh so parent can update its connected count. */
  onRefresh?: (statuses: ServiceStatus[]) => void;
};

export default function InfraPanel({ initial, onRefresh }: Props) {
  const [services, setServices] = useState<ServiceStatus[]>(initial);
  const [lastChecked, setLastChecked] = useState<string>(
    // Initialised to empty string on the server; filled client-side after hydration via refresh.
    ""
  );
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    const next = await fetchInfraStatus();
    setServices(next);
    setLastChecked(new Date().toLocaleTimeString());
    onRefresh?.(next);
    setRefreshing(false);
  }, [onRefresh]);

  return (
    <div className="rounded-2xl border border-[#eaece7] bg-white p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold tracking-tight">Infrastructure</h2>
          <p className="mt-1 text-xs text-[#858b85]">Live connection status</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={refresh}
            disabled={refreshing}
            aria-label="Refresh infrastructure status"
            className="rounded-lg border border-[#eaece7] p-2 text-[#68706a] hover:bg-[#faf9f6] disabled:opacity-50"
          >
            <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} />
          </button>
          <Activity size={18} className="text-[#147d69]" />
        </div>
      </div>

      <div className="mt-6 space-y-5">
        {services.map((service) => (
          <div key={service.label} className="flex items-start gap-3">
            <div className="mt-0.5">
              {service.connected === null ? (
                <Clock3 size={17} className="text-[#a87932]" />
              ) : service.connected ? (
                <CheckCircle2 size={17} className="text-[#147d69]" />
              ) : (
                <CircleAlert size={17} className="text-[#bd554d]" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">{service.label}</span>
                <span
                  className={`text-[10px] font-semibold ${
                    service.connected === null
                      ? "text-[#a87932]"
                      : service.connected
                        ? "text-[#147d69]"
                        : "text-[#bd554d]"
                  }`}
                >
                  {service.connected === null
                    ? "CHECKING"
                    : service.connected
                      ? "CONNECTED"
                      : "OFFLINE"}
                </span>
              </div>
              <p className="mt-1 text-xs text-[#858b85]">{service.detail}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-7 border-t border-[#eaece7] pt-4 text-[11px] text-[#858b85]">
        {lastChecked ? `Last checked: ${lastChecked}` : "Click refresh to check status"}
      </div>
    </div>
  );
}
