import React, { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import "../../styles/pages/dentist/DentistDashboard.css";
import ServicePopularityChartCard from "../../components/ServicePopularityChartCard";
import useAppStore from "../../store/useAppStore";
import useApi from "../../hooks/useApi";
import EditDentistModal from "../../components/EditDentistModal";

const DAYS = [
  { label: "S", value: 0 }, { label: "M", value: 1 }, { label: "T", value: 2 },
  { label: "W", value: 3 }, { label: "T", value: 4 }, { label: "F", value: 5 },
  { label: "S", value: 6 }
];

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function resolveDentistId(user, dentists) {
  if (!user) return null;
  if (user.dentist_id) return Number(user.dentist_id);

  const matched = (dentists || []).find((dentist) => {
    if (String(dentist.user_id || "") === String(user.id || "")) return true;
    if (normalizeEmail(dentist.email) && normalizeEmail(dentist.email) === normalizeEmail(user.email)) return true;
    if (dentist.name && user.name && String(dentist.name).trim() === String(user.name).trim()) return true;
    return false;
  });

  if (matched?.id) return Number(matched.id);
  return Number(user.id || 0) || null;
}

function DentistDashboard() {
  const api = useApi();
  
  // ADDED 'dentists' to the store pull so we can find your true ID
  const { user, appointments, dentists } = useAppStore();
  const myDentistId = useMemo(() => resolveDentistId(user, dentists), [user, dentists]);

  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [myDentistData, setMyDentistData] = useState(null);

  useEffect(() => {
    if (myDentistId) {
      const matched = dentists.find(d => Number(d.id) === Number(myDentistId));
      if (matched) setMyDentistData(matched);
    }
  }, [myDentistId, dentists]);

  const formatSchedule = (scheduleStr) => {
    if (!scheduleStr) return "No schedule set";
    try {
      const schedule = typeof scheduleStr === 'string' ? JSON.parse(scheduleStr) : scheduleStr;
      const activeDays = DAYS.filter(d => schedule[d.value]?.active);
      if (activeDays.length === 0) return "No active days";
      
      return activeDays.map(d => {
        const daySched = schedule[d.value];
        return `${d.label}: ${daySched.start || '00:00'} - ${daySched.end || '00:00'}`;
      }).join(" | ");
    } catch (e) {
      return "Invalid schedule format";
    }
  };

  const handleUpdateSchedule = () => {
    api.loadDentists();
    setShowScheduleModal(false);
  };

  useEffect(() => {
    const loadDashboardData = async () => {
        try {
            await api.loadAppointments();
            await api.loadQueue();
            await api.loadDentists(); // Ensure dentists are loaded for cross-referencing
        } catch (error) {
            console.error("Failed to load dashboard data:", error);
        }
    };
    
    // 1. Initial load when the page opens
    loadDashboardData();

    // 2. Set up an interval to refresh data every 10 seconds
    const syncInterval = setInterval(() => {
        loadDashboardData();
    }, 10000);

    // 3. Cleanup the interval
    return () => clearInterval(syncInterval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const myAppts = useMemo(() => {
    if (!appointments || !user) return [];
    
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });

    return appointments.filter(a => {
      // 2. ULTRA-SAFE ID MATCH: Check true dentist ID, account ID, or exact Name
      const isMyAppointment = 
          String(a.dentist_id) === String(myDentistId) ||
          String(a.dentist_id) === String(user?.id) ||
          a.dentist_name === user?.name ||
          a.dentist === user?.name;

      if (!isMyAppointment) return false;

      // 3. ULTRA-SAFE DATE MATCH: Extract standard YYYY-MM-DD
      if (!a.appointment_datetime) return false;
      
      let apptDate = "";
      try {
          apptDate = new Date(a.appointment_datetime).toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
        } catch {
          apptDate = a.appointment_datetime.split('T')[0].split(' ')[0];
      }

      return apptDate === today;
    });
  }, [appointments, user, myDentistId]);

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
                    {/* Fixed time display fallback */}
                    <td>{appt.timeStart || new Date(appt.appointment_datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                    <td className="patient-name">{appt.patient_name || appt.full_name || appt.patient || 'Unknown Patient'}</td>
                    <td>{appt.procedure || appt.reason || 'General Treatment'}</td>
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

      <div className="dashboard-section table-card" style={{ marginTop: "1rem" }}>
        <ServicePopularityChartCard
          title="Most Booked Services"
          dentistId={myDentistId}
        />
      </div>

      <div className="my-schedule-section" style={{ marginTop: '2rem', padding: '1.5rem', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>My Weekly Schedule</h2>
            <p style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '0.25rem' }}>Manage your weekly availability and working hours.</p>
          </div>
          <button 
            className="btn-edit-schedule" 
            onClick={() => setShowScheduleModal(true)}
            style={{ padding: '0.6rem 1.2rem', background: '#3498db', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', transition: 'background 0.2s' }}
            onMouseOver={(e) => e.currentTarget.style.background = '#2980b9'}
            onMouseOut={(e) => e.currentTarget.style.background = '#3498db'}
          >
            Edit My Schedule
          </button>
        </div>
        
        <div className="current-schedule-display" style={{ padding: '1rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
          <p style={{ margin: 0, fontWeight: '500', color: '#475569', fontSize: '0.95rem' }}>
            <strong>Current Hours:</strong> {myDentistData ? formatSchedule(myDentistData.schedule) : "Loading schedule..."}
          </p>
        </div>
      </div>

      {showScheduleModal && myDentistData && (
        <EditDentistModal 
          dentist={myDentistData}
          onClose={() => setShowScheduleModal(false)}
          onSuccess={handleUpdateSchedule}
          actorContext={user}
        />
      )}
    </div>
  );
}

export default DentistDashboard;