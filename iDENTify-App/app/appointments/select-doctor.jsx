// // // // import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView } from "react-native";
// // // // import { Ionicons } from "@expo/vector-icons";
// // // // import { useLocalSearchParams, useRouter } from "expo-router";
// // // // import { useEffect, useState } from "react";
// // // // import { API } from "../../constants/Api";

// // // // export default function SelectDoctor() {
// // // //   const { service } = useLocalSearchParams();
// // // //   const router = useRouter();
// // // //   const [doctors, setDoctors] = useState([]);
// // // //   const [loading, setLoading] = useState(true);

// // // //   useEffect(() => {
// // // //     const fetchDoctors = async () => {
// // // //       try {
// // // //         const res = await fetch(API.dentists);
// // // //         const data = await res.json();

// // // //         // FILTER: Strictly remove dentists who are "Off"
// // // //         const activeDoctors = data.filter(doc => doc.status !== 'Off');

// // // //         setDoctors(activeDoctors);
// // // //       } catch (error) {
// // // //         console.error("Error fetching doctors", error);
// // // //       } finally {
// // // //         setLoading(false);
// // // //       }
// // // //     };
// // // //     fetchDoctors();
// // // //   }, []);

// // // //   return (
// // // //     <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>

// // // //       {/* HEADER WITH BACK BUTTON */}
// // // //       <View style={styles.header}>
// // // //         <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
// // // //           <Ionicons name="arrow-back" size={24} color="#1E293B" />
// // // //           <Text style={styles.backText}>Back</Text>
// // // //         </TouchableOpacity>

// // // //         <Text style={styles.title}>Choose a Specialist</Text>
// // // //         <Text style={styles.subtitle}>for {service || "Appointment"}</Text>
// // // //       </View>

// // // //       {loading ? (
// // // //         <View style={styles.loadingContainer}>
// // // //           <ActivityIndicator size="large" color="#1B93D5" />
// // // //         </View>
// // // //       ) : doctors.length === 0 ? (
// // // //         <View style={styles.emptyContainer}>
// // // //           <Text style={styles.emptyText}>No dentists available at the moment.</Text>
// // // //         </View>
// // // //       ) : (
// // // //         <View style={styles.listContainer}>
// // // //           {doctors.map((doc) => (
// // // //             <TouchableOpacity
// // // //               key={doc.id}
// // // //               style={styles.card}
// // // //               activeOpacity={0.7}
// // // //               onPress={() =>
// // // //                 router.push(
// // // //                   `/appointments/select-datetime?doctor=${doc.name}&docId=${doc.id}&service=${service}`
// // // //                 )
// // // //               }
// // // //             >
// // // //               <View style={styles.avatarContainer}>
// // // //                 <Ionicons name="person" size={24} color="#1B93D5" />
// // // //               </View>

// // // //               <View style={styles.infoContainer}>
// // // //                 <Text style={styles.cardTitle}>{doc.name}</Text>
// // // //                 <Text style={styles.cardSubtitle}>{doc.specialization || "General Dentist"}</Text>
// // // //               </View>

// // // //               {/* Show Busy Tag if status is Busy */}
// // // //               {doc.status === 'Busy' && (
// // // //                 <View style={styles.busyBadge}>
// // // //                   <Text style={styles.busyText}>Busy</Text>
// // // //                 </View>
// // // //               )}

// // // //               <View style={styles.arrowContainer}>
// // // //                 <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
// // // //               </View>
// // // //             </TouchableOpacity>
// // // //           ))}
// // // //         </View>
// // // //       )}
// // // //     </ScrollView>
// // // //   );
// // // // }

// // // // const styles = StyleSheet.create({
// // // //   container: {
// // // //     flex: 1,
// // // //     backgroundColor: "#F8FAFC"
// // // //   },
// // // //   contentContainer: {
// // // //     padding: 24,
// // // //     paddingTop: 40,
// // // //   },
// // // //   header: {
// // // //     marginBottom: 32,
// // // //   },

