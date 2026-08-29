import { useState, useEffect } from "react";
import { useCameraPermissions } from "expo-camera";
import * as Haptics from "expo-haptics";
import { Alert } from "react-native";

export function useNativeQRScanner() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(false);

  const startScan = async () => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert("Permission Required", "Camera permissions required to scan QR codes.");
        return;
      }
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
    hasPermission: permission?.granted ?? null,
    scanning,
    setScanning,
    startScan,
    handleBarCodeScanned,
  };
}
