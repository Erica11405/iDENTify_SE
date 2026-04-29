import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/apiClient';
import useAppStore from '../store/useAppStore';
import '../styles/pages/SuperAdminRequestGate.css';

function resolveWorkflowErrorMessage(error, fallback) {
    const code = String(error?.body?.code || '').trim().toUpperCase();
    if (code === 'SUPERADMIN_WORKFLOW_NOT_CONFIGURED') {
        return 'Superadmin approval workflow is not configured yet. Please run the latest backend migrations and refresh this page.';
    }

    return error?.message || fallback;
}

function normalizeApprovalStatus(value) {
    const normalized = String(value || '').trim().toLowerCase();
    if (normalized === 'pendingrequirements') return 'pending_requirements';
    if (normalized === 'pendingreview') return 'pending_review';
    if (normalized === 'pending_requirements' || normalized === 'pending_review' || normalized === 'approved' || normalized === 'declined') {
        return normalized;
    }
    return 'pending_requirements';
}

function shouldRequirePasswordChange(user, responseFlag) {
    if (responseFlag === true) return true;

    const rawValue = user?.require_password_change ?? user?.requirePasswordChange;
    if (rawValue === true || rawValue === 1) return true;
    return String(rawValue || '').trim().toLowerCase() === 'true' || String(rawValue || '').trim() === '1';
}

function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('Failed to read file.'));
        reader.readAsDataURL(file);
    });
}

function emptyForm() {
    return {
        clinic_name: '',
        branch_count: '1',
        clinic_address: '',
        street: '',
        barangay: '',
        city: '',
        province: '',
        contact_phone: '',
        business_permit_or_license_number: '',
        owner_valid_id_name: '',
        owner_valid_id_data: '',
        doh_lto_number: '',
        doh_lto_doc_name: '',
        doh_lto_doc_data: '',
        sec_dti_number: '',
        sec_dti_doc_name: '',
        sec_dti_doc_data: '',
        bir_2303_number: '',
        bir_2303_doc_name: '',
        bir_2303_doc_data: '',
    };
}

function toFormState(request) {
    if (!request || typeof request !== 'object') return emptyForm();

    return {
        clinic_name: String(request.clinic_name || ''),
        branch_count: String(request.branch_count || '1'),
        clinic_address: String(request.clinic_address || ''),
        street: String(request.street || ''),
        barangay: String(request.barangay || ''),
        city: String(request.city || ''),
        province: String(request.province || ''),
        contact_phone: String(request.contact_phone || ''),
        business_permit_or_license_number: String(request.business_permit_or_license_number || ''),
        owner_valid_id_name: String(request.owner_valid_id_name || ''),
        owner_valid_id_data: String(request.owner_valid_id_data || ''),
        doh_lto_number: String(request.doh_lto_number || ''),
        doh_lto_doc_name: String(request.doh_lto_doc_name || ''),
        doh_lto_doc_data: String(request.doh_lto_doc_data || ''),
        sec_dti_number: String(request.sec_dti_number || ''),
        sec_dti_doc_name: String(request.sec_dti_doc_name || ''),
        sec_dti_doc_data: String(request.sec_dti_doc_data || ''),
        bir_2303_number: String(request.bir_2303_number || ''),
        bir_2303_doc_name: String(request.bir_2303_doc_name || ''),
        bir_2303_doc_data: String(request.bir_2303_doc_data || ''),
    };
}

import PHAddressSelector from '../components/PHAddressSelector';

function SuperAdminRequestGate() {
    const navigate = useNavigate();
    const { user, setUser, resetStore } = useAppStore();
    const userId = user?.id || null;

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [request, setRequest] = useState(null);
    const [approvalStatus, setApprovalStatus] = useState(normalizeApprovalStatus(user?.approval_status));
    const [form, setForm] = useState(emptyForm);
    const [errors, setErrors] = useState({});
    const [workflowError, setWorkflowError] = useState('');

    const validateField = (field, value) => {
        let error = '';
        if (!value || String(value).trim() === '') {
            if (field === 'clinic_name') error = 'Clinic name is required.';
            if (field === 'street') error = 'Street is required.';
            if (field === 'barangay') error = 'Barangay is required.';
            if (field === 'city') error = 'City is required.';
            if (field === 'province') error = 'Province is required.';
            if (field === 'contact_phone') error = 'Contact phone is required.';
            if (field === 'business_permit_or_license_number') error = 'Business permit number is required.';
        }
        if (field === 'branch_count' && (Number(value) < 1 || isNaN(value))) {
            error = 'Branch count must be at least 1.';
        }
        
        setErrors(prev => ({ ...prev, [field]: error }));
        return !error;
    };

    const loadRequest = useCallback(async () => {
        setLoading(true);
        setWorkflowError('');
        try {
            const result = await api.getMySuperadminRequest();
            const normalizedStatus = normalizeApprovalStatus(result?.user?.approval_status || user?.approval_status);
            setApprovalStatus(normalizedStatus);
            setRequest(result?.request || null);
            setForm(toFormState(result?.request));

            if (result?.user) {
                setUser({
                    ...result.user,
                    role: 'superadmin',
                    require_password_change: shouldRequirePasswordChange(result.user, false),
                    approval_status: normalizedStatus,
                });
            }
        } catch (error) {
            const message = resolveWorkflowErrorMessage(error, 'Failed to load request status.');
            setWorkflowError(message);
        } finally {
            setLoading(false);
        }
    }, [setUser, user?.approval_status]);

    useEffect(() => {
        loadRequest();
    }, [loadRequest, userId]);

    const canSubmit = useMemo(
        () => (approvalStatus === 'pending_requirements' || approvalStatus === 'declined') && !workflowError,
        [approvalStatus, workflowError]
    );

    const waitingReview = approvalStatus === 'pending_review';
    const isApproved = approvalStatus === 'approved';

    const handleInputChange = (field, value) => {
        setForm((prev) => ({ ...prev, [field]: value }));
        validateField(field, value);
    };

    const handleFileChange = async (nameField, dataField, event) => {
        const file = event.target?.files?.[0];
        if (!file) return;

        try {
            const data = await readFileAsDataURL(file);
            setForm((prev) => ({
                ...prev,
                ...(nameField ? { [nameField]: file.name } : {}),
                [dataField]: data,
            }));
        } catch (error) {
            toast.error(error.message || 'Failed to read selected file.');
        }
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (!canSubmit) return;

        const fieldsToValidate = ['clinic_name', 'branch_count', 'street', 'barangay', 'city', 'province', 'contact_phone', 'business_permit_or_license_number'];
        let isFormValid = true;
        fieldsToValidate.forEach(field => {
            if (!validateField(field, form[field])) isFormValid = false;
        });

        if (!isFormValid) {
            toast.error('Please fix the errors in the form.');
            return;
        }

        setSaving(true);
        try {
            const finalAddress = `${form.street}, ${form.barangay}, ${form.city}, ${form.province}`;
            await api.submitSuperadminRequest({
                ...form,
                clinic_address: finalAddress,
                branch_count: Number.parseInt(String(form.branch_count || '1'), 10) || 1,
            });
            toast.success('Requirements submitted. Please wait for global admin response.');
            await loadRequest();
        } catch (error) {
            const message = resolveWorkflowErrorMessage(error, 'Failed to submit requirements.');
            setWorkflowError(message);
            toast.error(message);
        } finally {
            setSaving(false);
        }
    };

    const handleLogout = () => {
        resetStore();
        navigate('/');
    };

    if (loading) {
        return (
            <div className="request-gate-page">
                <div className="request-gate-card">
                    <h2>Loading Request Status</h2>
                    <p>Please wait while we load your approval status.</p>
                </div>
            </div>
        );
    }

    if (isApproved) {
        return (
            <div className="request-gate-page">
                <div className="request-gate-card">
                    <h2>Request Approved</h2>
                    <p>Your super admin request was approved. You can now access the admin dashboard.</p>
                    <div className="request-gate-actions">
                        <button type="button" className="request-gate-primary" onClick={() => navigate('/admin/dashboard')}>
                            Go To Dashboard
                        </button>
                        <button type="button" className="request-gate-secondary" onClick={handleLogout}>
                            Log Out
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="request-gate-page">
            <div className="request-gate-card">
                <div className="request-gate-header">
                    <h2>Super Admin Access Request</h2>
                    <p>Submit your compliance requirements for global admin review.</p>
                </div>

                {workflowError ? (
                    <div className="request-state declined">
                        <h3>Workflow Not Ready</h3>
                        <p>{workflowError}</p>
                        <div className="request-gate-actions">
                            <button type="button" className="request-gate-primary" onClick={loadRequest}>Refresh Status</button>
                            <button type="button" className="request-gate-secondary" onClick={handleLogout}>Log Out</button>
                        </div>
                    </div>
                ) : null}

                {waitingReview ? (
                    <div className="request-state waiting">
                        <h3>Waiting For Request Response</h3>
                        <p>Your request is under review by the system/global admin.</p>
                        {request?.submitted_at ? (
                            <p className="request-meta">Submitted: {new Date(request.submitted_at).toLocaleString()}</p>
                        ) : null}
                        <div className="request-gate-actions">
                            <button type="button" className="request-gate-secondary" onClick={loadRequest}>Refresh Status</button>
                            <button type="button" className="request-gate-secondary" onClick={handleLogout}>Log Out</button>
                        </div>
                    </div>
                ) : null}

                {approvalStatus === 'declined' ? (
                    <div className="request-state declined">
                        <h3>Request Declined</h3>
                        <p>Your previous submission was declined. Update your requirements and submit again.</p>
                        {request?.review_notes ? <p className="request-meta">Reason: {request.review_notes}</p> : null}
                    </div>
                ) : null}

                {canSubmit ? (
                    <form className="request-form" onSubmit={handleSubmit}>
                        <div className="request-grid two-col">
                            <div className="request-field">
                                <label>Clinic Name *</label>
                                <input 
                                    type="text" 
                                    className={errors.clinic_name ? 'error' : ''}
                                    value={form.clinic_name} 
                                    onChange={(e) => handleInputChange('clinic_name', e.target.value)} 
                                />
                                {errors.clinic_name && <span className="error-message">{errors.clinic_name}</span>}
                            </div>
                            <div className="request-field">
                                <label>Branch Count *</label>
                                <input 
                                    type="number" 
                                    min="1" 
                                    className={errors.branch_count ? 'error' : ''}
                                    value={form.branch_count} 
                                    onChange={(e) => handleInputChange('branch_count', e.target.value)} 
                                />
                                {errors.branch_count && <span className="error-message">{errors.branch_count}</span>}
                            </div>
                        </div>

                        <div className="request-section-title">Clinic Address</div>
                        <div className="request-field">
                            <label>Street *</label>
                            <input 
                                type="text" 
                                className={errors.street ? 'error' : ''}
                                value={form.street} 
                                onChange={(e) => handleInputChange('street', e.target.value)} 
                            />
                            {errors.street && <span className="error-message">{errors.street}</span>}
                        </div>

                        <PHAddressSelector 
                            selectedProvince={form.province}
                            selectedCity={form.city}
                            selectedBarangay={form.barangay}
                            onProvinceChange={(val) => handleInputChange('province', val)}
                            onCityChange={(val) => handleInputChange('city', val)}
                            onBarangayChange={(val) => handleInputChange('barangay', val)}
                            errors={errors}
                        />

                        <div className="request-field">
                            <label>Contact Phone *</label>
                            <input 
                                type="text" 
                                className={errors.contact_phone ? 'error' : ''}
                                value={form.contact_phone} 
                                onChange={(e) => handleInputChange('contact_phone', e.target.value)} 
                            />
                            {errors.contact_phone && <span className="error-message">{errors.contact_phone}</span>}
                        </div>

                        <div className="request-field">
                            <label>Business Permit/License Number *</label>
                            <input
                                type="text"
                                className={errors.business_permit_or_license_number ? 'error' : ''}
                                value={form.business_permit_or_license_number}
                                onChange={(e) => handleInputChange('business_permit_or_license_number', e.target.value)}
                            />
                            {errors.business_permit_or_license_number && <span className="error-message">{errors.business_permit_or_license_number}</span>}
                        </div>

                        <div className="request-grid two-col">
                            <div className="request-field">
                                <label>Owner Valid ID Name *</label>
                                <input type="text" value={form.owner_valid_id_name} onChange={(e) => handleInputChange('owner_valid_id_name', e.target.value)} />
                            </div>
                            <div className="request-field">
                                <label>Owner Valid ID Upload *</label>
                                <input type="file" accept="image/*,application/pdf" onChange={(e) => handleFileChange(null, 'owner_valid_id_data', e)} />
                                {form.owner_valid_id_data ? <span className="file-name">Owner ID file ready</span> : null}
                            </div>
                        </div>

                        <div className="request-section-title">DOH License To Operate (LTO)</div>
                        <div className="request-grid two-col">
                            <div className="request-field">
                                <label>LTO Number *</label>
                                <input type="text" value={form.doh_lto_number} onChange={(e) => handleInputChange('doh_lto_number', e.target.value)} />
                            </div>
                            <div className="request-field">
                                <label>LTO Document *</label>
                                <input type="file" accept="image/*,application/pdf" onChange={(e) => handleFileChange('doh_lto_doc_name', 'doh_lto_doc_data', e)} />
                                {form.doh_lto_doc_name ? <span className="file-name">{form.doh_lto_doc_name}</span> : null}
                            </div>
                        </div>

                        <div className="request-section-title">SEC / DTI Registration</div>
                        <div className="request-grid two-col">
                            <div className="request-field">
                                <label>SEC/DTI Number *</label>
                                <input type="text" value={form.sec_dti_number} onChange={(e) => handleInputChange('sec_dti_number', e.target.value)} />
                            </div>
                            <div className="request-field">
                                <label>SEC/DTI Document *</label>
                                <input type="file" accept="image/*,application/pdf" onChange={(e) => handleFileChange('sec_dti_doc_name', 'sec_dti_doc_data', e)} />
                                {form.sec_dti_doc_name ? <span className="file-name">{form.sec_dti_doc_name}</span> : null}
                            </div>
                        </div>

                        <div className="request-section-title">BIR Form 2303</div>
                        <div className="request-grid two-col">
                            <div className="request-field">
                                <label>BIR 2303 Number *</label>
                                <input type="text" value={form.bir_2303_number} onChange={(e) => handleInputChange('bir_2303_number', e.target.value)} />
                            </div>
                            <div className="request-field">
                                <label>BIR 2303 Document *</label>
                                <input type="file" accept="image/*,application/pdf" onChange={(e) => handleFileChange('bir_2303_doc_name', 'bir_2303_doc_data', e)} />
                                {form.bir_2303_doc_name ? <span className="file-name">{form.bir_2303_doc_name}</span> : null}
                            </div>
                        </div>

                        <div className="request-gate-actions">
                            <button type="submit" className="request-gate-primary" disabled={saving}>
                                {saving ? 'Submitting...' : 'Submit Requirements'}
                            </button>
                            <button type="button" className="request-gate-secondary" onClick={handleLogout}>Log Out</button>
                        </div>
                    </form>
                ) : null}
            </div>
        </div>
    );
}

export default SuperAdminRequestGate;
