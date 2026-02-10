import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { dentalServices } from "../../constants/services";
import { useState } from "react";

export default function BookAppointment() {
  const router = useRouter();
  const [selectedServices, setSelectedServices] = useState([]);

  const toggleService = (title) => {
    if (selectedServices.includes(title)) {
      setSelectedServices(selectedServices.filter((s) => s !== title));
    } else {
      setSelectedServices([...selectedServices, title]);
    }
  };

  const handleNext = () => {
    if (selectedServices.length === 0) return;
    const serviceString = selectedServices.join(", ");
    // Navigate to select-doctor with the combined string
    router.push(`/appointments/select-doctor?service=${encodeURIComponent(serviceString)}`);
  };

  return (
    <View style={styles.mainContainer}>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>

        {/* HEADER WITH BACK BUTTON */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#1E293B" />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>

          <Text style={styles.title}>Book Appointment</Text>
          <Text style={styles.subtitle}>Select one or more services</Text>
        </View>

        <View style={styles.grid}>
          {dentalServices.map((service, i) => {
            const isSelected = selectedServices.includes(service.title);
            return (
              <TouchableOpacity
                key={i}
                style={[styles.card, isSelected && styles.cardSelected]}
                activeOpacity={0.7}
                onPress={() => toggleService(service.title)}
              >
                {isSelected && (
                  <View style={styles.checkIcon}>
                    <Ionicons name="checkmark-circle" size={24} color="#1B93D5" />
                  </View>
                )}
                <View style={[styles.iconCircle, isSelected && styles.iconCircleSelected]}>
                  <Ionicons
                    name={service.icon}
                    size={32}
                    color={isSelected ? "#1B93D5" : "#1B93D5"}
                  />
                </View>
                <Text style={[styles.cardText, isSelected && styles.cardTextSelected]}>
                  {service.title}
                </Text>

                {/* Price Display */}
                {service.price && (
                  <Text style={[styles.priceText, isSelected && styles.priceTextSelected]}>
                    {service.price}
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Spacer for bottom button */}
        <View style={{ height: 80 }} />
      </ScrollView>

      {/* FLOATING ACTION BUTTON */}
      {selectedServices.length > 0 && (
        <View style={styles.fabContainer}>
          <TouchableOpacity style={styles.fabButton} onPress={handleNext} activeOpacity={0.8}>
            <Text style={styles.fabText}>
              Next ({selectedServices.length})
            </Text>
            <Ionicons name="arrow-forward" size={20} color="white" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: "#F8FAFC" },
  container: { flex: 1 },
  contentContainer: { padding: 24, paddingTop: 40 },

  header: { marginBottom: 32 },

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

  title: { fontSize: 28, fontWeight: "800", color: "#1E293B", marginBottom: 8, letterSpacing: -0.5 },
  subtitle: { fontSize: 16, color: "#64748B", fontWeight: "500" },

  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 16 },

  card: {
    width: '47%',
    backgroundColor: "white",
    paddingVertical: 24,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: "#64748B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 2,
    borderColor: "transparent"
  },
  cardSelected: {
    borderColor: "#1B93D5",
    backgroundColor: "#F0F9FF"
  },

  iconCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: "#F0F9FF", justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  iconCircleSelected: { backgroundColor: "white" },

  cardText: { fontSize: 14, fontWeight: "600", color: "#334155", textAlign: 'center', marginBottom: 4 },
  cardTextSelected: { color: "#1B93D5", fontWeight: "700" },

  priceText: { fontSize: 12, fontWeight: "500", color: "#64748B", textAlign: 'center' },
  priceTextSelected: { color: "#1B93D5" },

  checkIcon: { position: 'absolute', top: 10, right: 10 },

  fabContainer: {
    position: 'absolute',
    bottom: 24,
    left: 24,
    right: 24,
    alignItems: 'center'
  },
  fabButton: {
    backgroundColor: "#1B93D5",
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    width: '100%',
    shadowColor: "#1B93D5",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6
  },
  fabText: {
    color: "white",
    fontSize: 18,
    fontWeight: "700",
    marginRight: 8
  }
});