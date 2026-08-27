import React, { useState } from "react";
import { SafeAreaView, StyleSheet, Text, View, TouchableOpacity, StatusBar } from "react-native";
import { SupervisorScreen } from "./screens/SupervisorScreen";
import { StaffScreen } from "./screens/StaffScreen";
import { ConciergeScreen } from "./screens/ConciergeScreen";
import { LayoutGrid, ClipboardCheck, Smartphone } from "lucide-react-native";

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<"supervisor" | "staff" | "concierge">("supervisor");

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Active Screen Viewport */}
      <View style={styles.viewport}>
        {currentScreen === "supervisor" && <SupervisorScreen />}
        {currentScreen === "staff" && <StaffScreen />}
        {currentScreen === "concierge" && <ConciergeScreen />}
      </View>

      {/* Universal Tab Navigation Bar (Copper & Cream design) */}
      <View style={styles.tabBar}>
        <TouchableOpacity 
          style={[styles.tabButton, currentScreen === "supervisor" && styles.activeTabButton]}
          onPress={() => setCurrentScreen("supervisor")}
        >
          <LayoutGrid size={20} color={currentScreen === "supervisor" ? "#FFFFFF" : "#736B5E"} />
          <Text style={[styles.tabText, currentScreen === "supervisor" && styles.activeTabText]}>
            Supervisor
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.tabButton, currentScreen === "staff" && styles.activeTabButton]}
          onPress={() => setCurrentScreen("staff")}
        >
          <ClipboardCheck size={20} color={currentScreen === "staff" ? "#FFFFFF" : "#736B5E"} />
          <Text style={[styles.tabText, currentScreen === "staff" && styles.activeTabText]}>
            Staff Portal
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.tabButton, currentScreen === "concierge" && styles.activeTabButton]}
          onPress={() => setCurrentScreen("concierge")}
        >
          <Smartphone size={20} color={currentScreen === "concierge" ? "#FFFFFF" : "#736B5E"} />
          <Text style={[styles.tabText, currentScreen === "concierge" && styles.activeTabText]}>
            Concierge
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F1E8",
  },
  viewport: {
    flex: 1,
  },
  tabBar: {
    flexDirection: "row",
    height: 65,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#EBE3D1",
    paddingBottom: 8,
    paddingTop: 8,
    justifyContent: "space-around",
    alignItems: "center",
  },
  tabButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
    marginHorizontal: 8,
    borderRadius: 16,
  },
  activeTabButton: {
    backgroundColor: "#B5652F",
  },
  tabText: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#736B5E",
    marginTop: 4,
  },
  activeTabText: {
    color: "#FFFFFF",
  },
});
