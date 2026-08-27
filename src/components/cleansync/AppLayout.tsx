import { ReactNode, useState } from "react";
import { 
  Hotel, ClipboardList, UserCheck, Smartphone, Settings,
  LogOut, User, Moon, Sun, QrCode, MoreHorizontal, LayoutGrid,
  Bell, Shield, ChevronDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
  DropdownMenuSeparator, DropdownMenuLabel
} from "@/components/ui/dropdown-menu";
import { Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { useAuth } from "@/components/cleansync/auth";
import { toast } from "sonner";
import { useRouter } from "@tanstack/react-router";

interface AppLayoutProps {
  children: ReactNode;
  role: string;
  setRole: (r: any) => void;
  scannerOpen: boolean;
  setScannerOpen: (o: boolean) => void;
}
export function AppLayout({ children, role, setRole, scannerOpen, setScannerOpen }: AppLayoutProps) {
  const { user, logout, loginWithGoogle, updateUserRole } = useAuth();
  const router = useRouter();
  const [moreOpen, setMoreOpen] = useState(false);
  const [dark, setDark] = useState(true);
  const [unreadCount, setUnreadCount] = useState(3);

  const getRoleLabel = (r: string) => {
    if (r === "ops") return "Supervisor";
    if (r === "requests") return "Front Desk";
    if (r === "staff") return "Field Staff";
    if (r === "guest") return "Guest Portal";
    if (r === "sandbox") return "Dev Sandbox";
    if (r === "dev") return "Dev Console";
    return r;
  };

  const handleRoleSwitch = async (newRole: "ops" | "requests" | "staff" | "guest") => {
    if (user) {
      await updateUserRole(newRole);
    }
    setRole(newRole);

    if (newRole === "ops" || newRole === "requests") {
      router.navigate({ to: "/control" });
    } else if (newRole === "staff") {
      router.navigate({ to: "/staff" });
    } else if (newRole === "guest") {
      router.navigate({ to: "/concierge", search: { room: "203" } });
    }
  };

  const navItems = [
    { id: "ops", label: "Control", icon: LayoutGrid },
    { id: "requests", label: "Requests", icon: ClipboardList },
    { id: "staff", label: "Staff", icon: UserCheck },
    { id: "guest", label: "Concierge", icon: Smartphone },
  ];

  const handleThemeToggle = () => {
    const nextDark = !dark;
    setDark(nextDark);
    document.documentElement.classList.toggle("dark", nextDark);
  };

  return (
    <div className="min-h-screen bg-[#F5F1E8] text-[#2A2620] flex flex-col pb-safe">
      {/* 1. TOP HEADER BRAND BAR */}
      <header className="sticky top-0 z-40 border-b border-[#EBE3D1] bg-white/90 backdrop-blur py-3 px-4 shadow-sm shrink-0">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between">
          {/* Logo Brand */}
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-xl bg-[#B5652F] text-white">
              <Hotel className="size-5" />
            </span>
            <div>
              <h1 className="text-base font-bold leading-none text-[#2A2620] tracking-tight">RoomFlow</h1>
              <p className="text-[10px] text-[#736B5E] font-medium uppercase tracking-wider mt-0.5">Hotel Operations</p>
            </div>
          </div>

          {/* FLOATING DEMO PERSONA SWITCHER PILL */}
          <div className="flex items-center bg-[#B5652F]/10 border border-[#B5652F]/20 p-0.5 rounded-full gap-0.5 shadow-sm select-none">
            <span className="hidden sm:inline-block text-[9px] font-black text-[#B5652F] uppercase tracking-wider px-2 border-r border-[#B5652F]/20">
              Demo Switcher
            </span>
            <Button
              size="sm"
              variant="ghost"
              className={`h-7 text-[10px] font-extrabold rounded-full px-2.5 py-0 transition-all cursor-pointer ${
                role === "ops" || role === "requests" 
                  ? "bg-[#B5652F] text-white shadow-sm hover:bg-[#B5652F]" 
                  : "text-[#736B5E] hover:text-[#2A2620] hover:bg-[#B5652F]/5"
              }`}
              onClick={() => handleRoleSwitch("ops")}
            >
              👑 Supervisor
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className={`h-7 text-[10px] font-extrabold rounded-full px-2.5 py-0 transition-all cursor-pointer ${
                role === "staff" 
                  ? "bg-[#B5652F] text-white shadow-sm hover:bg-[#B5652F]" 
                  : "text-[#736B5E] hover:text-[#2A2620] hover:bg-[#B5652F]/5"
              }`}
              onClick={() => handleRoleSwitch("staff")}
            >
              🧹 Staff
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className={`h-7 text-[10px] font-extrabold rounded-full px-2.5 py-0 transition-all cursor-pointer ${
                role === "guest" 
                  ? "bg-[#B5652F] text-white shadow-sm hover:bg-[#B5652F]" 
                  : "text-[#736B5E] hover:text-[#2A2620] hover:bg-[#B5652F]/5"
              }`}
              onClick={() => handleRoleSwitch("guest")}
            >
              🛎 Guest
            </Button>
          </div>

          {/* QUICK HEADER ACTIONS */}
          <div className="flex items-center gap-3">
            
            {/* Quick Role switcher */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-9 px-3 border-[#EBE3D1] bg-[#F5F1E8]/50 hover:bg-[#EBE3D1]/40 text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shrink-0 select-none"
                >
                  <Shield className="size-3.5 text-[#B5652F]" />
                  <span>{getRoleLabel(role)}</span>
                  <ChevronDown className="size-3 text-[#736B5E]" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-white border-[#EBE3D1] w-48 text-xs font-semibold p-1 rounded-xl shadow-md">
                <DropdownMenuItem className="cursor-pointer text-[#2A2620] hover:bg-[#F5F1E8] rounded-lg py-2" onClick={() => handleRoleSwitch("ops")}>
                  👑 Supervisor Mode
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer text-[#2A2620] hover:bg-[#F5F1E8] rounded-lg py-2" onClick={() => handleRoleSwitch("staff")}>
                  🧹 Staff / Housekeeper
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer text-[#2A2620] hover:bg-[#F5F1E8] rounded-lg py-2" onClick={() => handleRoleSwitch("requests")}>
                  🛎 Front Desk Requests
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Notification Center Bell */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="relative size-9 border-[#EBE3D1] hover:bg-[#F5F1E8] shrink-0 rounded-xl cursor-pointer"
                >
                  <Bell className="size-4.5 text-[#B5652F]" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex size-4.5 items-center justify-center rounded-full bg-[#B14A3E] text-[8px] font-black text-white animate-pulse">
                      {unreadCount}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80 bg-white border-[#EBE3D1] p-3.5 space-y-3 shadow-md rounded-2xl">
                <div className="flex items-center justify-between border-b border-[#F5F1E8] pb-2 select-none">
                  <span className="font-extrabold text-xs text-[#2A2620] uppercase tracking-wider">Notification Center</span>
                  {unreadCount > 0 && (
                    <button
                      onClick={() => {
                        setUnreadCount(0);
                        toast.success("All notifications cleared");
                      }}
                      className="text-[10px] font-bold text-[#B14A3E] hover:underline cursor-pointer"
                    >
                      Clear All
                    </button>
                  )}
                </div>

                {unreadCount > 0 ? (
                  <div className="space-y-3">
                    {/* Urgent Alerts Section */}
                    <div className="space-y-1.5">
                      <span className="text-[9px] font-black uppercase text-[#B14A3E] tracking-wider block">⚠️ Urgent Alerts</span>
                      <div className="space-y-1.5">
                        <div className="p-2.5 bg-[#B14A3E]/5 border border-[#B14A3E]/10 rounded-xl text-[11px] text-[#2A2620] leading-normal flex items-start gap-2">
                          <span className="inline-block size-1.5 rounded-full bg-[#B14A3E] mt-1.5 shrink-0" />
                          <div>
                            <strong>Room 105:</strong> AC thermostat unresponsive ticket logged.
                          </div>
                        </div>
                        <div className="p-2.5 bg-[#B14A3E]/5 border border-[#B14A3E]/10 rounded-xl text-[11px] text-[#2A2620] leading-normal flex items-start gap-2">
                          <span className="inline-block size-1.5 rounded-full bg-[#B14A3E] mt-1.5 shrink-0" />
                          <div>
                            <strong>Room 104:</strong> AI staging inspection review flagged defects (Rumpled Linens).
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Recent Updates Section */}
                    <div className="space-y-1.5 border-t border-[#F5F1E8] pt-2.5">
                      <span className="text-[9px] font-black uppercase text-[#8A9A6B] tracking-wider block">✅ Recent Updates</span>
                      <div className="p-2.5 bg-[#8A9A6B]/5 border border-[#8A9A6B]/10 rounded-xl text-[11px] text-[#2A2620] leading-normal flex items-start gap-2">
                        <span className="inline-block size-1.5 rounded-full bg-[#8A9A6B] mt-1.5 shrink-0" />
                        <div>
                          <strong>Priya Raman:</strong> Marked Room 101 cleaning completed.
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6 text-xs text-[#736B5E] italic select-none">
                    No unread notifications.
                  </div>
                )}

                <div className="border-t border-[#F5F1E8] pt-2 flex justify-center select-none">
                  <button
                    onClick={() => {
                      setRole("requests");
                      toast.info("Switched to Requests Dashboard queue");
                    }}
                    className="text-[10px] font-bold text-[#B5652F] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    View Requests Queue →
                  </button>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Profile Avatar / Login trigger */}
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative size-9 rounded-full p-0">
                    <Avatar className="size-9 border border-[#EBE3D1]">
                      <AvatarImage src={user.avatarUrl} alt={user.name} />
                      <AvatarFallback className="bg-[#B5652F]/10 text-[#B5652F] font-bold text-xs">{user.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    {/* Active green status indicator dot */}
                    <span className="absolute bottom-0 right-0 block size-2.5 rounded-full bg-[#8A9A6B] border-2 border-white" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-white border-[#EBE3D1] rounded-2xl p-1 shadow-md">
                  <DropdownMenuLabel className="font-normal text-[#2A2620] p-2.5 select-none">
                    <div className="flex flex-col space-y-1">
                      <p className="text-xs font-bold leading-none">{user.name}</p>
                      <p className="text-[10px] leading-none text-[#736B5E] mt-0.5">{user.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-[#F5F1E8]" />
                  <DropdownMenuItem className="text-xs text-[#736B5E] cursor-pointer rounded-lg py-2" onClick={() => setRole("sandbox")}>
                    Developer Sandbox
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-xs text-[#736B5E] cursor-pointer rounded-lg py-2" onClick={() => setRole("dev")}>
                    Developer Console
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-[#F5F1E8]" />
                  <DropdownMenuItem 
                    className="text-xs text-[#736B5E] cursor-pointer rounded-lg py-2 flex items-center justify-between"
                    onClick={handleThemeToggle}
                  >
                    <span>Theme Preference</span>
                    {dark ? <Moon className="size-3.5" /> : <Sun className="size-3.5" />}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-[#F5F1E8]" />
                  <DropdownMenuItem className="text-xs text-[#B14A3E] font-bold cursor-pointer rounded-lg py-2" onClick={logout}>
                    <LogOut className="size-3.5 mr-1.5" /> Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                size="sm"
                className="bg-[#B5652F] hover:bg-[#B5652F]/90 text-white font-semibold text-xs h-9 px-3.5 rounded-xl cursor-pointer shrink-0"
                onClick={() => loginWithGoogle()}
              >
                <User className="size-3.5 mr-1.5" />
                Sign In
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* 2. MAIN VIEWPORT */}
      <main className="flex-1 overflow-y-auto px-4 py-4 md:py-6 md:px-6 max-w-[1600px] mx-auto w-full pb-20 md:pb-6">
        {children}
      </main>

      {/* 3. MOBILE STICKY BOTTOM TABS NAV (< 768px) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-[#EBE3D1] px-4 py-1.5 flex justify-around items-center shadow-lg pb-safe">
        {navItems.map((item) => {
          const isActive = role === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setRole(item.id)}
              className={`flex flex-col items-center gap-1 min-h-[44px] justify-center flex-1 cursor-pointer transition-all ${isActive ? "text-[#B5652F]" : "text-[#736B5E]"}`}
            >
              <item.icon className="size-5 shrink-0" />
              <span className="text-[9px] font-bold tracking-tight">{item.label}</span>
            </button>
          );
        })}

        {/* Dynamic More drawer trigger */}
        <Drawer open={moreOpen} onOpenChange={setMoreOpen}>
          <DrawerTrigger asChild>
            <button className="flex flex-col items-center gap-1 min-h-[44px] justify-center flex-1 cursor-pointer text-[#736B5E] hover:text-[#2A2620]">
              <Settings className="size-5 shrink-0" />
              <span className="text-[9px] font-bold tracking-tight">More</span>
            </button>
          </DrawerTrigger>
          <DrawerContent className="bg-white border-t border-[#EBE3D1] pb-6">
            <div className="mx-auto w-full max-w-sm">
              <DrawerHeader>
                <DrawerTitle className="text-sm font-bold text-[#2A2620] font-display">System Controls & Testing</DrawerTitle>
                <DrawerDescription className="text-xs text-[#736B5E]">Toggle developer settings and manage session roles.</DrawerDescription>
              </DrawerHeader>
              <div className="p-4 space-y-3">
                <Button
                  variant="outline"
                  className="w-full text-xs border-[#EBE3D1] justify-start h-10 text-[#2A2620]"
                  onClick={() => {
                    setRole("sandbox");
                    setMoreOpen(false);
                  }}
                >
                  <Settings className="size-4 mr-2 text-[#B5652F]" />
                  Open WhatsApp Sandbox
                </Button>
                <Button
                  variant="outline"
                  className="w-full text-xs border-[#EBE3D1] justify-start h-10 text-[#2A2620]"
                  onClick={() => {
                    setRole("dev");
                    setMoreOpen(false);
                  }}
                >
                  <Settings className="size-4 mr-2 text-[#B5652F]" />
                  Open Developer Console
                </Button>

                {user && (
                  <Button
                    variant="ghost"
                    className="w-full text-xs justify-start h-10 text-[#B14A3E] font-bold hover:bg-[#B14A3E]/5"
                    onClick={() => {
                      logout();
                      setMoreOpen(false);
                    }}
                  >
                    <LogOut className="size-4 mr-2" />
                    Sign Out ({user.name})
                  </Button>
                )}
              </div>
            </div>
          </DrawerContent>
        </Drawer>
      </nav>
    </div>
  );
}
