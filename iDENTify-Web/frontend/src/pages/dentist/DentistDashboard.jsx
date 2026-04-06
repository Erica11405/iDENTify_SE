// // import React, { useEffect, useMemo } from "react";
// // import "../../styles/pages/dentist/DentistDashboard.css";
// // import useAppStore from "../../store/useAppStore";
// // import useApi from "../../hooks/useApi";

// // function DentistDashboard() {
// //   const api = useApi();
// //   const { user, appointments, queue } = useAppStore();

// //   useEffect(() => {
// //     const loadDashboardData = async () => {
// //         try {
// //             // Ensure these methods exist in your useApi hook 
// //             // and they call getAppointments/getQueue from apiClient.js
// //             await api.loadAppointments();
// //             await api.loadQueue();
// //         } catch (error) {
// //             console.error("Failed to load dashboard data:", error);
// //         }
// //     };
// //     loadDashboardData();
// //   }, [api]);

// //   const myAppts = useMemo(() => {
// //     if (!appointments || !user) return [];
// //     const today = new Date().toLocaleDateString('en-CA');
// //     return appointments.filter(a => 
// //       a.dentist_id === user?.id && 
// //       new Date(a.appointment_datetime).toLocaleDateString('en-CA') === today
// //     );
// //   }, [appointments, user]);

// //   return (
// //     <div className="dashboard-wrapper">
// //       <div className="dashboard-header">
// //         <h1 className="dashboard-title">Doctor's Dashboard</h1>
// //         <p className="dashboard-subtitle">
// //             Welcome, Dr. {user?.name || 'Doctor'}. You have {myAppts.length} patients today.
// //         </p>
// //       </div>

// //       <div className="stats-container">
// //         <div className="stat-card">
// //           <span className="stat-label">Total Appointments</span>
// //           <span className="stat-value">{myAppts.length}</span>
// //         </div>
// //         <div className="stat-card">
// //           <span className="stat-label">Pending</span>
// //           <span className="stat-value" style={{color: "#f39c12"}}>
// //             {myAppts.filter(a => a.status !== 'Done' && a.status !== 'Completed').length}
// //           </span>
// //         </div>
// //         <div className="stat-card">
// //           <span className="stat-label">Completed</span>
// //           <span className="stat-value" style={{color: "#27ae60"}}>
// //             {myAppts.filter(a => a.status === 'Done' || a.status === 'Completed').length}
// //           </span>
// //         </div>
// //       </div>

// //       <div className="dashboard-section table-card">
// //         <h3 className="section-title">Today's Schedule</h3>
// //         <table className="dashboard-table">
// //           <thead>
// //             <tr>
// //               <th>Time</th>
// //               <th>Patient</th>
// //               <th>Procedure</th>
// //               <th>Status</th>
// //             </tr>
// //           </thead>
// //           <tbody>
// //             {myAppts.length > 0 ? (
// //                 myAppts.map(appt => (
// //                   <tr key={appt.id}>
// //                     <td>{appt.timeStart || 'N/A'}</td>
// //                     <td className="patient-name">{appt.patient_name || appt.full_name}</td>
// //                     <td>{appt.procedure || 'General Treatment'}</td>
// //                     <td>
// //                         <span className={`status-badge ${appt.status?.toLowerCase() || 'pending'}`}>
// //                             {appt.status || 'Scheduled'}
// //                         </span>
// //                     </td>
// //                   </tr>
// //                 ))
// //             ) : (
// //                 <tr>
// //                     <td colSpan="4" style={{ textAlign: 'center', padding: '20px' }}>
// //                         No appointments found for today.
// //                     </td>
// //                 </tr>
// //             )}
// //           </tbody>
// //         </table>
// //       </div>
// //     </div>
// //   );
// // }

// // export default DentistDashboard;

// import React, { useEffect, useMemo } from "react";
// import "../../styles/pages/dentist/DentistDashboard.css";
// import useAppStore from "../../store/useAppStore";
// import useApi from "../../hooks/useApi";

