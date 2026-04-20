import React, { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../api/apiClient';
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

function SystemAdminArchive() {
	const [loading, setLoading] = useState(true);
	const [busyAction, setBusyAction] = useState('');
	const [clinics, setClinics] = useState([]);
	const [branchesByClinic, setBranchesByClinic] = useState({});
	const [search, setSearch] = useState('');

	const loadArchiveData = useCallback(async () => {
		setLoading(true);
		try {
			const clinicRows = await api.getClinics({ includeInactive: true });
			const normalizedClinics = Array.isArray(clinicRows) ? clinicRows : [];
			setClinics(normalizedClinics);

			const branchEntries = await Promise.all(
				normalizedClinics.map(async (clinic) => {
					try {
						const rows = await api.getClinicBranches(clinic.id, { includeInactive: true });
						return [String(clinic.id), Array.isArray(rows) ? rows : []];
					} catch {
						return [String(clinic.id), []];
					}
				})
			);

			setBranchesByClinic(Object.fromEntries(branchEntries));
		} catch (error) {
			toast.error(error?.message || 'Failed to load archive data.');
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		loadArchiveData();
	}, [loadArchiveData]);

	const needle = search.trim().toLowerCase();

	const archivedClinics = useMemo(() => (
		clinics.filter((clinic) => {
			if (!hasArchivedTimestamp(clinic)) return false;
			if (!needle) return true;
			return (
				String(clinic.name || '').toLowerCase().includes(needle)
				|| String(clinic.code || '').toLowerCase().includes(needle)
			);
		})
	), [clinics, needle]);

	const archivedBranches = useMemo(() => {
		const rows = [];
		clinics.forEach((clinic) => {
			const branchRows = branchesByClinic[String(clinic.id)] || [];
			branchRows.forEach((branch) => {
				if (!hasArchivedTimestamp(branch)) return;

				if (needle) {
					const matches =
						String(clinic.name || '').toLowerCase().includes(needle)
						|| String(branch.name || '').toLowerCase().includes(needle)
						|| String(branch.code || '').toLowerCase().includes(needle);
					if (!matches) return;
				}

				rows.push({
					clinic_id: clinic.id,
					clinic_name: clinic.name,
					...branch,
				});
			});
		});
		return rows;
	}, [clinics, branchesByClinic, needle]);

	const handleRestoreClinic = async (clinic) => {
		if (!clinic?.id) return;

		try {
			setBusyAction(`restore-clinic-${clinic.id}`);
			await api.restoreClinic(clinic.id);
			toast.success('Clinic restored successfully.');
			await loadArchiveData();
		} catch (error) {
			toast.error(error?.message || 'Failed to restore clinic.');
		} finally {
			setBusyAction('');
		}
	};

	const handleRestoreBranch = async (branch) => {
		const clinicId = branch?.clinic_id;
		const branchId = branch?.id;
		if (!clinicId || !branchId) return;

		try {
			setBusyAction(`restore-branch-${branchId}`);
			await api.restoreClinicBranch(clinicId, branchId);
			toast.success('Branch restored successfully.');
			await loadArchiveData();
		} catch (error) {
			toast.error(error?.message || 'Failed to restore branch.');
		} finally {
			setBusyAction('');
		}
	};

	return (
		<section className="systemadmin-page">
			<div className="systemadmin-header">
				<h2>Clinic Archive</h2>
				<p>Restore archived clinics and branches managed by system admin.</p>
			</div>

			<div className="systemadmin-card">
				<div className="systemadmin-field-row">
					<div className="systemadmin-field">
						<label htmlFor="archive-search">Search Archived Records</label>
						<input
							id="archive-search"
							type="search"
							value={search}
							onChange={(event) => setSearch(event.target.value)}
							placeholder="Search clinic or branch"
						/>
					</div>
				</div>
				<button type="button" onClick={loadArchiveData} disabled={loading}>
					{loading ? 'Refreshing...' : 'Refresh'}
				</button>
			</div>

			{loading ? <p className="systemadmin-loading">Loading archive records...</p> : null}

			{!loading ? (
				<>
					<div className="systemadmin-stats-grid">
						<StatCard label="Archived Clinics" value={archivedClinics.length} />
						<StatCard label="Archived Branches" value={archivedBranches.length} />
					</div>

					<div className="systemadmin-card">
						<h3>Archived Clinics</h3>
						{archivedClinics.length === 0 ? (
							<p>No archived clinics found.</p>
						) : (
							<div className="systemadmin-table-wrap">
								<table className="systemadmin-table">
									<thead>
										<tr>
											<th>Clinic</th>
											<th>Code</th>
											<th>Status</th>
											<th>Archived At</th>
											<th>Action</th>
										</tr>
									</thead>
									<tbody>
										{archivedClinics.map((clinic) => (
											<tr key={clinic.id}>
												<td>{clinic.name}</td>
												<td>{clinic.code || '-'}</td>
												<td>{clinic.status || '-'}</td>
												<td>{formatDateTime(clinic.archived_at)}</td>
												<td>
													<button
														type="button"
														className="secondary"
														onClick={() => handleRestoreClinic(clinic)}
														disabled={busyAction === `restore-clinic-${clinic.id}`}
													>
														{busyAction === `restore-clinic-${clinic.id}` ? 'Restoring...' : 'Restore'}
													</button>
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						)}
					</div>

					<div className="systemadmin-card">
						<h3>Archived Branches</h3>
						{archivedBranches.length === 0 ? (
							<p>No archived branches found.</p>
						) : (
							<div className="systemadmin-table-wrap">
								<table className="systemadmin-table">
									<thead>
										<tr>
											<th>Clinic</th>
											<th>Branch</th>
											<th>Code</th>
											<th>Status</th>
											<th>Archived At</th>
											<th>Action</th>
										</tr>
									</thead>
									<tbody>
										{archivedBranches.map((branch) => (
											<tr key={branch.id}>
												<td>{branch.clinic_name}</td>
												<td>{branch.name}</td>
												<td>{branch.code || '-'}</td>
												<td>{branch.status || '-'}</td>
												<td>{formatDateTime(branch.archived_at)}</td>
												<td>
													<button
														type="button"
														className="secondary"
														onClick={() => handleRestoreBranch(branch)}
														disabled={busyAction === `restore-branch-${branch.id}`}
													>
														{busyAction === `restore-branch-${branch.id}` ? 'Restoring...' : 'Restore'}
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

export default SystemAdminArchive;
