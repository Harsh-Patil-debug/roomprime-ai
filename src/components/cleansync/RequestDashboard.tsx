import { useState, useMemo, useEffect } from "react";
import { useRoomFlow, STAFF_PHONES } from "./store";
import {
  Wrench,
  Clock,
  UserCheck,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Search,
  Filter,
  Tag,
  Flame,
  ArrowDownWideNarrow,
  Sparkles,
  AlertCircle,
  MessageSquare,
  Sparkle,
  PhoneCall,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  type GuestRequest, 
  type Department, 
  type RequestStatus, 
  type RequestPriority, 
  type RequestCategory,
  STAFF_FLOORS,
  checkUrgentSentiment
} from "@/lib/cleansync-data";
import { rankStaffForRequest, type StaffRecommendation } from "@/lib/dispatchEngine";

// ----------------------------------------------------------------------
// Types & Interfaces for Subcomponents
// ----------------------------------------------------------------------

interface RequestMetricsProps {
  activeCount: number;
  escalatedCount: number;
  breachesCount: number;
  slaSuccessRate: number;
  activeRequests: GuestRequest[];
}

interface RequestToolbarProps {
  selectedDept: Department | "all";
  setSelectedDept: (dept: Department | "all") => void;
  selectedStatus: RequestStatus | "all";
  setSelectedStatus: (status: RequestStatus | "all") => void;
  query: string;
  setQuery: (q: string) => void;
  onLogNewRequestClick: () => void;
}

interface RequestCardListProps {
  requests: (GuestRequest & { priorityScore: number; isUrgentNeed: boolean })[];
  allRequests: GuestRequest[];
  staff: any[];
  assignTaskToStaff: (requestId: string, staffId: string, staffName: string) => void;
  assignGuestRequest: (id: string, staffName: string | null) => void;
  escalateGuestRequest: (id: string) => void;
  updateGuestRequestStatus: (id: string, status: RequestStatus) => void;
  simulateIncomingWhatsApp: (from: string, body: string) => void;
  formatSla: (req: GuestRequest) => React.ReactNode;
  getSlaPercentage: (req: GuestRequest) => number;
  getSlaColor: (req: GuestRequest) => string;
  onCardClick: (req: GuestRequest) => void;
}

interface NewRequestModalProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  reqRoom: string;
  setReqRoom: (room: string) => void;
  reqCategory: RequestCategory;
  setReqCategory: (cat: RequestCategory) => void;
  reqItem: string;
  setReqItem: (item: string) => void;
  reqDetails: string;
  setReqDetails: (details: string) => void;
  reqPriority: RequestPriority;
  setReqPriority: (priority: RequestPriority) => void;
  reqDept: Department | "auto";
  setReqDept: (dept: Department | "auto") => void;
  suggestedDept: Department;
  handleCreateSubmit: (e: React.FormEvent) => void;
}

interface GuestUpdateSlideOverProps {
  request: GuestRequest | null;
  onClose: () => void;
  onSendUpdate: (template: string) => void;
}

// ----------------------------------------------------------------------
// Decomposed Components
// ----------------------------------------------------------------------

export function RequestMetrics({
  activeCount,
  escalatedCount,
  breachesCount,
  slaSuccessRate,
  activeRequests,
}: RequestMetricsProps) {
  const breakdownText = useMemo(() => {
    const counts = { Critical: 0, High: 0, Medium: 0, Low: 0 };
    activeRequests.forEach((req) => {
      if (counts[req.priority] !== undefined) {
        counts[req.priority]++;
      }
    });
    const parts = [];
    if (counts.Critical > 0) parts.push(`${counts.Critical} Critical`);
    if (counts.High > 0) parts.push(`${counts.High} High`);
    if (counts.Medium > 0) parts.push(`${counts.Medium} Med`);
    if (counts.Low > 0) parts.push(`${counts.Low} Low`);
    return parts.length > 0 ? parts.join(", ") : "0 active priorities";
  }, [activeRequests]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Active Open Queue */}
      <Card className="bg-white border-[#EBE3D1] p-4 flex flex-col justify-between rounded-2xl shadow-sm select-none">
        <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#736B5E]">Active Open Queue</span>
        <div className="flex flex-col mt-2">
          <h3 className="text-2xl font-black text-[#2A2620]">{activeCount} in Queue</h3>
          <span className="text-[10px] text-[#736B5E] font-bold mt-1">({breakdownText})</span>
        </div>
      </Card>

      {/* Critical / Escalated */}
      <Card className="bg-white border-[#EBE3D1] p-4 flex flex-col justify-between rounded-2xl shadow-sm border-l-4 border-l-[#B14A3E] select-none">
        <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#736B5E]">Critical / Escalated</span>
        <div className="flex flex-col mt-2">
          <h3 className="text-2xl font-black text-[#B14A3E]">{escalatedCount} Escalated</h3>
          <span className="text-[10px] text-[#736B5E] font-bold mt-1">Immediate attention required</span>
        </div>
      </Card>

      {/* Breaches Today */}
      <Card className="bg-white border-[#EBE3D1] p-4 flex flex-col justify-between rounded-2xl shadow-sm border-l-4 border-l-[#B14A3E] select-none">
        <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#736B5E]">Breaches Today</span>
        <div className="flex flex-col mt-2">
          <h3 className="text-2xl font-black text-[#B14A3E]">{breachesCount} Overdue</h3>
          <span className="text-[10px] text-[#736B5E] font-bold mt-1">Exceeding Service Level Agreement limits</span>
        </div>
      </Card>

      {/* Service Level Agreement Adherence Rate */}
      <Card className="bg-white border-[#EBE3D1] p-4 flex flex-col justify-between rounded-2xl shadow-sm border-l-4 border-l-[#8A9A6B] select-none">
        <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#736B5E]">Agreement Adherence Rate</span>
        <div className="flex flex-col mt-2">
          <h3 className="text-2xl font-black text-[#8A9A6B]">{slaSuccessRate}% On-Time</h3>
          <span className="text-[10px] text-[#736B5E] font-bold mt-1">Resolution compliance</span>
        </div>
      </Card>
    </div>
  );
}

