// import React, { useEffect, useState } from "react";
// import DatePicker from "react-datepicker";
// import "react-datepicker/dist/react-datepicker.css";
// import apiClient from "../../api/apiClient";
// import useApi from "../../hooks/useApi";
// import useAppStore from "../../store/useAppStore";
// import "../../styles/pages/Reports.css";

// function Reports() {
//   const api = useApi();
//   const reports = useAppStore((state) => state.reports);
//   const dentists = useAppStore((state) => state.dentists || []); // Pull dentists to cross-reference
//   const { dailySummary, dentistPerformance } = reports || {};
//   const [selectedDate, setSelectedDate] = useState(new Date());

//   // Modal and Patient Data States
//   const [patientsModalOpen, setPatientsModalOpen] = useState(false);
//   const [selectedDentist, setSelectedDentist] = useState(null);
//   const [dentistPatients, setDentistPatients] = useState([]);
//   const [patientsLoading, setPatientsLoading] = useState(false);
//   const [patientsError, setPatientsError] = useState(null);

//   const hasData = !!(dailySummary && dentistPerformance);

//   // Load reports and dentists when date changes
//   useEffect(() => {
//     const dateStr = selectedDate.toISOString().split('T')[0];
//     api.loadReports(dateStr).catch(err => console.error("Load reports failed", err));
//     api.loadDentists().catch(err => console.error("Load dentists failed", err));
//   }, [selectedDate, api]);

//   const formatApptTime = (value) => {
//     if (!value) return "-";
//     const date = new Date(value);
//     if (Number.isNaN(date.getTime())) return "-";
//     return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
//   };

//   // Robust function to always get a displayable name
//   const getDentistName = (d) => {
//     if (!d) return "Unknown Dentist";
//     let name = d.name || d.dentist_name;
    
//     if (!name && (d.first_name || d.last_name)) {
//       name = `${d.first_name || ''} ${d.last_name || ''}`.trim();
//     }
    
//     // If still blank, look up the dentist in the global store by ID
//     if (!name || name.trim() === "") {
//       const found = dentists.find(dent => String(dent.id) === String(d.id || d.dentist_id));
//       if (found) {
//          name = found.name || `${found.first_name || ''} ${found.last_name || ''}`.trim();
//       }
//     }
    
//     return name || "Unassigned / Unknown";
//   };

//   const openDentistPatients = async (dentist) => {
//     setSelectedDentist(dentist);
//     setPatientsModalOpen(true);
//     setPatientsLoading(true);
//     setPatientsError(null);
//     setDentistPatients([]);

//     const dateStr = selectedDate.toISOString().split('T')[0];
//     try {
//       // Fallback in case the dentist is unassigned (null ID)
//       const targetId = dentist.id || dentist.dentist_id || "unassigned";
//       const data = await apiClient.getDentistPatientsForReport(targetId, dateStr);
//       setDentistPatients(data?.patients || []);
//     } catch (err) {
//       setPatientsError("Failed to load records.");
//     } finally {
//       setPatientsLoading(false);
//     }
//   };

//   const closePatientsModal = () => {
//     setPatientsModalOpen(false);
//     setSelectedDentist(null);
//     setDentistPatients([]);
//   };

//   // Function to export specific Dentist Patient List to PDF
//   const exportDentistPatientsToPDF = async () => {
//     if (dentistPatients.length === 0 || !selectedDentist) return;
    
//     try {
//       const jsPDF = (await import("jspdf")).default;
//       const autoTable = (await import("jspdf-autotable")).default;

//       const doc = new jsPDF();
//       const dateStr = selectedDate.toLocaleDateString();

//       const dentistDisplayName = getDentistName(selectedDentist);

//       doc.setFontSize(18);
//       doc.text(`Patient List - ${dentistDisplayName}`, 14, 15);
      
//       doc.setFontSize(11);
//       doc.setTextColor(100);
//       doc.text(`Report Date: ${dateStr}`, 14, 22);

