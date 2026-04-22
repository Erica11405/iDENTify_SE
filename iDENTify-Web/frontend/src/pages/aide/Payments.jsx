import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import apiClient from "../../api/apiClient";
import PaymentModal from "../../components/PaymentModal";
import "../../styles/pages/aide/Payments.css";

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

  return `${parsed.toLocaleDateString("en-PH", { timeZone: "Asia/Manila" })} ${parsed.toLocaleTimeString("en-PH", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Manila",
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
  return `${startDate.toLocaleDateString("en-PH", { timeZone: "Asia/Manila" })} to ${endDate.toLocaleDateString("en-PH", { timeZone: "Asia/Manila" })}`;
}

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function buildNormalizedOptions(values) {
  const optionMap = new Map();

  (values || []).forEach((value) => {
    const label = String(value || "").trim();
    if (!label) return;
    const normalized = normalizeText(label);
    if (!normalized) return;
    if (!optionMap.has(normalized)) {
      optionMap.set(normalized, label);
    }
  });

  return Array.from(optionMap.entries())
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

function toPositiveInt(value) {
  const parsed = Number.parseInt(String(value || ""), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

function normalizeServices(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || "").trim()).filter(Boolean);
  }

  const text = String(value || "").trim();
  if (!text) return [];

  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) {
      return parsed.map((item) => String(item || "").trim()).filter(Boolean);
    }
  } catch {
    // Ignore parse errors and fall back to comma split.
  }

  return text.split(",").map((item) => item.trim()).filter(Boolean);
}

function sanitizeSplitContext(rawContext) {
  if (!rawContext || typeof rawContext !== "object") return null;

  const services = normalizeServices(rawContext.services || rawContext.remaining_services);
  if (services.length === 0) return null;

  return {
    sourcePaymentId: toPositiveInt(rawContext.sourcePaymentId),
    patient_id: toPositiveInt(rawContext.patient_id),
    patient_name: String(rawContext.patient_name || "").trim() || "Unknown",
    dentist_id: toPositiveInt(rawContext.dentist_id),
    dentist_name: String(rawContext.dentist_name || "").trim() || "Unassigned",
    appointment_id: toPositiveInt(rawContext.appointment_id),
    queue_id: toPositiveInt(rawContext.queue_id),
    visit_datetime: String(rawContext.visit_datetime || "").trim() || null,
    services,
  };
}

function isBillingRecord(row) {
  return Number(row?.balance_due || 0) > 0;
}

function isPaidRecord(row) {
  return Number(row?.balance_due || 0) <= 0;
}

function Payments({
  pageTitle = "Payments",
  pageSubtitle = "Review billing records, add installments, and finalize pending balances.",
  forcedDentistId = null,
  hideDentistFilter = false,
  isReadOnly = false,
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [paymentRows, setPaymentRows] = useState([]);

  const [rangeType, setRangeType] = useState("monthly");
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d;
  });
  const [endDate, setEndDate] = useState(new Date());

  const [search, setSearch] = useState("");
  const [dentistFilter, setDentistFilter] = useState("all");
  const [serviceFilter, setServiceFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [busyId, setBusyId] = useState(null);
  const [openingRecordId, setOpeningRecordId] = useState(null);
  const [focusHandled, setFocusHandled] = useState(false);
  const [continuationPaymentId, setContinuationPaymentId] = useState(null);
  const [continuationQueueId, setContinuationQueueId] = useState(null);
  const [splitSourcePaymentId, setSplitSourcePaymentId] = useState(null);
  const [splitCreateContext, setSplitCreateContext] = useState(null);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  const hasForcedDentistScope = forcedDentistId !== null && forcedDentistId !== undefined && String(forcedDentistId).trim() !== "";

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
    setContinuationPaymentId(null);
    setContinuationQueueId(null);
    setSplitSourcePaymentId(null);
    setSplitCreateContext(null);
  }, [location.key]);

  const filteredRows = useMemo(() => {
    const needle = normalizeText(search);

    return (paymentRows || [])
      .filter((row) => {
        const patientName = normalizeText(row.patient_name);

        if (needle && !patientName.includes(needle)) {
          return false;
        }

        if (dentistFilter !== "all" && normalizeText(row.dentist_name) !== dentistFilter) {
          return false;
        }

        if (hasForcedDentistScope && String(row.dentist_id || "") !== String(forcedDentistId)) {
          return false;
        }

        if (statusFilter !== "all" && normalizeText(row.payment_status) !== statusFilter) {
          return false;
        }

        if (serviceFilter !== "all") {
          const rowServices = normalizeServices(row.services || row.services_text).map((serviceName) => normalizeText(serviceName));
          if (!rowServices.includes(serviceFilter)) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        const aDate = parseDateTime(a.latest_payment_at || a.updated_at || a.created_at)?.getTime() || 0;
        const bDate = parseDateTime(b.latest_payment_at || b.updated_at || b.created_at)?.getTime() || 0;
        return bDate - aDate;
      });
  }, [paymentRows, search, dentistFilter, serviceFilter, statusFilter, hasForcedDentistScope, forcedDentistId]);

  const dentistOptions = useMemo(() => buildNormalizedOptions((paymentRows || []).map((row) => row.dentist_name)), [paymentRows]);

  const serviceOptions = useMemo(() => {
    const services = (paymentRows || []).flatMap((row) => normalizeServices(row.services || row.services_text));
    return buildNormalizedOptions(services);
  }, [paymentRows]);

  const statusOptions = useMemo(() => buildNormalizedOptions((paymentRows || []).map((row) => row.payment_status)), [paymentRows]);

  const totals = useMemo(() => {
    const billing = filteredRows.filter((row) => isBillingRecord(row)).length;
    const paid = filteredRows.filter((row) => isPaidRecord(row)).length;
    const billedAmount = filteredRows.reduce((sum, row) => sum + Number(row.total_due || 0), 0);
    const collectedAmount = filteredRows.reduce((sum, row) => sum + Number(row.amount_paid || 0), 0);
    const outstandingAmount = filteredRows.reduce((sum, row) => sum + Math.max(Number(row.balance_due || 0), 0), 0);
    const collectionRate = billedAmount > 0
      ? Math.min((collectedAmount / billedAmount) * 100, 100)
      : 0;
    const total = billing + paid;

    return {
      billing,
      paid,
      total,
      billedAmount,
      collectedAmount,
      outstandingAmount,
      collectionRate,
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
    if (splitCreateContext) {
      setSplitCreateContext(null);
      setSplitSourcePaymentId(null);
    }
  };

  useEffect(() => {
    const focusPaymentId = toPositiveInt(location.state?.focusPaymentId);
    const sessionQueueId = toPositiveInt(location.state?.sessionQueueId);
    const splitContext = sanitizeSplitContext(location.state?.splitPaymentContext);
    if (!focusPaymentId || focusHandled) return;

    setFocusHandled(true);
    setContinuationPaymentId(focusPaymentId);
    setContinuationQueueId(sessionQueueId);
    setSplitCreateContext(splitContext);
    setSplitSourcePaymentId(toPositiveInt(location.state?.splitPaymentContext?.sourcePaymentId) || focusPaymentId);

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

      const shouldOpenSplitCreate = Boolean(
        splitCreateContext
        && Number(splitSourcePaymentId || continuationPaymentId) === Number(selectedRecord.id)
      );

      const shouldSyncContinuationQueue = Boolean(
        continuationQueueId
        && continuationPaymentId
        && Number(continuationPaymentId) === Number(selectedRecord.id)
      );

      if (shouldSyncContinuationQueue) {
        try {
          await apiClient.updateQueueItem(continuationQueueId, { status: "Done" });
        } catch (syncError) {
          console.error("Failed to sync queue status after installment", syncError);
          toast.error("Payment saved, but Walk In status sync failed.");
        } finally {
          setContinuationPaymentId(null);
          setContinuationQueueId(null);
        }
      }

      toast.success("Payment installment saved.");

      setIsPaymentModalOpen(false);
      setSelectedRecord(null);
      await loadPayments();

      if (shouldOpenSplitCreate) {
        toast.success("Proceed to collect payment for remaining services.");
        setIsPaymentModalOpen(true);
        return;
      }

      if (Number(updated?.balance_due || 0) <= 0) {
        toast.success("Payment is now fully settled.");
      }
    } catch (err) {
      toast.error(err.message || "Failed to save payment installment.");
    } finally {
      setBusyId(null);
    }
  };

  const handleCreateSplitPayment = async (payload) => {
    if (!splitCreateContext) return;

    const totalDue = Number(payload?.total_due || 0);
    const amountPaidNow = Number(payload?.amount_paid_now || 0);
    if (!Number.isFinite(totalDue) || totalDue <= 0) {
      toast.error("Enter a valid total amount due for remaining services.");
      return;
    }

    if (!Number.isFinite(amountPaidNow) || amountPaidNow < totalDue) {
      toast.error("Remaining services must be fully paid.");
      return;
    }

    setBusyId(splitCreateContext.sourcePaymentId || -1);
    try {
      await apiClient.createPaymentRecord({
        ...splitCreateContext,
        ...payload,
        queue_id: splitCreateContext.queue_id,
        appointment_id: splitCreateContext.appointment_id,
        services: splitCreateContext.services,
        is_deposit: false,
        allow_split_record: true,
        notes: `Split payment after continuing record #${splitCreateContext.sourcePaymentId || "N/A"}`,
      });

      toast.success("Payment for remaining services saved.");

      setIsPaymentModalOpen(false);
      setSelectedRecord(null);
      setSplitCreateContext(null);
      setSplitSourcePaymentId(null);
      setContinuationQueueId(null);
      setContinuationPaymentId(null);
      await loadPayments();

      if (location.state?.focusPaymentId || location.state?.splitPaymentContext) {
        navigate(location.pathname, { replace: true, state: {} });
      }
    } catch (err) {
      if (err?.status === 409) {
        toast.error(err?.message || "Split payment is blocked. Run the split-payment DB index migration and retry.");
      } else {
        toast.error(err.message || "Failed to save payment for remaining services.");
      }
    } finally {
      setBusyId(null);
    }
  };

  const splitModalSummary = useMemo(() => {
    if (!splitCreateContext) return {};
    return {
      patient_name: splitCreateContext.patient_name,
      dentist_name: splitCreateContext.dentist_name,
      visit_datetime: splitCreateContext.visit_datetime,
      services: splitCreateContext.services,
    };
  }, [splitCreateContext]);

  const isSplitCreateMode = Boolean(splitCreateContext);

  const modalInitialValues = useMemo(() => {
    if (isSplitCreateMode) {
      return {
        total_due: "",
        is_deposit: false,
        already_paid: 0,
        payment_method: "cash",
        amount_paid_now: "",
      };
    }

    if (!selectedRecord) return {};

    const balanceDue = Number(selectedRecord.balance_due || 0);
    return {
      total_due: Number(selectedRecord.total_due || 0),
      is_deposit: Boolean(selectedRecord.is_deposit),
      already_paid: Number(selectedRecord.amount_paid || 0),
      payment_method: "cash",
      amount_paid_now: balanceDue > 0 ? balanceDue : 0,
    };
  }, [isSplitCreateMode, selectedRecord]);

  return (
    <section className="payments-page">
      <div className="payments-header">
        <h1 className="payments-title">{pageTitle}</h1>
        <p className="payments-subtitle">{pageSubtitle}</p>
      </div>

      <div className="payments-top-controls">
        <div className="payments-range-buttons">
          <button type="button" onClick={() => applyRange("daily")} className={`export-btn ${rangeType === "daily" ? "pdf" : ""}`}>Today</button>
          <button type="button" onClick={() => applyRange("weekly")} className={`export-btn ${rangeType === "weekly" ? "pdf" : ""}`}>Past Week</button>
          <button type="button" onClick={() => applyRange("monthly")} className={`export-btn ${rangeType === "monthly" ? "pdf" : ""}`}>Past Month</button>
          <button type="button" onClick={() => applyRange("yearly")} className={`export-btn ${rangeType === "yearly" ? "pdf" : ""}`}>Past Year</button>
        </div>

        <div className="payments-date-filters">
          <label className="filter-group compact-filter">
            <span>Start Date</span>
            <input
              type="date"
              value={toDateParam(startDate)}
              onChange={(e) => {
                setRangeType("custom");
                setStartDate(parseDateInput(e.target.value));
              }}
            />
          </label>

          <label className="filter-group compact-filter">
            <span>End Date</span>
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
      </div>

      <div className="payments-filters-row">
        <label className="filter-group search-filter-group">
          <span>Search Patient</span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Patient name"
          />
        </label>

        {!hideDentistFilter ? (
          <label className="filter-group inline-filter">
            <span>Dentist</span>
            <select value={dentistFilter} onChange={(e) => setDentistFilter(e.target.value)}>
              <option value="all">All Dentists</option>
              {dentistOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <label className="filter-group inline-filter">
          <span>Service</span>
          <select value={serviceFilter} onChange={(e) => setServiceFilter(e.target.value)}>
            <option value="all">All Services</option>
            {serviceOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="filter-group inline-filter">
          <span>Status</span>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">All Statuses</option>
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <p className="payments-range-note">Range: {rangeLabel(startDate, endDate)}</p>
      <p className="payments-range-note">Outstanding balances are always shown, even outside the selected range.</p>

      {loading ? <p className="payments-loading">Loading payment records...</p> : null}
      {!loading && error ? <p className="payments-error">{error}</p> : null}

      {!loading && !error ? (
        <>
          <div className="payments-summary-grid">
            <article className="payments-summary-card">
              <p>With Remaining Balance</p>
              <h3>{totals.billing}</h3>
            </article>
            <article className="payments-summary-card">
              <p>Paid / Completed</p>
              <h3>{totals.paid}</h3>
            </article>
            <article className="payments-summary-card">
              <p>Total Payment Records</p>
              <h3>{totals.total}</h3>
            </article>
            <article className="payments-summary-card">
              <p>Total Billed</p>
              <h3>{formatCurrency(totals.billedAmount)}</h3>
            </article>
            <article className="payments-summary-card">
              <p>Collected</p>
              <h3>{formatCurrency(totals.collectedAmount)}</h3>
            </article>
            <article className="payments-summary-card summary-balance-due">
              <p>Remaining Balance</p>
              <h3 className="summary-balance-amount">{formatCurrency(totals.outstandingAmount)}</h3>
            </article>
            <article className="payments-summary-card">
              <p>Collection Rate</p>
              <h3>{totals.collectionRate.toFixed(1)}%</h3>
            </article>
          </div>

          <div className="payments-table-container">
            <table className="payments-table">
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Dentist</th>
                  <th>Last Payment</th>
                  <th>Services</th>
                  <th>Total Due</th>
                  <th>Paid So Far</th>
                  <th>Remaining Balance</th>
                  <th>Deposit</th>
                  <th>Status</th>
                  <th>Latest Method</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan="11" className="payments-empty-state">
                      No payment records found for this range.
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row) => {
                    const totalDue = Number(row.total_due || 0);
                    const amountPaid = Number(row.amount_paid || 0);
                    const balanceDue = Math.max(Number(row.balance_due || 0), 0);
                    const isOutstanding = balanceDue > 0;

                    return (
                      <tr key={row.id}>
                        <td>{row.patient_name || "Unknown"}</td>
                        <td>{row.dentist_name || "Unassigned"}</td>
                        <td>{formatDateTime(row.latest_payment_at || row.updated_at || row.created_at)}</td>
                        <td className="payments-services-cell">{row.services_text || "-"}</td>
                        <td className="payments-money-cell">{formatCurrency(totalDue)}</td>
                        <td className="payments-money-cell">{formatCurrency(amountPaid)}</td>
                        <td className={`payments-balance-cell ${isOutstanding ? "is-outstanding" : "is-settled"}`}>
                          <strong>{formatCurrency(balanceDue)}</strong>
                          <span>{isOutstanding ? "Remaining" : "Settled"}</span>
                        </td>
                        <td>{row.is_deposit ? "Yes" : "No"}</td>
                        <td>{row.payment_status || "-"}</td>
                        <td>{formatMethodLabel(row.latest_payment_method)}</td>
                        <td>
                          {isBillingRecord(row) ? (
                            isReadOnly ? (
                              <span className="status-pending-text">Pending</span>
                            ) : (
                              <button
                                type="button"
                                className="review-btn"
                                onClick={() => handleOpenRecord(row)}
                                disabled={busyId === row.id || openingRecordId === row.id}
                              >
                                {busyId === row.id ? "Saving..." : openingRecordId === row.id ? "Loading..." : "Update / Add Payment"}
                              </button>
                            )
                          ) : (
                            <span className="status-paid-text">Paid</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : null}

      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={handleCloseRecord}
        onSubmit={isSplitCreateMode ? handleCreateSplitPayment : handleSaveInstallment}
        isSubmitting={Boolean(busyId)}
        summary={isSplitCreateMode ? splitModalSummary : (selectedRecord || {})}
        transactions={isSplitCreateMode ? [] : (selectedRecord?.transactions || [])}
        initialValues={modalInitialValues}
        mode={isSplitCreateMode ? "create" : "edit"}
        unpaidMatches={[]}
      />
    </section>
  );
}

export default Payments;
