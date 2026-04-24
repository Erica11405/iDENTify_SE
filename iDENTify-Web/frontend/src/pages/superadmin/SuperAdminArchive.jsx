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
    const user = useAppStore((state) => state.user);
    const [users, setUsers] = useState([]);
    const [branches, setBranches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [busyId, setBusyId] = useState(null);
    const [busyBranchId, setBusyBranchId] = useState(null);
    const [roleFilter, setRoleFilter] = useState('all');
    const [search, setSearch] = useState('');
    const [lastRestored, setLastRestored] = useState('');

    const loadArchivedData = async () => {
        setLoading(true);
        try {
            const [usersData, branchesData] = await Promise.all([
                api.getAdminUsers({ role: 'all', archived: 'true' }),
                user?.clinic_id ? api.getClinicBranches(user.clinic_id, { includeInactive: true }) : Promise.resolve([]),
            ]);
            setUsers(usersData || []);
            
            const archivedBranches = (branchesData || []).filter(b => Number(b.is_active) === 0 || b.archived_at);
            setBranches(archivedBranches);
        } catch (error) {
            toast.error(error.message || 'Failed to load archived data.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadArchivedData();
    }, [user?.clinic_id]);

    const filteredUsers = useMemo(() => {
        const needle = search.trim().toLowerCase();
        return users.filter((u) => {
            const role = normalizeRole(u.role);
            const roleMatch = roleFilter === 'all' || role === roleFilter;
            if (!roleMatch) return false;

            if (!needle) return true;
            return (
                String(u.full_name || '').toLowerCase().includes(needle) ||
                String(u.email || '').toLowerCase().includes(needle)
            );
        });
    }, [users, roleFilter, search]);

    const filteredBranches = useMemo(() => {
        const needle = search.trim().toLowerCase();
        if (!needle) return branches;
        return branches.filter(b => 
            String(b.name || '').toLowerCase().includes(needle) ||
            String(b.code || '').toLowerCase().includes(needle)
        );
    }, [branches, search]);

    const summary = useMemo(() => {
        const dentistCount = users.filter((u) => normalizeRole(u.role) === 'dentist').length;
        const aideCount = users.filter((u) => normalizeRole(u.role) === 'aide').length;
        return {
            totalUsers: users.length,
            dentists: dentistCount,
            aides: aideCount,
            branches: branches.length,
        };
    }, [users, branches]);

    const handleRestoreUser = async (u) => {
        setBusyId(u.id);
        try {
            await api.restoreAdminUser(u.id);
            toast.success('User restored successfully.');
            setLastRestored(u.full_name || u.email || 'User');
            await loadArchivedData();
        } catch (error) {
            toast.error(error.message || 'Failed to restore user.');
        } finally {
            setBusyId(null);
        }
    };

    const handleRestoreBranch = async (b) => {
        if (!user?.clinic_id) return;
        setBusyBranchId(b.id);
        try {
            await api.restoreClinicBranch(user.clinic_id, b.id);
            toast.success('Branch restored successfully.');
            setLastRestored(b.name || 'Branch');
            await loadArchivedData();
        } catch (error) {
            toast.error(error.message || 'Failed to restore branch.');
        } finally {
            setBusyBranchId(null);
        }
    };

    return (
        <section className="settings-dashboard-container">
            <div className="settings-header-section">
                <h2>Clinic Archive</h2>
                <p>Manage and restore archived accounts and branches for your clinic.</p>
            </div>

            <div className="superadmin-stats-grid" style={{ marginBottom: '1rem' }}>
                <div className="superadmin-stat-card compact">
                    <p>Archived Users</p>
                    <h4>{summary.totalUsers}</h4>
                </div>
                <div className="superadmin-stat-card compact">
                    <p>Archived Branches</p>
                    <h4>{summary.branches}</h4>
                </div>
                <div className="superadmin-stat-card compact">
                    <p>Dentists</p>
                    <h4>{summary.dentists}</h4>
                </div>
                <div className="superadmin-stat-card compact">
                    <p>Aides</p>
                    <h4>{summary.aides}</h4>
                </div>
            </div>

            <div className="settings-form-card" style={{ marginBottom: '1rem' }}>
                <div className="form-row form-row-bottom">
                    <div className="form-group" style={{ maxWidth: '220px' }}>
                        <label>User Role Filter</label>
                        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
                            {ROLE_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group flex-2">
                        <label>Search All Archived</label>
                        <input
                            type="search"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search by name, email, or code"
                        />
                    </div>
                </div>

                <div className="settings-inline-actions" style={{ justifyContent: 'flex-start' }}>
                    <button type="button" className="btn-secondary-action" onClick={loadArchivedData} disabled={loading}>
                        {loading ? 'Refreshing...' : 'Refresh'}
                    </button>
                </div>
            </div>

            {lastRestored ? (
                <p className="archive-last-restored">
                    Last restored: <strong>{lastRestored}</strong>
                </p>
            ) : null}

            {loading ? (
                <p>Loading archived records...</p>
            ) : (
                <>
                    <div className="settings-form-card" style={{ marginTop: '1.5rem' }}>
                        <h3>Archived Accounts</h3>
                        {filteredUsers.length === 0 ? (
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
                                        {filteredUsers.map((u) => (
                                            <tr key={u.id}>
                                                <td className="font-semibold">{u.full_name || '-'}</td>
                                                <td>{u.email}</td>
                                                <td className="archive-role-cell" style={{ textTransform: 'capitalize' }}>{u.role}</td>
                                                <td>
                                                    <button type="button" className="btn-edit" disabled={busyId === u.id} onClick={() => handleRestoreUser(u)}>
                                                        {busyId === u.id ? 'Restoring...' : 'Restore'}
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    <div className="settings-form-card" style={{ marginTop: '1.5rem' }}>
                        <h3>Archived Branches</h3>
                        {filteredBranches.length === 0 ? (
                            <p className="empty-state archive-empty-state">No archived branches found.</p>
                        ) : (
                            <div className="table-container">
                                <table className="settings-table">
                                    <thead>
                                        <tr>
                                            <th>Branch Name</th>
                                            <th>Code</th>
                                            <th>Status</th>
                                            <th>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredBranches.map((b) => (
                                            <tr key={b.id}>
                                                <td className="font-semibold">{b.name}</td>
                                                <td>{b.code || '-'}</td>
                                                <td><span className="status-pill archived">{b.status || 'Archived'}</span></td>
                                                <td>
                                                    <button type="button" className="btn-edit" disabled={busyBranchId === b.id} onClick={() => handleRestoreBranch(b)}>
                                                        {busyBranchId === b.id ? 'Restoring...' : 'Restore'}
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </>
            )}
        </section>
    );
}

export default SuperAdminArchive;
