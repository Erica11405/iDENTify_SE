// import React, { useEffect, useMemo, useState } from "react";
// import DatePicker from "react-datepicker";
// import "react-datepicker/dist/react-datepicker.css";
// import "../../styles/pages/aide/Dentists.css";
// import useAppStore from "../../store/useAppStore";
// import useApi from "../../hooks/useApi";
// import toast from "react-hot-toast";
// import EditDentistModal from "../../components/EditDentistModal";

// const DAYS = [
//   { label: "S", value: 0 },
//   { label: "M", value: 1 },
//   { label: "T", value: 2 },
//   { label: "W", value: 3 },
//   { label: "TH", value: 4 },
//   { label: "F", value: 5 },
//   { label: "S", value: 6 },
// ];

// function Dentists() {
//   const api = useApi();
//   const dentists = useAppStore((state) => state.dentists);
//   const appointments = useAppStore((state) => state.appointments);

//   const [isAddModalOpen, setIsAddModalOpen] = useState(false);
//   const [editingDentist, setEditingDentist] = useState(null);
//   const [selectedDate, setSelectedDate] = useState(new Date());
//   const [filters, setFilters] = useState({
//     specialization: "All",
//     availability: "All",
//     assigned: "All",
//   });

//   const dayIndex = selectedDate.getDay();
//   const selectedDateStr = selectedDate.toISOString().split("T")[0];

//   useEffect(() => {
//     api.loadDentists();
//   }, []); 

//   const handleDeleteDentist = async (id, name) => {
//     if (window.confirm(`Are you sure you want to delete Dr. ${name}?`)) {
//       try {
//         await api.deleteDentist(id);
//         toast.success("Dentist removed");
//         api.loadDentists(); // Refresh the list
//       } catch (error) {
//         toast.error("Failed to delete dentist");
//       }
//     }
//   };

//   const calculateAvailability = (dentist) => {
//     if (dentist.status === "Busy") return "Busy";
//     if (dentist.status === "Off") return "Off";
//     if ((dentist.leaveDays || []).includes(selectedDateStr)) return "Off (Leave)";
//     if (dentist.days && !dentist.days.includes(dayIndex)) return "Off (Sched)";
//     return "Available";
//   };

//   const getAssignedCount = (dentistId) => {
//     return appointments.filter(a => {
//       const datePart = a.appointment_datetime ? a.appointment_datetime.split('T')[0] : "";
//       return a.dentist_id === dentistId && datePart === selectedDateStr;
//     }).length;
//   };

//   const filteredDentists = useMemo(() =>
//     dentists.filter((d) => {
//       const computedStatus = calculateAvailability(d);
//       const assignedCount = getAssignedCount(d.id);
//       return (filters.specialization === "All" || filters.specialization === d.specialization) &&
//              (filters.availability === "All" || computedStatus.includes(filters.availability)) &&
//              (filters.assigned === "All" || (filters.assigned === "With" && assignedCount > 0) || (filters.assigned === "None" && assignedCount === 0));
//     }),
//     [dentists, filters, selectedDateStr, appointments]
//   );

//   return (
//     <div className="dentists-page">
//       <div className="page-header">
//         <div className="header-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: '20px' }}>
//           <h1>Dentist Availability</h1>

//         </div>
//         <div className="schedule-date-container">
//           <label>Schedule date</label>
//           <DatePicker
//             selected={selectedDate}
//             onChange={(date) => setSelectedDate(date)}
//             className="datepicker-input"
//             dateFormat="MM/dd/yyyy"
//           />
//         </div>
//       </div>

//       <div className="filter-row">
//         <div className="filter-group">
//           <label>Specialization</label>
//           <select value={filters.specialization} onChange={(e) => setFilters(p => ({ ...p, specialization: e.target.value }))}>
//             <option value="All">All</option>
//             {Array.from(new Set(dentists.map(d => d.specialization))).filter(Boolean).map(s => <option key={s} value={s}>{s}</option>)}
//           </select>
//         </div>

//         <div className="filter-group">
//           <label>Availability</label>
//           <select value={filters.availability} onChange={(e) => setFilters(p => ({ ...p, availability: e.target.value }))}>
//             <option value="All">All</option>
//             <option value="Available">Available</option>
//             <option value="Busy">Busy</option>
//             <option value="Off">Off</option>
//           </select>
//         </div>
//       </div>

//       <div className="dentists-grid">
//         {filteredDentists.map((d) => {
//           const statusDisplay = calculateAvailability(d);
//           const statusClass = statusDisplay.toLowerCase().split(' ')[0];

