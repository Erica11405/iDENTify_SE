import { Alert, View, Text, StyleSheet, ActivityIndicator, ScrollView, TouchableOpacity } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { API } from "../../constants/Api";
import { Ionicons } from "@expo/vector-icons";

const CANCELLATION_LOCK_MINUTES = 30;

function parseDateTime(value) {
  if (!value) return null;
  const parsed = new Date(String(value).replace(" ", "T"));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getMinutesUntil(value) {
  const parsed = parseDateTime(value);
  if (!parsed) return null;
  return Math.floor((parsed.getTime() - Date.now()) / 60000);
}

export default function AppointmentDetails() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [appointment, setAppointment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (!id) return;

    const fetchAppointmentDetails = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API.appointments}/${id}`);
        if (res.ok) {
          const data = await res.json();
          setAppointment(data);
        } else {
          console.error("Failed to fetch appointment details");
        }
      } catch (error) {
        console.error("Error fetching appointment details:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAppointmentDetails();
  }, [id]);

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#1B93D5" />
      </View>
    );
  }

  if (!appointment) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.errorText}>Appointment not found.</Text>
        <Ionicons name="alert-circle-outline" size={48} color="#94A3B8" />
      </View>
    );
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'Done': return { bg: '#DCFCE7', text: '#166534' }; // Green
      case 'Cancelled': return { bg: '#FEE2E2', text: '#991B1B' }; // Red
      case 'No-Show': return { bg: '#E2E8F0', text: '#475569' };
      case 'Missed': return { bg: '#E2E8F0', text: '#475569' };
      case 'Checked-In': return { bg: '#DBEAFE', text: '#1E40AF' }; // Blue
      default: return { bg: '#FEF3C7', text: '#92400E' }; // Yellow/Orange
    }
  };

  const appointmentDate = parseDateTime(appointment.appointment_datetime);
  const statusKey = String(appointment.status || "").trim().toLowerCase();
  const decisionStatusKey = String(appointment.decision_status || "").trim().toLowerCase();
  const minutesUntilAppointment = getMinutesUntil(appointment.appointment_datetime);
  const isTerminalStatus = ["done", "cancelled", "no-show", "missed", "declined"].includes(statusKey);
  const canCancel = !isTerminalStatus
    && decisionStatusKey !== "declined"
    && Number.isFinite(minutesUntilAppointment)
    && minutesUntilAppointment > CANCELLATION_LOCK_MINUTES;

  const cancelHint = (isTerminalStatus || decisionStatusKey === "declined")
    ? "This appointment can no longer be cancelled."
    : (!Number.isFinite(minutesUntilAppointment)
      ? "Cancellation window unavailable."
      : (minutesUntilAppointment <= CANCELLATION_LOCK_MINUTES
        ? "Cancellation is locked within 30 minutes of the appointment time."
        : "You can cancel this appointment now."));

  const performCancellation = async () => {
    if (!canCancel || cancelling) {
      Alert.alert("Cancellation Locked", "You can only cancel at least 30 minutes before the appointment time.");
      return;
    }

    setCancelling(true);
    try {
      const res = await fetch(`${API.appointments}/${appointment.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Cancelled" }),
      });

      const payload = await res.json().catch(() => null);
      if (!res.ok) {
        Alert.alert("Unable to Cancel", payload?.message || "This appointment cannot be cancelled right now.");
        return;
      }

      setAppointment(payload || { ...appointment, status: "Cancelled" });
      Alert.alert("Appointment Cancelled", "Your appointment has been cancelled.");
    } catch (error) {
      console.error("Failed to cancel appointment", error);
      Alert.alert("Network Error", "Failed to cancel appointment. Please try again.");
    } finally {
      setCancelling(false);
    }
  };

  const handleReportDentist = () => {
    Alert.prompt(
      "Report Dentist",
      "Please describe the issue or reason for reporting this dentist:",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Submit Report", 
          onPress: (reason) => {
            if (reason?.trim()) {
              // In a real app, this would call a backend endpoint
              Alert.alert("Report Submitted", "Thank you for your feedback. We will investigate this matter.");
            }
          }
        }
      ]
    );
  };

  const statusStyle = getStatusColor(appointment.status);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>

      {/* Header with Back Button */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1E293B" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={styles.title}>Appointment Details</Text>
          <TouchableOpacity onPress={handleReportDentist} style={{ padding: 5 }}>
            <Ionicons name="flag-outline" size={24} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.card}>
        {/* Header Section: Status & ID */}
        <View style={styles.cardHeader}>
          <View style={styles.idBadge}>
            <Text style={styles.idText}>ID: #{appointment.id}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
            <Text style={[styles.statusText, { color: statusStyle.text }]}>
              {appointment.status}
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Main Details Grid */}
        <View style={styles.grid}>
          <DetailItem
            icon="clipboard-outline"
            label="Service"
            value={appointment.procedure || "Dental Checkup"}
          />
          <DetailItem
            icon="medkit-outline"
            label="Doctor"
            value={appointment.dentist_name || appointment.dentist || "Unassigned"}
          />
          <DetailItem
            icon="calendar-outline"
            label="Date"
            value={(appointmentDate || new Date()).toLocaleDateString(undefined, {
              weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
            })}
          />
          <DetailItem
            icon="time-outline"
            label="Time"
            value={(appointmentDate || new Date()).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          />
        </View>

        {/* Notes Section if available */}
        {appointment.notes && (
          <View style={styles.notesContainer}>
            <Text style={styles.notesLabel}>Notes</Text>
            <Text style={styles.notesText}>{appointment.notes}</Text>
          </View>
        )}
      </View>

      <View style={styles.cancelSection}>
        <TouchableOpacity
          style={[styles.cancelButton, (!canCancel || cancelling) && styles.cancelButtonDisabled]}
          onPress={() => {
            Alert.alert(
              "Cancel Appointment",
              "Are you sure you want to cancel this appointment?",
              [
                { text: "No", style: "cancel" },
                { text: "Yes", style: "destructive", onPress: performCancellation },
              ],
            );
          }}
          activeOpacity={0.85}
          disabled={!canCancel || cancelling}
        >
          <Ionicons name="close-circle-outline" size={18} color="#FFFFFF" />
          <Text style={styles.cancelButtonText}>{cancelling ? "Cancelling..." : "Cancel Appointment"}</Text>
        </TouchableOpacity>
        <Text style={styles.cancelHint}>{cancelHint}</Text>
      </View>

      {/* Footer Info */}
      <View style={styles.footer}>
        <Ionicons name="information-circle-outline" size={20} color="#64748B" />
        <Text style={styles.footerText}>
          Please arrive 15 minutes early for your appointment.
        </Text>
      </View>

    </ScrollView>
  );
}

