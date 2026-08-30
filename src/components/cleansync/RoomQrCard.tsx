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
    <Card className="bg-white border-[#EBE3D1] border-2 shadow-md rounded-2xl overflow-hidden max-w-xl mx-auto p-6 flex flex-col gap-6 text-[#2A2620] relative">
      {/* Accent corner tag */}
      <div className="absolute top-0 right-0 bg-[#B5652F] text-white text-[9px] font-bold px-3 py-1 rounded-bl-xl uppercase tracking-wider">
        NIRVASA Placard
      </div>

      {/* Placard Header */}
      <div className="flex items-center gap-3 border-b border-[#EBE3D1]/80 pb-4">
        <img src="/nirvasa-logo.png" alt="NIRVASA" className="size-11 rounded-full object-contain border border-[#B5652F]/30 shadow-xs" />
        <div>
          <h3 className="text-xl font-black font-sans tracking-wide text-[#2A2620]">NIRVASA • Room {roomNumber}</h3>
          <p className="text-xs text-[#B5652F] font-bold uppercase tracking-wider">{roomType} Operational Placement Card</p>
        </div>
      </div>

      {/* Dual Column QR Codes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        
        {/* Guest QR Placard Column */}
        <div className="flex flex-col items-center p-4 rounded-xl bg-[#F5F1E8] border border-[#EBE3D1]/40 text-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#B5652F] uppercase tracking-wider">
            <User className="size-4" /> Guest Concierge
          </div>
          <div className="size-36 bg-white p-2 rounded-xl border border-[#EBE3D1] flex items-center justify-center shadow-inner">
            <img
              src={getQrImgUrl(guestUrl)}
              alt={`Room ${roomNumber} Guest QR`}
              className="size-full object-contain"
            />
          </div>
          <p className="text-[10px] text-[#736B5E] leading-normal font-sans px-2">
            Scan to order amenities, submit maintenance tickets, or check status.
          </p>
          <div className="flex gap-1.5 w-full mt-1.5 border-t border-[#EBE3D1]/60 pt-3">
            <Button
              size="xs"
              variant="outline"
              className="flex-1 h-7 text-[10px] border-[#EBE3D1] hover:bg-[#B5652F]/5"
              onClick={() => handleCopy(guestUrl)}
            >
              <Copy className="size-3 mr-1" /> Copy Link
            </Button>
            <Button
              size="xs"
              variant="outline"
              className="flex-1 h-7 text-[10px] border-[#EBE3D1] hover:bg-[#B5652F]/5"
              onClick={() => handleDownload(guestUrl, `Room_${roomNumber}_guest_qr.png`)}
            >
              <Download className="size-3 mr-1" /> Save PNG
            </Button>
          </div>
        </div>

        {/* Staff QR Placard Column */}
        <div className="flex flex-col items-center p-4 rounded-xl bg-[#F5F1E8] border border-[#EBE3D1]/40 text-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#B5652F] uppercase tracking-wider">
            <Shield className="size-4" /> Staff Check-in
          </div>
          <div className="size-36 bg-white p-2 rounded-xl border border-[#EBE3D1] flex items-center justify-center shadow-inner">
            <img
              src={getQrImgUrl(staffUrl)}
              alt={`Room ${roomNumber} Staff QR`}
              className="size-full object-contain"
            />
          </div>
          <p className="text-[10px] text-[#736B5E] leading-normal font-sans px-2">
            Scan to assign this room, check in to shifts, and launch cleaner checklist.
          </p>
          <div className="flex gap-1.5 w-full mt-1.5 border-t border-[#EBE3D1]/60 pt-3">
            <Button
              size="xs"
              variant="outline"
              className="flex-1 h-7 text-[10px] border-[#EBE3D1] hover:bg-[#B5652F]/5"
              onClick={() => handleCopy(staffUrl)}
            >
              <Copy className="size-3 mr-1" /> Copy Link
            </Button>
            <Button
              size="xs"
              variant="outline"
              className="flex-1 h-7 text-[10px] border-[#EBE3D1] hover:bg-[#B5652F]/5"
              onClick={() => handleDownload(staffUrl, `Room_${roomNumber}_staff_qr.png`)}
            >
              <Download className="size-3 mr-1" /> Save PNG
            </Button>
          </div>
        </div>

      </div>

      {/* Placard Footer Instructions */}
      <div className="text-center bg-[#8A9A6B]/10 border border-[#8A9A6B]/25 rounded-xl p-2.5 text-[10px] text-[#2A2620] font-sans">
        <span className="font-bold text-[#B5652F]">Presentation Instructions:</span> Point your phone's built-in camera to either QR code above to trigger the live redirection check.
      </div>
    </Card>
  );
}
