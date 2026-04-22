import React, { useMemo, useState } from 'react';
import '../styles/components/EditDentistModal.css'; 
import api from '../api/apiClient';
import toast from 'react-hot-toast';

const DAYS = [
  { label: "S", value: 0 }, { label: "M", value: 1 }, { label: "T", value: 2 },
  { label: "W", value: 3 }, { label: "TH", value: 4 }, { label: "F", value: 5 }, { label: "S", value: 6 },
];

const FALLBACK_DENTIST_TYPES = [
  'General Dentist',
  'Orthodontist',
  'Periodontist',
  'Oral Surgeon',
  'Pediatric Dentist',
  'Endodontist',
];

const EditDentistModal = ({ dentist, dentistTypeOptions = [], onClose, onSuccess, actorContext: actorProp }) => {
  const [loading, setLoading] = useState(false);
  const [leaveDraft, setLeaveDraft] = useState('');

  const actorContext = useMemo(() => {
    if (actorProp) return actorProp;
    try {
      const raw = localStorage.getItem('identify-auth-storage');
      const parsed = raw ? JSON.parse(raw) : null;
      return parsed?.state?.user || null;
    } catch {
      return null;
    }
  }, [actorProp]);

  const canEditSchedule = useMemo(() => {
    const role = String(actorContext?.role || '').trim().toLowerCase();
    
    // Global admins and clinic admins can edit anyone's schedule
    if (role === 'superadmin' || role === 'clinic admin' || role === 'globaladmin' || role === 'clinicadmin' || role === 'systemadmin') {
      return true;
    }

    // Dentists can only edit their own schedule
    const actorDentistId = Number(actorContext?.dentist_id || 0);
    const targetDentistId = Number(dentist?.id || 0);
    
    // Also check if the user id matches the dentist's user_id just in case
    const actorUserId = Number(actorContext?.id || 0);
    const targetUserId = Number(dentist?.user_id || 0);

    return role === 'dentist' && (
      (actorDentistId > 0 && actorDentistId === targetDentistId) || 
      (actorUserId > 0 && actorUserId === targetUserId) ||
      (actorContext?.name === dentist?.name) // Ultimate fallback
    );
  }, [actorContext, dentist]);
  
  // Pre-fill the form with the dentist's existing data
  const [formData, setFormData] = useState({
    first_name: dentist?.first_name || '',
    middle_name: dentist?.middle_name || '',
    last_name: dentist?.last_name || '',
    specializations: (dentist?.specialization || '').split(',').map(s => s.trim()).filter(Boolean),
    phone: dentist?.phone || '',
    email: dentist?.email || '',
    days: dentist?.days || [1, 2, 3, 4, 5],
    operatingHours: dentist?.operatingHours || { start: "09:00", end: "17:00" },
    lunch: dentist?.lunch || { start: "12:00", end: "13:00" },
    breaks: dentist?.breaks || [],
    leaveDays: dentist?.leaveDays || [],
    status: dentist?.status || "Available"
  });

  const [specDraft, setSpecDraft] = useState("");

  const addSpecialization = () => {
    if (!specDraft) return;
    if (formData.specializations.includes(specDraft)) return;
    setFormData(prev => ({ ...prev, specializations: [...prev.specializations, specDraft] }));
    setSpecDraft("");
  };

  const removeSpecialization = (spec) => {
    setFormData(prev => ({ ...prev, specializations: prev.specializations.filter(s => s !== spec) }));
  };

  const specializationOptions = useMemo(() => {
    return (Array.isArray(dentistTypeOptions) && dentistTypeOptions.length > 0)
      ? dentistTypeOptions
      : FALLBACK_DENTIST_TYPES;
  }, [dentistTypeOptions]);

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

  const addLeaveDay = () => {
    if (!leaveDraft) return;

    setFormData((prev) => {
      const nextLeaveDays = prev.leaveDays || [];
      if (nextLeaveDays.includes(leaveDraft)) return prev;
      return {
        ...prev,
        leaveDays: [...nextLeaveDays, leaveDraft],
      };
    });

    setLeaveDraft('');
  };

  const removeLeaveDay = (dateValue) => {
    setFormData((prev) => ({
      ...prev,
      leaveDays: (prev.leaveDays || []).filter((value) => value !== dateValue),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        ...formData,
        specialization: formData.specializations.join(", ")
      };
      // Call the UPDATE API instead of the CREATE API
      await api.updateDentist(dentist.id, payload); 
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
                    {specializationOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                  <button type="button" className="btn-small-add" onClick={addSpecialization} style={{ padding: '0 15px', background: '#3498db', color: 'white', border: 'none', borderRadius: '4px' }}>Add</button>
                </div>
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
                    disabled={!canEditSchedule}
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
                  <input type="time" value={formData.operatingHours.start} onChange={(e) => handleTimeChange('operatingHours', 'start', e.target.value)} disabled={!canEditSchedule} />
                  <span>to</span>
                  <input type="time" value={formData.operatingHours.end} onChange={(e) => handleTimeChange('operatingHours', 'end', e.target.value)} disabled={!canEditSchedule} />
                </div>
              </div>
              <div className="form-group">
                <label>Lunch Break</label>
                <div className="time-range">
                  <input type="time" value={formData.lunch.start} onChange={(e) => handleTimeChange('lunch', 'start', e.target.value)} disabled={!canEditSchedule} />
                  <span>to</span>
                  <input type="time" value={formData.lunch.end} onChange={(e) => handleTimeChange('lunch', 'end', e.target.value)} disabled={!canEditSchedule} />
                </div>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Leave Days</label>
                <div className="chips-container">
                  {(formData.leaveDays || []).map((dateValue) => (
                    <div className="chip red-chip" key={dateValue}>
                      {dateValue}
                      <button type="button" onClick={() => removeLeaveDay(dateValue)} disabled={!canEditSchedule}>&times;</button>
                    </div>
                  ))}
                </div>
                <div className="add-row">
                  <input type="date" value={leaveDraft} onChange={(e) => setLeaveDraft(e.target.value)} disabled={!canEditSchedule} />
                  <button type="button" className="btn-small-add" onClick={addLeaveDay} disabled={!canEditSchedule}>Add</button>
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