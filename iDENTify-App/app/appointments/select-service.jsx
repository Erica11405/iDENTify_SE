// import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView } from "react-native";
// import { Ionicons } from "@expo/vector-icons";
// import { useLocalSearchParams, useRouter } from "expo-router";
// import { useEffect, useState } from "react";
// import { API } from "../../constants/Api";

// export default function SelectDoctor() {
//   const { service } = useLocalSearchParams();
//   const router = useRouter();
//   const [doctors, setDoctors] = useState([]);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     const fetchDoctors = async () => {
//       try {
//         const res = await fetch(API.dentists);
//         const data = await res.json();
//         setDoctors(data);
//       } catch (error) {
//         console.error("Error fetching doctors", error);
//       } finally {
//         setLoading(false);
//       }
//     };
//     fetchDoctors();
//   }, []);

//   return (
//     <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
//       <View style={styles.header}>
//         <Text style={styles.title}>Choose a Specialist</Text>
//         <Text style={styles.subtitle}>for {service || "Appointment"}</Text>
//       </View>

//       {loading ? (
//         <View style={styles.loadingContainer}>
//           <ActivityIndicator size="large" color="#1B93D5" />
//         </View>
//       ) : (
//         <View style={styles.listContainer}>
//           {doctors.map((doc) => (
//             <TouchableOpacity
//               key={doc.id}
//               style={styles.card}
//               activeOpacity={0.7}
//               onPress={() =>
//                 router.push(
//                   `/appointments/select-datetime?doctor=${doc.name}&docId=${doc.id}&service=${service}`
//                 )
//               }
//             >
//               <View style={styles.avatarContainer}>
//                 <Ionicons name="person" size={24} color="#1B93D5" />
//               </View>
              
//               <View style={styles.infoContainer}>
//                 <Text style={styles.cardTitle}>{doc.name}</Text>
//                 <Text style={styles.cardSubtitle}>{doc.specialty || "General Dentist"}</Text>
//               </View>
              
//               <View style={styles.arrowContainer}>
//                 <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
//               </View>
//             </TouchableOpacity>
//           ))}
//         </View>
//       )}
//     </ScrollView>
//   );
// }

// const styles = StyleSheet.create({
//   container: { 
//     flex: 1, 
//     backgroundColor: "#F8FAFC" 
//   },
//   contentContainer: {
//     padding: 24,
//     paddingTop: 40,
//   },
//   header: {
//     marginBottom: 32,
//   },
//   title: { 
//     fontSize: 28, 
//     fontWeight: "800", 
//     color: "#1E293B",
//     marginBottom: 4,
//     letterSpacing: -0.5,
//   },
//   subtitle: { 
//     fontSize: 16, 
//     color: "#64748B", 
//     fontWeight: "500" 
//   },
//   loadingContainer: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//     marginTop: 40,
//   },
//   listContainer: {
//     gap: 16,
//   },
//   card: {
//     flexDirection: "row",
//     alignItems: "center",
//     backgroundColor: "white",
//     padding: 20,
//     borderRadius: 20,
//     shadowColor: "#64748B",
//     shadowOffset: { width: 0, height: 4 },
//     shadowOpacity: 0.05,
//     shadowRadius: 10,
//     elevation: 3,
//     borderWidth: 1,
//     borderColor: "#F1F5F9",
//   },
//   avatarContainer: {
//     width: 56,
//     height: 56,
//     borderRadius: 20,
//     backgroundColor: "#F0F9FF",
//     justifyContent: "center",
//     alignItems: "center",
//     marginRight: 16,
//   },
//   infoContainer: {
//     flex: 1,
//   },
//   cardTitle: { 
//     fontSize: 16, 
//     fontWeight: "700", 
//     color: "#1E293B",
//     marginBottom: 4,
//   },
//   cardSubtitle: { 
//     fontSize: 13, 
//     color: "#64748B",
//     fontWeight: "500", 
//   },
//   arrowContainer: {
//     paddingLeft: 8,
//   },
// });

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
// Import your central API config (Make sure it points to http://<YOUR_IP_ADDRESS>:5000/api)
import { API_BASE } from '../../constants/Api'; 

export default function SelectServiceScreen() {
  const router = useRouter();
  
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDynamicServices = async () => {
      try {
        const response = await fetch(`${API_BASE}/services`);
        if (!response.ok) throw new Error("Failed to fetch services");
        
        const data = await response.json();
        setServices(data);
      } catch (err) {
        console.error(err);
        setError("Could not load clinic services. Please check your connection.");
      } finally {
        setLoading(false);
      }
    };

    fetchDynamicServices();
  }, []);

  const handleSelectService = (service) => {
    // Pass the selected service name and price back to your booking flow
    router.push({
      pathname: "/appointments/select-doctor",
      params: { 
          serviceName: service.name,
          servicePrice: `₱${service.min_price} - ₱${service.max_price}` 
      }
    });
  };

  if (loading) {
    return (
        <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#1B93D5" />
            <Text style={{ marginTop: 10, color: '#666' }}>Loading services...</Text>
        </View>
    );
  }

  if (error) {
    return (
        <View style={styles.centerContainer}>
            <Text style={{ color: 'red', textAlign: 'center', padding: 20 }}>{error}</Text>
        </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>What service do you need?</Text>
      
      <FlatList
        data={services}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={{ paddingBottom: 20 }}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={styles.serviceCard} 
            onPress={() => handleSelectService(item)}
          >
            <View style={styles.serviceInfo}>
              <Text style={styles.serviceName}>{item.name}</Text>
              <Text style={styles.servicePrice}>
                 Estimated: ₱{item.min_price} - ₱{item.max_price}
              </Text>
            </View>
            <View style={styles.arrowIcon}>
                <Text style={{ color: '#1B93D5', fontSize: 18 }}>→</Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F8FF',
    padding: 20,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F4F8FF',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1B1D29',
    marginBottom: 20,
    marginTop: 10,
  },
  serviceCard: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 12,
    marginBottom: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  servicePrice: {
    fontSize: 14,
    color: '#666',
  },
  arrowIcon: {
    justifyContent: 'center',
    alignItems: 'center',
  }
});