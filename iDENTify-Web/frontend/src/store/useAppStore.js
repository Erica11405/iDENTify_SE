// import { create } from 'zustand';

// const useAppStore = create((set, get) => ({
//   patients: [],
//   appointments: [],
//   queue: [],
//   dentists: [],
//   treatments: [],
//   reports: {},

//   addPatient: (patient) => set((state) => ({ patients: [...state.patients, patient] })),
//   updatePatient: (patientId, updates) => set((state) => ({
//     patients: state.patients.map((p) => (p.id === patientId ? { ...p, ...updates } : p)),
//   })),

//   addQueueItem: (item) => set((state) => {
//     const already = state.queue.some((q) => q.appointment_id && item.appointment_id && q.appointment_id === item.appointment_id);
//     if (already) return state;
//     return { queue: [...state.queue, item] };
//   }),

//   updateAppointmentStatus: (appointmentId, status) => set((state) => ({
//     appointments: state.appointments.map((appt) => appt.id === appointmentId ? { ...appt, status } : appt),
//   })),

//   updateAppointment: (updatedAppointment) => set((state) => ({
//     appointments: state.appointments.map((a) => (a.id === updatedAppointment.id ? updatedAppointment : a)),
//   })),

//   addAppointment: (appointment) => set((state) => ({ appointments: [...state.appointments, appointment] })),

//   deleteAppointment: (appointmentId) => set((state) => ({
//     appointments: state.appointments.filter((a) => a.id !== appointmentId),
//   })),

//   addTreatment: (treatment) => set((state) => ({
//     treatments: [...state.treatments, { ...treatment, id: Date.now() + Math.random() }],
//   })),
  
//   updateQueueStatus: (queueId, status) => set((state) => ({
//     queue: state.queue.map((item) => item.id === queueId ? { ...item, status } : item),
//   })),

//   updateDentist: (updatedDentist) => set((state) => ({
//     dentists: state.dentists.map((d) => (d.id === updatedDentist.id ? updatedDentist : d)),
//   })),

//   // NEW: Remove dentist from state
//   removeDentist: (id) => set((state) => ({
//     dentists: state.dentists.filter((d) => d.id !== id),
//   })),

//   setPatients: (patients) => set({ patients }),
//   setAppointments: (appointments) => set({ appointments }),
//   setQueue: (queue) => set({ queue }),
//   setDentists: (dentists) => set({ dentists }),
//   setTreatments: (treatments) => set({ treatments }),
//   setReports: (reports) => set({ reports }),


//   // Add this inside your useAppStore.js
//   resetStore: () => set({
//     patients: [],
//     appointments: [],
//     queue: [],
//     dentists: [],
//     treatments: [],
//     reports: {}
//   }),
// }));

// export default useAppStore;


import { create } from 'zustand';

const useAppStore = create((set, get) => ({
  // Authentication State
  user: null, // Stores the logged-in user object
  
  // Data State
  patients: [],
  appointments: [],
  queue: [],
  dentists: [],
  treatments: [],
  reports: {},

  // Auth Actions
  setUser: (user) => set({ user }), // Sets the user data upon successful login

  // Patient Actions
  addPatient: (patient) => set((state) => ({ patients: [...state.patients, patient] })),
  updatePatient: (patientId, updates) => set((state) => ({
    patients: state.patients.map((p) => (p.id === patientId ? { ...p, ...updates } : p)),
  })),

  // Queue Actions
  addQueueItem: (item) => set((state) => {
    const already = state.queue.some((q) => q.appointment_id && item.appointment_id && q.appointment_id === item.appointment_id);
    if (already) return state;
    return { queue: [...state.queue, item] };
  }),

  updateQueueStatus: (queueId, status) => set((state) => ({
    queue: state.queue.map((item) => item.id === queueId ? { ...item, status } : item),
  })),

  // Appointment Actions
  updateAppointmentStatus: (appointmentId, status) => set((state) => ({
    appointments: state.appointments.map((appt) => appt.id === appointmentId ? { ...appt, status } : appt),
  })),

  updateAppointment: (updatedAppointment) => set((state) => ({
    appointments: state.appointments.map((a) => (a.id === updatedAppointment.id ? updatedAppointment : a)),
  })),

  addAppointment: (appointment) => set((state) => ({ appointments: [...state.appointments, appointment] })),

  deleteAppointment: (appointmentId) => set((state) => ({
    appointments: state.appointments.filter((a) => a.id !== appointmentId),
  })),

  // Dentist Actions
  updateDentist: (updatedDentist) => set((state) => ({
    dentists: state.dentists.map((d) => (d.id === updatedDentist.id ? updatedDentist : d)),
  })),

  removeDentist: (id) => set((state) => ({
    dentists: state.dentists.filter((d) => d.id !== id),
  })),

  // Treatment Actions
  addTreatment: (treatment) => set((state) => ({
    treatments: [...state.treatments, { ...treatment, id: Date.now() + Math.random() }],
  })),

  // Bulk Setters
  setPatients: (patients) => set({ patients }),
  setAppointments: (appointments) => set({ appointments }),
  setQueue: (queue) => set({ queue }),
  setDentists: (dentists) => set({ dentists }),
  setTreatments: (treatments) => set({ treatments }),
  setReports: (reports) => set({ reports }),

  // Reset Store (Logout)
  resetStore: () => set({
    user: null, // Clear user on reset
    patients: [],
    appointments: [],
    queue: [],
    dentists: [],
    treatments: [],
    reports: {}
  }),
}));

export default useAppStore;