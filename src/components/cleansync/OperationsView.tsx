import { useMemo, useState } from "react";
import { Crown, Search, Wrench, UserRound, CalendarClock } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card } from "@/components/ui/card";
import { STATUSES, statusStyles, arrivalTimeline, type RoomStatus } from "@/lib/cleansync-data";
import { useCleanSync } from "./store";

const floors = [1, 2, 3, 4];

export function OperationsView() {
  const { rooms, setRoomStatus } = useCleanSync();
  const [query, setQuery] = useState("");
  const [floor, setFloor] = useState<number | "all">("all");
  const [status, setStatus] = useState<RoomStatus | "all">("all");
  const [vipOnly, setVipOnly] = useState(false);
  const [maintOnly, setMaintOnly] = useState(false);

  const filtered = useMemo(
    () =>
      rooms.filter((r) => {
        if (floor !== "all" && r.floor !== floor) return false;
        if (status !== "all" && r.status !== status) return false;
        if (vipOnly && r.priority !== "VIP") return false;
        if (maintOnly && r.status !== "Maintenance Blocked") return false;
        const q = query.trim().toLowerCase();
        if (
          q &&
          !r.number.includes(q) &&
          !r.type.toLowerCase().includes(q) &&
          !(r.assignedStaff ?? "").toLowerCase().includes(q)
        )
          return false;
        return true;
      }),
    [rooms, floor, status, vipOnly, maintOnly, query],
  );

  const maxTimeline = Math.max(...arrivalTimeline.flatMap((t) => [t.arrivals, t.ready]));

  return (
    <div className="space-y-6">
      <Card className="gap-4 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search room, type or cleaner…"
              className="pl-9"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant={floor === "all" ? "default" : "outline"}
              onClick={() => setFloor("all")}
            >
              All floors
            </Button>
            {floors.map((f) => (
              <Button
                key={f}
                size="sm"
                variant={floor === f ? "default" : "outline"}
                onClick={() => setFloor(f)}
              >
                Floor {f}
              </Button>
            ))}
            <Button
              size="sm"
              variant={vipOnly ? "default" : "outline"}
              onClick={() => setVipOnly((v) => !v)}
            >
              <Crown /> VIP
            </Button>
            <Button
              size="sm"
              variant={maintOnly ? "default" : "outline"}
              onClick={() => setMaintOnly((v) => !v)}
            >
              <Wrench /> Maintenance
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant={status === "all" ? "secondary" : "ghost"}
            onClick={() => setStatus("all")}
          >
            All statuses
          </Button>
          {STATUSES.map((s) => (
            <Button
              key={s}
              size="sm"
              variant={status === s ? "secondary" : "ghost"}
              onClick={() => setStatus(s)}
            >
              <span className={`mr-1 size-2 rounded-full ${statusStyles[s].dot}`} />
              {s}
            </Button>
          ))}
        </div>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        {filtered.map((room) => (
          <Card
            key={room.id}
            className={`gap-3 border p-4 transition-shadow hover:exec-shadow ${statusStyles[room.status].ring}`}
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-display text-2xl font-semibold">{room.number}</h3>
                  {room.priority === "VIP" && (
                    <Badge className="bg-vip/15 text-vip hover:bg-vip/15">
                      <Crown className="size-3" /> VIP
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {room.type} · Floor {room.floor}
                </p>
              </div>
              <span
                className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${statusStyles[room.status].chip}`}
              >
                {room.status}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <UserRound className="size-3.5" />
                {room.assignedStaff ?? "Unassigned"}
              </span>
              <span className="flex items-center gap-1.5">
                <CalendarClock className="size-3.5" />
                Check-in {room.checkIn}
              </span>
              <span>Turnaround ~{room.turnaround || "—"} min</span>
              <span>{room.priority}</span>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="w-full">
                  Override status
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {STATUSES.map((s) => (
                  <DropdownMenuItem
                    key={s}
                    onClick={() => {
                      setRoomStatus(room.id, s);
                      toast.success(`Room ${room.number} → ${s}`);
                    }}
                  >
                    <span className={`size-2 rounded-full ${statusStyles[s].dot}`} />
                    {s}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </Card>
        ))}
        {!filtered.length && (
          <p className="col-span-full py-12 text-center text-sm text-muted-foreground">
            No rooms match the current filters.
          </p>
        )}
      </div>

      <Card className="p-5">
        <h3 className="text-lg font-semibold">Arrivals vs Readiness</h3>
        <p className="text-xs text-muted-foreground">
          Cumulative guest arrivals plotted against clean, ready inventory.
        </p>
        <div className="mt-6 flex h-52 items-end gap-3">
          {arrivalTimeline.map((t) => (
            <div key={t.hour} className="flex flex-1 flex-col items-center gap-2">
              <div className="flex h-full w-full items-end justify-center gap-1">
                <div
                  className="w-1/3 rounded-t bg-urgent/70"
                  style={{ height: `${(t.arrivals / maxTimeline) * 100}%` }}
                  title={`${t.arrivals} arrivals`}
                />
                <div
                  className="w-1/3 rounded-t bg-ready/80"
                  style={{ height: `${(t.ready / maxTimeline) * 100}%` }}
                  title={`${t.ready} ready`}
                />
              </div>
              <span className="text-[10px] text-muted-foreground">{t.hour}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 flex gap-5 text-xs text-muted-foreground">
          <span className="flex items-center gap-2">
            <span className="size-2.5 rounded-full bg-urgent/70" /> Arrivals
          </span>
          <span className="flex items-center gap-2">
            <span className="size-2.5 rounded-full bg-ready/80" /> Rooms ready
          </span>
        </div>
      </Card>
    </div>
  );
}
