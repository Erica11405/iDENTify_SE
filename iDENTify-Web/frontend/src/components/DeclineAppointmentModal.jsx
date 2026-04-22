import React, { useState } from 'react';
import '../styles/components/ConfirmationModal.css';

const DeclineAppointmentModal = ({ isOpen, onClose, onConfirm, appointmentId }) => {
  const [reason, setReason] = useState('');

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (!reason.trim()) return;
    onConfirm(appointmentId, reason);
    setReason('');
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h2>Decline Appointment</h2>
        <p>Please provide a reason for declining this appointment:</p>
        <textarea
          style={{
            width: '100%',
            minHeight: '80px',
            padding: '8px',
            borderRadius: '4px',
            border: '1px solid #ddd',
            marginBottom: '10px',
            fontFamily: 'inherit'
          }}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason for declining..."
        />
        <div className="form-actions">
          <button type="button" onClick={onClose}>
            Cancel
          </button>
          <button 
            type="button" 
            onClick={handleConfirm}
            style={{ backgroundColor: '#e74c3c', color: 'white' }}
            disabled={!reason.trim()}
          >
            Decline
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeclineAppointmentModal;
