import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  Zap,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Send,
  Check,
  AlertCircle,
} from "lucide-react";
import { useRoomFlow } from "@/components/cleansync/store";
import { toast } from "sonner";

// ─── Design Tokens ───
const COPPER = "#B5652F";
const TERRACOTTA = "#B14A3E";
const SAGE = "#8A9A6B";
const CREAM = "#F5F1E8";
const BORDER = "#EBE3D1";
const TEXT_PRIMARY = "#2A2620";
const TEXT_MUTED = "#736B5E";

// ─── Scanning Ticker Messages ───
const SCAN_MESSAGES = [
  "Initializing Gemini Vision engine…",
  "Scanning linens tautness…",
  "Checking trash clearance…",
  "Auditing towel & robe staging…",
  "Analyzing nightstand surfaces…",
  "Computing final staging score…",
];

// ─── Deterministic Results ───
const CLEAN_RESULT = {
  score: 97,
  passed: true,
  badgeLabel: "97% • STAGING PASS",
  checklist: [
    { label: "Bed Linens", detail: "Taut & Wrinkle-Free", score: 98, pass: true },
    { label: "Trash & Belongings", detail: "Fully Cleared", score: 100, pass: true },
    { label: "Towels & Robes", detail: "Staged to SOP", score: 96, pass: true },
    { label: "Nightstands & Surfaces", detail: "Polished", score: 95, pass: true },
  ],
  issues: [] as string[],
  notes:
    "All checklist items pass. Bed is tight and neat, towels folded, no floor debris, amenities stocked. Room exceeds premium staging standards.",
};

const MESSED_RESULT = {
  score: 78,
  passed: false,
  badgeLabel: "78% • INSPECTION FLAGGED",
  checklist: [
    { label: "Bed Linens", detail: "Wrinkles & Loose Corners Detected", score: 72, pass: false },
    { label: "Trash & Belongings", detail: "Debris Found on Bedside Table", score: 65, pass: false },
    { label: "Towels & Robes", detail: "Folded", score: 90, pass: true },
    { label: "Nightstands & Surfaces", detail: "Acceptable", score: 85, pass: true },
  ],
  issues: [
    "Wrinkled bed sheets on left side",
    "Uncollected plastic cup on nightstand",
  ],
  notes:
    "Defects detected: Bed linens show visible wrinkles and loose corners. Debris (plastic cup) left on bedside table. Towels and surfaces meet minimum standards.",
};

// ─── Room Images ───
const CLEAN_IMAGE =
  "https://images.unsplash.com/photo-1618773928121-c32242e63f39?q=80&w=800";
const MESSED_IMAGE =
  "https://images.unsplash.com/photo-1598928506311-c55ded91a20c?q=80&w=800";

type InspectorState = "idle" | "scanning" | "results";
type RoomCondition = "clean" | "messed";

interface AiInspectorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roomNumber?: string;
}

