import { useState, useEffect } from "react";
import { Camera } from "expo-camera";
import * as Haptics from "expo-haptics";
import { toast } from "sonner"; // For web fallback / simulated mode notifications

export function useNativeQRScanner() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === "granted");
    })();
  }, []);

  const startScan = () => {
    if (!hasPermission) {
      toast.error("Camera permissions required to scan QR codes.");
      return;
    }
    setScanning(true);
  };

  const handleBarCodeScanned = async ({ type, data }: { type: string; data: string }) => {
    setScanning(false);
    
    // Trigger native light haptic impact on success
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {
      console.log("Haptics not supported on this platform.");
    }

    // Process scanned room QR code payload (e.g. "room:203" or a URL)
    let roomNum = data;
    if (data.includes("room=")) {
      const parts = data.split("room=");
      roomNum = parts[1] || data;
    }

    return roomNum;
  };

  return {
    hasPermission,
    scanning,
    setScanning,
    startScan,
    handleBarCodeScanned,
  };
}
