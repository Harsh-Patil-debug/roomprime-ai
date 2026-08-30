import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AuthProvider, useAuth } from "@/components/cleansync/auth";
import { RoomFlowProvider, useRoomFlow } from "@/components/cleansync/store";
import { GuestPortal } from "@/components/cleansync/GuestPortal";
import { AtithiSetuLogo } from "@/components/cleansync/AtithiSetuLogo";
import { AtithiSetuLoadingSpinner } from "@/components/cleansync/AtithiSetuLoadingSpinner";
import { Loader2, LogOut, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChatPanel, ChatButton } from "@/components/cleansync/ChatPanel";
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

  if (loading) {
    return <AtithiSetuLoadingSpinner fullScreen text="Verifying ATITHISETU Guest Access..." subtext="Smart Hotel Turnaround" />;
  }

  return (
    <div className="min-h-screen bg-[#ECECDC] dark:bg-[#09332C] text-[#09332C] dark:text-[#ECECDC]">
      <ConciergeHeader />

      <main className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6">
        <GuestPortal />
      </main>
    </div>
  );
}

function ConciergeHeader() {
  const { logout } = useAuth();
  const { notifications, clearNotifications, markNotificationRead } = useRoomFlow();
  const [chatOpen, setChatOpen] = useState(false);

  const unreadCount = notifications.filter((n) => n.unread).length;

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-[#EBE3D1] bg-white/90 backdrop-blur py-3.5 px-4 shadow-sm">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between">
          <AtithiSetuLogo size="md" />

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
                    Notification Center ({notifications.length})
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
              className="h-9 text-[11px] font-bold border-[#EBE3D1] text-[#B14A3E] hover:bg-[#B14A3E]/10 hover:border-[#B14A3E]/30 rounded-xl px-2.5 sm:px-3 cursor-pointer flex items-center gap-1.5 transition-all shadow-xs"
              onClick={logout}
              title="Sign Out"
            >
              <LogOut className="size-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Chat Panel */}
      <ChatPanel open={chatOpen} onClose={() => setChatOpen(false)} userRole="guest" />
    </>
  );
}
