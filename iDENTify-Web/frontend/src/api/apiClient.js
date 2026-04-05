// const API_BASE = import.meta.env.VITE_API_BASE || "/api";

// async function handleResponse(res) {
//     if (!res.ok) {
//         let body = null;
//         try {
//             const text = await res.text();
//             try {
//                 body = JSON.parse(text);
//             } catch (e) {
//                 body = { message: res.statusText || `Server Error (${res.status})` };
//             }
//         } catch (e) {
//             body = null;
//         }
//         const message = body?.message || res.statusText || 'API Error';
//         const error = new Error(message);
//         error.status = res.status;
//         error.body = body;
//         throw error;
//     }
//     if (res.status === 204) return null;
//     return res.json();
// }

// /* --- Auth Functions --- */
// export const login = async (payload) => {
//     const res = await fetch(`${API_BASE}/auth/login`, {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify(payload),
//     });
//     return handleResponse(res);
// };

// export const signupDentist = async (payload) => {
//     const res = await fetch(`${API_BASE}/auth/signup/dentist`, {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify(payload),
//     });
//     return handleResponse(res);
// };

// /* --- Dentist/Staff Functions --- */
// export const getDentists = async () => {
//     const res = await fetch(`${API_BASE}/dentists`);
//     return handleResponse(res);
// };

// export const createDentist = async (payload) => {
//     const res = await fetch(`${API_BASE}/dentists`, {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify(payload),
//     });
//     return handleResponse(res);
// };

// export const updateDentist = async (id, payload) => {
//     const res = await fetch(`${API_BASE}/dentists/${id}`, {
//         method: 'PUT',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify(payload),
//     });
//     return handleResponse(res);
// };

// export const deleteDentist = async (id) => {
//     const res = await fetch(`${API_BASE}/dentists/${id}`, { method: 'DELETE' });
//     return handleResponse(res);
// };

// /* --- Patient Functions --- */
// export const getPatients = async () => {
//     const res = await fetch(`${API_BASE}/patients/`);
//     return handleResponse(res);
// };

// export const getPatientById = async (id) => {
//     const res = await fetch(`${API_BASE}/patients/${id}`);
//     return handleResponse(res);
// };

// export const createPatient = async (patientData) => {
//     const res = await fetch(`${API_BASE}/patients/`, {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify(patientData),
//     });
//     return handleResponse(res);
// };

// export const updatePatient = async (id, patientData) => {
//     const res = await fetch(`${API_BASE}/patients/${id}`, {
//         method: 'PUT',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify(patientData),
//     });
//     return handleResponse(res);
// };

// export const searchPatients = async (query) => {
//     const res = await fetch(`${API_BASE}/patients?search=${encodeURIComponent(query)}`);
//     return handleResponse(res);
// };

// /* --- Queue & Appointment Functions --- */
// export const getQueue = async (isHistory = false) => {
//     const url = isHistory ? `${API_BASE}/queue?history=true` : `${API_BASE}/queue`;
//     const res = await fetch(url);
//     return handleResponse(res);
// };

// export const addQueueItem = async (payload) => {
//     const res = await fetch(`${API_BASE}/queue`, {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify(payload),
//     });
//     return handleResponse(res);
// };

// export const updateQueueItem = async (id, payload) => {
//     const res = await fetch(`${API_BASE}/queue/${id}`, {
//         method: 'PUT',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify(payload),
//     });
//     return handleResponse(res);
// };

// export const deleteQueueItem = async (id) => {
//     const res = await fetch(`${API_BASE}/queue/${id}`, { method: 'DELETE' });
//     return handleResponse(res);
// };

// export const getAppointments = async () => {
//     const res = await fetch(`${API_BASE}/appointments`);
//     return handleResponse(res);
// };

// export const updateAppointment = async (id, payload) => {
//     const res = await fetch(`${API_BASE}/appointments/${id}`, {
//         method: 'PUT',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify(payload),
//     });
//     return handleResponse(res);
// };

// /* --- Reports Functions --- */
// export const getReports = async (date) => {
//     const url = date ? `${API_BASE}/reports?date=${date}` : `${API_BASE}/reports`;
//     const res = await fetch(url);
//     return handleResponse(res);
// };

// export const getDentistPatientsForReport = async (dentistId, date) => {
//     const res = await fetch(`${API_BASE}/reports/dentist/${dentistId}/patients?date=${date}`);
//     return handleResponse(res);
// };

// /* --- Dynamic Services Functions --- */
// export const getServices = async () => {
//     const res = await fetch(`${API_BASE}/services`);
//     return handleResponse(res);
// };

// export const createService = async (payload) => {
//     const res = await fetch(`${API_BASE}/services`, {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify(payload),
//     });
//     return handleResponse(res);
// };

// export const updateService = async (id, payload) => {
//     const res = await fetch(`${API_BASE}/services/${id}`, {
//         method: 'PUT',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify(payload),
//     });
//     return handleResponse(res);
// };

// export const deleteService = async (id) => {
//     const res = await fetch(`${API_BASE}/services/${id}`, { method: 'DELETE' });
//     return handleResponse(res);
// };

