import {
	View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, ScrollView, Platform, Modal, Pressable
} from "react-native";
import { useRouter } from "expo-router";
import { useState, useEffect } from "react";
import { useUser } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { API, fetchPatientByEmail } from "../../constants/Api";
import DateTimePicker from '@react-native-community/datetimepicker';

export default function AddFamilyMember() {
	const router = useRouter();
	const { user } = useUser();
	const [relationship, setRelationship] = useState("");
	const [givenName, setGivenName] = useState("");
	const [middleName, setMiddleName] = useState("");
	const [lastName, setLastName] = useState("");
	const [sex, setSex] = useState("");
	const [bday, setBday] = useState("");
	const [dateObject, setDateObject] = useState(new Date());
	const [phone, setPhone] = useState("");
	const [address, setAddress] = useState("");
	const [displayAge, setDisplayAge] = useState("");
	const [parentPatient, setParentPatient] = useState(null);
	const [loading, setLoading] = useState(false);
	const [modalVisible, setModalVisible] = useState(false);
	const [showDatePicker, setShowDatePicker] = useState(false);

	useEffect(() => {
		const loadParent = async () => {
			if (!user) return;
			const patient = await fetchPatientByEmail(user.primaryEmailAddress.emailAddress);
			setParentPatient(patient);
		};
		loadParent();
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
			const formatted = selectedDate.toISOString().split('T')[0];
			setBday(formatted);
			setDisplayAge(`${calculateAge(selectedDate)} years old`);
		}
	};

	const saveMember = async () => {
		if (!givenName || !lastName || !bday) {
			Alert.alert("Missing Info", "Please enter at least Name and Birthdate.");
			return;
		}
		if (!parentPatient) {
			Alert.alert("Error", "Could not identify your account.");
			return;
		}
		setLoading(true);
		const fullNameCombined = `${givenName} ${middleName} ${lastName}`.replace(/\s+/g, " ").trim();
		const relationshipTag = relationship ? [`Relation: ${relationship}`] : [];

		try {
			const res = await fetch(API.patients, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					full_name: fullNameCombined,
					parent_id: parentPatient.id,
					birthdate: bday,
					gender: sex,
					contact_number: phone,
					address: address,
					medicalAlerts: relationshipTag,
					vitals: { age: calculateAge(dateObject) },
					email: null
				}),
			});

			if (res.ok) {
				Alert.alert("Success", "Family member added.");
				router.back();
			} else {
				throw new Error("Failed to add family member.");
			}
		} catch (error) {
			Alert.alert("Error", error.message);
		} finally {
			setLoading(false);
		}
	};

	return (
		<ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>

			{/* Header with Back + Text */}
			<View style={styles.header}>
				<TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
					<Ionicons name="arrow-back" size={24} color="#1E293B" />
					<Text style={styles.backText}>Back</Text>
				</TouchableOpacity>

				<Text style={styles.headerTitle}>Add Family Member</Text>
				<View style={{ width: 60 }} />
			</View>

			<View style={styles.formGroup}>
				<Text style={styles.label}>Set nickname/relationship</Text>
				<TextInput style={styles.input} value={relationship} onChangeText={setRelationship} placeholder="e.g. Son, Wife" />
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
					) : <Text style={{ color: '#aaa' }}>Select Birthdate</Text>}
					<Ionicons name="calendar-outline" size={20} color="#666" style={{ position: 'absolute', right: 15, top: 14 }} />
				</TouchableOpacity>
				{showDatePicker && <DateTimePicker value={dateObject} mode="date" display={Platform.OS === 'ios' ? 'spinner' : 'default'} onChange={onChangeDate} maximumDate={new Date()} />}
				{Platform.OS === 'ios' && showDatePicker && <TouchableOpacity onPress={() => setShowDatePicker(false)} style={styles.iosDoneBtn}><Text style={{ color: 'white' }}>Done</Text></TouchableOpacity>}
				<Text style={styles.label}>Phone number</Text>
				<TextInput style={styles.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="0917..." />
				<Text style={styles.label}>Address</Text>
				<TextInput style={styles.input} value={address} onChangeText={setAddress} placeholder="Full Address" />
			</View>
			<TouchableOpacity style={styles.saveButton} onPress={saveMember} disabled={loading}>
				{loading ? <ActivityIndicator color="white" /> : <Text style={styles.saveButtonText}>Add</Text>}
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