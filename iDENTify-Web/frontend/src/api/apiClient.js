// // const API_BASE = import.meta.env.VITE_API_BASE || "/api";

// // async function handleResponse(res) {
// //     if (!res.ok) {
// //         let body = null;
// //         try {
// //             const text = await res.text();
// //             try {
// //                 body = JSON.parse(text);
// //             } catch (e) {
// //                 body = { message: res.statusText || `Server Error (${res.status})` };
// //             }
// //         } catch (e) {
// //             body = null;
// //         }
// //         const message = body?.message || res.statusText || 'API Error';
// //         const error = new Error(message);
// //         error.status = res.status;
// //         error.body = body;
// //         throw error;
// //     }
// //     if (res.status === 204) return null;
// //     return res.json();
// // }

// // /* --- Auth Functions --- */
// // export const login = async (payload) => {
// //     const res = await fetch(`${API_BASE}/auth/login`, {
// //         method: 'POST',
// //         headers: { 'Content-Type': 'application/json' },
// //         body: JSON.stringify(payload),
// //     });
// //     return handleResponse(res);
// // };

// // export const signupDentist = async (payload) => {
// //     const res = await fetch(`${API_BASE}/auth/signup/dentist`, {
// //         method: 'POST',
// //         headers: { 'Content-Type': 'application/json' },
// //         body: JSON.stringify(payload),
// //     });
// //     return handleResponse(res);
// // };

// // /* --- Dentist/Staff Functions --- */
// // export const getDentists = async () => {
// //     const res = await fetch(`${API_BASE}/dentists`);
// //     return handleResponse(res);
// // };

// // export const createDentist = async (payload) => {
// //     const res = await fetch(`${API_BASE}/dentists`, {
// //         method: 'POST',
// //         headers: { 'Content-Type': 'application/json' },
// //         body: JSON.stringify(payload),
// //     });
// //     return handleResponse(res);
// // };

// // export const updateDentist = async (id, payload) => {
// //     const res = await fetch(`${API_BASE}/dentists/${id}`, {
// //         method: 'PUT',
// //         headers: { 'Content-Type': 'application/json' },
// //         body: JSON.stringify(payload),
// //     });
// //     return handleResponse(res);
// // };

// // export const deleteDentist = async (id) => {
// //     const res = await fetch(`${API_BASE}/dentists/${id}`, {
// //         method: 'DELETE'
// //     });
// //     return handleResponse(res);
// // };

// // /* --- Patient Functions --- */
// // export const getPatients = async () => {
// //     const res = await fetch(`${API_BASE}/patients/`);
// //     return handleResponse(res);
// // };

// // export const createPatient = async (patientData) => {
// //     const res = await fetch(`${API_BASE}/patients/`, {
// //         method: 'POST',
// //         headers: { 'Content-Type': 'application/json' },
// //         body: JSON.stringify(patientData),
// //     });
// //     return handleResponse(res);
// // };

// // export const searchPatients = async (query) => {
// //     // Changed /patients/search?q= to /patients?search=
// //     const res = await fetch(`${API_BASE}/patients?search=${encodeURIComponent(query)}`);
// //     return handleResponse(res);
// // };
// // /* --- Queue & Appointment Functions --- */
// // export const getQueue = async () => {
// //     const res = await fetch(`${API_BASE}/queue`);
// //     return handleResponse(res);
// // };

// // export const getAppointments = async () => {
// //     const res = await fetch(`${API_BASE}/appointments`);
// //     return handleResponse(res);
// // };

// // export const checkAppointmentLimit = async (dentist_id, date) => {
// //     const res = await fetch(`${API_BASE}/appointments/check-limit?dentist_id=${dentist_id}&date=${date}`);
// //     return handleResponse(res);
// // };

// // export const createAppointment = async (payload) => {
// //     const res = await fetch(`${API_BASE}/appointments`, {
// //         method: 'POST',
// //         headers: { 'Content-Type': 'application/json' },
// //         body: JSON.stringify(payload),
// //     });
// //     return handleResponse(res);
// // };

// // export const updateAppointment = async (id, payload) => {
// //     const res = await fetch(`${API_BASE}/appointments/${id}`, {
// //         method: 'PUT',
// //         headers: { 'Content-Type': 'application/json' },
// //         body: JSON.stringify(payload),
// //     });
// //     return handleResponse(res);
// // };

// // export const deleteAppointment = async (id) => {
// //     const res = await fetch(`${API_BASE}/appointments/${id}`, {
// //         method: 'DELETE'
// //     });
// //     return handleResponse(res);
// // };

// // /* --- Reports Functions --- */
// // export const getReports = async () => {
// //     const res = await fetch(`${API_BASE}/reports`);
// //     return handleResponse(res);
// // };

// // // Bundle all functions into a single api object for exporting
// // const api = {
// //     login,
// //     signupDentist,
// //     getDentists,
// //     createDentist,
// //     updateDentist,
// //     deleteDentist,
// //     getPatients,
// //     createPatient,
// //     searchPatients,
// //     getQueue,
// //     getAppointments,
// //     checkAppointmentLimit,
// //     createAppointment,
// //     updateAppointment,
// //     deleteAppointment,
// //     getReports // <-- Added here!
// // };

