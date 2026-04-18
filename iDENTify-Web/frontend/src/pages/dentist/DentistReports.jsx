import React, { useEffect, useMemo, useState } from "react";
import apiClient from "../../api/apiClient";
import useApi from "../../hooks/useApi";
import useAppStore from "../../store/useAppStore";
import "../../styles/pages/dentist/DentistReports.css";

function toDateParam(date) {
  if (!date) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateInput(value) {
  if (!value) return new Date();
  const [year, month, day] = value.split("-");
  return new Date(Number(year), Number(month) - 1, Number(day));
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function resolveDentistId(user, dentists) {
  if (!user) return null;

  if (user.dentist_id) return Number(user.dentist_id);

  const matched = (dentists || []).find((dentist) => {
    if (String(dentist.user_id || "") === String(user.id || "")) return true;
    if (normalizeEmail(dentist.email) && normalizeEmail(dentist.email) === normalizeEmail(user.email)) return true;
    if (dentist.name && user.name && String(dentist.name).trim() === String(user.name).trim()) return true;
    return false;
  });

  return matched ? Number(matched.id) : null;
}

function rangeLabel(startDate, endDate) {
  return `${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`;
}

function safeFilePart(value) {
  return String(value || "dentist").replace(/[^a-zA-Z0-9_-]+/g, "_");
}

function formatAppointmentDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
}

function DentistReports() {
  const api = useApi();
  
  const user = useAppStore((state) => state.user);
  const dentists = useAppStore((state) => state.dentists);

  const [rangeType, setRangeType] = useState("daily");
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reportData, setReportData] = useState(null);
  const [patientRows, setPatientRows] = useState([]);

  const dentistId = useMemo(() => resolveDentistId(user, dentists), [user, dentists]);

  useEffect(() => {
    api.loadDentists().catch((err) => {
      console.error("Failed to load dentists for reports", err);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const loadReport = async () => {
      if (!dentistId) {
        setLoading(false);
        setError("Unable to resolve your dentist account for reports.");
        setReportData(null);
        setPatientRows([]);
        return;
      }

      if (startDate > endDate) {
        setLoading(false);
        setError("Start date cannot be later than end date.");
        setReportData(null);
        setPatientRows([]);
        return;
      }

      setLoading(true);
      setError("");

      try {
        const from = toDateParam(startDate);
        const to = toDateParam(endDate);
        const [summaryResponse, patientsResponse] = await Promise.all([
          apiClient.getDentistReportSummary(dentistId, {
            startDate: from,
            endDate: to,
          }),
          apiClient.getDentistPatientsForReport(dentistId, {
            startDate: from,
            endDate: to,
          }),
        ]);

        setReportData(summaryResponse || null);
        setPatientRows(patientsResponse?.patients || []);
      } catch (err) {
        setError(err.message || "Failed to load your report data.");
        setReportData(null);
        setPatientRows([]);
      } finally {
        setLoading(false);
      }
    };

    loadReport();
  }, [dentistId, startDate, endDate]);

  const summary = reportData?.summary || {
    patientsHandled: 0,
    proceduresDone: 0,
    avgTreatmentDuration: "0 min",
  };

  const hasData = !!reportData && !loading && !error;
  const dentistName = reportData?.dentist?.name || user?.name || "Dentist";

  const serviceDistribution = reportData?.serviceDistribution || [];
  const topService = serviceDistribution.length > 0 ? serviceDistribution[0].service : "N/A";
  const summaryCards = [
    { label: "Patients Handled", value: summary.patientsHandled },
    { label: "Procedures Done", value: summary.proceduresDone },
    { label: "Avg Treatment Time", value: summary.avgTreatmentDuration },
    { label: "Top Service", value: topService },
  ];

  const exportToPDF = async () => {
    if (!hasData) return;

    try {
      const jsPDFModule = await import("jspdf");
      const jsPDF = jsPDFModule.default || jsPDFModule.jsPDF;
      const autoTableModule = await import("jspdf-autotable");
      const autoTable = autoTableModule.default || autoTableModule;

      const doc = new jsPDF();
      const dateStr = rangeLabel(startDate, endDate);

      doc.setFontSize(18);
      doc.text(`Dentist Report - ${dentistName}`, 14, 15);

      doc.setFontSize(11);
      doc.setTextColor(100);
      doc.text(`Date Range: ${dateStr}`, 14, 22);

      autoTable(doc, {
        startY: 30,
        head: [["Metric", "Value"]],
        body: [
          ["Patients Handled", summary.patientsHandled],
          ["Procedures Done", summary.proceduresDone],
          ["Avg Treatment Duration", summary.avgTreatmentDuration],
          ["Top Service", topService],
        ],
      });

      const finalY = doc.lastAutoTable?.finalY || 40;
      doc.setTextColor(0);
      doc.text("Service Distribution", 14, finalY + 15);

      autoTable(doc, {
        startY: finalY + 20,
        head: [["Service / Procedure", "Count"]],
        body: serviceDistribution.length
          ? serviceDistribution.map((row) => [row.service, row.count])
          : [["No completed procedures found", "0"]],
      });

      const servicesTableEndY = doc.lastAutoTable?.finalY || finalY + 20;
      doc.text(`Patient Details (${patientRows.length})`, 14, servicesTableEndY + 15);

      autoTable(doc, {
        startY: servicesTableEndY + 20,
        head: [["Patient Name", "Date & Time", "Reason / Procedure", "Status"]],
        body: patientRows.length
          ? patientRows.map((row) => [
            row.full_name || "Unknown",
            formatAppointmentDateTime(row.appointment_datetime),
            row.reason || "Unspecified",
            row.status || "Done",
          ])
          : [["No completed patient appointments found for this range.", "-", "-", "-"]],
        styles: { fontSize: 9 },
      });

      const from = toDateParam(startDate);
      const to = toDateParam(endDate);
      doc.save(`dentist_report_${safeFilePart(dentistName)}_${from}_to_${to}.pdf`);
    } catch (err) {
      console.error("Failed to export dentist PDF report", err);
    }
  };

  const exportToExcel = async () => {
    if (!hasData) return;

    try {
      const XLSX = await import("xlsx");

      const summarySheet = XLSX.utils.json_to_sheet([
        { Metric: "Dentist", Value: dentistName },
        { Metric: "Date Range", Value: rangeLabel(startDate, endDate) },
        { Metric: "Patients Handled", Value: summary.patientsHandled },
        { Metric: "Procedures Done", Value: summary.proceduresDone },
        { Metric: "Avg Treatment Duration", Value: summary.avgTreatmentDuration },
        { Metric: "Top Service", Value: topService },
      ]);

      const serviceSheet = XLSX.utils.json_to_sheet(
        (serviceDistribution.length ? serviceDistribution : [{ service: "No completed procedures found", count: 0 }]).map((row) => ({
          Service: row.service,
          Count: row.count,
        }))
      );

      const patientSheet = XLSX.utils.json_to_sheet(
        (patientRows.length
          ? patientRows
          : [{
            full_name: "No completed patient appointments found for this range.",
            appointment_datetime: "-",
            reason: "-",
            status: "-",
          }]).map((row) => ({
          "Patient Name": row.full_name || "Unknown",
          "Date & Time": formatAppointmentDateTime(row.appointment_datetime),
          "Reason / Procedure": row.reason || "Unspecified",
          Status: row.status || "Done",
        }))
      );

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");
      XLSX.utils.book_append_sheet(workbook, serviceSheet, "Service Distribution");
      XLSX.utils.book_append_sheet(workbook, patientSheet, "Patient Details");

      const from = toDateParam(startDate);
      const to = toDateParam(endDate);
      XLSX.writeFile(workbook, `dentist_report_${safeFilePart(dentistName)}_${from}_to_${to}.xlsx`);
    } catch (err) {
      console.error("Failed to export dentist Excel report", err);
    }
  };

  const applyRange = (type) => {
    setRangeType(type);

    const start = new Date();
    const end = new Date();

    if (type === "weekly") {
      start.setDate(start.getDate() - 7);
    } else if (type === "monthly") {
      start.setMonth(start.getMonth() - 1);
    } else if (type === "yearly") {
      start.setFullYear(start.getFullYear() - 1);
    }

    setStartDate(start);
    setEndDate(end);
  };

  return (
    <section className="dentist-reports-page">
      <div className="dentist-reports-header">
        <div className="dentist-reports-title-wrap">
          <h1 className="dentist-reports-title">Dentist Reports</h1>
          <p className="dentist-reports-subtitle">
            Your own analytics only: patients handled and service distribution by selected date range.
          </p>
          <p className="dentist-reports-identity">
            Dentist: {dentistName}
          </p>

          <div className="dentist-reports-range-buttons">
            <button type="button" onClick={() => applyRange("daily")} className={`dentist-range-btn ${rangeType === "daily" ? "active" : ""}`}>Today</button>
            <button type="button" onClick={() => applyRange("weekly")} className={`dentist-range-btn ${rangeType === "weekly" ? "active" : ""}`}>Past Week</button>
            <button type="button" onClick={() => applyRange("monthly")} className={`dentist-range-btn ${rangeType === "monthly" ? "active" : ""}`}>Past Month</button>
            <button type="button" onClick={() => applyRange("yearly")} className={`dentist-range-btn ${rangeType === "yearly" ? "active" : ""}`}>Past Year</button>
          </div>
        </div>

        <div className="dentist-reports-controls">
          <label className="dentist-date-picker-container">
            <span className="dentist-small-label">Start Date</span>
            <input
              className="dentist-date-input"
              type="date"
              value={toDateParam(startDate)}
              onChange={(e) => {
                setRangeType("custom");
                setStartDate(parseDateInput(e.target.value));
              }}
            />
          </label>

          <label className="dentist-date-picker-container">
            <span className="dentist-small-label">End Date</span>
            <input
              className="dentist-date-input"
              type="date"
              value={toDateParam(endDate)}
              min={toDateParam(startDate)}
              onChange={(e) => {
                setRangeType("custom");
                setEndDate(parseDateInput(e.target.value));
              }}
            />
          </label>

          <div className="dentist-export-buttons">
            <button type="button" className="export-btn pdf" onClick={exportToPDF} disabled={!hasData}>
              Export PDF
            </button>
            <button type="button" className="export-btn excel" onClick={exportToExcel} disabled={!hasData}>
              Export Excel
            </button>
          </div>
        </div>
      </div>

      <p className="dentist-reports-range-label">
        Range: {rangeLabel(startDate, endDate)}
      </p>

      {!loading && !error ? (
        <div className="dentist-reports-summary-cards">
          {summaryCards.map((item) => (
            <article className="dentist-reports-summary-card" key={item.label}>
              <p className="dentist-reports-summary-label">{item.label}</p>
              <p className="dentist-reports-summary-value">{item.value}</p>
            </article>
          ))}
        </div>
      ) : null}

      {loading ? <p className="dentist-reports-loading">Loading your report...</p> : null}
      {!loading && error ? <p className="dentist-reports-error">{error}</p> : null}

      {!loading && !error ? (
        <>
          <div className="dentist-report-section">
            <h3 className="dentist-report-subtitle">Summary ({rangeLabel(startDate, endDate)})</h3>
            <table className="dentist-report-table">
              <thead>
                <tr>
                  <th>Metric</th>
                  <th>Value</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Patients Handled</td>
                  <td>{summary.patientsHandled}</td>
                </tr>
                <tr>
                  <td>Procedures Done</td>
                  <td>{summary.proceduresDone}</td>
                </tr>
                <tr>
                  <td>Avg Treatment Time</td>
                  <td>{summary.avgTreatmentDuration}</td>
                </tr>
                <tr>
                  <td>Top Service</td>
                  <td>{topService}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="dentist-report-section">
            <h3 className="dentist-report-subtitle">Service Distribution</h3>
            <div className="dentist-report-table-wrap">
              <table className="dentist-report-table">
              <thead>
                <tr>
                  <th>Service / Procedure</th>
                  <th>Count</th>
                </tr>
              </thead>
              <tbody>
                {serviceDistribution.length === 0 ? (
                  <tr>
                    <td colSpan="2" className="dentist-report-empty-cell">
                      No completed procedures found for the selected date range.
                    </td>
                  </tr>
                ) : (
                  serviceDistribution.map((row) => (
                    <tr key={row.service}>
                      <td>{row.service}</td>
                      <td>{row.count}</td>
                    </tr>
                  ))
                )}
              </tbody>
              </table>
            </div>
          </div>

          <div className="dentist-report-section">
            <div className="dentist-report-section-head">
              <h3 className="dentist-report-subtitle">Patient Details ({patientRows.length})</h3>
            </div>
            <div className="dentist-report-table-wrap">
              <table className="dentist-report-table">
                <thead>
                  <tr>
                    <th>Patient Name</th>
                    <th>Date & Time</th>
                    <th>Reason / Procedure</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {patientRows.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="dentist-report-empty-cell">
                        No completed patient appointments found for this range.
                      </td>
                    </tr>
                  ) : (
                    patientRows.map((row) => (
                      <tr key={row.appointment_id || `${row.patient_id}-${row.appointment_datetime}`}>
                        <td>{row.full_name || "Unknown"}</td>
                        <td>{formatAppointmentDateTime(row.appointment_datetime)}</td>
                        <td>{row.reason || "Unspecified"}</td>
                        <td>{row.status || "Done"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {!hasData ? (
            <div className="dentist-report-section dentist-report-empty-section">
              <p className="dentist-report-empty-cell">No report data available for the selected date range.</p>
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  );
}

export default DentistReports;