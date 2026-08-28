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

      {/* Universal Tab Navigation Bar (Luxury theme) */}
      <View style={styles.tabBar}>
        <TouchableOpacity 
          style={[styles.tabButton, currentScreen === "supervisor" && styles.activeTabButton]}
          onPress={() => setCurrentScreen("supervisor")}
        >
          <LayoutGrid size={20} color={currentScreen === "supervisor" ? "#ECECDC" : "#5C6E6A"} />
          <Text style={[styles.tabText, currentScreen === "supervisor" && styles.activeTabText]}>
            Supervisor
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.tabButton, currentScreen === "staff" && styles.activeTabButton]}
          onPress={() => setCurrentScreen("staff")}
        >
          <ClipboardCheck size={20} color={currentScreen === "staff" ? "#ECECDC" : "#5C6E6A"} />
          <Text style={[styles.tabText, currentScreen === "staff" && styles.activeTabText]}>
            Staff Portal
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.tabButton, currentScreen === "concierge" && styles.activeTabButton]}
          onPress={() => setCurrentScreen("concierge")}
        >
          <Smartphone size={20} color={currentScreen === "concierge" ? "#ECECDC" : "#5C6E6A"} />
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
    backgroundColor: "#ECECDC",
  },
  viewport: {
    flex: 1,
  },
  tabBar: {
    flexDirection: "row",
    height: 65,
    backgroundColor: "#ECECDC",
    borderTopWidth: 1,
    borderTopColor: "#D2D2BC",
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
    backgroundColor: "#09332C",
  },
  tabText: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#5C6E6A",
    marginTop: 4,
  },
  activeTabText: {
    color: "#ECECDC",
  },
});
