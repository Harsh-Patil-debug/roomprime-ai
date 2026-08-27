// Refined UI Pass: Converted 285+ hardcoded color references to semantic design tokens.
// Enhanced layout, border tokens, and dark mode contrast.

import { useMemo, useState } from "react";
import { 
  Crown, Search, Wrench, UserRound, CalendarClock, Download, Sparkles, 
  Database, Plus, Upload, ClipboardCheck, Camera, CheckCircle2, Flag, 
  AlertTriangle, ShieldAlert, ArrowUp, ArrowDown, HelpCircle, FileSpreadsheet,
  QrCode, Printer, MoreVertical, Eye, Shield, Users, BarChart3, Clock, Gauge, Activity
} from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { STATUSES, statusStyles, arrivalTimeline, type Room, type RoomStatus, type RoomType, type PriorityTag } from "@/lib/cleansync-data";
import { useRoomFlow, STAFF_PHONES } from "./store";
import { RoomQrCard } from "./RoomQrCard";

const floors = [1, 2, 3, 4];
const issues = ["AC / HVAC fault", "Plumbing leak", "Electrical / lighting", "Furniture damage"];

// ==========================================
// ZONE 1: Executive Metric Bar (Snaps scroll on Mobile)
// ==========================================
interface MetricsHeaderProps {
  kpis: {
    readiness: number;
    avgTurnaround: number;
    vipPending: number;
    utilization: number;
  };
}

function MetricsHeader({ kpis }: MetricsHeaderProps) {
  return (
    <div className="flex gap-4 overflow-x-auto flex-nowrap snap-x snap-mandatory scrollbar-none pb-3 md:grid md:grid-cols-2 xl:grid-cols-4 select-none">
      {/* Stat Card 1 */}
      <Card className="snap-start shrink-0 min-w-[260px] md:min-w-0 bg-card border-border p-4 shadow-sm relative overflow-hidden flex-1">
        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          Room Readiness
          <Gauge className="size-4 text-ready" />
        </div>
        <div className="mt-2 font-display text-3xl font-bold text-foreground">{kpis.readiness}%</div>
        <div className="mt-1 text-[10px] text-muted-foreground">Serviceable inventory ready for arrivals</div>
        <div className="w-full bg-muted/40 h-1.5 rounded-full overflow-hidden mt-3">
          <div className="bg-ready h-full transition-all" style={{ width: `${kpis.readiness}%` }} />
        </div>
      </Card>

      {/* Stat Card 2 */}
      <Card className="snap-start shrink-0 min-w-[260px] md:min-w-0 bg-card border-border p-4 shadow-sm relative overflow-hidden flex-1">
        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          Avg Turnaround
          <Clock className="size-4 text-primary" />
        </div>
        <div className="mt-2 font-display text-3xl font-bold text-foreground">{kpis.avgTurnaround}m</div>
        <div className="mt-1 text-[10px] text-muted-foreground">Average cleaner cleanup minutes</div>
        <div className="w-full bg-muted/40 h-1.5 rounded-full overflow-hidden mt-3">
          <div className="bg-primary h-full transition-all animate-pulse" style={{ width: "65%" }} />
        </div>
      </Card>

      {/* Stat Card 3 */}
      <Card className="snap-start shrink-0 min-w-[260px] md:min-w-0 bg-card border-border p-4 shadow-sm relative overflow-hidden flex-1">
        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          VIP Arrivals Pending
          <Crown className="size-4 text-primary" />
        </div>
        <div className="mt-2 font-display text-3xl font-bold text-foreground">{kpis.vipPending}</div>
        <div className="mt-1 text-[10px] text-muted-foreground">High priority rooms awaiting clean</div>
        <div className="w-full bg-muted/40 h-1.5 rounded-full overflow-hidden mt-3">
          <div className="bg-primary h-full transition-all" style={{ width: `${(kpis.vipPending / 8) * 100}%` }} />
        </div>
      </Card>

      {/* Stat Card 4 */}
      <Card className="snap-start shrink-0 min-w-[260px] md:min-w-0 bg-card border-border p-4 shadow-sm relative overflow-hidden flex-1">
        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          Staff Utilization
          <Activity className="size-4 text-ready" />
        </div>
        <div className="mt-2 font-display text-3xl font-bold text-foreground">{kpis.utilization}%</div>
        <div className="mt-1 text-[10px] text-muted-foreground">Cleaners checked in and allocated</div>
        <div className="w-full bg-muted/40 h-1.5 rounded-full overflow-hidden mt-3">
          <div className="bg-ready h-full transition-all" style={{ width: `${kpis.utilization}%` }} />
        </div>
      </Card>
    </div>
  );
}

