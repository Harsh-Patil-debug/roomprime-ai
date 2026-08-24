import { useState } from "react";
import {
  Sparkles,
  Crown,
  ArrowUp,
  ArrowDown,
  ClipboardCheck,
  Wrench,
  Camera,
  CheckCircle2,
  Flag,
} from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { statusStyles, type Room } from "@/lib/cleansync-data";
import { useCleanSync } from "./store";

const issues = ["AC / HVAC fault", "Plumbing leak", "Electrical / lighting", "Furniture damage"];

export function SupervisorView() {
  const { queue, rooms, staff, autoOptimize, setRoomStatus, blockRoom, assignRoom } = useCleanSync();
  const [manualOrder, setManualOrder] = useState<string[]>([]);
  const [inspectRoom, setInspectRoom] = useState<Room | null>(null);
  const [maintOpen, setMaintOpen] = useState(false);
  const [maintRoom, setMaintRoom] = useState<string>("");
  const [maintIssue, setMaintIssue] = useState<string>(issues[0]!);
  const [maintNote, setMaintNote] = useState("");

  const ordered = manualOrder.length
    ? [...queue].sort((a, b) => manualOrder.indexOf(a.id) - manualOrder.indexOf(b.id))
    : queue;

  const move = (id: string, dir: -1 | 1) => {
    const ids = ordered.map((r) => r.id);
    const i = ids.indexOf(id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j]!, ids[i]!];
    setManualOrder(ids);
  };

  const inspectionQueue = rooms.filter((r) => r.status === "Inspection Pending");

  return (
    <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
      <div className="space-y-6">
        <Card className="gap-4 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold">Dynamic Priority Queue</h3>
              <p className="text-xs text-muted-foreground">
                Ranked by VIP status, early arrivals and overdue turns.
              </p>
            </div>
            <Button
              onClick={() => {
                const saved = autoOptimize();
                setManualOrder([]);
                toast.success("Dispatch rebalanced", {
                  description: `${queue.length} rooms reassigned across active staff · ~${saved} min saved.`,
                });
              }}
            >
              <Sparkles /> Auto-Optimize Dispatch
            </Button>
          </div>

          <div className="space-y-2">
            {ordered.map((room, idx) => (
              <div
                key={room.id}
                className={`flex items-center gap-3 rounded-lg border bg-surface p-3 ${statusStyles[room.status].ring}`}
              >
                <span className="w-6 text-center font-display text-sm font-semibold text-muted-foreground">
                  {idx + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-display text-lg font-semibold">{room.number}</span>
                    {room.priority === "VIP" && (
                      <Badge className="bg-vip/15 text-vip hover:bg-vip/15">
                        <Crown className="size-3" /> VIP
                      </Badge>
                    )}
                    {room.priority === "Overdue" && (
                      <Badge className="bg-urgent/15 text-urgent hover:bg-urgent/15">Overdue</Badge>
                    )}
                    {room.priority === "Early Arrival" && (
                      <Badge className="bg-progress/15 text-progress hover:bg-progress/15">
                        Early arrival
                      </Badge>
                    )}
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {room.type} · check-in {room.checkIn} · ~{room.turnaround} min ·{" "}
                    {room.assignedStaff ?? "Unassigned"}
                  </p>
                </div>
                <Select
                  value={room.assignedStaff ?? ""}
                  onValueChange={(v) => {
                    assignRoom(room.id, v);
                    toast.success(`Room ${room.number} assigned to ${v}`);
                  }}
                >
                  <SelectTrigger className="hidden w-40 sm:flex">
                    <SelectValue placeholder="Assign" />
                  </SelectTrigger>
                  <SelectContent>
                    {staff
                      .filter((s) => s.active)
                      .map((s) => (
                        <SelectItem key={s.id} value={s.name}>
                          {s.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <div className="flex flex-col">
                  <Button size="icon" variant="ghost" className="size-6" onClick={() => move(room.id, -1)}>
                    <ArrowUp className="size-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="size-6" onClick={() => move(room.id, 1)}>
                    <ArrowDown className="size-3.5" />
                  </Button>
                </div>
              </div>
            ))}
            {!ordered.length && (
              <p className="py-8 text-center text-sm text-muted-foreground">Queue is clear.</p>
            )}
          </div>
        </Card>

        <Card className="gap-4 p-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Inspection Queue</h3>
              <p className="text-xs text-muted-foreground">AI photo checks before guest release.</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setMaintOpen(true)}>
              <Wrench /> Log maintenance
            </Button>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {inspectionQueue.map((room) => (
              <button
                key={room.id}
                onClick={() => setInspectRoom(room)}
                className="flex items-center justify-between rounded-lg border border-inspect/40 bg-surface p-3 text-left transition-colors hover:bg-accent"
              >
                <div>
                  <p className="font-display text-lg font-semibold">{room.number}</p>
                  <p className="text-xs text-muted-foreground">
                    {room.assignedStaff ?? "Unassigned"} · {room.type}
                  </p>
                </div>
                <ClipboardCheck className="size-4 text-inspect" />
              </button>
            ))}
            {!inspectionQueue.length && (
              <p className="py-6 text-center text-sm text-muted-foreground sm:col-span-2">
                Nothing awaiting inspection.
              </p>
            )}
          </div>
        </Card>
      </div>

      <Card className="h-fit gap-4 p-5">
        <h3 className="text-lg font-semibold">Team Workload</h3>
        <div className="space-y-4">
          {staff.map((s) => (
            <div key={s.id} className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 font-medium">
                  <span className={`size-2 rounded-full ${s.active ? "bg-ready" : "bg-muted-foreground"}`} />
                  {s.name}
                </span>
                <span className="text-xs text-muted-foreground">
                  {s.completed} done · {s.avgSpeed} min avg
                </span>
              </div>
              <Progress value={s.workload} className="h-1.5" />
              <p className="text-xs text-muted-foreground">
                {s.currentRoom ? `In room ${s.currentRoom}` : "Available"} · {s.workload}% load
              </p>
            </div>
          ))}
        </div>
      </Card>

      <Dialog open={!!inspectRoom} onOpenChange={(o) => !o && setInspectRoom(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>AI Photo Inspection · Room {inspectRoom?.number}</DialogTitle>
            <DialogDescription>
              Computer-vision review of the cleaner's submitted photo.
            </DialogDescription>
          </DialogHeader>
          <div className="flex aspect-video items-center justify-center rounded-lg border border-border bg-surface">
            <Camera className="size-8 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            {["Bed Made", "Amenities Restocked", "Trash Empty", "Bath Sanitized"].map((c) => (
              <div
                key={c}
                className="flex items-center justify-between rounded-md bg-ready/10 px-3 py-2 text-sm"
              >
                <span>{c}</span>
                <span className="flex items-center gap-1.5 font-medium text-ready">
                  <CheckCircle2 className="size-4" /> PASS
                </span>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                if (!inspectRoom) return;
                setRoomStatus(inspectRoom.id, "Vacant Dirty");
                toast.error(`Room ${inspectRoom.number} flagged for re-clean`);
                setInspectRoom(null);
              }}
            >
              <Flag /> Flag re-clean
            </Button>
            <Button
              onClick={() => {
                if (!inspectRoom) return;
                setRoomStatus(inspectRoom.id, "Ready for Guest");
                toast.success(`Room ${inspectRoom.number} approved — Ready for Guest`);
                setInspectRoom(null);
              }}
            >
              <CheckCircle2 /> Approve room
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Drawer open={maintOpen} onOpenChange={setMaintOpen}>
        <DrawerContent>
          <div className="mx-auto w-full max-w-lg">
            <DrawerHeader>
              <DrawerTitle>Maintenance Logging</DrawerTitle>
              <DrawerDescription>Block a room and notify the engineering team.</DrawerDescription>
            </DrawerHeader>
            <div className="space-y-4 px-4">
              <div className="space-y-2">
                <Label>Room</Label>
                <Select value={maintRoom} onValueChange={setMaintRoom}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select room" />
                  </SelectTrigger>
                  <SelectContent>
                    {rooms.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.number} · {r.type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Issue type</Label>
                <Select value={maintIssue} onValueChange={setMaintIssue}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {issues.map((i) => (
                      <SelectItem key={i} value={i}>
                        {i}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={maintNote}
                  onChange={(e) => setMaintNote(e.target.value)}
                  placeholder="Describe the fault…"
                />
              </div>
            </div>
            <DrawerFooter>
              <Button
                disabled={!maintRoom}
                onClick={() => {
                  blockRoom(maintRoom, `${maintIssue}${maintNote ? ` — ${maintNote}` : ""}`);
                  toast.success(`Room ${maintRoom} blocked`, {
                    description: `${maintIssue} · engineering notified.`,
                  });
                  setMaintOpen(false);
                  setMaintNote("");
                  setMaintRoom("");
                }}
              >
                <Wrench /> Block room & notify
              </Button>
            </DrawerFooter>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
