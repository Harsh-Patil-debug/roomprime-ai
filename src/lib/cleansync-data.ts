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
  maintenanceNote?: string | null;
  guestName?: string | null;
  priorityReason?: string | null;
  priorityScore?: number | null;
  aiQaStatus?: "PASSED" | "FLAGGED" | null;
  aiQaNotes?: string | null;
  photoUrl?: string | null;
  issueNotes?: string | null;
  aiQaBboxes?: Array<{ label: string; x: number; y: number; width: number; height: number }>;
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

const raw: Array<[string, RoomType, RoomStatus, PriorityTag, string | null, string, number, string]> = [
  ["101", "Standard", "Ready for Guest", "Regular", "Priya Raman", "15:00", 25, "John Doe"],
  ["102", "Standard", "Vacant Dirty", "Early Arrival", null, "13:00", 30, "Alice Smith"],
  ["103", "Deluxe", "Occupied", "Regular", null, "—", 0, "Robert Lee"],
  ["104", "Deluxe", "Inspection Pending", "VIP", "Priya Raman", "14:00", 35, "Emma Watson"],
  ["105", "Standard", "Maintenance Blocked", "Regular", null, "—", 0, "—"],
  ["118", "Suite", "Cleaning in Progress", "VIP", "Priya Raman", "13:30", 45, "David Beckham"],
  ["201", "Deluxe", "Vacant Dirty", "Overdue", null, "12:00", 30, "Sophia Loren"],
  ["202", "Standard", "Ready for Guest", "Regular", "Ana Duarte", "16:00", 22, "Michael Jordan"],
  ["203", "Suite", "Cleaning in Progress", "VIP", "Ana Duarte", "14:30", 48, "Lady Gaga"],
  ["204", "Standard", "Occupied", "Regular", null, "—", 0, "Chris Evans"],
  ["205", "Deluxe", "Vacant Dirty", "Early Arrival", null, "13:15", 32, "Natalie Portman"],
  ["206", "Standard", "Inspection Pending", "Regular", "Ana Duarte", "17:00", 24, "Bruce Wayne"],
  ["301", "Deluxe", "Ready for Guest", "VIP", "Lucia Moreno", "15:30", 34, "James Bond"],
  ["302", "Standard", "Vacant Dirty", "Regular", null, "18:00", 28, "Tom Hanks"],
  ["303", "Suite", "Occupied", "Regular", null, "—", 0, "Scarlett Johansson"],
  ["305", "Deluxe", "Cleaning in Progress", "Early Arrival", "Lucia Moreno", "13:45", 33, "Taylor Swift"],
  ["306", "Standard", "Vacant Dirty", "Overdue", null, "12:30", 27, "Leonardo DiCaprio"],
  ["307", "Standard", "Ready for Guest", "Regular", "Lucia Moreno", "19:00", 23, "Brad Pitt"],
  ["401", "Suite", "Vacant Dirty", "VIP", null, "14:15", 50, "Beyonce Knowles"],
  ["402", "Deluxe", "Occupied", "Regular", null, "—", 0, "Keanu Reeves"],
  ["403", "Standard", "Maintenance Blocked", "Regular", null, "—", 0, "—"],
  ["405", "Deluxe", "Inspection Pending", "Early Arrival", "Marco Silva", "13:50", 31, "Selena Gomez"],
  ["412", "Suite", "Cleaning in Progress", "VIP", "Marco Silva", "15:15", 47, "Elon Musk"],
  ["415", "Standard", "Vacant Dirty", "Regular", null, "20:00", 26, "Will Smith"],
];

export const initialRooms: Room[] = raw.map(
  ([number, type, status, priority, assignedStaff, checkIn, turnaround, guestName]) => ({
    id: number,
    number,
    floor: Number(number[0]),
    type,
    status,
    priority,
    assignedStaff,
    checkIn,
    turnaround,
    guestName,
    priorityReason:
      priority === "VIP"
        ? `VIP Guest ${guestName} check-in scheduled at ${checkIn}`
        : priority === "Overdue"
          ? `Overdue turnaround from previous departure`
          : priority === "Early Arrival"
            ? `Early Arrival guest check-in scheduled at ${checkIn}`
            : `Standard cleanup queue`,
    aiQaStatus: status === "Inspection Pending" ? "FLAGGED" : null,
    aiQaNotes:
      status === "Inspection Pending"
        ? "Linens rumpled on right side of bed. Unemptied trash near work desk."
        : null,
    photoUrl:
      status === "Inspection Pending"
        ? "https://images.unsplash.com/photo-1598928506311-c55ded91a20c?q=80&w=800"
        : null,
    aiQaBboxes:
      status === "Inspection Pending"
        ? [
            { label: "Rumpled Linens", x: 250, y: 120, width: 140, height: 70 },
            { label: "Unemptied Trash", x: 420, y: 280, width: 80, height: 90 },
          ]
        : [],
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
];

export type Department = "Housekeeping" | "Maintenance" | "Front Desk" | "Room Service";
export type RequestStatus = "Open" | "In Progress" | "Completed" | "Escalated";
export type RequestPriority = "Low" | "Medium" | "High" | "Critical";
export type RequestCategory = "Amenities" | "Maintenance" | "Luggage" | "Inquiry" | "Food Service" | "Late Checkout";

export interface GuestRequest {
  id: string;
  roomNumber: string;
  category: RequestCategory;
  item: string;
  details?: string;
  status: RequestStatus;
  priority: RequestPriority;
  assignedDept: Department;
  assignedStaff: string | null;
  createdAt: string;
  slaMinutes: number;
  elapsedSeconds: number;
}

export const initialGuestRequests: GuestRequest[] = [
  {
    id: "req-1",
    roomNumber: "104",
    category: "Amenities",
    item: "Extra Bath Towels",
    details: "Guest requested 3 fresh bath towels and 2 hand towels.",
    status: "Open",
    priority: "High",
    assignedDept: "Housekeeping",
    assignedStaff: null,
    createdAt: new Date(Date.now() - 3 * 60000).toISOString(),
    slaMinutes: 15,
    elapsedSeconds: 180,
  },
  {
    id: "req-2",
    roomNumber: "403",
    category: "Maintenance",
    item: "AC Thermostat unresponsive",
    details: "Thermostat display is blank and room is hot.",
    status: "Escalated",
    priority: "Critical",
    assignedDept: "Maintenance",
    assignedStaff: null,
    createdAt: new Date(Date.now() - 25 * 60000).toISOString(),
    slaMinutes: 30,
    elapsedSeconds: 1500,
  },
  {
    id: "req-3",
    roomNumber: "301",
    category: "Luggage",
    item: "Baggage Pickup Assist",
    details: "Guest needs help bringing 4 heavy suitcases down to lobby.",
    status: "In Progress",
    priority: "Medium",
    assignedDept: "Front Desk",
    assignedStaff: "Lucia Moreno",
    createdAt: new Date(Date.now() - 8 * 60000).toISOString(),
    slaMinutes: 20,
    elapsedSeconds: 480,
  },
  {
    id: "req-4",
    roomNumber: "202",
    category: "Late Checkout",
    item: "Late Checkout till 2:00 PM",
    details: "Guest requested extended checkout due to late flight.",
    status: "Completed",
    priority: "Low",
    assignedDept: "Front Desk",
    assignedStaff: "Ana Duarte",
    createdAt: new Date(Date.now() - 15 * 60000).toISOString(),
    slaMinutes: 45,
    elapsedSeconds: 900,
  },
];

