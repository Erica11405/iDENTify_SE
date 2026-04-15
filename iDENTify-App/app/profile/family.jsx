// import {
//   View,
//   Text,
//   StyleSheet,
//   TouchableOpacity,
//   ScrollView,
//   ActivityIndicator,
//   RefreshControl,
//   Modal,
//   Pressable
// } from "react-native";
// import { useRouter, useFocusEffect } from "expo-router";
// import { Ionicons } from "@expo/vector-icons";
// import { useState, useCallback } from "react";
// import { useUser } from "@clerk/clerk-expo";
// import { API, fetchPatientByEmail } from "../../constants/Api";

// export default function FamilyMembers() {
//   const router = useRouter();
//   const { user } = useUser();

//   const [members, setMembers] = useState([]);
//   const [loading, setLoading] = useState(true);

//   // Modal State
//   const [selectedMember, setSelectedMember] = useState(null);
//   const [modalVisible, setModalVisible] = useState(false);

//   const loadFamilyMembers = useCallback(async () => {
//     if (!user) return;
//     setLoading(true);
//     try {
//       const parent = await fetchPatientByEmail(user.primaryEmailAddress.emailAddress);
//       if (!parent) {
//         setMembers([]);
//         return;
//       }

//       // Backend route: /api/patients/:id/family
//       const res = await fetch(`${API.patients}/${parent.id}/family`);
//       if (res.ok) {
//         const data = await res.json();
//         setMembers(data);
//       }
//     } catch (error) {
//       console.error("Error loading family members", error);
//     } finally {
//       setLoading(false);
//     }
//   }, [user]);

//   useFocusEffect(
//     useCallback(() => {
//       loadFamilyMembers();
//     }, [loadFamilyMembers])
//   );

//   const handleMemberClick = (member) => {
//     setSelectedMember(member);
//     setModalVisible(true);
//   };

//   const getRelationship = (alerts) => {
//     if (!alerts) return "Family Member";
//     const alertStr = Array.isArray(alerts) ? alerts.join(',') : alerts;
//     const parts = alertStr.split(',');
//     const rel = parts.find(p => p.trim().startsWith('Relation:'));
//     return rel ? rel.replace('Relation:', '').trim() : "Family Member";
//   };

//   return (
//     <View style={styles.page}>

//       {/* Header with Back + Text */}
//       <View style={styles.header}>
//         <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
//           <Ionicons name="arrow-back" size={24} color="#1E293B" />
//           <Text style={styles.backText}>Back</Text>
//         </TouchableOpacity>

//         <Text style={styles.title}>Family Members</Text>
//         <View style={{ width: 60 }} /> {/* Spacer to balance */}
//       </View>

//       <ScrollView
//         contentContainerStyle={styles.scrollContent}
//         refreshControl={<RefreshControl refreshing={loading} onRefresh={loadFamilyMembers} />}
//       >
//         {loading && members.length === 0 ? (
//           <ActivityIndicator size="large" color="#1B93D5" style={{ marginTop: 50 }} />
//         ) : members.length === 0 ? (
//           <View style={styles.emptyCard}>
//             <Text style={styles.emptyText}>No family members added yet.</Text>
//             <Text style={styles.emptySubtext}>Tap the button below to add one.</Text>
//           </View>
//         ) : (
//           members.map((m) => (
//             <TouchableOpacity
//               key={m.id}
//               style={styles.card}
//               activeOpacity={0.7}
//               onPress={() => handleMemberClick(m)}
//             >
//               <View style={styles.avatarSmall}>
//                 <Ionicons name="person" size={24} color="#1B93D5" />
//               </View>
//               <View style={styles.memberInfo}>
//                 <Text style={styles.name}>{m.full_name}</Text>
//                 <Text style={styles.relation}>{getRelationship(m.medical_alerts)}</Text>
//               </View>
//               <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
//             </TouchableOpacity>
//           ))
//         )}

//         <TouchableOpacity
//           style={styles.addButton}
//           onPress={() => router.push("/profile/add-family")}
//         >
//           <Ionicons name="add-circle" size={24} color="#fff" />
//           <Text style={styles.addText}>Add Family Member</Text>
//         </TouchableOpacity>
//       </ScrollView>

//       {/* MEMBER DETAIL MODAL */}
//       <Modal
//         animationType="fade"
//         transparent={true}
//         visible={modalVisible}
//         onRequestClose={() => setModalVisible(false)}
//       >
//         <Pressable style={styles.modalOverlay} onPress={() => setModalVisible(false)}>
//           <View style={styles.modalContent}>
//             {selectedMember && (
//               <>
//                 <View style={styles.modalHeader}>
//                   <View style={styles.avatarLarge}>
//                     <Ionicons name="person" size={40} color="white" />
//                   </View>
//                   <Text style={styles.modalName}>{selectedMember.full_name}</Text>
//                   <Text style={styles.modalRelation}>{getRelationship(selectedMember.medical_alerts)}</Text>
//                 </View>

