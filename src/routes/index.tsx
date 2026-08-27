import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Toaster } from "@/components/ui/sonner";
import { useQrRedirect } from "@/hooks/useQrRedirect";
import { RoomFlowProvider } from "@/components/cleansync/store";
import { KpiBar } from "@/components/cleansync/KpiBar";
import { ControlCenter } from "@/components/cleansync/ControlCenter";
import { RequestDashboard } from "@/components/cleansync/RequestDashboard";
import { StaffDashboard } from "@/components/cleansync/StaffDashboard";
import { GuestPortal } from "@/components/cleansync/GuestPortal";
import { WhatsAppSandbox } from "@/components/cleansync/WhatsAppSandbox";
import { DeveloperConsole } from "@/components/cleansync/DeveloperConsole";
import { AuthProvider, useAuth } from "@/components/cleansync/auth";
type RoleId = "ops" | "requests" | "staff" | "guest" | "sandbox" | "dev";
import { LoginScreen } from "@/components/cleansync/LoginScreen";
import { AppLayout } from "@/components/cleansync/AppLayout";
import { QrScannerModal } from "@/components/cleansync/QrScannerModal";

const title = "RoomFlow — Accessible Hotel Housekeeping & Operations Suite";
const description =
  "Lightweight, accessible hotel housekeeping and operations management system for independent and boutique hotels, featuring explainable prioritization, AI room photo verification, and WhatsApp integration.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <AuthProvider>
      <RoomFlowProvider>
        <DashboardLayout />
      </RoomFlowProvider>
    </AuthProvider>
  );
}

function DashboardLayout() {
  const { user, loginWithGoogle, logout } = useAuth();
  const [role, setRole] = useState<RoleId>("ops");
  const [dark, setDark] = useState(true);
  const [scannerOpen, setScannerOpen] = useState(false);

  // Activate post-login redirection checks
  useQrRedirect();

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  // Automatically sync navbar tab context to user's assigned role on login
  useEffect(() => {
    if (user) {
      setRole(user.role);
    }
  }, [user]);

  const isProtectedRoute = role !== "guest";

  return (
    <div className="min-h-screen bg-[#F5F1E8]">
      <AppLayout
        role={role}
        setRole={setRole}
        scannerOpen={scannerOpen}
        setScannerOpen={setScannerOpen}
      >
        {isProtectedRoute && !user ? (
          <LoginScreen />
        ) : (
          <>
            {role === "requests" && <KpiBar />}
            {role === "ops" && <ControlCenter />}
            {role === "requests" && <RequestDashboard />}
            {role === "staff" && <StaffDashboard />}
            {role === "guest" && <GuestPortal />}
            {role === "sandbox" && <WhatsAppSandbox />}
            {role === "dev" && <DeveloperConsole />}
          </>
        )}
      </AppLayout>

      <QrScannerModal
        open={scannerOpen}
        onOpenChange={setScannerOpen}
      />

      <Toaster position="top-right" richColors />
    </div>
  );
}