// // export default api;






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
//         const message = body?.message || res.statusText || 'Incorrect Email or Password';
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
//     const res = await fetch(`${API_BASE}/dentists/${id}`, {
//         method: 'DELETE'
//     });
//     return handleResponse(res);
// };

// /* --- Patient Functions --- */
// export const getPatients = async () => {
//     const res = await fetch(`${API_BASE}/patients/`);
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

// export const searchPatients = async (query) => {
//     const res = await fetch(`${API_BASE}/patients?search=${encodeURIComponent(query)}`);
//     return handleResponse(res);
// };

// /* --- Queue & Appointment Functions --- */
// export const getQueue = async (history = false) => {
//     const url = history ? `${API_BASE}/queue?history=true` : `${API_BASE}/queue`;
//     const res = await fetch(url);
//     return handleResponse(res);
// };

// // ADDED: Missing Queue Functions
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
//     const res = await fetch(`${API_BASE}/queue/${id}`, {
//         method: 'DELETE'
//     });
//     return handleResponse(res);
// };

// export const getQueueHistory = async () => {
//     const res = await fetch(`${API_BASE}/queue?history=true`);
//     return handleResponse(res);
// };

// export const getAppointments = async () => {
//     const res = await fetch(`${API_BASE}/appointments`);
//     return handleResponse(res);
// };

// export const checkAppointmentLimit = async (dentist_id, date) => {
//     const res = await fetch(`${API_BASE}/appointments/check-limit?dentist_id=${dentist_id}&date=${date}`);
//     return handleResponse(res);
// };

// export const createAppointment = async (payload) => {
//     const res = await fetch(`${API_BASE}/appointments`, {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify(payload),
//     });
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

// export const deleteAppointment = async (id) => {
//     const res = await fetch(`${API_BASE}/appointments/${id}`, {
//         method: 'DELETE'
//     });
//     return handleResponse(res);
// };

// /* --- Reports Functions --- */
// export const getReports = async () => {
//     const res = await fetch(`${API_BASE}/reports`);
//     return handleResponse(res);
// };

// // Bundle all functions into a single api object for exporting
// const api = {
//     login,
//     signupDentist,
//     getDentists,
//     createDentist,
//     updateDentist,
//     deleteDentist,
//     getPatients,
//     createPatient,
//     searchPatients,
//     getQueue,
//     addQueueItem,       
//     updateQueueItem,     
//     deleteQueueItem,     
//     getQueueHistory,     
//     getAppointments,
//     checkAppointmentLimit,
//     createAppointment,
//     updateAppointment,
//     deleteAppointment,
//     getReports
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
    const res = await fetch(`${API_BASE}/dentists/${id}`, {
        method: 'DELETE'
    });
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

export const getQueueHistory = async () => {
    const res = await fetch(`${API_BASE}/queue/history`);
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

export const checkAppointmentLimit = async (dentist_id, date) => {
    const res = await fetch(`${API_BASE}/appointments/check-limit?dentist_id=${dentist_id}&date=${date}`);
    return handleResponse(res);
};

export const createAppointment = async (payload) => {
    const res = await fetch(`${API_BASE}/appointments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
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

export const deleteAppointment = async (id) => {
    const res = await fetch(`${API_BASE}/appointments/${id}`, {
        method: 'DELETE'
    });
    return handleResponse(res);
};

/* --- Reports Functions --- */
export const getReports = async (date) => {
    const url = date ? `${API_BASE}/reports?date=${date}` : `${API_BASE}/reports`;
    const res = await fetch(url);
    return handleResponse(res);
};

/* --- CHARTING & CLINICAL RECORDS FUNCTIONS --- */

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

export const deleteTreatmentTimelineEntry = async (id) => {
    const res = await fetch(`${API_BASE}/treatment-timeline/${id}`, { method: 'DELETE' });
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

export const deleteMedication = async (id) => {
    const res = await fetch(`${API_BASE}/medications/${id}`, { method: 'DELETE' });
    return handleResponse(res);
};

// Bundle all functions into a single api object for exporting
const api = {
    login,
    signupDentist,
    getDentists,
    createDentist,
    updateDentist,
    deleteDentist,
    getPatients,
    getPatientById,
    createPatient,
    updatePatient,
    searchPatients,
    getQueue,
    getQueueHistory,
    addQueueItem,
    updateQueueItem,
    deleteQueueItem,
    getAppointments,
    checkAppointmentLimit,
    createAppointment,
    updateAppointment,
    deleteAppointment,
    getReports,
    getAnnualRecord,
    saveAnnualRecord,
    getToothConditions,
    upsertToothCondition,
    getTreatmentTimeline,
    addTreatmentTimelineEntry,
    deleteTreatmentTimelineEntry,
    getMedications,
    addMedication,
    deleteMedication
};

export default api;