//       const tableBody = dentistPatients.map(p => [
//         p.full_name || p.name || "Unknown",
//         formatApptTime(p.appointment_datetime || p.timeStart),
//         p.reason || p.procedure || "Check-up"
//       ]);

//       autoTable(doc, {
//         startY: 30,
//         head: [['Patient Name', 'Time', 'Reason / Procedure']],
//         body: tableBody,
//         headStyles: { fillColor: [41, 128, 185] }, // iDENTify Blue
//         styles: { fontSize: 10 },
//       });

//       // Safely replace any weird characters to prevent crash during save
//       const safeName = dentistDisplayName.replace(/[^a-zA-Z0-9]/g, '_');
//       const fileName = `Patients_${safeName}_${selectedDate.toISOString().slice(0, 10)}.pdf`;
//       doc.save(fileName);
//     } catch (err) {
//       console.error("PDF Export failed", err);
//       alert("Failed to export PDF.");
//     }
//   };

//   const exportToPDF = async () => {
//     if (!hasData) return;
//     const jsPDF = (await import("jspdf")).default;
//     const autoTable = (await import("jspdf-autotable")).default;

//     const doc = new jsPDF();
//     const dateStr = selectedDate.toLocaleDateString();

//     doc.setFontSize(18);
//     doc.text(`Clinic Report - ${dateStr}`, 14, 15);

//     doc.setFontSize(14);
//     doc.text("Daily Summary", 14, 25);

//     autoTable(doc, {
//       startY: 30,
//       head: [['Metric', 'Value']],
//       body: [
//         ['Patients Seen', dailySummary.patientsSeen],
//         ['Procedures Done', dailySummary.proceduresDone],
//         ['New Patients', dailySummary.newPatients],
//         ['Avg. Treatment Duration', dailySummary.avgTreatmentDuration],
//       ],
//     });

//     const finalY = doc.lastAutoTable.finalY || 40;
//     doc.text("Dentist Performance", 14, finalY + 15);

//     const performanceBody = dentistPerformance.map(d => {
//       const distributionStr = Object.entries(d.treatmentDistribution || {})
//         .map(([k, v]) => `${k}: ${v}`)
//         .join(", ");
      
//       return [
//         getDentistName(d),
//         d.patientsHandled,
//         distributionStr || "None",
//         `${Math.round(d.avgTimePerPatient || 0)} min`
//       ];
//     });

//     autoTable(doc, {
//       startY: finalY + 20,
//       head: [['Dentist', 'Patients', 'Procedures', 'Avg Time']],
//       body: performanceBody,
//     });

//     doc.save(`clinic_report_${selectedDate.toISOString().slice(0, 10)}.pdf`);
//   };

//   const exportToExcel = async () => {
//     if (!hasData) return;
//     const XLSX = await import("xlsx");

//     const summaryData = [
//       { Metric: "Date", Value: selectedDate.toLocaleDateString() },
//       { Metric: "Patients Seen", Value: dailySummary.patientsSeen },
//       { Metric: "Procedures Done", Value: dailySummary.proceduresDone },
//       { Metric: "New Patients", Value: dailySummary.newPatients },
//       { Metric: "Avg Duration", Value: dailySummary.avgTreatmentDuration },
//     ];
//     const dailySummaryWs = XLSX.utils.json_to_sheet(summaryData);

//     const performanceData = dentistPerformance.map(d => ({
//       Dentist: getDentistName(d),
//       Patients_Handled: d.patientsHandled,
//       Avg_Time_Per_Patient: `${Math.round(d.avgTimePerPatient || 0)} min`,
//       Treatment_Distribution: Object.entries(d.treatmentDistribution || {})
//         .map(([k, v]) => `${k}: ${v}`)
//         .join(", ")
//     }));

//     const dentistPerformanceWs = XLSX.utils.json_to_sheet(performanceData);
//     const wb = XLSX.utils.book_new();
//     XLSX.utils.book_append_sheet(wb, dailySummaryWs, "Daily Summary");
//     XLSX.utils.book_append_sheet(wb, dentistPerformanceWs, "Dentist Performance");

