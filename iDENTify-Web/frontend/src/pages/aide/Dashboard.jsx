import React, { useState, useEffect, useMemo } from "react";
import "../../styles/pages/aide/Dashboard.css";
import WeeklyBarChart from "../../components/WeeklyBarChart.jsx";
import ServicePopularityChartCard from "../../components/ServicePopularityChartCard";
import AddWalkInModal from "../../components/AddWalkInModal";
import AddAppointmentModal from "../../components/AddAppointmentModal";
import useAppStore from "../../store/useAppStore";
import useApi from "../../hooks/useApi";
import { useNavigate } from "react-router-dom";

function Dashboard() {
  const navigate = useNavigate();
  const api = useApi();
  const user = useAppStore((s) => s.user);
  const userClinicId = user?.clinic_id;
  const userBranchId = user?.branch_id;
  const queue = useAppStore((s) => s.queue);
  const appointments = useAppStore((s) => s.appointments);
  const dentists = useAppStore((s) => s.dentists);
  const patients = useAppStore((s) => s.patients);
  
  const [isAddWalkInOpen, setIsAddWalkInOpen] = useState(false);
  const [isAddAppointmentOpen, setIsAddAppointmentOpen] = useState(false);

  useEffect(() => {
    const loadAll = async () => {
      try {
        // Syncs all necessary data on component mount
        await Promise.all([
          api.loadDentists(),
          api.loadQueue(),
          api.loadAppointments(),
          api.loadPatients() 
        ]);
      } catch (e) {
        console.error("Dashboard load error", e);
      }
    };
    loadAll();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const inTreatmentStatuses = ["On Chair", "In Treatment", "Treatment", "With patient"];

  // Helper to sort appointments by time string
  const toMinutes = (timeString) => {
    if (!timeString) return 0;
    const [time, meridiem] = timeString.split(" ");
    const [hourStr, minuteStr] = time.split(":");
    let hour = Number(hourStr);
    const minute = Number(minuteStr);
    if (meridiem === "PM" && hour !== 12) hour += 12;
    if (meridiem === "AM" && hour === 12) hour = 0;
    return hour * 60 + minute;
  };

  // 1. CALCULATE DENTIST STATUS 
  const dentistsWithStatus = useMemo(() => {
    const today = new Date();
    const dayIndex = today.getDay(); 
    const todayKey = today.toLocaleDateString('en-CA'); 

    // FILTER OUT DENTAL AIDES AND OTHER CLINICS/BRANCHES
    const actualDentists = dentists
      .filter(d => d.specialization !== 'Dental Aide' && d.role !== 'aide')
      .filter(d => {
        if (!userClinicId) return true; // Global Admin
        const matchClinic = Number(d.clinic_id) === Number(userClinicId);
        const matchBranch = !userBranchId || Number(d.branch_id) === Number(userBranchId);
        return matchClinic && matchBranch;
      });

    return actualDentists.map((dentist) => {
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
  }, [dentists, queue, userClinicId, userBranchId]); // eslint-disable-line react-hooks/exhaustive-deps

  // 2. TODAY'S APPOINTMENTS 
  const todaysAppointmentsEnriched = useMemo(() => {
    const todayKey = new Date().toLocaleDateString('en-CA');

    return appointments
      .filter(a => {
        if (!a.appointment_datetime) return false;
        const dateMatch = new Date(a.appointment_datetime).toLocaleDateString('en-CA') === todayKey;
        const clinicMatch = !userClinicId || Number(a.clinic_id) === Number(userClinicId);
        const branchMatch = !userBranchId || Number(a.branch_id) === Number(userBranchId);
        return dateMatch && clinicMatch && branchMatch;
      })
      .sort((a, b) => toMinutes(a.timeStart) - toMinutes(b.timeStart))
      .map((appt) => ({
        ...appt,
        displayTime: appt.timeStart || new Date(appt.appointment_datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        displayName: patients.find((p) => p.id === appt.patient_id)?.name || appt.patient || appt.patient_name || "Unknown Patient",
        displayDentist: dentists.find((d) => d.id === appt.dentist_id)?.name || appt.dentist_name || "Unassigned",
        displayProcedure: appt.procedure || appt.reason || 'N/A'
      }));
  }, [appointments, patients, dentists, userClinicId, userBranchId]);

  // 3. STATS CALCULATIONS
  const branchAppointments = useMemo(() => {
    return appointments.filter(a => {
        const matchClinic = !userClinicId || Number(a.clinic_id) === Number(userClinicId);
        const matchBranch = !userBranchId || Number(a.branch_id) === Number(userBranchId);
        return matchClinic && matchBranch;
    });
  }, [appointments, userClinicId, userBranchId]);

  const branchQueue = useMemo(() => {
    return queue.filter(q => {
        const matchClinic = !userClinicId || Number(q.clinic_id) === Number(userClinicId);
        const matchBranch = !userBranchId || Number(q.branch_id) === Number(userBranchId);
        return matchClinic && matchBranch;
    });
  }, [queue, userClinicId, userBranchId]);

  const totalAppointments = branchAppointments.length;
  const nextPatient = branchQueue.find(q => q.status === 'Waiting' || q.status === 'Checked-In');
  const patientsInBilling = branchQueue.filter(q => q.status === 'Payment / Billing').length;
  const cancelledCount = branchAppointments.filter(a => a.status === 'Cancelled' || a.status === 'No-Show' || a.status === 'Missed').length;
  const cancellationRate = totalAppointments > 0 ? Math.round((cancelledCount / totalAppointments) * 100) : 0;

  // 4. CHART DATA LOGIC
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

      const countAppts = branchAppointments.filter(a => {
        if (!a.appointment_datetime) return false;
        return new Date(a.appointment_datetime).toLocaleDateString('en-CA') === dayKey;
      }).length;
      appointmentsData.push(countAppts);

      const countWalkins = branchQueue.filter(q => {
        if (q.source !== 'walk-in') return false;
        const t = q.time_added || q.checkedInTime;
        return t && new Date(t).toLocaleDateString('en-CA') === dayKey;
      }).length;
      walkinsData.push(countWalkins);
    }

    return { labels, checkups: walkinsData, appointments: appointmentsData };
  }, [branchAppointments, branchQueue]);

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <h2 className="dashboard-title">Dashboard</h2>
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-section">
          <h3 className="dashboard-subtitle">Patients Currently in Clinic</h3>
          <div className="clinic-stats">
            <div className="stat-item">
              <span className="stat-value">{branchQueue.filter(q => q.status === 'Checked-In').length}</span>
              <span className="stat-label">Checked-in</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{branchQueue.filter(q => q.status === 'Waiting').length}</span>
              <span className="stat-label">Waiting</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{branchQueue.filter(q => inTreatmentStatuses.includes(q.status)).length}</span>
              <span className="stat-label">In Treatment</span>
            </div>
            <div className="stat-item">
              <span className="stat-value" style={{ color: '#d97706' }}>{patientsInBilling}</span>
              <span className="stat-label">Billing</span>
            </div>
          </div>
        </div>

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

        <div className="dashboard-section">
          <h3 className="dashboard-subtitle">Quick Actions</h3>
          <div className="quick-actions">
            <button className="quick-action-btn" onClick={() => setIsAddWalkInOpen(true)}>Add Walk-In Patient</button>
            <button className="quick-action-btn" onClick={() => setIsAddAppointmentOpen(true)}>Add Appointment</button>
            <button className="quick-action-btn" onClick={() => navigate('/walk-in')}>Open Walk In</button>
            <button className="quick-action-btn" onClick={() => navigate('/reports')}>View Summary</button>
          </div>
        </div>

        {/* TODAY'S APPOINTMENTS TABLE */}
        <div className="dashboard-section full-width">
          <h3 className="dashboard-subtitle">Today's Appointments</h3>
          <div style={{ overflowX: 'auto', background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 'bold' }}>Time</th>
                  <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 'bold' }}>Patient</th>
                  <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 'bold' }}>Dentist</th>
                  <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 'bold' }}>Procedure</th>
                  <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 'bold' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {todaysAppointmentsEnriched.length > 0 ? (
                  todaysAppointmentsEnriched.map((appt) => (
                    <tr key={appt.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '12px 16px' }}>{appt.displayTime}</td>
                      <td style={{ padding: '12px 16px', fontWeight: '600', color: '#0f172a' }}>{appt.displayName}</td>
                      <td style={{ padding: '12px 16px', color: '#475569' }}>{appt.displayDentist}</td>
                      <td style={{ padding: '12px 16px', color: '#475569' }}>{appt.displayProcedure}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: '12px',
                          fontSize: '0.85rem',
                          backgroundColor: appt.status === 'Done' ? '#dcfce7' : '#e0f2fe',
                          color: appt.status === 'Done' ? '#166534' : '#0369a1',
                          fontWeight: 'bold'
                        }}>
                          {appt.status || 'Pending'}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
                      No appointments scheduled for today.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="dashboard-section full-width">
          <h3 className="dashboard-subtitle">Last 7 Days Activity</h3>
          <WeeklyBarChart chartData={chartData} />
        </div>

        <div className="dashboard-section full-width">
          <ServicePopularityChartCard title="Most Booked Services" />
        </div>
      </div>
      
      <AddWalkInModal
        isOpen={isAddWalkInOpen}
        onClose={() => setIsAddWalkInOpen(false)}
        onAddPatient={async (data) => {
          try {
            let patientId = data.patientId;

            // If it's a new patient, create the record first
            if (data.isNewPatient && !patientId) {
              const newPatient = await api.createPatient({
                first_name: data.first_name,
                middle_name: data.middle_name,
                last_name: data.last_name,
                full_name: data.full_name,
                birthdate: data.birthdate,
                sex: data.sex,
                contact_number: data.contact,
                source: 'walk-in'
              });
              patientId = newPatient.id;
            }

            if (!patientId) {
              throw new Error("Patient record could not be resolved.");
            }

            await api.addQueue({
              patient_id: patientId,
              first_name: data.first_name,
              middle_name: data.middle_name,
              last_name: data.last_name,
              birthdate: data.birthdate,
              sex: data.sex,
              contact: data.contact,
              dentist_id: data.assignedDentistId,
              notes: data.notes,
              source: 'walk-in',
              status: 'Checked-In'
            });
            toast.success("Walk-in added successfully!");
            api.loadQueue();
          } catch (err) {
            console.error("Failed to add walk-in", err);
            toast.error(err.message || "Failed to add walk-in.");
          }
        }}
      />
      
      <AddAppointmentModal 
        isOpen={isAddAppointmentOpen} 
        onClose={() => setIsAddAppointmentOpen(false)}
        dentists={dentists}
        onSave={async (data) => {
          try {
            await api.createAppointment(data);
            toast.success("Appointment added successfully!");
            api.loadAppointments();
            setIsAddAppointmentOpen(false);
          } catch (err) {
            console.error("Failed to add appointment", err);
            toast.error(err.message || "Failed to add appointment.");
          }
        }}
      />
    </div>
  );
}

export default Dashboard;