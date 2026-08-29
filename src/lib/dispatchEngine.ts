import { type Room, type RoomStatus, type Staff, type GuestRequest, STAFF_FLOORS } from "./cleansync-data";

// ─── AI Proximity & Workload Dispatch Engine ───

export interface StaffRecommendation {
  staffId: string;
  staffName: string;
  currentFloor: number;
  activeTasks: number;
  etaMinutes: number;
  score: number;
  matchReason: string;
}

// Scoring weights
const PROXIMITY_SAME_FLOOR = 50;
const PROXIMITY_ADJACENT_FLOOR = 25;
const PROXIMITY_FAR_FLOOR = 10;
const WORKLOAD_PENALTY_PER_TASK = 15;
const LOW_WORKLOAD_BONUS = 20;

/**
 * Ranks all available staff members for a given guest request based on:
 * 1. Floor proximity to the request room
 * 2. Current active task count (workload)
 * 3. Availability (excludes inactive/off-duty staff)
 *
 * Returns a sorted array of recommendations, best match first.
 */
export function rankStaffForRequest(
  request: GuestRequest,
  allStaff: Staff[],
  allRequests: GuestRequest[]
): StaffRecommendation[] {
  const requestFloor = Number(request.roomNumber[0]) || 1;

  // Only consider active staff
  const availableStaff = allStaff.filter((s) => s.active);

  const recommendations: StaffRecommendation[] = availableStaff.map((s) => {
    const staffFloor = STAFF_FLOORS[s.name] || 1;
    const floorDiff = Math.abs(requestFloor - staffFloor);

    // Floor proximity score
    let proximityScore: number;
    if (floorDiff === 0) {
      proximityScore = PROXIMITY_SAME_FLOOR;
    } else if (floorDiff === 1) {
      proximityScore = PROXIMITY_ADJACENT_FLOOR;
    } else {
      proximityScore = PROXIMITY_FAR_FLOOR;
    }

    // Count active tasks for this staff member
    const activeTasks = allRequests.filter(
      (r) =>
        r.assignedStaff === s.name &&
        (r.status === "In Progress" || r.status === "Open")
    ).length;

    // Workload penalty
    const workloadPenalty = activeTasks * WORKLOAD_PENALTY_PER_TASK;

    // Availability bonus for staff with low workload
    const availabilityBonus = s.workload < 50 ? LOW_WORKLOAD_BONUS : 0;

    // Total score
    const score = proximityScore - workloadPenalty + availabilityBonus;

    // ETA estimate: base 2 min same floor, +1.5 min per floor distance, +2 min per active task
    const etaMinutes = Math.max(1, Math.round(2 + floorDiff * 1.5 + activeTasks * 2));

    // Human-readable match reason
    const floorLabel =
      floorDiff === 0
        ? `same floor (Floor ${staffFloor})`
        : floorDiff === 1
        ? `adjacent floor (Floor ${staffFloor})`
        : `Floor ${staffFloor} (${floorDiff} floors away)`;

    const matchReason = `${s.name} is on ${floorLabel} • ${activeTasks} active task${activeTasks !== 1 ? "s" : ""} • ETA ${etaMinutes} min${etaMinutes !== 1 ? "s" : ""}`;

    return {
      staffId: s.id,
      staffName: s.name,
      currentFloor: staffFloor,
      activeTasks,
      etaMinutes,
      score,
      matchReason,
    };
  });

  // Sort by score descending (best match first), then by ETA ascending as tiebreaker
  return recommendations.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.etaMinutes - b.etaMinutes;
  });
}


export interface PriorityBreakdown {
  score: number;
  isVip: boolean;
  vipScore: number;
  timeDiffMinutes: number;
  urgencyScore: number;
  isSameFloor: boolean;
  proximityScore: number;
  reason: string;
}

const WEIGHT_VIP = 100;
const WEIGHT_URGENCY = 500;
const WEIGHT_PROXIMITY = 30;

/**
 * Calculates priority score and explanation for a room
 * Formula: PriorityScore = (Weight_VIP * IsVIP) + (Weight_Urgency * (CheckInTime - CurrentTime)^-1) + (Weight_Proximity * SameFloorBonus)
 */
