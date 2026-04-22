import React, { useState, useEffect } from 'react';
import '../styles/components/ConfirmationModal.css';

const PromptModal = ({ isOpen, onClose, onConfirm, title, message, placeholder, initialValue = '' }) => {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    if (isOpen) {
      setValue(initialValue);
    }
  }, [isOpen, initialValue]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm(value);
    setValue('');
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h2>{title}</h2>
        <p>{message}</p>
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
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
        />
        <div className="form-actions">
          <button type="button" onClick={onClose} style={{ backgroundColor: '#f1f5f9', color: '#475569' }}>
            Cancel
          </button>
          <button 
            type="button" 
            onClick={handleConfirm}
            style={{ backgroundColor: '#3b82f6', color: 'white' }}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

export default PromptModal;
