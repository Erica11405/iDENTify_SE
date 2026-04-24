import React, { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import "../styles/components/PaymentModal.css";

const METHOD_OPTIONS = [
  { value: "cash", label: "Cash" },
  { value: "cashless", label: "Cashless" },
];

function toNumeric(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function formatCurrency(value) {
  const amount = toNumeric(value, 0);
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDateTime(value) {
  if (!value) return "-";

  const parsed = new Date(String(value).replace(" ", "T"));
  if (Number.isNaN(parsed.getTime())) return "-";

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).formatToParts(parsed);

  const lookup = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${lookup.year}-${lookup.month}-${lookup.day} ${lookup.hour}:${lookup.minute}:${lookup.second} ${(lookup.dayPeriod || "").toUpperCase()}`.trim();
}

function formatMethodLabel(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return "-";
  return normalized === "cash" ? "Cash" : "Cashless";
}

function resolveProofSource(proofData) {
  const source = String(proofData || "").trim();
  if (!source) return "";
  if (source.startsWith("data:") || source.startsWith("http://") || source.startsWith("https://")) {
    return source;
  }
  return `data:image/*;base64,${source}`;
}

function normalizeServices(value) {
  if (Array.isArray(value)) {
    return value.map((item) => {
      if (typeof item === 'object' && item !== null) return item;
      const str = String(item || "").trim();
      return str ? { name: str, price: 0 } : null;
    }).filter(Boolean);
  }

  const text = String(value || "").trim();
  if (!text) return [];

  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) {
      return parsed.map((item) => {
        if (typeof item === 'object' && item !== null) return item;
        const str = String(item || "").trim();
        return str ? { name: str, price: 0 } : null;
      }).filter(Boolean);
    }
  } catch {
    // Ignore parse errors and fallback to comma split.
  }

  return text.split(",").map((item) => {
    const str = item.trim();
    return str ? { name: str, price: 0 } : null;
  }).filter(Boolean);
}

function isOnlineMethod(method) {
  return String(method || "").trim().toLowerCase() !== "cash";
}

const INITIAL_FORM = {
  total_due: "",
  is_deposit: false,
  payment_method: "cash",
  amount_paid_now: "",
  proof_name: "",
  proof_data: "",
  already_paid: "0",
};

function PaymentModal({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting = false,
  summary = {},
  initialValues = {},
  unpaidMatches = [],
  transactions = [],
  onContinueExisting,
  mode = "create",
}) {
  const [form, setForm] = useState(INITIAL_FORM);
  const [selectedMatchId, setSelectedMatchId] = useState("");
  const [previewProof, setPreviewProof] = useState(null);

  useEffect(() => {
    if (!isOpen) return;

    setForm({
      total_due: initialValues.total_due !== undefined && initialValues.total_due !== "" 
        ? String(initialValues.total_due) 
        : (summary.total_due_prefill !== undefined ? String(summary.total_due_prefill) : ""),
      is_deposit: Boolean(initialValues.is_deposit),
      payment_method: String(initialValues.payment_method || "cash"),
      amount_paid_now: initialValues.amount_paid_now !== undefined ? String(initialValues.amount_paid_now) : "",
      proof_name: String(initialValues.proof_name || ""),
      proof_data: String(initialValues.proof_data || ""),
      already_paid: initialValues.already_paid !== undefined ? String(initialValues.already_paid) : "0",
    });
  }, [isOpen, initialValues, summary.total_due_prefill]);

  useEffect(() => {
    if (isOpen) return;
    setPreviewProof(null);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    if (mode !== "create" || !Array.isArray(unpaidMatches) || unpaidMatches.length === 0) {
      setSelectedMatchId("");
      return;
    }

    setSelectedMatchId(String(unpaidMatches[0].id || ""));
  }, [isOpen, mode, unpaidMatches]);

  const services = useMemo(() => normalizeServices(summary.services || summary.services_text), [summary]);
  const hasDetectedUnpaidMatches = mode === "create" && Array.isArray(unpaidMatches) && unpaidMatches.length > 0;
  const hasTransactions = mode === "edit" && Array.isArray(transactions) && transactions.length > 0;

  const totalDue = toNumeric(form.total_due, 0);
  const alreadyPaid = toNumeric(form.already_paid, 0);
  const amountPaidNow = toNumeric(form.amount_paid_now, 0);

  const balanceAfter = Math.max(totalDue - (alreadyPaid + amountPaidNow), 0);

  if (!isOpen) return null;

  const continueExistingPayment = async () => {
    if (!hasDetectedUnpaidMatches) return;

    const selectedMatch = unpaidMatches.find((item) => String(item.id) === String(selectedMatchId));
    if (!selectedMatch) {
      toast.error("Select an existing unpaid record to continue.");
      return;
    }

    if (typeof onContinueExisting !== "function") {
      toast.error("Unable to continue the selected payment record right now.");
      return;
    }

    await onContinueExisting(selectedMatch);
  };

  const openProofPreview = (entry) => {
    const src = resolveProofSource(entry?.proof_data);
    if (!src) {
      toast.error("Proof image is unavailable for this transaction.");
      return;
    }

    setPreviewProof({
      src,
      name: String(entry?.proof_name || "Payment proof"),
    });
  };

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error("Failed to read file."));
        reader.readAsDataURL(file);
      });

      setForm((prev) => ({
        ...prev,
        proof_name: file.name,
        proof_data: String(base64 || ""),
      }));
    } catch (error) {
      console.error(error);
      toast.error("Failed to attach proof file.");
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (totalDue <= 0) {
      toast.error("Enter a valid total amount due.");
      return;
    }

    if (amountPaidNow <= 0) {
      toast.error("Enter a valid payment amount.");
      return;
    }

    const method = String(form.payment_method || "").trim().toLowerCase();
    if (!method) {
      toast.error("Select a payment method.");
      return;
    }

    if (isOnlineMethod(method) && (!form.proof_name || !form.proof_data)) {
      toast.error("Attach payment proof for cashless payments.");
      return;
    }

    if (!form.is_deposit && balanceAfter > 0) {
      toast.error("Non-deposit payments must be fully paid.");
      return;
    }

    const payload = {
      total_due: totalDue,
      is_deposit: Boolean(form.is_deposit),
      payment_method: method,
      amount_paid_now: amountPaidNow,
      cash_received: method === "cash" ? amountPaidNow : null,
      proof_name: isOnlineMethod(method) ? form.proof_name : null,
      proof_data: isOnlineMethod(method) ? form.proof_data : null,
    };

    await onSubmit(payload);
  };

  return (
    <div className="payment-modal-overlay">
      <div className="payment-modal" role="dialog" aria-modal="true">
        <h2>{mode === "edit" ? "Review Payment Record" : "Payment Details"}</h2>

        <div className="payment-summary-card">
          <p><strong>Patient:</strong> {summary.patient_name || "Unknown"}</p>
          <p><strong>Dentist:</strong> {summary.dentist_name || "Unassigned"}</p>
          <p><strong>Date and Time:</strong> {summary.visit_datetime || summary.created_at ? formatDateTime(summary.visit_datetime || summary.created_at) : "Not set"}</p>
          <p><strong>Services:</strong></p>
          <div className="payment-service-list">
            {services.length > 0 ? services.map((service, idx) => {
              const name = typeof service === 'object' ? service.name : service;
              const price = typeof service === 'object' ? service.price : 0;
              return (
                <div key={idx} className="payment-service-item" style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 10px', background: '#f8fafc', borderRadius: '4px', marginBottom: '5px' }}>
                  <span className="payment-service-name">{name}</span>
                  {price > 0 && <span className="payment-service-price">₱{Number(price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>}
                </div>
              );
            }) : <span className="payment-service-empty">No services listed.</span>}
            
            {summary.additional_charges && summary.additional_charges.length > 0 && (
              summary.additional_charges.map((charge, idx) => (
                <div key={`charge-${idx}`} className="payment-service-item" style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 10px', background: '#f8fafc', borderRadius: '4px', marginBottom: '5px' }}>
                  <span className="payment-service-name">{charge.name || 'Miscellaneous'}</span>
                  <span className="payment-service-price">₱{Number(charge.price || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {hasDetectedUnpaidMatches ? (
          <div className="payment-existing-balance-block">
            <p className="payment-existing-balance-title">Existing Unpaid Balance Found</p>
            <p className="payment-existing-balance-note">
              This patient already has unpaid balance for the same service. Select the record to continue payment in the Payments page.
            </p>

            <div className="payment-existing-list">
              {unpaidMatches.map((match) => {
                const isSelected = String(selectedMatchId) === String(match.id);
                return (
                  <label key={match.id} className={`payment-existing-item${isSelected ? " selected" : ""}`}>
                    <input
                      type="radio"
                      name="existing-balance"
                      value={String(match.id)}
                      checked={isSelected}
                      onChange={(event) => setSelectedMatchId(event.target.value)}
                      disabled={isSubmitting}
                    />
                    <div className="payment-existing-item-content">
                      <strong>{match.services_text || "Unspecified Service"}</strong>
                      <span>Date: {formatDateTime(match.visit_datetime || match.created_at)}</span>
                      <span>Balance: {formatCurrency(match.balance_due)} | Paid: {formatCurrency(match.amount_paid)} | Due: {formatCurrency(match.total_due)}</span>
                    </div>
                  </label>
                );
              })}
            </div>

            <div className="payment-modal-actions">
              <button type="button" onClick={onClose} disabled={isSubmitting}>Cancel</button>
              <button type="button" onClick={continueExistingPayment} disabled={isSubmitting}>
                {isSubmitting ? "Opening..." : "Continue In Payments"}
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="payment-grid">
              <label>
                Total Amount Due
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.total_due}
                  onChange={(event) => setForm((prev) => ({ ...prev, total_due: event.target.value }))}
                  disabled={isSubmitting}
                  required
                />
              </label>

              <label>
                Payment Method
                <select
                  value={form.payment_method}
                  onChange={(event) => setForm((prev) => ({ ...prev, payment_method: event.target.value }))}
                  disabled={isSubmitting}
                  required
                >
                  {METHOD_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>

              <label>
                Amount Paid Now
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.amount_paid_now}
                  onChange={(event) => setForm((prev) => ({ ...prev, amount_paid_now: event.target.value }))}
                  disabled={isSubmitting}
                  required
                />
              </label>
            </div>

            <label className="payment-checkbox-row">
              <input
                type="checkbox"
                checked={Boolean(form.is_deposit)}
                onChange={(event) => setForm((prev) => ({ ...prev, is_deposit: event.target.checked }))}
                disabled={isSubmitting}
              />
              <span>Deposit payment (allow installments)</span>
            </label>

            {isOnlineMethod(form.payment_method) && (
              <div className="payment-proof-block">
                <label>
                  Upload Proof of Payment
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    disabled={isSubmitting}
                  />
                </label>
                {form.proof_name ? <p className="payment-proof-name">Attached: {form.proof_name}</p> : null}
              </div>
            )}

            <div className={`payment-balance-focus ${balanceAfter > 0 ? "has-remaining" : "settled"}`}>
              <span>Remaining Balance After This Payment</span>
              <strong>{formatCurrency(balanceAfter)}</strong>
              <p>
                {balanceAfter > 0
                  ? "Additional payment is still required to settle this record."
                  : "This payment settles the record in full."}
              </p>
            </div>

            <div className="payment-preview-grid">
              <div className="payment-preview-item due">
                <span>Total Due</span>
                <strong>{formatCurrency(totalDue)}</strong>
              </div>
              <div className="payment-preview-item paid">
                <span>Paid So Far</span>
                <strong>{formatCurrency(alreadyPaid)}</strong>
              </div>
              <div className="payment-preview-item current">
                <span>Payment This Entry</span>
                <strong>{formatCurrency(amountPaidNow)}</strong>
              </div>
              <div className={`payment-preview-item remaining ${balanceAfter > 0 ? "remaining-open" : "remaining-settled"}`}>
                <span>Remaining After Payment</span>
                <strong>{formatCurrency(balanceAfter)}</strong>
              </div>
            </div>

            {hasTransactions ? (
              <div className="payment-history-block">
                <p className="payment-history-title">Payment History</p>
                <div className="payment-history-table-wrap">
                  <table className="payment-history-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Method</th>
                        <th>Amount</th>
                        <th>Proof</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map((entry) => (
                        <tr key={entry.id || `${entry.created_at}-${entry.amount_paid}`}>
                          <td>{formatDateTime(entry.created_at)}</td>
                          <td>{formatMethodLabel(entry.payment_method)}</td>
                          <td>{formatCurrency(entry.amount_paid)}</td>
                          <td>
                            {resolveProofSource(entry.proof_data) ? (
                              <button
                                type="button"
                                className="payment-proof-thumb-btn"
                                onClick={() => openProofPreview(entry)}
                                disabled={isSubmitting}
                              >
                                <img
                                  src={resolveProofSource(entry.proof_data)}
                                  alt={entry.proof_name || "Payment proof"}
                                  className="payment-proof-thumb"
                                />
                                <span>View</span>
                              </button>
                            ) : (
                              entry.proof_name || "No"
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}

            <div className="payment-modal-actions">
              <button type="button" onClick={onClose} disabled={isSubmitting}>Cancel</button>
              <button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : (mode === "edit" ? "Save Installment" : "Save Payment")}
              </button>
            </div>
          </form>
        )}
      </div>

      {previewProof ? (
        <div className="payment-proof-lightbox" onClick={() => setPreviewProof(null)}>
          <div
            className="payment-proof-lightbox-content"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="payment-proof-lightbox-close"
              onClick={() => setPreviewProof(null)}
            >
              Close
            </button>
            <img
              src={previewProof.src}
              alt={previewProof.name}
              className="payment-proof-lightbox-image"
            />
            <p className="payment-proof-lightbox-caption">{previewProof.name}</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default PaymentModal;
