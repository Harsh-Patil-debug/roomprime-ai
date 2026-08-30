import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AuthProvider, useAuth, type SessionScope } from "@/components/cleansync/auth";
import { RoomFlowProvider } from "@/components/cleansync/store";
import { StaffPortalInteractive } from "@/components/cleansync/StaffPortalInteractive";
import { AtithiSetuLoadingSpinner } from "@/components/cleansync/AtithiSetuLoadingSpinner";
import { AppLayout } from "@/components/cleansync/AppLayout";
import { QrScannerModal } from "@/components/cleansync/QrScannerModal";
import { Toaster } from "@/components/ui/sonner";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/staff/")({
  component: StaffRouteComponent,
});

function StaffRouteComponent() {
  return (
    <AuthProvider sessionScope="staff">
      <RoomFlowProvider>
        <StaffContent />
      </RoomFlowProvider>
    </AuthProvider>
  );
}

function StaffContent() {
  const { user, loading, updateUserRole } = useAuth();
  const router = useRouter();
  const [scannerOpen, setScannerOpen] = useState(false);

  useEffect(() => {
    if (loading) return;

    if (!user) {
      toast.error("Access Denied: Please log in to access the Staff Portal.");
      router.navigate({ to: "/" });
      return;
    }
  }, [user, loading]);

  if (loading || !user) {
    return <AtithiSetuLoadingSpinner fullScreen text="Verifying ATITHISETU Staff Access..." subtext="Smart Hotel Turnaround" />;
  }

  return (
    <div className="min-h-screen bg-[#ECECDC] dark:bg-[#09332C]">
      <AppLayout
        role="staff"
        setRole={async (newRole) => {
          if (user) await updateUserRole(newRole as any);
          if (newRole === "ops" || newRole === "requests") router.navigate({ to: "/control" });
          else if (newRole === "guest") router.navigate({ to: "/concierge", search: { room: "203" } });
        }}
        scannerOpen={scannerOpen}
        setScannerOpen={setScannerOpen}
      >
        <StaffPortalInteractive />
      </AppLayout>

      <QrScannerModal
        open={scannerOpen}
        onOpenChange={setScannerOpen}
      />

      <Toaster position="top-right" richColors />
    </div>
  );
}
