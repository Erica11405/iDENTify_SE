// import {
//   View,
//   Text,
//   StyleSheet,
//   TouchableOpacity,
//   ScrollView,
//   RefreshControl,
//   ActivityIndicator,
//   FlatList
// } from "react-native";
// import { Ionicons } from "@expo/vector-icons";
// import { useRouter, useFocusEffect } from "expo-router";
// import { useState, useCallback } from "react";
// import { API, fetchPatientByEmail } from "../../constants/Api";
// import { useUser } from "@clerk/clerk-expo";

// export default function AppointmentsScreen() {
//   const router = useRouter();
//   const { user } = useUser();
//   const [appointments, setAppointments] = useState([]);
//   const [refreshing, setRefreshing] = useState(false);
//   const [loading, setLoading] = useState(true);

//   const fetchAppointments = async () => {
//     if (!user?.primaryEmailAddress?.emailAddress) return;
//     if (!refreshing) setLoading(true);
//     try {
//       const patient = await fetchPatientByEmail(user.primaryEmailAddress.emailAddress);

//       if (patient) {
//         const res = await fetch(`${API.appointments}?patient_id=${patient.id}`);
//         const myAppts = await res.json();

//         // Sort: Newest/Upcoming first
//         myAppts.sort((a, b) => new Date(a.appointment_datetime) - new Date(b.appointment_datetime));
//         setAppointments(myAppts);
//       }
//     } catch (error) {
//       console.error("Error fetching appointments:", error);
//     } finally {
//       setLoading(false);
//       setRefreshing(false);
//     }
//   };

//   const onRefresh = useCallback(() => {
//     setRefreshing(true);
//     fetchAppointments();
//   }, [user]);

//   useFocusEffect(
//     useCallback(() => {
//       fetchAppointments();
//     }, [user])
//   );

//   const getStatusColor = (status) => {
//     switch (status) {
//       case 'Done': return { bg: '#DCFCE7', text: '#166534' };
//       case 'Cancelled': return { bg: '#FEE2E2', text: '#991B1B' };
//       case 'Checked-In': return { bg: '#DBEAFE', text: '#1E40AF' };
//       default: return { bg: '#FEF3C7', text: '#92400E' };
//     }
//   };

//   return (
//     <View style={styles.container}>
//       <View style={styles.headerContainer}>
//         <Text style={styles.headerTitle}>My Appointments</Text>
//         <TouchableOpacity
//           style={styles.addButton}
//           onPress={() => router.push("/appointments/book")}
//         >
//           <Ionicons name="add" size={24} color="#fff" />
//         </TouchableOpacity>
//       </View>

//       {loading && !refreshing ? (
//         <View style={styles.centerContainer}>
//           <ActivityIndicator size="large" color="#1B93D5" />
//         </View>
//       ) : appointments.length === 0 ? (
//         <ScrollView
//           contentContainerStyle={styles.emptyState}
//           refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
//         >
//           <Ionicons name="calendar-clear-outline" size={64} color="#CBD5E1" />
//           <Text style={styles.emptyTitle}>No appointments found</Text>
//           <Text style={styles.emptySubtitle}>Book an appointment to get started.</Text>
//         </ScrollView>
//       ) : (
//         <FlatList
//           data={appointments}
//           keyExtractor={(item) => item.id.toString()}
//           contentContainerStyle={styles.listContent}
//           refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#1B93D5"]} />}
//           renderItem={({ item }) => {
//             const statusStyle = getStatusColor(item.status);
//             const dateObj = new Date(item.appointment_datetime);

//             return (
//               <TouchableOpacity
//                 style={styles.card}
//                 activeOpacity={0.7}
//                 onPress={() => router.push(`/appointments/${item.id}`)}
//               >
//                 <View style={styles.dateBox}>
//                   <Text style={styles.dayText}>{dateObj.getDate()}</Text>
//                   <Text style={styles.monthText}>{dateObj.toLocaleDateString(undefined, { month: 'short' })}</Text>
//                 </View>

//                 <View style={styles.divider} />

//                 <View style={styles.info}>
//                   <Text style={styles.procText} numberOfLines={1}>{item.procedure || "Check-up"}</Text>
//                   <Text style={styles.docText}>
//                     {item.dentist_name || "Dr. Assigned"}
//                   </Text>
//                   <View style={[styles.badge, { backgroundColor: statusStyle.bg }]}>
//                     <Text style={[styles.badgeText, { color: statusStyle.text }]}>{item.status}</Text>
//                   </View>
//                 </View>

//                 <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
//               </TouchableOpacity>
//             );
//           }}
//         />
//       )}
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: { flex: 1, backgroundColor: "#F8FAFC" },
//   headerContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingTop: 60, paddingBottom: 20 },
//   headerTitle: { fontSize: 28, fontWeight: "800", color: "#1E293B" },
//   addButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#1B93D5", justifyContent: 'center', alignItems: 'center', elevation: 4, shadowColor: "#1B93D5", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
//   centerContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
//   listContent: { padding: 20 },
//   emptyState: { flex: 1, justifyContent: "center", alignItems: "center", paddingTop: 100 },
//   emptyTitle: { fontSize: 20, fontWeight: "700", color: "#1E293B", marginTop: 16 },
//   emptySubtitle: { fontSize: 15, color: "#64748B", marginTop: 4 },

//   card: { flexDirection: "row", alignItems: "center", backgroundColor: "white", padding: 16, borderRadius: 16, marginBottom: 12, shadowColor: "#64748B", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
//   dateBox: { alignItems: 'center', width: 40 },
//   dayText: { fontSize: 20, fontWeight: '800', color: '#1B93D5' },
//   monthText: { fontSize: 12, fontWeight: '600', color: '#64748B', textTransform: 'uppercase' },
//   divider: { width: 1, height: '80%', backgroundColor: '#F1F5F9', marginHorizontal: 16 },
//   info: { flex: 1 },
//   procText: { fontSize: 16, fontWeight: '700', color: '#1E293B', marginBottom: 4 },
//   docText: { fontSize: 13, color: '#64748B', marginBottom: 6 },
//   badge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
//   badgeText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
// });
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  FlatList
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import { useState, useCallback } from "react";
import { API, fetchPatientByEmail } from "../../constants/Api";
import { useUser } from "@clerk/clerk-expo";

export default function AppointmentsScreen() {
  const router = useRouter();
  const { user } = useUser();
  const [appointments, setAppointments] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchAppointments = async () => {
    if (!user?.primaryEmailAddress?.emailAddress) return;
    if (!refreshing) setLoading(true);
    try {
      // 1. Get Main Patient
      const mainPatient = await fetchPatientByEmail(user.primaryEmailAddress.emailAddress);
      if (!mainPatient) return;

      // 2. Get Family Members
      let allPatientIds = [mainPatient.id];
      try {
        const familyRes = await fetch(`${API.patients}/${mainPatient.id}/family`);
        if (familyRes.ok) {
          const familyData = await familyRes.json();
          const familyIds = familyData.map(m => m.id);
          allPatientIds = [...allPatientIds, ...familyIds];
        }
      } catch (e) {
        console.log("No family members found or error fetching");
      }

      // 3. Fetch Appointments for ALL IDs (Parallel Requests)
      const promises = allPatientIds.map(id =>
        fetch(`${API.appointments}?patient_id=${id}`).then(r => r.json())
      );

      const results = await Promise.all(promises);
      const allAppts = results.flat();

      // 4. Sort: Newest/Upcoming first
      allAppts.sort((a, b) => new Date(a.appointment_datetime) - new Date(b.appointment_datetime));
      setAppointments(allAppts);

    } catch (error) {
      console.error("Error fetching appointments:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAppointments();
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      fetchAppointments();
    }, [user])
  );

  const getStatusColor = (status) => {
    switch (status) {
      case 'Done': return { bg: '#DCFCE7', text: '#166534' };
      case 'Cancelled': return { bg: '#FEE2E2', text: '#991B1B' };
      case 'Checked-In': return { bg: '#DBEAFE', text: '#1E40AF' };
      default: return { bg: '#FEF3C7', text: '#92400E' };
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.headerTitle}>All Appointments</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push("/appointments/book")}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#1B93D5" />
        </View>
      ) : appointments.length === 0 ? (
        <ScrollView
          contentContainerStyle={styles.emptyState}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <Ionicons name="calendar-clear-outline" size={64} color="#CBD5E1" />
          <Text style={styles.emptyTitle}>No appointments found</Text>
          <Text style={styles.emptySubtitle}>Book for yourself or family members.</Text>
        </ScrollView>
      ) : (
        <FlatList
          data={appointments}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#1B93D5"]} />}
          renderItem={({ item }) => {
            const statusStyle = getStatusColor(item.status);
            const dateObj = new Date(item.appointment_datetime);

            return (
              <TouchableOpacity
                style={styles.card}
                activeOpacity={0.7}
                onPress={() => router.push(`/appointments/${item.id}`)}
              >
                <View style={styles.dateBox}>
                  <Text style={styles.dayText}>{dateObj.getDate()}</Text>
                  <Text style={styles.monthText}>{dateObj.toLocaleDateString(undefined, { month: 'short' })}</Text>
                </View>

                <View style={styles.divider} />

                <View style={styles.info}>
                  {/* --- NEW: PATIENT NAME BADGE --- */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                    <Ionicons name="person" size={12} color="#64748B" style={{ marginRight: 4 }} />
                    <Text style={{ fontSize: 12, color: "#64748B", fontWeight: "600" }}>
                      {item.full_name} {/* Shows Patient Name */}
                    </Text>
                  </View>

                  <Text style={styles.procText} numberOfLines={1}>{item.procedure || "Check-up"}</Text>
                  <Text style={styles.docText}>
                    {item.dentist_name || "Dr. Assigned"}
                  </Text>
                  <View style={[styles.badge, { backgroundColor: statusStyle.bg }]}>
                    <Text style={[styles.badgeText, { color: statusStyle.text }]}>{item.status}</Text>
                  </View>
                </View>

                <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  headerContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingTop: 60, paddingBottom: 20 },
  headerTitle: { fontSize: 28, fontWeight: "800", color: "#1E293B" },
  addButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#1B93D5", justifyContent: 'center', alignItems: 'center', elevation: 4, shadowColor: "#1B93D5", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  centerContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  listContent: { padding: 20 },
  emptyState: { flex: 1, justifyContent: "center", alignItems: "center", paddingTop: 100 },
  emptyTitle: { fontSize: 20, fontWeight: "700", color: "#1E293B", marginTop: 16 },
  emptySubtitle: { fontSize: 15, color: "#64748B", marginTop: 4 },

  card: { flexDirection: "row", alignItems: "center", backgroundColor: "white", padding: 16, borderRadius: 16, marginBottom: 12, shadowColor: "#64748B", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  dateBox: { alignItems: 'center', width: 40 },
  dayText: { fontSize: 20, fontWeight: '800', color: '#1B93D5' },
  monthText: { fontSize: 12, fontWeight: '600', color: '#64748B', textTransform: 'uppercase' },
  divider: { width: 1, height: '80%', backgroundColor: '#F1F5F9', marginHorizontal: 16 },
  info: { flex: 1 },
  procText: { fontSize: 16, fontWeight: '700', color: '#1E293B', marginBottom: 4 },
  docText: { fontSize: 13, color: '#64748B', marginBottom: 6 },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  badgeText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
});