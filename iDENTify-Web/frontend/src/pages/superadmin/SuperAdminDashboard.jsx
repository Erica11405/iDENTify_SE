import React, { useEffect, useMemo, useState } from 'react';
import api from '../../api/apiClient';
import WeeklyBarChart from '../../components/WeeklyBarChart';
import ServicePopularityChartCard from '../../components/ServicePopularityChartCard';
import ConfirmationModal from '../../components/ConfirmationModal';
import useAppStore from '../../store/useAppStore';
import '../../styles/pages/dentist/DentistSettings.css';

function isArchived(user) {
    return Number(user?.is_archived || 0) === 1;
}

function normalizeStatus(value) {
    return String(value || '').trim().toLowerCase();
}

function parseDateTime(value) {
    if (!value) return null;
    const parsed = new Date(String(value).replace(' ', 'T'));
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed;
}

function getCurrentWeekRange() {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const mondayOffset = (now.getDay() + 6) % 7;
    const start = new Date(now);
    start.setDate(now.getDate() - mondayOffset);
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);

    return { start, end };
}

function formatRangeLabel(start, end) {
    return `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`;
}

function normalizeBoolean(value) {
    if (value === true || value === false) return value;
    if (value === 1 || value === 0) return Boolean(value);
    const normalized = String(value || '').trim().toLowerCase();
    return normalized === '1' || normalized === 'true';
}

function resolveDashboardMessage(error, fallback = 'Failed to load dashboard data.') {
    const code = String(error?.body?.code || '').trim().toUpperCase();

    if (code === 'SUPERADMIN_NOT_APPROVED') {
        return 'Your clinic admin access is not approved yet. Complete your request and wait for approval.';
    }

    if (code === 'TENANT_ASSIGNMENT_REQUIRED') {
        return 'Your account needs a clinic or branch assignment before reports can be loaded.';
    }

    if (error?.status === 403 && error?.message) {
        return error.message;
    }

    return error?.message || fallback;
}

