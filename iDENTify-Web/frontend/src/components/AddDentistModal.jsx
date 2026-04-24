import React, { useState } from 'react';
import '../styles/components/AddDentistModal.css';
import api from '../api/apiClient';

const DAYS = [
  { label: "S", value: 0 },
  { label: "M", value: 1 },
  { label: "T", value: 2 },
  { label: "W", value: 3 },
  { label: "TH", value: 4 },
  { label: "F", value: 5 },
  { label: "S", value: 6 },
];

const AddDentistModal = ({ onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [sentEmail, setSentEmail] = useState('');
  const [dentistTypes, setDentistTypes] = useState([]);
  
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    specializations: ['General Dentist'],
    phone: '',
    email: '',
    days: [1, 2, 3, 4, 5], 
    operatingHours: { start: "09:00", end: "17:00" },
    lunch: { start: "12:00", end: "13:00" },
    breaks: [],
    leaveDays: [],
    status: "Available"
  });

  useEffect(() => {
    const loadTypes = async () => {
      try {
        const types = await api.getDentistTypes();
        setDentistTypes(Array.isArray(types) ? types : []);
      } catch (err) {
        console.error("Failed to load dentist types:", err);
      }
    };
    loadTypes();
  }, []);

  const [specDraft, setSpecDraft] = useState("");

  const addSpecialization = () => {
    if (!specDraft) return;
    if (formData.specializations.includes(specDraft)) return;
    setFormData(prev => ({
      ...prev,
      specializations: [...prev.specializations, specDraft]
    }));
    setSpecDraft("");
  };

  const removeSpecialization = (spec) => {
    setFormData(prev => ({
      ...prev,
      specializations: prev.specializations.filter(s => s !== spec)
    }));
  };

  const [breakDraft, setBreakDraft] = useState({ start: "", end: "" });
  const [leaveDraft, setLeaveDraft] = useState("");

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const toggleWorkingDay = (dayValue) => {
    const currentDays = formData.days || [];
    let newDays;
    if (currentDays.includes(dayValue)) {
      newDays = currentDays.filter(d => d !== dayValue);
    } else {
      newDays = [...currentDays, dayValue].sort();
    }
    setFormData({ ...formData, days: newDays });
  };

  const handleTimeChange = (section, field, value) => {
    setFormData(prev => ({
      ...prev,
      [section]: { ...prev[section], [field]: value }
    }));
  };

  const addBreak = () => {
    if (!breakDraft.start || !breakDraft.end) return;
    setFormData(prev => ({
      ...prev,
      breaks: [...prev.breaks, { label: "Break", ...breakDraft }]
    }));
    setBreakDraft({ start: "", end: "" });
  };

  const removeBreak = (index) => {
    setFormData(prev => ({
      ...prev,
      breaks: prev.breaks.filter((_, i) => i !== index)
    }));
  };

  const addLeaveDay = () => {
    if (!leaveDraft) return;
    if (formData.leaveDays.includes(leaveDraft)) return;
    setFormData(prev => ({
      ...prev,
      leaveDays: [...prev.leaveDays, leaveDraft]
    }));
    setLeaveDraft("");
  };

  const removeLeaveDay = (dayToRemove) => {
    setFormData(prev => ({
      ...prev,
      leaveDays: prev.leaveDays.filter(d => d !== dayToRemove)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const payload = {
      first_name: formData.first_name,
      last_name: formData.last_name,
      name: `${formData.first_name} ${formData.last_name}`, 
      specialization: formData.specializations.join(", "),
      phone: formData.phone,
      email: formData.email,
      days: formData.days,
      operatingHours: formData.operatingHours,
      lunch: formData.lunch,
      breaks: formData.breaks,
      leaveDays: formData.leaveDays,
      status: formData.status
    };

    try {
      await api.createDentist(payload); 
      setSentEmail(formData.email);
      setSuccess(true);
      
      if (onSuccess) {
        onSuccess();
      }

    } catch (err) {
      console.error("Add Dentist Error:", err);
      setError(err.message || "Failed to add dentist. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="modal-overlay">
        <div className="modal-content text-center" style={{ maxWidth: '400px', textAlign: 'center', padding: '40px 20px' }}>
          <div className="success-icon" style={{ fontSize: '50px', color: '#2ecc71', marginBottom: '20px' }}>
            <i className="fas fa-check-circle"></i>
          </div>
          <h2 style={{ marginBottom: '15px' }}>Credentials Sent!</h2>
          <p style={{ color: '#666', marginBottom: '25px', lineHeight: '1.5' }}>
            Account has been created successfully. Login credentials have been sent to <strong>{sentEmail}</strong>.
          </p>
          <button 
            className="btn-submit" 
            onClick={onClose}
            style={{ width: '100%', padding: '12px' }}
          >
            Got it
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content modal-wide">
        <div className="modal-header">
          <h2>Add New Dentist</h2>
          <button className="close-button" onClick={onClose}>&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {error && <div className="error-banner">{error}</div>}
          
          <div className="form-section">
            <h3>Personal Details</h3>
            <div className="form-row">
              <div className="form-group">
                <label>First Name</label>
                <input name="first_name" value={formData.first_name} onChange={handleChange} required placeholder="Ex. Juan" />
              </div>
              <div className="form-group">
                <label>Last Name</label>
                <input name="last_name" value={formData.last_name} onChange={handleChange} required placeholder="Ex. Dela Cruz" />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Specializations</label>
                <div className="chips-container" style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '8px' }}>
                  {formData.specializations.map((s, idx) => (
                    <div className="chip" key={idx} style={{ background: '#e0f2fe', color: '#0369a1', padding: '2px 10px', borderRadius: '15px', fontSize: '0.85rem', display: 'flex', alignItems: 'center' }}>
                      {s}
                      <button type="button" onClick={() => removeSpecialization(s)} style={{ border: 'none', background: 'none', marginLeft: '6px', cursor: 'pointer', fontWeight: 'bold', color: '#0369a1' }}>&times;</button>
                    </div>
                  ))}
                </div>
                <div className="add-row" style={{ display: 'flex', gap: '8px' }}>
                  <select 
                    value={specDraft} 
                    onChange={(e) => setSpecDraft(e.target.value)}
                    style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                  >
                    <option value="">Add Specialization</option>
                    {dentistTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                    {dentistTypes.length === 0 && (
                      <>
                        <option value="General Dentist">General Dentist</option>
                        <option value="Orthodontist">Orthodontist</option>
                        <option value="Periodontist">Periodontist</option>
                        <option value="Oral Surgeon">Oral Surgeon</option>
                        <option value="Endodontist">Endodontist</option>
                        <option value="Pediatric Dentist">Pediatric Dentist</option>
                      </>
                    )}
                  </select>
                  <button type="button" className="btn-small-add" onClick={addSpecialization} style={{ padding: '0 15px', background: '#3498db', color: 'white', border: 'none', borderRadius: '4px' }}>Add</button>
                </div>
              </div>
              <div className="form-group">
                <label>Phone</label>
                <input name="phone" value={formData.phone} onChange={handleChange} required placeholder="0912..." />
              </div>
            </div>
            
            <div className="form-group">
              <label>Email</label>
              <input name="email" type="email" value={formData.email} onChange={handleChange} required placeholder="doctor@clinic.com" />
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

            <div className="form-group">
              <label>Additional Breaks</label>
              <div className="chips-container">
                {formData.breaks.map((b, idx) => (
                  <div className="chip" key={idx}>
                    {b.start} - {b.end}
                    <button type="button" onClick={() => removeBreak(idx)}>&times;</button>
                  </div>
                ))}
              </div>
              <div className="add-row">
                <input type="time" value={breakDraft.start} onChange={(e) => setBreakDraft(p => ({...p, start: e.target.value}))} />
                <span>-</span>
                <input type="time" value={breakDraft.end} onChange={(e) => setBreakDraft(p => ({...p, end: e.target.value}))} />
                <button type="button" className="btn-small-add" onClick={addBreak}>Add</button>
              </div>
            </div>

            <div className="form-group">
              <label>Leave Dates</label>
              <div className="chips-container">
                {formData.leaveDays.map((date) => (
                  <div className="chip red-chip" key={date}>
                    {date}
                    <button type="button" onClick={() => removeLeaveDay(date)}>&times;</button>
                  </div>
                ))}
              </div>
              <div className="add-row">
                <input type="date" value={leaveDraft} onChange={(e) => setLeaveDraft(e.target.value)} />
                <button type="button" className="btn-small-add" onClick={addLeaveDay}>Add</button>
              </div>
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-submit" disabled={loading}>
              {loading ? 'Adding...' : 'Add Dentist'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddDentistModal;