import { useEffect, useState } from "react";
import { useAuth, isGoogleConfigured } from "./auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { 
  Hotel, 
  Sparkles, 
  RefreshCw, 
  User, 
  Mail, 
  Phone, 
  Lock, 
  Eye, 
  EyeOff, 
  ShieldCheck 
} from "lucide-react";
import { toast } from "sonner";

declare global {
  interface Window {
    google?: any;
  }
}

export function AuthScreen() {
  const { loginWithGoogle, loginWithGoogleToken, loading } = useAuth();
  
  // Tabs: 'signin' or 'register'
  const [tab, setTab] = useState<"signin" | "register">("signin");
  
  // Form states
  const [name, setName] = useState("Aayush Jadhav");
  const [email, setEmail] = useState("aayushjadhav05128@gmail.com");
  const [phone, setPhone] = useState("+91 98765 43210");
  const [passcode, setPasscode] = useState("123456");
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [showPasscode, setShowPasscode] = useState(false);
  
  // Email format regex
  const validateEmail = (emailStr: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailStr);
  };

  // Custom Google SSO simulator (bypasses popups and works on all domains/ports)
  const handleGoogleLogin = () => {
    if (!email) {
      toast.error("Email Required", { 
        description: "Please enter your Gmail address in the email field above to continue with Google." 
      });
      return;
    }
    if (!validateEmail(email)) {
      toast.error("Invalid Format", { 
        description: "Please enter a valid Gmail address format." 
      });
      return;
    }
    loginWithGoogle(email, name || undefined);
  };

  // Form submission handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Basic Validations
    if (!email) {
      toast.error("Required Field", { description: "Please enter your email address." });
      return;
    }
    if (!validateEmail(email)) {
      toast.error("Invalid Format", { description: "Please enter a valid email format." });
      return;
    }
    if (!passcode) {
      toast.error("Required Field", { description: "Please enter your security passcode." });
      return;
    }
    if (passcode.length < 6) {
      toast.error("Weak Passcode", { description: "Security passcode must be at least 6 characters long." });
      return;
    }

    if (tab === "register") {
      if (!name) {
        toast.error("Required Field", { description: "Please enter your staff ID or full name." });
        return;
      }
      if (!phone) {
        toast.error("Required Field", { description: "Please enter your phone number." });
        return;
      }
      if (phone.replace(/\D/g, "").length < 10) {
        toast.error("Invalid Phone", { description: "Please enter a valid phone number (at least 10 digits)." });
        return;
      }
      if (!agreeTerms) {
        toast.error("Agreement Required", { description: "You must agree to the Terms & Conditions and Operational Privacy Policy." });
        return;
      }
    }

    // Submit mock login payload
    loginWithGoogle(email, name || undefined);
  };

  return (
    <div className="flex min-h-[85vh] items-center justify-center p-4">
      <Card className="w-full max-w-md bg-[#ECECDC] dark:bg-[#0E4239] border border-[#D2D2BC] dark:border-[#185E52] shadow-2xl rounded-[2rem] p-6 sm:p-8 space-y-6 text-[#09332C] dark:text-[#ECECDC]">
        
        {/* Header Section */}
        <div className="flex flex-col items-center text-center space-y-3">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-[#09332C] dark:bg-[#A0C9CB] text-[#ECECDC] dark:text-[#09332C] shadow-md">
            <Hotel className="size-7" />
          </span>
          <div className="space-y-1">
            <h1 className="font-display text-2xl font-bold tracking-widest text-[#09332C] dark:text-[#ECECDC] uppercase">
              ROOMFLOW
            </h1>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-[#733635]/30 bg-[#733635]/10 text-[9px] font-bold text-[#733635] dark:text-[#FF6037] tracking-wider uppercase">
              <ShieldCheck className="size-3" />
              🛡 SECURE ACCESS PROTOCOL V2.0
            </div>
          </div>
        </div>

        {/* Tab Toggle */}
        <div className="grid grid-cols-2 p-1 bg-[#DFDFC8] dark:bg-[#072620] border border-[#D2D2BC] dark:border-[#185E52] rounded-xl text-xs font-semibold">
          <button
            onClick={() => setTab("signin")}
            className={`py-2 rounded-lg transition-all ${
              tab === "signin"
                ? "bg-[#ECECDC] dark:bg-[#0E4239] text-[#09332C] dark:text-[#A0C9CB] shadow-xs font-bold"
                : "text-[#5C6E6A] dark:text-[#A0C9CB]/70 hover:text-[#09332C] dark:hover:text-[#ECECDC]"
            }`}
          >
            SIGN IN
          </button>
          <button
            onClick={() => setTab("register")}
            className={`py-2 rounded-lg transition-all ${
              tab === "register"
                ? "bg-[#ECECDC] dark:bg-[#0E4239] text-[#09332C] dark:text-[#A0C9CB] shadow-xs font-bold"
                : "text-[#5C6E6A] dark:text-[#A0C9CB]/70 hover:text-[#09332C] dark:hover:text-[#ECECDC]"
            }`}
          >
            REGISTER STAFF
          </button>
        </div>

        {/* Interactive Form */}
        <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
          
          {tab === "register" && (
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#5C6E6A] dark:text-[#A0C9CB] block">
                STAFF ID / FULL NAME
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-[#5C6E6A] dark:text-[#A0C9CB]">
                  <User className="size-4" />
                </span>
                <input
                  type="text"
                  placeholder="Enter your full name or staff ID"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="off"
                  className="w-full h-11 pl-10 pr-3 rounded-xl border border-[#D2D2BC] dark:border-[#185E52] bg-white dark:bg-[#072620] text-xs text-[#09332C] dark:text-[#ECECDC] placeholder-[#5C6E6A]/50 focus:outline-none focus:ring-1 focus:ring-[#09332C] dark:focus:ring-[#A0C9CB] focus:border-[#09332C] transition-all"
                />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-[#5C6E6A] dark:text-[#A0C9CB] block">
              WORK EMAIL / USER ID
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-[#5C6E6A] dark:text-[#A0C9CB]">
                <Mail className="size-4" />
              </span>
              <input
                type="email"
                placeholder="Enter work email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="off"
                className="w-full h-11 pl-10 pr-3 rounded-xl border border-[#D2D2BC] dark:border-[#185E52] bg-white dark:bg-[#072620] text-xs text-[#09332C] dark:text-[#ECECDC] placeholder-[#5C6E6A]/50 focus:outline-none focus:ring-1 focus:ring-[#09332C] dark:focus:ring-[#A0C9CB] focus:border-[#09332C] transition-all"
              />
            </div>
          </div>

          {tab === "register" && (
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#5C6E6A] dark:text-[#A0C9CB] block">
                PHONE NUMBER
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-[#5C6E6A] dark:text-[#A0C9CB]">
                  <Phone className="size-4" />
                </span>
                <input
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  autoComplete="off"
                  className="w-full h-11 pl-10 pr-3 rounded-xl border border-[#D2D2BC] dark:border-[#185E52] bg-white dark:bg-[#072620] text-xs text-[#09332C] dark:text-[#ECECDC] placeholder-[#5C6E6A]/50 focus:outline-none focus:ring-1 focus:ring-[#09332C] dark:focus:ring-[#A0C9CB] focus:border-[#09332C] transition-all"
                />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-[#5C6E6A] dark:text-[#A0C9CB] block">
              SECURITY PASSCODE
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-[#5C6E6A] dark:text-[#A0C9CB]">
                <Lock className="size-4" />
              </span>
              <input
                type={showPasscode ? "text" : "password"}
                placeholder="••••••••••••"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                autoComplete="new-password"
                className="w-full h-11 pl-10 pr-10 rounded-xl border border-[#D2D2BC] dark:border-[#185E52] bg-white dark:bg-[#072620] text-xs text-[#09332C] dark:text-[#ECECDC] placeholder-[#5C6E6A]/50 focus:outline-none focus:ring-1 focus:ring-[#09332C] dark:focus:ring-[#A0C9CB] focus:border-[#09332C] transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPasscode(!showPasscode)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#5C6E6A]/70 hover:text-[#09332C] dark:hover:text-[#A0C9CB] cursor-pointer"
              >
                {showPasscode ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          {tab === "register" && (
            <label className="flex items-start gap-2.5 text-[11px] text-[#5C6E6A] dark:text-[#A0C9CB] select-none cursor-pointer leading-normal mt-2">
              <input
                type="checkbox"
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
                className="mt-0.5 accent-[#09332C] dark:accent-[#A0C9CB] h-3.5 w-3.5 rounded border-[#D2D2BC] bg-white"
              />
              <span>
                I agree to the{" "}
                <span className="text-[#733635] dark:text-[#FF6037] font-semibold hover:underline">Terms & Conditions</span> and{" "}
                <span className="text-[#733635] dark:text-[#FF6037] font-semibold hover:underline">Operational Privacy Policy</span>.
              </span>
            </label>
          )}

          {/* Primary Action Button */}
          <Button
            type="submit"
            disabled={loading}
            className="w-full h-11 bg-[#09332C] hover:bg-[#06241F] text-[#ECECDC] font-bold text-xs uppercase tracking-widest rounded-xl transition-all shadow-md mt-2 cursor-pointer dark:bg-[#A0C9CB] dark:text-[#09332C] dark:hover:bg-[#8ebbbb]"
          >
            {loading ? (
              <RefreshCw className="size-4 animate-spin text-white" />
            ) : (
              "ACCESS ROOMFLOW PORTAL"
            )}
          </Button>
        </form>

        {/* Divider */}
        <div className="relative flex py-2 items-center">
          <div className="flex-grow border-t border-[#D2D2BC] dark:border-[#185E52]"></div>
          <span className="flex-shrink mx-4 text-[10px] font-bold text-[#5C6E6A]/60 dark:text-[#A0C9CB]/60 tracking-wider">
            OR ACCESS VIA
          </span>
          <div className="flex-grow border-t border-[#D2D2BC] dark:border-[#185E52]"></div>
        </div>

        {/* OAuth Buttons */}
        <div className="space-y-3">
          <Button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full h-11 bg-white dark:bg-[#072620] hover:bg-neutral-50 dark:hover:bg-[#0a352c] text-[#09332C] dark:text-[#ECECDC] border border-[#D2D2BC] dark:border-[#185E52] shadow-xs font-semibold text-xs tracking-wider uppercase transition-all rounded-xl gap-3 cursor-pointer"
          >
            {loading ? (
              <RefreshCw className="size-4 animate-spin text-[#09332C]" />
            ) : (
              <svg className="size-4.5 shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.08H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.92l2.85-2.22.81-.6z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.08l3.66 2.84c.87-2.6 3.3-4.54 6.16-4.54z" fill="#EA4335" />
              </svg>
            )}
            <span>CONTINUE WITH GOOGLE</span>
          </Button>
          <p className="text-[10px] text-center text-[#5C6E6A] dark:text-[#A0C9CB]/80 leading-normal">
            SSO sandbox enabled. Enter your Gmail in the form above and click the button to log in.
          </p>
        </div>

      </Card>
    </div>
  );
}
