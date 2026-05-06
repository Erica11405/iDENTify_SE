// const API_BASE_URL = "https://identify-app-hth8t.ondigitalocean.app"; 

// export const API = {
//   patients: `${API_BASE_URL}/api/patients`,
//   appointments: `${API_BASE_URL}/api/appointments`,
//   queue: `${API_BASE_URL}/api/queue`,
//   records: `${API_BASE_URL}/api/treatment-timeline`, 
//   dentists: `${API_BASE_URL}/api/dentists`,
//   medications: `${API_BASE_URL}/api/medications`,
// };

// export const fetchPatientByEmail = async (email) => {
//   try {
//     const response = await fetch(`${API.patients}?email=${email}`);
//     const data = await response.json();
//     return data.length > 0 ? data[0] : null;
//   } catch (error) {
//     console.error("Error fetching patient by email:", error);
//     return null;
//   }
// };


const API_BASE_URL = "https://identify-app-hth8t.ondigitalocean.app"; 

console.log("[API] Using Base URL:", API_BASE_URL);

export const API = {
  patients: `${API_BASE_URL}/api/patients`,
  appointments: `${API_BASE_URL}/api/appointments`,
  queue: `${API_BASE_URL}/api/queue`,
  records: `${API_BASE_URL}/api/treatment-timeline`, 
  dentists: `${API_BASE_URL}/api/dentists`,
  medications: `${API_BASE_URL}/api/medications`,
  services: `${API_BASE_URL}/api/services`,
  clinicsDiscover: `${API_BASE_URL}/api/clinics/discover`,
  patientReports: `${API_BASE_URL}/api/patient-reports`,
  notifications: `${API_BASE_URL}/api/notifications`,
};

export const fetchPatientByEmail = async (email) => {
  try {
    const response = await fetch(`${API.patients}?email=${email}`);
    const data = await response.json();
    return data.length > 0 ? data[0] : null;
  } catch (error) {
    console.error("Error fetching patient by email:", error);
    return null;
  }
};

export const fetchClinicDiscovery = async () => {
  console.log("[API] Fetching clinics from:", API.clinicsDiscover);
  try {
    const response = await fetch(API.clinicsDiscover);
    console.log("[API] Discovery response status:", response.status);
    if (!response.ok) {
      throw new Error(`Clinic discovery failed (${response.status})`);
    }
    const data = await response.json();
    console.log("[API] Discovery data received, count:", data?.length);
    return data;
  } catch (error) {
    console.error("[API] Error fetching clinic discovery:", error);
    return [];
  }
};