import React from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/base.css";

function DentistAppointments() {
  const navigate = useNavigate();

  // Mock Data (Replace with your API call to fetch this dentist's appointments)
  const appointments = [
    { id: 1, patientId: 101, patientName: "John Doe", time: "10:00 AM", status: "Waiting", procedure: "Teeth Cleaning" },
    { id: 2, patientId: 102, patientName: "Jane Smith", time: "11:30 AM", status: "Scheduled", procedure: "Consultation" }
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">My Appointments</h1>
      </div>

      <div className="card" style={{ padding: "20px", backgroundColor: "#fff", borderRadius: "8px", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }}>
        <table className="data-table" style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ backgroundColor: "#f9fafb", textAlign: "left" }}>
              <th style={{ padding: "12px", borderBottom: "1px solid #ddd" }}>Time</th>
              <th style={{ padding: "12px", borderBottom: "1px solid #ddd" }}>Patient Name</th>
              <th style={{ padding: "12px", borderBottom: "1px solid #ddd" }}>Procedure</th>
              <th style={{ padding: "12px", borderBottom: "1px solid #ddd" }}>Status</th>
              <th style={{ padding: "12px", borderBottom: "1px solid #ddd" }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {appointments.map((appt) => (
              <tr key={appt.id}>
                <td style={{ padding: "12px", borderBottom: "1px solid #eee" }}>{appt.time}</td>
                <td style={{ padding: "12px", borderBottom: "1px solid #eee", fontWeight: "bold" }}>{appt.patientName}</td>
                <td style={{ padding: "12px", borderBottom: "1px solid #eee" }}>{appt.procedure}</td>
                <td style={{ padding: "12px", borderBottom: "1px solid #eee" }}>
                  <span style={{ padding: "4px 8px", borderRadius: "12px", fontSize: "0.85rem", backgroundColor: appt.status === 'Waiting' ? '#fef3c7' : '#e0f2fe', color: appt.status === 'Waiting' ? '#d97706' : '#0284c7' }}>
                    {appt.status}
                  </span>
                </td>
                <td style={{ padding: "12px", borderBottom: "1px solid #eee" }}>
                  <button 
                    onClick={() => navigate(`/app/patient/${appt.patientId}`)} 
                    style={{ padding: "6px 12px", backgroundColor: "var(--primary-color)", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "0.85rem" }}
                  >
                    Review Chart
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default DentistAppointments;