// // // //   // Back Button Styles
// // // //   backButton: {
// // // //     flexDirection: 'row',
// // // //     alignItems: 'center',
// // // //     alignSelf: 'flex-start',
// // // //     marginBottom: 16,
// // // //     paddingRight: 10,
// // // //     marginLeft: -4
// // // //   },
// // // //   backText: {
// // // //     fontSize: 16,
// // // //     color: "#1E293B",
// // // //     marginLeft: 6,
// // // //     fontWeight: "600"
// // // //   },

// // // //   title: {
// // // //     fontSize: 28,
// // // //     fontWeight: "800",
// // // //     color: "#1E293B",
// // // //     marginBottom: 4,
// // // //     letterSpacing: -0.5,
// // // //   },
// // // //   subtitle: {
// // // //     fontSize: 16,
// // // //     color: "#64748B",
// // // //     fontWeight: "500"
// // // //   },
// // // //   loadingContainer: {
// // // //     flex: 1,
// // // //     justifyContent: 'center',
// // // //     alignItems: 'center',
// // // //     marginTop: 40,
// // // //   },
// // // //   emptyContainer: {
// // // //     alignItems: 'center',
// // // //     marginTop: 40,
// // // //   },
// // // //   emptyText: {
// // // //     fontSize: 16,
// // // //     color: "#94A3B8",
// // // //     fontStyle: 'italic'
// // // //   },
// // // //   listContainer: {
// // // //     gap: 16,
// // // //   },
// // // //   card: {
// // // //     flexDirection: "row",
// // // //     alignItems: "center",
// // // //     backgroundColor: "white",
// // // //     padding: 20,
// // // //     borderRadius: 20,
// // // //     shadowColor: "#64748B",
// // // //     shadowOffset: { width: 0, height: 4 },
// // // //     shadowOpacity: 0.05,
// // // //     shadowRadius: 10,
// // // //     elevation: 3,
// // // //     borderWidth: 1,
// // // //     borderColor: "#F1F5F9",
// // // //   },
// // // //   avatarContainer: {
// // // //     width: 56,
// // // //     height: 56,
// // // //     borderRadius: 20,
// // // //     backgroundColor: "#F0F9FF",
// // // //     justifyContent: "center",
// // // //     alignItems: "center",
// // // //     marginRight: 16,
// // // //   },
// // // //   infoContainer: {
// // // //     flex: 1,
// // // //   },
// // // //   cardTitle: {
// // // //     fontSize: 16,
// // // //     fontWeight: "700",
// // // //     color: "#1E293B",
// // // //     marginBottom: 4,
// // // //   },
// // // //   cardSubtitle: {
// // // //     fontSize: 13,
// // // //     color: "#64748B",
// // // //     fontWeight: "500",
// // // //   },
// // // //   arrowContainer: {
// // // //     paddingLeft: 8,
// // // //   },
// // // //   busyBadge: {
// // // //     backgroundColor: '#FEF3C7',
// // // //     paddingVertical: 4,
// // // //     paddingHorizontal: 8,
// // // //     borderRadius: 8,
// // // //     marginRight: 8
// // // //   },
// // // //   busyText: {
// // // //     color: '#D97706',
// // // //     fontSize: 12,
// // // //     fontWeight: '700'
// // // //   }
// // // // });







// // import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView } from "react-native";
// // import { Ionicons } from "@expo/vector-icons";
// // import { useLocalSearchParams, useRouter } from "expo-router";
// // import { useEffect, useState } from "react";
// // import { API } from "../../constants/Api";

// // export default function SelectDoctor() {
// //   const { service } = useLocalSearchParams();
// //   const router = useRouter();
// //   const [doctors, setDoctors] = useState([]);
// //   const [loading, setLoading] = useState(true);

// //   useEffect(() => {
// //     const fetchDoctors = async () => {
// //       try {
// //         const res = await fetch(API.dentists);
// //         const data = await res.json();

// //         // FILTER: Strictly remove dentists who are "Off" 
// //         // AND completely remove anyone who is a "Dental Aide"
// //         const activeDoctors = data.filter(doc => 
// //           doc.status !== 'Off' && 
// //           doc.specialization !== 'Dental Aide' && 
// //           doc.role !== 'aide'
// //         );

// //         setDoctors(activeDoctors);
// //       } catch (error) {
// //         console.error("Error fetching doctors", error);
// //       } finally {
// //         setLoading(false);
// //       }
// //     };
// //     fetchDoctors();
// //   }, []);

