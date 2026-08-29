import { useState, useRef } from "react";
import { useAuth } from "./auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Hotel,
  RefreshCw,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  Crown,
  Wrench,
  ConciergeBell,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";

// Hardcoded credential accounts for role-based login
const ROLE_ACCOUNTS: Record<
  string,
  {
    password: string;
    role: "ops" | "staff" | "guest";
    displayName: string;
  }
> = {
  "supervisor@1234": {
    password: "12345",
    role: "ops",
    displayName: "Supervisor",
  },
  "staff@1234": {
    password: "12345",
    role: "staff",
    displayName: "Staff Member",
  },
  "guest@1234": {
    password: "12345",
    role: "guest",
    displayName: "Guest",
  },
};

const ROLE_CARDS = [
  {
    id: "supervisor" as const,
    email: "supervisor@1234",
    label: "Supervisor",
    description: "Control Center & Operations",
    icon: Crown,
    gradient: "from-amber-600 to-orange-700",
    bgLight: "bg-amber-50",
    borderColor: "border-amber-400",
    textColor: "text-amber-700",
    iconBg: "bg-amber-100",
    hoverBorder: "hover:border-amber-400",
    shadowColor: "hover:shadow-amber-200/50",
  },
  {
    id: "staff" as const,
    email: "staff@1234",
    label: "Staff",
    description: "Task Management & Field Ops",
    icon: Wrench,
    gradient: "from-emerald-600 to-teal-700",
    bgLight: "bg-emerald-50",
    borderColor: "border-emerald-400",
    textColor: "text-emerald-700",
    iconBg: "bg-emerald-100",
    hoverBorder: "hover:border-emerald-400",
    shadowColor: "hover:shadow-emerald-200/50",
  },
  {
    id: "guest" as const,
    email: "guest@1234",
    label: "Guest",
    description: "Concierge & Room Services",
    icon: ConciergeBell,
    gradient: "from-violet-600 to-purple-700",
    bgLight: "bg-violet-50",
    borderColor: "border-violet-400",
    textColor: "text-violet-700",
    iconBg: "bg-violet-100",
    hoverBorder: "hover:border-violet-400",
    shadowColor: "hover:shadow-violet-200/50",
  },
];

