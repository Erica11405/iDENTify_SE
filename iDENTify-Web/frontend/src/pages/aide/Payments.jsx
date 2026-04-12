import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import apiClient from "../../api/apiClient";
import PaymentModal from "../../components/PaymentModal";

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

function parseDateTime(value) {
  if (!value) return null;
  const parsed = new Date(String(value).replace(" ", "T"));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDateTime(value) {
  const parsed = parseDateTime(value);
  if (!parsed) return "-";

  return `${parsed.toLocaleDateString()} ${parsed.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  })}`;
}

function formatCurrency(value) {
  const amount = Number(value || 0);
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
}

function formatMethodLabel(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return "-";
  return normalized === "cash" ? "Cash" : "Cashless";
}

function rangeLabel(startDate, endDate) {
  return `${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`;
}

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function isBillingRecord(row) {
  return Number(row?.balance_due || 0) > 0;
}

function isPaidRecord(row) {
  return Number(row?.balance_due || 0) <= 0;
}

function Payments() {
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [paymentRows, setPaymentRows] = useState([]);

  const [rangeType, setRangeType] = useState("daily");
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());

  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [openingRecordId, setOpeningRecordId] = useState(null);
  const [focusHandled, setFocusHandled] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  const loadPayments = async () => {
    setLoading(true);
    setError("");
    try {
      const rows = await apiClient.getPayments({
        startDate: toDateParam(startDate),
        endDate: toDateParam(endDate),
      });
      setPaymentRows(Array.isArray(rows) ? rows : []);
    } catch (err) {
      setError(err.message || "Failed to load payment records.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayments();
  }, [startDate, endDate]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setFocusHandled(false);
  }, [location.key]);

  const filteredRows = useMemo(() => {
    const needle = normalizeText(search);

    return (paymentRows || [])
      .filter((row) => {
        if (!needle) return true;

        const patientName = normalizeText(row.patient_name);
        const dentistName = normalizeText(row.dentist_name);
        const serviceNames = normalizeText(row.services_text);
        const status = normalizeText(row.payment_status);
        const method = normalizeText(row.latest_payment_method);

        return patientName.includes(needle)
          || dentistName.includes(needle)
          || serviceNames.includes(needle)
          || status.includes(needle)
          || method.includes(needle);
      })
      .sort((a, b) => {
        const aDate = parseDateTime(a.latest_payment_at || a.updated_at || a.created_at)?.getTime() || 0;
        const bDate = parseDateTime(b.latest_payment_at || b.updated_at || b.created_at)?.getTime() || 0;
        return bDate - aDate;
      });
  }, [paymentRows, search]);

  const totals = useMemo(() => {
    const billing = filteredRows.filter((row) => isBillingRecord(row)).length;
    const paid = filteredRows.filter((row) => isPaidRecord(row)).length;
    const billedAmount = filteredRows.reduce((sum, row) => sum + Number(row.total_due || 0), 0);
    const collectedAmount = filteredRows.reduce((sum, row) => sum + Number(row.amount_paid || 0), 0);
    const total = billing + paid;

    return {
      billing,
      paid,
      total,
      billedAmount,
      collectedAmount,
    };
  }, [filteredRows]);

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

  const handleOpenRecord = useCallback(async (row) => {
    if (!row || !row.id) return;

    setOpeningRecordId(row.id);
    try {
      const details = await apiClient.getPaymentById(row.id);
      setSelectedRecord(details || row);
      setIsPaymentModalOpen(true);
    } catch (err) {
      toast.error(err.message || "Failed to load payment details.");
    } finally {
      setOpeningRecordId(null);
    }
  }, []);

  const handleCloseRecord = () => {
    if (busyId || openingRecordId) return;
    setIsPaymentModalOpen(false);
    setSelectedRecord(null);
  };

  useEffect(() => {
    const focusPaymentId = Number(location.state?.focusPaymentId || 0);
    if (!focusPaymentId || focusHandled) return;

    setFocusHandled(true);

    const openFocusedRecord = async () => {
      setOpeningRecordId(focusPaymentId);
      try {
        const details = await apiClient.getPaymentById(focusPaymentId);
        if (!details?.id) {
          toast.error("Unable to find the selected payment record.");
          return;
        }

        setSelectedRecord(details);
        setIsPaymentModalOpen(true);
      } catch (err) {
        toast.error(err.message || "Failed to load the selected payment record.");
      } finally {
        setOpeningRecordId(null);
      }
    };

    openFocusedRecord();
  }, [location.state, focusHandled]);

  const handleSaveInstallment = async (payload) => {
    if (!selectedRecord || !selectedRecord.id) return;

    setBusyId(selectedRecord.id);
    try {
      const updated = await apiClient.addPaymentInstallment(selectedRecord.id, {
        ...payload,
      });

      toast.success("Payment installment saved.");

      setIsPaymentModalOpen(false);
      setSelectedRecord(null);
      await loadPayments();

      if (Number(updated?.balance_due || 0) <= 0) {
        toast.success("Payment is now fully settled.");
      }
    } catch (err) {
      toast.error(err.message || "Failed to save payment installment.");
    } finally {
      setBusyId(null);
    }
  };

  const modalInitialValues = useMemo(() => {
    if (!selectedRecord) return {};

    const balanceDue = Number(selectedRecord.balance_due || 0);
    return {
      total_due: Number(selectedRecord.total_due || 0),
      is_deposit: Boolean(selectedRecord.is_deposit),
      already_paid: Number(selectedRecord.amount_paid || 0),
      payment_method: "cash",
      amount_paid_now: balanceDue > 0 ? balanceDue : 0,
    };
  }, [selectedRecord]);

  return (
    <section style={{ padding: "1.5rem" }}>
      <h1>Payments</h1>
      <p style={{ marginTop: "0.25rem", color: "#64748b" }}>
        Review billing records, add installments, and finalize pending balances.
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
            placeholder="Patient, dentist, services, status"
          />
        </label>

        <button type="button" onClick={loadPayments} disabled={loading}>
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
            <article style={{ border: "1px solid #e5e7eb", borderRadius: "10px", padding: "0.7rem 0.9rem", background: "#fff" }}>
              <p style={{ margin: 0, color: "#64748b", fontSize: "0.8rem" }}>Total Billed</p>
              <p style={{ margin: "0.25rem 0 0 0", fontWeight: 700, fontSize: "1.1rem" }}>{formatCurrency(totals.billedAmount)}</p>
            </article>
            <article style={{ border: "1px solid #e5e7eb", borderRadius: "10px", padding: "0.7rem 0.9rem", background: "#fff" }}>
              <p style={{ margin: 0, color: "#64748b", fontSize: "0.8rem" }}>Collected</p>
              <p style={{ margin: "0.25rem 0 0 0", fontWeight: 700, fontSize: "1.1rem" }}>{formatCurrency(totals.collectedAmount)}</p>
            </article>
          </div>

          <div style={{ marginTop: "1rem", overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff" }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: "0.6rem", borderBottom: "1px solid #d1d5db" }}>Patient</th>
                  <th style={{ textAlign: "left", padding: "0.6rem", borderBottom: "1px solid #d1d5db" }}>Dentist</th>
                  <th style={{ textAlign: "left", padding: "0.6rem", borderBottom: "1px solid #d1d5db" }}>Last Payment</th>
                  <th style={{ textAlign: "left", padding: "0.6rem", borderBottom: "1px solid #d1d5db" }}>Services</th>
                  <th style={{ textAlign: "left", padding: "0.6rem", borderBottom: "1px solid #d1d5db" }}>Due</th>
                  <th style={{ textAlign: "left", padding: "0.6rem", borderBottom: "1px solid #d1d5db" }}>Paid</th>
                  <th style={{ textAlign: "left", padding: "0.6rem", borderBottom: "1px solid #d1d5db" }}>Balance</th>
                  <th style={{ textAlign: "left", padding: "0.6rem", borderBottom: "1px solid #d1d5db" }}>Deposit</th>
                  <th style={{ textAlign: "left", padding: "0.6rem", borderBottom: "1px solid #d1d5db" }}>Status</th>
                  <th style={{ textAlign: "left", padding: "0.6rem", borderBottom: "1px solid #d1d5db" }}>Latest Method</th>
                  <th style={{ textAlign: "left", padding: "0.6rem", borderBottom: "1px solid #d1d5db" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan="11" style={{ padding: "0.9rem", color: "#64748b" }}>
                      No payment records found for this range.
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row) => (
                    <tr key={row.id}>
                      <td style={{ padding: "0.55rem", borderBottom: "1px solid #f1f5f9" }}>{row.patient_name || "Unknown"}</td>
                      <td style={{ padding: "0.55rem", borderBottom: "1px solid #f1f5f9" }}>{row.dentist_name || "Unassigned"}</td>
                      <td style={{ padding: "0.55rem", borderBottom: "1px solid #f1f5f9" }}>{formatDateTime(row.latest_payment_at || row.updated_at || row.created_at)}</td>
                      <td style={{ padding: "0.55rem", borderBottom: "1px solid #f1f5f9", maxWidth: "220px" }}>{row.services_text || "-"}</td>
                      <td style={{ padding: "0.55rem", borderBottom: "1px solid #f1f5f9" }}>{formatCurrency(row.total_due)}</td>
                      <td style={{ padding: "0.55rem", borderBottom: "1px solid #f1f5f9" }}>{formatCurrency(row.amount_paid)}</td>
                      <td style={{ padding: "0.55rem", borderBottom: "1px solid #f1f5f9", fontWeight: 600 }}>{formatCurrency(row.balance_due)}</td>
                      <td style={{ padding: "0.55rem", borderBottom: "1px solid #f1f5f9" }}>{row.is_deposit ? "Yes" : "No"}</td>
                      <td style={{ padding: "0.55rem", borderBottom: "1px solid #f1f5f9" }}>{row.payment_status || "-"}</td>
                      <td style={{ padding: "0.55rem", borderBottom: "1px solid #f1f5f9" }}>{formatMethodLabel(row.latest_payment_method)}</td>
                      <td style={{ padding: "0.55rem", borderBottom: "1px solid #f1f5f9" }}>
                        {isBillingRecord(row) ? (
                          <button type="button" onClick={() => handleOpenRecord(row)} disabled={busyId === row.id || openingRecordId === row.id}>
                            {busyId === row.id ? "Saving..." : openingRecordId === row.id ? "Loading..." : "Review / Add Payment"}
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

      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={handleCloseRecord}
        onSubmit={handleSaveInstallment}
        isSubmitting={Boolean(busyId)}
        summary={selectedRecord || {}}
        transactions={selectedRecord?.transactions || []}
        initialValues={modalInitialValues}
        mode="edit"
      />
    </section>
  );
}

export default Payments;
