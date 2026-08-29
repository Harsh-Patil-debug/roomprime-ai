import React, { useState } from "react";
import { ScrollView, Text, View, StyleSheet, TouchableOpacity, Image, Modal, Alert } from "react-native";
import { CameraView } from "expo-camera";
import { useCameraInspection } from "../hooks/useCameraInspection";
import { Hotel, Wifi, Clock, Camera as CameraIcon, Heart, Wrench, Luggage, Calendar, Sparkles, CheckCircle2 } from "lucide-react-native";

export function ConciergeScreen() {
  const { cameraRef, photoUri, capturing, takePhoto, clearPhoto } = useCameraInspection();
  const [cameraOpen, setCameraOpen] = useState(false);
  const [trackerRequest, setTrackerRequest] = useState<{ item: string; step: number } | null>(null);

  const quickCatalog = [
    { title: "Fresh Bath Towels", desc: "Set of 3 cotton towels", icon: Heart },
    { title: "Dental Kit & Toiletries", desc: "Shampoo, body gel", icon: Heart },
    { title: "Extra Pillow & Blanket", desc: "Hypoallergenic items", icon: Heart },
    { title: "Room Clean Service", desc: "Immediate room tidy", icon: Sparkles },
    { title: "AC Temperature Issue", desc: "Air conditioner help", icon: Wrench },
    { title: "TV or WiFi Repair", desc: "Connection assistance", icon: Wrench },
  ];

  const handleOrderCatalogItem = (title: string) => {
    Alert.alert("Success", `🎉 Request "${title}" dispatched successfully!`);
    setTrackerRequest({
      item: title,
      step: 0, // Received
    });
  };

  const handleSnapNeed = () => {
    setCameraOpen(true);
  };

  const handleCameraCapture = async () => {
    await takePhoto();
    setCameraOpen(false);
    
    // Simulate classification delay
    Alert.alert("Processing", "Gemini AI analyzing request setup...");
    setTimeout(() => {
      setTrackerRequest({
        item: "AI Clean Request",
        step: 0,
      });
      Alert.alert("Success", "AI classified request as High Urgency, routed to Housekeeping.");
    }, 2000);
  };

  return (
    <View style={styles.fullscreenView}>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        
        {/* Welcome Header */}
        <View style={styles.headerCard}>
          <View style={styles.headerTitleRow}>
            <View style={styles.portalBadge}>
              <Text style={styles.portalBadgeText}>GUEST CONCIERGE</Text>
            </View>
            <Hotel size={18} color="#B5652F" />
          </View>
          <Text style={styles.welcomeTitle}>Welcome to Suite 203, Mr. Sharma</Text>
          <Text style={styles.welcomeSubtitle}>RoomFlow luxury concierge service registry desk.</Text>

          {/* Wi-Fi & Breakfast row */}
          <View style={styles.infoRow}>
            <View style={styles.infoPill}>
              <Wifi size={14} color="#B5652F" />
              <View>
                <Text style={styles.pillLabel}>WiFi PASSWORD</Text>
                <Text style={styles.pillVal}>RoomFlow_WiFi</Text>
              </View>
            </View>
            <View style={styles.infoPill}>
              <Clock size={14} color="#B5652F" />
              <View>
                <Text style={styles.pillLabel}>BREAKFAST HOURS</Text>
                <Text style={styles.pillVal}>07:00 - 10:30 AM</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Snap-a-Need camera box */}
        <TouchableOpacity style={styles.snapBox} onPress={handleSnapNeed}>
          <View style={styles.cameraCircle}>
            <CameraIcon size={24} color="#B5652F" />
          </View>
          <Text style={styles.snapTitle}>Snap Photo of Any Room Issue</Text>
          <Text style={styles.snapDesc}>
            Take a photo of room defects (leaking faucet, broken remote). Gemini AI will auto-route the request.
          </Text>
        </TouchableOpacity>

        {/* Quick Service catalog */}
        <View style={styles.catalogSection}>
          <Text style={styles.sectionTitle}>🛎 1-TAP QUICK SERVICE CATALOG</Text>
          <View style={styles.grid}>
            {quickCatalog.map((item) => (
              <TouchableOpacity 
                key={item.title} 
                style={styles.catalogCard}
                onPress={() => handleOrderCatalogItem(item.title)}
              >
                <View style={styles.iconCircle}>
                  <item.icon size={16} color="#B5652F" />
                </View>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardDesc}>{item.desc}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

      </ScrollView>

      {/* Floating active order progress tracker */}
      {trackerRequest && (
        <View style={styles.trackerCard}>
          <View style={styles.trackerHeader}>
            <CheckCircle2 size={16} color="#8A9A6B" />
            <Text style={styles.trackerTitle}>Active Order: {trackerRequest.item}</Text>
            <TouchableOpacity style={styles.closeBtn} onPress={() => setTrackerRequest(null)}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.trackerStatusText}>
            Status: {trackerRequest.step === 0 ? "Received & Routing to runner" : "Delivered"}
          </Text>
        </View>
      )}

      {/* Native Camera View Finder modal */}
      <Modal visible={cameraOpen} animationType="slide">
        <View style={styles.cameraFullscreen}>
          <CameraView 
            style={StyleSheet.absoluteFill} 
            ref={(ref: CameraView | null) => {
              if (cameraRef) {
                cameraRef.current = ref;
              }
            }}
          />
          <View style={styles.cameraOverlay}>
            <Text style={styles.cameraOverlayText}>Inspect Defect Photo Staging</Text>
            <View style={styles.cameraActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setCameraOpen(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.captureCircle} onPress={handleCameraCapture}>
                <CameraIcon size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  fullscreenView: {
    flex: 1,
    backgroundColor: "#F5F1E8",
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    gap: 16,
    paddingBottom: 100,
  },
  headerCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#EBE3D1",
    borderRadius: 24,
    padding: 16,
  },
  headerTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  portalBadge: {
    backgroundColor: "rgba(181, 101, 47, 0.1)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  portalBadgeText: {
    color: "#B5652F",
    fontSize: 8,
    fontWeight: "bold",
  },
  welcomeTitle: {
    fontSize: 18,
    fontWeight: "black",
    color: "#2A2620",
  },
  welcomeSubtitle: {
    fontSize: 10,
    color: "#736B5E",
    marginTop: 2,
    fontWeight: "medium",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
    gap: 8,
  },
  infoPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F1E8",
    padding: 8,
    borderRadius: 16,
    gap: 6,
  },
  pillLabel: {
    fontSize: 6,
    fontWeight: "bold",
    color: "#736B5E",
  },
  pillVal: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#2A2620",
  },
  snapBox: {
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "#EBE3D1",
    borderStyle: "dashed",
    borderRadius: 24,
    padding: 20,
    alignItems: "center",
  },
  cameraCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(181, 101, 47, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  snapTitle: {
    fontSize: 12,
    fontWeight: "black",
    color: "#2A2620",
  },
  snapDesc: {
    fontSize: 9,
    color: "#736B5E",
    textAlign: "center",
    marginTop: 4,
    lineHeight: 13,
  },
  catalogSection: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: "black",
    color: "#736B5E",
    letterSpacing: 1,
    marginBottom: 10,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 8,
  },
  catalogCard: {
    width: "48%",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#EBE3D1",
    borderRadius: 20,
    padding: 12,
    minHeight: 100,
    justifyContent: "space-between",
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: "#F5F1E8",
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#2A2620",
    marginTop: 8,
  },
  cardDesc: {
    fontSize: 8,
    color: "#736B5E",
    marginTop: 2,
  },
  trackerCard: {
    position: "absolute",
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#EBE3D1",
    borderRadius: 20,
    padding: 14,
    shadowColor: "#000000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    borderTopWidth: 4,
    borderTopColor: "#B5652F",
  },
  trackerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  trackerTitle: {
    flex: 1,
    fontSize: 12,
    fontWeight: "black",
    color: "#2A2620",
    marginLeft: 6,
  },
  trackerStatusText: {
    fontSize: 10,
    color: "#736B5E",
    marginTop: 4,
    fontStyle: "italic",
  },
  closeBtn: {
    padding: 4,
  },
  closeBtnText: {
    fontSize: 14,
    color: "#736B5E",
    fontWeight: "bold",
  },
  cameraFullscreen: {
    flex: 1,
  },
  cameraOverlay: {
    position: "absolute",
    bottom: 40,
    left: 20,
    right: 20,
    alignItems: "center",
    gap: 20,
  },
  cameraOverlayText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "bold",
  },
  cameraActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  cancelBtn: {
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  cancelBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "bold",
  },
  captureCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#B5652F",
    alignItems: "center",
    justifyContent: "center",
  },
});
