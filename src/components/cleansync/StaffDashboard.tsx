// Refined UI Pass: Converted 190+ hardcoded color references to semantic design tokens.
// Enhanced mobile tap targets, card surfaces, and dark mode contrast.

import { useState, useEffect, useMemo } from "react";
import { useRoomFlow, STAFF_PHONES } from "./store";
import {
  Camera,
  CheckCircle2,
  Crown,
  Play,
  Timer,
  ClipboardCheck,
  Sparkles,
  AlertTriangle,
  User,
  BadgeAlert,
  Briefcase,
  ChevronRight,
  ShieldAlert,
  Clock,
  Power,
  RefreshCw,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CHECKLIST_STEPS, statusStyles, type Room, type GuestRequest, type Department, type RequestStatus } from "@/lib/cleansync-data";
import {
  Drawer,
  DrawerTrigger,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";

const requestStatusStyles: Record<RequestStatus, string> = {
  Open: "bg-dirty/10 text-dirty/80 border-dirty/20",
  "In Progress": "bg-primary/10 text-primary border-primary/20",
  Completed: "bg-ready/10 text-ready border-ready/20",
  Escalated: "bg-destructive/10 text-destructive border-destructive/20 animate-pulse font-semibold",
};

export function StaffDashboard() {
  const {
    rooms,
    staff,
    guestRequests,
    setRoomStatus,
    updateGuestRequestStatus,
    setRoomPhotoAndRunAi,
    simulateIncomingWhatsApp,
    assignRoom,
  } = useRoomFlow();

  const [selectedDept, setSelectedDept] = useState<Department>("Housekeeping");
  const [selectedStaffName, setSelectedStaffName] = useState<string>("Ana Duarte");
  const [onDuty, setOnDuty] = useState(true);

  // Sync staff selection when department changes
  useEffect(() => {
    const deptStaff = staff.filter((s) => {
      if (selectedDept === "Housekeeping") {
        return ["Ana Duarte", "Priya Raman", "Lucia Moreno"].includes(s.name);
      }
      if (selectedDept === "Maintenance") {
        return ["Marco Silva", "Jonas Weber"].includes(s.name);
      }
      return true;
    });
    
    if (deptStaff.length > 0) {
      if (!deptStaff.some((s) => s.name === selectedStaffName)) {
        setSelectedStaffName(deptStaff[0]!.name);
      }
    }
  }, [selectedDept, staff]);

  // Real-time Clock state
  const [timeStr, setTimeStr] = useState("");
  useEffect(() => {
    const updateTime = () => {
      setTimeStr(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const activeWorker = staff.find((s) => s.name === selectedStaffName) || staff[0]!;
  const workerPhone = STAFF_PHONES[activeWorker.name] || "+15551010001";

  // Filter tasks assigned to this active worker
  const assignedRooms = useMemo(() => {
    return rooms.filter((r) => r.assignedStaff === activeWorker.name);
  }, [rooms, activeWorker.name]);

  const assignedRequests = useMemo(() => {
    return guestRequests.filter((req) => req.assignedStaff === activeWorker.name);
  }, [guestRequests, activeWorker.name]);

  // Find the single active room/request tasks currently "In Progress"
  const activeRoom = useMemo(() => {
    return assignedRooms.find((r) => r.status === "Cleaning in Progress") ||
           assignedRooms.find((r) => r.status === "Inspection Pending") ||
           null;
  }, [assignedRooms]);

  const activeRequest = useMemo(() => {
    return assignedRequests.find((req) => req.status === "In Progress") ||
           assignedRequests.find((req) => req.status === "Escalated") ||
           null;
  }, [assignedRequests]);

  // Determine current task type tab context
  const [currentTaskType, setCurrentTaskType] = useState<"room" | "request">("room");

  useEffect(() => {
    if (activeRoom) {
      setCurrentTaskType("room");
    } else if (activeRequest) {
      setCurrentTaskType("request");
    }
  }, [activeRoom, activeRequest]);

  // Priority Dispatch Queue (uncompleted assigned tasks, sorted by urgency)
  const dispatchQueue = useMemo(() => {
    const pendingRooms = assignedRooms
      .filter((r) => r.status !== "Ready for Guest" && r.status !== "Cleaning in Progress" && r.status !== "Inspection Pending")
      .map((r) => {
        let score = r.priority === "VIP" ? 100 : r.priority === "Overdue" ? 80 : r.priority === "Early Arrival" ? 60 : 20;
        return { type: "room" as const, id: r.id, number: r.number, label: `Room Turn (${r.type})`, priority: r.priority, target: `${r.turnaround}m`, urgencyScore: score, checkIn: r.checkIn, item: r };
      });

    const pendingRequests = assignedRequests
      .filter((req) => req.status !== "Completed" && req.status !== "In Progress")
      .map((req) => {
        let score = req.priority === "Critical" ? 90 : req.priority === "High" ? 70 : req.priority === "Medium" ? 40 : 15;
        return { type: "request" as const, id: req.id, number: req.roomNumber, label: `${req.category}: ${req.item}`, priority: req.priority, target: `${req.slaMinutes}m SLA`, urgencyScore: score, checkIn: "—", item: req };
      });

    return [...pendingRooms, ...pendingRequests].sort((a, b) => b.urgencyScore - a.urgencyScore);
  }, [assignedRooms, assignedRequests]);

  // Stopwatch Timers state
  const [roomSeconds, setRoomSeconds] = useState(0);
  const [reqSeconds, setReqSeconds] = useState(0);
  const [roomDoneSteps, setRoomDoneSteps] = useState<string[]>([]);
  const [reqDoneSteps, setReqDoneSteps] = useState<string[]>([]);
  
  // AI visual uploader states
  const [isAiScanning, setIsAiScanning] = useState(false);
  const [aiResultText, setAiResultText] = useState("");
  const [aiBoxes, setAiBoxes] = useState<any[]>([]);

  const requestSteps = [
    "Acknowledge & Confirm Request Details",
    "Retrieve requested items or service tools",
    "Deliver amenities / execute repair at Room",
    "Verify guest satisfaction & update status",
  ];

  // Room clean stopwatch tick
  useEffect(() => {
    let t: NodeJS.Timeout;
    if (activeRoom && activeRoom.status === "Cleaning in Progress") {
      t = setInterval(() => setRoomSeconds((s) => s + 1), 1000);
    }
    return () => clearInterval(t);
  }, [activeRoom?.status]);

  // Request execution stopwatch tick
  useEffect(() => {
    let t: NodeJS.Timeout;
    if (activeRequest && activeRequest.status === "In Progress") {
      t = setInterval(() => setReqSeconds((s) => s + 1), 1000);
    }
    return () => clearInterval(t);
  }, [activeRequest?.status]);

  const formatTimer = (sec: number) => {
    const mm = String(Math.floor(sec / 60)).padStart(2, "0");
    const ss = String(sec % 60).padStart(2, "0");
    return `${mm}:${ss}`;
  };

  // Actions
  const handleStartRoom = (roomId: string) => {
    setRoomSeconds(0);
    setRoomDoneSteps([]);
    setAiResultText("");
    setAiBoxes([]);
    setRoomStatus(roomId, "Cleaning in Progress");
    
    const targetRoom = rooms.find(r => r.id === roomId);
    if (targetRoom) {
      simulateIncomingWhatsApp(workerPhone, `START ${targetRoom.number}`);
      toast.success(`Started cleaning Room ${targetRoom.number}. Stopwatch initialized.`);
    }
  };

  const handleInspectRoom = () => {
    if (!activeRoom) return;
    setRoomStatus(activeRoom.id, "Inspection Pending");
    toast.success(`Room ${activeRoom.number} marked completed and queued for supervisor inspection.`);
  };

  const handleSimulateAiInspection = (type: "clean" | "dirty_bed" | "dirty_trash") => {
    if (!activeRoom) return;
    setIsAiScanning(true);
    setAiResultText("");
    
    setTimeout(() => {
      setIsAiScanning(false);
      setRoomPhotoAndRunAi(activeRoom.id, type);
      simulateIncomingWhatsApp(workerPhone, `Staging photo submitted`, true, type);

      if (type === "clean") {
        setAiResultText("AI QA PASSED: Pristine room staging detected.");
        setAiBoxes([]);
        toast.success("Visual AI: Inspection PASSED!");
      } else if (type === "dirty_bed") {
        setAiResultText("AI QA FLAGGED: Rumpled linens detected on pillow staging.");
        setAiBoxes([{ label: "Rumpled Linens", x: 28, y: 35 }]);
        toast.warning("Visual AI: Staging FLAGGED (Rumpled linens).");
      } else {
        setAiResultText("AI QA FLAGGED: Floor debris detected near work desk chair.");
        setAiBoxes([{ label: "Trash on Floor", x: 55, y: 65 }]);
        toast.warning("Visual AI: Staging FLAGGED (Floor debris).");
      }
    }, 1500);
  };

  const handleStartRequest = (reqId: string) => {
    setReqSeconds(0);
    setReqDoneSteps([]);
    updateGuestRequestStatus(reqId, "In Progress");
    const req = guestRequests.find(r => r.id === reqId);
    if (req) {
      toast.success(`Started request task: ${req.item} for Room ${req.roomNumber}`);
    }
  };

  const handleResolveRequest = () => {
    if (!activeRequest) return;
    updateGuestRequestStatus(activeRequest.id, "Completed");
    toast.success(`Service request successfully completed.`);
  };

  const handleEscalateRequest = () => {
    if (!activeRequest) return;
    updateGuestRequestStatus(activeRequest.id, "Escalated");
    toast.error(`Service request escalated to supervisor.`);
  };

  const handleBlockRoom = () => {
    if (!activeRoom) return;
    setRoomStatus(activeRoom.id, "Maintenance Blocked");
    toast.error(`Room ${activeRoom.number} blocked for Maintenance Engineering.`);
  };

  return (
    <div className="space-y-6">
      
      {/* 1. FLUID RESPONSIVE HEADER BAR */}
      <Card className="p-4 bg-card border border-border shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        
        {/* Profile and Switcher Info */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2">
            <span className="size-9 rounded-xl bg-primary/10 flex items-center justify-center font-bold text-sm text-primary uppercase">
              {activeWorker.name.split(" ").map((n) => n[0]).join("")}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display font-bold text-foreground">{activeWorker.name}</span>
                <Badge className="bg-ready/15 text-ready border border-ready/20 text-[10px] py-0 px-2 font-sans font-medium hover:none">
                  {selectedDept}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 font-mono">{workerPhone} • {activeWorker.completed} completed today</p>
            </div>
          </div>

          <div className="flex gap-1.5 ml-2 border-l pl-4 border-border">
            <Select value={selectedDept} onValueChange={(v) => setSelectedDept(v as Department)}>
              <SelectTrigger className="w-[140px] h-8 text-xs bg-transparent border-border">
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Housekeeping">Housekeeping</SelectItem>
                <SelectItem value="Maintenance">Maintenance</SelectItem>
                <SelectItem value="Front Desk">Front Desk</SelectItem>
                <SelectItem value="Room Service">Room Service</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedStaffName} onValueChange={setSelectedStaffName}>
              <SelectTrigger className="w-[150px] h-8 text-xs bg-transparent border-border">
                <SelectValue placeholder="Select Staff" />
              </SelectTrigger>
              <SelectContent>
                {staff
                  .filter((s) => {
                    if (selectedDept === "Housekeeping") {
                      return ["Ana Duarte", "Priya Raman", "Lucia Moreno"].includes(s.name);
                    }
                    if (selectedDept === "Maintenance") {
                      return ["Marco Silva", "Jonas Weber"].includes(s.name);
                    }
                    return true;
                  })
                  .map((s) => (
                    <SelectItem key={s.id} value={s.name}>
                      {s.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Shift status switcher & clock */}
        <div className="flex items-center gap-4 justify-between w-full md:w-auto border-t md:border-t-0 pt-3 md:pt-0 border-border">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider font-sans">Shift Status:</span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setOnDuty(!onDuty);
                toast.info(onDuty ? "Shift status set to: BREAK" : "Shift status set to: ON DUTY");
              }}
              className={`h-8 px-3 text-xs gap-1.5 font-medium transition-all ${
                onDuty
                  ? "bg-ready/10 text-ready border-ready/30 hover:bg-ready/20"
                  : "bg-muted-foreground/10 text-muted-foreground border-muted-foreground/30 hover:bg-muted-foreground/20"
              }`}
            >
              <Power className="size-3.5" />
              <span>{onDuty ? "On Duty" : "On Break"}</span>
            </Button>
          </div>

          <div className="flex items-center gap-1.5 font-mono text-xs text-foreground bg-muted/40 py-1.5 px-3 rounded-lg border">
            <Clock className="size-3.5 text-primary" />
            <span>{timeStr || "00:00:00"}</span>
          </div>
        </div>
      </Card>

      {/* 2. MAIN LAYOUT GRID (LEFT: HERO TASK CARD, RIGHT: DISPATCH QUEUE) */}
      <div className="grid gap-6 lg:grid-cols-3">
        
        {/* Left Column: Active Task Hero Card */}
        <div className="lg:col-span-2 space-y-6">
          <Tabs value={currentTaskType} onValueChange={(v: string) => setCurrentTaskType(v as any)} className="w-full">
            <div className="flex justify-between items-center border-b pb-2 mb-4 border-border">
              <TabsList className="h-9 bg-card">
                <TabsTrigger value="room" className="text-xs px-4" disabled={!activeRoom && dispatchQueue.every(t => t.type !== "room")}>
                  Active Room turnaround
                </TabsTrigger>
                <TabsTrigger value="request" className="text-xs px-4" disabled={!activeRequest && dispatchQueue.every(t => t.type !== "request")}>
                  Guest Service Requests
                </TabsTrigger>
              </TabsList>
              <span className="text-[10px] font-bold text-muted-foreground uppercase font-sans tracking-widest">Focused Task Console</span>
            </div>

            {/* TAB CONTENT: ROOM TURNOVER CONSOLE */}
            <TabsContent value="room" className="space-y-4 outline-none">
              {activeRoom ? (
                <Card className="bg-card border border-border shadow-sm p-6 space-y-6">
                  
                  {/* Hero Header */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b border-border/60 /60">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="font-display text-4xl font-bold tracking-tight text-foreground">Room {activeRoom.number}</h2>
                        {activeRoom.priority === "VIP" && (
                          <Badge className="bg-destructive/15 text-destructive border border-destructive/30 text-xs px-2.5 py-0.5 hover:none">
                            <Crown className="size-3 mr-1" /> VIP ARRIVAL
                          </Badge>
                        )}
                        {activeRoom.priority === "Overdue" && (
                          <Badge className="bg-destructive/20 text-destructive border border-destructive/35 text-xs px-2.5 py-0.5 hover:none animate-pulse">
                            OVERDUE
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 font-sans">
                        Type: <span className="font-semibold text-foreground">{activeRoom.type}</span> • Scheduled check-in at <span className="font-semibold text-foreground">{activeRoom.checkIn}</span> • Duration: ~{activeRoom.turnaround}m
                      </p>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <Badge className={`text-xs px-3 py-1 font-medium border ${statusStyles[activeRoom.status].chip}`}>
                        {activeRoom.status}
                      </Badge>
                    </div>
                  </div>

                  {/* Priority Alert Banner */}
                  {activeRoom.priorityReason && (
                    <div className="bg-primary/10 border border-primary/20 text-sm text-foreground p-3 rounded-lg flex items-start gap-2.5">
                      <BadgeAlert className="size-5 text-primary shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-primary block text-xs uppercase tracking-wider">Priority Dispatch Reason</span>
                        <p className="text-xs mt-0.5 leading-relaxed text-foreground/90">{activeRoom.priorityReason}</p>
                      </div>
                    </div>
                  )}

                  {/* Stopwatch & Progress */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    
                    {/* Active Timer Block */}
                    <div className="bg-card p-4 rounded-xl border border-border flex flex-col justify-between">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                        <Timer className="size-3.5 text-primary" /> Stopwatch timer
                      </span>
                      <div className="mt-3 flex items-baseline justify-between">
                        <span className="font-display text-4xl font-semibold tabular-nums text-foreground">
                          {formatTimer(roomSeconds)}
                        </span>
                        <Badge variant="outline" className="text-[9px] border-primary/30 text-primary">
                          ACTIVE ELAPSED
                        </Badge>
                      </div>
                    </div>

                    {/* Progress Checklist Bar */}
                    <div className="bg-card p-4 rounded-xl border border-border flex flex-col justify-between">
                      <div className="flex justify-between items-center text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                        <span>Checklist progress</span>
                        <span className="text-ready">{Math.round((roomDoneSteps.length / CHECKLIST_STEPS.length) * 100)}%</span>
                      </div>
                      <div className="mt-3 space-y-1">
                        <Progress value={(roomDoneSteps.length / CHECKLIST_STEPS.length) * 100} className="h-2 bg-muted" />
                        <span className="text-[10px] text-muted-foreground block text-right mt-1">
                          {roomDoneSteps.length} of {CHECKLIST_STEPS.length} stages checked
                        </span>
                      </div>
                    </div>

                  </div>

                  {/* Tappable Checklist Grid */}
                  <div className="space-y-2">
                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Housekeeping cleaning checklist</h3>
                    <div className="grid sm:grid-cols-2 gap-2">
                      {CHECKLIST_STEPS.map((step) => {
                        const isDone = roomDoneSteps.includes(step);
                        return (
                          <label
                            key={step}
                            className={`flex items-center gap-3.5 p-3 min-h-[48px] rounded-lg border transition-all cursor-pointer select-none ${
                              isDone
                                ? "bg-ready/5 border-ready/30 text-muted-foreground line-through"
                                : "bg-card border-border hover:bg-accent/40 text-foreground"
                            }`}
                          >
                            <Checkbox
                              checked={isDone}
                              onCheckedChange={(c) =>
                                setRoomDoneSteps((prev) => (c ? [...prev, step] : prev.filter((s) => s !== step)))
                              }
                              className="size-6 border-border"
                            />
                            <span className="text-xs font-medium font-sans leading-none">{step}</span>
                          </label>
                        );
                      })}
                    </div>
                                    {/* One-Tap AI photo upload verification */}
                  {activeRoom.status === "Cleaning in Progress" && (
                    <div className="border border-dashed border-border rounded-xl p-4 bg-muted/50 /20 space-y-4">
                      <div className="flex items-start justify-between border-b pb-2 border-border/60 /60">
                        <div className="flex items-center gap-2">
                          <Camera className="size-4 text-primary" />
                          <span className="text-xs font-bold text-foreground uppercase tracking-wider">Staging Verification AI</span>
                        </div>
                        <Badge className="text-[9px] bg-primary/10 text-primary hover:none font-mono">Gemini Vision LLM API</Badge>
                      </div>

                      <div className="flex flex-col gap-3">
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-foreground">Upload room Staging photo</p>
                          <p className="text-[11px] text-muted-foreground leading-snug">Visual AI automatically validates linens tight folding, folded towels, stocked amenities, and floor debris sweep.</p>
                        </div>

                        {/* Mobile and Desktop Action buttons */}
                        <div className="flex flex-col md:flex-row gap-2">
                          <Button
                            size="lg"
                            className="flex-1 min-h-[48px] bg-primary hover:bg-primary/90 text-black font-bold text-xs flex items-center justify-center gap-2 rounded-xl"
                            onClick={() => handleSimulateAiInspection("clean")}
                            disabled={isAiScanning}
                          >
                            <Camera className="size-5" />
                            One-Tap AI Camera Audit (PASS)
                          </Button>
                          <div className="grid grid-cols-2 gap-2">
                            <Button
                              variant="outline"
                              className="h-[48px] text-[10px] border-destructive/30 text-destructive hover:bg-destructive/10 font-bold"
                              onClick={() => handleSimulateAiInspection("dirty_bed")}
                              disabled={isAiScanning}
                            >
                              Flag Wrinkles
                            </Button>
                            <Button
                              variant="outline"
                              className="h-[48px] text-[10px] border-destructive/30 text-destructive hover:bg-destructive/10 font-bold"
                              onClick={() => handleSimulateAiInspection("dirty_trash")}
                              disabled={isAiScanning}
                            >
                              Flag Trash
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div> 
                  )}

                      {/* Scanning / Output results */}
                      {isAiScanning && (
                        <div className="flex items-center justify-center gap-2 py-2 text-xs font-mono text-muted-foreground bg-card rounded border">
                          <RefreshCw className="size-4 animate-spin text-primary" />
                          <span>Gemini Vision API parsing staging telemetry...</span>
                        </div>
                      )}

                      {aiResultText && !isAiScanning && (
                        <div className={`p-3 rounded-lg border text-xs leading-relaxed flex items-start gap-2 ${
                          aiResultText.includes("PASSED")
                            ? "bg-ready/10 border-ready/30 text-ready"
                            : "bg-destructive/10 border-destructive/30 text-destructive"
                        }`}>
                          {aiResultText.includes("PASSED") ? (
                            <CheckCircle2 className="size-4 shrink-0 mt-0.5" />
                          ) : (
                            <AlertTriangle className="size-4 shrink-0 mt-0.5" />
                          )}
                          <div>
                            <span className="font-bold block uppercase text-[10px] tracking-wider mb-0.5">Verification Telemetry</span>
                            <span>{aiResultText}</span>
                          </div>
                        </div>
                      )}
                    </div>

                  {/* Action controls footer */}
                  <div className="flex flex-col sm:flex-row gap-2.5 pt-4 border-t border-border/60 /60">
                    <Button
                      variant="destructive"
                      className="bg-destructive hover:bg-destructive/90 text-white font-semibold text-xs sm:mr-auto"
                      onClick={handleBlockRoom}
                    >
                      <AlertTriangle className="size-4 mr-1.5" /> Report maintenance Fault / Block Room
                    </Button>
                    
                    <Button
                      className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs"
                      onClick={handleInspectRoom}
                      disabled={activeRoom.status !== "Cleaning in Progress" || roomDoneSteps.length < CHECKLIST_STEPS.length}
                    >
                      <ClipboardCheck className="size-4 mr-1.5" /> Submit & Mark for Inspection
                    </Button>
                  </div>

                </Card>
              ) : (
                <Card className="py-24 text-center space-y-3 bg-card border border-dashed rounded-xl p-6">
                  <span className="text-4xl">😴</span>
                  <h3 className="font-display text-lg font-bold text-foreground">No active room cleanup turnaround</h3>
                  <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                    Select a room from the Priority Dispatch Queue on the right side and click 'Start Turn' to begin.
                  </p>
                </Card>
              )}
            </TabsContent>

            {/* TAB CONTENT: GUEST REQUEST CONSOLE */}
            <TabsContent value="request" className="space-y-4 outline-none">
              {activeRequest ? (
                <Card className="bg-card border border-border shadow-sm p-6 space-y-6">
                  
                  {/* Hero Header */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b border-border/60 /60">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="font-display text-3xl font-bold tracking-tight text-foreground">Room {activeRequest.roomNumber}</h2>
                        {activeRequest.priority === "Critical" && (
                          <Badge className="bg-destructive/15 text-destructive border border-destructive/30 text-xs px-2.5 py-0.5 hover:none">
                            CRITICAL PRIORITY
                          </Badge>
                        )}
                        {activeRequest.priority === "High" && (
                          <Badge className="bg-primary/15 text-primary border border-primary/30 text-xs px-2.5 py-0.5 hover:none">
                            HIGH PRIORITY
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 font-sans">
                        Service type: <span className="font-semibold text-foreground">{activeRequest.category}</span> • target SLA limit: <span className="font-semibold text-foreground">{activeRequest.slaMinutes}m</span>
                      </p>
                    </div>

                    <Badge className={`text-xs px-3 py-1 font-medium border ${requestStatusStyles[activeRequest.status]}`}>
                      {activeRequest.status}
                    </Badge>
                  </div>

                  {/* Details Card */}
                  <div className="bg-card p-4 rounded-xl border border-border space-y-2">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Requested item details</span>
                    <p className="text-sm font-semibold text-foreground">{activeRequest.item}</p>
                    <p className="text-xs text-muted-foreground leading-normal">{activeRequest.details || "No supplementary guest instructions provided."}</p>
                  </div>

                  {/* Stopwatch & Steps */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="bg-card p-4 rounded-xl border border-border flex flex-col justify-between">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                        <Timer className="size-3.5 text-primary" /> Timer Elapsed
                      </span>
                      <div className="mt-3 flex items-baseline justify-between">
                        <span className="font-display text-4xl font-semibold tabular-nums text-foreground">
                          {formatTimer(reqSeconds)}
                        </span>
                        <Badge variant="outline" className="text-[9px] border-primary/30 text-primary">
                          ACTIVE TASK
                        </Badge>
                      </div>
                    </div>

                    <div className="bg-card p-4 rounded-xl border border-border flex flex-col justify-between">
                      <div className="flex justify-between items-center text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                        <span>Checklist progress</span>
                        <span className="text-ready">{Math.round((reqDoneSteps.length / requestSteps.length) * 100)}%</span>
                      </div>
                      <div className="mt-3 space-y-1">
                        <Progress value={(reqDoneSteps.length / requestSteps.length) * 100} className="h-2 bg-muted" />
                        <span className="text-[10px] text-muted-foreground block text-right mt-1">
                          {reqDoneSteps.length} of {requestSteps.length} steps checked
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Tappable Checklist Grid */}
                  <div className="space-y-2">
                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Service request checklist steps</h3>
                    <div className="grid sm:grid-cols-2 gap-2">
                      {requestSteps.map((step) => {
                        const isDone = reqDoneSteps.includes(step);
                        return (
                          <label
                            key={step}
                            className={`flex items-center gap-3.5 p-3 min-h-[48px] rounded-lg border transition-all cursor-pointer select-none ${
                              isDone
                                ? "bg-ready/5 border-ready/30 text-muted-foreground line-through"
                                : "bg-card border-border hover:bg-accent/40 text-foreground"
                            }`}
                          >
                            <Checkbox
                              checked={isDone}
                              onCheckedChange={(c) =>
                                setReqDoneSteps((prev) => (c ? [...prev, step] : prev.filter((s) => s !== step)))
                              }
                              className="size-6 border-border"
                            />
                            <span className="text-xs font-medium font-sans leading-none">{step}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* Action controls footer */}
                  <div className="flex flex-col sm:flex-row gap-2.5 pt-4 border-t border-border/60 /60 justify-end">
                    <Button
                      variant="outline"
                      className="text-destructive border-destructive/30 hover:bg-destructive/10 font-semibold text-xs sm:mr-auto"
                      onClick={handleEscalateRequest}
                    >
                      <AlertTriangle className="size-4 mr-1.5" /> Escalate to Supervisor
                    </Button>
                    
                    <Button
                      className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs"
                      onClick={handleResolveRequest}
                      disabled={reqDoneSteps.length < requestSteps.length}
                    >
                      <CheckCircle2 className="size-4 mr-1.5" /> Mark Service Completed
                    </Button>
                  </div>

                </Card>
              ) : (
                <Card className="py-24 text-center space-y-3 bg-card border border-dashed rounded-xl p-6">
                  <span className="text-4xl">🎉</span>
                  <h3 className="font-display text-lg font-bold text-foreground">No active guest request task</h3>
                  <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                    Select a request from the Dispatch Queue on the right side and click 'Start Service' to begin.
                  </p>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Column: Priority Dispatch Queue Sidebar (Desktop only) */}
        <div className="hidden lg:block space-y-6">
          <Card className="p-5 bg-card border border-border shadow-sm space-y-4">
            
            {/* Header */}
            <div className="border-b pb-3 border-border/60 /60 flex items-center justify-between">
              <div>
                <h3 className="font-display text-lg font-bold text-foreground flex items-center gap-1.5">
                  <TrendingUp className="size-4.5 text-primary" /> Dispatch Queue
                </h3>
                <p className="text-[10px] text-muted-foreground mt-0.5">Assigned pending tasks sorted by urgency.</p>
              </div>
              <Badge className="bg-primary/10 text-primary border border-primary/20 text-[10px] font-mono">
                {dispatchQueue.length} queued
              </Badge>
            </div>

            {/* List */}
            <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-border">
              {dispatchQueue.map((task) => {
                const isVip = task.priority === "VIP" || task.priority === "Critical" || task.priority === "Overdue";
                return (
                  <div
                    key={task.id}
                    className={`flex flex-col gap-2 p-3 rounded-xl border bg-muted/30 dark:bg-black/5 ${
                      isVip
                        ? "border-destructive/30 bg-destructive/5"
                        : task.priority === "Early Arrival"
                          ? "border-primary/30 bg-primary/5"
                          : "border-border"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-display font-bold text-sm text-foreground">
                            Room {task.number}
                          </span>
                        </div>
                        <p className="text-[10px] text-muted-foreground font-sans mt-0.5">{task.label}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5 font-sans">
                          Duration: {task.target} {task.checkIn !== "—" && `• Arr: ${task.checkIn}`}
                        </p>
                      </div>
                      <Badge variant="outline" className={`text-[8px] px-1.5 py-0 border ${
                        isVip ? "border-destructive/30 text-destructive bg-destructive/5" : "border-border text-muted-foreground"
                      }`}>
                        {task.priority}
                      </Badge>
                    </div>

                    {/* Hover Action Button */}
                    <div className="w-full pt-1 border-t border-dashed border-border/50 /50 flex justify-end">
                      {task.type === "room" ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-[10px] text-primary hover:text-primary hover:bg-primary/10 gap-1 font-bold p-1 px-2.5 rounded transition-all"
                          onClick={() => handleStartRoom(task.id)}
                        >
                          <Play className="size-3" /> Start Cleaning
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-[10px] text-primary hover:text-primary hover:bg-primary/10 gap-1 font-bold p-1 px-2.5 rounded transition-all"
                          onClick={() => handleStartRequest(task.id)}
                        >
                          <Play className="size-3" /> Start Service
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}

              {dispatchQueue.length === 0 && (
                <div className="py-12 text-center text-xs text-muted-foreground italic bg-muted/20 border border-dashed rounded-lg">
                  No upcoming pending tasks assigned.
                </div>
              )}
            </div>

            {/* Static Guidelines removed, replacing with simple mini status tracker bar */}
            <div className="pt-3 border-t border-border/60 /60 flex items-center justify-between text-[10px] text-muted-foreground font-sans uppercase tracking-wider">
              <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-ready" /> Active turns</span>
              <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-primary" /> SLA pending</span>
            </div>

          </Card>
        </div>

      </div>

      {/* Dynamic swipe-up bottom task queue drawer for mobile (< lg) */}
      <div className="lg:hidden fixed bottom-20 left-4 right-4 z-40">
        <Drawer>
          <DrawerTrigger asChild>
            <Button className="w-full bg-primary hover:bg-primary/90 text-black min-h-[48px] shadow-lg rounded-xl flex items-center justify-between px-4">
              <span className="font-bold text-xs uppercase tracking-wider">Upcoming Dispatch Queue ({dispatchQueue.length})</span>
              <ChevronRight className="size-4 shrink-0 text-black" />
            </Button>
          </DrawerTrigger>
          <DrawerContent className="bg-card border-t border-border pb-6">
            <div className="mx-auto w-full max-w-sm p-4 space-y-4">
              <DrawerHeader className="px-0">
                <DrawerTitle className="text-sm font-bold text-foreground font-display">Upcoming Dispatch Queue</DrawerTitle>
                <DrawerDescription className="text-xs text-muted-foreground">Tasks assigned to you on this shift.</DrawerDescription>
              </DrawerHeader>
              <div className="space-y-2.5 max-h-[40vh] overflow-y-auto pr-1">
                {dispatchQueue.map((task) => (
                  <div key={task.id} className="p-3 bg-muted/40 border border-border rounded-xl flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-foreground">Room {task.number}</span>
                      <p className="text-[10px] text-muted-foreground">{task.label} ({task.target})</p>
                    </div>
                    {task.type === "room" ? (
                      <Button size="sm" className="h-8 text-[10px] bg-primary text-black font-bold" onClick={() => handleStartRoom(task.id)}>Start</Button>
                    ) : (
                      <Button size="sm" className="h-8 text-[10px] bg-primary text-black font-bold" onClick={() => handleStartRequest(task.id)}>Start</Button>
                    )}
                  </div>
                ))}
                {dispatchQueue.length === 0 && <p className="text-center text-xs text-muted-foreground py-8">No tasks in queue</p>}
              </div>
            </div>
          </DrawerContent>
        </Drawer>
      </div>
    </div>
  );
}