// /* --- Clinic Medications Master List --- */
// export const getClinicMedications = async () => {
//     const res = await fetch(`${API_BASE}/clinic-medications`);
//     return handleResponse(res);
// };

// export const createClinicMedication = async (payload) => {
//     const res = await fetch(`${API_BASE}/clinic-medications`, {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify(payload),
//     });
//     return handleResponse(res);
// };

// export const updateClinicMedication = async (id, payload) => {
//     const res = await fetch(`${API_BASE}/clinic-medications/${id}`, {
//         method: 'PUT',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify(payload),
//     });
//     return handleResponse(res);
// };

// export const deleteClinicMedication = async (id) => {
//     const res = await fetch(`${API_BASE}/clinic-medications/${id}`, { method: 'DELETE' });
//     return handleResponse(res);
// };

// /* --- Clinical Records (Charting) --- */
// export const getAnnualRecord = async (patientId, year) => {
//     const res = await fetch(`${API_BASE}/annual-records/${patientId}/${year}`);
//     return handleResponse(res);
// };

// export const saveAnnualRecord = async (payload) => {
//     const res = await fetch(`${API_BASE}/annual-records`, {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify(payload),
//     });
//     return handleResponse(res);
// };

// export const getToothConditions = async (patientId, year) => {
//     const res = await fetch(`${API_BASE}/tooth-conditions/${patientId}?record_year=${year}`);
//     return handleResponse(res);
// };

// export const upsertToothCondition = async (payload) => {
//     const res = await fetch(`${API_BASE}/tooth-conditions`, {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify(payload),
//     });
//     return handleResponse(res);
// };

// export const getTreatmentTimeline = async (patientId, year) => {
//     const res = await fetch(`${API_BASE}/treatment-timeline/${patientId}?record_year=${year}`);
//     return handleResponse(res);
// };

// export const addTreatmentTimelineEntry = async (payload) => {
//     const res = await fetch(`${API_BASE}/treatment-timeline`, {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify(payload),
//     });
//     return handleResponse(res);
// };

// export const getMedications = async (patientId, year) => {
//     const res = await fetch(`${API_BASE}/medications/${patientId}?record_year=${year}`);
//     return handleResponse(res);
// };

// export const addMedication = async (payload) => {
//     const res = await fetch(`${API_BASE}/medications`, {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify(payload),
//     });
//     return handleResponse(res);
// };

// export const get = async (url) => {
//     const res = await fetch(`${API_BASE}${url}`);
//     return handleResponse(res);
// };

// const api = {
//     login, signupDentist, getDentists, createDentist, updateDentist, deleteDentist,
//     getPatients, getPatientById, createPatient, updatePatient, searchPatients,
//     getQueue, addQueueItem, updateQueueItem, deleteQueueItem,
//     getAppointments, updateAppointment,
//     getReports, getDentistPatientsForReport, get,
//     getServices, createService, updateService, deleteService,
//     getClinicMedications, createClinicMedication, updateClinicMedication, deleteClinicMedication,
//     getAnnualRecord, saveAnnualRecord, getToothConditions, upsertToothCondition,
//     getTreatmentTimeline, addTreatmentTimelineEntry, getMedications, addMedication
// };

// export default api;

const API_BASE = import.meta.env.VITE_API_BASE || "/api";

async function handleResponse(res) {
    if (!res.ok) {
        let body = null;
        try {
            const text = await res.text();
            try {
                body = JSON.parse(text);
            } catch (e) {
                body = { message: res.statusText || `Server Error (${res.status})` };
            }
        } catch (e) {
            body = null;
        }
        const message = body?.message || res.statusText || 'API Error';
        const error = new Error(message);
        error.status = res.status;
        error.body = body;
        throw error;
    }
    if (res.status === 204) return null;
    return res.json();
}

/* --- Auth Functions --- */
export const login = async (payload) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    return handleResponse(res);
};

export const verifyOtp = async (payload) => {
    const res = await fetch(`${API_BASE}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    return handleResponse(res);
};

export const signupDentist = async (payload) => {
    const res = await fetch(`${API_BASE}/auth/signup/dentist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    return handleResponse(res);
};

/* --- Dentist/Staff Functions --- */
export const getDentists = async () => {
    const res = await fetch(`${API_BASE}/dentists`);
    return handleResponse(res);
};

export const createDentist = async (payload) => {
    const res = await fetch(`${API_BASE}/dentists`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    return handleResponse(res);
};

export const updateDentist = async (id, payload) => {
    const res = await fetch(`${API_BASE}/dentists/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    return handleResponse(res);
};

export const deleteDentist = async (id) => {
    const res = await fetch(`${API_BASE}/dentists/${id}`, { method: 'DELETE' });
    return handleResponse(res);
};

/* --- Patient Functions --- */
export const getPatients = async () => {
    const res = await fetch(`${API_BASE}/patients/`);
    return handleResponse(res);
};

export const getPatientById = async (id) => {
    const res = await fetch(`${API_BASE}/patients/${id}`);
    return handleResponse(res);
};

export const createPatient = async (patientData) => {
    const res = await fetch(`${API_BASE}/patients/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patientData),
    });
    return handleResponse(res);
};

