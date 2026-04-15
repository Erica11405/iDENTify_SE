// import React, { useEffect, useState } from "react";
// import DatePicker from "react-datepicker";
// import "react-datepicker/dist/react-datepicker.css";
// import apiClient from "../../api/apiClient";
// import useApi from "../../hooks/useApi";
// import useAppStore from "../../store/useAppStore";
// import "../../styles/pages/aide/Reports.css";

// function Reports() {
//   const api = useApi();
//   const reports = useAppStore((state) => state.reports);
//   const dentists = useAppStore((state) => state.dentists || []); 
//   const { dailySummary, dentistPerformance } = reports || {};
  
//   const [startDate, setStartDate] = useState(new Date());
//   const [endDate, setEndDate] = useState(new Date());
//   const [rangeType, setRangeType] = useState('daily'); // daily, weekly, monthly, yearly, custom

//   // Modal and Patient Data States
//   const [patientsModalOpen, setPatientsModalOpen] = useState(false);
//   const [selectedDentist, setSelectedDentist] = useState(null);
//   const [dentistPatients, setDentistPatients] = useState([]);
//   const [patientsLoading, setPatientsLoading] = useState(false);
//   const [patientsError, setPatientsError] = useState(null);

//   const hasData = !!(dailySummary && dentistPerformance);

//   const handleRangeChange = (type) => {
//     setRangeType(type);
//     const start = new Date();
//     const end = new Date();

//     if (type === 'weekly') {
//       start.setDate(start.getDate() - 7);
//     } else if (type === 'monthly') {
//       start.setMonth(start.getMonth() - 1);
//     } else if (type === 'yearly') {
//       start.setFullYear(start.getFullYear() - 1);
//     }
//     setStartDate(start);
//     setEndDate(end);
//   };

//   // Load reports and dentists when dates change
//   useEffect(() => {
//     const startStr = startDate.toISOString().split('T')[0];
//     const endStr = endDate.toISOString().split('T')[0];
    
//     // Fallback: If your useApi loadReports hook only accepts one date string,
//     // we bypass it to directly call apiClient so we can pass both parameters safely.
//     const fetchReports = async () => {
//       try {
//         const response = await apiClient.get(`/reports?startDate=${startStr}&endDate=${endStr}`);
//         useAppStore.setState({ reports: response.data || response });
//       } catch (err) {
//         console.error("Load reports failed", err);
//       }
//     };
    
//     fetchReports();
//     api.loadDentists().catch(err => console.error("Load dentists failed", err));
//   }, [startDate, endDate]); // removed api to prevent double-firing if api object changes

//   const formatApptTime = (value) => {
//     if (!value) return "-";
//     const date = new Date(value);
//     if (Number.isNaN(date.getTime())) return "-";
//     return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
//   };

//   const getDentistName = (d) => {
//     if (!d) return "Unknown Dentist";
//     let name = d.name || d.dentist_name;
    
//     if (!name && (d.first_name || d.last_name)) {
//       name = `${d.first_name || ''} ${d.last_name || ''}`.trim();
//     }
    
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

//     const startStr = startDate.toISOString().split('T')[0];
//     const endStr = endDate.toISOString().split('T')[0];
    
//     try {
//       const targetId = dentist.id || dentist.dentist_id || "unassigned";
//       // Bypassing frontend wrapper functions to ensure range queries work flawlessly
//       const response = await apiClient.get(`/reports/dentist/${targetId}/patients?startDate=${startStr}&endDate=${endStr}`);
//       // Accessing response.data.patients handles Axios responses properly
//       setDentistPatients(response?.data?.patients || response?.patients || []);
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

//   const getTitleDateRangeStr = () => {
//     return rangeType === 'daily' 
//       ? startDate.toLocaleDateString() 
//       : `${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`;
//   };

//   const exportDentistPatientsToPDF = async () => {
//     if (dentistPatients.length === 0 || !selectedDentist) return;
    
//     try {
//       const jsPDF = (await import("jspdf")).default;
//       const autoTable = (await import("jspdf-autotable")).default;

//       const doc = new jsPDF();
//       const dateStr = getTitleDateRangeStr();
//       const dentistDisplayName = getDentistName(selectedDentist);

//       doc.setFontSize(18);
//       doc.text(`Patient List - ${dentistDisplayName}`, 14, 15);
      
//       doc.setFontSize(11);
//       doc.setTextColor(100);
//       doc.text(`Report Date: ${dateStr}`, 14, 22);

