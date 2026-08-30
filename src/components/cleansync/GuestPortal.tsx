import { useState, useEffect, useMemo } from "react";
import { useRoomFlow } from "./store";
import { analyzeGuestNeedPhoto } from "@/services/geminiService";
import { NirvasaLogo } from "./NirvasaLogo";
import {
  Hotel,
  Wifi,
  Clock,
  Camera,
  Layers,
  Sparkles,
  Heart,
  Wrench,
  Luggage,
  Calendar,
  PhoneCall,
  User,
  Coffee,
  CheckCircle,
  Copy,
  Plus,
  Send,
  Loader2,
  Trash2,
  Smile,
  ShieldCheck,
  CheckCircle2,
  Utensils,
  Sun,
  Moon,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { type GuestRequest, type RequestCategory, type Department, type RequestPriority } from "@/lib/cleansync-data";

// ----------------------------------------------------------------------
// Mock Simulated AI Photos
// ----------------------------------------------------------------------
interface MockSnapItem {
  name: string;
  url: string;
  category: RequestCategory;
  item: string;
  severity: RequestPriority;
  dept: Department;
  details: string;
}

const MOCK_SNAP_OPTIONS: MockSnapItem[] = [
  {
    name: "Broken AC Controller",
    url: "https://images.unsplash.com/photo-1585338107529-13afc5f02586?q=80&w=800",
    category: "Maintenance",
    item: "AC Temperature Issue",
    severity: "High",
    dept: "Maintenance",
    details: "AC thermostat buttons are broken and unresponsive. Room is getting warm.",
  },
  {
    name: "Water Spill on Carpet",
    url: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?q=80&w=800",
    category: "Amenities",
    item: "Room Clean Service Request",
    severity: "Medium",
    dept: "Housekeeping",
    details: "Accidental beverage spill near the nightstand. Needs localized cleaning.",
  },
  {
    name: "Dirty Bed sheets",
    url: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?q=80&w=800",
    category: "Amenities",
    item: "Extra Pillows & Blanket",
    severity: "Medium",
    dept: "Housekeeping",
    details: "Requesting fresh sheet replacement for guest bed.",
  },
];

export function GuestConciergePortal() {
  const { guestRequests, addGuestRequest, rooms } = useRoomFlow();
  
  // Simulated Room context for the guest, default room 203
  const [guestRoom, setGuestRoom] = useState("203");
  
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const roomParam = searchParams.get("room");
    if (roomParam) {
      setGuestRoom(roomParam);
    }
  }, []);

  // Fetch Room information to display Guest Name dynamically
  const activeRoomData = useMemo(() => {
    return rooms.find((r) => r.number === guestRoom);
  }, [rooms, guestRoom]);

  const guestSalutation = useMemo(() => {
    return activeRoomData?.guestName && activeRoomData.guestName !== "—"
      ? `, ${activeRoomData.guestName}`
      : ", Mr. Sharma";
  }, [activeRoomData]);

  // Catalog Item Selection state
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<{ category: RequestCategory; item: string; defaultDept: Department } | null>(null);
  const [notes, setNotes] = useState("");

  // AI visual request box simulation states
  const [snapOpen, setSnapOpen] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState<MockSnapItem | null>(null);

  // Tracker simulation progress steps state
  const [trackerRequest, setTrackerRequest] = useState<{ item: string; step: number; staffName: string } | null>(null);
  
  // Track manually dismissed request IDs to prevent them from showing up again on re-render
  const [dismissedRequestIds, setDismissedRequestIds] = useState<string[]>([]);
  
  // Custom user typed request text
  const [customRequestText, setCustomRequestText] = useState("");

  // Guest rating state
  const [guestRating, setGuestRating] = useState<number | null>(null);

  // Helper function to dismiss tracker and add it to dismissed IDs
  const handleDismissTracker = () => {
    const myRequests = guestRequests.filter((r) => r.roomNumber === guestRoom);
    if (myRequests.length > 0) {
      const latest = myRequests[myRequests.length - 1];
      if (latest) {
        setDismissedRequestIds((prev) => [...prev, latest.id]);
      }
    }
    setTrackerRequest(null);
  };

  // Monitor guest requests for active room directly from global store
  const activeRoomRequest = useMemo(() => {
    const roomRequests = guestRequests.filter(
      (r) => r.roomNumber === guestRoom && !dismissedRequestIds.includes(r.id)
    );
    if (!roomRequests.length) return null;
    const activeOne = roomRequests.find((r) => r.status !== "Completed");
    return activeOne || roomRequests[0];
  }, [guestRequests, guestRoom, dismissedRequestIds]);

  // Compute live step stage index (0: Received, 1: Assigned, 2: On the Way, 3: Delivered)
  const activeStep = useMemo(() => {
    if (!activeRoomRequest) return 0;
    if (activeRoomRequest.status === "Completed" || activeRoomRequest.stage === "delivered") return 3;
    if (activeRoomRequest.stage === "on_the_way") return 2;
    if (activeRoomRequest.assignedStaff || activeRoomRequest.stage === "assigned") return 1;
    return 0;
  }, [activeRoomRequest]);

  // Tracker UI messaging updates
  const trackerStatusMessage = useMemo(() => {
    if (!activeRoomRequest) return "";
    const staffName = activeRoomRequest.assignedStaff || "Runner";
    if (activeStep === 0) return "Front Desk has received your request and is routing it to nearest runner.";
    if (activeStep === 1) return `Request assigned to ${staffName}. Preparing items for delivery.`;
    if (activeStep === 2) return `Runner ${staffName} is heading to Suite ${guestRoom} (ETA: ~2 mins).`;
    return `Delivered by ${staffName}! Thank you for staying with RoomFlow.`;
  }, [activeRoomRequest, activeStep, guestRoom]);

  // Live Toast notifications when activeStep advances across tabs
  useEffect(() => {
    if (!activeRoomRequest) return;
    const staffName = activeRoomRequest.assignedStaff || "Runner";
    if (activeStep === 1) {
      toast.info(`Runner assigned: ${staffName} is preparing your request!`);
    } else if (activeStep === 2) {
      toast.info(`Runner ${staffName} is on the way to Suite ${guestRoom}! (ETA: ~2 mins)`);
    } else if (activeStep === 3) {
      toast.success(`🎉 Your request "${activeRoomRequest.item}" has been delivered!`);
    }
  }, [activeStep, activeRoomRequest?.id]);

  // 1-Tap quick service catalog config
  const quickCatalog = [
    {
      category: "Amenities" as RequestCategory,
      title: "Fresh Bath Towels",
      subtitle: "Set of 3 cotton towels",
      icon: Heart,
      dept: "Housekeeping" as Department,
    },
    {
      category: "Amenities" as RequestCategory,
      title: "Dental Kit & Toiletries",
      subtitle: "Dental kit, shampoo, body gel",
      icon: Smile,
      dept: "Housekeeping" as Department,
    },
    {
      category: "Amenities" as RequestCategory,
      title: "Extra Pillows & Blanket",
      subtitle: "Hypoallergenic pillows",
      icon: Layers,
      dept: "Housekeeping" as Department,
    },
    {
      category: "Amenities" as RequestCategory,
      title: "Room Refresh Turn",
      subtitle: "Complete room cleaning turn",
      icon: Sparkles,
      dept: "Housekeeping" as Department,
    },
    {
      category: "Maintenance" as RequestCategory,
      title: "AC Temperature Check",
      subtitle: "Air conditioner heating / cooling",
      icon: Wrench,
      dept: "Maintenance" as Department,
    },
    {
      category: "Maintenance" as RequestCategory,
      title: "TV & Wi-Fi Repair",
      subtitle: "Remote control or network check",
      icon: Wifi,
      dept: "Maintenance" as Department,
    },
    {
      category: "Late Checkout" as RequestCategory,
      title: "Late Check-out request",
      subtitle: "1-tap extensions request",
      icon: Calendar,
      dept: "Front Desk" as Department,
    },
    {
      category: "Luggage" as RequestCategory,
      title: "Baggage Pickup",
      subtitle: "Check-out porter assist",
      icon: Luggage,
      dept: "Front Desk" as Department,
    },
  ];

  const handleCopyWifi = () => {
    navigator.clipboard.writeText("RoomFlow_Luxury_Wifi");
    toast.success("Wi-Fi password copied to clipboard!");
  };

  const handleCatalogSelect = (item: { category: RequestCategory; title: string; dept: Department }) => {
    setSelectedItem({
      category: item.category,
      item: item.title,
      defaultDept: item.dept,
    });
    setCatalogOpen(true);
  };

  const handleCatalogSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;

    addGuestRequest(
      guestRoom,
      selectedItem.category,
      selectedItem.item,
      notes || "Standard request via Guest Portal.",
      "Medium",
      selectedItem.defaultDept
    );

    toast.success(`🎉 Ordered: "${selectedItem.item}" successfully dispatched!`);
    
    // Initialize the live tracker instantly for presentation satisfaction
    setTrackerRequest({
      item: selectedItem.item,
      step: 0, // Received
      staffName: "Priya Raman",
    });

    setNotes("");
    setSelectedItem(null);
    setCatalogOpen(false);
  };

  // Simulate Snap Photo AI analysis workflow
  const handleSnapOption = async (option: MockSnapItem) => {
    setAnalyzing(true);
    setAiResult(null);

    try {
      const triage = await analyzeGuestNeedPhoto(option.url, option.name);
      let targetDept: Department = "Housekeeping";
      if (triage.category === "Maintenance") targetDept = "Maintenance";
      else if (triage.category === "Food Service") targetDept = "Room Service";
      else if (triage.category === "Luggage" || triage.category === "Late Checkout" || triage.category === "Inquiry") targetDept = "Front Desk";

      setAiResult({
        name: option.name,
        category: triage.category,
        item: triage.item,
        details: triage.details,
        severity: triage.urgency,
        dept: targetDept,
        url: option.url,
      });
    } catch {
      setAiResult(option);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleAiConfirmSubmit = () => {
    if (!aiResult) return;

    addGuestRequest(
      guestRoom,
      aiResult.category,
      aiResult.item,
      aiResult.details,
      aiResult.severity,
      aiResult.dept
    );

    toast.success(`Gemini AI Dispatched: Classified "${aiResult.item}" routed to ${aiResult.dept} Department!`);
    // Reset snap drawer and states
    setTrackerRequest({
      item: aiResult.item,
      step: 0,
      staffName: aiResult.dept === "Maintenance" ? "Marco Silva" : "Priya Raman",
    });

    setAiResult(null);
    setSnapOpen(false);
  };

  const handleCustomSubmit = () => {
    const text = customRequestText.trim();
    if (!text) return;

    // Smart classification logic
    const lower = text.toLowerCase();
    let category: RequestCategory = "Amenities";
    let dept: Department = "Housekeeping";

    if (
      lower.includes("leak") ||
      lower.includes("ac") ||
      lower.includes("light") ||
      lower.includes("plumbing") ||
      lower.includes("repair") ||
      lower.includes("broken") ||
      lower.includes("clog") ||
      lower.includes("toilet") ||
      lower.includes("shower") ||
      lower.includes("wifi") ||
      lower.includes("internet") ||
      lower.includes("tv")
    ) {
      category = "Maintenance";
      dept = "Maintenance";
    } else if (
      lower.includes("baggage") ||
      lower.includes("luggage") ||
      lower.includes("checkout") ||
      lower.includes("key") ||
      lower.includes("bellboy") ||
      lower.includes("taxi") ||
      lower.includes("wake")
    ) {
      category = "Luggage";
      dept = "Front Desk";
    } else if (
      lower.includes("food") ||
      lower.includes("drink") ||
      lower.includes("dinner") ||
      lower.includes("lunch") ||
      lower.includes("breakfast") ||
      lower.includes("ice") ||
      lower.includes("water") ||
      lower.includes("coke") ||
      lower.includes("tea") ||
      lower.includes("coffee")
    ) {
      category = "Food Service";
      dept = "Room Service";
    }

    addGuestRequest(guestRoom, category, text, "Custom typed guest request.", "Medium", dept);
    toast.success(`🎉 Request "${text}" sent to ${dept}!`);

    // Reset typing bar and show tracker
    setTrackerRequest({
      item: text,
      step: 0,
      staffName: dept === "Maintenance" ? "Marco Silva" : "Priya Raman",
    });
    setCustomRequestText("");
  };

  const handleFrontDeskCall = () => {
    addGuestRequest(
      guestRoom,
      "Inquiry" as any,
      "Front Desk Callback",
      "Guest requested a direct phone call from Front Desk immediately.",
      "High",
      "Front Desk"
    );
    toast.success("🛎 Front Desk Call Requested. Agent will dial your room shortly!");
  };

  const handleLuggageStorage = () => {
    addGuestRequest(
      guestRoom,
      "Luggage" as any,
      "Luggage Storage Request",
      "Guest requested luggage holding assistance at checkout.",
      "Low",
      "Front Desk"
    );
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-6 pb-24 font-sans select-none">
      
      {/* 1. Guest Welcome Header */}
      <Card className="bg-white border-[#EBE3D1] p-5 rounded-3xl shadow-sm text-left relative overflow-hidden">
        <div className="flex items-center justify-between mb-3">
          <Badge className="bg-[#B5652F]/10 hover:bg-[#B5652F]/15 border border-[#B5652F]/20 text-[#B5652F] font-extrabold text-[9px] uppercase tracking-wider px-2.5 py-0.5 rounded-md">
            NIRVASA Guest Concierge
          </Badge>
          <NirvasaLogo size="sm" showText={false} />
        </div>
        
        <h2 className="text-xl font-black text-[#2A2620] tracking-tight">
          Welcome to Suite {guestRoom}{guestSalutation}
        </h2>
        <p className="text-xs text-[#736B5E] mt-1 font-medium">
          NIRVASA is committed to making your stay as luxurious and seamless as possible.
        </p>

        {/* Room Info Pills */}
        <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-[#F5F1E8]">
          <div className="p-2.5 bg-[#F5F1E8] border border-[#EBE3D1] rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wifi className="size-4 text-[#B5652F]" />
              <div className="text-left">
                <span className="text-[8px] uppercase tracking-wider text-[#736B5E] font-bold block leading-none">WiFi Password</span>
                <span className="text-xs font-extrabold text-[#2A2620] leading-none">Nirvasa_Guest_WiFi</span>
              </div>
            </div>
            <button 
              type="button" 
              onClick={handleCopyWifi}
              className="p-1 hover:bg-white rounded-lg transition-colors cursor-pointer text-[#736B5E]"
            >
              <Copy className="size-3.5" />
            </button>
          </div>

          <div className="p-2.5 bg-[#F5F1E8] border border-[#EBE3D1] rounded-2xl flex items-center gap-2">
            <Clock className="size-4 text-[#B5652F]" />
            <div className="text-left">
              <span className="text-[8px] uppercase tracking-wider text-[#736B5E] font-bold block leading-none">Breakfast Hours</span>
              <span className="text-xs font-extrabold text-[#2A2620]">07:00 - 10:30 AM</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Typing Request Bar */}
      <Card className="bg-white border-[#EBE3D1] p-2.5 rounded-3xl shadow-sm flex items-center gap-2 select-none">
        <Input
          placeholder="Type what you need (e.g. extra soap, fresh sheets)..."
          className="flex-1 border-0 focus-visible:ring-0 shadow-none text-xs text-[#2A2620] placeholder-[#736B5E] h-10 px-2 bg-transparent focus:outline-none"
          value={customRequestText}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCustomRequestText(e.target.value)}
          onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key === "Enter") {
              handleCustomSubmit();
            }
          }}
        />
        <Button
          size="icon"
          onClick={handleCustomSubmit}
          disabled={!customRequestText.trim()}
          className="size-10 bg-[#B5652F] hover:bg-[#B5652F]/90 text-white rounded-2xl shrink-0 cursor-pointer disabled:opacity-50 flex items-center justify-center"
        >
          <Send className="size-4" />
        </Button>
      </Card>

      <Card 
        onClick={() => setSnapOpen(true)}
        className="bg-white border-[#EBE3D1] p-5 rounded-3xl shadow-sm text-center border-dashed border-2 hover:border-[#B5652F] cursor-pointer transition-all duration-300 relative overflow-hidden group select-none"
      >
        <div className="mx-auto size-12 bg-[#B5652F]/10 rounded-full flex items-center justify-center mb-3 group-hover:scale-105 transition-transform duration-300">
          <Camera className="size-6 text-[#B5652F]" />
        </div>
        <h3 className="font-extrabold text-sm text-[#2A2620] uppercase tracking-wider flex items-center justify-center gap-1.5">
          <Sparkles className="size-4.5 text-[#B5652F] animate-pulse" />
          <span>Snap Photo or Upload Issue</span>
        </h3>
        <p className="text-xs text-[#736B5E] mt-1.5 leading-relaxed font-sans max-w-xs mx-auto">
          Snap a photo of any room issue (e.g. leaking AC, faulty TV, spill). Gemini AI will auto-classify, set urgency, and dispatch.
        </p>
      </Card>

      {/* 3. 1-Tap Quick Service Catalog */}
      <div className="space-y-3.5">
        <h3 className="font-extrabold text-xs uppercase tracking-wider text-[#736B5E] text-left">
          1-Tap Quick Service Catalog
        </h3>

        <div className="grid grid-cols-2 gap-3">
          {quickCatalog.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.title}
                type="button"
                onClick={() => handleCatalogSelect(item)}
                className="bg-white border border-[#EBE3D1] p-4 rounded-3xl hover:border-[#B5652F] hover:shadow-sm text-left transition-all duration-300 cursor-pointer active:scale-95 flex flex-col justify-between min-h-[110px]"
              >
                <div className="size-8 bg-[#F5F1E8] rounded-xl flex items-center justify-center text-[#B5652F] mb-3">
                  <Icon className="size-4 shrink-0" />
                </div>
                <div>
                  <h4 className="font-black text-xs text-[#2A2620] leading-tight">{item.title}</h4>
                  <p className="text-[10px] text-[#736B5E] mt-0.5 font-medium leading-tight">{item.subtitle}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 5. Quick Service Actions */}
      <div className="grid grid-cols-2 gap-3 pt-2">
        <Button
          onClick={handleFrontDeskCall}
          className="h-12 bg-[#B5652F] hover:bg-[#B5652F]/90 text-white font-extrabold text-xs rounded-2xl cursor-pointer shadow-sm flex items-center justify-center gap-1.5"
        >
          <PhoneCall className="size-4" />
          <span>Request Callback</span>
        </Button>
        <Button
          onClick={handleLuggageStorage}
          variant="outline"
          className="h-12 border-[#EBE3D1] hover:bg-[#F5F1E8] text-[#2A2620] font-extrabold text-xs rounded-2xl cursor-pointer flex items-center justify-center gap-1.5"
        >
          <Luggage className="size-4 text-[#B5652F]" />
          <span>Luggage holding</span>
        </Button>
      </div>

      {/* 4. Live "Uber-Style" Request Tracker (Bottom Floating Card) */}
      {activeRoomRequest && (
        <div className="fixed bottom-4 left-4 right-4 z-40 max-w-sm mx-auto select-none">
          <Card className="bg-white border border-[#EBE3D1] p-4.5 rounded-3xl shadow-xl space-y-3.5 border-t-4 border-t-[#B5652F] tracker-floating-card">
            {/* Header info */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="size-8 bg-[#8A9A6B]/15 rounded-xl flex items-center justify-center text-[#8A9A6B]">
                  <CheckCircle2 className="size-4.5" />
                </div>
                <div className="text-left">
                  <span className="text-[8px] uppercase tracking-wider text-[#736B5E] font-bold block leading-none">Active Order • Suite {guestRoom}</span>
                  <span className="text-xs font-black text-[#2A2620]">{activeRoomRequest.item}</span>
                </div>
              </div>
              
              <div className="flex items-center gap-1.5">
                <Badge className="bg-[#8A9A6B]/15 text-[#8A9A6B] font-extrabold text-[9px] uppercase tracking-wider py-0.5 rounded-md">
                  {activeStep === 3 ? "Delivered ✔" : activeStep === 2 ? "On the Way ⏱" : activeStep === 1 ? "Assigned ✔" : "Received ✔"}
                </Badge>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDismissedRequestIds((prev) => [...prev, activeRoomRequest.id]);
                  }}
                  className="p-1 hover:bg-[#F5F1E8] rounded-full text-[#736B5E] hover:text-[#2A2620] transition-colors cursor-pointer"
                  title="Dismiss Tracker"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>

            {/* Tracker Step Progress bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[8px] uppercase tracking-wider text-[#736B5E] font-bold">
                <span className={activeStep >= 0 ? "text-[#8A9A6B] font-black" : ""}>1. Received</span>
                <span className={activeStep >= 1 ? "text-[#8A9A6B] font-black" : ""}>2. Assigned</span>
                <span className={activeStep >= 2 ? "text-[#8A9A6B] font-black" : ""}>3. On The Way</span>
                <span className={activeStep >= 3 ? "text-[#8A9A6B] font-black" : ""}>4. Delivered</span>
              </div>

              {/* Ticking indicator bar */}
              <div className="grid grid-cols-4 gap-1.5 h-1.5 bg-[#F5F1E8] rounded-full overflow-hidden border border-[#EBE3D1]/40">
                <div className={`h-full rounded-full transition-all duration-500 ${activeStep >= 0 ? "bg-[#8A9A6B]" : "bg-transparent"}`} />
                <div className={`h-full rounded-full transition-all duration-500 ${activeStep >= 1 ? "bg-[#8A9A6B]" : "bg-transparent"}`} />
                <div className={`h-full rounded-full transition-all duration-500 ${activeStep >= 2 ? "bg-[#8A9A6B]" : "bg-transparent"}`} />
                <div className={`h-full rounded-full transition-all duration-500 ${activeStep >= 3 ? "bg-[#8A9A6B]" : "bg-transparent"}`} />
              </div>
            </div>

            {/* Live details text */}
            <p className="text-[11px] text-[#736B5E] italic text-left font-medium leading-relaxed bg-[#F5F1E8]/50 p-2 border border-[#EBE3D1] rounded-xl flex items-center gap-1.5">
              {activeStep < 3 && <Loader2 className="size-3 text-[#B5652F] animate-spin shrink-0" />}
              <span>{trackerStatusMessage}</span>
            </p>

            {/* 5-Star Delivery Rating Pill on completion */}
            {activeStep === 3 && (
              <div className="pt-2 border-t border-[#EBE3D1] space-y-1.5 animate-in fade-in duration-300">
                <span className="text-[10px] font-bold text-[#736B5E] block text-center uppercase tracking-wider">
                  Rate your service experience:
                </span>
                <div className="flex items-center justify-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => {
                        setGuestRating(star);
                        toast.success(`⭐ Thank you! Rated ${star} stars. Staff QA score updated.`);
                        setTimeout(() => {
                          setDismissedRequestIds((prev) => [...prev, activeRoomRequest.id]);
                          setGuestRating(null);
                        }, 2500);
                      }}
                      className="text-lg hover:scale-125 transition-transform cursor-pointer"
                      title={`${star} Star Rating`}
                    >
                      {guestRating && guestRating >= star ? "⭐" : "☆"}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Drawer catalog request detail logger */}
      <Drawer open={catalogOpen} onOpenChange={setCatalogOpen}>
        <DrawerContent className="bg-white border-t border-[#EBE3D1] pb-6 select-none">
          {selectedItem && (
            <div className="mx-auto w-full max-w-sm">
              <DrawerHeader>
                <DrawerTitle className="text-[#2A2620] font-black text-sm uppercase tracking-wider">Confirm Request Details</DrawerTitle>
                <DrawerDescription className="text-[11px] text-[#736B5E] font-medium">
                  Dispatching request for <strong>"{selectedItem.item}"</strong> from Suite {guestRoom}.
                </DrawerDescription>
              </DrawerHeader>

              <form onSubmit={handleCatalogSubmit} className="space-y-4 p-4">
                <div className="space-y-1.5">
                  <Label htmlFor="guest-catalog-notes" className="text-xs font-bold text-[#2A2620]">Add custom notes / quantities (optional)</Label>
                  <Textarea
                    id="guest-catalog-notes"
                    placeholder="e.g. Please send 3 sets of towels, extra shampoo..."
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="border-[#EBE3D1] text-xs text-[#2A2620] placeholder-[#736B5E]"
                  />
                </div>

                <DrawerFooter className="px-0 pt-2 flex flex-col gap-2">
                  <Button
                    type="submit"
                    className="w-full bg-[#B5652F] hover:bg-[#B5652F]/90 text-white font-extrabold text-xs min-h-[44px] rounded-xl cursor-pointer"
                  >
                    Confirm & Dispatch Order
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCatalogOpen(false)}
                    className="w-full border-[#EBE3D1] text-[#736B5E] min-h-[44px] rounded-xl cursor-pointer hover:bg-[#F5F1E8]/50"
                  >
                    Cancel
                  </Button>
                </DrawerFooter>
              </form>
            </div>
          )}
        </DrawerContent>
      </Drawer>

      {/* Drawer: Snap Photo AI visual scanner */}
      <Drawer open={snapOpen} onOpenChange={setSnapOpen}>
        <DrawerContent className="bg-white border-t border-[#EBE3D1] pb-6 select-none">
          <div className="mx-auto w-full max-w-sm">
            <DrawerHeader>
              <DrawerTitle className="text-[#2A2620] font-black text-sm uppercase tracking-wider flex items-center gap-1.5 justify-center">
                <Sparkles className="size-4.5 text-[#B5652F]" />
                <span>Snap-a-Need AI Simulation</span>
              </DrawerTitle>
              <DrawerDescription className="text-[11px] text-[#736B5E] font-medium text-center">
                Select a simulated guest snap photo below to test Gemini's auto-routing operations classifier.
              </DrawerDescription>
            </DrawerHeader>

            <div className="p-4 space-y-4">
              
              {/* Photo Options grid & Custom Upload */}
              {!analyzing && !aiResult && (
                <div className="space-y-3">
                  {/* Real Camera / File Upload */}
                  <label className="border-2 border-dashed border-[#B5652F]/40 hover:border-[#B5652F] bg-[#B5652F]/5 p-3 rounded-2xl flex flex-col items-center justify-center gap-1 cursor-pointer transition-all active:scale-98">
                    <Camera className="size-5 text-[#B5652F]" />
                    <span className="text-[11px] font-bold text-[#B5652F]">Snap / Upload Photo of Room Issue</span>
                    <span className="text-[9px] text-[#736B5E]">Camera or Gallery</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setAnalyzing(true);
                        setAiResult(null);
                        try {
                          const triage = await analyzeGuestNeedPhoto(file);
                          let targetDept: Department = "Housekeeping";
                          if (triage.category === "Maintenance") targetDept = "Maintenance";
                          else if (triage.category === "Food Service") targetDept = "Room Service";
                          else if (triage.category === "Luggage" || triage.category === "Late Checkout" || triage.category === "Inquiry") targetDept = "Front Desk";

                          const reader = new FileReader();
                          reader.onload = () => {
                            setAiResult({
                              name: triage.item,
                              category: triage.category,
                              item: triage.item,
                              details: triage.details,
                              severity: triage.urgency,
                              dept: targetDept,
                              url: reader.result as string,
                            });
                          };
                          reader.readAsDataURL(file);
                        } catch {
                          handleSnapOption(MOCK_SNAP_OPTIONS[0]!);
                        } finally {
                          setAnalyzing(false);
                        }
                      }}
                    />
                  </label>

                  <div className="flex items-center gap-2 my-1">
                    <div className="flex-1 h-px bg-[#EBE3D1]" />
                    <span className="text-[9px] font-bold uppercase tracking-wider text-[#736B5E]">or select simulated defect</span>
                    <div className="flex-1 h-px bg-[#EBE3D1]" />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {MOCK_SNAP_OPTIONS.map((opt) => (
                      <button
                        key={opt.name}
                        type="button"
                        onClick={() => handleSnapOption(opt)}
                        className="group flex flex-col items-center gap-2 border border-[#EBE3D1] hover:border-[#B5652F] p-2 rounded-2xl bg-white transition-all text-center cursor-pointer"
                      >
                        <div className="aspect-square w-full rounded-xl overflow-hidden bg-[#F5F1E8] border border-[#EBE3D1]">
                          <img src={opt.url} alt={opt.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                        </div>
                        <span className="text-[10px] font-bold text-[#2A2620] leading-tight block truncate w-full">{opt.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Scanning visual overlay */}
              {analyzing && (
                <div className="flex flex-col items-center justify-center py-10 space-y-4 relative">
                  <div className="size-20 bg-[#B5652F]/10 rounded-full flex items-center justify-center relative overflow-hidden border border-[#B5652F]/20">
                    <Camera className="size-8 text-[#B5652F] animate-pulse" />
                    {/* Visual scanner bouncing laser */}
                    <div className="absolute left-0 right-0 h-0.5 bg-[#B5652F] shadow-[0_0_8px_#B5652F] animate-bounce" style={{ animationDuration: "1.2s" }} />
                  </div>
                  <div className="text-center">
                    <span className="font-extrabold text-xs text-[#2A2620] block">Gemini Visual AI Analyzing...</span>
                    <span className="text-[10px] text-[#736B5E] mt-1 block">Classifying ticket category, routing rules, and severity.</span>
                  </div>
                </div>
              )}

              {/* Classification result preview */}
              {aiResult && (
                <div className="space-y-4 animate-in fade-in duration-300">
                  <div className="aspect-video w-full rounded-2xl overflow-hidden border border-[#EBE3D1]">
                    <img src={aiResult.url} alt={aiResult.name} className="w-full h-full object-cover" />
                  </div>

                  <div className="p-3 bg-[#F5F1E8] border border-[#EBE3D1] rounded-2xl space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-xs text-[#2A2620] flex items-center gap-1">
                        <ShieldCheck className="size-4.5 text-[#8A9A6B]" />
                        <span>AI Classification Report</span>
                      </span>
                      <Badge className="bg-[#B14A3E]/15 text-[#B14A3E] border-0 text-[8px] font-black tracking-wider uppercase px-2 py-0.5 rounded">
                        {aiResult.severity} Severity
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] pt-1.5 border-t border-[#EBE3D1]">
                      <div>
                        <span className="text-[#736B5E] block font-semibold text-[9px] uppercase tracking-wider">Identified Issue</span>
                        <strong className="text-[#2A2620]">{aiResult.item}</strong>
                      </div>
                      <div>
                        <span className="text-[#736B5E] block font-semibold text-[9px] uppercase tracking-wider">Assigned Routing</span>
                        <strong className="text-[#B5652F]">{aiResult.dept} Dept</strong>
                      </div>
                    </div>

                    <div className="text-[11px] border-t border-[#EBE3D1] pt-1.5">
                      <span className="text-[#736B5E] block font-semibold text-[9px] uppercase tracking-wider">Extracted Details</span>
                      <p className="italic text-[#736B5E] leading-normal font-sans mt-0.5">"{aiResult.details}"</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setAiResult(null)}
                      className="border-[#EBE3D1] text-[#736B5E] text-xs h-10 rounded-xl"
                    >
                      Re-take Photo
                    </Button>
                    <Button
                      type="button"
                      onClick={handleAiConfirmSubmit}
                      className="bg-[#B5652F] hover:bg-[#B5652F]/90 text-white font-extrabold text-xs h-10 rounded-xl flex items-center justify-center gap-1 cursor-pointer"
                    >
                      Confirm & Dispatch
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <DrawerFooter className="px-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setAiResult(null);
                  setSnapOpen(false);
                }}
                className="w-full border-[#EBE3D1] text-[#736B5E] min-h-[40px] rounded-xl cursor-pointer hover:bg-[#F5F1E8]/50"
              >
                Close Camera
              </Button>
            </DrawerFooter>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
export { GuestConciergePortal as GuestPortal };
