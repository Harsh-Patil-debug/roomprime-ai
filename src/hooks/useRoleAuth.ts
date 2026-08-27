import { useEffect } from "react";
import { useAuth } from "@/components/cleansync/auth";
import { useRouter, useLocation } from "@tanstack/react-router";
import { toast } from "sonner";

export function useRoleAuth(allowedRoles: ("ops" | "requests" | "staff" | "guest")[]) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const location = useLocation();

  useEffect(() => {
    if (loading) return;

    // Check room query parameter
    const searchParams = new URLSearchParams(window.location.search);
    const roomParam = searchParams.get("room");

    if (roomParam && location.pathname !== "/concierge") {
      router.navigate({ to: "/concierge", search: { room: roomParam } });
      return;
    }

    if (!user) {
      if (location.pathname !== "/") {
        router.navigate({ to: "/" });
      }
      return;
    }

    if (!allowedRoles.includes(user.role)) {
      toast.error(`Permission Denied: You do not have access to ${location.pathname}.`);
      
      // Navigate to default role route
      if (user.role === "ops" || user.role === "requests") {
        router.navigate({ to: "/control" });
      } else if (user.role === "staff") {
        router.navigate({ to: "/staff" });
      } else if (user.role === "guest") {
        router.navigate({ to: "/concierge" });
      }
    }
  }, [user, loading, allowedRoles, location.pathname]);

  return { user, loading };
}