//       const tableBody = dentistPatients.map(p => [
//         p.full_name || p.name || "Unknown",
//         new Date(p.appointment_datetime || p.timeStart).toLocaleDateString() + ' - ' + formatApptTime(p.appointment_datetime || p.timeStart),
//         p.reason || p.procedure || "Check-up"
//       ]);

//       autoTable(doc, {
//         startY: 30,
//         head: [['Patient Name', 'Date & Time', 'Reason / Procedure']],
//         body: tableBody,
//         headStyles: { fillColor: [41, 128, 185] }, 
//         styles: { fontSize: 10 },
//       });

//       const safeName = dentistDisplayName.replace(/[^a-zA-Z0-9]/g, '_');
//       const fileName = `Patients_${safeName}_${startDate.toISOString().slice(0, 10)}_to_${endDate.toISOString().slice(0, 10)}.pdf`;
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
//     const dateStr = getTitleDateRangeStr();

//     doc.setFontSize(18);
//     doc.text(`Clinic Report - ${dateStr}`, 14, 15);

//     doc.setFontSize(14);
//     doc.text("Summary", 14, 25);

//     autoTable(doc, {
//       startY: 30,
//       head: [['Metric', 'Value']],
//       body: [
//         ['Patients Seen', dailySummary.patientsSeen],
//         ['Procedures Done', dailySummary.proceduresDone],
//         ['New Patients', dailySummary.newPatients],
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
//       ];
//     });

//     autoTable(doc, {
//       startY: finalY + 20,
//       head: [['Dentist', 'Patients', 'Procedures']],
//       body: performanceBody,
//     });

//     doc.save(`clinic_report_${startDate.toISOString().slice(0, 10)}_to_${endDate.toISOString().slice(0, 10)}.pdf`);
//   };

//   const exportToExcel = async () => {
//     if (!hasData) return;
//     const XLSX = await import("xlsx");

//     const summaryData = [
//       { Metric: "Date Range", Value: getTitleDateRangeStr() },
//       { Metric: "Patients Seen", Value: dailySummary.patientsSeen },
//       { Metric: "Procedures Done", Value: dailySummary.proceduresDone },
//       { Metric: "New Patients", Value: dailySummary.newPatients },
//     ];
//     const dailySummaryWs = XLSX.utils.json_to_sheet(summaryData);

//     const performanceData = dentistPerformance.map(d => ({
//       Dentist: getDentistName(d),
//       Patients_Handled: d.patientsHandled,
//       Treatment_Distribution: Object.entries(d.treatmentDistribution || {})
//         .map(([k, v]) => `${k}: ${v}`)
//         .join(", ")
//     }));

//     const dentistPerformanceWs = XLSX.utils.json_to_sheet(performanceData);
//     const wb = XLSX.utils.book_new();
//     XLSX.utils.book_append_sheet(wb, dailySummaryWs, "Summary");
//     XLSX.utils.book_append_sheet(wb, dentistPerformanceWs, "Dentist Performance");

//     XLSX.writeFile(wb, `clinic_report_${startDate.toISOString().slice(0, 10)}_to_${endDate.toISOString().slice(0, 10)}.xlsx`);
//   };

//   return (
//     <div className="reports-page">
//       <div className="reports-header">
//         <div style={{display: 'flex', flexDirection: 'column'}}>
//             <h2 className="reports-title">Reports</h2>
//             <div className="range-selector" style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
//                 <button onClick={() => handleRangeChange('daily')} className={`export-btn ${rangeType === 'daily' ? 'pdf' : ''}`} style={{padding: '5px 10px', fontSize: '0.85rem'}}>Today</button>
//                 <button onClick={() => handleRangeChange('weekly')} className={`export-btn ${rangeType === 'weekly' ? 'pdf' : ''}`} style={{padding: '5px 10px', fontSize: '0.85rem'}}>Past Week</button>
//                 <button onClick={() => handleRangeChange('monthly')} className={`export-btn ${rangeType === 'monthly' ? 'pdf' : ''}`} style={{padding: '5px 10px', fontSize: '0.85rem'}}>Past Month</button>
//                 <button onClick={() => handleRangeChange('yearly')} className={`export-btn ${rangeType === 'yearly' ? 'pdf' : ''}`} style={{padding: '5px 10px', fontSize: '0.85rem'}}>Past Year</button>
//             </div>
//         </div>