export function RequestToolbar({
  selectedDept,
  setSelectedDept,
  selectedStatus,
  setSelectedStatus,
  query,
  setQuery,
  onLogNewRequestClick,
}: RequestToolbarProps) {
  const statuses: { label: string; value: RequestStatus | "all" }[] = [
    { label: "All Statuses", value: "all" },
    { label: "Open", value: "Open" },
    { label: "In Progress", value: "In Progress" },
    { label: "Escalated", value: "Escalated" },
    { label: "Resolved", value: "Completed" },
  ];

  return (
    <Card className="bg-white border-[#EBE3D1] p-4 flex flex-col md:flex-row gap-4 items-center justify-between rounded-2xl shadow-sm">
      {/* Left: Department Filter */}
      <div className="flex items-center gap-3 w-full md:w-auto">
        <Select value={selectedDept} onValueChange={(v) => setSelectedDept(v as any)}>
          <SelectTrigger className="w-full md:w-[180px] h-9 text-xs border-[#EBE3D1] text-[#2A2620]">
            <div className="flex items-center gap-1.5">
              <Filter className="size-3.5 text-[#736B5E]" />
              <SelectValue placeholder="Department" />
            </div>
          </SelectTrigger>
          <SelectContent className="bg-white border-[#EBE3D1]">
            <SelectItem value="all" className="text-xs">All Departments</SelectItem>
            <SelectItem value="Housekeeping" className="text-xs">Housekeeping</SelectItem>
            <SelectItem value="Maintenance" className="text-xs">Maintenance</SelectItem>
            <SelectItem value="Front Desk" className="text-xs">Front Desk</SelectItem>
            <SelectItem value="Room Service" className="text-xs">Room Service</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Center: Status Pills */}
      <div className="flex items-center gap-1 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 scrollbar-none select-none">
        {statuses.map((item) => {
          const isActive = selectedStatus === item.value;
          return (
            <button
              key={item.value}
              type="button"
              onClick={() => setSelectedStatus(item.value)}
              className={`px-3.5 py-1.5 rounded-xl text-[10px] font-extrabold tracking-wider uppercase transition-all duration-200 cursor-pointer ${
                isActive
                  ? "bg-[#B5652F] text-white shadow-sm"
                  : "bg-[#F5F1E8] text-[#736B5E] hover:bg-[#EBE3D1]/50"
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {/* Right: Search Input & Log Button */}
      <div className="flex items-center gap-2.5 w-full md:w-auto">
        <div className="relative flex-1 md:w-64">
          <Search className="absolute left-2.5 top-2.5 size-4 text-[#736B5E]" />
          <Input
            placeholder="Search room, guest, or request..."
            className="pl-9 h-9 text-xs border-[#EBE3D1] placeholder-[#736B5E] text-[#2A2620] bg-white"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <Button
          size="sm"
          onClick={onLogNewRequestClick}
          className="h-9 bg-[#B5652F] hover:bg-[#B5652F]/90 text-white font-bold text-xs rounded-xl cursor-pointer flex items-center gap-1.5 shrink-0 px-4 shadow-sm"
        >
          <Plus className="size-4" />
          <span>Log New Request</span>
        </Button>
      </div>
    </Card>
  );
}

export function RequestCardList({
  requests,
  allRequests,
  staff,
  assignTaskToStaff,
  assignGuestRequest,
  escalateGuestRequest,
  updateGuestRequestStatus,
  simulateIncomingWhatsApp,
  formatSla,
  getSlaPercentage,
  getSlaColor,
  onCardClick,
}: RequestCardListProps) {
  const priorityStyles: Record<RequestPriority, string> = {
    Critical: "bg-[#B14A3E]/10 border-[#B14A3E]/20 text-[#B14A3E]",
    High: "bg-[#B5652F]/10 border-[#B5652F]/20 text-[#B5652F]",
    Medium: "bg-[#736B5E]/10 border-[#736B5E]/20 text-[#736B5E]",
    Low: "bg-[#736B5E]/5 border-[#736B5E]/15 text-[#736B5E]/80",
  };

  const statusStyles: Record<RequestStatus, string> = {
    Open: "bg-[#736B5E]/10 border-[#736B5E]/20 text-[#736B5E]",
    "In Progress": "bg-[#B5652F]/10 border-[#B5652F]/20 text-[#B5652F]",
    Completed: "bg-[#8A9A6B]/15 border-[#8A9A6B]/30 text-[#8A9A6B]",
    Escalated: "bg-[#B14A3E]/10 border-[#B14A3E]/25 text-[#B14A3E] font-bold animate-pulse",
  };

  return (
    <Card className="bg-white border-[#EBE3D1] p-5 rounded-2xl shadow-sm">
      {/* Card Header */}
      <div className="flex items-center justify-between border-b border-[#F5F1E8] pb-3.5 mb-4 select-none">
        <div>
          <h3 className="font-extrabold text-xs text-[#2A2620] uppercase tracking-wider flex items-center gap-1.5">
            <ArrowDownWideNarrow className="size-4.5 text-[#B5652F]" />
            <span>Active Request Priority Queue</span>
          </h3>
          <p className="text-[11px] text-[#736B5E] mt-0.5 font-medium">
            Sorted dynamically by Service Level Agreement remaining time, priority tier, and check-in constraints.
          </p>
        </div>
        <Badge variant="outline" className="border-[#EBE3D1] text-[10px] font-mono text-[#736B5E]">
          {requests.length} requests listed
        </Badge>
      </div>

      {/* Card Queue */}
      <div className="space-y-4">
        {requests.map((req) => {
          const progress = getSlaPercentage(req);
          const progressColor = getSlaColor(req);
          const isEscalated = req.status === "Escalated";
          const isCompleted = req.status === "Completed";
          const isAssigned = !!req.assignedStaff;

          // AI-powered staff ranking for unassigned requests
          const rankedStaff: StaffRecommendation[] =
            !isCompleted && !isAssigned
              ? rankStaffForRequest(req, staff, allRequests)
              : [];
          const topMatch = rankedStaff[0] || null;

          return (
            <div
              key={req.id}
              onClick={() => onCardClick(req)}
              className={`flex flex-col lg:flex-row lg:items-center justify-between gap-4 border border-[#EBE3D1] p-4 rounded-2xl transition-all duration-300 bg-white cursor-pointer ${
                isEscalated
                  ? "border-[#B14A3E] shadow-sm"
                  : isCompleted
                  ? "opacity-60 bg-[#F5F1E8]/20"
                  : "hover:shadow-md hover:border-[#B5652F]"
              }`}
            >
              {/* Left Block */}
              <div className="flex items-center gap-3.5 shrink-0 select-none">
                <div className="flex flex-col items-center justify-center size-14 rounded-xl bg-[#F5F1E8] border border-[#EBE3D1] font-bold text-center">
                  <span className="text-[8px] uppercase tracking-wider text-[#736B5E] font-extrabold leading-none">Room</span>
                  <span className="text-base text-[#2A2620] font-black mt-0.5">{req.roomNumber}</span>
                </div>
                
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant="outline" className={`text-[9px] font-black tracking-wider uppercase border rounded-md px-1.5 py-0.5 ${statusStyles[req.status]}`}>
                      {req.status}
                    </Badge>
                    <span className="text-[9px] font-extrabold tracking-wider uppercase text-[#736B5E] bg-[#F5F1E8] px-1.5 py-0.5 rounded-md border border-[#EBE3D1]">
                      {req.assignedDept}
                    </span>
                  </div>
                </div>
              </div>

              {/* Center Details Block */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-extrabold text-sm text-[#2A2620]">{req.item}</span>
                  <Badge variant="outline" className={`text-[9px] font-black tracking-wider uppercase rounded-md border px-1.5 py-0 ${priorityStyles[req.priority]}`}>
                    {req.priority}
                  </Badge>
                  <span className="text-[10px] text-[#736B5E] font-mono">({req.category})</span>
                  
                  {/* Sentiment badge */}
                  {req.isUrgentNeed && (
                    <Badge className="bg-[#B14A3E]/10 hover:bg-[#B14A3E]/15 border border-[#B14A3E]/20 text-[#B14A3E] font-extrabold text-[8px] tracking-wider uppercase px-2 py-0.5 animate-pulse rounded-md">
                      🔥 Urgent Guest Need
                    </Badge>
                  )}
                </div>
                
                <p className="text-xs text-[#736B5E] mt-1 line-clamp-2 leading-relaxed font-sans">
                  {req.details || "No supplementary details provided."}
                </p>

                <div className="flex items-center gap-2.5 mt-2 flex-wrap text-[10px] text-[#736B5E] font-semibold select-none">
                  <span>Logged: {new Date(req.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  <span>•</span>
                  <span>Service Level Agreement Limit: {req.slaMinutes}m</span>
                  {req.assignedStaff && (
                    <>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <UserCheck className="size-3 text-[#B5652F]" />
                        <span>Assigned to: <strong className="text-[#2A2620]">{req.assignedStaff}</strong></span>
                      </span>
                    </>
                  )}
                </div>

                {/* AI Proximity Dispatch Recommendation Pill */}
                {!isCompleted && !isAssigned && topMatch && (
                  <div className="mt-2.5 space-y-2" onClick={(e) => e.stopPropagation()}>
                    {/* AI Match Badge */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[9px] font-extrabold text-[#8A9A6B] bg-[#8A9A6B]/10 border border-[#8A9A6B]/25 px-2.5 py-1 rounded-lg flex items-center gap-1.5 select-none">
                        <Sparkles className="size-3 text-[#B5652F]" />
                        <span className="inline-block size-1.5 rounded-full bg-[#8A9A6B] animate-ping" />
                        ⚡ AI Match: {topMatch.staffName} (Floor {topMatch.currentFloor} • {topMatch.activeTasks} task{topMatch.activeTasks !== 1 ? "s" : ""} • ETA {topMatch.etaMinutes}m)
                      </span>
                    </div>

                    {/* 1-Tap Auto-Assign + Dropdown Row */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          assignTaskToStaff(req.id, topMatch.staffId, topMatch.staffName);
                        }}
                        className="text-[10px] font-extrabold text-white bg-[#B5652F] hover:bg-[#B5652F]/90 px-3 py-1.5 rounded-lg transition-all active:scale-95 cursor-pointer shadow-sm flex items-center gap-1.5"
                      >
                        <Sparkle className="size-3" />
                        ⚡ 1-Tap Auto-Assign Nearest
                      </button>

                      {/* Ranked staff dropdown */}
                      {rankedStaff.length > 1 && (
                        <Select
                          value="_pick"
                          onValueChange={(v) => {
                            if (v === "_pick") return;
                            const match = rankedStaff.find((s) => s.staffId === v);
                            if (match) {
                              assignTaskToStaff(req.id, match.staffId, match.staffName);
                            }
                          }}
                        >
                          <SelectTrigger className="w-[165px] h-7 text-[10px] border-[#EBE3D1] bg-white text-[#736B5E]">
                            <SelectValue placeholder="Other staff..." />
                          </SelectTrigger>
                          <SelectContent className="bg-white border-[#EBE3D1]">
                            <SelectItem value="_pick" className="text-[10px] text-[#736B5E]" disabled>Pick ranked staff...</SelectItem>
                            {rankedStaff.map((s, idx) => (
                              <SelectItem key={s.staffId} value={s.staffId} className="text-[10px]">
                                <span className="flex items-center gap-1">
                                  <span className="font-extrabold">{idx === 0 ? "⚡" : `#${idx + 1}`}</span>
                                  {s.staffName}
                                  <span className="text-[#736B5E] font-mono">• F{s.currentFloor} • ETA {s.etaMinutes}m</span>
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Action & SLA Block */}
              <div 
                className="flex flex-col sm:flex-row lg:flex-col items-start sm:items-center lg:items-end gap-3.5 shrink-0 border-t lg:border-t-0 border-[#F5F1E8] pt-3 lg:pt-0 justify-between sm:justify-end lg:justify-center"
                onClick={(e) => e.stopPropagation()}
              >
                
                {/* Live Service Level Agreement Timer Pill */}
                <div className="w-full sm:w-48 lg:w-44 text-left sm:text-right lg:text-right space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] font-mono uppercase">
                    <span className="text-[#736B5E] font-bold font-sans">Agreement status</span>
                    <span className="font-black">{formatSla(req)}</span>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="h-1.5 w-full bg-[#F5F1E8] rounded-full overflow-hidden border border-[#EBE3D1]">
                    <div
                      className={`h-full transition-all duration-300 ${progressColor}`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                {/* Actions Button Row */}
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  {!isCompleted ? (
                    <>
                      {/* AI Recommended 1-Click Auto-Assign */}
                      {!req.assignedStaff && (() => {
                        const reqFloor = Number(req.roomNumber[0]) || 1;
                        const isVip = req.priority === "Critical" || req.priority === "High";
                        const bestMatch = findBestStaffMatch(req.roomNumber, reqFloor, isVip, staff, rooms, guestRequests);

                        if (!bestMatch) return null;

                        return (
                          <Button
                            size="sm"
                            onClick={() => assignTaskToStaff(req.id, bestMatch.staffId, bestMatch.staffName)}
                            className="h-8 text-[10px] font-black bg-[#B5652F] hover:bg-[#B5652F]/90 text-white rounded-lg px-2.5 cursor-pointer flex items-center gap-1 shadow-xs shrink-0"
                            title={bestMatch.aiReasoning}
                          >
                            <Sparkles className="size-3 text-amber-300" />
                            <span>⚡ Auto-Assign ({bestMatch.staffName})</span>
                          </Button>
                        );
                      })()}

                      {/* Quick Staff Assignee Dropdown */}
                      <Select
                        value={req.assignedStaff ?? "unassigned"}
                        onValueChange={(v) => {
                          const staffName = v === "unassigned" ? null : v;
                          assignGuestRequest(req.id, staffName);
                          if (staffName) {
                            toast.success(`Request assigned to ${staffName}`);
                          } else {
                            toast.info(`Request unassigned`);
                          }
                        }}
                      >
                        <SelectTrigger className="w-32 h-8 text-xs border-[#EBE3D1] bg-white text-[#2A2620]">
                          <SelectValue placeholder="Assign Staff" />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-[#EBE3D1]">
                          <SelectItem value="unassigned" className="text-xs">Unassigned</SelectItem>
                          {staff
                            .filter((s) => s.active)
                            .map((s) => (
                              <SelectItem key={s.id} value={s.name} className="text-xs">
                                {s.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>

                      {/* Escalate button */}
                      {!isEscalated && (
                        <Button
                          size="icon"
                          variant="outline"
                          className="size-8 text-[#B14A3E] border-[#B14A3E]/30 hover:bg-[#B14A3E]/10 shrink-0 cursor-pointer"
                          onClick={() => {
                            escalateGuestRequest(req.id);
                            simulateIncomingWhatsApp("+15559990001", `MANAGER ALERT: Service Level Agreement Escalation for Room ${req.roomNumber} - "${req.item}" exceeded target limit!`);
                            toast.warning(`Request escalated to Critical priority! Manager alerted.`);
                          }}
                          title="Force Service Level Agreement Escalation"
                        >
                          <Flame className="size-4" />
                        </Button>
                      )}

                      {/* Resolve button with micro celebration animation */}
                      <Button
                        size="sm"
                        className="h-8 bg-[#8A9A6B] hover:bg-[#8A9A6B]/90 text-white font-extrabold text-xs shrink-0 rounded-xl cursor-pointer shadow-sm px-3.5 transition-all duration-300 hover:scale-105 active:scale-95"
                        onClick={() => {
                          updateGuestRequestStatus(req.id, "Completed");
                          toast.success(`🎉 Request resolved successfully!`);
                        }}
                      >
                        <CheckCircle2 className="size-3.5 mr-1" />
                        <span>Resolve</span>
                      </Button>
                    </>
                  ) : (
                    /* Re-open button */
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 border-[#EBE3D1] text-xs shrink-0 rounded-xl cursor-pointer hover:bg-[#F5F1E8]/50"
                      onClick={() => {
                        updateGuestRequestStatus(req.id, "Open");
                        toast.info(`Re-opened request for Room ${req.roomNumber}`);
                      }}
                    >
                      Re-open Request
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {!requests.length && (
          <div className="py-12 text-center text-xs text-[#736B5E] italic">
            No guest requests match the current filters.
          </div>
        )}
      </div>
    </Card>
  );
}

export function NewRequestModal({
  open,
  setOpen,
  reqRoom,
  setReqRoom,
  reqCategory,
  setReqCategory,
  reqItem,
  setReqItem,
  reqDetails,
  setReqDetails,
  reqPriority,
  setReqPriority,
  reqDept,
  setReqDept,
  suggestedDept,
  handleCreateSubmit,
}: NewRequestModalProps) {
  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerContent className="bg-white border-t border-[#EBE3D1] pb-6">
        <div className="mx-auto w-full max-w-sm">
          <DrawerHeader>
            <DrawerTitle className="text-[#2A2620] font-black text-base uppercase tracking-wider">Log Guest / Operational Request</DrawerTitle>
            <DrawerDescription className="text-[11px] text-[#736B5E] font-medium">
              Create a new request and automatically dispatch it to the appropriate operations queue.
            </DrawerDescription>
          </DrawerHeader>

          <form onSubmit={handleCreateSubmit} className="space-y-4 px-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="req-room-num" className="text-[#2A2620] text-xs font-bold">Room Number</Label>
                <Input
                  id="req-room-num"
                  placeholder="e.g. 305"
                  value={reqRoom}
                  onChange={(e) => setReqRoom(e.target.value)}
                  className="border-[#EBE3D1] h-10 text-xs text-[#2A2620] placeholder-[#736B5E]"
                  required
                />
              </div>
              
              <div className="space-y-1.5">
                <Label htmlFor="req-cat" className="text-[#2A2620] text-xs font-bold">Category</Label>
                <Select value={reqCategory} onValueChange={(v) => setReqCategory(v as RequestCategory)}>
                  <SelectTrigger id="req-cat" className="border-[#EBE3D1] h-10 text-xs text-[#2A2620]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-[#EBE3D1]">
                    <SelectItem value="Amenities" className="text-xs">Amenities Catalog</SelectItem>
                    <SelectItem value="Maintenance" className="text-xs">Maintenance Repair</SelectItem>
                    <SelectItem value="Luggage" className="text-xs">Luggage / Porter</SelectItem>
                    <SelectItem value="Food Service" className="text-xs">In-Room Food Service</SelectItem>
                    <SelectItem value="Inquiry" className="text-xs">General Inquiry</SelectItem>
                    <SelectItem value="Late Checkout" className="text-xs">Late Check-out</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="req-item-input" className="text-[#2A2620] text-xs font-bold">Request Item (Task Short Name)</Label>
              <div className="relative">
                <Input
                  id="req-item-input"
                  placeholder="e.g. Extra pillow, AC leaking, Luggage help..."
                  value={reqItem}
                  onChange={(e) => setReqItem(e.target.value)}
                  className="border-[#EBE3D1] h-10 text-xs text-[#2A2620] placeholder-[#736B5E] pr-24"
                  required
                />
                {reqItem && (
                  <span className="absolute right-2 top-2.5 flex items-center text-[9px] text-[#B5652F] bg-[#B5652F]/10 rounded-md px-2 py-0.5 font-bold border border-[#B5652F]/20">
                    <Sparkles className="size-3 mr-0.5" /> {suggestedDept}
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="req-details-input" className="text-[#2A2620] text-xs font-bold">Supplementary Details / Notes</Label>
              <Textarea
                id="req-details-input"
                placeholder="Include specific guest notes here..."
                rows={3}
                value={reqDetails}
                onChange={(e) => setReqDetails(e.target.value)}
                className="border-[#EBE3D1] text-xs text-[#2A2620] placeholder-[#736B5E]"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="req-pri" className="text-[#2A2620] text-xs font-bold">Priority Severity</Label>
                <Select value={reqPriority} onValueChange={(v) => setReqPriority(v as RequestPriority)}>
                  <SelectTrigger id="req-pri" className="border-[#EBE3D1] h-10 text-xs text-[#2A2620]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-[#EBE3D1]">
                    <SelectItem value="Low" className="text-xs">Low (45m Service Level Agreement)</SelectItem>
                    <SelectItem value="Medium" className="text-xs">Medium (30m Service Level Agreement)</SelectItem>
                    <SelectItem value="High" className="text-xs">High (20m Service Level Agreement)</SelectItem>
                    <SelectItem value="Critical" className="text-xs">Critical (15m Service Level Agreement)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="req-routing" className="text-[#2A2620] text-xs font-bold">Department Routing</Label>
                <Select value={reqDept} onValueChange={(v) => setReqDept(v as any)}>
                  <SelectTrigger id="req-routing" className="border-[#EBE3D1] h-10 text-xs text-[#2A2620]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-[#EBE3D1]">
                    <SelectItem value="auto" className="text-xs">Auto-route Engine</SelectItem>
                    <SelectItem value="Housekeeping" className="text-xs">Housekeeping Dept</SelectItem>
                    <SelectItem value="Maintenance" className="text-xs">Maintenance Dept</SelectItem>
                    <SelectItem value="Front Desk" className="text-xs">Front Desk</SelectItem>
                    <SelectItem value="Room Service" className="text-xs">Room Service</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DrawerFooter className="px-0 pt-2 flex flex-col gap-2">
              <Button type="submit" className="w-full bg-[#B5652F] hover:bg-[#B5652F]/90 text-white font-extrabold text-xs min-h-[44px] rounded-xl cursor-pointer shadow-sm">
                Submit Request
              </Button>
              <Button type="button" variant="outline" className="w-full border-[#EBE3D1] text-[#736B5E] min-h-[44px] rounded-xl cursor-pointer hover:bg-[#F5F1E8]/50" onClick={() => setOpen(false)}>
                Cancel
              </Button>
            </DrawerFooter>
          </form>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

export function GuestUpdateSlideOver({
  request,
  onClose,
  onSendUpdate,
}: GuestUpdateSlideOverProps) {
  return (
    <Drawer open={!!request} onOpenChange={() => onClose()}>
      <DrawerContent className="bg-white border-t border-[#EBE3D1] pb-6 select-none">
        {request && (
          <div className="mx-auto w-full max-w-sm">
            <DrawerHeader>
              <DrawerTitle className="text-[#2A2620] font-black text-sm uppercase tracking-wider flex items-center gap-1.5">
                <MessageSquare className="size-4.5 text-[#B5652F]" />
                <span>Guest Updates Slide-Over</span>
              </DrawerTitle>
              <DrawerDescription className="text-[11px] text-[#736B5E] font-medium">
                Send 1-tap WhatsApp notifications directly to Room {request.roomNumber} guest regarding their request: <strong>"{request.item}"</strong>.
              </DrawerDescription>
            </DrawerHeader>

            <div className="p-4 space-y-3">
              <div className="bg-[#F5F1E8] border border-[#EBE3D1] p-3 rounded-xl flex items-start gap-2.5 text-xs text-[#2A2620] mb-2 font-medium">
                <PhoneCall className="size-4 shrink-0 text-[#B5652F] mt-0.5" />
                <div>
                  <span className="font-bold text-[10px] text-[#736B5E] uppercase tracking-wider block">Target Guest Concierge Link</span>
                  <span>WhatsApp active channel connected to guest profile.</span>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => onSendUpdate("On our way (2 mins)")}
                  className="w-full text-left p-3.5 bg-white border border-[#EBE3D1] hover:border-[#B5652F] text-xs font-bold text-[#2A2620] rounded-xl transition-all duration-200 active:scale-[0.98] shadow-sm flex items-center justify-between"
                >
                  <span>"On our way (2 mins)"</span>
                  <Badge className="bg-[#8A9A6B]/15 text-[#8A9A6B] hover:bg-[#8A9A6B]/15 text-[8px] font-black py-0.5 border-0">WhatsApp</Badge>
                </button>

                <button
                  type="button"
                  onClick={() => onSendUpdate("Technician at door")}
                  className="w-full text-left p-3.5 bg-white border border-[#EBE3D1] hover:border-[#B5652F] text-xs font-bold text-[#2A2620] rounded-xl transition-all duration-200 active:scale-[0.98] shadow-sm flex items-center justify-between"
                >
                  <span>"Technician at door"</span>
                  <Badge className="bg-[#8A9A6B]/15 text-[#8A9A6B] hover:bg-[#8A9A6B]/15 text-[8px] font-black py-0.5 border-0">WhatsApp</Badge>
                </button>

                <button
                  type="button"
                  onClick={() => onSendUpdate("Request completed")}
                  className="w-full text-left p-3.5 bg-white border border-[#EBE3D1] hover:border-[#B5652F] text-xs font-bold text-[#2A2620] rounded-xl transition-all duration-200 active:scale-[0.98] shadow-sm flex items-center justify-between"
                >
                  <span>"Request completed"</span>
                  <Badge className="bg-[#8A9A6B]/15 text-[#8A9A6B] hover:bg-[#8A9A6B]/15 text-[8px] font-black py-0.5 border-0">Complete & Notify</Badge>
                </button>
              </div>
            </div>

            <DrawerFooter className="px-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="w-full border-[#EBE3D1] text-[#736B5E] min-h-[40px] rounded-xl cursor-pointer hover:bg-[#F5F1E8]/50"
              >
                Close Slide-Over
              </Button>
            </DrawerFooter>
          </div>
        )}
      </DrawerContent>
    </Drawer>
  );
}

// ----------------------------------------------------------------------
// Main Wrapper Component
// ----------------------------------------------------------------------

import { findBestStaffMatch } from "@/services/aiDispatchEngine";

export function RequestDashboard() {
  const {
    guestRequests,
    staff,
    addGuestRequest,
    updateGuestRequestStatus,
    assignGuestRequest,
    assignTaskToStaff,
    escalateGuestRequest,
    simulateIncomingWhatsApp,
  } = useRoomFlow();

  const [query, setQuery] = useState("");
  const [selectedDept, setSelectedDept] = useState<Department | "all">("all");
  const [selectedStatus, setSelectedStatus] = useState<RequestStatus | "all">("all");
  
  // Create Request Modal State
  const [createOpen, setCreateOpen] = useState(false);
  const [reqRoom, setReqRoom] = useState("");
  const [reqCategory, setReqCategory] = useState<RequestCategory>("Amenities");
  const [reqItem, setReqItem] = useState("");
  const [reqDetails, setReqDetails] = useState("");
  const [reqPriority, setReqPriority] = useState<RequestPriority>("Medium");
  const [reqDept, setReqDept] = useState<Department | "auto">("auto");

  // Guest Update Sheet State
  const [selectedRequestForUpdate, setSelectedRequestForUpdate] = useState<GuestRequest | null>(null);

  // Force local ticker re-render for live countdown values
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setTick((t) => t + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Determine auto-routed department for display during creation
  const suggestedDept = useMemo(() => {
    if (reqDept !== "auto") return reqDept;
    const text = (reqItem + " " + reqDetails).toLowerCase();
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
      return "Maintenance";
    }
    if (
      text.includes("baggage") ||
      text.includes("luggage") ||
      text.includes("checkout") ||
      text.includes("key") ||
      text.includes("bellboy") ||
      text.includes("taxi") ||
      text.includes("wake")
    ) {
      return "Front Desk";
    }
    if (
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
      return "Room Service";
    }
    return "Housekeeping";
  }, [reqItem, reqDetails, reqDept]);

  // Filters guest requests based on search query, department and status
  const filteredRequests = useMemo(() => {
    return guestRequests.filter((req) => {
      if (selectedDept !== "all" && req.assignedDept !== selectedDept) return false;
      if (selectedStatus !== "all" && req.status !== selectedStatus) return false;
      
      const q = query.trim().toLowerCase();
      if (q) {
        return (
          req.roomNumber.includes(q) ||
          req.item.toLowerCase().includes(q) ||
          (req.details ?? "").toLowerCase().includes(q) ||
          (req.assignedStaff ?? "").toLowerCase().includes(q) ||
          req.category.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [guestRequests, selectedDept, selectedStatus, query]);

  // Compute Priority Scores for request ordering
  const scoredRequests = useMemo(() => {
    return filteredRequests
      .map((req) => {
        let score = 0;
        
        // Priority weight
        const weights = { Critical: 100, High: 60, Medium: 30, Low: 10 };
        score += weights[req.priority] || 30;

        // SLA urgency ratio
        const totalSlaSec = req.slaMinutes * 60;
        const ratio = req.elapsedSeconds / totalSlaSec;
        score += Math.round(ratio * 50); // Up to 50 points based on SLA progression

        // Escalated status bonus
        if (req.status === "Escalated") {
          score += 40;
        }

        // Sentiment check
        const isUrgentNeed = checkUrgentSentiment(req.item + " " + (req.details || ""));
        if (isUrgentNeed) {
          score += 50; // Bump priority score for urgent guest sentiment
        }

        return { ...req, priorityScore: score, isUrgentNeed };
      })
      .sort((a, b) => {
        // Active/escalated first, then by priority score, then by date
        if (a.status === "Completed" && b.status !== "Completed") return 1;
        if (a.status !== "Completed" && b.status === "Completed") return -1;
        return b.priorityScore - a.priorityScore;
      });
  }, [filteredRequests, tick]);

  // KPI Calculations
  const stats = useMemo(() => {
    const active = guestRequests.filter((r) => r.status !== "Completed");
    const completed = guestRequests.filter((r) => r.status === "Completed");
    
    // SLA breaches
    const breaches = guestRequests.filter(
      (r) => r.status === "Escalated" || (r.status !== "Completed" && r.elapsedSeconds > r.slaMinutes * 60)
    ).length;

    // Rate of completions within SLA
    const withinSlaCount = completed.filter((r) => r.elapsedSeconds <= r.slaMinutes * 60).length;
    const slaSuccessRate = completed.length > 0 ? Math.round((withinSlaCount / completed.length) * 100) : 100;

    return {
      activeCount: active.length,
      escalatedCount: guestRequests.filter((r) => r.status === "Escalated").length,
      breachesCount: breaches,
      slaSuccessRate,
      activeRequests: active,
    };
  }, [guestRequests]);

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reqRoom || !reqItem) {
      toast.error("Room Number and Request Item are required");
      return;
    }

    addGuestRequest(
      reqRoom,
      reqCategory,
      reqItem,
      reqDetails,
      reqPriority,
      reqDept === "auto" ? undefined : reqDept
    );

    toast.success(`Request logged for Room ${reqRoom}! Routed to ${suggestedDept}.`);
    
    // Reset form
    setReqRoom("");
    setReqItem("");
    setReqDetails("");
    setReqPriority("Medium");
    setReqDept("auto");
    setCreateOpen(false);
  };

  const handleSendWhatsAppUpdate = (template: string) => {
    if (!selectedRequestForUpdate) return;
    const req = selectedRequestForUpdate;
    
    // Simulate WhatsApp message logging
    simulateIncomingWhatsApp("+15550009999", `Guest Update Outbound (Room ${req.roomNumber}): "${template}"`);
    toast.success(`WhatsApp guest update sent: "${template}"`);

    // If request completed template selected, resolve the ticket too
    if (template === "Request completed") {
      updateGuestRequestStatus(req.id, "Completed");
      toast.success("Ticket status updated to Resolved!");
    }

    setSelectedRequestForUpdate(null);
  };

  // Formatting seconds to MM:SS or remaining countdown
  const formatSla = (req: GuestRequest) => {
    const totalSlaSeconds = req.slaMinutes * 60;
    const remainingSeconds = totalSlaSeconds - req.elapsedSeconds;
    
    if (req.status === "Completed") {
      const minutesTaken = Math.floor(req.elapsedSeconds / 60);
      const secondsTaken = req.elapsedSeconds % 60;
      const formattedTime = `${String(minutesTaken).padStart(2, "0")}:${String(secondsTaken).padStart(2, "0")}`;
      const breached = req.elapsedSeconds > totalSlaSeconds;
      return (
        <span className={`px-2 py-0.5 rounded-md text-[9px] font-extrabold ${breached ? "bg-[#B14A3E]/10 text-[#B14A3E]" : "bg-[#8A9A6B]/15 text-[#8A9A6B]"}`}>
          Resolved: {formattedTime} {breached ? "(Breached)" : ""}
        </span>
      );
    }

    if (remainingSeconds <= 0) {
      const overtime = Math.abs(remainingSeconds);
      const mm = String(Math.floor(overtime / 60)).padStart(2, "0");
      const ss = String(overtime % 60).padStart(2, "0");
      return (
        <span className="px-2 py-0.5 rounded-md bg-[#B14A3E]/10 border border-[#B14A3E] text-[#B14A3E] font-black text-[9px] animate-pulse shadow-[0_0_8px_rgba(177,74,62,0.2)]">
          🚨 BREACHED by -{mm}:{ss}
        </span>
      );
    } else {
      const mm = String(Math.floor(remainingSeconds / 60)).padStart(2, "0");
      const ss = String(remainingSeconds % 60).padStart(2, "0");
      return (
        <span className="px-2 py-0.5 rounded-md bg-[#8A9A6B]/10 text-[#8A9A6B] font-extrabold text-[9px]">
          ⏱ {mm}:{ss} remaining
        </span>
      );
    }
  };

  const getSlaPercentage = (req: GuestRequest) => {
    const total = req.slaMinutes * 60;
    const pct = (req.elapsedSeconds / total) * 100;
    return Math.min(100, Math.round(pct));
  };

  const getSlaColor = (req: GuestRequest) => {
    if (req.status === "Completed") return "bg-[#8A9A6B]";
    const totalSlaSeconds = req.slaMinutes * 60;
    const remainingSeconds = totalSlaSeconds - req.elapsedSeconds;
    
    if (remainingSeconds <= 0) return "bg-[#B14A3E] animate-pulse";
    if (remainingSeconds < 300) return "bg-[#D97706] animate-pulse"; // Amber Gold warning (< 5m)
    return "bg-[#8A9A6B]"; // Sage Green safe
  };

  return (
    <div className="space-y-6">
      {/* 1. Request Metrics Bar */}
      <RequestMetrics
        activeCount={stats.activeCount}
        escalatedCount={stats.escalatedCount}
        breachesCount={stats.breachesCount}
        slaSuccessRate={stats.slaSuccessRate}
        activeRequests={stats.activeRequests}
      />

      {/* 2. Request Toolbar */}
      <RequestToolbar
        selectedDept={selectedDept}
        setSelectedDept={setSelectedDept}
        selectedStatus={selectedStatus}
        setSelectedStatus={setSelectedStatus}
        query={query}
        setQuery={setQuery}
        onLogNewRequestClick={() => setCreateOpen(true)}
      />

      {/* 3. Active Requests Priority Queue */}
      <RequestCardList
        requests={scoredRequests}
        allRequests={guestRequests}
        staff={staff}
        assignTaskToStaff={assignTaskToStaff}
        assignGuestRequest={assignGuestRequest}
        escalateGuestRequest={escalateGuestRequest}
        updateGuestRequestStatus={updateGuestRequestStatus}
        simulateIncomingWhatsApp={simulateIncomingWhatsApp}
        formatSla={formatSla}
        getSlaPercentage={getSlaPercentage}
        getSlaColor={getSlaColor}
        onCardClick={(req) => setSelectedRequestForUpdate(req)}
      />

      {/* 4. Log New Request Drawer */}
      <NewRequestModal
        open={createOpen}
        setOpen={setCreateOpen}
        reqRoom={reqRoom}
        setReqRoom={setReqRoom}
        reqCategory={reqCategory}
        setReqCategory={setReqCategory}
        reqItem={reqItem}
        setReqItem={setReqItem}
        reqDetails={reqDetails}
        setReqDetails={setReqDetails}
        reqPriority={reqPriority}
        setReqPriority={setReqPriority}
        reqDept={reqDept}
        setReqDept={setReqDept}
        suggestedDept={suggestedDept}
        handleCreateSubmit={handleCreateSubmit}
      />

      {/* 5. Guest Update WhatsApp Drawer Slide-Over */}
      <GuestUpdateSlideOver
        request={selectedRequestForUpdate}
        onClose={() => setSelectedRequestForUpdate(null)}
        onSendUpdate={handleSendWhatsAppUpdate}
      />
    </div>
  );
}