//                 <View style={styles.infoGrid}>
//                   <View style={styles.infoRow}>
//                     <Text style={styles.infoLabel}>Age</Text>
//                     <Text style={styles.infoValue}>
//                       {selectedMember.vitals?.age ? `${selectedMember.vitals.age} years old` : "N/A"}
//                     </Text>
//                   </View>
//                   <View style={styles.infoRow}>
//                     <Text style={styles.infoLabel}>Gender</Text>
//                     <Text style={styles.infoValue}>{selectedMember.gender || "N/A"}</Text>
//                   </View>
//                   <View style={styles.infoRow}>
//                     <Text style={styles.infoLabel}>Birthdate</Text>
//                     <Text style={styles.infoValue}>{selectedMember.birthdate ? selectedMember.birthdate.split('T')[0] : "N/A"}</Text>
//                   </View>
//                   <View style={styles.infoRow}>
//                     <Text style={styles.infoLabel}>Contact</Text>
//                     <Text style={styles.infoValue}>{selectedMember.contact_number || "None"}</Text>
//                   </View>
//                   <View style={styles.infoRow}>
//                     <Text style={styles.infoLabel}>Address</Text>
//                     <Text style={styles.infoValue}>{selectedMember.address || "Same as parent"}</Text>
//                   </View>
//                 </View>

//                 <TouchableOpacity
//                   style={styles.closeButton}
//                   onPress={() => setModalVisible(false)}
//                 >
//                   <Text style={styles.closeButtonText}>Close</Text>
//                 </TouchableOpacity>
//               </>
//             )}
//           </View>
//         </Pressable>
//       </Modal>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   page: { flex: 1, backgroundColor: "#F4F8FF" },
//   scrollContent: { padding: 24 },

//   header: {
//     flexDirection: "row",
//     alignItems: "center",
//     justifyContent: "space-between",
//     paddingHorizontal: 24,
//     paddingTop: 60,
//     paddingBottom: 20,
//     backgroundColor: "#F4F8FF",
//     zIndex: 10
//   },

//   // Back Button Styles
//   backButton: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     padding: 8,
//     marginLeft: -8
//   },
//   backText: {
//     fontSize: 16,
//     color: "#1E293B",
//     marginLeft: 6,
//     fontWeight: "600"
//   },

//   title: { fontSize: 22, fontWeight: "700", color: "#1E293B" },

//   /* CARD */
//   card: {
//     backgroundColor: "white",
//     padding: 16,
//     borderRadius: 16,
//     marginBottom: 12,
//     elevation: 2,
//     shadowColor: "#1B93D5",
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.05,
//     shadowRadius: 6,
//     flexDirection: 'row',
//     alignItems: 'center'
//   },
//   avatarSmall: {
//     width: 48,
//     height: 48,
//     borderRadius: 24,
//     backgroundColor: "#E0F2FE",
//     justifyContent: 'center',
//     alignItems: 'center',
//     marginRight: 16
//   },
//   memberInfo: { flex: 1 },
//   name: { fontSize: 16, fontWeight: "700", color: "#1E293B" },
//   relation: { color: "#64748B", fontSize: 13, marginTop: 2 },

//   /* BUTTON */
//   addButton: {
//     backgroundColor: "#1B93D5",
//     padding: 16,
//     borderRadius: 14,
//     alignItems: "center",
//     marginTop: 10,
//     flexDirection: "row",
//     justifyContent: "center",
//     shadowColor: "#1B93D5",
//     shadowOffset: { width: 0, height: 4 },
//     shadowOpacity: 0.3,
//     shadowRadius: 8,
//     elevation: 4
//   },
//   addText: { color: "white", fontSize: 16, fontWeight: "700", marginLeft: 8 },

