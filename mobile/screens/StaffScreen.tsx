import React, { useState, useEffect } from "react";
import { ScrollView, Text, View, StyleSheet, TouchableOpacity, ActivityIndicator, Image, Alert } from "react-native";
import { CameraView } from "expo-camera";
import { useNativeQRScanner } from "../hooks/useNativeQRScanner";
import { useCameraInspection } from "../hooks/useCameraInspection";
import * as Haptics from "expo-haptics";
import { Sparkles, CheckCircle2, Circle, Camera as CameraIcon, Scan, Clock } from "lucide-react-native";

export function StaffScreen() {
  const { scanning, setScanning, startScan, handleBarCodeScanned } = useNativeQRScanner();
  const { cameraRef, photoUri, capturing, takePhoto, clearPhoto } = useCameraInspection();
  const [activeRoom, setActiveRoom] = useState<string | null>("203");
  const [cameraOpen, setCameraOpen] = useState(false);

  // 4-step checklist state
  const [checklist, setChecklist] = useState([
    { id: 1, text: "Strip linens and prepare fresh guest bedding", checked: false },
    { id: 2, text: "Dust surfaces, vacuum carpet & empty waste bins", checked: false },
    { id: 3, text: "Disinfect washroom, replenish luxury towels & soaps", checked: false },
    { id: 4, text: "Verify minibar inventory and tea/coffee items", checked: false },
  ]);

  const handleToggleCheck = async (id: number) => {
    // Trigger native light haptic impact on checklist item toggle
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {
      console.log("Haptics not supported.");
    }

    setChecklist(prev => 
      prev.map(item => item.id === id ? { ...item, checked: !item.checked } : item)
    );
  };

  const allChecked = checklist.every(item => item.checked);

  const handleScanSuccess = async (result: any) => {
    const roomNum = await handleBarCodeScanned(result);
    if (roomNum) {
      setActiveRoom(roomNum);
      Alert.alert("Success", `Checked into Room ${roomNum}!`);
      
      // Reset checklist
      setChecklist(prev => prev.map(item => ({ ...item, checked: false })));
      clearPhoto();
    }
  };

  const handleStageInspection = () => {
    if (!allChecked) {
      Alert.alert("Error", "Please complete all checklist items before inspection.");
      return;
    }
    setCameraOpen(true);
  };

  const handleCameraCapture = async () => {
    await takePhoto();
    setCameraOpen(false);
  };

  if (scanning) {
    return (
      <View style={styles.fullscreenContainer}>
        <CameraView 
          style={StyleSheet.absoluteFill} 
          onBarcodeScanned={handleScanSuccess}
        />
        <View style={styles.overlay}>
          <Text style={styles.overlayText}>Scan Room QR Code to Check In</Text>
          <TouchableOpacity style={styles.cancelButton} onPress={() => setScanning(false)}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (cameraOpen) {
    return (
      <View style={styles.fullscreenContainer}>
        <CameraView 
          style={StyleSheet.absoluteFill} 
          ref={(ref: CameraView | null) => {
            if (cameraRef) {
              cameraRef.current = ref;
            }
          }}
        />
        <View style={styles.overlay}>
          <Text style={styles.overlayText}>Staging Inspection Photograph</Text>
          <View style={styles.cameraActions}>
            <TouchableOpacity style={styles.cancelButton} onPress={() => setCameraOpen(false)}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.captureBtn} onPress={handleCameraCapture} disabled={capturing}>
              {capturing ? <ActivityIndicator color="#FFFFFF" /> : <CameraIcon size={24} color="#FFFFFF" />}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      
      {/* Active Room Summary */}
      <View style={styles.roomSummaryCard}>
        <View style={styles.summaryHeader}>
          <Text style={styles.roomNumTitle}>Room {activeRoom || "Not Checked In"}</Text>
          <TouchableOpacity style={styles.scanBtn} onPress={startScan}>
            <Scan size={14} color="#FFFFFF" />
            <Text style={styles.scanBtnText}>Scan QR</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.timerRow}>
          <Clock size={14} color="#B5652F" />
          <Text style={styles.timerLabel}>Cleaning Stopwatch:</Text>
          <Text style={styles.timerValue}>22 mins elapsed</Text>
        </View>
      </View>

      {/* Housekeeping Checklist Card */}
      <View style={styles.checklistCard}>
        <Text style={styles.cardTitle}>SOP HOUSEKEEPING CHECKLIST</Text>
        
        <View style={styles.checklistList}>
          {checklist.map((item) => (
            <TouchableOpacity 
              key={item.id} 
              style={styles.checkItem}
              onPress={() => handleToggleCheck(item.id)}
            >
              {item.checked ? (
                <CheckCircle2 size={22} color="#8A9A6B" />
              ) : (
                <Circle size={22} color="#EBE3D1" />
              )}
              <Text style={[styles.checkItemText, item.checked && styles.checkedItemText]}>
                {item.text}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Completion Progress Bar */}
        <View style={styles.progressRow}>
          <View style={styles.progressBarBg}>
            <View 
              style={[
                styles.progressBarFill, 
                { width: `${(checklist.filter(i => i.checked).length / checklist.length) * 100}%` }
              ]} 
            />
          </View>
          <Text style={styles.progressText}>
            {checklist.filter(i => i.checked).length} of {checklist.length} completed
          </Text>
        </View>
      </View>

      {/* Photo Verification Staging */}
      {allChecked && (
        <View style={styles.checklistCard}>
          <Text style={styles.cardTitle}>AI QA INSPECTION STAGING</Text>
          
          {photoUri ? (
            <View style={styles.photoContainer}>
              <Image source={{ uri: photoUri }} style={styles.previewImage} />
              <View style={styles.aiPill}>
                <Sparkles size={12} color="#8A9A6B" />
                <Text style={styles.aiPillText}>AI Evaluation Ready</Text>
              </View>
              <TouchableOpacity style={styles.clearBtn} onPress={clearPhoto}>
                <Text style={styles.clearBtnText}>Retake Photo</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.cameraStagingBox} onPress={handleStageInspection}>
              <CameraIcon size={30} color="#B5652F" />
              <Text style={styles.cameraStagingTitle}>Snap Room Setup Photograph</Text>
              <Text style={styles.cameraStagingDesc}>Capture room sheets, bed layout & towels for Gemini verification scanner.</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F1E8",
  },
  contentContainer: {
    padding: 16,
    gap: 16,
  },
  roomSummaryCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#EBE3D1",
    borderRadius: 24,
    padding: 16,
    shadowColor: "#000000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
  },
  summaryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  roomNumTitle: {
    fontSize: 20,
    fontWeight: "black",
    color: "#2A2620",
  },
  scanBtn: {
    backgroundColor: "#B5652F",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 4,
  },
  scanBtnText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "bold",
  },
  timerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    gap: 6,
  },
  timerLabel: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#736B5E",
  },
  timerValue: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#B5652F",
  },
  checklistCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#EBE3D1",
    borderRadius: 24,
    padding: 16,
  },
  cardTitle: {
    fontSize: 10,
    fontWeight: "black",
    color: "#736B5E",
    letterSpacing: 1,
    marginBottom: 12,
  },
  checklistList: {
    gap: 12,
  },
  checkItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingVertical: 4,
  },
  checkItemText: {
    flex: 1,
    fontSize: 12,
    color: "#2A2620",
    fontWeight: "medium",
    lineHeight: 18,
  },
  checkedItemText: {
    color: "#736B5E",
    textDecorationLine: "line-through",
  },
  progressRow: {
    marginTop: 16,
    gap: 6,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: "#F5F1E8",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#8A9A6B",
  },
  progressText: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#736B5E",
  },
  cameraStagingBox: {
    borderWidth: 2,
    borderColor: "#EBE3D1",
    borderStyle: "dashed",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  cameraStagingTitle: {
    fontSize: 12,
    fontWeight: "black",
    color: "#2A2620",
    marginTop: 8,
  },
  cameraStagingDesc: {
    fontSize: 10,
    color: "#736B5E",
    textAlign: "center",
    marginTop: 4,
    lineHeight: 14,
  },
  photoContainer: {
    borderRadius: 20,
    overflow: "hidden",
    alignItems: "center",
  },
  previewImage: {
    width: "100%",
    height: 180,
    borderRadius: 16,
  },
  aiPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(138, 154, 107, 0.15)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 12,
    gap: 4,
  },
  aiPillText: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#8A9A6B",
  },
  clearBtn: {
    marginTop: 12,
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#EBE3D1",
  },
  clearBtnText: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#736B5E",
  },
  fullscreenContainer: {
    flex: 1,
  },
  overlay: {
    position: "absolute",
    bottom: 40,
    left: 20,
    right: 20,
    alignItems: "center",
    gap: 20,
  },
  overlayText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "bold",
    textShadowColor: "#000000",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 4,
  },
  cameraActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    paddingHorizontal: 20,
  },
  cancelButton: {
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  cancelButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "bold",
  },
  captureBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#B5652F",
    alignItems: "center",
    justifyContent: "center",
  },
});
