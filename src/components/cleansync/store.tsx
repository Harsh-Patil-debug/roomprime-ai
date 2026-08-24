import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import {
  initialRooms,
  initialStaff,
  priorityWeight,
  type Room,
  type RoomStatus,
  type Staff,
} from "@/lib/cleansync-data";

interface CleanSyncCtx {
  rooms: Room[];
  staff: Staff[];
  setRoomStatus: (id: string, status: RoomStatus) => void;
  assignRoom: (id: string, staffName: string) => void;
  blockRoom: (id: string, note: string) => void;
  autoOptimize: () => number;
  queue: Room[];
  kpis: {
    readiness: number;
    avgTurnaround: number;
    vipPending: number;
    utilization: number;
  };
}

const Ctx = createContext<CleanSyncCtx | null>(null);

export function CleanSyncProvider({ children }: { children: ReactNode }) {
  const [rooms, setRooms] = useState<Room[]>(initialRooms);
  const [staff, setStaff] = useState<Staff[]>(initialStaff);

  const value = useMemo<CleanSyncCtx>(() => {
    const setRoomStatus = (id: string, status: RoomStatus) =>
      setRooms((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));

    const assignRoom = (id: string, staffName: string) =>
      setRooms((prev) =>
        prev.map((r) => (r.id === id ? { ...r, assignedStaff: staffName } : r)),
      );

    const blockRoom = (id: string, note: string) =>
      setRooms((prev) =>
        prev.map((r) =>
          r.id === id
            ? { ...r, status: "Maintenance Blocked" as RoomStatus, maintenanceNote: note }
            : r,
        ),
      );

    const queue = rooms
      .filter((r) => r.status === "Vacant Dirty")
      .sort(
        (a, b) =>
          priorityWeight[b.priority] - priorityWeight[a.priority] ||
          a.checkIn.localeCompare(b.checkIn),
      );

    const autoOptimize = () => {
      const active = staff.filter((s) => s.active);
      if (!active.length) return 0;
      let i = 0;
      const assignments = new Map<string, string>();
      queue.forEach((room) => {
        const person = [...active].sort((a, b) => a.workload - b.workload)[i % active.length];
        assignments.set(room.id, person.name);
        i += 1;
      });
      setRooms((prev) =>
        prev.map((r) =>
          assignments.has(r.id) ? { ...r, assignedStaff: assignments.get(r.id)! } : r,
        ),
      );
      setStaff((prev) =>
        prev.map((s) =>
          s.active ? { ...s, workload: Math.min(96, Math.round(68 + Math.random() * 14)) } : s,
        ),
      );
      return Math.max(9, queue.length * 4);
    };

    const serviceable = rooms.filter((r) => r.status !== "Occupied");
    const readiness = Math.round(
      (rooms.filter((r) => r.status === "Ready for Guest").length / (serviceable.length || 1)) * 100,
    );
    const turnRooms = rooms.filter((r) => r.turnaround > 0);
    const avgTurnaround = Math.round(
      turnRooms.reduce((sum, r) => sum + r.turnaround, 0) / (turnRooms.length || 1),
    );
    const vipPending = rooms.filter(
      (r) => r.priority === "VIP" && r.status !== "Ready for Guest",
    ).length;
    const activeStaff = staff.filter((s) => s.active);
    const utilization = Math.round(
      activeStaff.reduce((sum, s) => sum + s.workload, 0) / (activeStaff.length || 1),
    );

    return {
      rooms,
      staff,
      setRoomStatus,
      assignRoom,
      blockRoom,
      autoOptimize,
      queue,
      kpis: { readiness, avgTurnaround, vipPending, utilization },
    };
  }, [rooms, staff]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCleanSync() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCleanSync must be used inside CleanSyncProvider");
  return ctx;
}
