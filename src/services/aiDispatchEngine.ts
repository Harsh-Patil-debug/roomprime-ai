import { type Staff, type Room, type GuestRequest, STAFF_FLOORS } from "@/lib/cleansync-data";

export interface DispatchMatch {
  staffId: string;
  staffName: string;
  currentFloor: number;
  activeTaskCount: number;
  calculatedScore: number; // 0 - 100
  estimatedArrivalMin: number; // e.g., 2 mins
  aiReasoning: string;
  shiftStatus: "On Shift" | "On Break" | "Off Duty";
  qaPassRate: number; // e.g., 95 (%)
}

export interface BatchDispatchItem {
  type: "room" | "request";
  targetId: string;
  targetNumber: string;
  targetLabel: string;
  isVip: boolean;
  floor: number;
  match: DispatchMatch;
}

// QA Pass Rates & Shift status map for staff
const STAFF_METRICS: Record<string, { shiftStatus: "On Shift" | "On Break" | "Off Duty"; qaPassRate: number }> = {
  "Priya Raman": { shiftStatus: "On Shift", qaPassRate: 98 },
  "Ana Duarte": { shiftStatus: "On Shift", qaPassRate: 94 },
  "Marco Silva": { shiftStatus: "On Shift", qaPassRate: 92 },
  "Jonas Weber": { shiftStatus: "On Shift", qaPassRate: 88 },
  "Lucia Moreno": { shiftStatus: "On Shift", qaPassRate: 91 },
  "Tomas Iverson": { shiftStatus: "On Shift", qaPassRate: 85 },
};

/**
 * Calculates Assignment Suitability Score (0 - 100) for a single staff member:
 * 1. Shift & Break Status: Hard filter out (Score = 0 if On Break or Off Duty).
 * 2. Floor Proximity: Same Floor (+45), 1 Floor Away (+25), 2+ Floors Away (+10).
 * 3. Workload Penalty: 0 tasks (+35), 1 task (+15), 2+ tasks (-20).
 * 4. VIP Complexity Match: >90% QA Pass Rate (+10).
 */
export function calculateStaffDispatchScore(
  staffMember: Staff,
  targetFloor: number,
  isVip: boolean,
  allRooms: Room[],
  allRequests: GuestRequest[]
): DispatchMatch {
  const staffFloor = STAFF_FLOORS[staffMember.name] || (staffMember as any).floor || 1;
  const metrics = STAFF_METRICS[staffMember.name] || { shiftStatus: "On Shift", qaPassRate: 90 };

  // Hard filter out if inactive or on break/off duty
  if (!staffMember.active || metrics.shiftStatus === "On Break" || metrics.shiftStatus === "Off Duty") {
    return {
      staffId: staffMember.id,
      staffName: staffMember.name,
      currentFloor: staffFloor,
      activeTaskCount: 99,
      calculatedScore: 0,
      estimatedArrivalMin: 99,
      aiReasoning: `${staffMember.name} is currently ${metrics.shiftStatus || "Unavailable"}.`,
      shiftStatus: metrics.shiftStatus,
      qaPassRate: metrics.qaPassRate,
    };
  }

  // Calculate active assigned room cleanings + open service requests for this staff
  const activeRoomTasks = allRooms.filter(
    (r) => r.assignedStaff === staffMember.name && (r.status === "Cleaning in Progress" || r.status === "Vacant Dirty")
  ).length;

  const activeGuestRequests = allRequests.filter(
    (r) => r.assignedStaff === staffMember.name && (r.status === "In Progress" || r.status === "Open")
  ).length;

  const activeTaskCount = activeRoomTasks + activeGuestRequests;

  // 1. Floor Proximity Scoring
  const floorDiff = Math.abs(targetFloor - staffFloor);
  let proximityScore = 10;
  let proximityLabel = `${floorDiff} floors away`;

  if (floorDiff === 0) {
    proximityScore = 45;
    proximityLabel = "Same floor";
  } else if (floorDiff === 1) {
    proximityScore = 25;
    proximityLabel = "1 floor away";
  }

  // 2. Workload & Active Tasks Scoring
  let workloadScore = -20;
  if (activeTaskCount === 0) {
    workloadScore = 35;
  } else if (activeTaskCount === 1) {
    workloadScore = 15;
  }

  // 3. VIP QA Pass Rate Bonus
  let vipBonus = 0;
  if (isVip && metrics.qaPassRate >= 90) {
    vipBonus = 10;
  }

  // Total Score clamped between 0 and 100
  const rawScore = proximityScore + workloadScore + vipBonus;
  const calculatedScore = Math.min(100, Math.max(0, rawScore));

  // ETA Calculation: base 2 mins + 1.5 mins per floor distance + 2 mins per active task
  const estimatedArrivalMin = Math.max(1, Math.round(2 + floorDiff * 1.5 + activeTaskCount * 2));

  // Human-readable AI reasoning explanation
  const reasoningParts: string[] = [
    `Floor ${staffFloor} (${proximityLabel})`,
    `${activeTaskCount} active task${activeTaskCount !== 1 ? "s" : ""}`,
    `${metrics.qaPassRate}% QA rating`,
  ];
  if (isVip && vipBonus > 0) {
    reasoningParts.push("VIP certified");
  }

  const aiReasoning = `${staffMember.name} is on ${reasoningParts.join(" • ")}`;

  return {
    staffId: staffMember.id,
    staffName: staffMember.name,
    currentFloor: staffFloor,
    activeTaskCount,
    calculatedScore,
    estimatedArrivalMin,
    aiReasoning,
    shiftStatus: metrics.shiftStatus,
    qaPassRate: metrics.qaPassRate,
  };
}

