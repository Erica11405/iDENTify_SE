import React, { useEffect, useMemo, useState, useRef } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import "../styles/pages/Dentists.css";
import useAppStore from "../store/useAppStore";
import useApi from "../hooks/useApi";
import toast from "react-hot-toast";
import AddDentistModal from "../components/AddDentistModal";

const DAYS = [
  { label: "S", value: 0 },
  { label: "M", value: 1 },
  { label: "T", value: 2 },
  { label: "W", value: 3 },
  { label: "TH", value: 4 },
  { label: "F", value: 5 },
  { label: "S", value: 6 },
];

function Dentists() {
  const api = useApi();
  const dentists = useAppStore((state) => state.dentists);
  const updateDentistInStore = useAppStore((state) => state.updateDentist);
  const appointments = useAppStore((state) => state.appointments);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [filters, setFilters] = useState({
    specialization: "All",
    availability: "All",
    assigned: "All",
  });

  const [breakDrafts, setBreakDrafts] = useState({});
  const [leaveDrafts, setLeaveDrafts] = useState({});

  const dayIndex = selectedDate.getDay();
  const selectedDateStr = selectedDate.toISOString().split("T")[0];

  useEffect(() => {
    api.loadDentists();
  }, []); 

  const debounceRef = useRef({});

  const saveDentistChanges = async (updatedDentist) => {
    updateDentistInStore(updatedDentist);
    if (debounceRef.current[updatedDentist.id]) {
      clearTimeout(debounceRef.current[updatedDentist.id]);
    }
    debounceRef.current[updatedDentist.id] = setTimeout(async () => {
      try {
        await api.updateDentist(updatedDentist.id, updatedDentist);
        toast.success("Schedule saved");
      } catch (error) {
        toast.error("Failed to save changes");
      } finally {
        delete debounceRef.current[updatedDentist.id];
      }
    }, 1000); 
  };

  const handleDeleteDentist = async (id, name) => {
    if (window.confirm(`Are you sure you want to delete Dr. ${name}?`)) {
      try {
        await api.deleteDentist(id);
        toast.success("Dentist removed");
      } catch (error) {
        toast.error("Failed to delete dentist");
      }
    }
  };

  const updateOperatingHours = (dentist, field, value) => {
    const currentHours = dentist.operatingHours || { start: "", end: "" };
    const updated = { ...dentist, operatingHours: { ...currentHours, [field]: value } };
    saveDentistChanges(updated);
  };

  const updateLunch = (dentist, field, value) => {
    const currentLunch = dentist.lunch || { start: "", end: "" };
    const updated = { ...dentist, lunch: { ...currentLunch, [field]: value } };
    saveDentistChanges(updated);
  };

  const toggleWorkingDay = (dentist, dayIdx) => {
    const currentDays = dentist.days || [];
    let newDays;
    const numericDay = Number(dayIdx);
    if (currentDays.includes(numericDay)) newDays = currentDays.filter(d => d !== numericDay);
    else newDays = [...currentDays, numericDay].sort();
    saveDentistChanges({ ...dentist, days: newDays });
  };

  const addBreakSlot = (dentist) => {
    const draft = breakDrafts[dentist.id];
    if (!draft?.start || !draft?.end) return;
    const updated = { ...dentist, breaks: [...(dentist.breaks || []), { label: "Break", ...draft }] };
    saveDentistChanges(updated);
    setBreakDrafts((prev) => ({ ...prev, [dentist.id]: { start: "", end: "" } }));
  };

  const removeBreakSlot = (dentist, index) => {
    const newBreaks = [...(dentist.breaks || [])];
    newBreaks.splice(index, 1);
    saveDentistChanges({ ...dentist, breaks: newBreaks });
  };

  const addLeaveDay = (dentist) => {
    const draft = leaveDrafts[dentist.id];
    if (!draft || (dentist.leaveDays || []).includes(draft)) return;
    saveDentistChanges({ ...dentist, leaveDays: [...(dentist.leaveDays || []), draft] });
    setLeaveDrafts((prev) => ({ ...prev, [dentist.id]: "" }));
  };

  const removeLeaveDay = (dentist, day) => {
    saveDentistChanges({ ...dentist, leaveDays: (dentist.leaveDays || []).filter(d => d !== day) });
  };

  const toggleStatus = (dentist) => {
    const modes = ["Available", "Off", "Busy"];
    const nextStatus = modes[(modes.indexOf(dentist.status || "Available") + 1) % modes.length];
    saveDentistChanges({ ...dentist, status: nextStatus });
  };

  const calculateAvailability = (dentist) => {
    if (dentist.status === "Busy") return "Busy";
    if (dentist.status === "Off") return "Off";
    if ((dentist.leaveDays || []).includes(selectedDateStr)) return "Off (Leave)";
    if (dentist.days && !dentist.days.includes(dayIndex)) return "Off (Sched)";
    return "Available";
  };

  const getAssignedCount = (dentistId) => {
    return appointments.filter(a => {
      const datePart = a.appointment_datetime ? a.appointment_datetime.split('T')[0] : "";
      return a.dentist_id === dentistId && datePart === selectedDateStr;
    }).length;
  };

  const filteredDentists = useMemo(() =>
    dentists.filter((d) => {
      const computedStatus = calculateAvailability(d);
      const assignedCount = getAssignedCount(d.id);
      return (filters.specialization === "All" || filters.specialization === d.specialization) &&
             (filters.availability === "All" || computedStatus.includes(filters.availability)) &&
             (filters.assigned === "All" || (filters.assigned === "With" && assignedCount > 0) || (filters.assigned === "None" && assignedCount === 0));
    }),
    [dentists, filters, selectedDateStr, appointments]
  );

  return (
    <div className="dentists-page">
      <div className="page-header">
        <div className="header-title">
          <h1>Dentist Availability</h1>
        </div>
        <div className="schedule-date-container">
          <label>Schedule date</label>
          <DatePicker
            selected={selectedDate}
            onChange={(date) => setSelectedDate(date)}
            className="datepicker-input"
            dateFormat="MM/dd/yyyy"
          />
        </div>
      </div>

      <div className="filter-row">
        <div className="filter-group">
          <label>Specialization</label>
          <select value={filters.specialization} onChange={(e) => setFilters(p => ({ ...p, specialization: e.target.value }))}>
            <option value="All">All</option>
            {Array.from(new Set(dentists.map(d => d.specialization))).map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div className="filter-group">
          <label>Availability</label>
          <div className="dropdown-with-btn">
            <select value={filters.availability} onChange={(e) => setFilters(p => ({ ...p, availability: e.target.value }))}>
              <option value="All">All</option>
              <option value="Available">Available</option>
              <option value="Busy">Busy</option>
              <option value="Off">Off</option>
            </select>
            <button className="add-btn-dropdown" onClick={() => setIsAddModalOpen(true)}>+</button>
          </div>
        </div>
      </div>

      <div className="dentists-grid">
        {filteredDentists.map((d) => {
          const statusDisplay = calculateAvailability(d);
          const statusClass = statusDisplay.toLowerCase().split(' ')[0];

          return (
            <div className="dentist-card" key={d.id}>
              <div className="card-header-row">
                <span className="specialization-text">{d.specialization}</span>
                <span className={`status-badge ${statusClass}`} onClick={() => toggleStatus(d)}>
                  {statusDisplay}
                </span>
              </div>
              <h2 className="dentist-name">Dr. {d.name || `${d.first_name} ${d.last_name}`}</h2>
              <p className="patient-stat">Assigned patients today: {getAssignedCount(d.id)}</p>

              <span className="section-label">Working Days</span>
              <div className="days-container">
                {DAYS.map((day) => (
                  <button
                    key={day.value}
                    className={`day-circle ${d.days?.includes(day.value) ? 'active' : ''}`}
                    onClick={() => toggleWorkingDay(d, day.value)}
                  >
                    {day.label}
                  </button>
                ))}
              </div>

              <span className="section-label">Operating hours</span>
              <div className="time-config-row">
                <div className="time-input-box"><input type="time" value={d.operatingHours?.start || ""} onChange={(e) => updateOperatingHours(d, "start", e.target.value)} /></div>
                <span className="time-sep">to</span>
                <div className="time-input-box"><input type="time" value={d.operatingHours?.end || ""} onChange={(e) => updateOperatingHours(d, "end", e.target.value)} /></div>
              </div>

              <span className="section-label">Lunch</span>
              <div className="time-config-row">
                <div className="time-input-box"><input type="time" value={d.lunch?.start || ""} onChange={(e) => updateLunch(d, "start", e.target.value)} /></div>
                <span className="time-sep">to</span>
                <div className="time-input-box"><input type="time" value={d.lunch?.end || ""} onChange={(e) => updateLunch(d, "end", e.target.value)} /></div>
              </div>

              <span className="section-label">Breaks</span>
              <div className="chips-display">
                {(d.breaks || []).map((b, idx) => (
                  <div className="mini-chip" key={idx}>{b.start} - {b.end} <button onClick={() => removeBreakSlot(d, idx)}>&times;</button></div>
                ))}
              </div>
              <div className="time-config-row">
                <div className="time-input-box"><input type="time" value={breakDrafts[d.id]?.start || ""} onChange={(e) => setBreakDrafts(p => ({ ...p, [d.id]: { ...p[d.id], start: e.target.value } }))} /></div>
                <div className="time-input-box"><input type="time" value={breakDrafts[d.id]?.end || ""} onChange={(e) => setBreakDrafts(p => ({ ...p, [d.id]: { ...p[d.id], end: e.target.value } }))} /></div>
                <button className="btn-blue-add" onClick={() => addBreakSlot(d)}>+</button>
              </div>

              <span className="section-label">Leave days</span>
              <div className="chips-display">
                {(d.leaveDays || []).map(day => (
                  <div className="mini-chip red" key={day}>{day} <button onClick={() => removeLeaveDay(d, day)}>×</button></div>
                ))}
              </div>
              <div className="time-config-row">
                <input type="date" className="leave-days-input" value={leaveDrafts[d.id] || ""} onChange={(e) => setLeaveDrafts(p => ({ ...p, [d.id]: e.target.value }))} />
                <button className="btn-wide-add" onClick={() => addLeaveDay(d)}>Add</button>
              </div>

              {/* DELETE BUTTON AT BOTTOM LEFT */}
              <div className="card-footer-left">
                <button 
                  className="delete-dentist-full-btn" 
                  onClick={() => handleDeleteDentist(d.id, d.name || `${d.first_name} ${d.last_name}`)}
                >
                  Delete Dentist
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {isAddModalOpen && (
        <AddDentistModal
          onClose={() => setIsAddModalOpen(false)}
          onSuccess={() => {
            setIsAddModalOpen(false);
            api.loadDentists();
            toast.success("Dentist added successfully");
          }}
        />
      )}
    </div>
  );
}

export default Dentists;