// //   return (
// //     <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>

// //       {/* HEADER WITH BACK BUTTON */}
// //       <View style={styles.header}>
// //         <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
// //           <Ionicons name="arrow-back" size={24} color="#1E293B" />
// //           <Text style={styles.backText}>Back</Text>
// //         </TouchableOpacity>

// //         <Text style={styles.title}>Choose a Specialist</Text>
// //         <Text style={styles.subtitle}>for {service || "Appointment"}</Text>
// //       </View>

// //       {loading ? (
// //         <View style={styles.loadingContainer}>
// //           <ActivityIndicator size="large" color="#1B93D5" />
// //         </View>
// //       ) : doctors.length === 0 ? (
// //         <View style={styles.emptyContainer}>
// //           <Text style={styles.emptyText}>No dentists available at the moment.</Text>
// //         </View>
// //       ) : (
// //         <View style={styles.listContainer}>
// //           {doctors.map((doc) => (
// //             <TouchableOpacity
// //               key={doc.id}
// //               style={styles.card}
// //               activeOpacity={0.7}
// //               onPress={() =>
// //                 router.push(
// //                   `/appointments/select-datetime?doctor=${doc.name}&docId=${doc.id}&service=${service}`
// //                 )
// //               }
// //             >
// //               <View style={styles.avatarContainer}>
// //                 <Ionicons name="person" size={24} color="#1B93D5" />
// //               </View>

// //               <View style={styles.infoContainer}>
// //                 <Text style={styles.cardTitle}>{doc.name}</Text>
// //                 <Text style={styles.cardSubtitle}>{doc.specialization || "General Dentist"}</Text>
// //               </View>

// //               {/* Show Busy Tag if status is Busy */}
// //               {doc.status === 'Busy' && (
// //                 <View style={styles.busyBadge}>
// //                   <Text style={styles.busyText}>Busy</Text>
// //                 </View>
// //               )}

// //               <View style={styles.arrowContainer}>
// //                 <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
// //               </View>
// //             </TouchableOpacity>
// //           ))}
// //         </View>
// //       )}
// //     </ScrollView>
// //   );
// // }

// // const styles = StyleSheet.create({
// //   container: {
// //     flex: 1,
// //     backgroundColor: "#F8FAFC"
// //   },
// //   contentContainer: {
// //     padding: 24,
// //     paddingTop: 40,
// //   },
// //   header: {
// //     marginBottom: 32,
// //   },

// //   // Back Button Styles
// //   backButton: {
// //     flexDirection: 'row',
// //     alignItems: 'center',
// //     alignSelf: 'flex-start',
// //     marginBottom: 16,
// //     paddingRight: 10,
// //     marginLeft: -4
// //   },
// //   backText: {
// //     fontSize: 16,
// //     color: "#1E293B",
// //     marginLeft: 6,
// //     fontWeight: "600"
// //   },

// //   title: {
// //     fontSize: 28,
// //     fontWeight: "800",
// //     color: "#1E293B",
// //     marginBottom: 4,
// //     letterSpacing: -0.5,
// //   },
// //   subtitle: {
// //     fontSize: 16,
// //     color: "#64748B",
// //     fontWeight: "500"
// //   },
// //   loadingContainer: {
// //     flex: 1,
// //     justifyContent: 'center',
// //     alignItems: 'center',
// //     marginTop: 40,
// //   },
// //   emptyContainer: {
// //     alignItems: 'center',
// //     marginTop: 40,
// //   },
// //   emptyText: {
// //     fontSize: 16,
// //     color: "#94A3B8",
// //     fontStyle: 'italic'
// //   },
// //   listContainer: {
// //     gap: 16,
// //   },
// //   card: {
// //     flexDirection: "row",
// //     alignItems: "center",
// //     backgroundColor: "white",
// //     padding: 20,
// //     borderRadius: 20,
// //     shadowColor: "#64748B",
// //     shadowOffset: { width: 0, height: 4 },
// //     shadowOpacity: 0.05,
// //     shadowRadius: 10,
// //     elevation: 3,
// //     borderWidth: 1,
// //     borderColor: "#F1F5F9",
// //   },
// //   avatarContainer: {
// //     width: 56,
// //     height: 56,
// //     borderRadius: 20,
// //     backgroundColor: "#F0F9FF",
// //     justifyContent: "center",
// //     alignItems: "center",
// //     marginRight: 16,
// //   },
// //   infoContainer: {
// //     flex: 1,
// //   },
// //   cardTitle: {
// //     fontSize: 16,
// //     fontWeight: "700",
// //     color: "#1E293B",
// //     marginBottom: 4,
// //   },
// //   cardSubtitle: {
// //     fontSize: 13,
// //     color: "#64748B",
// //     fontWeight: "500",
// //   },
// //   arrowContainer: {
// //     paddingLeft: 8,
// //   },
// //   busyBadge: {
// //     backgroundColor: '#FEF3C7',
// //     paddingVertical: 4,
// //     paddingHorizontal: 8,
// //     borderRadius: 8,
// //     marginRight: 8
// //   },
// //   busyText: {
// //     color: '#D97706',
// //     fontSize: 12,
// //     fontWeight: '700'
// //   }
// // });


