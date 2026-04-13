// import React, { useEffect, useState } from "react";
// import { useNavigate } from "react-router-dom";
// import useAppStore from "../../store/useAppStore";
// import useApi from "../../hooks/useApi";
// import "../../styles/pages/dentist/DentistAppointments.css";

// function DentistAppointments() {
//   const navigate = useNavigate();
//   const api = useApi();
  
//   // 1. Fetch real appointments and patients from the global store
//   const allAppointments = useAppStore((state) => state.appointments || []);
//   const patients = useAppStore((state) => state.patients || []);

//   // 2. Get dynamically logged-in user
//   const currentUser = useAppStore((state) => state.user); 
  
//   // CRITICAL FIX: Use the 'dentist_id' from the auth response, not the user 'id'
//   const currentDentistId = currentUser?.dentist_id || currentUser?.id || 1; 

//   // 3. Set up the Calendar State (Defaults to Today in YYYY-MM-DD format)
//   const [selectedDate, setSelectedDate] = useState(new Date().toLocaleDateString('en-CA'));

//   useEffect(() => {
//     // Load data when page mounts
//     api.loadAppointments();
//     api.loadPatients();
//   }, []); // eslint-disable-line react-hooks/exhaustive-deps

//   // 4. Filter appointments by BOTH Dentist ID and the Selected Date
//   const myAppointments = allAppointments.filter(appt => {
//     // Match the dentist (using Number() to ensure it matches string or int)
//     const isMyPatient = Number(appt.dentist_id) === Number(currentDentistId);
    
//     // Match the date
//     // Extract just the 'YYYY-MM-DD' part from the database datetime string
//     const apptDateStr = appt.appointment_datetime ? appt.appointment_datetime.split('T')[0] : null;
//     const isSelectedDate = apptDateStr === selectedDate;

//     return isMyPatient && isSelectedDate;
//   });

//   return (
//     <div className="appointments-container">
//       <div className="appointments-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
//         <h1 className="appointments-title">My Appointments</h1>
        
//         {/* Calendar Date Picker */}
//         <div className="date-picker-container" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
//           <label htmlFor="date-picker" style={{ fontWeight: 'bold' }}>Select Date:</label>
//           <input 
//             id="date-picker"
//             type="date" 
//             value={selectedDate} 
//             onChange={(e) => setSelectedDate(e.target.value)}
//             className="date-input"
//             style={{ padding: '0.5rem', borderRadius: '5px', border: '1px solid #ccc' }}
//           />
//         </div>
//       </div>

//       <div className="appointments-card" style={{ marginTop: '20px' }}>
//         <table className="appointments-table">
//           <thead>
//             <tr>
//               <th>Time</th>
//               <th>Patient Name</th>
//               <th>Procedure</th>
//               <th>Status</th>
//               <th>Action</th>
//             </tr>
//           </thead>
//           <tbody>
//             {myAppointments.length === 0 ? (
//                <tr>
//                  <td colSpan="5" style={{textAlign:"center", padding: "2rem"}}>
//                    No appointments found for {new Date(selectedDate).toLocaleDateString()}.
//                  </td>
//                </tr>
//             ) : (
//               myAppointments.map((appt) => {
//                 // Find patient name from the patients list
//                 const patientName = patients.find(p => p.id === appt.patient_id)?.name || appt.full_name || "Unknown Patient";
                
//                 // Format time properly just in case timeStart is missing from the API response
//                 const formattedTime = appt.timeStart || (appt.appointment_datetime 
//                   ? new Date(appt.appointment_datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
//                   : "N/A");

//                 return (
//                   <tr key={appt.id}>
//                     <td style={{ fontWeight: 'bold' }}>{formattedTime}</td>
//                     <td className="patient-name-cell">{patientName}</td>
//                     <td>{appt.procedure || appt.reason}</td>
//                     <td>
//                       <span className={`appt-status-badge ${appt.status?.toLowerCase() || 'scheduled'}`}>
//                         {appt.status}
//                       </span>
//                     </td>
//                     <td>
//                       <button 
//                         className="review-chart-btn"
//                         onClick={() => navigate(`/app/patient/${appt.patient_id}`)} 
//                       >
//                         Review Chart
//                       </button>
//                     </td>
//                   </tr>
//                 );
//               })
//             )}
//           </tbody>
//         </table>
//       </div>
//     </div>
//   );
// }

