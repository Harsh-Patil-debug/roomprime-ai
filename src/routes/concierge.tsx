import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AuthProvider, useAuth, type SessionScope } from "@/components/cleansync/auth";
import { RoomFlowProvider } from "@/components/cleansync/store";
import { GuestPortal } from "@/components/cleansync/GuestPortal";
import { Hotel, Loader2, LogOut, Bell } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ChatPanel, ChatButton } from "@/components/cleansync/ChatPanel";
import { useRoomFlow } from "@/components/cleansync/store";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
    <AuthProvider sessionScope="guest">
      <RoomFlowProvider>
        <ConciergeGuardContent />
      </RoomFlowProvider>
    </AuthProvider>
  );
}

function ConciergeGuardContent() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    // No user in guest scope — redirect to login
    // (no cross-role guards needed since each page has its own session scope)
  }, [user, loading]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F1E8] flex flex-col items-center justify-center gap-3">
        <Loader2 className="size-8 text-[#B5652F] animate-spin" />
        <span className="text-sm font-semibold text-[#736B5E]">Verifying guest access...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F1E8] text-[#2A2620]">
      <ConciergeHeader />

      <main className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6">
        <GuestPortal />
      </main>
    </div>
  );
}

function ConciergeHeader() {
  const { user, logout, updateUserRole } = useAuth();
  const { notifications, clearNotifications, markNotificationRead } = useRoomFlow();
  const router = useRouter();
  const [chatOpen, setChatOpen] = useState(false);

  const unreadCount = notifications.filter((n) => n.unread).length;

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-[#EBE3D1] bg-white/80 backdrop-blur py-3.5 px-4 shadow-sm">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-xl bg-[#B5652F]/10">
              <Hotel className="size-5 text-[#B5652F]" />
            </span>
            <div>
              <h1 className="text-base font-bold leading-none text-[#2A2620]">RoomFlow Guest Portal</h1>
              <p className="text-[10px] text-[#736B5E] mt-0.5 uppercase tracking-wider font-bold">Concierge Service Desk</p>
            </div>
          </div>

          {/* Static Role Badge (Strict Role Isolation) */}
          <div className="flex items-center bg-violet-50 border border-violet-200 px-3.5 py-1.5 rounded-full shadow-xs select-none">
            <span className="text-[11px] font-extrabold text-violet-700 uppercase tracking-wider">
              🛎 Guest Portal
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Live Notification Bell */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="relative size-9 rounded-xl border-[#EBE3D1] bg-[#FAFAF7] hover:bg-[#F5F1E8] cursor-pointer shadow-xs"
                  title="Notifications"
                >
                  <Bell className="size-4 text-[#736B5E]" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex size-4.5 items-center justify-center rounded-full bg-[#B14A3E] text-[8px] font-black text-white animate-pulse">
                      {unreadCount}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80 bg-white border-[#EBE3D1] p-3.5 space-y-3 shadow-md rounded-2xl">
                <div className="flex items-center justify-between border-b border-[#F5F1E8] pb-2 select-none">
                  <span className="font-extrabold text-xs text-[#2A2620] uppercase tracking-wider">
                    Guest Alerts ({notifications.length})
                  </span>
                  {notifications.length > 0 && (
                    <button
                      onClick={clearNotifications}
                      className="text-[10px] font-bold text-[#B14A3E] hover:underline cursor-pointer"
                    >
                      Clear All
                    </button>
                  )}
                </div>

                {notifications.length > 0 ? (
                  <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                    {notifications.map((n) => {
                      const alertColor =
                        n.type === "alert"
                          ? "bg-[#B14A3E]/5 border-[#B14A3E]/15 text-[#B14A3E]"
                          : n.type === "warning"
                          ? "bg-amber-500/5 border-amber-500/15 text-amber-800"
                          : "bg-[#8A9A6B]/5 border-[#8A9A6B]/15 text-[#8A9A6B]";

                      const dotColor =
                        n.type === "alert"
                          ? "bg-[#B14A3E]"
                          : n.type === "warning"
                          ? "bg-amber-500"
                          : "bg-[#8A9A6B]";

                      return (
                        <div
                          key={n.id}
                          onClick={() => markNotificationRead(n.id)}
                          className={`p-2.5 rounded-xl border text-[11px] leading-normal flex items-start gap-2 cursor-pointer transition-all hover:bg-[#F5F1E8] ${alertColor}`}
                        >
                          <span className={`inline-block size-1.5 rounded-full mt-1.5 shrink-0 ${dotColor}`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between text-[10px] font-bold">
                              <span className="truncate">{n.title}</span>
                              <span className="text-[#736B5E] font-mono shrink-0 ml-1">{n.timestamp}</span>
                            </div>
                            <p className="text-[10px] text-[#2A2620]/80 mt-0.5 leading-snug">{n.message}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-6 text-xs text-[#736B5E] italic select-none">
                    No unread notifications.
                  </div>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Chat button */}
            <ChatButton onClick={() => setChatOpen(true)} />

            {/* Always visible Sign Out Button */}
            <Button
              size="sm"
              variant="outline"
              className="h-9 text-[11px] font-bold border-[#EBE3D1] text-[#B14A3E] hover:bg-[#B14A3E]/10 hover:border-[#B14A3E]/30 rounded-xl px-3 cursor-pointer flex items-center gap-1.5 transition-all shadow-xs"
              onClick={logout}
              title="Sign Out"
            >
              <LogOut className="size-3.5" />
              <span>Sign Out</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Chat Panel */}
      <ChatPanel open={chatOpen} onClose={() => setChatOpen(false)} userRole="guest" />
    </>
  );
}
