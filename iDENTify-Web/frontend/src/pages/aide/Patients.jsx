import React, { useMemo, useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import useAppStore from "../../store/useAppStore";
import useApi from "../../hooks/useApi";
import "../../styles/pages/aide/Patients.css";

function Patients() {
  const navigate = useNavigate();
  const { patients, appointments, queue, user, dentists } = useAppStore((state) => state);
  const { loadPatients, loadAppointments, loadQueue, loading, error, loadDentists } = useApi();

  const myDentistId = useMemo(() => {
    if (user?.role !== 'dentist') return null;
    if (user.dentist_id) return Number(user.dentist_id);

    const matched = (dentists || []).find((dentist) => {
        if (String(dentist.user_id || "") === String(user.id || "")) return true;
        const dEmail = String(dentist.email || "").trim().toLowerCase();
        const uEmail = String(user.email || "").trim().toLowerCase();
        if (dEmail && dEmail === uEmail) return true;
        if (dentist.name && user.name && String(dentist.name).trim() === String(user.name).trim()) return true;
        return false;
    });

    return matched?.id ? Number(matched.id) : Number(user.id || 0);
  }, [user, dentists]);

  // Independent search states for the two sections
  const [todaySearch, setTodaySearch] = useState("");
  const [allSearch, setAllSearch] = useState("");

  useEffect(() => {
    // Load all data needed to calculate "Patients Today" and "Last Procedure"
    Promise.all([loadPatients(), loadAppointments(), loadQueue(), loadDentists()]).catch((err) => {
      console.error("Failed to load patient data", err);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // --- HELPER: Get Last Procedure ---
  const getLastProcedure = (patientId) => {
    const patientAppts = appointments
      .filter((a) => a.patient_id === patientId && a.status === "Done")
      // Sort by date descending (newest first)
      .sort((a, b) => new Date(b.appointment_datetime) - new Date(a.appointment_datetime));

    if (patientAppts.length > 0) {
      return patientAppts[0].procedure || patientAppts[0].reason || "Check-up";
    }
    return "New Patient";
  };

  // --- FILTER 1: Patients Today ---
  const patientsToday = useMemo(() => {
    const todayStr = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

    // 1. Identify IDs from Appointments Today
    let apptsToday = appointments
      .filter((a) => a.appointment_datetime && a.appointment_datetime.startsWith(todayStr));
    
    if (user?.role === 'dentist') {
        apptsToday = apptsToday.filter(a => Number(a.dentist_id) === Number(myDentistId));
    }
    const apptIds = apptsToday.map((a) => a.patient_id);

    // 2. Identify IDs from Queue Today (Walk-ins)
    let queueToday = queue
      .filter((q) => {
        const t = q.time_added || q.checkedInTime;
        return t && t.startsWith(todayStr);
      });
    
    if (user?.role === 'dentist') {
        queueToday = queueToday.filter(q => Number(q.dentist_id) === Number(myDentistId));
    }
    const queueIds = queueToday.map((q) => q.patient_id);

    const todaySet = new Set([...apptIds, ...queueIds]);
    let list = patients.filter((p) => todaySet.has(p.id));

    // Apply Search Filter
    if (todaySearch.trim()) {
      const lower = todaySearch.toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(lower));
    }
    return list;
  }, [patients, appointments, queue, todaySearch, user?.role, myDentistId]);

  // --- FILTER 2: All Patients ---
  const allPatientsList = useMemo(() => {
    let list = patients;

    if (user?.role === 'dentist') {
        list = list.filter(p => {
            const isBooked = appointments.some(a => Number(a.patient_id) === Number(p.id) && Number(a.dentist_id) === Number(myDentistId));
            const isTreated = queue.some(q => Number(q.patient_id) === Number(p.id) && Number(q.dentist_id) === Number(myDentistId));
            return isBooked || isTreated;
        });
    }

    if (allSearch.trim()) {
      const lower = allSearch.toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(lower));
    }
    return list;
  }, [patients, allSearch, user?.role, myDentistId, appointments, queue]);

  const getDisplayAge = (patient) => {
    const birthdate = patient?.birthdate || patient?.birthday;
    if (birthdate) {
      const dob = new Date(birthdate);
      if (!Number.isNaN(dob.getTime())) {
        const today = new Date();
        let age = today.getFullYear() - dob.getFullYear();
        const monthDiff = today.getMonth() - dob.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
          age -= 1;
        }
        return age >= 0 ? age : "--";
      }
    }

    if (patient?.age !== undefined && patient?.age !== null && patient.age !== "") {
      return patient.age;
    }

    return "--";
  };

  // --- RENDER TABLE COMPONENT ---
  const PatientTable = ({ data, emptyMessage }) => (
    <div className="patients-table-container">
      <table className="patients-table">
        <thead>
          <tr>
            <th style={{ width: '25%' }}>Name</th>
            <th style={{ width: '10%' }}>Age</th>
            <th style={{ width: '25%' }}>Last Procedure</th>
            <th style={{ width: '25%' }}>Notes</th>
            <th style={{ width: '15%', textAlign: 'center' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {data.length > 0 ? (
            data.map((p) => (
              <tr key={p.id}>
                <td>
                  <span style={{ fontWeight: 500, color: "#333" }}>{p.name}</span>
                </td>
                <td>{getDisplayAge(p)}</td>
                <td style={{ color: "#666" }}>{getLastProcedure(p.id)}</td>
                <td style={{ color: "#666", fontSize: '0.9rem' }}>
                  {(() => {
                    const realAlerts = (p.medicalAlerts || []).filter(a => !a.includes("Relation:"));

                    if (realAlerts.length > 0) {
                      return (
                        <span style={{ color: "#d32f2f", backgroundColor: "#ffebee", padding: "2px 6px", borderRadius: "4px" }}>
                          {realAlerts[0]}
                        </span>
                      );
                    }
                    return "--";
                  })()}
                </td>
                <td style={{ textAlign: 'center' }}>
                  {/* FIX: Corrected the navigate path from /app/patient/... to /patients/... */}
                  <button
                    onClick={() => navigate(`/patients/${p.id}`, { state: { patientData: p } })}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#2f9e44",
                      fontWeight: "bold",
                      cursor: "pointer",
                      textTransform: "uppercase",
                      fontSize: "0.85rem"
                    }}
                  >
                    Update
                  </button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="5" style={{ textAlign: "center", padding: "2rem", color: "#888" }}>
                {emptyMessage}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="patients-page">
      <h2 className="patients-title">Patient Records</h2>

      {loading && <div style={{ marginBottom: "1rem", color: "#666" }}>Loading records...</div>}
      {error && <div className="error-message">Failed to load patients.</div>}

      <div style={{ marginBottom: "3rem" }}>
        <div className="patients-header">
          <h3 style={{ fontSize: "1.5rem", margin: 0, color: "#444" }}>Patients Today</h3>
          <div className="search-group">
            <input
              type="text"
              placeholder="Search patients..."
              value={todaySearch}
              onChange={(e) => setTodaySearch(e.target.value)}
              style={{ padding: "0.6rem", borderRadius: "8px", border: "1px solid #ddd", width: "250px" }}
            />
          </div>
        </div>
        <PatientTable data={patientsToday} emptyMessage="No patients scheduled for today." />
      </div>

      <div>
        <div className="patients-header">
          <h3 style={{ fontSize: "1.5rem", margin: 0, color: "#444" }}>All Patients</h3>
          <div className="search-group">
            <input
              type="text"
              placeholder="Search patients..."
              value={allSearch}
              onChange={(e) => setAllSearch(e.target.value)}
              style={{ padding: "0.6rem", borderRadius: "8px", border: "1px solid #ddd", width: "250px" }}
            />
          </div>
        </div>
        <PatientTable data={allPatientsList} emptyMessage="No patients found." />
      </div>
    </div>
  );
}

export default Patients;