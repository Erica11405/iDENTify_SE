// import React from "react";
// import { useNavigate } from "react-router-dom";
// import "../../styles/pages/dentist/DentistAppointments.css";

// function DentistAppointments() {
//   const navigate = useNavigate();

//   const appointments = [
//     { id: 1, patientId: 101, patientName: "John Doe", time: "10:00 AM", status: "Waiting", procedure: "Teeth Cleaning" },
//     { id: 2, patientId: 102, patientName: "Jane Smith", time: "11:30 AM", status: "Scheduled", procedure: "Consultation" }
//   ];

//   return (
//     <div className="appointments-container">
//       <div className="appointments-header">
//         <h1 className="appointments-title">My Appointments</h1>
//       </div>

//       <div className="appointments-card">
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
//             {appointments.map((appt) => (
//               <tr key={appt.id}>
//                 <td>{appt.time}</td>
//                 <td className="patient-name-cell">{appt.patientName}</td>
//                 <td>{appt.procedure}</td>
//                 <td>
//                   <span className={`appt-status-badge ${appt.status.toLowerCase()}`}>
//                     {appt.status}
//                   </span>
//                 </td>
//                 <td>
//                   <button 
//                     className="review-chart-btn"
//                     onClick={() => navigate(`/app/patient/${appt.patientId}`)} 
//                   >
//                     Review Chart
//                   </button>
//                 </td>
//               </tr>
//             ))}
//           </tbody>
//         </table>
//       </div>
//     </div>
//   );
// }

// export default DentistAppointments;

import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import useAppStore from "../../store/useAppStore";
import useApi from "../../hooks/useApi";
import "../../styles/pages/dentist/DentistAppointments.css";

function DentistAppointments() {
  const navigate = useNavigate();
  const api = useApi();
  
  // 1. Fetch real appointments from the global store
  const allAppointments = useAppStore((state) => state.appointments || []);
  const patients = useAppStore((state) => state.patients || []);

  // Assuming you have the logged-in dentist's ID stored somewhere (e.g., local storage or store)
  // const currentDentistId = useAppStore((state) => state.currentUser?.id); 
  const currentDentistId = 1; // Replace this with dynamic ID of logged-in dentist

  useEffect(() => {
    // Load data when page mounts
    api.loadAppointments();
    api.loadPatients();
  }, []);

  // 2. Filter appointments to only show ones assigned to THIS dentist
  const myAppointments = allAppointments.filter(appt => appt.dentist_id === currentDentistId);

  return (
    <div className="appointments-container">
      <div className="appointments-header">
        <h1 className="appointments-title">My Appointments</h1>
      </div>

      <div className="appointments-card">
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
               <tr><td colSpan="5" style={{textAlign:"center"}}>No appointments found.</td></tr>
            ) : (
              myAppointments.map((appt) => {
                // Find patient name from the patients list
                const patientName = patients.find(p => p.id === appt.patient_id)?.name || appt.full_name || "Unknown Patient";
                
                return (
                  <tr key={appt.id}>
                    <td>{appt.timeStart}</td>
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
                        onClick={() => navigate(`/app/patient/${appt.patient_id}`)} 
                      >
                        Review Chart
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