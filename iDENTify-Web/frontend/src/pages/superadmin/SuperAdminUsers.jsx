import React from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../api/apiClient';

const ROLE_OPTIONS = [
    { value: 'all', label: 'All Roles' },
    { value: 'dentist', label: 'Dentists' },
    { value: 'aide', label: 'Dental Aides' },
];

const ARCHIVE_OPTIONS = [
    { value: 'active', label: 'Active' },
    { value: 'archived', label: 'Archived' },
    { value: 'all', label: 'All' },
];

function normalizeRole(role) {
    return String(role || '').trim().toLowerCase();
}

function isArchived(user) {
    return Number(user?.is_archived || 0) === 1;
}

function SuperAdminUsers() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [busyId, setBusyId] = useState(null);
    const [roleFilter, setRoleFilter] = useState('all');
    const [archiveFilter, setArchiveFilter] = useState('active');
    const [search, setSearch] = useState('');
    const [lastAction, setLastAction] = useState('');

    const archivedApiFilter = archiveFilter === 'all' ? 'all' : archiveFilter === 'archived' ? 'true' : 'false';

    const loadUsers = useCallback(async () => {
        setLoading(true);
        try {
            const data = await api.getAdminUsers({ role: roleFilter, archived: archivedApiFilter });
            setUsers(data || []);
        } catch (error) {
            toast.error(error.message || 'Failed to load users.');
        } finally {
            setLoading(false);
        }
    }, [roleFilter, archivedApiFilter]);

    useEffect(() => {
        loadUsers();
    }, [loadUsers]);

    const filteredUsers = useMemo(() => {
        const needle = search.trim().toLowerCase();
        const searched = !needle
            ? users
            : users.filter((user) => {
                return (
                    String(user.full_name || '').toLowerCase().includes(needle) ||
                    String(user.email || '').toLowerCase().includes(needle)
                );
            });

        return [...searched].sort((a, b) => {
            const aName = String(a.full_name || a.email || '').toLowerCase();
            const bName = String(b.full_name || b.email || '').toLowerCase();
            return aName.localeCompare(bName);
        });
    }, [users, search]);

    const summary = useMemo(() => {
        const dentistCount = users.filter((u) => normalizeRole(u.role) === 'dentist').length;
        const aideCount = users.filter((u) => normalizeRole(u.role) === 'aide').length;
        const activeCount = users.filter((u) => !isArchived(u)).length;
        const archivedCount = users.filter((u) => isArchived(u)).length;
        return {
            total: users.length,
            dentists: dentistCount,
            aides: aideCount,
            active: activeCount,
            archived: archivedCount,
        };
    }, [users]);

    const handleResetFilters = () => {
        setRoleFilter('all');
        setArchiveFilter('active');
        setSearch('');
    };

    const handleArchiveToggle = async (user) => {
        const willRestore = isArchived(user);
        const targetName = user.full_name || user.email || 'this user';
        const confirmText = willRestore
            ? `Restore ${targetName}?`
            : `Archive ${targetName}? This account will not be able to login until restored.`;

        if (!window.confirm(confirmText)) {
            return;
        }

        setBusyId(user.id);
        try {
            if (willRestore) {
                await api.restoreAdminUser(user.id);
                toast.success('User restored successfully.');
                setLastAction(`Restored ${targetName}`);
            } else {
                await api.archiveAdminUser(user.id);
                toast.success('User archived successfully.');
                setLastAction(`Archived ${targetName}`);
            }

            await loadUsers();
        } catch (error) {
            toast.error(error.message || 'Failed to update user status.');
        } finally {
            setBusyId(null);
        }
    };

    return (
        <section style={{ padding: '1.5rem' }}>
            <h1>User Management</h1>
            <p>Manage dentist and aide access, then archive or restore accounts as needed.</p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem', marginTop: '1rem' }}>
                <div style={{ border: '1px solid #e5e7eb', borderRadius: '10px', padding: '0.65rem 0.8rem', background: '#fff' }}>
                    <p style={{ margin: 0, color: '#64748b', fontSize: '0.8rem' }}>Loaded Users</p>
                    <p style={{ margin: '0.25rem 0 0 0', fontSize: '1.35rem', fontWeight: 700 }}>{summary.total}</p>
                </div>
                <div style={{ border: '1px solid #e5e7eb', borderRadius: '10px', padding: '0.65rem 0.8rem', background: '#fff' }}>
                    <p style={{ margin: 0, color: '#64748b', fontSize: '0.8rem' }}>Active</p>
                    <p style={{ margin: '0.25rem 0 0 0', fontSize: '1.35rem', fontWeight: 700 }}>{summary.active}</p>
                </div>
                <div style={{ border: '1px solid #e5e7eb', borderRadius: '10px', padding: '0.65rem 0.8rem', background: '#fff' }}>
                    <p style={{ margin: 0, color: '#64748b', fontSize: '0.8rem' }}>Archived</p>
                    <p style={{ margin: '0.25rem 0 0 0', fontSize: '1.35rem', fontWeight: 700 }}>{summary.archived}</p>
                </div>
                <div style={{ border: '1px solid #e5e7eb', borderRadius: '10px', padding: '0.65rem 0.8rem', background: '#fff' }}>
                    <p style={{ margin: 0, color: '#64748b', fontSize: '0.8rem' }}>Dentists / Aides</p>
                    <p style={{ margin: '0.25rem 0 0 0', fontSize: '1.1rem', fontWeight: 700 }}>{summary.dentists} / {summary.aides}</p>
                </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '1rem', marginBottom: '1rem' }}>
                <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
                    {ROLE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                </select>

                <select value={archiveFilter} onChange={(e) => setArchiveFilter(e.target.value)}>
                    {ARCHIVE_OPTIONS.map((option) => (
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

                <button type="button" onClick={loadUsers} disabled={loading}>
                    {loading ? 'Refreshing...' : 'Refresh'}
                </button>

                <button type="button" onClick={handleResetFilters} disabled={loading}>
                    Reset
                </button>
            </div>

            <p style={{ marginTop: '-0.25rem', marginBottom: '1rem', color: '#475569', fontSize: '0.9rem' }}>
                Showing {filteredUsers.length} result{filteredUsers.length === 1 ? '' : 's'}
                {lastAction ? ` · Last action: ${lastAction}` : ''}
            </p>

            {loading ? (
                <p>Loading users...</p>
            ) : filteredUsers.length === 0 ? (
                <p>No users found for the selected filters.</p>
            ) : (
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr>
                                <th style={{ textAlign: 'left', padding: '0.5rem', borderBottom: '1px solid #ddd' }}>Name</th>
                                <th style={{ textAlign: 'left', padding: '0.5rem', borderBottom: '1px solid #ddd' }}>Email</th>
                                <th style={{ textAlign: 'left', padding: '0.5rem', borderBottom: '1px solid #ddd' }}>Role</th>
                                <th style={{ textAlign: 'left', padding: '0.5rem', borderBottom: '1px solid #ddd' }}>Status</th>
                                <th style={{ textAlign: 'left', padding: '0.5rem', borderBottom: '1px solid #ddd' }}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredUsers.map((user) => {
                                const archived = isArchived(user);

                                return (
                                    <tr key={user.id}>
                                        <td style={{ padding: '0.5rem', borderBottom: '1px solid #f0f0f0' }}>{user.full_name || '-'}</td>
                                        <td style={{ padding: '0.5rem', borderBottom: '1px solid #f0f0f0' }}>{user.email}</td>
                                        <td style={{ padding: '0.5rem', borderBottom: '1px solid #f0f0f0', textTransform: 'capitalize' }}>{user.role}</td>
                                        <td style={{ padding: '0.5rem', borderBottom: '1px solid #f0f0f0' }}>
                                            <span style={{
                                                display: 'inline-block',
                                                padding: '0.2rem 0.5rem',
                                                borderRadius: '999px',
                                                fontSize: '0.8rem',
                                                background: archived ? '#fee2e2' : '#dcfce7',
                                                color: archived ? '#991b1b' : '#166534',
                                            }}>
                                                {archived ? 'Archived' : 'Active'}
                                            </span>
                                        </td>
                                        <td style={{ padding: '0.5rem', borderBottom: '1px solid #f0f0f0' }}>
                                            <button
                                                type="button"
                                                disabled={busyId === user.id}
                                                onClick={() => handleArchiveToggle(user)}
                                            >
                                                {busyId === user.id ? 'Saving...' : archived ? 'Restore' : 'Archive'}
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </section>
    );
}

export default SuperAdminUsers;
