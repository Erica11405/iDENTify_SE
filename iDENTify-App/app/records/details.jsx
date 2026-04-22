import { View, Text, StyleSheet, Image, ScrollView, ActivityIndicator, Alert, TouchableOpacity } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState, useEffect, useMemo } from "react";
import { Ionicons } from "@expo/vector-icons";
import { API } from "../../constants/Api";

export default function RecordDetails() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [record, setRecord] = useState(null);
  const [medications, setMedications] = useState([]);
  const [medicationsUnavailable, setMedicationsUnavailable] = useState(false);
  const [loading, setLoading] = useState(true);

  const formatPeso = (value) => {
    const amount = Number.parseFloat(String(value ?? ""));
    if (!Number.isFinite(amount)) return "Not recorded";
    return `PHP ${amount.toFixed(2)}`;
  };

  const getDentistDisplay = () => {
    if (!record?.dentist_name) return "Not recorded";
    return `Dr. ${record.dentist_name}`;
  };

  const getProviderDisplay = () => {
    if (!record?.provider) return "Not recorded";
    return record.provider;
  };

  useEffect(() => {
    const fetchDetailAndMeds = async () => {
      try {
        setMedicationsUnavailable(false);
        const res = await fetch(`${API.records}/record/${id}`);
        if (!res.ok) throw new Error("Failed to fetch record.");
        const data = await res.json();
        setRecord(data);

        try {
          const medsRes = await fetch(`${API.medications}/record/${id}`);
          if (!medsRes.ok) {
            throw new Error("Failed to fetch medications.");
          }
          const medsData = await medsRes.json();
          setMedications(Array.isArray(medsData) ? medsData : []);
        } catch (medsError) {
          console.error("Medication fetch error:", medsError);
          setMedications([]);
          setMedicationsUnavailable(true);
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

  const parsedProcedures = useMemo(() => {
    if (!record?.procedure_text) return [];
    try {
      const parsed = JSON.parse(record.procedure_text);
      if (Array.isArray(parsed)) {
        return parsed.map(item => (typeof item === 'object' ? item : { name: item, price: 0 }));
      }
    } catch (e) {
      // not json
    }
    return [{ name: record.procedure_text, price: 0 }];
  }, [record?.procedure_text]);

  const procedureTitle = useMemo(() => {
    if (parsedProcedures.length === 0) return "N/A";
    return parsedProcedures.map(p => p.name).join(", ");
  }, [parsedProcedures]);

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
      <Text style={styles.procedure}>{procedureTitle}</Text>

      {parsedProcedures.length > 1 && (
        <View style={{ marginBottom: 20 }}>
          <Text style={styles.sectionLabel}>Service Breakdown</Text>
          {parsedProcedures.map((proc, idx) => (
            <View key={idx} style={styles.breakdownRow}>
              <Text style={styles.breakdownName}>{proc.name}</Text>
              <Text style={styles.breakdownPrice}>{formatPeso(proc.price)}</Text>
            </View>
          ))}
        </View>
      )}

      <Text style={styles.sectionLabel}>Appointment Details</Text>
      <View style={styles.detailCard}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Appointed Dentist</Text>
          <Text style={styles.detailValue}>{getDentistDisplay()}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Provider</Text>
          <Text style={styles.detailValue}>{getProviderDisplay()}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Price Paid</Text>
          <Text style={styles.detailValue}>{formatPeso(record.price)}</Text>
        </View>
      </View>

      <View style={styles.divider} />

      <Text style={styles.sectionLabel}>Clinical Notes</Text>
      <Text style={styles.notes}>{record.notes || "No notes available."}</Text>

      <View style={styles.dividerLarge} />

      <Text style={styles.sectionLabel}>Prescribed Medications</Text>
      {medicationsUnavailable ? (
        <Text style={styles.notes}>Medication details are currently unavailable for this session.</Text>
      ) : medications.length === 0 ? (
        <Text style={styles.notes}>No active medications.</Text>
      ) : (
        medications.map((med, index) => (
          <View key={med.id || index} style={styles.medCard}>
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
  procedure: { fontSize: 24, fontWeight: "800", color: "#1E293B", marginBottom: 16 },
  detailCard: { backgroundColor: "#F8FAFC", borderRadius: 12, padding: 14, borderWidth: 1, borderColor: "#E2E8F0", marginBottom: 20 },
  detailRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  detailLabel: { color: "#64748B", fontWeight: "700", fontSize: 12, textTransform: "uppercase" },
  detailValue: { color: "#1E293B", fontWeight: "700", fontSize: 15, flexShrink: 1, textAlign: "right" },
  divider: { height: 1, backgroundColor: "#F1F5F9", marginBottom: 20 },
  dividerLarge: { height: 1, backgroundColor: "#F1F5F9", marginVertical: 24 },
  sectionLabel: { fontSize: 12, fontWeight: "700", color: "#94A3B8", textTransform: "uppercase", marginBottom: 8 },
  notes: { fontSize: 16, color: "#334155", lineHeight: 24 },
  medCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', padding: 12, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: '#E2E8F0' },
  medName: { fontSize: 15, fontWeight: '700', color: '#1E293B' },
  medDetails: { fontSize: 13, color: '#64748B', marginTop: 2 },
  imageBox: { marginTop: 30 },
  image: { width: "100%", height: 300, borderRadius: 12, backgroundColor: "#F8FAFC" },
  breakdownRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  breakdownName: { fontSize: 14, color: '#334155', fontWeight: '500' },
  breakdownPrice: { fontSize: 14, color: '#1E293B', fontWeight: '600' }
});