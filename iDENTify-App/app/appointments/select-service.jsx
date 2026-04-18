import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { API } from '../../constants/Api'; 
import { Ionicons } from '@expo/vector-icons';

function formatEstimatedDuration(value) {
  const minutes = Number.parseInt(String(value || ''), 10);
  if (!Number.isFinite(minutes) || minutes <= 0) return 'Estimated Time: 30 mins';

  if (minutes % 60 === 0) {
    const hours = minutes / 60;
    return `Estimated Time: ${hours} hr${hours > 1 ? 's' : ''}`;
  }

  if (minutes > 60) {
    const hours = Math.floor(minutes / 60);
    const remaining = minutes % 60;
    return `Estimated Time: ${hours} hr${hours > 1 ? 's' : ''} ${remaining} mins`;
  }

  return `Estimated Time: ${minutes} mins`;
}

function toDurationMinutes(value) {
  const parsed = Number.parseInt(String(value || ''), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return 30;
  return parsed;
}

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatPriceRange(min, max) {
  if (min !== null && max !== null) {
    return `Estimated: P${min} - P${max}`;
  }

  if (min !== null) {
    return `Estimated: P${min}`;
  }

  if (max !== null) {
    return `Estimated: P${max}`;
  }

  return 'Estimated: Price on request';
}

export default function SelectServiceScreen() {
  const router = useRouter();
  const { clinicId, clinicName, branchId, branchName } = useLocalSearchParams();
  
  const [services, setServices] = useState([]);
  const [selectedServices, setSelectedServices] = useState([]);
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

  const selectedCount = selectedServices.length;

  const totalDurationMinutes = useMemo(() => {
    if (selectedServices.length === 0) return 0;
    return selectedServices.reduce((total, item) => total + toDurationMinutes(item.estimated_duration), 0);
  }, [selectedServices]);

  const combinedPriceText = useMemo(() => {
    if (selectedServices.length === 0) return '';

    let minTotal = 0;
    let maxTotal = 0;
    let hasMin = false;
    let hasMax = false;

    for (const item of selectedServices) {
      const min = toNumber(item.min_price);
      const max = toNumber(item.max_price);

      if (min !== null) {
        minTotal += min;
        hasMin = true;
      }

      if (max !== null) {
        maxTotal += max;
        hasMax = true;
      }
    }

    return formatPriceRange(hasMin ? minTotal : null, hasMax ? maxTotal : null);
  }, [selectedServices]);

  const toggleService = (service) => {
    setSelectedServices((prev) => {
      const exists = prev.some((item) => String(item.id) === String(service.id));
      if (exists) {
        return prev.filter((item) => String(item.id) !== String(service.id));
      }
      return [...prev, service];
    });
  };

  const handleNext = () => {
    if (selectedServices.length === 0) return;

    const normalizedServices = selectedServices.map((item) => ({
      id: item.id,
      name: String(item.name || '').trim(),
      estimated_duration: toDurationMinutes(item.estimated_duration),
      min_price: item.min_price,
      max_price: item.max_price,
    }));

    const selectedNames = normalizedServices.map((item) => item.name).filter(Boolean);
    const joinedNames = selectedNames.join(', ');
    const selectedIds = normalizedServices
      .map((item) => (item.id === undefined || item.id === null ? '' : String(item.id)))
      .filter(Boolean)
      .join(',');

    router.push({
      pathname: "/appointments/select-doctor",
      params: {
        service: joinedNames,
        serviceName: joinedNames,
        serviceId: selectedIds ? selectedIds.split(',')[0] : '',
        serviceIds: selectedIds,
        servicesJson: JSON.stringify(normalizedServices),
        serviceDuration: String(totalDurationMinutes || 30),
        servicePrice: combinedPriceText,
        clinicId: String(clinicId || ''),
        clinicName: String(clinicName || ''),
        branchId: String(branchId || ''),
        branchName: String(branchName || ''),
      },
    });
  };

  const locationLabel = useMemo(() => {
    const clinic = String(clinicName || '').trim();
    const branch = String(branchName || '').trim();
    if (clinic && branch) return `${clinic} / ${branch}`;
    if (clinic) return clinic;
    return '';
  }, [clinicName, branchName]);

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
    <View style={styles.mainContainer}>
      <FlatList
        data={services}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.contentContainer}
        ListHeaderComponent={
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#1E293B" />
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>
            <Text style={styles.title}>Book Appointment</Text>
            <Text style={styles.subtitle}>Select one or more services</Text>

            {locationLabel ? (
              <View style={styles.locationCard}>
                <Ionicons name="business-outline" size={18} color="#0369A1" />
                <View style={{ marginLeft: 10, flex: 1 }}>
                  <Text style={styles.locationLabel}>Booking Location</Text>
                  <Text style={styles.locationValue}>{locationLabel}</Text>
                </View>
              </View>
            ) : null}
          </View>
        }
        renderItem={({ item }) => {
          const isSelected = selectedServices.some((selected) => String(selected.id) === String(item.id));
          return (
            <TouchableOpacity
              style={[styles.serviceCard, isSelected && styles.serviceCardSelected]}
              activeOpacity={0.8}
              onPress={() => toggleService(item)}
            >
              <View style={styles.serviceInfo}>
                <Text style={[styles.serviceName, isSelected && styles.serviceNameSelected]}>{item.name}</Text>
                <Text style={[styles.servicePrice, isSelected && styles.serviceMetaSelected]}>
                  {formatPriceRange(toNumber(item.min_price), toNumber(item.max_price))}
                </Text>
                <Text style={[styles.serviceDuration, isSelected && styles.serviceMetaSelected]}>
                  {formatEstimatedDuration(item.estimated_duration)}
                </Text>
              </View>

              <View style={styles.checkWrap}>
                <Ionicons
                  name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
                  size={24}
                  color={isSelected ? '#1B93D5' : '#94A3B8'}
                />
              </View>
            </TouchableOpacity>
          );
        }}
      />

      {selectedCount > 0 && (
        <View style={styles.fabContainer}>
          <TouchableOpacity style={styles.fabButton} onPress={handleNext} activeOpacity={0.8}>
            <View>
              <Text style={styles.fabText}>Next ({selectedCount})</Text>
              <Text style={styles.fabSubtext}>Total duration: {totalDurationMinutes} mins</Text>
            </View>
            <Ionicons name="arrow-forward" size={20} color="white" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#F4F8FF',
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 110,
  },
  header: {
    marginBottom: 14,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginBottom: 14,
    paddingRight: 10,
    marginLeft: -4,
  },
  backText: {
    fontSize: 16,
    color: '#1E293B',
    marginLeft: 6,
    fontWeight: '600',
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
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    color: '#64748B',
    marginBottom: 8,
  },
  locationCard: {
    marginTop: 8,
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationLabel: {
    fontSize: 11,
    color: '#0C4A6E',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  locationValue: {
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '700',
    marginTop: 2,
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
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  serviceCardSelected: {
    borderColor: '#1B93D5',
    backgroundColor: '#F0F9FF',
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  serviceNameSelected: {
    color: '#0C4A6E',
  },
  servicePrice: {
    fontSize: 14,
    color: '#666',
  },
  serviceDuration: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 3,
  },
  serviceMetaSelected: {
    color: '#0E7490',
  },
  checkWrap: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  fabContainer: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 22,
  },
  fabButton: {
    backgroundColor: '#1B93D5',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#1B93D5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  fabText: {
    color: 'white',
    fontSize: 17,
    fontWeight: '700',
  },
  fabSubtext: {
    color: '#DBEAFE',
    fontSize: 12,
    marginTop: 2,
  },
});