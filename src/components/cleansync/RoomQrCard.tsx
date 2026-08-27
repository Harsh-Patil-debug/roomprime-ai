// Refined UI Pass: Converted 32 hardcoded color references to semantic design tokens.
// Enhanced room placard cards, QR action buttons, and dark mode contrast.

import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Printer, Copy, Check, ExternalLink, QrCode, Hotel, Shield, User } from "lucide-react";
import { toast } from "sonner";

interface RoomQrCardProps {
  roomNumber: string;
  roomType: string;
}

export function RoomQrCard({ roomNumber, roomType }: RoomQrCardProps) {
  // Determine current origin URL dynamically
  const baseAppUrl = useMemo(() => {
    if (typeof window !== "undefined") {
      return `${window.location.protocol}//${window.location.host}`;
    }
    return "http://localhost:8080";
  }, []);

  const guestUrl = `${baseAppUrl}/concierge?room=${roomNumber}`;
  const staffUrl = `${baseAppUrl}/staff/checkin?room=${roomNumber}`;

  // Public QR Code Generator endpoint
  const getQrImgUrl = (data: string) => 
    `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(data)}`;

  const handleDownload = async (url: string, filename: string) => {
    try {
      const qrApiUrl = getQrImgUrl(url);
      const res = await fetch(qrApiUrl);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
      toast.success(`Downloaded QR: ${filename}`);
    } catch (e) {
      console.error(e);
      toast.error("Failed to download QR code image.");
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("URL copied to clipboard!");
  };

  return (
    <Card className="bg-card border-border border-2 shadow-md rounded-2xl overflow-hidden max-w-xl mx-auto p-6 flex flex-col gap-6 text-foreground relative">
      {/* Accent corner tag */}
      <div className="absolute top-0 right-0 bg-primary text-black text-[9px] font-bold px-3 py-1 rounded-bl-xl uppercase tracking-wider">
        RoomFlow Placard
      </div>

      {/* Placard Header */}
      <div className="flex items-center gap-3 border-b border-border/80 pb-4">
        <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10">
          <Hotel className="size-6 text-primary" />
        </div>
        <div>
          <h3 className="text-xl font-bold font-display text-foreground">Room {roomNumber}</h3>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{roomType} Placement Card</p>
        </div>
      </div>

      {/* Dual Column QR Codes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        
        {/* Guest QR Placard Column */}
        <div className="flex flex-col items-center p-4 rounded-xl bg-muted/40 border border-border/40 text-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-bold text-primary uppercase tracking-wider">
            <User className="size-4" /> Guest Concierge
          </div>
          <div className="size-36 bg-white p-2 rounded-xl border border-border flex items-center justify-center shadow-inner">
            <img
              src={getQrImgUrl(guestUrl)}
              alt={`Room ${roomNumber} Guest QR`}
              className="size-full object-contain"
            />
          </div>
          <p className="text-[10px] text-muted-foreground leading-normal font-sans px-2">
            Scan to order amenities, submit maintenance tickets, or check status.
          </p>
          <div className="flex gap-1.5 w-full mt-1.5 border-t border-border/60 pt-3">
            <Button
              size="xs"
              variant="outline"
              className="flex-1 h-7 text-[10px] border-border hover:bg-primary/5"
              onClick={() => handleCopy(guestUrl)}
            >
              <Copy className="size-3 mr-1" /> Copy Link
            </Button>
            <Button
              size="xs"
              variant="outline"
              className="flex-1 h-7 text-[10px] border-border hover:bg-primary/5"
              onClick={() => handleDownload(guestUrl, `Room_${roomNumber}_guest_qr.png`)}
            >
              <Download className="size-3 mr-1" /> Save PNG
            </Button>
          </div>
        </div>

        {/* Staff QR Placard Column */}
        <div className="flex flex-col items-center p-4 rounded-xl bg-muted/40 border border-border/40 text-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-bold text-primary uppercase tracking-wider">
            <Shield className="size-4" /> Staff Check-in
          </div>
          <div className="size-36 bg-white p-2 rounded-xl border border-border flex items-center justify-center shadow-inner">
            <img
              src={getQrImgUrl(staffUrl)}
              alt={`Room ${roomNumber} Staff QR`}
              className="size-full object-contain"
            />
          </div>
          <p className="text-[10px] text-muted-foreground leading-normal font-sans px-2">
            Scan to assign this room, check in to shifts, and launch cleaner checklist.
          </p>
          <div className="flex gap-1.5 w-full mt-1.5 border-t border-border/60 pt-3">
            <Button
              size="xs"
              variant="outline"
              className="flex-1 h-7 text-[10px] border-border hover:bg-primary/5"
              onClick={() => handleCopy(staffUrl)}
            >
              <Copy className="size-3 mr-1" /> Copy Link
            </Button>
            <Button
              size="xs"
              variant="outline"
              className="flex-1 h-7 text-[10px] border-border hover:bg-primary/5"
              onClick={() => handleDownload(staffUrl, `Room_${roomNumber}_staff_qr.png`)}
            >
              <Download className="size-3 mr-1" /> Save PNG
            </Button>
          </div>
        </div>

      </div>

      {/* Placard Footer Instructions */}
      <div className="text-center bg-ready/10 border border-ready/25 rounded-xl p-2.5 text-[10px] text-foreground font-sans">
        <span className="font-bold text-primary">Presentation Instructions:</span> Point your phone's built-in camera to either QR code above to trigger the live redirection check.
      </div>
    </Card>
  );
}
