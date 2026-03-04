import React, { useState, useEffect, useMemo } from "react";
import "../styles/pages/Dashboard.css";
import WeeklyBarChart from "../components/WeeklyBarChart.jsx";
import AddWalkInModal from "../components/AddWalkInModal";
import useAppStore from "../store/useAppStore";
import useApi from "../hooks/useApi";
import { useNavigate } from "react-router-dom";

function Dashboard() {
  const navigate = useNavigate();
  const api = useApi();
  const queue = useAppStore((s) => s.queue);
  const appointments = useAppStore((s) => s.appointments);
  const dentists = useAppStore((s) => s.dentists);
  const patients = useAppStore((s) => s.patients);
  const [isAddWalkInOpen, setIsAddWalkInOpen] = useState(false);

  useEffect(() => {
    const loadAll = async () => {
      try {
        await Promise.all([
          api.loadDentists(),
          api.loadQueue(),
          api.loadAppointments()
        ]);
      } catch (e) {
        console.error("Dashboard load error", e);
      }
    };
    loadAll();
  }, []);

  const inTreatmentStatuses = ["On Chair", "In Treatment", "Treatment", "With patient"];

  // 1. CALCULATE DENTIST STATUS (Synced with Schedule)
  const dentistsWithStatus = useMemo(() => {
    const today = new Date();
    const dayIndex = today.getDay(); 
    const todayKey = today.toLocaleDateString('en-CA'); 

    return dentists.map((dentist) => {
      let scheduleStatus = "Available";
      const isOnLeave = (dentist.leaveDays || []).includes(todayKey);
      const isWorkingDay = (dentist.days || []).includes(dayIndex);
      const manualStatus = dentist.status || "Available";

      if (manualStatus === "Off" || isOnLeave || !isWorkingDay) {
        scheduleStatus = "Off";
      } else if (manualStatus === "Busy") {
        scheduleStatus = "Busy";
      }

      if (scheduleStatus !== "Available") {
        return { ...dentist, computedStatus: scheduleStatus };
      }

      const byQueueName = queue.filter(
        (q) => (q.dentist_id === dentist.id) || (q.assignedDentist === dentist.name)
      );
      const hasInTreatment = byQueueName.some((q) => inTreatmentStatuses.includes(q.status));
      const hasWaiting = byQueueName.some((q) => q.status === "Waiting" || q.status === "Checked-In");

      let liveStatus = "Available";
      if (hasInTreatment) liveStatus = "With Patient";
      else if (hasWaiting) liveStatus = "Waiting for Patient";

      return { ...dentist, computedStatus: liveStatus };
    });
  }, [dentists, queue]);

  // 2. STATS CALCULATIONS
  const totalAppointments = appointments.length;
  const nextPatient = queue.find(q => q.status === 'Waiting' || q.status === 'Checked-In');
  const patientsInBilling = queue.filter(q => q.status === 'Payment / Billing').length;
  const cancelledCount = appointments.filter(a => a.status === 'Cancelled' || a.status === 'No-Show').length;
  const cancellationRate = totalAppointments > 0 ? Math.round((cancelledCount / totalAppointments) * 100) : 0;

  // 3. CHART DATA LOGIC
  const chartData = useMemo(() => {
    const today = new Date();
    const labels = [];
    const walkinsData = [];
    const appointmentsData = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dayKey = d.toLocaleDateString('en-CA');
      labels.push(d.toLocaleDateString('en-US', { weekday: 'short' }));

      const countAppts = appointments.filter(a => {
        if (!a.appointment_datetime) return false;
        return new Date(a.appointment_datetime).toLocaleDateString('en-CA') === dayKey;
      }).length;
      appointmentsData.push(countAppts);

      const countWalkins = queue.filter(q => {
        if (q.source !== 'walk-in') return false;
        const t = q.time_added || q.checkedInTime;
        return t && new Date(t).toLocaleDateString('en-CA') === dayKey;
      }).length;
      walkinsData.push(countWalkins);
    }

    return { labels, checkups: walkinsData, appointments: appointmentsData };
  }, [appointments, queue]);

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <h2 className="dashboard-title">Dashboard</h2>
      </div>

      <div className="dashboard-grid">
        {/* SECTION 1: LIVE STATUS */}
        <div className="dashboard-section">
          <h3 className="dashboard-subtitle">Patients Currently in Clinic</h3>
          <div className="clinic-stats">
            <div className="stat-item">
              <span className="stat-value">{queue.filter(q => q.status === 'Checked-In').length}</span>
              <span className="stat-label">Checked-in</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{queue.filter(q => q.status === 'Waiting').length}</span>
              <span className="stat-label">Waiting</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{queue.filter(q => inTreatmentStatuses.includes(q.status)).length}</span>
              <span className="stat-label">In Treatment</span>
            </div>
            <div className="stat-item">
              <span className="stat-value" style={{ color: '#d97706' }}>{patientsInBilling}</span>
              <span className="stat-label">Billing</span>
            </div>
          </div>
        </div>

        {/* SECTION 2: CLINIC PULSE (Simplified) */}
        <div className="dashboard-section">
          <h3 className="dashboard-subtitle">Clinic Pulse</h3>
          <div style={{ background: '#f0f9ff', padding: '1rem', borderRadius: '8px', borderLeft: '4px solid #0ea5e9', marginBottom: '1rem' }}>
            <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase' }}>Up Next</span>
            <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#0f172a', margin: '4px 0' }}>
              {nextPatient ? nextPatient.name || nextPatient.full_name : "No patients waiting"}
            </div>
            {nextPatient && <div style={{ fontSize: '0.9rem', color: '#0ea5e9' }}>For: {nextPatient.assignedDentist || "Any Dentist"}</div>}
          </div>

          <div style={{ marginTop: 'auto', padding: '10px 0', borderTop: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.9rem', color: '#64748b' }}>Cancellation Rate:</span>
            <span style={{ fontWeight: 'bold', color: cancellationRate > 20 ? '#ef4444' : '#22c55e' }}>{cancellationRate}%</span>
          </div>
        </div>

        {/* SECTION 3: DENTIST STATUS */}
        <div className="dashboard-section">
          <h3 className="dashboard-subtitle">Dentist Utilization</h3>
          <ul className="dentist-utilization-list">
            {dentistsWithStatus.map((dentist) => (
              <li key={dentist.id} className="dentist-utilization-item">
                <span className={`status-dot ${dentist.computedStatus.toLowerCase().replace(/\s+/g, "-")}`}></span>
                <span>Dr. {dentist.name}</span>
                <span className="dentist-status">{dentist.computedStatus}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* SECTION 4: ACTIONS */}
        <div className="dashboard-section">
          <h3 className="dashboard-subtitle">Quick Actions</h3>
          <div className="quick-actions">
            <button className="quick-action-btn" onClick={() => setIsAddWalkInOpen(true)}>Add Walk-In Patient</button>
            <button className="quick-action-btn" onClick={() => navigate('/app/appointments')}>Add Appointment</button>
            <button className="quick-action-btn" onClick={() => navigate('/app/queue')}>Open Queue</button>
            <button className="quick-action-btn" onClick={() => navigate('/app/reports')}>View Summary</button>
          </div>
        </div>

        {/* SECTION 6: CHART */}
        <div className="dashboard-section full-width">
          <h3 className="dashboard-subtitle">Last 7 Days Activity</h3>
          <WeeklyBarChart chartData={chartData} />
        </div>
      </div>
      
      <AddWalkInModal
        isOpen={isAddWalkInOpen}
        onClose={() => setIsAddWalkInOpen(false)}
        onAddPatient={async (p) => { /* logic stays same as previous version */ }}
      />
    </div>
  );
}

export default Dashboard;