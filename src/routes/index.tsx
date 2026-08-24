import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Hotel, LayoutGrid, Radar, Smartphone, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { CleanSyncProvider } from "@/components/cleansync/store";
import { KpiBar } from "@/components/cleansync/KpiBar";
import { OperationsView } from "@/components/cleansync/OperationsView";
import { SupervisorView } from "@/components/cleansync/SupervisorView";
import { HousekeeperView } from "@/components/cleansync/HousekeeperView";

const title = "CleanSync AI — Hotel Housekeeping Turnaround Platform";
const description =
  "Real-time hotel operations command center: live room readiness matrix, AI dispatch optimization, inspection queue and housekeeper mobile tasking.";

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

const roles = [
  { id: "ops", label: "Front Desk & Operations", icon: LayoutGrid },
  { id: "supervisor", label: "Floor Supervisor & Dispatch", icon: Radar },
  { id: "housekeeper", label: "Housekeeper Mobile", icon: Smartphone },
] as const;

function Index() {
  const [role, setRole] = useState<(typeof roles)[number]["id"]>("ops");
  const [dark, setDark] = useState(true);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  return (
    <CleanSyncProvider>
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
          <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-4 px-4 py-3 sm:px-6">
            <div className="flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-xl exec-gradient">
                <Hotel className="size-5 text-primary-foreground" />
              </span>
              <div>
                <h1 className="text-lg font-semibold leading-none">CleanSync AI</h1>
                <p className="text-xs text-muted-foreground">Turnaround Optimization Suite</p>
              </div>
            </div>

            <nav className="order-3 flex w-full gap-1 rounded-xl bg-surface p-1 lg:order-none lg:ml-auto lg:w-auto">
              {roles.map((r) => (
                <Button
                  key={r.id}
                  size="sm"
                  variant={role === r.id ? "default" : "ghost"}
                  className="flex-1 lg:flex-none"
                  onClick={() => setRole(r.id)}
                >
                  <r.icon />
                  <span className="hidden sm:inline">{r.label}</span>
                </Button>
              ))}
            </nav>

            <Button
              size="icon"
              variant="outline"
              className="ml-auto lg:ml-0"
              aria-label="Toggle theme"
              onClick={() => setDark((d) => !d)}
            >
              {dark ? <Sun /> : <Moon />}
            </Button>
          </div>
        </header>

        <main className="mx-auto max-w-[1600px] space-y-6 px-4 py-6 sm:px-6">
          <KpiBar />
          {role === "ops" && <OperationsView />}
          {role === "supervisor" && <SupervisorView />}
          {role === "housekeeper" && <HousekeeperView />}
        </main>
      </div>
      <Toaster position="top-right" richColors />
    </CleanSyncProvider>
  );
}
