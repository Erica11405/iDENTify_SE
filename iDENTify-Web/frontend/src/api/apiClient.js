const API_BASE = import.meta.env.DEV
    ? "/api"
    : (import.meta.env.VITE_API_BASE || "/api");

function getStoredUserContext() {
    try {
        const raw = localStorage.getItem('identify-auth-storage');
        if (!raw) return null;

        const parsed = JSON.parse(raw);
        const stateUser = parsed?.state?.user;
        if (!stateUser || typeof stateUser !== 'object') return null;
        return stateUser;
    } catch {
        return null;
    }
}

function actorHeaders() {
    const user = getStoredUserContext();
    if (!user) return {};

    const headers = {};
    if (user.role) headers['x-user-role'] = String(user.role);
    if (user.id) headers['x-user-id'] = String(user.id);
    if (user.dentist_id) headers['x-user-dentist-id'] = String(user.dentist_id);
    return headers;
}

function jsonHeaders(extra = {}) {
    return {
        'Content-Type': 'application/json',
        ...actorHeaders(),
        ...extra,
    };
}

function assertSuperadminEndpointAvailable(res) {
    if (res.status !== 404) return;

    const error = new Error("Super admin signup is not available on this API yet. Deploy the latest backend, then try again.");
    error.status = 404;
    throw error;
}

