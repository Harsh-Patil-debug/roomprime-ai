import { createContext, useContext, useMemo, useState, useEffect, type ReactNode } from "react";
import {
  initialRooms,
  initialStaff,
  initialGuestRequests,
  priorityWeight,
  STAFF_FLOORS,
  STAFF_PHONES,
  type Room,
  type RoomStatus,
  type Staff,
  type RoomType,
  type PriorityTag,
  type GuestRequest,
  type Department,
  type RequestStatus,
  type RequestPriority,
  type RequestCategory,
} from "@/lib/cleansync-data";
import { getRoomsFn, updateRoomFn, getRequestsFn, insertRequestFn, updateRequestFn } from "@/lib/server-functions";
import { toast } from "sonner";
import { 
  triggerSupervisorRingerBroadcast, 
  playSupervisorRingerSound,
  triggerStaffRingerBroadcast,
  playStaffRingerSound
} from "@/services/audioRinger";

export interface WhatsAppLog {
  id: string;
  timestamp: string;
  sender: string;
  body: string;
  type: "inbound" | "outbound";
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  unread: boolean;
  type: "alert" | "info" | "success" | "warning";
  targetRoom?: string | undefined;
  targetRequestId?: string | undefined;
}

export { STAFF_FLOORS, STAFF_PHONES };

const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: "notif-1",
    title: "⚠️ Urgent Maintenance Alert",
    message: "Room 105: AC thermostat unresponsive ticket logged.",
    timestamp: "Just now",
    unread: true,
    type: "alert",
    targetRoom: "105",
  },
  {
    id: "notif-2",
    title: "🔍 AI Staging Defect",
    message: "Room 104: AI inspection review flagged defects (Rumpled Linens).",
    timestamp: "5m ago",
    unread: true,
    type: "warning",
    targetRoom: "104",
  },
  {
    id: "notif-3",
    title: "✅ Cleaning Completed",
    message: "Priya Raman: Marked Room 101 cleaning completed & ready.",
    timestamp: "12m ago",
    unread: true,
    type: "success",
    targetRoom: "101",
  },
];

const NOTIF_STORAGE_KEY = "roomflow_notifications";