const DetailItem = ({ icon, label, value }) => (
  <View style={styles.detailRow}>
    <View style={styles.iconBox}>
      <Ionicons name={icon} size={22} color="#1B93D5" />
    </View>
    <View style={styles.detailTextContainer}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC"
  },
  contentContainer: {
    padding: 24,
    paddingTop: 40,
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
    flex: 1,
  },
  header: {
    marginBottom: 24,
  },

  // Back Button Styles
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginBottom: 16,
    paddingRight: 10,
    marginLeft: -4
  },
  backText: {
    fontSize: 16,
    color: "#1E293B",
    marginLeft: 6,
    fontWeight: "600"
  },

  title: {
    fontSize: 28,
    fontWeight: "800",
    color: '#1E293B',
    letterSpacing: -0.5,
  },
  errorText: {
    fontSize: 16,
    color: "#64748B",
    marginBottom: 10,
  },

  /* CARD STYLES */
  card: {
    backgroundColor: "white",
    borderRadius: 24,
    padding: 24,
    shadowColor: "#64748B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  idBadge: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  idText: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "600",
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: 'uppercase',
  },
  divider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginBottom: 24,
  },

  /* GRID & DETAILS */
  grid: {
    gap: 20,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#F0F9FF",
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  detailTextContainer: {
    flex: 1,
  },
  label: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "500",
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  value: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1E293B",
  },

  /* NOTES SECTION */
  notesContainer: {
    marginTop: 24,
    padding: 16,
    backgroundColor: "#FEF9C3", // Light yellow note style
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FEF08A",
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#A16207",
    marginBottom: 4,
    textTransform: "uppercase",
  },
  notesText: {
    fontSize: 14,
    color: "#854D0E",
    lineHeight: 20,
  },

  cancelSection: {
    marginTop: 16,
    marginBottom: 8,
  },
  cancelButton: {
    backgroundColor: "#EF4444",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  cancelButtonDisabled: {
    backgroundColor: "#94A3B8",
  },
  cancelButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14,
  },
  cancelHint: {
    marginTop: 8,
    color: "#64748B",
    fontSize: 12,
    textAlign: "center",
  },

  /* FOOTER */
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    paddingHorizontal: 10,
    justifyContent: 'center',
  },
  footerText: {
    color: "#64748B",
    fontSize: 13,
    marginLeft: 8,
    textAlign: 'center',
  },
});