async function handleResponse(res) {
    if (!res.ok) {
        let body = null;
        try {
            const text = await res.text();
            try {
                body = JSON.parse(text);
            } catch {
                body = { message: res.statusText || `Server Error (${res.status})` };
            }
        } catch {
            body = null;
        }
        const message = body?.message || body?.error || res.statusText || 'API Error';
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

export const changePassword = async (payload) => {
    const res = await fetch(`${API_BASE}/auth/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    return handleResponse(res);
};

export const sendSuperadminSignupOtp = async (payload) => {
    const res = await fetch(`${API_BASE}/auth/signup/superadmin/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });

    assertSuperadminEndpointAvailable(res);
    return handleResponse(res);
};

export const signupSuperadmin = async (payload) => {
    const res = await fetch(`${API_BASE}/auth/signup/superadmin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });

    assertSuperadminEndpointAvailable(res);
    return handleResponse(res);
};

export const getMySuperadminRequest = async () => {
    const res = await fetch(`${API_BASE}/superadmin-requests/me`, {
        headers: { ...actorHeaders() },
    });
    return handleResponse(res);
};

export const submitSuperadminRequest = async (payload) => {
    const res = await fetch(`${API_BASE}/superadmin-requests/me/submit`, {
        method: 'POST',
        headers: jsonHeaders(),
        body: JSON.stringify(payload),
    });
    return handleResponse(res);
};

export const getSuperadminRequestsForReview = async ({ status = 'pending_review' } = {}) => {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    const query = params.toString();

    const res = await fetch(`${API_BASE}/superadmin-requests/review${query ? `?${query}` : ''}`, {
        headers: { ...actorHeaders() },
    });
    return handleResponse(res);
};

export const getSuperadminRequestDetail = async (requestId) => {
    const res = await fetch(`${API_BASE}/superadmin-requests/review/${requestId}`, {
        headers: { ...actorHeaders() },
    });
    return handleResponse(res);
};

export const approveSuperadminRequest = async (requestId, payload = {}) => {
    const res = await fetch(`${API_BASE}/superadmin-requests/review/${requestId}/approve`, {
        method: 'PATCH',
        headers: jsonHeaders(),
        body: JSON.stringify(payload),
    });
    return handleResponse(res);
};

export const declineSuperadminRequest = async (requestId, payload) => {
    const res = await fetch(`${API_BASE}/superadmin-requests/review/${requestId}/decline`, {
        method: 'PATCH',
        headers: jsonHeaders(),
        body: JSON.stringify(payload),
    });
    return handleResponse(res);
};

export const sendSignupOtp = async (payload) => {
    const res = await fetch(`${API_BASE}/auth/signup/dentist/send-otp`, {
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

export const getAdminUsers = async ({ role = 'all', archived = 'false' } = {}) => {
    const params = new URLSearchParams();
    if (role) params.set('role', role);
    if (archived) params.set('archived', archived);

    const res = await fetch(`${API_BASE}/admin/users?${params.toString()}`, {
        headers: { ...actorHeaders() },
    });
    return handleResponse(res);
};

export const archiveAdminUser = async (id) => {
    const res = await fetch(`${API_BASE}/admin/users/${id}/archive`, {
        method: 'PATCH',
        headers: jsonHeaders(),
    });
    return handleResponse(res);
};

export const restoreAdminUser = async (id) => {
    const res = await fetch(`${API_BASE}/admin/users/${id}/restore`, {
        method: 'PATCH',
        headers: jsonHeaders(),
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
        headers: jsonHeaders(),
        body: JSON.stringify(payload),
    });
    return handleResponse(res);
};

export const updateDentist = async (id, payload) => {
    const res = await fetch(`${API_BASE}/dentists/${id}`, {
        method: 'PUT',
        headers: jsonHeaders(),
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
    const res = await fetch(url, {
        headers: { ...actorHeaders() },
    });
    return handleResponse(res);
};

export const addQueueItem = async (payload) => {
    const res = await fetch(`${API_BASE}/queue`, {
        method: 'POST',
        headers: jsonHeaders(),
        body: JSON.stringify(payload),
    });
    return handleResponse(res);
};

export const updateQueueItem = async (id, payload) => {
    const res = await fetch(`${API_BASE}/queue/${id}`, {
        method: 'PUT',
        headers: jsonHeaders(),
        body: JSON.stringify(payload),
    });
    return handleResponse(res);
};

export const deleteQueueItem = async (id) => {
    const res = await fetch(`${API_BASE}/queue/${id}`, {
        method: 'DELETE',
        headers: { ...actorHeaders() },
    });
    return handleResponse(res);
};

export const getAppointments = async () => {
    const res = await fetch(`${API_BASE}/appointments`, {
        headers: { ...actorHeaders() },
    });
    return handleResponse(res);
};

export const createAppointment = async (payload) => {
    const res = await fetch(`${API_BASE}/appointments`, {
        method: 'POST',
        headers: jsonHeaders(),
        body: JSON.stringify(payload),
    });
    return handleResponse(res);
};

export const checkAppointmentLimit = async (dentistId, date) => {
    const params = new URLSearchParams({
        dentist_id: String(dentistId || ''),
        date: String(date || ''),
    });

    const res = await fetch(`${API_BASE}/appointments/check-limit?${params.toString()}`, {
        headers: { ...actorHeaders() },
    });
    return handleResponse(res);
};

export const updateAppointment = async (id, payload) => {
    const res = await fetch(`${API_BASE}/appointments/${id}`, {
        method: 'PUT',
        headers: jsonHeaders(),
        body: JSON.stringify(payload),
    });
    return handleResponse(res);
};

export const approveAppointment = async (id, payload = {}) => {
    const res = await fetch(`${API_BASE}/appointments/${id}/approve`, {
        method: 'PATCH',
        headers: jsonHeaders(),
        body: JSON.stringify(payload),
    });
    return handleResponse(res);
};

export const declineAppointment = async (id, payload) => {
    const res = await fetch(`${API_BASE}/appointments/${id}/decline`, {
        method: 'PATCH',
        headers: jsonHeaders(),
        body: JSON.stringify(payload),
    });
    return handleResponse(res);
};

export const getAppointmentServiceItems = async (id) => {
    const res = await fetch(`${API_BASE}/appointments/${id}/service-items`, {
        headers: { ...actorHeaders() },
    });
    return handleResponse(res);
};

export const updateAppointmentServiceItems = async (id, payload) => {
    const res = await fetch(`${API_BASE}/appointments/${id}/service-items`, {
        method: 'PUT',
        headers: jsonHeaders(),
        body: JSON.stringify(payload),
    });
    return handleResponse(res);
};

/* --- Payments Functions --- */
export const getPayments = async ({ startDate, endDate, search } = {}) => {
    const params = new URLSearchParams();
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    if (search) params.set('search', search);

    const query = params.toString();
    const res = await fetch(`${API_BASE}/payments${query ? `?${query}` : ''}`, {
        headers: { ...actorHeaders() },
    });
    return handleResponse(res);
};

export const getPaymentById = async (id) => {
    const res = await fetch(`${API_BASE}/payments/${id}`, {
        headers: { ...actorHeaders() },
    });
    return handleResponse(res);
};

export const getPaymentByQueueId = async (queueId) => {
    const res = await fetch(`${API_BASE}/payments/by-queue/${queueId}`, {
        headers: { ...actorHeaders() },
    });
    return handleResponse(res);
};

export const getUnpaidPaymentMatches = async ({ patient_id, services }) => {
    const res = await fetch(`${API_BASE}/payments/unpaid-matches`, {
        method: 'POST',
        headers: jsonHeaders(),
        body: JSON.stringify({ patient_id, services }),
    });
    return handleResponse(res);
};

export const createPaymentRecord = async (payload) => {
    const res = await fetch(`${API_BASE}/payments`, {
        method: 'POST',
        headers: jsonHeaders(),
        body: JSON.stringify(payload),
    });
    return handleResponse(res);
};

export const updatePaymentRecord = async (id, payload) => {
    const res = await fetch(`${API_BASE}/payments/${id}`, {
        method: 'PUT',
        headers: jsonHeaders(),
        body: JSON.stringify(payload),
    });
    return handleResponse(res);
};

export const addPaymentInstallment = async (id, payload) => {
    const res = await fetch(`${API_BASE}/payments/${id}/installments`, {
        method: 'POST',
        headers: jsonHeaders(),
        body: JSON.stringify(payload),
    });
    return handleResponse(res);
};

/* --- Reports Functions --- */
export const getReports = async (dateOrOptions) => {
    const params = new URLSearchParams();

    if (typeof dateOrOptions === 'string') {
        if (dateOrOptions) params.set('date', dateOrOptions);
    } else if (dateOrOptions && typeof dateOrOptions === 'object') {
        const { startDate, endDate, date } = dateOrOptions;
        if (startDate) params.set('startDate', startDate);
        if (endDate) params.set('endDate', endDate);
        if (date) params.set('date', date);
    }

    const query = params.toString();
    const res = await fetch(`${API_BASE}/reports${query ? `?${query}` : ''}`, {
        headers: { ...actorHeaders() },
    });
    return handleResponse(res);
};

export const getServicePopularityReport = async ({ startDate, endDate, date, dentistId } = {}) => {
    const params = new URLSearchParams();
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    if (date) params.set('date', date);
    if (dentistId) params.set('dentistId', String(dentistId));
    const query = params.toString();

    const res = await fetch(`${API_BASE}/reports/services/popularity${query ? `?${query}` : ''}`, {
        headers: { ...actorHeaders() },
    });
    return handleResponse(res);
};

export const getDentistPatientsForReport = async (dentistId, { startDate, endDate, date } = {}) => {
    const params = new URLSearchParams();
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    if (date) params.set('date', date);
    const query = params.toString();

    const res = await fetch(`${API_BASE}/reports/dentist/${dentistId}/patients${query ? `?${query}` : ''}`, {
        headers: { ...actorHeaders() },
    });
    return handleResponse(res);
};

export const getDentistReportSummary = async (dentistId, { startDate, endDate } = {}) => {
    const params = new URLSearchParams();
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    const query = params.toString();

    const res = await fetch(`${API_BASE}/reports/dentist/${dentistId}/summary${query ? `?${query}` : ''}`, {
        headers: { ...actorHeaders() },
    });
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

/* --- Dentist Types Master List --- */
export const getDentistTypes = async () => {
    const res = await fetch(`${API_BASE}/dentist-types`);
    return handleResponse(res);
};

/* --- Clinics & Branches --- */
export const getClinics = async ({ includeInactive = false } = {}) => {
    const params = new URLSearchParams();
    if (includeInactive) params.set('includeInactive', 'true');
    const query = params.toString();

    const res = await fetch(`${API_BASE}/clinics${query ? `?${query}` : ''}`);
    return handleResponse(res);
};

export const getClinicSummary = async () => {
    const res = await fetch(`${API_BASE}/clinics/summary`, {
        headers: { ...actorHeaders() },
    });
    return handleResponse(res);
};

export const createClinic = async (payload) => {
    const res = await fetch(`${API_BASE}/clinics`, {
        method: 'POST',
        headers: jsonHeaders(),
        body: JSON.stringify(payload),
    });
    return handleResponse(res);
};

export const getClinicBranches = async (clinicId, { includeInactive = false } = {}) => {
    const params = new URLSearchParams();
    if (includeInactive) params.set('includeInactive', 'true');
    const query = params.toString();

    const res = await fetch(`${API_BASE}/clinics/${clinicId}/branches${query ? `?${query}` : ''}`);
    return handleResponse(res);
};

export const createClinicBranch = async (clinicId, payload) => {
    const res = await fetch(`${API_BASE}/clinics/${clinicId}/branches`, {
        method: 'POST',
        headers: jsonHeaders(),
        body: JSON.stringify(payload),
    });
    return handleResponse(res);
};

export const updateClinicStatus = async (clinicId, payload) => {
    const res = await fetch(`${API_BASE}/clinics/${clinicId}/status`, {
        method: 'PATCH',
        headers: jsonHeaders(),
        body: JSON.stringify(payload),
    });
    return handleResponse(res);
};

export const archiveClinic = async (clinicId) => {
    const res = await fetch(`${API_BASE}/clinics/${clinicId}/archive`, {
        method: 'PATCH',
        headers: jsonHeaders(),
    });
    return handleResponse(res);
};

export const restoreClinic = async (clinicId) => {
    const res = await fetch(`${API_BASE}/clinics/${clinicId}/restore`, {
        method: 'PATCH',
        headers: jsonHeaders(),
    });
    return handleResponse(res);
};

export const updateClinicBranchStatus = async (clinicId, branchId, payload) => {
    const res = await fetch(`${API_BASE}/clinics/${clinicId}/branches/${branchId}/status`, {
        method: 'PATCH',
        headers: jsonHeaders(),
        body: JSON.stringify(payload),
    });
    return handleResponse(res);
};

export const archiveClinicBranch = async (clinicId, branchId) => {
    const res = await fetch(`${API_BASE}/clinics/${clinicId}/branches/${branchId}/archive`, {
        method: 'PATCH',
        headers: jsonHeaders(),
    });
    return handleResponse(res);
};

export const restoreClinicBranch = async (clinicId, branchId) => {
    const res = await fetch(`${API_BASE}/clinics/${clinicId}/branches/${branchId}/restore`, {
        method: 'PATCH',
        headers: jsonHeaders(),
    });
    return handleResponse(res);
};

export const getClinicDiscovery = async () => {
    const res = await fetch(`${API_BASE}/clinics/discover`);
    return handleResponse(res);
};

export const createDentistType = async (payload) => {
    const res = await fetch(`${API_BASE}/dentist-types`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    return handleResponse(res);
};

export const updateDentistType = async (id, payload) => {
    const res = await fetch(`${API_BASE}/dentist-types/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    return handleResponse(res);
};

export const deleteDentistType = async (id) => {
    const res = await fetch(`${API_BASE}/dentist-types/${id}`, { method: 'DELETE' });
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
    const res = await fetch(`${API_BASE}/treatment-timeline/${patientId}?year=${year}`);
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
    const res = await fetch(`${API_BASE}/medications/${patientId}?year=${year}`);
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

export const getPatientReports = async () => {
    const res = await fetch(`${API_BASE}/patient-reports`, { headers: actorHeaders() });
    return handleResponse(res);
};

export const updatePatientReportStatus = async (id, status) => {
    const res = await fetch(`${API_BASE}/patient-reports/${id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...actorHeaders() },
        body: JSON.stringify({ status })
    });
    return handleResponse(res);
};

export const suspendDentist = async (dentistId, suspend) => {
    const res = await fetch(`${API_BASE}/patient-reports/dentist-suspend/${dentistId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...actorHeaders() },
        body: JSON.stringify({ suspend })
    });
    return handleResponse(res);
};

export const get = async (url) => {
    const res = await fetch(`${API_BASE}${url}`, {
        headers: { ...actorHeaders() },
    });
    return handleResponse(res);
};

const api = {
    login, verifyOtp, changePassword, sendSuperadminSignupOtp, signupSuperadmin, sendSignupOtp, signupDentist,
    getMySuperadminRequest, submitSuperadminRequest,
    getSuperadminRequestsForReview, getSuperadminRequestDetail, approveSuperadminRequest, declineSuperadminRequest,
    getAdminUsers, archiveAdminUser, restoreAdminUser,
    getDentists, createDentist, updateDentist, deleteDentist,
    getPatients, getPatientById, createPatient, updatePatient, searchPatients,
    getQueue, addQueueItem, updateQueueItem, deleteQueueItem,
    getAppointments, createAppointment, checkAppointmentLimit, updateAppointment, approveAppointment, declineAppointment,
    getAppointmentServiceItems, updateAppointmentServiceItems,
    getPayments, getPaymentById, getPaymentByQueueId, getUnpaidPaymentMatches, createPaymentRecord, updatePaymentRecord, addPaymentInstallment,
    getReports, getServicePopularityReport, getDentistPatientsForReport, getDentistReportSummary, get,
    getServices, createService, updateService, deleteService,
    getClinicMedications, createClinicMedication, updateClinicMedication, deleteClinicMedication,
    getDentistTypes, createDentistType, updateDentistType, deleteDentistType,
    getClinics, getClinicSummary, createClinic, getClinicBranches, createClinicBranch,
    updateClinicStatus, archiveClinic, restoreClinic,
    updateClinicBranchStatus, archiveClinicBranch, restoreClinicBranch,
    getClinicDiscovery,
    getAnnualRecord, saveAnnualRecord, getToothConditions, upsertToothCondition,
    getTreatmentTimeline, addTreatmentTimelineEntry, getMedications, addMedication, deleteMedication,
    getPatientReports, updatePatientReportStatus, suspendDentist
};

export default api;