// function DentistDashboard() {
//   const api = useApi();
//   const { user, appointments, queue } = useAppStore();

//   useEffect(() => {
//     const loadDashboardData = async () => {
//         try {
//             // Ensure these methods exist in your useApi hook 
//             // and they call getAppointments/getQueue from apiClient.js
//             await api.loadAppointments();
//             await api.loadQueue();
//         } catch (error) {
//             console.error("Failed to load dashboard data:", error);
//         }
//     };
    
//     // 1. Initial load when the page opens
//     loadDashboardData();

//     // 2. Set up an interval to refresh data every 10 seconds (10000 ms)
//     // This ensures the dashboard syncs automatically when aides make changes
//     const syncInterval = setInterval(() => {
//         loadDashboardData();
//     }, 10000);

//     // 3. Cleanup the interval when the user leaves the page
//     return () => clearInterval(syncInterval);
//   }, [api]);

//   const myAppts = useMemo(() => {
//     if (!appointments || !user) return [];
//     const today = new Date().toLocaleDateString('en-CA');
//     return appointments.filter(a => 
//       a.dentist_id === user?.id && 
//       new Date(a.appointment_datetime).toLocaleDateString('en-CA') === today
//     );
//   }, [appointments, user]);

//   return (
//     <div className="dashboard-wrapper">
//       <div className="dashboard-header">
//         <h1 className="dashboard-title">Doctor's Dashboard</h1>
//         <p className="dashboard-subtitle">
//             Welcome, Dr. {user?.name || 'Doctor'}. You have {myAppts.length} patients today.
//         </p>
//       </div>

//       <div className="stats-container">
//         <div className="stat-card">
//           <span className="stat-label">Total Appointments</span>
//           <span className="stat-value">{myAppts.length}</span>
//         </div>
//         <div className="stat-card">
//           <span className="stat-label">Pending</span>
//           <span className="stat-value" style={{color: "#f39c12"}}>
//             {myAppts.filter(a => a.status !== 'Done' && a.status !== 'Completed').length}
//           </span>
//         </div>
//         <div className="stat-card">
//           <span className="stat-label">Completed</span>
//           <span className="stat-value" style={{color: "#27ae60"}}>
//             {myAppts.filter(a => a.status === 'Done' || a.status === 'Completed').length}
//           </span>
//         </div>
//       </div>

//       <div className="dashboard-section table-card">
//         <h3 className="section-title">Today's Schedule</h3>
//         <table className="dashboard-table">
//           <thead>
//             <tr>
//               <th>Time</th>
//               <th>Patient</th>
//               <th>Procedure</th>
//               <th>Status</th>
//             </tr>
//           </thead>
//           <tbody>
//             {myAppts.length > 0 ? (
//                 myAppts.map(appt => (
//                   <tr key={appt.id}>
//                     <td>{appt.timeStart || 'N/A'}</td>
//                     <td className="patient-name">{appt.patient_name || appt.full_name}</td>
//                     <td>{appt.procedure || 'General Treatment'}</td>
//                     <td>
//                         <span className={`status-badge ${appt.status?.toLowerCase() || 'pending'}`}>
//                             {appt.status || 'Scheduled'}
//                         </span>
//                     </td>
//                   </tr>
//                 ))
//             ) : (
//                 <tr>
//                     <td colSpan="4" style={{ textAlign: 'center', padding: '20px' }}>
//                         No appointments found for today.
//                     </td>
//                 </tr>
//             )}
//           </tbody>
//         </table>
//       </div>
//     </div>
//   );
// }

// export default DentistDashboard;

import React, { useEffect, useMemo } from "react";
import "../../styles/pages/dentist/DentistDashboard.css";
import useAppStore from "../../store/useAppStore";
import useApi from "../../hooks/useApi";