// // // import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView } from "react-native";
// // // import { Ionicons } from "@expo/vector-icons";
// // // import { useLocalSearchParams, useRouter } from "expo-router";
// // // import { useEffect, useState } from "react";
// // // import { API } from "../../constants/Api";

// // // export default function SelectDoctor() {
// // //   const { service } = useLocalSearchParams();
// // //   const router = useRouter();
// // //   const [doctors, setDoctors] = useState([]);
// // //   const [loading, setLoading] = useState(true);

// // //   useEffect(() => {
// // //     const fetchDoctors = async () => {
// // //       try {
// // //         const res = await fetch(API.dentists);
// // //         const data = await res.json();

// // //         // UPDATED FILTER: 
// // //         // 1. Strictly remove staff whose specialization is "Dental Aide"
// // //         // 2. Remove staff with the 'aide' role
// // //         // 3. Keep the existing filter for dentists who are "Off"
// // //         const activeDoctors = data.filter(doc => 
// // //           doc.specialization !== 'Dental Aide' && 
// // //           doc.role !== 'aide' &&
// // //           doc.status !== 'Off'
// // //         );

// // //         setDoctors(activeDoctors);
// // //       } catch (error) {
// // //         console.error("Error fetching doctors", error);
// // //       } finally {
// // //         setLoading(false);
// // //       }
// // //     };
// // //     fetchDoctors();
// // //   }, []);

// // //   return (
// // //     <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
// // //       <View style={styles.header}>
// // //         <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
// // //           <Ionicons name="arrow-back" size={24} color="#1E293B" />
// // //         </TouchableOpacity>
// // //         <Text style={styles.title}>Select Dentist</Text>
// // //         <Text style={styles.subtitle}>Choose your preferred doctor</Text>
// // //       </View>

// // //       {loading ? (
// // //         <View style={styles.loadingContainer}>
// // //           <ActivityIndicator size="large" color="#0EA5E9" />
// // //         </View>
// // //       ) : doctors.length === 0 ? (
// // //         <View style={styles.emptyContainer}>
// // //           <Text style={styles.emptyText}>No available dentists found.</Text>
// // //         </View>
// // //       ) : (
// // //         <View style={styles.listContainer}>
// // //           {doctors.map((doc) => (
// // //             <TouchableOpacity 
// // //               key={doc.id} 
// // //               style={styles.card}
// // //               onPress={() => router.push({
// // //                 pathname: "/appointments/select-datetime",
// // //                 params: { service, dentistId: doc.id, dentistName: doc.name }
// // //               })}
// // //             >
// // //               <View style={styles.avatarContainer}>
// // //                 <Ionicons name="person" size={30} color="#0EA5E9" />
// // //               </View>
// // //               <View style={styles.info}>
// // //                 <Text style={styles.name}>Dr. {doc.name || `${doc.first_name} ${doc.last_name}`}</Text>
// // //                 <Text style={styles.spec}>{doc.specialization}</Text>
// // //               </View>
// // //               <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
// // //             </TouchableOpacity>
// // //           ))}
// // //         </View>
// // //       )}
// // //     </ScrollView>
// // //   );
// // // }