//     XLSX.writeFile(wb, `clinic_report_${selectedDate.toISOString().slice(0, 10)}.xlsx`);
//   };

//   return (
//     <div className="reports-page">
//       <div className="reports-header">
//         <h2 className="reports-title">Reports</h2>
//         <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-end' }}>
//           <div className="date-picker-container">
//             <span className="small-label">Select Date</span>
//             <DatePicker
//               selected={selectedDate}
//               onChange={date => setSelectedDate(date)}
//               className="datepicker-input"
//               dateFormat="MMMM d, yyyy"
//             />
//           </div>
//           <div className="export-buttons">
//             <button onClick={exportToPDF} className="export-btn pdf" disabled={!hasData || api.loading}>
//               Export PDF
//             </button>
//             <button onClick={exportToExcel} className="export-btn excel" disabled={!hasData || api.loading}>
//               Export Excel
//             </button>
//           </div>
//         </div>
//       </div>

//       {api.loading && <p className="loading-state">Loading reports...</p>}

//       {api.error && (
//         <div className="error-message" style={{ color: 'red', padding: '1rem', background: '#ffe3e3', borderRadius: '8px', margin: '1rem 0' }}>
//           <h3>Error loading reports</h3>
//           <p>Please check your connection or database schema.</p>
//         </div>
//       )}

//       {!api.loading && hasData && (
//         <>
//           <div className="report-section">
//             <h3 className="report-subtitle">Daily Summary ({selectedDate.toLocaleDateString()})</h3>
//             <table className="report-table">
//               <thead>
//                 <tr><th>Metric</th><th>Value</th></tr>
//               </thead>
//               <tbody>
//                 <tr><td>Patients Seen (Done)</td><td>{dailySummary.patientsSeen}</td></tr>
//                 <tr><td>Procedures Completed</td><td>{dailySummary.proceduresDone}</td></tr>
//                 <tr><td>New Patients Registered</td><td>{dailySummary.newPatients}</td></tr>
//                 <tr><td>Avg. Treatment Duration</td><td>{dailySummary.avgTreatmentDuration}</td></tr>
//               </tbody>
//             </table>
//           </div>

//           <div className="report-section">
//             <h3 className="report-subtitle">Dentist Performance</h3>
//             <table className="report-table">
//               <thead>
//                 <tr>
//                   <th>Dentist</th>
//                   <th>Patients Handled</th>
//                   <th>Treatment Distribution</th>
//                   <th>Avg. Time</th>
//                 </tr>
//               </thead>
//               <tbody>
//                 {dentistPerformance.length === 0 ? (
//                   <tr><td colSpan="4">No performance data for this date.</td></tr>
//                 ) : (
//                   dentistPerformance.map((dentist, index) => (
//                     <tr key={dentist.id || index}>
//                       <td>
//                         <button type="button" className="dentist-link" onClick={() => openDentistPatients(dentist)}>
//                           {getDentistName(dentist)}
//                         </button>
//                       </td>
//                       <td>{dentist.patientsHandled}</td>
//                       <td>
//                         {Object.entries(dentist.treatmentDistribution || {})
//                           .map(([key, value]) => `${key}: ${value}`)
//                           .join(", ") || "-"}
//                       </td>
//                       <td>{Math.round(dentist.avgTimePerPatient || 0)} min</td>
//                     </tr>
//                   ))
//                 )}
//               </tbody>
//             </table>
//           </div>
//         </>
//       )}

