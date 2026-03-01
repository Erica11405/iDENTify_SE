import React, { useEffect, useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import apiClient from "../api/apiClient";
import useApi from "../hooks/useApi";
import useAppStore from "../store/useAppStore";
import "../styles/pages/Reports.css";

function Reports() {
  const api = useApi();
  const reports = useAppStore((state) => state.reports);
  const { dailySummary, dentistPerformance } = reports || {};
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Modal and Patient Data States
  const [patientsModalOpen, setPatientsModalOpen] = useState(false);
  const [selectedDentist, setSelectedDentist] = useState(null);
  const [dentistPatients, setDentistPatients] = useState([]);
  const [patientsLoading, setPatientsLoading] = useState(false);
  const [patientsError, setPatientsError] = useState(null);

  useEffect(() => {
    const dateStr = selectedDate.toISOString().split('T')[0];
    api.loadReports(dateStr).catch(err => console.error("Load reports failed", err));
  }, [selectedDate, api]);

  const hasData = dailySummary && dentistPerformance;

  const formatApptTime = (value) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  const openDentistPatients = async (dentist) => {
    setSelectedDentist(dentist);
    setPatientsModalOpen(true);
    setPatientsLoading(true);
    setPatientsError(null);
    setDentistPatients([]);

    const dateStr = selectedDate.toISOString().split('T')[0];
    try {
      const data = await apiClient.getDentistPatientsForReport(dentist.id, dateStr);
      setDentistPatients(data?.patients || []);
    } catch (err) {
      setPatientsError("Failed to load records.");
    } finally {
      setPatientsLoading(false);
    }
  };

  const closePatientsModal = () => {
    setPatientsModalOpen(false);
    setSelectedDentist(null);
    setDentistPatients([]);
  };

  return (
    <div className="reports-page">
      <div className="reports-header">
        <h2 className="reports-title">Reports</h2>
        <div className="date-picker-container">
          <span className="small-label">Select Date</span>
          <DatePicker
            selected={selectedDate}
            onChange={date => setSelectedDate(date)}
            className="datepicker-input"
            dateFormat="MMMM d, yyyy"
          />
        </div>
      </div>

      {!api.loading && hasData && (
        <>
          <div className="report-section">
            <h3 className="report-subtitle">Daily Summary ({selectedDate.toLocaleDateString()})</h3>
            <table className="report-table">
              <thead>
                <tr><th>Metric</th><th>Value</th></tr>
              </thead>
              <tbody>
                <tr><td>Patients Seen (Done)</td><td>{dailySummary.patientsSeen}</td></tr>
                <tr><td>Procedures Completed</td><td>{dailySummary.proceduresDone}</td></tr>
                <tr><td>New Patients Registered</td><td>{dailySummary.newPatients}</td></tr>
                <tr><td>Avg. Treatment Duration</td><td>{dailySummary.avgTreatmentDuration}</td></tr>
              </tbody>
            </table>
          </div>

          <div className="report-section">
            <h3 className="report-subtitle">Dentist Performance</h3>
            <table className="report-table">
              <thead>
                <tr>
                  <th>Dentist</th>
                  <th>Patients Handled</th>
                  <th>Avg. Time</th>
                </tr>
              </thead>
              <tbody>
                {dentistPerformance.map((dentist) => (
                  <tr key={dentist.id}>
                    <td>
                      <button type="button" className="dentist-link" onClick={() => openDentistPatients(dentist)}>
                        {dentist.name}
                      </button>
                    </td>
                    <td>{dentist.patientsHandled}</td>
                    <td>{Math.round(dentist.avgTimePerPatient || 0)} min</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Redesigned Modal */}
      {patientsModalOpen && (
        <div className="modal-overlay" onClick={closePatientsModal}>
          <div className="patient-list-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-group">
                <h3>Patients handled by {selectedDentist?.name}</h3>
                <p>{selectedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
              </div>
              <button className="close-x" onClick={closePatientsModal}>&times;</button>
            </div>

            <div className="modal-body">
              {patientsLoading ? (
                <div className="modal-state">Loading patient records...</div>
              ) : patientsError ? (
                <div className="modal-state error">{patientsError}</div>
              ) : dentistPatients.length === 0 ? (
                <div className="modal-state">No patients recorded for this date.</div>
              ) : (
                <div className="patient-grid">
                  <div className="grid-header">
                    <span>Patient Name</span>
                    <span>Time</span>
                    <span>Reason</span>
                  </div>
                  <div className="grid-content">
                    {dentistPatients.map((p, i) => (
                      <div key={i} className="grid-row">
                        <span className="p-name">{p.full_name}</span>
                        <span className="p-time">{formatApptTime(p.appointment_datetime)}</span>
                        <span className="p-reason">{p.reason || "Check-up"}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <div className="modal-footer">
              <button className="close-btn-simple" onClick={closePatientsModal}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Reports;