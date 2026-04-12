import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../api/apiClient';
import '../../styles/pages/dentist/DentistSettings.css';

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
        <section className="settings-dashboard-container">
            <div className="settings-header-section">
                <h2>Archived Accounts</h2>
            </div>

            <div className="superadmin-stats-grid" style={{ marginBottom: '1rem' }}>
                <div className="superadmin-stat-card compact">
                    <p>Total Archived</p>
                    <h4>{summary.total}</h4>
                </div>
                <div className="superadmin-stat-card compact">
                    <p>Dentists</p>
                    <h4>{summary.dentists}</h4>
                </div>
                <div className="superadmin-stat-card compact">
                    <p>Dental Aides</p>
                    <h4>{summary.aides}</h4>
                </div>
            </div>

            <div className="settings-form-card" style={{ marginBottom: '1rem' }}>
                <div className="form-row form-row-bottom">
                    <div className="form-group" style={{ maxWidth: '220px' }}>
                        <label>Role</label>
                        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
                            {ROLE_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group flex-2">
                        <label>Search</label>
                        <input
                            type="search"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search by name or email"
                        />
                    </div>
                </div>

                <div className="settings-inline-actions" style={{ justifyContent: 'flex-start' }}>
                    <button type="button" className="btn-secondary-action" onClick={loadArchivedUsers} disabled={loading}>
                        {loading ? 'Refreshing...' : 'Refresh'}
                    </button>
                </div>
            </div>

            {lastRestored ? (
                <p className="archive-last-restored">
                    Last restored: {lastRestored}
                </p>
            ) : null}

            {loading ? (
                <p>Loading archived users...</p>
            ) : filteredUsers.length === 0 ? (
                <p className="empty-state archive-empty-state">No archived users found.</p>
            ) : (
                <div className="table-container">
                    <table className="settings-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Role</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredUsers.map((user) => (
                                <tr key={user.id}>
                                    <td className="font-semibold">{user.full_name || '-'}</td>
                                    <td>{user.email}</td>
                                    <td className="archive-role-cell">{user.role}</td>
                                    <td>
                                        <button type="button" className="btn-edit" disabled={busyId === user.id} onClick={() => handleRestore(user)}>
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
