import React from 'react';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../api/apiClient';

const ROLE_OPTIONS = [
    { value: 'all', label: 'All Roles' },
    { value: 'dentist', label: 'Dentists' },
    { value: 'aide', label: 'Dental Aides' },
];

function normalizeRole(role) {
    return String(role || '').trim().toLowerCase();
}

function SuperAdminArchive() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [busyId, setBusyId] = useState(null);
    const [roleFilter, setRoleFilter] = useState('all');
    const [search, setSearch] = useState('');
    const [lastRestored, setLastRestored] = useState('');

    const loadArchivedUsers = async () => {
        setLoading(true);
        try {
            const data = await api.getAdminUsers({ role: 'all', archived: 'true' });
            setUsers(data || []);
        } catch (error) {
            toast.error(error.message || 'Failed to load archived users.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadArchivedUsers();
    }, []);

    const filteredUsers = useMemo(() => {
        const needle = search.trim().toLowerCase();
        return users.filter((user) => {
            const role = normalizeRole(user.role);
            const roleMatch = roleFilter === 'all' || role === roleFilter;
            if (!roleMatch) return false;

            if (!needle) return true;
            return (
                String(user.full_name || '').toLowerCase().includes(needle) ||
                String(user.email || '').toLowerCase().includes(needle)
            );
        });
    }, [users, roleFilter, search]);

    const summary = useMemo(() => {
        const dentistCount = users.filter((u) => normalizeRole(u.role) === 'dentist').length;
        const aideCount = users.filter((u) => normalizeRole(u.role) === 'aide').length;
        return {
            total: users.length,
            dentists: dentistCount,
            aides: aideCount,
        };
    }, [users]);

    const handleRestore = async (user) => {
        setBusyId(user.id);
        try {
            await api.restoreAdminUser(user.id);
            toast.success('User restored successfully.');
            setLastRestored(user.full_name || user.email || 'User');
            await loadArchivedUsers();
        } catch (error) {
            toast.error(error.message || 'Failed to restore user.');
        } finally {
            setBusyId(null);
        }
    };

    return (
        <section style={{ padding: '1.5rem' }}>
            <h1>Archived Accounts</h1>
            <p>Restore archived dentist and aide accounts when needed.</p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '0.75rem', marginTop: '1rem' }}>
                <div style={{ border: '1px solid #e5e7eb', borderRadius: '10px', padding: '0.65rem 0.8rem', background: '#fff' }}>
                    <p style={{ margin: 0, color: '#64748b', fontSize: '0.8rem' }}>Total Archived</p>
                    <p style={{ margin: '0.25rem 0 0 0', fontSize: '1.35rem', fontWeight: 700 }}>{summary.total}</p>
                </div>
                <div style={{ border: '1px solid #e5e7eb', borderRadius: '10px', padding: '0.65rem 0.8rem', background: '#fff' }}>
                    <p style={{ margin: 0, color: '#64748b', fontSize: '0.8rem' }}>Dentists</p>
                    <p style={{ margin: '0.25rem 0 0 0', fontSize: '1.35rem', fontWeight: 700 }}>{summary.dentists}</p>
                </div>
                <div style={{ border: '1px solid #e5e7eb', borderRadius: '10px', padding: '0.65rem 0.8rem', background: '#fff' }}>
                    <p style={{ margin: 0, color: '#64748b', fontSize: '0.8rem' }}>Dental Aides</p>
                    <p style={{ margin: '0.25rem 0 0 0', fontSize: '1.35rem', fontWeight: 700 }}>{summary.aides}</p>
                </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '1rem', marginBottom: '1rem' }}>
                <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
                    {ROLE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                </select>

                <input
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by name or email"
                    style={{ minWidth: '260px' }}
                />

                <button type="button" onClick={loadArchivedUsers} disabled={loading}>
                    {loading ? 'Refreshing...' : 'Refresh'}
                </button>
            </div>

            {lastRestored ? (
                <p style={{ marginTop: '-0.25rem', marginBottom: '1rem', color: '#065f46', fontSize: '0.9rem' }}>
                    Last restored: {lastRestored}
                </p>
            ) : null}

            {loading ? (
                <p>Loading archived users...</p>
            ) : filteredUsers.length === 0 ? (
                <p>No archived users found.</p>
            ) : (
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr>
                                <th style={{ textAlign: 'left', padding: '0.5rem', borderBottom: '1px solid #ddd' }}>Name</th>
                                <th style={{ textAlign: 'left', padding: '0.5rem', borderBottom: '1px solid #ddd' }}>Email</th>
                                <th style={{ textAlign: 'left', padding: '0.5rem', borderBottom: '1px solid #ddd' }}>Role</th>
                                <th style={{ textAlign: 'left', padding: '0.5rem', borderBottom: '1px solid #ddd' }}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredUsers.map((user) => (
                                <tr key={user.id}>
                                    <td style={{ padding: '0.5rem', borderBottom: '1px solid #f0f0f0' }}>{user.full_name || '-'}</td>
                                    <td style={{ padding: '0.5rem', borderBottom: '1px solid #f0f0f0' }}>{user.email}</td>
                                    <td style={{ padding: '0.5rem', borderBottom: '1px solid #f0f0f0', textTransform: 'capitalize' }}>{user.role}</td>
                                    <td style={{ padding: '0.5rem', borderBottom: '1px solid #f0f0f0' }}>
                                        <button type="button" disabled={busyId === user.id} onClick={() => handleRestore(user)}>
                                            {busyId === user.id ? 'Restoring...' : 'Restore'}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </section>
    );
}

export default SuperAdminArchive;
