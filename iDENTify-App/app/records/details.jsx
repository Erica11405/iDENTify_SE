// import { View, Text, StyleSheet, Image, ScrollView, ActivityIndicator, Alert, TouchableOpacity } from "react-native";
// import { useLocalSearchParams, useRouter } from "expo-router";
// import { useState, useEffect } from "react";
// import { Ionicons } from "@expo/vector-icons";
// import { API } from "../../constants/Api";

// export default function RecordDetails() {
//   const { id } = useLocalSearchParams();
//   const router = useRouter();
//   const [record, setRecord] = useState(null);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     const fetchDetail = async () => {
//       try {
//         // [FIXED]: Endpoint changed back to the working /record/${id}
//         const res = await fetch(`${API.records}/record/${id}`);
//         if (!res.ok) throw new Error("Failed to fetch record.");
//         const data = await res.json();
//         setRecord(data);
//       } catch (error) {
//         console.error("Error:", error);
//         Alert.alert("Error", "Could not load record details.");
//       } finally {
//         setLoading(false);
//       }
//     };
//     if (id) fetchDetail();
//   }, [id]);

//   if (loading) return <ActivityIndicator size="large" color="#1B93D5" style={{ flex: 1 }} />;
  
//   if (!record) {
//     return (
//       <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
//         <Text>Record not found.</Text>
//         <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 20 }}>
//           <Text style={{ color: "#1B93D5", fontWeight: "bold" }}>Go Back</Text>
//         </TouchableOpacity>
//       </View>
//     );
//   }

//   return (
//     <ScrollView style={styles.container} contentContainerStyle={styles.content}>
//       {/* Added a back button for navigation since the header is usually hidden here */}
//       <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
//         <Ionicons name="arrow-back" size={24} color="#1E293B" />
//         <Text style={styles.backText}>Back</Text>
//       </TouchableOpacity>

//       <Text style={styles.date}>{record.start_time}</Text>
//       <Text style={styles.procedure}>{record.procedure_text}</Text>
      
//       <View style={styles.row}>
//         <Ionicons name="person-outline" size={18} color="#64748B" />
//         <Text style={styles.provider}>Dr. {record.provider}</Text>
//       </View>

//       <View style={styles.divider} />

//       <Text style={styles.sectionLabel}>Clinical Notes</Text>
//       <Text style={styles.notes}>{record.notes || "No notes available."}</Text>

//       {record.image_url ? (
//         <View style={styles.imageBox}>
//           <Text style={styles.sectionLabel}>Attachment</Text>
//           <Image source={{ uri: record.image_url }} style={styles.image} resizeMode="contain" />
//         </View>
//       ) : null}
//     </ScrollView>
//   );
// }

// const styles = StyleSheet.create({
//   container: { flex: 1, backgroundColor: "white" },
//   content: { padding: 24, paddingTop: 60 },
//   backButton: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, marginLeft: -8 },
//   backText: { fontSize: 16, color: "#1E293B", marginLeft: 6, fontWeight: "600" },
//   date: { color: "#1B93D5", fontWeight: "bold", marginBottom: 5 },
//   procedure: { fontSize: 24, fontWeight: "800", color: "#1E293B", marginBottom: 10 },
//   row: { flexDirection: "row", alignItems: "center", marginBottom: 20 },
//   provider: { marginLeft: 8, color: "#64748B", fontSize: 16 },
//   divider: { height: 1, backgroundColor: "#F1F5F9", marginBottom: 20 },
//   sectionLabel: { fontSize: 12, fontWeight: "700", color: "#94A3B8", textTransform: "uppercase", marginBottom: 8 },
//   notes: { fontSize: 16, color: "#334155", lineHeight: 24 },
//   imageBox: { marginTop: 30 },
//   image: { width: "100%", height: 300, borderRadius: 12, backgroundColor: "#F8FAFC" }
// });




import { View, Text, StyleSheet, Image, ScrollView, ActivityIndicator, Alert, TouchableOpacity } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState, useEffect } from "react";
import { Ionicons } from "@expo/vector-icons";
import { API } from "../../constants/Api";

