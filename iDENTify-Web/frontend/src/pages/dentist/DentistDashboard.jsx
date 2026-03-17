// // // // frontend/src/pages/dentist/Dashboard.jsx
// // // import React from "react";
// // // import "../../styles/base.css";
// // // import "../../styles/pages/Dentists.css";

// // // function DentistDashboard() {
// // //   return (
// // //     <div className="page-container">
// // //       <div className="page-header">
// // //         <h1 className="page-title">Dentist Dashboard</h1>
// // //       </div>
// // //       <div className="dashboard-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
        
// // //         <div className="card" style={{ padding: "20px", backgroundColor: "#fff", borderRadius: "8px", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }}>
// // //           <h3 style={{ borderBottom: "1px solid #eee", paddingBottom: "10px", marginBottom: "15px" }}>Today's Overview</h3>
// // //           <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
// // //             <span style={{ color: "#64748b", fontWeight: "bold" }}>Pending Appointments:</span>
// // //             <span style={{ fontWeight: "bold", fontSize: "1.1rem" }}>4</span>
// // //           </div>
// // //           <div style={{ display: "flex", justifyContent: "space-between" }}>
// // //             <span style={{ color: "#64748b", fontWeight: "bold" }}>Completed Today:</span>
// // //             <span style={{ fontWeight: "bold", fontSize: "1.1rem", color: "green" }}>2</span>
// // //           </div>
// // //         </div>

// // //         <div className="card" style={{ padding: "20px", backgroundColor: "#fff", borderRadius: "8px", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }}>
// // //           <h3 style={{ borderBottom: "1px solid #eee", paddingBottom: "10px", marginBottom: "15px" }}>Recent Activity</h3>
// // //           <p style={{ color: "#64748b", fontSize: "0.9rem" }}>Dr. Aquino, your schedule is looking good today.</p>
// // //         </div>

// // //       </div>
// // //     </div>
// // //   );
// // // }

// // // export default DentistDashboard;

// // // erica11405/identify_se/iDENTify_SE-1e183d9fd33c63ce366f07fd3d7c6df08d287681/iDENTify-Web/frontend/src/pages/dentist/DentistDashboard.jsx

// // import React, { useEffect, useMemo } from "react";
// // import "../../styles/pages/Dashboard.css"; // Reuse the standard dashboard styles
// // import WeeklyBarChart from "../../components/WeeklyBarChart.jsx";
// // import useAppStore from "../../store/useAppStore";
// // import useApi from "../../hooks/useApi";

// // function DentistDashboard() {
// //   const api = useApi();
// //   const appointments = useAppStore((s) => s.appointments);
// //   const queue = useAppStore((s) => s.queue);
// //   const user = useAppStore((s) => s.user); // Assuming user data is in store

// //   useEffect(() => {
// //     const loadData = async () => {
// //       try {
// //         await Promise.all([
// //           api.loadAppointments(),
// //           api.loadQueue(),
// //         ]);
// //       } catch (e) {
// //         console.error("Error loading Dentist Dashboard data", e);
// //       }
// //     };
// //     loadData();
// //   }, []);

// //   // Filter data specifically for this logged-in dentist
// //   const myAppointments = useMemo(() => {
// //     const todayKey = new Date().toLocaleDateString('en-CA');
// //     return appointments.filter(a => 
// //       a.dentist_id === user?.id && 
// //       new Date(a.appointment_datetime).toLocaleDateString('en-CA') === todayKey
// //     );
// //   }, [appointments, user]);

// //   const stats = {
// //     pending: myAppointments.filter(a => a.status === 'Pending').length,
// //     completed: myAppointments.filter(a => a.status === 'Done').length,
// //     inChair: queue.filter(q => q.dentist_id === user?.id && q.status === 'In Treatment').length
// //   };

// //   return (
// //     <div className="dashboard-page">
// //       <div className="dashboard-header">
// //         <h1 className="dashboard-title">Dentist Dashboard</h1>
// //         <p className="dashboard-subtitle-main">Welcome, Dr. {user?.name || 'Dentist'}. Here is your schedule for today.</p>
// //       </div>

// //       {/* 3-Column Stats specific to the Dentist's workload */}
// //       <div className="stats-grid">
// //         <div className="stat-card">
// //           <span className="stat-label">Today's Remaining</span>
// //           <span className="stat-value">{stats.pending}</span>
// //         </div>
// //         <div className="stat-card">
// //           <span className="stat-label">Patients Completed</span>
// //           <span className="stat-value" style={{ color: '#2ecc71' }}>{stats.completed}</span>
// //         </div>
// //         <div className="stat-card">
// //           <span className="stat-label">Currently in Chair</span>
// //           <span className="stat-value" style={{ color: '#f1c40f' }}>{stats.inChair}</span>
// //         </div>
// //       </div>