function SuperAdminDashboard() {
    const user = useAppStore((state) => state.user);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [users, setUsers] = useState([]);
    const [dentists, setDentists] = useState([]);
    const [appointments, setAppointments] = useState([]);
    const [clinics, setClinics] = useState([]);
    const [clinicBranchesByClinic, setClinicBranchesByClinic] = useState({});
    const [branchesLoading, setBranchesLoading] = useState(false);

    const [branchForm, setBranchForm] = useState({ clinicId: '', name: '', code: '', street: '', barangay: '', city: '', province: '' });
    const [creatingBranch, setCreatingBranch] = useState(false);
    const [clinicActionNotice, setClinicActionNotice] = useState({ type: '', message: '' });
    const [selectedClinicId, setSelectedClinicId] = useState('');

    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [confirmModalConfig, setConfirmModalConfig] = useState({ message: '', onConfirm: () => {} });

    const openConfirm = (message, onConfirm) => {
        setConfirmModalConfig({ message, onConfirm });
        setShowConfirmModal(true);
    };

    useEffect(() => {
        const loadDashboardData = async () => {
            setLoading(true);
            setError('');

            try {
                const [
                    usersResult,
                    dentistsResult,
                    appointmentsResult,
                    clinicsResult,
                ] = await Promise.allSettled([
                    api.getAdminUsers({ role: 'all', archived: 'all' }),
                    api.getDentists(),
                    api.getAppointments(),
                    api.getClinics({ includeInactive: true }),
                ]);

                if (usersResult.status === 'fulfilled') {
                    setUsers(Array.isArray(usersResult.value) ? usersResult.value : []);
                } else {
                    throw usersResult.reason;
                }

                if (dentistsResult.status === 'fulfilled') {
                    setDentists((dentistsResult.value || []).filter((item) => String(item.specialization || '').trim().toLowerCase() !== 'dental aide'));
                } else {
                    throw dentistsResult.reason;
                }

                if (appointmentsResult.status === 'fulfilled') {
                    setAppointments(Array.isArray(appointmentsResult.value) ? appointmentsResult.value : []);
                } else {
                    throw appointmentsResult.reason;
                }

                let clinicsData = clinicsResult.status === 'fulfilled' && Array.isArray(clinicsResult.value)
                    ? clinicsResult.value
                    : [];
                
                if (user?.clinic_id) {
                    clinicsData = clinicsData.filter(c => String(c.id) === String(user.clinic_id));
                }

                setClinics(clinicsData);
            } catch (err) {
                setError(resolveDashboardMessage(err, 'Failed to load dashboard data.'));
            } finally {
                setLoading(false);
            }
        };

        loadDashboardData();
    }, [user?.clinic_id]);

    useEffect(() => {
        if (clinics.length === 0) {
            setSelectedClinicId('');
            setBranchForm((prev) => ({ ...prev, clinicId: '' }));
            return;
        }

        const hasSelected = clinics.some((item) => String(item.id) === String(selectedClinicId));
        const fallbackId = String(clinics[0].id);

        if (!hasSelected) {
            setSelectedClinicId(fallbackId);
        }

        const hasBranchClinic = clinics.some((item) => String(item.id) === String(branchForm.clinicId));
        if (!hasBranchClinic) {
            setBranchForm((prev) => ({ ...prev, clinicId: fallbackId }));
        }
    }, [clinics, selectedClinicId, branchForm.clinicId]);

    useEffect(() => {
        if (!selectedClinicId) return;
        if (Object.prototype.hasOwnProperty.call(clinicBranchesByClinic, selectedClinicId)) return;

        let cancelled = false;

        const fetchBranches = async () => {
            setBranchesLoading(true);
            try {
                const rows = await api.getClinicBranches(selectedClinicId, { includeInactive: true });
                if (!cancelled) {
                    setClinicBranchesByClinic((prev) => ({
                        ...prev,
                        [selectedClinicId]: Array.isArray(rows) ? rows : [],
                    }));
                }
            } catch {
                if (!cancelled) {
                    setClinicBranchesByClinic((prev) => ({
                        ...prev,
                        [selectedClinicId]: [],
                    }));
                }
            } finally {
                if (!cancelled) {
                    setBranchesLoading(false);
                }
            }
        };

        fetchBranches();

        return () => {
            cancelled = true;
        };
    }, [selectedClinicId, clinicBranchesByClinic]);

    const [earningsData, setEarningsData] = useState(null);
    const [earningsLoading, setEarningsLoading] = useState(false);

    useEffect(() => {
        const loadEarnings = async () => {
            setEarningsLoading(true);
            try {
                const data = await api.getEarningsReport();
                setEarningsData(data);
            } catch (err) {
                console.error("Failed to load earnings:", err);
            } finally {
                setEarningsLoading(false);
            }
        };
        loadEarnings();
    }, []);

    const metrics = useMemo(() => {
        const totalDentists = users.filter((u) => normalizeStatus(u.role) === 'dentist').length;
        const totalAides = users.filter((u) => normalizeStatus(u.role) === 'aide').length;
        const archivedAccounts = users.filter((u) => isArchived(u)).length;

        return {
            totalUsers: users.length,
            totalDentists,
            totalAides,
            archivedAccounts,
        };
    }, [users]);

    const chartData = useMemo(() => {
        const { start, end } = getCurrentWeekRange();
        const ignoredStatuses = new Set(['cancelled', 'no-show', 'missed', 'declined']);

        const labelMap = new Map();
        dentists.forEach((dentist) => {
            labelMap.set(String(dentist.id), dentist.name || `${dentist.first_name || ''} ${dentist.last_name || ''}`.trim() || `Dentist #${dentist.id}`);
        });

        const counter = new Map();
        appointments.forEach((appointment) => {
            const dentistId = appointment?.dentist_id;
            if (!dentistId) return;

            const parsedDate = parseDateTime(appointment?.appointment_datetime);
            if (!parsedDate) return;
            if (parsedDate < start || parsedDate > end) return;

            const status = normalizeStatus(appointment?.status);
            if (ignoredStatuses.has(status)) return;

            const key = String(dentistId);
            counter.set(key, (counter.get(key) || 0) + 1);

            if (!labelMap.has(key)) {
                labelMap.set(key, appointment.dentist_name || `Dentist #${key}`);
            }
        });

        const sortedEntries = [...labelMap.entries()]
            .map(([id, name]) => ({
                id,
                name,
                count: counter.get(id) || 0,
            }))
            .sort((a, b) => a.name.localeCompare(b.name));

        return {
            labels: sortedEntries.map((item) => item.name),
            appointments: sortedEntries.map((item) => item.count),
            appointmentsLabel: 'Appointments',
            singleSeries: true,
            rangeLabel: formatRangeLabel(start, end),
        };
    }, [dentists, appointments]);

    const selectedClinicBranches = selectedClinicId
        ? (clinicBranchesByClinic[selectedClinicId] || [])
        : [];

    const selectedClinicName = clinics.find((item) => String(item.id) === String(selectedClinicId))?.name || 'Selected Clinic';

    const handleCreateBranch = async (event) => {
        event.preventDefault();
        const clinicId = String(branchForm.clinicId || '').trim();
        const name = String(branchForm.name || '').trim();
        const code = String(branchForm.code || '').trim();
        const street = String(branchForm.street || '').trim();
        const barangay = String(branchForm.barangay || '').trim();
        const city = String(branchForm.city || '').trim();
        const province = String(branchForm.province || '').trim();

        if (!clinicId) {
            setClinicActionNotice({ type: 'error', message: 'Select a clinic before adding a branch.' });
            return;
        }

        if (!name) {
            setClinicActionNotice({ type: 'error', message: 'Branch name is required.' });
            return;
        }

        if (!street || !barangay || !city || !province) {
            setClinicActionNotice({ type: 'error', message: 'Branch complete address is required.' });
            return;
        }

        setCreatingBranch(true);
        setClinicActionNotice({ type: '', message: '' });

        try {
            const fullAddress = [
                street,
                barangay,
                city,
                province
            ].map(s => String(s || '').trim()).filter(Boolean).join(', ');

            const created = await api.createClinicBranch(clinicId, {
                name,
                code: code || undefined,
                address: fullAddress,
            });

            const targetClinicId = String(clinicId);

            setClinicBranchesByClinic((prev) => {
                const current = prev[targetClinicId] || [];
                return {
                    ...prev,
                    [targetClinicId]: [...current, created],
                };
            });

            setSelectedClinicId(targetClinicId);
            setBranchForm((prev) => ({
                ...prev,
                clinicId: targetClinicId,
                name: '',
                code: '',
                street: '',
                barangay: '',
                city: '',
                province: '',
            }));
            setClinicActionNotice({ type: 'success', message: 'Branch created successfully.' });
        } catch (err) {
            setClinicActionNotice({ type: 'error', message: err?.message || 'Failed to create branch.' });
        } finally {
            setCreatingBranch(false);
        }
    };

    const executeArchiveBranch = async (branch) => {
        const clinicId = selectedClinicId;
        try {
            await api.archiveClinicBranch(clinicId, branch.id);
            setClinicActionNotice({ type: 'success', message: 'Branch archived.' });
            setClinicBranchesByClinic((prev) => {
                const current = prev[clinicId] || [];
                return {
                    ...prev,
                    [clinicId]: current.map(b => b.id === branch.id ? { ...b, is_active: 0 } : b),
                };
            });
        } catch (err) {
            setClinicActionNotice({ type: 'error', message: err?.message || 'Failed to archive branch.' });
        } finally {
            setShowConfirmModal(false);
        }
    };

    const handleArchiveBranch = (branch) => {
        const clinicId = selectedClinicId;
        if (!clinicId || !branch?.id) return;
        openConfirm(`Archive branch "${branch.name}"?`, () => executeArchiveBranch(branch));
    };

    const handleRestoreBranch = async (branch) => {
        const clinicId = selectedClinicId;
        if (!clinicId || !branch?.id) return;

        try {
            await api.restoreClinicBranch(clinicId, branch.id);
            setClinicActionNotice({ type: 'success', message: 'Branch restored.' });
            setClinicBranchesByClinic((prev) => {
                const current = prev[clinicId] || [];
                return {
                    ...prev,
                    [clinicId]: current.map(b => b.id === branch.id ? { ...b, is_active: 1 } : b),
                };
            });
        } catch (err) {
            setClinicActionNotice({ type: 'error', message: err?.message || 'Failed to restore branch.' });
        }
    };

    return (
        <section className="settings-dashboard-container">
            <div className="settings-header-section" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h2>Clinic Admin Dashboard</h2>
                    <p>System-level overview for users, clinics, and booking operations.</p>
                </div>
                <button 
                    className="add-dentist-btn" 
                    onClick={() => {
                        const element = document.getElementById('create-branch-section');
                        if (element) element.scrollIntoView({ behavior: 'smooth' });
                    }}
                    style={{ backgroundColor: '#2563eb' }}
                >
                    + Add Branch
                </button>
            </div>

            {loading ? <p className="dashboard-inline-loading">Loading dashboard...</p> : null}
            {!loading && error ? <p className="dashboard-error-text">{error}</p> : null}

            {!loading && !error ? (
                <>
                    <div className="superadmin-stats-grid">
                        <StatCard label="Total Users" value={metrics.totalUsers} />
                        <StatCard label="Total Dentists" value={metrics.totalDentists} />
                        <StatCard label="Total Aides" value={metrics.totalAides} />
                        <StatCard label="Archived Accounts" value={metrics.archivedAccounts} />
                    </div>

                    <div className="settings-form-card dashboard-top-spacing-md">
                        <h3>Earnings Overview</h3>
                        <p className="dashboard-muted-text">Daily earnings and breakdown by dentist.</p>
                        {earningsLoading ? <p>Loading earnings...</p> : (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '15px' }}>
                                <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                    <h4 style={{ margin: '0 0 10px 0', fontSize: '1rem' }}>Total Earnings</h4>
                                    <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#10b981', margin: 0 }}>
                                        ₱{(earningsData?.totalEarnings || 0).toLocaleString()}
                                    </p>
                                    <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '5px' }}>
                                        For the period: {earningsData?.startDate} to {earningsData?.endDate}
                                    </p>
                                </div>
                                <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                    <h4 style={{ margin: '0 0 10px 0', fontSize: '1rem' }}>Branch Breakdown</h4>
                                    <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
                                        {(earningsData?.branchBreakdown || []).map((b, i) => (
                                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #edf2f7' }}>
                                                <span style={{ fontSize: '0.9rem' }}>{b.branch}</span>
                                                <span style={{ fontSize: '0.9rem', fontWeight: '600' }}>₱{b.earnings.toLocaleString()}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="settings-form-card dashboard-top-spacing-md">
                        <h3>Appointments Per Dentist</h3>
                        <p className="dashboard-muted-text">
                            Current week: {chartData.rangeLabel}
                        </p>
                        <WeeklyBarChart chartData={chartData} />
                    </div>

                    <div id="create-branch-section" className="settings-form-card dashboard-top-spacing-md dashboard-management-card">
                        <h3>Create Branch</h3>
                        <p className="dashboard-muted-text">Assign each branch to a clinic for cleaner tenant-level reporting.</p>
                        <form onSubmit={handleCreateBranch}>
                            <div className="form-row">
                                <div className="form-group">
                                    <label htmlFor="branch-clinic">Clinic</label>
                                    {user?.clinic_id ? (
                                        <input
                                            id="branch-clinic"
                                            type="text"
                                            value={clinics.find(c => String(c.id) === String(user.clinic_id))?.name || ''}
                                            readOnly
                                            disabled
                                        />
                                    ) : (
                                        <select
                                            id="branch-clinic"
                                            value={branchForm.clinicId}
                                            onChange={(event) => {
                                                const value = event.target.value;
                                                setBranchForm((prev) => ({ ...prev, clinicId: value }));
                                                setSelectedClinicId(value);
                                            }}
                                            disabled={clinics.length <= 1}
                                        >
                                            {clinics.length === 0 ? <option value="">No clinics available</option> : null}
                                            {clinics.map((clinic) => (
                                                <option key={clinic.id} value={String(clinic.id)}>{clinic.name}</option>
                                            ))}
                                        </select>
                                    )}
                                </div>

                                <div className="form-group flex-2">
                                    <label htmlFor="branch-name">Branch Name</label>
                                    <input
                                        id="branch-name"
                                        type="text"
                                        value={branchForm.name}
                                        onChange={(event) => setBranchForm((prev) => ({ ...prev, name: event.target.value }))}
                                        placeholder="Enter branch name"
                                    />
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label htmlFor="branch-code">Branch Code (Optional)</label>
                                    <input
                                        id="branch-code"
                                        type="text"
                                        value={branchForm.code}
                                        onChange={(event) => setBranchForm((prev) => ({ ...prev, code: event.target.value }))}
                                        placeholder="e.g. BR-A1"
                                    />
                                </div>
                                <div className="form-group flex-2">
                                    <label htmlFor="branch-street">Street *</label>
                                    <input
                                        id="branch-street"
                                        type="text"
                                        value={branchForm.street}
                                        onChange={(event) => setBranchForm((prev) => ({ ...prev, street: event.target.value }))}
                                        placeholder="Street"
                                    />
                                </div>
                                <div className="form-group flex-2">
                                    <label htmlFor="branch-barangay">Barangay *</label>
                                    <input
                                        id="branch-barangay"
                                        type="text"
                                        value={branchForm.barangay}
                                        onChange={(event) => setBranchForm((prev) => ({ ...prev, barangay: event.target.value }))}
                                        placeholder="Barangay"
                                    />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group flex-2">
                                    <label htmlFor="branch-city">City *</label>
                                    <input
                                        id="branch-city"
                                        type="text"
                                        value={branchForm.city}
                                        onChange={(event) => setBranchForm((prev) => ({ ...prev, city: event.target.value }))}
                                        placeholder="City"
                                    />
                                </div>
                                <div className="form-group flex-2">
                                    <label htmlFor="branch-province">Province *</label>
                                    <input
                                        id="branch-province"
                                        type="text"
                                        value={branchForm.province}
                                        onChange={(event) => setBranchForm((prev) => ({ ...prev, province: event.target.value }))}
                                        placeholder="Province"
                                    />
                                </div>
                            </div>

                            <div className="settings-inline-actions">
                                <button className="btn-primary-action" type="submit" disabled={creatingBranch || clinics.length === 0}>
                                    {creatingBranch ? 'Creating Branch...' : 'Create Branch'}
                                </button>
                            </div>

                            {clinics.length === 0 ? (
                                <p className="dashboard-form-helper">Create at least one clinic before adding a branch.</p>
                            ) : null}
                        </form>
                    </div>

                    {clinicActionNotice.message ? (
                        <p className={`dashboard-action-notice ${clinicActionNotice.type === 'error' ? 'error' : 'success'}`}>
                            {clinicActionNotice.message}
                        </p>
                    ) : null}

                    <div className="settings-form-card dashboard-top-spacing-md">
                        <h3>{selectedClinicName} Branches</h3>
                        <p className="dashboard-muted-text">Showing branches linked to your clinic.</p>
                        {branchesLoading ? <p className="dashboard-inline-loading">Loading branches...</p> : null}
                        {!branchesLoading ? (
                            <div className="table-container">
                                <table className="settings-table">
                                    <thead>
                                        <tr>
                                            <th>Branch</th>
                                            <th>Code</th>
                                            <th>Address</th>
                                            <th>Status</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {selectedClinicBranches.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="empty-state">No branches found for this clinic.</td>
                                            </tr>
                                        ) : (
                                            selectedClinicBranches.map((branch) => {
                                                const active = normalizeBoolean(branch.is_active);
                                                return (
                                                    <tr key={branch.id}>
                                                        <td className="font-semibold">{branch.name}</td>
                                                        <td>{branch.code || '-'}</td>
                                                        <td>{branch.address || '-'}</td>
                                                        <td>
                                                            <span className={`status-pill ${active ? 'active' : 'archived'}`}>
                                                                {active ? 'Active' : 'Archived'}
                                                            </span>
                                                        </td>
                                                        <td>
                                                            <div className="action-buttons">
                                                                {active ? (
                                                                    <button 
                                                                        type="button" 
                                                                        className="btn-delete"
                                                                        onClick={() => handleArchiveBranch(branch)}
                                                                    >
                                                                        Archive
                                                                    </button>
                                                                ) : (
                                                                    <button 
                                                                        type="button" 
                                                                        className="btn-edit"
                                                                        onClick={() => handleRestoreBranch(branch)}
                                                                    >
                                                                        Restore
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        ) : null}
                    </div>

                    <div className="settings-form-card dashboard-top-spacing-md">
                        <ServicePopularityChartCard title="Most Booked Services" />
                    </div>
                </>
            ) : null}

            <ConfirmationModal
                isOpen={showConfirmModal}
                onClose={() => setShowConfirmModal(false)}
                onConfirm={confirmModalConfig.onConfirm}
                message={confirmModalConfig.message}
            />
        </section>
    );
}

function StatCard({ label, value }) {
    return (
        <article className="superadmin-stat-card">
            <p className="superadmin-stat-card-label">{label}</p>
            <p className="superadmin-stat-card-value">{value}</p>
        </article>
    );
}

export default SuperAdminDashboard;
