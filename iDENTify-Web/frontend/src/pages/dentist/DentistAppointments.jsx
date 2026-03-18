import React from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/pages/dentist/DentistAppointments.css"; // <-- Import new CSS

function DentistAppointments() {
  const navigate = useNavigate();

  const appointments = [
    { id: 1, patientId: 101, patientName: "John Doe", time: "10:00 AM", status: "Waiting", procedure: "Teeth Cleaning" },
    { id: 2, patientId: 102, patientName: "Jane Smith", time: "11:30 AM", status: "Scheduled", procedure: "Consultation" }
  ];

  return (
    <div className="appointments-container">
      <div className="appointments-header">
        <h1 className="appointments-title">My Appointments</h1>
      </div>

      <div className="appointments-card">
        <table className="appointments-table">
          <thead>
            <tr>
              <th>Time</th>
              <th>Patient Name</th>
              <th>Procedure</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {appointments.map((appt) => (
              <tr key={appt.id}>
                <td>{appt.time}</td>
                <td className="patient-name-cell">{appt.patientName}</td>
                <td>{appt.procedure}</td>
                <td>
                  <span className={`appt-status-badge ${appt.status.toLowerCase()}`}>
                    {appt.status}
                  </span>
                </td>
                <td>
                  <button 
                    className="review-chart-btn"
                    onClick={() => navigate(`/app/patient/${appt.patientId}`)} 
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