//           return (
//             <div className="dentist-card" key={d.id}>
//               <div className="card-header-row">
//                 <span className="specialization-text">{d.specialization || "Unassigned Specialization"}</span>
//                 {/* Status badge is now read-only (removed onClick) */}
//                 <span className={`status-badge ${statusClass}`} style={{ cursor: 'default' }}>
//                   {statusDisplay}
//                 </span>
//               </div>
//               <h2 className="dentist-name">Dr. {d.name || `${d.first_name} ${d.last_name}`}</h2>
//               <p className="patient-stat">Assigned patients today: {getAssignedCount(d.id)}</p>

//               <span className="section-label">Working Days</span>
//               <div className="days-container">
//                 {DAYS.map((day) => (
//                   <div
//                     key={day.value}
//                     className={`day-circle ${d.days?.includes(day.value) ? 'active' : ''}`}
//                     style={{ cursor: 'default' }} // Prevent click feedback
//                   >
//                     {day.label}
//                   </div>
//                 ))}
//               </div>

//               <span className="section-label">Operating hours</span>
//               <div className="time-config-row">
//                 {/* Inputs made readOnly */}
//                 <div className="time-input-box"><input type="time" value={d.operatingHours?.start || ""} readOnly /></div>
//                 <span className="time-sep">to</span>
//                 <div className="time-input-box"><input type="time" value={d.operatingHours?.end || ""} readOnly /></div>
//               </div>

//               <span className="section-label">Lunch</span>
//               <div className="time-config-row">
//                 <div className="time-input-box"><input type="time" value={d.lunch?.start || ""} readOnly /></div>
//                 <span className="time-sep">to</span>
//                 <div className="time-input-box"><input type="time" value={d.lunch?.end || ""} readOnly /></div>
//               </div>

//               <span className="section-label">Breaks</span>
//               <div className="chips-display">
//                 {(d.breaks || []).map((b, idx) => (
//                   // Removed the delete (x) button
//                   <div className="mini-chip" key={idx}>{b.start} - {b.end}</div>
//                 ))}
//                 {(!d.breaks || d.breaks.length === 0) && <span style={{fontSize: '0.85rem', color: '#94a3b8', fontStyle: 'italic'}}>No breaks scheduled</span>}
//               </div>
//               {/* Removed the inputs and button for adding breaks here */}

//               <span className="section-label">Leave days</span>
//               <div className="chips-display">
//                 {(d.leaveDays || []).map(day => (
//                   // Removed the delete (x) button
//                   <div className="mini-chip red" key={day}>{day}</div>
//                 ))}
//                 {(!d.leaveDays || d.leaveDays.length === 0) && <span style={{fontSize: '0.85rem', color: '#94a3b8', fontStyle: 'italic'}}>No upcoming leaves</span>}
//               </div>
//               {/* Removed the inputs and button for adding leave days here */}

//               {/* ACTION BUTTONS */}
//               <div className="card-footer-actions" style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
//                 <button 
//                   style={{ flex: 1, padding: '12px', backgroundColor: '#0ea5e9', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
//                   onClick={() => setEditingDentist(d)}
//                 >
//                   Edit Profile
//                 </button>
//                 <button 
//                   style={{ flex: 1, padding: '12px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
//                   onClick={() => handleDeleteDentist(d.id, d.name || `${d.first_name} ${d.last_name}`)}
//                 >
//                   Delete
//                 </button>
//               </div>
//             </div>
//           );
//         })}
//       </div>

//       {isAddModalOpen && (
//         <AddDentistModal
//           onClose={() => setIsAddModalOpen(false)}
//           onSuccess={() => {
//             setIsAddModalOpen(false);
//             api.loadDentists();
//             toast.success("Dentist added successfully");
//           }}
//         />
//       )}

//       {editingDentist && (
//         <EditDentistModal
//           dentist={editingDentist}
//           onClose={() => setEditingDentist(null)}
//           onSuccess={() => {
//             setEditingDentist(null);
//             api.loadDentists(); 
//           }}
//         />
//       )}
//     </div>
//   );
// }

// export default Dentists;



