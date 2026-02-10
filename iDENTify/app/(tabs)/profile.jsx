import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image } from "react-native";
import { useUser, useAuth } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { fetchPatientByEmail } from "../../constants/Api";

export default function ProfileScreen() {
  const { user } = useUser();
  const { signOut } = useAuth();
  const router = useRouter();
  const [patientData, setPatientData] = useState(null);

  useEffect(() => {
    const loadProfile = async () => {
      if (user?.primaryEmailAddress?.emailAddress) {
        const data = await fetchPatientByEmail(user.primaryEmailAddress.emailAddress);
        setPatientData(data);
      }
    };
    loadProfile();
  }, [user]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* HEADER SECTION */}
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <Ionicons name="person" size={48} color="#1B93D5" />
        </View>
        <Text style={styles.name}>
          {patientData?.full_name || user?.fullName || "Guest"}
        </Text>
        <Text style={styles.email}>
          {user?.primaryEmailAddress?.emailAddress}
        </Text>
        {patientData?.contact_number && (
          <View style={styles.contactBadge}>
            <Ionicons name="call-outline" size={14} color="#64748B" />
            <Text style={styles.contactText}>{patientData.contact_number}</Text>
          </View>
        )}
      </View>

      {/* MENU SECTION */}
      <Text style={styles.sectionTitle}>Account Settings</Text>
      
      <View style={styles.menuContainer}>
        <TouchableOpacity
          style={styles.menuItem}
          activeOpacity={0.7}
          onPress={() => router.push("/profile/edit")}
        >
          <View style={[styles.iconBox, { backgroundColor: "#E0F2FE" }]}>
            <Ionicons name="person-outline" size={22} color="#0284C7" />
          </View>
          <Text style={styles.menuText}>Edit Profile</Text>
          <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
        </TouchableOpacity>

        <View style={styles.divider} />

        <TouchableOpacity
          style={styles.menuItem}
          activeOpacity={0.7}
          onPress={() => router.push("/profile/family")}
        >
          <View style={[styles.iconBox, { backgroundColor: "#FCE7F3" }]}>
            <Ionicons name="people-outline" size={22} color="#DB2777" />
          </View>
          <Text style={styles.menuText}>Family Members</Text>
          <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>App Settings</Text>
      
      <View style={styles.menuContainer}>
        {/* <TouchableOpacity
          style={styles.menuItem}
          activeOpacity={0.7}
        >
          <View style={[styles.iconBox, { backgroundColor: "#DCFCE7" }]}>
            <Ionicons name="notifications-outline" size={22} color="#16A34A" />
          </View>
          <Text style={styles.menuText}>Notifications</Text>
          <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
        </TouchableOpacity>
         */}
        <View style={styles.divider} />

        <TouchableOpacity
          style={styles.menuItem}
          activeOpacity={0.7}
        >
          <View style={[styles.iconBox, { backgroundColor: "#FEF3C7" }]}>
            <Ionicons name="help-circle-outline" size={22} color="#D97706" />
          </View>
          <Text style={styles.menuText}>Help & Support</Text>
          <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
        </TouchableOpacity>
      </View>

      {/* LOGOUT BUTTON */}
      <TouchableOpacity 
        style={styles.logoutBtn} 
        onPress={signOut}
        activeOpacity={0.8}
      >
        <Ionicons name="log-out-outline" size={20} color="#EF4444" />
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>
      
      <Text style={styles.versionText}>Version 1.0.0</Text>
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
  },

  /* HEADER STYLES */
  header: {
    alignItems: "center",
    marginBottom: 32,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#F0F9FF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 4,
    borderColor: "white",
    shadowColor: "#1B93D5",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  name: {
    fontSize: 24,
    fontWeight: "800",
    color: "#1E293B",
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  email: {
    fontSize: 15,
    color: "#64748B",
    marginBottom: 12,
  },
  contactBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  contactText: {
    fontSize: 13,
    color: "#475569",
    fontWeight: "600",
  },

  /* SECTION TITLES */
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#94A3B8",
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginLeft: 4,
  },

  /* MENU CONTAINER */
  menuContainer: {
    backgroundColor: "white",
    borderRadius: 20,
    paddingVertical: 8,
    marginBottom: 24,
    shadowColor: "#64748B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  menuText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#334155",
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginLeft: 72, // Align with text start
  },

  /* LOGOUT BUTTON */
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FEF2F2",
    paddingVertical: 16,
    borderRadius: 16,
    marginBottom: 20,
    gap: 8,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  logoutText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#EF4444",
  },
  versionText: {
    textAlign: "center",
    color: "#CBD5E1",
    fontSize: 13,
    marginBottom: 20,
  },
});