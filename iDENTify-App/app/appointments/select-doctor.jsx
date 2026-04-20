import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { API } from "../../constants/Api";

function toDurationMinutes(value, fallback = 30) {
  const parsed = Number.parseInt(String(value || ""), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function formatServiceSubtitle(serviceCount, selectedServiceName) {
  if (serviceCount > 1) {
    return `${serviceCount} services selected`;
  }
  return selectedServiceName || "Appointment";
}

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

  const router = useRouter();
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeServiceIndex, setActiveServiceIndex] = useState(0);
  const [assignedDentistsByService, setAssignedDentistsByService] = useState({});

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

  const selectedDurationMinutes = useMemo(() => {
    const hinted = Number.parseInt(String(serviceDuration || ""), 10);
    if (Number.isFinite(hinted) && hinted > 0) {
      return hinted;
    }

    if (parsedServices.length === 0) {
      return 30;
    }

    return parsedServices.reduce((total, item) => {
      return total + toDurationMinutes(item.estimated_duration, 30);
    }, 0);
  }, [serviceDuration, parsedServices]);

  const normalizedServiceItems = useMemo(() => {
    if (parsedServices.length > 0) {
      return parsedServices.map((item, index) => ({
        id: item.id,
        name: item.name,
        estimated_duration: toDurationMinutes(item.estimated_duration, 30),
        fallback_service_id: selectedServiceIds[index] || "",
      }));
    }

    if (selectedServiceNames.length > 0) {
      const splitDuration = Math.max(30, Math.round(selectedDurationMinutes / selectedServiceNames.length));
      return selectedServiceNames.map((name, index) => ({
        id: selectedServiceIds[index] || "",
        name,
        estimated_duration: splitDuration,
        fallback_service_id: selectedServiceIds[index] || "",
      }));
    }

    return [];
  }, [parsedServices, selectedServiceNames, selectedDurationMinutes, selectedServiceIds]);

  useEffect(() => {
    if (normalizedServiceItems.length === 0) {
      setActiveServiceIndex(0);
      setAssignedDentistsByService({});
      return;
    }

    setActiveServiceIndex((prev) => {
      if (prev < normalizedServiceItems.length) return prev;
      return 0;
    });

    setAssignedDentistsByService((prev) => {
      const next = {};
      normalizedServiceItems.forEach((_, index) => {
        if (prev[index]) next[index] = prev[index];
      });
      return next;
    });
  }, [normalizedServiceItems]);

  const subtitleText = formatServiceSubtitle(normalizedServiceItems.length, selectedServiceName);

  const locationLabel = useMemo(() => {
    const clinic = String(clinicName || "").trim();
    const branch = String(branchName || "").trim();
    if (clinic && branch) return `${clinic} / ${branch}`;
    if (clinic) return clinic;
    return "";
  }, [clinicName, branchName]);

  const servicesParam = parsedServices.length > 0 ? JSON.stringify(parsedServices) : String(servicesJson || "");

  const assignedCount = normalizedServiceItems.filter((_, index) => Boolean(assignedDentistsByService[index])).length;
  const allAssigned = normalizedServiceItems.length > 0 && assignedCount === normalizedServiceItems.length;

  const activeService = normalizedServiceItems[activeServiceIndex] || null;
  const activeAssignedDentistId = assignedDentistsByService[activeServiceIndex]?.id;

  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const res = await fetch(API.dentists);
        const data = await res.json();

        if (!Array.isArray(data)) {
          console.error("API Error or Invalid Data:", data);
          setDoctors([]);
          return;
        }

        const activeDoctors = data.filter((doc) => {
          const status = doc.status ? String(doc.status).trim().toLowerCase() : "";
          const role = doc.role ? String(doc.role).trim().toLowerCase() : "";
          const spec = (doc.specialization || doc.specialty || "").trim().toLowerCase();

          return status !== "off" && spec !== "dental aide" && role !== "aide";
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

  const handleAssignDoctor = (doctor) => {
    if (!activeService) return;

    const nextAssignments = {
      ...assignedDentistsByService,
      [activeServiceIndex]: {
        id: Number(doctor.id),
        name: String(doctor.name || "Assigned Dentist"),
      },
    };

    setAssignedDentistsByService(nextAssignments);

    const nextUnassignedIndex = normalizedServiceItems.findIndex((_, index) => !nextAssignments[index]);
    if (nextUnassignedIndex >= 0) {
      setActiveServiceIndex(nextUnassignedIndex);
    }
  };

  const handleClearAssignment = (serviceIndex) => {
    setAssignedDentistsByService((prev) => {
      const next = { ...prev };
      delete next[serviceIndex];
      return next;
    });
    setActiveServiceIndex(serviceIndex);
  };

  const handleContinue = () => {
    if (!allAssigned) return;

    const serviceItemsPayload = normalizedServiceItems.map((item, index) => {
      const assigned = assignedDentistsByService[index];
      const serviceIdValue = item.id || item.fallback_service_id;
      const parsedServiceId = Number.parseInt(String(serviceIdValue || ""), 10);

      return {
        sequence_order: index + 1,
        service_id: Number.isFinite(parsedServiceId) ? parsedServiceId : null,
        service_name: item.name,
        service_name_snapshot: item.name,
        dentist_id: Number(assigned?.id),
        dentist_name: String(assigned?.name || "Assigned Dentist"),
        duration_minutes: toDurationMinutes(item.estimated_duration, 30),
      };
    });

    const totalDuration = serviceItemsPayload.reduce((total, item) => total + toDurationMinutes(item.duration_minutes, 30), 0);
    const uniqueDentists = [...new Set(serviceItemsPayload.map((item) => item.dentist_name).filter(Boolean))];
    const dentistLabel = uniqueDentists.join(", ");
    const primaryDentistId = serviceItemsPayload[0]?.dentist_id;

    const serviceIdList = serviceItemsPayload
      .map((item) => item.service_id)
      .filter((value) => Number.isFinite(value))
      .map((value) => String(value));

    router.push({
      pathname: "/appointments/select-datetime",
      params: {
        doctor: dentistLabel || "Assigned Dentist",
        docId: primaryDentistId ? String(primaryDentistId) : "",
        service: selectedServiceName,
        serviceName: selectedServiceName,
        serviceId: serviceIdList[0] || selectedServiceIds[0] || "",
        serviceIds: serviceIdList.length > 0 ? serviceIdList.join(",") : selectedServiceIds.join(","),
        servicesJson: servicesParam,
        serviceItemsJson: JSON.stringify(serviceItemsPayload),
        serviceDuration: String(totalDuration || selectedDurationMinutes || 30),
        servicePrice: String(servicePrice || ""),
        clinicId: String(clinicId || ""),
        clinicName: String(clinicName || ""),
        branchId: String(branchId || ""),
        branchName: String(branchName || ""),
      },
    });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1E293B" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Assign Dentists</Text>
        <Text style={styles.subtitle}>{subtitleText}</Text>

        {locationLabel ? <Text style={styles.locationText}>Location: {locationLabel}</Text> : null}
      </View>

      {normalizedServiceItems.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No services selected. Please go back and choose services first.</Text>
        </View>
      ) : (
        <View style={styles.assignmentCard}>
          <Text style={styles.assignmentTitle}>Service Line Items</Text>
          <Text style={styles.assignmentHint}>Tap a service to set or change its assigned dentist.</Text>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.assignmentList}>
            {normalizedServiceItems.map((item, index) => {
              const assigned = assignedDentistsByService[index];
              const isActive = index === activeServiceIndex;

              return (
                <TouchableOpacity
                  key={`${item.name}-${index}`}
                  style={[styles.assignmentChip, isActive && styles.assignmentChipActive]}
                  onPress={() => setActiveServiceIndex(index)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.assignmentChipTitle, isActive && styles.assignmentChipTitleActive]}>
                    {index + 1}. {item.name}
                  </Text>
                  <Text style={[styles.assignmentChipValue, isActive && styles.assignmentChipValueActive]}>
                    {assigned?.name || "Unassigned"}
                  </Text>

                  {assigned ? (
                    <TouchableOpacity
                      style={styles.assignmentChipClear}
                      onPress={() => handleClearAssignment(index)}
                    >
                      <Ionicons name="close" size={12} color="#B91C1C" />
                      <Text style={styles.assignmentChipClearText}>Clear</Text>
                    </TouchableOpacity>
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View style={styles.progressRow}>
            <Text style={styles.progressText}>Assigned: {assignedCount}/{normalizedServiceItems.length}</Text>
            {activeService ? (
              <Text style={styles.progressText}>Selecting for: {activeService.name}</Text>
            ) : null}
          </View>
        </View>
      )}

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
          {doctors.map((doc) => {
            const isSelectedForActiveService = Number(activeAssignedDentistId) === Number(doc.id);

            const assignedServiceNames = normalizedServiceItems
              .map((serviceItem, index) => {
                const assigned = assignedDentistsByService[index];
                if (Number(assigned?.id) === Number(doc.id)) return serviceItem.name;
                return "";
              })
              .filter(Boolean);

            return (
              <TouchableOpacity
                key={doc.id}
                style={[styles.card, isSelectedForActiveService && styles.cardSelected]}
                activeOpacity={0.7}
                onPress={() => handleAssignDoctor(doc)}
              >
                <View style={styles.avatarContainer}>
                  <Ionicons name="person" size={24} color="#1B93D5" />
                </View>

                <View style={styles.infoContainer}>
                  <Text style={styles.cardTitle}>{doc.name}</Text>
                  <Text style={styles.cardSubtitle}>
                    {doc.specialization || doc.specialty || "General Dentist"}
                  </Text>

                  {assignedServiceNames.length > 0 ? (
                    <Text style={styles.assignedTag}>
                      Assigned to: {assignedServiceNames.join(", ")}
                    </Text>
                  ) : null}
                </View>

                {doc.status && String(doc.status).trim().toLowerCase() === "busy" ? (
                  <View style={styles.busyBadge}>
                    <Text style={styles.busyText}>Busy</Text>
                  </View>
                ) : null}

                <View style={styles.arrowContainer}>
                  <Ionicons name={isSelectedForActiveService ? "checkmark-circle" : "chevron-forward"} size={20} color={isSelectedForActiveService ? "#0284C7" : "#CBD5E1"} />
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {normalizedServiceItems.length > 0 ? (
        <View style={styles.fabContainer}>
          <TouchableOpacity
            style={[styles.fabButton, !allAssigned && styles.fabButtonDisabled]}
            onPress={handleContinue}
            activeOpacity={0.8}
            disabled={!allAssigned}
          >
            <View>
              <Text style={styles.fabText}>{allAssigned ? "Continue" : "Assign remaining services"}</Text>
              <Text style={styles.fabSubtext}>{assignedCount}/{normalizedServiceItems.length} services assigned</Text>
            </View>
            <Ionicons name="arrow-forward" size={20} color="white" />
          </TouchableOpacity>
        </View>
      ) : null}
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
    paddingBottom: 120,
  },
  header: {
    marginBottom: 20,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    marginBottom: 16,
    paddingRight: 10,
    marginLeft: -4,
  },
  backText: {
    fontSize: 16,
    color: "#1E293B",
    marginLeft: 6,
    fontWeight: "600",
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
    fontWeight: "500",
  },
  locationText: {
    marginTop: 8,
    fontSize: 13,
    color: "#0369A1",
    fontWeight: "600",
  },
  assignmentCard: {
    backgroundColor: "white",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 14,
    marginBottom: 16,
  },
  assignmentTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },
  assignmentHint: {
    marginTop: 4,
    marginBottom: 10,
    fontSize: 12,
    color: "#64748B",
  },
  assignmentList: {
    gap: 10,
    paddingRight: 8,
  },
  assignmentChip: {
    width: 220,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 9,
    backgroundColor: "#FFFFFF",
  },
  assignmentChipActive: {
    borderColor: "#1B93D5",
    backgroundColor: "#F0F9FF",
  },
  assignmentChipTitle: {
    fontSize: 12,
    color: "#475569",
    fontWeight: "700",
  },
  assignmentChipTitleActive: {
    color: "#0C4A6E",
  },
  assignmentChipValue: {
    fontSize: 13,
    marginTop: 4,
    color: "#0F172A",
    fontWeight: "700",
  },
  assignmentChipValueActive: {
    color: "#075985",
  },
  assignmentChipClear: {
    marginTop: 8,
    alignSelf: "flex-start",
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FECACA",
    backgroundColor: "#FEF2F2",
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  assignmentChipClearText: {
    fontSize: 11,
    color: "#B91C1C",
    fontWeight: "700",
  },
  progressRow: {
    marginTop: 10,
    gap: 2,
  },
  progressText: {
    fontSize: 12,
    color: "#334155",
    fontWeight: "600",
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 28,
  },
  emptyContainer: {
    alignItems: "center",
    marginTop: 28,
    paddingHorizontal: 8,
  },
  emptyText: {
    fontSize: 15,
    color: "#64748B",
    textAlign: "center",
  },
  listContainer: {
    gap: 14,
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
  cardSelected: {
    borderColor: "#1B93D5",
    backgroundColor: "#F0F9FF",
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
  assignedTag: {
    marginTop: 6,
    fontSize: 12,
    color: "#0369A1",
    fontWeight: "600",
  },
  arrowContainer: {
    paddingLeft: 8,
  },
  busyBadge: {
    backgroundColor: "#FEF3C7",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginRight: 8,
  },
  busyText: {
    color: "#D97706",
    fontSize: 12,
    fontWeight: "700",
  },
  fabContainer: {
    position: "absolute",
    left: 24,
    right: 24,
    bottom: 24,
  },
  fabButton: {
    backgroundColor: "#1B93D5",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#1B93D5",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  fabButtonDisabled: {
    backgroundColor: "#94A3B8",
  },
  fabText: {
    color: "white",
    fontSize: 17,
    fontWeight: "700",
  },
  fabSubtext: {
    color: "#DBEAFE",
    fontSize: 12,
    marginTop: 2,
  },
});
