// Refined UI Pass: Converted 85 hardcoded color references to semantic design tokens.
// Enhanced guest request cards, badge indicators, and light/dark theme contrast.

import { useState, useMemo, useEffect } from "react";
import { useRoomFlow } from "./store";
import {
  Bell,
  Heart,
  Luggage,
  Wrench,
  Clock,
  Sparkles,
  ClipboardList,
  CheckCircle,
  CornerDownRight,
  Send,
  Coffee,
  Calendar,
  Smartphone,
} from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { type GuestRequest, type RequestCategory, type Department } from "@/lib/cleansync-data";

export function GuestPortal() {
  const { guestRequests, addGuestRequest } = useRoomFlow();
  
  // Simulated Room context for the guest
  const [guestRoom, setGuestRoom] = useState("201");

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const roomParam = searchParams.get("room");
    if (roomParam) {
      setGuestRoom(roomParam);
    }
  }, []);

  // Catalog Selection Modal State
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<{ category: RequestCategory; item: string; defaultDept: Department } | null>(null);
  const [notes, setNotes] = useState("");

  const catalogItems = [
    {
      category: "Amenities" as RequestCategory,
      title: "Housekeeping & Amenities",
      icon: Heart,
      color: "text-primary bg-primary/10 border-primary/20",
      items: [
        { name: "Extra Fresh Towels", dept: "Housekeeping" as Department },
        { name: "Toiletries Kit (Shampoo/Soap)", dept: "Housekeeping" as Department },
        { name: "Extra Pillows & Blanket", dept: "Housekeeping" as Department },
        { name: "Complementary Bottled Water", dept: "Housekeeping" as Department },
        { name: "Room Clean Service Request", dept: "Housekeeping" as Department },
      ],
    },
    {
      category: "Maintenance" as RequestCategory,
      title: "Maintenance & Repairs",
      icon: Wrench,
      color: "text-destructive bg-destructive/10 border-destructive/20",
      items: [
        { name: "AC / HVAC Temperature Issue", dept: "Maintenance" as Department },
        { name: "Lightbulb Replacement", dept: "Maintenance" as Department },
        { name: "Bathroom Plumb / Clog Leak", dept: "Maintenance" as Department },
        { name: "TV / Wifi Connection Fault", dept: "Maintenance" as Department },
      ],
    },
    {
      category: "Luggage" as RequestCategory,
      title: "Luggage & Porter Assist",
      icon: Luggage,
      color: "text-primary bg-primary/10 border-primary/20",
      items: [
        { name: "Baggage Pickup (Check-out)", dept: "Front Desk" as Department },
        { name: "Baggage Delivery (Arrival)", dept: "Front Desk" as Department },
      ],
    },
    {
      category: "Late Checkout" as RequestCategory,
      title: "Front Desk & Extensions",
      icon: Calendar,
      color: "text-primary bg-primary/10 border-primary/20",
      items: [
        { name: "Late Check-out request", dept: "Front Desk" as Department },
        { name: "Front Desk Callback", dept: "Front Desk" as Department },
        { name: "Order Airport Taxi", dept: "Front Desk" as Department },
      ],
    },
    {
      category: "Food Service" as RequestCategory,
      title: "In-Room Food Service",
      icon: Coffee,
      color: "text-ready bg-ready/10 border-ready/20",
      items: [
        { name: "Fresh Ice Bucket Delivery", dept: "Room Service" as Department },
        { name: "Breakfast Order Request", dept: "Room Service" as Department },
        { name: "Drinks / Soda Refreshments", dept: "Room Service" as Department },
      ],
    },
  ];

  // Retrieve requests submitted by this room
  const myRequests = useMemo(() => {
    return guestRequests
      .filter((req) => req.roomNumber === guestRoom)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [guestRequests, guestRoom]);

  const handleItemSelect = (category: RequestCategory, item: string, defaultDept: Department) => {
    setSelectedItem({ category, item, defaultDept });
    setNotes("");
    setCatalogOpen(true);
  };

  const handleRequestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;

    addGuestRequest(
      guestRoom,
      selectedItem.category,
      selectedItem.item,
      notes,
      "Medium",
      selectedItem.defaultDept
    );

    toast.success("Request submitted successfully!", {
      description: "You can track its status in the real-time request tracker below.",
    });

    setCatalogOpen(false);
    setSelectedItem(null);
  };

  // State Machine Step Tracker
  const getStepStatus = (req: GuestRequest, step: number) => {
    if (req.status === "Completed") return "completed";
    if (step === 1) return "completed"; // Received is always true for active
    if (step === 2) return req.status !== "Open" ? "completed" : "pending";
    return "pending";
  };

  const renderTrackerSteps = (req: GuestRequest) => {
    const steps = [
      { num: 1, label: "Request Received", time: new Date(req.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) },
      { num: 2, label: "Staff Dispatched", time: req.assignedStaff ? "Active" : "Pending" },
      { num: 3, label: "Resolved Ready", time: req.status === "Completed" ? "Done" : "Pending" },
    ];

    return (
      <div className="relative flex items-center justify-between w-full mt-4 bg-muted/50 dark:bg-card p-3 rounded-lg border border-border/60">
        {steps.map((st, idx) => {
          const status = getStepStatus(req, st.num);
          return (
            <div key={st.num} className="flex-1 flex flex-col items-center relative text-center">
              <div className={`size-7 rounded-full flex items-center justify-center border-2 text-xs font-bold font-mono transition-all z-10 ${
                status === "completed" 
                  ? "bg-ready border-ready text-black" 
                  : "bg-card border-border text-muted-foreground"
              }`}>
                {st.num}
              </div>
              <span className="text-[10px] font-bold text-foreground/90 mt-1.5 leading-none">{st.label}</span>
              <span className="text-[8px] text-muted-foreground mt-0.5 font-mono">{st.time}</span>
              {idx < steps.length - 1 && (
                <div className={`absolute top-3.5 left-1/2 w-full h-0.5 -z-0 ${
                  getStepStatus(req, st.num + 1) === "completed" ? "bg-ready" : "bg-muted"
                }`} />
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      
      {/* GUEST HERO STATUS BANNER */}
      <Card className="bg-card border border-border p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-ready animate-pulse" />
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest font-sans">Active Connection</span>
          </div>
          <h2 className="font-display text-2xl font-bold tracking-tight text-foreground mt-1.5">Welcome to Room {guestRoom}</h2>
          <p className="text-xs text-muted-foreground mt-1">Interact directly with housekeeping, maintenance, and concierge.</p>
        </div>
        <div className="bg-muted/40 border p-3 rounded-xl flex items-center gap-3 shrink-0">
          <Smartphone className="size-8 text-primary" />
          <div>
            <span className="text-[9px] font-bold text-muted-foreground uppercase block tracking-wider">Device Endpoint</span>
            <span className="text-xs font-bold text-foreground font-mono">Mobile Web App</span>
          </div>
        </div>
      </Card>

      {/* TRACK PENDING CONCIERGE REQUESTS */}
      <Card className="p-6 bg-card border border-border shadow-sm space-y-4">
        <div>
          <h3 className="font-display text-lg font-bold text-foreground">Active Request Tracker</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Real-time status updates of amenities or repairs logged for your room.</p>
        </div>

        <div className="space-y-3.5">
          {myRequests.map((req) => (
            <div key={req.id} className="p-4 rounded-xl border border-border bg-muted/20 dark:bg-black/5 space-y-3">
              <div className="flex justify-between items-start gap-2">
                <div>
                  <span className="font-bold text-sm text-foreground">{req.item}</span>
                  <p className="text-[10px] text-muted-foreground mt-1.5 font-mono">Request Reference: {req.id}</p>
                </div>
                {req.status === "Completed" ? (
                  <Badge className="bg-ready/15 text-ready border border-ready/30 hover:none flex items-center gap-1 text-[10px] py-0 px-2 leading-loose font-sans font-medium">
                    <CheckCircle className="size-3" /> Resolved
                  </Badge>
                ) : (
                  <Badge className="bg-primary/10 text-primary border border-primary/20 hover:none text-[10px] py-0 px-2 leading-loose font-sans font-medium animate-pulse">
                    Processing
                  </Badge>
                )}
              </div>

              {req.details && (
                <div className="text-xs text-muted-foreground bg-card p-2.5 rounded border border-border leading-relaxed">
                  <span className="font-bold text-[9px] text-primary uppercase block tracking-wider mb-1">Guest Instructions</span>
                  {req.details}
                </div>
              )}

              {/* State Machine Step Tracker */}
              {renderTrackerSteps(req)}

              {req.status === "Completed" && (
                <div className="bg-ready/5 border border-ready/20 p-2 rounded text-xs text-ready text-center font-medium leading-normal mt-2">
                  ✨ Fulfillment complete. Thank you for your patience!
                </div>
              )}
            </div>
          ))}

          {myRequests.length === 0 && (
            <div className="py-12 text-center space-y-3 bg-muted/20 border border-dashed rounded-xl p-6">
              <ClipboardList className="size-8 text-muted-foreground mx-auto" />
              <p className="text-sm font-semibold text-foreground">No active requests logged</p>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                Submit items from the service catalog below to initiate guest concierge assistance.
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* REQUEST SERVICE CATALOG */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest pl-1">Room Service & Amenity Catalog</h3>
        
        <div className="grid gap-6 sm:grid-cols-2">
          {catalogItems.map((category) => (
            <Card key={category.category} className="bg-card border border-border shadow-sm p-5 space-y-3.5">
              
              {/* Category Header */}
              <div className="flex items-center gap-2 border-b pb-2.5 border-border/60 /60">
                <span className={`size-8 rounded-lg flex items-center justify-center border ${category.color}`}>
                  <category.icon className="size-4.5" />
                </span>
                <span className="font-display font-bold text-sm text-foreground">{category.title}</span>
              </div>

              {/* Catalog Items buttons */}
              <div className="flex flex-col gap-1.5">
                {category.items.map((item) => (
                  <button
                    key={item.name}
                    onClick={() => handleItemSelect(category.category, item.name, item.dept)}
                    className="flex items-center justify-between w-full text-left text-xs bg-muted/30 dark:bg-card border border-border/70 hover:border-primary/40 hover:bg-primary/5 p-2.5 rounded-lg transition-colors group cursor-pointer"
                  >
                    <span className="text-foreground/90 font-medium group-hover:text-primary transition-colors">{item.name}</span>
                    <CornerDownRight className="size-3.5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                  </button>
                ))}
              </div>

            </Card>
          ))}
        </div>
      </div>

      {/* CONFIRMATION SUBMISSION BOTTOM-SHEET / DRAWER */}
      <Drawer open={catalogOpen} onOpenChange={setCatalogOpen}>
        <DrawerContent className="bg-card border-t border-border pb-6">
          <div className="mx-auto w-full max-w-sm">
            <DrawerHeader>
              <DrawerTitle className="text-foreground font-display font-bold">Confirm Request Details</DrawerTitle>
              <DrawerDescription className="text-xs text-muted-foreground">
                Verify dispatch instructions for Room {guestRoom}.
              </DrawerDescription>
            </DrawerHeader>

            {selectedItem && (
              <form onSubmit={handleRequestSubmit} className="space-y-4 px-4 pt-2">
                <div className="p-3.5 bg-muted/40 rounded-xl border border-border text-xs">
                  <span className="text-[9px] text-primary font-bold block uppercase tracking-wide">Selected Catalog Item</span>
                  <p className="font-semibold text-foreground mt-1">{selectedItem.item}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">Routing queue: {selectedItem.defaultDept} Department</p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="notes-area" className="text-xs text-foreground">Additional instructions / guest notes</Label>
                  <Textarea
                    id="notes-area"
                    placeholder="e.g. Please leave outside the door, or call first..."
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="text-xs border-border"
                  />
                </div>

                <DrawerFooter className="px-0 pt-2 flex flex-col gap-2">
                  <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-black font-semibold gap-1.5 min-h-[48px]">
                    <Send className="size-3.5" /> Submit Request
                  </Button>
                  <Button type="button" variant="outline" className="w-full border-border text-muted-foreground min-h-[48px]" onClick={() => setCatalogOpen(false)}>
                    Cancel
                  </Button>
                </DrawerFooter>
              </form>
            )}
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
