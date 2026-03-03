import { useCallback, useState, useMemo } from 'react';
import api from '../api/apiClient';
import useAppStore from '../store/useAppStore';

export default function useApi() {
  const setPatients = useAppStore((s) => s.setPatients);
  const setAppointments = useAppStore((s) => s.setAppointments);
  const setQueue = useAppStore((s) => s.setQueue);
  const setDentists = useAppStore((s) => s.setDentists);
  const setReports = useAppStore((s) => s.setReports);
  const updateDentistStore = useAppStore((s) => s.updateDentist);
  
  const addPatient = useAppStore((s) => s.addPatient);
  const updatePatientStore = useAppStore((s) => s.updatePatient);
  const addAppointment = useAppStore((s) => s.addAppointment);
  const updateAppointmentStore = useAppStore((s) => s.updateAppointment);
  const deleteAppointmentStore = useAppStore((s) => s.deleteAppointment);
  const addQueueItem = useAppStore((s) => s.addQueueItem);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadPatients = useCallback(async () => {
    setLoading(true);
    try {
      const list = await api.getPatients();
      const transformed = list.map((p) => {
        const birthdate = p.birthdate || p.birthday || null;
        let age = p.age || null;
        if (birthdate) {
          const b = new Date(birthdate);
          const now = new Date();
          age = now.getFullYear() - b.getFullYear();
          const m = now.getMonth() - b.getMonth();
          if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age -= 1;
        }
        return {
          ...p,
          age,
          name: p.full_name || p.name || "",
        };
      });
      setPatients(transformed);
      return transformed;
    } catch (err) { setError(err); }
    finally { setLoading(false); }
  }, [setPatients]);

  const loadAppointments = useCallback(async () => {
    setLoading(true);
    try {
      const list = await api.getAppointments();
      const transformedList = list.map(appt => {
        let timeStart = "";
        if (appt.appointment_datetime) {
            const apptDate = new Date(appt.appointment_datetime);
            timeStart = apptDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
        }
        return {
          ...appt,
          timeStart,
          patient: appt.full_name,
        };
      });
      setAppointments(transformedList);
      return transformedList;
    } catch (err) { setError(err); }
    finally { setLoading(false); }
  }, [setAppointments]);

  const loadQueue = useCallback(async () => {
    setLoading(true);
    try {
      const list = await api.getQueue();
      setQueue(list);
      return list;
    } catch (err) { setError(err); throw err; }
    finally { setLoading(false); }
  }, [setQueue]);

  const loadQueueHistory = useCallback(async () => {
    setLoading(true);
    try {
      const list = await api.getQueueHistory();
      return list || [];
    } catch (err) { setError(err); return []; }
    finally { setLoading(false); }
  }, []);

  const deleteQueue = useCallback(async (id) => {
    await api.deleteQueueItem(id);
    useAppStore.setState((state) => ({ 
      queue: state.queue.filter((q) => q.id !== id) 
    }));
  }, []);

  const getPatientById = useCallback(async (id) => await api.getPatientById(id), []);
  
  const createPatient = useCallback(async (payload) => {
    const created = await api.createPatient(payload);
    if (created?.id && addPatient) addPatient(created);
    return created;
  }, [addPatient]);
  
  const updatePatient = useCallback(async (id, updates) => {
    const updated = await api.updatePatient(id, updates);
    if (updated?.id && updatePatientStore) updatePatientStore(updated.id, updated);
    return updated;
  }, [updatePatientStore]);

  const createAppointment = useCallback(async (payload) => {
    const created = await api.createAppointment(payload);
    if (created?.id && addAppointment) {
        let timeStart = "";
        if (created.appointment_datetime) {
            const apptDate = new Date(created.appointment_datetime);
            timeStart = apptDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
        }
        addAppointment({ ...created, timeStart, patient: created.full_name });
    }
    return created;
  }, [addAppointment]);
  
  const updateAppointment = useCallback(async (id, updates) => {
    const updated = await api.updateAppointment(id, updates);
    if (updated?.id && updateAppointmentStore) updateAppointmentStore(updated);
    return updated;
  }, [updateAppointmentStore]);
  
  const removeAppointment = useCallback(async (id) => {
    await api.deleteAppointment(id);
    if (deleteAppointmentStore) deleteAppointmentStore(id);
    return id;
  }, [deleteAppointmentStore]);

  const addQueue = useCallback(async (payload) => {
    const created = await api.addQueueItem(payload);
    if (created?.id && addQueueItem) addQueueItem(created);
    return created;
  }, [addQueueItem]);

  return useMemo(() => ({
    loading,
    error,
    loadPatients,
    loadAppointments,
    loadQueue,
    loadQueueHistory,
    deleteQueue,
    loadDentists: async () => {
      const list = await api.getDentists();
      setDentists(list);
      return list; // FIXED: Added missing return so PatientForm gets the data
    },
    loadReports: async (date) => {
      const data = await api.getReports(date);
      setReports(data);
      return data;
    },
    updateDentist: async (id, updates) => {
      const updated = await api.updateDentist(id, updates);
      if (updated) updateDentistStore(updated);
      return updated;
    },
    getPatientById,
    createPatient,
    updatePatient,
    createAppointment,
    updateAppointment,
    removeAppointment,
    addQueue,
    getToothConditions: async (p, y) => api.getToothConditions(p, y),
    upsertToothCondition: async (p) => api.upsertToothCondition(p),
    getTreatmentTimeline: async (p, y) => api.getTreatmentTimeline(p, y),
    addTreatmentTimelineEntry: async (p) => api.addTreatmentTimelineEntry(p),
    deleteTreatmentTimelineEntry: async (id) => api.deleteTreatmentTimelineEntry(id),
    getMedications: async (p, y) => api.getMedications(p, y),
    addMedication: async (p) => api.addMedication(p),
    deleteMedication: async (id) => api.deleteMedication(id),
    getAnnualRecord: async (p, y) => api.getAnnualRecord(p, y),
    saveAnnualRecord: async (p) => api.saveAnnualRecord(p)
  }), [
    loading, error, loadPatients, loadAppointments, loadQueue, loadQueueHistory, 
    deleteQueue, setDentists, setReports, updateDentistStore, getPatientById, 
    createPatient, updatePatient, createAppointment, updateAppointment, 
    removeAppointment, addQueue
  ]);
}