import { ReactNode, useState } from "react";
import { 
  Hotel, ClipboardList, UserCheck, Smartphone, Settings,
  LogOut, User, Moon, Sun, QrCode, MoreHorizontal, LayoutGrid
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

interface AppLayoutProps {
  children: ReactNode;
  role: string;
  setRole: (r: any) => void;
  scannerOpen: boolean;
  setScannerOpen: (o: boolean) => void;
}

export function AppLayout({ children, role, setRole, scannerOpen, setScannerOpen }: AppLayoutProps) {
  const { user, logout, loginWithGoogle } = useAuth();
  const [moreOpen, setMoreOpen] = useState(false);
  const [dark, setDark] = useState(true);

  const getRoleLabel = (r: string) => {
    if (r === "ops") return "Supervisor";
    if (r === "requests") return "Front Desk";
    if (r === "staff") return "Field Staff";
    if (r === "guest") return "Guest Portal";
    return r;
  };

  const navItems = [
    { id: "ops", label: "Control", icon: LayoutGrid },
    { id: "requests", label: "Requests", icon: ClipboardList },
    { id: "staff", label: "Staff", icon: UserCheck },
    { id: "guest", label: "Concierge", icon: Smartphone },
  ];

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

          {/* DESKTOP TABS (visible md+) */}
          <nav className="hidden md:flex items-center bg-[#F5F1E8] p-1 rounded-xl gap-0.5 border border-[#EBE3D1]/60">
            {navItems.map((item) => (
              <Button
                key={item.id}
                size="sm"
                variant={role === item.id ? "default" : "ghost"}
                className={`text-xs font-bold rounded-lg px-3.5 transition-all ${role === item.id ? "bg-[#B5652F] text-white shadow-sm" : "text-[#736B5E] hover:text-[#2A2620]"}`}
                onClick={() => setRole(item.id)}
              >
                <item.icon className="size-4 mr-1.5" />
                {item.label}
              </Button>
            ))}
          </nav>

          {/* QUICK HEADER ACTIONS */}
          <div className="flex items-center gap-2">
            {/* Quick QR Scanner button for Mobile/Tablet */}
            <Button
              size="icon"
              variant="outline"
              aria-label="Scan Placard QR"
              className="size-9 border-[#EBE3D1] hover:bg-[#F5F1E8] shrink-0"
              onClick={() => setScannerOpen(true)}
            >
              <QrCode className="size-4.5 text-[#B5652F]" />
            </Button>

            {/* Profile Avatar / Login trigger */}
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative size-9 rounded-full p-0">
                    <Avatar className="size-9 border border-[#EBE3D1]">
                      <AvatarImage src={user.avatarUrl} alt={user.name} />
                      <AvatarFallback className="bg-[#B5652F]/10 text-[#B5652F] font-bold text-xs">{user.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-white border-[#EBE3D1]">
                  <DropdownMenuLabel className="font-normal text-[#2A2620]">
                    <div className="flex flex-col space-y-1">
                      <p className="text-xs font-bold leading-none">{user.name}</p>
                      <p className="text-[10px] leading-none text-[#736B5E] mt-0.5">{user.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-[#F5F1E8]" />
                  <DropdownMenuItem className="text-xs text-[#736B5E] cursor-pointer" onClick={() => setRole("sandbox")}>
                    Developer Sandbox
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-xs text-[#736B5E] cursor-pointer" onClick={() => setRole("dev")}>
                    Developer Console
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-[#F5F1E8]" />
                  <DropdownMenuItem className="text-xs text-[#B14A3E] font-bold cursor-pointer" onClick={logout}>
                    <LogOut className="size-3.5 mr-1.5" /> Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                size="sm"
                className="bg-[#B5652F] hover:bg-[#B5652F]/90 text-white font-semibold text-xs h-9 px-3.5 rounded-xl cursor-pointer shrink-0"
                onClick={loginWithGoogle}
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