// // // const styles = StyleSheet.create({
// // //   container: {
// // //     flex: 1,
// // //     backgroundColor: "#F8FAFC",
// // //   },
// // //   contentContainer: {
// // //     padding: 24,
// // //   },
// // //   header: {
// // //     marginBottom: 32,
// // //     marginTop: 20,
// // //   },
// // //   backButton: {
// // //     width: 40,
// // //     height: 40,
// // //     borderRadius: 12,
// // //     backgroundColor: "white",
// // //     justifyContent: "center",
// // //     alignItems: "center",
// // //     marginBottom: 16,
// // //     borderWidth: 1,
// // //     borderColor: "#F1F5F9",
// // //   },
// // //   title: {
// // //     fontSize: 28,
// // //     fontWeight: "800",
// // //     color: "#1E293B",
// // //     marginBottom: 4,
// // //     letterSpacing: -0.5,
// // //   },
// // //   subtitle: {
// // //     fontSize: 16,
// // //     color: "#64748B",
// // //     fontWeight: "500"
// // //   },
// // //   loadingContainer: {
// // //     flex: 1,
// // //     justifyContent: 'center',
// // //     alignItems: 'center',
// // //     marginTop: 40,
// // //   },
// // //   emptyContainer: {
// // //     alignItems: 'center',
// // //     marginTop: 40,
// // //   },
// // //   emptyText: {
// // //     fontSize: 16,
// // //     color: "#94A3B8",
// // //     fontStyle: 'italic'
// // //   },
// // //   listContainer: {
// // //     gap: 16,
// // //   },
// // //   card: {
// // //     flexDirection: "row",
// // //     alignItems: "center",
// // //     backgroundColor: "white",
// // //     padding: 20,
// // //     borderRadius: 20,
// // //     shadowColor: "#64748B",
// // //     shadowOffset: { width: 0, height: 4 },
// // //     shadowOpacity: 0.05,
// // //     shadowRadius: 10,
// // //     elevation: 3,
// // //     borderWidth: 1,
// // //     borderColor: "#F1F5F9",
// // //     marginBottom: 12,
// // //   },
// // //   avatarContainer: {
// // //     width: 56,
// // //     height: 56,
// // //     borderRadius: 20,
// // //     backgroundColor: "#F0F9FF",
// // //     justifyContent: "center",
// // //     alignItems: "center",
// // //     marginRight: 16,
// // //   },
// // //   info: {
// // //     flex: 1,
// // //   },
// // //   name: {
// // //     fontSize: 18,
// // //     fontWeight: "700",
// // //     color: "#1E293B",
// // //     marginBottom: 4,
// // //   },
// // //   spec: {
// // //     fontSize: 14,
// // //     color: "#64748B",
// // //     fontWeight: "500",
// // //   },
// // // });



// import {
//   View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, ScrollView, Platform, Modal, Pressable
// } from "react-native";
// import { useRouter } from "expo-router";
// import { useState, useEffect } from "react";
// import { useUser } from "@clerk/clerk-expo";
// import { Ionicons } from "@expo/vector-icons";
// import { API, fetchPatientByEmail } from "../../constants/Api";
// import DateTimePicker from '@react-native-community/datetimepicker';

// export default function AddFamilyMember() {
//   const router = useRouter();
//   const { user } = useUser();
//   const [relationship, setRelationship] = useState("");
//   const [givenName, setGivenName] = useState("");
//   const [middleName, setMiddleName] = useState("");
//   const [lastName, setLastName] = useState("");
//   const [sex, setSex] = useState("");
  
//   // Initialize with today's date so the validation doesn't block submission
//   const [bday, setBday] = useState(new Date().toISOString().split('T')[0]);
//   const [dateObject, setDateObject] = useState(new Date());
//   const [displayAge, setDisplayAge] = useState("0 years old"); 
  
//   const [phone, setPhone] = useState("");
//   const [address, setAddress] = useState("");
//   const [parentPatient, setParentPatient] = useState(null);
//   const [loading, setLoading] = useState(false);
//   const [modalVisible, setModalVisible] = useState(false);
//   const [showDatePicker, setShowDatePicker] = useState(false);

