import { createFileRoute } from "@tanstack/react-router";
import { AuthProvider } from "@/components/cleansync/auth";
import { RoomFlowProvider } from "@/components/cleansync/store";
import { GuestPortal } from "@/components/cleansync/GuestPortal";
import { Hotel } from "lucide-react";

type ConciergeSearch = {
  room?: string | undefined;
  token?: string | undefined;
};

export const Route = createFileRoute("/concierge")({
  validateSearch: (search: Record<string, unknown>): ConciergeSearch => {
    return {
      room: search["room"] ? String(search["room"]) : undefined,
      token: search["token"] ? String(search["token"]) : undefined,
    };
  },
  component: ConciergePageRoute,
});

function ConciergePageRoute() {
  return (
    <AuthProvider>
      <RoomFlowProvider>
        <div className="min-h-screen bg-[#F5F1E8] text-[#2A2620]">
          {/* Copper & Cream Header */}
          <header className="sticky top-0 z-40 border-b border-[#EBE3D1] bg-white/80 backdrop-blur py-3.5 px-4 shadow-sm">
            <div className="mx-auto flex max-w-[1600px] items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-xl bg-[#B5652F]/10">
                  <Hotel className="size-5 text-[#B5652F]" />
                </span>
                <div>
                  <h1 className="text-base font-semibold leading-none text-[#2A2620]">RoomFlow Guest Portal</h1>
                  <p className="text-[10px] text-[#736B5E] mt-0.5 uppercase tracking-wider font-semibold">Concierge Service Desk</p>
                </div>
              </div>
            </div>
          </header>

          <main className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6">
            <GuestPortal />
          </main>
        </div>
      </RoomFlowProvider>
    </AuthProvider>
  );
}
