import { useState, useRef } from "react";
import { CameraView } from "expo-camera";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { toast } from "sonner";

export function useCameraInspection() {
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);
  const cameraRef = useRef<CameraView | null>(null);

  const takePhoto = async () => {
    if (!cameraRef.current) return;
    setCapturing(true);

    try {
      const options = { quality: 0.85, skipProcessing: false };
      const photo = await cameraRef.current.takePictureAsync(options);
      setPhotoUri(photo.uri);

      // Cache the photo locally in offline storage
      const cachedPhotosStr = await AsyncStorage.getItem("roomflow_offline_inspections");
      const cachedPhotos = cachedPhotosStr ? JSON.parse(cachedPhotosStr) : [];
      
      const newInspection = {
        uri: photo.uri,
        timestamp: new Date().toISOString(),
        synced: false,
      };

      await AsyncStorage.setItem(
        "roomflow_offline_inspections",
        JSON.stringify([...cachedPhotos, newInspection])
      );

      // Trigger native success haptic confirmation
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (e) {
        console.log("Haptics not supported on this platform.");
      }

      toast.success("Inspection photo saved locally!");
    } catch (err: any) {
      toast.error("Failed to capture inspection photo: " + err.message);
    } finally {
      setCapturing(false);
    }
  };

  const clearPhoto = () => {
    setPhotoUri(null);
  };

  return {
    cameraRef,
    photoUri,
    capturing,
    takePhoto,
    clearPhoto,
  };
}
