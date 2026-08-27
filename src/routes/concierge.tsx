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
        <div className="min-h-screen bg-background text-foreground">
          {/* Copper & Cream Header */}
          <header className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur py-3.5 px-4 shadow-xs">
            <div className="mx-auto flex max-w-[1600px] items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10">
                  <Hotel className="size-5 text-primary" />
                </span>
                <div>
                  <h1 className="text-base font-semibold leading-none text-foreground font-display">RoomFlow Guest Portal</h1>
                  <p className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-wider font-semibold">Concierge Service Desk</p>
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
