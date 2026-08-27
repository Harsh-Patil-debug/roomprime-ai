import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { getGoogleAuthUrlFn, loginWithGoogleCodeFn, loginWithGoogleTokenFn } from "@/lib/server-functions";
import { toast } from "sonner";

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatarUrl: string;
  role: "ops" | "requests" | "staff" | "guest";
}

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  loginWithGoogle: (email?: string, name?: string) => Promise<void>;
  loginWithGoogleToken: (token: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUserRole: (newRole: UserProfile["role"]) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const env = import.meta.env;
export const isGoogleConfigured = !!(
  env["VITE_GOOGLE_CLIENT_ID"] &&
  env["VITE_GOOGLE_CLIENT_SECRET"] &&
  !env["VITE_GOOGLE_CLIENT_ID"].includes("PLACEHOLDER")
);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize Auth session
  useEffect(() => {
    // 1. CHECK IF USER IS REDIRECTED FROM GOOGLE WITH AN AUTH CODE
    if (typeof window !== "undefined") {
      const code = new URLSearchParams(window.location.search).get("code");
      if (code) {
        setLoading(true);
        loginWithGoogleCodeFn({ data: { code } })
          .then((profile) => {
            // Clean code query parameter from browser address bar
            const cleanUrl = window.location.origin + window.location.pathname;
            window.history.replaceState({}, document.title, cleanUrl);

            localStorage.setItem("roomflow_sim_user", JSON.stringify(profile));
            setUser(profile as UserProfile);
            setLoading(false);
            toast.success(`Welcome back, ${profile.name}!`, {
              description: "Logged in securely via Google OAuth."
            });
          })
          .catch((err) => {
            console.error("Google OAuth token exchange failed: ", err);
            toast.error("Google Auth failed. Reverting to simulator mode.");
            setLoading(false);
          });
        return () => {};
      }
    }

    if (isSupabaseConfigured) {
      // 2. REAL SUPABASE SESSION BINDING
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          syncUserProfile(session.user);
        } else {
          setLoading(false);
        }
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session) {
          syncUserProfile(session.user);
        } else {
          setUser(null);
          setLoading(false);
        }
      });

      return () => subscription.unsubscribe();
    } else {
      // 3. SIMULATION SESSION FALLBACK
      const savedUser = localStorage.getItem("roomflow_sim_user");
      if (savedUser) {
        try {
          setUser(JSON.parse(savedUser));
        } catch (e) {
          localStorage.removeItem("roomflow_sim_user");
        }
      }
      setLoading(false);
      return () => {};
    }
  }, []);

  // Sync Supabase Auth Metadata with local user state & upsert profile row
  const syncUserProfile = async (supabaseUser: any) => {
    const email = supabaseUser.email || "";
    const name = supabaseUser.user_metadata?.full_name || supabaseUser.user_metadata?.name || "Google Staff User";
    const avatarUrl = supabaseUser.user_metadata?.avatar_url || supabaseUser.user_metadata?.picture || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop";
    
    // Check if profile exists, otherwise write it
    let role: UserProfile["role"] = "ops"; // Default to Supervisor Control Center
    
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", supabaseUser.id)
        .single();
        
      if (data) {
        role = data.role as UserProfile["role"];
      } else {
        // Create new user profile row
        await supabase.from("profiles").upsert({
          id: supabaseUser.id,
          email,
          name,
          avatar_url: avatarUrl,
          role,
          updated_at: new Date().toISOString()
        });
      }
    } catch (e) {
      console.warn("Could not write profile to Supabase database. Continuing with memory session.", e);
    }

    setUser({
      id: supabaseUser.id,
      email,
      name,
      avatarUrl,
      role
    });
    setLoading(false);
  };

  const loginWithGoogle = async (email?: string, name?: string) => {
    setLoading(true);
    
    // If a custom email is provided, bypass real Google/Supabase OAuth redirects 
    // to allow instant mock login with any Gmail address on all environments/ports.
    if (email) {
      setTimeout(() => {
        const targetEmail = email;
        const targetName = name || (targetEmail.split("@")[0] || "User").replace(/\./g, " ").replace(/\b\w/g, c => c.toUpperCase());
        
        const mockUser: UserProfile = {
          id: `sim-${Math.random().toString(36).substr(2, 9)}`,
          email: targetEmail,
          name: targetName,
          avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop",
          role: "ops" // Default role
        };
        localStorage.setItem("roomflow_sim_user", JSON.stringify(mockUser));
        setUser(mockUser);
        setLoading(false);
        toast.success(`Welcome back, ${targetName}!`, {
          description: "Logged in via Simulated Google OAuth (Demo Mode)."
        });
      }, 1000);
      return;
    }

    const isLocal = typeof window !== "undefined" && 
      (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");

    if (isGoogleConfigured && isLocal) {
      // 1. Google Direct Client OAuth flow linked to MongoDB
      try {
        const authUrl = await getGoogleAuthUrlFn();
        window.location.href = authUrl;
      } catch (err: any) {
        toast.error("Failed to generate Google consent URL: " + err.message);
        setLoading(false);
      }
    } else if (isSupabaseConfigured) {
      // 2. Supabase Auth OAuth flow
      try {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo: window.location.origin
          }
        });
        if (error) throw error;
      } catch (err: any) {
        toast.error("Google Auth failed: " + err.message);
        setLoading(false);
      }
    } else {
      // 3. Simulated Dev Mode Login (no credentials provided)
      setTimeout(() => {
        const targetEmail = "sanjay.patel@grandpalace.com";
        const targetName = "Sanjay Patel";
        
        const mockUser: UserProfile = {
          id: `sim-${Math.random().toString(36).substr(2, 9)}`,
          email: targetEmail,
          name: targetName,
          avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop",
          role: "ops" // Default role
        };
        localStorage.setItem("roomflow_sim_user", JSON.stringify(mockUser));
        setUser(mockUser);
        setLoading(false);
        toast.success(`Welcome back, ${targetName}!`, {
          description: "Logged in via Simulated Google OAuth (Demo Mode)."
        });
      }, 1000);
    }
  };

  const loginWithGoogleToken = async (token: string) => {
    setLoading(true);
    try {
      const profile = await loginWithGoogleTokenFn({ data: { token } });
      localStorage.setItem("roomflow_sim_user", JSON.stringify(profile));
      setUser(profile as UserProfile);
      setLoading(false);
      toast.success(`Welcome back, ${profile.name}!`, {
        description: "Logged in securely via Google Identity."
      });
    } catch (err: any) {
      console.error("Google GSI token exchange failed: ", err);
      toast.error("Google login failed: " + err.message);
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    } else {
      localStorage.removeItem("roomflow_sim_user");
      setUser(null);
      setLoading(false);
      toast.success("Signed out successfully.");
    }
  };

  const updateUserRole = async (newRole: UserProfile["role"]) => {
    if (!user) return;
    const updatedUser = { ...user, role: newRole };
    
    // Save to MongoDB if configured
    try {
      const { mongoClient } = await import("@/lib/mongodb");
      await mongoClient.saveUser(updatedUser);
    } catch (e) {
      console.warn("Could not sync role changes to MongoDB users collection: ", e);
    }

    if (isSupabaseConfigured) {
      try {
        await supabase
          .from("profiles")
          .update({ role: newRole })
          .eq("id", user.id);
      } catch (e) {
        console.warn("Could not sync role changes to Supabase: ", e);
      }
    } else {
      localStorage.setItem("roomflow_sim_user", JSON.stringify(updatedUser));
    }
    
    setUser(updatedUser);
    toast.success(`Role updated to ${newRole === "ops" ? "Supervisor" : newRole === "requests" ? "Front Desk" : newRole === "staff" ? "Field Staff" : "Guest"}`);
  };

  return (
    <AuthContext.Provider value={{ user, loading, loginWithGoogle, loginWithGoogleToken, logout, updateUserRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
