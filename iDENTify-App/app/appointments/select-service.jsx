// import React, { useState, useEffect } from 'react';
// import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
// import { useRouter } from 'expo-router';
// // Import your central API config (Make sure it points to http://<YOUR_IP_ADDRESS>:5000/api)
// import { API_BASE } from '../../constants/Api'; 

// export default function SelectServiceScreen() {
//   const router = useRouter();
  
//   const [services, setServices] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);

//   useEffect(() => {
//     const fetchDynamicServices = async () => {
//       try {
//         const response = await fetch(`${API_BASE}/services`);
//         if (!response.ok) throw new Error("Failed to fetch services");
        
//         const data = await response.json();
//         setServices(data);
//       } catch (err) {
//         console.error(err);
//         setError("Could not load clinic services. Please check your connection.");
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchDynamicServices();
//   }, []);

//   const handleSelectService = (service) => {
//     // Pass the selected service name and price back to your booking flow
//     router.push({
//       pathname: "/appointments/select-doctor",
//       params: { 
//           serviceName: service.name,
//           servicePrice: `₱${service.min_price} - ₱${service.max_price}` 
//       }
//     });
//   };

//   if (loading) {
//     return (
//         <View style={styles.centerContainer}>
//             <ActivityIndicator size="large" color="#1B93D5" />
//             <Text style={{ marginTop: 10, color: '#666' }}>Loading services...</Text>
//         </View>
//     );
//   }

//   if (error) {
//     return (
//         <View style={styles.centerContainer}>
//             <Text style={{ color: 'red', textAlign: 'center', padding: 20 }}>{error}</Text>
//         </View>
//     );
//   }

//   return (
//     <View style={styles.container}>
//       <Text style={styles.title}>What service do you need?</Text>
      
//       <FlatList
//         data={services}
//         keyExtractor={(item) => item.id.toString()}
//         contentContainerStyle={{ paddingBottom: 20 }}
//         renderItem={({ item }) => (
//           <TouchableOpacity 
//             style={styles.serviceCard} 
//             onPress={() => handleSelectService(item)}
//           >
//             <View style={styles.serviceInfo}>
//               <Text style={styles.serviceName}>{item.name}</Text>
//               <Text style={styles.servicePrice}>
//                  Estimated: ₱{item.min_price} - ₱{item.max_price}
//               </Text>
//             </View>
//             <View style={styles.arrowIcon}>
//                 <Text style={{ color: '#1B93D5', fontSize: 18 }}>→</Text>
//             </View>
//           </TouchableOpacity>
//         )}
//       />
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: '#F4F8FF',
//     padding: 20,
//   },
//   centerContainer: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//     backgroundColor: '#F4F8FF',
//   },
//   title: {
//     fontSize: 22,
//     fontWeight: '700',
//     color: '#1B1D29',
//     marginBottom: 20,
//     marginTop: 10,
//   },
//   serviceCard: {
//     backgroundColor: '#FFFFFF',
//     padding: 20,
//     borderRadius: 12,
//     marginBottom: 15,
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     shadowColor: '#000',
//     shadowOpacity: 0.05,
//     shadowRadius: 10,
//     shadowOffset: { width: 0, height: 4 },
//     elevation: 2,
//   },
//   serviceName: {
//     fontSize: 16,
//     fontWeight: '600',
//     color: '#333',
//     marginBottom: 5,
//   },
//   servicePrice: {
//     fontSize: 14,
//     color: '#666',
//   },
//   arrowIcon: {
//     justifyContent: 'center',
//     alignItems: 'center',
//   }
// });


import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { API } from '../../constants/Api'; 

export default function SelectServiceScreen() {
  const router = useRouter();
  
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDynamicServices = async () => {
      try {
        const response = await fetch(API.services);
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