import { type RoomStatus, type RoomType, type PriorityTag, type RequestStatus, type RequestPriority, type RequestCategory, type Department } from "@/lib/cleansync-data";

export interface CleaningTimer {
  startedAt: number | null;
  elapsedSeconds: number;
  targetMinutes: number;
}

export interface AiAuditData {
  score: number | null;
  passed: boolean | null;
  issues: string[];
  photoUrl: string | null;
  bboxes?: Array<{ label: string; x: number; y: number; width: number; height: number }>;
}

export interface UnifiedRoom {
  id: string;
  number: string;
  floor: number;
  type: RoomType;
  status: RoomStatus;
  priority: PriorityTag;
  assignedStaffId: string | null;
  assignedStaff: string | null;
  cleaningTimer: CleaningTimer;
  aiAudit: AiAuditData;
  isVIP: boolean;
  eta: string;
  maintenanceNote?: string | null;
  guestName?: string | null;
  priorityReason?: string | null;
  priorityScore?: number | null;
  completedSopSteps?: string[];
  recleanNote?: string | null;
}

export interface UnifiedStaffMember {
  id: string;
  name: string;
  floor: number;
  currentRoomId: string | null;
  completedToday: number;
  isAvailable: boolean;
  assignedTaskIds: string[];
  workload: number;
  avgSpeed: number;
}

export interface UnifiedServiceTicket {
  id: string;
  roomNumber: string;
  category: RequestCategory;
  description: string;
  urgency: RequestPriority;
  status: RequestStatus;
  assignedStaffId: string | null;
  assignedStaff: string | null;
  slaRemainingSeconds: number;
  slaMinutes: number;
  elapsedSeconds: number;
  createdAt: string;
  assignedDept: Department;
  stage?: "received" | "assigned" | "on_the_way" | "delivered";
  resolvedAt?: number;
}