/**
 * Returns all staff ranked by calculated suitability score (highest first).
 */
export function rankAllStaffMatches(
  targetRoomNumber: string,
  targetFloor: number,
  isVip: boolean,
  staffList: Staff[],
  rooms: Room[],
  guestRequests: GuestRequest[]
): DispatchMatch[] {
  const matches = staffList
    .map((staff) => calculateStaffDispatchScore(staff, targetFloor, isVip, rooms, guestRequests))
    .filter((m) => m.calculatedScore > 0);

  return matches.sort((a, b) => {
    if (b.calculatedScore !== a.calculatedScore) {
      return b.calculatedScore - a.calculatedScore;
    }
    return a.estimatedArrivalMin - b.estimatedArrivalMin;
  });
}

/**
 * Finds single best staff match for a target room or request.
 */
export function findBestStaffMatch(
  targetRoomNumber: string,
  targetFloor: number,
  isVip: boolean,
  staffList: Staff[],
  rooms: Room[],
  guestRequests: GuestRequest[]
): DispatchMatch | null {
  const ranked = rankAllStaffMatches(targetRoomNumber, targetFloor, isVip, staffList, rooms, guestRequests);
  return ranked[0] || null;
}

/**
 * Batch Auto-Dispatch Engine:
 * Gathers all unassigned "Vacant Dirty" rooms and open guest tickets,
 * runs proximity and workload matching across active staff, and returns optimal assignments.
 * STRICT RULE: Enforces 1 assignment per person (no staff member is assigned twice in the same batch).
 */
export function runBatchAutoDispatch(
  rooms: Room[],
  guestRequests: GuestRequest[],
  staffList: Staff[]
): BatchDispatchItem[] {
  const batchList: BatchDispatchItem[] = [];
  const assignedInBatch = new Set<string>();

  // Gather unassigned items
  const unassignedRooms = rooms.filter((r) => r.status === "Vacant Dirty" && !r.assignedStaff);
  const unassignedRequests = guestRequests.filter((req) => req.status === "Open" && !req.assignedStaff);

  // Priority order: VIP Rooms -> Critical/High Requests -> Standard Rooms -> Normal Requests
  const vipRooms = unassignedRooms.filter((r) => r.priority === "VIP");
  const urgentRequests = unassignedRequests.filter((r) => r.priority === "Critical" || r.priority === "High");
  const standardRooms = unassignedRooms.filter((r) => r.priority !== "VIP");
  const normalRequests = unassignedRequests.filter((r) => r.priority !== "Critical" && r.priority !== "High");

  const priorityItems: Array<
    | { type: "room"; data: Room }
    | { type: "request"; data: GuestRequest }
  > = [
    ...vipRooms.map((r) => ({ type: "room" as const, data: r })),
    ...urgentRequests.map((r) => ({ type: "request" as const, data: r })),
    ...standardRooms.map((r) => ({ type: "room" as const, data: r })),
    ...normalRequests.map((r) => ({ type: "request" as const, data: r })),
  ];

  for (const item of priorityItems) {
    if (item.type === "room") {
      const r = item.data;
      const isVip = r.priority === "VIP";
      const roomFloor = r.floor || Number(r.number[0]) || 1;
      const ranked = rankAllStaffMatches(r.number, roomFloor, isVip, staffList, rooms, guestRequests);

      // Pick top ranked staff who HAS NOT been assigned in this batch
      const bestMatch = ranked.find((m) => !assignedInBatch.has(m.staffName));

      if (bestMatch) {
        assignedInBatch.add(bestMatch.staffName);
        batchList.push({
          type: "room",
          targetId: r.id,
          targetNumber: r.number,
          targetLabel: `Room ${r.number} (${r.type}${isVip ? " • VIP" : ""})`,
          isVip,
          floor: roomFloor,
          match: bestMatch,
        });
      }
    } else {
      const req = item.data;
      const reqFloor = Number(req.roomNumber[0]) || 1;
      const isVip = req.priority === "Critical" || req.priority === "High";
      const ranked = rankAllStaffMatches(req.roomNumber, reqFloor, isVip, staffList, rooms, guestRequests);

      // Pick top ranked staff who HAS NOT been assigned in this batch
      const bestMatch = ranked.find((m) => !assignedInBatch.has(m.staffName));

      if (bestMatch) {
        assignedInBatch.add(bestMatch.staffName);
        batchList.push({
          type: "request",
          targetId: req.id,
          targetNumber: req.roomNumber,
          targetLabel: `Suite ${req.roomNumber}: ${req.item} (${req.category})`,
          isVip,
          floor: reqFloor,
          match: bestMatch,
        });
      }
    }
  }

  return batchList;
}
