import { Activity, Clock, Crown, Gauge } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useRoomFlow } from "./store";

function Kpi({
  icon: Icon,
  label,
  value,
  hint,
  bar,
  tone,
}: {
  icon: typeof Activity;
  label: string;
  value: string;
  hint: string;
  bar?: number;
  tone: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 exec-shadow">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <Icon className={`size-4 ${tone}`} />
      </div>
      <div className="mt-2 font-display text-3xl font-semibold">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{hint}</div>
      {bar !== undefined && <Progress value={bar} className="mt-3 h-1.5" />}
    </div>
  );
}

export function KpiBar() {
  const { kpis } = useRoomFlow();
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Kpi
        icon={Gauge}
        tone="text-ready"
        label="Room Readiness"
        value={`${kpis.readiness}%`}
        hint="Serviceable inventory ready for guests"
        bar={kpis.readiness}
      />
      <Kpi
        icon={Clock}
        tone="text-progress"
        label="Avg Turnaround"
        value={`${kpis.avgTurnaround} min`}
        hint="Rolling average across active turns"
      />
      <Kpi
        icon={Crown}
        tone="text-vip"
        label="VIP Rooms Pending"
        value={`${kpis.vipPending}`}
        hint="High-priority arrivals not yet ready"
      />
      <Kpi
        icon={Activity}
        tone="text-inspect"
        label="Staff Utilization"
        value={`${kpis.utilization}%`}
        hint="Workload balance across active team"
        bar={kpis.utilization}
      />
    </div>
  );
}
