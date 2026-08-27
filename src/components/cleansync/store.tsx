import { createContext, useContext, useMemo, useState, useEffect, type ReactNode } from "react";
import {
  initialRooms,
  initialStaff,
  initialGuestRequests,
  priorityWeight,
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
import {
  getRoomsFn,
  updateRoomFn,
  getRequestsFn,
  insertRequestFn,
  updateRequestFn,
} from "@/lib/server-functions";

interface WhatsAppLog {
  id: string;
  timestamp: string;
  sender: string;
  body: string;
  type: "inbound" | "outbound";
}

interface RoomFlowCtx {
  rooms: Room[];
  staff: Staff[];
  whatsappLogs: WhatsAppLog[];
  guestRequests: GuestRequest[];
  setRoomStatus: (id: string, status: RoomStatus) => void;
  assignRoom: (id: string, staffName: string | null) => void;
  blockRoom: (id: string, note: string) => void;
  addRoom: (room: { number: string; type: RoomType; priority: PriorityTag; guestName: string; checkIn: string }) => void;
  importCSV: (csvContent: string) => { success: boolean; count: number; errors: string[] };
  simulateIncomingWhatsApp: (
    from: string,
    body: string,
    hasPhoto?: boolean,
    photoType?: "clean" | "dirty_bed" | "dirty_trash"
  ) => void;
  setRoomPhotoAndRunAi: (roomId: string, photoType: "clean" | "dirty_bed" | "dirty_trash") => void;
  autoOptimize: () => number;
  queue: Room[];
  kpis: {
    readiness: number;
    avgTurnaround: number;
    vipPending: number;
    utilization: number;
  };
  addGuestRequest: (
    roomNumber: string,
    category: RequestCategory,
    item: string,
    details?: string,
    priority?: RequestPriority,
    assignedDept?: Department
  ) => void;
  updateGuestRequestStatus: (id: string, status: RequestStatus) => void;
  assignGuestRequest: (id: string, staffName: string | null) => void;
  escalateGuestRequest: (id: string) => void;
}

const Ctx = createContext<RoomFlowCtx | null>(null);

export const STAFF_PHONES: Record<string, string> = {
  "Ana Duarte": "+15551010001",
  "Marco Silva": "+15551010002",
  "Priya Raman": "+15551010003",
  "Jonas Weber": "+15551010004",
  "Lucia Moreno": "+15551010005",
};

export function RoomFlowProvider({ children }: { children: ReactNode }) {
  const [rooms, setRooms] = useState<Room[]>(initialRooms);
  const [staff, setStaff] = useState<Staff[]>(initialStaff);
  const [whatsappLogs, setWhatsappLogs] = useState<WhatsAppLog[]>([]);
  const [guestRequests, setGuestRequests] = useState<GuestRequest[]>(initialGuestRequests);

  // Fetch initial data from MongoDB on mount
  useEffect(() => {
    async function loadData() {
      try {
        const serverRooms = await getRoomsFn();
        const serverRequests = await getRequestsFn();
        setRooms(serverRooms);
        setGuestRequests(serverRequests);
      } catch (e) {
        console.error("Could not load initial rooms and requests from MongoDB: ", e);
      }
    }
    loadData();
  }, []);

  // Background timer to increment elapsed seconds on open/in-progress guest requests
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

  const value = useMemo<RoomFlowCtx>(() => {
    const setRoomStatus = (id: string, status: RoomStatus) => {
      const isCleared = status === "Ready for Guest" || status === "Vacant Dirty";
      const updates: Partial<Room> = {
        status,
        ...(isCleared ? { aiQaStatus: null, aiQaNotes: null, aiQaBboxes: [] } : {}),
      };
      setRooms((prev) =>
        prev.map((r) => (r.id === id ? { ...r, ...updates } : r))
      );
      updateRoomFn({ data: { id, updates } });
    };

    const assignRoom = (id: string, staffName: string | null) => {
      setRooms((prev) =>
        prev.map((r) => (r.id === id ? { ...r, assignedStaff: staffName } : r))
      );
      updateRoomFn({ data: { id, updates: { assignedStaff: staffName } } });
    };

    const blockRoom = (id: string, note: string) => {
      const updates: Partial<Room> = {
        status: "Maintenance Blocked",
        maintenanceNote: note,
      };
      setRooms((prev) =>
        prev.map((r) => (r.id === id ? { ...r, ...updates } : r))
      );
      updateRoomFn({ data: { id, updates } });
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
        if (index === 0 && row.toLowerCase().includes("room")) return; // skip header
        if (!row.trim()) return;

        const cols = row.split(",").map((c) => c.trim());
        if (cols.length < 4) {
          errors.push(`Row ${index + 1}: Invalid columns count (expected at least 4).`);
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

    // Guest Request Actions
    const addGuestRequest = (
      roomNumber: string,
      category: RequestCategory,
      item: string,
      details?: string,
      priority: RequestPriority = "Medium",
      assignedDept?: Department
    ) => {
      let dept: Department = assignedDept || "Housekeeping";
      
      // Auto-tagging logic based on keywords if department was not specified
      if (!assignedDept) {
        const text = (item + " " + (details || "")).toLowerCase();
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
          dept = "Maintenance";
        } else if (
          text.includes("baggage") ||
          text.includes("luggage") ||
          text.includes("checkout") ||
          text.includes("key") ||
          text.includes("bellboy") ||
          text.includes("taxi") ||
          text.includes("wake")
        ) {
          dept = "Front Desk";
        } else if (
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

      const newRequest: GuestRequest = {
        id: `req-${Math.random().toString(36).substr(2, 9)}`,
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
      };

      setGuestRequests((prev) => [newRequest, ...prev]);
      insertRequestFn({ data: newRequest });
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

    const assignGuestRequest = (id: string, staffName: string | null) => {
      const updates: Partial<GuestRequest> = {
        assignedStaff: staffName,
        status: staffName ? "In Progress" : "Open",
      };
      setGuestRequests((prev) =>
        prev.map((req) => (req.id === id ? { ...req, ...updates } : req))
      );
      updateRequestFn({ data: { id, updates } });
    };

    const escalateGuestRequest = (id: string) => {
      const updates: Partial<GuestRequest> = {
        status: "Escalated",
        priority: "Critical",
      };
      setGuestRequests((prev) =>
        prev.map((req) => (req.id === id ? { ...req, ...updates } : req))
      );
      updateRequestFn({ data: { id, updates } });
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
          if (!room) {
            setWhatsappLogs((l) => [
              ...l,
              {
                id: Math.random().toString(36).substr(2, 9),
                timestamp,
                sender: "System Dispatcher",
                body: `Error: Room ${roomNum} not found in inventory.`,
                type: "outbound",
              },
            ]);
            return prev;
          }

          setWhatsappLogs((l) => [
            ...l,
            {
              id: Math.random().toString(36).substr(2, 9),
              timestamp,
              sender: "System Dispatcher",
              body: `Room ${roomNum} started. Status set to CLEANING_IN_PROGRESS.`,
              type: "outbound",
            },
          ]);

          updateRoomFn({
            data: { id: roomNum, updates: { status: "Cleaning in Progress", assignedStaff: staffName } },
          });
          return prev.map((r) =>
            r.number === roomNum
              ? { ...r, status: "Cleaning in Progress", assignedStaff: staffName }
              : r
          );
        });
      } else if (text.startsWith("ISSUE ")) {
        const parts = text.split(" ");
        const roomNum = parts[1];
        const issueMsg = parts.slice(2).join(" ") || "General repair required";
        if (!roomNum) return;

        setRooms((prev) => {
          const room = prev.find((r) => r.number === roomNum);
          if (!room) {
            setWhatsappLogs((l) => [
              ...l,
              {
                id: Math.random().toString(36).substr(2, 9),
                timestamp,
                sender: "System Dispatcher",
                body: `Error: Room ${roomNum} not found.`,
                type: "outbound",
              },
            ]);
            return prev;
          }

          setWhatsappLogs((l) => [
            ...l,
            {
              id: Math.random().toString(36).substr(2, 9),
              timestamp,
              sender: "System Dispatcher",
              body: `Maintenance reported for Room ${roomNum}. Status set to MAINTENANCE_BLOCKED. Guest request logged.`,
              type: "outbound",
            },
          ]);

          // Also trigger guest request creation for maintenance
          addGuestRequest(roomNum, "Maintenance", `WhatsApp Issue: ${issueMsg}`, `Reported by staff ${staffName}`, "High", "Maintenance");

          updateRoomFn({
            data: { id: roomNum, updates: { status: "Maintenance Blocked", maintenanceNote: issueMsg } },
          });
          return prev.map((r) =>
            r.number === roomNum
              ? { ...r, status: "Maintenance Blocked", maintenanceNote: issueMsg }
              : r
          );
        });
      } else if (hasPhoto) {
        setRooms((prev) => {
          const activeRoom = prev.find(
            (r) => r.assignedStaff === staffName && r.status === "Cleaning in Progress"
          );

          if (!activeRoom) {
            setWhatsappLogs((l) => [
              ...l,
              {
                id: Math.random().toString(36).substr(2, 9),
                timestamp,
                sender: "System Dispatcher",
                body: `No active cleaning room found for ${staffName}. Send 'START [Room#]' first.`,
                type: "outbound",
              },
            ]);
            return prev;
          }

          const aiResult = runAiQa(activeRoom, photoType);
          const responseBody =
            aiResult.aiQaStatus === "PASSED"
              ? `AI Verification PASSED for Room ${activeRoom.number}. Sent to supervisor for final signoff.`
              : `AI Verification FLAGGED issues for Room ${activeRoom.number}: "${aiResult.aiQaNotes}". Awaiting supervisor review.`;

          setWhatsappLogs((l) => [
            ...l,
            {
              id: Math.random().toString(36).substr(2, 9),
              timestamp,
              sender: "System Dispatcher",
              body: responseBody,
              type: "outbound",
            },
          ]);

          updateRoomFn({
            data: { id: activeRoom.id, updates: { status: "Inspection Pending", ...aiResult } },
          });
          return prev.map((r) =>
            r.id === activeRoom.id
              ? {
                  ...r,
                  status: "Inspection Pending",
                  ...aiResult,
                }
              : r
          );
        });
      } else {
        setWhatsappLogs((l) => [
          ...l,
          {
            id: Math.random().toString(36).substr(2, 9),
            timestamp,
            sender: "System Dispatcher",
            body: `Commands available: 'START [room#]', 'ISSUE [room#] [issue details]', or upload an inspection photo.`,
            type: "outbound",
          },
        ]);
      }
    };

    const queue = rooms
      .filter((r) => r.status === "Vacant Dirty")
      .map((room) => {
        let score = 0;
        
        const baseWeights = {
          VIP: 150,
          Overdue: 120,
          "Early Arrival": 90,
          Regular: 30
        };
        score += baseWeights[room.priority] || 30;

        if (room.checkIn && room.checkIn !== "—") {
          const [hourStr, minStr] = room.checkIn.split(":");
          const hour = parseInt(hourStr || "14", 10);
          const min = parseInt(minStr || "0", 10);
          const checkInMinutes = hour * 60 + min;
          score += Math.max(0, (24 * 60 - checkInMinutes) * 0.1);
        }

        score += (room.turnaround || 25) * 0.5;

        if (room.assignedStaff) {
          const cleaner = staff.find((s) => s.name === room.assignedStaff);
          if (cleaner && cleaner.workload > 80) {
            score += 25;
          }
        }

        return { ...room, priorityScore: Math.round(score) };
      })
      .sort((a, b) => (b.priorityScore || 0) - (a.priorityScore || 0) || a.checkIn.localeCompare(b.checkIn));

    queue.forEach((r, idx) => {
      let explanation = "";
      if (r.priority === "VIP") {
        explanation = `Clean next: VIP guest ${r.guestName || "arriving"} arrives at ${r.checkIn}. `;
      } else if (r.priority === "Overdue") {
        explanation = `Urgent turnaround: Previous guest checked out, and guest ${r.guestName || ""} arrival check-in is overdue (scheduled ${r.checkIn}). `;
      } else if (r.priority === "Early Arrival") {
        explanation = `Clean soon: Early arrival guest ${r.guestName || ""} scheduled for ${r.checkIn}. `;
      } else {
        explanation = `Standard clean: Scheduled check-in at ${r.checkIn}. `;
      }

      explanation += `Requires ${r.turnaround || 25} mins (${r.type}). `;

      if (r.assignedStaff) {
        const cleaner = staff.find((s) => s.name === r.assignedStaff);
        if (cleaner && cleaner.workload > 80) {
          explanation += `Assigned to ${r.assignedStaff} (Warning: overloaded at ${cleaner.workload}%).`;
        } else {
          explanation += `Assigned to ${r.assignedStaff} (workload balanced).`;
        }
      } else {
        explanation += `Unassigned — dispatch immediately.`;
      }

      r.priorityReason = explanation;
    });

    const autoOptimize = () => {
      const active = staff.filter((s) => s.active);
      if (!active.length) return 0;
      let i = 0;
      const assignments = new Map<string, string>();
      queue.forEach((room) => {
        const sorted = [...active].sort((a, b) => a.workload - b.workload);
        const person = sorted[i % sorted.length];
        if (person) assignments.set(room.id, person.name);
        i += 1;
      });
      setRooms((prev) =>
        prev.map((r) =>
          assignments.has(r.id) ? { ...r, assignedStaff: assignments.get(r.id)! } : r
        )
      );
      setStaff((prev) =>
        prev.map((s) =>
          s.active ? { ...s, workload: Math.min(96, Math.round(68 + Math.random() * 14)) } : s
        )
      );
      return Math.max(9, queue.length * 4);
    };

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

    return {
      rooms,
      staff,
      whatsappLogs,
      guestRequests,
      setRoomStatus,
      assignRoom,
      blockRoom,
      addRoom,
      importCSV,
      simulateIncomingWhatsApp,
      setRoomPhotoAndRunAi,
      autoOptimize,
      queue,
      kpis: { readiness, avgTurnaround, vipPending, utilization },
      addGuestRequest,
      updateGuestRequestStatus,
      assignGuestRequest,
      escalateGuestRequest,
    };
  }, [rooms, staff, whatsappLogs, guestRequests]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useRoomFlow() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useRoomFlow must be used inside RoomFlowProvider");
  return ctx;
}

export const useCleanSync = useRoomFlow;
export const CleanSyncProvider = RoomFlowProvider;
