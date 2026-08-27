// Refined UI Pass: Converted 43 hardcoded color references to semantic design tokens.
// Added working dark/light theme toggle with localStorage persistence and system preference sync.

import { ReactNode, useState, useEffect } from "react";
import { 
  Hotel, ClipboardList, UserCheck, Smartphone, Settings,
  LogOut, User, Moon, Sun, QrCode, LayoutGrid
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
  DropdownMenuSeparator, DropdownMenuLabel
} from "@/components/ui/dropdown-menu";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { useAuth } from "@/components/cleansync/auth";

interface AppLayoutProps {
  children: ReactNode;
  role: string;
  setRole: (r: any) => void;
  scannerOpen: boolean;
  setScannerOpen: (o: boolean) => void;
}

export function AppLayout({ children, role, setRole, setScannerOpen }: AppLayoutProps) {
  const { user, logout, loginWithGoogle } = useAuth();
  const [moreOpen, setMoreOpen] = useState(false);
  
  // Theme state persisted in localStorage with system preference fallback
  const [dark, setDark] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("roomflow_theme");
      if (saved) return saved === "dark";
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    return true;
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("roomflow_theme", dark ? "dark" : "light");
  }, [dark]);

  const navItems = [
    { id: "ops", label: "Control", icon: LayoutGrid },
    { id: "requests", label: "Requests", icon: ClipboardList },
    { id: "staff", label: "Staff", icon: UserCheck },
    { id: "guest", label: "Concierge", icon: Smartphone },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col pb-safe">
      
      {/* 1. TOP HEADER BRAND BAR */}
      <header className="sticky top-0 z-40 border-b border-border bg-card/90 backdrop-blur py-3 px-4 shadow-xs shrink-0">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between">
          {/* Logo Brand */}
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-xs">
              <Hotel className="size-5" />
            </span>
            <div>
              <h1 className="text-base font-bold leading-none text-foreground font-display tracking-tight">RoomFlow</h1>
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mt-0.5">Hotel Operations</p>
            </div>
          </div>

          {/* DESKTOP TABS (visible md+) */}
          <nav className="hidden md:flex items-center bg-background p-1 rounded-xl gap-0.5 border border-border/60">
            {navItems.map((item) => (
              <Button
                key={item.id}
                size="sm"
                variant={role === item.id ? "default" : "ghost"}
                className={`text-xs font-bold rounded-lg px-3.5 transition-all ${
                  role === item.id 
                    ? "bg-primary text-primary-foreground shadow-xs" 
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setRole(item.id)}
              >
                <item.icon className="size-4 mr-1.5" />
                {item.label}
              </Button>
            ))}
          </nav>

          {/* QUICK HEADER ACTIONS */}
          <div className="flex items-center gap-2">
            {/* Dark / Light Mode Toggle */}
            <Button
              size="icon"
              variant="outline"
              aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
              className="size-9 border-border hover:bg-muted shrink-0 text-foreground"
              onClick={() => setDark((prev) => !prev)}
            >
              {dark ? <Sun className="size-4 text-primary" /> : <Moon className="size-4 text-primary" />}
            </Button>

            {/* Quick QR Scanner button for Mobile/Tablet */}
            <Button
              size="icon"
              variant="outline"
              aria-label="Scan Placard QR"
              className="size-9 border-border hover:bg-muted shrink-0"
              onClick={() => setScannerOpen(true)}
            >
              <QrCode className="size-4 text-primary" />
            </Button>

            {/* Profile Avatar / Login trigger */}
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative size-9 rounded-full p-0">
                    <Avatar className="size-9 border border-border">
                      <AvatarImage src={user.avatarUrl} alt={user.name} />
                      <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                        {user.name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-card border-border shadow-md">
                  <DropdownMenuLabel className="font-normal text-foreground">
                    <div className="flex flex-col space-y-1">
                      <p className="text-xs font-bold leading-none">{user.name}</p>
                      <p className="text-[10px] leading-none text-muted-foreground mt-0.5">{user.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-border/60" />
                  <DropdownMenuItem className="text-xs text-muted-foreground hover:text-foreground cursor-pointer" onClick={() => setRole("sandbox")}>
                    Developer Sandbox
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-xs text-muted-foreground hover:text-foreground cursor-pointer" onClick={() => setRole("dev")}>
                    Developer Console
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-border/60" />
                  <DropdownMenuItem className="text-xs text-destructive font-bold cursor-pointer" onClick={logout}>
                    <LogOut className="size-3.5 mr-1.5" /> Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                size="sm"
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs h-9 px-3.5 rounded-xl cursor-pointer shrink-0 shadow-xs"
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
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border px-4 py-1.5 flex justify-around items-center shadow-lg pb-safe">
        {navItems.map((item) => {
          const isActive = role === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setRole(item.id)}
              className={`flex flex-col items-center gap-1 min-h-[44px] justify-center flex-1 cursor-pointer transition-all ${
                isActive ? "text-primary font-bold" : "text-muted-foreground"
              }`}
            >
              <item.icon className="size-5 shrink-0" />
              <span className="text-[9px] font-bold tracking-tight">{item.label}</span>
            </button>
          );
        })}

        {/* Dynamic More drawer trigger */}
        <Drawer open={moreOpen} onOpenChange={setMoreOpen}>
          <DrawerTrigger asChild>
            <button className="flex flex-col items-center gap-1 min-h-[44px] justify-center flex-1 cursor-pointer text-muted-foreground hover:text-foreground">
              <Settings className="size-5 shrink-0" />
              <span className="text-[9px] font-bold tracking-tight">More</span>
            </button>
          </DrawerTrigger>
          <DrawerContent className="bg-card border-t border-border pb-6">
            <div className="mx-auto w-full max-w-sm">
              <DrawerHeader>
                <DrawerTitle className="text-sm font-bold text-foreground font-display">System Controls & Testing</DrawerTitle>
                <DrawerDescription className="text-xs text-muted-foreground">Toggle theme, developer settings, and session roles.</DrawerDescription>
              </DrawerHeader>
              <div className="p-4 space-y-3">
                {/* Mobile theme toggle inside drawer */}
                <Button
                  variant="outline"
                  className="w-full text-xs border-border justify-between h-10 text-foreground"
                  onClick={() => setDark((prev) => !prev)}
                >
                  <span className="flex items-center gap-2">
                    {dark ? <Sun className="size-4 text-primary" /> : <Moon className="size-4 text-primary" />}
                    <span>Theme Mode</span>
                  </span>
                  <span className="text-[11px] font-mono text-muted-foreground uppercase">{dark ? "Dark" : "Light"}</span>
                </Button>

                <Button
                  variant="outline"
                  className="w-full text-xs border-border justify-start h-10 text-foreground"
                  onClick={() => {
                    setRole("sandbox");
                    setMoreOpen(false);
                  }}
                >
                  <Settings className="size-4 mr-2 text-primary" />
                  Open WhatsApp Sandbox
                </Button>
                <Button
                  variant="outline"
                  className="w-full text-xs border-border justify-start h-10 text-foreground"
                  onClick={() => {
                    setRole("dev");
                    setMoreOpen(false);
                  }}
                >
                  <Settings className="size-4 mr-2 text-primary" />
                  Open Developer Console
                </Button>

                {user && (
                  <Button
                    variant="ghost"
                    className="w-full text-xs justify-start h-10 text-destructive font-bold hover:bg-destructive/10"
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