export const updatePatient = async (id, patientData) => {
    const res = await fetch(`${API_BASE}/patients/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patientData),
    });
    return handleResponse(res);
};

export const searchPatients = async (query) => {
    const res = await fetch(`${API_BASE}/patients?search=${encodeURIComponent(query)}`);
    return handleResponse(res);
};

/* --- Queue & Appointment Functions --- */
export const getQueue = async (isHistory = false) => {
    const url = isHistory ? `${API_BASE}/queue?history=true` : `${API_BASE}/queue`;
    const res = await fetch(url);
    return handleResponse(res);
};

export const addQueueItem = async (payload) => {
    const res = await fetch(`${API_BASE}/queue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    return handleResponse(res);
};

export const updateQueueItem = async (id, payload) => {
    const res = await fetch(`${API_BASE}/queue/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    return handleResponse(res);
};

export const deleteQueueItem = async (id) => {
    const res = await fetch(`${API_BASE}/queue/${id}`, { method: 'DELETE' });
    return handleResponse(res);
};

export const getAppointments = async () => {
    const res = await fetch(`${API_BASE}/appointments`);
    return handleResponse(res);
};

export const updateAppointment = async (id, payload) => {
    const res = await fetch(`${API_BASE}/appointments/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    return handleResponse(res);
};

/* --- Reports Functions --- */
export const getReports = async (date) => {
    const url = date ? `${API_BASE}/reports?date=${date}` : `${API_BASE}/reports`;
    const res = await fetch(url);
    return handleResponse(res);
};

export const getDentistPatientsForReport = async (dentistId, date) => {
    const res = await fetch(`${API_BASE}/reports/dentist/${dentistId}/patients?date=${date}`);
    return handleResponse(res);
};

/* --- Dynamic Services Functions --- */
export const getServices = async () => {
    const res = await fetch(`${API_BASE}/services`);
    return handleResponse(res);
};

export const createService = async (payload) => {
    const res = await fetch(`${API_BASE}/services`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    return handleResponse(res);
};

export const updateService = async (id, payload) => {
    const res = await fetch(`${API_BASE}/services/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    return handleResponse(res);
};

export const deleteService = async (id) => {
    const res = await fetch(`${API_BASE}/services/${id}`, { method: 'DELETE' });
    return handleResponse(res);
};

/* --- Clinic Medications Master List --- */
export const getClinicMedications = async () => {
    const res = await fetch(`${API_BASE}/clinic-medications`);
    return handleResponse(res);
};

export const createClinicMedication = async (payload) => {
    const res = await fetch(`${API_BASE}/clinic-medications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    return handleResponse(res);
};

export const updateClinicMedication = async (id, payload) => {
    const res = await fetch(`${API_BASE}/clinic-medications/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    return handleResponse(res);
};

export const deleteClinicMedication = async (id) => {
    const res = await fetch(`${API_BASE}/clinic-medications/${id}`, { method: 'DELETE' });
    return handleResponse(res);
};

/* --- Clinical Records (Charting) --- */
export const getAnnualRecord = async (patientId, year) => {
    const res = await fetch(`${API_BASE}/annual-records/${patientId}/${year}`);
    return handleResponse(res);
};

export const saveAnnualRecord = async (payload) => {
    const res = await fetch(`${API_BASE}/annual-records`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    return handleResponse(res);
};

export const getToothConditions = async (patientId, year) => {
    const res = await fetch(`${API_BASE}/tooth-conditions/${patientId}?record_year=${year}`);
    return handleResponse(res);
};

export const upsertToothCondition = async (payload) => {
    const res = await fetch(`${API_BASE}/tooth-conditions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    return handleResponse(res);
};

export const getTreatmentTimeline = async (patientId, year) => {
    const res = await fetch(`${API_BASE}/treatment-timeline/${patientId}?record_year=${year}`);
    return handleResponse(res);
};

export const addTreatmentTimelineEntry = async (payload) => {
    const res = await fetch(`${API_BASE}/treatment-timeline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    return handleResponse(res);
};

export const getMedications = async (patientId, year) => {
    const res = await fetch(`${API_BASE}/medications/${patientId}?record_year=${year}`);
    return handleResponse(res);
};

export const addMedication = async (payload) => {
    const res = await fetch(`${API_BASE}/medications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    return handleResponse(res);
};

export const get = async (url) => {
    const res = await fetch(`${API_BASE}${url}`);
    return handleResponse(res);
};

const api = {
    login, verifyOtp, signupDentist, getDentists, createDentist, updateDentist, deleteDentist,
    getPatients, getPatientById, createPatient, updatePatient, searchPatients,
    getQueue, addQueueItem, updateQueueItem, deleteQueueItem,
    getAppointments, updateAppointment,
    getReports, getDentistPatientsForReport, get,
    getServices, createService, updateService, deleteService,
    getClinicMedications, createClinicMedication, updateClinicMedication, deleteClinicMedication,
    getAnnualRecord, saveAnnualRecord, getToothConditions, upsertToothCondition,
    getTreatmentTimeline, addTreatmentTimelineEntry, getMedications, addMedication
};

export default api;