import React, { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import "../../styles/pages/aide/Queue.css";
import AddWalkInModal from "../../components/AddWalkInModal";
import StatusBadge from "../../components/StatusBadge";
import ConfirmationModal from "../../components/ConfirmationModal";
import useAppStore from "../../store/useAppStore";
import useApi from "../../hooks/useApi";

const averageTreatmentMinutes = 30;
const dentistAvailabilityMinutes = {
  "Dr. Paul Zaragoza": 0,
  "Dr. Erica Aquino": 10,
  "Dr. Hernane Benedicto": 5,
};

function Queue() {
  const navigate = useNavigate();
  const api = useApi();
  const queue = useAppStore((state) => state.queue || []);
  const patients = useAppStore((state) => state.patients || []);
  const dentists = useAppStore((state) => state.dentists || []);
  const appointments = useAppStore((state) => state.appointments || []);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [draggingId, setDraggingId] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        await Promise.all([
          api.loadQueue(),
          api.loadDentists(),
          api.loadPatients(),
          api.loadAppointments()
        ]);
      } catch (e) {
        console.error("Failed to load queue data", e);
      }
    };
    loadData();
  }, []);

  const handleAddWalkIn = async (patientData) => {
    try {
      const patientPayload = {
        full_name: patientData.full_name,
        gender: patientData.sex,
        contact_number: patientData.contact,
        medicalAlerts: [],
        vitals: { age: patientData.age }
      };

      const createdPatient = await api.createPatient(patientPayload);
      const patientId = createdPatient?.id;

      if (!patientId) throw new Error("Failed to create patient ID");

      const dentistObj = dentists.find(d => d.name === patientData.assignedDentist);

      const now = new Date();
      const pad = (n) => (n < 10 ? '0' + n : n);
      const mysqlDateTime = now.getFullYear() + '-' +
             pad(now.getMonth() + 1) + '-' +
             pad(now.getDate()) + ' ' +
             pad(now.getHours()) + ':' +
             pad(now.getMinutes()) + ':' +
             pad(now.getSeconds());

      await api.addQueue({
        patient_id: patientId,
        appointment_id: null,
        dentist_id: dentistObj ? dentistObj.id : null,
        source: "walk-in",
        status: "Checked-In",
        notes: patientData.notes || "",
        time_added: mysqlDateTime,
      });

      toast.success("Walk-in patient added to queue.");
      setIsModalOpen(false);
      await api.loadQueue(); 

    } catch (err) {
      console.error('Failed to add walk-in', err);
      toast.error("Failed to add walk-in.");
    }
  };

  const calculateWaitingTime = (index, dentistName) => {
    const availabilityOffset = dentistAvailabilityMinutes[dentistName] || 0;
    const minutes = index * averageTreatmentMinutes + availabilityOffset;
    return minutes <= 0 ? "Now" : `${minutes} min`;
  };

  const handleAction = (queueItem) => {
    const fullPatientData = patients.find(p => String(p.id) === String(queueItem.patient_id));

    let procedureInfo = queueItem.notes;
    if (queueItem.appointment_id) {
      const linkedAppt = appointments.find(a => String(a.id) === String(queueItem.appointment_id));
      if (linkedAppt && linkedAppt.reason) {
        procedureInfo = linkedAppt.reason;
      }
    }

    const dentistObj = dentists.find(d => String(d.id) === String(queueItem.dentist_id));
    const finalDentistId = dentistObj ? dentistObj.id : queueItem.dentist_id;
    const assignedDentistName = dentistObj ? dentistObj.name : "Unassigned";

    const appointmentPayload = {
      ...queueItem,
      dentist_id: finalDentistId,
      procedure: procedureInfo,
      timeStart: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    navigate(`/app/patient/${queueItem.patient_id}/`, {
      state: {
        dentistId: finalDentistId,
        assignedDentistName: assignedDentistName,
        status: queueItem.status,
        patientData: fullPatientData,
        appointment: appointmentPayload
      }
    });
  };

  const handleStatusChange = async (id, status) => {
    try {
      await api.updateQueueItem(id, { status });
    } catch (err) {
      console.error('Failed to update queue status', err);
    }
  };

  const handleDeleteClick = (item) => {
    setItemToDelete(item);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      await api.deleteQueue(itemToDelete.id);
    } catch (err) {
      console.error("Failed to delete queue item", err);
    } finally {
      setIsDeleteModalOpen(false);
      setItemToDelete(null);
    }
  };

  const handleDragStart = (id) => setDraggingId(id);
  const handleDragOver = (e) => e.preventDefault();
  const handleDrop = () => { };

  const calculateWaitingTimeSince = (timeAdded) => {
    if (!timeAdded) return "--";
    const safeTime = String(timeAdded).replace(' ', 'T');
    const checkedIn = new Date(safeTime);
    if (isNaN(checkedIn.getTime())) return "--";
    
    const diff = new Date() - checkedIn;
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "Just now";
    return `${minutes} min ago`;
  };

  const queueWithDetails = useMemo(
    () => {
      const sortedForNumbering = [...queue]
        .filter(q => q.status !== 'Cancelled')
        .sort((a, b) => {
            const timeA = a.time_added ? new Date(String(a.time_added).replace(' ', 'T')).getTime() : 0;
            const timeB = b.time_added ? new Date(String(b.time_added).replace(' ', 'T')).getTime() : 0;
            return timeA - timeB;
        });

      const ticketMap = new Map();
      sortedForNumbering.forEach((item, index) => {
        ticketMap.set(item.id, index + 1);
      });

      return queue
        .filter((item) => item.status !== "Done")
        .map((item, index) => {
          const patient = patients.find((p) => String(p.id) === String(item.patient_id));
          const patientName = patient ? (patient.name || patient.full_name) : (item.full_name || "Unknown");

          const dentist = dentists.find((d) => String(d.id) === String(item.dentist_id));
          const dentistName = dentist ? dentist.name : "Unassigned";

          return {
            ...item,
            number: ticketMap.get(item.id) || (index + 1),
            name: patientName,
            assignedDentist: dentistName,
            waitingTime: calculateWaitingTime(index, dentistName),
          };
        });
    },
    [queue, patients, dentists]
  );

  return (
    <div className="queue-page">
      <div className="queue-header">
        <h2 className="queue-title">Queue List</h2>
        <div className="queue-actions">
          <button className="add-walk-in-btn" onClick={() => setIsModalOpen(true)}>
            Add Walk-In Patient
          </button>
        </div>
      </div>
      {/* <div className="queue-legend">
        <StatusBadge status="Checked-In" />
        <StatusBadge status="Waiting" />
        <StatusBadge status="On Chair" />
        <StatusBadge status="Treatment" />
        <StatusBadge status="Payment / Billing" />
        <StatusBadge status="No-Show" />
        <StatusBadge status="Cancelled" />
      </div> */}

      <AddWalkInModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAddPatient={handleAddWalkIn}
      />

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        message={`Are you sure you want to remove ${itemToDelete?.name || 'this patient'} from the queue?`}
      />

      <div className="queue-table-container">
        <table className="queue-table">
          <thead>
            <tr>
              <th></th>
              <th>#</th>
              <th>Patient</th>
              <th>Status</th>
              <th>Assigned Dentist</th>
              <th>Est. Wait</th>
              <th>Waiting Info</th>
              <th>Notes (staff)</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {queueWithDetails.length === 0 ? (
              <tr><td colSpan="9" style={{ textAlign: 'center', padding: '2rem' }}>No patients in active queue.</td></tr>
            ) : (
              queueWithDetails.map((q) => (
                <tr
                  key={q.id}
                  className={`queue-row ${draggingId === q.id ? "is-dragging" : ""}`}
                  draggable
                  onDragStart={() => handleDragStart(q.id)}
                  onDragOver={handleDragOver}
                  onDrop={() => handleDrop(q.id)}
                >
                  <td className="drag-handle">⋮⋮</td>
                  <td>{q.number.toString().padStart(2, "0")}</td>
                  <td>{q.name}</td>
                  <td>
                    <select
                      className="status-select"
                      value={q.status}
                      onChange={(e) => handleStatusChange(q.id, e.target.value)}
                    >
                      <option value="Checked-In">Checked-In</option>
                      <option value="Waiting">Waiting</option>
                      <option value="On Chair">On Chair</option>
                      <option value="Treatment">Treatment</option>
                      <option value="Payment / Billing">Payment / Billing</option>
                      <option value="Done">Done</option>
                      <option value="No-Show">No-Show</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </td>
                  <td>{q.assignedDentist}</td>
                  <td><span className="wait-chip">{q.waitingTime}</span></td>
                  <td>Checked in: {calculateWaitingTimeSince(q.time_added)}</td>
                  <td>
                    <div className="staff-note">{q.notes || '-'}</div>
                  </td>
                  <td>
                    <button
                      className="action-btn"
                      onClick={() => handleAction(q)}
                      disabled={q.status === "Cancelled"}
                      style={q.status === "Cancelled" ? { backgroundColor: '#9ca3af', cursor: 'not-allowed' } : {}}
                      title={q.status === "Cancelled" ? "Cannot start cancelled appointment" : "Start Treatment"}
                    >
                      Start
                    </button>
                    <button
                      className="action-btn"
                      style={{ marginLeft: '0.5rem', backgroundColor: '#dc3545' }}
                      onClick={() => handleDeleteClick(q)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Queue;