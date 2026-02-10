import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { API } from "../../constants/Api";

export default function SelectDoctor() {
  const { service } = useLocalSearchParams();
  const router = useRouter();
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const res = await fetch(API.dentists);
        const data = await res.json();
        setDoctors(data);
      } catch (error) {
        console.error("Error fetching doctors", error);
      } finally {
        setLoading(false);
      }
    };
    fetchDoctors();
  }, []);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <Text style={styles.title}>Choose a Specialist</Text>
        <Text style={styles.subtitle}>for {service || "Appointment"}</Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1B93D5" />
        </View>
      ) : (
        <View style={styles.listContainer}>
          {doctors.map((doc) => (
            <TouchableOpacity
              key={doc.id}
              style={styles.card}
              activeOpacity={0.7}
              onPress={() =>
                router.push(
                  `/appointments/select-datetime?doctor=${doc.name}&docId=${doc.id}&service=${service}`
                )
              }
            >
              <View style={styles.avatarContainer}>
                <Ionicons name="person" size={24} color="#1B93D5" />
              </View>
              
              <View style={styles.infoContainer}>
                <Text style={styles.cardTitle}>{doc.name}</Text>
                <Text style={styles.cardSubtitle}>{doc.specialty || "General Dentist"}</Text>
              </View>
              
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 40,
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
});