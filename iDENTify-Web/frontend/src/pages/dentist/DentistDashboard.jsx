// frontend/src/pages/dentist/Dashboard.jsx
import React from "react";
import "../../styles/base.css";
import "../../styles/pages/Dentists.css";

function DentistDashboard() {
  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Dentist Dashboard</h1>
      </div>
      <div className="dashboard-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
        
        <div className="card" style={{ padding: "20px", backgroundColor: "#fff", borderRadius: "8px", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }}>
          <h3 style={{ borderBottom: "1px solid #eee", paddingBottom: "10px", marginBottom: "15px" }}>Today's Overview</h3>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
            <span style={{ color: "#64748b", fontWeight: "bold" }}>Pending Appointments:</span>
            <span style={{ fontWeight: "bold", fontSize: "1.1rem" }}>4</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "#64748b", fontWeight: "bold" }}>Completed Today:</span>
            <span style={{ fontWeight: "bold", fontSize: "1.1rem", color: "green" }}>2</span>
          </div>
        </div>

        <div className="card" style={{ padding: "20px", backgroundColor: "#fff", borderRadius: "8px", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }}>
          <h3 style={{ borderBottom: "1px solid #eee", paddingBottom: "10px", marginBottom: "15px" }}>Recent Activity</h3>
          <p style={{ color: "#64748b", fontSize: "0.9rem" }}>Dr. Aquino, your schedule is looking good today.</p>
        </div>

      </div>
    </div>
  );
}

export default DentistDashboard;