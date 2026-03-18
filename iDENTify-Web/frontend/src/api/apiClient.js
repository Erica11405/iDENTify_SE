// const API_BASE = import.meta.env.VITE_API_BASE;

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

// // Also export as default object for compatibility with other files
// export default {
//     login,
//     signupDentist,
//     getPatients,
//     createPatient,
//     getDentists,
//     createDentist
// };

const API_BASE = import.meta.env.VITE_API_BASE;

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

/* --- Queue Functions --- */
export const getQueue = async () => {
    const res = await fetch(`${API_BASE}/queue`);
    return handleResponse(res);
};

export const getAppointments = async () => {
    const res = await fetch(`${API_BASE}/appointments`);
    return handleResponse(res);
};

// Also export as default object for compatibility with other files
export default {
    login,
    signupDentist,
    getPatients,
    createPatient,
    getDentists,
    createDentist,
    getQueue,
    getAppointments
};