//   useEffect(() => {
//     const loadParent = async () => {
//       if (!user) return;
//       const patient = await fetchPatientByEmail(user.primaryEmailAddress.emailAddress);
//       setParentPatient(patient);
//     };
//     loadParent();
//   }, [user]);

//   const calculateAge = (birthDate) => {
//     const today = new Date();
//     let age = today.getFullYear() - birthDate.getFullYear();
//     const m = today.getMonth() - birthDate.getMonth();
//     if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
//     return age;
//   };

//   const onChangeDate = (event, selectedDate) => {
//     if (Platform.OS === 'android') setShowDatePicker(false);
//     if (selectedDate) {
//       setDateObject(selectedDate);
//       const formatted = selectedDate.toISOString().split('T')[0];
//       setBday(formatted);
//       setDisplayAge(`${calculateAge(selectedDate)} years old`);
//     }
//   };

//   const saveMember = async () => {
//     if (!givenName || !lastName || !bday) {
//       Alert.alert("Missing Info", "Please enter at least Name and Birthdate.");
//       return;
//     }
//     if (!parentPatient) {
//       Alert.alert("Error", "Could not identify your account. Please wait a moment and try again.");
//       return;
//     }
    
//     setLoading(true);
//     const fullNameCombined = `${givenName} ${middleName} ${lastName}`.replace(/\s+/g, " ").trim();
//     const relationshipTag = relationship ? [`Relation: ${relationship}`] : [];

//     const payload = {
//       full_name: fullNameCombined,
//       first_name: givenName, 
//       middle_name: middleName,
//       last_name: lastName,
//       parent_id: parentPatient.id,
//       birthdate: bday,
//       gender: sex,
//       contact_number: phone,
//       address: address,
//       medicalAlerts: relationshipTag,
//       vitals: { age: calculateAge(dateObject) },
//       // Omit 'email' entirely instead of sending null, to avoid potential unique constraint issues in MySQL
//     };

//     console.log("Sending payload to backend:", payload); // Debugging step 1

//     try {
//       const res = await fetch(API.patients, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify(payload),
//       });

//       console.log("Backend response status:", res.status); // Debugging step 2

//       if (res.ok) {
//         Alert.alert("Success", "Family member added.");
//         router.back();
//       } else {
//         // Log the actual text response from the server to see the SQL error
//         const errorText = await res.text();
//         console.error("Server error response:", errorText);
//         throw new Error(`Server responded with status ${res.status}`);
//       }
//     } catch (error) {
//       console.error("Fetch error:", error);
//       Alert.alert("Error", `Failed to add member: ${error.message}`);
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
//       <View style={styles.header}>
//         <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
//           <Ionicons name="arrow-back" size={24} color="#1E293B" />
//           <Text style={styles.backText}>Back</Text>
//         </TouchableOpacity>
//         <Text style={styles.headerTitle}>Add Family Member</Text>
//         <View style={{ width: 60 }} />
//       </View>

//       <View style={styles.formGroup}>
//         <Text style={styles.label}>Set nickname/relationship</Text>
//         <TextInput style={styles.input} value={relationship} onChangeText={setRelationship} placeholder="e.g. Son, Wife" placeholderTextColor="#9CA3AF" />
//         <Text style={styles.label}>Given name</Text>
//         <TextInput style={styles.input} value={givenName} onChangeText={setGivenName} placeholder="First Name" placeholderTextColor="#9CA3AF" />
//         <Text style={styles.label}>Middle name (optional)</Text>
//         <TextInput style={styles.input} value={middleName} onChangeText={setMiddleName} placeholder="Middle Name" placeholderTextColor="#9CA3AF" />
//         <Text style={styles.label}>Last name</Text>
//         <TextInput style={styles.input} value={lastName} onChangeText={setLastName} placeholder="Last Name" placeholderTextColor="#9CA3AF" />
        
//         <Text style={styles.label}>Sex</Text>
//         <TouchableOpacity style={styles.input} onPress={() => setModalVisible(true)}>
//           <Text style={{ color: sex ? '#1E293B' : '#9CA3AF' }}>{sex || "Select Sex"}</Text>
//           <Ionicons name="chevron-down" size={20} color="#666" style={{ position: 'absolute', right: 15, top: 14 }} />
//         </TouchableOpacity>
        
