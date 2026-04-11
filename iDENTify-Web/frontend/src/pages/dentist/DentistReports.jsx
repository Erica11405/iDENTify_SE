import React, { useEffect, useMemo, useState } from "react";
import apiClient from "../../api/apiClient";
import useApi from "../../hooks/useApi";
import useAppStore from "../../store/useAppStore";

function toDateParam(date) {
  return date.toISOString().split("T")[0];
}

function parseDateInput(value) {
  if (!value) return new Date();
  return new Date(`${value}T00:00:00`);
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
  const { user, dentists } = useAppStore((state) => ({ user: state.user, dentists: state.dentists || [] }));

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

  const exportPatientsToPDF = async () => {
    if (!hasData || patientRows.length === 0) return;

    try {
      const jsPDF = (await import("jspdf")).default;
      const autoTable = (await import("jspdf-autotable")).default;

      const doc = new jsPDF();
      const dateStr = rangeLabel(startDate, endDate);

      doc.setFontSize(18);
      doc.text(`Patient List - ${dentistName}`, 14, 15);

      doc.setFontSize(11);
      doc.setTextColor(100);
      doc.text(`Date Range: ${dateStr}`, 14, 22);

      autoTable(doc, {
        startY: 30,
        head: [["Patient Name", "Date & Time", "Reason / Procedure", "Status"]],
        body: patientRows.map((row) => [
          row.full_name || "Unknown",
          formatAppointmentDateTime(row.appointment_datetime),
          row.reason || "Unspecified",
          row.status || "Done",
        ]),
        styles: { fontSize: 10 },
      });

      const from = toDateParam(startDate);
      const to = toDateParam(endDate);
      doc.save(`dentist_patients_${safeFilePart(dentistName)}_${from}_to_${to}.pdf`);
    } catch (err) {
      console.error("Failed to export patient details PDF", err);
    }
  };

  const exportToPDF = async () => {
    if (!hasData) return;

    try {
      const jsPDF = (await import("jspdf")).default;
      const autoTable = (await import("jspdf-autotable")).default;

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

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");
      XLSX.utils.book_append_sheet(workbook, serviceSheet, "Service Distribution");

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
    <section style={{ padding: "1.5rem" }}>
      <h1>Dentist Reports</h1>
      <p style={{ marginTop: "0.25rem", color: "#64748b" }}>
        Your own analytics only: patients handled and service distribution by selected date range.
      </p>
      <p style={{ marginTop: "0.3rem", color: "#0f172a", fontWeight: 600 }}>
        Dentist: {dentistName}
      </p>

      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "1rem" }}>
        <button type="button" onClick={() => applyRange("daily")} className={`export-btn ${rangeType === "daily" ? "pdf" : ""}`}>Today</button>
        <button type="button" onClick={() => applyRange("weekly")} className={`export-btn ${rangeType === "weekly" ? "pdf" : ""}`}>Past Week</button>
        <button type="button" onClick={() => applyRange("monthly")} className={`export-btn ${rangeType === "monthly" ? "pdf" : ""}`}>Past Month</button>
        <button type="button" onClick={() => applyRange("yearly")} className={`export-btn ${rangeType === "yearly" ? "pdf" : ""}`}>Past Year</button>
      </div>

      <div style={{ display: "flex", gap: "1rem", alignItems: "flex-end", flexWrap: "wrap", marginTop: "0.9rem" }}>
        <label style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
          <span style={{ fontSize: "0.8rem", color: "#64748b" }}>Start Date</span>
          <input
            type="date"
            value={toDateParam(startDate)}
            onChange={(e) => {
              setRangeType("custom");
              setStartDate(parseDateInput(e.target.value));
            }}
          />
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
          <span style={{ fontSize: "0.8rem", color: "#64748b" }}>End Date</span>
          <input
            type="date"
            value={toDateParam(endDate)}
            min={toDateParam(startDate)}
            onChange={(e) => {
              setRangeType("custom");
              setEndDate(parseDateInput(e.target.value));
            }}
          />
        </label>
      </div>

      <p style={{ marginTop: "0.8rem", marginBottom: "1rem", color: "#475569", fontSize: "0.9rem" }}>
        Range: {rangeLabel(startDate, endDate)}
      </p>

      <div style={{ display: "flex", gap: "0.7rem", marginBottom: "1rem", flexWrap: "wrap" }}>
        <button type="button" className="export-btn pdf" onClick={exportToPDF} disabled={!hasData}>
          Export PDF
        </button>
        <button type="button" className="export-btn excel" onClick={exportToExcel} disabled={!hasData}>
          Export Excel
        </button>
      </div>

      {loading ? <p>Loading your report...</p> : null}
      {!loading && error ? <p style={{ color: "#dc2626" }}>{error}</p> : null}

      {!loading && !error ? (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.75rem" }}>
            <article style={{ border: "1px solid #e5e7eb", borderRadius: "10px", padding: "0.7rem 0.9rem", background: "#fff" }}>
              <p style={{ margin: 0, color: "#64748b", fontSize: "0.8rem" }}>Patients Handled</p>
              <p style={{ margin: "0.25rem 0 0 0", fontWeight: 700, fontSize: "1.35rem" }}>{summary.patientsHandled}</p>
            </article>
            <article style={{ border: "1px solid #e5e7eb", borderRadius: "10px", padding: "0.7rem 0.9rem", background: "#fff" }}>
              <p style={{ margin: 0, color: "#64748b", fontSize: "0.8rem" }}>Procedures Done</p>
              <p style={{ margin: "0.25rem 0 0 0", fontWeight: 700, fontSize: "1.35rem" }}>{summary.proceduresDone}</p>
            </article>
            <article style={{ border: "1px solid #e5e7eb", borderRadius: "10px", padding: "0.7rem 0.9rem", background: "#fff" }}>
              <p style={{ margin: 0, color: "#64748b", fontSize: "0.8rem" }}>Avg Treatment Time</p>
              <p style={{ margin: "0.25rem 0 0 0", fontWeight: 700, fontSize: "1.35rem" }}>{summary.avgTreatmentDuration}</p>
            </article>
            <article style={{ border: "1px solid #e5e7eb", borderRadius: "10px", padding: "0.7rem 0.9rem", background: "#fff" }}>
              <p style={{ margin: 0, color: "#64748b", fontSize: "0.8rem" }}>Top Service</p>
              <p style={{ margin: "0.25rem 0 0 0", fontWeight: 700, fontSize: "1.1rem" }}>{topService}</p>
            </article>
          </div>

          <div style={{ marginTop: "1rem", overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff" }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: "0.6rem", borderBottom: "1px solid #d1d5db" }}>Service / Procedure</th>
                  <th style={{ textAlign: "left", padding: "0.6rem", borderBottom: "1px solid #d1d5db" }}>Count</th>
                </tr>
              </thead>
              <tbody>
                {serviceDistribution.length === 0 ? (
                  <tr>
                    <td colSpan="2" style={{ padding: "0.9rem", color: "#64748b" }}>
                      No completed procedures found for the selected date range.
                    </td>
                  </tr>
                ) : (
                  serviceDistribution.map((row) => (
                    <tr key={row.service}>
                      <td style={{ padding: "0.55rem", borderBottom: "1px solid #f1f5f9" }}>{row.service}</td>
                      <td style={{ padding: "0.55rem", borderBottom: "1px solid #f1f5f9" }}>{row.count}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: "1.25rem", overflowX: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.75rem", flexWrap: "wrap", marginBottom: "0.5rem" }}>
              <h3 style={{ margin: 0, fontSize: "1rem" }}>Patient Details ({patientRows.length})</h3>
              <button type="button" className="export-btn pdf" onClick={exportPatientsToPDF} disabled={patientRows.length === 0}>
                Export Patient List PDF
              </button>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff" }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: "0.6rem", borderBottom: "1px solid #d1d5db" }}>Patient Name</th>
                  <th style={{ textAlign: "left", padding: "0.6rem", borderBottom: "1px solid #d1d5db" }}>Date & Time</th>
                  <th style={{ textAlign: "left", padding: "0.6rem", borderBottom: "1px solid #d1d5db" }}>Reason / Procedure</th>
                  <th style={{ textAlign: "left", padding: "0.6rem", borderBottom: "1px solid #d1d5db" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {patientRows.length === 0 ? (
                  <tr>
                    <td colSpan="4" style={{ padding: "0.9rem", color: "#64748b" }}>
                      No completed patient appointments found for this range.
                    </td>
                  </tr>
                ) : (
                  patientRows.map((row) => (
                    <tr key={row.appointment_id || `${row.patient_id}-${row.appointment_datetime}`}>
                      <td style={{ padding: "0.55rem", borderBottom: "1px solid #f1f5f9" }}>{row.full_name || "Unknown"}</td>
                      <td style={{ padding: "0.55rem", borderBottom: "1px solid #f1f5f9" }}>{formatAppointmentDateTime(row.appointment_datetime)}</td>
                      <td style={{ padding: "0.55rem", borderBottom: "1px solid #f1f5f9" }}>{row.reason || "Unspecified"}</td>
                      <td style={{ padding: "0.55rem", borderBottom: "1px solid #f1f5f9" }}>{row.status || "Done"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </section>
  );
}

export default DentistReports;
