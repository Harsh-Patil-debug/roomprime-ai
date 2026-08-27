// Refined UI Pass: Converted 15 hardcoded color references to semantic design tokens.
// Updated background, card, border, text, and loading spinners for light/dark theme consistency.

import { useEffect } from "react";
import { useAuth, isGoogleConfigured } from "./auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Hotel, Sparkles, RefreshCw } from "lucide-react";

declare global {
  interface Window {
    google?: any;
  }
}

export function LoginScreen() {
  const { loginWithGoogle, loginWithGoogleToken, loading } = useAuth();

  useEffect(() => {
    if (!isGoogleConfigured) return;

    // Load Google Identity Services GSI script if not loaded
    const scriptId = "google-gsi-script";
    let script = document.getElementById(scriptId) as HTMLScriptElement;
    
    if (!script) {
      script = document.createElement("script");
      script.id = scriptId;
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);
    }

    const initGsi = () => {
      try {
        if (window.google?.accounts?.id) {
          window.google.accounts.id.initialize({
            client_id: import.meta.env["VITE_GOOGLE_CLIENT_ID"],
            callback: (response: any) => {
              if (response.credential) {
                loginWithGoogleToken(response.credential);
              }
            },
          });

          window.google.accounts.id.renderButton(
            document.getElementById("google-signin-btn"),
            {
              theme: "outline",
              size: "large",
              text: "signin_with",
              shape: "rectangular",
              width: "320",
            }
          );

          window.google.accounts.id.prompt(); // Slide down Google One Tap prompt
        }
      } catch (e) {
        console.error("Google GSI script initialization error: ", e);
      }
    };

    script.onload = initGsi;
    if (window.google?.accounts?.id) {
      initGsi();
    }
  }, [isGoogleConfigured]);

  return (
    <div className="flex min-h-[75vh] items-center justify-center p-4">
      <Card className="w-full max-w-md bg-card border border-border shadow-md rounded-2xl p-6 sm:p-8 space-y-6">
        
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center space-y-3">
          <span className="flex size-12 items-center justify-center rounded-2xl exec-gradient shadow-xs">
            <Hotel className="size-6 text-black" />
          </span>
          <div className="space-y-1">
            <h2 className="font-display text-2xl font-bold tracking-tight text-foreground">
              Sign in to RoomFlow
            </h2>
            <p className="text-xs text-muted-foreground">
              Hotel Housekeeping & Guest Request Suite
            </p>
          </div>
        </div>

        {/* Info card */}
        <div className="p-4 bg-background rounded-xl border border-border space-y-1.5 text-xs text-foreground">
          <span className="font-bold flex items-center gap-1 text-primary uppercase tracking-wider text-[10px]">
            <Sparkles className="size-3.5" /> Staff SSO Authentication
          </span>
          <p className="leading-relaxed">
            Use your authorized hotel Google workspace email account to access operations logs, task sheets, and developer console.
          </p>
        </div>

        {/* Google sign-in container */}
        <div className="space-y-3">
          {isGoogleConfigured ? (
            <div className="space-y-4 flex flex-col items-center">
              {/* Official Google GSI button target container */}
              <div id="google-signin-btn" className="w-full min-h-[44px] flex justify-center" />
              {loading && (
                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground animate-pulse mt-2">
                  <RefreshCw className="size-4 animate-spin text-primary" />
                  <span>Verifying Google Identity tokens...</span>
                </div>
              )}
            </div>
          ) : (
            <Button
              onClick={loginWithGoogle}
              disabled={loading}
              className="w-full h-11 bg-background hover:bg-muted text-foreground border border-border shadow-xs font-semibold text-sm transition-all rounded-xl gap-3 cursor-pointer"
            >
              {loading ? (
                <RefreshCw className="size-5 animate-spin text-primary" />
              ) : (
                <svg className="size-5 shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.08H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.92l2.85-2.22.81-.6z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.08l3.66 2.84c.87-2.6 3.3-4.54 6.16-4.54z" fill="#EA4335" />
                </svg>
              )}
              <span>{loading ? "Authenticating session..." : "Continue with Google"}</span>
            </Button>
          )}
          
          <p className="text-[10px] text-center text-muted-foreground leading-normal">
            By signing in, you agree to RoomFlow's security policy. Local session logs are encrypted.
          </p>
        </div>

      </Card>
    </div>
  );
}
