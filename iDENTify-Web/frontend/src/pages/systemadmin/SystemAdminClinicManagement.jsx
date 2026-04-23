import React, { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../api/apiClient';
import useAppStore from '../../store/useAppStore';
import ConfirmationModal from '../../components/ConfirmationModal';
import '../../styles/pages/systemadmin/SystemAdminClinicManagement.css';

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
	const user = useAppStore((state) => state.user);
	const [loading, setLoading] = useState(true);
	const [clinics, setClinics] = useState([]);
	const [branchesByClinic, setBranchesByClinic] = useState({});
	const [selectedClinicId, setSelectedClinicId] = useState('');
	const [branchLoading, setBranchLoading] = useState(false);
	const [busyAction, setBusyAction] = useState('');

	const [newClinic, setNewClinic] = useState({ name: '' });

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
			return;
		}

		const visibleClinics = normalizedRows.filter(c => !hasArchivedTimestamp(c));
		
		const currentSelectionExists = visibleClinics.some((item) => String(item.id) === String(selectedClinicId));
		const fallbackClinicId = visibleClinics.length > 0 ? String(visibleClinics[0].id) : '';

		if (!currentSelectionExists) {
			setSelectedClinicId(fallbackClinicId);
		}
	}, [selectedClinicId]);

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

	const visibleClinics = useMemo(() => {
		return clinics.filter(c => !hasArchivedTimestamp(c));
	}, [clinics]);

	const selectedClinic = useMemo(
		() => visibleClinics.find((item) => String(item.id) === String(selectedClinicId)) || null,
		[visibleClinics, selectedClinicId]
	);

	const selectedClinicBranches = selectedClinicId
		? (branchesByClinic[selectedClinicId] || [])
		: [];

	const summary = useMemo(() => {
		const totals = {
			total: clinics.length,
			active: 0,
			archived: 0,
		};

		clinics.forEach((item) => {
			if (hasArchivedTimestamp(item)) totals.archived += 1;
			else totals.active += 1;
		});

		return totals;
	}, [clinics]);

	const setBusy = (value) => setBusyAction(String(value || ''));

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
			setNewClinic({ name: '' });
			await loadClinics();
		} catch (error) {
			toast.error(error?.message || 'Failed to create clinic.');
		} finally {
			setBusy('');
		}
	};

	return (
		<section className="systemadmin-page">
			<div className="systemadmin-header">
				<h2>Clinic Management</h2>
				<p>Manage clinic lifecycle.</p>
			</div>

			{loading ? <p className="systemadmin-loading">Loading clinic records...</p> : null}

			{!loading ? (
				<>
					<div className="systemadmin-stats-grid">
						<StatCard label="Total Clinics" value={summary.total} />
						<StatCard label="Active" value={summary.active} />
						<StatCard label="Archived" value={summary.archived} />
					</div>

					<div className="systemadmin-card">
						<h3>Clinics</h3>
						{visibleClinics.length === 0 ? (
							<p>No active clinics found.</p>
						) : (
							<div className="systemadmin-table-wrap">
								<table className="systemadmin-table">
									<thead>
										<tr>
											<th>Clinic</th>
											<th>Status</th>
											<th>Archived At</th>
											<th>Actions</th>
										</tr>
									</thead>
									<tbody>
										{visibleClinics.map((clinic) => {
											const isArchived = hasArchivedTimestamp(clinic);
											const displayStatus = isArchived ? 'Deactivated' : 'Active';

											return (
												<tr
													key={clinic.id}
													className={String(selectedClinicId) === String(clinic.id) ? 'selected-row' : ''}
													onClick={() => setSelectedClinicId(String(clinic.id))}
												>
													<td>{clinic.name}</td>
													<td>
														<span className={`status-pill ${isArchived ? 'archived' : 'active'}`}>
															{displayStatus}
														</span>
													</td>
													<td>{formatDateTime(clinic.archived_at)}</td>
													<td>
														<div className="systemadmin-actions-inline">
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
											<th>Address</th>
											<th>Status</th>
											<th>Archived At</th>
										</tr>
									</thead>
									<tbody>
										{selectedClinicBranches.map((branch) => {
											const isArchived = hasArchivedTimestamp(branch);
											const displayStatus = isArchived ? 'Deactivated' : 'Active';

											return (
												<tr key={branch.id}>
													<td>{branch.name}</td>
													<td>{branch.address || '-'}</td>
													<td>{displayStatus}</td>
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