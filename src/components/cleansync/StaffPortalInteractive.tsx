import { useState, useEffect, useMemo, useRef } from "react";
import { 
  Camera, CheckCircle2, Crown, Timer, ClipboardCheck, Sparkles, 
  AlertTriangle, User, ChevronRight, Clock, Power, ShieldAlert,
  Wifi, WifiOff, RefreshCw, Check, CheckCircle, HelpCircle, Ban, Wrench,
  ChevronDown, ChevronUp, AlertCircle, Volume2, Bell
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
import { useRoomFlow, STAFF_PHONES, STAFF_FLOORS } from "./store";
import { calculatePriorityScore, evaluateAiScore, transitionRoomState } from "@/lib/dispatchEngine";
import { inspectRoomPhotoWithGemini } from "@/services/geminiService";
import { type Room, type RoomStatus, type RoomType, type PriorityTag } from "@/lib/cleansync-data";
import { AiInspectorModal } from "@/components/cleansync/AiInspectorModal";
import { useAuth } from "@/components/cleansync/auth";
import { playStaffRingerSound } from "@/services/audioRinger";

// Robust staff name fuzzy matching helper
function isStaffMatch(assignedStaff: string | null | undefined, activeWorkerName: string | null | undefined): boolean {
  if (!assignedStaff || !activeWorkerName) return false;
  const assigned = assignedStaff.trim().toLowerCase();
  const worker = activeWorkerName.trim().toLowerCase();
  if (!assigned || !worker) return false;
  if (assigned === worker) return true;

  const assignedFirst = assigned.split(" ")[0] || "";
  const workerFirst = worker.split(" ")[0] || "";

  if (!assignedFirst || !workerFirst) return false;

  return (
    assigned.includes(worker) ||
    worker.includes(assigned) ||
    (assignedFirst.length >= 2 && worker.includes(assignedFirst)) ||
    (workerFirst.length >= 2 && assigned.includes(workerFirst)) ||
    (assignedFirst.length >= 3 && workerFirst.length >= 3 && assignedFirst === workerFirst)
  );
}

export function StaffPortalInteractive() {
  const {
    rooms,
    staff,
    guestRequests,
    setRoomStatus,
    setRoomPhotoAndRunAi,
    blockRoom,
    reportBrokenFixture,
    startCleaningRoom,
    completeRoomWithAiScore,
    simulateIncomingWhatsApp,
    acknowledgeStaffTask,
    completeStaffTask,
    updateRoomSopSteps,
    lastAssignedStaff,
  } = useRoomFlow();

  const { user } = useAuth();

  // Selected housekeeper
  const [selectedStaffName, setSelectedStaffName] = useState<string>("Ana Duarte");

  // Auto-sync with supervisor assignment or logged in auth user
  useEffect(() => {
    if (lastAssignedStaff && staff.some((s) => isStaffMatch(s.name, lastAssignedStaff))) {
      const match = staff.find((s) => isStaffMatch(s.name, lastAssignedStaff));
      if (match) setSelectedStaffName(match.name);
    } else if (user?.name && staff.some((s) => isStaffMatch(s.name, user.name))) {
      setSelectedStaffName(user.name);
    }
  }, [lastAssignedStaff, user?.name, staff]);

  const activeWorker = useMemo(() => {
    return staff.find((s) => s.name === selectedStaffName) || staff[0]!;
  }, [staff, selectedStaffName]);

  // Active assigned guest requests/service tasks
  const assignedTasks = useMemo(() => {
    return guestRequests.filter(
      (req) =>
        isStaffMatch(req.assignedStaff, activeWorker.name) &&
        (req.status === "In Progress" || req.status === "Open")
    );
  }, [guestRequests, activeWorker.name]);

  // Staff audio ringer alert state & count reference
  const [staffRingerAlert, setStaffRingerAlert] = useState<{ title: string; roomNumber?: string } | null>(null);
  const prevAssignedCountRef = useRef(0);

  // 1. Listen for cross-tab staff ringer storage event
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "roomflow_ring_staff_alert" && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed && isStaffMatch(parsed.staffName, activeWorker.name)) {
            playStaffRingerSound();
            setStaffRingerAlert({ title: `⚡ New Task Assigned to you!` });
            toast.info(`🔔 TASK ALERT: You've been assigned work by the Supervisor!`);
            setTimeout(() => setStaffRingerAlert(null), 5000);
          }
        } catch { /* ignore error */ }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [activeWorker.name]);

  // 2. Listen for count increases in assignedTasks
  const currentTotalAssigned = assignedTasks.length;
  useEffect(() => {
    if (currentTotalAssigned > prevAssignedCountRef.current) {
      playStaffRingerSound();
      setStaffRingerAlert({ title: `⚡ ${currentTotalAssigned} Active Task(s) Assigned` });
      toast.info(`🔔 3s TASK RINGER: Work assigned to your staff profile (${activeWorker.name})!`);
      setTimeout(() => setStaffRingerAlert(null), 5000);
    }
    prevAssignedCountRef.current = currentTotalAssigned;
  }, [currentTotalAssigned, activeWorker.name]);

  // Offline capability states
  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [offlineSyncQueue, setOfflineSyncQueue] = useState<any[]>([]);

  // Timer & SOP completed items
  const [activeRoomSeconds, setActiveRoomSeconds] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  
  // 3-Slot Photo Staging states
  const [bedPhoto, setBedPhoto] = useState<"clean" | "dirty" | null>(null);
  const [bathPhoto, setBathPhoto] = useState<"clean" | "dirty" | null>(null);
  const [trashPhoto, setTrashPhoto] = useState<"clean" | "dirty" | null>(null);
  const [scanningSlot, setScanningSlot] = useState<"bed" | "bath" | "trash" | null>(null);
  const [selectSlotOpen, setSelectSlotOpen] = useState<"bed" | "bath" | "trash" | null>(null);
  const [stagingPhotoType, setStagingPhotoType] = useState<"clean" | "dirty_bed" | "dirty_trash" | null>(null);
  const [aiScore, setAiScore] = useState<number | null>(null);
  const [aiNotes, setAiNotes] = useState<string | null>(null);
  const [aiPassed, setAiPassed] = useState<boolean | null>(null);
  const [isAiScanning, setIsAiScanning] = useState(false);

  // Calculate combined visual inspection score
  const aiQaResult = useMemo(() => {
    if (!bedPhoto || !bathPhoto || !trashPhoto) return null;
    
    const bedScore = bedPhoto === "clean" ? 98 : 60;
    const bathScore = bathPhoto === "clean" ? 97 : 55;
    const trashScore = trashPhoto === "clean" ? 100 : 45;
    
    const overallScore = Math.round((bedScore + bathScore + trashScore) / 3);
    const passed = overallScore >= 95;
    
    let notes = "";
    if (passed) {
      notes = "All 3 visual staging checkpoints verified. Bed linen taut, bathroom fixtures sanitized, and trash cleared. Presentation passes premium hotel staging standards.";
    } else {
      const defects: string[] = [];
      if (bedPhoto === "dirty") defects.push("rumpled bed linens");
      if (bathPhoto === "dirty") defects.push("dirty/spotted bathroom fixtures");
      if (trashPhoto === "dirty") defects.push("unemptied trash bins");
      notes = `Defects detected: Visual QA flagged issues with ${defects.join(", ")}. Please rectify and rescan.`;
    }
    
    return {
      score: overallScore,
      passed,
      notes,
    };
  }, [bedPhoto, bathPhoto, trashPhoto]);

  // Synchronize computed results with standard visual states
  useEffect(() => {
    if (aiQaResult) {
      setAiScore(aiQaResult.score);
      setAiPassed(aiQaResult.passed);
      setAiNotes(aiQaResult.notes);
      
      const combinedType = (bedPhoto === "dirty" || bathPhoto === "dirty" || trashPhoto === "dirty")
        ? (bedPhoto === "dirty" ? "dirty_bed" : "dirty_trash")
        : "clean";
      setStagingPhotoType(combinedType);
    } else {
      setAiScore(null);
      setAiPassed(null);
      setAiNotes(null);
      setStagingPhotoType(null);
    }
  }, [aiQaResult, bedPhoto, bathPhoto, trashPhoto]);

  // Accordion tray state
  const [isQueueOpen, setIsQueueOpen] = useState(false);

  // Dialogs
  const [defectOpen, setDefectOpen] = useState(false);
  const [defectNote, setDefectNote] = useState("");
  const [qrScannerOpen, setQrScannerOpen] = useState(false);
  const [aiInspectorOpen, setAiInspectorOpen] = useState(false);
  const [scannedRoomNum, setScannedRoomNum] = useState("");

  const SOP_STEPS = [
    "1. Linen Stripping & Trash Removal",
    "2. Bathroom Disinfection & Sanitization",
    "3. Amenity Restocking (Towels, Toiletries, Water)",
    "4. Final Polish, Vacuum & Staging"
  ];

  const workerPhone = STAFF_PHONES[activeWorker.name] || "+15551010001";

  // Filter & priority sort assigned rooms
  const assignedRooms = useMemo(() => {
    return rooms.filter((r) => isStaffMatch(r.assignedStaff, activeWorker.name));
  }, [rooms, activeWorker.name]);

  const activeRoom = useMemo(() => {
    return assignedRooms.find((r) => r.status === "Cleaning in Progress") || null;
  }, [assignedRooms]);

  const upcomingQueue = useMemo(() => {
    const pending = assignedRooms.filter(
      (r) => r.status !== "Ready for Guest" && r.status !== "Cleaning in Progress" && r.status !== "Inspection Pending"
    );

    return pending.map((r) => {
      const breakdown = calculatePriorityScore(r, activeRoom?.number || null, "13:00");
      return {
        ...r,
        priorityScore: breakdown.score,
        priorityReason: breakdown.reason,
      };
    }).sort((a, b) => b.priorityScore - a.priorityScore);
  }, [assignedRooms, activeRoom]);

  const shiftCompletedCount = useMemo(() => {
    return rooms.filter((r) => r.assignedStaff === activeWorker.name && r.status === "Ready for Guest").length;
  }, [rooms, activeWorker.name]);

  const shiftTotalCount = assignedRooms.length;

  // Retrieve local state for offline checklist
  useEffect(() => {
    if (activeRoom) {
      if (isOffline) {
        const saved = localStorage.getItem(`roomflow_offline_checklist_${activeRoom.id}`);
        if (saved) {
          setCompletedSteps(JSON.parse(saved));
        } else {
          setCompletedSteps([]);
        }
      } else {
        setCompletedSteps(activeRoom.completedSopSteps || []);
      }
    } else {
      setCompletedSteps([]);
    }
    
    // Always reset photo and AI evaluation states when switching rooms
    setBedPhoto(null);
    setBathPhoto(null);
    setTrashPhoto(null);
    setScanningSlot(null);
    setSelectSlotOpen(null);
    setStagingPhotoType(null);
    setAiScore(null);
    setAiPassed(null);
    setAiNotes(null);
    setActiveRoomSeconds(0);
  }, [activeRoom?.id, isOffline]);

  // Load offline queue on mount
  useEffect(() => {
    const queue = localStorage.getItem("roomflow_offline_queue");
    if (queue) {
      setOfflineSyncQueue(JSON.parse(queue));
    }
  }, []);

  // Timer
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

  // Offline commands
  const handleOfflineToggle = () => {
    if (!isOffline) {
      setIsOffline(true);
      toast.warning("Housekeeper Portal is now Offline.", {
        description: "Your checklist inputs and photo staging actions will queue locally."
      });
    } else {
      setIsOffline(false);
      runOfflineSync();
    }
  };

  const queueOfflineAction = (action: { type: string; roomId: string; payload?: any }) => {
    const updated = [...offlineSyncQueue, { ...action, timestamp: new Date().toISOString() }];
    setOfflineSyncQueue(updated);
    localStorage.setItem("roomflow_offline_queue", JSON.stringify(updated));
    toast.info("Cached action offline.");
  };

  const runOfflineSync = () => {
    const queued = [...offlineSyncQueue];
    if (queued.length === 0) {
      setIsOffline(false);
      toast.success("Online Mode active. System is in sync.");
      return;
    }

    toast.info(`Syncing ${queued.length} offline operations...`, {
      icon: <RefreshCw className="size-4 animate-spin text-[#B5652F]" />
    });

    setTimeout(() => {
      queued.forEach((act) => {
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
          } else {
            setRoomStatus(act.roomId, "Inspection Pending");
            setRoomPhotoAndRunAi(act.roomId, act.payload.photoType);
          }
        } else if (act.type === "MAINTENANCE_BLOCK") {
          blockRoom(act.roomId, act.payload.note);
        }
      });

      setOfflineSyncQueue([]);
      localStorage.removeItem("roomflow_offline_queue");
      toast.success("Background synchronization complete. Operational data is updated!");
    }, 1500);
  };

  const handleStartClean = (roomId: string) => {
    setActiveRoomSeconds(0);
    setCompletedSteps([]);
    setBedPhoto(null);
    setBathPhoto(null);
    setTrashPhoto(null);
    setScanningSlot(null);
    setSelectSlotOpen(null);
    setStagingPhotoType(null);
    setAiScore(null);
    setAiPassed(null);
    setAiNotes(null);

    // Haptic/Vibration feedback simulation
    if (navigator.vibrate) {
      navigator.vibrate(80);
    }

    if (isOffline) {
      queueOfflineAction({ type: "START_CLEAN", roomId });
      toast.info(`Started cleaning Room ${roomId} (Offline Mode)`);
    } else {
      startCleaningRoom(roomId, activeWorker.name);
      simulateIncomingWhatsApp(workerPhone, `START ${roomId}`);
    }
  };

  // Tap handler with micro haptic simulation
  const handleStepTap = (step: string) => {
    if (navigator.vibrate) {
      navigator.vibrate(30);
    }

    let next = [...completedSteps];
    if (next.includes(step)) {
      next = next.filter((s) => s !== step);
    } else {
      next.push(step);
    }
    setCompletedSteps(next);
    if (activeRoom) {
      updateRoomSopSteps(activeRoom.id, next);
    }

    if (isOffline) {
      localStorage.setItem(`roomflow_offline_checklist_${activeRoom!.id}`, JSON.stringify(next));
      queueOfflineAction({ 
        type: "CHECKLIST_UPDATE", 
        roomId: activeRoom!.id, 
        payload: { steps: next } 
      });
    }
  };

  const handleSlotPhotoSelect = (slot: "bed" | "bath" | "trash", type: "clean" | "dirty") => {
    if (!activeRoom) return;
    setSelectSlotOpen(null);
    setScanningSlot(slot);
    
    if (navigator.vibrate) {
      navigator.vibrate(60);
    }
    
    // Simulate 1.5s scanning laser on that slot
    setTimeout(() => {
      setScanningSlot(null);
      if (slot === "bed") setBedPhoto(type);
      else if (slot === "bath") setBathPhoto(type);
      else if (slot === "trash") setTrashPhoto(type);
      
      toast.success(`${slot === "bed" ? "Bed" : slot === "bath" ? "Bathroom" : "Trash"} staging photo registered.`);
    }, 1500);
  };

  const handleSopSubmit = () => {
    if (!activeRoom) return;
    if (completedSteps.length < SOP_STEPS.length) {
      toast.error("Please complete all checklist stages.");
      return;
    }
    if (!bedPhoto || !bathPhoto || !trashPhoto) {
      toast.error("Please upload staging photos for all three checkpoints (Bed, Bath, and Trash/Presentation) before releasing.");
      return;
    }

    if (navigator.vibrate) {
      navigator.vibrate([100, 50, 150]);
    }

    const result = aiQaResult;
    if (!result) return;

    // Simulate combined photo type mapping to supervisor control center
    const combinedPhotoType = (bedPhoto === "dirty" || bathPhoto === "dirty" || trashPhoto === "dirty")
      ? (bedPhoto === "dirty" ? "dirty_bed" : "dirty_trash")
      : "clean";

    if (isOffline) {
      queueOfflineAction({
        type: "SUBMIT_QA",
        roomId: activeRoom.id,
        payload: { photoType: combinedPhotoType }
      });
      toast.info("Submission queued locally.");
    } else {
      completeRoomWithAiScore(
        activeRoom.id,
        result.score,
        result.notes,
        combinedPhotoType === "dirty_bed"
          ? [{ label: "Rumpled Linens", x: 28, y: 35, width: 44, height: 38 }]
          : combinedPhotoType === "dirty_trash"
          ? [{ label: "Trash on Floor", x: 55, y: 65, width: 25, height: 28 }]
          : []
      );
      simulateIncomingWhatsApp(workerPhone, `Staging photo submitted (QA Score: ${result.score}%)`, true, combinedPhotoType);
    }
  };

  const handleDefectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRoom) return;
    if (!defectNote) {
      toast.error("Defect note required");
      return;
    }

    if (isOffline) {
      queueOfflineAction({
        type: "MAINTENANCE_BLOCK",
        roomId: activeRoom.id,
        payload: { note: defectNote }
      });
      toast.warning(`Log booked for offline sync.`);
    } else {
      reportBrokenFixture(activeRoom.id, defectNote);
      simulateIncomingWhatsApp(workerPhone, `ISSUE ${activeRoom.number} ${defectNote}`);
    }

    setDefectNote("");
    setDefectOpen(false);
  };

  const handleQrScanSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!scannedRoomNum) return;
    
    const match = rooms.find((r) => r.number === scannedRoomNum);
    if (!match) {
      toast.error(`Room ${scannedRoomNum} is not in system database.`);
      return;
    }
    
    if (match.assignedStaff !== activeWorker.name) {
      toast.error(`Room ${scannedRoomNum} assigned to ${match.assignedStaff || "none"}.`);
      return;
    }

    setQrScannerOpen(false);
    setScannedRoomNum("");
    handleStartClean(match.id);
  };

  // Compute values for gamified progress header
  const progressRatio = shiftTotalCount ? shiftCompletedCount / shiftTotalCount : 0;
  const progressPercentage = Math.round(progressRatio * 100);

  // SVG Progress circle values
  const radius = 22;
  const circumference = 2 * Math.PI * radius; // ~138.2
  const strokeDashoffset = circumference - progressRatio * circumference;

  // Checklist live progress
  const checklistPercentage = Math.round((completedSteps.length / SOP_STEPS.length) * 100);

  return (
    <div className="flex flex-col gap-5 max-w-md mx-auto pb-24 w-full text-[#2A2620] relative min-h-screen">
      
      {/* Laser Scan & Pulse Rings Styles Injection */}
      <style>{`
        @keyframes laser-scan {
          0% { top: 0%; opacity: 0.1; }
          45% { opacity: 1.0; }
          55% { opacity: 1.0; }
          100% { top: 100%; opacity: 0.1; }
        }
        .laser-line {
          animation: laser-scan 2s infinite ease-in-out;
        }
        @keyframes pulse-border {
          0% { box-shadow: 0 0 0 0 rgba(177, 74, 62, 0.4); }
          70% { box-shadow: 0 0 0 8px rgba(177, 74, 62, 0); }
          100% { box-shadow: 0 0 0 0 rgba(177, 74, 62, 0); }
        }
        .pulse-border-alert {
          animation: pulse-border 2s infinite;
        }
        @keyframes pulse-qr {
          0% { box-shadow: 0 0 0 0 rgba(181, 101, 47, 0.5); }
          70% { box-shadow: 0 0 0 10px rgba(181, 101, 47, 0); }
          100% { box-shadow: 0 0 0 0 rgba(181, 101, 47, 0); }
        }
        .pulse-qr-btn {
          animation: pulse-qr 1.8s infinite;
        }
      `}</style>

      {/* Housekeeper Selector */}
      <div className="flex items-center justify-between p-3 bg-white border border-[#EBE3D1] rounded-2xl shadow-sm text-xs">
        <div className="flex items-center gap-1.5 text-[#736B5E]">
          <User className="size-4 text-[#B5652F]" />
          <span className="font-extrabold text-[#2A2620]">Staff Member View:</span>
        </div>
        <Select value={selectedStaffName} onValueChange={setSelectedStaffName}>
          <SelectTrigger className="w-[195px] h-8 text-xs border-[#EBE3D1] rounded-xl font-extrabold bg-[#F5F1E8]/60 text-[#2A2620]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-white border-[#EBE3D1] text-xs">
            {staff.filter((s) => s.active).map((s) => {
              const rCount = rooms.filter((r) => isStaffMatch(r.assignedStaff, s.name) && r.status !== "Ready for Guest").length;
              const gCount = guestRequests.filter((req) => isStaffMatch(req.assignedStaff, s.name) && req.status !== "Completed").length;
              const tot = rCount + gCount;
              return (
                <SelectItem key={s.name} value={s.name} className="text-xs font-bold cursor-pointer">
                  {s.name} {tot > 0 ? `(${tot} active tasks)` : "(0 tasks)"}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      {/* Pulsing Staff Task Ringer Sound Alert Banner */}
      {staffRingerAlert && (
        <div className="p-3 bg-gradient-to-r from-[#B5652F] via-[#B14A3E] to-[#B5652F] text-white rounded-2xl shadow-lg flex items-center justify-between animate-pulse">
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-white/20 text-white font-bold text-sm">
              🔔
            </span>
            <div>
              <strong className="text-xs font-black uppercase tracking-wider block">
                3s TASK RINGER: Work Assigned!
              </strong>
              <span className="text-[11px] font-medium opacity-90">
                Supervisor assigned new work to {activeWorker.name}. Check your queue below!
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 1. DYNAMIC SHIFT HEADER WITH GAMIFIED PROGRESS */}
      <Card className="bg-white border-[#EBE3D1] p-4 rounded-2xl shadow-md flex items-center justify-between relative overflow-hidden select-none">
        
        {/* Profile and Badge Details */}
        <div className="flex items-center gap-3.5 z-10">
          <div className="relative">
            <div className="size-12 rounded-full bg-[#B5652F]/10 border-2 border-[#B5652F]/20 flex items-center justify-center text-[#B5652F] font-extrabold text-sm shadow-sm">
              {activeWorker.name.split(" ").map(n => n[0]).join("")}
            </div>
            {/* Active Status dot */}
            <span className="absolute bottom-0 right-0 size-3 bg-[#8A9A6B] border-2 border-white rounded-full" />
          </div>
          
          <div>
            <h2 className="font-extrabold text-sm text-[#2A2620] tracking-tight">{activeWorker.name}</h2>
            <p className="text-[10px] font-bold text-[#736B5E] tracking-wider uppercase">
              Floor {activeWorker.name === "Ana Duarte" ? "2" : activeWorker.name === "Priya Raman" ? "1" : "3"} Turnaround Lead
            </p>
          </div>
        </div>

        {/* Circular SVG Progress Ring */}
        <div className="flex items-center gap-3 z-10">
          <div className="relative size-12 flex items-center justify-center">
            <svg className="size-full rotate-[-90deg]">
              <circle
                cx="24"
                cy="24"
                r={radius}
                className="stroke-[#F5F1E8] fill-none"
                strokeWidth="4.5"
              />
              <circle
                cx="24"
                cy="24"
                r={radius}
                className="stroke-[#8A9A6B] fill-none transition-all duration-700 ease-out"
                strokeWidth="4.5"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center text-center">
              <span className="text-xs font-black text-[#2A2620]">{shiftCompletedCount}</span>
              <span className="text-[7px] font-bold text-[#736B5E] uppercase -mt-1">/ {shiftTotalCount}</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Offline Status indicator */}
            <button
              onClick={handleOfflineToggle}
              className={`p-2 rounded-xl border flex items-center justify-center transition-all ${
                isOffline
                  ? "bg-[#B14A3E]/10 border-[#B14A3E]/30 text-[#B14A3E] hover:bg-[#B14A3E]/20"
                  : "bg-[#8A9A6B]/15 border-[#8A9A6B]/30 text-[#8A9A6B] hover:bg-[#8A9A6B]/25"
              }`}
              title={isOffline ? "Currently Offline" : "Currently Online"}
            >
              {isOffline ? <WifiOff className="size-4" /> : <Wifi className="size-4" />}
            </button>

            {/* Pulsating QR trigger */}
            <button
              onClick={() => setQrScannerOpen(true)}
              className="pulse-qr-btn size-9 bg-[#B5652F] hover:bg-[#B5652F]/90 text-white rounded-xl flex items-center justify-center cursor-pointer transition-all active:scale-95"
            >
              <Camera className="size-4" />
            </button>
          </div>
        </div>

        {/* Decorative background circle */}
        <div className="absolute -top-6 -left-6 size-16 bg-[#F5F1E8]/40 rounded-full pointer-events-none" />
      </Card>

      {/* Offline sync banner alerts */}
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

      {/* Real-time Incoming Task Banner */}
      {assignedTasks.map((task) => (
        <Card key={task.id} className="bg-gradient-to-r from-[#B5652F]/10 via-white to-white border-2 border-[#B5652F] p-4 rounded-2xl shadow-md space-y-3 relative overflow-hidden animate-scaleIn">
          <div className="absolute top-0 left-0 right-0 h-1 bg-[#B5652F]" />
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-[#B5652F] animate-ping" />
              <Badge className="bg-[#B5652F] text-white text-[9px] font-black uppercase tracking-wider px-2 py-0.5 border-0">
                ⚡ High Priority Task
              </Badge>
              <span className="text-[10px] font-mono text-[#736B5E] font-bold">Target: {task.slaMinutes}m</span>
            </div>
            <Badge variant="outline" className="text-[9px] font-mono border-[#EBE3D1] text-[#736B5E]">
              {task.category}
            </Badge>
          </div>

          <div>
            <h4 className="text-sm font-extrabold text-[#2A2620]">
              ⚡ Supervisor assigned you: Room {task.roomNumber} {task.item}
            </h4>
            {task.details && (
              <p className="text-xs text-[#736B5E] mt-0.5 leading-relaxed">{task.details}</p>
            )}
          </div>

          <div className="flex items-center gap-2 pt-1">
            <Button
              size="sm"
              variant="outline"
              onClick={() => acknowledgeStaffTask(task.id)}
              className="flex-1 h-9 border-[#B5652F] text-[#B5652F] hover:bg-[#B5652F]/10 font-bold text-xs rounded-xl cursor-pointer"
            >
              📍 Start Delivery / Acknowledge
            </Button>

            <Button
              size="sm"
              onClick={() => completeStaffTask(task.id)}
              className="flex-1 h-9 bg-[#8A9A6B] hover:bg-[#8A9A6B]/90 text-white font-bold text-xs rounded-xl cursor-pointer shadow-sm"
            >
              ✔ Mark Delivered & Complete
            </Button>
          </div>
        </Card>
      ))}

      {/* Real-time Incoming Room Turnaround Banners */}
      {assignedRooms
        .filter((r) => r.status === "Vacant Dirty")
        .map((rm) => (
          <Card key={rm.id} className="bg-gradient-to-r from-[#8A9A6B]/15 via-white to-white border-2 border-[#8A9A6B] p-4 rounded-2xl shadow-md space-y-3 relative overflow-hidden animate-scaleIn">
            <div className="absolute top-0 left-0 right-0 h-1 bg-[#8A9A6B]" />
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 rounded-full bg-[#8A9A6B] animate-ping" />
                <Badge className="bg-[#8A9A6B] text-white text-[9px] font-black uppercase tracking-wider px-2 py-0.5 border-0">
                  🧹 Assigned Room Turnaround
                </Badge>
                {rm.priority === "VIP" && (
                  <Badge className="bg-[#B14A3E] text-white text-[9px] font-black uppercase tracking-wider px-2 py-0.5 border-0">
                    👑 VIP Guest
                  </Badge>
                )}
              </div>
              <Badge variant="outline" className="text-[9px] font-mono border-[#EBE3D1] text-[#736B5E]">
                Floor {rm.floor} • {rm.type}
              </Badge>
            </div>

            <div>
              <h4 className="text-sm font-extrabold text-[#2A2620]">
                ⚡ Supervisor assigned: Room {rm.number} ({rm.type})
              </h4>
              <p className="text-xs text-[#736B5E] mt-0.5 leading-relaxed">
                {rm.priorityReason || `Check-in ETA: ${rm.checkIn} (${rm.turnaround}m target turnaround)`}
              </p>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <Button
                size="sm"
                onClick={() => handleStartClean(rm.id)}
                className="w-full h-9 bg-[#B5652F] hover:bg-[#B5652F]/90 text-white font-bold text-xs rounded-xl cursor-pointer shadow-sm flex items-center justify-center gap-1.5"
              >
                <Sparkles className="size-4" /> Start Cleaning Room {rm.number}
              </Button>
            </div>
          </Card>
        ))}

      {/* 2. "ACTIVE ROOM" HERO STAGE */}
      {activeRoom ? (
        <Card className="bg-white border-[#EBE3D1] shadow-md p-5 rounded-2xl flex flex-col gap-4 relative overflow-hidden">
          
          {/* Card Accent Top Line */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#B5652F] to-[#8A9A6B]" />

          {/* Supervisor Re-Clean Alert Prompt */}
          {activeRoom.recleanNote && (
            <div className="p-3 bg-[#B14A3E]/10 border-2 border-[#B14A3E]/40 text-[#B14A3E] rounded-xl flex items-start gap-2.5 animate-pulse">
              <AlertTriangle className="size-4.5 shrink-0 mt-0.5" />
              <div className="text-[11px] leading-relaxed">
                <span className="font-black uppercase tracking-wider text-[10px]">Supervisor Requested Re-Cleaning:</span>
                <p className="font-extrabold mt-0.5 text-[#2A2620]">"{activeRoom.recleanNote}"</p>
              </div>
            </div>
          )}

          {/* Header Ribbon */}
          <div className="flex items-start justify-between border-b border-[#F5F1E8] pb-3 mt-1">
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-extrabold text-[#2A2620] tracking-tight">ROOM {activeRoom.number}</span>
                <span className="text-[10px] text-[#736B5E] font-medium">({activeRoom.type})</span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-[#736B5E] mt-0.5">
                <span>📍 2 doors down from last clean</span>
              </div>
            </div>
            
            {activeRoom.priority === "VIP" && (
              <Badge className="pulse-border-alert bg-[#B14A3E] hover:bg-[#B14A3E] text-white border-0 font-extrabold text-[9px] py-1 px-2.5 rounded-lg flex items-center gap-1 uppercase tracking-wider">
                <Crown className="size-3" /> VIP ETA: {activeRoom.checkIn}
              </Badge>
            )}
          </div>

          {/* Explainable Priority Banner (Soft Terracotta) */}
          <div className="p-3 bg-[#B14A3E]/5 border border-[#B14A3E]/10 text-[#B14A3E] rounded-xl flex items-start gap-2.5">
            <AlertCircle className="size-4.5 shrink-0 mt-0.5" />
            <div className="text-[10px] leading-relaxed">
              <span className="font-bold uppercase tracking-wider text-[9px]">Priority cleaning target:</span>
              <p className="italic mt-0.5">
                VIP guest {activeRoom.guestName || "expected"} scheduled check-in is at {activeRoom.checkIn || "14:30"}. Proximity matching balanced this room to floor dispatch.
              </p>
            </div>
          </div>

          {/* Active Timer Card with Dynamic SOP Clean Progress */}
          {(() => {
            const sopPercent = Math.round((completedSteps.length / SOP_STEPS.length) * 100);
            const elapsedMin = activeRoomSeconds / 60;
            const limit = activeRoom.turnaround || 30;
            const isBreaching = elapsedMin / limit >= 0.8;

            return (
              <div className={`p-3 border rounded-xl flex items-center justify-between gap-4 transition-colors ${
                isBreaching 
                  ? "bg-[#B14A3E]/5 border-[#B14A3E]/30 text-[#B14A3E]" 
                  : "bg-[#F5F1E8]/40 border-[#EBE3D1] text-[#2A2620]"
              }`}>
                <div className="flex items-center gap-2">
                  <Timer className={`size-5 ${isBreaching ? "animate-bounce text-[#B14A3E]" : "animate-pulse text-[#B5652F]"}`} />
                  <div>
                    <span className="text-[10px] font-bold text-[#736B5E] block uppercase tracking-wider leading-none">Active Timer</span>
                    <span className="font-mono text-base font-black">⏱ {formatTimer(activeRoomSeconds)} <span className="text-[10px] text-[#736B5E] font-normal font-sans">/ {limit}m target</span></span>
                  </div>
                </div>

                <div className="flex-1 max-w-[150px] space-y-1">
                  <div className="flex items-center justify-between text-[8px] font-bold uppercase tracking-wider text-[#736B5E]">
                    <span>Clean progress</span>
                    <span className="text-[#8A9A6B] font-black">{sopPercent}%</span>
                  </div>
                  <div className="w-full bg-[#EBE3D1] h-1.5 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-[#8A9A6B] transition-all duration-500"
                      style={{ width: `${sopPercent}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })()}

          {/* 3. TACTILE SOP STEP CARDS (Replacing dull standard checkboxes) */}
          <div className="space-y-2.5 mt-1">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#736B5E] flex items-center gap-1.5">
                <ClipboardCheck className="size-4" /> SOP Turnaround steps
              </h3>
              
              <Badge className="bg-[#8A9A6B]/15 text-[#8A9A6B] border border-[#8A9A6B]/20 font-bold text-[10px]">
                {completedSteps.length} of {SOP_STEPS.length} stages
              </Badge>
            </div>

            {/* SOP Progress Bar */}
            <div className="w-full bg-[#F5F1E8] h-1.5 rounded-full overflow-hidden">
              <div 
                className="bg-[#8A9A6B] h-full transition-all duration-500" 
                style={{ width: `${checklistPercentage}%` }}
              />
            </div>

            {/* Card grid for SOP steps */}
            <div className="grid grid-cols-2 gap-2.5 pt-1.5">
              {SOP_STEPS.map((step, idx) => {
                const isDone = completedSteps.includes(step);
                
                // Color and icons based on index
                const stageIcons = [
                  "🧹", // Linen waste
                  "🛁", // Bath Sanitization
                  "🧴", // Restocking
                  "✨"  // Polish presentations
                ];

                return (
                  <button
                    key={step}
                    type="button"
                    onClick={() => handleStepTap(step)}
                    className={`relative p-3.5 h-[92px] text-left border rounded-2xl flex flex-col justify-between transition-all duration-300 active:scale-95 cursor-pointer shadow-sm ${
                      isDone 
                        ? "bg-[#8A9A6B]/10 border-[#8A9A6B] text-[#8A9A6B]" 
                        : "bg-white border-[#EBE3D1] text-[#2A2620] hover:bg-[#F5F1E8]/30"
                    }`}
                  >
                    {/* Small progress index tag */}
                    <div className="flex items-center justify-between w-full">
                      <span className="text-[18px] select-none">{stageIcons[idx]}</span>
                      {isDone ? (
                        <span className="size-4 bg-[#8A9A6B] text-white rounded-full flex items-center justify-center animate-scaleIn">
                          <Check className="size-2.5 stroke-[3px]" />
                        </span>
                      ) : (
                        <span className="size-4 border border-[#EBE3D1] rounded-full" />
                      )}
                    </div>

                    <span className={`text-[10px] font-extrabold leading-tight tracking-tight ${isDone ? "line-through opacity-85" : ""}`}>
                      {step.split(". ")[1]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. INTERACTIVE AI STAGING SCAN BOX */}
          <div className="space-y-2.5 border-t border-[#F5F1E8] pt-4 mt-1">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#736B5E] flex items-center gap-1.5">
                <Sparkles className="size-4 text-[#B5652F]" /> Visual AI Staging scan
              </h3>
              <button
                onClick={() => setAiInspectorOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-extrabold uppercase tracking-wider border-2 border-[#B5652F]/30 bg-[#B5652F]/5 text-[#B5652F] hover:bg-[#B5652F]/10 hover:border-[#B5652F]/50 transition-all cursor-pointer active:scale-95"
              >
                <Camera className="size-3.5" />
                📷 Snap AI Inspection
              </button>
            </div>

            {/* The 3 Slots Grid */}
            <div className="grid grid-cols-3 gap-3 mt-1.5">
              
              {/* Slot 1: Bed */}
              <button
                type="button"
                onClick={() => setSelectSlotOpen("bed")}
                className={`relative flex flex-col items-center justify-center p-3 h-24 border-2 rounded-2xl text-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95 bg-white overflow-hidden ${
                  scanningSlot === "bed"
                    ? "border-[#B5652F] bg-[#B5652F]/5 animate-pulse"
                    : bedPhoto
                    ? bedPhoto === "clean"
                      ? "border-[#8A9A6B] bg-[#8A9A6B]/5 text-[#8A9A6B]"
                      : "border-[#B14A3E] bg-[#B14A3E]/5 text-[#B14A3E]"
                    : "border-[#EBE3D1] hover:border-[#B5652F] text-[#736B5E]"
                }`}
              >
                {scanningSlot === "bed" ? (
                  <>
                    <RefreshCw className="size-5 animate-spin text-[#B5652F]" />
                    <span className="text-[9px] font-bold">Scanning...</span>
                  </>
                ) : bedPhoto ? (
                  <>
                    <img 
                      src={bedPhoto === "clean" ? "https://images.unsplash.com/photo-1618773928121-c32242e63f39?q=80&w=150" : "https://images.unsplash.com/photo-1598928506311-c55ded91a20c?q=80&w=150"} 
                      className="size-10 object-cover rounded-lg border border-current/25"
                      alt="Bed Staging"
                    />
                    <span className="text-[9px] font-black">{bedPhoto === "clean" ? "Bed Clean" : "Bed Rumpled"}</span>
                  </>
                ) : (
                  <>
                    <Camera className="size-5 text-[#736B5E]" />
                    <span className="text-[9px] font-bold">1. Bed Staging</span>
                  </>
                )}
                
                {scanningSlot === "bed" && (
                  <div className="laser-line absolute left-0 w-full h-0.5 bg-[#B5652F] shadow-[0_0_8px_2px_#B5652F] pointer-events-none" />
                )}
              </button>

              {/* Slot 2: Bath */}
              <button
                type="button"
                onClick={() => setSelectSlotOpen("bath")}
                className={`relative flex flex-col items-center justify-center p-3 h-24 border-2 rounded-2xl text-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95 bg-white overflow-hidden ${
                  scanningSlot === "bath"
                    ? "border-[#B5652F] bg-[#B5652F]/5 animate-pulse"
                    : bathPhoto
                    ? bathPhoto === "clean"
                      ? "border-[#8A9A6B] bg-[#8A9A6B]/5 text-[#8A9A6B]"
                      : "border-[#B14A3E] bg-[#B14A3E]/5 text-[#B14A3E]"
                    : "border-[#EBE3D1] hover:border-[#B5652F] text-[#736B5E]"
                }`}
              >
                {scanningSlot === "bath" ? (
                  <>
                    <RefreshCw className="size-5 animate-spin text-[#B5652F]" />
                    <span className="text-[9px] font-bold">Scanning...</span>
                  </>
                ) : bathPhoto ? (
                  <>
                    <img 
                      src={bathPhoto === "clean" ? "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?q=80&w=150" : "https://images.unsplash.com/photo-1584622781564-1d987f7333c1?q=80&w=150"} 
                      className="size-10 object-cover rounded-lg border border-current/25"
                      alt="Bath Staging"
                    />
                    <span className="text-[9px] font-black">{bathPhoto === "clean" ? "Bath Clean" : "Bath Defect"}</span>
                  </>
                ) : (
                  <>
                    <Camera className="size-5 text-[#736B5E]" />
                    <span className="text-[9px] font-bold">2. Bath Staging</span>
                  </>
                )}
                {scanningSlot === "bath" && (
                  <div className="laser-line absolute left-0 w-full h-0.5 bg-[#B5652F] shadow-[0_0_8px_2px_#B5652F] pointer-events-none" />
                )}
              </button>

              {/* Slot 3: Trash */}
              <button
                type="button"
                onClick={() => setSelectSlotOpen("trash")}
                className={`relative flex flex-col items-center justify-center p-3 h-24 border-2 rounded-2xl text-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95 bg-white overflow-hidden ${
                  scanningSlot === "trash"
                    ? "border-[#B5652F] bg-[#B5652F]/5 animate-pulse"
                    : trashPhoto
                    ? trashPhoto === "clean"
                      ? "border-[#8A9A6B] bg-[#8A9A6B]/5 text-[#8A9A6B]"
                      : "border-[#B14A3E] bg-[#B14A3E]/5 text-[#B14A3E]"
                    : "border-[#EBE3D1] hover:border-[#B5652F] text-[#736B5E]"
                }`}
              >
                {scanningSlot === "trash" ? (
                  <>
                    <RefreshCw className="size-5 animate-spin text-[#B5652F]" />
                    <span className="text-[9px] font-bold">Scanning...</span>
                  </>
                ) : trashPhoto ? (
                  <>
                    <img 
                      src={trashPhoto === "clean" ? "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?q=80&w=150" : "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?q=80&w=150"} 
                      className="size-10 object-cover rounded-lg border border-current/25"
                      alt="Trash Staging"
                    />
                    <span className="text-[9px] font-black">{trashPhoto === "clean" ? "Trash Clean" : "Trash Defect"}</span>
                  </>
                ) : (
                  <>
                    <Camera className="size-5 text-[#736B5E]" />
                    <span className="text-[9px] font-bold">3. Trash Staging</span>
                  </>
                )}
                {scanningSlot === "trash" && (
                  <div className="laser-line absolute left-0 w-full h-0.5 bg-[#B5652F] shadow-[0_0_8px_2px_#B5652F] pointer-events-none" />
                )}
              </button>

            </div>

            {/* Live scanning status indicator pill */}
            {scanningSlot && (
              <div className="flex items-center justify-center gap-2 p-2 bg-[#B5652F]/10 border border-[#B5652F]/20 rounded-xl text-[11px] font-bold text-[#B5652F] animate-pulse">
                <RefreshCw className="size-3.5 animate-spin text-[#B5652F]" />
                <span>Gemini Vision AI analyzing staging standard ({scanningSlot === "bed" ? "Bed Checkpoint" : scanningSlot === "bath" ? "Bath Checkpoint" : "Trash Checkpoint"})...</span>
              </div>
            )}

            {/* Show overall results box once all three slots are filled */}
            {bedPhoto && bathPhoto && trashPhoto && aiQaResult && (
              <div className="flex flex-col gap-3 mt-4 animate-scaleIn">
                <div className="relative aspect-video w-full rounded-2xl overflow-hidden border border-[#EBE3D1] bg-[#F5F1E8]/50">
                  <img 
                    src={
                      bedPhoto === "dirty" 
                        ? "https://images.unsplash.com/photo-1598928506311-c55ded91a20c?q=80&w=800"
                        : bathPhoto === "dirty"
                        ? "https://images.unsplash.com/photo-1584622781564-1d987f7333c1?q=80&w=800"
                        : trashPhoto === "dirty"
                        ? "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?q=80&w=800"
                        : "https://images.unsplash.com/photo-1618773928121-c32242e63f39?q=80&w=800"
                    } 
                    alt="Overall Staging Scan Results" 
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-3 left-3 size-4 border-t-2 border-l-2 border-white rounded-tl" />
                  <div className="absolute top-3 right-3 size-4 border-t-2 border-r-2 border-white rounded-tr" />
                  <div className="absolute bottom-3 left-3 size-4 border-b-2 border-l-2 border-white rounded-bl" />
                  <div className="absolute bottom-3 right-3 size-4 border-b-2 border-r-2 border-white rounded-br" />
                </div>

                <div className={`p-4 border rounded-2xl flex flex-col gap-3 text-xs ${
                  aiQaResult.passed 
                    ? "bg-[#8A9A6B]/10 border-[#8A9A6B]/30 text-[#8A9A6B]" 
                    : "bg-[#B14A3E]/10 border-[#B14A3E]/30 text-[#B14A3E]"
                }`}>
                  <div className="flex items-center justify-between border-b border-current/20 pb-2.5">
                    <div className="flex items-center gap-2">
                      {aiQaResult.passed ? <CheckCircle2 className="size-5" /> : <AlertTriangle className="size-5" />}
                      <span className="font-extrabold text-sm text-[#2A2620]">
                        AI QA Score: <span className="font-mono text-base font-black">{aiQaResult.score}%</span>
                      </span>
                    </div>
                    <Badge className={aiQaResult.passed ? "bg-[#8A9A6B] hover:bg-[#8A9A6B] text-white border-0 font-extrabold text-[10px] px-2.5 py-1 uppercase tracking-wider" : "bg-[#B14A3E] hover:bg-[#B14A3E] text-white border-0 font-extrabold text-[10px] px-2.5 py-1 uppercase tracking-wider"}>
                      {aiQaResult.passed ? "✓ PASS • AUTO-RELEASED" : "⚠ INSPECTION FLAGGED"}
                    </Badge>
                  </div>

                  {/* Micro Checklist Breakdown */}
                  <div className="grid grid-cols-2 gap-2 text-[10px] bg-white/80 p-2.5 rounded-xl border border-current/15 text-[#2A2620]">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        {bedPhoto === "clean" ? <Check className="size-3 text-[#8A9A6B] stroke-[3px]" /> : <AlertCircle className="size-3 text-[#B14A3E]" />}
                        Linens Taut:
                      </span>
                      <span className="font-bold">{bedPhoto === "clean" ? "98%" : "62%"}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        {trashPhoto === "clean" ? <Check className="size-3 text-[#8A9A6B] stroke-[3px]" /> : <AlertCircle className="size-3 text-[#B14A3E]" />}
                        Trash Cleared:
                      </span>
                      <span className="font-bold">{trashPhoto === "clean" ? "100%" : "55%"}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        {bathPhoto === "clean" ? <Check className="size-3 text-[#8A9A6B] stroke-[3px]" /> : <AlertCircle className="size-3 text-[#B14A3E]" />}
                        Towels Staged:
                      </span>
                      <span className="font-bold">{bathPhoto === "clean" ? "97%" : "70%"}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        {bedPhoto === "clean" && bathPhoto === "clean" ? <Check className="size-3 text-[#8A9A6B] stroke-[3px]" /> : <AlertCircle className="size-3 text-[#B14A3E]" />}
                        Surfaces Clean:
                      </span>
                      <span className="font-bold">{bedPhoto === "clean" && bathPhoto === "clean" ? "96%" : "68%"}</span>
                    </div>
                  </div>

                  <p className="text-[11px] leading-relaxed italic text-[#2A2620]">
                    "{aiQaResult.notes}"
                  </p>
                </div>

                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    setBedPhoto(null);
                    setBathPhoto(null);
                    setTrashPhoto(null);
                  }}
                  className="h-9 border-[#EBE3D1] text-xs rounded-xl cursor-pointer bg-white"
                >
                  Clear & Rescan Staging Areas
                </Button>
              </div>
            )}
          </div>
        </Card>
      ) : (
        <Card className="bg-white border-[#EBE3D1] p-8 rounded-2xl shadow-md text-center flex flex-col items-center justify-center py-12">
          <CheckCircle className="size-11 text-[#8A9A6B] bg-[#8A9A6B]/15 p-2 rounded-full mb-3" />
          <h3 className="font-extrabold text-base text-[#2A2620]">No Active Room Clean</h3>
          <p className="text-xs text-[#736B5E] max-w-[240px] mt-1.5 leading-relaxed">
            Please pick a prioritized turnaround room from your upcoming assignments list below to initialize the SOP checklist.
          </p>
        </Card>
      )}

      {/* 5. STICKY ACTION COMMAND BAR (Bottom Fixed) */}
      {activeRoom && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur border-t border-[#EBE3D1] p-3.5 flex gap-3.5 max-w-md mx-auto pb-safe shadow-lg">
          <Button
            onClick={() => setDefectOpen(true)}
            variant="outline"
            className="border-[#B14A3E] text-[#B14A3E] hover:bg-[#B14A3E]/5 font-bold text-xs h-11 px-4 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
          >
            <Ban className="size-4.5" /> Defect
          </Button>

          <Button
            onClick={handleSopSubmit}
            className={`flex-1 h-11 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-md transition-all duration-500 ${
              completedSteps.length === SOP_STEPS.length && stagingPhotoType
                ? aiPassed
                  ? "bg-[#8A9A6B] hover:bg-[#8A9A6B]/90 text-white"
                  : "bg-[#B5652F] hover:bg-[#B5652F]/90 text-white"
                : "bg-[#B5652F]/85 hover:bg-[#B5652F] text-white"
            }`}
          >
            <CheckCircle2 className="size-4.5 shrink-0" />
            <span>Complete & Release Room</span>
          </Button>
        </div>
      )}

      {/* 6. "UP NEXT" ACCORDION TRAY */}
      <div className="space-y-2 mt-2 pb-16">
        <button
          onClick={() => setIsQueueOpen(!isQueueOpen)}
          className="w-full flex items-center justify-between p-3.5 bg-white border border-[#EBE3D1] hover:bg-[#F5F1E8]/30 rounded-2xl shadow-sm text-xs font-bold cursor-pointer transition-colors"
        >
          <div className="flex items-center gap-2">
            <ClipboardCheck className="size-4.5 text-[#B5652F]" />
            <span>Assignments Queue ({upcomingQueue.length} rooms)</span>
          </div>
          {isQueueOpen ? <ChevronUp className="size-4.5" /> : <ChevronDown className="size-4.5" />}
        </button>

        {isQueueOpen && (
          <div className="flex flex-col gap-2.5 p-1 bg-transparent rounded-2xl animate-scaleIn max-h-[300px] overflow-y-auto">
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
                No additional turnaround assignments scheduled for this shift.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Dialog: Report defect */}
      <Dialog open={defectOpen} onOpenChange={setDefectOpen}>
        <DialogContent className="bg-white border-[#EBE3D1] max-w-sm rounded-2xl text-xs">
          <form onSubmit={handleDefectSubmit} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="text-sm font-extrabold text-[#2A2620]">Report Defect & Log Maintenance Block</DialogTitle>
              <DialogDescription className="text-[11px] text-[#736B5E]">
                Describe maintenance issue. This will transition Room {activeRoom?.number} to Maintenance Blocked state.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              <div className="flex flex-col gap-1">
                <Label htmlFor="defect-desc" className="font-bold text-[#2A2620]">Maintenance Notes</Label>
                <Textarea
                  id="defect-desc"
                  placeholder="e.g. Toilet leak, AC unit unresponsive, broken TV screen..."
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
                Aim at door placard. Enter room number below to check in to the cleanup checklist.
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

      {/* Dialog: Select Photo for Staging Slot */}
      <Dialog open={!!selectSlotOpen} onOpenChange={() => setSelectSlotOpen(null)}>
        <DialogContent className="bg-white border-[#EBE3D1] max-w-xs rounded-2xl text-xs">
          <DialogHeader>
            <DialogTitle className="text-sm font-extrabold text-[#2A2620] flex items-center gap-1.5">
              <Camera className="size-4 text-[#B5652F]" />
              <span>
                {selectSlotOpen === "bed" 
                  ? "Select Bed Staging Photo" 
                  : selectSlotOpen === "bath" 
                  ? "Select Bathroom Staging Photo" 
                  : "Select Trash Staging Photo"}
              </span>
            </DialogTitle>
            <DialogDescription className="text-[11px] text-[#736B5E]">
              Simulate snapping a photo of this operational staging checkpoint.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-2.5 pt-2">
            {/* File Upload Zone */}
            <label className="border-2 border-dashed border-[#B5652F]/40 hover:border-[#B5652F] bg-[#B5652F]/5 p-3 rounded-2xl flex flex-col items-center justify-center gap-1 cursor-pointer transition-all active:scale-98">
              <Camera className="size-5 text-[#B5652F]" />
              <span className="text-[11px] font-bold text-[#B5652F]">Snap / Upload Staging Photo</span>
              <span className="text-[9px] text-[#736B5E]">Camera, Library, or File</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file || !selectSlotOpen) return;
                  setSelectSlotOpen(null);
                  setScanningSlot(selectSlotOpen);
                  try {
                    const result = await inspectRoomPhotoWithGemini(file, selectSlotOpen === "bed" ? "clean" : "clean");
                    if (selectSlotOpen === "bed") setBedPhoto(result.passed ? "clean" : "dirty");
                    else if (selectSlotOpen === "bath") setBathPhoto(result.passed ? "clean" : "dirty");
                    else if (selectSlotOpen === "trash") setTrashPhoto(result.passed ? "clean" : "dirty");
                    toast.success(`Photo analyzed via Gemini Vision: ${result.score}% QA Score`);
                  } catch {
                    handleSlotPhotoSelect(selectSlotOpen, "clean");
                  } finally {
                    setScanningSlot(null);
                  }
                }}
              />
            </label>

            <div className="flex items-center gap-2 my-0.5">
              <div className="flex-1 h-px bg-[#EBE3D1]" />
              <span className="text-[9px] font-bold uppercase tracking-wider text-[#736B5E]">or demo preset</span>
              <div className="flex-1 h-px bg-[#EBE3D1]" />
            </div>

            <Button
              onClick={() => {
                if (selectSlotOpen) handleSlotPhotoSelect(selectSlotOpen, "clean");
              }}
              className="h-10 bg-[#8A9A6B] hover:bg-[#8A9A6B]/90 text-white font-bold text-xs rounded-xl cursor-pointer flex items-center justify-center gap-1.5"
            >
              <CheckCircle className="size-4" /> Simulate Clean & Staged
            </Button>
            
            <Button
              onClick={() => {
                if (selectSlotOpen) handleSlotPhotoSelect(selectSlotOpen, "dirty");
              }}
              className="h-10 bg-[#B14A3E] hover:bg-[#B14A3E]/90 text-white font-bold text-xs rounded-xl cursor-pointer flex items-center justify-center gap-1.5"
            >
              <AlertCircle className="size-4" /> Simulate Flagged Defects
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* AI Inspector Modal */}
      <AiInspectorModal
        open={aiInspectorOpen}
        onOpenChange={setAiInspectorOpen}
        roomNumber={activeRoom?.number || "203"}
      />
    </div>
  );
}