//   /* MODAL */
//   modalOverlay: {
//     flex: 1,
//     backgroundColor: "rgba(0,0,0,0.5)",
//     justifyContent: "center",
//     alignItems: "center",
//     padding: 20
//   },
//   modalContent: {
//     width: "100%",
//     maxWidth: 340,
//     backgroundColor: "white",
//     borderRadius: 24,
//     padding: 24,
//     alignItems: "center",
//     elevation: 5
//   },
//   modalHeader: { alignItems: 'center', marginBottom: 20, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', width: '100%', paddingBottom: 16 },
//   avatarLarge: { width: 80, height: 80, borderRadius: 40, backgroundColor: "#1B93D5", justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
//   modalName: { fontSize: 20, fontWeight: "800", color: "#1E293B", textAlign: "center" },
//   modalRelation: { fontSize: 15, color: "#64748B", fontWeight: "500", marginTop: 2 },
//   infoGrid: { width: '100%', gap: 10 },
//   infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
//   infoLabel: { color: "#94A3B8", fontSize: 14, fontWeight: "600" },
//   infoValue: { color: "#1E293B", fontSize: 14, fontWeight: "700" },
//   closeButton: { marginTop: 24, backgroundColor: "#F1F5F9", paddingVertical: 12, borderRadius: 12, width: '100%' },
//   closeButtonText: { color: "#334155", fontWeight: "700", textAlign: "center", fontSize: 15 },
//   emptyCard: { backgroundColor: 'white', borderRadius: 16, padding: 30, alignItems: 'center', marginBottom: 20 },
//   emptyText: { fontSize: 16, fontWeight: '600', color: '#334155' },
//   emptySubtext: { fontSize: 14, color: '#94A3B8', marginTop: 5 },
// });


import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl, Modal, Pressable, Alert
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useState, useCallback } from "react";
import { useUser } from "@clerk/clerk-expo";
import { API, fetchPatientByEmail } from "../../constants/Api";

