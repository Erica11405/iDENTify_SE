import { View, Text, StyleSheet, TouchableOpacity, FlatList, RefreshControl } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import { useState, useCallback } from "react";
import { API, fetchPatientByEmail } from "../../constants/Api";
import { useUser } from "@clerk/clerk-expo";

export default function RecordsScreen() {
  const router = useRouter();
  const { user } = useUser();
  const userEmail = user?.primaryEmailAddress?.emailAddress;
  const [records, setRecords] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchRecords = useCallback(async () => {
    if (!userEmail) return;

    try {
      const mainPatient = await fetchPatientByEmail(userEmail);
      if (!mainPatient) return;

      const patientsMap = { [mainPatient.id]: "Myself" };
      let allPatientIds = [mainPatient.id];

      // Fetch family members to include their records
      try {
        const familyRes = await fetch(`${API.patients}/${mainPatient.id}/family`);
        if (familyRes.ok) {
          const familyData = await familyRes.json();
          familyData.forEach(m => {
            patientsMap[m.id] = m.full_name;
            allPatientIds.push(m.id);
          });
        }
      } catch (_e) { console.log("No family found"); }

      const promises = allPatientIds.map(id =>
        fetch(`${API.records}/${id}`).then(r => r.json())
      );

      const results = await Promise.all(promises);
      const allRecords = results.flat().map(r => ({
        ...r,
        patientName: patientsMap[r.patient_id] || "Unknown"
      }));

      // Sort newest first
      allRecords.sort((a, b) => new Date(b.start_time || b.id) - new Date(a.start_time || a.id));
      setRecords(allRecords);

    } catch (error) {
      console.error("Error fetching records:", error);
    } finally {
      setRefreshing(false);
    }
  }, [userEmail]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchRecords();
  }, [fetchRecords]);

  useFocusEffect(useCallback(() => { fetchRecords(); }, [fetchRecords]));

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Treatment Records</Text>
        <Text style={styles.subtitle}>History for you & family</Text>
      </View>

      <FlatList
        data={records}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={styles.card} 
            onPress={() => router.push(`/records/details?id=${item.id}`)}
          >
            <View style={styles.dateBox}>
              <Text style={styles.dateText}>{item.start_time ? item.start_time.split(' ')[0] : "N/A"}</Text>
            </View>

            <View style={styles.infoBox}>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{item.patientName}</Text>
              </View>
              <Text style={styles.procedureName}>{item.procedure_text}</Text>
              <Text style={styles.doctorName}>{item.provider}</Text>
            </View>
            
            {item.image_url && <Ionicons name="attach" size={20} color="#1B93D5" />}
            <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  header: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 20, backgroundColor: "white" },
  title: { fontSize: 28, fontWeight: "800", color: "#1E293B" },
  subtitle: { fontSize: 15, color: "#64748B" },
  listContent: { padding: 20 },
  card: { flexDirection: "row", alignItems: "center", backgroundColor: "white", padding: 16, borderRadius: 16, marginBottom: 12 },
  dateBox: { backgroundColor: "#F0F9FF", padding: 10, borderRadius: 10, marginRight: 12 },
  dateText: { fontSize: 12, fontWeight: "700", color: "#0284C7" },
  infoBox: { flex: 1 },
  badge: { backgroundColor: "#F1F5F9", alignSelf: 'flex-start', paddingHorizontal: 6, borderRadius: 4, marginBottom: 4 },
  badgeText: { fontSize: 10, color: "#64748B", fontWeight: "700" },
  procedureName: { fontSize: 16, fontWeight: "700", color: "#1E293B" },
  doctorName: { fontSize: 13, color: "#64748B" }
});