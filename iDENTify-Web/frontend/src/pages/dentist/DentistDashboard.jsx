import React, { useEffect, useMemo } from "react";
import "../../styles/pages/dentist/DentistDashboard.css";
import useAppStore from "../../store/useAppStore";
import useApi from "../../hooks/useApi";

function DentistDashboard() {
  const api = useApi();
  const { user, appointments, queue } = useAppStore();

  useEffect(() => {
    const loadDashboardData = async () => {
        try {
            // Ensure these methods exist in your useApi hook 
            // and they call getAppointments/getQueue from apiClient.js
            await api.loadAppointments();
            await api.loadQueue();
        } catch (error) {
            console.error("Failed to load dashboard data:", error);
        }
    };
    loadDashboardData();
  }, [api]);

  const myAppts = useMemo(() => {
    if (!appointments || !user) return [];
    const today = new Date().toLocaleDateString('en-CA');
    return appointments.filter(a => 
      a.dentist_id === user?.id && 
      new Date(a.appointment_datetime).toLocaleDateString('en-CA') === today
    );
  }, [appointments, user]);

  return (
    <div className="dashboard-wrapper">
      <div className="dashboard-header">
        <h1 className="dashboard-title">Doctor's Dashboard</h1>
        <p className="dashboard-subtitle">
            Welcome, Dr. {user?.name || 'Doctor'}. You have {myAppts.length} patients today.
        </p>
      </div>

      <div className="stats-container">
        <div className="stat-card">
          <span className="stat-label">Total Appointments</span>
          <span className="stat-value">{myAppts.length}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Pending</span>
          <span className="stat-value" style={{color: "#f39c12"}}>
            {myAppts.filter(a => a.status !== 'Done' && a.status !== 'Completed').length}
          </span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Completed</span>
          <span className="stat-value" style={{color: "#27ae60"}}>
            {myAppts.filter(a => a.status === 'Done' || a.status === 'Completed').length}
          </span>
        </div>
      </div>

      <div className="dashboard-section table-card">
        <h3 className="section-title">Today's Schedule</h3>
        <table className="dashboard-table">
          <thead>
            <tr>
              <th>Time</th>
              <th>Patient</th>
              <th>Procedure</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {myAppts.length > 0 ? (
                myAppts.map(appt => (
                  <tr key={appt.id}>
                    <td>{appt.timeStart || 'N/A'}</td>
                    <td className="patient-name">{appt.patient_name || appt.full_name}</td>
                    <td>{appt.procedure || 'General Treatment'}</td>
                    <td>
                        <span className={`status-badge ${appt.status?.toLowerCase() || 'pending'}`}>
                            {appt.status || 'Scheduled'}
                        </span>
                    </td>
                  </tr>
                ))
            ) : (
                <tr>
                    <td colSpan="4" style={{ textAlign: 'center', padding: '20px' }}>
                        No appointments found for today.
                    </td>
                </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default DentistDashboard;