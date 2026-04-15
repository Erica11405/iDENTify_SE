import React, { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import "../../styles/pages/aide/Appointments.css";
import EditAppointmentModal from "../../components/EditAppointmentModal";
import AddAppointmentModal from "../../components/AddAppointmentModal";
import StatusBadge from "../../components/StatusBadge";
import ConfirmationModal from "../../components/ConfirmationModal";
import useAppStore from "../../store/useAppStore";
import useApi from "../../hooks/useApi";

function toMinutes(timeString) {
  if (!timeString) return 0;
  const [time, meridiem] = timeString.split(" ");
  if (!time || !meridiem) return 0;
  const [hourStr, minuteStr] = time.split(":");
  let hour = Number(hourStr);
  const minute = Number(minuteStr);
  if (meridiem === "PM" && hour !== 12) hour += 12;
  if (meridiem === "AM" && hour === 12) hour = 0;
  return hour * 60 + minute;
}

function toSqlDateTime(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  const safeDate = Number.isNaN(date.getTime()) ? new Date() : date;
  const pad = (n) => String(n).padStart(2, "0");

  return `${safeDate.getFullYear()}-${pad(safeDate.getMonth() + 1)}-${pad(safeDate.getDate())} ${pad(safeDate.getHours())}:${pad(safeDate.getMinutes())}:${pad(safeDate.getSeconds())}`;
}

function Appointments() {
  const api = useApi();
  const navigate = useNavigate();

  const [selectedDate, setSelectedDate] = useState(new Date().toLocaleDateString('en-CA'));

  useEffect(() => {
    const loadData = async () => {
      try {
        await Promise.all([
          api.loadAppointments(),
          api.loadPatients(),
          api.loadDentists(),
          api.loadQueue()
        ]);
      } catch (err) {
        console.error("Error loading appointment data", err);
      }
    };
    loadData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const appointments = useAppStore((state) => state.appointments || []);
  const patients = useAppStore((state) => state.patients || []);
  const dentists = useAppStore((state) => state.dentists || []);
  const queue = useAppStore((state) => state.queue || []);

  const [activeContactId, setActiveContactId] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);

  const [filters, setFilters] = useState({
    dentist: "all",
    status: "Scheduled",
    procedure: "all",
    time: "all",
  });

  const { selectedDateAppointments, tomorrowAppointments } = useMemo(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toLocaleDateString('en-CA'); 

    const filtered = appointments.filter((appt) => {
      const dentistName = dentists.find((d) => d.id === appt.dentist_id)?.name || appt.dentist || "";
      const proc = appt.procedure || appt.reason || "";

      const dentistMatch = filters.dentist === "all" || dentistName === filters.dentist;
      const statusMatch = filters.status === "all" ? true : appt.status === filters.status;
      const procedureMatch = filters.procedure === "all" || proc === filters.procedure;

      let timeMatch = true;
      const startMinutes = toMinutes(appt.timeStart);
      if (filters.time === "morning") timeMatch = startMinutes < 12 * 60;
      if (filters.time === "afternoon") timeMatch = startMinutes >= 12 * 60 && startMinutes < 17 * 60;
      if (filters.time === "evening") timeMatch = startMinutes >= 17 * 60;

      return dentistMatch && statusMatch && procedureMatch && timeMatch;
    });

    return {
      selectedDateAppointments: filtered.filter(a => a.appointment_datetime?.split('T')[0] === selectedDate),
      tomorrowAppointments: filtered.filter(a => a.appointment_datetime?.split('T')[0] === tomorrowStr),
    };
  }, [appointments, dentists, filters, selectedDate]);

  const renderTable = (data, title, { showActions = false, showEdit = true } = {}) => (
    <div className="appointments-section">
      <h3 className="section-subtitle">{title}</h3>
      <div className="appointments-table-container">
        <table className="appointments-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Time</th>
              <th>Patient</th>
              <th>Dentist</th>
              <th>Procedure</th>
              <th>Status</th>
              <th>Notes</th>
              <th>Contact</th>
              {showActions && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr><td colSpan={showActions ? "9" : "8"} style={{ textAlign: "center", padding: "2rem" }}>No appointments found for this day.</td></tr>
            ) : (
              data.map((a) => {
                const s = (a.status || "").toLowerCase().trim();
                const canStart = !["done", "cancelled", "declined", "no-show", "missed"].includes(s);
                const apptDate = a.appointment_datetime ? new Date(a.appointment_datetime).toLocaleDateString() : "-";

                return (
                  <tr key={a.id}>
                    <td>{apptDate}</td>
                    <td className="time-cell">
                      <div style={{ fontWeight: 'bold', fontSize: '1rem' }}>{a.timeStart}</div>
                    </td>
                    <td>{patients.find((p) => p.id === a.patient_id)?.name || a.patient}</td>
                    <td>{dentists.find((d) => d.id === a.dentist_id)?.name || a.dentist}</td>
                    <td><span className="badge badge-neutral">{a.procedure || a.reason}</span></td>
                    <td><StatusBadge status={a.status} /></td>
                    <td><div className="notes-pill">{a.notes}</div></td>
                    <td className="contact-cell">
                      <button type="button" className="contact-button" onClick={() => setActiveContactId((prev) => prev === a.id ? null : a.id)}>📇</button>
                      {activeContactId === a.id && (
                        <div className="contact-popover">
                          <p><strong>Phone:</strong> {patients.find((p) => p.id === a.patient_id)?.contact || a.contact?.phone || ''}</p>
                          <p><strong>Email:</strong> {patients.find((p) => p.id === a.patient_id)?.email || a.contact?.email || ''}</p>
                        </div>
                      )}
                    </td>
                    {showActions && (
                      <td>
                        {showEdit ? <button className="edit-btn" onClick={() => handleEdit(a)}>Edit</button> : null}
                        <button
                          className="start-btn"
                          onClick={() => handleStartTreatment(a)}
                          style={!canStart ? { backgroundColor: '#adb5bd', cursor: 'not-allowed' } : {}}
                          disabled={!canStart}
                        >
                          Start
                        </button>
                        <button className="delete-btn" onClick={() => handleDelete(a)}>Delete</button>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const handleStartTreatment = async (appointment) => {
    let patientId = appointment.patient_id;
    let fullPatientData = patients.find((p) => String(p.id) === String(patientId));

    if (!fullPatientData) {
      toast.error("Patient record is unavailable for this appointment.");
      return;
    }

    try {
      let queueItem = queue.find((item) => String(item.appointment_id) === String(appointment.id));

      // Legacy fallback for appointments created before auto-queue linkage.
      if (!queueItem) {
        const createdQueue = await api.addQueue({
          patient_id: patientId,
          appointment_id: appointment.id,
          dentist_id: appointment.dentist_id || null,
          source: "appointment",
          status: "Checked-In",
          notes: appointment.procedure || appointment.reason || "",
          time_added: toSqlDateTime(),
        });

        if (api.loadQueue) await api.loadQueue();
        queueItem = createdQueue || null;
      }

      const queueStatus = String(queueItem?.status || "").trim().toLowerCase();
      if (queueItem?.id && ["scheduled", "waiting"].includes(queueStatus)) {
        const updatedQueueItem = await api.updateQueueItem(queueItem.id, { status: "Checked-In" });
        queueItem = updatedQueueItem?.id
          ? updatedQueueItem
          : { ...queueItem, status: "Checked-In" };
      }

      const assignedDentistName = dentists.find((d) => String(d.id) === String(appointment.dentist_id))?.name || "Unassigned";

      navigate(`/patients/${patientId}`, {
        state: {
          dentistId: appointment.dentist_id || queueItem?.dentist_id || null,
          assignedDentistName,
          status: queueItem?.status || "Checked-In",
          patientData: fullPatientData,
          queueId: queueItem?.id || null,
          appointment: {
            ...appointment,
            appointment_id: appointment.id,
            queue_id: queueItem?.id || null,
            procedure: appointment.procedure || appointment.reason || "",
          },
        },
      });
    } catch {
      toast.error("Failed to start appointment workflow.");
    }
  };

  const handleFilterChange = (key, value) => setFilters((prev) => ({ ...prev, [key]: value }));
  const handleEdit = (appointment) => { setSelectedAppointment(appointment); setIsEditModalOpen(true); };
  const handleDelete = (appointment) => { setSelectedAppointment(appointment); setIsDeleteModalOpen(true); };
  const handleCloseModal = () => { setSelectedAppointment(null); setIsEditModalOpen(false); setIsDeleteModalOpen(false); };

  const handleSaveAppointment = async (updatedAppointment) => {
    try {
      await api.updateAppointment(updatedAppointment.id, updatedAppointment);
      toast.success("Updated successfully.");
      handleCloseModal();
      api.loadAppointments();
    } catch (err) { console.error(err); }
  };

  const handleConfirmDelete = async () => {
    try {
      await api.removeAppointment(selectedAppointment.id);
      toast.success("Deleted.");
      handleCloseModal();
      api.loadAppointments();
    } catch (err) { console.error(err); }
  };

  const handleAddAppointment = async (data) => {
    try {
      let finalPatientId = data.patient_id;

      if (data.isNewPatient || !finalPatientId) {
        const newPatientRes = await api.createPatient({
          first_name: data.first_name,
          last_name: data.last_name,
          middle_name: data.middle_name,
          birthdate: data.birthdate,
          gender: data.sex, 
          contact_number: data.contact_number,
          email: data.email || "",
          address: "Update profile" 
        });
        
        finalPatientId = newPatientRes.id || newPatientRes.data?.id || newPatientRes.patientId; 
      }

      if (!finalPatientId) throw new Error("Failed to resolve patient ID.");

      await api.createAppointment({
        ...data,
        patient_id: finalPatientId
      });

      toast.success(data.isNewPatient ? "New patient and appointment added!" : "Appointment scheduled for existing patient.");
      setIsAddModalOpen(false);
      await api.loadAppointments();
      await api.loadQueue();
      if (data.isNewPatient) {
        await api.loadPatients();
      }
    } catch (err) { 
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to add appointment."); 
    }
  };

  return (
    <div className="appointments-page">
      <div className="appointments-header">
        <h2 className="appointments-title">Schedule</h2>
        <div className="appointments-actions">
          <button className="quick-action-btn" onClick={() => setIsAddModalOpen(true)}>Add Appointment</button>
        </div>
      </div>

      <div className="appointments-filters">
        <div className="filter-group">
          <label>Dentist</label>
          <select value={filters.dentist} onChange={(e) => handleFilterChange("dentist", e.target.value)}>
            <option value="all">All</option>
            {dentists
              .filter(d => d.specialization !== 'Dental Aide' && d.role !== 'aide')
              .map((d) => (<option key={d.id} value={d.name}>{d.name}</option>))}
          </select>
        </div>
        
        <div className="filter-group">
          <label>Status</label>
          <select value={filters.status} onChange={(e) => handleFilterChange("status", e.target.value)}>
            <option value="all">All</option>
            <option value="Scheduled">Scheduled</option>
            <option value="Checked-In">Checked-In</option>
            <option value="Done">Done</option>
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="date-picker">Date</label>
          <input 
            id="date-picker"
            type="date" 
            value={selectedDate} 
            onChange={(e) => setSelectedDate(e.target.value)}
            className="date-input"
          />
        </div>
      </div>

      <div className="appointments-legend">
        <StatusBadge status="Scheduled" /><StatusBadge status="Checked-In" /><StatusBadge status="Done" />
      </div>

      {renderTable(selectedDateAppointments, `Appointments for ${new Date(selectedDate).toLocaleDateString()}`, {
        showActions: true,
        showEdit: false,
      })}
      
      <hr style={{ margin: '3rem 0', border: 'none', borderTop: '2px dashed #e2e8f0' }} />
      
      {renderTable(tomorrowAppointments, "Tomorrow's Preview", { showActions: false })}

      {isEditModalOpen && <EditAppointmentModal appointment={selectedAppointment} onSave={handleSaveAppointment} onCancel={handleCloseModal} dentists={dentists} />}
      {isAddModalOpen && <AddAppointmentModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} dentists={dentists} onSave={handleAddAppointment} />}
      {isDeleteModalOpen && <ConfirmationModal isOpen={isDeleteModalOpen} onClose={handleCloseModal} onConfirm={handleConfirmDelete} message="Delete appointment?" />}
    </div>
  );
}

export default Appointments;