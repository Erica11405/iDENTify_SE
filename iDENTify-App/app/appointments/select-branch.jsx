import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { fetchClinicDiscovery } from '../../constants/Api';

export default function SelectBranchScreen() {
  const router = useRouter();
  const { clinicId, clinicName } = useLocalSearchParams();

  const [clinics, setClinics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const loadClinics = async () => {
      setLoading(true);
      setError('');

      try {
        const rows = await fetchClinicDiscovery();
        if (!cancelled) {
          setClinics(Array.isArray(rows) ? rows : []);
        }
      } catch (_err) {
        if (!cancelled) {
          setError('Could not load clinic branches right now.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadClinics();

    return () => {
      cancelled = true;
    };
  }, []);

  const selectedClinic = useMemo(() => {
    if (clinics.length === 0) return null;

    const matchById = clinics.find((item) => String(item.id) === String(clinicId));
    if (matchById) return matchById;

    const matchByName = clinics.find((item) => String(item.name || '').trim() === String(clinicName || '').trim());
    if (matchByName) return matchByName;

    return clinics[0];
  }, [clinics, clinicId, clinicName]);

  const branches = useMemo(() => {
    if (!selectedClinic || !Array.isArray(selectedClinic.branches)) return [];
    return selectedClinic.branches;
  }, [selectedClinic]);

  const handleSelectBranch = (branch) => {
    if (!selectedClinic) return;

    router.push({
      pathname: '/appointments/select-service',
      params: {
        clinicId: String(selectedClinic.id),
        clinicName: String(selectedClinic.name || ''),
        branchId: String(branch.id),
        branchName: String(branch.name || ''),
      },
    });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1E293B" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Choose a Branch</Text>
        <Text style={styles.subtitle}>{selectedClinic?.name || 'Select where you want to visit.'}</Text>
      </View>

      {selectedClinic ? (
        <View style={styles.locationCard}>
          <Ionicons name="business-outline" size={18} color="#0369A1" />
          <View style={{ marginLeft: 10, flex: 1 }}>
            <Text style={styles.locationLabel}>Selected Clinic</Text>
            <Text style={styles.locationValue}>{selectedClinic.name}</Text>
          </View>
        </View>
      ) : null}

      {loading ? (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color="#1B93D5" />
          <Text style={styles.stateText}>Loading branches...</Text>
        </View>
      ) : null}

      {!loading && error ? (
        <View style={styles.centerState}>
          <Text style={[styles.stateText, { color: '#B91C1C' }]}>{error}</Text>
        </View>
      ) : null}

      {!loading && !error && !selectedClinic ? (
        <View style={styles.centerState}>
          <Text style={styles.stateText}>No clinic selected. Please choose a clinic first.</Text>
          <TouchableOpacity style={styles.primaryButton} onPress={() => router.replace('/appointments/select-clinic')}>
            <Text style={styles.primaryButtonText}>Go to Clinics</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {!loading && !error && selectedClinic && branches.length === 0 ? (
        <View style={styles.centerState}>
          <Text style={styles.stateText}>This clinic has no active branches yet.</Text>
        </View>
      ) : null}

      {!loading && !error && selectedClinic && branches.length > 0 ? (
        <View style={styles.listContainer}>
          {branches.map((branch) => (
            <TouchableOpacity
              key={branch.id}
              style={styles.card}
              activeOpacity={0.8}
              onPress={() => handleSelectBranch(branch)}
            >
              <View style={styles.avatarContainer}>
                <Ionicons name="location-outline" size={22} color="#1B93D5" />
              </View>

              <View style={styles.infoContainer}>
                <Text style={styles.cardTitle}>{branch.name}</Text>
                <Text style={styles.cardSubtitle}>Continue to service selection</Text>
              </View>

              <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
            </TouchableOpacity>
          ))}
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  contentContainer: {
    padding: 24,
    paddingTop: 40,
    paddingBottom: 30,
  },
  header: {
    marginBottom: 20,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginBottom: 16,
    paddingRight: 10,
    marginLeft: -4,
  },
  backText: {
    fontSize: 16,
    color: '#1E293B',
    marginLeft: 6,
    fontWeight: '600',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: '#64748B',
  },
  locationCard: {
    marginTop: -6,
    marginBottom: 14,
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
  centerState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  stateText: {
    marginTop: 10,
    color: '#64748B',
    fontSize: 14,
    textAlign: 'center',
  },
  listContainer: {
    gap: 14,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 18,
    borderRadius: 16,
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  avatarContainer: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#F0F9FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  infoContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 3,
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  primaryButton: {
    marginTop: 16,
    backgroundColor: '#1B93D5',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  primaryButtonText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 14,
  },
});
