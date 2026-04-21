import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import useAppStore from "../../store/useAppStore";
import useApi from "../../hooks/useApi";
import "../../styles/pages/dentist/DentistAppointments.css";

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

function DentistAppointments() {
  const navigate = useNavigate();
  const api = useApi();
  
  const allAppointments = useAppStore((state) => state.appointments || []);
  const patients = useAppStore((state) => state.patients || []);
  const queue = useAppStore((state) => state.queue || []);
  const dentists = useAppStore((state) => state.dentists || []);
  const currentUser = useAppStore((state) => state.user); 

  const currentDentistId = useMemo(() => resolveDentistId(currentUser, dentists), [currentUser, dentists]);

  const [selectedDate, setSelectedDate] = useState(new Date().toLocaleDateString('en-CA'));
  const [activeTab, setActiveTab] = useState('appointments'); // 'appointments' or 'patients'
  const [decisionLoadingId, setDecisionLoadingId] = useState(null);

  useEffect(() => {
    api.loadAppointments();
    api.loadPatients();
    api.loadQueue();
    api.loadDentists();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const toDateKey = (value) => {
    if (!value) return null;
    const parsed = new Date(String(value).replace(' ', 'T'));
    if (Number.isNaN(parsed.getTime())) {
      return String(value).split('T')[0]?.split(' ')[0] || null;
    }
    return parsed.toLocaleDateString('en-CA');
  };

  const myAppointments = useMemo(() => {
    return allAppointments.filter(appt => {
      const isMyPatient = Number(appt.dentist_id) === Number(currentDentistId);
      const apptDateStr = toDateKey(appt.appointment_datetime);
      const isSelectedDate = apptDateStr === selectedDate;
      return isMyPatient && isSelectedDate;
    });
  }, [allAppointments, currentDentistId, selectedDate]);

  const walkInPatients = useMemo(() => {
    return queue.filter((entry) => {
      const isWalkIn = String(entry.source || '').trim().toLowerCase() === 'walk-in' || !entry.appointment_id;
      const isMyPatient = Number(entry.dentist_id) === Number(currentDentistId);
      const queueDateStr = toDateKey(entry.time_added || entry.checkedInTime);
      const isSelectedDate = queueDateStr === selectedDate;
      return isWalkIn && isMyPatient && isSelectedDate;
    });
  }, [queue, currentDentistId, selectedDate]);

  const canDecideAppointment = (appointment) => {
    if (!appointment) return false;
    const status = String(appointment.status || '').trim().toLowerCase();
    const decisionStatus = String(appointment.decision_status || '').trim().toLowerCase();
    
    // If already approved/declined via the decision workflow, hide buttons
    if (decisionStatus === 'approved' || decisionStatus === 'declined') return false;
    
    // Also hide if the general status is final
    return !['done', 'cancelled', 'declined', 'no-show', 'completed'].includes(status);
  };

  const isDecisionBusy = (appointmentId, action) => decisionLoadingId === `${action}-${appointmentId}`;

  const handleApprove = async (appointmentId) => {
    if (!appointmentId) return;

    try {
      setDecisionLoadingId(`approve-${appointmentId}`);
      await api.approveAppointment(appointmentId, {});
      toast.success('Appointment approved.');
      await Promise.all([api.loadAppointments(), api.loadQueue()]);
    } catch (error) {
      toast.error(error?.message || 'Failed to approve appointment.');
    } finally {
      setDecisionLoadingId(null);
    }
  };

  const handleDecline = async (appointmentId) => {
    if (!appointmentId) return;

    const input = window.prompt('Please provide a reason for declining this appointment:');
    if (input === null) return;

    const reason = String(input || '').trim();
    if (!reason) {
      toast.error('Decline reason is required.');
      return;
    }

    try {
      setDecisionLoadingId(`decline-${appointmentId}`);
      await api.declineAppointment(appointmentId, { reason });
      toast.success('Appointment declined.');
      await Promise.all([api.loadAppointments(), api.loadQueue()]);
    } catch (error) {
      toast.error(error?.message || 'Failed to decline appointment.');
    } finally {
      setDecisionLoadingId(null);
    }
  };

  return (
    <div className="appointments-container">
      <div className="appointments-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 className="appointments-title">Dentist Management</h1>
        
        <div className="date-picker-container" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <label htmlFor="date-picker" style={{ fontWeight: 'bold' }}>Select Date:</label>
          <input 
            id="date-picker"
            type="date" 
            value={selectedDate} 
            onChange={(e) => setSelectedDate(e.target.value)}
            className="date-input"
            style={{ padding: '0.5rem', borderRadius: '5px', border: '1px solid #ccc' }}
          />
        </div>
      </div>

      <div className="appointments-tabs" style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
        <button 
          className={`tab-btn ${activeTab === 'appointments' ? 'active' : ''}`}
          onClick={() => setActiveTab('appointments')}
          style={{
            padding: '10px 20px',
            borderRadius: '5px',
            border: 'none',
            backgroundColor: activeTab === 'appointments' ? '#3498db' : '#f0f0f0',
            color: activeTab === 'appointments' ? '#fff' : '#333',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          Appointments
        </button>
        <button 
          className={`tab-btn ${activeTab === 'patients' ? 'active' : ''}`}
          onClick={() => setActiveTab('patients')}
          style={{
            padding: '10px 20px',
            borderRadius: '5px',
            border: 'none',
            backgroundColor: activeTab === 'patients' ? '#3498db' : '#f0f0f0',
            color: activeTab === 'patients' ? '#fff' : '#333',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          Patients
        </button>
      </div>

      {activeTab === 'appointments' && (
        <div className="appointments-card animation-fade-in">
          <h2 className="appointments-title" style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>Scheduled Appointments</h2>
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
              {myAppointments.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: "center", padding: "2rem" }}>
                    No appointments found for {new Date(selectedDate).toLocaleDateString()}.
                  </td>
                </tr>
              ) : (
                myAppointments.map((appt) => {
                  const patientName = patients.find(p => p.id === appt.patient_id)?.name || appt.full_name || "Unknown Patient";
                  const formattedTime = appt.timeStart || (appt.appointment_datetime 
                    ? new Date(appt.appointment_datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
                    : "N/A");

                  const canDecide = canDecideAppointment(appt);

                  return (
                    <tr key={appt.id}>
                      <td style={{ fontWeight: 'bold' }}>{formattedTime}</td>
                      <td className="patient-name-cell">{patientName}</td>
                      <td>{appt.procedure || appt.reason}</td>
                      <td>
                        <span className={`appt-status-badge ${appt.status?.toLowerCase() || 'scheduled'}`}>
                          {appt.status}
                          {appt.decision_status === 'approved' && ' (Approved)'}
                        </span>
                      </td>
                      <td>
                        <div className="appt-action-group">
                          {canDecide ? (
                            <>
                              <button
                                className="decision-btn approve-btn"
                                onClick={() => handleApprove(appt.id)}
                                disabled={isDecisionBusy(appt.id, 'approve') || isDecisionBusy(appt.id, 'decline')}
                                style={{ backgroundColor: '#2ecc71', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', marginRight: '5px' }}
                              >
                                {isDecisionBusy(appt.id, 'approve') ? 'Approving...' : 'Approve'}
                              </button>
                              <button
                                className="decision-btn decline-btn"
                                onClick={() => handleDecline(appt.id)}
                                disabled={isDecisionBusy(appt.id, 'approve') || isDecisionBusy(appt.id, 'decline')}
                                style={{ backgroundColor: '#e74c3c', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', marginRight: '5px' }}
                              >
                                {isDecisionBusy(appt.id, 'decline') ? 'Declining...' : 'Decline'}
                              </button>
                            </>
                          ) : null}
                          <button
                            className="review-chart-btn"
                            onClick={() => navigate(`/patients/${appt.patient_id}`)}
                            style={{ backgroundColor: '#3498db', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', marginRight: '5px' }}
                          >
                            Review Chart
                          </button>
                          <button
                            className="follow-up-btn"
                            onClick={() => {
                              const note = window.prompt("Reason for follow-up/reschedule:");
                              if (note !== null) {
                                api.updateAppointment(appt.id, { status: 'Scheduled', notes: note });
                                toast.success("Marked for follow-up.");
                              }
                            }}
                            style={{ backgroundColor: '#9b59b6', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer' }}
                          >
                            Follow-up
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'patients' && (
        <div className="appointments-card animation-fade-in">
          <h2 className="appointments-title" style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>Walk-In Patients</h2>
          <table className="appointments-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Patient Name</th>
                <th>Concern / Notes</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {walkInPatients.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '2rem' }}>
                    No walk-in patients found for {new Date(selectedDate).toLocaleDateString()}.
                  </td>
                </tr>
              ) : (
                walkInPatients.map((entry) => {
                  const patientName = patients.find((p) => Number(p.id) === Number(entry.patient_id))?.name
                    || patients.find((p) => Number(p.id) === Number(entry.patient_id))?.full_name
                    || entry.full_name
                    || 'Unknown Patient';

                  const queueTime = entry.time_added || entry.checkedInTime;
                  const formattedTime = queueTime
                    ? new Date(String(queueTime).replace(' ', 'T')).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : 'N/A';

                  // If this walk-in has an appointment_id, we can potentially approve it
                  const linkedAppt = entry.appointment_id ? allAppointments.find(a => a.id === entry.appointment_id) : null;
                  const canDecide = linkedAppt && canDecideAppointment(linkedAppt);

                  return (
                    <tr key={entry.id}>
                      <td style={{ fontWeight: 'bold' }}>{formattedTime}</td>
                      <td className="patient-name-cell">{patientName}</td>
                      <td>{entry.notes || 'Walk-in consultation'}</td>
                      <td>
                        <span className={`appt-status-badge ${entry.status?.toLowerCase() || 'scheduled'}`}>
                          {entry.status || 'Waiting'}
                        </span>
                      </td>
                      <td>
                        <div className="appt-action-group">
                          {canDecide ? (
                            <>
                              <button
                                className="decision-btn approve-btn"
                                onClick={() => handleApprove(linkedAppt.id)}
                                disabled={isDecisionBusy(linkedAppt.id, 'approve') || isDecisionBusy(linkedAppt.id, 'decline')}
                                style={{ backgroundColor: '#2ecc71', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', marginRight: '5px' }}
                              >
                                {isDecisionBusy(linkedAppt.id, 'approve') ? 'Approving...' : 'Approve'}
                              </button>
                            </>
                          ) : null}
                          <button
                            className="review-chart-btn"
                            onClick={() => navigate(`/patients/${entry.patient_id}`)}
                            style={{ backgroundColor: '#3498db', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer' }}
                          >
                            Review Chart
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default DentistAppointments;