export function AiInspectorModal({
  open,
  onOpenChange,
  roomNumber = "203",
}: AiInspectorModalProps) {
  const { completeRoomWithAiScore, addNotification, rooms } = useRoomFlow();

  const [condition, setCondition] = useState<RoomCondition>("clean");
  const [phase, setPhase] = useState<InspectorState>("idle");
  const [tickerIndex, setTickerIndex] = useState(0);
  const [scanProgress, setScanProgress] = useState(0);

  // Find room data
  const targetRoom = rooms.find((r) => r.number === roomNumber);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (open) {
      setPhase("idle");
      setTickerIndex(0);
      setScanProgress(0);
    }
  }, [open]);

  // Scanning ticker animation
  useEffect(() => {
    if (phase !== "scanning") return;

    const tickerTimer = setInterval(() => {
      setTickerIndex((prev) => {
        if (prev >= SCAN_MESSAGES.length - 1) return prev;
        return prev + 1;
      });
    }, 250);

    const progressTimer = setInterval(() => {
      setScanProgress((prev) => {
        if (prev >= 100) return 100;
        return prev + 2;
      });
    }, 30);

    const completeTimer = setTimeout(() => {
      setPhase("results");
    }, 1500);

    return () => {
      clearInterval(tickerTimer);
      clearInterval(progressTimer);
      clearTimeout(completeTimer);
    };
  }, [phase]);

  const result = condition === "clean" ? CLEAN_RESULT : MESSED_RESULT;
  const roomImage = condition === "clean" ? CLEAN_IMAGE : MESSED_IMAGE;

  const handleRunScan = () => {
    setPhase("scanning");
    setTickerIndex(0);
    setScanProgress(0);
  };

  const handleReset = () => {
    setPhase("idle");
    setTickerIndex(0);
    setScanProgress(0);
  };

  const handleConfirmRelease = useCallback(() => {
    // Auto-release room to Ready for Guest
    completeRoomWithAiScore(
      roomNumber,
      CLEAN_RESULT.score,
      CLEAN_RESULT.notes,
      [], // No bboxes for clean pass
      CLEAN_IMAGE
    );

    toast.success(`Room ${roomNumber} auto-released to Ready for Guest!`, {
      description: `AI Staging Score: ${CLEAN_RESULT.score}% — all checkpoints verified.`,
    });

    // Auto-close after 1.5s
    setTimeout(() => {
      onOpenChange(false);
    }, 1500);
  }, [roomNumber, completeRoomWithAiScore, onOpenChange]);

  const handleRouteToSupervisor = useCallback(() => {
    // Transition to Inspection Pending with flagged issues
    completeRoomWithAiScore(
      roomNumber,
      MESSED_RESULT.score,
      MESSED_RESULT.notes,
      [
        { label: "Wrinkled Linens", x: 20, y: 30, width: 45, height: 35 },
        { label: "Debris on Table", x: 65, y: 15, width: 20, height: 25 },
      ],
      MESSED_IMAGE
    );

    addNotification({
      title: `🔍 Room ${roomNumber} failed AI staging audit`,
      message: `Score: ${MESSED_RESULT.score}% — ${MESSED_RESULT.issues.join("; ")}. Routed to Supervisor Review Queue.`,
      type: "warning",
      targetRoom: roomNumber,
    });

    toast.warning(`Room ${roomNumber} flagged and routed to Supervisor Review Queue.`, {
      description: "Issues attached with thumbnail for supervisor inspection.",
    });

    onOpenChange(false);
  }, [roomNumber, completeRoomWithAiScore, addNotification, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[480px] p-0 rounded-2xl border overflow-hidden bg-white"
        style={{
          borderColor: BORDER,
          boxShadow:
            "0 8px 40px -8px rgba(181,101,47,0.15), 0 16px 60px -12px rgba(0,0,0,0.08)",
        }}
      >
        {/* ─── Inline Animations ─── */}
        <style>{`
          @keyframes ai-laser-sweep {
            0%   { top: 0%;   opacity: 0; }
            5%   { opacity: 1; }
            95%  { opacity: 1; }
            100% { top: 100%; opacity: 0; }
          }
          .ai-laser-bar {
            animation: ai-laser-sweep 1.5s ease-in-out infinite;
          }
          @keyframes ai-pulse-ring {
            0%   { transform: scale(1);   opacity: 0.6; }
            50%  { transform: scale(1.08); opacity: 1; }
            100% { transform: scale(1);   opacity: 0.6; }
          }
          .ai-pulse-ring {
            animation: ai-pulse-ring 1.2s ease-in-out infinite;
          }
          @keyframes ai-score-pop {
            0%   { transform: scale(0.6); opacity: 0; }
            60%  { transform: scale(1.1); }
            100% { transform: scale(1);   opacity: 1; }
          }
          .ai-score-pop {
            animation: ai-score-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
          }
          @keyframes ai-checklist-slide {
            0%   { transform: translateY(8px); opacity: 0; }
            100% { transform: translateY(0);   opacity: 1; }
          }
          .ai-checklist-slide {
            animation: ai-checklist-slide 0.4s ease-out forwards;
          }
          @keyframes shimmer {
            0%   { background-position: -200% 0; }
            100% { background-position: 200% 0; }
          }
          .shimmer-bg {
            background: linear-gradient(90deg, transparent 30%, rgba(255,255,255,0.3) 50%, transparent 70%);
            background-size: 200% 100%;
            animation: shimmer 1.5s infinite;
          }
        `}</style>

        {/* ─── Header ─── */}
        <div
          className="px-5 pt-5 pb-4 border-b"
          style={{ borderColor: BORDER }}
        >
            <DialogTitle className="text-base font-extrabold tracking-tight" style={{ color: TEXT_PRIMARY }}>
              Room {roomNumber} Staging Audit
            </DialogTitle>
            <DialogDescription className="text-[11px] mt-0.5" style={{ color: TEXT_MUTED }}>
              Simulate & verify AI Computer Vision inspection standard
            </DialogDescription>
        </div>

        {/* ─── Body ─── */}
        <div className="px-5 py-4 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* State Selector Pills */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setCondition("clean"); handleReset(); }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-[11px] font-extrabold uppercase tracking-wider border-2 transition-all cursor-pointer ${
                condition === "clean"
                  ? "border-[#8A9A6B] bg-[#8A9A6B]/10 text-[#8A9A6B] shadow-sm"
                  : "border-[#EBE3D1] bg-white text-[#736B5E] hover:border-[#8A9A6B]/50"
              }`}
            >
              <span className="text-sm">✨</span>
              Clean & Staged
            </button>
            <button
              onClick={() => { setCondition("messed"); handleReset(); }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-[11px] font-extrabold uppercase tracking-wider border-2 transition-all cursor-pointer ${
                condition === "messed"
                  ? "border-[#B14A3E] bg-[#B14A3E]/10 text-[#B14A3E] shadow-sm"
                  : "border-[#EBE3D1] bg-white text-[#736B5E] hover:border-[#B14A3E]/50"
              }`}
            >
              <span className="text-sm">⚠</span>
              Needs Attention
            </button>
          </div>

          {/* ─── Photo Viewfinder ─── */}
          <div
            className="relative aspect-video w-full rounded-2xl overflow-hidden border"
            style={{ borderColor: phase === "scanning" ? COPPER : BORDER }}
          >
            <img
              src={roomImage}
              alt={condition === "clean" ? "Clean staged hotel room" : "Messed hotel room with defects"}
              className="w-full h-full object-cover"
            />

            {/* Corner Brackets */}
            <div className="absolute top-3 left-3 size-5 border-t-2 border-l-2 border-white/70 rounded-tl-sm" />
            <div className="absolute top-3 right-3 size-5 border-t-2 border-r-2 border-white/70 rounded-tr-sm" />
            <div className="absolute bottom-3 left-3 size-5 border-b-2 border-l-2 border-white/70 rounded-bl-sm" />
            <div className="absolute bottom-3 right-3 size-5 border-b-2 border-r-2 border-white/70 rounded-br-sm" />

            {/* Scanning Laser Bar */}
            {phase === "scanning" && (
              <>
                <div
                  className="ai-laser-bar absolute left-0 w-full h-0.5 pointer-events-none z-10"
                  style={{
                    background: `linear-gradient(90deg, transparent, ${COPPER}, transparent)`,
                    boxShadow: `0 0 12px 3px ${COPPER}, 0 0 30px 6px ${COPPER}40`,
                  }}
                />
                {/* Overlay shimmer */}
                <div className="shimmer-bg absolute inset-0 pointer-events-none" style={{ zIndex: 5 }} />
                {/* Scanning text overlay */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3 z-10">
                  <div className="flex items-center gap-2">
                    <Sparkles className="size-3.5 text-amber-400 animate-pulse" />
                    <span className="text-[11px] font-bold text-white/90 truncate">
                      {SCAN_MESSAGES[tickerIndex]}
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div className="mt-1.5 h-1 bg-white/20 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-75"
                      style={{
                        width: `${scanProgress}%`,
                        background: `linear-gradient(90deg, ${COPPER}, ${SAGE})`,
                      }}
                    />
                  </div>
                </div>
              </>
            )}

            {/* Idle state overlay badge */}
            {phase === "idle" && (
              <div className="absolute top-3 right-3 z-10">
                <Badge
                  className="text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 border-0"
                  style={{
                    background: condition === "clean" ? `${SAGE}dd` : `${TERRACOTTA}dd`,
                    color: "white",
                  }}
                >
                  {condition === "clean" ? "✨ Clean Preview" : "⚠ Defect Preview"}
                </Badge>
              </div>
            )}
          </div>

          {/* ─── Run Scan Button (idle phase) ─── */}
          {phase === "idle" && (
            <Button
              onClick={handleRunScan}
              className="w-full h-11 font-extrabold text-xs uppercase tracking-widest rounded-xl gap-2 shadow-md cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.98]"
              style={{ background: `linear-gradient(135deg, ${COPPER}, #9C5424)`, color: "white" }}
            >
              <Zap className="size-4" />
              Run AI Staging Scan
            </Button>
          )}

          {/* ─── Scanning Phase ─── */}
          {phase === "scanning" && (
            <div
              className="ai-pulse-ring flex items-center justify-center gap-2.5 p-3 rounded-xl border text-[11px] font-bold"
              style={{
                borderColor: `${COPPER}40`,
                background: `${COPPER}10`,
                color: COPPER,
              }}
            >
              <Sparkles className="size-4 animate-spin" />
              <span>Gemini Vision AI analyzing room staging…</span>
            </div>
          )}

          {/* ─── Results Phase ─── */}
          {phase === "results" && (
            <div className="space-y-3 ai-score-pop">
              {/* Score Header */}
              <div
                className="flex items-center justify-between p-3.5 rounded-xl border"
                style={{
                  borderColor: result.passed ? `${SAGE}50` : `${TERRACOTTA}50`,
                  background: result.passed ? `${SAGE}10` : `${TERRACOTTA}10`,
                }}
              >
                <div className="flex items-center gap-2">
                  {result.passed ? (
                    <CheckCircle2 className="size-5" style={{ color: SAGE }} />
                  ) : (
                    <AlertTriangle className="size-5" style={{ color: TERRACOTTA }} />
                  )}
                  <span className="font-extrabold text-sm" style={{ color: TEXT_PRIMARY }}>
                    AI Score:{" "}
                    <span className="font-mono text-base font-black">
                      {result.score}%
                    </span>
                  </span>
                </div>
                <Badge
                  className="text-[9px] font-extrabold uppercase tracking-wider px-2.5 py-1 border-0"
                  style={{
                    background: result.passed ? SAGE : TERRACOTTA,
                    color: "white",
                  }}
                >
                  {result.badgeLabel}
                </Badge>
              </div>

              {/* Checklist Breakdown */}
              <div
                className="grid grid-cols-1 gap-1.5 p-3 rounded-xl border"
                style={{ borderColor: BORDER, background: "#FDFCF9" }}
              >
                <span
                  className="text-[9px] font-extrabold uppercase tracking-widest mb-1"
                  style={{ color: TEXT_MUTED }}
                >
                  Staging Checklist Breakdown
                </span>
                {result.checklist.map((item, idx) => (
                  <div
                    key={item.label}
                    className="ai-checklist-slide flex items-center justify-between py-1.5 px-2 rounded-lg text-[11px]"
                    style={{
                      animationDelay: `${idx * 100}ms`,
                      opacity: 0,
                      background: item.pass ? `${SAGE}08` : `${TERRACOTTA}08`,
                    }}
                  >
                    <span className="flex items-center gap-1.5 font-semibold" style={{ color: TEXT_PRIMARY }}>
                      {item.pass ? (
                        <Check className="size-3.5 stroke-[3px]" style={{ color: SAGE }} />
                      ) : (
                        <AlertCircle className="size-3.5" style={{ color: TERRACOTTA }} />
                      )}
                      {item.label}:
                      <span className="font-normal" style={{ color: TEXT_MUTED }}>
                        {item.detail}
                      </span>
                    </span>
                    <span
                      className="font-mono font-bold text-[10px]"
                      style={{ color: item.pass ? SAGE : TERRACOTTA }}
                    >
                      {item.score}%
                    </span>
                  </div>
                ))}
              </div>

              {/* Detected Issues (only for failed) */}
              {!result.passed && result.issues.length > 0 && (
                <div
                  className="p-3 rounded-xl border space-y-1.5"
                  style={{ borderColor: `${TERRACOTTA}30`, background: `${TERRACOTTA}08` }}
                >
                  <span
                    className="text-[9px] font-extrabold uppercase tracking-widest"
                    style={{ color: TERRACOTTA }}
                  >
                    Detected Issues
                  </span>
                  {result.issues.map((issue) => (
                    <div
                      key={issue}
                      className="flex items-start gap-1.5 text-[11px]"
                      style={{ color: TEXT_PRIMARY }}
                    >
                      <span className="shrink-0 mt-0.5" style={{ color: TERRACOTTA }}>
                        •
                      </span>
                      <span>{issue}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* AI Notes */}
              <p
                className="text-[11px] leading-relaxed italic px-1"
                style={{ color: TEXT_MUTED }}
              >
                "{result.notes}"
              </p>

              {/* ─── Action Buttons ─── */}
              {result.passed ? (
                <Button
                  onClick={handleConfirmRelease}
                  className="w-full h-11 font-extrabold text-xs uppercase tracking-widest rounded-xl gap-2 shadow-md cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.98]"
                  style={{ background: SAGE, color: "white" }}
                >
                  <CheckCircle2 className="size-4" />
                  Confirm & Release
                </Button>
              ) : (
                <div className="flex gap-2.5">
                  <Button
                    onClick={handleReset}
                    variant="outline"
                    className="flex-1 h-11 font-bold text-xs rounded-xl gap-1.5 cursor-pointer"
                    style={{ borderColor: BORDER, color: TEXT_PRIMARY }}
                  >
                    <RotateCcw className="size-3.5" />
                    Fix & Re-scan
                  </Button>
                  <Button
                    onClick={handleRouteToSupervisor}
                    className="flex-1 h-11 font-extrabold text-xs uppercase tracking-wider rounded-xl gap-1.5 shadow-md cursor-pointer transition-all"
                    style={{ background: TERRACOTTA, color: "white" }}
                  >
                    <Send className="size-3.5" />
                    Route to Supervisor
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
