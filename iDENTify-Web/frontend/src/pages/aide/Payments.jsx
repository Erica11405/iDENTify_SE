import React, { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import apiClient from "../../api/apiClient";

function normalizeStatus(value) {
  return String(value || "").trim().toLowerCase();
}

function isBilling(status) {
  return normalizeStatus(status) === "payment / billing";
}

function isPaid(status) {
  return normalizeStatus(status) === "done";
}

function toDateParam(date) {
  return date.toISOString().split("T")[0];
}

function parseDateInput(value) {
  if (!value) return new Date();
  return new Date(`${value}T00:00:00`);
}

function parseQueueDate(value) {
  const parsed = new Date(String(value || "").replace(" ", "T"));
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function isWithinRange(value, startDate, endDate) {
  const parsed = parseQueueDate(value);
  if (!parsed) return false;

  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);

  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  return parsed >= start && parsed <= end;
}

function formatDateTime(value) {
  const parsed = parseQueueDate(value);
  if (!parsed) return "-";

  return `${parsed.toLocaleDateString()} ${parsed.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  })}`;
}

function rangeLabel(startDate, endDate) {
  return `${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`;
}

function Payments() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [queueHistory, setQueueHistory] = useState([]);

  const [rangeType, setRangeType] = useState("daily");
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());

  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState(null);

  const loadHistory = async () => {
    setLoading(true);
    setError("");
    try {
      const rows = await apiClient.getQueue(true);
      setQueueHistory(Array.isArray(rows) ? rows : []);
    } catch (err) {
      setError(err.message || "Failed to load payment queue history.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const paymentRows = useMemo(() => {
    const needle = String(search || "").trim().toLowerCase();

    return (queueHistory || [])
      .filter((row) => {
        const status = row.status;
        if (!isBilling(status) && !isPaid(status)) return false;
        if (!isWithinRange(row.time_added, startDate, endDate)) return false;

        if (!needle) return true;

        const patientName = String(row.full_name || "").toLowerCase();
        const dentistName = String(row.dentist_name || "").toLowerCase();
        const notes = String(row.notes || "").toLowerCase();

        return patientName.includes(needle) || dentistName.includes(needle) || notes.includes(needle);
      })
      .sort((a, b) => {
        const aDate = parseQueueDate(a.time_added)?.getTime() || 0;
        const bDate = parseQueueDate(b.time_added)?.getTime() || 0;
        return bDate - aDate;
      });
  }, [queueHistory, search, startDate, endDate]);

  const totals = useMemo(() => {
    const billing = paymentRows.filter((row) => isBilling(row.status)).length;
    const paid = paymentRows.filter((row) => isPaid(row.status)).length;
    const total = billing + paid;

    return {
      billing,
      paid,
      total,
    };
  }, [paymentRows]);

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

  const handleMarkPaid = async (row) => {
    if (!row || !row.id) return;

    setBusyId(row.id);
    try {
      await apiClient.updateQueueItem(row.id, { status: "Done" });
      toast.success("Marked as paid and completed.");
      await loadHistory();
    } catch (err) {
      toast.error(err.message || "Failed to update payment status.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section style={{ padding: "1.5rem" }}>
      <h1>Payments</h1>
      <p style={{ marginTop: "0.25rem", color: "#64748b" }}>
        Payment and billing queue overview with day, week, month, and year totals.
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

        <label style={{ display: "flex", flexDirection: "column", gap: "0.3rem", minWidth: "260px" }}>
          <span style={{ fontSize: "0.8rem", color: "#64748b" }}>Search</span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Patient, dentist, or notes"
          />
        </label>

        <button type="button" onClick={loadHistory} disabled={loading}>
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      <p style={{ marginTop: "0.8rem", marginBottom: "1rem", color: "#475569", fontSize: "0.9rem" }}>
        Range: {rangeLabel(startDate, endDate)}
      </p>

      {loading ? <p>Loading payment records...</p> : null}
      {!loading && error ? <p style={{ color: "#dc2626" }}>{error}</p> : null}

      {!loading && !error ? (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.75rem" }}>
            <article style={{ border: "1px solid #e5e7eb", borderRadius: "10px", padding: "0.7rem 0.9rem", background: "#fff" }}>
              <p style={{ margin: 0, color: "#64748b", fontSize: "0.8rem" }}>In Billing Queue</p>
              <p style={{ margin: "0.25rem 0 0 0", fontWeight: 700, fontSize: "1.35rem" }}>{totals.billing}</p>
            </article>
            <article style={{ border: "1px solid #e5e7eb", borderRadius: "10px", padding: "0.7rem 0.9rem", background: "#fff" }}>
              <p style={{ margin: 0, color: "#64748b", fontSize: "0.8rem" }}>Paid / Completed</p>
              <p style={{ margin: "0.25rem 0 0 0", fontWeight: 700, fontSize: "1.35rem" }}>{totals.paid}</p>
            </article>
            <article style={{ border: "1px solid #e5e7eb", borderRadius: "10px", padding: "0.7rem 0.9rem", background: "#fff" }}>
              <p style={{ margin: 0, color: "#64748b", fontSize: "0.8rem" }}>Total Payment Records</p>
              <p style={{ margin: "0.25rem 0 0 0", fontWeight: 700, fontSize: "1.35rem" }}>{totals.total}</p>
            </article>
          </div>

          <div style={{ marginTop: "1rem", overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff" }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: "0.6rem", borderBottom: "1px solid #d1d5db" }}>Patient</th>
                  <th style={{ textAlign: "left", padding: "0.6rem", borderBottom: "1px solid #d1d5db" }}>Dentist</th>
                  <th style={{ textAlign: "left", padding: "0.6rem", borderBottom: "1px solid #d1d5db" }}>Queue Time</th>
                  <th style={{ textAlign: "left", padding: "0.6rem", borderBottom: "1px solid #d1d5db" }}>Status</th>
                  <th style={{ textAlign: "left", padding: "0.6rem", borderBottom: "1px solid #d1d5db" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {paymentRows.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ padding: "0.9rem", color: "#64748b" }}>
                      No payment-related queue records found for this range.
                    </td>
                  </tr>
                ) : (
                  paymentRows.map((row) => (
                    <tr key={row.id}>
                      <td style={{ padding: "0.55rem", borderBottom: "1px solid #f1f5f9" }}>{row.full_name || "Unknown"}</td>
                      <td style={{ padding: "0.55rem", borderBottom: "1px solid #f1f5f9" }}>{row.dentist_name || "Unassigned"}</td>
                      <td style={{ padding: "0.55rem", borderBottom: "1px solid #f1f5f9" }}>{formatDateTime(row.time_added)}</td>
                      <td style={{ padding: "0.55rem", borderBottom: "1px solid #f1f5f9" }}>{row.status || "-"}</td>
                      <td style={{ padding: "0.55rem", borderBottom: "1px solid #f1f5f9" }}>
                        {isBilling(row.status) ? (
                          <button type="button" onClick={() => handleMarkPaid(row)} disabled={busyId === row.id}>
                            {busyId === row.id ? "Saving..." : "Mark Paid"}
                          </button>
                        ) : (
                          <span style={{ color: "#166534", fontWeight: 600 }}>Paid</span>
                        )}
                      </td>
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

export default Payments;
