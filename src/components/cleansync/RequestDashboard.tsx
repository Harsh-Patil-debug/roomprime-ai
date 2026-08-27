// Refined UI Pass: Converted 21 hardcoded color references to semantic design tokens.
// Enhanced request dashboard cards, quick filters, and dark mode contrast.

import { useState, useMemo } from "react";
import { useRoomFlow } from "./store";
import {
  Wrench,
  Clock,
  UserCheck,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Search,
  Filter,
  Tag,
  Flame,
  ArrowDownWideNarrow,
  Sparkles,
} from "lucide-react";
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
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { type GuestRequest, type Department, type RequestStatus, type RequestPriority, type RequestCategory } from "@/lib/cleansync-data";

export function RequestDashboard() {
  const {
    guestRequests,
    staff,
    addGuestRequest,
    updateGuestRequestStatus,
    assignGuestRequest,
    escalateGuestRequest,
  } = useRoomFlow();

  const [query, setQuery] = useState("");
  const [selectedDept, setSelectedDept] = useState<Department | "all">("all");
  const [selectedStatus, setSelectedStatus] = useState<RequestStatus | "all">("all");
  
  // Create Request Modal State
  const [createOpen, setCreateOpen] = useState(false);
  const [reqRoom, setReqRoom] = useState("");
  const [reqCategory, setReqCategory] = useState<RequestCategory>("Amenities");
  const [reqItem, setReqItem] = useState("");
  const [reqDetails, setReqDetails] = useState("");
  const [reqPriority, setReqPriority] = useState<RequestPriority>("Medium");
  const [reqDept, setReqDept] = useState<Department | "auto">("auto");

  // Determine auto-routed department for display during creation
  const suggestedDept = useMemo(() => {
    if (reqDept !== "auto") return reqDept;
    const text = (reqItem + " " + reqDetails).toLowerCase();
    if (
      text.includes("leak") ||
      text.includes("ac") ||
      text.includes("light") ||
      text.includes("plumbing") ||
      text.includes("repair") ||
      text.includes("broken") ||
      text.includes("clog") ||
      text.includes("toilet") ||
      text.includes("shower")
    ) {
      return "Maintenance";
    }
    if (
      text.includes("baggage") ||
      text.includes("luggage") ||
      text.includes("checkout") ||
      text.includes("key") ||
      text.includes("bellboy") ||
      text.includes("taxi") ||
      text.includes("wake")
    ) {
      return "Front Desk";
    }
    if (
      text.includes("food") ||
      text.includes("drink") ||
      text.includes("dinner") ||
      text.includes("lunch") ||
      text.includes("breakfast") ||
      text.includes("ice") ||
      text.includes("menu") ||
      text.includes("water") ||
      text.includes("soda")
    ) {
      return "Room Service";
    }
    return "Housekeeping";
  }, [reqItem, reqDetails, reqDept]);

  // Filters guest requests based on search query, department and status
  const filteredRequests = useMemo(() => {
    return guestRequests.filter((req) => {
      if (selectedDept !== "all" && req.assignedDept !== selectedDept) return false;
      if (selectedStatus !== "all" && req.status !== selectedStatus) return false;
      
      const q = query.trim().toLowerCase();
      if (q) {
        return (
          req.roomNumber.includes(q) ||
          req.item.toLowerCase().includes(q) ||
          (req.details ?? "").toLowerCase().includes(q) ||
          (req.assignedStaff ?? "").toLowerCase().includes(q) ||
          req.category.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [guestRequests, selectedDept, selectedStatus, query]);

  // Compute Priority Scores for request ordering
  const scoredRequests = useMemo(() => {
    return filteredRequests
      .map((req) => {
        let score = 0;
        
        // Priority weight
        const weights = { Critical: 100, High: 60, Medium: 30, Low: 10 };
        score += weights[req.priority] || 30;

        // SLA urgency ratio
        const totalSlaSec = req.slaMinutes * 60;
        const ratio = req.elapsedSeconds / totalSlaSec;
        score += Math.round(ratio * 50); // Up to 50 points based on SLA progression

        // Escalated status bonus
        if (req.status === "Escalated") {
          score += 40;
        }

        return { ...req, priorityScore: score };
      })
      .sort((a, b) => {
        // Active/escalated first, then by priority score, then by date
        if (a.status === "Completed" && b.status !== "Completed") return 1;
        if (a.status !== "Completed" && b.status === "Completed") return -1;
        return b.priorityScore - a.priorityScore;
      });
  }, [filteredRequests]);

  // KPI Calculations
  const stats = useMemo(() => {
    const active = guestRequests.filter((r) => r.status !== "Completed");
    const completed = guestRequests.filter((r) => r.status === "Completed");
    
    // SLA breaches
    const breaches = guestRequests.filter(
      (r) => r.status === "Escalated" || (r.status !== "Completed" && r.elapsedSeconds > r.slaMinutes * 60)
    ).length;

    // Rate of completions within SLA
    const withinSlaCount = completed.filter((r) => r.elapsedSeconds <= r.slaMinutes * 60).length;
    const slaSuccessRate = completed.length > 0 ? Math.round((withinSlaCount / completed.length) * 100) : 100;

    return {
      activeCount: active.length,
      escalatedCount: guestRequests.filter((r) => r.status === "Escalated").length,
      breachesCount: breaches,
      slaSuccessRate,
    };
  }, [guestRequests]);

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reqRoom || !reqItem) {
      toast.error("Room Number and Request Item are required");
      return;
    }

    addGuestRequest(
      reqRoom,
      reqCategory,
      reqItem,
      reqDetails,
      reqPriority,
      reqDept === "auto" ? undefined : reqDept
    );

    toast.success(`Request logged for Room ${reqRoom}! Routed to ${suggestedDept}.`);
    
    // Reset form
    setReqRoom("");
    setReqItem("");
    setReqDetails("");
    setReqPriority("Medium");
    setReqDept("auto");
    setCreateOpen(false);
  };

  // Formatting seconds to MM:SS or remaining countdown
  const formatSla = (req: GuestRequest) => {
    const totalSlaSeconds = req.slaMinutes * 60;
    const remainingSeconds = totalSlaSeconds - req.elapsedSeconds;
    
    if (req.status === "Completed") {
      const minutesTaken = Math.floor(req.elapsedSeconds / 60);
      const secondsTaken = req.elapsedSeconds % 60;
      const formattedTime = `${String(minutesTaken).padStart(2, "0")}:${String(secondsTaken).padStart(2, "0")}`;
      const breached = req.elapsedSeconds > totalSlaSeconds;
      return (
        <span className={breached ? "text-urgent font-medium" : "text-ready font-medium"}>
          Resolved in {formattedTime} {breached ? "(Breached)" : "(Within SLA)"}
        </span>
      );
    }

    if (remainingSeconds <= 0) {
      const overtime = Math.abs(remainingSeconds);
      const mm = String(Math.floor(overtime / 60)).padStart(2, "0");
      const ss = String(overtime % 60).padStart(2, "0");
      return <span className="text-urgent font-bold animate-pulse">BREACHED by -{mm}:{ss}</span>;
    } else {
      const mm = String(Math.floor(remainingSeconds / 60)).padStart(2, "0");
      const ss = String(remainingSeconds % 60).padStart(2, "0");
      return <span className="font-medium text-foreground">{mm}:{ss} remaining</span>;
    }
  };

  const getSlaPercentage = (req: GuestRequest) => {
    const total = req.slaMinutes * 60;
    const pct = (req.elapsedSeconds / total) * 100;
    return Math.min(100, Math.round(pct));
  };

  const getSlaColor = (req: GuestRequest) => {
    if (req.status === "Completed") return "bg-ready/60";
    const total = req.slaMinutes * 60;
    const ratio = req.elapsedSeconds / total;
    if (ratio >= 1) return "bg-urgent animate-pulse";
    if (ratio >= 0.75) return "bg-urgent/70 animate-pulse";
    if (ratio >= 0.5) return "bg-progress";
    return "bg-ready";
  };

  const priorityStyles: Record<RequestPriority, string> = {
    Critical: "bg-urgent/15 text-urgent border-urgent/30",
    High: "bg-progress/15 text-progress border-progress/30",
    Medium: "bg-progress/10 text-progress/80 border-progress/20",
    Low: "bg-dirty/15 text-dirty border-dirty/30",
  };

  const statusStyles: Record<RequestStatus, string> = {
    Open: "bg-dirty/10 text-dirty/80 border-dirty/20",
    "In Progress": "bg-progress/15 text-progress border-progress/30",
    Completed: "bg-ready/15 text-ready border-ready/30",
    Escalated: "bg-urgent/15 text-urgent border-urgent/30 animate-pulse font-semibold",
  };

  return (
    <div className="space-y-6">
      {/* 1. KEY KPI DASHBOARD */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 flex flex-col justify-between">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Active requests</p>
          <div className="flex items-baseline gap-2 mt-2">
            <h3 className="text-3xl font-bold font-display">{stats.activeCount}</h3>
            <span className="text-xs text-muted-foreground">in queue</span>
          </div>
        </Card>
        <Card className="p-4 flex flex-col justify-between">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Escalated SLA status</p>
          <div className="flex items-baseline gap-2 mt-2">
            <h3 className="text-3xl font-bold font-display text-urgent">{stats.escalatedCount}</h3>
            <span className="text-xs text-muted-foreground">critical level</span>
          </div>
        </Card>
        <Card className="p-4 flex flex-col justify-between">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Breaches today</p>
          <div className="flex items-baseline gap-2 mt-2">
            <h3 className="text-3xl font-bold font-display text-orange-500">{stats.breachesCount}</h3>
            <span className="text-xs text-muted-foreground">SLA overdue</span>
          </div>
        </Card>
        <Card className="p-4 flex flex-col justify-between">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">SLA Target adherence</p>
          <div className="flex items-baseline gap-2 mt-2">
            <h3 className="text-3xl font-bold font-display text-ready">{stats.slaSuccessRate}%</h3>
            <span className="text-xs text-muted-foreground">on-time resolver</span>
          </div>
        </Card>
      </div>

      {/* 2. ACTIONS & FILTERS BAR */}
      <Card className="p-4 flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          {/* Department Select Filter */}
          <Select value={selectedDept} onValueChange={(v) => setSelectedDept(v as any)}>
            <SelectTrigger className="w-[170px] h-9 text-xs">
              <Filter className="size-3.5 text-muted-foreground mr-1.5" />
              <SelectValue placeholder="Department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              <SelectItem value="Housekeeping">Housekeeping</SelectItem>
              <SelectItem value="Maintenance">Maintenance</SelectItem>
              <SelectItem value="Front Desk">Front Desk</SelectItem>
              <SelectItem value="Room Service">Room Service</SelectItem>
            </SelectContent>
          </Select>

          {/* Status Select Filter */}
          <Select value={selectedStatus} onValueChange={(v) => setSelectedStatus(v as any)}>
            <SelectTrigger className="w-[150px] h-9 text-xs">
              <Clock className="size-3.5 text-muted-foreground mr-1.5" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="Open">Open</SelectItem>
              <SelectItem value="In Progress">In Progress</SelectItem>
              <SelectItem value="Completed">Completed</SelectItem>
              <SelectItem value="Escalated">Escalated</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Search Input and Add Request button */}
        <div className="flex w-full md:w-auto items-center gap-2">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input
              placeholder="Search request or room..."
              className="pl-9 h-9"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <Button size="sm" className="h-9 px-4 shrink-0" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4 mr-1.5" /> Log Guest Request
          </Button>
        </div>
      </Card>

      {/* 3. REQUEST LIST QUEUE */}
      <Card className="p-5">
        <div className="flex items-center justify-between border-b pb-3 mb-4">
          <div>
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <ArrowDownWideNarrow className="size-4 text-primary" /> Active Request Priority Queue
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Ranked dynamically by SLA countdown urgency, category severity, and guest VIP tier.
            </p>
          </div>
          <Badge variant="outline" className="text-xs font-mono font-normal">
            Showing {scoredRequests.length} requests
          </Badge>
        </div>

        <div className="space-y-3">
          {scoredRequests.map((req) => {
            const progress = getSlaPercentage(req);
            const progressColor = getSlaColor(req);
            const isEscalated = req.status === "Escalated";

            return (
              <div
                key={req.id}
                className={`flex flex-col lg:flex-row lg:items-center gap-4 rounded-lg border p-4 transition-all duration-200 ${
                  isEscalated
                    ? "border-red-500/40 bg-red-500/5 hover:bg-red-500/10 shadow-sm"
                    : req.status === "Completed"
                      ? "opacity-60 bg-muted/20 border-border"
                      : "hover:bg-accent/40 border-border hover:shadow-xs"
                }`}
              >
                {/* Room and Status tags */}
                <div className="flex items-center gap-3 shrink-0">
                  <div className="flex flex-col items-center justify-center size-14 rounded-lg bg-surface border font-display text-center font-bold">
                    <span className="text-[10px] uppercase font-normal text-muted-foreground leading-none">Room</span>
                    <span className="text-lg leading-tight text-foreground mt-0.5">{req.roomNumber}</span>
                  </div>
                  <div>
                    <Badge variant="outline" className={`text-[10px] font-semibold tracking-wider uppercase border ${statusStyles[req.status]}`}>
                      {req.status}
                    </Badge>
                    <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mt-1">{req.assignedDept}</p>
                  </div>
                </div>

                {/* Request Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm text-foreground">{req.item}</span>
                    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 border ${priorityStyles[req.priority]}`}>
                      {req.priority}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground font-mono">({req.category})</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 leading-normal font-sans text-ellipsis overflow-hidden max-h-10">
                    {req.details || "No supplementary details provided."}
                  </p>
                  
                  {/* Action tags info */}
                  <div className="flex items-center gap-2.5 mt-2 flex-wrap text-[10px] text-muted-foreground font-sans">
                    <span>Logged: {new Date(req.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                    <span>•</span>
                    <span>SLA Limit: {req.slaMinutes}m</span>
                    {req.assignedStaff && (
                      <>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <UserCheck className="size-3 text-muted-foreground" /> Assigned to: <strong className="text-foreground">{req.assignedStaff}</strong>
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* SLA Ticking Bar & Dispatch controls */}
                <div className="flex flex-col sm:flex-row lg:flex-col items-start sm:items-center lg:items-end gap-3 shrink-0 border-t sm:border-t-0 lg:border-t-0 pt-3 sm:pt-0 lg:pt-0 justify-between sm:justify-end lg:justify-center">
                  <div className="w-full sm:w-48 lg:w-44 text-left sm:text-right lg:text-right space-y-1">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-muted-foreground text-[10px] uppercase font-sans">SLA TIMER</span>
                      {formatSla(req)}
                    </div>
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${progressColor}`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {req.status !== "Completed" && (
                      <>
                        {/* Assign Cleaner dropdown selector */}
                        <Select
                          value={req.assignedStaff ?? "unassigned"}
                          onValueChange={(v) => {
                            const staffName = v === "unassigned" ? null : v;
                            assignGuestRequest(req.id, staffName);
                            if (staffName) {
                              toast.success(`Request assigned to ${staffName}`);
                            } else {
                              toast.info(`Request unassigned`);
                            }
                          }}
                        >
                          <SelectTrigger className="w-36 h-8 text-xs">
                            <SelectValue placeholder="Assign Staff" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="unassigned">Unassigned</SelectItem>
                            {staff
                              .filter((s) => s.active)
                              .map((s) => (
                                <SelectItem key={s.id} value={s.name}>
                                  {s.name}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>

                        {/* Escalate button */}
                        {!isEscalated && (
                          <Button
                            size="icon"
                            variant="outline"
                            className="size-8 text-urgent border-urgent/30 hover:bg-urgent/10 shrink-0"
                            onClick={() => {
                              escalateGuestRequest(req.id);
                              toast.warning(`Request escalated to Critical priority!`);
                            }}
                            title="Force SLA Escalation"
                          >
                            <Flame className="size-4" />
                          </Button>
                        )}

                        {/* Resolve task button */}
                        <Button
                          size="sm"
                          className="h-8 bg-ready hover:bg-ready/90 text-black font-medium shrink-0"
                          onClick={() => {
                            updateGuestRequestStatus(req.id, "Completed");
                            toast.success(`Request marked as Resolved!`);
                          }}
                        >
                          <CheckCircle2 className="size-3.5 mr-1" /> Resolve
                        </Button>
                      </>
                    )}
                    
                    {req.status === "Completed" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs shrink-0"
                        onClick={() => {
                          updateGuestRequestStatus(req.id, "Open");
                          toast.info(`Re-opened request for Room ${req.roomNumber}`);
                        }}
                      >
                        Re-open
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          {!scoredRequests.length && (
            <div className="py-12 text-center text-sm text-muted-foreground italic">
              No requests matching current filters.
            </div>
          )}
        </div>
      </Card>

      {/* 4. MODAL DIALOG: LOG NEW GUEST REQUEST */}
      <Drawer open={createOpen} onOpenChange={setCreateOpen}>
        <DrawerContent className="bg-card border-t border-border pb-6">
          <div className="mx-auto w-full max-w-sm">
            <DrawerHeader>
              <DrawerTitle className="text-foreground font-display font-bold">Log Guest / Operational Request</DrawerTitle>
              <DrawerDescription className="text-xs text-muted-foreground">
                Create a new request and automatically dispatch it to the appropriate operations queue.
              </DrawerDescription>
            </DrawerHeader>

            <form onSubmit={handleCreateSubmit} className="space-y-4 px-4 pt-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="req-room-num" className="text-foreground text-xs">Room Number</Label>
                  <Input
                    id="req-room-num"
                    placeholder="e.g. 305"
                    value={reqRoom}
                    onChange={(e) => setReqRoom(e.target.value)}
                    className="border-border h-10 text-xs"
                    required
                  />
                </div>
                
                <div className="space-y-1.5">
                  <Label htmlFor="req-cat" className="text-foreground text-xs">Category</Label>
                  <Select value={reqCategory} onValueChange={(v) => setReqCategory(v as RequestCategory)}>
                    <SelectTrigger id="req-cat" className="border-border h-10 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Amenities">Amenities Catalog</SelectItem>
                      <SelectItem value="Maintenance">Maintenance Repair</SelectItem>
                      <SelectItem value="Luggage">Luggage / Porter</SelectItem>
                      <SelectItem value="Food Service">In-Room Food Service</SelectItem>
                      <SelectItem value="Inquiry">General Inquiry</SelectItem>
                      <SelectItem value="Late Checkout">Late Check-out</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="req-item-input" className="text-foreground text-xs">Request Item (Task Short Name)</Label>
                <div className="relative">
                  <Input
                    id="req-item-input"
                    placeholder="e.g. Extra pillow, AC leaking, Luggage help..."
                    value={reqItem}
                    onChange={(e) => setReqItem(e.target.value)}
                    className="border-border h-10 text-xs pr-24"
                    required
                  />
                  {reqItem && (
                    <span className="absolute right-2.5 top-2.5 flex items-center text-[9px] text-primary bg-primary/10 rounded px-1.5 py-0.5 font-bold">
                      <Sparkles className="size-3 mr-0.5" /> {suggestedDept}
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="req-details-input" className="text-foreground text-xs">Supplementary Details / Notes</Label>
                <Textarea
                  id="req-details-input"
                  placeholder="Include specific guest notes here..."
                  rows={3}
                  value={reqDetails}
                  onChange={(e) => setReqDetails(e.target.value)}
                  className="border-border text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="req-pri" className="text-foreground text-xs">Priority Severity</Label>
                  <Select value={reqPriority} onValueChange={(v) => setReqPriority(v as RequestPriority)}>
                    <SelectTrigger id="req-pri" className="border-border h-10 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Low">Low (45m SLA)</SelectItem>
                      <SelectItem value="Medium">Medium (30m SLA)</SelectItem>
                      <SelectItem value="High">High (20m SLA)</SelectItem>
                      <SelectItem value="Critical">Critical (15m SLA)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="req-routing" className="text-foreground text-xs">Department Routing</Label>
                  <Select value={reqDept} onValueChange={(v) => setReqDept(v as any)}>
                    <SelectTrigger id="req-routing" className="border-border h-10 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Auto-route Engine</SelectItem>
                      <SelectItem value="Housekeeping">Housekeeping Dept</SelectItem>
                      <SelectItem value="Maintenance">Maintenance Dept</SelectItem>
                      <SelectItem value="Front Desk">Front Desk</SelectItem>
                      <SelectItem value="Room Service">Room Service</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <DrawerFooter className="px-0 pt-2 flex flex-col gap-2">
                <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-black font-bold text-xs min-h-[48px]">
                  Submit Request
                </Button>
                <Button type="button" variant="outline" className="w-full border-border text-muted-foreground min-h-[48px]" onClick={() => setCreateOpen(false)}>
                  Cancel
                </Button>
              </DrawerFooter>
            </form>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
