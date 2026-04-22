import React, { useState, useMemo, useEffect } from "react";
import toast from "react-hot-toast";
import "../styles/components/EditAppointmentModal.css"; 
import api from "../api/apiClient";

function formatTime12Hour(time24) {
  if (!time24) return "";
  const [hours, minutes] = time24.split(":");
  let h = parseInt(hours, 10);
  const m = parseInt(minutes, 10);
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12;
  h = h ? h : 12;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")} ${ampm}`;
}

function toMinutes24(timeString) {
  if (!timeString) return 0;
  const [hours, minutes] = timeString.split(":").map(Number);
  return hours * 60 + minutes;
}

function parseDurationMinutes(value) {
  const parsed = Number.parseInt(String(value || ""), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return 30;
  return parsed;
}

function getLocalToday() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function FollowUpModal({ isOpen, onClose, patient, dentists = [], onSave }) {
  const [form, setForm] = useState({
    dentist_id: "", 
    appointmentDate: getLocalToday(),
    timeStart: "",
    notes: "Follow-up",
  });

  const [selectedServices, setSelectedServices] = useState([]);
  const [currentService, setCurrentService] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [availableServices, setAvailableServices] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [generatedSlots, setGeneratedSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const data = await api.getServices();
        setAvailableServices(data);
      } catch (error) {
        console.error("Failed to fetch dynamic services", error);
      }
    };
    if (isOpen) {
        fetchServices();
    }
  }, [isOpen]);

  const selectedDentist = useMemo(() => {
    return dentists.find(d => String(d.id) === String(form.dentist_id));
  }, [dentists, form.dentist_id]);

  const selectedDurationMinutes = useMemo(() => {
    if (!selectedServices.length) return 30;
    const durationByService = new Map(
      availableServices.map((service) => [
        String(service?.name || "").trim().toLowerCase(),
        parseDurationMinutes(service?.estimated_duration),
      ])
    );
    return selectedServices.reduce((total, serviceName) => {
      const key = String(serviceName || "").trim().toLowerCase();
      return total + (durationByService.get(key) || 30);
    }, 0);
  }, [selectedServices, availableServices]);

  useEffect(() => {
    if (!form.dentist_id) return;
    const loadScheduleData = async () => {
      setSlotsLoading(true);
      try {
        const allAppts = await api.getAppointments();
        const dentistAppts = allAppts.filter(a =>
          String(a.dentist_id) === String(form.dentist_id) &&
          a.status !== 'Cancelled'
        );
        setAppointments(dentistAppts);
      } catch (err) {
        console.error("Error loading schedule", err);
      } finally {
        setSlotsLoading(false);
      }
    };
    loadScheduleData();
  }, [form.dentist_id, form.appointmentDate]);

  useEffect(() => {
    if (!selectedDentist || !form.appointmentDate) {
      setGeneratedSlots([]);
      return;
    }
    const slots = [];
    const operatingStart = selectedDentist.operatingHours?.start || "09:00";
    const operatingEnd = selectedDentist.operatingHours?.end || "17:00";
    const startMin = toMinutes24(operatingStart);
    const endMin = toMinutes24(operatingEnd);
    const dateObj = new Date(form.appointmentDate);
    const dayIndex = dateObj.getDay();
    const worksToday = selectedDentist.days?.includes(dayIndex);
    const isOnLeave = selectedDentist.leaveDays?.includes(form.appointmentDate);
    const isOff = selectedDentist.status === 'Off';

    if (!worksToday || isOnLeave || isOff) {
      setGeneratedSlots([]);
      return;
    }

    const now = new Date();
    const isToday = form.appointmentDate === getLocalToday();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const dayAppts = appointments.filter(a => {
      if (!a.appointment_datetime) return false;
      const aDate = a.appointment_datetime.split('T')[0].split(' ')[0];
      return aDate === form.appointmentDate;
    }).map(a => {
      const startDate = new Date(String(a.appointment_datetime).replace(" ", "T"));
      const startMins = startDate.getHours() * 60 + startDate.getMinutes();
      let endMins = startMins + 30;
      if (a.end_datetime) {
        const endDate = new Date(String(a.end_datetime).replace(" ", "T"));
        if (!Number.isNaN(endDate.getTime())) endMins = endDate.getHours() * 60 + endDate.getMinutes();
      }
      return { start: startMins, end: endMins };
    });

    for (let time = startMin; time < endMin; time += 30) {
      const h = Math.floor(time / 60);
      const m = time % 60;
      const slotEnd = time + selectedDurationMinutes;
      let type = 'open';
      const timeStr24 = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      if (selectedDentist.lunch) {
        const lStart = toMinutes24(selectedDentist.lunch.start);
        const lEnd = toMinutes24(selectedDentist.lunch.end);
        if (time < lEnd && slotEnd > lStart) type = 'lunch';
      }
      if (type === 'open' && selectedDentist.breaks) {
        for (let b of selectedDentist.breaks) {
          const bStart = toMinutes24(b.start);
          const bEnd = toMinutes24(b.end);
          if (time < bEnd && slotEnd > bStart) { type = 'break'; break; }
        }
      }
      if (type === 'open' && isToday && time <= currentMinutes) type = 'past';
      if (type === 'open' && slotEnd > endMin) type = 'booked';
      if (type === 'open') {
        for (let appt of dayAppts) {
          if (time < appt.end && slotEnd > appt.start) { type = 'booked'; break; }
        }
      }
      slots.push({ value: timeStr24, label: formatTime12Hour(timeStr24), type });
    }
    setGeneratedSlots(slots);
  }, [selectedDentist, form.appointmentDate, appointments, selectedDurationMinutes]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddService = () => {
    if (!currentService) return;
    if (selectedServices.includes(currentService)) return toast.error("Already selected");
    setSelectedServices([...selectedServices, currentService]);
    setCurrentService("");
  };

  const handleRemoveService = (s) => setSelectedServices(selectedServices.filter(item => item !== s));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.dentist_id || !form.appointmentDate || !form.timeStart || selectedServices.length === 0) {
      return toast.error("Please fill all required fields.");
    }
    setIsSaving(true);
    try {
      const fullTimeStart = `${form.appointmentDate} ${formatTime12Hour(form.timeStart)}`;
      await onSave({
        ...form,
        patient_id: patient.id,
        patient_name: patient.name || patient.full_name,
        procedure: selectedServices.join(", "),
        services: selectedServices,
        estimated_duration_minutes: selectedDurationMinutes,
        dentist_id: Number(form.dentist_id),
        timeStart: fullTimeStart,
      });
      onClose();
    } catch (error) {
      toast.error("Failed to schedule follow-up.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '600px' }}>
        <h2>Schedule Follow-up</h2>
        <div className="form-grid">
          <div className="form-group full-width">
            <label>Patient Information (Read-only)</label>
            <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
              <p><strong>Name:</strong> {patient?.name || patient?.full_name}</p>
              <p><strong>Contact:</strong> {patient?.contact || patient?.contact_number || 'N/A'}</p>
            </div>
          </div>

          <div className="form-group full-width">
            <label>Dentist</label>
            <select name="dentist_id" value={form.dentist_id} onChange={handleChange}>
              <option value="">Select Dentist</option>
              {dentists.filter(d => d.specialization !== 'Dental Aide').map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group full-width">
            <label>Follow-up Date</label>
            <input type="date" name="appointmentDate" value={form.appointmentDate} onChange={handleChange} />
          </div>

          <div className="form-group full-width">
            <label>Time Slot</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '8px', maxHeight: '150px', overflowY: 'auto' }}>
              {generatedSlots.map(slot => (
                <button
                  key={slot.value}
                  type="button"
                  disabled={slot.type !== 'open'}
                  onClick={() => setForm(prev => ({ ...prev, timeStart: slot.value }))}
                  style={{
                    padding: '8px 4px',
                    borderRadius: '4px',
                    background: form.timeStart === slot.value ? '#0ea5e9' : slot.type !== 'open' ? '#f1f5f9' : 'white',
                    color: form.timeStart === slot.value ? 'white' : '#334155',
                    border: '1px solid #e2e8f0',
                    cursor: slot.type === 'open' ? 'pointer' : 'not-allowed',
                    fontSize: '0.8rem'
                  }}
                >
                  {slot.label}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group full-width">
            <label>Services</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <select value={currentService} onChange={e => setCurrentService(e.target.value)} style={{ flex: 1 }}>
                <option value="">Select Service</option>
                {availableServices.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
              </select>
              <button type="button" onClick={handleAddService} style={{ padding: '0 15px', background: '#0ea5e9', color: 'white', borderRadius: '4px' }}>+</button>
            </div>
            <div style={{ marginTop: '8px' }}>
              {selectedServices.map(s => (
                <span key={s} style={{ display: 'inline-block', background: '#e2e8f0', padding: '2px 8px', borderRadius: '12px', marginRight: '5px', fontSize: '0.8rem' }}>
                  {s} <button type="button" onClick={() => handleRemoveService(s)} style={{ border: 'none', background: 'none', cursor: 'pointer' }}>×</button>
                </span>
              ))}
            </div>
          </div>

          <div className="form-group full-width">
            <label>Notes</label>
            <textarea name="notes" value={form.notes} onChange={handleChange} rows="2"></textarea>
          </div>
        </div>

        <div className="modal-actions">
          <button type="button" onClick={onClose}>Cancel</button>
          <button type="button" onClick={handleSubmit} disabled={isSaving} style={{ background: '#0ea5e9', color: 'white' }}>
            {isSaving ? "Scheduling..." : "Schedule Follow-up"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default FollowUpModal;