import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import api from "../../api/apiClient"; 
import useAppStore from "../../store/useAppStore";
import PHAddressSelector from "../../components/PHAddressSelector";
import "../../styles/pages/dentist/DentistSettings.css";

const COMMON_FREQUENCY_OPTIONS = [
    "Daily",
    "Twice a day",
    "Three times a day",
    "Every 4 hours",
    "Every 6 hours",
    "Every 8 hours",
    "Every 12 hours",
    "As needed",
];

const DURATION_OPTIONS = Array.from({ length: 12 }, (_unused, index) => (index + 1) * 30);

function formatDurationLabel(minutes) {
    const numericMinutes = Number(minutes);
    if (!Number.isFinite(numericMinutes) || numericMinutes <= 0) {
        return "";
    }

    const hours = Math.floor(numericMinutes / 60);
    const remainingMinutes = numericMinutes % 60;

    if (hours > 0 && remainingMinutes === 0) {
        return `${hours} hour${hours > 1 ? "s" : ""}`;
    }

    if (hours > 0 && remainingMinutes > 0) {
        return `${hours} hour${hours > 1 ? "s" : ""} ${remainingMinutes} mins`;
    }

    return `${numericMinutes} mins`;
}

function sortDentistTypesByName(typeList) {
    return [...(typeList || [])].sort((a, b) => String(a?.name || '').localeCompare(String(b?.name || '')));
}