export function calculatePriorityScore(
  room: Room,
  lastAssignedRoomNumber: string | null,
  currentTime: string = "13:00"
): PriorityBreakdown {
  const isVip = room.priority === "VIP";
  const vipScore = isVip ? WEIGHT_VIP : 0;

  // Parse check-in time (HH:MM)
  let checkInMinutes = 14 * 60; // default 14:00
  if (room.checkIn && room.checkIn !== "—") {
    const parts = room.checkIn.split(":");
    const h = parts[0] ? Number(parts[0]) : NaN;
    const m = parts[1] ? Number(parts[1]) : NaN;
    if (!isNaN(h) && !isNaN(m)) {
      checkInMinutes = h * 60 + m;
    }
  }

  // Parse current time (HH:MM)
  let currentMinutes = 13 * 60; // default 13:00
  if (currentTime) {
    const parts = currentTime.split(":");
    const ch = parts[0] ? Number(parts[0]) : NaN;
    const cm = parts[1] ? Number(parts[1]) : NaN;
    if (!isNaN(ch) && !isNaN(cm)) {
      currentMinutes = ch * 60 + cm;
    }
  }

  const timeDiffMinutes = checkInMinutes - currentMinutes;
  let urgencyScore = 0;

  if (timeDiffMinutes > 0) {
    // Standard urgency calculation
    urgencyScore = Math.round(WEIGHT_URGENCY * (1.0 / timeDiffMinutes));
  } else {
    // Overdue check-in gets maximum base urgency plus extra weight for duration of overdue
    urgencyScore = Math.round(WEIGHT_URGENCY * (1.0 + Math.abs(timeDiffMinutes) / 60));
  }

  // Proximity (same floor check)
  let isSameFloor = false;
  if (lastAssignedRoomNumber) {
    const lastFloor = Number(lastAssignedRoomNumber[0]);
    if (!isNaN(lastFloor) && lastFloor === room.floor) {
      isSameFloor = true;
    }
  }
  const proximityScore = isSameFloor ? WEIGHT_PROXIMITY : 0;

  const score = vipScore + urgencyScore + proximityScore;

  // Generate explanation
  let reason = "";
  if (isVip) {
    reason += `[VIP] Priority guest ${room.guestName || "arriving"}. `;
  }
  if (timeDiffMinutes < 0) {
    reason += `Overdue check-in (ETA: ${room.checkIn}, ${Math.abs(timeDiffMinutes)}m late). `;
  } else {
    reason += `Check-in scheduled at ${room.checkIn} (${timeDiffMinutes}m remaining). `;
  }
  if (isSameFloor) {
    reason += `Proximity bonus: Same floor (Floor ${room.floor}) as previous assignment. `;
  } else {
    reason += `Floor ${room.floor} turnaround. `;
  }

  return {
    score,
    isVip,
    vipScore,
    timeDiffMinutes,
    urgencyScore,
    isSameFloor,
    proximityScore,
    reason,
  };
}

/**
 * Simulates the AI Staging Photo QA scan
 */
export function evaluateAiScore(photoType: "clean" | "dirty_bed" | "dirty_trash"): {
  score: number;
  passed: boolean;
  notes: string;
  bboxes: Array<{ label: string; x: number; y: number; width: number; height: number }>;
} {
  switch (photoType) {
    case "clean":
      return {
        score: 98,
        passed: true,
        notes: "All staging checklist items passed. Beds neatly staged, amenities fully stocked, no floor debris found.",
        bboxes: [],
      };
    case "dirty_bed":
      return {
        score: 68,
        passed: false,
        notes: "Rumpled linens and alignment errors detected on bedding throw blanket.",
        bboxes: [{ label: "Rumpled Bedding", x: 28, y: 35, width: 44, height: 38 }],
      };
    case "dirty_trash":
      return {
        score: 72,
        passed: false,
        notes: "Visible trash debris detected on floor near desk chair. Amenities require wiping.",
        bboxes: [{ label: "Trash on Floor", x: 55, y: 65, width: 25, height: 28 }],
      };
  }
}

/**
 * State Machine transitions for Room Lifecycle
 */
export function transitionRoomState(
  currentStatus: RoomStatus,
  action: "START_CLEAN" | "SUBMIT_QA" | "APPROVE" | "REJECT" | "MAINTENANCE"
): RoomStatus {
  switch (currentStatus) {
    case "Vacant Dirty":
      if (action === "START_CLEAN") return "Cleaning in Progress";
      if (action === "MAINTENANCE") return "Maintenance Blocked";
      break;

    case "Cleaning in Progress":
      if (action === "SUBMIT_QA") return "Inspection Pending";
      if (action === "MAINTENANCE") return "Maintenance Blocked";
      break;

    case "Inspection Pending":
      if (action === "APPROVE") return "Ready for Guest";
      if (action === "REJECT") return "Cleaning in Progress"; // Re-route to housekeeping
      if (action === "MAINTENANCE") return "Maintenance Blocked";
      break;

    case "Ready for Guest":
      if (action === "MAINTENANCE") return "Maintenance Blocked";
      if (action === "START_CLEAN") return "Cleaning in Progress";
      break;

    case "Maintenance Blocked":
      if (action === "APPROVE") return "Vacant Dirty"; // Cleared maintenance, back to dirty cycle
      if (action === "START_CLEAN") return "Cleaning in Progress";
      break;
  }
  return currentStatus;
}
