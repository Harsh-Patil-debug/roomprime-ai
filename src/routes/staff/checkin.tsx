import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth, AuthProvider } from "@/components/cleansync/auth";
import { RoomFlowProvider, useRoomFlow } from "@/components/cleansync/store";
import { StaffDashboard } from "@/components/cleansync/StaffDashboard";
import { toast } from "sonner";
import { Loader2, Shield } from "lucide-react";

type CheckinSearch = {
  room?: string | undefined;
};

export const Route = createFileRoute("/staff/checkin")({
  validateSearch: (search: Record<string, unknown>): CheckinSearch => {
    return {
      room: search["room"] ? String(search["room"]) : undefined,
    };
  },
  component: StaffCheckinRoute,
});

function StaffCheckinRoute() {
  return (
    <AuthProvider>
      <RoomFlowProvider>
        <StaffCheckinContent />
      </RoomFlowProvider>
    </AuthProvider>
  );
}

function StaffCheckinContent() {
  const { user, loading, loginWithGoogle } = useAuth();
  const { rooms, assignRoom, setRoomStatus } = useRoomFlow();
  const searchParams = Route.useSearch();
  const roomNum = searchParams.room;

  useEffect(() => {
    if (loading) return;

    if (!user) {
      // Save deep link redirect parameters to localStorage
      const targetPath = `/staff/checkin?room=${roomNum || ""}`;
      localStorage.setItem("roomflow_redirect_to", targetPath);
      toast.info("Housekeeping authentication required. Redirecting to Google Login...");
      loginWithGoogle();
      return;
    }

    // Trigger check-in operations if room is specified
    if (roomNum && rooms.length > 0) {
      const targetRoom = rooms.find((r) => r.number === roomNum);
      if (targetRoom) {
        // Automatically assign housekeeper to the room
        if (targetRoom.assignedStaff !== user.name) {
          assignRoom(targetRoom.id, user.name);
          toast.success(`Assigned Room ${roomNum} to you (${user.name}).`);
        }
        // Set room cleaning turnaround status to "Cleaning in Progress"
        if (targetRoom.status !== "Cleaning in Progress" && targetRoom.status !== "Inspection Pending") {
          setRoomStatus(targetRoom.id, "Cleaning in Progress");
          toast.success(`Turn started for Room ${roomNum}! stopwatch active.`);
        }
      }
    }
  }, [user, loading, roomNum, rooms]);

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-[#ECECDC] dark:bg-[#09332C] flex flex-col items-center justify-center gap-3">
        <Loader2 className="size-8 text-[#09332C] dark:text-[#A0C9CB] animate-spin" />
        <span className="text-sm font-semibold text-[#5C6E6A] dark:text-[#A0C9CB]">Authenticating cleaner check-in...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#ECECDC] dark:bg-[#09332C] p-4 text-[#09332C] dark:text-[#ECECDC]">
      {/* Small Header Banner */}
      <header className="mb-4 max-w-[1600px] mx-auto flex items-center justify-between border-b border-[#D2D2BC] dark:border-[#185E52] pb-3">
        <div className="flex items-center gap-2">
          <Shield className="size-5 text-[#FF6037] dark:text-[#A0C9CB]" />
          <div>
            <h1 className="text-base font-bold text-[#09332C] dark:text-[#ECECDC]">Staff Portal</h1>
            <p className="text-[10px] text-[#5C6E6A] dark:text-[#A0C9CB]">Secure Check-in Workspace</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px]">
        <StaffDashboard />
      </main>
    </div>
  );
}
