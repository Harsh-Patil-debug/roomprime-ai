import React, { useState } from "react";
import { ScrollView, Text, View, StyleSheet, TouchableOpacity } from "react-native";
import { Shield, Sparkles, AlertTriangle, CheckCircle, Ban, ArrowRight } from "lucide-react-native";

// Segmented 12 rooms mockup database seed for mobile rendering
const INITIAL_ROOMS_MOBILE = [
  { id: "1", number: "101", type: "Standard", floor: 1, status: "Cleaning in Progress", staff: "Priya Raman", vip: false, timer: "14m / 30m" },
  { id: "2", number: "203", type: "Suite", floor: 2, status: "Cleaning in Progress", staff: "Ana Duarte", vip: true, timer: "22m / 45m" },
  { id: "3", number: "302", type: "Deluxe", floor: 3, status: "Cleaning in Progress", staff: "Marco Silva", vip: false, timer: "08m / 35m" },
  { id: "4", number: "104", type: "Deluxe", floor: 1, status: "Inspection Pending", staff: "Priya Raman", vip: false, score: "88% Flagged" },
  { id: "5", number: "206", type: "Standard", floor: 2, status: "Inspection Pending", staff: "Ana Duarte", vip: false, score: "98% Auto-Release Ready" },
  { id: "6", number: "102", type: "Standard", floor: 1, status: "Vacant Dirty", staff: "Unassigned", vip: false, arrival: "13:00" },
  { id: "7", number: "204", type: "Suite", floor: 2, status: "Vacant Dirty", staff: "Unassigned", vip: true, arrival: "14:30" },
  { id: "8", number: "305", type: "Standard", floor: 3, status: "Vacant Dirty", staff: "Unassigned", vip: false, arrival: "16:00" },
  { id: "9", number: "103", type: "Deluxe", floor: 1, status: "Ready for Guest", staff: "Marco Silva", vip: false },
  { id: "10", number: "201", type: "Standard", floor: 2, status: "Ready for Guest", staff: "Ana Duarte", vip: false },
  { id: "11", number: "304", type: "Suite", floor: 3, status: "Ready for Guest", staff: "Priya Raman", vip: true },
  { id: "12", number: "105", type: "Standard", floor: 1, status: "Maintenance Blocked", staff: "Unassigned", vip: false, issue: "AC Unresponsive" },
];

export function SupervisorScreen() {
  const [rooms, setRooms] = useState(INITIAL_ROOMS_MOBILE);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Cleaning in Progress": return "#B5652F"; // Copper
      case "Inspection Pending": return "#B5652F"; // Copper warning
      case "Ready for Guest": return "#8A9A6B"; // Sage
      case "Vacant Dirty": return "#B14A3E"; // Terracotta
      case "Maintenance Blocked": return "#2A2620"; // Charcoal
      default: return "#736B5E";
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      
      {/* 1. Header Metrics Row */}
      <View style={styles.metricsRow}>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Queue</Text>
          <Text style={styles.metricValue}>3 Dirty</Text>
        </View>
        <View style={[styles.metricCard, styles.alertBorder]}>
          <Text style={[styles.metricLabel, styles.alertText]}>Escalated</Text>
          <Text style={[styles.metricValue, styles.alertText]}>1 Block</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Pending</Text>
          <Text style={styles.metricValue}>2 Reviews</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Adherence</Text>
          <Text style={styles.metricValue}>94% SLA</Text>
        </View>
      </View>

      {/* 2. Title Section */}
      <View style={styles.sectionHeader}>
        <Shield size={18} color="#B5652F" />
        <Text style={styles.sectionTitle}>ROOM CLEANING MATRIX</Text>
      </View>

      {/* 3. Room Matrix Cards */}
      <View style={styles.grid}>
        {rooms.map((room) => (
          <View key={room.id} style={styles.roomCard}>
            <View style={styles.roomHeader}>
              <Text style={styles.roomNumber}>Room {room.number}</Text>
              {room.vip && (
                <View style={styles.vipBadge}>
                  <Text style={styles.vipText}>VIP</Text>
                </View>
              )}
            </View>

            <View style={styles.roomDetailRow}>
              <Text style={styles.roomType}>{room.type} • Floor {room.floor}</Text>
            </View>

            <View style={styles.statusRow}>
              <View style={[styles.statusDot, { backgroundColor: getStatusColor(room.status) }]} />
              <Text style={styles.statusText}>{room.status}</Text>
            </View>

            {room.staff !== "Unassigned" && (
              <Text style={styles.staffName}>Staff: {room.staff}</Text>
            )}

            {room.timer && (
              <View style={styles.timerBadge}>
                <Text style={styles.timerText}>⏳ {room.timer}</Text>
              </View>
            )}

            {room.score && (
              <View style={styles.scoreBadge}>
                <Sparkles size={10} color="#B5652F" />
                <Text style={styles.scoreText}>{room.score}</Text>
              </View>
            )}

            {room.issue && (
              <View style={styles.issueBadge}>
                <Text style={styles.issueText}>⚠️ {room.issue}</Text>
              </View>
            )}

            {room.status === "Inspection Pending" && (
              <TouchableOpacity style={styles.actionBtn}>
                <Text style={styles.actionBtnText}>Review QA</Text>
                <ArrowRight size={12} color="#FFFFFF" />
              </TouchableOpacity>
            )}
          </View>
        ))}
      </View>
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
  },
  metricsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  metricCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#EBE3D1",
    borderRadius: 16,
    padding: 12,
    marginHorizontal: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  alertBorder: {
    borderColor: "#B14A3E",
  },
  alertText: {
    color: "#B14A3E",
  },
  metricLabel: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#736B5E",
    textTransform: "uppercase",
  },
  metricValue: {
    fontSize: 12,
    fontWeight: "black",
    color: "#2A2620",
    marginTop: 4,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 6,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "black",
    color: "#736B5E",
    letterSpacing: 1,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  roomCard: {
    width: "48%",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#EBE3D1",
    borderRadius: 20,
    padding: 12,
    marginBottom: 12,
  },
  roomHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  roomNumber: {
    fontSize: 14,
    fontWeight: "black",
    color: "#2A2620",
  },
  vipBadge: {
    backgroundColor: "#B14A3E",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 6,
  },
  vipText: {
    color: "#FFFFFF",
    fontSize: 8,
    fontWeight: "bold",
  },
  roomDetailRow: {
    marginTop: 2,
  },
  roomType: {
    fontSize: 10,
    color: "#736B5E",
    fontWeight: "medium",
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#2A2620",
  },
  staffName: {
    fontSize: 9,
    color: "#736B5E",
    marginTop: 4,
    fontWeight: "medium",
  },
  timerBadge: {
    backgroundColor: "#F5F1E8",
    padding: 4,
    borderRadius: 8,
    marginTop: 6,
    alignSelf: "flex-start",
  },
  timerText: {
    fontSize: 8,
    fontWeight: "bold",
    color: "#B5652F",
  },
  scoreBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(181, 101, 47, 0.1)",
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 6,
    alignSelf: "flex-start",
    gap: 3,
  },
  scoreText: {
    fontSize: 8,
    fontWeight: "bold",
    color: "#B5652F",
  },
  issueBadge: {
    backgroundColor: "rgba(177, 74, 62, 0.1)",
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 6,
    alignSelf: "flex-start",
  },
  issueText: {
    fontSize: 8,
    fontWeight: "bold",
    color: "#B14A3E",
  },
  actionBtn: {
    backgroundColor: "#B5652F",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    borderRadius: 10,
    marginTop: 10,
    gap: 4,
  },
  actionBtnText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "bold",
  },
});