// export default DentistAppointments;




import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import useAppStore from "../../store/useAppStore";
import useApi from "../../hooks/useApi";
import "../../styles/pages/dentist/DentistAppointments.css";

function DentistAppointments() {
  const navigate = useNavigate();
  const api = useApi();
  
  // 1. Fetch real appointments and patients from the global store
  const allAppointments = useAppStore((state) => state.appointments || []);
  const patients = useAppStore((state) => state.patients || []);
  const queue = useAppStore((state) => state.queue || []);

  // 2. Get dynamically logged-in user
  const currentUser = useAppStore((state) => state.user); 
  
  // CRITICAL FIX: Use the 'dentist_id' from the auth response, not the user 'id'
  const currentDentistId = currentUser?.dentist_id || currentUser?.id || 1; 

  // 3. Set up the Calendar State (Defaults to Today in YYYY-MM-DD format)
  const [selectedDate, setSelectedDate] = useState(new Date().toLocaleDateString('en-CA'));

  useEffect(() => {
    // Load data when page mounts
    api.loadAppointments();
    api.loadPatients();
    api.loadQueue();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const toDateKey = (value) => {
    if (!value) return null;
    const parsed = new Date(String(value).replace(' ', 'T'));
    if (Number.isNaN(parsed.getTime())) {
      return String(value).split('T')[0]?.split(' ')[0] || null;
    }
    return parsed.toLocaleDateString('en-CA');
  };

  // 4. Filter appointments by BOTH Dentist ID and the Selected Date
  const myAppointments = allAppointments.filter(appt => {
    // Match the dentist (using Number() to ensure it matches string or int)
    const isMyPatient = Number(appt.dentist_id) === Number(currentDentistId);
    
    // Match the date
    // Extract just the 'YYYY-MM-DD' part from the database datetime string
    const apptDateStr = toDateKey(appt.appointment_datetime);
    const isSelectedDate = apptDateStr === selectedDate;

    return isMyPatient && isSelectedDate;
  });

  const walkInPatients = queue.filter((entry) => {
    const isWalkIn = String(entry.source || '').trim().toLowerCase() === 'walk-in';
    const isMyPatient = Number(entry.dentist_id) === Number(currentDentistId);
    const queueDateStr = toDateKey(entry.time_added || entry.checkedInTime);
    const isSelectedDate = queueDateStr === selectedDate;
    return isWalkIn && isMyPatient && isSelectedDate;
  });

  return (
    <div className="appointments-container">
      <div className="appointments-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 className="appointments-title">My Appointments</h1>
        
        {/* Calendar Date Picker */}
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

      <div className="appointments-card" style={{ marginTop: '20px' }}>
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
                 <td colSpan="5" style={{textAlign:"center", padding: "2rem"}}>
                   No appointments found for {new Date(selectedDate).toLocaleDateString()}.
                 </td>
               </tr>
            ) : (
              myAppointments.map((appt) => {
                // Find patient name from the patients list
                const patientName = patients.find(p => p.id === appt.patient_id)?.name || appt.full_name || "Unknown Patient";
                
                // Format time properly just in case timeStart is missing from the API response
                const formattedTime = appt.timeStart || (appt.appointment_datetime 
                  ? new Date(appt.appointment_datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
                  : "N/A");

                return (
                  <tr key={appt.id}>
                    <td style={{ fontWeight: 'bold' }}>{formattedTime}</td>
                    <td className="patient-name-cell">{patientName}</td>
                    <td>{appt.procedure || appt.reason}</td>
                    <td>
                      <span className={`appt-status-badge ${appt.status?.toLowerCase() || 'scheduled'}`}>
                        {appt.status}
                      </span>
                    </td>
                    <td>
                      <button 
                        className="review-chart-btn"
                        onClick={() => navigate(`/patients/${appt.patient_id}`)} 
                      >
                        Review Form
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="appointments-card" style={{ marginTop: '20px' }}>
        <h2 className="appointments-title" style={{ fontSize: '1.2rem', marginBottom: '0.85rem' }}>Walk-In Patients</h2>
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
                      <button
                        className="review-chart-btn"
                        onClick={() => navigate(`/patients/${entry.patient_id}`)}
                      >
                        Review Form
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default DentistAppointments;