//         <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-end', marginTop: '10px' }}>
//           <div className="date-picker-container">
//             <span className="small-label">Start Date</span>
//             <DatePicker
//               selected={startDate}
//               onChange={date => { setStartDate(date); setRangeType('custom'); }}
//               selectsStart
//               startDate={startDate}
//               endDate={endDate}
//               className="datepicker-input"
//               dateFormat="MMMM d, yyyy"
//             />
//           </div>
//           <div className="date-picker-container">
//             <span className="small-label">End Date</span>
//             <DatePicker
//               selected={endDate}
//               onChange={date => { setEndDate(date); setRangeType('custom'); }}
//               selectsEnd
//               startDate={startDate}
//               endDate={endDate}
//               minDate={startDate}
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
//             <h3 className="report-subtitle">Summary ({getTitleDateRangeStr()})</h3>
//             <table className="report-table">
//               <thead>
//                 <tr><th>Metric</th><th>Value</th></tr>
//               </thead>
//               <tbody>
//                 <tr><td>Patients Seen (Done)</td><td>{dailySummary.patientsSeen}</td></tr>
//                 <tr><td>Procedures Completed</td><td>{dailySummary.proceduresDone}</td></tr>
//                 <tr><td>New Patients Registered</td><td>{dailySummary.newPatients}</td></tr>
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
//                 </tr>
//               </thead>
//               <tbody>
//                 {dentistPerformance.length === 0 ? (
//                   <tr><td colSpan="3">No performance data for this date range.</td></tr>
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
//                 <p>{getTitleDateRangeStr()}</p>
//               </div>
//               <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
//                 <button 
//                   className="export-btn pdf" 
//                   style={{ fontSize: '0.85rem', padding: '6px 12px' }}
//                   onClick={(e) => {
//                     e.stopPropagation(); 
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
//                 <div className="modal-state">No patients recorded for this date range.</div>
//               ) : (
//                 <div className="report-section">
//                   <table className="report-table">
//                     <thead>
//                       <tr>
//                         <th>Patient Name</th>
//                         <th>Date & Time</th>
//                         <th>Reason / Procedure</th>
//                       </tr>
//                     </thead>
//                     <tbody>
//                       {dentistPatients.map((p, i) => (
//                         <tr key={i}>
//                           <td style={{ fontWeight: '500' }}>{p.full_name || p.name || "Unknown"}</td>
//                           <td>{new Date(p.appointment_datetime || p.timeStart).toLocaleDateString()} {formatApptTime(p.appointment_datetime || p.timeStart)}</td>
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




