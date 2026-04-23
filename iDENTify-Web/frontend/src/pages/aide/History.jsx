import React, { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import "../../styles/pages/aide/History.css";
import StatusBadge from "../../components/StatusBadge";
import ConfirmationModal from "../../components/ConfirmationModal";
import useAppStore from "../../store/useAppStore";
import useApi from "../../hooks/useApi";
import apiClient from "../../api/apiClient";

function History({ pageTitle = "Patient History", forcedDentistId = null }) {
    const navigate = useNavigate();
    const api = useApi();
    const queue = useAppStore((state) => state.queue);
    const patients = useAppStore((state) => state.patients);
    const dentists = useAppStore((state) => state.dentists);
    const appointments = useAppStore((state) => state.appointments);

    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState(null);

    const [filters, setFilters] = useState({
        dentist: "all",
        procedure: "all",
        date: "", 
    });

    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    const hasForcedDentistScope = forcedDentistId !== null && forcedDentistId !== undefined && String(forcedDentistId).trim() !== "";

    const [allPayments, setAllPayments] = useState([]);

    useEffect(() => {
        const loadData = async () => {
            try {
                // FIXED: Request history data (all dates)
                const [qData, dents, pts, appts, payments] = await Promise.all([
                    api.loadQueue(true), 
                    api.loadDentists(),
                    api.loadPatients(),
                    api.loadAppointments(),
                    apiClient.getPayments({ startDate: '1970-01-01', endDate: '2100-01-01' })
                ]);
                setAllPayments(Array.isArray(payments) ? payments : []);
            } catch (e) {
                console.error("Failed to load history data", e);
            }
        };
        loadData();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const baseHistoryList = useMemo(() => {
        const queueDone = queue
            .filter((item) => item.status === "Done")
            .map((item) => {
                const patient = patients.find((p) => String(p.id) === String(item.patient_id));
                const patientName = patient ? (patient.full_name || patient.name) : (item.full_name || "Unknown");

                const dentist = dentists.find((d) => String(d.id) === String(item.dentist_id));
                const dentistName = dentist ? dentist.name : (item.dentist_name || "Unassigned");

                // Try to find actual services from payment record
                const linkedPayment = allPayments.find(p => 
                    (p.queue_id && String(p.queue_id) === String(item.id)) ||
                    (p.appointment_id && String(p.appointment_id) === String(item.appointment_id))
                );

                let procedureInfo = linkedPayment?.services_text || item.notes || "-";
                if (item.appointment_id && (!linkedPayment || !linkedPayment.services_text)) {
                    const linkedAppt = appointments.find(a => String(a.id) === String(item.appointment_id));
                    if (linkedAppt) {
                        procedureInfo = linkedAppt.procedure || linkedAppt.reason || item.notes || "-";
                    }
                }

                const dateObj = new Date(item.time_added || item.checkedInTime || 0);

                return {
                    ...item,
                    rawDate: dateObj,
                    name: patientName,
                    assignedDentist: dentistName,
                    procedureDisplay: procedureInfo,
                    source: 'queue'
                };
            });

        // Add Done appointments that might NOT be in the queue
        const appointmentsDone = appointments
            .filter((appt) => appt.status === "Done")
            .filter((appt) => !queue.some(q => q.appointment_id === appt.id)) // Avoid duplicates
            .map((appt) => {
                const patient = patients.find((p) => String(p.id) === String(appt.patient_id));
                const patientName = patient ? (patient.full_name || patient.name) : (appt.full_name || "Unknown");

                const dentist = dentists.find((d) => String(d.id) === String(appt.dentist_id));
                const dentistName = dentist ? dentist.name : (appt.dentist_name || "Unassigned");

                const linkedPayment = allPayments.find(p => String(p.appointment_id) === String(appt.id));
                let procedureInfo = linkedPayment?.services_text || appt.procedure || appt.reason || "-";

                const dateObj = new Date(appt.appointment_datetime || appt.created_at || 0);

                return {
                    ...appt,
                    rawDate: dateObj,
                    name: patientName,
                    assignedDentist: dentistName,
                    procedureDisplay: procedureInfo,
                    source: 'appointment'
                };
            });

        return [...queueDone, ...appointmentsDone]
            .filter((item) => {
                if (!hasForcedDentistScope) return true;
                return String(item.dentist_id || "") === String(forcedDentistId);
            })
            .sort((a, b) => b.rawDate - a.rawDate);
    }, [queue, patients, dentists, appointments, hasForcedDentistScope, forcedDentistId]);

    const uniqueProcedures = useMemo(() => {
        return Array.from(new Set(baseHistoryList.map(item => item.procedureDisplay).filter(p => p !== "-")));
    }, [baseHistoryList]);

    const uniqueDentists = useMemo(() => {
        return Array.from(new Set(baseHistoryList.map(item => item.assignedDentist)));
    }, [baseHistoryList]);

    const filteredHistory = useMemo(() => {
        return baseHistoryList.filter((item) => {
            const matchesDentist = filters.dentist === "all" || item.assignedDentist === filters.dentist;
            const matchesProcedure = filters.procedure === "all" || item.procedureDisplay === filters.procedure;

            let matchesDate = true;
            if (filters.date) {
                // FIXED: Use timezone-safe local date string for comparison
                const year = item.rawDate.getFullYear();
                const month = String(item.rawDate.getMonth() + 1).padStart(2, '0');
                const day = String(item.rawDate.getDate()).padStart(2, '0');
                const itemDateStr = `${year}-${month}-${day}`;
                matchesDate = itemDateStr === filters.date;
            }

            return matchesDentist && matchesProcedure && matchesDate;
        }).map((item, i) => ({ ...item, number: i + 1 }));
    }, [baseHistoryList, filters]);

    const indexOfLastItem = currentPage * rowsPerPage;
    const indexOfFirstItem = indexOfLastItem - rowsPerPage;
    const currentItems = filteredHistory.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredHistory.length / rowsPerPage);

    const handlePageChange = (pageNumber) => setCurrentPage(pageNumber);

    const handleRowsPerPageChange = (e) => {
        setRowsPerPage(Number(e.target.value));
        setCurrentPage(1);
    };

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
        setCurrentPage(1);
    };

    const handleUpdate = (queueItem) => {
        const fullPatientData = patients.find(p => String(p.id) === String(queueItem.patient_id));
        const appointmentPayload = {
            ...queueItem,
            dentist_id: queueItem.dentist_id,
            procedure: queueItem.procedureDisplay,
            timeStart: queueItem.time_added ? new Date(queueItem.time_added).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""
        };

        navigate(`/patients/${queueItem.patient_id}`, {
            state: {
                dentistId: queueItem.dentist_id,
                status: queueItem.status,
                patientData: fullPatientData,
                appointment: appointmentPayload
            }
        });
    };

    const handleDeleteClick = (item) => {
        setItemToDelete(item);
        setIsDeleteModalOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!itemToDelete) return;
        try {
            await api.deleteQueue(itemToDelete.id);
            toast.success("Removed record from history");
        } catch (err) {
            console.error("Failed to delete history item", err);
            toast.error("Failed to delete");
        } finally {
            setIsDeleteModalOpen(false);
            setItemToDelete(null);
        }
    };

    const formatDate = (dateObj) => {
        if (!dateObj) return "-";
        return dateObj.toLocaleDateString() + " " + dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="history-page">
            <div className="history-header">
                <h2 className="history-title">{pageTitle}</h2>
            </div>

            <div className="history-filters">
                <div className="filter-group">
                    <label htmlFor="date-filter">Date</label>
                    <input
                        type="date"
                        id="date-filter"
                        value={filters.date}
                        onChange={(e) => handleFilterChange("date", e.target.value)}
                        style={{ padding: '0.8rem', borderRadius: '8px', border: '1px solid #dee2e6' }}
                    />
                </div>

                {!hasForcedDentistScope ? (
                    <div className="filter-group">
                        <label htmlFor="dentist-filter">Dentist</label>
                        <select
                            id="dentist-filter"
                            value={filters.dentist}
                            onChange={(e) => handleFilterChange("dentist", e.target.value)}
                        >
                            <option value="all">All Dentists</option>
                            {uniqueDentists.map((d, i) => (
                                <option key={i} value={d}>{d}</option>
                            ))}
                        </select>
                    </div>
                ) : null}

                <div className="filter-group">
                    <label htmlFor="procedure-filter">Procedure</label>
                    <select
                        id="procedure-filter"
                        value={filters.procedure}
                        onChange={(e) => handleFilterChange("procedure", e.target.value)}
                    >
                        <option value="all">All Procedures</option>
                        {uniqueProcedures.map((p, i) => (
                            <option key={i} value={p}>{p}</option>
                        ))}
                    </select>
                </div>

                {(filters.date || (!hasForcedDentistScope && filters.dentist !== 'all') || filters.procedure !== 'all') && (
                    <div className="filter-group" style={{ justifyContent: 'flex-end' }}>
                        <label>&nbsp;</label>
                        <button
                            className="action-btn delete-btn"
                            style={{ margin: 0 }}
                            onClick={() => {
                                setFilters({ dentist: "all", procedure: "all", date: "" });
                            }}
                        >
                            Reset
                        </button>
                    </div>
                )}
            </div>

            <ConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleConfirmDelete}
                message={`Are you sure you want to delete the history record for ${itemToDelete?.name || 'this patient'}?`}
            />

            <div className="history-table-container">
                <table className="history-table">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Date/Time Added</th>
                            <th>Patient</th>
                            <th>Status</th>
                            <th>Assigned Dentist</th>
                            <th>Procedure / Reason</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {currentItems.length === 0 ? (
                            <tr><td colSpan="7" style={{ textAlign: 'center', padding: '2rem' }}>No records found matching your filters.</td></tr>
                        ) : (
                            currentItems.map((item) => (
                                <tr key={item.id} className="history-row">
                                    <td>{item.number}</td>
                                    <td>{formatDate(item.rawDate)}</td>
                                    <td>{item.name}</td>
                                    <td><StatusBadge status="Done" /></td>
                                    <td>{item.assignedDentist}</td>
                                    <td>
                                        <span style={{ fontWeight: 500, color: '#334155' }}>
                                            {item.procedureDisplay}
                                        </span>
                                    </td>
                                    <td>
                                        <button className="action-btn update-btn" onClick={() => handleUpdate(item)}>View</button>
                                        <button className="action-btn delete-btn" onClick={() => handleDeleteClick(item)}>Delete</button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>

                {filteredHistory.length > 0 && (
                    <div className="pagination-container">
                        <div className="rows-selector">
                            <span>Rows per page:</span>
                            <select value={rowsPerPage} onChange={handleRowsPerPageChange}>
                                <option value={5}>5</option>
                                <option value={10}>10</option>
                                <option value={20}>20</option>
                                <option value={50}>50</option>
                            </select>
                        </div>
                        <div className="page-controls">
                            <button className="page-btn" disabled={currentPage === 1} onClick={() => handlePageChange(currentPage - 1)}>Prev</button>
                            <span className="page-info">Page {currentPage} of {totalPages || 1}</span>
                            <button className="page-btn" disabled={currentPage === totalPages} onClick={() => handlePageChange(currentPage + 1)}>Next</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default History;