import { useEffect } from "react";
import { useAuth } from "@/components/cleansync/auth";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

export function useQrRedirect() {
  const { user, loading, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  // Handle post-login redirection if there is a pending path
  useEffect(() => {
    if (loading) return;

    const pendingRedirect = localStorage.getItem("roomflow_redirect_to");
    if (pendingRedirect && user) {
      localStorage.removeItem("roomflow_redirect_to");
      toast.success("Authentication successful!", {
        description: "Directing you to your scanned destination...",
      });
      
      try {
        // Parse redirect target path and query parameters
        const url = new URL(pendingRedirect, window.location.origin);
        const searchParams: Record<string, string> = {};
        url.searchParams.forEach((val, key) => {
          searchParams[key] = val;
        });

        navigate({ 
          to: url.pathname,
          search: searchParams,
        });
      } catch (e) {
        // Fallback to window location redirect
        window.location.href = pendingRedirect;
      }
    }
  }, [user, loading, navigate]);

  /**
   * Evaluates if a destination is protected and handles redirection or Google Login accordingly.
   * @param targetPath The relative target URL path with parameters (e.g. "/staff/checkin?room=204")
   * @param isProtected True if this path requires active authentication (e.g. Staff portal)
   */
  const handleQrAccess = async (targetPath: string, isProtected: boolean) => {
    if (isProtected && !user) {
      localStorage.setItem("roomflow_redirect_to", targetPath);
      toast.info("Authentication required", {
        description: "Redirecting to Google Sign-In...",
      });
      await loginWithGoogle();
    } else {
      try {
        const url = new URL(targetPath, window.location.origin);
        const searchParams: Record<string, string> = {};
        url.searchParams.forEach((val, key) => {
          searchParams[key] = val;
        });

        navigate({ 
          to: url.pathname,
          search: searchParams,
        });
      } catch (e) {
        window.location.href = targetPath;
      }
    }
  };

  return { handleQrAccess };
}