//         <Text style={styles.label}>Birthday</Text>
//         <TouchableOpacity style={styles.input} onPress={() => setShowDatePicker(true)}>
//           {bday ? (
//             <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%' }}>
//               <Text style={{ color: '#1E293B' }}>{bday}</Text>
//               <Text style={{ color: '#1B93D5', fontWeight: '600' }}>{displayAge}</Text>
//             </View>
//           ) : <Text style={{ color: '#9CA3AF' }}>Select Birthdate</Text>}
//           <Ionicons name="calendar-outline" size={20} color="#666" style={{ position: 'absolute', right: 15, top: 14 }} />
//         </TouchableOpacity>
        
//         {showDatePicker && <DateTimePicker value={dateObject} mode="date" display={Platform.OS === 'ios' ? 'spinner' : 'default'} onChange={onChangeDate} maximumDate={new Date()} />}
//         {Platform.OS === 'ios' && showDatePicker && <TouchableOpacity onPress={() => setShowDatePicker(false)} style={styles.iosDoneBtn}><Text style={{ color: 'white' }}>Done</Text></TouchableOpacity>}
        
//         <Text style={styles.label}>Phone number</Text>
//         <TextInput style={styles.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="0917..." placeholderTextColor="#9CA3AF" />
        
//         <Text style={styles.label}>Address</Text>
//         <TextInput style={styles.input} value={address} onChangeText={setAddress} placeholder="Full Address" placeholderTextColor="#9CA3AF" />
//       </View>

//       <TouchableOpacity style={styles.saveButton} onPress={saveMember} disabled={loading}>
//         {loading ? <ActivityIndicator color="white" /> : <Text style={styles.saveButtonText}>Add</Text>}
//       </TouchableOpacity>

//       <Modal animationType="fade" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
//         <Pressable style={styles.modalOverlay} onPress={() => setModalVisible(false)}>
//           <View style={styles.modalContent}>
//             <Text style={styles.modalTitle}>Select Sex</Text>
//             {['Male', 'Female'].map((opt) => (
//               <TouchableOpacity key={opt} style={styles.modalOption} onPress={() => { setSex(opt); setModalVisible(false); }}>
//                 <Text style={styles.optionText}>{opt}</Text>
//               </TouchableOpacity>
//             ))}
//           </View>
//         </Pressable>
//       </Modal>
//     </ScrollView>
//   );
// }

// const styles = StyleSheet.create({
//   container: { flex: 1, backgroundColor: "#F4F8FF" },
//   scrollContent: { padding: 24, paddingTop: 60 },
//   header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 },
//   backButton: { flexDirection: 'row', alignItems: 'center', padding: 8, marginLeft: -8 },
//   backText: { fontSize: 16, color: "#1E293B", marginLeft: 6, fontWeight: "600" },
//   headerTitle: { fontSize: 20, fontWeight: "700", color: "#1E293B" },
//   formGroup: { marginBottom: 20 },
//   label: { fontSize: 14, fontWeight: "700", color: "#1E293B", marginBottom: 8, marginLeft: 4 },
//   input: { backgroundColor: "#FFFFFF", borderRadius: 12, paddingVertical: 14, paddingHorizontal: 16, marginBottom: 16, fontSize: 15, color: "#1E293B", height: 50, justifyContent: 'center', shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
//   saveButton: { backgroundColor: "#1B93D5", borderRadius: 12, paddingVertical: 16, alignItems: "center", marginTop: 10, marginBottom: 40, shadowColor: "#1B93D5", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
//   saveButtonText: { color: "white", fontSize: 16, fontWeight: "700" },
//   modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
//   modalContent: { width: "80%", backgroundColor: "white", borderRadius: 16, padding: 20, elevation: 5 },
//   modalTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 16, textAlign: "center" },
//   modalOption: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
//   optionText: { fontSize: 16, textAlign: "center", color: "#1B93D5" },
//   iosDoneBtn: { alignSelf: 'flex-end', backgroundColor: '#1B93D5', padding: 8, borderRadius: 8, marginBottom: 10 }
// });


import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { API } from "../../constants/Api";

export default function SelectDoctor() {
  const { service, serviceName, serviceId, serviceIds, servicesJson, serviceDuration, servicePrice } = useLocalSearchParams();

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