export default function RecordDetails() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [record, setRecord] = useState(null);
  const [medications, setMedications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetailAndMeds = async () => {
      try {
        // Fetch the Record Details
        const res = await fetch(`${API.records}/record/${id}`);
        if (!res.ok) throw new Error("Failed to fetch record.");
        const data = await res.json();
        setRecord(data);

        // Fetch Medications using the patient_id from the record
        if (data.patient_id) {
          const medsRes = await fetch(`${API.medications}/${data.patient_id}`);
          if (medsRes.ok) {
            const medsData = await medsRes.json();
            setMedications(medsData);
          }
        }
      } catch (error) {
        console.error("Error:", error);
        Alert.alert("Error", "Could not load record details.");
      } finally {
        setLoading(false);
      }
    };
    
    if (id) fetchDetailAndMeds();
  }, [id]);

  if (loading) return <ActivityIndicator size="large" color="#1B93D5" style={{ flex: 1 }} />;
  
  if (!record) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <Text>Record not found.</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 20 }}>
          <Text style={{ color: "#1B93D5", fontWeight: "bold" }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <Ionicons name="arrow-back" size={24} color="#1E293B" />
        <Text style={styles.backText}>Back</Text>
      </TouchableOpacity>

      <Text style={styles.date}>{record.start_time}</Text>
      <Text style={styles.procedure}>{record.procedure_text}</Text>
      
      <View style={styles.row}>
        <Ionicons name="person-outline" size={18} color="#64748B" />
        <Text style={styles.provider}>Dr. {record.provider}</Text>
      </View>

      <View style={styles.divider} />

      <Text style={styles.sectionLabel}>Clinical Notes</Text>
      <Text style={styles.notes}>{record.notes || "No notes available."}</Text>

      <View style={styles.dividerLarge} />

      <Text style={styles.sectionLabel}>Prescribed Medications</Text>
      {medications.length === 0 ? (
        <Text style={styles.notes}>No active medications.</Text>
      ) : (
        medications.map((med, index) => (
          <View key={index} style={styles.medCard}>
            <Ionicons name="flask-outline" size={24} color="#20C997" style={{ marginRight: 12 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.medName}>{med.medicine}</Text>
              <Text style={styles.medDetails}>{med.dosage} • {med.frequency}</Text>
            </View>
          </View>
        ))
      )}

      {record.image_url ? (
        <View style={styles.imageBox}>
          <Text style={styles.sectionLabel}>Attachment</Text>
          <Image source={{ uri: record.image_url }} style={styles.image} resizeMode="contain" />
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "white" },
  content: { padding: 24, paddingTop: 60 },
  backButton: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, marginLeft: -8 },
  backText: { fontSize: 16, color: "#1E293B", marginLeft: 6, fontWeight: "600" },
  date: { color: "#1B93D5", fontWeight: "bold", marginBottom: 5 },
  procedure: { fontSize: 24, fontWeight: "800", color: "#1E293B", marginBottom: 10 },
  row: { flexDirection: "row", alignItems: "center", marginBottom: 20 },
  provider: { marginLeft: 8, color: "#64748B", fontSize: 16 },
  divider: { height: 1, backgroundColor: "#F1F5F9", marginBottom: 20 },
  dividerLarge: { height: 1, backgroundColor: "#F1F5F9", marginVertical: 24 },
  sectionLabel: { fontSize: 12, fontWeight: "700", color: "#94A3B8", textTransform: "uppercase", marginBottom: 8 },
  notes: { fontSize: 16, color: "#334155", lineHeight: 24 },
  medCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', padding: 12, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: '#E2E8F0' },
  medName: { fontSize: 15, fontWeight: '700', color: '#1E293B' },
  medDetails: { fontSize: 13, color: '#64748B', marginTop: 2 },
  imageBox: { marginTop: 30 },
  image: { width: "100%", height: 300, borderRadius: 12, backgroundColor: "#F8FAFC" }
});