function getStoredNotifications(): NotificationItem[] {
  if (typeof window === "undefined") return INITIAL_NOTIFICATIONS;
  try {
    const raw = localStorage.getItem(NOTIF_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // fallback
  }
  return INITIAL_NOTIFICATIONS;
}

interface RoomFlowCtx {
  rooms: Room[];
  staff: Staff[];
  whatsappLogs: WhatsAppLog[];
  guestRequests: GuestRequest[];
  requests: GuestRequest[]; // Alias for guestRequests
  notifications: NotificationItem[];
  currentRole: "ops" | "staff" | "guest" | "requests";
  setCurrentRole: (role: "ops" | "staff" | "guest" | "requests") => void;
  lastAssignedStaff: string | null;
  setLastAssignedStaff: (name: string | null) => void;

  // Room lifecycle methods
  setRoomStatus: (id: string, status: RoomStatus) => void;
  assignRoom: (id: string, staffName: string | null) => void;
  blockRoom: (id: string, note: string) => void;
  reportBrokenFixture: (roomId: string, defectReason: string, photoUrl?: string) => void;
  startCleaningRoom: (roomId: string, staffName?: string) => void;
  approveRoom: (roomId: string) => void;
  rejectRoom: (roomId: string, reason?: string) => void;
  updateRoomSopSteps: (roomId: string, steps: string[]) => void;
  overruleApproveRoom: (roomId: string) => void;
  rejectRecleanRoom: (roomId: string, note: string) => void;
  completeRoomWithAiScore: (
    roomId: string,
    score: number,
    notes: string,
    bboxes?: Array<{ label: string; x: number; y: number; width: number; height: number }>,
    photoUrl?: string
  ) => void;
  addRoom: (room: { number: string; type: RoomType; priority: PriorityTag; guestName: string; checkIn: string }) => void;
  importCSV: (csvContent: string) => { success: boolean; count: number; errors: string[] };

  // Dispatch & AI
  autoDispatchEngine: () => number;
  autoOptimize: () => number;
  runBatchDispatch: (
    assignments: Array<{ targetId: string; targetType: "room" | "request"; staffName: string }>
  ) => void;
  setRoomPhotoAndRunAi: (roomId: string, photoType: "clean" | "dirty_bed" | "dirty_trash") => void;
  simulateIncomingWhatsApp: (
    from: string,
    body: string,
    hasPhoto?: boolean,
    photoType?: "clean" | "dirty_bed" | "dirty_trash"
  ) => void;

  // Requests / Tickets
  addGuestRequest: (
    roomNumber: string,
    category: RequestCategory,
    item: string,
    details?: string,
    priority?: RequestPriority,
    assignedDept?: Department
  ) => void;
  createGuestRequest: (
    roomNumber: string,
    category: RequestCategory,
    item: string,
    details?: string,
    priority?: RequestPriority,
    assignedDept?: Department
  ) => void;
  updateGuestRequestStatus: (id: string, status: RequestStatus) => void;
  assignGuestRequest: (id: string, staffName: string | null) => void;
  assignTaskToStaff: (requestId: string, staffId: string, staffName: string) => void;
  assignRequestToStaff: (requestId: string, staffId: string, staffName: string) => void;
  acknowledgeStaffTask: (requestId: string) => void;
  completeStaffTask: (requestId: string) => void;
  updateRequestProgress: (requestId: string, stage: "on_the_way" | "delivered") => void;
  autoAssignNearestRequest: (requestId: string) => void;
  resolveRequest: (requestId: string) => void;
  escalateGuestRequest: (id: string) => void;

  // Notifications
  addNotification: (notif: Omit<NotificationItem, "id" | "timestamp" | "unread">) => void;
  clearNotifications: () => void;
  markNotificationRead: (id: string) => void;

  // Derived state
  queue: Room[];
  kpis: {
    readiness: number;
    avgTurnaround: number;
    vipPending: number;
    utilization: number;
    slaSuccessRate: number;
  };
}

const Ctx = createContext<RoomFlowCtx | null>(null);

export function RoomFlowProvider({ children }: { children: ReactNode }) {
  const [rooms, setRooms] = useState<Room[]>(initialRooms);
  const [staff, setStaff] = useState<Staff[]>(initialStaff);
  const [whatsappLogs, setWhatsappLogs] = useState<WhatsAppLog[]>([]);
  const [guestRequests, setGuestRequests] = useState<GuestRequest[]>(initialGuestRequests);
  const [notifications, setNotifications] = useState<NotificationItem[]>(getStoredNotifications);
  const [currentRole, setCurrentRole] = useState<"ops" | "staff" | "guest" | "requests">("ops");

  const [lastAssignedStaff, setLastAssignedStaffState] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("roomflow_last_assigned_staff");
  });

  const broadcastLastAssignedStaff = (name: string | null) => {
    if (!name) return;
    setLastAssignedStaffState(name);
    try {
      localStorage.setItem("roomflow_last_assigned_staff", name);
    } catch {}
  };

  // Sync notifications, guest requests, rooms AND lastAssignedStaff across tabs & windows
  useEffect(() => {
    const REQUESTS_SYNC_KEY = "roomflow_requests_sync";
    const ROOMS_SYNC_KEY = "roomflow_rooms_sync";
    const STAFF_ASSIGN_KEY = "roomflow_last_assigned_staff";
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === NOTIF_STORAGE_KEY) {
        setNotifications(getStoredNotifications());
      }
      if (e.key === REQUESTS_SYNC_KEY && e.newValue) {
        try {
          const synced = JSON.parse(e.newValue);
          if (Array.isArray(synced)) setGuestRequests(synced);
        } catch {}
      }
      if (e.key === ROOMS_SYNC_KEY && e.newValue) {
        try {
          const synced = JSON.parse(e.newValue);
          if (Array.isArray(synced)) setRooms(synced);
        } catch {}
      }
      if (e.key === STAFF_ASSIGN_KEY && e.newValue) {
        setLastAssignedStaffState(e.newValue);
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // Fetch initial data from MongoDB on mount
  useEffect(() => {
    async function loadData() {
      try {
        const serverRooms = await getRoomsFn();
        const serverRequests = await getRequestsFn();
        if (serverRooms && serverRooms.length > 0) setRooms(serverRooms);
        if (serverRequests && serverRequests.length > 0) setGuestRequests(serverRequests);
      } catch (e) {
        console.error("Could not load initial rooms and requests from MongoDB: ", e);
      }
    }
    loadData();
  }, []);

  // Background timer for SLA increment on open/in-progress guest requests
  useEffect(() => {
    const timer = setInterval(() => {
      setGuestRequests((prev) =>
        prev.map((req) => {
          if (req.status === "Completed") return req;
          const nextSeconds = req.elapsedSeconds + 1;
          const totalSlaSeconds = req.slaMinutes * 60;

          let nextStatus = req.status;
          if (nextSeconds > totalSlaSeconds && req.status !== "Escalated") {
            nextStatus = "Escalated";
          }

          return {
            ...req,
            elapsedSeconds: nextSeconds,
            status: nextStatus,
          };
        })
      );
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Notification helper
  const addNotification = (notif: Omit<NotificationItem, "id" | "timestamp" | "unread">) => {
    const newNotif: NotificationItem = {
      id: `notif-${Date.now()}`,
      title: notif.title,
      message: notif.message,
      timestamp: "Just now",
      unread: true,
      type: notif.type,
      targetRoom: notif.targetRoom,
      targetRequestId: notif.targetRequestId,
    };
    setNotifications((prev) => {
      const updated = [newNotif, ...prev.slice(0, 49)];
      try {
        localStorage.setItem(NOTIF_STORAGE_KEY, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const clearNotifications = () => {
    setNotifications([]);
    try {
      localStorage.setItem(NOTIF_STORAGE_KEY, JSON.stringify([]));
    } catch {}
    toast.success("All notifications cleared.");
  };

  const markNotificationRead = (id: string) => {
    setNotifications((prev) => {
      const updated = prev.map((n) => (n.id === id ? { ...n, unread: false } : n));
      try {
        localStorage.setItem(NOTIF_STORAGE_KEY, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const value = useMemo<RoomFlowCtx>(() => {
    // ----------------------------------------------------
    // Room Lifecycle Handlers
    // ----------------------------------------------------
    // Helper: broadcast rooms to other tabs via localStorage
    const broadcastRooms = (updated: Room[]) => {
      try {
        localStorage.setItem("roomflow_rooms_sync", JSON.stringify(updated));
      } catch { /* quota exceeded, ignore */ }
    };

    const setRoomStatus = (id: string, status: RoomStatus) => {
      const isCleared = status === "Ready for Guest" || status === "Vacant Dirty";
      const updates: Partial<Room> = {
        status,
        ...(isCleared ? { aiQaStatus: null, aiQaNotes: null, aiQaBboxes: [] } : {}),
      };
      setRooms((prev) => {
        const updated = prev.map((r) => (r.id === id || r.number === id ? { ...r, ...updates } : r));
        broadcastRooms(updated);
        return updated;
      });
      updateRoomFn({ data: { id, updates } });
    };

    const assignRoom = (id: string, staffName: string | null) => {
      const targetRoom = rooms.find((r) => r.id === id || r.number === id);
      const roomNum = targetRoom?.number || id;
      const updates = { assignedStaff: staffName };

      setRooms((prev) => {
        const updated = prev.map((r) => (r.id === id || r.number === id ? { ...r, ...updates } : r));
        broadcastRooms(updated);
        return updated;
      });
      updateRoomFn({ data: { id, updates } });

      if (staffName) {
        broadcastLastAssignedStaff(staffName);
      }

      if (staffName && targetRoom) {
        addNotification({
          title: `🔔 Room Turnaround Assigned: Room ${roomNum}`,
          message: `Room ${roomNum} (${targetRoom.type} • Floor ${targetRoom.floor}) assigned to ${staffName}.`,
          type: "info",
          targetRoom: roomNum,
        });
        toast.success(`Assigned Room ${roomNum} to ${staffName}`);
      }
    };

    const blockRoom = (id: string, note: string) => {
      const targetRoom = rooms.find((r) => r.id === id || r.number === id);
      const roomNum = targetRoom?.number || id;

      const updates: Partial<Room> = {
        status: "Maintenance Blocked",
        maintenanceNote: note,
      };
      setRooms((prev) =>
        prev.map((r) => (r.id === id || r.number === id ? { ...r, ...updates } : r))
      );
      updateRoomFn({ data: { id, updates } });

      // Automatically create a Critical maintenance ticket in request queue
      const newTicket: GuestRequest = {
        id: `maint-${Date.now()}`,
        roomNumber: roomNum,
        category: "Maintenance",
        item: "Maintenance Room Block",
        details: note || "Urgent maintenance ticket logged by supervisor/staff.",
        status: "Open",
        priority: "Critical",
        assignedDept: "Maintenance",
        assignedStaff: null,
        createdAt: new Date().toISOString(),
        slaMinutes: 15,
        elapsedSeconds: 0,
      };
      setGuestRequests((prev) => [newTicket, ...prev]);
      insertRequestFn({ data: newTicket });

      addNotification({
        title: `⚠️ Room ${roomNum} Maintenance Blocked`,
        message: note || "Room locked from reservations. Engineering ticket dispatched.",
        type: "alert",
        targetRoom: roomNum,
      });
    };

    const reportBrokenFixture = (roomId: string, defectReason: string, photoUrl?: string) => {
      blockRoom(roomId, defectReason);
      toast.warning(`Room ${roomId} blocked for maintenance! Engineering ticket created.`);
    };

    const startCleaningRoom = (roomId: string, staffName?: string) => {
      const targetStaff = staffName || "Ana Duarte";
      const updates: Partial<Room> = {
        status: "Cleaning in Progress",
        assignedStaff: targetStaff,
      };
      setRooms((prev) => {
        const updated = prev.map((r) => (r.id === roomId || r.number === roomId ? { ...r, ...updates } : r));
        broadcastRooms(updated);
        return updated;
      });
      updateRoomFn({ data: { id: roomId, updates } });

      addNotification({
        title: `🧹 Cleaning Started: Room ${roomId}`,
        message: `${targetStaff} started turn-around cleaning.`,
        type: "info",
        targetRoom: roomId,
      });
      toast.success(`Cleaning initiated for Room ${roomId}.`);
    };

    const approveRoom = (roomId: string) => {
      const targetRoom = rooms.find((r) => r.id === roomId || r.number === roomId);
      const roomNum = targetRoom?.number || roomId;
      const assignedCleaner = targetRoom?.assignedStaff;

      const updates: Partial<Room> = {
        status: "Ready for Guest",
        aiQaStatus: "PASSED",
        aiQaBboxes: [],
      };
      setRooms((prev) =>
        prev.map((r) => (r.id === roomId || r.number === roomId ? { ...r, ...updates } : r))
      );
      updateRoomFn({ data: { id: roomId, updates } });

      // Bump cleaner daily completed count
      if (assignedCleaner) {
        setStaff((prev) =>
          prev.map((s) =>
            s.name === assignedCleaner ? { ...s, completed: s.completed + 1 } : s
          )
        );
      }

      addNotification({
        title: `✅ Room ${roomNum} Ready for Guest`,
        message: `Supervisor approved inspection. Guest check-in unlocked.`,
        type: "success",
        targetRoom: roomNum,
      });
      toast.success(`Room ${roomNum} approved! Ready for guest check-in.`);
    };

    const updateRoomSopSteps = (roomId: string, steps: string[]) => {
      const updates: Partial<Room> = {
        completedSopSteps: steps,
      };
      setRooms((prev) => {
        const updated = prev.map((r) => (r.id === roomId || r.number === roomId ? { ...r, ...updates } : r));
        broadcastRooms(updated);
        return updated;
      });
      updateRoomFn({ data: { id: roomId, updates } });
    };

    const overruleApproveRoom = (roomId: string) => {
      approveRoom(roomId);
    };

    const rejectRoom = (roomId: string, reason?: string) => {
      rejectRecleanRoom(roomId, reason || "Supervisor flagged staging defects. Please re-clean & rescan.");
    };

    const rejectRecleanRoom = (roomId: string, note: string) => {
      const targetRoom = rooms.find((r) => r.id === roomId || r.number === roomId);
      const roomNum = targetRoom?.number || roomId;
      const rejectNote = note || "Supervisor requested re-cleaning: Please straighten bed linens.";

      const updates: Partial<Room> = {
        status: "Cleaning in Progress",
        aiQaStatus: "FLAGGED",
        aiQaNotes: `Supervisor Re-clean Request: ${rejectNote}`,
        recleanNote: rejectNote,
      };
      setRooms((prev) => {
        const updated = prev.map((r) => (r.id === roomId || r.number === roomId ? { ...r, ...updates } : r));
        broadcastRooms(updated);
        return updated;
      });
      updateRoomFn({ data: { id: roomId, updates } });

      addNotification({
        title: `⚠️ Re-Clean Requested: Room ${roomNum}`,
        message: `Supervisor requested re-cleaning: ${rejectNote}`,
        type: "warning",
        targetRoom: roomNum,
      });
      toast.error(`Supervisor requested re-cleaning for Room ${roomNum}: "${rejectNote}"`);
    };

    const completeRoomWithAiScore = (
      roomId: string,
      score: number,
      notes: string,
      bboxes: Array<{ label: string; x: number; y: number; width: number; height: number }> = [],
      photoUrl?: string
    ) => {
      const isPassed = score >= 95;
      const targetRoom = rooms.find((r) => r.id === roomId || r.number === roomId);
      const assignedCleaner = targetRoom?.assignedStaff;

      const updates: Partial<Room> = {
        status: isPassed ? "Ready for Guest" : "Inspection Pending",
        aiQaStatus: isPassed ? "PASSED" : "FLAGGED",
        aiQaNotes: notes,
        aiQaBboxes: bboxes,
        photoUrl: photoUrl || (isPassed
          ? "https://images.unsplash.com/photo-1618773928121-c32242e63f39?q=80&w=800"
          : "https://images.unsplash.com/photo-1598928506311-c55ded91a20c?q=80&w=800"),
      };

      setRooms((prev) => {
        const updated = prev.map((r) => (r.id === roomId || r.number === roomId ? { ...r, ...updates } : r));
        broadcastRooms(updated);
        return updated;
      });
      updateRoomFn({ data: { id: roomId, updates } });

      if (isPassed) {
        if (assignedCleaner) {
          setStaff((prev) =>
            prev.map((s) =>
              s.name === assignedCleaner ? { ...s, completed: s.completed + 1 } : s
            )
          );
        }
        addNotification({
          title: `🌟 Room ${roomId} Auto-Approved (${score}%)`,
          message: `Gemini AI QA verified all staging checklist items. Ready for arrivals!`,
          type: "success",
          targetRoom: roomId,
        });
        toast.success(`Room ${roomId} staging passed AI QA (${score}%)! Marked Ready.`);
      } else {
        addNotification({
          title: `🔍 Room ${roomId} Requires Supervisor Review (${score}%)`,
          message: notes,
          type: "warning",
          targetRoom: roomId,
        });
        toast.info(`Room ${roomId} submitted with score ${score}%. Pushed to Supervisor Review Queue.`);
      }
    };

    const addRoom = (roomData: { number: string; type: RoomType; priority: PriorityTag; guestName: string; checkIn: string }) => {
      const newRoom: Room = {
        id: roomData.number,
        number: roomData.number,
        floor: Number(roomData.number[0]) || 1,
        type: roomData.type,
        status: "Vacant Dirty",
        priority: roomData.priority,
        assignedStaff: null,
        checkIn: roomData.checkIn || "14:00",
        turnaround: roomData.type === "Suite" ? 45 : roomData.type === "Deluxe" ? 35 : 25,
        guestName: roomData.guestName || "Unscheduled Guest",
        priorityReason:
          roomData.priority === "VIP"
            ? `VIP Guest ${roomData.guestName} check-in scheduled at ${roomData.checkIn}`
            : roomData.priority === "Early Arrival"
              ? `Early Arrival guest check-in scheduled at ${roomData.checkIn}`
              : `Standard cleanup queue`,
        aiQaStatus: null,
        aiQaNotes: null,
        photoUrl: null,
        aiQaBboxes: [],
      };
      setRooms((prev) => {
        if (prev.some((r) => r.number === newRoom.number)) {
          return prev.map((r) => (r.number === newRoom.number ? newRoom : r));
        }
        return [...prev, newRoom];
      });
      updateRoomFn({ data: { id: newRoom.id, updates: newRoom } });
    };

    const importCSV = (csvContent: string) => {
      const rows = csvContent.split("\n");
      let count = 0;
      const errors: string[] = [];

      rows.forEach((row, index) => {
        if (index === 0 && row.toLowerCase().includes("room")) return;
        if (!row.trim()) return;

        const cols = row.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
        if (cols.length < 4) {
          errors.push(`Row ${index + 1}: Invalid column count.`);
          return;
        }

        const roomNum = cols[0];
        const roomType = (cols[1] || "Standard") as RoomType;
        const checkIn = cols[2] || "14:00";
        const guestName = cols[3] || "Guest";
        const priority = (cols[4] || "Regular") as PriorityTag;

        if (!roomNum || isNaN(Number(roomNum))) {
          errors.push(`Row ${index + 1}: Invalid room number "${roomNum}".`);
          return;
        }

        addRoom({
          number: roomNum,
          type: roomType,
          priority,
          guestName,
          checkIn,
        });
        count++;
      });

      return { success: errors.length === 0, count, errors };
    };

    const runAiQa = (room: Room, photoType: "clean" | "dirty_bed" | "dirty_trash"): Partial<Room> => {
      if (photoType === "clean") {
        return {
          aiQaStatus: "PASSED",
          aiQaNotes: "All checklist items pass. Bed is tight and neat, towels folded, no floor debris, amenities stocked.",
          photoUrl: "https://images.unsplash.com/photo-1618773928121-c32242e63f39?q=80&w=800",
          aiQaBboxes: [],
        };
      } else if (photoType === "dirty_bed") {
        return {
          aiQaStatus: "FLAGGED",
          aiQaNotes: "Linen rumpled or creased on left-side pillows. Throw blanket unaligned. Bed unmade.",
          photoUrl: "https://images.unsplash.com/photo-1598928506311-c55ded91a20c?q=80&w=800",
          aiQaBboxes: [{ label: "Rumpled Linens", x: 28, y: 35, width: 44, height: 38 }],
        };
      } else {
        return {
          aiQaStatus: "FLAGGED",
          aiQaNotes: "Visible paper trash and plastic wrapping found on floor near desk chair. Amenity trays dusty.",
          photoUrl: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?q=80&w=800",
          aiQaBboxes: [{ label: "Trash on Floor", x: 55, y: 65, width: 25, height: 28 }],
        };
      }
    };

    const setRoomPhotoAndRunAi = (roomId: string, photoType: "clean" | "dirty_bed" | "dirty_trash") => {
      setRooms((prev) =>
        prev.map((r) => {
          if (r.id === roomId) {
            const aiData = runAiQa(r, photoType);
            return {
              ...r,
              status: "Inspection Pending",
              ...aiData,
            };
          }
          return r;
        })
      );
    };

    // ----------------------------------------------------
    // Priority Queue & Auto-Dispatch Algorithm
    // ----------------------------------------------------
    const queue = rooms
      .filter((r) => r.status === "Vacant Dirty")
      .map((room) => {
        let score = 0;
        const isVip = room.priority === "VIP";
        const isOverdue = room.priority === "Overdue";
        const isEarly = room.priority === "Early Arrival";

        // Weight multiplier
        const weight = isVip ? 2.0 : isOverdue ? 1.8 : isEarly ? 1.4 : 1.0;

        let minutesUntilCheckIn = 60;
        if (room.checkIn && room.checkIn !== "—") {
          const [hStr, mStr] = room.checkIn.split(":");
          const h = parseInt(hStr || "14", 10);
          const m = parseInt(mStr || "0", 10);
          const checkInMins = h * 60 + m;
          const currentMins = 13 * 60; // 13:00 reference
          minutesUntilCheckIn = Math.max(1, checkInMins - currentMins);
        }

        score = Math.round((weight / minutesUntilCheckIn) * 1000);
        return { ...room, priorityScore: score };
      })
      .sort((a, b) => (b.priorityScore || 0) - (a.priorityScore || 0));

    const runBatchDispatch = (
      assignments: Array<{ targetId: string; targetType: "room" | "request"; staffName: string }>
    ) => {
      let roomCount = 0;
      let requestCount = 0;
      let lastStaff = "";

      assignments.forEach((item) => {
        if (item.targetType === "room") {
          assignRoom(item.targetId, item.staffName);
          roomCount++;
        } else {
          const matchStaff = staff.find((s) => s.name === item.staffName || s.id === item.staffName);
          const staffId = matchStaff?.id || "s1";
          assignTaskToStaff(item.targetId, staffId, item.staffName);
          requestCount++;
        }
        lastStaff = item.staffName;
      });

      if (lastStaff) {
        broadcastLastAssignedStaff(lastStaff);
      }

      toast.success(`⚡ Batch Dispatch Completed!`, {
        description: `Auto-allocated ${roomCount} room turnarounds & ${requestCount} guest service tickets.`,
      });
    };

    const autoDispatchEngine = () => {
      const activeCleaners = staff.filter((s) => s.active);
      if (!activeCleaners.length) {
        toast.error("No active staff available for auto-dispatch.");
        return 0;
      }

      const dirtyRooms = rooms.filter((r) => r.status === "Vacant Dirty");
      if (dirtyRooms.length === 0) {
        toast.info("All rooms are clean or in progress! No vacant dirty rooms to dispatch.");
        return 0;
      }

      // Priority sort
      const sortedDirty = [...dirtyRooms].sort((a, b) => {
        const aScore = (a.priority === "VIP" ? 200 : 100);
        const bScore = (b.priority === "VIP" ? 200 : 100);
        return bScore - aScore;
      });

      const newAssignments: Record<string, string> = {};
      let cleanerIndex = 0;

      sortedDirty.forEach((r) => {
        // Try to match cleaner by floor first
        const roomFloor = r.floor || Number(r.number[0]) || 1;
        const sameFloorCleaners = activeCleaners.filter(
          (c) => (STAFF_FLOORS[c.name] || 1) === roomFloor
        );
        const cleaner = sameFloorCleaners.length > 0
          ? sameFloorCleaners[0]!
          : activeCleaners[cleanerIndex % activeCleaners.length]!;

        newAssignments[r.id] = cleaner.name;
        cleanerIndex++;
      });

      // Update room statuses to Cleaning in Progress
      setRooms((prev) =>
        prev.map((r) =>
          newAssignments[r.id]
            ? {
                ...r,
                status: "Cleaning in Progress",
                assignedStaff: newAssignments[r.id]!,
              }
            : r
        )
      );

      // Update staff workload
      setStaff((prev) =>
        prev.map((s) =>
          s.active
            ? { ...s, workload: Math.min(95, Math.round(70 + Math.random() * 20)) }
            : s
        )
      );

      addNotification({
        title: `⚡ Auto-Dispatch Completed`,
        message: `Dispatched ${sortedDirty.length} rooms to nearest cleaners. Target timers activated.`,
        type: "success",
      });

      toast.success(`⚡ Priority Auto-Dispatch Executed!`, {
        description: `Dispatched ${sortedDirty.length} rooms to active cleaners on their respective floors.`,
      });

      return sortedDirty.length;
    };

    const autoOptimize = autoDispatchEngine;

    // ----------------------------------------------------
    // Guest Requests & Tickets Handlers
    // ----------------------------------------------------
    const addGuestRequest = (
      roomNumber: string,
      category: RequestCategory,
      item: string,
      details?: string,
      priority: RequestPriority = "Medium",
      assignedDept?: Department
    ) => {
      let dept: Department = assignedDept || "Housekeeping";

      if (!assignedDept) {
        const text = (item + " " + (details || "")).toLowerCase();
        if (/(leak|ac|light|plumbing|repair|broken|clog|toilet|shower|thermostat|door|power)/i.test(text)) {
          dept = "Maintenance";
        } else if (/(baggage|luggage|checkout|key|bellboy|taxi|wake)/i.test(text)) {
          dept = "Front Desk";
        } else if (/(food|drink|dinner|lunch|breakfast|ice|menu|water|soda|coffee|tea)/i.test(text)) {
          dept = "Room Service";
        }
      }

      const slaMap: Record<RequestPriority, number> = {
        Critical: 15,
        High: 20,
        Medium: 30,
        Low: 45,
      };
      const slaMinutes = slaMap[priority] || 30;

      const newReq: GuestRequest = {
        id: `req-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        roomNumber,
        category,
        item,
        details: details || "",
        status: "Open",
        priority,
        assignedDept: dept,
        assignedStaff: null,
        createdAt: new Date().toISOString(),
        slaMinutes,
        elapsedSeconds: 0,
        stage: "received",
      };

      setGuestRequests((prev) => {
        const updated = [newReq, ...prev];
        broadcastRequests(updated);
        return updated;
      });
      insertRequestFn({ data: newReq });

      // Trigger 3.5 second audio chime alert on supervisor board
      triggerSupervisorRingerBroadcast();

      addNotification({
        title: `🔔 New Guest Request: Room ${roomNumber}`,
        message: `${item} (${category}) submitted by guest. SLA ${newReq.slaMinutes}m.`,
        type: "info",
        targetRoom: roomNumber,
        targetRequestId: newReq.id,
      });

      toast.success(`Request logged for Room ${roomNumber}: ${item}`, {
        description: `Routed to ${assignedDept} • ${priority} Priority`,
      });
    };

    const updateGuestRequestStatus = (id: string, status: RequestStatus) => {
      let finalElapsed: number | undefined;
      setGuestRequests((prev) =>
        prev.map((req) => {
          if (req.id === id) {
            finalElapsed = req.elapsedSeconds;
            return { ...req, status };
          }
          return req;
        })
      );
      const updates: Partial<GuestRequest> = { status };
      if (status === "Completed" && finalElapsed !== undefined) {
        updates.elapsedSeconds = finalElapsed;
      }
      updateRequestFn({ data: { id, updates } });
    };

    // Helper: broadcast guest requests to other tabs via localStorage
    const broadcastRequests = (updated: GuestRequest[]) => {
      try {
        localStorage.setItem("roomflow_requests_sync", JSON.stringify(updated));
      } catch { /* quota exceeded, ignore */ }
    };

    const assignGuestRequest = (id: string, staffName: string | null) => {
      const req = guestRequests.find((r) => r.id === id);
      const updates: Partial<GuestRequest> = {
        assignedStaff: staffName,
        status: staffName ? "In Progress" : "Open",
      };
      setGuestRequests((prev) => {
        const updated = prev.map((r) => (r.id === id ? { ...r, ...updates } : r));
        broadcastRequests(updated);
        return updated;
      });
      updateRequestFn({ data: { id, updates } });

      if (staffName) {
        broadcastLastAssignedStaff(staffName);
        triggerStaffRingerBroadcast(staffName);
      }

      // Fire notification for assignment
      if (staffName && req) {
        addNotification({
          title: `🔔 Task Assigned: Room ${req.roomNumber}`,
          message: `${req.item} (${req.assignedDept}) assigned to ${staffName}.`,
          type: "info",
          targetRoom: req.roomNumber,
          targetRequestId: id,
        });
      }
    };

    const assignTaskToStaff = (requestId: string, staffId: string, staffName: string) => {
      const req = guestRequests.find((r) => r.id === requestId);
      if (!req) return;

      const updates: Partial<GuestRequest> = {
        assignedStaff: staffName,
        status: "In Progress",
        stage: "assigned",
      };
      setGuestRequests((prev) => {
        const updated = prev.map((r) => (r.id === requestId ? { ...r, ...updates } : r));
        broadcastRequests(updated);
        return updated;
      });
      updateRequestFn({ data: { id: requestId, updates } });

      if (staffName) {
        broadcastLastAssignedStaff(staffName);
        triggerStaffRingerBroadcast(staffName);
      }

      // Fire notification visible on staff portal
      addNotification({
        title: `⚡ New Task Assigned: Room ${req.roomNumber}`,
        message: `${req.item} (${req.priority} - ${req.slaMinutes}m target) — assigned to ${staffName}.`,
        type: "info",
        targetRoom: req.roomNumber,
        targetRequestId: requestId,
      });

      toast.success(`⚡ Dispatched: ${req.item} → ${staffName}`, {
        description: `Room ${req.roomNumber} • ${req.priority} priority • ${req.slaMinutes}m SLA target`,
      });
    };

    const updateRequestProgress = (requestId: string, stage: "on_the_way" | "delivered") => {
      const req = guestRequests.find((r) => r.id === requestId);
      if (!req) return;

      const isDelivered = stage === "delivered";
      const updates: Partial<GuestRequest> = {
        stage,
        status: isDelivered ? "Completed" : "In Progress",
        ...(isDelivered ? { resolvedAt: Date.now() } : {}),
      };

      setGuestRequests((prev) => {
        const updated = prev.map((r) => (r.id === requestId ? { ...r, ...updates } : r));
        broadcastRequests(updated);
        return updated;
      });
      updateRequestFn({ data: { id: requestId, updates } });

      if (stage === "on_the_way") {
        addNotification({
          title: `📍 ${req.assignedStaff || "Runner"} en route: Room ${req.roomNumber}`,
          message: `${req.assignedStaff || "Runner"} is heading to deliver: ${req.item}.`,
          type: "info",
          targetRoom: req.roomNumber,
          targetRequestId: requestId,
        });
        toast.success(`📍 Acknowledged! Guest & Supervisor notified you're heading to Room ${req.roomNumber}.`);
      } else if (stage === "delivered") {
        addNotification({
          title: `✅ Delivered: Room ${req.roomNumber}`,
          message: `${req.item} handed over to guest by ${req.assignedStaff || "Runner"}.`,
          type: "success",
          targetRoom: req.roomNumber,
          targetRequestId: requestId,
        });
        toast.success(`🎉 Delivered! Room ${req.roomNumber} — ${req.item} handed over successfully.`);
      }
    };

    const acknowledgeStaffTask = (requestId: string) => {
      updateRequestProgress(requestId, "on_the_way");
    };

    const completeStaffTask = (requestId: string) => {
      updateRequestProgress(requestId, "delivered");
    };

    const autoAssignNearestRequest = (requestId: string) => {
      const req = guestRequests.find((r) => r.id === requestId);
      if (!req) return;

      const roomFloor = Number(req.roomNumber[0]) || 1;
      const activeStaff = staff.filter((s) => s.active);
      if (!activeStaff.length) return;

      // Find staff on same floor with lowest workload
      const sameFloor = activeStaff.filter((s) => (STAFF_FLOORS[s.name] || 1) === roomFloor);
      const targetStaff = sameFloor.length > 0
        ? [...sameFloor].sort((a, b) => a.workload - b.workload)[0]!
        : [...activeStaff].sort((a, b) => a.workload - b.workload)[0]!;

      assignTaskToStaff(requestId, targetStaff.id, targetStaff.name);
    };

    const resolveRequest = (requestId: string) => {
      updateGuestRequestStatus(requestId, "Completed");
      toast.success(`🎉 Request resolved and closed successfully!`);
    };

    const escalateGuestRequest = (id: string) => {
      const req = guestRequests.find((r) => r.id === id);
      const updates: Partial<GuestRequest> = {
        status: "Escalated",
        priority: "Critical",
      };
      setGuestRequests((prev) =>
        prev.map((r) => (r.id === id ? { ...r, ...updates } : r))
      );
      updateRequestFn({ data: { id, updates } });

      addNotification({
        title: `🚨 CRITICAL SLA ESCALATION: Room ${req?.roomNumber || ""}`,
        message: `Request "${req?.item || "Service"}" breached turnaround threshold! Alert dispatched to Supervisor.`,
        type: "alert",
        targetRequestId: id,
        targetRoom: req?.roomNumber,
      });
      toast.warning(`Request escalated to Critical priority! Manager alerted.`);
    };

    const simulateIncomingWhatsApp = (
      from: string,
      body: string,
      hasPhoto = false,
      photoType: "clean" | "dirty_bed" | "dirty_trash" = "clean"
    ) => {
      const staffName = Object.keys(STAFF_PHONES).find((k) => STAFF_PHONES[k] === from) || "Housekeeper";
      const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      const logId = Math.random().toString(36).substr(2, 9);

      const inboundMsg: WhatsAppLog = {
        id: logId,
        timestamp,
        sender: `${staffName} (${from})`,
        body: hasPhoto ? `[Photo Attached] ${body}` : body,
        type: "inbound",
      };

      setWhatsappLogs((prev) => [...prev, inboundMsg]);

      const text = body.trim().toUpperCase();

      if (text.startsWith("START ")) {
        const roomNum = text.split(" ")[1];
        if (!roomNum) return;

        setRooms((prev) => {
          const room = prev.find((r) => r.number === roomNum);
          if (!room) return prev;

          updateRoomFn({
            data: { id: roomNum, updates: { status: "Cleaning in Progress", assignedStaff: staffName } },
          });
          return prev.map((r) =>
            r.number === roomNum
              ? { ...r, status: "Cleaning in Progress", assignedStaff: staffName }
              : r
          );
        });
      }
    };

    // ----------------------------------------------------
    // KPIs Calculation
    // ----------------------------------------------------
    const serviceable = rooms.filter((r) => r.status !== "Occupied");
    const readiness = Math.round(
      (rooms.filter((r) => r.status === "Ready for Guest").length / (serviceable.length || 1)) * 100
    );
    const turnRooms = rooms.filter((r) => r.turnaround > 0);
    const avgTurnaround = Math.round(
      turnRooms.reduce((sum, r) => sum + r.turnaround, 0) / (turnRooms.length || 1)
    );
    const vipPending = rooms.filter(
      (r) => r.priority === "VIP" && r.status !== "Ready for Guest"
    ).length;
    const activeStaff = staff.filter((s) => s.active);
    const utilization = Math.round(
      activeStaff.reduce((sum, s) => sum + s.workload, 0) / (activeStaff.length || 1)
    );

    const completedReqs = guestRequests.filter((r) => r.status === "Completed");
    const onTimeCompleted = completedReqs.filter(
      (r) => r.elapsedSeconds <= r.slaMinutes * 60
    );
    const slaSuccessRate = completedReqs.length > 0
      ? Math.round((onTimeCompleted.length / completedReqs.length) * 100)
      : 94;

    return {
      rooms,
      staff,
      whatsappLogs,
      guestRequests,
      requests: guestRequests,
      notifications,
      currentRole,
      setCurrentRole,
      lastAssignedStaff,
      setLastAssignedStaff: broadcastLastAssignedStaff,

      setRoomStatus,
      assignRoom,
      blockRoom,
      reportBrokenFixture,
      startCleaningRoom,
      approveRoom,
      rejectRoom,
      updateRoomSopSteps,
      overruleApproveRoom,
      rejectRecleanRoom,
      completeRoomWithAiScore,
      addRoom,
      importCSV,

      autoDispatchEngine,
      autoOptimize,
      runBatchDispatch,
      setRoomPhotoAndRunAi,
      simulateIncomingWhatsApp,

      addGuestRequest,
      createGuestRequest: addGuestRequest,
      updateGuestRequestStatus,
      assignGuestRequest,
      assignTaskToStaff,
      assignRequestToStaff: assignTaskToStaff,
      acknowledgeStaffTask,
      completeStaffTask,
      updateRequestProgress,
      autoAssignNearestRequest,
      resolveRequest,
      escalateGuestRequest,

      addNotification,
      clearNotifications,
      markNotificationRead,

      queue,
      kpis: { readiness, avgTurnaround, vipPending, utilization, slaSuccessRate },
    };
  }, [rooms, staff, whatsappLogs, guestRequests, notifications, currentRole]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useRoomFlow() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useRoomFlow must be used inside RoomFlowProvider");
  return ctx;
}

export const useCleanSync = useRoomFlow;
export const CleanSyncProvider = RoomFlowProvider;
