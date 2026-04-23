import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '@clerk/clerk-expo';
import { API, fetchPatientByEmail } from '../../constants/Api';
import { useRouter } from 'expo-router';

export default function NotificationsScreen() {
  const { user } = useUser();
  const router = useRouter();
  const userEmail = user?.primaryEmailAddress?.emailAddress;
  const [patient, setPatient] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadNotifications = useCallback(async (patientId) => {
    try {
      const res = await fetch(`${API.notifications}/${patientId}`);
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const init = useCallback(async () => {
    if (!userEmail) return;
    setLoading(true);
    const patientData = await fetchPatientByEmail(userEmail);
    setPatient(patientData);
    if (patientData) {
      await loadNotifications(patientData.id);
    } else {
      setLoading(false);
    }
  }, [userEmail, loadNotifications]);

  useEffect(() => {
    init();
  }, [init]);

  const onRefresh = () => {
    setRefreshing(true);
    if (patient) {
      loadNotifications(patient.id);
    } else {
      init();
    }
  };

  const markAsRead = async (id) => {
    try {
      await fetch(`${API.notifications}/${id}/read`, { method: 'PATCH' });
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, is_read: 1 } : n)
      );
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!patient) return;
    try {
      await fetch(`${API.notifications}/read-all/${patient.id}`, { method: 'PATCH' });
      setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const renderItem = ({ item }) => {
    const iconName = item.type === 'rescheduled' ? 'calendar' : 
                     item.type === 'declined' ? 'close-circle' : 'notifications';
    const iconColor = item.type === 'rescheduled' ? '#1B93D5' : 
                      item.type === 'declined' ? '#EF4444' : '#64748B';

    return (
      <TouchableOpacity 
        style={[styles.notificationItem, !item.is_read && styles.unreadItem]}
        onPress={() => markAsRead(item.id)}
      >
        <View style={[styles.iconCircle, { backgroundColor: `${iconColor}15` }]}>
          <Ionicons name={iconName} size={24} color={iconColor} />
        </View>
        <View style={styles.textContainer}>
          <Text style={[styles.title, !item.is_read && styles.unreadTitle]}>{item.title}</Text>
          <Text style={styles.message}>{item.message}</Text>
          <Text style={styles.date}>{new Date(item.created_at).toLocaleString()}</Text>
        </View>
        {!item.is_read && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1B93D5" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        {notifications.some(n => !n.is_read) ? (
          <TouchableOpacity onPress={markAllAsRead}>
            <Text style={styles.readAllText}>Read All</Text>
          </TouchableOpacity>
        ) : <View style={{ width: 60 }} />}
      </View>

      <FlatList
        data={notifications}
        renderItem={renderItem}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#1B93D5"]} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="notifications-off-outline" size={64} color="#CBD5E1" />
            <Text style={styles.emptyText}>No notifications yet</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0'
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1E293B' },
  backButton: { padding: 4 },
  readAllText: { color: '#1B93D5', fontWeight: '600', fontSize: 14 },
  listContent: { padding: 16 },
  notificationItem: {
    flexDirection: 'row',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  unreadItem: {
    backgroundColor: '#F0F9FF',
    borderColor: '#BAE6FD',
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16
  },
  textContainer: { flex: 1 },
  title: { fontSize: 16, fontWeight: '600', color: '#334155', marginBottom: 4 },
  unreadTitle: { color: '#0F172A' },
  message: { fontSize: 14, color: '#64748B', lineHeight: 20, marginBottom: 4 },
  date: { fontSize: 12, color: '#94A3B8' },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#1B93D5',
    marginLeft: 8
  },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyState: { alignItems: 'center', marginTop: 100 },
  emptyText: { marginTop: 16, fontSize: 16, color: '#94A3B8', fontWeight: '500' }
});
