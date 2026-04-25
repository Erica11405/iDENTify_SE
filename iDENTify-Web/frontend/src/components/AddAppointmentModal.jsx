import React, { useState, useMemo, useEffect } from "react";
import toast from "react-hot-toast";
import "../styles/components/AddWalkInModal.css"; 
import api from "../api/apiClient";
import useAppStore from "../store/useAppStore";

// --- HELPERS ---
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

function computeAgeFromBirthdate(value) {
  if (!value) return "";

  const dob = new Date(value);
  if (Number.isNaN(dob.getTime())) return "";

  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age -= 1;
  }

  return age >= 0 ? String(age) : "";
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// --- COMPONENT ---
function AddAppointmentModal({ isOpen, onClose, dentists = [], onSave }) {
  const user = useAppStore(state => state.user);
  
  // Filter dentists to only those in the same branch as the aide (if aide is scoped)
  const filteredDentists = useMemo(() => {
    return dentists.filter(d => {
        const isStaff = d.specialization !== 'Dental Aide' && d.role !== 'aide';
        if (!isStaff) return false;
        
        // If user (aide) has a branch, only show dentists in that branch
        if (user?.branch_id && d.branch_id) {
            return Number(d.branch_id) === Number(user.branch_id);
        }
        return true;
    });
  }, [dentists, user?.branch_id]);

  // 1. PATIENT TOGGLE & SEARCH STATE
  const patientType = "old"; 

  // Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  const [form, setForm] = useState({
    patient_id: null, 
    first_name: "",
    last_name: "",
    middle_name: "",
    patient_name: "",
    contact_number: "",
    birthdate: "",
    age: "",
    sex: "",
    street: "",
    barangay: "",
    city: "",
    province: "",
    dentist_id: "", 
    appointmentDate: getLocalToday(),
    timeStart: "",
    notes: "",
    status: "Scheduled",
  });

  const [selectedServices, setSelectedServices] = useState([]);
  const [currentService, setCurrentService] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [availableServices, setAvailableServices] = useState([]);

  // Fetch Dynamic Services from Database
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

  // 2. AVAILABILITY & SLOTS STATE
  const [availability, setAvailability] = useState({ count: 0, limit: 5, isFull: false, checked: false });
  const [appointments, setAppointments] = useState([]);
  const [generatedSlots, setGeneratedSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);

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

  // Dynamic Age Calculation
  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      age: computeAgeFromBirthdate(form.birthdate),
    }));
  }, [form.birthdate]);

  // 3. FETCH APPOINTMENTS WHEN DENTIST/DATE CHANGES
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

        if (form.appointmentDate) {
          const res = await api.checkAppointmentLimit(form.dentist_id, form.appointmentDate);
          setAvailability({ ...res, checked: true });
        }
      } catch (err) {
        console.error("Error loading schedule", err);
      } finally {
        setSlotsLoading(false);
      }
    };

    loadScheduleData();
  }, [form.dentist_id, form.appointmentDate]);

  // 4. GENERATE TIME SLOTS LOGIC
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

    // Is it a working day?
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

      let aDate;
      if (a.appointment_datetime.includes("T")) {
        const d = new Date(a.appointment_datetime);
        aDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      } else {
        aDate = a.appointment_datetime.split(" ")[0];
      }
      return aDate === form.appointmentDate;

    }).map(a => {
      const startDate = new Date(String(a.appointment_datetime).replace(" ", "T"));
      if (Number.isNaN(startDate.getTime())) return { start: -1, end: -1 };

      const startMins = startDate.getHours() * 60 + startDate.getMinutes();

      let endMins = startMins + 30;
      if (a.end_datetime) {
        const endDate = new Date(String(a.end_datetime).replace(" ", "T"));
        if (!Number.isNaN(endDate.getTime())) {
          endMins = endDate.getHours() * 60 + endDate.getMinutes();
        }
      }

      if (endMins <= startMins) {
        endMins = startMins + 30;
      }

      return { start: startMins, end: endMins };
    });

    for (let time = startMin; time < endMin; time += 30) {
      const h = Math.floor(time / 60);
      const m = time % 60;
      const slotEnd = time + selectedDurationMinutes;

      let type = 'open';
      const timeStr24 = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      const label = formatTime12Hour(timeStr24);

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
      slots.push({ value: timeStr24, label, type });
    }
    setGeneratedSlots(slots);
  }, [selectedDentist, form.appointmentDate, appointments, selectedDurationMinutes]);

  // HANDLERS
  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const data = await api.searchPatients(searchQuery);
      setSearchResults(data);
      if (data.length === 0) toast.error("No patient found.");
    } catch (error) {
      console.error(error);
      toast.error("Search failed.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectOldPatient = (p) => {
    const normalizedBirthdate = p.birthdate ? p.birthdate.split('T')[0] : "";

    setForm(prev => ({
      ...prev,
      patient_id: p.id,
      patient_name: p.full_name || "",
      first_name: p.first_name || p.full_name || "",
      middle_name: p.middle_name || "",
      last_name: p.last_name || "",
      contact_number: p.contact_number || "", 
      sex: p.gender || p.sex || "",           
      birthdate: normalizedBirthdate,
      age: computeAgeFromBirthdate(normalizedBirthdate),
      notes: prev.notes || ""
    }));
    setSearchResults([]);
    setSearchQuery("");
    toast.success("Patient selected");
  };

  const handleAddService = () => {
    if (!currentService) return;
    if (selectedServices.includes(currentService)) {
      toast.error("Service already selected");
      return;
    }
    setSelectedServices([...selectedServices, currentService]);
    setCurrentService("");
  };

  const handleRemoveService = (serviceToRemove) => {
    setSelectedServices(selectedServices.filter(s => s !== serviceToRemove));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (availability.isFull) return toast.error("Daily limit reached.");

    // ADDED: Strict check to ensure an old patient was actually selected
    if (!form.patient_name || !form.patient_id) return toast.error("Please search and select an existing patient.");

    if (!form.dentist_id) return toast.error("Please select a dentist.");
    if (!form.appointmentDate) return toast.error("Please select a date.");
    if (!form.timeStart) return toast.error("Please select a time slot.");
    if (selectedServices.length === 0) return toast.error("Please select at least one procedure/service.");

    setIsSaving(true);
    try {
      const fullTimeStart = `${form.appointmentDate} ${formatTime12Hour(form.timeStart)}`;
      const procedureString = selectedServices.join(", ");

      await onSave({
        ...form,
        patient_name: form.patient_name,
        procedure: procedureString,
        services: selectedServices,
        estimated_duration_minutes: selectedDurationMinutes,
        dentist_id: Number(form.dentist_id),
        timeStart: fullTimeStart,
        isNewPatient: false
      });
      setSelectedServices([]);
    } catch (error) {
      console.error(error);
      const msg = error.body?.message || "Failed to save appointment.";
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: '600px', width: '100%' }}>
        <h2>Add Appointment</h2>

        {/* --- SEARCH SECTION --- */}
        <div style={{ marginBottom: '20px', padding: '15px', background: '#f0f9ff', borderRadius: '8px', border: '1px solid #bae6fd' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              placeholder="Search existing patient name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
            />
            <button type="button" onClick={handleSearch} disabled={isSearching} style={{ padding: '8px 15px', background: '#0ea5e9', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
              {isSearching ? '...' : 'Search'}
            </button>
          </div>
          {searchResults.length > 0 && (
            <ul style={{ maxHeight: '150px', overflowY: 'auto', marginTop: '10px', background: 'white', border: '1px solid #eee', listStyle: 'none', padding: 0 }}>
              {searchResults.map(p => (
                <li
                  key={p.id}
                  onClick={() => handleSelectOldPatient(p)}
                  style={{ padding: '8px', borderBottom: '1px solid #f1f1f1', cursor: 'pointer', fontSize: '0.9rem' }}
                  onMouseOver={(e) => e.currentTarget.style.background = '#f8fafc'}
                  onMouseOut={(e) => e.currentTarget.style.background = 'white'}
                >
                  <strong>{p.full_name}</strong> <span style={{ color: '#666' }}>(Born: {p.birthdate ? p.birthdate.split('T')[0] : 'N/A'})</span>
                </li>
              ))}
            </ul>
          )}
          {form.patient_name && (
            <div style={{ marginTop: '10px', color: '#059669', fontWeight: 'bold' }}>
              Selected: {form.patient_name}
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit}>
          {/* --- SPLIT NAME INPUTS --- */}
          <div className="form-group-row" style={{ display: 'flex', gap: '10px' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label>First Name *</label>
              <input name="first_name" type="text" placeholder="First Name" value={form.first_name} onChange={handleChange} readOnly={patientType === "old"} style={patientType === "old" ? { backgroundColor: '#f1f5f9', color: '#64748b', cursor: 'not-allowed' } : {}} />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Middle Name</label>
              <input name="middle_name" type="text" placeholder="Middle Name" value={form.middle_name} onChange={handleChange} readOnly={patientType === "old"} style={patientType === "old" ? { backgroundColor: '#f1f5f9', color: '#64748b', cursor: 'not-allowed' } : {}} />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Last Name *</label>
              <input name="last_name" type="text" placeholder="Last Name" value={form.last_name} onChange={handleChange} readOnly={patientType === "old"} style={patientType === "old" ? { backgroundColor: '#f1f5f9', color: '#64748b', cursor: 'not-allowed' } : {}} />
            </div>
          </div>

          {/* --- BIRTHDAY & AUTO-AGE --- */}
          <div className="form-group-row" style={{ display: 'flex', gap: '10px' }}>
            <div className="form-group" style={{ flex: 2 }}>
              <label>Date of Birth</label>
              <input name="birthdate" type="date" value={form.birthdate} onChange={handleChange} readOnly={patientType === "old"} style={patientType === "old" ? { backgroundColor: '#f1f5f9', color: '#64748b', cursor: 'not-allowed' } : {}} />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Age (Auto)</label>
              <input name="age" type="number" value={form.age} readOnly style={{ backgroundColor: '#f1f5f9', color: '#64748b', cursor: 'not-allowed' }} placeholder="--" />
            </div>
          </div>

          {/* --- SEX & CONTACT NUMBER --- */}
          <div className="form-group-row" style={{ display: 'flex', gap: '10px' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Sex</label>
              <select name="sex" value={form.sex || ""} onChange={handleChange} disabled={patientType === "old"} style={patientType === "old" ? { backgroundColor: '#f1f5f9', color: '#64748b', cursor: 'not-allowed' } : {}}>
                <option value="">Select Sex</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Contact Number</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ padding: '10px', background: '#e2e8f0', borderRadius: '4px', color: '#64748b', fontSize: '0.9rem' }}>+63</span>
                <input name="contact_number" type="text" value={form.contact_number} onChange={handleChange} placeholder="9123456789" readOnly={patientType === "old"} style={{ flex: 1, ...(patientType === "old" ? { backgroundColor: '#f1f5f9', color: '#64748b', cursor: 'not-allowed' } : {}) }} />
              </div>
            </div>
          </div>

          {/* --- DENTIST & DATE --- */}
          <div className="form-group-row" style={{ display: 'flex', gap: '10px' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Dentist</label>
              <select name="dentist_id" value={form.dentist_id || ""} onChange={handleChange}>
                <option value="">Select dentist</option>
                {filteredDentists.map((d) => (
                  <option key={d.id} value={d.id} disabled={d.status === "Off"}>
                    {d.name} {d.status === "Off" ? "(Off)" : d.status === "Busy" ? "(Busy)" : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Appointment Date</label>
              <input type="date" name="appointmentDate" value={form.appointmentDate} onChange={handleChange} />
            </div>
          </div>

          {/* --- TIME SLOTS --- */}
          <div className="form-group">
            <label>Available Slots</label>
            <div style={{ display: 'flex', gap: '15px', fontSize: '0.8rem', marginBottom: '8px', color: '#64748b' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{ width: 8, height: 8, background: 'white', border: '1px solid #ccc', borderRadius: '50%' }}></div> Open</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{ width: 8, height: 8, background: '#0ea5e9', borderRadius: '50%' }}></div> Selected</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{ width: 8, height: 8, background: '#f1f5f9', borderRadius: '50%' }}></div> Booked/Past</span>
            </div>

            {slotsLoading ? (
              <div style={{ textAlign: 'center', padding: '10px', color: '#64748b' }}>Loading schedule...</div>
            ) : availability.isFull ? (
              <div style={{ padding: '10px', background: '#fee2e2', color: '#991b1b', borderRadius: '6px', textAlign: 'center' }}>
                ⚠️ Daily Limit Reached. Cannot book online slots.
              </div>
            ) : generatedSlots.length === 0 ? (
              <div style={{ padding: '10px', background: '#f8fafc', color: '#64748b', borderRadius: '6px', textAlign: 'center' }}>
                No slots available.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '10px', maxHeight: '200px', overflowY: 'auto', padding: '4px' }}>
                {generatedSlots.map((slot) => {
                  const isDisabled = slot.type !== 'open';
                  const isSelected = form.timeStart === slot.value;
                  let bg = 'white'; let color = '#334155'; let border = '1px solid #e2e8f0'; let cursor = 'pointer';

                  if (isSelected) { bg = '#0ea5e9'; color = 'white'; border = '1px solid #0284c7'; }
                  else if (isDisabled) {
                    bg = '#f1f5f9'; color = '#cbd5e1'; cursor = 'not-allowed';
                    if (slot.type === 'lunch' || slot.type === 'break') { color = '#d97706'; bg = '#fffbeb'; border = '1px solid #fcd34d'; }
                  }

                  return (
                    <button
                      key={slot.value} type="button" disabled={isDisabled}
                      onClick={() => setForm(prev => ({ ...prev, timeStart: slot.value }))}
                      style={{ padding: '8px 4px', borderRadius: '6px', backgroundColor: bg, color: color, border: border, cursor: cursor, fontSize: '0.85rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
                    >
                      <span>{slot.label.split(' ')[0]}</span>
                      <span style={{ fontSize: '0.7rem' }}>{slot.label.split(' ')[1]}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* --- PROCEDURES --- */}
          <div className="form-group">
            <label>Procedures / Services</label>
            <div className="service-input-group">
              <select value={currentService} onChange={(e) => setCurrentService(e.target.value)}>
                <option value="">Select a service...</option>
                {availableServices.map((service) => (
                  <option key={service.id} value={service.name}>
                    {service.name} (₱{service.min_price} - ₱{service.max_price})
                  </option>
                ))}
              </select>
              <button type="button" className="add-service-btn" onClick={handleAddService}>+</button>
            </div>
            <div className="selected-services-container">
              {selectedServices.length === 0 && <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '0.9rem' }}>No services selected</span>}
              {selectedServices.map((service) => (
                <span key={service} className="service-chip">
                  {service} <button type="button" className="remove-service-btn" onClick={() => handleRemoveService(service)}>×</button>
                </span>
              ))}
            </div>
          </div>

          {/* --- NOTES --- */}
          <div className="form-group">
            <label>Notes</label>
            <textarea name="notes" value={form.notes} onChange={handleChange} rows={3} placeholder="Add any specific notes here..." />
          </div>

          {/* --- ACTIONS --- */}
          <div className="form-actions">
            <button type="button" onClick={onClose}>Cancel</button>
            <button
              type="submit"
              disabled={isSaving || availability.isFull || !form.timeStart}
              style={(availability.isFull || !form.timeStart) ? { backgroundColor: '#9ca3af', cursor: 'not-allowed' } : {}}
            >
              {isSaving ? "Adding..." : availability.isFull ? "Limit Reached" : "Add Appointment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddAppointmentModal;