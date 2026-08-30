import { useState, useEffect, useMemo, useRef } from "react";
import { 
  Gauge, Clock, Crown, Users, Search, QrCode, FileSpreadsheet, 
  Sparkles, CheckCircle2, XCircle, AlertTriangle, Plus, MoreVertical, 
  Wrench, Printer, Check, Filter, RefreshCw, Camera, Bell, Volume2
} from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRoomFlow } from "./store";
import { RoomQrCard } from "./RoomQrCard";
import { calculatePriorityScore, transitionRoomState } from "@/lib/dispatchEngine";
import { type Room, type RoomStatus, type RoomType, type PriorityTag } from "@/lib/cleansync-data";
import { rankStaffForRequest } from "@/lib/dispatchEngine";
import { findBestStaffMatch, runBatchAutoDispatch, type BatchDispatchItem } from "@/services/aiDispatchEngine";
import { playSupervisorRingerSound } from "@/services/audioRinger";

export function SupervisorDashboard() {
  const {
    rooms,
    staff,
    guestRequests,
    autoDispatchEngine,
    autoOptimize,
    setRoomStatus,
    blockRoom,
    assignRoom,
    approveRoom,
    rejectRoom,
    overruleApproveRoom,
    rejectRecleanRoom,
    addRoom,
    importCSV,
    setRoomPhotoAndRunAi,
    assignTaskToStaff,
    assignGuestRequest,
    updateGuestRequestStatus,
    addGuestRequest,
    runBatchDispatch,
  } = useRoomFlow();

  // Log guest request dialog states
  const [newReqModalOpen, setNewReqModalOpen] = useState(false);
  const [newReqRoom, setNewReqRoom] = useState("203");
  const [newReqCategory, setNewReqCategory] = useState<any>("Amenities");
  const [newReqItem, setNewReqItem] = useState("");
  const [newReqDetails, setNewReqDetails] = useState("");

  // Batch Auto-Dispatch Modal states
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [batchList, setBatchList] = useState<BatchDispatchItem[]>([]);

  const handleRunBatchEngine = () => {
    const matches = runBatchAutoDispatch(rooms, guestRequests, staff);
    setBatchList(matches);
    setBatchModalOpen(true);
  };

  const handleConfirmBatchDispatch = () => {
    const assignments = batchList.map((b) => ({
      targetId: b.targetId,
      targetType: b.type,
      staffName: b.match.staffName,
    }));

    runBatchDispatch(assignments);
    setBatchModalOpen(false);
  };

  // State controls
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFloor, setSelectedFloor] = useState<number | "All">("All");
  const [selectedStatus, setSelectedStatus] = useState<RoomStatus | "All">("All");
  
  // Interactive UI modals/triggers
  const [maintOpen, setMaintOpen] = useState(false);
  const [maintRoomId, setMaintRoomId] = useState("");
  const [maintNote, setMaintNote] = useState("");
  const [addRoomOpen, setAddRoomOpen] = useState(false);
  const [qrRoom, setQrRoom] = useState<Room | null>(null);
  const [selectedInspectRoomId, setSelectedInspectRoomId] = useState<string | null>(null);

  // New room state
  const [newRoomNum, setNewRoomNum] = useState("");
  const [newRoomType, setNewRoomType] = useState<RoomType>("Standard");
  const [newRoomPriority, setNewRoomPriority] = useState<PriorityTag>("Regular");
  const [newRoomGuest, setNewRoomGuest] = useState("");
  const [newRoomCheckIn, setNewRoomCheckIn] = useState("14:00");

  // Track active cleaning elapsed seconds locally to calculate Breaches in real-time
  const [cleaningElapsed, setCleaningElapsed] = useState<Record<string, number>>({
    "101": 14 * 60, // Standard, 14m elapsed (target 30m)
    "203": 22 * 60, // Suite, 22m elapsed (target 45m)
    "302": 8 * 60,  // Deluxe, 8m elapsed (target 35m)
  });

  // Audio ringer alert state & listener
  const [ringerAlert, setRingerAlert] = useState<{ roomNumber: string; item: string } | null>(null);
  const prevReqCountRef = useRef(guestRequests.length);

  // 1. Cross-tab storage event ringer listener
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "roomflow_ring_supervisor_alert" && e.newValue) {
        playSupervisorRingerSound();
        const latest = guestRequests[0];
        if (latest) {
          setRingerAlert({ roomNumber: latest.roomNumber, item: latest.item });
          setTimeout(() => setRingerAlert(null), 5000);
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [guestRequests]);

  // 2. React state count listener
  useEffect(() => {
    if (guestRequests.length > prevReqCountRef.current) {
      const latest = guestRequests[0];
      if (latest) {
        playSupervisorRingerSound();
        setRingerAlert({ roomNumber: latest.roomNumber, item: latest.item });
        toast.info(`🔔 3s Ringer Alert: New request for Room ${latest.roomNumber} (${latest.item})`);
        setTimeout(() => setRingerAlert(null), 5000);
      }
    }
    prevReqCountRef.current = guestRequests.length;
  }, [guestRequests]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCleaningElapsed((prev) => {
        const next = { ...prev };
        rooms.forEach((r) => {
          if (r.status === "Cleaning in Progress") {
            next[r.id] = (next[r.id] || 0) + 1;
          }
        });
        return next;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [rooms]);

  // Selected room in sidebar inspection review queue
  const [selectedInspectRoomId, setSelectedInspectRoomId] = useState<string | null>(null);

  // Calculate dynamic countdown for the metric row
  const nextVipCountdown = useMemo(() => {
    const pendingVips = rooms
      .filter((r) => r.priority === "VIP" && r.status !== "Ready for Guest" && r.checkIn && r.checkIn !== "—")
      .map((r) => {
        const parts = r.checkIn.split(":");
        const h = parts[0] ? Number(parts[0]) : 14;
        const m = parts[1] ? Number(parts[1]) : 0;
        return { room: r, mins: h * 60 + m };
      })
      .sort((a, b) => a.mins - b.mins);

    if (pendingVips.length === 0) return "No pending VIPs";
    
    // Assume current time is 13:00 for stable display
    const currentMins = 13 * 60; 
    const nextVip = pendingVips[0]!;
    const diff = nextVip.mins - currentMins;
    
    if (diff < 0) {
      return `Rm ${nextVip.room.number} (${Math.abs(diff)}m Overdue)`;
    }
    return `Rm ${nextVip.room.number} in ${diff}m`;
  }, [rooms]);

  // Compute metrics
  const kpiData = useMemo(() => {
    const cleanable = rooms.filter((r) => r.status !== "Occupied");
    const readiness = Math.round(
      (rooms.filter((r) => r.status === "Ready for Guest").length / (cleanable.length || 1)) * 100
    );
    
    // Average turnaround time target vs actual (simulated average of turnaround values)
    const turnRooms = rooms.filter((r) => r.turnaround > 0);
    const avgTurn = Math.round(
      turnRooms.reduce((sum, r) => sum + r.turnaround, 0) / (turnRooms.length || 1)
    );

    const vipCount = rooms.filter(
      (r) => r.priority === "VIP" && r.status !== "Ready for Guest"
    ).length;

    // active cleaners workload balance
    const activeStaff = staff.filter((s) => s.active);
    const avgWorkload = Math.round(
      activeStaff.reduce((sum, s) => sum + s.workload, 0) / (activeStaff.length || 1)
    );

    return {
      readiness,
      avgTurn,
      vipCount,
      utilization: avgWorkload,
    };
  }, [rooms, staff]);

  // Run priority engine scores on all vacant dirty rooms
  const processedRooms = useMemo(() => {
    return rooms.map((r) => {
      // Find housekeeper's last completed room to assign proximity bonus
      let lastCompletedRoomNum: string | null = null;
      if (r.assignedStaff) {
        const housekeeper = staff.find((s) => s.name === r.assignedStaff);
        if (housekeeper && housekeeper.currentRoom) {
          lastCompletedRoomNum = housekeeper.currentRoom;
        }
      }

      const scoreInfo = calculatePriorityScore(r, lastCompletedRoomNum, "13:00");
      return {
        ...r,
        priorityScore: scoreInfo.score,
        priorityReason: scoreInfo.reason,
      };
    });
  }, [rooms, staff]);

  // Filters rooms based on user criteria
  const filteredRooms = useMemo(() => {
    return processedRooms.filter((r) => {
      const matchesSearch =
        r.number.includes(searchQuery) ||
        r.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.guestName && r.guestName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (r.assignedStaff && r.assignedStaff.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesFloor = selectedFloor === "All" || r.floor === selectedFloor;
      const matchesStatus = selectedStatus === "All" || r.status === selectedStatus;

      return matchesSearch && matchesFloor && matchesStatus;
    });
  }, [processedRooms, searchQuery, selectedFloor, selectedStatus]);

  // Sort rooms: Inspection Pending first, then by priority score descending
  const sortedRooms = useMemo(() => {
    return [...filteredRooms].sort((a, b) => {
      if (a.status === "Inspection Pending" && b.status !== "Inspection Pending") return -1;
      if (a.status !== "Inspection Pending" && b.status === "Inspection Pending") return 1;
      return (b.priorityScore || 0) - (a.priorityScore || 0);
    });
  }, [filteredRooms]);

  // AI review items
  const aiReviewQueue = useMemo(() => {
    return rooms.filter((r) => r.status === "Inspection Pending");
  }, [rooms]);

  const activeInspectRoom = useMemo(() => {
    return rooms.find((r) => r.id === selectedInspectRoomId) || null;
  }, [rooms, selectedInspectRoomId]);

  // Action handlers
  const handleAutoDispatch = () => {
    autoDispatchEngine();
  };

  const handleApproveInspection = (roomId: string) => {
    approveRoom(roomId);
  };

  const handleRejectInspection = (roomId: string) => {
    rejectRoom(roomId, "Visual defects flagged in inspection photo.");
  };

  const handleManualStatusChange = (roomId: string, status: RoomStatus) => {
    setRoomStatus(roomId, status);
    toast.success(`Room ${roomId} manually set to ${status}`);
  };

  const handleAddRoomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomNum) {
      toast.error("Please enter a room number");
      return;
    }
    addRoom({
      number: newRoomNum,
      type: newRoomType,
      priority: newRoomPriority,
      guestName: newRoomGuest,
      checkIn: newRoomCheckIn,
    });
    setNewRoomNum("");
    setNewRoomGuest("");
    setAddRoomOpen(false);
    toast.success(`Room ${newRoomNum} successfully added to operational matrix.`);
  };

  const handleMaintenanceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!maintNote) {
      toast.error("Please enter defect description");
      return;
    }
    blockRoom(maintRoomId, maintNote);
    setMaintNote("");
    setMaintOpen(false);
    toast.warning(`Room ${maintRoomId} set to Maintenance Blocked.`);
  };

  const triggerCsvImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      const res = importCSV(text);
      if (res.success) {
        toast.success(`Imported ${res.count} rooms successfully.`);
      } else {
        toast.error(`Import completed with errors. Successfully imported ${res.count} rooms.`);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="flex flex-col gap-6 w-full text-[#2A2620]">
      
      {/* 1. EXECUTIVE KPI METRIC BAR */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* KPI: Readiness */}
        <Card className="bg-white border-[#EBE3D1] p-5 rounded-2xl shadow-sm flex flex-col justify-between hover:shadow-md transition-all duration-300">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[#736B5E]">
            Room Readiness
            <Gauge className="size-4 text-[#8A9A6B]" />
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-4xl font-extrabold text-[#2A2620] tracking-tight">{kpiData.readiness}%</span>
            <span className="text-[10px] text-[#736B5E] font-medium">ready inventory</span>
          </div>
          <div className="w-full bg-[#F5F1E8] h-2 rounded-full overflow-hidden mt-4">
            <div 
              className="bg-[#8A9A6B] h-full transition-all duration-500" 
              style={{ width: `${kpiData.readiness}%` }}
            />
          </div>
        </Card>

        {/* KPI: Avg Turnaround */}
        <Card className="bg-white border-[#EBE3D1] p-5 rounded-2xl shadow-sm flex flex-col justify-between hover:shadow-md transition-all duration-300">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[#736B5E]">
            Avg Turnaround Time
            <Clock className="size-4 text-[#B5652F]" />
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-4xl font-extrabold text-[#2A2620] tracking-tight">{kpiData.avgTurn}m</span>
            <span className="text-[10px] text-[#736B5E] font-medium">actual vs 35m target</span>
          </div>
          <div className="w-full bg-[#F5F1E8] h-2 rounded-full overflow-hidden mt-4">
            <div 
              className="bg-[#B5652F] h-full transition-all duration-500" 
              style={{ width: `${Math.min(100, (kpiData.avgTurn / 45) * 100)}%` }}
            />
          </div>
        </Card>

        {/* KPI: VIP Arrivals */}
        <Card className="bg-white border-[#EBE3D1] p-5 rounded-2xl shadow-sm flex flex-col justify-between hover:shadow-md transition-all duration-300">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[#736B5E]">
            VIP / Urgent Arrivals
            <Crown className="size-4 text-[#B14A3E]" />
          </div>
          <div className="mt-4 flex flex-col">
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-extrabold text-[#2A2620] tracking-tight">{kpiData.vipCount}</span>
              <span className="text-[10px] text-[#736B5E] font-medium">pending turnaround</span>
            </div>
            <span className="text-[10px] text-[#B14A3E] font-semibold mt-1 truncate">{nextVipCountdown}</span>
          </div>
          <div className="w-full bg-[#F5F1E8] h-2 rounded-full overflow-hidden mt-4">
            <div 
              className="bg-[#B14A3E] h-full transition-all duration-500" 
              style={{ width: `${kpiData.vipCount ? Math.min(100, (kpiData.vipCount / 6) * 100) : 0}%` }}
            />
          </div>
        </Card>

        {/* KPI: Staff Utilization */}
        <Card className="bg-white border-[#EBE3D1] p-5 rounded-2xl shadow-sm flex flex-col justify-between hover:shadow-md transition-all duration-300">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[#736B5E]">
            Staff Workload Registry
            <Users className="size-4 text-[#B5652F]" />
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-4xl font-extrabold text-[#2A2620] tracking-tight">{kpiData.utilization}%</span>
            <span className="text-[10px] text-[#736B5E] font-medium">workload balancing index</span>
          </div>
          <div className="w-full bg-[#F5F1E8] h-2 rounded-full overflow-hidden mt-4">
            <div 
              className="bg-[#B5652F] h-full transition-all duration-500" 
              style={{ width: `${kpiData.utilization}%` }}
            />
          </div>
        </Card>
      </div>

      {/* 1.5. GUEST REQUESTS & SERVICE DISPATCH HUB */}
      <Card className="bg-white border-2 border-[#B5652F] p-5 rounded-2xl shadow-md space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#F5F1E8] pb-3">
          <div className="flex items-center gap-2">
            <span className="flex h-3 w-3 rounded-full bg-[#B5652F] animate-ping" />
            <div>
              <h3 className="font-extrabold text-sm text-[#2A2620] uppercase tracking-wider flex items-center gap-1.5">
                <Bell className="size-4 text-[#B5652F]" />
                <span>Guest Requests & Service Dispatch Hub ({guestRequests.filter((r) => r.status !== "Completed").length})</span>
              </h3>
              <p className="text-[10px] text-[#736B5E] font-medium mt-0.5">
                Live tracking for towel orders, broken room service, AC/TV issues & guest requests
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                playSupervisorRingerSound();
                toast.info("🔊 Playing 3.5s Supervisor Hotel Chime Ringer...");
              }}
              className="h-8 border-[#B5652F] text-[#B5652F] hover:bg-[#B5652F]/10 font-bold text-xs rounded-xl px-2.5 flex items-center gap-1 cursor-pointer"
              title="Test Supervisor Alert Sound"
            >
              <Volume2 className="size-3.5 animate-bounce" />
              <span>🔊 Test 3s Ringer</span>
            </Button>
            <Badge className="bg-[#B5652F] text-white font-mono text-[10px]">
              {guestRequests.filter((r) => r.status === "Open").length} Open for Dispatch
            </Badge>
            <Button
              size="sm"
              onClick={() => setNewReqModalOpen(true)}
              className="h-8 bg-[#B5652F] hover:bg-[#B5652F]/90 text-white font-bold text-xs rounded-xl px-3 flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Plus className="size-3.5" />
              <span>Log Guest Request</span>
            </Button>
          </div>
        </div>

        {/* Pulsing Active Ringer Sound Alert Banner */}
        {ringerAlert && (
          <div className="p-3 bg-gradient-to-r from-[#B5652F] via-[#B14A3E] to-[#B5652F] text-white rounded-xl shadow-lg flex items-center justify-between animate-pulse">
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-lg bg-white/20 text-white font-bold text-sm">
                🔔
              </span>
              <div>
                <strong className="text-xs font-black uppercase tracking-wider block">
                  3s RINGER ALERT: New Request Submitted!
                </strong>
                <span className="text-[11px] font-medium opacity-90">
                  Suite {ringerAlert.roomNumber} requested "{ringerAlert.item}"
                </span>
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => handleRunBatchEngine()}
              className="h-7 text-xs font-extrabold bg-white text-[#B5652F] hover:bg-white/90 rounded-lg px-2.5 cursor-pointer shadow-xs"
            >
              ⚡ Auto-Dispatch Now
            </Button>
          </div>
        )}

        {guestRequests.filter((r) => r.status !== "Completed").length === 0 ? (
          <div className="p-6 bg-[#F5F1E8]/30 border border-dashed border-[#EBE3D1] rounded-xl text-center">
            <CheckCircle2 className="size-6 text-[#8A9A6B] mx-auto mb-1.5" />
            <h4 className="text-xs font-bold text-[#2A2620]">All Guest Requests & Service Tickets Resolved!</h4>
            <p className="text-[11px] text-[#736B5E] mt-0.5">No open requests for towels, broken amenities, or maintenance.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {guestRequests.filter((r) => r.status !== "Completed").map((req) => {
              const ranked = rankStaffForRequest(req, staff, guestRequests);
              const topRunner = ranked[0] || null;

              const categoryBadgeStyle = 
                req.category === "Maintenance" ? "bg-[#B14A3E]/10 text-[#B14A3E] border-[#B14A3E]/20" :
                req.category === "Amenities" ? "bg-[#8A9A6B]/15 text-[#8A9A6B] border-[#8A9A6B]/30" :
                req.category === "Food Service" ? "bg-[#B5652F]/15 text-[#B5652F] border-[#B5652F]/30" :
                "bg-[#F5F1E8] text-[#736B5E] border-[#EBE3D1]";

              const categoryIcon = 
                req.category === "Maintenance" ? "🔧" :
                req.category === "Amenities" ? "🧹" :
                req.category === "Food Service" ? "🍽" :
                "🛎";

              return (
                <div key={req.id} className="p-3.5 bg-white border border-[#EBE3D1] rounded-xl shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between gap-2.5">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Badge className="bg-[#2A2620] text-white font-extrabold text-[9px] uppercase">
                        Suite {req.roomNumber}
                      </Badge>
                      <Badge variant="outline" className={`text-[9px] font-bold ${categoryBadgeStyle}`}>
                        {categoryIcon} {req.category}
                      </Badge>
                    </div>

                    <h4 className="font-extrabold text-xs text-[#2A2620] mt-1">{req.item}</h4>
                    {req.details && <p className="text-[10px] text-[#736B5E] italic leading-tight">{req.details}</p>}
                  </div>

                  {/* Assignment state or AI Match pill */}
                  {req.assignedStaff ? (
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#8A9A6B] bg-[#8A9A6B]/10 p-2 rounded-lg border border-[#8A9A6B]/20">
                      <CheckCircle2 className="size-3.5" />
                      <span>Assigned to {req.assignedStaff}</span>
                    </div>
                  ) : (
                    <div className="space-y-2 pt-1 border-t border-[#EBE3D1]">
                      {topRunner && (
                        <span className="text-[9px] font-extrabold text-[#8A9A6B] bg-[#8A9A6B]/15 px-2 py-0.5 rounded-md flex items-center gap-1">
                          <Sparkles className="size-3 text-[#B5652F]" />
                          ⚡ AI Match: {topRunner.staffName} (Floor {topRunner.currentFloor} • ETA {topRunner.etaMinutes}m)
                        </span>
                      )}

                      <div className="flex items-center gap-1.5">
                        {topRunner && (
                          <Button
                            size="sm"
                            onClick={() => assignTaskToStaff(req.id, topRunner.staffId, topRunner.staffName)}
                            className="h-7 text-[9px] font-black bg-[#B5652F] hover:bg-[#B5652F]/90 text-white rounded-lg px-2 flex-1 cursor-pointer"
                          >
                            ⚡ 1-Tap Auto-Assign
                          </Button>
                        )}
                        <Select
                          value={req.assignedStaff || "none"}
                          onValueChange={(val) => {
                            const staffName = val === "none" ? null : val;
                            assignGuestRequest(req.id, staffName);
                          }}
                        >
                          <SelectTrigger className="h-8 text-xs border-[#EBE3D1] bg-white text-[#2A2620] font-bold min-w-[135px] rounded-xl shadow-xs">
                            <SelectValue placeholder="Assign Staff..." />
                          </SelectTrigger>
                          <SelectContent className="bg-white border-[#EBE3D1]">
                            <SelectItem value="none" className="text-xs font-semibold">Unassigned</SelectItem>
                            {staff.filter((s) => s.active).map((s) => (
                              <SelectItem key={s.id} value={s.name} className="text-xs font-bold">
                                {s.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* 2. UNIFIED OPERATIONS CONTROL BAR */}
      <Card className="bg-white border-[#EBE3D1] p-4 rounded-2xl shadow-sm flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        
        {/* Left: Dynamic Search & Floor Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#736B5E]" />
            <Input 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search room, staff, guest..." 
              className="pl-9 h-10 border-[#EBE3D1] rounded-xl text-xs bg-[#F5F1E8]/30 focus:border-[#B5652F] focus:ring-0 text-[#2A2620]"
            />
          </div>

          <div className="flex items-center p-1 bg-[#F5F1E8]/60 border border-[#EBE3D1] rounded-xl self-start sm:self-auto">
            {["All", 1, 2, 3, 4].map((f) => (
              <button
                key={f}
                onClick={() => setSelectedFloor(f as any)}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                  selectedFloor === f 
                    ? "bg-[#B5652F] text-white shadow-sm" 
                    : "text-[#736B5E] hover:text-[#2A2620]"
                }`}
              >
                {f === "All" ? "All Floors" : `F${f}`}
              </button>
            ))}
          </div>
        </div>

        {/* Center: Status Filter Pills with indicator dots */}
        <div className="flex flex-wrap items-center gap-1.5 py-1">
          {[
            { id: "All", label: "All Rooms" },
            { id: "Vacant Dirty", label: "Dirty", color: "bg-[#B14A3E]" },
            { id: "Cleaning in Progress", label: "Cleaning", color: "bg-[#B5652F]" },
            { id: "Inspection Pending", label: "Inspect", color: "bg-amber-500 animate-pulse" },
            { id: "Ready for Guest", label: "Ready", color: "bg-[#8A9A6B]" },
            { id: "Maintenance Blocked", label: "Blocked", color: "bg-[#736B5E]" }
          ].map((st) => (
            <button
              key={st.id}
              onClick={() => setSelectedStatus(st.id as any)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl border transition-all ${
                selectedStatus === st.id
                  ? "bg-[#2A2620] text-white border-[#2A2620]"
                  : "bg-white border-[#EBE3D1] text-[#736B5E] hover:text-[#2A2620] hover:border-[#736B5E]"
              }`}
            >
              {st.color && <span className={`size-2 rounded-full ${st.color}`} />}
              {st.label}
            </button>
          ))}
        </div>

        {/* Right: Action Buttons */}
        <div className="flex items-center gap-2 self-end lg:self-auto">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setAddRoomOpen(true)}
            className="h-10 border-[#EBE3D1] text-[#2A2620] font-semibold text-xs px-3 rounded-xl hover:bg-[#F5F1E8]/30 flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="size-3.5" /> Room
          </Button>

          <label className="h-10 border border-[#EBE3D1] text-[#2A2620] hover:bg-[#F5F1E8]/30 font-semibold text-xs px-3 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-colors bg-white">
            <FileSpreadsheet className="size-3.5" /> Import Excel
            <input type="file" accept=".csv,.xlsx" onChange={triggerCsvImport} className="hidden" />
          </label>

          <Button 
            size="sm"
            onClick={handleRunBatchEngine}
            className="h-10 bg-[#B5652F] hover:bg-[#B5652F]/90 text-white font-extrabold text-xs px-4 rounded-xl flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Sparkles className="size-3.5 text-amber-300 animate-pulse" />
            <span>⚡ Run AI Auto-Dispatch Engine</span>
          </Button>
        </div>
      </Card>

      {/* 3. MAIN WORKSPACE GRID LAYOUT (Left 70% Rooms | Right 30% AI Inspection Review & Housekeepers) */}
      <div className="flex flex-col xl:flex-row gap-6 items-stretch">
        
        {/* LEFT COLUMN: Main Room Matrix Grid (70%) */}
        <div className="xl:w-[70%] flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold tracking-tight text-[#2A2620]">
              Operational Room Matrix ({sortedRooms.length} listed)
            </h2>
            {selectedStatus !== "All" && (
              <Badge className="bg-[#B5652F]/10 text-[#B5652F] border border-[#B5652F]/20 font-semibold">
                Status: {selectedStatus}
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedRooms.map((room) => {
              // Calculate breach threshold for active cleaning rooms
              let cleaningPercent = 0;
              let isTimeBreached = false;
              if (room.status === "Cleaning in Progress") {
                const elapsedSec = cleaningElapsed[room.id] || 0;
                const elapsedMin = elapsedSec / 60;
                const limit = room.turnaround || 30;
                cleaningPercent = Math.min(100, Math.round((elapsedMin / limit) * 100));
                
                // Terracotta red alert if elapsed time exceeds 80%
                if (cleaningPercent >= 80) {
                  isTimeBreached = true;
                }
              }

              // Color styles based on status
              let cardBorder = "border-[#EBE3D1]";
              let statusBadge = "bg-[#736B5E]/10 text-[#736B5E]";
              if (room.status === "Vacant Dirty") {
                cardBorder = "border-[#B14A3E]/30 hover:border-[#B14A3E]/60";
                statusBadge = "bg-[#B14A3E]/10 text-[#B14A3E] border-[#B14A3E]/20";
              } else if (room.status === "Cleaning in Progress") {
                cardBorder = isTimeBreached 
                  ? "border-[#B14A3E] ring-1 ring-[#B14A3E]/30" 
                  : "border-[#B5652F]/30 hover:border-[#B5652F]/60";
                statusBadge = "bg-[#B5652F]/10 text-[#B5652F] border-[#B5652F]/20";
              } else if (room.status === "Inspection Pending") {
                cardBorder = "border-amber-400 ring-2 ring-amber-100 animate-pulse";
                statusBadge = "bg-amber-100 text-amber-800 border-amber-300";
              } else if (room.status === "Ready for Guest") {
                cardBorder = "border-[#8A9A6B]/30 hover:border-[#8A9A6B]/60";
                statusBadge = "bg-[#8A9A6B]/15 text-[#8A9A6B] border-[#8A9A6B]/35 font-bold";
              } else if (room.status === "Maintenance Blocked") {
                cardBorder = "border-[#736B5E]/30 hover:border-[#736B5E]/60 bg-[#736B5E]/5";
                statusBadge = "bg-[#736B5E]/10 text-[#736B5E] border-[#736B5E]/20";
              }

              return (
                <Card 
                  key={room.id}
                  className={`bg-white rounded-2xl ${cardBorder} border p-4 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between relative overflow-hidden`}
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-[#2A2620] tracking-tight">Room {room.number}</span>
                        {room.priority === "VIP" && (
                          <Badge className="bg-[#B14A3E] text-white text-[9px] font-bold py-0 px-1.5 uppercase rounded-md tracking-wider flex items-center gap-0.5">
                            <Crown className="size-2.5 shrink-0" /> VIP
                          </Badge>
                        )}
                      </div>
                      <p className="text-[10px] text-[#736B5E] font-medium">{room.type} • Floor {room.floor}</p>
                    </div>
                    
                    <Badge variant="outline" className={`${statusBadge} text-[10px] py-0.5 px-2 rounded-lg font-semibold uppercase tracking-wider`}>
                      {room.status === "Cleaning in Progress" && room.turnaround 
                        ? `Cleaning (${room.turnaround}m)`
                        : room.status
                      }
                    </Badge>
                  </div>

                  {/* Card Body */}
                  <div className="my-4 space-y-2 text-xs flex-1">
                    
                    {/* Assigned Cleaner */}
                    <div className="flex items-center justify-between text-[#736B5E]">
                      <span>Housekeeper:</span>
                      <span className="font-bold text-[#2A2620]">
                        {room.assignedStaff ? room.assignedStaff : <span className="text-[#B14A3E] font-semibold italic">Unassigned</span>}
                      </span>
                    </div>

                    {/* ETA Check-In */}
                    <div className="flex items-center justify-between text-[#736B5E]">
                      <span>Check-In ETA:</span>
                      <span className="font-bold text-[#2A2620]">
                        {room.checkIn && room.checkIn !== "—" ? room.checkIn : "Not scheduled"}
                      </span>
                    </div>

                    {/* Priority Dispatch Score info for Unassigned / Dirty rooms */}
                    {room.status === "Vacant Dirty" && (
                      <div className="p-2 bg-[#F5F1E8]/50 border border-[#EBE3D1] rounded-xl mt-3 text-[10px]">
                        <div className="flex items-center justify-between font-bold text-[#2A2620]">
                          <span>Priority dispatch score:</span>
                          <span className="text-[#B5652F]">{room.priorityScore} pts</span>
                        </div>
                        <p className="text-[9px] text-[#736B5E] mt-1 italic leading-snug">
                          {room.priorityReason}
                        </p>
                      </div>
                    )}

                    {/* Active Timer and estimated breach bar */}
                    {room.status === "Cleaning in Progress" && (
                      <div className="space-y-2 mt-3">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="text-[#736B5E]">Estimated Clean Timer:</span>
                            <span className={`font-mono font-bold ${isTimeBreached ? "text-[#B14A3E]" : "text-[#B5652F]"}`}>
                              {Math.floor((cleaningElapsed[room.id] || 0) / 60)}m elapsed / {room.turnaround}m target
                            </span>
                          </div>
                          <div className="w-full bg-[#F5F1E8] h-1.5 rounded-full overflow-hidden">
                            <div 
                              className={`h-full transition-all duration-300 ${isTimeBreached ? "bg-[#B14A3E]" : "bg-[#B5652F]"}`}
                              style={{ width: `${cleaningPercent}%` }}
                            />
                          </div>
                        </div>

                        {/* Live SOP Stage Bar */}
                        <div className="space-y-1 border-t border-[#F5F1E8] pt-1.5">
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="text-[#736B5E] font-medium">SOP Stage:</span>
                            <span className="font-bold text-[#8A9A6B]">
                              {room.completedSopSteps ? `Step ${room.completedSopSteps.length}/4 Done (${Math.round((room.completedSopSteps.length / 4) * 100)}%)` : "Step 0/4 Done (0%)"}
                            </span>
                          </div>
                          <div className="w-full bg-[#F5F1E8] h-1.5 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[#8A9A6B] transition-all duration-300"
                              style={{ width: `${Math.round(((room.completedSopSteps?.length || 0) / 4) * 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Breached Warning Badge */}
                    {isTimeBreached && (
                      <div className="flex items-center gap-1.5 p-2 bg-[#B14A3E]/10 border border-[#B14A3E]/20 text-[#B14A3E] text-[10px] font-bold rounded-xl mt-3">
                        <AlertTriangle className="size-3.5 shrink-0" />
                        <span>At-Risk ETA Breach (Exceeded 80% target turnaround!)</span>
                      </div>
                    )}

                    {/* AI Proximity & Availability Recommended Match */}
                    {room.status === "Vacant Dirty" && !room.assignedStaff && (() => {
                      const isVip = room.priority === "VIP";
                      const roomFloor = room.floor || Number(room.number[0]) || 1;
                      const bestMatch = findBestStaffMatch(room.number, roomFloor, isVip, staff, rooms, guestRequests);

                      if (!bestMatch) return null;

                      return (
                        <div className="mt-3 p-2 bg-[#8A9A6B]/10 border border-[#8A9A6B]/25 rounded-xl space-y-1.5">
                          <div className="flex items-center justify-between text-[9px] font-extrabold text-[#8A9A6B]">
                            <span className="flex items-center gap-1">
                              <Sparkles className="size-3 text-[#B5652F]" />
                              <span>⚡ AI Recommended Match</span>
                            </span>
                            <Badge className="bg-[#B5652F] text-white text-[8px] font-mono py-0 px-1.5">
                              Score: {bestMatch.calculatedScore}/100
                            </Badge>
                          </div>

                          <div className="text-[10px] font-bold text-[#2A2620] leading-tight">
                            {bestMatch.staffName} (Floor {bestMatch.currentFloor} • ⏱ ~{bestMatch.estimatedArrivalMin}m ETA)
                          </div>

                          <p className="text-[9px] text-[#736B5E] italic leading-tight" title={bestMatch.aiReasoning}>
                            💡 {bestMatch.aiReasoning}
                          </p>

                          <Button
                            size="sm"
                            onClick={() => assignRoom(room.id, bestMatch.staffName)}
                            className="w-full h-6 font-extrabold text-[9px] bg-[#B5652F] hover:bg-[#B5652F]/90 text-white rounded-lg cursor-pointer gap-1 shadow-xs"
                          >
                            <Sparkles className="size-2.5" />
                            <span>⚡ 1-Click Auto-Assign ({bestMatch.staffName})</span>
                          </Button>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Card Footer */}
                  <div className="border-t border-[#F5F1E8] pt-3 mt-1 flex items-center justify-between gap-2">
                    
                    {/* Action buttons */}
                    {room.status === "Inspection Pending" ? (
                      <Button
                        onClick={() => setSelectedInspectRoomId(room.id)}
                        className="w-full h-8 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-lg flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Sparkles className="size-3 cursor-pointer" /> Inspect QA Staging
                      </Button>
                    ) : (
                      <div className="flex items-center justify-between w-full">
                        {/* Assign Cleaner Quick Selector */}
                        <Select 
                          value={room.assignedStaff || "none"}
                          onValueChange={(val: string) => assignRoom(room.id, val === "none" ? null : val)}
                        >
                          <SelectTrigger className="min-w-[135px] h-8 text-xs border-[#EBE3D1] bg-white text-[#2A2620] font-bold rounded-xl shadow-xs">
                            <SelectValue placeholder="Assign Staff..." />
                          </SelectTrigger>
                          <SelectContent className="bg-white border-[#EBE3D1]">
                            <SelectItem value="none" className="text-[10px]">Unassigned</SelectItem>
                            {staff.filter(s => s.active).map(s => (
                              <SelectItem key={s.name} value={s.name} className="text-[10px]">
                                {s.name} ({s.workload}%)
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        {/* Room QR generator */}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setQrRoom(room)}
                          className="size-7 text-[#736B5E] hover:text-[#2A2620] rounded-lg cursor-pointer"
                        >
                          <QrCode className="size-4 shrink-0" />
                        </Button>
                      </div>
                    )}

                    {/* Manual Override Status Dropdown */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="size-8 rounded-lg text-[#736B5E] hover:text-[#2A2620] hover:bg-[#F5F1E8]/30 cursor-pointer shrink-0"
                        >
                          <MoreVertical className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-white border-[#EBE3D1] w-40 text-xs">
                        <DropdownMenuItem onClick={() => handleManualStatusChange(room.id, "Vacant Dirty")}>
                          Mark Dirty
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleManualStatusChange(room.id, "Cleaning in Progress")}>
                          Mark Cleaning
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleManualStatusChange(room.id, "Inspection Pending")}>
                          Force Inspection
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleManualStatusChange(room.id, "Ready for Guest")}>
                          Mark Ready / Release
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-[#B14A3E] font-semibold"
                          onClick={() => {
                            setMaintRoomId(room.id);
                            setMaintOpen(true);
                          }}
                        >
                          Log Maintenance Block
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        {/* RIGHT COLUMN: ACTIONABLE SUPERVISOR SIDEBAR (30%) */}
        <div className="xl:w-[30%] flex flex-col gap-6">
          
          {/* Panel A: Computer Vision / AI Inspection Review Queue */}
          <Card className="bg-white border-[#EBE3D1] p-5 rounded-2xl shadow-sm flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-[#F5F1E8] pb-3">
              <div className="flex items-center gap-1.5">
                <Sparkles className="size-4.5 text-[#B5652F]" />
                <h3 className="font-bold text-sm tracking-tight text-[#2A2620]">AI Vision Staging Review</h3>
              </div>
              <Badge className="bg-amber-500 text-white font-bold text-[10px] animate-pulse">
                {aiReviewQueue.length} pending
              </Badge>
            </div>

            {aiReviewQueue.length > 0 && activeInspectRoom ? (
              <div className="flex flex-col gap-4">
                
                {/* Micro selector list */}
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
                  {aiReviewQueue.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setSelectedInspectRoomId(item.id)}
                      className={`px-3 py-1 text-xs rounded-xl font-bold border transition-all shrink-0 ${
                        selectedInspectRoomId === item.id
                          ? "bg-amber-500 text-white border-amber-500 shadow-sm"
                          : "bg-white border-[#EBE3D1] text-[#736B5E] hover:text-[#2A2620]"
                      }`}
                    >
                      Room {item.number}
                    </button>
                  ))}
                </div>

                {/* Staging Photo with Overlay box bounding box */}
                <div className="relative aspect-video w-full rounded-xl overflow-hidden border border-[#EBE3D1] bg-[#F5F1E8]/50 flex items-center justify-center">
                  {activeInspectRoom.photoUrl ? (
                    <div className="relative w-full h-full">
                      <img 
                        src={activeInspectRoom.photoUrl} 
                        alt={`Room ${activeInspectRoom.number} Staging`} 
                        className="w-full h-full object-cover"
                      />
                      
                      {/* Bounding box layer overlays */}
                      {activeInspectRoom.aiQaBboxes?.map((box, i) => (
                        <div
                          key={i}
                          className="absolute border-2 border-[#B14A3E] bg-[#B14A3E]/20 flex flex-col justify-start pointer-events-none rounded"
                          style={{
                            left: `${box.x}%`,
                            top: `${box.y}%`,
                            width: `${box.width || 30}%`,
                            height: `${box.height || 30}%`,
                          }}
                        >
                          <span className="bg-[#B14A3E] text-white text-[8px] font-bold px-1 py-0.5 rounded-br w-max uppercase tracking-wider">
                            {box.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1.5 p-4 text-[#736B5E] text-center">
                      <Camera className="size-8" />
                      <span className="text-xs">No staging photo uploaded yet.</span>
                      <Button
                        size="sm"
                        onClick={() => {
                          setRoomPhotoAndRunAi(activeInspectRoom.id, "dirty_bed");
                          toast.success("Mocked staging photo upload.");
                        }}
                        className="mt-2 text-[10px] h-7 bg-[#B5652F] text-white cursor-pointer"
                      >
                        Simulate Staging Photo
                      </Button>
                    </div>
                  )}
                </div>

                {/* AI Review text details */}
                <div className="p-3.5 bg-[#F5F1E8]/50 border border-[#EBE3D1] rounded-xl text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#2A2620]">Gemini Visual Staging QA:</span>
                    <Badge className="bg-[#B14A3E]/15 text-[#B14A3E] border border-[#B14A3E]/20 font-bold text-[9px] uppercase tracking-wide">
                      FLAGGED DEFECT
                    </Badge>
                  </div>

                  {/* Detected issues badge pills */}
                  {activeInspectRoom.aiQaBboxes && activeInspectRoom.aiQaBboxes.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {activeInspectRoom.aiQaBboxes.map((b, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 bg-[#B14A3E]/10 border border-[#B14A3E]/25 text-[#B14A3E] px-2 py-0.5 rounded-md text-[9px] font-extrabold"
                        >
                          ⚠️ {b.label}
                        </span>
                      ))}
                    </div>
                  )}

                  <p className="text-[11px] text-[#736B5E] italic leading-relaxed">
                    "{activeInspectRoom.aiQaNotes || "Review staging photo carefully for wrinkles, dust, or unemptied trash bins."}"
                  </p>
                  <p className="text-[9px] text-[#736B5E] border-t border-[#EBE3D1] pt-1.5 mt-1.5">
                    Submitted by: <span className="font-semibold text-[#2A2620]">{activeInspectRoom.assignedStaff || "Ana Duarte"}</span>
                  </p>
                </div>

                {/* Approve/Reject CTA */}
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <Button
                    onClick={() => handleRejectInspection(activeInspectRoom.id)}
                    variant="outline"
                    className="border-[#B14A3E] text-[#B14A3E] hover:bg-[#B14A3E]/5 font-bold text-xs h-9 rounded-xl flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <XCircle className="size-3.5" /> Send Re-clean Request
                  </Button>
                  <Button
                    onClick={() => handleApproveInspection(activeInspectRoom.id)}
                    className="bg-[#8A9A6B] hover:bg-[#8A9A6B]/90 text-white font-bold text-xs h-9 rounded-xl flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <CheckCircle2 className="size-3.5 animate-pulse" /> Overrule & Approve
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center text-[#736B5E]">
                <Check className="size-8 text-[#8A9A6B] bg-[#8A9A6B]/10 p-1.5 rounded-full mb-2" />
                <p className="text-xs font-semibold text-[#2A2620]">Staging Queue Clear</p>
                <p className="text-[10px] text-[#736B5E] mt-1 max-w-[200px]">
                  All submitted room cleans have been processed or auto-released by Gemini QA.
                </p>
              </div>
            )}
          </Card>

          {/* Panel B: Live Staff Workload Registry */}
          <Card className="bg-white border-[#EBE3D1] p-5 rounded-2xl shadow-sm flex flex-col gap-4">
            <div className="flex items-center gap-1.5 border-b border-[#F5F1E8] pb-3">
              <Users className="size-4.5 text-[#B5652F]" />
              <h3 className="font-bold text-sm tracking-tight text-[#2A2620]">On-Duty Staff & Workload</h3>
            </div>

            <div className="space-y-3.5">
              {staff.map((member) => {
                let workloadColor = "bg-[#8A9A6B]";
                let workloadBg = "bg-[#8A9A6B]/10";
                if (member.workload > 85) {
                  workloadColor = "bg-[#B14A3E]";
                  workloadBg = "bg-[#B14A3E]/10";
                } else if (member.workload > 60) {
                  workloadColor = "bg-[#B5652F]";
                  workloadBg = "bg-[#B5652F]/10";
                }

                return (
                  <div key={member.id} className="flex flex-col gap-1 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`size-2 rounded-full ${member.active ? "bg-[#8A9A6B]" : "bg-[#736B5E]"}`} />
                        <span className="font-bold text-[#2A2620]">{member.name}</span>
                      </div>
                      
                      <div className="flex items-center gap-1.5">
                        <Badge className={`${workloadBg} ${workloadColor.replace("bg-", "text-")} hover:bg-transparent px-1.5 py-0 border-0 font-bold text-[9px]`}>
                          Workload: {member.workload}%
                        </Badge>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-[#736B5E] pl-4">
                      <span>Assigned Room: {member.currentRoom ? `Room ${member.currentRoom}` : "Break / Waiting"}</span>
                      <span>Turnarounds: {member.completed} rooms</span>
                    </div>

                    <div className="w-full bg-[#F5F1E8] h-1 rounded-full overflow-hidden mt-1 pl-4">
                      <div 
                        className={`h-full ${workloadColor}`} 
                        style={{ width: `${member.workload}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Panel C: Quick Action Panel */}
          <Card className="bg-[#B5652F]/5 border border-[#B5652F]/20 p-5 rounded-2xl shadow-sm flex flex-col gap-3">
            <h3 className="font-bold text-xs uppercase tracking-wider text-[#B5652F] flex items-center gap-1.5">
              <Wrench className="size-3.5" /> Maintenance Desk
            </h3>
            <p className="text-[11px] text-[#736B5E] leading-relaxed">
              Flag rooms needing urgent plumbing, HVAC, electrical, or structural repairs. Block them from immediate guest turnaround.
            </p>
            
            <Button
              onClick={() => {
                setMaintRoomId(rooms[0]?.id || "101");
                setMaintOpen(true);
              }}
              className="mt-1 w-full bg-[#B5652F] hover:bg-[#B5652F]/90 text-white font-bold text-xs h-9 rounded-xl flex items-center justify-center gap-1 cursor-pointer"
            >
              <Plus className="size-3.5" /> Log Maintenance Block / Ticket
            </Button>
          </Card>
        </div>
      </div>

      {/* 4. MODALS & DRAWERS */}
      
      {/* Modal A: Log Maintenance block */}
      <Dialog open={maintOpen} onOpenChange={setMaintOpen}>
        <DialogContent className="bg-white border-[#EBE3D1] max-w-sm rounded-2xl">
          <form onSubmit={handleMaintenanceSubmit} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-[#2A2620]">Log Maintenance Defect</DialogTitle>
              <DialogDescription className="text-xs text-[#736B5E]">
                This will block the room from reservations and move its state to Maintenance Blocked.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 text-xs">
              <div className="flex flex-col gap-1">
                <Label htmlFor="maint-room" className="font-bold text-[#2A2620]">Select Room #</Label>
                <Select value={maintRoomId} onValueChange={setMaintRoomId}>
                  <SelectTrigger id="maint-room" className="border-[#EBE3D1]">
                    <SelectValue placeholder="Select Room" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-[#EBE3D1]">
                    {rooms.map((r) => (
                      <SelectItem key={r.id} value={r.id}>Room {r.number} ({r.status})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1">
                <Label htmlFor="maint-note" className="font-bold text-[#2A2620]">Defect Description / Issue Notes</Label>
                <Textarea 
                  id="maint-note"
                  placeholder="e.g. Broken shower head, AC unit blowing warm air..."
                  value={maintNote}
                  onChange={(e) => setMaintNote(e.target.value)}
                  className="border-[#EBE3D1] min-h-[80px]"
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setMaintOpen(false)}
                className="border-[#EBE3D1] text-xs h-9 rounded-xl cursor-pointer"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="bg-[#B14A3E] hover:bg-[#B14A3E]/90 text-white text-xs h-9 rounded-xl cursor-pointer"
              >
                Log Defect & Block
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal B: Add Custom Room */}
      <Dialog open={addRoomOpen} onOpenChange={setAddRoomOpen}>
        <DialogContent className="bg-white border-[#EBE3D1] max-w-sm rounded-2xl">
          <form onSubmit={handleAddRoomSubmit} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-[#2A2620]">Add New Room Profile</DialogTitle>
              <DialogDescription className="text-xs text-[#736B5E]">
                Register a new room to the real-time operational dashboard.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <Label htmlFor="add-num" className="font-bold text-[#2A2620]">Room Number</Label>
                  <Input 
                    id="add-num" 
                    placeholder="e.g. 308" 
                    value={newRoomNum}
                    onChange={(e) => setNewRoomNum(e.target.value)}
                    className="border-[#EBE3D1]"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <Label htmlFor="add-type" className="font-bold text-[#2A2620]">Room Type</Label>
                  <Select value={newRoomType} onValueChange={(v: string) => setNewRoomType(v as RoomType)}>
                    <SelectTrigger id="add-type" className="border-[#EBE3D1]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-[#EBE3D1]">
                      <SelectItem value="Standard">Standard</SelectItem>
                      <SelectItem value="Deluxe">Deluxe</SelectItem>
                      <SelectItem value="Suite">Suite</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <Label htmlFor="add-priority" className="font-bold text-[#2A2620]">Priority Tag</Label>
                  <Select value={newRoomPriority} onValueChange={(v: string) => setNewRoomPriority(v as PriorityTag)}>
                    <SelectTrigger id="add-priority" className="border-[#EBE3D1]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-[#EBE3D1]">
                      <SelectItem value="Regular">Regular</SelectItem>
                      <SelectItem value="VIP">VIP</SelectItem>
                      <SelectItem value="Early Arrival">Early Arrival</SelectItem>
                      <SelectItem value="Overdue">Overdue</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1">
                  <Label htmlFor="add-checkin" className="font-bold text-[#2A2620]">Check-In Time</Label>
                  <Input 
                    id="add-checkin" 
                    type="text" 
                    placeholder="HH:MM" 
                    value={newRoomCheckIn}
                    onChange={(e) => setNewRoomCheckIn(e.target.value)}
                    className="border-[#EBE3D1]"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <Label htmlFor="add-guest" className="font-bold text-[#2A2620]">Expected Guest Name</Label>
                <Input 
                  id="add-guest" 
                  placeholder="e.g. Robert De Niro" 
                  value={newRoomGuest}
                  onChange={(e) => setNewRoomGuest(e.target.value)}
                  className="border-[#EBE3D1]"
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setAddRoomOpen(false)}
                className="border-[#EBE3D1] text-xs h-9 rounded-xl cursor-pointer"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="bg-[#B5652F] hover:bg-[#B5652F]/90 text-white text-xs h-9 rounded-xl cursor-pointer"
              >
                Add Room
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal C: Room QRs Cards dialog */}
      <Dialog open={!!qrRoom} onOpenChange={() => setQrRoom(null)}>
        <DialogContent className="bg-white border-[#EBE3D1] max-w-sm rounded-2xl flex flex-col items-center">
          {qrRoom && (
            <div className="w-full flex flex-col items-center gap-4">
              <DialogHeader className="text-center w-full">
                <DialogTitle className="text-base font-bold text-[#2A2620]">Generate Door QR Code</DialogTitle>
                <DialogDescription className="text-xs text-[#736B5E]">
                  Scan to auto-checkin to Room {qrRoom.number} staging flow.
                </DialogDescription>
              </DialogHeader>

              <div className="p-4 border border-[#EBE3D1] rounded-2xl bg-white shadow-sm flex flex-col items-center">
                 <RoomQrCard roomNumber={qrRoom.number} roomType={qrRoom.type} />
              </div>

              <Button
                onClick={() => {
                  window.print();
                  toast.info("Sent check-in QR sheet to print spooler.");
                }}
                className="w-full bg-[#2A2620] text-white hover:bg-[#2A2620]/90 text-xs h-9 rounded-xl flex items-center justify-center gap-1 cursor-pointer"
              >
                <Printer className="size-3.5" /> Print QR Sticker Sheet
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal D: Inspection Review Modal */}
      <Dialog open={!!selectedInspectRoomId} onOpenChange={() => setSelectedInspectRoomId(null)}>
        <DialogContent className="bg-white border-[#EBE3D1] max-w-md rounded-2xl">
          {(() => {
            const inspectRoom = rooms.find((r) => r.id === selectedInspectRoomId);
            if (!inspectRoom) return null;
            return (
              <div className="space-y-4">
                <DialogHeader>
                  <DialogTitle className="text-base font-black text-[#2A2620] flex items-center justify-between">
                    <span>Room {inspectRoom.number} QA Inspection</span>
                    <Badge className="bg-[#B5652F] text-white text-[9px] uppercase tracking-wider">
                      {inspectRoom.type} • Floor {inspectRoom.floor}
                    </Badge>
                  </DialogTitle>
                  <DialogDescription className="text-xs text-[#736B5E]">
                    Review AI Computer Vision staging audit and approve or request re-clean.
                  </DialogDescription>
                </DialogHeader>

                {/* Photo Thumbnail Viewfinder */}
                <div className="relative aspect-video w-full rounded-2xl overflow-hidden border border-[#EBE3D1] bg-[#F5F1E8]">
                  <img
                    src={inspectRoom.photoUrl || "https://images.unsplash.com/photo-1598928506311-c55ded91a20c?q=80&w=800"}
                    alt="Room Staging Scan"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 right-2">
                    <Badge className={inspectRoom.aiQaStatus === "PASSED" ? "bg-[#8A9A6B] text-white text-[9px] font-extrabold" : "bg-[#B14A3E] text-white text-[9px] font-extrabold"}>
                      {inspectRoom.aiQaStatus === "PASSED" ? "✨ AI PASS" : "⚠ AI FLAGGED"}
                    </Badge>
                  </div>
                </div>

                {/* Notes & Flaws */}
                <div className="p-3 bg-[#F5F1E8]/50 border border-[#EBE3D1] rounded-xl text-xs space-y-1">
                  <span className="font-extrabold text-[#2A2620]">AI Diagnosis Notes:</span>
                  <p className="text-[11px] text-[#736B5E] italic leading-relaxed">
                    "{inspectRoom.aiQaNotes || "Linens rumpled on right side of bed. Unemptied trash near work desk."}"
                  </p>
                </div>

                {/* Actions */}
                <DialogFooter className="gap-2 flex-col sm:flex-row">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      const note = prompt("Enter re-clean instructions for housekeeper:", "Please straighten bed linens and empty trash.") || "Please straighten bed linens.";
                      rejectRecleanRoom(inspectRoom.id, note);
                      setSelectedInspectRoomId(null);
                    }}
                    className="border-[#B14A3E] text-[#B14A3E] hover:bg-[#B14A3E]/10 font-bold text-xs h-10 rounded-xl cursor-pointer flex-1"
                  >
                    <AlertTriangle className="size-4 mr-1" /> Reject & Re-Clean
                  </Button>

                  <Button
                    type="button"
                    onClick={() => {
                      overruleApproveRoom(inspectRoom.id);
                      setSelectedInspectRoomId(null);
                    }}
                    className="bg-[#8A9A6B] hover:bg-[#8A9A6B]/90 text-white font-bold text-xs h-10 rounded-xl cursor-pointer flex-1 shadow-sm"
                  >
                    <CheckCircle2 className="size-4 mr-1" /> Overrule & Approve
                  </Button>
                </DialogFooter>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* LOG GUEST REQUEST DIALOG */}
      <Dialog open={newReqModalOpen} onOpenChange={setNewReqModalOpen}>
        <DialogContent className="bg-white border-[#EBE3D1] sm:max-w-md select-none">
          <DialogHeader>
            <DialogTitle className="text-base font-extrabold text-[#2A2620] flex items-center gap-2">
              <Bell className="size-5 text-[#B5652F]" />
              <span>Log Incoming Guest Request / Service Issue</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-[#736B5E]">
              Log towel orders, broken room service, AC/TV repairs, or guest phone calls.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!newReqItem.trim()) return;
              addGuestRequest(
                newReqRoom,
                newReqCategory,
                newReqItem,
                newReqDetails || "Logged directly by Operations Supervisor.",
                "Medium"
              );
              toast.success(`Logged & Dispatched: "${newReqItem}" for Room ${newReqRoom}`);
              setNewReqItem("");
              setNewReqDetails("");
              setNewReqModalOpen(false);
            }}
            className="space-y-4 py-2"
          >
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-bold text-[#2A2620]">Room Number</Label>
                <Select value={newReqRoom} onValueChange={setNewReqRoom}>
                  <SelectTrigger className="h-9 text-xs border-[#EBE3D1]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-[#EBE3D1]">
                    {rooms.map((r) => (
                      <SelectItem key={r.id} value={r.number} className="text-xs">
                        Room {r.number} ({r.type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-[#2A2620]">Category</Label>
                <Select value={newReqCategory} onValueChange={(val: any) => setNewReqCategory(val)}>
                  <SelectTrigger className="h-9 text-xs border-[#EBE3D1]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-[#EBE3D1]">
                    <SelectItem value="Amenities" className="text-xs">🧹 Amenities (Towels, Soap)</SelectItem>
                    <SelectItem value="Maintenance" className="text-xs">🔧 Maintenance (AC, TV, Plumbing)</SelectItem>
                    <SelectItem value="Food Service" className="text-xs">🍽 Food Service (Dining, Ice)</SelectItem>
                    <SelectItem value="Luggage" className="text-xs">🧳 Luggage / Desk</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-[#2A2620]">Request Title / Issue Description</Label>
              <Input
                placeholder="e.g. 3 Fresh Bath Towels, AC not cooling, TV no signal..."
                value={newReqItem}
                onChange={(e) => setNewReqItem(e.target.value)}
                className="h-9 text-xs border-[#EBE3D1]"
                required
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-[#2A2620]">Additional Notes (Optional)</Label>
              <Textarea
                placeholder="e.g. Guest requested delivery within 10 minutes..."
                value={newReqDetails}
                onChange={(e) => setNewReqDetails(e.target.value)}
                className="text-xs border-[#EBE3D1] resize-none h-16"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setNewReqModalOpen(false)}
                className="h-9 text-xs border-[#EBE3D1] cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="h-9 text-xs font-extrabold bg-[#B5652F] hover:bg-[#B5652F]/90 text-white cursor-pointer"
              >
                Dispatch Request
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      {/* BATCH AI AUTO-DISPATCH SUMMARY SHEET MODAL */}
      <Dialog open={batchModalOpen} onOpenChange={setBatchModalOpen}>
        <DialogContent className="bg-white border-[#EBE3D1] sm:max-w-lg select-none">
          <DialogHeader>
            <DialogTitle className="text-base font-extrabold text-[#2A2620] flex items-center gap-2">
              <Sparkles className="size-5 text-[#B5652F] animate-pulse" />
              <span>AI Auto-Dispatch Optimization Summary</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-[#736B5E]">
              Evaluated floor proximity, active task counts, shift status & VIP QA pass rates across all active staff.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 max-h-[380px] overflow-y-auto pr-1">
            {batchList.length === 0 ? (
              <div className="p-6 text-center bg-[#F5F1E8]/40 border border-dashed border-[#EBE3D1] rounded-xl">
                <CheckCircle2 className="size-6 text-[#8A9A6B] mx-auto mb-1.5" />
                <h4 className="text-xs font-bold text-[#2A2620]">All Tasks & Rooms Already Assigned!</h4>
                <p className="text-[10px] text-[#736B5E] mt-0.5">No unassigned "Vacant Dirty" rooms or open guest requests.</p>
              </div>
            ) : (
              batchList.map((item, idx) => (
                <div key={idx} className="p-3 bg-[#F5F1E8]/40 border border-[#EBE3D1] rounded-xl flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-xs text-[#2A2620]">{item.targetLabel}</span>
                    <Badge className="bg-[#B5652F] text-white font-mono text-[9px]">
                      Score: {item.match.calculatedScore}/100
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between text-[11px] bg-white p-2 rounded-lg border border-[#EBE3D1]">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-[#2A2620]">➔ {item.match.staffName}</span>
                      <span className="text-[10px] text-[#736B5E]">(Floor {item.match.currentFloor})</span>
                    </div>
                    <span className="text-[10px] font-bold text-[#8A9A6B]">⏱ ~{item.match.estimatedArrivalMin}m ETA</span>
                  </div>

                  <p className="text-[10px] text-[#736B5E] italic">
                    💡 {item.match.aiReasoning}
                  </p>
                </div>
              ))
            )}
          </div>

          <DialogFooter className="pt-2 flex items-center justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => setBatchModalOpen(false)}
              className="h-9 text-xs border-[#EBE3D1] cursor-pointer"
            >
              Dismiss
            </Button>
            {batchList.length > 0 && (
              <Button
                type="button"
                onClick={handleConfirmBatchDispatch}
                className="h-9 text-xs font-extrabold bg-[#B5652F] hover:bg-[#B5652F]/90 text-white cursor-pointer gap-1.5 shadow-sm"
              >
                <Sparkles className="size-3.5" />
                <span>Confirm All ({batchList.length}) Dispatches</span>
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
