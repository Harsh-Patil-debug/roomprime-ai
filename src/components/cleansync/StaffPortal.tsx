import { useState, useEffect, useMemo } from "react";
import { 
  Camera, CheckCircle2, Crown, Timer, ClipboardCheck, Sparkles, 
  AlertTriangle, User, ChevronRight, Clock, Power, ShieldAlert,
  Wifi, WifiOff, RefreshCw, Check, CheckCircle, HelpCircle, Ban, Wrench
} from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useRoomFlow, STAFF_PHONES } from "./store";
import { calculatePriorityScore, evaluateAiScore, transitionRoomState } from "@/lib/dispatchEngine";
import { type Room, type RoomStatus, type GuestRequest } from "@/lib/cleansync-data";

export function StaffPortal() {
  const {
    rooms,
    staff,
    setRoomStatus,
    setRoomPhotoAndRunAi,
    blockRoom,
    simulateIncomingWhatsApp,
  } = useRoomFlow();

  // Selector for simulation: who is the active housekeeper using the mobile app
  const [selectedStaffName, setSelectedStaffName] = useState<string>("Ana Duarte");
  const activeWorker = useMemo(() => {
    return staff.find((s) => s.name === selectedStaffName) || staff[0]!;
  }, [staff, selectedStaffName]);

  // Offline capability state
  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [offlineSyncQueue, setOfflineSyncQueue] = useState<any[]>([]);

  // Room clean stopwatch state
  const [activeRoomSeconds, setActiveRoomSeconds] = useState(0);

  // Active SOP steps completed
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  
  // Staging Photo state
  const [stagingPhotoType, setStagingPhotoType] = useState<"clean" | "dirty_bed" | "dirty_trash" | null>(null);
  const [aiScore, setAiScore] = useState<number | null>(null);
  const [aiNotes, setAiNotes] = useState<string | null>(null);
  const [aiPassed, setAiPassed] = useState<boolean | null>(null);
  const [isAiScanning, setIsAiScanning] = useState(false);

  // Maintenance Dialog
  const [defectOpen, setDefectOpen] = useState(false);
  const [defectNote, setDefectNote] = useState("");

  // Scan QR Code simulator
  const [qrScannerOpen, setQrScannerOpen] = useState(false);
  const [scannedRoomNum, setScannedRoomNum] = useState("");

  // SOP Steps
  const SOP_STEPS = [
    "1. Linen Stripping & Trash Removal",
    "2. Bathroom Disinfection & Sanitization",
    "3. Amenity Restocking (Towels, Toiletries, Water)",
    "4. Final Polish, Vacuum & Staging"
  ];

  // Retrieve housekeeper phone
  const workerPhone = STAFF_PHONES[activeWorker.name] || "+15551010001";

  // Filter and sort assigned rooms using the Priority Scoring Engine
  const assignedRooms = useMemo(() => {
    return rooms.filter((r) => r.assignedStaff === activeWorker.name);
  }, [rooms, activeWorker.name]);

  // Find currently active room in progress
  const activeRoom = useMemo(() => {
    return assignedRooms.find((r) => r.status === "Cleaning in Progress") || null;
  }, [assignedRooms]);

  // Priority Queue of upcoming rooms
  const upcomingQueue = useMemo(() => {
    const pending = assignedRooms.filter(
      (r) => r.status !== "Ready for Guest" && r.status !== "Cleaning in Progress" && r.status !== "Inspection Pending"
    );

    // Calculate priority scores and enrich with reasons
    return pending.map((r) => {
      const breakdown = calculatePriorityScore(r, activeRoom?.number || null, "13:00");
      return {
        ...r,
        priorityScore: breakdown.score,
        priorityReason: breakdown.reason,
      };
    }).sort((a, b) => b.priorityScore - a.priorityScore);
  }, [assignedRooms, activeRoom]);

  // Shift completed count
  const shiftCompletedCount = useMemo(() => {
    // Rooms completed by this staff member (Ready for Guest)
    // For simulation, count how many rooms have their name and are "Ready for Guest"
    return rooms.filter((r) => r.assignedStaff === activeWorker.name && r.status === "Ready for Guest").length;
  }, [rooms, activeWorker.name]);

  // Total rooms scheduled for shift (assigned to this staff member)
  const shiftTotalCount = assignedRooms.length;

  // Real-time local storage persistence for offline checklist
  useEffect(() => {
    if (activeRoom) {
      if (isOffline) {
        const savedChecklist = localStorage.getItem(`roomflow_offline_checklist_${activeRoom.id}`);
        if (savedChecklist) {
          setCompletedSteps(JSON.parse(savedChecklist));
        } else {
          setCompletedSteps([]);
        }
      } else {
        // Online: reset/initialize local states based on clean status
        setCompletedSteps([]);
      }
    } else {
      setCompletedSteps([]);
    }
  }, [activeRoom?.id, isOffline]);

  // Load offline queue on mount
  useEffect(() => {
    const queue = localStorage.getItem("roomflow_offline_queue");
    if (queue) {
      setOfflineSyncQueue(JSON.parse(queue));
    }
  }, []);

  // Cleaning stopwatch tick
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeRoom && !isOffline) {
      interval = setInterval(() => {
        setActiveRoomSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeRoom, isOffline]);

  const formatTimer = (sec: number) => {
    const mm = String(Math.floor(sec / 60)).padStart(2, "0");
    const ss = String(sec % 60).padStart(2, "0");
    return `${mm}:${ss}`;
  };

  // Toggle Offline Mode
  const handleOfflineToggle = () => {
    if (!isOffline) {
      setIsOffline(true);
      toast.warning("Housekeeper Portal is now Offline. Actions will be stored locally.", {
        description: "Checks and status edits will queue for background synchronization."
      });
    } else {
      // Reconnecting -> Run Sync Process
      setIsOffline(false);
      runOfflineSync();
    }
  };

  // Queue action offline
  const queueOfflineAction = (action: { type: string; roomId: string; payload?: any }) => {
    const updatedQueue = [...offlineSyncQueue, { ...action, timestamp: new Date().toISOString() }];
    setOfflineSyncQueue(updatedQueue);
    localStorage.setItem("roomflow_offline_queue", JSON.stringify(updatedQueue));
    toast.info("Offline action saved locally.", {
      description: "Will synchronize when reconnected to hotel network."
    });
  };

  // Run offline background sync
  const runOfflineSync = () => {
    const queuedActions = [...offlineSyncQueue];
    if (queuedActions.length === 0) {
      setIsOffline(false);
      toast.success("Online Mode active. No offline edits to synchronize.");
      return;
    }

    toast.info(`Synchronizing ${queuedActions.length} offline operations...`, {
      icon: <RefreshCw className="size-4 animate-spin text-[#B5652F]" />
    });

    // Process queued edits sequentially
    setTimeout(() => {
      queuedActions.forEach((act) => {
        if (act.type === "START_CLEAN") {
          setRoomStatus(act.roomId, "Cleaning in Progress");
          simulateIncomingWhatsApp(workerPhone, `START ${act.roomId}`);
        } else if (act.type === "CHECKLIST_UPDATE") {
          localStorage.setItem(`roomflow_offline_checklist_${act.roomId}`, JSON.stringify(act.payload.steps));
        } else if (act.type === "SUBMIT_QA") {
          const result = evaluateAiScore(act.payload.photoType);
          if (result.score >= 95) {
            setRoomStatus(act.roomId, "Ready for Guest");
            setRoomPhotoAndRunAi(act.roomId, act.payload.photoType);
            simulateIncomingWhatsApp(workerPhone, `Staging photo submitted (Auto-Released QA Score: ${result.score}%)`, true, act.payload.photoType);
          } else {
            setRoomStatus(act.roomId, "Inspection Pending");
            setRoomPhotoAndRunAi(act.roomId, act.payload.photoType);
            simulateIncomingWhatsApp(workerPhone, `Staging photo submitted (Failed QA Score: ${result.score}%)`, true, act.payload.photoType);
          }
        } else if (act.type === "MAINTENANCE_BLOCK") {
          blockRoom(act.roomId, act.payload.note);
          simulateIncomingWhatsApp(workerPhone, `ISSUE ${act.roomId} ${act.payload.note}`);
        }
      });

      // Clear offline data
      setOfflineSyncQueue([]);
      localStorage.removeItem("roomflow_offline_queue");
      toast.success("Synchronized successfully! All offline housekeeping checksheets synced.");
    }, 1500);
  };

  // Actions
  const handleStartClean = (roomId: string) => {
    setActiveRoomSeconds(0);
    setCompletedSteps([]);
    setStagingPhotoType(null);
    setAiScore(null);
    setAiPassed(null);
    setAiNotes(null);

    if (isOffline) {
      queueOfflineAction({ type: "START_CLEAN", roomId });
      // update local display simulation
      toast.info(`Started cleaning Room ${roomId} (Offline). Timer is simulated.`);
    } else {
      setRoomStatus(roomId, "Cleaning in Progress");
      simulateIncomingWhatsApp(workerPhone, `START ${roomId}`);
      toast.success(`Started cleaning Room ${roomId}. Door lock code locked.`);
    }
  };

  const handleStepToggle = (step: string) => {
    let nextSteps = [...completedSteps];
    if (nextSteps.includes(step)) {
      nextSteps = nextSteps.filter((s) => s !== step);
    } else {
      nextSteps.push(step);
    }
    setCompletedSteps(nextSteps);

    if (isOffline) {
      localStorage.setItem(`roomflow_offline_checklist_${activeRoom!.id}`, JSON.stringify(nextSteps));
      queueOfflineAction({ 
        type: "CHECKLIST_UPDATE", 
        roomId: activeRoom!.id, 
        payload: { steps: nextSteps } 
      });
    }
  };

  const handlePhotoUploadSimulation = (type: "clean" | "dirty_bed" | "dirty_trash") => {
    if (!activeRoom) return;
    setIsAiScanning(true);
    setAiScore(null);
    setAiPassed(null);
    setAiNotes(null);

    setTimeout(() => {
      setIsAiScanning(false);
      setStagingPhotoType(type);

      // Run local AI simulation scoring
      const result = evaluateAiScore(type);
      setAiScore(result.score);
      setAiPassed(result.passed);
      setAiNotes(result.notes);

      if (isOffline) {
        queueOfflineAction({
          type: "SUBMIT_QA",
          roomId: activeRoom.id,
          payload: { photoType: type }
        });
        toast.info("Staging photo queued for inspection sync.");
      } else {
        // Trigger real sync transitions in store
        setRoomPhotoAndRunAi(activeRoom.id, type);
        
        // Auto-release rule
        if (result.score >= 95) {
          setRoomStatus(activeRoom.id, "Ready for Guest");
          simulateIncomingWhatsApp(workerPhone, `Staging photo submitted (Auto-Released QA Score: ${result.score}%)`, true, type);
          toast.success(`Gemini AI QA score: ${result.score}% (PASSED). Room auto-released directly to Front Desk!`);
        } else {
          setRoomStatus(activeRoom.id, "Inspection Pending");
          simulateIncomingWhatsApp(workerPhone, `Staging photo submitted (Failed QA Score: ${result.score}%)`, true, type);
          toast.warning(`Gemini AI QA score: ${result.score}% (FLAGGED defects). Routed to Supervisor inspection sidebar.`);
        }
      }
    }, 1500);
  };

  const handleSopSubmit = () => {
    if (!activeRoom) return;
    if (completedSteps.length < SOP_STEPS.length) {
      toast.error("Please complete all SOP checklist items before submitting.");
      return;
    }
    if (!stagingPhotoType) {
      toast.error("Please snap a staging photo for Gemini AI QA evaluation.");
      return;
    }

    if (isOffline) {
      toast.info("Clean checklist submitted locally. Awaiting online reconnection to process release.");
    } else {
      if (aiPassed) {
        toast.success(`Room ${activeRoom.number} is clean and ready. Locked for next guest.`);
      } else {
        toast.info(`Room ${activeRoom.number} submitted. Undergoing Supervisor inspection review.`);
      }
    }
  };

  const handleDefectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRoom) return;
    if (!defectNote) {
      toast.error("Please input defect details");
      return;
    }

    if (isOffline) {
      queueOfflineAction({
        type: "MAINTENANCE_BLOCK",
        roomId: activeRoom.id,
        payload: { note: defectNote }
      });
      toast.warning(`Maintenance Ticket queued for Room ${activeRoom.number}`);
    } else {
      blockRoom(activeRoom.id, defectNote);
      simulateIncomingWhatsApp(workerPhone, `ISSUE ${activeRoom.number} ${defectNote}`);
      toast.warning(`Room ${activeRoom.number} blocked and maintenance ticket logged.`);
    }

    setDefectNote("");
    setDefectOpen(false);
  };

  const handleQrScanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scannedRoomNum) return;
    
    // Find room
    const match = rooms.find((r) => r.number === scannedRoomNum);
    if (!match) {
      toast.error(`Room ${scannedRoomNum} not found in database.`);
      return;
    }
    
    if (match.assignedStaff !== activeWorker.name) {
      toast.error(`Room ${scannedRoomNum} is not assigned to you! Assigned to ${match.assignedStaff || "none"}.`);
      return;
    }

    setQrScannerOpen(false);
    setScannedRoomNum("");
    
    // Start clean automatically
    handleStartClean(match.id);
  };

  return (
    <div className="flex flex-col gap-5 max-w-md mx-auto pb-20 w-full text-[#2A2620] relative">
      
      {/* Simulation Selector Bar */}
      <div className="flex items-center justify-between p-2.5 bg-white border border-[#EBE3D1] rounded-2xl shadow-sm text-xs gap-2">
        <div className="flex items-center gap-1.5 text-[#736B5E]">
          <User className="size-4 text-[#B5652F]" />
          <span>Active Housekeeper:</span>
        </div>
        <Select value={selectedStaffName} onValueChange={setSelectedStaffName}>
          <SelectTrigger className="w-[140px] h-8 text-xs border-[#EBE3D1] rounded-xl font-bold bg-[#F5F1E8]/30">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-white border-[#EBE3D1] text-xs">
            {staff.filter(s => ["Ana Duarte", "Priya Raman", "Lucia Moreno"].includes(s.name)).map(s => (
              <SelectItem key={s.name} value={s.name} className="text-xs">{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 1. MOBILE STAFF HEADER BAR */}
      <Card className="bg-white border-[#EBE3D1] p-4 rounded-2xl shadow-sm flex items-center justify-between">
        
        {/* Cleaner profile */}
        <div className="flex items-center gap-3">
          <div className="size-11 rounded-full bg-[#B5652F]/10 border border-[#B5652F]/20 flex items-center justify-center text-[#B5652F] font-bold text-sm select-none">
            {activeWorker.name.split(" ").map(n => n[0]).join("")}
          </div>
          <div>
            <h2 className="font-bold text-sm text-[#2A2620]">{activeWorker.name}</h2>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="text-[10px] text-[#736B5E] font-medium uppercase tracking-wider">
                Shift: {shiftCompletedCount} of {shiftTotalCount} Done
              </span>
              <div className="w-12 bg-[#F5F1E8] h-1 rounded-full overflow-hidden ml-1">
                <div 
                  className="bg-[#8A9A6B] h-full" 
                  style={{ width: `${shiftTotalCount ? (shiftCompletedCount / shiftTotalCount) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Scan Room QR & Offline buttons */}
        <div className="flex items-center gap-2">
          {/* Offline Mode Toggle Button */}
          <button
            onClick={handleOfflineToggle}
            className={`p-2 rounded-xl border flex items-center justify-center transition-all ${
              isOffline
                ? "bg-[#B14A3E]/10 border-[#B14A3E]/30 text-[#B14A3E] hover:bg-[#B14A3E]/20"
                : "bg-[#8A9A6B]/15 border-[#8A9A6B]/30 text-[#8A9A6B] hover:bg-[#8A9A6B]/25"
            }`}
            title={isOffline ? "Currently Offline (Click to sync)" : "Currently Online (Click to go offline)"}
          >
            {isOffline ? <WifiOff className="size-4" /> : <Wifi className="size-4" />}
          </button>

          <Button
            size="sm"
            onClick={() => setQrScannerOpen(true)}
            className="h-9 bg-[#B5652F] hover:bg-[#B5652F]/90 text-white font-bold text-xs px-3 rounded-xl flex items-center gap-1 cursor-pointer shadow-sm"
          >
            <Camera className="size-4 shrink-0" />
            <span>Scan QR</span>
          </Button>
        </div>
      </Card>

      {/* Offline sync queue banner alerts */}
      {isOffline && (
        <div className="p-3 bg-[#B14A3E]/10 border border-[#B14A3E]/20 text-[#B14A3E] text-xs font-semibold rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <WifiOff className="size-4.5 animate-pulse" />
            <span>Offline Mode Active ({offlineSyncQueue.length} pending updates)</span>
          </div>
          <button 
            onClick={handleOfflineToggle}
            className="px-2.5 py-1 bg-[#B14A3E] text-white font-bold text-[10px] rounded-lg cursor-pointer"
          >
            Go Online
          </button>
        </div>
      )}

      {/* 2. ACTIVE ROOM HERO CARD */}
      {activeRoom ? (
        <Card className="bg-white border-[#EBE3D1] p-5 rounded-2xl shadow-sm flex flex-col gap-4">
          
          {/* Room Display Header */}
          <div className="flex items-center justify-between border-b border-[#F5F1E8] pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-extrabold text-[#2A2620] tracking-tight">Room {activeRoom.number}</span>
                {activeRoom.priority === "VIP" && (
                  <Badge className="bg-[#B14A3E] text-white text-[9px] font-bold py-0.5 px-2 uppercase rounded-md tracking-wider flex items-center gap-0.5">
                    <Crown className="size-2.5 shrink-0" /> VIP
                  </Badge>
                )}
              </div>
              <p className="text-[10px] text-[#736B5E] font-medium">{activeRoom.type} • Floor {activeRoom.floor}</p>
            </div>
            
            <div className="flex items-center gap-1.5 text-xs font-mono font-bold bg-[#F5F1E8] text-[#2A2620] px-2.5 py-1 rounded-xl">
              <Timer className="size-3.5 text-[#B5652F] animate-pulse" />
              <span>⏱ {formatTimer(activeRoomSeconds)}</span>
              <span className="text-[9px] text-[#736B5E] font-normal font-sans">/ {activeRoom.turnaround}m target</span>
            </div>
          </div>

          {/* Explainable Priority Banner (Soft Terracotta) */}
          <div className="p-3 bg-[#B14A3E]/5 border border-[#B14A3E]/10 text-[#B14A3E] rounded-xl flex items-start gap-2">
            <Crown className="size-4 shrink-0 mt-0.5" />
            <div className="text-[10px]">
              <span className="font-bold">Priority Task explanation:</span>
              <p className="italic mt-0.5 leading-snug">
                "Priority 1: Clean next. VIP guest {activeRoom.guestName || ''} scheduled check-in ETA is {activeRoom.checkIn || '14:00'}."
              </p>
            </div>
          </div>

          {/* Proximity-Aware Routing Badge */}
          <div className="p-3 bg-[#8A9A6B]/10 border border-[#8A9A6B]/20 text-[#8A9A6B] rounded-xl flex items-center gap-2">
            <CheckCircle className="size-4 shrink-0 text-[#8A9A6B]" />
            <span className="text-[10px] font-bold">
              Proximity Routing: Next scheduled clean room is on the same floor (Floor {activeRoom.floor})!
            </span>
          </div>

          {/* 4-Step SOP Checklist (Large 48px touch targets) */}
          <div className="flex flex-col gap-2.5 mt-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#736B5E] flex items-center gap-1.5">
              <ClipboardCheck className="size-4" /> SOP Cleaning Checklist
            </h3>
            
            <div className="space-y-2">
              {SOP_STEPS.map((step) => {
                const isDone = completedSteps.includes(step);
                return (
                  <label
                    key={step}
                    className={`flex items-center gap-3.5 px-4 h-12 rounded-xl border text-xs font-semibold cursor-pointer transition-all active:scale-[0.98] select-none ${
                      isDone 
                        ? "bg-[#8A9A6B]/10 border-[#8A9A6B]/30 text-[#8A9A6B]" 
                        : "bg-white border-[#EBE3D1] text-[#2A2620] hover:bg-[#F5F1E8]/30"
                    }`}
                  >
                    <Checkbox
                      checked={isDone}
                      onCheckedChange={() => handleStepToggle(step)}
                      className="size-5 rounded-md border-[#EBE3D1] data-[state=checked]:bg-[#8A9A6B] data-[state=checked]:border-[#8A9A6B] cursor-pointer"
                    />
                    <span>{step}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Photo Inspection Section */}
          <div className="space-y-2.5 border-t border-[#F5F1E8] pt-4 mt-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#736B5E] flex items-center gap-1.5">
              <Camera className="size-4" /> Room Staging Photo Inspection
            </h3>

            {isAiScanning ? (
              <div className="h-32 rounded-xl border border-dashed border-[#B5652F] bg-[#B5652F]/5 flex flex-col items-center justify-center text-center p-4">
                <RefreshCw className="size-7 text-[#B5652F] animate-spin mb-2" />
                <span className="text-xs font-bold text-[#B5652F] animate-pulse">Running Gemini AI QA Visual Staging Verification...</span>
              </div>
            ) : stagingPhotoType ? (
              <div className="flex flex-col gap-3">
                <div className="relative aspect-video w-full rounded-xl overflow-hidden border border-[#EBE3D1] bg-[#F5F1E8]/50">
                  <img 
                    src={
                      stagingPhotoType === "clean" 
                        ? "https://images.unsplash.com/photo-1618773928121-c32242e63f39?q=80&w=800"
                        : stagingPhotoType === "dirty_bed"
                        ? "https://images.unsplash.com/photo-1598928506311-c55ded91a20c?q=80&w=800"
                        : "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?q=80&w=800"
                    } 
                    alt="Staging view" 
                    className="w-full h-full object-cover"
                  />
                  
                  {/* Overlaid bounding box if flagged */}
                  {stagingPhotoType === "dirty_bed" && (
                    <div className="absolute border-2 border-[#B14A3E] bg-[#B14A3E]/20 rounded pointer-events-none" style={{ left: "28%", top: "35%", width: "44%", height: "38%" }}>
                      <span className="bg-[#B14A3E] text-white text-[8px] font-bold px-1 rounded-br w-max">Rumpled Bedding</span>
                    </div>
                  )}
                  {stagingPhotoType === "dirty_trash" && (
                    <div className="absolute border-2 border-[#B14A3E] bg-[#B14A3E]/20 rounded pointer-events-none" style={{ left: "55%", top: "65%", width: "25%", height: "28%" }}>
                      <span className="bg-[#B14A3E] text-white text-[8px] font-bold px-1 rounded-br w-max">Trash on Floor</span>
                    </div>
                  )}
                </div>

                <div className={`p-3 border rounded-xl flex items-start gap-2.5 text-xs ${
                  aiPassed 
                    ? "bg-[#8A9A6B]/10 border-[#8A9A6B]/30 text-[#8A9A6B]" 
                    : "bg-[#B14A3E]/10 border-[#B14A3E]/30 text-[#B14A3E]"
                }`}>
                  {aiPassed ? <CheckCircle2 className="size-4 shrink-0 mt-0.5" /> : <AlertTriangle className="size-4 shrink-0 mt-0.5" />}
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold">Gemini AI QA score: {aiScore}%</span>
                      <Badge className={aiPassed ? "bg-[#8A9A6B] text-white border-0" : "bg-[#B14A3E] text-white border-0"}>
                        {aiPassed ? "PASSED" : "FLAGGED DEFECTS"}
                      </Badge>
                    </div>
                    <p className="mt-1 text-[11px] leading-relaxed italic">
                      "{aiNotes}"
                    </p>
                  </div>
                </div>

                {/* Retake options */}
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setStagingPhotoType(null);
                      setAiScore(null);
                      setAiPassed(null);
                    }}
                    className="flex-1 h-9 border-[#EBE3D1] text-xs rounded-xl cursor-pointer"
                  >
                    Retake Photo
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                <Button
                  onClick={() => handlePhotoUploadSimulation("clean")}
                  className="flex flex-col items-center justify-center p-3 h-20 bg-white border border-[#EBE3D1] hover:border-[#8A9A6B] rounded-xl text-center gap-1.5 cursor-pointer hover:bg-[#8A9A6B]/5 transition-all text-[#2A2620]"
                >
                  <Camera className="size-5 text-[#8A9A6B]" />
                  <span className="text-[9px] font-bold">Staging Clean</span>
                </Button>
                <Button
                  onClick={() => handlePhotoUploadSimulation("dirty_bed")}
                  className="flex flex-col items-center justify-center p-3 h-20 bg-white border border-[#EBE3D1] hover:border-[#B14A3E] rounded-xl text-center gap-1.5 cursor-pointer hover:bg-[#B14A3E]/5 transition-all text-[#2A2620]"
                >
                  <Camera className="size-5 text-[#B14A3E]" />
                  <span className="text-[9px] font-bold">Rumpled Bed</span>
                </Button>
                <Button
                  onClick={() => handlePhotoUploadSimulation("dirty_trash")}
                  className="flex flex-col items-center justify-center p-3 h-20 bg-white border border-[#EBE3D1] hover:border-[#B14A3E] rounded-xl text-center gap-1.5 cursor-pointer hover:bg-[#B14A3E]/5 transition-all text-[#2A2620]"
                >
                  <Camera className="size-5 text-[#B14A3E]" />
                  <span className="text-[9px] font-bold">Trash Left</span>
                </Button>
              </div>
            )}
          </div>
        </Card>
      ) : (
        <Card className="bg-white border-[#EBE3D1] p-8 rounded-2xl shadow-sm text-center flex flex-col items-center justify-center py-12">
          <CheckCircle className="size-10 text-[#8A9A6B] bg-[#8A9A6B]/15 p-2 rounded-full mb-3" />
          <h3 className="font-extrabold text-base text-[#2A2620]">No Active Room Clean</h3>
          <p className="text-xs text-[#736B5E] max-w-[240px] mt-1.5 leading-relaxed">
            Please pick a prioritized turnaround room from your upcoming assignments list below to initialize the SOP checklist.
          </p>
        </Card>
      )}

      {/* Sticky footer action bar */}
      {activeRoom && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/90 backdrop-blur border-t border-[#EBE3D1] p-3 flex gap-2 max-w-md mx-auto pb-safe">
          <Button
            onClick={() => setDefectOpen(true)}
            variant="outline"
            className="border-[#B14A3E] text-[#B14A3E] hover:bg-[#B14A3E]/5 font-bold text-xs h-11 px-4 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
          >
            <Ban className="size-4" /> Report Defect
          </Button>

          <Button
            onClick={handleSopSubmit}
            disabled={completedSteps.length < SOP_STEPS.length || !stagingPhotoType}
            className="flex-1 h-11 bg-[#B5652F] hover:bg-[#B5652F]/90 text-white disabled:bg-gray-200 disabled:text-gray-400 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
          >
            <CheckCircle2 className="size-4 shrink-0" />
            <span>Submit & Auto-Release</span>
          </Button>
        </div>
      )}

      {/* 3. UPCOMING PRIORITIZED QUEUE */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#736B5E]">
          Upcoming Prioritized Assignments ({upcomingQueue.length})
        </h3>
        
        <div className="flex flex-col gap-2.5">
          {upcomingQueue.map((item) => (
            <Card 
              key={item.id} 
              className="bg-white border-[#EBE3D1] p-4 rounded-2xl shadow-sm hover:shadow-md hover:border-[#B5652F]/40 transition-all flex items-center justify-between group"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-sm text-[#2A2620]">Room {item.number}</span>
                  {item.priority === "VIP" && (
                    <Badge className="bg-[#B14A3E] text-white text-[8px] font-bold py-0 px-1 rounded-sm uppercase tracking-wider">
                      VIP
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-[9px] border-[#EBE3D1] bg-[#F5F1E8]/30 px-1 py-0 text-[#736B5E]">
                    {item.type}
                  </Badge>
                </div>
                
                <div className="flex items-center gap-1.5 text-[10px] text-[#736B5E]">
                  <Clock className="size-3 text-[#B5652F]" />
                  <span>Turnaround target: {item.turnaround} mins</span>
                  <span>•</span>
                  <span>Check-in: {item.checkIn && item.checkIn !== "—" ? item.checkIn : "14:00"}</span>
                </div>

                <p className="text-[9px] text-[#736B5E] italic leading-relaxed pt-0.5 group-hover:text-[#2A2620] transition-colors">
                  {item.priorityReason}
                </p>
              </div>

              {!activeRoom ? (
                <Button
                  onClick={() => handleStartClean(item.id)}
                  size="sm"
                  className="h-8 bg-[#B5652F] hover:bg-[#B5652F]/90 text-white text-[10px] font-bold px-3 rounded-lg flex items-center gap-1 cursor-pointer shrink-0"
                >
                  Start Clean <ChevronRight className="size-3" />
                </Button>
              ) : (
                <div className="text-[10px] text-[#736B5E] italic bg-[#F5F1E8]/60 border border-[#EBE3D1] px-2 py-1.5 rounded-lg text-center shrink-0">
                  Queued
                </div>
              )}
            </Card>
          ))}

          {upcomingQueue.length === 0 && (
            <div className="p-8 text-center text-xs text-[#736B5E] border border-dashed border-[#EBE3D1] rounded-2xl bg-white/50">
              No additional dirty rooms queued for your shift. Enjoy your break!
            </div>
          )}
        </div>
      </div>

      {/* Dialog: Report defect / block room */}
      <Dialog open={defectOpen} onOpenChange={setDefectOpen}>
        <DialogContent className="bg-white border-[#EBE3D1] max-w-sm rounded-2xl text-xs">
          <form onSubmit={handleDefectSubmit} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="text-sm font-extrabold text-[#2A2620]">Report Room Defect & Log Ticket</DialogTitle>
              <DialogDescription className="text-[11px] text-[#736B5E]">
                Describe maintenance issue. This will transition Room {activeRoom?.number} to Maintenance Blocked state.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              <div className="flex flex-col gap-1">
                <Label htmlFor="defect-desc" className="font-bold text-[#2A2620]">Maintenance Notes</Label>
                <Textarea
                  id="defect-desc"
                  placeholder="e.g. Shower leak, broken lock, missing pillowcases..."
                  value={defectNote}
                  onChange={(e) => setDefectNote(e.target.value)}
                  className="border-[#EBE3D1] min-h-[90px]"
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDefectOpen(false)}
                className="border-[#EBE3D1] text-xs h-9 rounded-xl cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-[#B14A3E] hover:bg-[#B14A3E]/90 text-white text-xs h-9 rounded-xl cursor-pointer"
              >
                File Ticket & Block Room
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog: QR Scanner Simulator */}
      <Dialog open={qrScannerOpen} onOpenChange={setQrScannerOpen}>
        <DialogContent className="bg-white border-[#EBE3D1] max-w-xs rounded-2xl text-xs">
          <form onSubmit={handleQrScanSubmit} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="text-sm font-extrabold text-[#2A2620] flex items-center gap-1.5">
                <Camera className="size-4 text-[#B5652F]" />
                <span>Simulate Camera QR Scanner</span>
              </DialogTitle>
              <DialogDescription className="text-[11px] text-[#736B5E]">
                Aim at door sticker. Enter room number below to simulate QR checkin.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              <div className="flex flex-col gap-1">
                <Label htmlFor="qr-num" className="font-bold text-[#2A2620]">Scanned Room Number</Label>
                <Input
                  id="qr-num"
                  placeholder="e.g. 203"
                  value={scannedRoomNum}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setScannedRoomNum(e.target.value)}
                  className="border-[#EBE3D1] font-bold text-center text-lg tracking-wider"
                />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setQrScannerOpen(false)}
                className="border-[#EBE3D1] text-xs h-9 rounded-xl cursor-pointer w-full"
              >
                Close Camera
              </Button>
              <Button
                type="submit"
                className="bg-[#B5652F] hover:bg-[#B5652F]/90 text-white text-xs h-9 rounded-xl cursor-pointer w-full"
              >
                Simulate Scan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

    </div>
  );
}