function DentistSettings({ showAideManagement = true }) {
    const user = useAppStore((state) => state.user);
    const [activeTab, setActiveTab] = useState(showAideManagement ? "aides" : "services");

  // --- DENTAL AIDES STATE ---
  const [aides, setAides] = useState([]);
  const [newAide, setNewAide] = useState({ firstName: "", middleName: "", lastName: "", email: "", password: "", phone: "" });
  const [editingAideId, setEditingAideId] = useState(null);

  // --- CLINIC SERVICES STATE ---
  const [services, setServices] = useState([]);
  const [branches, setBranches] = useState([]);
  const [newService, setNewService] = useState({ name: "", minPrice: "", maxPrice: "", estimatedDuration: "", branchIds: [] });
  const [editingServiceId, setEditingServiceId] = useState(null);

  // --- BRANCHES STATE ---
  const [newBranch, setNewBranch] = useState({ name: "", code: "", street: "", barangay: "", city: "", province: "" });
  const [editingBranchId, setEditingBranchId] = useState(null);

  // --- MEDICATIONS STATE ---
  const [clinicMedications, setClinicMedications] = useState([]);
    const [newMedication, setNewMedication] = useState({ name: "", defaultDosage: "", defaultFrequency: "" });
  const [editingMedicationId, setEditingMedicationId] = useState(null);

    // --- DENTIST TYPES STATE (Super Admin) ---
    const [dentistTypes, setDentistTypes] = useState([]);
    const [newDentistType, setNewDentistType] = useState({ name: "" });
    const [editingDentistTypeId, setEditingDentistTypeId] = useState(null);

  // Fetch data when the page loads
  const loadData = async () => {
    try {
              const dentistTypePromise = showAideManagement
                      ? Promise.resolve([])
                      : api.getDentistTypes().catch(() => []);
              
              const branchesPromise = (user?.clinic_id)
                      ? api.getClinicBranches(user.clinic_id).catch(() => [])
                      : Promise.resolve([]);

              const [staffList, servicesList, medsList, dentistTypeList, branchesList] = await Promise.all([
                      api.getDentists(),
                      api.getServices(),
                      api.getClinicMedications(),
                      dentistTypePromise,
                      branchesPromise,
              ]);

      const aidesOnly = staffList.filter(staff => staff.specialization === 'Dental Aide');
      setAides(aidesOnly);
      setServices(servicesList);
      setClinicMedications(medsList);
      setBranches(branchesList);

              if (!showAideManagement) {
                  setDentistTypes(sortDentistTypesByName(dentistTypeList));
              }

    } catch (error) {
      console.error("Failed to load settings data:", error);
    }
  };

  useEffect(() => {
    loadData();
  }, [showAideManagement, user?.clinic_id]);

    useEffect(() => {
        if (!showAideManagement && activeTab === "aides") {
            setActiveTab("services");
        }
        if (showAideManagement && activeTab === "dentist-types") {
            setActiveTab("aides");
        }
    }, [showAideManagement, activeTab]);

  // --- AIDE HANDLERS ---
  const handleSaveAide = async (e) => {
    e.preventDefault();
    if (!newAide.firstName || !newAide.lastName || !newAide.email || !newAide.phone) {
      return toast.error("First Name, Last Name, Phone, and Email are required.");
    }
    
    try {
      const fullNameDisplay = `${newAide.firstName} ${newAide.middleName ? newAide.middleName + " " : ""}${newAide.lastName}`.trim();
      const payload = {
        first_name: newAide.firstName, 
        last_name: newAide.lastName, 
        middle_name: newAide.middle_name, 
        email: newAide.email, 
        phone: newAide.phone,
        specialization: "Dental Aide", 
        role: "aide", 
        status: "Available"
      };

      if (editingAideId) {
        await api.updateDentist(editingAideId, payload);
        setAides(aides.map(a => a.id === editingAideId ? { ...a, name: fullNameDisplay, email: newAide.email, phone: newAide.phone, first_name: newAide.firstName, last_name: newAide.lastName, middle_name: newAide.middleName } : a));
        toast.success("Dental Aide account updated successfully!");
      } else {
        payload.password = newAide.password;
        const newStaff = await api.createDentist(payload);
        setAides([...aides, { id: newStaff.id, name: fullNameDisplay, email: newAide.email, phone: newAide.phone, first_name: newAide.firstName, last_name: newAide.lastName, middle_name: newAide.middleName }]);
                if (newStaff?.generated_password) {
                    toast.success(`Dental Aide account created. Temporary password: ${newStaff.generated_password}`);
                } else {
                    toast.success("Dental Aide account created successfully!");
                }
      }
      
      cancelAideEdit();
    } catch (error) {
      toast.error(error.message || "Failed to save aide.");
    }
  };

  const handleEditAideClick = (aide) => {
      setEditingAideId(aide.id);
      setNewAide({
          firstName: aide.first_name || aide.name.split(' ')[0] || "",
          middleName: aide.middle_name || "",
          lastName: aide.last_name || aide.name.split(' ').pop() || "",
          email: aide.email || "",
          password: "", 
          phone: aide.phone || ""
      });
  };

  const cancelAideEdit = () => {
      setEditingAideId(null);
      setNewAide({ firstName: "", middleName: "", lastName: "", email: "", password: "", phone: "" });
  };

  const handleDeleteAide = async (id) => {
    try {
      await api.deleteDentist(id); 
      setAides(aides.filter(aide => aide.id !== id));
      toast.success("Dental Aide securely removed.");
    } catch (error) {
      toast.error(error.message);
    }
  };

  // --- BRANCH HANDLERS ---
  const handleSaveBranch = async (e) => {
    e.preventDefault();
    if (!newBranch.name || !newBranch.street || !newBranch.barangay || !newBranch.city || !newBranch.province) {
        return toast.error("Branch name and full address are required.");
    }

    const finalAddress = `${newBranch.street}, ${newBranch.barangay}, ${newBranch.city}, ${newBranch.province}`;
    const payload = {
        name: newBranch.name,
        code: newBranch.code,
        address: finalAddress
    };

    try {
        if (editingBranchId) {
            await api.updateClinicBranch(user.clinic_id, editingBranchId, payload);
            toast.success("Branch updated successfully!");
        } else {
            await api.createClinicBranch(user.clinic_id, payload);
            toast.success("Branch added successfully!");
        }
        cancelBranchEdit();
        loadData();
    } catch (error) {
        toast.error(error.message || "Failed to save branch.");
    }
  };

  const handleEditBranchClick = (branch) => {
      setEditingBranchId(branch.id);
      const addrParts = (branch.address || "").split(", ");
      setNewBranch({
          name: branch.name,
          code: branch.code || "",
          street: addrParts[0] || "",
          barangay: addrParts[1] || "",
          city: addrParts[2] || "",
          province: addrParts[3] || ""
      });
  };

  const cancelBranchEdit = () => {
      setEditingBranchId(null);
      setNewBranch({ name: "", code: "", street: "", barangay: "", city: "", province: "" });
  };

  const handleDeleteBranch = async (id) => {
    if (!window.confirm("Are you sure you want to archive this branch?")) return;
    try {
        await api.archiveClinicBranch(user.clinic_id, id);
        toast.success("Branch archived.");
        loadData();
    } catch (error) {
        toast.error(error.message || "Failed to archive branch.");
    }
  };

  // --- SERVICE HANDLERS ---
  const handleSaveService = async (e) => {
    e.preventDefault();
    if (!newService.name || !newService.minPrice || !newService.maxPrice || !newService.estimatedDuration) {
        return toast.error("All service fields are required.");
    }
    if (Number(newService.minPrice) > Number(newService.maxPrice)) {
        return toast.error("Minimum price cannot be higher than the maximum price.");
    }
    if (newService.branchIds.length === 0) {
        return toast.error("Please select at least one branch for this service.");
    }

    const payload = {
        name: newService.name,
        minPrice: newService.minPrice,
        maxPrice: newService.maxPrice,
        estimated_duration: newService.estimatedDuration,
        branchIds: newService.branchIds
    };

    try {
        if (editingServiceId) {
            await api.updateService(editingServiceId, payload);
            setServices(services.map(s => s.id === editingServiceId ? { 
                ...s, 
                name: payload.name, 
                min_price: payload.minPrice, 
                max_price: payload.maxPrice, 
                estimated_duration: payload.estimated_duration,
                branch_ids: payload.branchIds
            } : s));
            toast.success("Service updated successfully!");
        } else {
            const createdService = await api.createService(payload);
            setServices([...services, { 
                id: createdService.id, 
                name: payload.name, 
                min_price: payload.minPrice, 
                max_price: payload.maxPrice, 
                estimated_duration: payload.estimated_duration,
                branch_ids: payload.branchIds
            }]);
            toast.success("Service added successfully!");
        }
        cancelServiceEdit();
    } catch {
        toast.error("Failed to save service");
    }
  };

  const handleEditServiceClick = (service) => {
      setEditingServiceId(service.id);
      setNewService({
          name: service.name,
          minPrice: service.min_price,
          maxPrice: service.max_price,
          estimatedDuration: service.estimated_duration || "",
          branchIds: service.branch_ids || []
      });
  };

  const cancelServiceEdit = () => {
      setEditingServiceId(null);
      setNewService({ name: "", minPrice: "", maxPrice: "", estimatedDuration: "", branchIds: [] });
  };

  const handleDeleteService = async (id) => {
    try {
        await api.deleteService(id);
        setServices(services.filter(service => service.id !== id));
        toast.success("Service removed.");
        } catch {
        toast.error("Failed to delete service.");
    }
  };

  // --- MEDICATION HANDLERS ---
  const handleSaveMedication = async (e) => {
    e.preventDefault();
    if (!newMedication.name) {
        return toast.error("Medication name is required.");
    }

    const payload = {
        name: newMedication.name,
        default_dosage: newMedication.defaultDosage,
        default_frequency: newMedication.defaultFrequency,
    };

    try {
        if (editingMedicationId) {
            await api.updateClinicMedication(editingMedicationId, payload);
                        setClinicMedications(clinicMedications.map(m => m.id === editingMedicationId ? {
                            ...m,
                            name: payload.name,
                            default_dosage: payload.default_dosage,
                            default_frequency: payload.default_frequency,
                        } : m));
            toast.success("Medication updated successfully!");
        } else {
            const createdMed = await api.createClinicMedication(payload);
                        setClinicMedications([...clinicMedications, {
                            id: createdMed.id,
                            name: payload.name,
                            default_dosage: payload.default_dosage,
                            default_frequency: payload.default_frequency,
                        }]);
            toast.success("Medication added successfully!");
        }
        cancelMedicationEdit();
    } catch {
        toast.error("Failed to save medication");
    }
  };

  const handleEditMedicationClick = (med) => {
      setEditingMedicationId(med.id);
      setNewMedication({
          name: med.name,
          defaultDosage: med.default_dosage || "",
          defaultFrequency: med.default_frequency || "",
      });
  };

  const cancelMedicationEdit = () => {
      setEditingMedicationId(null);
      setNewMedication({ name: "", defaultDosage: "", defaultFrequency: "" });
  };

  const handleDeleteMedication = async (id) => {
    try {
        await api.deleteClinicMedication(id);
        setClinicMedications(clinicMedications.filter(med => med.id !== id));
        toast.success("Medication removed.");
        } catch {
        toast.error("Failed to delete medication.");
    }
  };

    // --- DENTIST TYPE HANDLERS (Super Admin) ---
    const handleSaveDentistType = async (e) => {
        e.preventDefault();
        const typeName = String(newDentistType.name || "").trim();

        if (!typeName) {
                return toast.error("Dentist type name is required.");
        }

        try {
                if (editingDentistTypeId) {
                        await api.updateDentistType(editingDentistTypeId, { name: typeName });
                    setDentistTypes(sortDentistTypesByName(dentistTypes.map((item) => (
                                item.id === editingDentistTypeId ? { ...item, name: typeName } : item
                    ))));
                        toast.success("Dentist type updated successfully!");
                } else {
                        const createdType = await api.createDentistType({ name: typeName });
                    setDentistTypes(sortDentistTypesByName([...dentistTypes, { id: createdType.id, name: createdType.name }]));
                        toast.success("Dentist type added successfully!");
                }

                cancelDentistTypeEdit();
        } catch (error) {
                toast.error(error.message || "Failed to save dentist type.");
        }
    };

    const handleEditDentistTypeClick = (typeEntry) => {
        setEditingDentistTypeId(typeEntry.id);
        setNewDentistType({ name: typeEntry.name || "" });
    };

    const cancelDentistTypeEdit = () => {
        setEditingDentistTypeId(null);
        setNewDentistType({ name: "" });
    };

    const handleDeleteDentistType = async (id) => {
        try {
                await api.deleteDentistType(id);
                setDentistTypes(dentistTypes.filter((item) => item.id !== id));
                toast.success("Dentist type removed.");
        } catch (error) {
                toast.error(error.message || "Failed to delete dentist type.");
        }
    };

  // REUSABLE STYLES FOR THE VISIBLE SAVE BUTTONS
  const saveBtnStyle = { padding: '10px 20px', background: '#0ea5e9', color: 'white', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: 'bold' };
  const cancelBtnStyle = { padding: '10px 20px', background: '#94a3b8', color: 'white', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: 'bold' };

  return (
    <div className="settings-dashboard-container">
      <div className="settings-header-section">
        <h2>Clinic Settings</h2>
                                {showAideManagement ? <p>Manage your dental staff, services, and medications.</p> : null}
      </div>

      <div className="settings-tabs">
                {showAideManagement ? (
                    <button className={activeTab === "aides" ? "active" : ""} onClick={() => setActiveTab("aides")}>Dental Aides</button>
                ) : null}
        {!showAideManagement && (
            <button className={activeTab === "branches" ? "active" : ""} onClick={() => setActiveTab("branches")}>Clinic Branches</button>
        )}
        <button className={activeTab === "services" ? "active" : ""} onClick={() => setActiveTab("services")}>Clinic Services</button>
        <button className={activeTab === "medications" ? "active" : ""} onClick={() => setActiveTab("medications")}>Medications</button>
                {!showAideManagement ? (
                    <button className={activeTab === "dentist-types" ? "active" : ""} onClick={() => setActiveTab("dentist-types")}>Dentist Types</button>
                ) : null}
      </div>

      <div className="settings-tab-content">
        
        {/* --- DENTAL AIDES TAB --- */}
                {showAideManagement && activeTab === "aides" && (
          <div className="animation-fade-in">
            <div className={`settings-form-card ${editingAideId ? 'editing' : ''}`}>
                <h3>
                    {editingAideId ? "Edit Dental Aide" : "Add New Dental Aide"}
                </h3>
                <form 
                    onSubmit={handleSaveAide} 
                    onKeyDown={(e) => e.key === 'Escape' && cancelAideEdit()}
                >
                    <div className="form-row">
                        <div className="form-group">
                            <label>First Name *</label>
                            <input type="text" placeholder="Juan" value={newAide.firstName} onChange={(e) => setNewAide({ ...newAide, firstName: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label>Middle Name</label>
                            <input type="text" placeholder="Dela" value={newAide.middleName} onChange={(e) => setNewAide({ ...newAide, middleName: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label>Last Name *</label>
                            <input type="text" placeholder="Cruz" value={newAide.lastName} onChange={(e) => setNewAide({ ...newAide, lastName: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label>Contact Number *</label>
                            <input type="text" placeholder="09123456789" value={newAide.phone} onChange={(e) => setNewAide({ ...newAide, phone: e.target.value })} />
                        </div>
                    </div>
                    <div className="form-row form-row-bottom">
                        <div className="form-group flex-2">
                            <label>Email Address *</label>
                            <input type="email" placeholder="juan@clinic.com" value={newAide.email} onChange={(e) => setNewAide({ ...newAide, email: e.target.value })} />
                        </div>
                        {!editingAideId && (
                            <div className="form-group flex-2">
                                <label>Given Password *</label>
                                <input type="password" placeholder="••••••••" value={newAide.password} onChange={(e) => setNewAide({ ...newAide, password: e.target.value })} />
                            </div>
                        )}
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '15px' }}>
                        {editingAideId && <button type="button" style={cancelBtnStyle} onClick={cancelAideEdit}>Cancel</button>}
                        <button type="submit" style={saveBtnStyle}>{editingAideId ? 'Save Changes' : 'Add Dental Aide'}</button>
                    </div>
                </form>
            </div>

            <h3 className="table-title">Current Dental Aides</h3>
            <div className="table-container">
                <table className="settings-table">
                <thead><tr><th>Staff Name</th><th>Contact</th><th>Email Address</th><th>Actions</th></tr></thead>
                <tbody>
                    {aides.length === 0 ? (<tr><td colSpan="4" className="empty-state">No dental aides registered.</td></tr>) : (
                        aides.map((aide) => (
                            <tr key={aide.id} className={editingAideId === aide.id ? "row-highlight" : ""}>
                                <td className="font-semibold">{aide.name}</td>
                                <td>{aide.phone || "N/A"}</td>
                                <td>{aide.email}</td>
                                <td>
                                    <div className="action-buttons">
                                        <button onClick={() => handleEditAideClick(aide)} className="btn-edit">Edit</button>
                                        <button onClick={() => handleDeleteAide(aide.id)} className="btn-delete">Remove</button>
                                    </div>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
                </table>
            </div>
          </div>
        )}

        {/* --- BRANCHES TAB --- */}
        {!showAideManagement && activeTab === "branches" && (
            <div className="animation-fade-in">
                <div className={`settings-form-card ${editingBranchId ? 'editing' : ''}`}>
                    <h3>{editingBranchId ? "Edit Branch" : "Add New Clinic Branch"}</h3>
                    <form onSubmit={handleSaveBranch}>
                        <div className="form-row">
                            <div className="form-group flex-2">
                                <label>Branch Name *</label>
                                <input type="text" placeholder="Main Branch" value={newBranch.name} onChange={(e) => setNewBranch({ ...newBranch, name: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>Branch Code</label>
                                <input type="text" placeholder="MB-01" value={newBranch.code} onChange={(e) => setNewBranch({ ...newBranch, code: e.target.value })} />
                            </div>
                        </div>
                        <div className="form-group" style={{ marginTop: '10px' }}>
                            <label>Street / Building Info *</label>
                            <input type="text" placeholder="123 Dental St." value={newBranch.street} onChange={(e) => setNewBranch({ ...newBranch, street: e.target.value })} />
                        </div>
                        <div style={{ marginTop: '15px' }}>
                            <PHAddressSelector 
                                selectedProvince={newBranch.province}
                                selectedCity={newBranch.city}
                                selectedBarangay={newBranch.barangay}
                                onProvinceChange={(val) => setNewBranch(prev => ({ ...prev, province: val }))}
                                onCityChange={(val) => setNewBranch(prev => ({ ...prev, city: val }))}
                                onBarangayChange={(val) => setNewBranch(prev => ({ ...prev, barangay: val }))}
                            />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '15px' }}>
                            {editingBranchId && <button type="button" style={cancelBtnStyle} onClick={cancelBranchEdit}>Cancel</button>}
                            <button type="submit" style={saveBtnStyle}>{editingBranchId ? 'Save Changes' : 'Add Branch'}</button>
                        </div>
                    </form>
                </div>

                <h3 className="table-title">Clinic Branches</h3>
                <div className="table-container">
                    <table className="settings-table">
                        <thead><tr><th>Branch Name</th><th>Code</th><th>Address</th><th>Actions</th></tr></thead>
                        <tbody>
                            {branches.length === 0 ? (<tr><td colSpan="4" className="empty-state">No branches registered.</td></tr>) : (
                                branches.map((branch) => (
                                    <tr key={branch.id} className={editingBranchId === branch.id ? "row-highlight" : ""}>
                                        <td className="font-semibold">{branch.name}</td>
                                        <td>{branch.code || "N/A"}</td>
                                        <td>{branch.address || "No address"}</td>
                                        <td>
                                            <div className="action-buttons">
                                                <button onClick={() => handleEditBranchClick(branch)} className="btn-edit">Edit</button>
                                                <button onClick={() => handleDeleteBranch(branch.id)} className="btn-delete">Archive</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

        {/* --- SERVICES TAB --- */}
        {activeTab === "services" && (
          <div className="animation-fade-in">
            <div className={`settings-form-card ${editingServiceId ? 'editing' : ''}`}>
                <h3>
                    {editingServiceId ? "Edit Service" : "Add New Service"}
                </h3>
                <form 
                    onSubmit={handleSaveService}
                    onKeyDown={(e) => e.key === 'Escape' && cancelServiceEdit()}
                >
                    <div className="form-row form-row-bottom">
                        <div className="form-group flex-2">
                            <label>Service Name *</label>
                            <input type="text" placeholder="e.g., Pasta / Filling" value={newService.name} onChange={(e) => setNewService({ ...newService, name: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label>Duration *</label>
                            <select 
                                value={newService.estimatedDuration} 
                                onChange={(e) => setNewService({ ...newService, estimatedDuration: e.target.value })}
                                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSaveService(e); } }}
                            >
                                <option value="" disabled>Select time</option>
                                {DURATION_OPTIONS.map((minutes) => (
                                    <option key={minutes} value={String(minutes)}>
                                        {formatDurationLabel(minutes)}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Min Price (₱) *</label>
                            <input type="number" placeholder="500" value={newService.minPrice} onChange={(e) => setNewService({ ...newService, minPrice: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label>Max Price (₱) *</label>
                            <input type="number" placeholder="1500" value={newService.maxPrice} onChange={(e) => setNewService({ ...newService, maxPrice: e.target.value })} />
                        </div>
                    </div>

                    <div className="form-group" style={{ flex: '1 1 100%', marginTop: '10px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <label style={{ marginBottom: 0 }}>Available in Branches *</label>
                            {branches.length > 0 && (
                                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.8rem', color: '#64748b' }}>
                                    <input 
                                        type="checkbox" 
                                        style={{ width: '13px', height: '13px' }}
                                        checked={newService.branchIds.length === branches.length && branches.length > 0}
                                        onChange={(e) => {
                                            const checked = e.target.checked;
                                            setNewService(prev => ({
                                                ...prev,
                                                branchIds: checked ? branches.map(b => b.id) : []
                                            }));
                                        }}
                                    />
                                    Select All
                                </label>
                            )}
                        </div>
                        <div style={{ 
                            display: 'grid', 
                            gridTemplateColumns: 'repeat(4, 1fr)', 
                            gap: '12px', 
                            padding: '12px', 
                            background: '#f8fafc', 
                            borderRadius: '8px', 
                            border: '1px solid #e2e8f0' 
                        }}>
                            {branches.length === 0 ? (
                                <span style={{ color: '#94a3b8', fontSize: '0.9rem', gridColumn: 'span 4' }}>No branches found.</span>
                            ) : (
                                branches.map(branch => (
                                    <label key={branch.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', color: '#334155', fontWeight: '500' }}>
                                        <input 
                                            type="checkbox" 
                                            style={{ width: '14px', height: '14px' }}
                                            checked={newService.branchIds.includes(branch.id)}
                                            onChange={(e) => {
                                                const checked = e.target.checked;
                                                setNewService(prev => ({
                                                    ...prev,
                                                    branchIds: checked 
                                                        ? [...prev.branchIds, branch.id]
                                                        : prev.branchIds.filter(id => id !== branch.id)
                                                }));
                                            }}
                                        />
                                        <span style={{ 
                                            whiteSpace: 'nowrap', 
                                            overflow: 'hidden', 
                                            textOverflow: 'ellipsis' 
                                        }} title={branch.name}>
                                            {branch.name}
                                        </span>
                                    </label>
                                ))
                            )}
                        </div>
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '15px' }}>
                        {editingServiceId && <button type="button" style={cancelBtnStyle} onClick={cancelServiceEdit}>Cancel</button>}
                        <button type="submit" style={saveBtnStyle}>{editingServiceId ? 'Save Changes' : 'Add Service'}</button>
                    </div>
                </form>
            </div>

            <h3 className="table-title">Available Services & Pricing</h3>
            <div className="table-container">
                <table className="settings-table">
                <thead><tr><th>Service Name</th><th>Est. Duration</th><th>Price Range (PHP)</th><th>Branches</th><th>Actions</th></tr></thead>
                <tbody>
                    {services.length === 0 ? (<tr><td colSpan="5" className="empty-state">No services have been added yet.</td></tr>) : (
                        services.map((service) => (
                            <tr key={service.id} className={editingServiceId === service.id ? "row-highlight" : ""}>
                                <td className="font-semibold">{service.name}</td>
                                <td>{service.estimated_duration ? formatDurationLabel(service.estimated_duration) : "N/A"}</td>
                                <td>
                                    <span className="price-badge">₱{service.min_price}</span>
                                    <span className="price-separator">to</span>
                                    <span className="price-badge">₱{service.max_price}</span>
                                </td>
                                <td>
                                    {service.branch_ids && service.branch_ids.length > 0 ? (
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                            {service.branch_ids.map(bid => {
                                                const b = branches.find(branch => branch.id === bid);
                                                return b ? <span key={bid} style={{ padding: '2px 6px', background: '#e0f2fe', color: '#0369a1', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '600' }}>{b.name}</span> : null;
                                            })}
                                        </div>
                                    ) : <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>No branches</span>}
                                </td>
                                <td>
                                    <div className="action-buttons">
                                        <button onClick={() => handleEditServiceClick(service)} className="btn-edit">Edit</button>
                                        <button onClick={() => handleDeleteService(service.id)} className="btn-delete">Remove</button>
                                    </div>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
                </table>
            </div>
          </div>
        )}

        {/* --- MEDICATIONS TAB --- */}
        {activeTab === "medications" && (
          <div className="animation-fade-in">
            <div className={`settings-form-card ${editingMedicationId ? 'editing' : ''}`}>
                <h3>
                    {editingMedicationId ? "Edit Medication" : "Add Medication to Master List"}
                </h3>
                <form 
                    onSubmit={handleSaveMedication}
                    onKeyDown={(e) => e.key === 'Escape' && cancelMedicationEdit()}
                >
                    <div className="form-row form-row-bottom">
                        <div className="form-group flex-2">
                            <label>Medicine Name *</label>
                            <input type="text" placeholder="e.g., Amoxicillin" value={newMedication.name} onChange={(e) => setNewMedication({ ...newMedication, name: e.target.value })} />
                        </div>
                        <div className="form-group flex-2">
                            <label>Default Dosage</label>
                            <select 
                                value={newMedication.defaultDosage} 
                                onChange={(e) => setNewMedication({ ...newMedication, defaultDosage: e.target.value })}
                                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSaveMedication(e); } }}
                            >
                                <option value="" disabled>Select dosage</option>
                                <option value="125mg">125mg</option>
                                <option value="250mg">250mg</option>
                                <option value="500mg">500mg</option>
                                <option value="875mg">875mg</option>
                                <option value="1000mg">1000mg (1g)</option>
                                <option value="5ml">5ml</option>
                                <option value="10ml">10ml</option>
                                <option value="15ml">15ml</option>
                                <option value="1 Drop">1 Drop</option>
                                <option value="2 Drops">2 Drops</option>
                                <option value="As Needed">As Needed</option>
                                <option value="N/A">N/A</option>
                            </select>
                        </div>
                        <div className="form-group flex-2">
                            <label>Default Frequency</label>
                            <input
                                type="text"
                                list="default-frequency-options"
                                placeholder="e.g., Every 8 hours"
                                value={newMedication.defaultFrequency}
                                onChange={(e) => setNewMedication({ ...newMedication, defaultFrequency: e.target.value })}
                            />
                            <datalist id="default-frequency-options">
                                {COMMON_FREQUENCY_OPTIONS.map((option) => (
                                    <option key={option} value={option} />
                                ))}
                            </datalist>
                        </div>
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '15px' }}>
                        {editingMedicationId && <button type="button" style={cancelBtnStyle} onClick={cancelMedicationEdit}>Cancel</button>}
                        <button type="submit" style={saveBtnStyle}>{editingMedicationId ? 'Save Changes' : 'Add Medication'}</button>
                    </div>
                </form>
            </div>

            <h3 className="table-title">Current Available Medications</h3>
            <div className="table-container">
                <table className="settings-table">
                <thead><tr><th>Medicine Name</th><th>Default Dosage</th><th>Default Frequency</th><th>Actions</th></tr></thead>
                <tbody>
                    {clinicMedications.length === 0 ? (<tr><td colSpan="4" className="empty-state">No medications added to the master list yet.</td></tr>) : (
                        clinicMedications.map((med) => (
                            <tr key={med.id} className={editingMedicationId === med.id ? "row-highlight" : ""}>
                                <td className="font-semibold">{med.name}</td>
                                <td>{med.default_dosage || "N/A"}</td>
                                <td>{med.default_frequency || "N/A"}</td>
                                <td>
                                    <div className="action-buttons">
                                        <button onClick={() => handleEditMedicationClick(med)} className="btn-edit">Edit</button>
                                        <button onClick={() => handleDeleteMedication(med.id)} className="btn-delete">Remove</button>
                                    </div>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
                </table>
            </div>
          </div>
        )}

        {!showAideManagement && activeTab === "dentist-types" && (
          <div className="animation-fade-in">
            <div className={`settings-form-card ${editingDentistTypeId ? 'editing' : ''}`}>
                <h3>
                    {editingDentistTypeId ? "Edit Dentist Type" : "Add New Dentist Type"}
                </h3>
                <form
                    onSubmit={handleSaveDentistType}
                    onKeyDown={(e) => e.key === 'Escape' && cancelDentistTypeEdit()}
                >
                    <div className="form-row form-row-bottom">
                        <div className="form-group flex-2">
                            <label>Dentist Type Name *</label>
                            <input
                                type="text"
                                placeholder="e.g., General Dentist"
                                value={newDentistType.name}
                                onChange={(e) => setNewDentistType({ name: e.target.value })}
                            />
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '15px' }}>
                        {editingDentistTypeId && <button type="button" style={cancelBtnStyle} onClick={cancelDentistTypeEdit}>Cancel</button>}
                        <button type="submit" style={saveBtnStyle}>{editingDentistTypeId ? 'Save Changes' : 'Add Dentist Type'}</button>
                    </div>
                </form>
            </div>

            <h3 className="table-title">Available Dentist Types</h3>
            <div className="table-container">
                <table className="settings-table">
                <thead><tr><th>Dentist Type</th><th>Actions</th></tr></thead>
                <tbody>
                    {dentistTypes.length === 0 ? (
                        <tr><td colSpan="2" className="empty-state">No dentist types added yet.</td></tr>
                    ) : (
                        dentistTypes.map((typeEntry) => (
                            <tr key={typeEntry.id} className={editingDentistTypeId === typeEntry.id ? "row-highlight" : ""}>
                                <td className="font-semibold">{typeEntry.name}</td>
                                <td>
                                    <div className="action-buttons">
                                        <button onClick={() => handleEditDentistTypeClick(typeEntry)} className="btn-edit">Edit</button>
                                        <button onClick={() => handleDeleteDentistType(typeEntry.id)} className="btn-delete">Remove</button>
                                    </div>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
                </table>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default DentistSettings;