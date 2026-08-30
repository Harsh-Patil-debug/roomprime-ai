import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Toaster } from "@/components/ui/sonner";
import { useQrRedirect } from "@/hooks/useQrRedirect";
import { RoomFlowProvider } from "@/components/cleansync/store";
import { AuthProvider, useAuth, type SessionScope } from "@/components/cleansync/auth";
import { AuthScreen } from "@/components/cleansync/AuthScreen";
import { Loader2 } from "lucide-react";

const title = "NIRVASA — Smart Hotel Turnaround & Operations Suite";
const description =
  "NIRVASA Smart Hotel Turnaround — Luxury hotel housekeeping, AI computer vision staging audits, and guest service auto-dispatch system.";

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
  const { user, loading } = useAuth();
  const router = useRouter();

  // Activate post-login redirection checks
  useQrRedirect();

  // Check roles and query parameter redirect rules
  useEffect(() => {
    if (loading) return;

    // Check QR link parameter ?room=203 on index route
    const searchParams = new URLSearchParams(window.location.search);
    const roomParam = searchParams.get("room");

    if (roomParam) {
      router.navigate({ to: "/concierge", search: { room: roomParam } });
      return;
    }

    if (user) {
      if (user.role === "ops" || user.role === "requests") {
        router.navigate({ to: "/control" });
      } else if (user.role === "staff") {
        router.navigate({ to: "/staff" });
      } else if (user.role === "guest") {
        router.navigate({ to: "/concierge" });
      }
    }
  }, [user, loading]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#ECECDC] dark:bg-[#09332C] flex flex-col items-center justify-center gap-3">
        <Loader2 className="size-8 text-[#09332C] dark:text-[#A0C9CB] animate-spin" />
        <span className="text-sm font-semibold text-[#5C6E6A] dark:text-[#A0C9CB]">Loading NIRVASA...</span>
      </div>
    );
  }

  // If not logged in and no room query param, show Auth Screen to authenticate
  return (
    <div className="min-h-screen bg-[#ECECDC] dark:bg-[#09332C] flex flex-col items-center justify-center p-4">
      <AuthScreen />
      <Toaster position="top-right" richColors />
    </div>
  );
}
