import React, { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../api/apiClient';
import ConfirmationModal from '../../components/ConfirmationModal';
import '../../styles/pages/systemadmin/SystemAdminClinicManagement.css';

const STATUS_OPTIONS = ['Active', 'Suspended', 'Deactivated'];

function normalizeStatus(value) {
	const normalized = String(value || '').trim().toLowerCase();
	if (normalized === 'active') return 'Active';
	if (normalized === 'suspended') return 'Suspended';
	if (normalized === 'deactivated') return 'Deactivated';
	return 'Active';
}

function formatDateTime(value) {
	if (!value) return '-';
	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) return '-';
	return parsed.toLocaleString();
}

function hasArchivedTimestamp(item) {
	return Boolean(String(item?.archived_at || '').trim());
}

function SystemAdminClinicManagement() {
	const [loading, setLoading] = useState(true);
	const [clinics, setClinics] = useState([]);
	const [branchesByClinic, setBranchesByClinic] = useState({});
	const [selectedClinicId, setSelectedClinicId] = useState('');
	const [branchLoading, setBranchLoading] = useState(false);
	const [busyAction, setBusyAction] = useState('');

	const [clinicStatusDrafts, setClinicStatusDrafts] = useState({});
	const [branchStatusDrafts, setBranchStatusDrafts] = useState({});

	const [newClinic, setNewClinic] = useState({ name: '', code: '' });
	const [newBranch, setNewBranch] = useState({ clinicId: '', name: '', code: '', street: '', barangay: '', city: '', province: '' });

	const [showConfirmModal, setShowConfirmModal] = useState(false);
	const [confirmModalConfig, setConfirmModalConfig] = useState({ message: '', onConfirm: () => {} });

	const openConfirm = (message, onConfirm) => {
		setConfirmModalConfig({ message, onConfirm });
		setShowConfirmModal(true);
	};

	const loadClinics = useCallback(async () => {
		const rows = await api.getClinics({ includeInactive: true });
		const normalizedRows = Array.isArray(rows) ? rows : [];
		setClinics(normalizedRows);

		if (!normalizedRows.length) {
			setSelectedClinicId('');
			setNewBranch((prev) => ({ ...prev, clinicId: '' }));
			return;
		}

		const currentSelectionExists = normalizedRows.some((item) => String(item.id) === String(selectedClinicId));
		const fallbackClinicId = String(normalizedRows[0].id);

		if (!currentSelectionExists) {
			setSelectedClinicId(fallbackClinicId);
		}

		const branchClinicExists = normalizedRows.some((item) => String(item.id) === String(newBranch.clinicId));
		if (!branchClinicExists) {
			setNewBranch((prev) => ({ ...prev, clinicId: fallbackClinicId }));
		}
	}, [selectedClinicId, newBranch.clinicId]);

	const loadBranches = useCallback(async (clinicId) => {
		if (!clinicId) return;
		setBranchLoading(true);
		try {
			const rows = await api.getClinicBranches(clinicId, { includeInactive: true });
			setBranchesByClinic((prev) => ({
				...prev,
				[clinicId]: Array.isArray(rows) ? rows : [],
			}));
		} catch (error) {
			toast.error(error?.message || 'Failed to load clinic branches.');
			setBranchesByClinic((prev) => ({
				...prev,
				[clinicId]: [],
			}));
		} finally {
			setBranchLoading(false);
		}
	}, []);

	useEffect(() => {
		const load = async () => {
			setLoading(true);
			try {
				await loadClinics();
			} catch (error) {
				toast.error(error?.message || 'Failed to load clinics.');
			} finally {
				setLoading(false);
			}
		};

		load();
	}, [loadClinics]);

	useEffect(() => {
		if (!selectedClinicId) return;
		loadBranches(selectedClinicId);
	}, [selectedClinicId, loadBranches]);

	const selectedClinic = useMemo(
		() => clinics.find((item) => String(item.id) === String(selectedClinicId)) || null,
		[clinics, selectedClinicId]
	);

	const selectedClinicBranches = selectedClinicId
		? (branchesByClinic[selectedClinicId] || [])
		: [];

	const summary = useMemo(() => {
		const totals = {
			total: clinics.length,
			active: 0,
			suspended: 0,
			deactivated: 0,
			archived: 0,
		};

		clinics.forEach((item) => {
			const status = normalizeStatus(item.status);
			if (status === 'Active') totals.active += 1;
			if (status === 'Suspended') totals.suspended += 1;
			if (status === 'Deactivated') totals.deactivated += 1;
			if (hasArchivedTimestamp(item)) totals.archived += 1;
		});

		return totals;
	}, [clinics]);

	const setBusy = (value) => setBusyAction(String(value || ''));

	const handleApplyClinicStatus = async (clinic) => {
		const clinicId = clinic?.id;
		if (!clinicId) return;

		const draft = clinicStatusDrafts[clinicId] || normalizeStatus(clinic.status);

		try {
			setBusy(`clinic-status-${clinicId}`);
			await api.updateClinicStatus(clinicId, { status: draft });
			toast.success('Clinic status updated.');
			await loadClinics();
			await loadBranches(String(selectedClinicId || clinicId));
		} catch (error) {
			toast.error(error?.message || 'Failed to update clinic status.');
		} finally {
			setBusy('');
		}
	};

	const executeArchiveClinic = async (clinic) => {
		try {
			setBusy(`clinic-archive-${clinic.id}`);
			await api.archiveClinic(clinic.id);
			toast.success('Clinic archived.');
			await loadClinics();
			await loadBranches(String(selectedClinicId || clinic.id));
		} catch (error) {
			toast.error(error?.message || 'Failed to archive clinic.');
		} finally {
			setBusy('');
			setShowConfirmModal(false);
		}
	};

	const handleArchiveClinic = (clinic) => {
		if (!clinic?.id) return;
		openConfirm(`Archive clinic "${clinic.name}"?`, () => executeArchiveClinic(clinic));
	};

	const handleRestoreClinic = async (clinic) => {
		if (!clinic?.id) return;

		try {
			setBusy(`clinic-restore-${clinic.id}`);
			await api.restoreClinic(clinic.id);
			toast.success('Clinic restored.');
			await loadClinics();
			await loadBranches(String(selectedClinicId || clinic.id));
		} catch (error) {
			toast.error(error?.message || 'Failed to restore clinic.');
		} finally {
			setBusy('');
		}
	};

	const handleCreateClinic = async (e) => {
		e.preventDefault();
		if (!newClinic.name.trim()) {
			toast.error('Clinic name is required.');
			return;
		}
		try {
			setBusy('create-clinic');
			await api.createClinic(newClinic);
			toast.success('Clinic created successfully.');
			setNewClinic({ name: '', code: '' });
			await loadClinics();
		} catch (error) {
			toast.error(error?.message || 'Failed to create clinic.');
		} finally {
			setBusy('');
		}
	};

	const handleCreateBranch = async (e) => {
		e.preventDefault();
		if (!newBranch.clinicId || !newBranch.name.trim()) {
			toast.error('Clinic and branch name are required.');
			return;
		}
		try {
			setBusy('create-branch');
			await api.createBranch(newBranch);
			toast.success('Branch created successfully.');
			const currentClinicId = newBranch.clinicId;
			setNewBranch({ clinicId: currentClinicId, name: '', code: '', street: '', barangay: '', city: '', province: '' });
			await loadBranches(currentClinicId);
		} catch (error) {
			toast.error(error?.message || 'Failed to create branch.');
		} finally {
			setBusy('');
		}
	};

	return (
		<section className="systemadmin-page">
			<div className="systemadmin-header">
				<h2>Clinic Management</h2>
				<p>Manage clinic and branch lifecycle.</p>
			</div>

			{loading ? <p className="systemadmin-loading">Loading clinic records...</p> : null}

			{!loading ? (
				<>
					<div className="systemadmin-stats-grid">
						<StatCard label="Total Clinics" value={summary.total} />
						<StatCard label="Active" value={summary.active} />
						<StatCard label="Suspended" value={summary.suspended} />
						<StatCard label="Deactivated" value={summary.deactivated} />
						<StatCard label="Archived" value={summary.archived} />
					</div>

					<div className="systemadmin-card">
						<h3>Clinics</h3>
						{clinics.length === 0 ? (
							<p>No clinics found.</p>
						) : (
							<div className="systemadmin-table-wrap">
								<table className="systemadmin-table">
									<thead>
										<tr>
											<th>Clinic</th>
											<th>Code</th>
											<th>Status</th>
											<th>Archived At</th>
											<th>Actions</th>
										</tr>
									</thead>
									<tbody>
										{clinics.map((clinic) => {
											const clinicStatus = normalizeStatus(clinic.status);
											const draftStatus = clinicStatusDrafts[clinic.id] || clinicStatus;
											const isArchived = hasArchivedTimestamp(clinic);

											return (
												<tr
													key={clinic.id}
													className={String(selectedClinicId) === String(clinic.id) ? 'selected-row' : ''}
													onClick={() => setSelectedClinicId(String(clinic.id))}
												>
													<td>{clinic.name}</td>
													<td>{clinic.code || '-'}</td>
													<td>
														<select
															value={draftStatus}
															onChange={(event) => setClinicStatusDrafts((prev) => ({
																...prev,
																[clinic.id]: event.target.value,
															}))}
														>
															{STATUS_OPTIONS.map((option) => (
																<option key={option} value={option}>{option}</option>
															))}
														</select>
													</td>
													<td>{formatDateTime(clinic.archived_at)}</td>
													<td>
														<div className="systemadmin-actions-inline">
															<button
																type="button"
																onClick={(event) => {
																	event.stopPropagation();
																	handleApplyClinicStatus(clinic);
																}}
																disabled={busyAction === `clinic-status-${clinic.id}`}
															>
																{busyAction === `clinic-status-${clinic.id}` ? 'Saving...' : 'Apply'}
															</button>

															{!isArchived ? (
																<button
																	type="button"
																	className="danger"
																	onClick={(event) => {
																		event.stopPropagation();
																		handleArchiveClinic(clinic);
																	}}
																	disabled={busyAction === `clinic-archive-${clinic.id}`}
																>
																	{busyAction === `clinic-archive-${clinic.id}` ? 'Archiving...' : 'Archive'}
																</button>
															) : (
																<button
																	type="button"
																	className="secondary"
																	onClick={(event) => {
																		event.stopPropagation();
																		handleRestoreClinic(clinic);
																	}}
																	disabled={busyAction === `clinic-restore-${clinic.id}`}
																>
																	{busyAction === `clinic-restore-${clinic.id}` ? 'Restoring...' : 'Restore'}
																</button>
															)}
														</div>
													</td>
												</tr>
											);
										})}
									</tbody>
								</table>
							</div>
						)}
					</div>

					<div className="systemadmin-card">
						<h3>Create Branch</h3>
						<form onSubmit={handleCreateBranch}>
							<div className="systemadmin-form-grid">
								<div className="form-group">
									<label>Select Clinic *</label>
									<select
										value={newBranch.clinicId}
										onChange={(e) => setNewBranch({ ...newBranch, clinicId: e.target.value })}
									>
										{clinics.map((c) => (
											<option key={c.id} value={c.id}>{c.name}</option>
										))}
									</select>
								</div>
								<div className="form-group">
									<label>Branch Name *</label>
									<input
										type="text"
										value={newBranch.name}
										onChange={(e) => setNewBranch({ ...newBranch, name: e.target.value })}
										placeholder="e.g. Downtown Branch"
									/>
								</div>
								<div className="form-group">
									<label>Branch Code</label>
									<input
										type="text"
										value={newBranch.code}
										onChange={(e) => setNewBranch({ ...newBranch, code: e.target.value })}
										placeholder="e.g. DT-01"
									/>
								</div>
							</div>

							<div className="systemadmin-form-grid" style={{ marginTop: '10px' }}>
								<div className="form-group">
									<label>Street *</label>
									<input
										type="text"
										value={newBranch.street}
										onChange={(e) => setNewBranch({ ...newBranch, street: e.target.value })}
										placeholder="Street"
									/>
								</div>
								<div className="form-group">
									<label>Barangay *</label>
									<input
										type="text"
										value={newBranch.barangay}
										onChange={(e) => setNewBranch({ ...newBranch, barangay: e.target.value })}
										placeholder="Barangay"
									/>
								</div>
								<div className="form-group">
									<label>City *</label>
									<input
										type="text"
										value={newBranch.city}
										onChange={(e) => setNewBranch({ ...newBranch, city: e.target.value })}
										placeholder="City"
									/>
								</div>
								<div className="form-group">
									<label>Province *</label>
									<input
										type="text"
										value={newBranch.province}
										onChange={(e) => setNewBranch({ ...newBranch, province: e.target.value })}
										placeholder="Province"
									/>
								</div>
							</div>

							<button
								type="submit"
								className="primary-btn"
								style={{ marginTop: '15px' }}
								disabled={busyAction === 'create-branch'}
							>
								{busyAction === 'create-branch' ? 'Creating...' : 'Create Branch'}
							</button>
						</form>
					</div>

					<div className="systemadmin-card">
						<h3>
							Branches {selectedClinic ? `- ${selectedClinic.name}` : ''}
						</h3>

						{branchLoading ? <p>Loading branches...</p> : null}

						{!branchLoading && !selectedClinic ? <p>Select a clinic to view branches.</p> : null}

						{!branchLoading && selectedClinic && selectedClinicBranches.length === 0 ? (
							<p>No branches found for this clinic.</p>
						) : null}

						{!branchLoading && selectedClinic && selectedClinicBranches.length > 0 ? (
							<div className="systemadmin-table-wrap">
								<table className="systemadmin-table">
									<thead>
										<tr>
											<th>Branch</th>
											<th>Code</th>
											<th>Address</th>
											<th>Status</th>
											<th>Archived At</th>
										</tr>
									</thead>
									<tbody>
										{selectedClinicBranches.map((branch) => {
											const branchStatus = normalizeStatus(branch.status);
											const isArchived = hasArchivedTimestamp(branch);

											return (
												<tr key={branch.id}>
													<td>{branch.name}</td>
													<td>{branch.code || '-'}</td>
													<td>{branch.address || '-'}</td>
													<td>{branchStatus}</td>
													<td>{formatDateTime(branch.archived_at)}</td>
												</tr>
											);
										})}
									</tbody>
								</table>
							</div>
						) : null}
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
		<div className="systemadmin-stat-card">
			<p>{label}</p>
			<h4>{value}</h4>
		</div>
	);
}

export default SystemAdminClinicManagement;
