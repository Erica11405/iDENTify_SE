import React, { useEffect, useMemo, useState } from 'react';
import api from '../../api/apiClient';
import WeeklyBarChart from '../../components/WeeklyBarChart';
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

function resolveDashboardMessage(error, fallback = 'Failed to load dashboard data.') {
    const code = String(error?.body?.code || '').trim().toUpperCase();

    if (code === 'SUPERADMIN_NOT_APPROVED') {
        return 'Your admin access is not approved yet. Complete your request and wait for approval.';
    }

    if (code === 'TENANT_ASSIGNMENT_REQUIRED') {
        return 'Your account needs a clinic or branch assignment before reports can be loaded.';
    }

    if (error?.status === 403 && error?.message) {
        return error.message;
    }

    return error?.message || fallback;
}

function SystemAdminDashboard() {
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
                            setClinicSummaryNotice(resolveDashboardMessage(summaryError, 'Clinic summary is showing fallback values because your current account cannot access summary endpoint data.'));
                        } else {
                            setClinicSummaryNotice('Clinic summary endpoint is currently unavailable. Showing fallback values from clinic list.');
                        }
                    }
                }
            } catch (err) {
                setError(resolveDashboardMessage(err, 'Failed to load dashboard data.'));
            } finally {
                setLoading(false);
            }
        };

        loadDashboardData();
    }, []);

    useEffect(() => {
        if (clinics.length === 0) {
            setSelectedClinicId('');
            return;
        }

        const hasSelected = clinics.some((item) => String(item.id) === String(selectedClinicId));
        const fallbackId = String(clinics[0].id);

        if (!hasSelected) {
            setSelectedClinicId(fallbackId);
        }
    }, [clinics, selectedClinicId]);

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

    return (
        <section className="settings-dashboard-container">
            <div className="settings-header-section">
                <h2>System Admin Dashboard</h2>
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

export default SystemAdminDashboard;
