import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { API } from "../../constants/Api";

export default function SelectDoctor() {
  const {
    service,
    serviceName,
    serviceId,
    serviceIds,
    servicesJson,
    serviceDuration,
    servicePrice,
    clinicId,
    clinicName,
    branchId,
    branchName,
  } = useLocalSearchParams();

  const parsedServices = useMemo(() => {
    if (!servicesJson) return [];

    try {
      const parsed = JSON.parse(String(servicesJson));
      if (!Array.isArray(parsed)) return [];

      return parsed
        .map((item) => ({
          id: item?.id,
          name: String(item?.name || "").trim(),
          estimated_duration: item?.estimated_duration,
          min_price: item?.min_price,
          max_price: item?.max_price,
        }))
        .filter((item) => item.name);
    } catch (_err) {
      return [];
    }
  }, [servicesJson]);

  const selectedServiceNames = useMemo(() => {
    if (parsedServices.length > 0) {
      return parsedServices.map((item) => item.name).filter(Boolean);
    }

    const fallback = String(serviceName || service || "");
    return fallback
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }, [parsedServices, serviceName, service]);

  const selectedServiceName = selectedServiceNames.join(", ");

  const selectedDurationMinutes = useMemo(() => {
    const hinted = Number.parseInt(String(serviceDuration || ""), 10);
    if (Number.isFinite(hinted) && hinted > 0) {
      return hinted;
    }

    if (parsedServices.length === 0) {
      return 30;
    }

    return parsedServices.reduce((total, item) => {
      const duration = Number.parseInt(String(item.estimated_duration || ""), 10);
      return total + (Number.isFinite(duration) && duration > 0 ? duration : 30);
    }, 0);
  }, [serviceDuration, parsedServices]);

  const selectedServiceIds = useMemo(() => {
    if (serviceIds) {
      return String(serviceIds)
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }

    const fromParsed = parsedServices
      .map((item) => (item.id === undefined || item.id === null ? "" : String(item.id)))
      .filter(Boolean);

    if (fromParsed.length > 0) {
      return fromParsed;
    }

    return serviceId ? [String(serviceId)] : [];
  }, [serviceIds, parsedServices, serviceId]);

  const subtitleText = selectedServiceNames.length > 1
    ? `${selectedServiceNames.length} services`
    : (selectedServiceName || "Appointment");

  const locationLabel = useMemo(() => {
    const clinic = String(clinicName || '').trim();
    const branch = String(branchName || '').trim();
    if (clinic && branch) return `${clinic} / ${branch}`;
    if (clinic) return clinic;
    return '';
  }, [clinicName, branchName]);

  const servicesParam = parsedServices.length > 0 ? JSON.stringify(parsedServices) : String(servicesJson || "");
  const router = useRouter();
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const res = await fetch(API.dentists);
        const data = await res.json();

        // 1. SAFEGUARD: Check if the API returned an error object instead of an array
        if (!Array.isArray(data)) {
          console.error("API Error or Invalid Data:", data);
          setDoctors([]); // Fallback to empty to prevent crash
          return;
        }

        // 2. UPDATED FILTER: Make checks case-insensitive, trim spaces, and check both column names
        const activeDoctors = data.filter(doc => {
          const status = doc.status ? String(doc.status).trim().toLowerCase() : '';
          const role = doc.role ? String(doc.role).trim().toLowerCase() : '';
          
          // Check BOTH specialty (from database.sql) and specialization (from POST routes)
          const spec = (doc.specialization || doc.specialty || '').trim().toLowerCase();

          return (
            status !== 'off' && 
            spec !== 'dental aide' && 
            role !== 'aide'
          );
        });

        setDoctors(activeDoctors);
      } catch (error) {
        console.error("Error fetching doctors", error);
        setDoctors([]); 
      } finally {
        setLoading(false);
      }
    };
    
    fetchDoctors();
  }, []);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>

      {/* HEADER WITH BACK BUTTON */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1E293B" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Choose a Specialist</Text>
        <Text style={styles.subtitle}>for {subtitleText}</Text>

        {locationLabel ? <Text style={styles.locationText}>Location: {locationLabel}</Text> : null}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1B93D5" />
        </View>
      ) : doctors.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No dentists available at the moment.</Text>
        </View>
      ) : (
        <View style={styles.listContainer}>
          {doctors.map((doc) => (
            <TouchableOpacity
              key={doc.id}
              style={styles.card}
              activeOpacity={0.7}
              onPress={() =>
                router.push({
                  pathname: "/appointments/select-datetime",
                  params: {
                    doctor: String(doc.name || ""),
                    docId: String(doc.id),
                    service: selectedServiceName,
                    serviceName: selectedServiceName,
                    serviceId: selectedServiceIds[0] || "",
                    serviceIds: selectedServiceIds.join(","),
                    servicesJson: servicesParam,
                    serviceDuration: String(selectedDurationMinutes),
                    servicePrice: String(servicePrice || ""),
                    clinicId: String(clinicId || ''),
                    clinicName: String(clinicName || ''),
                    branchId: String(branchId || ''),
                    branchName: String(branchName || ''),
                  },
                })
              }
            >
              <View style={styles.avatarContainer}>
                <Ionicons name="person" size={24} color="#1B93D5" />
              </View>

              <View style={styles.infoContainer}>
                <Text style={styles.cardTitle}>{doc.name}</Text>
                <Text style={styles.cardSubtitle}>
                  {doc.specialization || doc.specialty || "General Dentist"}
                </Text>
              </View>

              {/* Show Busy Tag safely with case-insensitivity */}
              {doc.status && doc.status.trim().toLowerCase() === 'busy' && (
                <View style={styles.busyBadge}>
                  <Text style={styles.busyText}>Busy</Text>
                </View>
              )}

              <View style={styles.arrowContainer}>
                <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC"
  },
  contentContainer: {
    padding: 24,
    paddingTop: 40,
  },
  header: {
    marginBottom: 32,
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
    color: "#1E293B",
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: "#64748B",
    fontWeight: "500"
  },
  locationText: {
    marginTop: 8,
    fontSize: 13,
    color: "#0369A1",
    fontWeight: "600"
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 40,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 40,
  },
  emptyText: {
    fontSize: 16,
    color: "#94A3B8",
    fontStyle: 'italic'
  },
  listContainer: {
    gap: 16,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    padding: 20,
    borderRadius: 20,
    shadowColor: "#64748B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  avatarContainer: {
    width: 56,
    height: 56,
    borderRadius: 20,
    backgroundColor: "#F0F9FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  infoContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "500",
  },
  arrowContainer: {
    paddingLeft: 8,
  },
  busyBadge: {
    backgroundColor: '#FEF3C7',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginRight: 8
  },
  busyText: {
    color: '#D97706',
    fontSize: 12,
    fontWeight: '700'
  }
});