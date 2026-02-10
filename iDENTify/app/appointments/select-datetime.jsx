import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, ScrollView, Modal, Pressable } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState, useEffect, useMemo } from "react";
import { API, fetchPatientByEmail } from "../../constants/Api";
import { useUser } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function ConfirmAppointment() {
  const router = useRouter();
  const { user } = useUser();
  const { doctor, docId, service } = useLocalSearchParams();

  const [loading, setLoading] = useState(false);
  const [dentist, setDentist] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [fetchingData, setFetchingData] = useState(true);

  // --- FAMILY / PATIENT SELECTION STATE ---
  const [mainProfile, setMainProfile] = useState(null);
  const [familyMembers, setFamilyMembers] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [showPatientModal, setShowPatientModal] = useState(false);

  // Availability State
  const [dailyCount, setDailyCount] = useState(0);
  const [limit, setLimit] = useState(5);

  // Calendar State
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 1. Load Dentist & Appointments
        const resDentists = await fetch(`${API.dentists}`);
        const allDentists = await resDentists.json();
        const selected = allDentists.find(d => String(d.id) === String(docId));
        setDentist(selected);

        const resAppts = await fetch(`${API.appointments}`);
        const allAppts = await resAppts.json();
        const dentistAppts = allAppts.filter(a =>
          String(a.dentist_id) === String(docId) && a.status !== 'Cancelled'
        );
        setAppointments(dentistAppts);

        // 2. Load User Profile & Family
        if (user?.primaryEmailAddress?.emailAddress) {
          const parent = await fetchPatientByEmail(user.primaryEmailAddress.emailAddress);

          if (parent) {
            setMainProfile(parent);
            setSelectedPatient(parent);

            const familyRes = await fetch(`${API.patients}/${parent.id}/family`);
            if (familyRes.ok) {
              const familyData = await familyRes.json();
              setFamilyMembers(familyData);
            }
          }
        }

      } catch (err) {
        console.error("Error fetching data", err);
      } finally {
        setFetchingData(false);
      }
    };
    fetchData();
  }, [docId, user]);

  useEffect(() => {
    let isActive = true;
    async function checkLimit() {
      try {
        const res = await fetch(`${API.appointments}/check-limit?dentist_id=${docId}&date=${selectedDate}`);
        const data = await res.json();
        if (isActive) {
          setDailyCount(data.count || 0);
          if (data.limit) setLimit(data.limit);
        }
      } catch (e) {
        console.error("Failed limit check", e);
      }
    }
    checkLimit();
    return () => { isActive = false; };
  }, [selectedDate, docId]);

  const isLimitReached = dailyCount >= limit;

  const changeMonth = (direction) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + direction);
    setCurrentDate(newDate);
  };

  const getDayStatus = (dateStr, dayIndex) => {
    if (!dentist) return "Closed";
    if (dentist.status === 'Off') return "Off";
    if (dentist.leaveDays?.includes(dateStr)) return "Leave";
    const works = dentist.days?.some(day => Number(day) === dayIndex);
    return works ? "Open" : "Closed";
  };

  const renderCalendar = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days = [];

    for (let i = 0; i < firstDay; i++) {
      days.push(<View key={`empty-${i}`} style={styles.calendarDay} />);
    }

    for (let i = 1; i <= daysInMonth; i++) {
      const dateObj = new Date(year, month, i);
      const y = dateObj.getFullYear();
      const m = String(dateObj.getMonth() + 1).padStart(2, '0');
      const d = String(dateObj.getDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${d}`;
      const dayIndex = dateObj.getDay();
      const status = getDayStatus(dateStr, dayIndex);
      const isSelected = selectedDate === dateStr;
      const isOpen = status === "Open";
      const now = new Date();
      const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const isPast = dateStr < todayStr;
      const isDisabled = !isOpen || isPast;

      days.push(
        <TouchableOpacity
          key={dateStr}
          style={[styles.calendarDay, isSelected && styles.selectedDay, !isOpen && !isPast && styles.offDay, isOpen && !isSelected && styles.openDay, isPast && styles.pastDay]}
          onPress={() => setSelectedDate(dateStr)}
          disabled={isDisabled}
        >
          <Text style={[styles.dayText, isSelected && styles.selectedDayText, !isOpen && styles.offDayText, isPast && styles.pastDayText]}>{i}</Text>
          {isOpen && !isPast && !isSelected && <View style={styles.dot} />}
        </TouchableOpacity>
      );
    }
    return days;
  };

  const availableSlots = useMemo(() => {
    if (!dentist) return [];
    const toMin = (t) => {
      if (!t) return 0;
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };
    const slots = [];
    const operatingStart = dentist.operatingHours?.start || "09:00";
    const operatingEnd = dentist.operatingHours?.end || "17:00";
    const startMin = toMin(operatingStart);
    const endMin = toMin(operatingEnd);
    const selDateObj = new Date(selectedDate);
    const dayIndex = selDateObj.getDay();
    const status = getDayStatus(selectedDate, dayIndex);

    if (status !== "Open") return [];

    const now = new Date();
    const tYear = now.getFullYear();
    const tMonth = String(now.getMonth() + 1).padStart(2, '0');
    const tDay = String(now.getDate()).padStart(2, '0');
    const todayStr = `${tYear}-${tMonth}-${tDay}`;
    const isToday = selectedDate === todayStr;
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const todayAppts = appointments.filter(a => {
      if (!a.appointment_datetime) return false;
      const aDate = a.appointment_datetime.includes("T") ? a.appointment_datetime.split("T")[0] : a.appointment_datetime.split(" ")[0];
      return aDate === selectedDate;
    }).map(a => {
      let timePart = a.appointment_datetime.includes("T") ? a.appointment_datetime.split("T")[1] : a.appointment_datetime.split(" ")[1];
      if (!timePart) return { start: -1, end: -1 };
      const [h, m] = timePart.split(':').map(Number);
      const startMins = h * 60 + m;
      return { start: startMins, end: startMins + 30 };
    });

    for (let time = startMin; time < endMin; time += 30) {
      const h = Math.floor(time / 60);
      const m = time % 60;
      const slotEnd = time + 30;
      let type = 'open';
      const timeStr24 = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      const h12 = h % 12 || 12;
      const ampm = h >= 12 ? 'PM' : 'AM';
      let label = `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`;

      if (dentist.lunch) {
        const lStart = toMin(dentist.lunch.start);
        const lEnd = toMin(dentist.lunch.end);
        if (time < lEnd && slotEnd > lStart) { type = 'lunch'; label = "Lunch"; }
      }
      if (type === 'open' && dentist.breaks) {
        for (let b of dentist.breaks) {
          const bStart = toMin(b.start);
          const bEnd = toMin(b.end);
          if (time < bEnd && slotEnd > bStart) { type = 'break'; label = "Break"; break; }
        }
      }
      if (type === 'open' && isToday && time <= currentMinutes) type = 'past';
      if (type === 'open') {
        for (let appt of todayAppts) {
          if (time < appt.end && slotEnd > appt.start) { type = 'booked'; break; }
        }
      }
      slots.push({ value: timeStr24, label: label, type: type });
    }
    return slots;
  }, [dentist, selectedDate, appointments]);

  const bookAppointment = async (timeSlot) => {
    if (!selectedPatient) {
      Alert.alert("Error", "Please select who this appointment is for.");
      return;
    }

    setLoading(true);
    try {
      const fullDateTimeStart = `${selectedDate} ${timeSlot.value}:00`;

      const payload = {
        patient_id: selectedPatient.id,
        dentist_id: docId,
        timeStart: fullDateTimeStart,
        procedure: service,
        status: "Scheduled",
        notes: "Booked via App"
      };

      const res = await fetch(API.appointments, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        Alert.alert("Success", `Appointment booked for ${selectedPatient.full_name}!`, [
          { text: "OK", onPress: () => router.replace("/(tabs)/appointments") }
        ]);
      } else {
        const data = await res.json();
        Alert.alert("Failed", data.message || "Could not book appointment.");
      }
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Network error.");
    } finally {
      setLoading(false);
    }
  };

  if (fetchingData) {
    return <View style={styles.loadingCenter}><ActivityIndicator size="large" color="#1B93D5" /></View>;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>

      {/* HEADER WITH BACK BUTTON */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1E293B" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Confirm Booking</Text>
        <Text style={styles.subtitle}>with {doctor}</Text>
      </View>

      <TouchableOpacity
        style={styles.patientSelector}
        onPress={() => setShowPatientModal(true)}
        activeOpacity={0.8}
      >
        <View style={styles.selectorIcon}>
          <Ionicons name={selectedPatient?.id === mainProfile?.id ? "person" : "people"} size={20} color="#1B93D5" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.selectorLabel}>Booking For</Text>
          <Text style={styles.selectorValue}>
            {selectedPatient ? selectedPatient.full_name : "Loading..."}
          </Text>
        </View>
        <Ionicons name="chevron-down" size={20} color="#64748B" />
      </TouchableOpacity>

      <View style={styles.summaryCard}>
        <View style={styles.summaryItem}>
          <View style={styles.iconBox}>
            <Ionicons name="clipboard" size={20} color="#1B93D5" />
          </View>
          <View>
            <Text style={styles.summaryLabel}>Service</Text>
            <Text style={styles.summaryValue}>{service || "Checkup"}</Text>
          </View>
        </View>
      </View>

      <View style={styles.calendarContainer}>
        <View style={styles.calendarHeader}>
          <TouchableOpacity onPress={() => changeMonth(-1)}>
            <Ionicons name="chevron-back" size={24} color="#1E293B" />
          </TouchableOpacity>
          <Text style={styles.monthTitle}>
            {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </Text>
          <TouchableOpacity onPress={() => changeMonth(1)}>
            <Ionicons name="chevron-forward" size={24} color="#1E293B" />
          </TouchableOpacity>
        </View>
        <View style={styles.dayLabels}>{DAYS_OF_WEEK.map(day => <Text key={day} style={styles.dayLabelText}>{day}</Text>)}</View>
        <View style={styles.daysGrid}>{renderCalendar()}</View>
        <View style={styles.legendContainer}>
          <View style={styles.legendItem}><View style={[styles.dotLegend, { backgroundColor: '#22C55E' }]} /><Text style={styles.legendText}>Available</Text></View>
          <View style={styles.legendItem}><View style={[styles.dotLegend, { backgroundColor: '#FCA5A5' }]} /><Text style={styles.legendText}>Off/Full</Text></View>
        </View>
      </View>

      <View style={[styles.loadContainer, isLimitReached ? styles.loadFull : styles.loadAvailable]}>
        <Ionicons name={isLimitReached ? "alert-circle" : "information-circle"} size={20} color={isLimitReached ? "#B91C1C" : "#166534"} />
        <Text style={[styles.loadText, { color: isLimitReached ? "#B91C1C" : "#166534" }]}>Daily Load: {dailyCount} / {limit} Patients</Text>
      </View>

      <Text style={styles.sectionTitle}>Available Times ({selectedDate})</Text>
      {availableSlots.length === 0 ? (
        <View style={styles.noSlotsBox}>
          <Text style={styles.noSlotsText}>
            {dentist?.status === 'Off' ? "Dentist is currently marked as Off." : isLimitReached ? "Fully booked for this date." : "No available slots for this date."}
          </Text>
        </View>
      ) : (
        <View style={styles.timeGrid}>
          {loading ? (
            <ActivityIndicator size="large" color="#1B93D5" style={{ marginVertical: 20 }} />
          ) : (
            availableSlots.map((slot, i) => {
              const isDisabled = slot.type !== 'open' || isLimitReached;
              const isLabel = slot.type === 'lunch' || slot.type === 'break';
              return (
                <TouchableOpacity
                  key={i}
                  style={[styles.timeButton, isDisabled && styles.bookedTimeButton]}
                  onPress={() => bookAppointment(slot)}
                  activeOpacity={0.7}
                  disabled={isDisabled}
                >
                  <Text style={[styles.timeText, isDisabled && styles.bookedTimeText, isLabel && styles.labelTimeText]}>{slot.label}</Text>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      )}

      <Modal
        animationType="slide"
        transparent={true}
        visible={showPatientModal}
        onRequestClose={() => setShowPatientModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowPatientModal(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Who is this appointment for?</Text>

            {mainProfile && (
              <TouchableOpacity
                style={[styles.patientOption, selectedPatient?.id === mainProfile.id && styles.patientOptionSelected]}
                onPress={() => { setSelectedPatient(mainProfile); setShowPatientModal(false); }}
              >
                <View style={[styles.optionIcon, { backgroundColor: '#E0F2FE' }]}>
                  <Ionicons name="person" size={20} color="#0284C7" />
                </View>
                <Text style={styles.optionText}>Myself ({mainProfile.full_name.split(' ')[0]})</Text>
                {selectedPatient?.id === mainProfile.id && <Ionicons name="checkmark" size={20} color="#0284C7" />}
              </TouchableOpacity>
            )}

            {familyMembers.map(member => (
              <TouchableOpacity
                key={member.id}
                style={[styles.patientOption, selectedPatient?.id === member.id && styles.patientOptionSelected]}
                onPress={() => { setSelectedPatient(member); setShowPatientModal(false); }}
              >
                <View style={[styles.optionIcon, { backgroundColor: '#FCE7F3' }]}>
                  <Ionicons name="people" size={20} color="#DB2777" />
                </View>
                <Text style={styles.optionText}>{member.full_name}</Text>
                {selectedPatient?.id === member.id && <Ionicons name="checkmark" size={20} color="#DB2777" />}
              </TouchableOpacity>
            ))}

            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setShowPatientModal(false)}>
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  contentContainer: { padding: 24, paddingTop: 40 },
  loadingCenter: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { marginBottom: 20 },

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

  title: { fontSize: 28, fontWeight: "800", color: "#1E293B", marginBottom: 4, letterSpacing: -0.5 },
  subtitle: { fontSize: 16, color: "#64748B", fontWeight: "500" },

  patientSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
    shadowColor: "#64748B",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  selectorIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#F0F9FF', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  selectorLabel: { fontSize: 11, color: '#94A3B8', fontWeight: '700', textTransform: 'uppercase' },
  selectorValue: { fontSize: 16, color: '#1E293B', fontWeight: '700' },

  summaryCard: { backgroundColor: "white", borderRadius: 20, padding: 20, shadowColor: "#64748B", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3, borderWidth: 1, borderColor: "#F1F5F9", marginBottom: 24 },
  summaryItem: { flexDirection: "row", alignItems: "center" },
  iconBox: { width: 40, height: 40, borderRadius: 12, backgroundColor: "#F0F9FF", justifyContent: "center", alignItems: "center", marginRight: 16 },
  summaryLabel: { fontSize: 12, color: "#94A3B8", fontWeight: "600", textTransform: "uppercase", marginBottom: 2 },
  summaryValue: { fontSize: 16, fontWeight: "700", color: "#1E293B" },

  sectionTitle: { fontSize: 14, fontWeight: "700", color: "#94A3B8", marginBottom: 12, textTransform: "uppercase", letterSpacing: 0.5 },

  calendarContainer: { backgroundColor: 'white', borderRadius: 16, padding: 16, marginBottom: 24, borderWidth: 1, borderColor: '#E2E8F0' },
  calendarHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  monthTitle: { fontSize: 16, fontWeight: '700', color: '#1E293B' },
  dayLabels: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  dayLabelText: { width: '14.28%', textAlign: 'center', color: '#94A3B8', fontSize: 12, fontWeight: '600' },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calendarDay: { width: '14.28%', aspectRatio: 1, justifyContent: 'center', alignItems: 'center', marginVertical: 4, borderRadius: 20 },
  selectedDay: { backgroundColor: '#E0F2FE', borderWidth: 2, borderColor: '#1B93D5' },
  openDay: { backgroundColor: '#F0FDF4' },
  offDay: { backgroundColor: '#FEF2F2' },
  pastDay: { opacity: 0.3 },
  dayText: { fontSize: 14, color: '#334155', fontWeight: '500' },
  selectedDayText: { color: '#0284C7', fontWeight: '700' },
  offDayText: { color: '#EF4444' },
  pastDayText: { color: '#CBD5E1' },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#22C55E', position: 'absolute', bottom: 6 },
  legendContainer: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dotLegend: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 12, color: '#64748B' },

  timeGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12 },
  timeButton: { width: '30%', backgroundColor: "white", borderRadius: 12, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: "#E2E8F0", marginBottom: 8 },
  bookedTimeButton: { backgroundColor: "#F1F5F9", borderColor: "#F1F5F9" },
  bookedTimeText: { color: "#94A3B8", textDecorationLine: 'line-through' },
  labelTimeText: { color: "#64748B", fontWeight: '700', textDecorationLine: 'none', fontSize: 12 },
  timeText: { fontSize: 14, fontWeight: "600", color: "#334155" },
  noSlotsBox: { padding: 20, alignItems: 'center', backgroundColor: '#F1F5F9', borderRadius: 12 },
  noSlotsText: { color: '#64748B', fontStyle: 'italic', textAlign: 'center' },

  loadContainer: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, marginBottom: 24, borderWidth: 1 },
  loadAvailable: { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' },
  loadFull: { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },
  loadText: { fontWeight: '700', marginLeft: 8, fontSize: 14 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#1E293B', marginBottom: 20, textAlign: 'center' },
  patientOption: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, backgroundColor: '#F8FAFC', marginBottom: 12, borderWidth: 1, borderColor: 'transparent' },
  patientOptionSelected: { backgroundColor: '#F0F9FF', borderColor: '#1B93D5' },
  optionIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  optionText: { flex: 1, fontSize: 16, color: '#334155', fontWeight: '600' },
  modalCloseBtn: { marginTop: 12, padding: 16, alignItems: 'center' },
  modalCloseText: { color: '#64748B', fontWeight: '600' }
});