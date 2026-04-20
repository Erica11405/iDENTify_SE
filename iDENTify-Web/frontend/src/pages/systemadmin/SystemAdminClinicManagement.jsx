import React, { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../api/apiClient';
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
	const [newBranch, setNewBranch] = useState({ clinicId: '', name: '', code: '' });

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

	const handleCreateClinic = async (event) => {
		event.preventDefault();
		const name = String(newClinic.name || '').trim();
		const code = String(newClinic.code || '').trim();

		if (!name) {
			toast.error('Clinic name is required.');
			return;
		}

		try {
			setBusy('create-clinic');
			await api.createClinic({ name, code: code || undefined });
			toast.success('Clinic created successfully.');
			setNewClinic({ name: '', code: '' });
			await loadClinics();
		} catch (error) {
			toast.error(error?.message || 'Failed to create clinic.');
		} finally {
			setBusy('');
		}
	};

	const handleCreateBranch = async (event) => {
		event.preventDefault();
		const clinicId = String(newBranch.clinicId || '').trim();
		const name = String(newBranch.name || '').trim();
		const code = String(newBranch.code || '').trim();

		if (!clinicId) {
			toast.error('Select a clinic before adding a branch.');
			return;
		}
		if (!name) {
			toast.error('Branch name is required.');
			return;
		}

		try {
			setBusy('create-branch');
			await api.createClinicBranch(clinicId, { name, code: code || undefined });
			toast.success('Branch created successfully.');
			setNewBranch((prev) => ({ ...prev, name: '', code: '' }));
			await Promise.all([loadClinics(), loadBranches(clinicId)]);
			setSelectedClinicId(clinicId);
		} catch (error) {
			toast.error(error?.message || 'Failed to create branch.');
		} finally {
			setBusy('');
		}
	};

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

	const handleArchiveClinic = async (clinic) => {
		if (!clinic?.id) return;
		const confirmed = window.confirm(`Archive clinic "${clinic.name}"?`);
		if (!confirmed) return;

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
		}
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

	const handleApplyBranchStatus = async (branch) => {
		const clinicId = selectedClinic?.id;
		const branchId = branch?.id;
		if (!clinicId || !branchId) return;

		const draft = branchStatusDrafts[branchId] || normalizeStatus(branch.status);

		try {
			setBusy(`branch-status-${branchId}`);
			await api.updateClinicBranchStatus(clinicId, branchId, { status: draft });
			toast.success('Branch status updated.');
			await Promise.all([loadClinics(), loadBranches(String(clinicId))]);
		} catch (error) {
			toast.error(error?.message || 'Failed to update branch status.');
		} finally {
			setBusy('');
		}
	};

	const handleArchiveBranch = async (branch) => {
		const clinicId = selectedClinic?.id;
		if (!clinicId || !branch?.id) return;
		const confirmed = window.confirm(`Archive branch "${branch.name}"?`);
		if (!confirmed) return;

		try {
			setBusy(`branch-archive-${branch.id}`);
			await api.archiveClinicBranch(clinicId, branch.id);
			toast.success('Branch archived.');
			await Promise.all([loadClinics(), loadBranches(String(clinicId))]);
		} catch (error) {
			toast.error(error?.message || 'Failed to archive branch.');
		} finally {
			setBusy('');
		}
	};

	const handleRestoreBranch = async (branch) => {
		const clinicId = selectedClinic?.id;
		if (!clinicId || !branch?.id) return;

		try {
			setBusy(`branch-restore-${branch.id}`);
			await api.restoreClinicBranch(clinicId, branch.id);
			toast.success('Branch restored.');
			await Promise.all([loadClinics(), loadBranches(String(clinicId))]);
		} catch (error) {
			toast.error(error?.message || 'Failed to restore branch.');
		} finally {
			setBusy('');
		}
	};

	return (
		<section className="systemadmin-page">
			<div className="systemadmin-header">
				<h2>Clinic Management</h2>
				<p>Manage clinic and branch lifecycle, plus create new clinic structures.</p>
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

					<div className="systemadmin-card-grid">
						<div className="systemadmin-card">
							<h3>Create Clinic</h3>
							<form onSubmit={handleCreateClinic}>
								<div className="systemadmin-field-row">
									<div className="systemadmin-field">
										<label htmlFor="new-clinic-name">Clinic Name</label>
										<input
											id="new-clinic-name"
											type="text"
											value={newClinic.name}
											onChange={(event) => setNewClinic((prev) => ({ ...prev, name: event.target.value }))}
											placeholder="Clinic name"
										/>
									</div>
									<div className="systemadmin-field">
										<label htmlFor="new-clinic-code">Clinic Code (Optional)</label>
										<input
											id="new-clinic-code"
											type="text"
											value={newClinic.code}
											onChange={(event) => setNewClinic((prev) => ({ ...prev, code: event.target.value }))}
											placeholder="Code"
										/>
									</div>
								</div>
								<button type="submit" disabled={busyAction === 'create-clinic'}>
									{busyAction === 'create-clinic' ? 'Creating...' : 'Create Clinic'}
								</button>
							</form>
						</div>

						<div className="systemadmin-card">
							<h3>Create Branch</h3>
							<form onSubmit={handleCreateBranch}>
								<div className="systemadmin-field-row">
									<div className="systemadmin-field">
										<label htmlFor="new-branch-clinic">Clinic</label>
										<select
											id="new-branch-clinic"
											value={newBranch.clinicId}
											onChange={(event) => setNewBranch((prev) => ({ ...prev, clinicId: event.target.value }))}
										>
											{clinics.map((clinic) => (
												<option key={clinic.id} value={clinic.id}>{clinic.name}</option>
											))}
										</select>
									</div>
									<div className="systemadmin-field">
										<label htmlFor="new-branch-name">Branch Name</label>
										<input
											id="new-branch-name"
											type="text"
											value={newBranch.name}
											onChange={(event) => setNewBranch((prev) => ({ ...prev, name: event.target.value }))}
											placeholder="Branch name"
										/>
									</div>
									<div className="systemadmin-field">
										<label htmlFor="new-branch-code">Branch Code (Optional)</label>
										<input
											id="new-branch-code"
											type="text"
											value={newBranch.code}
											onChange={(event) => setNewBranch((prev) => ({ ...prev, code: event.target.value }))}
											placeholder="Code"
										/>
									</div>
								</div>
								<button type="submit" disabled={busyAction === 'create-branch'}>
									{busyAction === 'create-branch' ? 'Creating...' : 'Create Branch'}
								</button>
							</form>
						</div>
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
											<th>Status</th>
											<th>Archived At</th>
											<th>Actions</th>
										</tr>
									</thead>
									<tbody>
										{selectedClinicBranches.map((branch) => {
											const branchStatus = normalizeStatus(branch.status);
											const draftStatus = branchStatusDrafts[branch.id] || branchStatus;
											const isArchived = hasArchivedTimestamp(branch);

											return (
												<tr key={branch.id}>
													<td>{branch.name}</td>
													<td>{branch.code || '-'}</td>
													<td>
														<select
															value={draftStatus}
															onChange={(event) => setBranchStatusDrafts((prev) => ({
																...prev,
																[branch.id]: event.target.value,
															}))}
														>
															{STATUS_OPTIONS.map((option) => (
																<option key={option} value={option}>{option}</option>
															))}
														</select>
													</td>
													<td>{formatDateTime(branch.archived_at)}</td>
													<td>
														<div className="systemadmin-actions-inline">
															<button
																type="button"
																onClick={() => handleApplyBranchStatus(branch)}
																disabled={busyAction === `branch-status-${branch.id}`}
															>
																{busyAction === `branch-status-${branch.id}` ? 'Saving...' : 'Apply'}
															</button>

															{!isArchived ? (
																<button
																	type="button"
																	className="danger"
																	onClick={() => handleArchiveBranch(branch)}
																	disabled={busyAction === `branch-archive-${branch.id}`}
																>
																	{busyAction === `branch-archive-${branch.id}` ? 'Archiving...' : 'Archive'}
																</button>
															) : (
																<button
																	type="button"
																	className="secondary"
																	onClick={() => handleRestoreBranch(branch)}
																	disabled={busyAction === `branch-restore-${branch.id}`}
																>
																	{busyAction === `branch-restore-${branch.id}` ? 'Restoring...' : 'Restore'}
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
						) : null}
					</div>
				</>
			) : null}
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