export default function FamilyMembers() {
  const router = useRouter();
  const { user } = useUser();

  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [selectedMember, setSelectedMember] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  const loadFamilyMembers = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const parent = await fetchPatientByEmail(user.primaryEmailAddress.emailAddress);
      if (!parent) {
        setMembers([]);
        return;
      }
      const res = await fetch(`${API.patients}/${parent.id}/family`);
      if (res.ok) {
        const data = await res.json();
        setMembers(data);
      }
    } catch (error) {
      console.error("Error loading family members", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadFamilyMembers();
    }, [loadFamilyMembers])
  );

  const handleMemberClick = (member) => {
    setSelectedMember(member);
    setModalVisible(true);
  };

  const getRelationship = (alerts) => {
    if (!alerts) return "Family Member";
    const alertStr = Array.isArray(alerts) ? alerts.join(',') : alerts;
    const parts = alertStr.split(',');
    const rel = parts.find(p => p.trim().startsWith('Relation:'));
    return rel ? rel.replace('Relation:', '').trim() : "Family Member";
  };

  const getAgeDisplay = (member) => {
    const vitalsAge = Number.parseInt(String(member?.vitals?.age ?? ""), 10);
    if (Number.isFinite(vitalsAge) && vitalsAge >= 0) {
      return `${vitalsAge} years old`;
    }

    if (!member?.birthdate) return "N/A";

    const birthDate = new Date(member.birthdate);
    if (Number.isNaN(birthDate.getTime())) return "N/A";

    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age -= 1;
    }

    if (!Number.isFinite(age) || age < 0) return "N/A";
    return `${age} years old`;
  };

  const confirmDelete = (id) => {
    Alert.alert("Delete Member", "Are you sure you want to remove this family member? This action cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteMember(id) }
    ]);
  };

  const deleteMember = async (id) => {
    try {
      const res = await fetch(`${API.patients}/${id}`, { method: 'DELETE' });
      if (res.ok) {
        Alert.alert("Success", "Family member removed.");
        setModalVisible(false);
        loadFamilyMembers(); // Refresh the list
      } else {
        throw new Error("Failed to delete member");
      }
    } catch (error) {
      Alert.alert("Error", error.message);
    }
  };

  return (
    <View style={styles.page}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1E293B" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Family Members</Text>
        <View style={{ width: 60 }} /> 
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} refreshControl={<RefreshControl refreshing={loading} onRefresh={loadFamilyMembers} />}>
        {loading && members.length === 0 ? (
          <ActivityIndicator size="large" color="#1B93D5" style={{ marginTop: 50 }} />
        ) : members.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No family members added yet.</Text>
            <Text style={styles.emptySubtext}>Tap the button below to add one.</Text>
          </View>
        ) : (
          members.map((m) => (
            <TouchableOpacity key={m.id} style={styles.card} activeOpacity={0.7} onPress={() => handleMemberClick(m)}>
              <View style={styles.avatarSmall}>
                <Ionicons name="person" size={24} color="#1B93D5" />
              </View>
              <View style={styles.memberInfo}>
                <Text style={styles.name}>{m.full_name}</Text>
                <Text style={styles.relation}>{getRelationship(m.medical_alerts)}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
            </TouchableOpacity>
          ))
        )}

        <TouchableOpacity style={styles.addButton} onPress={() => router.push("/profile/add-family")}>
          <Ionicons name="add-circle" size={24} color="#fff" />
          <Text style={styles.addText}>Add Family Member</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* MEMBER DETAIL MODAL */}
      <Modal animationType="fade" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setModalVisible(false)}>
          <View style={styles.modalContent}>
            {selectedMember && (
              <>
                <View style={styles.modalHeader}>
                  <View style={styles.avatarLarge}>
                    <Ionicons name="person" size={40} color="white" />
                  </View>
                  <Text style={styles.modalName}>{selectedMember.full_name}</Text>
                  <Text style={styles.modalRelation}>{getRelationship(selectedMember.medical_alerts)}</Text>
                </View>

                <View style={styles.infoGrid}>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Age</Text>
                    <Text style={styles.infoValue}>{getAgeDisplay(selectedMember)}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Gender</Text>
                    <Text style={styles.infoValue}>{selectedMember.gender || "N/A"}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Birthdate</Text>
                    <Text style={styles.infoValue}>{selectedMember.birthdate ? selectedMember.birthdate.split('T')[0] : "N/A"}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Contact</Text>
                    <Text style={styles.infoValue}>{selectedMember.contact_number || "None"}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Address</Text>
                    <Text style={styles.infoValue}>{selectedMember.address || "Same as parent"}</Text>
                  </View>
                </View>

                {/* Edit & Delete Buttons */}
                <View style={styles.actionButtonsContainer}>
                  <TouchableOpacity style={styles.editButton} onPress={() => {
                    setModalVisible(false);
                    router.push({ pathname: "/profile/edit-family", params: { id: selectedMember.id } });
                  }}>
                    <Ionicons name="pencil" size={18} color="white" />
                    <Text style={styles.actionText}>Edit</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.deleteButton} onPress={() => confirmDelete(selectedMember.id)}>
                    <Ionicons name="trash" size={18} color="white" />
                    <Text style={styles.actionText}>Delete</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity style={styles.closeButton} onPress={() => setModalVisible(false)}>
                  <Text style={styles.closeButtonText}>Close</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#F4F8FF" },
  scrollContent: { padding: 24 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 24, paddingTop: 60, paddingBottom: 20, backgroundColor: "#F4F8FF", zIndex: 10 },
  backButton: { flexDirection: 'row', alignItems: 'center', padding: 8, marginLeft: -8 },
  backText: { fontSize: 16, color: "#1E293B", marginLeft: 6, fontWeight: "600" },
  title: { fontSize: 22, fontWeight: "700", color: "#1E293B" },
  card: { backgroundColor: "white", padding: 16, borderRadius: 16, marginBottom: 12, elevation: 2, shadowColor: "#1B93D5", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, flexDirection: 'row', alignItems: 'center' },
  avatarSmall: { width: 48, height: 48, borderRadius: 24, backgroundColor: "#E0F2FE", justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  memberInfo: { flex: 1 },
  name: { fontSize: 16, fontWeight: "700", color: "#1E293B" },
  relation: { color: "#64748B", fontSize: 13, marginTop: 2 },
  addButton: { backgroundColor: "#1B93D5", padding: 16, borderRadius: 14, alignItems: "center", marginTop: 10, flexDirection: "row", justifyContent: "center", shadowColor: "#1B93D5", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  addText: { color: "white", fontSize: 16, fontWeight: "700", marginLeft: 8 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 20 },
  modalContent: { width: "100%", maxWidth: 340, backgroundColor: "white", borderRadius: 24, padding: 24, alignItems: "center", elevation: 5 },
  modalHeader: { alignItems: 'center', marginBottom: 20, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', width: '100%', paddingBottom: 16 },
  avatarLarge: { width: 80, height: 80, borderRadius: 40, backgroundColor: "#1B93D5", justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  modalName: { fontSize: 20, fontWeight: "800", color: "#1E293B", textAlign: "center" },
  modalRelation: { fontSize: 15, color: "#64748B", fontWeight: "500", marginTop: 2 },
  infoGrid: { width: '100%', gap: 10 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  infoLabel: { color: "#94A3B8", fontSize: 14, fontWeight: "600" },
  infoValue: { color: "#1E293B", fontSize: 14, fontWeight: "700" },
  
  // New Styles for Edit/Delete Buttons
  actionButtonsContainer: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 24, gap: 12 },
  editButton: { flex: 1, backgroundColor: "#1B93D5", paddingVertical: 12, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 },
  deleteButton: { flex: 1, backgroundColor: "#EF4444", paddingVertical: 12, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 },
  actionText: { color: "white", fontWeight: "700", fontSize: 15 },
  
  closeButton: { marginTop: 12, backgroundColor: "#F1F5F9", paddingVertical: 12, borderRadius: 12, width: '100%' },
  closeButtonText: { color: "#334155", fontWeight: "700", textAlign: "center", fontSize: 15 },
  emptyCard: { backgroundColor: 'white', borderRadius: 16, padding: 30, alignItems: 'center', marginBottom: 20 },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#334155' },
  emptySubtext: { fontSize: 14, color: '#94A3B8', marginTop: 5 },
});