export function AuthScreen() {
  const { loginWithGoogle, loading } = useAuth();

  // Form states
  const [email, setEmail] = useState("");
  const [passcode, setPasscode] = useState("");
  const [showPasscode, setShowPasscode] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const passcodeRef = useRef<HTMLInputElement>(null);

  // Fill credentials when clicking a role card (DOES NOT auto-submit)
  const handleSelectRole = (roleEmail: string) => {
    const account = ROLE_ACCOUNTS[roleEmail];
    if (!account) return;
    setSelectedRole(roleEmail);
    setEmail(roleEmail);
    setPasscode(account.password);
    
    toast.info(`Selected ${account.displayName} role`, {
      description: `User ID populated: ${roleEmail}. Click "Sign In" to proceed.`,
      duration: 2500,
    });

    // Focus password field so user has full control
    setTimeout(() => {
      passcodeRef.current?.focus();
    }, 100);
  };

  // Form submission handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const emailTrimmed = email.trim().toLowerCase();
    const passcodeTrimmed = passcode.trim();

    if (!emailTrimmed) {
      toast.error("Required Field", {
        description: "Please enter your User ID (e.g. supervisor@1234).",
      });
      return;
    }
    if (!passcodeTrimmed) {
      toast.error("Required Field", {
        description: "Please enter your passcode (12345).",
      });
      return;
    }

    // Check against hardcoded role accounts
    const account = ROLE_ACCOUNTS[emailTrimmed];

    if (account) {
      if (passcodeTrimmed !== account.password) {
        toast.error("Invalid Passcode", {
          description: "Incorrect password. The demo password is: 12345",
        });
        return;
      }

      // Valid credentials - perform login
      loginWithGoogle(emailTrimmed, account.displayName, account.role);
      return;
    }

    // Unknown account
    toast.error("Account Not Found", {
      description:
        "Please use one of the demo credentials: supervisor@1234, staff@1234, or guest@1234.",
    });
  };

  return (
    <div className="flex min-h-[90vh] items-center justify-center p-4">
      <div className="w-full max-w-md space-y-5">
        {/* Main Login Card */}
        <Card
          className="bg-white border border-[#EBE3D1] rounded-[2rem] p-6 sm:p-8 space-y-6"
          style={{
            boxShadow:
              "0 4px 24px -4px rgba(181,101,47,0.10), 0 12px 40px -8px rgba(0,0,0,0.06)",
          }}
        >
          {/* Header */}
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="relative">
              <span className="flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#B5652F] to-[#8B4513] text-white shadow-lg">
                <Hotel className="size-8" />
              </span>
              <span className="absolute -bottom-1 -right-1 flex size-6 items-center justify-center rounded-full bg-emerald-500 text-white ring-2 ring-white">
                <ShieldCheck className="size-3.5" />
              </span>
            </div>
            <div className="space-y-1.5">
              <h1 className="font-display text-[1.65rem] font-extrabold tracking-[0.15em] text-[#2A2620] uppercase">
                RoomFlow
              </h1>
              <p className="text-[11px] text-[#736B5E] font-medium">
                Hotel Housekeeping & Operations Suite
              </p>
            </div>
          </div>

          {/* Role Presets (Select to fill form) */}
          <div className="space-y-2.5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#736B5E] text-center">
              Select Role to Populate Credentials
            </p>
            <div className="grid grid-cols-3 gap-2.5">
              {ROLE_CARDS.map((role) => {
                const Icon = role.icon;
                const isSelected = selectedRole === role.email;
                return (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() => handleSelectRole(role.email)}
                    disabled={loading}
                    className={`group relative flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all duration-200 cursor-pointer text-center ${
                      isSelected
                        ? "border-[#B5652F] bg-[#B5652F]/10 shadow-sm"
                        : "border-[#EBE3D1] bg-[#F5F1E8]/40 hover:border-[#B5652F]/50 hover:bg-[#F5F1E8]"
                    }`}
                  >
                    <span
                      className={`flex size-9 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-110 ${role.iconBg}`}
                    >
                      <Icon className={`size-4.5 ${role.textColor}`} />
                    </span>
                    <div>
                      <span className="text-xs font-extrabold text-[#2A2620] block">
                        {role.label}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Interactive Form */}
          <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#736B5E] block">
                User ID / Demo Email
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-[#736B5E]">
                  <Mail className="size-4" />
                </span>
                <input
                  type="text"
                  placeholder="e.g. supervisor@1234"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setSelectedRole(null);
                  }}
                  autoComplete="off"
                  className="w-full h-11 pl-10 pr-3 rounded-xl border border-[#E8E2D5] bg-[#F7F5F0] text-xs font-semibold text-[#2A2620] placeholder-[#736B5E]/40 focus:outline-none focus:ring-2 focus:ring-[#B5652F]/30 focus:border-[#B5652F] transition-all"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#736B5E] block">
                  Passcode
                </label>
                <span className="text-[9px] text-[#B5652F] font-bold">Password: 12345</span>
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-[#736B5E]">
                  <Lock className="size-4" />
                </span>
                <input
                  ref={passcodeRef}
                  type={showPasscode ? "text" : "password"}
                  placeholder="Enter passcode (12345)"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  autoComplete="new-password"
                  className="w-full h-11 pl-10 pr-10 rounded-xl border border-[#E8E2D5] bg-[#F7F5F0] text-xs font-semibold text-[#2A2620] placeholder-[#736B5E]/40 focus:outline-none focus:ring-2 focus:ring-[#B5652F]/30 focus:border-[#B5652F] transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPasscode(!showPasscode)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#736B5E]/70 hover:text-[#B5652F] cursor-pointer transition-colors"
                >
                  {showPasscode ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Explicit Sign In Button */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-gradient-to-r from-[#B5652F] to-[#9C5424] hover:from-[#9C5424] hover:to-[#7D4319] text-white font-extrabold text-xs uppercase tracking-widest rounded-xl transition-all shadow-md cursor-pointer gap-2 mt-2"
            >
              {loading ? (
                <RefreshCw className="size-4 animate-spin text-white" />
              ) : (
                <>
                  <span>Sign In to Dashboard</span>
                  <ArrowRight className="size-4" />
                </>
              )}
            </Button>
          </form>
        </Card>

        {/* Demo Credentials Reference Card */}
        <Card
          className="bg-[#FDFCF9] border border-[#EBE3D1] rounded-2xl p-4 space-y-3"
          style={{
            boxShadow: "0 2px 12px -4px rgba(0,0,0,0.04)",
          }}
        >
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#736B5E] text-center flex items-center justify-center gap-1.5">
            <ShieldCheck className="size-3 text-[#B5652F]" />
            Authorized Demo Credentials
          </p>
          <div className="space-y-1.5">
            {ROLE_CARDS.map((role) => (
              <button
                key={role.id}
                type="button"
                onClick={() => handleSelectRole(role.email)}
                disabled={loading}
                className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border border-[#EBE3D1] hover:border-[#B5652F]/40 hover:bg-[#F5F1E8]/50 transition-all duration-200 cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className={`flex size-6 items-center justify-center rounded-lg ${role.iconBg}`}
                  >
                    <role.icon className={`size-3 ${role.textColor}`} />
                  </span>
                  <div className="text-left">
                    <span className="text-[11px] font-bold text-[#2A2620] block leading-tight">
                      {role.email}
                    </span>
                    <span className="text-[9px] text-[#736B5E]">
                      Passcode: 12345 · Opens {role.label}
                    </span>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-[#B5652F] opacity-0 group-hover:opacity-100 transition-opacity">
                  Fill ID →
                </span>
              </button>
            ))}
          </div>
        </Card>

        {/* Footer */}
        <p className="text-[10px] text-center text-[#736B5E]/60 leading-normal">
          By signing in, you agree to RoomFlow's security policy. Sessions are
          encrypted locally.
        </p>
      </div>
    </div>
  );
}