//       {/* Patient List Modal */}
//       {patientsModalOpen && (
//         <div className="modal-overlay" onClick={closePatientsModal}>
//           <div className="patient-list-modal" onClick={(e) => e.stopPropagation()}>
//             <div className="modal-header">
//               <div className="modal-title-group">
//                 <h3>Patients handled by {getDentistName(selectedDentist)}</h3>
//                 <p>{selectedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
//               </div>
//               <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
//                 <button 
//                   className="export-btn pdf" 
//                   style={{ fontSize: '0.85rem', padding: '6px 12px' }}
//                   onClick={(e) => {
//                     e.stopPropagation(); // Stops the modal from closing when clicked
//                     exportDentistPatientsToPDF();
//                   }}
//                   disabled={dentistPatients.length === 0}
//                 >
//                   Download PDF
//                 </button>
//                 <button className="close-x" onClick={closePatientsModal}>&times;</button>
//               </div>
//             </div>

//             <div className="modal-body">
//               {patientsLoading ? (
//                 <div className="modal-state">Loading patient records...</div>
//               ) : patientsError ? (
//                 <div className="modal-state error">{patientsError}</div>
//               ) : dentistPatients.length === 0 ? (
//                 <div className="modal-state">No patients recorded for this date.</div>
//               ) : (
//                 <div className="report-section">
//                   <table className="report-table">
//                     <thead>
//                       <tr>
//                         <th>Patient Name</th>
//                         <th>Appointment Time</th>
//                         <th>Reason / Procedure</th>
//                       </tr>
//                     </thead>
//                     <tbody>
//                       {dentistPatients.map((p, i) => (
//                         <tr key={i}>
//                           <td style={{ fontWeight: '500' }}>{p.full_name || p.name || "Unknown"}</td>
//                           <td>{formatApptTime(p.appointment_datetime || p.timeStart)}</td>
//                           <td>{p.reason || p.procedure || "Check-up"}</td>
//                         </tr>
//                       ))}
//                     </tbody>
//                   </table>
//                 </div>
//               )}
//             </div>
            
//             <div className="modal-footer">
//               <button className="close-btn-simple" onClick={closePatientsModal}>Close</button>
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }

// export default Reports;


