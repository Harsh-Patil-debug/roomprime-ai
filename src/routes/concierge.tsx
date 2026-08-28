import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect } from "react";
import { AuthProvider, useAuth } from "@/components/cleansync/auth";
import { RoomFlowProvider } from "@/components/cleansync/store";
import { GuestPortal } from "@/components/cleansync/GuestPortal";
import { Hotel, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

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

    // Supervisor or staff should not view guest simplified portal
    if (user) {
      if (user.role === "ops" || user.role === "requests") {
        toast.info("Supervisors are restricted from viewing the simplified Guest Concierge view. Redirected to Control Center.");
        router.navigate({ to: "/control" });
        return;
      }
      if (user.role === "staff") {
        toast.info("Staff are restricted from viewing the simplified Guest Concierge view. Redirected to Staff Portal.");
        router.navigate({ to: "/staff" });
        return;
      }
    }
  }, [user, loading]);

  if (loading || (user && (user.role === "ops" || user.role === "requests" || user.role === "staff"))) {
    return (
      <div className="min-h-screen bg-[#ECECDC] dark:bg-[#09332C] flex flex-col items-center justify-center gap-3">
        <Loader2 className="size-8 text-[#09332C] dark:text-[#A0C9CB] animate-spin" />
        <span className="text-sm font-semibold text-[#5C6E6A] dark:text-[#A0C9CB]">Verifying guest access...</span>
      </div>
    );
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
  const { user, updateUserRole } = useAuth();
  const router = useRouter();

  const handleRoleSwitch = async (newRole: "ops" | "requests" | "staff" | "guest") => {
    if (user) {
      await updateUserRole(newRole);
    }
    if (newRole === "ops" || newRole === "requests") {
      router.navigate({ to: "/control" });
    } else if (newRole === "staff") {
      router.navigate({ to: "/staff" });
    } else if (newRole === "guest") {
      router.navigate({ to: "/concierge", search: { room: "203" } });
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b border-[#D2D2BC] dark:border-[#185E52] bg-[#ECECDC]/80 dark:bg-[#09332C]/80 backdrop-blur py-3.5 px-4 shadow-sm">
      <div className="mx-auto flex max-w-[1600px] items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-xl bg-[#09332C]/10 dark:bg-[#A0C9CB]/15">
            <Hotel className="size-5 text-[#09332C] dark:text-[#A0C9CB]" />
          </span>
          <div>
            <h1 className="text-base font-bold leading-none text-[#09332C] dark:text-[#ECECDC]">RoomFlow Guest Portal</h1>
            <p className="text-[10px] text-[#5C6E6A] dark:text-[#A0C9CB] mt-0.5 uppercase tracking-wider font-bold">Concierge Service Desk</p>
          </div>
        </div>

        {/* FLOATING DEMO PERSONA SWITCHER PILL */}
        <div className="flex items-center bg-[#09332C]/10 dark:bg-[#A0C9CB]/15 border border-[#09332C]/20 dark:border-[#A0C9CB]/30 p-0.5 rounded-full gap-0.5 shadow-sm select-none">
          <span className="hidden sm:inline-block text-[9px] font-black text-[#09332C] dark:text-[#ECECDC] uppercase tracking-wider px-2 border-r border-[#09332C]/20 dark:border-[#A0C9CB]/30">
            Demo Switcher
          </span>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-[10px] font-extrabold rounded-full px-2.5 py-0 transition-all cursor-pointer text-[#5C6E6A] dark:text-[#ECECDC]/80 hover:text-[#09332C] dark:hover:text-[#ECECDC] hover:bg-[#09332C]/5 dark:hover:bg-white/10"
            onClick={() => handleRoleSwitch("ops")}
          >
            👑 Supervisor
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-[10px] font-extrabold rounded-full px-2.5 py-0 transition-all cursor-pointer text-[#5C6E6A] dark:text-[#ECECDC]/80 hover:text-[#09332C] dark:hover:text-[#ECECDC] hover:bg-[#09332C]/5 dark:hover:bg-white/10"
            onClick={() => handleRoleSwitch("staff")}
          >
            🧹 Staff
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-[10px] font-extrabold rounded-full px-2.5 py-0 transition-all cursor-pointer bg-[#09332C] dark:bg-[#A0C9CB] text-[#ECECDC] dark:text-[#09332C] shadow-sm hover:bg-[#09332C]/90 dark:hover:bg-[#A0C9CB]/90"
            onClick={() => handleRoleSwitch("guest")}
          >
            🛎 Guest
          </Button>
        </div>
      </div>
    </header>
  );
}