import React, { useCallback, useEffect, useMemo, useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import apiClient from "../../api/apiClient";
import useApi from "../../hooks/useApi";
import useAppStore from "../../store/useAppStore";
import WeeklyBarChart from "../../components/WeeklyBarChart";
import "../../styles/pages/aide/Reports.css";

function Reports({ pageTitle = "Reports", pageSubtitle = "Clinic-wide analytics and exports.", showSummaryCards = true }) {
  const api = useApi();
  const reports = useAppStore((state) => state.reports);
  const dentists = useAppStore((state) => state.dentists || []); 
  const { dailySummary, dentistPerformance } = reports || {};
  
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [rangeType, setRangeType] = useState('daily'); // daily, weekly, monthly, yearly, custom

  // Modal and Patient Data States
  const [patientsModalOpen, setPatientsModalOpen] = useState(false);
  const [selectedDentist, setSelectedDentist] = useState(null);
  const [dentistPatients, setDentistPatients] = useState([]);
  const [patientsLoading, setPatientsLoading] = useState(false);
  const [patientsError, setPatientsError] = useState(null);

  const hasData = !!(dailySummary && dentistPerformance);
  const summary = {
    patientsSeen: dailySummary?.patientsSeen || 0,
    proceduresDone: dailySummary?.proceduresDone || 0,
    newPatients: dailySummary?.newPatients || 0,
    avgTreatmentDuration: dailySummary?.avgTreatmentDuration || "0 min",
  };

  const handleRangeChange = (type) => {
    setRangeType(type);
    const start = new Date();
    const end = new Date();

    if (type === 'weekly') {
      start.setDate(start.getDate() - 7);
    } else if (type === 'monthly') {
      start.setMonth(start.getMonth() - 1);
    } else if (type === 'yearly') {
      start.setFullYear(start.getFullYear() - 1);
    }
    setStartDate(start);
    setEndDate(end);
  };

  // Load reports and dentists when dates change
  useEffect(() => {
    const startStr = startDate.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];
    
    // Fallback: If your useApi loadReports hook only accepts one date string,
    // we bypass it to directly call apiClient so we can pass both parameters safely.
    const fetchReports = async () => {
      try {
        const response = await apiClient.get(`/reports?startDate=${startStr}&endDate=${endStr}`);
        useAppStore.setState({ reports: response.data || response });
      } catch (err) {
        console.error("Load reports failed", err);
      }
    };
    
    fetchReports();
    api.loadDentists().catch(err => console.error("Load dentists failed", err));
  }, [startDate, endDate]); // eslint-disable-line react-hooks/exhaustive-deps

  const formatApptTime = (value) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  const getDentistName = useCallback((d) => {
    if (!d) return "Unknown Dentist";
    let name = d.name || d.dentist_name;
    
    if (!name && (d.first_name || d.last_name)) {
      name = `${d.first_name || ''} ${d.last_name || ''}`.trim();
    }
    
    if (!name || name.trim() === "") {
      const found = dentists.find(dent => String(dent.id) === String(d.id || d.dentist_id));
      if (found) {
         name = found.name || `${found.first_name || ''} ${found.last_name || ''}`.trim();
      }
    }
    
    return name || "Unassigned / Unknown";
  }, [dentists]);

  // FILTER OUT DENTAL AIDES FROM PERFORMANCE DATA
  const filteredDentistPerformance = (dentistPerformance || []).filter(dp => {
    const foundDentist = dentists.find(dent => String(dent.id) === String(dp.id || dp.dentist_id));
    if (foundDentist && (foundDentist.specialization === 'Dental Aide' || foundDentist.role === 'aide')) {
      return false; 
    }
    return true;
  });

  const rankedDentists = useMemo(() => {
    return filteredDentistPerformance
      .map((dentist) => ({
        dentist,
        name: getDentistName(dentist),
        patientsHandled: Number(dentist?.patientsHandled || 0),
      }))
      .sort((a, b) => {
        if (b.patientsHandled !== a.patientsHandled) return b.patientsHandled - a.patientsHandled;
        return a.name.localeCompare(b.name);
      });
  }, [filteredDentistPerformance, getDentistName]);

  const dentistPerformanceChartData = useMemo(() => {
    return {
      labels: rankedDentists.map((item) => item.name),
      appointments: rankedDentists.map((item) => item.patientsHandled),
      appointmentsLabel: "Patients Handled",
      singleSeries: true,
      showLegend: false,
      xTickFontSize: 12,
      yTickFontSize: 12,
      xTickMaxRotation: 25,
      xTickMinRotation: 0,
    };
  }, [rankedDentists]);

  const openDentistPatients = async (dentist) => {
    setSelectedDentist(dentist);
    setPatientsModalOpen(true);
    setPatientsLoading(true);
    setPatientsError(null);
    setDentistPatients([]);

    const startStr = startDate.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];
    
    try {
      const targetId = dentist.id || dentist.dentist_id || "unassigned";
      // Bypassing frontend wrapper functions to ensure range queries work flawlessly
      const response = await apiClient.get(`/reports/dentist/${targetId}/patients?startDate=${startStr}&endDate=${endStr}`);
      // Accessing response.data.patients handles Axios responses properly
      setDentistPatients(response?.data?.patients || response?.patients || []);
    } catch {
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

  const getTitleDateRangeStr = () => {
    return rangeType === 'daily' 
      ? startDate.toLocaleDateString() 
      : `${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`;
  };

  const exportDentistPatientsToPDF = async () => {
    if (dentistPatients.length === 0 || !selectedDentist) return;
    
    try {
      const jsPDF = (await import("jspdf")).default;
      const autoTable = (await import("jspdf-autotable")).default;

      const doc = new jsPDF();
      const dateStr = getTitleDateRangeStr();
      const dentistDisplayName = getDentistName(selectedDentist);

      doc.setFontSize(18);
      doc.text(`Patient List - ${dentistDisplayName}`, 14, 15);
      
      doc.setFontSize(11);
      doc.setTextColor(100);
      doc.text(`Report Date: ${dateStr}`, 14, 22);

      const tableBody = dentistPatients.map(p => [
        p.full_name || p.name || "Unknown",
        new Date(p.appointment_datetime || p.timeStart).toLocaleDateString() + ' - ' + formatApptTime(p.appointment_datetime || p.timeStart),
        p.reason || p.procedure || "Check-up"
      ]);

      autoTable(doc, {
        startY: 30,
        head: [['Patient Name', 'Date & Time', 'Reason / Procedure']],
        body: tableBody,
        headStyles: { fillColor: [41, 128, 185] }, 
        styles: { fontSize: 10 },
      });

      const safeName = dentistDisplayName.replace(/[^a-zA-Z0-9]/g, '_');
      const fileName = `Patients_${safeName}_${startDate.toISOString().slice(0, 10)}_to_${endDate.toISOString().slice(0, 10)}.pdf`;
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
    const dateStr = getTitleDateRangeStr();

    doc.setFontSize(18);
    doc.text(`Clinic Report - ${dateStr}`, 14, 15);

    doc.setFontSize(14);
    doc.text("Summary", 14, 25);

    autoTable(doc, {
      startY: 30,
      head: [['Metric', 'Value']],
      body: [
        ['Patients Seen', summary.patientsSeen],
        ['Procedures Done', summary.proceduresDone],
        ['New Patients', summary.newPatients],
        ['Avg Treatment Duration', summary.avgTreatmentDuration],
      ],
    });

    const finalY = doc.lastAutoTable.finalY || 40;
    doc.text("Dentist Performance", 14, finalY + 15);

    const performanceBody = filteredDentistPerformance.map(d => {
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

    doc.save(`clinic_report_${startDate.toISOString().slice(0, 10)}_to_${endDate.toISOString().slice(0, 10)}.pdf`);
  };

  const exportToExcel = async () => {
    if (!hasData) return;
    const XLSX = await import("xlsx");

    const summaryData = [
      { Metric: "Date Range", Value: getTitleDateRangeStr() },
      { Metric: "Patients Seen", Value: summary.patientsSeen },
      { Metric: "Procedures Done", Value: summary.proceduresDone },
      { Metric: "New Patients", Value: summary.newPatients },
      { Metric: "Avg Treatment Duration", Value: summary.avgTreatmentDuration },
    ];
    const dailySummaryWs = XLSX.utils.json_to_sheet(summaryData);

    const performanceData = filteredDentistPerformance.map(d => ({
      Dentist: getDentistName(d),
      Patients_Handled: d.patientsHandled,
      Treatment_Distribution: Object.entries(d.treatmentDistribution || {})
        .map(([k, v]) => `${k}: ${v}`)
        .join(", ")
    }));

    const dentistPerformanceWs = XLSX.utils.json_to_sheet(performanceData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, dailySummaryWs, "Summary");
    XLSX.utils.book_append_sheet(wb, dentistPerformanceWs, "Dentist Performance");

    XLSX.writeFile(wb, `clinic_report_${startDate.toISOString().slice(0, 10)}_to_${endDate.toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="reports-page">
      <div className="reports-header">
        <div style={{display: 'flex', flexDirection: 'column'}}>
            <h2 className="reports-title">{pageTitle}</h2>
            <p style={{ margin: '2px 0 0 0', color: '#64748b', fontSize: '0.9rem' }}>{pageSubtitle}</p>
            <div className="range-selector" style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                <button onClick={() => handleRangeChange('daily')} className={`export-btn ${rangeType === 'daily' ? 'pdf' : ''}`} style={{padding: '5px 10px', fontSize: '0.85rem'}}>Today</button>
                <button onClick={() => handleRangeChange('weekly')} className={`export-btn ${rangeType === 'weekly' ? 'pdf' : ''}`} style={{padding: '5px 10px', fontSize: '0.85rem'}}>Past Week</button>
                <button onClick={() => handleRangeChange('monthly')} className={`export-btn ${rangeType === 'monthly' ? 'pdf' : ''}`} style={{padding: '5px 10px', fontSize: '0.85rem'}}>Past Month</button>
                <button onClick={() => handleRangeChange('yearly')} className={`export-btn ${rangeType === 'yearly' ? 'pdf' : ''}`} style={{padding: '5px 10px', fontSize: '0.85rem'}}>Past Year</button>
            </div>
        </div>

        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-end', marginTop: '10px' }}>
          <div className="date-picker-container">
            <span className="small-label">Start Date</span>
            <DatePicker
              selected={startDate}
              onChange={date => { setStartDate(date); setRangeType('custom'); }}
              selectsStart
              startDate={startDate}
              endDate={endDate}
              className="datepicker-input"
              dateFormat="MMMM d, yyyy"
            />
          </div>
          <div className="date-picker-container">
            <span className="small-label">End Date</span>
            <DatePicker
              selected={endDate}
              onChange={date => { setEndDate(date); setRangeType('custom'); }}
              selectsEnd
              startDate={startDate}
              endDate={endDate}
              minDate={startDate}
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
          {showSummaryCards ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
              <div style={{ border: '1px solid #e5e7eb', borderRadius: '10px', padding: '0.65rem 0.8rem', background: '#fff' }}>
                <p style={{ margin: 0, color: '#64748b', fontSize: '0.8rem' }}>Patients Seen</p>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '1.35rem', fontWeight: 700 }}>{summary.patientsSeen}</p>
              </div>
              <div style={{ border: '1px solid #e5e7eb', borderRadius: '10px', padding: '0.65rem 0.8rem', background: '#fff' }}>
                <p style={{ margin: 0, color: '#64748b', fontSize: '0.8rem' }}>Procedures Done</p>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '1.35rem', fontWeight: 700 }}>{summary.proceduresDone}</p>
              </div>
              <div style={{ border: '1px solid #e5e7eb', borderRadius: '10px', padding: '0.65rem 0.8rem', background: '#fff' }}>
                <p style={{ margin: 0, color: '#64748b', fontSize: '0.8rem' }}>New Patients</p>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '1.35rem', fontWeight: 700 }}>{summary.newPatients}</p>
              </div>
              <div style={{ border: '1px solid #e5e7eb', borderRadius: '10px', padding: '0.65rem 0.8rem', background: '#fff' }}>
                <p style={{ margin: 0, color: '#64748b', fontSize: '0.8rem' }}>Avg Treatment Time</p>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '1.35rem', fontWeight: 700 }}>{summary.avgTreatmentDuration}</p>
              </div>
            </div>
          ) : null}

          <div className="report-section">
            <h3 className="report-subtitle">Summary ({getTitleDateRangeStr()})</h3>
            <table className="report-table">
              <thead>
                <tr><th>Metric</th><th>Value</th></tr>
              </thead>
              <tbody>
                <tr><td>Patients Seen (Done)</td><td>{summary.patientsSeen}</td></tr>
                <tr><td>Procedures Completed</td><td>{summary.proceduresDone}</td></tr>
                <tr><td>New Patients Registered</td><td>{summary.newPatients}</td></tr>
                <tr><td>Average Treatment Duration</td><td>{summary.avgTreatmentDuration}</td></tr>
              </tbody>
            </table>
          </div>

          <div className="report-section">
            <h3 className="report-subtitle">Dentist Performance</h3>
            {rankedDentists.length === 0 ? (
              <p style={{ margin: 0, color: '#64748b' }}>No performance data for this date range.</p>
            ) : (
              <>
                <div style={{ minHeight: '320px' }}>
                  <WeeklyBarChart chartData={dentistPerformanceChartData} />
                </div>

                <div className="dentist-performance-links-wrap">
                  <p className="dentist-performance-links-note">
                    Click a dentist name to view the patient list.
                  </p>
                  <div className="dentist-performance-links">
                    {rankedDentists.map((item) => (
                      <button
                        key={`${item.dentist.id || item.name}`}
                        type="button"
                        className="dentist-link dentist-performance-link"
                        onClick={() => openDentistPatients(item.dentist)}
                      >
                        {item.name} ({item.patientsHandled})
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </>
      )}

      {!api.loading && !api.error && !hasData && (
        <div className="report-section" style={{ marginTop: '1rem' }}>
          <p style={{ margin: 0, color: '#64748b' }}>
            No report data available for the selected date range.
          </p>
        </div>
      )}

      {/* Patient List Modal */}
      {patientsModalOpen && (
        <div className="modal-overlay" onClick={closePatientsModal}>
          <div className="patient-list-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-group">
                <h3>Patients handled by {getDentistName(selectedDentist)}</h3>
                <p>{getTitleDateRangeStr()}</p>
              </div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <button 
                  className="export-btn pdf" 
                  style={{ fontSize: '0.85rem', padding: '6px 12px' }}
                  onClick={(e) => {
                    e.stopPropagation(); 
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
                <div className="modal-state">No patients recorded for this date range.</div>
              ) : (
                <div className="report-section">
                  <table className="report-table">
                    <thead>
                      <tr>
                        <th>Patient Name</th>
                        <th>Date & Time</th>
                        <th>Reason / Procedure</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dentistPatients.map((p, i) => (
                        <tr key={i}>
                          <td style={{ fontWeight: '500' }}>{p.full_name || p.name || "Unknown"}</td>
                          <td>{new Date(p.appointment_datetime || p.timeStart).toLocaleDateString()} {formatApptTime(p.appointment_datetime || p.timeStart)}</td>
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