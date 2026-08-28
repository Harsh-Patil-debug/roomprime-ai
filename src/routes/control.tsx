import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AuthProvider, useAuth } from "@/components/cleansync/auth";
import { RoomFlowProvider } from "@/components/cleansync/store";
import { SupervisorDashboard } from "@/components/cleansync/SupervisorDashboard";
import { RequestDashboard } from "@/components/cleansync/RequestDashboard";
import { AppLayout } from "@/components/cleansync/AppLayout";
import { QrScannerModal } from "@/components/cleansync/QrScannerModal";
import { Toaster } from "@/components/ui/sonner";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/control")({
  component: ControlRouteComponent,
});

function ControlRouteComponent() {
  return (
    <AuthProvider>
      <RoomFlowProvider>
        <ControlContent />
      </RoomFlowProvider>
    </AuthProvider>
  );
}

function ControlContent() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [role, setRole] = useState<"ops" | "requests">("ops");
  const [scannerOpen, setScannerOpen] = useState(false);

  useEffect(() => {
    if (loading) return;

    if (!user) {
      toast.error("Access Denied: Please log in to access the Control Center.");
      router.navigate({ to: "/" });
      return;
    }

    if (user.role !== "ops" && user.role !== "requests") {
      toast.error(`Permission Denied: Supervisors only. Your role: ${user.role}`);
      if (user.role === "staff") {
        router.navigate({ to: "/staff" });
      } else {
        router.navigate({ to: "/concierge", search: { room: "203" } });
      }
      return;
    }

    // Default to their exact role
    setRole(user.role as "ops" | "requests");
  }, [user, loading]);

  if (loading || !user || (user.role !== "ops" && user.role !== "requests")) {
    return (
      <div className="min-h-screen bg-[#ECECDC] dark:bg-[#09332C] flex flex-col items-center justify-center gap-3">
        <Loader2 className="size-8 text-[#09332C] dark:text-[#A0C9CB] animate-spin" />
        <span className="text-sm font-semibold text-[#5C6E6A] dark:text-[#A0C9CB]">Verifying supervisor access...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#ECECDC] dark:bg-[#09332C]">
      <AppLayout
        role={role}
        setRole={(newRole) => setRole(newRole as "ops" | "requests")}
        scannerOpen={scannerOpen}
        setScannerOpen={setScannerOpen}
      >
        {role === "ops" ? <SupervisorDashboard /> : <RequestDashboard />}
      </AppLayout>

      <QrScannerModal
        open={scannerOpen}
        onOpenChange={setScannerOpen}
      />

      <Toaster position="top-right" richColors />
    </div>
  );
}
