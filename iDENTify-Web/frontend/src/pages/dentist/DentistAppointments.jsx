import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import useAppStore from "../../store/useAppStore";
import useApi from "../../hooks/useApi";
import "../../styles/pages/dentist/DentistAppointments.css";
import DeclineAppointmentModal from "../../components/DeclineAppointmentModal";
import FollowUpModal from "../../components/FollowUpModal";

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
  const [declineModal, setDeclineModal] = useState({ isOpen: false, appointmentId: null });
  const [followUpModal, setFollowUpModal] = useState({ isOpen: false, patient: null });

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

  const handleDeclineClick = (appointmentId) => {
    setDeclineModal({ isOpen: true, appointmentId });
  };

  const handleConfirmDecline = async (appointmentId, reason) => {
    try {
      setDecisionLoadingId(`decline-${appointmentId}`);
      await api.declineAppointment(appointmentId, { reason });
      toast.success('Appointment declined.');
      setDeclineModal({ isOpen: false, appointmentId: null });
      await Promise.all([api.loadAppointments(), api.loadQueue()]);
    } catch (error) {
      toast.error(error?.message || 'Failed to decline appointment.');
    } finally {
      setDecisionLoadingId(null);
    }
  };

  const [checkingInId, setCheckingInId] = useState(null);

  const handleCheckIn = async (appt) => {
    if (!appt?.id) return;
    try {
      setCheckingInId(appt.id);
      await api.addQueue({
        patient_id: appt.patient_id,
        appointment_id: appt.id,
        dentist_id: appt.dentist_id,
        source: 'appointment',
        status: 'Checked-In',
        notes: appt.procedure || appt.reason || '',
      });
      toast.success('Patient checked in and added to queue.');
      await api.loadQueue();
    } catch (error) {
      toast.error(error?.message || 'Failed to check in.');
    } finally {
      setCheckingInId(null);
    }
  };

  return (
    <div className="appointments-container">
      <div className="appointments-header">
        <h1 className="appointments-title">Dentist Management</h1>
        
        <div className="date-picker-container">
          <label htmlFor="date-picker">Select Date:</label>
          <input 
            id="date-picker"
            type="date" 
            value={selectedDate} 
            onChange={(e) => setSelectedDate(e.target.value)}
            className="date-input"
          />
        </div>
      </div>

      <div className="appointments-tabs">
        <button 
          className={`tab-btn ${activeTab === 'appointments' ? 'active' : ''}`}
          onClick={() => setActiveTab('appointments')}
        >
          Appointments
        </button>
        <button 
          className={`tab-btn ${activeTab === 'patients' ? 'active' : ''}`}
          onClick={() => setActiveTab('patients')}
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
                              >
                                {isDecisionBusy(appt.id, 'approve') ? 'Approving...' : 'Approve'}
                              </button>
                              <button
                                className="decision-btn decline-btn"
                                onClick={() => handleDeclineClick(appt.id)}
                                disabled={isDecisionBusy(appt.id, 'approve') || isDecisionBusy(appt.id, 'decline')}
                              >
                                {isDecisionBusy(appt.id, 'decline') ? 'Declining...' : 'Decline'}
                              </button>
                            </>
                          ) : null}

                          {appt.status === 'Scheduled' && !queue.some(q => q.appointment_id === appt.id) && (
                            <button
                              className="check-in-btn"
                              onClick={() => handleCheckIn(appt)}
                            >
                              Check-In
                            </button>
                          )}

                          <button
                            className="review-chart-btn"
                            onClick={() => navigate(`/patients/${appt.patient_id}`)}
                          >
                            Review Chart
                          </button>
                          <button
                            className="follow-up-btn"
                            onClick={() => {
                              const patientData = patients.find(p => p.id === appt.patient_id) || { id: appt.patient_id, name: appt.patient_name || appt.patient };
                              setFollowUpModal({ isOpen: true, patient: patientData });
                            }}
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
                              >
                                {isDecisionBusy(linkedAppt.id, 'approve') ? 'Approving...' : 'Approve'}
                              </button>
                            </>
                          ) : null}
                          <button
                            className="review-chart-btn"
                            onClick={() => navigate(`/patients/${entry.patient_id}`)}
                          >
                            Review Chart
                          </button>
                          <button
                            className="follow-up-btn"
                            onClick={() => {
                              const patientData = patients.find(p => p.id === entry.patient_id) || { id: entry.patient_id, name: patientName };
                              setFollowUpModal({ isOpen: true, patient: patientData });
                            }}
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

      <DeclineAppointmentModal 
        isOpen={declineModal.isOpen}
        appointmentId={declineModal.appointmentId}
        onClose={() => setDeclineModal({ isOpen: false, appointmentId: null })}
        onConfirm={handleConfirmDecline}
      />

      <FollowUpModal
        isOpen={followUpModal.isOpen}
        patient={followUpModal.patient}
        dentists={dentists}
        onClose={() => setFollowUpModal({ isOpen: false, patient: null })}
        onSave={async (data) => {
          try {
            await api.createAppointment(data);
            toast.success("Follow-up appointment scheduled.");
            api.loadAppointments();
          } catch (err) {
            toast.error("Failed to schedule follow-up.");
          }
        }}
      />
    </div>
  );
}

export default DentistAppointments;