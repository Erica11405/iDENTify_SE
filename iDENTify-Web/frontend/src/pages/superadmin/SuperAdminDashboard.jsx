import React, { useEffect, useMemo, useState } from 'react';
import api from '../../api/apiClient';

function getPhDateOnly() {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
}

function isArchived(user) {
    return Number(user?.is_archived || 0) === 1;
}

function normalizeStatus(value) {
    return String(value || '').trim().toLowerCase();
}

function SuperAdminDashboard() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [users, setUsers] = useState([]);
    const [appointments, setAppointments] = useState([]);
    const [queue, setQueue] = useState([]);

    useEffect(() => {
        const loadDashboardData = async () => {
            setLoading(true);
            setError('');

            try {
                const [usersData, appointmentsData, queueData] = await Promise.all([
                    api.getAdminUsers({ role: 'all', archived: 'all' }),
                    api.getAppointments(),
                    api.getQueue(),
                ]);

                setUsers(usersData || []);
                setAppointments(appointmentsData || []);
                setQueue(queueData || []);
            } catch (err) {
                setError(err?.message || 'Failed to load dashboard data.');
            } finally {
                setLoading(false);
            }
        };

        loadDashboardData();
    }, []);

    const metrics = useMemo(() => {
        const today = getPhDateOnly();

        const activeDentists = users.filter((u) => u.role === 'dentist' && !isArchived(u)).length;
        const activeAides = users.filter((u) => u.role === 'aide' && !isArchived(u)).length;
        const archivedAccounts = users.filter((u) => isArchived(u)).length;

        const appointmentsToday = appointments.filter((appt) => {
            if (!appt?.appointment_datetime) return false;
            return new Date(appt.appointment_datetime).toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' }) === today;
        }).length;

        const completedAppointments = appointments.filter((appt) => normalizeStatus(appt?.status) === 'done').length;
        const cancelledAppointments = appointments.filter((appt) => {
            const status = normalizeStatus(appt?.status);
            return status === 'cancelled' || status === 'no-show';
        }).length;

        const waitingQueue = queue.filter((item) => {
            const status = normalizeStatus(item?.status);
            return status === 'waiting' || status === 'checked-in';
        }).length;

        const inTreatmentQueue = queue.filter((item) => {
            const status = normalizeStatus(item?.status);
            return status === 'on chair' || status === 'treatment' || status === 'in treatment' || status === 'with patient';
        }).length;

        const billingQueue = queue.filter((item) => normalizeStatus(item?.status) === 'payment / billing').length;

        return {
            activeDentists,
            activeAides,
            archivedAccounts,
            appointmentsToday,
            completedAppointments,
            cancelledAppointments,
            waitingQueue,
            inTreatmentQueue,
            billingQueue,
        };
    }, [users, appointments, queue]);

    return (
        <section style={{ padding: '1.5rem' }}>
            <h1>Super Admin Dashboard</h1>
            <p style={{ marginBottom: '1rem' }}>Live clinic overview across users, appointments, and queue flow.</p>

            {loading ? <p>Loading dashboard...</p> : null}
            {!loading && error ? <p style={{ color: '#dc2626' }}>{error}</p> : null}

            {!loading && !error ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '0.75rem' }}>
                    <StatCard label="Active Dentists" value={metrics.activeDentists} />
                    <StatCard label="Active Dental Aides" value={metrics.activeAides} />
                    <StatCard label="Archived Accounts" value={metrics.archivedAccounts} />
                    <StatCard label="Appointments Today" value={metrics.appointmentsToday} />
                    <StatCard label="Completed Appointments" value={metrics.completedAppointments} />
                    <StatCard label="Cancelled/No-Show" value={metrics.cancelledAppointments} />
                    <StatCard label="Queue Waiting" value={metrics.waitingQueue} />
                    <StatCard label="In Treatment" value={metrics.inTreatmentQueue} />
                    <StatCard label="Billing Queue" value={metrics.billingQueue} />
                </div>
            ) : null}
        </section>
    );
}

function StatCard({ label, value }) {
    return (
        <article
            style={{
                border: '1px solid #e5e7eb',
                borderRadius: '12px',
                padding: '0.85rem 1rem',
                background: '#fff',
                boxShadow: '0 1px 2px rgba(15, 23, 42, 0.06)',
            }}
        >
            <p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem' }}>{label}</p>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '1.6rem', fontWeight: 700 }}>{value}</p>
        </article>
    );
}

export default SuperAdminDashboard;
