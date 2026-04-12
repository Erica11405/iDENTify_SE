import React, { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../api/apiClient';
import EditDentistModal from '../../components/EditDentistModal';
import '../../styles/pages/dentist/DentistSettings.css';

const DAYS = [
    { label: 'S', value: 0 },
    { label: 'M', value: 1 },
    { label: 'T', value: 2 },
    { label: 'W', value: 3 },
    { label: 'TH', value: 4 },
    { label: 'F', value: 5 },
    { label: 'S', value: 6 },
];

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function normalizeText(value) {
    return String(value || '').trim();
}

function isArchived(user) {
    return Number(user?.is_archived || 0) === 1;
}

function isAide(staff) {
    return normalizeText(staff?.specialization).toLowerCase() === 'dental aide';
}

function fullName(firstName, middleName, lastName) {
    return [firstName, middleName, lastName]
        .map((part) => normalizeText(part))
        .filter(Boolean)
        .join(' ');
}

function initialDentistForm(defaultSpecialization = 'General Dentist') {
    return {
        firstName: '',
        middleName: '',
        lastName: '',
        email: '',
        password: '',
        specialization: defaultSpecialization,
        phone: '',
        days: [1, 2, 3, 4, 5],
        operatingHours: { start: '09:00', end: '17:00' },
        lunch: { start: '12:00', end: '13:00' },
        leaveDays: [],
    };
}

function initialAideForm() {
    return {
        firstName: '',
        middleName: '',
        lastName: '',
        email: '',
        password: '',
        contactNumber: '',
    };
}

function parseStaffName(staff) {
    const sourceName = normalizeText(staff?.name);
    const sourceFirst = normalizeText(staff?.first_name);
    const sourceLast = normalizeText(staff?.last_name);
    const sourceMiddle = normalizeText(staff?.middle_name);

    if (sourceFirst || sourceLast || sourceMiddle) {
        return {
            firstName: sourceFirst,
            middleName: sourceMiddle,
            lastName: sourceLast,
        };
    }

    const parts = sourceName ? sourceName.split(/\s+/) : [];
    if (parts.length === 0) {
        return { firstName: '', middleName: '', lastName: '' };
    }

    if (parts.length === 1) {
        return { firstName: parts[0], middleName: '', lastName: '' };
    }

    return {
        firstName: parts[0],
        middleName: parts.length > 2 ? parts.slice(1, -1).join(' ') : '',
        lastName: parts[parts.length - 1],
    };
}

function formatScheduleSummary(staff) {
    const days = Array.isArray(staff?.days)
        ? staff.days
              .filter((value) => Number.isFinite(Number(value)))
              .map((value) => DAY_LABELS[Number(value)] || '')
              .filter(Boolean)
        : [];
    const dayText = days.length ? days.join(', ') : 'No days set';

    const start = normalizeText(staff?.operatingHours?.start);
    const end = normalizeText(staff?.operatingHours?.end);
    const hoursText = start && end ? `${start} - ${end}` : 'Hours not set';

    return `${dayText} | ${hoursText}`;
}

function SuperAdminUsers() {
    const [activeTab, setActiveTab] = useState('dentists');
    const [dentists, setDentists] = useState([]);
    const [aides, setAides] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [busyId, setBusyId] = useState(null);
    const [savingDentist, setSavingDentist] = useState(false);
    const [savingAide, setSavingAide] = useState(false);
    const [editingDentist, setEditingDentist] = useState(null);
    const [editingAideId, setEditingAideId] = useState(null);
    const [dentistTypeOptions, setDentistTypeOptions] = useState(['General Dentist']);

    const [dentistForm, setDentistForm] = useState(initialDentistForm);
    const [aideForm, setAideForm] = useState(initialAideForm);
    const [leaveDraft, setLeaveDraft] = useState('');

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [staffList, usersList, typeList] = await Promise.all([
                api.getDentists(),
                api.getAdminUsers({ role: 'all', archived: 'all' }),
                api.getDentistTypes().catch(() => []),
            ]);

            const dentistsOnly = (staffList || []).filter((staff) => !isAide(staff));
            const aidesOnly = (staffList || []).filter((staff) => isAide(staff));
            const loadedTypes = (typeList || [])
                .map((entry) => normalizeText(entry?.name))
                .filter(Boolean);
            const nextTypeOptions = loadedTypes.length > 0 ? loadedTypes : ['General Dentist'];

            setDentists(dentistsOnly);
            setAides(aidesOnly);
            setUsers(usersList || []);
            setDentistTypeOptions(nextTypeOptions);
        } catch (error) {
            toast.error(error.message || 'Failed to load users.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const userByDentistId = useMemo(() => {
        const lookup = new Map();
        users.forEach((user) => {
            if (user?.dentist_id) {
                lookup.set(String(user.dentist_id), user);
            }
        });
        return lookup;
    }, [users]);

    const summary = useMemo(() => {
        const dentistCount = users.filter((u) => normalizeText(u.role).toLowerCase() === 'dentist').length;
        const aideCount = users.filter((u) => normalizeText(u.role).toLowerCase() === 'aide').length;
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

    useEffect(() => {
        if (!dentistTypeOptions.length) {
            return;
        }

        setDentistForm((prev) => {
            if (dentistTypeOptions.includes(prev.specialization)) {
                return prev;
            }

            return {
                ...prev,
                specialization: dentistTypeOptions[0],
            };
        });
    }, [dentistTypeOptions]);

    const toggleWorkingDay = (dayValue) => {
        setDentistForm((prev) => {
            const currentDays = Array.isArray(prev.days) ? prev.days : [];
            const nextDays = currentDays.includes(dayValue)
                ? currentDays.filter((item) => item !== dayValue)
                : [...currentDays, dayValue].sort((a, b) => a - b);

            return { ...prev, days: nextDays };
        });
    };

    const updateDentistTime = (section, field, value) => {
        setDentistForm((prev) => ({
            ...prev,
            [section]: {
                ...prev[section],
                [field]: value,
            },
        }));
    };

    const addLeaveDay = () => {
        if (!leaveDraft) return;

        setDentistForm((prev) => {
            const nextLeaveDays = prev.leaveDays || [];
            if (nextLeaveDays.includes(leaveDraft)) return prev;
            return {
                ...prev,
                leaveDays: [...nextLeaveDays, leaveDraft],
            };
        });
        setLeaveDraft('');
    };

    const removeLeaveDay = (dateValue) => {
        setDentistForm((prev) => ({
            ...prev,
            leaveDays: (prev.leaveDays || []).filter((value) => value !== dateValue),
        }));
    };

    const handleCreateDentist = async (event) => {
        event.preventDefault();

        if (!dentistForm.firstName || !dentistForm.lastName || !dentistForm.email || !dentistForm.password || !dentistForm.specialization) {
            toast.error('First name, last name, email, password, and dentist type are required.');
            return;
        }

        if (!Array.isArray(dentistForm.days) || dentistForm.days.length === 0) {
            toast.error('Please select at least one working day.');
            return;
        }

        setSavingDentist(true);
        try {
            await api.createDentist({
                first_name: normalizeText(dentistForm.firstName),
                middle_name: normalizeText(dentistForm.middleName),
                last_name: normalizeText(dentistForm.lastName),
                name: fullName(dentistForm.firstName, dentistForm.middleName, dentistForm.lastName),
                specialization: dentistForm.specialization,
                email: normalizeText(dentistForm.email),
                password: dentistForm.password,
                phone: normalizeText(dentistForm.phone),
                role: 'dentist',
                status: 'Available',
                days: dentistForm.days,
                operatingHours: dentistForm.operatingHours,
                lunch: dentistForm.lunch,
                leaveDays: dentistForm.leaveDays,
            });

            toast.success('Dentist added successfully.');
            setDentistForm(initialDentistForm(dentistTypeOptions[0] || 'General Dentist'));
            setLeaveDraft('');
            await loadData();
        } catch (error) {
            toast.error(error.message || 'Failed to add dentist.');
        } finally {
            setSavingDentist(false);
        }
    };

    const handleEditAide = (aide) => {
        const nameParts = parseStaffName(aide);
        setEditingAideId(aide.id);
        setAideForm({
            firstName: nameParts.firstName,
            middleName: nameParts.middleName,
            lastName: nameParts.lastName,
            email: normalizeText(aide.email),
            password: '',
            contactNumber: normalizeText(aide.phone),
        });
    };

    const resetAideForm = () => {
        setEditingAideId(null);
        setAideForm(initialAideForm());
    };

    const handleSaveAide = async (event) => {
        event.preventDefault();

        if (!aideForm.firstName || !aideForm.lastName || !aideForm.email || !aideForm.contactNumber) {
            toast.error('First name, last name, email, and contact number are required.');
            return;
        }

        if (!editingAideId && !aideForm.password) {
            toast.error('Password is required for new dental aide accounts.');
            return;
        }

        setSavingAide(true);
        try {
            const selectedAide = aides.find((item) => item.id === editingAideId);
            const payload = {
                first_name: normalizeText(aideForm.firstName),
                middle_name: normalizeText(aideForm.middleName),
                last_name: normalizeText(aideForm.lastName),
                name: fullName(aideForm.firstName, aideForm.middleName, aideForm.lastName),
                email: normalizeText(aideForm.email),
                phone: normalizeText(aideForm.contactNumber),
                specialization: 'Dental Aide',
                role: 'aide',
                status: selectedAide?.status || 'Available',
                days: selectedAide?.days || [],
                operatingHours: selectedAide?.operatingHours || { start: '09:00', end: '17:00' },
                lunch: selectedAide?.lunch || { start: '12:00', end: '13:00' },
                breaks: selectedAide?.breaks || [],
                leaveDays: selectedAide?.leaveDays || [],
            };

            if (editingAideId) {
                await api.updateDentist(editingAideId, payload);
                toast.success('Dental aide updated successfully.');
            } else {
                await api.createDentist({ ...payload, password: aideForm.password });
                toast.success('Dental aide added successfully.');
            }

            resetAideForm();
            await loadData();
        } catch (error) {
            toast.error(error.message || 'Failed to save dental aide.');
        } finally {
            setSavingAide(false);
        }
    };

    const handleArchiveToggle = async (staff) => {
        const linkedUser = userByDentistId.get(String(staff.id));
        if (!linkedUser) {
            toast.error('No linked login account found for this staff member.');
            return;
        }

        const willRestore = isArchived(linkedUser);
        const targetName = staff.name || linkedUser.full_name || linkedUser.email || 'this user';
        const confirmText = willRestore
            ? `Restore ${targetName}?`
            : `Archive ${targetName}? This account will not be able to login until restored.`;

        if (!window.confirm(confirmText)) {
            return;
        }

        setBusyId(staff.id);
        try {
            if (willRestore) {
                await api.restoreAdminUser(linkedUser.id);
                toast.success('User restored successfully.');
            } else {
                await api.archiveAdminUser(linkedUser.id);
                toast.success('User archived successfully.');
            }

            await loadData();
        } catch (error) {
            toast.error(error.message || 'Failed to update user status.');
        } finally {
            setBusyId(null);
        }
    };

    return (
        <section className="settings-dashboard-container">
            <div className="settings-header-section">
                <h2>User Management</h2>
            </div>

            <div className="superadmin-stats-grid" style={{ marginBottom: '1.25rem' }}>
                <div className="superadmin-stat-card compact">
                    <p>Loaded Users</p>
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
                <div className="superadmin-stat-card compact">
                    <p>Active / Archived</p>
                    <h4>{summary.active} / {summary.archived}</h4>
                </div>
            </div>

            <div className="settings-tabs">
                <button className={activeTab === 'dentists' ? 'active' : ''} onClick={() => setActiveTab('dentists')}>Dentists</button>
                <button className={activeTab === 'aides' ? 'active' : ''} onClick={() => setActiveTab('aides')}>Dental Aides</button>
            </div>

            <div className="settings-tab-content">
                {loading ? <p>Loading users...</p> : null}

                {!loading && activeTab === 'dentists' ? (
                    <div className="animation-fade-in">
                        <div className="settings-form-card">
                            <h3>Add New Dentist</h3>
                            <form onSubmit={handleCreateDentist}>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>First Name *</label>
                                        <input type="text" value={dentistForm.firstName} onChange={(e) => setDentistForm((prev) => ({ ...prev, firstName: e.target.value }))} placeholder="Juan" />
                                    </div>
                                    <div className="form-group">
                                        <label>Middle Name (Optional)</label>
                                        <input type="text" value={dentistForm.middleName} onChange={(e) => setDentistForm((prev) => ({ ...prev, middleName: e.target.value }))} placeholder="Dela" />
                                    </div>
                                    <div className="form-group">
                                        <label>Last Name *</label>
                                        <input type="text" value={dentistForm.lastName} onChange={(e) => setDentistForm((prev) => ({ ...prev, lastName: e.target.value }))} placeholder="Cruz" />
                                    </div>
                                </div>

                                <div className="form-row">
                                    <div className="form-group flex-2">
                                        <label>Email Address *</label>
                                        <input type="email" value={dentistForm.email} onChange={(e) => setDentistForm((prev) => ({ ...prev, email: e.target.value }))} placeholder="dentist@clinic.com" />
                                    </div>
                                    <div className="form-group">
                                        <label>Password *</label>
                                        <input type="password" value={dentistForm.password} onChange={(e) => setDentistForm((prev) => ({ ...prev, password: e.target.value }))} placeholder="At least 8 characters" />
                                    </div>
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Type of Dentist *</label>
                                        <select value={dentistForm.specialization} onChange={(e) => setDentistForm((prev) => ({ ...prev, specialization: e.target.value }))}>
                                            {dentistTypeOptions.map((option) => (
                                                <option key={option} value={option}>{option}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>Contact Number</label>
                                        <input type="text" value={dentistForm.phone} onChange={(e) => setDentistForm((prev) => ({ ...prev, phone: e.target.value }))} placeholder="09xxxxxxxxx" />
                                    </div>
                                </div>

                                <div className="form-row">
                                    <div className="form-group" style={{ flex: 1 }}>
                                        <label>Dentist Schedule *</label>
                                        <div className="days-selector">
                                            {DAYS.map((day) => (
                                                <button
                                                    key={day.value}
                                                    type="button"
                                                    className={`day-toggle ${dentistForm.days.includes(day.value) ? 'active' : ''}`}
                                                    onClick={() => toggleWorkingDay(day.value)}
                                                >
                                                    {day.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Operating Hours</label>
                                        <div className="time-range">
                                            <input type="time" value={dentistForm.operatingHours.start} onChange={(e) => updateDentistTime('operatingHours', 'start', e.target.value)} />
                                            <span>to</span>
                                            <input type="time" value={dentistForm.operatingHours.end} onChange={(e) => updateDentistTime('operatingHours', 'end', e.target.value)} />
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label>Lunch Break</label>
                                        <div className="time-range">
                                            <input type="time" value={dentistForm.lunch.start} onChange={(e) => updateDentistTime('lunch', 'start', e.target.value)} />
                                            <span>to</span>
                                            <input type="time" value={dentistForm.lunch.end} onChange={(e) => updateDentistTime('lunch', 'end', e.target.value)} />
                                        </div>
                                    </div>
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Leave Days</label>
                                        <div className="chips-container">
                                            {(dentistForm.leaveDays || []).map((dateValue) => (
                                                <div className="chip red-chip" key={dateValue}>
                                                    {dateValue}
                                                    <button type="button" onClick={() => removeLeaveDay(dateValue)}>&times;</button>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="add-row">
                                            <input type="date" value={leaveDraft} onChange={(e) => setLeaveDraft(e.target.value)} />
                                            <button type="button" className="btn-small-add" onClick={addLeaveDay}>Add</button>
                                        </div>
                                    </div>
                                </div>

                                <div className="settings-inline-actions">
                                    <button type="submit" className="btn-primary-action" disabled={savingDentist}>
                                        {savingDentist ? 'Saving...' : 'Add Dentist'}
                                    </button>
                                </div>
                            </form>
                        </div>

                        <h3 className="table-title">Current Dentists</h3>
                        <div className="table-container">
                            <table className="settings-table">
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Type</th>
                                        <th>Email</th>
                                        <th>Schedule</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {dentists.length === 0 ? (
                                        <tr>
                                            <td colSpan="6" className="empty-state">No dentist accounts found.</td>
                                        </tr>
                                    ) : (
                                        dentists.map((dentist) => {
                                            const linkedUser = userByDentistId.get(String(dentist.id));
                                            const archived = isArchived(linkedUser);

                                            return (
                                                <tr key={dentist.id}>
                                                    <td className="font-semibold">{dentist.name || fullName(dentist.first_name, dentist.middle_name, dentist.last_name)}</td>
                                                    <td>{dentist.specialization || 'General Dentist'}</td>
                                                    <td>{dentist.email || '-'}</td>
                                                    <td>{formatScheduleSummary(dentist)}</td>
                                                    <td>
                                                        <span className={`status-pill ${archived ? 'archived' : 'active'}`}>{archived ? 'Archived' : 'Active'}</span>
                                                    </td>
                                                    <td>
                                                        <div className="action-buttons">
                                                            <button type="button" className="btn-edit" onClick={() => setEditingDentist(dentist)}>Edit Schedule</button>
                                                            <button
                                                                type="button"
                                                                className={archived ? 'btn-edit' : 'btn-delete'}
                                                                disabled={busyId === dentist.id}
                                                                onClick={() => handleArchiveToggle(dentist)}
                                                            >
                                                                {busyId === dentist.id ? 'Saving...' : archived ? 'Restore' : 'Archive'}
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : null}

                {!loading && activeTab === 'aides' ? (
                    <div className="animation-fade-in">
                        <div className={`settings-form-card ${editingAideId ? 'editing' : ''}`}>
                            <h3>{editingAideId ? 'Edit Dental Aide' : 'Add New Dental Aide'}</h3>
                            <form onSubmit={handleSaveAide}>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>First Name *</label>
                                        <input type="text" value={aideForm.firstName} onChange={(e) => setAideForm((prev) => ({ ...prev, firstName: e.target.value }))} placeholder="Juan" />
                                    </div>
                                    <div className="form-group">
                                        <label>Middle Name (Optional)</label>
                                        <input type="text" value={aideForm.middleName} onChange={(e) => setAideForm((prev) => ({ ...prev, middleName: e.target.value }))} placeholder="Dela" />
                                    </div>
                                    <div className="form-group">
                                        <label>Last Name *</label>
                                        <input type="text" value={aideForm.lastName} onChange={(e) => setAideForm((prev) => ({ ...prev, lastName: e.target.value }))} placeholder="Cruz" />
                                    </div>
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Email Address *</label>
                                        <input type="email" value={aideForm.email} onChange={(e) => setAideForm((prev) => ({ ...prev, email: e.target.value }))} placeholder="aide@clinic.com" />
                                    </div>
                                    <div className="form-group">
                                        <label>Contact Number *</label>
                                        <input type="text" value={aideForm.contactNumber} onChange={(e) => setAideForm((prev) => ({ ...prev, contactNumber: e.target.value }))} placeholder="09xxxxxxxxx" />
                                    </div>
                                    {!editingAideId ? (
                                        <div className="form-group">
                                            <label>Password *</label>
                                            <input type="password" value={aideForm.password} onChange={(e) => setAideForm((prev) => ({ ...prev, password: e.target.value }))} placeholder="At least 8 characters" />
                                        </div>
                                    ) : null}
                                </div>

                                <div className="settings-inline-actions">
                                    {editingAideId ? (
                                        <button type="button" className="btn-secondary-action" onClick={resetAideForm}>Cancel</button>
                                    ) : null}
                                    <button type="submit" className="btn-primary-action" disabled={savingAide}>
                                        {savingAide ? 'Saving...' : editingAideId ? 'Save Changes' : 'Add Dental Aide'}
                                    </button>
                                </div>
                            </form>
                        </div>

                        <h3 className="table-title">Current Dental Aides</h3>
                        <div className="table-container">
                            <table className="settings-table">
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Contact Number</th>
                                        <th>Email</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {aides.length === 0 ? (
                                        <tr>
                                            <td colSpan="5" className="empty-state">No dental aide accounts found.</td>
                                        </tr>
                                    ) : (
                                        aides.map((aide) => {
                                            const linkedUser = userByDentistId.get(String(aide.id));
                                            const archived = isArchived(linkedUser);

                                            return (
                                                <tr key={aide.id} className={editingAideId === aide.id ? 'row-highlight' : ''}>
                                                    <td className="font-semibold">{aide.name || fullName(aide.first_name, aide.middle_name, aide.last_name)}</td>
                                                    <td>{aide.phone || '-'}</td>
                                                    <td>{aide.email || '-'}</td>
                                                    <td>
                                                        <span className={`status-pill ${archived ? 'archived' : 'active'}`}>{archived ? 'Archived' : 'Active'}</span>
                                                    </td>
                                                    <td>
                                                        <div className="action-buttons">
                                                            <button type="button" className="btn-edit" onClick={() => handleEditAide(aide)}>Edit</button>
                                                            <button
                                                                type="button"
                                                                className={archived ? 'btn-edit' : 'btn-delete'}
                                                                disabled={busyId === aide.id}
                                                                onClick={() => handleArchiveToggle(aide)}
                                                            >
                                                                {busyId === aide.id ? 'Saving...' : archived ? 'Restore' : 'Archive'}
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : null}

                {!loading ? (
                    <div className="settings-inline-actions" style={{ marginTop: '1rem' }}>
                        <button type="button" className="btn-secondary-action" onClick={loadData}>Refresh Data</button>
                    </div>
                ) : null}
            </div>

            {editingDentist ? (
                <EditDentistModal
                    dentist={editingDentist}
                    dentistTypeOptions={dentistTypeOptions}
                    onClose={() => setEditingDentist(null)}
                    onSuccess={async () => {
                        setEditingDentist(null);
                        await loadData();
                    }}
                />
            ) : null}
        </section>
    );
}

export default SuperAdminUsers;