import React, { useEffect, useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import apiClient from "../../api/apiClient";
import useApi from "../../hooks/useApi";
import useAppStore from "../../store/useAppStore";
import "../../styles/pages/Reports.css";

function Reports() {
  const api = useApi();
  const reports = useAppStore((state) => state.reports);
  const dentists = useAppStore((state) => state.dentists || []); // Pull dentists to cross-reference
  const { dailySummary, dentistPerformance } = reports || {};
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Modal and Patient Data States
  const [patientsModalOpen, setPatientsModalOpen] = useState(false);
  const [selectedDentist, setSelectedDentist] = useState(null);
  const [dentistPatients, setDentistPatients] = useState([]);
  const [patientsLoading, setPatientsLoading] = useState(false);
  const [patientsError, setPatientsError] = useState(null);

  const hasData = !!(dailySummary && dentistPerformance);

  // Load reports and dentists when date changes
  useEffect(() => {
    const dateStr = selectedDate.toISOString().split('T')[0];
    api.loadReports(dateStr).catch(err => console.error("Load reports failed", err));
    api.loadDentists().catch(err => console.error("Load dentists failed", err));
  }, [selectedDate, api]);

  const formatApptTime = (value) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  // Robust function to always get a displayable name
  const getDentistName = (d) => {
    if (!d) return "Unknown Dentist";
    let name = d.name || d.dentist_name;
    
    if (!name && (d.first_name || d.last_name)) {
      name = `${d.first_name || ''} ${d.last_name || ''}`.trim();
    }
    
    // If still blank, look up the dentist in the global store by ID
    if (!name || name.trim() === "") {
      const found = dentists.find(dent => String(dent.id) === String(d.id || d.dentist_id));
      if (found) {
         name = found.name || `${found.first_name || ''} ${found.last_name || ''}`.trim();
      }
    }
    
    return name || "Unassigned / Unknown";
  };

  const openDentistPatients = async (dentist) => {
    setSelectedDentist(dentist);
    setPatientsModalOpen(true);
    setPatientsLoading(true);
    setPatientsError(null);
    setDentistPatients([]);

    const dateStr = selectedDate.toISOString().split('T')[0];
    try {
      // Fallback in case the dentist is unassigned (null ID)
      const targetId = dentist.id || dentist.dentist_id || "unassigned";
      const data = await apiClient.getDentistPatientsForReport(targetId, dateStr);
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

  // Function to export specific Dentist Patient List to PDF
  const exportDentistPatientsToPDF = async () => {
    if (dentistPatients.length === 0 || !selectedDentist) return;
    
    try {
      const jsPDF = (await import("jspdf")).default;
      const autoTable = (await import("jspdf-autotable")).default;

      const doc = new jsPDF();
      const dateStr = selectedDate.toLocaleDateString();

      const dentistDisplayName = getDentistName(selectedDentist);

      doc.setFontSize(18);
      doc.text(`Patient List - ${dentistDisplayName}`, 14, 15);
      
      doc.setFontSize(11);
      doc.setTextColor(100);
      doc.text(`Report Date: ${dateStr}`, 14, 22);

      const tableBody = dentistPatients.map(p => [
        p.full_name || p.name || "Unknown",
        formatApptTime(p.appointment_datetime || p.timeStart),
        p.reason || p.procedure || "Check-up"
      ]);

      autoTable(doc, {
        startY: 30,
        head: [['Patient Name', 'Time', 'Reason / Procedure']],
        body: tableBody,
        headStyles: { fillColor: [41, 128, 185] }, // iDENTify Blue
        styles: { fontSize: 10 },
      });

      // Safely replace any weird characters to prevent crash during save
      const safeName = dentistDisplayName.replace(/[^a-zA-Z0-9]/g, '_');
      const fileName = `Patients_${safeName}_${selectedDate.toISOString().slice(0, 10)}.pdf`;
      doc.save(fileName);
    } catch (err) {
      console.error("PDF Export failed", err);
      alert("Failed to export PDF.");
    }
  };

  const exportToPDF = async () => {
    if (!hasData) return;
    const jsPDF = (await import("jspdf")).default;
    const autoTable = (await import("jspdf-autotable")).default;

    const doc = new jsPDF();
    const dateStr = selectedDate.toLocaleDateString();

    doc.setFontSize(18);
    doc.text(`Clinic Report - ${dateStr}`, 14, 15);

    doc.setFontSize(14);
    doc.text("Daily Summary", 14, 25);

    autoTable(doc, {
      startY: 30,
      head: [['Metric', 'Value']],
      body: [
        ['Patients Seen', dailySummary.patientsSeen],
        ['Procedures Done', dailySummary.proceduresDone],
        ['New Patients', dailySummary.newPatients],
      ],
    });

    const finalY = doc.lastAutoTable.finalY || 40;
    doc.text("Dentist Performance", 14, finalY + 15);

    const performanceBody = dentistPerformance.map(d => {
      const distributionStr = Object.entries(d.treatmentDistribution || {})
        .map(([k, v]) => `${k}: ${v}`)
        .join(", ");
      
      return [
        getDentistName(d),
        d.patientsHandled,
        distributionStr || "None",
      ];
    });

    autoTable(doc, {
      startY: finalY + 20,
      head: [['Dentist', 'Patients', 'Procedures']],
      body: performanceBody,
    });

    doc.save(`clinic_report_${selectedDate.toISOString().slice(0, 10)}.pdf`);
  };

  const exportToExcel = async () => {
    if (!hasData) return;
    const XLSX = await import("xlsx");

    const summaryData = [
      { Metric: "Date", Value: selectedDate.toLocaleDateString() },
      { Metric: "Patients Seen", Value: dailySummary.patientsSeen },
      { Metric: "Procedures Done", Value: dailySummary.proceduresDone },
      { Metric: "New Patients", Value: dailySummary.newPatients },
    ];
    const dailySummaryWs = XLSX.utils.json_to_sheet(summaryData);

    const performanceData = dentistPerformance.map(d => ({
      Dentist: getDentistName(d),
      Patients_Handled: d.patientsHandled,
      Treatment_Distribution: Object.entries(d.treatmentDistribution || {})
        .map(([k, v]) => `${k}: ${v}`)
        .join(", ")
    }));

    const dentistPerformanceWs = XLSX.utils.json_to_sheet(performanceData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, dailySummaryWs, "Daily Summary");
    XLSX.utils.book_append_sheet(wb, dentistPerformanceWs, "Dentist Performance");

    XLSX.writeFile(wb, `clinic_report_${selectedDate.toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="reports-page">
      <div className="reports-header">
        <h2 className="reports-title">Reports</h2>
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-end' }}>
          <div className="date-picker-container">
            <span className="small-label">Select Date</span>
            <DatePicker
              selected={selectedDate}
              onChange={date => setSelectedDate(date)}
              className="datepicker-input"
              dateFormat="MMMM d, yyyy"
            />
          </div>
          <div className="export-buttons">
            <button onClick={exportToPDF} className="export-btn pdf" disabled={!hasData || api.loading}>
              Export PDF
            </button>
            <button onClick={exportToExcel} className="export-btn excel" disabled={!hasData || api.loading}>
              Export Excel
            </button>
          </div>
        </div>
      </div>

      {api.loading && <p className="loading-state">Loading reports...</p>}

      {api.error && (
        <div className="error-message" style={{ color: 'red', padding: '1rem', background: '#ffe3e3', borderRadius: '8px', margin: '1rem 0' }}>
          <h3>Error loading reports</h3>
          <p>Please check your connection or database schema.</p>
        </div>
      )}

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
                  <th>Treatment Distribution</th>
                </tr>
              </thead>
              <tbody>
                {dentistPerformance.length === 0 ? (
                  <tr><td colSpan="3">No performance data for this date.</td></tr>
                ) : (
                  dentistPerformance.map((dentist, index) => (
                    <tr key={dentist.id || index}>
                      <td>
                        <button type="button" className="dentist-link" onClick={() => openDentistPatients(dentist)}>
                          {getDentistName(dentist)}
                        </button>
                      </td>
                      <td>{dentist.patientsHandled}</td>
                      <td>
                        {Object.entries(dentist.treatmentDistribution || {})
                          .map(([key, value]) => `${key}: ${value}`)
                          .join(", ") || "-"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Patient List Modal */}
      {patientsModalOpen && (
        <div className="modal-overlay" onClick={closePatientsModal}>
          <div className="patient-list-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-group">
                <h3>Patients handled by {getDentistName(selectedDentist)}</h3>
                <p>{selectedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
              </div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <button 
                  className="export-btn pdf" 
                  style={{ fontSize: '0.85rem', padding: '6px 12px' }}
                  onClick={(e) => {
                    e.stopPropagation(); // Stops the modal from closing when clicked
                    exportDentistPatientsToPDF();
                  }}
                  disabled={dentistPatients.length === 0}
                >
                  Download PDF
                </button>
                <button className="close-x" onClick={closePatientsModal}>&times;</button>
              </div>
            </div>

            <div className="modal-body">
              {patientsLoading ? (
                <div className="modal-state">Loading patient records...</div>
              ) : patientsError ? (
                <div className="modal-state error">{patientsError}</div>
              ) : dentistPatients.length === 0 ? (
                <div className="modal-state">No patients recorded for this date.</div>
              ) : (
                <div className="report-section">
                  <table className="report-table">
                    <thead>
                      <tr>
                        <th>Patient Name</th>
                        <th>Appointment Time</th>
                        <th>Reason / Procedure</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dentistPatients.map((p, i) => (
                        <tr key={i}>
                          <td style={{ fontWeight: '500' }}>{p.full_name || p.name || "Unknown"}</td>
                          <td>{formatApptTime(p.appointment_datetime || p.timeStart)}</td>
                          <td>{p.reason || p.procedure || "Check-up"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
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