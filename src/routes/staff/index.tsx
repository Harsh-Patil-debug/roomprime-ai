import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AuthProvider, useAuth } from "@/components/cleansync/auth";
import { RoomFlowProvider } from "@/components/cleansync/store";
import { StaffPortalInteractive } from "@/components/cleansync/StaffPortalInteractive";
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
    <AuthProvider>
      <RoomFlowProvider>
        <StaffContent />
      </RoomFlowProvider>
    </AuthProvider>
  );
}

function StaffContent() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [scannerOpen, setScannerOpen] = useState(false);

  useEffect(() => {
    if (loading) return;

    if (!user) {
      toast.error("Access Denied: Please log in to access the Staff Portal.");
      router.navigate({ to: "/" });
      return;
    }

    if (user.role !== "staff") {
      toast.error(`Permission Denied: Staff only. Your role: ${user.role}`);
      if (user.role === "ops" || user.role === "requests") {
        router.navigate({ to: "/control" });
      } else {
        router.navigate({ to: "/concierge", search: { room: "203" } });
      }
      return;
    }
  }, [user, loading]);

  if (loading || !user || user.role !== "staff") {
    return (
      <div className="min-h-screen bg-[#ECECDC] dark:bg-[#09332C] flex flex-col items-center justify-center gap-3">
        <Loader2 className="size-8 text-[#09332C] dark:text-[#A0C9CB] animate-spin" />
        <span className="text-sm font-semibold text-[#5C6E6A] dark:text-[#A0C9CB]">Verifying staff access...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#ECECDC] dark:bg-[#09332C]">
      <AppLayout
        role="staff"
        setRole={() => {}}
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