function DentistDashboard() {
  const api = useApi();
  
  // ADDED 'dentists' to the store pull so we can find your true ID
  const { user, appointments, queue, dentists } = useAppStore();

  useEffect(() => {
    const loadDashboardData = async () => {
        try {
            await api.loadAppointments();
            await api.loadQueue();
            await api.loadDentists(); // Ensure dentists are loaded for cross-referencing
        } catch (error) {
            console.error("Failed to load dashboard data:", error);
        }
    };
    
    // 1. Initial load when the page opens
    loadDashboardData();

    // 2. Set up an interval to refresh data every 10 seconds
    const syncInterval = setInterval(() => {
        loadDashboardData();
    }, 10000);

    // 3. Cleanup the interval
    return () => clearInterval(syncInterval);
  }, [api]);

  const myAppts = useMemo(() => {
    if (!appointments || !user) return [];
    
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });

    // 1. CROSS-REFERENCE: Find the actual Dentist profile for the logged-in user
    // This bridges the gap between 'Account ID' and 'Dentist ID'
    const myDentistProfile = dentists?.find(d => 
        d.name === user?.name || 
        d.email === user?.email || 
        String(d.user_id) === String(user?.id)
    );

    const myActualDentistId = myDentistProfile ? myDentistProfile.id : user?.id;

    return appointments.filter(a => {
      // 2. ULTRA-SAFE ID MATCH: Check true dentist ID, account ID, or exact Name
      const isMyAppointment = 
          String(a.dentist_id) === String(myActualDentistId) ||
          String(a.dentist_id) === String(user?.id) ||
          a.dentist_name === user?.name ||
          a.dentist === user?.name;

      if (!isMyAppointment) return false;

      // 3. ULTRA-SAFE DATE MATCH: Extract standard YYYY-MM-DD
      if (!a.appointment_datetime) return false;
      
      let apptDate = "";
      try {
          apptDate = new Date(a.appointment_datetime).toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
      } catch (e) {
          apptDate = a.appointment_datetime.split('T')[0].split(' ')[0];
      }

      return apptDate === today;
    });
  }, [appointments, user, dentists]);

  return (
    <div className="dashboard-wrapper">
      <div className="dashboard-header">
        <h1 className="dashboard-title">Doctor's Dashboard</h1>
        <p className="dashboard-subtitle">
            Welcome, Dr. {user?.name || 'Doctor'}. You have {myAppts.length} patients today.
        </p>
      </div>

      <div className="stats-container">
        <div className="stat-card">
          <span className="stat-label">Total Appointments</span>
          <span className="stat-value">{myAppts.length}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Pending</span>
          <span className="stat-value" style={{color: "#f39c12"}}>
            {myAppts.filter(a => a.status !== 'Done' && a.status !== 'Completed').length}
          </span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Completed</span>
          <span className="stat-value" style={{color: "#27ae60"}}>
            {myAppts.filter(a => a.status === 'Done' || a.status === 'Completed').length}
          </span>
        </div>
      </div>

      <div className="dashboard-section table-card">
        <h3 className="section-title">Today's Schedule</h3>
        <table className="dashboard-table">
          <thead>
            <tr>
              <th>Time</th>
              <th>Patient</th>
              <th>Procedure</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {myAppts.length > 0 ? (
                myAppts.map(appt => (
                  <tr key={appt.id}>
                    {/* Fixed time display fallback */}
                    <td>{appt.timeStart || new Date(appt.appointment_datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                    <td className="patient-name">{appt.patient_name || appt.full_name || appt.patient || 'Unknown Patient'}</td>
                    <td>{appt.procedure || appt.reason || 'General Treatment'}</td>
                    <td>
                        <span className={`status-badge ${appt.status?.toLowerCase() || 'pending'}`}>
                            {appt.status || 'Scheduled'}
                        </span>
                    </td>
                  </tr>
                ))
            ) : (
                <tr>
                    <td colSpan="4" style={{ textAlign: 'center', padding: '20px' }}>
                        No appointments found for today.
                    </td>
                </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default DentistDashboard;