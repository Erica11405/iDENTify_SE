import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Alert, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, Stack, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { API, fetchPatientByEmail } from "../../constants/Api";
import { useUser } from "@clerk/clerk-expo";
import * as Sharing from 'expo-sharing';
import { SafeAreaView } from "react-native-safe-area-context";

import * as FileSystem from 'expo-file-system/legacy';

export default function RecordDetails() {
  const { id } = useLocalSearchParams();
  const { user } = useUser();
  const router = useRouter();

  const [record, setRecord] = useState(null);
  const [medications, setMedications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const loadAllDetails = async () => {
      if (!id || !user) return;
      setLoading(true);

      try {
        const recordRes = await fetch(`${API.records}/record/${id}`);
        if (recordRes.ok) {
          const recordData = await recordRes.json();
          setRecord(recordData);
        }

        const patient = await fetchPatientByEmail(user.primaryEmailAddress.emailAddress);
        if (patient) {
          const medsRes = await fetch(`${API.medications}/${patient.id}`);
          if (medsRes.ok) {
            const medsData = await medsRes.json();
            setMedications(medsData);
          }
        }

      } catch (error) {
        console.error("Error loading details:", error);
        Alert.alert("Error", "Could not load full details.");
      } finally {
        setLoading(false);
      }
    };

    loadAllDetails();
  }, [id, user]);

  const handleDownload = async () => {
    if (!record?.image_url) return;

    try {
      setDownloading(true);

      // 1. Detect correct extension and mime type
      let extension = "jpg";
      let mimeType = "image/jpeg";

      if (record.image_url.startsWith('data:')) {
        const header = record.image_url.split(';base64,')[0];
        const type = header.split(':')[1];
        if (type) {
          mimeType = type;
          extension = type.split('/')[1];
        }
      }

      // 2. Construct File Path
      const baseDir = FileSystem.cacheDirectory || FileSystem.documentDirectory;
      if (!baseDir) throw new Error("Storage directory not available.");

      const fileName = `Medical_Record_${id}.${extension}`;
      const fileUri = baseDir + fileName;

      // 3. Write file
      if (record.image_url.startsWith('data:')) {
        const base64Code = record.image_url.split('base64,')[1];
        await FileSystem.writeAsStringAsync(fileUri, base64Code, { encoding: 'base64' });
      } else {
        await FileSystem.downloadAsync(record.image_url, fileUri);
      }

      // 4. Share/Save
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: mimeType,
          dialogTitle: "Save X-ray Image",
          UTI: mimeType
        });
      } else {
        Alert.alert("Saved", `File saved to: ${fileUri}`);
      }
    } catch (err) {
      console.error("Download Error Details:", err);
      Alert.alert("Error", `Download failed: ${err.message}`);
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1B93D5" />
      </View>
    );
  }

  if (!record) return null;

  const hasFile = !!record.image_url;

  return (
    <SafeAreaView style={styles.container}>
      {/* Hide default header, we use custom one below */}
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView contentContainerStyle={styles.scrollContent}>

        {/* CUSTOM HEADER WITH BACK BUTTON */}
        <View style={styles.customHeader}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#1E293B" />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Record Details</Text>
        </View>

        <View style={styles.headerSection}>
          <View style={styles.providerAvatar}>
            <Text style={styles.avatarText}>{record.provider ? record.provider.charAt(0) : "D"}</Text>
          </View>
          <View>
            <Text style={styles.providerLabel}>Provided By</Text>
            <Text style={styles.providerName}>{record.provider || "Unknown"}</Text>
          </View>
        </View>

        <View style={styles.mainCard}>
          <View style={styles.cardHeader}>
            <View style={styles.iconCircle}>
              <Ionicons name="medical" size={24} color="#1B93D5" />
            </View>
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>Completed</Text>
            </View>
          </View>
          <Text style={styles.procedureTitle}>{record.procedure_text}</Text>

          <View style={styles.divider} />

          {/* --- PRICING DISPLAY ADDED HERE --- */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Text style={{ fontSize: 16, color: '#64748B', fontWeight: '500' }}>Amount Paid:</Text>
            <Text style={{ fontSize: 20, color: '#0f766e', fontWeight: '800' }}>
              {record.price ? `₱${record.price}` : "₱0.00"}
            </Text>
          </View>
          {/* ---------------------------------- */}

          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={16} color="#6B7280" />
            <Text style={styles.metaText}>{record.start_time || "Date N/A"}</Text>
          </View>
        </View>

        <Text style={styles.sectionHeader}>Doctor's Notes</Text>
        <View style={styles.notesContainer}>
          <Text style={styles.notesText}>{record.notes || "No clinical notes recorded."}</Text>
        </View>

        <Text style={styles.sectionHeader}>Attached Files (X-ray)</Text>
        {hasFile ? (
          <View>
            {record.image_url.startsWith('data:image') && (
              <Image
                source={{ uri: record.image_url }}
                style={{ width: '100%', height: 200, borderRadius: 12, marginBottom: 12, resizeMode: 'cover', borderWidth: 1, borderColor: '#E5E7EB' }}
              />
            )}
            <TouchableOpacity style={styles.attachmentCard} onPress={handleDownload}>
              <View style={styles.fileIconBox}>
                <Ionicons name="image" size={24} color="#FFF" />
              </View>
              <View style={styles.attachmentInfo}>
                <Text style={styles.attachmentName}>View / Save Image</Text>
                <Text style={styles.attachmentSize}>Tap to open options</Text>
              </View>
              {downloading ? <ActivityIndicator size="small" color="#1B93D5" /> : <Ionicons name="share-outline" size={24} color="#1B93D5" />}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.emptyStateBox}>
            <Text style={styles.emptyStateText}>No files attached to this record.</Text>
          </View>
        )}

        <View style={styles.dividerLarge} />
        <Text style={styles.sectionHeader}>Active Prescriptions</Text>

        {medications.length === 0 ? (
          <Text style={styles.emptyStateText}>No active medications.</Text>
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

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  scrollContent: { padding: 20 },

  // Header Styles
  customHeader: { marginBottom: 24, paddingBottom: 10 },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginBottom: 10,
    paddingRight: 10,
    marginLeft: -4
  },
  backText: {
    fontSize: 16,
    color: "#1E293B",
    marginLeft: 6,
    fontWeight: "600"
  },
  headerTitle: { fontSize: 24, fontWeight: "800", color: "#1E293B" },

  headerSection: { flexDirection: "row", alignItems: "center", marginBottom: 24 },
  providerAvatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: "#E0F2FE", justifyContent: "center", alignItems: "center", marginRight: 12, borderWidth: 1, borderColor: "#BAE6FD" },
  avatarText: { fontSize: 20, fontWeight: "700", color: "#0284C7" },
  providerLabel: { fontSize: 12, color: "#6B7280", textTransform: "uppercase" },
  providerName: { fontSize: 18, fontWeight: "700", color: "#111827" },

  mainCard: { backgroundColor: "#FFFFFF", borderRadius: 20, padding: 20, shadowOpacity: 0.05, elevation: 4, marginBottom: 24 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 16 },
  iconCircle: { width: 40, height: 40, borderRadius: 12, backgroundColor: "#F0F9FF", justifyContent: "center", alignItems: "center" },
  statusBadge: { backgroundColor: "#ECFDF5", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { color: "#059669", fontSize: 12, fontWeight: "600" },
  procedureTitle: { fontSize: 22, fontWeight: "800", color: "#1F2937", marginBottom: 16 },
  divider: { height: 1, backgroundColor: "#F3F4F6", marginBottom: 16 },
  metaItem: { flexDirection: "row", alignItems: "center" },
  metaText: { marginLeft: 6, color: "#4B5563", fontSize: 14, fontWeight: "500" },

  sectionHeader: { fontSize: 16, fontWeight: "700", color: "#374151", marginBottom: 12, marginLeft: 4 },
  notesContainer: { backgroundColor: "#FFF", padding: 16, borderRadius: 12, borderLeftWidth: 4, borderLeftColor: "#1B93D5", marginBottom: 24, elevation: 2 },
  notesText: { fontSize: 15, color: "#4B5563", lineHeight: 24 },

  attachmentCard: { flexDirection: "row", alignItems: "center", backgroundColor: "#FFFFFF", padding: 12, borderRadius: 12, borderWidth: 1, borderColor: "#E5E7EB" },
  fileIconBox: { width: 40, height: 40, borderRadius: 8, backgroundColor: "#EF4444", justifyContent: "center", alignItems: "center" },
  attachmentInfo: { flex: 1, marginLeft: 12 },
  attachmentName: { fontSize: 15, fontWeight: "600", color: "#1F2937" },
  attachmentSize: { fontSize: 12, color: "#9CA3AF" },

  emptyStateBox: { padding: 16, alignItems: 'center', backgroundColor: '#F3F4F6', borderRadius: 12, borderStyle: 'dashed', borderWidth: 1, borderColor: '#D1D5DB' },
  emptyStateText: { color: '#9CA3AF', fontStyle: 'italic' },

  dividerLarge: { height: 1, backgroundColor: "#E2E8F0", marginVertical: 30 },

  medCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', padding: 12, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: '#E2E8F0' },
  medName: { fontSize: 15, fontWeight: '700', color: '#1E293B' },
  medDetails: { fontSize: 13, color: '#64748B' }
});