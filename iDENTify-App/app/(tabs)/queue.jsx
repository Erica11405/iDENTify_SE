import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, RefreshControl, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useState, useEffect, useCallback } from "react";
import { API, fetchPatientByEmail } from "../../constants/Api";
import { useUser } from "@clerk/clerk-expo";
import { useFocusEffect } from "expo-router";

export default function QueueScreen() {
  const { user } = useUser();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [queueData, setQueueData] = useState({
    currentNumber: "—",
    yourNumber: "—",
    status: "Not In Queue",
    estimate: "—",
  });

  const fetchQueue = async () => {
    if (!user?.primaryEmailAddress?.emailAddress) return;

    // Only show full loading spinner on initial load or manual refresh, not auto-focus
    if (!refreshing && queueData.status === "Not In Queue") setLoading(true);

    try {
      const me = await fetchPatientByEmail(user.primaryEmailAddress.emailAddress);

      if (!me) {
        setQueueData({
          currentNumber: "—",
          yourNumber: "—",
          status: "Not Found",
          estimate: "—",
        });
        return;
      }

      const res = await fetch(`${API.queue}/status?patient_id=${me.id}`);
      const data = await res.json();

      setQueueData({
        // Map backend 'servingNumber' (Now Serving) to UI 'currentNumber'
        currentNumber: data.servingNumber ? String(data.servingNumber).padStart(2, '0') : "—",

        // Map backend 'myNumber' (Your Ticket) to UI 'yourNumber'
        yourNumber: data.myNumber ? String(data.myNumber).padStart(2, '0') : "—",

        status: data.myStatus ? data.myStatus.status : "Not In Queue",
        estimate: (data.myStatus && data.estimatedWaitTime) ? data.estimatedWaitTime : "—",
      });

    } catch (error) {
      console.error("Queue fetch error:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchQueue();
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      fetchQueue();
    }, [user])
  );

  const getStatusColor = (status) => {
    switch (status) {
      case "On Chair":
      case "Serving":
      case "Treatment":
        return "#22C55E"; // Green
      case "Payment / Billing":
      case "Near":
        return "#F59E0B"; // Orange
      case "Checked-In":
      case "Waiting":
        return "#3B82F6"; // Blue
      case "Done":
        return "#10B981"; // Emerald
      case "Cancelled":
      case "No-Show":
        return "#EF4444"; // Red
      default:
        return "#64748B"; // Gray
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#1B93D5"]} />
      }
    >
      <Text style={styles.headerTitle}>Queue Status</Text>

      {/* NOW SERVING CARD */}
      <View style={styles.heroCard}>
        <View style={styles.heroHeader}>
          <Text style={styles.heroLabel}>NOW SERVING</Text>
          <Ionicons name="megaphone-outline" size={24} color="rgba(255,255,255,0.9)" />
        </View>
        <Text style={styles.nowServingNumber}>{queueData.currentNumber}</Text>
        <View style={styles.heroFooter}>
          <Text style={styles.heroFooterText}>Please proceed to the counter when called</Text>
        </View>
      </View>

      {/* YOUR NUMBER CARD */}
      <View style={styles.statusCard}>
        <View style={styles.statusHeader}>
          <Text style={styles.cardTitle}>Your Ticket</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(queueData.status) }]}>
            <Text style={styles.statusText}>{queueData.status}</Text>
          </View>
        </View>

        <View style={styles.ticketContent}>
          <Text style={styles.ticketLabel}>Queue Number</Text>
          <Text style={styles.yourNumber}>{queueData.yourNumber}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.estimateContainer}>
          <View style={styles.estimateIconBox}>
            <Ionicons name="time-outline" size={24} color="#1B93D5" />
          </View>
          <View>
            <Text style={styles.estimateLabel}>Estimated Wait Time</Text>
            <Text style={styles.estimateValue}>{queueData.estimate}</Text>
          </View>
        </View>
      </View>

      {/* REFRESH BUTTON */}
      <TouchableOpacity
        style={styles.refreshButton}
        onPress={onRefresh}
        activeOpacity={0.8}
        disabled={loading}
      >
        {loading && !refreshing ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Ionicons name="refresh" size={20} color="#fff" />
            <Text style={styles.refreshButtonText}>Refresh Status</Text>
          </>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  contentContainer: {
    padding: 24,
    paddingTop: 40,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#1E293B",
    marginBottom: 24,
    letterSpacing: -0.5,
  },

  /* HERO CARD (Now Serving) */
  heroCard: {
    backgroundColor: "#1B93D5",
    borderRadius: 24,
    padding: 24,
    marginBottom: 24,
    shadowColor: "#1B93D5",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
    alignItems: 'center',
  },
  heroHeader: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  heroLabel: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 1,
  },
  nowServingNumber: {
    fontSize: 80,
    fontWeight: "800",
    color: "white",
    letterSpacing: -2,
    lineHeight: 90,
  },
  heroFooter: {
    marginTop: 10,
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  heroFooterText: {
    color: "white",
    fontSize: 13,
    fontWeight: "500",
  },

  /* STATUS CARD (Your Number) */
  statusCard: {
    backgroundColor: "white",
    borderRadius: 24,
    padding: 24,
    marginBottom: 24,
    shadowColor: "#64748B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#334155",
  },
  statusBadge: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  statusText: {
    color: "white",
    fontWeight: "700",
    fontSize: 12,
    textTransform: 'uppercase',
  },
  ticketContent: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  ticketLabel: {
    fontSize: 14,
    color: "#94A3B8",
    fontWeight: "600",
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  yourNumber: {
    fontSize: 56,
    fontWeight: "800",
    color: "#1E293B",
    letterSpacing: -1,
  },
  divider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginVertical: 20,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  estimateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: "#F8FAFC",
    padding: 16,
    borderRadius: 16,
  },
  estimateIconBox: {
    width: 48,
    height: 48,
    backgroundColor: "white",
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  estimateLabel: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "500",
    marginBottom: 2,
  },
  estimateValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1B93D5",
  },

  /* REFRESH BUTTON */
  refreshButton: {
    flexDirection: 'row',
    backgroundColor: "#1B93D5",
    paddingVertical: 16,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#1B93D5",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  refreshButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
    marginLeft: 8,
  },
});