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
//     const res = await fetch(`${API_BASE}/patients/search?q=${encodeURIComponent(query)}`);
//     return handleResponse(res);
// };

// /* --- Queue & Appointment Functions --- */
// export const getQueue = async () => {
//     const res = await fetch(`${API_BASE}/queue`);
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
//     getAppointments,
//     checkAppointmentLimit,
//     createAppointment,
//     updateAppointment,
//     deleteAppointment
// };

// export default api;


// Ensure VITE_API_BASE is exactly "/api" in your DigitalOcean environment settings
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

export const createPatient = async (patientData) => {
    const res = await fetch(`${API_BASE}/patients/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patientData),
    });
    return handleResponse(res);
};

export const searchPatients = async (query) => {
    const res = await fetch(`${API_BASE}/patients/search?q=${encodeURIComponent(query)}`);
    return handleResponse(res);
};

/* --- Queue & Appointment Functions --- */
export const getQueue = async () => {
    const res = await fetch(`${API_BASE}/queue`);
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
export const getReports = async () => {
    const res = await fetch(`${API_BASE}/reports`);
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
    createPatient,
    searchPatients,
    getQueue,
    getAppointments,
    checkAppointmentLimit,
    createAppointment,
    updateAppointment,
    deleteAppointment,
    getReports // <-- Added here!
};

export default api;