// //       <div className="dashboard-main-content">
// //         {/* Today's Schedule Table */}
// //         <div className="dashboard-section table-section">
// //           <h3 className="section-title">Your Appointments Today</h3>
// //           <div className="table-container">
// //             <table>
// //               <thead>
// //                 <tr>
// //                   <th>Time</th>
// //                   <th>Patient Name</th>
// //                   <th>Procedure</th>
// //                   <th>Status</th>
// //                 </tr>
// //               </thead>
// //               <tbody>
// //                 {myAppointments.length > 0 ? (
// //                   myAppointments.map(appt => (
// //                     <tr key={appt.id}>
// //                       <td>{appt.timeStart || 'N/A'}</td>
// //                       <td className="bold-text">{appt.full_name || appt.patient_name}</td>
// //                       <td>{appt.procedure || 'General Checkup'}</td>
// //                       <td>
// //                         <span className={`badge ${appt.status?.toLowerCase() || 'pending'}`}>
// //                           {appt.status || 'Scheduled'}
// //                         </span>
// //                       </td>
// //                     </tr>
// //                   ))
// //                 ) : (
// //                   <tr>
// //                     <td colSpan="4" style={{ textAlign: 'center', padding: '2rem', color: '#636e72' }}>
// //                       No appointments assigned to you today.
// //                     </td>
// //                   </tr>
// //                 )}
// //               </tbody>
// //             </table>
// //           </div>
// //         </div>

// //         {/* Weekly Productivity Chart */}
// //         <div className="dashboard-section chart-section">
// //           <h3 className="section-title">Weekly Patient Volume</h3>
// //           <WeeklyBarChart />
// //         </div>
// //       </div>
// //     </div>
// //   );
// // }

// // export default DentistDashboard;


// import React, { useEffect, useMemo } from "react";
// import "../../styles/pages/Dashboard.css";
// import useAppStore from "../../store/useAppStore";
// import useApi from "../../hooks/useApi";

// function DentistDashboard() {
//   const api = useApi();
//   const { user, appointments, queue } = useAppStore();

//   useEffect(() => {
//     api.loadAppointments();
//     api.loadQueue();
//   }, []);

//   const myAppts = useMemo(() => {
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
//         <p className="dashboard-subtitle">Welcome, Dr. {user?.name}. You have {myAppts.length} patients today.</p>
//       </div>

//       <div className="stats-container">
//         <div className="stat-card">
//           <span className="stat-label">Total Appointments</span>
//           <span className="stat-value">{myAppts.length}</span>
//         </div>
//         <div className="stat-card">
//           <span className="stat-label">Pending</span>
//           <span className="stat-value" style={{color: "#f39c12"}}>{myAppts.filter(a => a.status !== 'Done').length}</span>
//         </div>
//         <div className="stat-card">
//           <span className="stat-label">Completed</span>
//           <span className="stat-value" style={{color: "#27ae60"}}>{myAppts.filter(a => a.status === 'Done').length}</span>
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
//             {myAppts.map(appt => (
//               <tr key={appt.id}>
//                 <td>{appt.timeStart}</td>
//                 <td className="patient-name">{appt.patient_name || appt.full_name}</td>
//                 <td>{appt.procedure}</td>
//                 <td><span className={`status-badge ${appt.status?.toLowerCase()}`}>{appt.status}</span></td>
//               </tr>
//             ))}
//           </tbody>
//         </table>
//       </div>
//     </div>
//   );
// }

// export default DentistDashboard;

import React, { useEffect, useMemo } from "react";
import "../../styles/pages/Dashboard.css";
import useAppStore from "../../store/useAppStore";
import useApi from "../../hooks/useApi";

function DentistDashboard() {
  const api = useApi();
  const { user, appointments, queue } = useAppStore();

  useEffect(() => {
    api.loadAppointments();
    api.loadQueue();
  }, []);

  const myTodayAppts = useMemo(() => {
    const today = new Date().toLocaleDateString('en-CA');
    return appointments.filter(a => 
      a.dentist_id === user?.id && 
      new Date(a.appointment_datetime).toLocaleDateString('en-CA') === today
    );
  }, [appointments, user]);

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <h1 className="dashboard-title">Doctor's Overview</h1>
        <p className="dashboard-subtitle-main">Welcome, Dr. {user?.name}. Here is your schedule for today.</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-label">My Appointments</span>
          <span className="stat-value">{myTodayAppts.length}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Patients Waiting</span>
          <span className="stat-value" style={{color: '#f59e0b'}}>
            {queue.filter(q => q.dentist_id === user?.id && q.status === 'Waiting').length}
          </span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Completed Today</span>
          <span className="stat-value" style={{color: '#10b981'}}>
            {myTodayAppts.filter(a => a.status === 'Done').length}
          </span>
        </div>
      </div>

      <div className="dashboard-main-content">
        <div className="dashboard-section">
          <h3 className="section-title">Today's Patient List</h3>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Patient</th>
                  <th>Procedure</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {myTodayAppts.map(appt => (
                  <tr key={appt.id}>
                    <td>{appt.timeStart || 'Scheduled'}</td>
                    <td className="bold-text">{appt.patient_name || appt.full_name}</td>
                    <td>{appt.procedure || 'Consultation'}</td>
                    <td>
                      <span className={`badge ${appt.status?.toLowerCase() || 'pending'}`}>
                        {appt.status || 'Pending'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DentistDashboard;