import React, { useEffect, useMemo, useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import "../../styles/pages/aide/Dentists.css";
import useAppStore from "../../store/useAppStore";
import useApi from "../../hooks/useApi";
import toast from "react-hot-toast";
import EditDentistModal from "../../components/EditDentistModal";

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
  const appointments = useAppStore((state) => state.appointments);

  const [editingDentist, setEditingDentist] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [filters, setFilters] = useState({
    specialization: "All",
    availability: "All",
    assigned: "All",
  });

  const dayIndex = selectedDate.getDay();
  const selectedDateStr = selectedDate.toISOString().split("T")[0];

  useEffect(() => {
    api.loadDentists();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDeleteDentist = async (id, name) => {
    if (window.confirm(`Are you sure you want to delete Dr. ${name}?`)) {
      try {
        await api.deleteDentist(id);
        toast.success("Dentist removed");
        api.loadDentists(); // Refresh the list
      } catch {
        toast.error("Failed to delete dentist");
      }
    }
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
      // CRITICAL FIX: Explicitly exclude Dental Aides from this management view
      if (d.specialization === "Dental Aide") return false;

      const computedStatus = calculateAvailability(d);
      const assignedCount = getAssignedCount(d.id);
      return (filters.specialization === "All" || filters.specialization === d.specialization) &&
             (filters.availability === "All" || computedStatus.includes(filters.availability)) &&
             (filters.assigned === "All" || (filters.assigned === "With" && assignedCount > 0) || (filters.assigned === "None" && assignedCount === 0));
    }),
    [dentists, filters, selectedDateStr, appointments] // eslint-disable-line react-hooks/exhaustive-deps
  );

  return (
    <div className="dentists-page">
      <div className="page-header">
        <div className="header-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: '20px' }}>
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
            {/* Updated mapping to exclude Dental Aide from the filter dropdown as well */}
            {Array.from(new Set(dentists.filter(d => d.specialization !== "Dental Aide").map(d => d.specialization)))
              .filter(Boolean)
              .map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div className="filter-group">
          <label>Availability</label>
          <select value={filters.availability} onChange={(e) => setFilters(p => ({ ...p, availability: e.target.value }))}>
            <option value="All">All</option>
            <option value="Available">Available</option>
            <option value="Busy">Busy</option>
            <option value="Off">Off</option>
          </select>
        </div>
      </div>

      <div className="dentists-grid">
        {filteredDentists.map((d) => {
          const statusDisplay = calculateAvailability(d);
          const statusClass = statusDisplay.toLowerCase().split(' ')[0];

          return (
            <div className="dentist-card" key={d.id}>
              <div className="card-header-row">
                <span className="specialization-text">{d.specialization || "Unassigned Specialization"}</span>
                <span className={`status-badge ${statusClass}`} style={{ cursor: 'default' }}>
                  {statusDisplay}
                </span>
              </div>
              <h2 className="dentist-name">Dr. {d.name || `${d.first_name} ${d.last_name}`}</h2>
              <p className="patient-stat">Assigned patients today: {getAssignedCount(d.id)}</p>

              <span className="section-label">Working Days</span>
              <div className="days-container">
                {DAYS.map((day) => (
                  <div
                    key={day.value}
                    className={`day-circle ${d.days?.includes(day.value) ? 'active' : ''}`}
                    style={{ cursor: 'default' }}
                  >
                    {day.label}
                  </div>
                ))}
              </div>

              <span className="section-label">Operating hours</span>
              <div className="time-config-row">
                <div className="time-input-box"><input type="time" value={d.operatingHours?.start || ""} readOnly /></div>
                <span className="time-sep">to</span>
                <div className="time-input-box"><input type="time" value={d.operatingHours?.end || ""} readOnly /></div>
              </div>

              <span className="section-label">Lunch</span>
              <div className="time-config-row">
                <div className="time-input-box"><input type="time" value={d.lunch?.start || ""} readOnly /></div>
                <span className="time-sep">to</span>
                <div className="time-input-box"><input type="time" value={d.lunch?.end || ""} readOnly /></div>
              </div>

              <span className="section-label">Breaks</span>
              <div className="chips-display">
                {(d.breaks || []).map((b, idx) => (
                  <div className="mini-chip" key={idx}>{b.start} - {b.end}</div>
                ))}
                {(!d.breaks || d.breaks.length === 0) && <span style={{fontSize: '0.85rem', color: '#94a3b8', fontStyle: 'italic'}}>No breaks scheduled</span>}
              </div>

              <span className="section-label">Leave days</span>
              <div className="chips-display">
                {(d.leaveDays || []).map(day => (
                  <div className="mini-chip red" key={day}>{day}</div>
                ))}
                {(!d.leaveDays || d.leaveDays.length === 0) && <span style={{fontSize: '0.85rem', color: '#94a3b8', fontStyle: 'italic'}}>No upcoming leaves</span>}
              </div>

              <div className="card-footer-actions" style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button 
                  style={{ flex: 1, padding: '12px', backgroundColor: '#0ea5e9', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
                  onClick={() => setEditingDentist(d)}
                >
                  Edit Profile
                </button>
                <button 
                  style={{ flex: 1, padding: '12px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
                  onClick={() => handleDeleteDentist(d.id, d.name || `${d.first_name} ${d.last_name}`)}
                >
                  Delete
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {editingDentist && (
        <EditDentistModal
          dentist={editingDentist}
          onClose={() => setEditingDentist(null)}
          onSuccess={() => {
            setEditingDentist(null);
            api.loadDentists(); 
          }}
        />
      )}
    </div>
  );
}

export default Dentists;