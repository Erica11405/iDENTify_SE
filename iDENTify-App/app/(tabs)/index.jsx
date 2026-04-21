import {
	View,
	Text,
	StyleSheet,
	ScrollView,
	TouchableOpacity,
	ActivityIndicator,
	RefreshControl,
	Modal,
	Pressable,
	Image
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import { useUser } from "@clerk/clerk-expo";
import { useState, useCallback, useEffect } from "react";
import { API, fetchPatientByEmail, fetchClinicDiscovery } from "../../constants/Api";
import { dentalServices } from "../../constants/services";

// HELPER: Fix Date format for Mobile (Space -> T)
const parseDate = (dateString) => {
	if (!dateString) return new Date();
	// Converts "2025-11-28 09:00:00" -> "2025-11-28T09:00:00"
	// React Native (Hermes) needs the 'T' separator to parse correctly
	return new Date(dateString.replace(" ", "T"));
};

export default function HomeScreen() {
	const router = useRouter();
	const { user } = useUser();
	const userEmail = user?.primaryEmailAddress?.emailAddress;
	const [patient, setPatient] = useState(null);
	const [upcomingAppt, setUpcomingAppt] = useState(null);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [clinics, setClinics] = useState([]);
	const [clinicsLoading, setClinicsLoading] = useState(false);

	// Service Modal State
	const [selectedService, setSelectedService] = useState(null);
	const [modalVisible, setModalVisible] = useState(false);

	const loadData = useCallback(async () => {
		if (!userEmail) return;
		if (!refreshing) setLoading(true);

		try {
			const patientData = await fetchPatientByEmail(userEmail);
			setPatient(patientData);

			if (patientData) {
				// --- 1. FETCH FAMILY MEMBERS ---
				let allIds = [patientData.id];
				try {
					const familyRes = await fetch(`${API.patients}/${patientData.id}/family`);
					if (familyRes.ok) {
						const familyMembers = await familyRes.json();
						const fIds = familyMembers.map(m => m.id);
						allIds = [...allIds, ...fIds];
					}
				} catch (_e) {
					console.log('No family members found or error fetching');
				}

				// --- 2. FETCH APPOINTMENTS FOR EVERYONE ---
				// We map each ID to a fetch promise, then run them in parallel
				const promises = allIds.map(id =>
					fetch(`${API.appointments}?patient_id=${id}`).then(r => r.json())
				);

				const results = await Promise.all(promises);
				const allAppts = results.flat(); // Combine arrays

				// Get start of today (Midnight)
				const todayStart = new Date();
				todayStart.setHours(0, 0, 0, 0);

				const myAppts = allAppts
					.filter((a) => {
						const apptDate = parseDate(a.appointment_datetime);
						const status = String(a.status || '').trim().toLowerCase();
						const isInactive = ['done', 'cancelled', 'no-show', 'missed'].includes(status);
						// Show appointments if they are Today or Future AND active
						return apptDate >= todayStart && !isInactive;
					})
					.sort((a, b) => {
						return parseDate(a.appointment_datetime) - parseDate(b.appointment_datetime);
					});

				setUpcomingAppt(myAppts.length > 0 ? myAppts[0] : null);
			}
		} catch (error) {
			console.error("Error loading home data:", error);
		} finally {
			setLoading(false);
			setRefreshing(false);
		}
	}, [userEmail, refreshing]);

	const loadClinics = async () => {
		setClinicsLoading(true);
		try {
			const data = await fetchClinicDiscovery();
			setClinics(Array.isArray(data) ? data : []);
		} catch (error) {
			console.error("Error loading clinics:", error);
		} finally {
			setClinicsLoading(false);
		}
	};

	useEffect(() => {
		loadClinics();
	}, []);

	const onRefresh = useCallback(() => {
		setRefreshing(true);
		loadData();
		loadClinics();
	}, [loadData]);

	useFocusEffect(
		useCallback(() => {
			loadData();
		}, [loadData])
	);

	const handleServicePress = (service) => {
		setSelectedService(service);
		setModalVisible(true);
	};

	const handleSelectClinic = (clinic) => {
		const branches = Array.isArray(clinic?.branches) ? clinic.branches : [];
		if (branches.length === 0) {
			router.push({
				pathname: '/appointments/select-service',
				params: {
					clinicId: String(clinic.id),
					clinicName: String(clinic.name || ''),
				},
			});
		} else {
			router.push({
				pathname: '/appointments/select-branch',
				params: {
					clinicId: String(clinic.id),
					clinicName: String(clinic.name || ''),
				},
			});
		}
	};

	// [FIX] Determine Display Name
	// Priority: 1. Database Patient Name, 2. Clerk User First Name, 3. "Guest"
	const displayName = patient?.full_name
		? patient.full_name.split(' ')[0]
		: (user?.firstName || "Guest");

	return (
		<View style={{ flex: 1 }}>
			<ScrollView
				style={styles.container}
				contentContainerStyle={styles.contentContainer}
				refreshControl={
					<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#1B93D5"]} />
				}
			>
				{/* HEADER */}
				<View style={styles.header}>
					<View>
						<Text style={styles.greeting}>Hello,</Text>
						<Text style={styles.userName}>{displayName}</Text>
					</View>
					<TouchableOpacity
						onPress={() => router.push("/profile")}
						style={styles.profileButton}
						activeOpacity={0.7}
					>
						<Ionicons name="person" size={24} color="#1B93D5" />
					</TouchableOpacity>
				</View>

				{/* UPCOMING APPOINTMENT */}
				<Text style={styles.sectionTitle}>Next Appointment</Text>

				{loading ? (
					<View style={styles.loadingCard}>
						<ActivityIndicator size="small" color="#1B93D5" />
					</View>
				) : upcomingAppt ? (
					<TouchableOpacity
						style={styles.heroCard}
						activeOpacity={0.9}
						onPress={() => router.push(`/appointments/${upcomingAppt.id}`)}
					>
						<View style={styles.heroBackgroundCircle} />
						<View style={styles.heroHeader}>
							<View style={styles.heroIconContainer}>
								<Ionicons name="calendar" size={24} color="#1B93D5" />
							</View>
							<View style={{ flex: 1 }}>
								{/* --- NEW: PATIENT LABEL IF NOT MYSELF --- */}
								{patient && upcomingAppt.patient_id !== patient.id && (
									<View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
										<Ionicons name="person" size={12} color="rgba(255,255,255,0.8)" style={{ marginRight: 4 }} />
										<Text style={{ fontSize: 12, color: "rgba(255,255,255,0.9)", fontWeight: "700", textTransform: 'uppercase' }}>
											For: {upcomingAppt.full_name}
										</Text>
									</View>
								)}

								<Text style={styles.heroTitle} numberOfLines={1}>
									{upcomingAppt.procedure || "Dental Checkup"}
								</Text>
								<Text style={styles.heroSubtitle}>
									{upcomingAppt.dentist_name || upcomingAppt.dentist || "Dr. Assigned"}
								</Text>
							</View>
							<View style={styles.statusBadge}>
								<Text style={styles.statusText}>{upcomingAppt.status}</Text>
							</View>
						</View>
						<View style={styles.heroDivider} />
						<View style={styles.heroFooter}>
							<View style={styles.heroTimeInfo}>
								<Ionicons name="time-outline" size={18} color="rgba(255,255,255,0.9)" />
								<Text style={styles.heroFooterText}>
									{parseDate(upcomingAppt.appointment_datetime).toLocaleDateString(undefined, {
										weekday: 'short', month: 'short', day: 'numeric'
									})}
									{' • '}
									{parseDate(upcomingAppt.appointment_datetime).toLocaleTimeString([], {
										hour: '2-digit', minute: '2-digit'
									})}
								</Text>
							</View>
							<Ionicons name="chevron-forward" size={20} color="white" />
						</View>
					</TouchableOpacity>
				) : (
					<View style={styles.emptyStateCard}>
						<View style={styles.emptyStateIcon}>
							<Ionicons name="calendar-outline" size={32} color="#A0AEC0" />
						</View>
						<Text style={styles.emptyStateText}>No upcoming appointments</Text>
						<TouchableOpacity onPress={() => router.push("/appointments/select-clinic")}>
							<Text style={styles.bookNowLink}>Book an appointment</Text>
						</TouchableOpacity>
					</View>
				)}

				{/* QUICK ACTIONS */}
				<Text style={styles.sectionTitle}>Quick Actions</Text>
				<View style={styles.quickActionsGrid}>
					<QuickAction
						icon="add-circle"
						label="Book"
						color="#4C6EF5"
						onPress={() => router.push("/appointments/select-clinic")}
					/>
					<QuickAction
						icon="list"
						label="Queue"
						color="#F59F00"
						onPress={() => router.push("/queue")}
					/>
					<QuickAction
						icon="document-text"
						label="Records"
						color="#20C997"
						onPress={() => router.push("/records")}
					/>
					<QuickAction
						icon="people"
						label="Family"
						color="#FA5252"
						onPress={() => router.push("/profile/family")}
					/>
				</View>

				{/* CLINICS */}
				<View style={styles.servicesHeader}>
					<Text style={styles.sectionTitle}>Our Clinics</Text>
					{clinics.length > 0 && <TouchableOpacity onPress={() => router.push("/appointments/select-clinic")}><Text style={styles.seeAllText}>See all</Text></TouchableOpacity>}
				</View>

				{clinicsLoading ? (
					<ActivityIndicator size="small" color="#1B93D5" style={{ marginVertical: 20 }} />
				) : clinics.length > 0 ? (
					<ScrollView
						horizontal
						showsHorizontalScrollIndicator={false}
						contentContainerStyle={styles.servicesSlider}
					>
						{clinics.map((clinic) => (
							<TouchableOpacity 
								key={clinic.id} 
								style={styles.clinicHomeCard} 
								activeOpacity={0.8}
								onPress={() => handleSelectClinic(clinic)}
							>
								<View style={styles.clinicIconContainer}>
									<Ionicons name="business" size={24} color="#1B93D5" />
								</View>
								<Text style={styles.clinicText} numberOfLines={1}>{clinic.name}</Text>
								<Text style={styles.clinicSubText}>{clinic.branches?.length || 0} branches</Text>
							</TouchableOpacity>
						))}
					</ScrollView>
				) : (
					<View style={styles.emptyClinicsCard}>
						<Text style={styles.emptyStateText}>No clinics available yet.</Text>
					</View>
				)}

				{/* SERVICES */}
				<View style={styles.servicesHeader}>
					<Text style={styles.sectionTitle}>Common Services</Text>
					<Text style={styles.seeAllText}>Tap to view details</Text>
				</View>

				<ScrollView
					horizontal
					showsHorizontalScrollIndicator={false}
					contentContainerStyle={styles.servicesSlider}
				>
					{dentalServices.slice(0, 6).map((service, index) => (
						<ServiceCard
							key={index}
							title={service.title}
							icon={service.icon}
							onPress={() => handleServicePress(service)}
						/>
					))}
				</ScrollView>

				<View style={{ height: 20 }} />
			</ScrollView>

			{/* SERVICE DETAIL MODAL */}
			<Modal
				animationType="fade"
				transparent={true}
				visible={modalVisible}
				onRequestClose={() => setModalVisible(false)}
			>
				<View style={styles.modalOverlay}>
					<View style={styles.modalView}>
						{selectedService && (
							<>
								<View style={styles.modalIconCircle}>
									<Ionicons name={selectedService.icon} size={40} color="#1B93D5" />
								</View>
								<Text style={styles.modalTitle}>{selectedService.title}</Text>
								<Text style={styles.modalDescription}>
									{selectedService.description}
								</Text>
								<Pressable
									style={[styles.modalButton]}
									onPress={() => setModalVisible(false)}
								>
									<Text style={styles.textStyle}>Close</Text>
								</Pressable>
							</>
						)}
					</View>
				</View>
			</Modal>
		</View>
	);
}

function QuickAction({ icon, label, color, onPress }) {
	return (
		<TouchableOpacity style={styles.actionItem} onPress={onPress} activeOpacity={0.7}>
			<View style={[styles.actionIconCircle, { backgroundColor: `${color}15` }]}>
				<Ionicons name={icon} size={28} color={color} />
			</View>
			<Text style={styles.actionLabel}>{label}</Text>
		</TouchableOpacity>
	);
}

function ServiceCard({ title, icon, onPress }) {
	return (
		<TouchableOpacity style={styles.serviceCard} onPress={onPress} activeOpacity={0.8}>
			<View style={styles.serviceIconContainer}>
				<Ionicons name={icon} size={24} color="#1B93D5" />
			</View>
			<Text style={styles.serviceText} numberOfLines={2}>{title}</Text>
		</TouchableOpacity>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: "#F8FAFC" },
	contentContainer: { padding: 24, paddingTop: 10 },
	header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24, marginTop: 10 },
	greeting: { fontSize: 16, color: "#64748B", fontWeight: "500" },
	userName: { fontSize: 28, fontWeight: "800", color: "#1E293B", letterSpacing: -0.5 },
	profileButton: { width: 48, height: 48, borderRadius: 24, backgroundColor: "white", justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "#E2E8F0", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
	sectionTitle: { fontSize: 18, fontWeight: "700", color: "#334155", marginBottom: 12, letterSpacing: -0.3 },
	heroCard: { backgroundColor: "#1B93D5", borderRadius: 24, padding: 22, marginBottom: 28, shadowColor: "#1B93D5", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 12, elevation: 8, position: 'relative', overflow: 'hidden' },
	heroBackgroundCircle: { position: 'absolute', top: -50, right: -50, width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.1)' },
	heroHeader: { flexDirection: "row", alignItems: "center", marginBottom: 18 },
	heroIconContainer: { width: 48, height: 48, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.2)", justifyContent: "center", alignItems: "center", marginRight: 14 },
	heroTitle: { fontSize: 19, fontWeight: "700", color: "white", marginBottom: 2 },
	heroSubtitle: { fontSize: 14, color: "rgba(255,255,255,0.9)", fontWeight: "500" },
	statusBadge: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 20, borderWidth: 1, borderColor: "rgba(255,255,255,0.3)" },
	statusText: { color: "white", fontSize: 12, fontWeight: "700" },
	heroDivider: { height: 1, backgroundColor: "rgba(255,255,255,0.2)", marginBottom: 14 },
	heroFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
	heroTimeInfo: { flexDirection: "row", alignItems: "center", gap: 8 },
	heroFooterText: { color: "white", fontSize: 15, fontWeight: "600" },
	loadingCard: { height: 140, backgroundColor: "white", borderRadius: 20, justifyContent: "center", alignItems: "center", marginBottom: 28 },
	emptyStateCard: { backgroundColor: "white", borderRadius: 24, padding: 28, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#E2E8F0", borderStyle: "dashed", marginBottom: 28 },
	emptyStateIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: "#F1F5F9", justifyContent: "center", alignItems: "center", marginBottom: 12 },
	emptyStateText: { color: "#64748B", fontSize: 15, marginBottom: 8, fontWeight: "500" },
	bookNowLink: { color: "#1B93D5", fontWeight: "700", fontSize: 15 },
	quickActionsGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", marginBottom: 28 },
	actionItem: { width: "48%", backgroundColor: "white", padding: 18, borderRadius: 20, flexDirection: "row", alignItems: "center", marginBottom: 14, shadowColor: "#64748B", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3, borderWidth: 1, borderColor: "#F8FAFC" },
	actionIconCircle: { width: 44, height: 44, borderRadius: 14, justifyContent: "center", alignItems: "center", marginRight: 12 },
	actionLabel: { fontSize: 15, fontWeight: "600", color: "#334155" },
	servicesHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
	seeAllText: { color: '#64748B', fontSize: 13 },
	servicesSlider: { paddingRight: 20, paddingBottom: 20 },
	serviceCard: { backgroundColor: "white", width: 110, height: 130, borderRadius: 20, padding: 12, marginRight: 14, justifyContent: "center", alignItems: "center", shadowColor: "#64748B", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3, borderWidth: 1, borderColor: "#F8FAFC" },
	serviceIconContainer: { width: 50, height: 50, borderRadius: 25, backgroundColor: "#F0F9FF", justifyContent: "center", alignItems: "center", marginBottom: 12 },
	serviceText: { fontSize: 13, fontWeight: "600", color: "#475569", textAlign: "center" },

	clinicHomeCard: { backgroundColor: "white", width: 150, height: 120, borderRadius: 20, padding: 16, marginRight: 14, justifyContent: "center", alignItems: "center", shadowColor: "#64748B", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3, borderWidth: 1, borderColor: "#F8FAFC" },
	clinicIconContainer: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#F0F9FF", justifyContent: "center", alignItems: "center", marginBottom: 10 },
	clinicText: { fontSize: 14, fontWeight: "700", color: "#1E293B", textAlign: "center", width: '100%' },
	clinicSubText: { fontSize: 12, color: "#64748B", marginTop: 2 },
	emptyClinicsCard: { padding: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'white', borderRadius: 20, marginBottom: 20, borderWidth: 1, borderColor: '#E2E8F0', borderStyle: 'dashed' },

	// Modal Styles
	modalOverlay: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.5)" },
	modalView: { width: "85%", backgroundColor: "white", borderRadius: 20, padding: 30, alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5 },
	modalIconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: "#F0F9FF", justifyContent: "center", alignItems: "center", marginBottom: 20 },
	modalTitle: { marginBottom: 10, textAlign: "center", fontSize: 20, fontWeight: "bold", color: "#1E293B" },
	modalDescription: { marginBottom: 24, textAlign: "center", fontSize: 15, color: "#64748B", lineHeight: 22 },
	modalButton: { borderRadius: 12, padding: 12, elevation: 2, backgroundColor: "#1B93D5", width: "100%" },
	textStyle: { color: "white", fontWeight: "bold", textAlign: "center", fontSize: 16 }
});

			{/* SERVICE DETAIL MODAL */}
			<Modal
				animationType="fade"
				transparent={true}
				visible={modalVisible}
				onRequestClose={() => setModalVisible(false)}
			>
				<View style={styles.modalOverlay}>
					<View style={styles.modalView}>
						{selectedService && (
							<>
								<View style={styles.modalIconCircle}>
									<Ionicons name={selectedService.icon} size={40} color="#1B93D5" />
								</View>
								<Text style={styles.modalTitle}>{selectedService.title}</Text>
								<Text style={styles.modalDescription}>
									{selectedService.description}
								</Text>
								<Pressable
									style={[styles.modalButton]}
									onPress={() => setModalVisible(false)}
								>
									<Text style={styles.textStyle}>Close</Text>
								</Pressable>
							</>
						)}
					</View>
				</View>
			</Modal>
		</View>
	);
}

