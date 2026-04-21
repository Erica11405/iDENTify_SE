import React, { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../api/apiClient';
import '../../styles/pages/superadmin/SuperAdminApprovals.css';

function normalizeStatus(value) {
    const normalized = String(value || '').trim().toLowerCase();
    if (normalized === 'pendingreview') return 'pending_review';
    if (normalized === 'pending_review' || normalized === 'approved' || normalized === 'declined') {
        return normalized;
    }
    return 'pending_review';
}

function formatDateTime(value) {
    if (!value) return '-';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return '-';
    return parsed.toLocaleString();
}

function statusLabel(value) {
    const status = normalizeStatus(value);
    if (status === 'pending_review') return 'Pending Review';
    if (status === 'approved') return 'Approved';
    if (status === 'declined') return 'Declined';
    return 'Pending Review';
}

function isImageData(value) {
    return /^data:image\//i.test(String(value || ''));
}

function DocumentPreview({ title, name, data }) {
    const safeName = String(name || '').trim();
    const safeData = String(data || '').trim();

    return (
        <div className="approval-document-card">
            <div className="approval-document-title">{title}</div>
            <div className="approval-document-name">{safeName || 'No file name'}</div>
            {safeData ? (
                <>
                    {isImageData(safeData) ? (
                        <img src={safeData} alt={safeName || title} className="approval-document-image" />
                    ) : (
                        <p className="approval-document-note">Document preview is not available for this file type.</p>
                    )}
                    <a href={safeData} target="_blank" rel="noopener noreferrer" className="approval-document-link">
                        Open Document
                    </a>
                </>
            ) : (
                <p className="approval-document-note">No file uploaded.</p>
            )}
        </div>
    );
}

function SuperAdminApprovals() {
    const [statusFilter, setStatusFilter] = useState('pending_review');
    const [requests, setRequests] = useState([]);
    const [loadingList, setLoadingList] = useState(false);

    const [selectedRequestId, setSelectedRequestId] = useState(null);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [loadingDetail, setLoadingDetail] = useState(false);

    const [reviewNotes, setReviewNotes] = useState('');
    const [declineReason, setDeclineReason] = useState('');
    const [savingAction, setSavingAction] = useState(false);

    const loadRequests = useCallback(async () => {
        setLoadingList(true);
        try {
            const rows = await api.getSuperadminRequestsForReview({ status: statusFilter });
            const normalizedRows = Array.isArray(rows) ? rows : [];
            setRequests(normalizedRows);

            if (!normalizedRows.length) {
                setSelectedRequestId(null);
                setSelectedRequest(null);
                return;
            }

            const selectedStillExists = normalizedRows.some((item) => Number(item.id) === Number(selectedRequestId));
            if (!selectedStillExists) {
                setSelectedRequestId(normalizedRows[0].id);
            }
        } catch (error) {
            toast.error(error.message || 'Failed to load approval requests.');
        } finally {
            setLoadingList(false);
        }
    }, [statusFilter, selectedRequestId]);

    const loadRequestDetail = useCallback(async (requestId) => {
        if (!requestId) {
            setSelectedRequest(null);
            return;
        }

        setLoadingDetail(true);
        try {
            const detail = await api.getSuperadminRequestDetail(requestId);
            setSelectedRequest(detail || null);
            setReviewNotes(String(detail?.review_notes || ''));
            setDeclineReason('');
        } catch (error) {
            toast.error(error.message || 'Failed to load request details.');
            setSelectedRequest(null);
        } finally {
            setLoadingDetail(false);
        }
    }, []);

    useEffect(() => {
        loadRequests();
    }, [loadRequests]);

    useEffect(() => {
        loadRequestDetail(selectedRequestId);
    }, [selectedRequestId, loadRequestDetail]);

    const canApprove = useMemo(
        () => normalizeStatus(selectedRequest?.status) !== 'approved',
        [selectedRequest]
    );

    const canDecline = useMemo(
        () => normalizeStatus(selectedRequest?.status) !== 'declined',
        [selectedRequest]
    );

    const handleApprove = async () => {
        if (!selectedRequestId || !canApprove) return;

        setSavingAction(true);
        try {
            await api.approveSuperadminRequest(selectedRequestId, {
                review_notes: reviewNotes,
            });
            toast.success('Request approved successfully.');
            await loadRequests();
            await loadRequestDetail(selectedRequestId);
        } catch (error) {
            toast.error(error.message || 'Failed to approve request.');
        } finally {
            setSavingAction(false);
        }
    };

    const handleDecline = async () => {
        if (!selectedRequestId || !canDecline) return;

        const reason = String(declineReason || '').trim();
        if (!reason) {
            toast.error('Decline reason is required.');
            return;
        }

        setSavingAction(true);
        try {
            await api.declineSuperadminRequest(selectedRequestId, {
                reason,
            });
            toast.success('Request declined successfully.');
            await loadRequests();
            await loadRequestDetail(selectedRequestId);
        } catch (error) {
            toast.error(error.message || 'Failed to decline request.');
        } finally {
            setSavingAction(false);
        }
    };

    return (
        <section className="approvals-page">
            <div className="approvals-header">
                <h2>Request Approvals</h2>
                <div className="approvals-header-actions">
                    <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                        <option value="pending_review">Pending Review</option>
                        <option value="declined">Declined</option>
                        <option value="approved">Approved</option>
                        <option value="all">All</option>
                    </select>
                    <button type="button" onClick={loadRequests} disabled={loadingList}>Refresh</button>
                </div>
            </div>

            <div className="approvals-layout">
                <aside className="approvals-list-panel">
                    <h3>Requests</h3>
                    {loadingList ? <p>Loading requests...</p> : null}
                    {!loadingList && requests.length === 0 ? <p>No requests found.</p> : null}

                    <ul className="approvals-list">
                        {requests.map((item) => {
                            const selected = Number(selectedRequestId) === Number(item.id);
                            return (
                                <li key={item.id}>
                                    <button
                                        type="button"
                                        className={`approvals-list-item ${selected ? 'selected' : ''}`}
                                        onClick={() => setSelectedRequestId(item.id)}
                                    >
                                        <div className="approvals-list-top">
                                            <span className="name">{item.user_name || item.user_email || `Request #${item.id}`}</span>
                                            <span className={`status ${normalizeStatus(item.status)}`}>{statusLabel(item.status)}</span>
                                        </div>
                                        <div className="meta">Clinic: {item.clinic_name || '-'}</div>
                                        <div className="meta">Submitted: {formatDateTime(item.submitted_at)}</div>
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                </aside>

                <div className="approvals-detail-panel">
                    {loadingDetail ? <p>Loading request details...</p> : null}

                    {!loadingDetail && !selectedRequest ? (
                        <p>Select a request to view full details.</p>
                    ) : null}

                    {!loadingDetail && selectedRequest ? (
                        <>
                            <div className="approvals-detail-header">
                                <h3>{selectedRequest.user_name || selectedRequest.user_email || 'Request Detail'}</h3>
                                <span className={`status ${normalizeStatus(selectedRequest.status)}`}>{statusLabel(selectedRequest.status)}</span>
                            </div>

                            <div className="approvals-grid two-col">
                                <div className="field"><label>Email</label><span>{selectedRequest.user_email || '-'}</span></div>
                                <div className="field"><label>Clinic Name</label><span>{selectedRequest.clinic_name || '-'}</span></div>
                                <div className="field"><label>Branch Count</label><span>{selectedRequest.branch_count || '-'}</span></div>
                                <div className="field"><label>Contact Phone</label><span>{selectedRequest.contact_phone || '-'}</span></div>
                            </div>

                            <div className="approvals-grid">
                                <div className="field"><label>Clinic Address</label><span>{selectedRequest.clinic_address || '-'}</span></div>
                                <div className="field"><label>Business Permit/License Number</label><span>{selectedRequest.business_permit_or_license_number || '-'}</span></div>
                                <div className="field"><label>DOH LTO Number</label><span>{selectedRequest.doh_lto_number || '-'}</span></div>
                                <div className="field"><label>SEC/DTI Number</label><span>{selectedRequest.sec_dti_number || '-'}</span></div>
                                <div className="field"><label>BIR 2303 Number</label><span>{selectedRequest.bir_2303_number || '-'}</span></div>
                                <div className="field"><label>Resubmissions</label><span>{selectedRequest.resubmission_count || 0}</span></div>
                                <div className="field"><label>Submitted At</label><span>{formatDateTime(selectedRequest.submitted_at)}</span></div>
                                <div className="field"><label>Reviewed At</label><span>{formatDateTime(selectedRequest.reviewed_at)}</span></div>
                            </div>

                            <div className="approvals-documents-grid">
                                <DocumentPreview
                                    title="Owner Valid ID"
                                    name={selectedRequest.owner_valid_id_name}
                                    data={selectedRequest.owner_valid_id_data}
                                />
                                <DocumentPreview
                                    title="DOH LTO Document"
                                    name={selectedRequest.doh_lto_doc_name}
                                    data={selectedRequest.doh_lto_doc_data}
                                />
                                <DocumentPreview
                                    title="SEC/DTI Document"
                                    name={selectedRequest.sec_dti_doc_name}
                                    data={selectedRequest.sec_dti_doc_data}
                                />
                                <DocumentPreview
                                    title="BIR Form 2303"
                                    name={selectedRequest.bir_2303_doc_name}
                                    data={selectedRequest.bir_2303_doc_data}
                                />
                            </div>

                            <div className="approvals-actions">
                                <div className="field">
                                    <label>Review Notes (optional)</label>
                                    <textarea
                                        rows="3"
                                        value={reviewNotes}
                                        onChange={(e) => setReviewNotes(e.target.value)}
                                        placeholder="Add optional notes for approval context"
                                    />
                                </div>
                                <div className="field">
                                    <label>Decline Reason *</label>
                                    <textarea
                                        rows="3"
                                        value={declineReason}
                                        onChange={(e) => setDeclineReason(e.target.value)}
                                        placeholder="Provide required reason when declining"
                                    />
                                </div>

                                <div className="button-row">
                                    <button type="button" className="approve-btn" onClick={handleApprove} disabled={savingAction || !canApprove}>
                                        {savingAction ? 'Saving...' : 'Approve Request'}
                                    </button>
                                    <button type="button" className="decline-btn" onClick={handleDecline} disabled={savingAction || !canDecline}>
                                        {savingAction ? 'Saving...' : 'Decline Request'}
                                    </button>
                                </div>
                            </div>
                        </>
                    ) : null}
                </div>
            </div>
        </section>
    );
}

export default SuperAdminApprovals;
