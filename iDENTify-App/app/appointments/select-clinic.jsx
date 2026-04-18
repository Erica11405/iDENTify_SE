import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { fetchClinicDiscovery } from '../../constants/Api';

export default function SelectClinicScreen() {
  const router = useRouter();
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
          setError('Could not load clinics right now.');
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

  const totalBranches = useMemo(() => {
    return clinics.reduce((sum, clinic) => sum + (Array.isArray(clinic?.branches) ? clinic.branches.length : 0), 0);
  }, [clinics]);

  const handleSelectClinic = (clinic) => {
    router.push({
      pathname: '/appointments/select-branch',
      params: {
        clinicId: String(clinic.id),
        clinicName: String(clinic.name || ''),
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

        <Text style={styles.title}>Choose a Clinic</Text>
        <Text style={styles.subtitle}>Select your clinic before choosing a branch and service.</Text>
      </View>

      <View style={styles.summaryCard}>
        <View style={styles.summaryItem}>
          <Ionicons name="business-outline" size={20} color="#1B93D5" />
          <Text style={styles.summaryLabel}>Available Clinics</Text>
          <Text style={styles.summaryValue}>{clinics.length}</Text>
        </View>
        <View style={styles.summaryItem}>
          <Ionicons name="git-branch-outline" size={20} color="#1B93D5" />
          <Text style={styles.summaryLabel}>Total Branches</Text>
          <Text style={styles.summaryValue}>{totalBranches}</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color="#1B93D5" />
          <Text style={styles.stateText}>Loading clinics...</Text>
        </View>
      ) : null}

      {!loading && error ? (
        <View style={styles.centerState}>
          <Text style={[styles.stateText, { color: '#B91C1C' }]}>{error}</Text>
        </View>
      ) : null}

      {!loading && !error && clinics.length === 0 ? (
        <View style={styles.centerState}>
          <Text style={styles.stateText}>No clinics are available yet.</Text>
        </View>
      ) : null}

      {!loading && !error && clinics.length > 0 ? (
        <View style={styles.listContainer}>
          {clinics.map((clinic) => {
            const branchCount = Array.isArray(clinic?.branches) ? clinic.branches.length : 0;

            return (
              <TouchableOpacity
                key={clinic.id}
                style={styles.card}
                activeOpacity={0.8}
                onPress={() => handleSelectClinic(clinic)}
              >
                <View style={styles.avatarContainer}>
                  <Ionicons name="business" size={22} color="#1B93D5" />
                </View>

                <View style={styles.infoContainer}>
                  <Text style={styles.cardTitle}>{clinic.name}</Text>
                  <Text style={styles.cardSubtitle}>{branchCount} branch{branchCount === 1 ? '' : 'es'} available</Text>
                </View>

                <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
              </TouchableOpacity>
            );
          })}
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
  summaryCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
    textAlign: 'center',
  },
  summaryValue: {
    fontSize: 18,
    color: '#1E293B',
    fontWeight: '800',
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
});