function QuickAction({ icon, label, color, onPress }) {
	return (
		<TouchableOpacity style={styles.actionItem} onPress={onPress} activeOpacity={0.7}>
			<View style={[styles.actionIconCircle, { backgroundColor: `${color}15` }]}>
				<Ionicons name={icon} size={28} color={color} />
			</View>
			<Text style={styles.actionLabel}>{label}</Text>
		</TouchableOpacity>
	);
}

function ServiceCard({ title, icon, onPress }) {
	return (
		<TouchableOpacity style={styles.serviceCard} onPress={onPress} activeOpacity={0.8}>
			<View style={styles.serviceIconContainer}>
				<Ionicons name={icon} size={24} color="#1B93D5" />
			</View>
			<Text style={styles.serviceText} numberOfLines={2}>{title}</Text>
		</TouchableOpacity>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: "#F8FAFC" },
	contentContainer: { padding: 24, paddingTop: 10 },
	header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24, marginTop: 10 },
	greeting: { fontSize: 16, color: "#64748B", fontWeight: "500" },
	userName: { fontSize: 28, fontWeight: "800", color: "#1E293B", letterSpacing: -0.5 },
	profileButton: { width: 48, height: 48, borderRadius: 24, backgroundColor: "white", justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "#E2E8F0", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
	sectionTitle: { fontSize: 18, fontWeight: "700", color: "#334155", marginBottom: 12, letterSpacing: -0.3 },
	heroCard: { backgroundColor: "#1B93D5", borderRadius: 24, padding: 22, marginBottom: 28, shadowColor: "#1B93D5", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 12, elevation: 8, position: 'relative', overflow: 'hidden' },
	heroBackgroundCircle: { position: 'absolute', top: -50, right: -50, width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.1)' },
	heroHeader: { flexDirection: "row", alignItems: "center", marginBottom: 18 },
	heroIconContainer: { width: 48, height: 48, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.2)", justifyContent: "center", alignItems: "center", marginRight: 14 },
	heroTitle: { fontSize: 19, fontWeight: "700", color: "white", marginBottom: 2 },
	heroSubtitle: { fontSize: 14, color: "rgba(255,255,255,0.9)", fontWeight: "500" },
	statusBadge: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 20, borderWidth: 1, borderColor: "rgba(255,255,255,0.3)" },
	statusText: { color: "white", fontSize: 12, fontWeight: "700" },
	heroDivider: { height: 1, backgroundColor: "rgba(255,255,255,0.2)", marginBottom: 14 },
	heroFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
	heroTimeInfo: { flexDirection: "row", alignItems: "center", gap: 8 },
	heroFooterText: { color: "white", fontSize: 15, fontWeight: "600" },
	loadingCard: { height: 140, backgroundColor: "white", borderRadius: 20, justifyContent: "center", alignItems: "center", marginBottom: 28 },
	emptyStateCard: { backgroundColor: "white", borderRadius: 24, padding: 28, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#E2E8F0", borderStyle: "dashed", marginBottom: 28 },
	emptyStateIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: "#F1F5F9", justifyContent: "center", alignItems: "center", marginBottom: 12 },
	emptyStateText: { color: "#64748B", fontSize: 15, marginBottom: 8, fontWeight: "500" },
	bookNowLink: { color: "#1B93D5", fontWeight: "700", fontSize: 15 },
	quickActionsGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", marginBottom: 28 },
	actionItem: { width: "48%", backgroundColor: "white", padding: 18, borderRadius: 20, flexDirection: "row", alignItems: "center", marginBottom: 14, shadowColor: "#64748B", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3, borderWidth: 1, borderColor: "#F8FAFC" },
	actionIconCircle: { width: 44, height: 44, borderRadius: 14, justifyContent: "center", alignItems: "center", marginRight: 12 },
	actionLabel: { fontSize: 15, fontWeight: "600", color: "#334155" },
	servicesHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
	seeAllText: { color: '#64748B', fontSize: 13 },
	servicesSlider: { paddingRight: 20, paddingBottom: 20 },
	serviceCard: { backgroundColor: "white", width: 110, height: 130, borderRadius: 20, padding: 12, marginRight: 14, justifyContent: "center", alignItems: "center", shadowColor: "#64748B", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3, borderWidth: 1, borderColor: "#F8FAFC" },
	serviceIconContainer: { width: 50, height: 50, borderRadius: 25, backgroundColor: "#F0F9FF", justifyContent: "center", alignItems: "center", marginBottom: 12 },
	serviceText: { fontSize: 13, fontWeight: "600", color: "#475569", textAlign: "center" },

	// Modal Styles
	modalOverlay: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.5)" },
	modalView: { width: "85%", backgroundColor: "white", borderRadius: 20, padding: 30, alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5 },
	modalIconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: "#F0F9FF", justifyContent: "center", alignItems: "center", marginBottom: 20 },
	modalTitle: { marginBottom: 10, textAlign: "center", fontSize: 20, fontWeight: "bold", color: "#1E293B" },
	modalDescription: { marginBottom: 24, textAlign: "center", fontSize: 15, color: "#64748B", lineHeight: 22 },
	modalButton: { borderRadius: 12, padding: 12, elevation: 2, backgroundColor: "#1B93D5", width: "100%" },
	textStyle: { color: "white", fontWeight: "bold", textAlign: "center", fontSize: 16 }
});