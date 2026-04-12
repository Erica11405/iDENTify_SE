import React, { useState } from 'react';
import '../styles/components/EditDentistModal.css'; 
import api from '../api/apiClient';
import toast from 'react-hot-toast';

const DAYS = [
  { label: "S", value: 0 }, { label: "M", value: 1 }, { label: "T", value: 2 },
  { label: "W", value: 3 }, { label: "TH", value: 4 }, { label: "F", value: 5 }, { label: "S", value: 6 },
];

const EditDentistModal = ({ dentist, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  
  // Pre-fill the form with the dentist's existing data
  const [formData, setFormData] = useState({
    first_name: dentist?.first_name || '',
    middle_name: dentist?.middle_name || '',
    last_name: dentist?.last_name || '',
    specialization: dentist?.specialization || '',
    phone: dentist?.phone || '',
    email: dentist?.email || '',
    days: dentist?.days || [1, 2, 3, 4, 5],
    operatingHours: dentist?.operatingHours || { start: "09:00", end: "17:00" },
    lunch: dentist?.lunch || { start: "12:00", end: "13:00" },
    breaks: dentist?.breaks || [],
    leaveDays: dentist?.leaveDays || [],
    status: dentist?.status || "Available"
  });

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const toggleWorkingDay = (dayValue) => {
    const currentDays = formData.days || [];
    let newDays = currentDays.includes(dayValue) 
        ? currentDays.filter(d => d !== dayValue) 
        : [...currentDays, dayValue].sort();
    setFormData({ ...formData, days: newDays });
  };

  const handleTimeChange = (section, field, value) => {
    setFormData(prev => ({ ...prev, [section]: { ...prev[section], [field]: value } }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Call the UPDATE API instead of the CREATE API
      await api.updateDentist(dentist.id, formData); 
      toast.success('Dentist updated successfully!');
      
      if (onSuccess) onSuccess();
      if (onClose) onClose();
    } catch (err) {
      console.error("Update Dentist Error:", err);
      toast.error("Failed to update dentist.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content modal-wide">
        <div className="modal-header">
          <h2>Edit Dentist Profile</h2>
          <button className="close-button" onClick={onClose}>&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-section">
            <h3>Personal Details</h3>
            <div className="form-row">
              <div className="form-group">
                <label>First Name</label>
                <input name="first_name" value={formData.first_name} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label>Middle Name (Optional)</label>
                <input name="middle_name" value={formData.middle_name} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label>Last Name</label>
                <input name="last_name" value={formData.last_name} onChange={handleChange} required />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Specialization</label>
                <select name="specialization" value={formData.specialization} onChange={handleChange} required>
                  <option value="">Select Specialization</option>
                  <option value="General Dentist">General Dentist</option>
                  <option value="Orthodontist">Orthodontist</option>
                  <option value="Periodontist">Periodontist</option>
                  <option value="Oral Surgeon">Oral Surgeon</option>
                  <option value="Pediatric Dentist">Pediatric Dentist</option>
                  <option value="Endodontist">Endodontist</option>
                </select>
              </div>
              <div className="form-group">
                <label>Phone</label>
                <input name="phone" value={formData.phone} onChange={handleChange} required />
              </div>
            </div>
            
            <div className="form-group">
              <label>Email</label>
              <input name="email" type="email" value={formData.email} onChange={handleChange} required />
            </div>
          </div>

          <hr className="divider" />

          <div className="form-section schedule-section">
            <h3>Schedule Configuration</h3>
            
            <div className="form-group">
              <label>Working Days</label>
              <div className="days-selector">
                {DAYS.map((day) => (
                  <button
                    key={day.value}
                    type="button"
                    className={`day-toggle ${formData.days.includes(day.value) ? 'active' : ''}`}
                    onClick={() => toggleWorkingDay(day.value)}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Operating Hours</label>
                <div className="time-range">
                  <input type="time" value={formData.operatingHours.start} onChange={(e) => handleTimeChange('operatingHours', 'start', e.target.value)} />
                  <span>to</span>
                  <input type="time" value={formData.operatingHours.end} onChange={(e) => handleTimeChange('operatingHours', 'end', e.target.value)} />
                </div>
              </div>
              <div className="form-group">
                <label>Lunch Break</label>
                <div className="time-range">
                  <input type="time" value={formData.lunch.start} onChange={(e) => handleTimeChange('lunch', 'start', e.target.value)} />
                  <span>to</span>
                  <input type="time" value={formData.lunch.end} onChange={(e) => handleTimeChange('lunch', 'end', e.target.value)} />
                </div>
              </div>
            </div>

            <div className="modal-actions">
              <button type="button" className="btn-cancel" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn-submit" disabled={loading}>
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditDentistModal;