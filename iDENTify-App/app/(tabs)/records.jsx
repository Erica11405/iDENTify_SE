// import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, RefreshControl, ScrollView } from "react-native";
// import { Ionicons } from "@expo/vector-icons";
// import { useRouter, useFocusEffect } from "expo-router";
// import { useState, useCallback } from "react";
// import { API, fetchPatientByEmail } from "../../constants/Api";
// import { useUser } from "@clerk/clerk-expo";

// export default function RecordsScreen() {
//   const router = useRouter();
//   const { user } = useUser();
//   const [records, setRecords] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [refreshing, setRefreshing] = useState(false);

//   const fetchRecords = async () => {
//     if (!user?.primaryEmailAddress?.emailAddress) return;
//     if (!refreshing) setLoading(true);

//     try {
//       const patient = await fetchPatientByEmail(user.primaryEmailAddress.emailAddress);

//       if (patient) {
//         // Fetch Treatment History directly
//         const res = await fetch(`${API.records}/${patient.id}`);
//         const data = await res.json();

//         // Sort newest first based on start_time or ID
//         const sortedData = Array.isArray(data)
//           ? data.sort((a, b) => new Date(b.start_time || b.id) - new Date(a.start_time || a.id))
//           : [];

//         setRecords(sortedData);
//       }
//     } catch (error) {
//       console.error("Error fetching records:", error);
//     } finally {
//       setLoading(false);
//       setRefreshing(false);
//     }
//   };

//   const onRefresh = useCallback(() => {
//     setRefreshing(true);
//     fetchRecords();
//   }, [user]);

//   useFocusEffect(
//     useCallback(() => {
//       fetchRecords();
//     }, [user])
//   );

//   return (
//     <View style={styles.container}>
//       <View style={styles.header}>
//         <Text style={styles.title}>Treatment Records</Text>
//         <Text style={styles.subtitle}>Your medical history & procedures</Text>
//       </View>

//       {loading && !refreshing ? (
//         <View style={styles.loadingContainer}>
//           <ActivityIndicator size="large" color="#1B93D5" />
//         </View>
//       ) : records.length === 0 ? (
//         <ScrollView
//           contentContainerStyle={styles.emptyContainer}
//           refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
//         >
//           <View style={styles.emptyIconBox}>
//             <Ionicons name="folder-open-outline" size={48} color="#CBD5E1" />
//           </View>
//           <Text style={styles.emptyText}>No treatment records found.</Text>
//           <Text style={styles.emptySubtext}>Completed procedures will appear here.</Text>
//         </ScrollView>
//       ) : (
//         <FlatList
//           data={records}
//           keyExtractor={(item) => item.id.toString()}
//           contentContainerStyle={styles.listContent}
//           refreshControl={
//             <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#1B93D5"]} />
//           }
//           renderItem={({ item }) => (
//             <TouchableOpacity
//               style={styles.card}
//               activeOpacity={0.7}
//               onPress={() => router.push(`/records/details?id=${item.id}`)}
//             >
//               <View style={styles.dateBox}>
//                 <Ionicons name="calendar-outline" size={18} color="#1B93D5" />
//                 <Text style={styles.dateText}>
//                   {item.start_time ? item.start_time.split(' ')[0] : "N/A"}
//                 </Text>
//               </View>

//               <View style={styles.infoBox}>
//                 <Text style={styles.procedureName}>{item.procedure_text || "Unspecified Procedure"}</Text>
//                 <Text style={styles.doctorName}>
//                   <Ionicons name="person-outline" size={12} /> {item.provider || "Dr. Assigned"}
//                 </Text>
//               </View>

//               {item.image_url ? (
//                 <Ionicons name="attach" size={20} color="#1B93D5" style={{ marginRight: 4 }} />
//               ) : null}

//               <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
//             </TouchableOpacity>
//           )}
//         />
//       )}
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: { flex: 1, backgroundColor: "#F8FAFC" },
//   header: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 20, backgroundColor: "white", borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
//   title: { fontSize: 28, fontWeight: "800", color: "#1E293B", letterSpacing: -0.5 },
//   subtitle: { fontSize: 15, color: "#64748B", marginTop: 4 },

//   loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },

//   listContent: { padding: 20 },
//   card: { flexDirection: "row", alignItems: "center", backgroundColor: "white", padding: 16, borderRadius: 16, marginBottom: 12, shadowColor: "#64748B", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2, borderWidth: 1, borderColor: "#F1F5F9" },

//   dateBox: { alignItems: "center", justifyContent: "center", backgroundColor: "#F0F9FF", borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12, marginRight: 16 },
//   dateText: { fontSize: 12, fontWeight: "700", color: "#0284C7", marginTop: 2 },

//   infoBox: { flex: 1 },
//   procedureName: { fontSize: 16, fontWeight: "700", color: "#1E293B", marginBottom: 4 },
//   doctorName: { fontSize: 13, color: "#64748B", fontWeight: "500" },

//   emptyContainer: { flex: 1, justifyContent: "center", alignItems: "center", paddingBottom: 100 },
//   emptyIconBox: { width: 80, height: 80, borderRadius: 40, backgroundColor: "#F1F5F9", justifyContent: "center", alignItems: "center", marginBottom: 16 },
//   emptyText: { fontSize: 18, fontWeight: "700", color: "#1E293B", marginBottom: 8 },
//   emptySubtext: { fontSize: 14, color: "#94A3B8" },
// });

import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, RefreshControl, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import { useState, useCallback } from "react";
import { API, fetchPatientByEmail } from "../../constants/Api";
import { useUser } from "@clerk/clerk-expo";

export default function RecordsScreen() {
  const router = useRouter();
  const { user } = useUser();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchRecords = async () => {
    if (!user?.primaryEmailAddress?.emailAddress) return;
    if (!refreshing) setLoading(true);

    try {
      // 1. Get Main Patient
      const mainPatient = await fetchPatientByEmail(user.primaryEmailAddress.emailAddress);
      if (!mainPatient) return;

      // 2. Get Family Members & Create Name Map
      const patientsMap = { [mainPatient.id]: "Myself" };
      let allPatientIds = [mainPatient.id];

      try {
        const familyRes = await fetch(`${API.patients}/${mainPatient.id}/family`);
        if (familyRes.ok) {
          const familyData = await familyRes.json();
          familyData.forEach(m => {
            patientsMap[m.id] = m.full_name;
            allPatientIds.push(m.id);
          });
        }
      } catch (e) { console.log("No family"); }

      // 3. Fetch Records for ALL
      const promises = allPatientIds.map(id =>
        fetch(`${API.records}/${id}`).then(r => r.json())
      );

      const results = await Promise.all(promises);

      // 4. Flatten & Attach Name
      const allRecords = results.flat().map(r => ({
        ...r,
        patientName: patientsMap[r.patient_id] || "Unknown"
      }));

      // 5. Sort newest first
      allRecords.sort((a, b) => new Date(b.start_time || b.id) - new Date(a.start_time || a.id));

      setRecords(allRecords);

    } catch (error) {
      console.error("Error fetching records:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchRecords();
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      fetchRecords();
    }, [user])
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Treatment Records</Text>
        <Text style={styles.subtitle}>History for you & family</Text>
      </View>

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1B93D5" />
        </View>
      ) : records.length === 0 ? (
        <ScrollView
          contentContainerStyle={styles.emptyContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <View style={styles.emptyIconBox}>
            <Ionicons name="folder-open-outline" size={48} color="#CBD5E1" />
          </View>
          <Text style={styles.emptyText}>No treatment records found.</Text>
          <Text style={styles.emptySubtext}>Completed procedures appear here.</Text>
        </ScrollView>
      ) : (
        <FlatList
          data={records}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#1B93D5"]} />
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              activeOpacity={0.7}
              onPress={() => router.push(`/records/details?id=${item.id}`)}
            >
              <View style={styles.dateBox}>
                <Ionicons name="calendar-outline" size={18} color="#1B93D5" />
                <Text style={styles.dateText}>
                  {item.start_time ? item.start_time.split(' ')[0] : "N/A"}
                </Text>
              </View>

              <View style={styles.infoBox}>
                {/* --- PATIENT BADGE --- */}
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                  <Ionicons name="person" size={10} color="#64748B" style={{ marginRight: 4 }} />
                  <Text style={{ fontSize: 11, color: "#64748B", fontWeight: "700", textTransform: 'uppercase' }}>
                    {item.patientName}
                  </Text>
                </View>

                <Text style={styles.procedureName}>{item.procedure_text || "Unspecified Procedure"}</Text>
                <Text style={styles.doctorName}>
                  <Ionicons name="person-outline" size={12} /> {item.provider || "Dr. Assigned"}
                </Text>
              </View>

              {item.image_url ? (
                <Ionicons name="attach" size={20} color="#1B93D5" style={{ marginRight: 4 }} />
              ) : null}

              <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  header: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 20, backgroundColor: "white", borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  title: { fontSize: 28, fontWeight: "800", color: "#1E293B", letterSpacing: -0.5 },
  subtitle: { fontSize: 15, color: "#64748B", marginTop: 4 },

  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },

  listContent: { padding: 20 },
  card: { flexDirection: "row", alignItems: "center", backgroundColor: "white", padding: 16, borderRadius: 16, marginBottom: 12, shadowColor: "#64748B", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2, borderWidth: 1, borderColor: "#F1F5F9" },

  dateBox: { alignItems: "center", justifyContent: "center", backgroundColor: "#F0F9FF", borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12, marginRight: 16 },
  dateText: { fontSize: 12, fontWeight: "700", color: "#0284C7", marginTop: 2 },

  infoBox: { flex: 1 },
  procedureName: { fontSize: 16, fontWeight: "700", color: "#1E293B", marginBottom: 4 },
  doctorName: { fontSize: 13, color: "#64748B", fontWeight: "500" },

  emptyContainer: { flex: 1, justifyContent: "center", alignItems: "center", paddingBottom: 100 },
  emptyIconBox: { width: 80, height: 80, borderRadius: 40, backgroundColor: "#F1F5F9", justifyContent: "center", alignItems: "center", marginBottom: 16 },
  emptyText: { fontSize: 18, fontWeight: "700", color: "#1E293B", marginBottom: 8 },
  emptySubtext: { fontSize: 14, color: "#94A3B8" },
});