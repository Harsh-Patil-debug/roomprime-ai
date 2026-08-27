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

        {/* FLOATING DEMO PERSONA SWITCHER PILL */}
        <div className="flex items-center bg-[#B5652F]/10 border border-[#B5652F]/20 p-0.5 rounded-full gap-0.5 shadow-sm select-none">
          <span className="hidden sm:inline-block text-[9px] font-black text-[#B5652F] uppercase tracking-wider px-2 border-r border-[#B5652F]/20">
            Demo Switcher
          </span>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-[10px] font-extrabold rounded-full px-2.5 py-0 transition-all cursor-pointer text-[#736B5E] hover:text-[#2A2620] hover:bg-[#B5652F]/5"
            onClick={() => handleRoleSwitch("ops")}
          >
            👑 Supervisor
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-[10px] font-extrabold rounded-full px-2.5 py-0 transition-all cursor-pointer text-[#736B5E] hover:text-[#2A2620] hover:bg-[#B5652F]/5"
            onClick={() => handleRoleSwitch("staff")}
          >
            🧹 Staff
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-[10px] font-extrabold rounded-full px-2.5 py-0 transition-all cursor-pointer bg-[#B5652F] text-white shadow-sm hover:bg-[#B5652F]"
            onClick={() => handleRoleSwitch("guest")}
          >
            🛎 Guest
          </Button>
        </div>
      </div>
    </header>
  );
}
