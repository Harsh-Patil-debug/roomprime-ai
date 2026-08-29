import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AuthProvider, useAuth, type SessionScope } from "@/components/cleansync/auth";
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
    <AuthProvider sessionScope="ops">
      <RoomFlowProvider>
        <ControlContent />
      </RoomFlowProvider>
    </AuthProvider>
  );
}

function ControlContent() {
  const { user, loading, updateUserRole } = useAuth();
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

    // Default to their exact role (ops or requests)
    if (user.role === "ops" || user.role === "requests") {
      setRole(user.role as "ops" | "requests");
    }
  }, [user, loading]);

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-[#F5F1E8] flex flex-col items-center justify-center gap-3">
        <Loader2 className="size-8 text-[#B5652F] animate-spin" />
        <span className="text-sm font-semibold text-[#736B5E]">Verifying supervisor access...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F1E8]">
      <AppLayout
        role={role}
        setRole={async (newRole) => {
          if (user) await updateUserRole(newRole as any);
          if (newRole === "staff") router.navigate({ to: "/staff" });
          else if (newRole === "guest") router.navigate({ to: "/concierge", search: { room: "203" } });
          else setRole(newRole as "ops" | "requests");
        }}
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