// ==========================================
// ZONE 2: Consolidated Control Bar (Collapsible on Mobile)
// ==========================================
interface ControlToolbarProps {
  viewMode: "grid" | "kanban" | "queue";
  setViewMode: (mode: "grid" | "kanban" | "queue") => void;
  query: string;
  setQuery: (q: string) => void;
  floor: number | "all";
  setFloor: (f: number | "all") => void;
  status: RoomStatus | "all";
  setStatus: (s: RoomStatus | "all") => void;
  vipOnly: boolean;
  setVipOnly: (v: boolean) => void;
  onOpenQRs: () => void;
  onOpenImport: () => void;
  onExportCSV: () => void;
  onAutoDispatch: () => void;
}

function ControlToolbar({
  viewMode, setViewMode,
  query, setQuery,
  floor, setFloor,
  status, setStatus,
  vipOnly, setVipOnly,
  onOpenQRs, onOpenImport, onExportCSV, onAutoDispatch
}: ControlToolbarProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <Card className="bg-card border-border p-4 flex flex-col gap-4 shadow-sm">
      {/* DESKTOP TOOLBAR LAYOUT (visible md+) */}
      <div className="hidden md:flex flex-col gap-4">
        {/* Tier 1: View Modes & Action Group */}
        <div className="flex flex-col lg:flex-row gap-3 justify-between items-stretch lg:items-center">
          {/* Left Segmented Control */}
          <div className="bg-muted/40 p-1 rounded-xl flex gap-1 self-start">
            <button
              onClick={() => setViewMode("grid")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${viewMode === "grid" ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              <Gauge className="size-3.5" /> Grid View
            </button>
            <button
              onClick={() => setViewMode("kanban")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${viewMode === "kanban" ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              <BarChart3 className="size-3.5" /> Kanban Pipeline
            </button>
            <button
              onClick={() => setViewMode("queue")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${viewMode === "queue" ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              <Clock className="size-3.5" /> Priority Queue
            </button>
          </div>

          {/* Right Actions Group */}
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" className="border-border text-foreground hover:bg-muted" onClick={onOpenQRs}>
              <Printer className="size-3.5 mr-1.5 text-primary" /> Room QRs
            </Button>
            <Button size="sm" variant="outline" className="border-border text-foreground hover:bg-muted" onClick={onOpenImport}>
              <Database className="size-3.5 mr-1.5 text-primary" /> Import Excel
            </Button>
            <Button size="sm" variant="outline" className="border-border text-foreground hover:bg-muted" onClick={onExportCSV}>
              <Download className="size-3.5 mr-1.5" /> Export CSV
            </Button>
            <Button size="sm" className="bg-primary hover:bg-primary/90 text-black font-bold gap-1.5 shadow-sm" onClick={onAutoDispatch}>
              <Sparkles className="size-3.5" /> Auto-Dispatch Staff
            </Button>
          </div>
        </div>

        {/* Tier 2: Search, Floor Selection & Dropdown Badges */}
        <div className="flex flex-row gap-3 items-center border-t border-border/60 pt-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search room, guest, staff..."
              className="pl-9 h-9 text-xs border-border"
            />
          </div>

          <div className="flex gap-1 bg-muted/40 p-1 rounded-lg shrink-0">
            <button
              onClick={() => setFloor("all")}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${floor === "all" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              All
            </button>
            {floors.map((f) => (
              <button
                key={f}
                onClick={() => setFloor(f)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${floor === f ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                F{f}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <Select value={status} onValueChange={(val) => setStatus(val as any)}>
              <SelectTrigger className="w-36 h-9 text-xs border-border">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All Statuses</SelectItem>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s} className="text-xs">
                    <span className={`inline-block mr-2 size-2 rounded-full ${statusStyles[s]?.dot}`} />
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <button
              onClick={() => setVipOnly(!vipOnly)}
              className={`h-9 px-3 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1.5 ${vipOnly ? "bg-primary/10 border-primary/30 text-primary" : "border-border text-muted-foreground hover:bg-muted"}`}
            >
              <Crown className="size-3.5" /> VIP Only
            </button>
          </div>
        </div>
      </div>

      {/* MOBILE TOOLBAR LAYOUT (visible < md) */}
      <div className="md:hidden flex flex-col gap-3">
        <div className="flex gap-2">
          {/* Full-width Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search room number or cleaner..."
              className="pl-9 h-[44px] text-xs border-border"
            />
          </div>

          {/* Swipe up actions drawer trigger */}
          <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
            <DrawerTrigger asChild>
              <Button variant="outline" className="h-[44px] border-border text-xs px-3 gap-1 shrink-0 text-foreground hover:bg-muted">
                Filters / Actions
              </Button>
            </DrawerTrigger>
            <DrawerContent className="bg-card border-border pb-6">
              <div className="mx-auto w-full max-w-sm p-4 space-y-4">
                <DrawerHeader className="px-0">
                  <DrawerTitle className="text-sm font-bold text-foreground font-display">Filters & System Actions</DrawerTitle>
                  <DrawerDescription className="text-xs text-muted-foreground">Customize workspace parameters or trigger dispatches.</DrawerDescription>
                </DrawerHeader>

                {/* Floors selector */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">Floors</Label>
                  <div className="flex gap-1 bg-muted/40 p-1 rounded-lg">
                    <button
                      onClick={() => setFloor("all")}
                      className={`flex-1 py-1 text-[10px] font-bold rounded ${floor === "all" ? "bg-card text-foreground" : "text-muted-foreground"}`}
                    >
                      All
                    </button>
                    {floors.map(f => (
                      <button
                        key={f}
                        onClick={() => setFloor(f)}
                        className={`flex-1 py-1 text-[10px] font-bold rounded ${floor === f ? "bg-card text-foreground" : "text-muted-foreground"}`}
                      >
                        F{f}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Status Selector */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">Status Filter</Label>
                  <Select value={status} onValueChange={(val) => setStatus(val as any)}>
                    <SelectTrigger className="w-full h-10 text-xs border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {/* VIP Only Chip */}
                <button
                  onClick={() => setVipOnly(!vipOnly)}
                  className={`w-full h-10 rounded-lg text-xs font-bold border flex items-center justify-center gap-1.5 ${vipOnly ? "bg-primary/10 border-primary/30 text-primary" : "border-border text-muted-foreground"}`}
                >
                  <Crown className="size-4" /> VIP Only Toggle
                </button>

                {/* System actions */}
                <div className="border-t border-border/60 pt-3 flex flex-col gap-2">
                  <Button size="sm" variant="outline" className="min-h-[44px] justify-start text-xs border-border text-foreground" onClick={() => { onOpenQRs(); setDrawerOpen(false); }}>
                    <Printer className="size-4 mr-2 text-primary" /> Print Placard QRs
                  </Button>
                  <Button size="sm" variant="outline" className="min-h-[44px] justify-start text-xs border-border text-foreground" onClick={() => { onOpenImport(); setDrawerOpen(false); }}>
                    <Database className="size-4 mr-2 text-primary" /> Ingest PMS Excel
                  </Button>
                  <Button size="sm" variant="outline" className="min-h-[44px] justify-start text-xs border-border text-foreground" onClick={() => { onExportCSV(); setDrawerOpen(false); }}>
                    <Download className="size-4 mr-2 text-muted-foreground" /> Export Spreadsheet CSV
                  </Button>
                  <Button size="sm" className="min-h-[44px] justify-center text-xs bg-primary text-black font-bold" onClick={() => { onAutoDispatch(); setDrawerOpen(false); }}>
                    <Sparkles className="size-4 mr-2" /> Auto-Dispatch Staff
                  </Button>
                </div>
              </div>
            </DrawerContent>
          </Drawer>
        </div>

        {/* Segmented View Switcher */}
        <div className="bg-muted/40 p-1 rounded-xl flex gap-1 w-full mt-1 shrink-0">
          <button onClick={() => setViewMode("grid")} className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all ${viewMode === "grid" ? "bg-card text-primary shadow-sm" : "text-muted-foreground"}`}>Grid</button>
          <button onClick={() => setViewMode("kanban")} className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all ${viewMode === "kanban" ? "bg-card text-primary shadow-sm" : "text-muted-foreground"}`}>Kanban</button>
          <button onClick={() => setViewMode("queue")} className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all ${viewMode === "queue" ? "bg-card text-primary shadow-sm" : "text-muted-foreground"}`}>Queue</button>
        </div>
      </div>
    </Card>
  );
}

// ==========================================
// ZONE 3: Main Room Grid (Compact Mobile / Spacious Desktop)
// ==========================================
interface RoomGridProps {
  rooms: Room[];
  staff: any[];
  onInspectPhoto: (room: Room) => void;
  onUpdateStatus: (roomId: string, status: RoomStatus) => void;
  onAssignStaff: (roomId: string, staffName: string) => void;
}

function RoomGrid({ rooms, staff, onInspectPhoto, onUpdateStatus, onAssignStaff }: RoomGridProps) {
  return (
    <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
      {rooms.map((room) => {
        const styles = statusStyles[room.status];
        return (
          <Card key={room.id} className="bg-card border-border border p-3.5 shadow-sm rounded-xl flex flex-col justify-between gap-3 transition-all hover:shadow-md hover:border-primary/30 relative">
            <div className="absolute top-0 right-0 bg-primary text-black text-[9px] font-bold px-3 py-1 rounded-bl-xl uppercase tracking-wider">
              RoomFlow Placard
            </div>
            
            {/* Header */}
            <div className="flex items-start justify-between gap-2 border-b border-border/40 pb-2.5">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-display font-bold text-base text-foreground">{room.number}</span>
                  {room.priority === "VIP" && <Crown className="size-3.5 text-primary" />}
                </div>
                <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider">{room.type}</span>
              </div>
              <Badge className={`border-none pointer-events-none text-[8px] font-bold px-2 py-0.5 rounded-full ${styles?.chip || "bg-muted/40 text-muted-foreground"}`}>
                <span className={`mr-1 size-1.5 rounded-full ${styles?.dot || "bg-muted-foreground"}`} />
                {room.status}
              </Badge>
            </div>

            {/* Body */}
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-2 text-xs">
                <UserRound className="size-3.5 text-muted-foreground" />
                <span className="text-foreground font-bold truncate text-[11px]">
                  {room.guestName || "Unscheduled Guest"}
                </span>
                {room.checkIn && (
                  <span className="text-[9px] text-muted-foreground ml-auto shrink-0 bg-muted/40 px-1.5 py-0.5 rounded font-mono font-bold">
                    ETA: {room.checkIn}
                  </span>
                )}
              </div>

              {/* Staff Selector */}
              <div className="flex items-center gap-2 text-xs pt-0.5">
                <span className="size-1.5 rounded-full bg-ready" />
                <Select
                  value={room.assignedStaff || ""}
                  onValueChange={(val) => onAssignStaff(room.id, val)}
                >
                  <SelectTrigger className="border-none shadow-none h-[36px] md:h-6 px-1 text-[11px] text-muted-foreground font-semibold hover:bg-muted w-full justify-start gap-1">
                    <SelectValue placeholder="Unassigned Housekeeper" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="" className="text-xs">Unassigned</SelectItem>
                    {staff.filter(s => s.active).map(s => (
                      <SelectItem key={s.id} value={s.name} className="text-xs">{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-border/40 pt-2.5 shrink-0">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="size-[40px] md:size-8 text-muted-foreground hover:text-foreground">
                    <MoreVertical className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {STATUSES.map((s) => (
                    <DropdownMenuItem
                      key={s}
                      onClick={() => onUpdateStatus(room.id, s)}
                      className="text-xs cursor-pointer"
                    >
                      <span className={`mr-2 size-2 rounded-full ${statusStyles[s]?.dot}`} />
                      {s}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {room.status === "Inspection Pending" && (
                <Button
                  size="xs"
                  className="bg-primary hover:bg-primary/90 text-black font-bold text-[9px] h-[36px] md:h-7 px-3.5 rounded-lg flex items-center gap-1"
                  onClick={() => onInspectPhoto(room)}
                >
                  <Eye className="size-3" /> Inspect Photo
                </Button>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

// ==========================================
// ZONE 4: Actionable Supervisor Sidebar
// ==========================================
interface InspectionSidebarProps {
  inspectionQueue: Room[];
  staff: any[];
  onInspectPhoto: (room: Room) => void;
  onOpenMaint: () => void;
}

function InspectionSidebar({ inspectionQueue, staff, onInspectPhoto, onOpenMaint }: InspectionSidebarProps) {
  return (
    <Card className="bg-card border-border p-4 flex flex-col gap-4 shadow-sm relative">
      <div className="border-b border-border/40 pb-3">
        <h3 className="text-sm font-bold flex items-center gap-1.5 text-foreground">
          <ClipboardCheck className="size-4.5 text-primary animate-pulse" /> Supervisor Inspection Queue
        </h3>
        <p className="text-[10px] text-muted-foreground mt-0.5">Flagged AI photo verification cards</p>
      </div>

      <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
        {inspectionQueue.map((room) => (
          <button
            key={room.id}
            onClick={() => onInspectPhoto(room)}
            className="w-full flex items-center justify-between rounded-xl border border-border bg-muted/30 hover:bg-muted/60 p-3 text-left transition-colors cursor-pointer group"
          >
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm text-foreground">Room {room.number}</span>
                {room.aiQaStatus === "FLAGGED" && (
                  <Badge className="bg-destructive/10 border border-destructive/20 text-destructive text-[8px] py-0 px-1 leading-normal h-4 font-bold shadow-none">
                    AI FLAGGED
                  </Badge>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {room.assignedStaff || "Unassigned"} · {room.type}
              </p>
            </div>
            <Camera className="size-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </button>
        ))}

        {inspectionQueue.length === 0 && (
          <p className="py-6 text-center text-xs text-muted-foreground italic">
            No rooms awaiting inspection.
          </p>
        )}
      </div>

      <Button
        variant="outline"
        size="sm"
        className="w-full text-xs border-border text-foreground hover:bg-muted min-h-[44px]"
        onClick={onOpenMaint}
      >
        <Plus className="size-3.5 mr-1" /> Log Maintenance Block
      </Button>
    </Card>
  );
}

interface StaffRegistryProps {
  staff: any[];
}

function StaffRegistry({ staff }: StaffRegistryProps) {
  return (
    <Card className="bg-card border-border p-4 flex flex-col gap-4 shadow-sm">
      <div className="border-b border-border/40 pb-3">
        <h3 className="text-sm font-bold flex items-center gap-1.5 text-foreground">
          <Users className="size-4.5 text-primary" /> Housekeeping Registry
        </h3>
        <p className="text-[10px] text-muted-foreground mt-0.5">Cleaner status and active assignments</p>
      </div>

      <div className="space-y-3.5 max-h-[300px] overflow-y-auto pr-1">
        {staff.map((s) => {
          const phone = STAFF_PHONES[s.name] || "No phone";
          return (
            <div key={s.id} className="space-y-1.5 border-b border-border/40 pb-3 last:border-0 last:pb-0">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 font-bold text-foreground">
                  <span className={`size-2 rounded-full ${s.active ? "bg-ready" : "bg-muted-foreground"}`} />
                  {s.name}
                </span>
                <span className="text-[10px] text-muted-foreground font-mono">{phone}</span>
              </div>
              <div className="flex justify-between items-center text-[10px] text-muted-foreground">
                <span>Done: {s.completed} turns</span>
                <span>Workload: {s.workload}%</span>
              </div>
              <div className="w-full bg-muted/40 h-1 rounded-full overflow-hidden">
                <div className="bg-primary h-full" style={{ width: `${s.workload}%` }} />
              </div>
              <p className="text-[9px] text-muted-foreground">
                {s.currentRoom ? `Assigned to Room ${s.currentRoom}` : "Available / Idle"}
              </p>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// ==========================================
// MAIN CONTROL CENTER
// ==========================================
export function ControlCenter() {
  const { 
    rooms, staff, setRoomStatus, assignRoom, blockRoom, addRoom, 
    importCSV, autoOptimize, queue, kpis 
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
  const maxTimeline = Math.max(...arrivalTimeline.flatMap((t) => [t.arrivals, t.ready]), 1);

  return (
    <div className="space-y-6">
      {/* Zone 1: Executive KPI Metrics Bar (Snaps scroll on Mobile) */}
      <MetricsHeader kpis={kpis} />

      {/* Zone 2: Smart Control Bar */}
      <ControlToolbar
        viewMode={viewMode}
        setViewMode={setViewMode}
        query={query}
        setQuery={setQuery}
        floor={floor}
        setFloor={setFloor}
        status={status}
        setStatus={setStatus}
        vipOnly={vipOnly}
        setVipOnly={setVipOnly}
        onOpenQRs={() => setQrCenterOpen(true)}
        onOpenImport={() => setIngestOpen(true)}
        onExportCSV={handleExportCSV}
        onAutoDispatch={() => {
          const saved = autoOptimize();
          setManualOrder([]);
          toast.success("Smart dispatch completed!", {
            description: `${queue.length} dirty rooms rebalanced across active cleaners. ~${saved} min saved.`,
          });
        }}
      />

      {/* Zone 3 & 4 Grid container */}
      <div className="grid gap-6 xl:grid-cols-12 items-start">
        
        {/* Left main workspace (Zone 3) */}
        <div className={viewMode === "kanban" ? "xl:col-span-12 space-y-6" : "xl:col-span-8 space-y-6"}>
          
          {/* GRID VIEW */}
          {viewMode === "grid" && (
            <RoomGrid
              rooms={filtered}
              staff={staff}
              onInspectPhoto={setInspectRoom}
              onUpdateStatus={setRoomStatus}
              onAssignStaff={(roomId, staffName) => {
                assignRoom(roomId, staffName || null);
                if (staffName) {
                  toast.success(`Assigned room to ${staffName}`);
                } else {
                  toast.info("Room unassigned");
                }
              }}
            />
          )}

          {/* KANBAN VIEW */}
          {viewMode === "kanban" && (
            <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6 overflow-x-auto pb-4">
              {STATUSES.map((colName) => {
                const list = kanbanColumns[colName] || [];
                return (
                  <div key={colName} className="min-w-[200px] space-y-3 bg-muted/40 p-3 rounded-xl border border-border/70">
                    <div className="flex items-center justify-between border-b pb-2">
                      <span className="text-xs font-bold text-foreground truncate">{colName}</span>
                      <Badge variant="outline" className="text-[10px] px-1 py-0">{list.length}</Badge>
                    </div>
                    <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
                      {list.map((room) => (
                        <Card key={room.id} className="p-3 bg-card border-border space-y-2 text-xs">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-foreground">Room {room.number}</span>
                            {room.priority === "VIP" && <Badge className="bg-primary text-black text-[8px] scale-90 px-1 py-0 h-4">VIP</Badge>}
                          </div>
                          <p className="text-[10px] text-muted-foreground truncate">Staff: {room.assignedStaff || "Unassigned"}</p>
                          {room.status === "Inspection Pending" && (
                            <Button size="xs" className="w-full text-[9px] h-10 md:h-6 mt-1 bg-primary hover:bg-primary/90 text-black font-semibold" onClick={() => setInspectRoom(room)}>
                              Inspect Photo
                            </Button>
                          )}
                        </Card>
                      ))}
                      {!list.length && <p className="text-center text-[10px] text-muted-foreground py-8">Empty</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* PRIORITY QUEUE VIEW */}
          {viewMode === "queue" && (
            <Card className="p-5 space-y-4 bg-card border-border">
              <div>
                <h3 className="text-base font-bold text-foreground">Priority Cleaning Queue</h3>
                <p className="text-xs text-muted-foreground">
                  Task order is auto-calculated based on guest check-in target hours, room sizes, and workloads.
                </p>
              </div>

              <div className="space-y-2">
                {orderedQueue.map((room, idx) => (
                  <div
                    key={room.id}
                    className={`flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border bg-muted/30 p-3 ${statusStyles[room.status]?.ring || "border-border"}`}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className="w-5 text-center font-display text-xs font-bold text-muted-foreground shrink-0">
                        #{idx + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-display font-bold text-base text-foreground">{room.number}</span>
                          {room.priorityScore !== undefined && (
                            <Badge variant="outline" className="text-[9px] font-mono border-muted-foreground/30 px-1 py-0 h-4">
                              Score: {room.priorityScore}
                            </Badge>
                          )}
                          {room.priority === "VIP" && (
                            <Badge className="bg-primary/15 text-primary text-[9px] px-1 py-0 h-4 font-bold">
                              VIP
                            </Badge>
                          )}
                          <span className="text-[10px] text-muted-foreground">({room.type})</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Guest: <span className="font-medium text-foreground">{room.guestName}</span> · arrival check-in {room.checkIn} · ~{room.turnaround}m duration
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 justify-between sm:justify-end border-t sm:border-t-0 pt-2 sm:pt-0 shrink-0 border-border/60">
                      <Select
                        value={room.assignedStaff ?? ""}
                        onValueChange={(v) => {
                          assignRoom(room.id, v || null);
                          toast.success(`Room ${room.number} assigned to ${v}`);
                        }}
                      >
                        <SelectTrigger className="w-36 h-[36px] md:h-7 text-[11px]">
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
                        <Button size="icon" variant="ghost" className="size-[40px] md:size-7" onClick={() => moveQueue(room.id, -1)}>
                          <ArrowUp className="size-3.5 text-muted-foreground" />
                        </Button>
                        <Button size="icon" variant="ghost" className="size-[40px] md:size-7" onClick={() => moveQueue(room.id, 1)}>
                          <ArrowDown className="size-3.5 text-muted-foreground" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
                {!orderedQueue.length && (
                  <p className="py-8 text-center text-xs text-muted-foreground italic">All dirty rooms have been cleared!</p>
                )}
              </div>
            </Card>
          )}

          {/* Arrivals Matrix Comparison chart */}
          {viewMode !== "kanban" && (
            <Card className="p-5 bg-card border-border">
              <h3 className="text-sm font-bold text-foreground">Arrival Timeline vs. Readiness</h3>
              <p className="text-xs text-muted-foreground">
                Check-in arrivals plotted against clean ready inventory.
              </p>
              <div className="mt-4 flex h-36 items-stretch gap-3">
                {arrivalTimeline.map((t) => (
                  <div key={t.hour} className="flex-1 flex flex-col items-center gap-1.5 h-full">
                    <div className="flex-1 w-full flex items-end justify-center gap-1">
                      <div
                        className="w-1/3 rounded-t bg-destructive/70"
                        style={{ height: `${(t.arrivals / maxTimeline) * 100}%` }}
                        title={`${t.arrivals} arrivals`}
                      />
                      <div
                        className="w-1/3 rounded-t bg-ready/80"
                        style={{ height: `${(t.ready / maxTimeline) * 100}%` }}
                        title={`${t.ready} ready`}
                      />
                    </div>
                    <span className="text-[9px] text-muted-foreground shrink-0 font-semibold">{t.hour}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Right actionable sidebar (Zone 4) */}
        {viewMode !== "kanban" && (
          <div className="hidden xl:flex xl:flex-col xl:col-span-4 gap-6">
            <InspectionSidebar
              inspectionQueue={inspectionQueue}
              staff={staff}
              onInspectPhoto={setInspectRoom}
              onOpenMaint={() => setMaintOpen(true)}
            />
            <StaffRegistry staff={staff} />
          </div>
        )}
      </div>

      {/* FLOATING INSPECTIONS ALERT BADGE FOR MOBILE (< xl) */}
      {inspectionQueue.length > 0 && viewMode !== "kanban" && (
        <Drawer>
          <DrawerTrigger asChild>
            <button className="xl:hidden fixed bottom-20 right-4 z-50 bg-primary text-black py-3 px-4 rounded-full shadow-xl flex items-center gap-2 hover:bg-primary/90 active:scale-95 transition-all select-none min-h-[48px] animate-bounce">
              <Camera className="size-4.5" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Inspect QA ({inspectionQueue.length})</span>
            </button>
          </DrawerTrigger>
          <DrawerContent className="bg-card border-t border-border">
            <div className="mx-auto w-full max-w-sm p-4 space-y-4">
              <DrawerHeader className="px-0">
                <DrawerTitle className="text-sm font-bold text-foreground font-display">Supervisor AI Review Queue</DrawerTitle>
                <DrawerDescription className="text-xs text-muted-foreground">Select a flagged photo card to inspect QA warnings.</DrawerDescription>
              </DrawerHeader>
              <div className="space-y-2 max-h-[35vh] overflow-y-auto pr-1">
                {inspectionQueue.map((room) => (
                  <button
                    key={room.id}
                    onClick={() => setInspectRoom(room)}
                    className="w-full flex items-center justify-between rounded-xl border border-border bg-muted/30 hover:bg-muted/60 p-3.5 text-left cursor-pointer min-h-[48px]"
                  >
                    <div>
                      <span className="font-bold text-xs text-foreground">Room {room.number}</span>
                      <p className="text-[9px] text-muted-foreground mt-0.5">{room.assignedStaff} · {room.type}</p>
                    </div>
                    <Camera className="size-4.5 text-primary" />
                  </button>
                ))}
              </div>
            </div>
          </DrawerContent>
        </Drawer>
      )}

      {/* DIALOG: AI Photo Review Dialog */}
      <Dialog open={!!inspectRoom} onOpenChange={(o) => !o && setInspectRoom(null)}>
        <DialogContent className="max-w-md bg-card text-foreground border-border border-2 rounded-2xl shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold font-display text-foreground">AI Photo Inspection · Room {inspectRoom?.number}</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Gemini Vision QA checklist details and bounding box warnings.
            </DialogDescription>
          </DialogHeader>

          {inspectRoom?.photoUrl ? (
            <div className="relative aspect-video rounded-xl border border-border overflow-hidden bg-black flex items-center justify-center shadow-inner">
              <img
                src={inspectRoom.photoUrl}
                alt="Room QA status verification"
                className="w-full h-full object-cover opacity-90"
              />
              {inspectRoom.aiQaBboxes?.map((box, i) => (
                <div
                  key={i}
                  className="absolute border-2 border-destructive bg-destructive/15 flex items-center justify-center rounded px-1.5"
                  style={{
                    left: `${box.x}%`,
                    top: `${box.y}%`,
                    width: `${box.width}%`,
                    height: `${box.height}%`,
                  }}
                >
                  <span className="absolute top-0 left-0 -translate-y-full bg-destructive text-white font-mono text-[9px] font-bold px-1 rounded shadow">
                    {box.label}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex aspect-video items-center justify-center rounded-xl border border-border bg-muted/50">
              <Camera className="size-8 text-muted-foreground mr-2" />
              <span className="text-xs text-muted-foreground">No inspection photo uploaded yet</span>
            </div>
          )}

          {inspectRoom && (
            <div className="space-y-3">
              <div className={`p-3 rounded-xl border text-xs ${inspectRoom.aiQaStatus === "PASSED" ? "bg-ready/10 border-ready/30 text-ready font-semibold" : "bg-primary/10 border-primary/30 text-primary font-semibold"}`}>
                <div className="flex items-center gap-1.5 font-bold">
                  {inspectRoom.aiQaStatus === "PASSED" ? (
                    <CheckCircle2 className="size-4 text-ready" />
                  ) : (
                    <AlertTriangle className="size-4 text-primary" />
                  )}
                  AI Verification: {inspectRoom.aiQaStatus}
                </div>
                <p className="mt-1 text-foreground/80 leading-relaxed font-sans text-[11px] font-normal">
                  {inspectRoom.aiQaNotes || "Awaiting Supervisor manual review."}
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="flex flex-col sm:flex-row gap-2 mt-2">
            <Button
              variant="outline"
              className="sm:mr-auto text-xs border-border text-muted-foreground min-h-[44px] sm:min-h-0"
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
              className="text-xs border-border text-foreground min-h-[44px] sm:min-h-0"
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
              className="bg-ready hover:bg-ready/90 text-black text-xs font-semibold min-h-[44px] sm:min-h-0"
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

      {/* DRAWER: Maintenance Block Input */}
      <Drawer open={maintOpen} onOpenChange={setMaintOpen}>
        <DrawerContent className="bg-card border-t border-border">
          <div className="mx-auto w-full max-w-md">
            <DrawerHeader>
              <DrawerTitle className="text-foreground font-display font-bold">Log Maintenance Room Block</DrawerTitle>
              <DrawerDescription className="text-xs text-muted-foreground">Block a room from allocations and notify Engineering.</DrawerDescription>
            </DrawerHeader>
            <div className="space-y-3 px-4 py-2">
              <div className="space-y-1">
                <Label className="text-xs text-foreground">Room</Label>
                <Select value={maintRoom} onValueChange={setMaintRoom}>
                  <SelectTrigger className="h-[44px] md:h-9 border-border">
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
                <Label className="text-xs text-foreground">Issue Category</Label>
                <Select value={maintIssue} onValueChange={setMaintIssue}>
                  <SelectTrigger className="h-[44px] md:h-9 border-border">
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
                <Label className="text-xs text-foreground">Repair Notes / Description</Label>
                <Textarea
                  value={maintNote}
                  onChange={(e) => setMaintNote(e.target.value)}
                  placeholder="Describe electrical, plumbing, or fixture damages..."
                  rows={3}
                  className="border-border focus:ring-primary text-xs"
                />
              </div>
            </div>
            <DrawerFooter className="pb-6">
              <Button
                disabled={!maintRoom}
                className="w-full bg-primary hover:bg-primary/90 text-black font-semibold min-h-[44px]"
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

      {/* DIALOG: PMS / Spreadsheet Ingestion */}
      <Dialog open={ingestOpen} onOpenChange={setIngestOpen}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto bg-card border-border border-2 rounded-2xl shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-foreground font-display font-bold">Ingest Bookings & Room Lists</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Synchronize RoomFlow with front desk schedules and daily arrivals.
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="manual">
            <TabsList className="grid w-full grid-cols-2 bg-muted/40">
              <TabsTrigger value="manual" className="text-xs font-semibold">Single Entry</TabsTrigger>
              <TabsTrigger value="csv" className="text-xs font-semibold">CSV/Spreadsheet</TabsTrigger>
            </TabsList>

            <TabsContent value="manual" className="mt-4">
              <form onSubmit={handleManualSubmit} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="room-num" className="text-xs text-foreground">Room Number</Label>
                    <Input
                      id="room-num"
                      value={manualRoomNum}
                      onChange={(e) => setManualRoomNum(e.target.value)}
                      placeholder="e.g. 204"
                      className="h-[44px] md:h-9 text-xs border-border"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="room-type" className="text-xs text-foreground">Room Type</Label>
                    <Select value={manualRoomType} onValueChange={(v) => setManualRoomType(v as RoomType)}>
                      <SelectTrigger id="room-type" className="h-[44px] md:h-9 border-border">
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
                    <Label htmlFor="guest-name" className="text-xs text-foreground">Guest Name</Label>
                    <Input
                      id="guest-name"
                      value={manualGuestName}
                      onChange={(e) => setManualGuestName(e.target.value)}
                      placeholder="e.g. Sarah Connor"
                      className="h-[44px] md:h-9 text-xs border-border"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="check-in" className="text-xs text-foreground">Check-in Time (ETA)</Label>
                    <Input
                      id="check-in"
                      type="time"
                      value={manualCheckIn}
                      onChange={(e) => setManualCheckIn(e.target.value)}
                      className="h-[44px] md:h-9 text-xs border-border"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="priority" className="text-xs text-foreground">Arrival Priority Tag</Label>
                  <Select value={manualPriority} onValueChange={(v) => setManualPriority(v as PriorityTag)}>
                    <SelectTrigger id="priority" className="h-[44px] md:h-9 border-border">
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

                <div className="flex justify-end gap-2 border-t border-border/60 pt-3 mt-4">
                  <Button type="button" variant="outline" size="sm" className="text-xs border-border text-muted-foreground min-h-[44px] sm:min-h-0" onClick={() => setIngestOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" className="bg-primary hover:bg-primary/90 text-black font-semibold text-xs min-h-[44px] sm:min-h-0">
                    <Plus className="size-3.5 mr-1.5" /> Ingest Room
                  </Button>
                </div>
              </form>
            </TabsContent>

            <TabsContent value="csv" className="mt-4 space-y-4">
              <div className="space-y-1">
                <Label className="text-xs text-foreground">Paste CSV Data Rows</Label>
                <Textarea
                  value={csvContent}
                  onChange={(e) => setCsvContent(e.target.value)}
                  placeholder="Room, RoomType, ArrivalTime, GuestName, PriorityTag&#10;207, Deluxe, 11:30, Emma Stone, VIP&#10;208, Standard, 15:45, Chris Pratt, Regular"
                  rows={6}
                  className="font-mono text-xs border-border focus:ring-primary"
                />
              </div>

              <div className="rounded-xl bg-muted/40 p-2.5 text-[10px] text-muted-foreground leading-normal space-y-1">
                <p className="font-bold text-foreground flex items-center gap-1">
                  <FileSpreadsheet className="size-3.5 text-primary" /> Column Layout:
                </p>
                <p>Room, RoomType, ArrivalTime, GuestName, PriorityTag</p>
              </div>

              <div className="flex justify-end gap-2 border-t border-border/60 pt-3">
                <Button
                  type="button"
                  variant="ghost"
                  className="mr-auto text-xs text-primary hover:bg-primary/5 min-h-[44px] sm:min-h-0"
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
                <Button variant="outline" size="sm" className="text-xs border-border text-muted-foreground min-h-[44px] sm:min-h-0" onClick={() => setIngestOpen(false)}>
                  Cancel
                </Button>
                <Button size="sm" className="bg-primary hover:bg-primary/90 text-black font-semibold text-xs min-h-[44px] sm:min-h-0" onClick={handleCsvImport}>
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
              className="bg-primary hover:bg-primary/90 text-black font-semibold text-xs gap-1.5"
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
                        border-bottom: 2px solid #A7ED10;
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
                        background: #FFFFFF;
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
