const API_BASE_URL = "http://10.253.96.33:4006"; 

export const API = {
  patients: `${API_BASE_URL}/api/patients`,
  appointments: `${API_BASE_URL}/api/appointments`,
  queue: `${API_BASE_URL}/api/queue`,
  records: `${API_BASE_URL}/api/treatment-timeline`, 
  dentists: `${API_BASE_URL}/api/dentists`,
  medications: `${API_BASE_URL}/api/medications`,
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