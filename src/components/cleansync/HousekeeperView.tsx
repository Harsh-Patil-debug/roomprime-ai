import { useEffect, useState } from "react";
import { Camera, CheckCircle2, Crown, Play, Timer, ClipboardCheck, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { CHECKLIST_STEPS, statusStyles } from "@/lib/cleansync-data";
import { useCleanSync } from "./store";

export function HousekeeperView() {
  const { rooms, staff, setRoomStatus } = useCleanSync();
  const me = staff[0]!;
  const myRoom =
    rooms.find((r) => r.assignedStaff === me.name && r.status === "Cleaning in Progress") ??
    rooms.find((r) => r.assignedStaff === me.name && r.status !== "Ready for Guest") ??
    rooms[0]!;
  const upNext = rooms.filter((r) => r.assignedStaff === me.name && r.id !== myRoom.id).slice(0, 3);

  const [running, setRunning] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [done, setDone] = useState<string[]>([]);
  const [scanned, setScanned] = useState(false);

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [running]);

  const mmss = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  const pct = Math.round((done.length / CHECKLIST_STEPS.length) * 100);

  return (
    <div className="flex justify-center">
      <div className="w-full max-w-sm space-y-4 rounded-[2rem] border border-border bg-card p-4 exec-shadow">
        <div className="flex items-center justify-between px-1">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Housekeeper</p>
            <p className="font-display text-lg font-semibold">{me.name}</p>
          </div>
          <Badge className="bg-ready/15 text-ready hover:bg-ready/15">
            {me.completed} rooms today
          </Badge>
        </div>

        <Card className="gap-3 border-progress/40 bg-surface p-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display text-3xl font-semibold">{myRoom.number}</h3>
                {myRoom.priority === "VIP" && (
                  <Badge className="bg-vip/15 text-vip hover:bg-vip/15">
                    <Crown className="size-3" /> VIP
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {myRoom.type} · Floor {myRoom.floor} · check-in {myRoom.checkIn}
              </p>
            </div>
            <span
              className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${statusStyles[myRoom.status].chip}`}
            >
              {myRoom.status}
            </span>
          </div>

          <div className="flex items-center justify-between rounded-lg bg-card px-3 py-2">
            <span className="flex items-center gap-2 text-sm text-muted-foreground">
              <Timer className="size-4" /> Elapsed
            </span>
            <span className="font-display text-xl font-semibold tabular-nums">{mmss}</span>
          </div>

          <Progress value={pct} className="h-1.5" />
          <div className="space-y-1">
            {CHECKLIST_STEPS.map((step) => (
              <label
                key={step}
                className="flex items-center gap-3 rounded-lg px-2 py-2 text-sm transition-colors hover:bg-accent"
              >
                <Checkbox
                  checked={done.includes(step)}
                  onCheckedChange={(c) =>
                    setDone((prev) => (c ? [...prev, step] : prev.filter((s) => s !== step)))
                  }
                />
                <span className={done.includes(step) ? "text-muted-foreground line-through" : ""}>
                  {step}
                </span>
              </label>
            ))}
          </div>
        </Card>

        <Button
          variant="outline"
          className="w-full"
          onClick={() => {
            setScanned(true);
            toast.success("AI cleanliness scan complete", {
              description: "Bed Made: PASS · Amenities: PASS · Trash Empty: PASS",
            });
          }}
        >
          <Camera /> Capture room photo for AI check
        </Button>

        {scanned && (
          <div className="space-y-1.5 rounded-lg border border-ready/40 bg-ready/10 p-3 text-xs">
            {["Bed Made", "Amenities", "Trash Empty"].map((c) => (
              <div key={c} className="flex items-center justify-between">
                <span>{c}</span>
                <span className="flex items-center gap-1 font-medium text-ready">
                  <CheckCircle2 className="size-3.5" /> PASS
                </span>
              </div>
            ))}
          </div>
        )}

        {!running ? (
          <Button
            className="h-12 w-full text-base"
            onClick={() => {
              setRunning(true);
              setRoomStatus(myRoom.id, "Cleaning in Progress");
              toast.success(`Started cleaning room ${myRoom.number}`);
            }}
          >
            <Play /> Start Cleaning
          </Button>
        ) : (
          <Button
            className="h-12 w-full text-base"
            onClick={() => {
              setRunning(false);
              setRoomStatus(myRoom.id, "Inspection Pending");
              toast.success(`Room ${myRoom.number} sent for inspection`, {
                description: `Turn time ${mmss} · ${pct}% checklist complete.`,
              });
            }}
          >
            <ClipboardCheck /> Mark for Inspection
          </Button>
        )}

        <div className="space-y-2 px-1">
          <p className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
            <Sparkles className="size-3.5" /> Up next
          </p>
          {upNext.map((r) => (
            <div
              key={r.id}
              className="flex items-center justify-between rounded-lg border border-border bg-surface px-3 py-2 text-sm"
            >
              <span className="font-medium">
                {r.number} · {r.type}
              </span>
              <span className="text-xs text-muted-foreground">{r.checkIn}</span>
            </div>
          ))}
          {!upNext.length && (
            <p className="text-xs text-muted-foreground">No further assignments queued.</p>
          )}
        </div>
      </div>
    </div>
  );
}
