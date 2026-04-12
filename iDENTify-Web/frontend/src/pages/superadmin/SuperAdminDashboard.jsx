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

function SuperAdminDashboard() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [users, setUsers] = useState([]);
    const [dentists, setDentists] = useState([]);
    const [appointments, setAppointments] = useState([]);

    useEffect(() => {
        const loadDashboardData = async () => {
            setLoading(true);
            setError('');

            try {
                const [usersData, dentistsData, appointmentsData] = await Promise.all([
                    api.getAdminUsers({ role: 'all', archived: 'all' }),
                    api.getDentists(),
                    api.getAppointments(),
                ]);

                setUsers(usersData || []);
                setDentists((dentistsData || []).filter((item) => String(item.specialization || '').trim().toLowerCase() !== 'dental aide'));
                setAppointments(appointmentsData || []);
            } catch (err) {
                setError(err?.message || 'Failed to load dashboard data.');
            } finally {
                setLoading(false);
            }
        };

        loadDashboardData();
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
        const ignoredStatuses = new Set(['cancelled', 'no-show', 'declined']);

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

    return (
        <section className="settings-dashboard-container">
            <div className="settings-header-section">
                <h2>Super Admin Dashboard</h2>
                
            </div>

            {loading ? <p>Loading dashboard...</p> : null}
            {!loading && error ? <p style={{ color: '#dc2626' }}>{error}</p> : null}

            {!loading && !error ? (
                <>
                    <div className="superadmin-stats-grid">
                        <StatCard label="Total Users" value={metrics.totalUsers} />
                        <StatCard label="Total Dentists" value={metrics.totalDentists} />
                        <StatCard label="Total Aides" value={metrics.totalAides} />
                        <StatCard label="Archived Accounts" value={metrics.archivedAccounts} />
                    </div>

                    <div className="settings-form-card" style={{ marginTop: '1rem' }}>
                        <h3>Appointments Per Dentist</h3>
                        <p style={{ margin: '0 0 0.75rem 0', color: '#64748b', fontSize: '0.9rem' }}>
                            Current week: {chartData.rangeLabel}
                        </p>
                        <WeeklyBarChart chartData={chartData} />
                    </div>
                </>
            ) : null}
        </section>
    );
}

function StatCard({ label, value }) {
    return (
        <article className="superadmin-stat-card">
            <p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem' }}>{label}</p>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '1.6rem', fontWeight: 700 }}>{value}</p>
        </article>
    );
}

export default SuperAdminDashboard;
