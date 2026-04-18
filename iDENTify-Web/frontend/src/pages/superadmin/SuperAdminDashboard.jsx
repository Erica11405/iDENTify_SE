import React, { useEffect, useMemo, useState } from 'react';
import api from '../../api/apiClient';
import WeeklyBarChart from '../../components/WeeklyBarChart';
import ServicePopularityChartCard from '../../components/ServicePopularityChartCard';
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

function buildSummaryFromClinics(clinics) {
    const rows = Array.isArray(clinics) ? clinics : [];

    return {
        totals: {
            total_clinics: rows.length,
            active_clinics: rows.filter((item) => Number(item?.is_active || 0) === 1 || item?.is_active === true).length,
        },
        branches_per_clinic: rows
            .map((item) => ({
                id: item.id,
                name: item.name,
                total_branches: Number(item.total_branches || 0),
                active_branches: Number(item.active_branches || 0),
            }))
            .sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''))),
    };
}

function normalizeBoolean(value) {
    if (value === true || value === false) return value;
    if (value === 1 || value === 0) return Boolean(value);
    const normalized = String(value || '').trim().toLowerCase();
    return normalized === '1' || normalized === 'true';
}

function SuperAdminDashboard() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [users, setUsers] = useState([]);
    const [dentists, setDentists] = useState([]);
    const [appointments, setAppointments] = useState([]);
    const [clinics, setClinics] = useState([]);
    const [clinicSummary, setClinicSummary] = useState({ totals: { total_clinics: 0, active_clinics: 0 }, branches_per_clinic: [] });
    const [clinicSummaryNotice, setClinicSummaryNotice] = useState('');
    const [clinicBranchesByClinic, setClinicBranchesByClinic] = useState({});
    const [branchesLoading, setBranchesLoading] = useState(false);

    const [clinicForm, setClinicForm] = useState({ name: '', code: '' });
    const [branchForm, setBranchForm] = useState({ clinicId: '', name: '', code: '', address: '' });
    const [creatingClinic, setCreatingClinic] = useState(false);
    const [creatingBranch, setCreatingBranch] = useState(false);
    const [clinicActionNotice, setClinicActionNotice] = useState({ type: '', message: '' });
    const [selectedClinicId, setSelectedClinicId] = useState('');

    useEffect(() => {
        const loadDashboardData = async () => {
            setLoading(true);
            setError('');
            setClinicSummaryNotice('');

            try {
                const [
                    usersResult,
                    dentistsResult,
                    appointmentsResult,
                    clinicsResult,
                    clinicSummaryResult,
                ] = await Promise.allSettled([
                    api.getAdminUsers({ role: 'all', archived: 'all' }),
                    api.getDentists(),
                    api.getAppointments(),
                    api.getClinics({ includeInactive: true }),
                    api.getClinicSummary(),
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

                const clinicsData = clinicsResult.status === 'fulfilled' && Array.isArray(clinicsResult.value)
                    ? clinicsResult.value
                    : [];
                setClinics(clinicsData);

                if (clinicSummaryResult.status === 'fulfilled' && clinicSummaryResult.value) {
                    setClinicSummary(clinicSummaryResult.value);
                } else {
                    setClinicSummary(buildSummaryFromClinics(clinicsData));
                    if (clinicSummaryResult.status === 'rejected') {
                        const summaryError = clinicSummaryResult.reason;
                        if (summaryError?.status === 403) {
                            setClinicSummaryNotice('Clinic summary is showing fallback values. Global admin access is required for full summary endpoint data.');
                        } else {
                            setClinicSummaryNotice('Clinic summary endpoint is currently unavailable. Showing fallback values from clinic list.');
                        }
                    }
                }
            } catch (err) {
                setError(err?.message || 'Failed to load dashboard data.');
            } finally {
                setLoading(false);
            }
        };

        loadDashboardData();
    }, []);

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

    const clinicBranchChartData = useMemo(() => {
        const rows = Array.isArray(clinicSummary?.branches_per_clinic) ? clinicSummary.branches_per_clinic : [];

        return {
            labels: rows.map((item) => String(item.name || `Clinic #${item.id || ''}`)),
            appointments: rows.map((item) => Number(item.total_branches || 0)),
            appointmentsLabel: 'Branches',
            singleSeries: true,
            xTickFontSize: 11,
            yTickFontSize: 12,
            xTickMaxRotation: 45,
            xTickMinRotation: 0,
        };
    }, [clinicSummary]);

    const clinicMetrics = useMemo(() => {
        const totals = clinicSummary?.totals || {};
        const rows = Array.isArray(clinicSummary?.branches_per_clinic) ? clinicSummary.branches_per_clinic : [];

        const totalBranches = rows.reduce((sum, item) => sum + Number(item.total_branches || 0), 0);
        const activeBranches = rows.reduce((sum, item) => sum + Number(item.active_branches || 0), 0);

        return {
            totalClinics: Number(totals.total_clinics || 0),
            activeClinics: Number(totals.active_clinics || 0),
            totalBranches,
            activeBranches,
        };
    }, [clinicSummary]);

    const selectedClinicBranches = selectedClinicId
        ? (clinicBranchesByClinic[selectedClinicId] || [])
        : [];

    const selectedClinicName = clinics.find((item) => String(item.id) === String(selectedClinicId))?.name || 'Selected Clinic';

    const handleCreateClinic = async (event) => {
        event.preventDefault();
        const name = String(clinicForm.name || '').trim();
        const code = String(clinicForm.code || '').trim();

        if (!name) {
            setClinicActionNotice({ type: 'error', message: 'Clinic name is required.' });
            return;
        }

        setCreatingClinic(true);
        setClinicActionNotice({ type: '', message: '' });

        try {
            const created = await api.createClinic({ name, code: code || undefined });
            const normalizedCreated = {
                ...created,
                is_active: normalizeBoolean(created?.is_active),
                total_branches: Number(created?.total_branches || 0),
                active_branches: Number(created?.active_branches || 0),
            };

            setClinics((prev) => {
                const next = [...prev, normalizedCreated];
                next.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
                return next;
            });

            setClinicSummary((prev) => {
                const previousRows = Array.isArray(prev?.branches_per_clinic) ? prev.branches_per_clinic : [];
                const nextRows = [...previousRows, {
                    id: normalizedCreated.id,
                    name: normalizedCreated.name,
                    total_branches: 0,
                    active_branches: 0,
                }].sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));

                return {
                    totals: {
                        total_clinics: Number(prev?.totals?.total_clinics || 0) + 1,
                        active_clinics: Number(prev?.totals?.active_clinics || 0) + 1,
                    },
                    branches_per_clinic: nextRows,
                };
            });

            setClinicForm({ name: '', code: '' });
            setSelectedClinicId(String(normalizedCreated.id));
            setBranchForm((prev) => ({ ...prev, clinicId: String(normalizedCreated.id) }));
            setClinicActionNotice({ type: 'success', message: 'Clinic created successfully.' });
        } catch (err) {
            setClinicActionNotice({ type: 'error', message: err?.message || 'Failed to create clinic.' });
        } finally {
            setCreatingClinic(false);
        }
    };

    const handleCreateBranch = async (event) => {
        event.preventDefault();
        const clinicId = String(branchForm.clinicId || '').trim();
        const name = String(branchForm.name || '').trim();
        const code = String(branchForm.code || '').trim();
        const address = String(branchForm.address || '').trim();

        if (!clinicId) {
            setClinicActionNotice({ type: 'error', message: 'Select a clinic before adding a branch.' });
            return;
        }

        if (!name) {
            setClinicActionNotice({ type: 'error', message: 'Branch name is required.' });
            return;
        }

        setCreatingBranch(true);
        setClinicActionNotice({ type: '', message: '' });

        try {
            const created = await api.createClinicBranch(clinicId, {
                name,
                code: code || undefined,
                address: address || undefined,
            });

            const targetClinicId = String(clinicId);

            setClinicBranchesByClinic((prev) => {
                const current = prev[targetClinicId] || [];
                return {
                    ...prev,
                    [targetClinicId]: [...current, created],
                };
            });

            setClinics((prev) => prev.map((item) => {
                if (String(item.id) !== targetClinicId) return item;
                return {
                    ...item,
                    total_branches: Number(item.total_branches || 0) + 1,
                    active_branches: Number(item.active_branches || 0) + (normalizeBoolean(created?.is_active) ? 1 : 0),
                };
            }));

            setClinicSummary((prev) => ({
                ...prev,
                branches_per_clinic: (Array.isArray(prev?.branches_per_clinic) ? prev.branches_per_clinic : []).map((row) => {
                    if (String(row.id) !== targetClinicId) return row;
                    return {
                        ...row,
                        total_branches: Number(row.total_branches || 0) + 1,
                        active_branches: Number(row.active_branches || 0) + (normalizeBoolean(created?.is_active) ? 1 : 0),
                    };
                }),
            }));

            setSelectedClinicId(targetClinicId);
            setBranchForm((prev) => ({
                ...prev,
                clinicId: targetClinicId,
                name: '',
                code: '',
                address: '',
            }));
            setClinicActionNotice({ type: 'success', message: 'Branch created successfully.' });
        } catch (err) {
            setClinicActionNotice({ type: 'error', message: err?.message || 'Failed to create branch.' });
        } finally {
            setCreatingBranch(false);
        }
    };

    return (
        <section className="settings-dashboard-container">
            <div className="settings-header-section">
                <h2>Super Admin Dashboard</h2>
                <p>System-level overview for users, clinics, and booking operations.</p>
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

                    <div className="superadmin-stats-grid dashboard-top-spacing-sm">
                        <StatCard label="Clinics" value={clinicMetrics.totalClinics} />
                        <StatCard label="Active Clinics" value={clinicMetrics.activeClinics} />
                        <StatCard label="Branches" value={clinicMetrics.totalBranches} />
                        <StatCard label="Active Branches" value={clinicMetrics.activeBranches} />
                    </div>

                    {clinicSummaryNotice ? (
                        <p className="dashboard-notice">{clinicSummaryNotice}</p>
                    ) : null}

                    <div className="settings-form-card dashboard-top-spacing-md">
                        <h3>Appointments Per Dentist</h3>
                        <p className="dashboard-muted-text">
                            Current week: {chartData.rangeLabel}
                        </p>
                        <WeeklyBarChart chartData={chartData} />
                    </div>

                    <div className="settings-form-card dashboard-top-spacing-md">
                        <h3>Branches Per Clinic</h3>
                        <p className="dashboard-muted-text">
                            Clinic footprint based on current branch assignments.
                        </p>
                        <WeeklyBarChart chartData={clinicBranchChartData} />
                    </div>

                    <div className="settings-form-card dashboard-top-spacing-md dashboard-management-card">
                        <h3>Create Clinic</h3>
                        <p className="dashboard-muted-text">Add a clinic to start organizing branches and staff ownership.</p>
                        <form onSubmit={handleCreateClinic}>
                            <div className="form-row">
                                <div className="form-group flex-2">
                                    <label htmlFor="clinic-name">Clinic Name</label>
                                    <input
                                        id="clinic-name"
                                        type="text"
                                        value={clinicForm.name}
                                        onChange={(event) => setClinicForm((prev) => ({ ...prev, name: event.target.value }))}
                                        placeholder="Enter clinic name"
                                    />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="clinic-code">Clinic Code (Optional)</label>
                                    <input
                                        id="clinic-code"
                                        type="text"
                                        value={clinicForm.code}
                                        onChange={(event) => setClinicForm((prev) => ({ ...prev, code: event.target.value }))}
                                        placeholder="e.g. CLINIC-A"
                                    />
                                </div>
                            </div>

                            <div className="settings-inline-actions">
                                <button className="btn-primary-action" type="submit" disabled={creatingClinic}>
                                    {creatingClinic ? 'Creating Clinic...' : 'Create Clinic'}
                                </button>
                            </div>
                        </form>
                    </div>

                    <div className="settings-form-card dashboard-top-spacing-md dashboard-management-card">
                        <h3>Create Branch</h3>
                        <p className="dashboard-muted-text">Assign each branch to a clinic for cleaner tenant-level reporting.</p>
                        <form onSubmit={handleCreateBranch}>
                            <div className="form-row">
                                <div className="form-group">
                                    <label htmlFor="branch-clinic">Clinic</label>
                                    <select
                                        id="branch-clinic"
                                        value={branchForm.clinicId}
                                        onChange={(event) => {
                                            const value = event.target.value;
                                            setBranchForm((prev) => ({ ...prev, clinicId: value }));
                                            setSelectedClinicId(value);
                                        }}
                                    >
                                        {clinics.length === 0 ? <option value="">No clinics available</option> : null}
                                        {clinics.map((clinic) => (
                                            <option key={clinic.id} value={String(clinic.id)}>{clinic.name}</option>
                                        ))}
                                    </select>
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
                                    <label htmlFor="branch-address">Address (Optional)</label>
                                    <input
                                        id="branch-address"
                                        type="text"
                                        value={branchForm.address}
                                        onChange={(event) => setBranchForm((prev) => ({ ...prev, address: event.target.value }))}
                                        placeholder="Branch address"
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
                        <h3>Clinic Directory</h3>
                        <div className="table-container">
                            <table className="settings-table">
                                <thead>
                                    <tr>
                                        <th>Clinic</th>
                                        <th>Code</th>
                                        <th>Total Branches</th>
                                        <th>Active Branches</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {clinics.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="empty-state">No clinics found.</td>
                                        </tr>
                                    ) : (
                                        clinics.map((clinic) => {
                                            const active = normalizeBoolean(clinic.is_active);
                                            return (
                                                <tr
                                                    key={clinic.id}
                                                    className={`dashboard-clickable-row ${String(clinic.id) === String(selectedClinicId) ? 'row-highlight' : ''}`}
                                                    onClick={() => setSelectedClinicId(String(clinic.id))}
                                                >
                                                    <td className="font-semibold">{clinic.name}</td>
                                                    <td>{clinic.code || '-'}</td>
                                                    <td>{Number(clinic.total_branches || 0)}</td>
                                                    <td>{Number(clinic.active_branches || 0)}</td>
                                                    <td>
                                                        <span className={`status-pill ${active ? 'active' : 'archived'}`}>
                                                            {active ? 'Active' : 'Inactive'}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="settings-form-card dashboard-top-spacing-md">
                        <h3>{selectedClinicName} Branches</h3>
                        <p className="dashboard-muted-text">Showing branches linked to the selected clinic from the directory table.</p>
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
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {selectedClinicBranches.length === 0 ? (
                                            <tr>
                                                <td colSpan={4} className="empty-state">No branches found for this clinic.</td>
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
                                                                {active ? 'Active' : 'Inactive'}
                                                            </span>
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
