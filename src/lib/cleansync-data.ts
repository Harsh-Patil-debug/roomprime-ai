export type RoomStatus =
  | "Occupied"
  | "Vacant Dirty"
  | "Cleaning in Progress"
  | "Inspection Pending"
  | "Ready for Guest"
  | "Maintenance Blocked";

export type RoomType = "Deluxe" | "Suite" | "Standard";
export type PriorityTag = "VIP" | "Early Arrival" | "Regular" | "Overdue";

export interface Room {
  id: string;
  number: string;
  floor: number;
  type: RoomType;
  status: RoomStatus;
  priority: PriorityTag;
  assignedStaff: string | null;
  checkIn: string; // HH:MM
  turnaround: number; // minutes
  maintenanceNote?: string;
}

export interface Staff {
  id: string;
  name: string;
  active: boolean;
  completed: number;
  currentRoom: string | null;
  workload: number; // %
  avgSpeed: number; // mins
}

export const CHECKLIST_STEPS = [
  "Stripping & Linen Removal",
  "Sanitizing Bath & Surfaces",
  "Restocking Amenities",
  "Final Polish & Staging",
] as const;

export const STATUSES: RoomStatus[] = [
  "Occupied",
  "Vacant Dirty",
  "Cleaning in Progress",
  "Inspection Pending",
  "Ready for Guest",
  "Maintenance Blocked",
];

export const statusStyles: Record<RoomStatus, { chip: string; ring: string; dot: string }> = {
  Occupied: {
    chip: "bg-muted text-muted-foreground",
    ring: "border-border",
    dot: "bg-muted-foreground",
  },
  "Vacant Dirty": {
    chip: "bg-dirty/15 text-dirty",
    ring: "border-dirty/40",
    dot: "bg-dirty",
  },
  "Cleaning in Progress": {
    chip: "bg-progress/15 text-progress",
    ring: "border-progress/45",
    dot: "bg-progress",
  },
  "Inspection Pending": {
    chip: "bg-inspect/15 text-inspect",
    ring: "border-inspect/45",
    dot: "bg-inspect",
  },
  "Ready for Guest": {
    chip: "bg-ready/15 text-ready",
    ring: "border-ready/45",
    dot: "bg-ready",
  },
  "Maintenance Blocked": {
    chip: "bg-urgent/15 text-urgent",
    ring: "border-urgent/45",
    dot: "bg-urgent",
  },
};

export const priorityWeight: Record<PriorityTag, number> = {
  VIP: 100,
  Overdue: 80,
  "Early Arrival": 60,
  Regular: 20,
};

export const initialStaff: Staff[] = [
  { id: "s1", name: "Ana Duarte", active: true, completed: 7, currentRoom: "203", workload: 88, avgSpeed: 24 },
  { id: "s2", name: "Marco Silva", active: true, completed: 5, currentRoom: "412", workload: 72, avgSpeed: 29 },
  { id: "s3", name: "Priya Raman", active: true, completed: 9, currentRoom: "118", workload: 94, avgSpeed: 21 },
  { id: "s4", name: "Jonas Weber", active: true, completed: 4, currentRoom: null, workload: 46, avgSpeed: 33 },
  { id: "s5", name: "Lucia Moreno", active: true, completed: 6, currentRoom: "305", workload: 80, avgSpeed: 26 },
  { id: "s6", name: "Tomas Iverson", active: false, completed: 3, currentRoom: null, workload: 0, avgSpeed: 31 },
];

const raw: Array<[string, RoomType, RoomStatus, PriorityTag, string | null, string, number]> = [
  ["101", "Standard", "Ready for Guest", "Regular", "Priya Raman", "15:00", 25],
  ["102", "Standard", "Vacant Dirty", "Early Arrival", null, "13:00", 30],
  ["103", "Deluxe", "Occupied", "Regular", null, "—", 0],
  ["104", "Deluxe", "Inspection Pending", "VIP", "Priya Raman", "14:00", 35],
  ["105", "Standard", "Maintenance Blocked", "Regular", null, "—", 0],
  ["118", "Suite", "Cleaning in Progress", "VIP", "Priya Raman", "13:30", 45],
  ["201", "Deluxe", "Vacant Dirty", "Overdue", null, "12:00", 30],
  ["202", "Standard", "Ready for Guest", "Regular", "Ana Duarte", "16:00", 22],
  ["203", "Suite", "Cleaning in Progress", "VIP", "Ana Duarte", "14:30", 48],
  ["204", "Standard", "Occupied", "Regular", null, "—", 0],
  ["205", "Deluxe", "Vacant Dirty", "Early Arrival", null, "13:15", 32],
  ["206", "Standard", "Inspection Pending", "Regular", "Ana Duarte", "17:00", 24],
  ["301", "Deluxe", "Ready for Guest", "VIP", "Lucia Moreno", "15:30", 34],
  ["302", "Standard", "Vacant Dirty", "Regular", null, "18:00", 28],
  ["303", "Suite", "Occupied", "Regular", null, "—", 0],
  ["305", "Deluxe", "Cleaning in Progress", "Early Arrival", "Lucia Moreno", "13:45", 33],
  ["306", "Standard", "Vacant Dirty", "Overdue", null, "12:30", 27],
  ["307", "Standard", "Ready for Guest", "Regular", "Lucia Moreno", "19:00", 23],
  ["401", "Suite", "Vacant Dirty", "VIP", null, "14:15", 50],
  ["402", "Deluxe", "Occupied", "Regular", null, "—", 0],
  ["403", "Standard", "Maintenance Blocked", "Regular", null, "—", 0],
  ["405", "Deluxe", "Inspection Pending", "Early Arrival", "Marco Silva", "13:50", 31],
  ["412", "Suite", "Cleaning in Progress", "VIP", "Marco Silva", "15:15", 47],
  ["415", "Standard", "Vacant Dirty", "Regular", null, "20:00", 26],
];

export const initialRooms: Room[] = raw.map(
  ([number, type, status, priority, assignedStaff, checkIn, turnaround]) => ({
    id: number,
    number,
    floor: Number(number[0]),
    type,
    status,
    priority,
    assignedStaff,
    checkIn,
    turnaround,
  }),
);

export const arrivalTimeline = [
  { hour: "11:00", arrivals: 2, ready: 6 },
  { hour: "12:00", arrivals: 4, ready: 6 },
  { hour: "13:00", arrivals: 7, ready: 7 },
  { hour: "14:00", arrivals: 9, ready: 8 },
  { hour: "15:00", arrivals: 12, ready: 11 },
  { hour: "16:00", arrivals: 8, ready: 14 },
  { hour: "17:00", arrivals: 6, ready: 17 },
  { hour: "18:00", arrivals: 5, ready: 19 },
  { hour: "19:00", arrivals: 3, ready: 21 },
];
