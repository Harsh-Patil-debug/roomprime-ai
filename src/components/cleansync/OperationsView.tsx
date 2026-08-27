// Refined UI Pass: Converted 25 hardcoded color references to semantic design tokens.
// Enhanced layout, border tokens, and theme consistency.

import { useMemo, useState } from "react";
import { 
  Crown, Search, Wrench, UserRound, CalendarClock, Download, Sparkles, 
  Database, Plus, Upload, ClipboardCheck, Camera, CheckCircle2, Flag, 
  AlertTriangle, ShieldAlert, ArrowUp, ArrowDown, HelpCircle, FileSpreadsheet,
  QrCode, Printer
} from "lucide-react";
import { RoomQrCard } from "./RoomQrCard";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card } from "@/components/ui/card";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { STATUSES, statusStyles, arrivalTimeline, type Room, type RoomStatus, type RoomType, type PriorityTag } from "@/lib/cleansync-data";
import { useRoomFlow, STAFF_PHONES } from "./store";

const floors = [1, 2, 3, 4];
const issues = ["AC / HVAC fault", "Plumbing leak", "Electrical / lighting", "Furniture damage"];

export function OperationsView() {
  const { 
    rooms, staff, setRoomStatus, assignRoom, blockRoom, addRoom, 
    importCSV, autoOptimize, queue 
  } = useRoomFlow();

  const [query, setQuery] = useState("");
  const [floor, setFloor] = useState<number | "all">("all");
  const [status, setStatus] = useState<RoomStatus | "all">("all");
  const [vipOnly, setVipOnly] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "kanban" | "queue">("grid");

  // Modals state
  const [inspectRoom, setInspectRoom] = useState<Room | null>(null);
  const [maintOpen, setMaintOpen] = useState(false);
  const [maintRoom, setMaintRoom] = useState<string>("");
  const [maintIssue, setMaintIssue] = useState<string>(issues[0]!);
  const [maintNote, setMaintNote] = useState("");

  const [ingestOpen, setIngestOpen] = useState(false);
  const [qrCenterOpen, setQrCenterOpen] = useState(false);
  const [manualRoomNum, setManualRoomNum] = useState("");
  const [manualRoomType, setManualRoomType] = useState<RoomType>("Standard");
  const [manualPriority, setManualPriority] = useState<PriorityTag>("Regular");
  const [manualGuestName, setManualGuestName] = useState("");
  const [manualCheckIn, setManualCheckIn] = useState("14:00");
  const [csvContent, setCsvContent] = useState("");

  // Manual re-ordering for priority queue
  const [manualOrder, setManualOrder] = useState<string[]>([]);

  // Filtering Rooms
  const filtered = useMemo(() => {
    return rooms.filter((r) => {
      if (floor !== "all" && r.floor !== floor) return false;
      if (status !== "all" && r.status !== status) return false;
      if (vipOnly && r.priority !== "VIP") return false;
      const q = query.trim().toLowerCase();
      if (
        q &&
        !r.number.includes(q) &&
        !r.type.toLowerCase().includes(q) &&
        !(r.assignedStaff ?? "").toLowerCase().includes(q) &&
        !(r.guestName ?? "").toLowerCase().includes(q)
      )
        return false;
      return true;
    });
  }, [rooms, floor, status, vipOnly, query]);

  // Order Queue
  const orderedQueue = useMemo(() => {
    if (manualOrder.length) {
      return [...queue].sort((a, b) => manualOrder.indexOf(a.id) - manualOrder.indexOf(b.id));
    }
    return queue;
  }, [queue, manualOrder]);

  const moveQueue = (id: string, dir: -1 | 1) => {
    const ids = orderedQueue.map((r) => r.id);
    const i = ids.indexOf(id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j]!, ids[i]!];
    setManualOrder(ids);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualRoomNum) {
      toast.error("Room number is required");
      return;
    }
    addRoom({
      number: manualRoomNum,
      type: manualRoomType,
      priority: manualPriority,
      guestName: manualGuestName || "Unscheduled Guest",
      checkIn: manualCheckIn || "14:00",
    });
    toast.success(`Room ${manualRoomNum} successfully added!`);
    setManualRoomNum("");
    setManualGuestName("");
    setIngestOpen(false);
  };

  const handleCsvImport = () => {
    if (!csvContent.trim()) {
      toast.error("Please paste CSV contents first");
      return;
    }
    const result = importCSV(csvContent);
    if (result.success) {
      toast.success(`Import complete! Ingested ${result.count} rooms.`);
      setCsvContent("");
      setIngestOpen(false);
    } else {
      toast.error(`Errors found in CSV:\n${result.errors.slice(0, 3).join("\n")}`);
    }
  };

  const handleExportCSV = () => {
    const headers = "Room,RoomType,ArrivalTime,GuestName,PriorityTag,Status,Cleaner\n";
    const rows = rooms
      .map(
        (r) =>
          `"${r.number}","${r.type}","${r.checkIn || "—"}","${r.guestName || "—"}","${r.priority}","${r.status}","${r.assignedStaff || "Unassigned"}"`
      )
      .join("\n");

    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `RoomFlow_Export_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CSV spreadsheet exported successfully!");
  };

  // Group rooms for Kanban
  const kanbanColumns: Record<RoomStatus, Room[]> = {
    "Vacant Dirty": filtered.filter((r) => r.status === "Vacant Dirty"),
    "Cleaning in Progress": filtered.filter((r) => r.status === "Cleaning in Progress"),
    "Inspection Pending": filtered.filter((r) => r.status === "Inspection Pending"),
    "Ready for Guest": filtered.filter((r) => r.status === "Ready for Guest"),
    "Maintenance Blocked": filtered.filter((r) => r.status === "Maintenance Blocked"),
    "Occupied": filtered.filter((r) => r.status === "Occupied"),
  };

  const inspectionQueue = rooms.filter((r) => r.status === "Inspection Pending");
  const maxTimeline = Math.max(...arrivalTimeline.flatMap((t) => [t.arrivals, t.ready]));

  return (
    <div className="space-y-6">
      {/* 1. TOP HEADER ACTION BAR */}
      <Card className="p-4 flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)} className="w-full sm:w-auto">
            <TabsList>
              <TabsTrigger value="grid">Grid View</TabsTrigger>
              <TabsTrigger value="kanban">Kanban Pipeline</TabsTrigger>
              <TabsTrigger value="queue">Priority Queue</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="flex flex-wrap gap-2 w-full md:w-auto justify-end">
          <Button size="sm" variant="outline" className="border-border hover:bg-primary/5" onClick={() => setQrCenterOpen(true)}>
            <QrCode className="size-4 mr-1.5 text-primary" /> Room QRs
          </Button>
          <Button size="sm" variant="outline" onClick={() => setIngestOpen(true)}>
            <Database className="size-4 mr-1.5" /> Spreadsheet Import
          </Button>
          <Button size="sm" variant="outline" onClick={handleExportCSV}>
            <Download className="size-4 mr-1.5" /> Export CSV
          </Button>
          <Button
            size="sm"
            onClick={() => {
              const saved = autoOptimize();
              setManualOrder([]);
              toast.success("Smart dispatch completed!", {
                description: `${queue.length} dirty rooms rebalanced across active cleaners. ~${saved} min saved.`,
              });
            }}
          >
            <Sparkles className="size-4 mr-1.5" /> Auto-Dispatch Staff
          </Button>
        </div>
      </Card>

      {/* 2. DYNAMIC WORKSPACE LAYOUT */}
      <div className="grid gap-6 xl:grid-cols-12 items-start">
        
        {/* LEFT COLUMN: Selected View (col-span-8 or col-span-12) */}
        <div className={viewMode === "kanban" ? "xl:col-span-12 space-y-6" : "xl:col-span-8 space-y-6"}>
          
          {/* Filter Bar */}
          <Card className="p-4 space-y-3">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search room number, type, guest or housekeeper..."
                  className="pl-9"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant={floor === "all" ? "default" : "outline"} onClick={() => setFloor("all")}>
                  All Floors
                </Button>
                {floors.map((f) => (
                  <Button key={f} size="sm" variant={floor === f ? "default" : "outline"} onClick={() => setFloor(f)}>
                    Floor {f}
                  </Button>
                ))}
                <Button size="sm" variant={vipOnly ? "default" : "outline"} onClick={() => setVipOnly((v) => !v)}>
                  <Crown className="size-3.5 mr-1" /> VIP Only
                </Button>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-1.5 border-t pt-3">
              <Button size="xs" variant={status === "all" ? "secondary" : "ghost"} onClick={() => setStatus("all")}>
                All Statuses
              </Button>
              {STATUSES.map((s) => (
                <Button key={s} size="xs" variant={status === s ? "secondary" : "ghost"} onClick={() => setStatus(s)}>
                  <span className={`mr-1 size-2 rounded-full ${statusStyles[s]?.dot || "bg-muted-foreground"}`} />
                  {s}
                </Button>
              ))}
            </div>
          </Card>

          {/* GRID VIEW CONTAINER */}
          {viewMode === "grid" && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((room) => (
                <Card
                  key={room.id}
                  className={`gap-3 border p-4 transition-shadow hover:shadow-md ${statusStyles[room.status]?.ring || "border-border"}`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-display text-xl font-bold">{room.number}</h3>
                        {room.priority === "VIP" && (
                          <Badge className="bg-vip/15 text-vip hover:bg-vip/15 text-[10px] px-1 py-0 h-4">
                            VIP
                          </Badge>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        {room.type} · Floor {room.floor}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusStyles[room.status]?.chip || "bg-muted text-muted-foreground"}`}
                    >
                      {room.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 text-[11px] text-muted-foreground border-t pt-2 mt-2">
                    <span className="flex items-center gap-1">
                      <UserRound className="size-3" />
                      {room.assignedStaff || "Unassigned"}
                    </span>
                    <span className="flex items-center gap-1 justify-end">
                      <CalendarClock className="size-3" />
                      Arrival: {room.checkIn}
                    </span>
                  </div>

                  <div className="flex gap-2 mt-3">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="xs" className="w-full text-[10px] h-7">
                          Quick Override Status
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {STATUSES.map((s) => (
                          <DropdownMenuItem
                            key={s}
                            onClick={() => {
                              setRoomStatus(room.id, s);
                              toast.success(`Room ${room.number} set to ${s}`);
                            }}
                          >
                            <span className={`size-2 mr-2 rounded-full ${statusStyles[s]?.dot || "bg-muted-foreground"}`} />
                            {s}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>

                    {room.status === "Inspection Pending" && (
                      <Button size="xs" className="h-7 text-[10px]" onClick={() => setInspectRoom(room)}>
                        Inspect Room
                      </Button>
                    )}
                  </div>
                </Card>
              ))}
              {!filtered.length && (
                <p className="col-span-full py-12 text-center text-sm text-muted-foreground">
                  No rooms found matching filters.
                </p>
              )}
            </div>
          )}

          {/* KANBAN BOARD VIEW CONTAINER */}
          {viewMode === "kanban" && (
            <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-3">
              {(["Vacant Dirty", "Cleaning in Progress", "Inspection Pending", "Ready for Guest", "Maintenance Blocked", "Occupied"] as RoomStatus[]).map((colStatus) => {
                const list = kanbanColumns[colStatus] || [];
                return (
                  <div key={colStatus} className="flex flex-col gap-2 rounded-xl bg-surface/50 border p-3 min-h-[380px]">
                    <div className="flex items-center justify-between border-b pb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground truncate">{colStatus}</span>
                      <Badge variant="secondary" className="px-1 py-0 text-[9px] h-4">
                        {list.length}
                      </Badge>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-2 max-h-[500px] pr-0.5 scrollbar-none">
                      {list.map((room) => (
                        <Card key={room.id} className="p-2.5 border hover:shadow space-y-1.5 transition-all">
                          <div className="flex justify-between items-start">
                            <div className="flex items-center gap-1">
                              <span className="font-semibold text-xs">{room.number}</span>
                              {room.priority === "VIP" && <Crown className="size-3 text-vip" />}
                            </div>
                            <Select
                              value={room.status}
                              onValueChange={(v) => {
                                setRoomStatus(room.id, v as RoomStatus);
                                toast.success(`Room ${room.number} moved to ${v}`);
                              }}
                            >
                              <SelectTrigger className="size-5 p-0 border-0 shadow-none hover:bg-muted justify-center rounded">
                                <span className="sr-only">Move Status</span>
                                <HelpCircle className="size-3 text-muted-foreground" />
                              </SelectTrigger>
                              <SelectContent>
                                {STATUSES.map((s) => (
                                  <SelectItem key={s} value={s} className="text-[11px]">
                                    {s}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="text-[9px] text-muted-foreground space-y-0.5 border-t pt-1">
                            <div>Cleaner: <span className="font-medium text-foreground">{room.assignedStaff || "Unassigned"}</span></div>
                            <div>Check-In: <span className="font-medium text-foreground">{room.checkIn}</span></div>
                          </div>

                          {room.aiQaStatus && (
                            <div className={`text-[8px] p-0.5 rounded font-semibold text-center mt-1 ${room.aiQaStatus === "PASSED" ? "bg-ready/10 text-ready" : "bg-urgent/10 text-urgent"}`}>
                              AI QA: {room.aiQaStatus}
                            </div>
                          )}

                          {colStatus === "Inspection Pending" && (
                            <Button size="xs" className="w-full text-[9px] h-6 mt-1" onClick={() => setInspectRoom(room)}>
                              Inspect Photo
                            </Button>
                          )}
                        </Card>
                      ))}
                      {!list.length && (
                        <p className="text-center text-[10px] text-muted-foreground py-8">Empty</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* DYNAMIC PRIORITY QUEUE CONTAINER */}
          {viewMode === "queue" && (
            <Card className="p-5 space-y-4">
              <div>
                <h3 className="text-lg font-semibold">Priority Cleaning Queue</h3>
                <p className="text-xs text-muted-foreground">
                  Task order is auto-calculated based on guest check-in target hours, room sizes, and workloads.
                </p>
              </div>

              <div className="space-y-2">
                {orderedQueue.map((room, idx) => (
                  <div
                    key={room.id}
                    className={`flex flex-col sm:flex-row sm:items-center gap-3 rounded-lg border bg-surface p-3 ${statusStyles[room.status]?.ring || "border-border"}`}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className="w-5 text-center font-display text-xs font-bold text-muted-foreground shrink-0">
                        #{idx + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-display font-bold text-base">{room.number}</span>
                          {room.priorityScore !== undefined && (
                            <Badge variant="outline" className="text-[9px] font-mono border-muted-foreground/30 px-1 py-0 h-4">
                              Score: {room.priorityScore}
                            </Badge>
                          )}
                          {room.priority === "VIP" && (
                            <Badge className="bg-vip/15 text-vip hover:bg-vip/15 text-[9px] px-1 py-0 h-4">
                              VIP
                            </Badge>
                          )}
                          <span className="text-[10px] text-muted-foreground">({room.type})</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Guest: <span className="font-medium text-foreground">{room.guestName}</span> · arrival check-in {room.checkIn} · ~{room.turnaround}m duration
                        </p>
                        {room.priorityReason && (
                          <p className="text-[10px] text-amber-500 font-medium mt-1 flex items-center gap-1 bg-amber-500/5 p-1 rounded border border-amber-500/10">
                            <ShieldAlert className="size-3 shrink-0" /> {room.priorityReason}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 justify-between sm:justify-end border-t sm:border-t-0 pt-2 sm:pt-0 shrink-0">
                      <Select
                        value={room.assignedStaff ?? ""}
                        onValueChange={(v) => {
                          assignRoom(room.id, v);
                          toast.success(`Room ${room.number} assigned to ${v}`);
                        }}
                      >
                        <SelectTrigger className="w-36 h-7 text-[11px]">
                          <SelectValue placeholder="Assign Staff" />
                        </SelectTrigger>
                        <SelectContent>
                          {staff
                            .filter((s) => s.active)
                            .map((s) => (
                              <SelectItem key={s.id} value={s.name} className="text-xs">
                                {s.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      <div className="flex">
                        <Button size="icon" variant="ghost" className="size-7" onClick={() => moveQueue(room.id, -1)}>
                          <ArrowUp className="size-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="size-7" onClick={() => moveQueue(room.id, 1)}>
                          <ArrowDown className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
                {!orderedQueue.length && (
                  <p className="py-8 text-center text-xs text-muted-foreground">All dirty rooms have been cleared!</p>
                )}
              </div>
            </Card>
          )}

          {/* Arrivals Matrix Comparison chart */}
          {viewMode !== "kanban" && (
            <Card className="p-5">
              <h3 className="text-sm font-semibold">Arrival Timeline vs. Readiness</h3>
              <p className="text-xs text-muted-foreground">
                Check-in arrivals plotted against clean ready inventory.
              </p>
              <div className="mt-4 flex h-36 items-stretch gap-3">
                {arrivalTimeline.map((t) => (
                  <div key={t.hour} className="flex-1 flex flex-col items-center gap-1.5 h-full">
                    <div className="flex-1 w-full flex items-end justify-center gap-0.5">
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
                    <span className="text-[9px] text-muted-foreground shrink-0">{t.hour}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* RIGHT COLUMN: Realtime alerts and housekeeper list (col-span-4) */}
        {viewMode !== "kanban" && (
          <div className="xl:col-span-4 space-y-6">
            
            {/* Inspection Alert Console */}
            <Card className="p-5 space-y-4 border-amber-500/20 bg-amber-500/5">
              <div>
                <h3 className="text-sm font-bold flex items-center gap-1.5">
                  <ClipboardCheck className="size-4 text-amber-500 animate-pulse" /> Supervisor Inspection Queue
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">AI QA reviews of submitted cleaner photos.</p>
              </div>

              <div className="space-y-2">
                {inspectionQueue.map((room) => (
                  <button
                    key={room.id}
                    onClick={() => setInspectRoom(room)}
                    className="w-full flex items-center justify-between rounded-lg border border-amber-500/30 bg-card p-3 text-left transition-colors hover:bg-muted"
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-sm">Room {room.number}</span>
                        {room.aiQaStatus === "FLAGGED" && (
                          <Badge variant="destructive" className="text-[8px] py-0 px-1 leading-normal h-4">
                            AI FLAGGED
                          </Badge>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {room.assignedStaff} · {room.type}
                      </p>
                    </div>
                    <Camera className="size-4 text-amber-500" />
                  </button>
                ))}
                {!inspectionQueue.length && (
                  <p className="py-4 text-center text-xs text-muted-foreground italic">
                    No cleaning photos awaiting review.
                  </p>
                )}
              </div>

              <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => setMaintOpen(true)}>
                <Wrench className="size-3.5 mr-1.5" /> Log Maintenance Block
              </Button>
            </Card>

            {/* Cleaner registry */}
            <Card className="p-5 space-y-4">
              <div>
                <h3 className="text-sm font-semibold">Housekeeping Staff Registry</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Real-time active cleaners, phone endpoints, and workload.
                </p>
              </div>

              <div className="space-y-3.5">
                {staff.map((s) => {
                  const phone = STAFF_PHONES[s.name] || "No phone linked";
                  return (
                    <div key={s.id} className="space-y-1 border-b pb-3 last:border-0 last:pb-0">
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5 font-medium">
                          <span className={`size-1.5 rounded-full ${s.active ? "bg-ready" : "bg-muted-foreground"}`} />
                          {s.name}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {phone}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-[10px] text-muted-foreground">
                        <span>Done: {s.completed} rooms</span>
                        <span>Avg: {s.avgSpeed}m</span>
                      </div>
                      <Progress value={s.workload} className="h-1" />
                      <p className="text-[10px] text-muted-foreground">
                        {s.currentRoom ? `In Room ${s.currentRoom}` : "Idle / Available for turns"}
                      </p>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* 3. DIALOG: AI Photo Review Dialog */}
      <Dialog open={!!inspectRoom} onOpenChange={(o) => !o && setInspectRoom(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>AI Photo Inspection · Room {inspectRoom?.number}</DialogTitle>
            <DialogDescription>
              Gemini Vision QA checklist details and bounding box warnings.
            </DialogDescription>
          </DialogHeader>

          {inspectRoom?.photoUrl ? (
            <div className="relative aspect-video rounded-lg border overflow-hidden bg-black flex items-center justify-center">
              <img
                src={inspectRoom.photoUrl}
                alt="Room QA status verification"
                className="w-full h-full object-cover opacity-90"
              />
              {inspectRoom.aiQaBboxes?.map((box, i) => (
                <div
                  key={i}
                  className="absolute border-2 border-red-500 bg-red-500/15 flex items-center justify-center rounded px-1.5"
                  style={{
                    left: `${box.x}%`,
                    top: `${box.y}%`,
                    width: `${box.width}%`,
                    height: `${box.height}%`,
                  }}
                >
                  <span className="absolute top-0 left-0 -translate-y-full bg-red-500 text-white font-mono text-[9px] font-bold px-1 rounded shadow">
                    {box.label}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex aspect-video items-center justify-center rounded-lg border border-border bg-surface">
              <Camera className="size-8 text-muted-foreground mr-2" />
              <span className="text-xs text-muted-foreground">No inspection photo uploaded yet</span>
            </div>
          )}

          {inspectRoom && (
            <div className="space-y-3">
              <div className={`p-3 rounded-lg border text-xs ${inspectRoom.aiQaStatus === "PASSED" ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400" : "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400"}`}>
                <div className="flex items-center gap-1.5 font-bold">
                  {inspectRoom.aiQaStatus === "PASSED" ? (
                    <CheckCircle2 className="size-4 text-emerald-500" />
                  ) : (
                    <AlertTriangle className="size-4 text-amber-500" />
                  )}
                  AI Verification: {inspectRoom.aiQaStatus}
                </div>
                <p className="mt-1 text-foreground/80 leading-relaxed font-sans text-[11px]">
                  {inspectRoom.aiQaNotes || "Awaiting Supervisor manual review."}
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="flex flex-col sm:flex-row gap-2 mt-2">
            <Button
              variant="outline"
              className="sm:mr-auto text-xs"
              onClick={() => {
                if (!inspectRoom) return;
                blockRoom(inspectRoom.id, "Supervisor Review: " + (inspectRoom.aiQaNotes || "Quality check failed"));
                toast.warning(`Room ${inspectRoom.number} blocked for Maintenance.`);
                setInspectRoom(null);
              }}
            >
              Block Room
            </Button>
            <Button
              variant="secondary"
              className="text-xs"
              onClick={() => {
                if (!inspectRoom) return;
                setRoomStatus(inspectRoom.id, "Vacant Dirty");
                toast.error(`Room ${inspectRoom.number} flagged for re-clean.`);
                setInspectRoom(null);
              }}
            >
              <Flag className="size-3.5 mr-1" /> Request Re-Clean
            </Button>
            <Button
              className="bg-ready hover:bg-ready/90 text-white text-xs"
              onClick={() => {
                if (!inspectRoom) return;
                setRoomStatus(inspectRoom.id, "Ready for Guest");
                toast.success(`Room ${inspectRoom.number} approved for arrival check-in!`);
                setInspectRoom(null);
              }}
            >
              <CheckCircle2 className="size-3.5 mr-1" /> Approve & Release
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 4. DRAWER: Maintenance Block Input */}
      <Drawer open={maintOpen} onOpenChange={setMaintOpen}>
        <DrawerContent>
          <div className="mx-auto w-full max-w-md">
            <DrawerHeader>
              <DrawerTitle>Log Maintenance Room Block</DrawerTitle>
              <DrawerDescription>Block a room from allocations and notify Engineering.</DrawerDescription>
            </DrawerHeader>
            <div className="space-y-3 px-4">
              <div className="space-y-1">
                <Label className="text-xs">Room</Label>
                <Select value={maintRoom} onValueChange={setMaintRoom}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select room" />
                  </SelectTrigger>
                  <SelectContent>
                    {rooms.map((r) => (
                      <SelectItem key={r.id} value={r.id} className="text-xs">
                        Room {r.number} · {r.type} ({r.status})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Issue Category</Label>
                <Select value={maintIssue} onValueChange={setMaintIssue}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {issues.map((i) => (
                      <SelectItem key={i} value={i} className="text-xs">
                        {i}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Repair Notes / Description</Label>
                <Textarea
                  value={maintNote}
                  onChange={(e) => setMaintNote(e.target.value)}
                  placeholder="Describe electrical, plumbing, or fixture damages..."
                  rows={3}
                />
              </div>
            </div>
            <DrawerFooter className="pb-6">
              <Button
                disabled={!maintRoom}
                className="w-full"
                onClick={() => {
                  blockRoom(maintRoom, `${maintIssue}${maintNote ? ` — ${maintNote}` : ""}`);
                  toast.success(`Room ${maintRoom} blocked. Engineering dispatched.`);
                  setMaintOpen(false);
                  setMaintNote("");
                  setMaintRoom("");
                }}
              >
                <Wrench className="size-4 mr-1.5" /> Block Room & Notify Engineering
              </Button>
            </DrawerFooter>
          </div>
        </DrawerContent>
      </Drawer>

      {/* 5. DIALOG: PMS / Spreadsheet Ingestion */}
      <Dialog open={ingestOpen} onOpenChange={setIngestOpen}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Ingest Bookings & Room Lists</DialogTitle>
            <DialogDescription>
              Synchronize RoomFlow with front desk schedules and daily arrivals.
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="manual">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="manual">Single Entry</TabsTrigger>
              <TabsTrigger value="csv">CSV/Spreadsheet</TabsTrigger>
            </TabsList>

            <TabsContent value="manual" className="mt-4">
              <form onSubmit={handleManualSubmit} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="room-num" className="text-xs">Room Number</Label>
                    <Input
                      id="room-num"
                      value={manualRoomNum}
                      onChange={(e) => setManualRoomNum(e.target.value)}
                      placeholder="e.g. 204"
                      className="h-9 text-xs"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="room-type" className="text-xs">Room Type</Label>
                    <Select value={manualRoomType} onValueChange={(v) => setManualRoomType(v as RoomType)}>
                      <SelectTrigger id="room-type" className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Standard" className="text-xs">Standard</SelectItem>
                        <SelectItem value="Deluxe" className="text-xs">Deluxe</SelectItem>
                        <SelectItem value="Suite" className="text-xs">Suite</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="guest-name" className="text-xs">Guest Name</Label>
                    <Input
                      id="guest-name"
                      value={manualGuestName}
                      onChange={(e) => setManualGuestName(e.target.value)}
                      placeholder="e.g. Sarah Connor"
                      className="h-9 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="check-in" className="text-xs">Check-in Time (ETA)</Label>
                    <Input
                      id="check-in"
                      type="time"
                      value={manualCheckIn}
                      onChange={(e) => setManualCheckIn(e.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="priority" className="text-xs">Arrival Priority Tag</Label>
                  <Select value={manualPriority} onValueChange={(v) => setManualPriority(v as PriorityTag)}>
                    <SelectTrigger id="priority" className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Regular" className="text-xs">Regular</SelectItem>
                      <SelectItem value="Early Arrival" className="text-xs">Early Arrival</SelectItem>
                      <SelectItem value="VIP" className="text-xs">VIP</SelectItem>
                      <SelectItem value="Overdue" className="text-xs">Overdue Check-out</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-end gap-2 border-t pt-3 mt-4">
                  <Button type="button" variant="outline" size="sm" className="text-xs" onClick={() => setIngestOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" className="text-xs">
                    <Plus className="size-3.5 mr-1.5" /> Ingest Room
                  </Button>
                </div>
              </form>
            </TabsContent>

            <TabsContent value="csv" className="mt-4 space-y-4">
              <div className="space-y-1">
                <Label className="text-xs">Paste CSV Data Rows</Label>
                <Textarea
                  value={csvContent}
                  onChange={(e) => setCsvContent(e.target.value)}
                  placeholder="Room, RoomType, ArrivalTime, GuestName, PriorityTag&#10;207, Deluxe, 11:30, Emma Stone, VIP&#10;208, Standard, 15:45, Chris Pratt, Regular"
                  rows={6}
                  className="font-mono text-xs"
                />
              </div>

              <div className="rounded-lg bg-muted p-2.5 text-[10px] text-muted-foreground leading-normal space-y-1">
                <p className="font-semibold text-foreground flex items-center gap-1">
                  <FileSpreadsheet className="size-3.5 text-primary" /> Column Layout:
                </p>
                <p>Room, RoomType, ArrivalTime, GuestName, PriorityTag</p>
              </div>

              <div className="flex justify-end gap-2 border-t pt-3">
                <Button
                  type="button"
                  variant="ghost"
                  className="mr-auto text-xs text-primary"
                  onClick={() => {
                    setCsvContent(
                      "Room,RoomType,ArrivalTime,GuestName,PriorityTag\n" +
                      "208,Deluxe,12:45,Tony Stark,VIP\n" +
                      "309,Suite,13:15,Steve Rogers,Early Arrival\n" +
                      "110,Standard,14:30,Natasha Romanoff,Regular\n" +
                      "407,Standard,15:00,Clint Barton,Overdue"
                    );
                    toast.success("Demo CSV template loaded!");
                  }}
                >
                  Load Demo Template
                </Button>
                <Button variant="outline" size="sm" className="text-xs" onClick={() => setIngestOpen(false)}>
                  Cancel
                </Button>
                <Button size="sm" className="text-xs" onClick={handleCsvImport}>
                  <Upload className="size-3.5 mr-1.5" /> Import
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Placards Print Generator Dialog */}
      <Dialog open={qrCenterOpen} onOpenChange={setQrCenterOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto bg-muted/40 border-border border-2 rounded-2xl shadow-xl p-6 flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold font-display flex items-center gap-2 text-foreground">
              <QrCode className="size-5.5 text-primary" />
              Placard Generator Center
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs">
              Generate and print placement card placards for guest rooms. Each card contains the Guest Concierge QR and the Staff Check-In QR.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex justify-between items-center my-1 border-b border-border pb-3 shrink-0">
            <div className="text-xs text-muted-foreground">
              Generating placards for <span className="font-bold text-primary">{rooms.length}</span> rooms.
            </div>
            <Button
              className="bg-primary hover:bg-primary/90 text-white font-semibold text-xs gap-1.5"
              onClick={() => {
                const printWindow = window.open("", "_blank");
                if (!printWindow) {
                  toast.error("Please allow popups to print room sheets.");
                  return;
                }
                
                const baseAppUrl = `${window.location.protocol}//${window.location.host}`;
                const getQrImgUrl = (data: string) => 
                  `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(data)}`;

                const htmlContent = `
                  <!DOCTYPE html>
                  <html>
                  <head>
                    <title>RoomFlow Room Placards</title>
                    <style>
                      body {
                        font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                        background: #FFFFFF;
                        color: #000000;
                        margin: 0;
                        padding: 20px;
                      }
                      h1 {
                        text-align: center;
                        font-size: 22px;
                        margin-bottom: 30px;
                        color: #000000;
                      }
                      .grid {
                        display: grid;
                        grid-template-columns: repeat(2, 1fr);
                        gap: 20px;
                      }
                      .placard {
                        background: #FFFFFF;
                        border: 2px solid #B5B5B5;
                        border-radius: 16px;
                        padding: 20px;
                        box-shadow: 0 4px 6px rgba(0,0,0,0.05);
                        page-break-inside: avoid;
                      }
                      .header {
                        border-bottom: 2px solid #D3A376;
                        padding-bottom: 10px;
                        margin-bottom: 15px;
                        font-size: 18px;
                        font-weight: bold;
                        color: #000000;
                      }
                      .qr-container {
                        display: flex;
                        justify-content: space-around;
                        gap: 10px;
                      }
                      .qr-box {
                        text-align: center;
                        flex: 1;
                        background: #F7F7F7;
                        padding: 10px;
                        border-radius: 12px;
                      }
                      .qr-title {
                        font-size: 11px;
                        font-weight: bold;
                        color: #000000;
                        text-transform: uppercase;
                        margin-bottom: 8px;
                      }
                      img {
                        width: 130px;
                        height: 130px;
                        display: block;
                        margin: 0 auto;
                      }
                      .desc {
                        font-size: 9px;
                        color: #666666;
                        margin-top: 8px;
                        line-height: 1.3;
                      }
                      @media print {
                        body { background: #fff; padding: 0; }
                        .placard { border: 1px solid #ccc; box-shadow: none; }
                      }
                    </style>
                  </head>
                  <body>
                    <h1>RoomFlow Room Placards</h1>
                    <div class="grid">
                      ${rooms.map(room => `
                        <div class="placard">
                          <div class="header">Room ${room.number} (${room.type})</div>
                          <div class="qr-container">
                            <div class="qr-box">
                              <div class="qr-title">Guest Concierge</div>
                              <img src="${getQrImgUrl(`${baseAppUrl}/concierge?room=${room.number}`)}" />
                              <div class="desc">Scan to request amenities, log issues, and check real-time turnaround status.</div>
                            </div>
                            <div class="qr-box">
                              <div class="qr-title">Staff Check-In</div>
                              <img src="${getQrImgUrl(`${baseAppUrl}/staff/checkin?room=${room.number}`)}" />
                              <div class="desc">Scan to check in to shifts, assign room to yourself, and load cleaning checklist.</div>
                            </div>
                          </div>
                        </div>
                      `).join("")}
                    </div>
                    <script>
                      window.onload = function() {
                        setTimeout(function() {
                          window.print();
                        }, 1000);
                      }
                    </script>
                  </body>
                  </html>
                `;
                
                printWindow.document.open();
                printWindow.document.write(htmlContent);
                printWindow.document.close();
              }}
            >
              <Printer className="size-4" /> Print All Placards
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto pr-1 py-1">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {rooms.map(room => (
                <RoomQrCard key={room.id} roomNumber={room.number} roomType={room.type} />
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
