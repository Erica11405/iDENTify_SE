import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  Platform,
  Modal,
  Pressable
} from "react-native";
import { useUser } from "@clerk/clerk-expo";
import { useState, useEffect } from "react";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { API, fetchPatientByEmail } from "../../constants/Api";
import DateTimePicker from '@react-native-community/datetimepicker';

export default function EditProfile() {
  const { user } = useUser();
  const router = useRouter();

  const [givenName, setGivenName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [sex, setSex] = useState("");
  const [bday, setBday] = useState("");
  const [dateObject, setDateObject] = useState(new Date());
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [email, setEmail] = useState("");
  const [displayAge, setDisplayAge] = useState("");

  // Preservation States
  const [medicalAlerts, setMedicalAlerts] = useState([]);
  const [xrays, setXrays] = useState([]);
  const [parentId, setParentId] = useState(null);

  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    const loadPatientData = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const data = await fetchPatientByEmail(user.primaryEmailAddress.emailAddress);

        // [FIX] Ensure email is populated from Clerk if missing in DB
        const userEmail = user.primaryEmailAddress.emailAddress;

        if (data) {
          setPatient(data);

          const fullName = data.full_name || "";
          const nameParts = fullName.split(" ").filter(Boolean);

          if (nameParts.length > 0) {
            if (nameParts.length === 1) {
              setGivenName(nameParts[0]);
              setMiddleName("");
              setLastName("");
            } else if (nameParts.length === 2) {
              setGivenName(nameParts[0]);
              setMiddleName("");
              setLastName(nameParts[1]);
            } else {
              setGivenName(nameParts[0]);
              setLastName(nameParts[nameParts.length - 1]);
              setMiddleName(nameParts.slice(1, -1).join(" "));
            }
          } else {
            setGivenName(user.firstName || "");
            setLastName(user.lastName || "");
          }

          setSex(data.gender || "");
          setPhone(data.contact_number || "");
          setAddress(data.address || "");
          setEmail(data.email || userEmail);

          setMedicalAlerts(data.medical_alerts || []);
          setXrays(data.xrays || []);
          setParentId(data.parent_id || null);

          if (data.birthdate) {
            const d = new Date(data.birthdate);
            setBday(d.toISOString().split('T')[0]);
            setDateObject(d);
            const age = calculateAge(d);
            setDisplayAge(`${age} years old`);
          }
        } else {
          setGivenName(user.firstName || "");
          setLastName(user.lastName || "");
          setEmail(userEmail);
        }
      } catch (error) {
        Alert.alert("Error", "Could not load profile.");
      } finally {
        setLoading(false);
      }
    };
    loadPatientData();
  }, [user]);

  const calculateAge = (birthDate) => {
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
    return age;
  };

  const onChangeDate = (event, selectedDate) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (selectedDate) {
      setDateObject(selectedDate);
      setBday(selectedDate.toISOString().split('T')[0]);
      const age = calculateAge(selectedDate);
      setDisplayAge(`${age} years old`);
    }
  };

  const saveChanges = async () => {
    setLoading(true);

    const parts = [givenName, middleName, lastName].filter(p => p && p.trim().length > 0);
    const fullNameCombined = parts.join(" ");

    if (fullNameCombined.length === 0) {
      Alert.alert("Error", "Name cannot be empty");
      setLoading(false);
      return;
    }

    const calculatedAge = calculateAge(dateObject);

    const payload = {
      full_name: fullNameCombined,
      gender: sex,
      birthdate: bday,
      contact_number: phone,
      address: address,
      email: email,
      medicalAlerts: medicalAlerts,
      xrays: xrays,
      parent_id: parentId,
      vitals: { ...(patient?.vitals || {}), age: calculatedAge }
    };

    try {
      let res;

      if (patient) {
        res = await fetch(`${API.patients}/${patient.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        if (!payload.email) payload.email = user.primaryEmailAddress.emailAddress;

        res = await fetch(`${API.patients}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      if (!res.ok) throw new Error("Failed to save profile database.");

      await user.update({
        firstName: givenName,
        lastName: `${middleName ? middleName + " " : ""}${lastName}`.trim()
      });

      Alert.alert("Success", "Your profile has been updated.");
      router.back();
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Failed to save changes.");
    } finally {
      setLoading(false);
    }
  };

  if (loading && !patient && !email) {
    return <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#1B93D5" /></View>;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>

      {/* Header with Back + Text */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1E293B" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Edit Profile</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={styles.avatarContainer}>
        <View style={styles.avatarCircle}>
          <Ionicons name="person" size={50} color="white" />
        </View>
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Given name</Text>
        <TextInput style={styles.input} value={givenName} onChangeText={setGivenName} placeholder="First Name" />

        <Text style={styles.label}>Middle name(optional)</Text>
        <TextInput style={styles.input} value={middleName} onChangeText={setMiddleName} placeholder="Middle Name" />

        <Text style={styles.label}>Last name</Text>
        <TextInput style={styles.input} value={lastName} onChangeText={setLastName} placeholder="Last Name" />

        <Text style={styles.label}>Sex</Text>
        <TouchableOpacity style={styles.input} onPress={() => setModalVisible(true)}>
          <Text style={{ color: sex ? '#1E293B' : '#aaa' }}>{sex || "Select Sex"}</Text>
          <Ionicons name="chevron-down" size={20} color="#666" style={{ position: 'absolute', right: 15, top: 14 }} />
        </TouchableOpacity>

        <Text style={styles.label}>Birthday</Text>
        <TouchableOpacity style={styles.input} onPress={() => setShowDatePicker(true)}>
          {bday ? (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%' }}>
              <Text style={{ color: '#1E293B' }}>{bday}</Text>
              <Text style={{ color: '#1B93D5', fontWeight: '600' }}>{displayAge}</Text>
            </View>
          ) : (
            <Text style={{ color: '#aaa' }}>Select Birthdate</Text>
          )}
          <Ionicons name="calendar-outline" size={20} color="#666" style={{ position: 'absolute', right: 15, top: 14 }} />
        </TouchableOpacity>

        {showDatePicker && (
          <DateTimePicker
            testID="dateTimePicker"
            value={dateObject}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={onChangeDate}
            maximumDate={new Date()}
          />
        )}

        {Platform.OS === 'ios' && showDatePicker && (
          <TouchableOpacity onPress={() => setShowDatePicker(false)} style={styles.iosDoneBtn}>
            <Text style={{ color: 'white' }}>Done</Text>
          </TouchableOpacity>
        )}

        <Text style={styles.label}>Phone number</Text>
        <TextInput style={styles.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="0917..." />

        <Text style={styles.label}>Email Address</Text>
        <TextInput style={[styles.input, { backgroundColor: '#F1F5F9' }]} value={email} editable={false} placeholder="Email" />

        <Text style={styles.label}>Address</Text>
        <TextInput style={styles.input} value={address} onChangeText={setAddress} placeholder="Full Address" />
      </View>

      <TouchableOpacity style={styles.saveButton} onPress={saveChanges} disabled={loading}>
        {loading ? <ActivityIndicator color="white" /> : <Text style={styles.saveButtonText}>save changes</Text>}
      </TouchableOpacity>

      <Modal animationType="fade" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setModalVisible(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Sex</Text>
            {['Male', 'Female'].map((opt) => (
              <TouchableOpacity key={opt} style={styles.modalOption} onPress={() => { setSex(opt); setModalVisible(false); }}>
                <Text style={styles.optionText}>{opt}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F4F8FF" },
  scrollContent: { padding: 24, paddingTop: 60 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#F4F8FF" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 },

  // Back Button Styles
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    marginLeft: -8
  },
  backText: {
    fontSize: 16,
    color: "#1E293B",
    marginLeft: 6,
    fontWeight: "600"
  },

  headerTitle: { fontSize: 20, fontWeight: "700", color: "#1E293B" },
  avatarContainer: { alignItems: "center", marginBottom: 30 },
  avatarCircle: { width: 90, height: 90, borderRadius: 45, backgroundColor: "#1B93D5", justifyContent: "center", alignItems: "center", shadowColor: "#1B93D5", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
  formGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: "700", color: "#1E293B", marginBottom: 8, marginLeft: 4 },
  input: { backgroundColor: "#FFFFFF", borderRadius: 12, paddingVertical: 14, paddingHorizontal: 16, marginBottom: 16, fontSize: 15, color: "#1E293B", height: 50, justifyContent: 'center', shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  saveButton: { backgroundColor: "#1B93D5", borderRadius: 12, paddingVertical: 16, alignItems: "center", marginTop: 10, marginBottom: 40, shadowColor: "#1B93D5", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
  saveButtonText: { color: "white", fontSize: 16, fontWeight: "700" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
  modalContent: { width: "80%", backgroundColor: "white", borderRadius: 16, padding: 20, elevation: 5 },
  modalTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 16, textAlign: "center" },
  modalOption: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  optionText: { fontSize: 16, textAlign: "center", color: "#1B93D5" },
  iosDoneBtn: { alignSelf: 'flex-end', backgroundColor: '#1B93D5', padding: 8, borderRadius: 8, marginBottom: 10 }
});