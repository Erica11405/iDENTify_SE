// // import React, { useState, useEffect } from "react";
// // import toast from "react-hot-toast";
// // import api from "../../api/apiClient"; 
// // import "../../styles/pages/dentist/DentistSettings.css";

// // function DentistSettings() {
// //   const [activeTab, setActiveTab] = useState("aides");

// //   // --- DENTAL AIDES STATE ---
// //   const [aides, setAides] = useState([]);
// //   const [newAide, setNewAide] = useState({ firstName: "", middleName: "", lastName: "", email: "", password: "", phone: "" });
// //   const [editingAideId, setEditingAideId] = useState(null);

// //   // --- CLINIC SERVICES STATE ---
// //   const [services, setServices] = useState([]);
// //   const [newService, setNewService] = useState({ name: "", minPrice: "", maxPrice: "", estimatedDuration: "" });
// //   const [editingServiceId, setEditingServiceId] = useState(null);

// //   // --- MEDICATIONS STATE ---
// //   const [clinicMedications, setClinicMedications] = useState([]);
// //   const [newMedication, setNewMedication] = useState({ name: "", defaultDosage: "" });
// //   const [editingMedicationId, setEditingMedicationId] = useState(null);

// //   // Fetch data when the page loads
// //   useEffect(() => {
// //     const loadData = async () => {
// //       try {
// //         const staffList = await api.getDentists();
// //         const aidesOnly = staffList.filter(staff => staff.specialization === 'Dental Aide');
// //         setAides(aidesOnly);

// //         const servicesList = await api.getServices();
// //         setServices(servicesList);

// //         const medsList = await api.getClinicMedications();
// //         setClinicMedications(medsList);

// //       } catch (error) {
// //         console.error("Failed to load settings data:", error);
// //       }
// //     };
// //     loadData();
// //   }, []);

// //   // --- AIDE HANDLERS ---
// //   const handleSaveAide = async (e) => {
// //     e.preventDefault();
// //     if (!newAide.firstName || !newAide.lastName || !newAide.email || !newAide.phone) {
// //       return toast.error("First Name, Last Name, Phone, and Email are required.");
// //     }
    
// //     if (!editingAideId && !newAide.password) {
// //         return toast.error("Password is required for new accounts.");
// //     }

// //     try {
// //       const fullNameDisplay = `${newAide.firstName} ${newAide.middleName ? newAide.middleName + " " : ""}${newAide.lastName}`.trim();
// //       const payload = {
// //         first_name: newAide.firstName, 
// //         last_name: newAide.lastName, 
// //         middle_name: newAide.middleName, 
// //         email: newAide.email, 
// //         phone: newAide.phone,
// //         specialization: "Dental Aide", 
// //         role: "aide", 
// //         status: "Available"
// //       };

// //       if (editingAideId) {
// //         await api.updateDentist(editingAideId, payload);
// //         setAides(aides.map(a => a.id === editingAideId ? { ...a, name: fullNameDisplay, email: newAide.email, phone: newAide.phone, first_name: newAide.firstName, last_name: newAide.lastName, middle_name: newAide.middleName } : a));
// //         toast.success("Dental Aide account updated successfully!");
// //       } else {
// //         payload.password = newAide.password;
// //         const newStaff = await api.createDentist(payload);
// //         setAides([...aides, { id: newStaff.id, name: fullNameDisplay, email: newAide.email, phone: newAide.phone, first_name: newAide.firstName, last_name: newAide.lastName, middle_name: newAide.middleName }]);
// //         toast.success("Dental Aide account created successfully!");
// //       }
      
// //       cancelAideEdit();
// //     } catch (error) {
// //       toast.error(error.message || "Failed to save aide.");
// //     }
// //   };

// //   const handleEditAideClick = (aide) => {
// //       setEditingAideId(aide.id);
// //       setNewAide({
// //           firstName: aide.first_name || aide.name.split(' ')[0] || "",
// //           middleName: aide.middle_name || "",
// //           lastName: aide.last_name || aide.name.split(' ').pop() || "",
// //           email: aide.email || "",
// //           password: "", 
// //           phone: aide.phone || ""
// //       });
// //   };

// //   const cancelAideEdit = () => {
// //       setEditingAideId(null);
// //       setNewAide({ firstName: "", middleName: "", lastName: "", email: "", password: "", phone: "" });
// //   };

// //   const handleDeleteAide = async (id) => {
// //     try {
// //       await api.deleteDentist(id); 
// //       setAides(aides.filter(aide => aide.id !== id));
// //       toast.success("Dental Aide securely removed.");
// //     } catch (error) {
// //       toast.error(error.message);
// //     }
// //   };

// //   // --- SERVICE HANDLERS ---
// //   const handleSaveService = async (e) => {
// //     e.preventDefault();
// //     if (!newService.name || !newService.minPrice || !newService.maxPrice || !newService.estimatedDuration) {
// //         return toast.error("All service fields are required.");
// //     }
// //     if (Number(newService.minPrice) > Number(newService.maxPrice)) {
// //         return toast.error("Minimum price cannot be higher than the maximum price.");
// //     }

// //     const payload = {
// //         name: newService.name,
// //         minPrice: newService.minPrice,
// //         maxPrice: newService.maxPrice,
// //         estimated_duration: newService.estimatedDuration
// //     };

// //     try {
// //         if (editingServiceId) {
// //             await api.updateService(editingServiceId, payload);
// //             setServices(services.map(s => s.id === editingServiceId ? { ...s, name: payload.name, min_price: payload.minPrice, max_price: payload.maxPrice, estimated_duration: payload.estimated_duration } : s));
// //             toast.success("Service updated successfully!");
// //         } else {
// //             const createdService = await api.createService(payload);
// //             setServices([...services, { id: createdService.id, name: payload.name, min_price: payload.minPrice, max_price: payload.maxPrice, estimated_duration: payload.estimated_duration }]);
// //             toast.success("Service added successfully!");
// //         }
// //         cancelServiceEdit();
// //     } catch (error) {
// //         toast.error("Failed to save service");
// //     }
// //   };

// //   const handleEditServiceClick = (service) => {
// //       setEditingServiceId(service.id);
// //       setNewService({
// //           name: service.name,
// //           minPrice: service.min_price,
// //           maxPrice: service.max_price,
// //           estimatedDuration: service.estimated_duration || ""
// //       });
// //   };

// //   const cancelServiceEdit = () => {
// //       setEditingServiceId(null);
// //       setNewService({ name: "", minPrice: "", maxPrice: "", estimatedDuration: "" });
// //   };

// //   const handleDeleteService = async (id) => {
// //     try {
// //         await api.deleteService(id);
// //         setServices(services.filter(service => service.id !== id));
// //         toast.success("Service removed.");
// //     } catch (error) {
// //         toast.error("Failed to delete service.");
// //     }
// //   };

// //   // --- MEDICATION HANDLERS ---
// //   const handleSaveMedication = async (e) => {
// //     e.preventDefault();
// //     if (!newMedication.name) {
// //         return toast.error("Medication name is required.");
// //     }

// //     const payload = {
// //         name: newMedication.name,
// //         default_dosage: newMedication.defaultDosage
// //     };

// //     try {
// //         if (editingMedicationId) {
// //             await api.updateClinicMedication(editingMedicationId, payload);
// //             setClinicMedications(clinicMedications.map(m => m.id === editingMedicationId ? { ...m, name: payload.name, default_dosage: payload.default_dosage } : m));
// //             toast.success("Medication updated successfully!");
// //         } else {
// //             const createdMed = await api.createClinicMedication(payload);
// //             setClinicMedications([...clinicMedications, { id: createdMed.id, name: payload.name, default_dosage: payload.default_dosage }]);
// //             toast.success("Medication added successfully!");
// //         }
// //         cancelMedicationEdit();
// //     } catch (error) {
// //         toast.error("Failed to save medication");
// //     }
// //   };

// //   const handleEditMedicationClick = (med) => {
// //       setEditingMedicationId(med.id);
// //       setNewMedication({
// //           name: med.name,
// //           defaultDosage: med.default_dosage || ""
// //       });
// //   };

// //   const cancelMedicationEdit = () => {
// //       setEditingMedicationId(null);
// //       setNewMedication({ name: "", defaultDosage: "" });
// //   };

// //   const handleDeleteMedication = async (id) => {
// //     try {
// //         await api.deleteClinicMedication(id);
// //         setClinicMedications(clinicMedications.filter(med => med.id !== id));
// //         toast.success("Medication removed.");
// //     } catch (error) {
// //         toast.error("Failed to delete medication.");
// //     }
// //   };

// //   return (
// //     <div className="settings-dashboard-container">
// //       <div className="settings-header-section">
// //         <h2>Clinic Settings</h2>
// //         <p>Manage your dental staff, services, and medications.</p>
// //       </div>

// //       <div className="settings-tabs">
// //         <button className={activeTab === "aides" ? "active" : ""} onClick={() => setActiveTab("aides")}>Dental Aides</button>
// //         <button className={activeTab === "services" ? "active" : ""} onClick={() => setActiveTab("services")}>Clinic Services</button>
// //         <button className={activeTab === "medications" ? "active" : ""} onClick={() => setActiveTab("medications")}>Medications</button>
// //       </div>

// //       <div className="settings-tab-content">
        
// //         {/* --- DENTAL AIDES TAB --- */}
// //         {activeTab === "aides" && (
// //           <div className="animation-fade-in">
// //             <div className={`settings-form-card ${editingAideId ? 'editing' : ''}`}>
// //                 <h3>
// //                     {editingAideId ? "Edit Dental Aide" : "Add New Dental Aide"}
// //                     <span className="helper-text">(Press Enter to save, Esc to cancel)</span>
// //                 </h3>
// //                 <form 
// //                     onSubmit={handleSaveAide} 
// //                     onKeyDown={(e) => e.key === 'Escape' && cancelAideEdit()}
// //                 >
// //                     <div className="form-row">
// //                         <div className="form-group">
// //                             <label>First Name *</label>
// //                             <input type="text" placeholder="Juan" value={newAide.firstName} onChange={(e) => setNewAide({ ...newAide, firstName: e.target.value })} />
// //                         </div>
// //                         <div className="form-group">
// //                             <label>Middle Name</label>
// //                             <input type="text" placeholder="Dela" value={newAide.middleName} onChange={(e) => setNewAide({ ...newAide, middleName: e.target.value })} />
// //                         </div>
// //                         <div className="form-group">
// //                             <label>Last Name *</label>
// //                             <input type="text" placeholder="Cruz" value={newAide.lastName} onChange={(e) => setNewAide({ ...newAide, lastName: e.target.value })} />
// //                         </div>
// //                         <div className="form-group">
// //                             <label>Contact Number *</label>
// //                             <input type="text" placeholder="09123456789" value={newAide.phone} onChange={(e) => setNewAide({ ...newAide, phone: e.target.value })} />
// //                         </div>
// //                     </div>
// //                     <div className="form-row form-row-bottom">
// //                         <div className="form-group flex-2">
// //                             <label>Email Address *</label>
// //                             <input type="email" placeholder="juan@clinic.com" value={newAide.email} onChange={(e) => setNewAide({ ...newAide, email: e.target.value })} />
// //                         </div>
// //                         {!editingAideId && (
// //                             <div className="form-group flex-2">
// //                                 <label>Given Password *</label>
// //                                 <input type="password" placeholder="••••••••" value={newAide.password} onChange={(e) => setNewAide({ ...newAide, password: e.target.value })} />
// //                             </div>
// //                         )}
// //                     </div>
// //                     {/* Hidden submit ensures 'Enter' key works */}
// //                     <button type="submit" style={{ display: 'none' }}>Submit</button>
// //                 </form>
// //             </div>

// //             <h3 className="table-title">Current Dental Aides</h3>
// //             <div className="table-container">
// //                 <table className="settings-table">
// //                 <thead><tr><th>Staff Name</th><th>Contact</th><th>Email Address</th><th>Actions</th></tr></thead>
// //                 <tbody>
// //                     {aides.length === 0 ? (<tr><td colSpan="4" className="empty-state">No dental aides registered.</td></tr>) : (
// //                         aides.map((aide) => (
// //                             <tr key={aide.id} className={editingAideId === aide.id ? "row-highlight" : ""}>
// //                                 <td className="font-semibold">{aide.name}</td>
// //                                 <td>{aide.phone || "N/A"}</td>
// //                                 <td>{aide.email}</td>
// //                                 <td>
// //                                     <div className="action-buttons">
// //                                         <button onClick={() => handleEditAideClick(aide)} className="btn-edit">Edit</button>
// //                                         <button onClick={() => handleDeleteAide(aide.id)} className="btn-delete">Remove</button>
// //                                     </div>
// //                                 </td>
// //                             </tr>
// //                         ))
// //                     )}
// //                 </tbody>
// //                 </table>
// //             </div>
// //           </div>
// //         )}

// //         {/* --- SERVICES TAB --- */}
// //         {activeTab === "services" && (
// //           <div className="animation-fade-in">
// //             <div className={`settings-form-card ${editingServiceId ? 'editing' : ''}`}>
// //                 <h3>
// //                     {editingServiceId ? "Edit Service" : "Add New Service"}
// //                     <span className="helper-text">(Press Enter to save, Esc to cancel)</span>
// //                 </h3>
// //                 <form 
// //                     onSubmit={handleSaveService}
// //                     onKeyDown={(e) => e.key === 'Escape' && cancelServiceEdit()}
// //                 >
// //                     <div className="form-row form-row-bottom">
// //                         <div className="form-group flex-2">
// //                             <label>Service Name *</label>
// //                             <input type="text" placeholder="e.g., Pasta / Filling" value={newService.name} onChange={(e) => setNewService({ ...newService, name: e.target.value })} />
// //                         </div>
// //                         <div className="form-group">
// //                             <label>Duration *</label>
// //                             <select 
// //                                 value={newService.estimatedDuration} 
// //                                 onChange={(e) => setNewService({ ...newService, estimatedDuration: e.target.value })}
// //                             >
// //                                 <option value="" disabled>Select time</option>
// //                                 <option value="15">15 mins</option>
// //                                 <option value="30">30 mins</option>
// //                                 <option value="45">45 mins</option>
// //                                 <option value="60">1 hour</option>
// //                                 <option value="90">1.5 hours</option>
// //                                 <option value="120">2 hours</option>
// //                             </select>
// //                         </div>
// //                         <div className="form-group">
// //                             <label>Min Price (₱) *</label>
// //                             <input type="number" placeholder="500" value={newService.minPrice} onChange={(e) => setNewService({ ...newService, minPrice: e.target.value })} />
// //                         </div>
// //                         <div className="form-group">
// //                             <label>Max Price (₱) *</label>
// //                             <input type="number" placeholder="1500" value={newService.maxPrice} onChange={(e) => setNewService({ ...newService, maxPrice: e.target.value })} />
// //                         </div>
// //                     </div>
// //                     {/* Hidden submit ensures 'Enter' key works */}
// //                     <button type="submit" style={{ display: 'none' }}>Submit</button>
// //                 </form>
// //             </div>

// //             <h3 className="table-title">Available Services & Pricing</h3>
// //             <div className="table-container">
// //                 <table className="settings-table">
// //                 <thead><tr><th>Service Name</th><th>Est. Duration</th><th>Price Range (PHP)</th><th>Actions</th></tr></thead>
// //                 <tbody>
// //                     {services.length === 0 ? (<tr><td colSpan="4" className="empty-state">No services have been added yet.</td></tr>) : (
// //                         services.map((service) => (
// //                             <tr key={service.id} className={editingServiceId === service.id ? "row-highlight" : ""}>
// //                                 <td className="font-semibold">{service.name}</td>
// //                                 <td>{service.estimated_duration ? `${service.estimated_duration} mins` : "N/A"}</td>
// //                                 <td>
// //                                     <span className="price-badge">₱{service.min_price}</span>
// //                                     <span className="price-separator">to</span>
// //                                     <span className="price-badge">₱{service.max_price}</span>
// //                                 </td>
// //                                 <td>
// //                                     <div className="action-buttons">
// //                                         <button onClick={() => handleEditServiceClick(service)} className="btn-edit">Edit</button>
// //                                         <button onClick={() => handleDeleteService(service.id)} className="btn-delete">Remove</button>
// //                                     </div>
// //                                 </td>
// //                             </tr>
// //                         ))
// //                     )}
// //                 </tbody>
// //                 </table>
// //             </div>
// //           </div>
// //         )}

// //         {/* --- MEDICATIONS TAB --- */}
// //         {activeTab === "medications" && (
// //           <div className="animation-fade-in">
// //             <div className={`settings-form-card ${editingMedicationId ? 'editing' : ''}`}>
// //                 <h3>
// //                     {editingMedicationId ? "Edit Medication" : "Add Medication to Master List"}
// //                     <span className="helper-text">(Press Enter to save, Esc to cancel)</span>
// //                 </h3>
// //                 <form 
// //                     onSubmit={handleSaveMedication}
// //                     onKeyDown={(e) => e.key === 'Escape' && cancelMedicationEdit()}
// //                 >
// //                     <div className="form-row form-row-bottom">
// //                         <div className="form-group flex-2">
// //                             <label>Medicine Name *</label>
// //                             <input type="text" placeholder="e.g., Amoxicillin" value={newMedication.name} onChange={(e) => setNewMedication({ ...newMedication, name: e.target.value })} />
// //                         </div>
// //                         <div className="form-group flex-2">
// //                             <label>Default Dosage</label>
// //                             <input type="text" placeholder="e.g., 500mg" value={newMedication.defaultDosage} onChange={(e) => setNewMedication({ ...newMedication, defaultDosage: e.target.value })} />
// //                         </div>
// //                     </div>
// //                     {/* Hidden submit ensures 'Enter' key works */}
// //                     <button type="submit" style={{ display: 'none' }}>Submit</button>
// //                 </form>
// //             </div>

// //             <h3 className="table-title">Current Available Medications</h3>
// //             <div className="table-container">
// //                 <table className="settings-table">
// //                 <thead><tr><th>Medicine Name</th><th>Default Dosage</th><th>Actions</th></tr></thead>
// //                 <tbody>
// //                     {clinicMedications.length === 0 ? (<tr><td colSpan="3" className="empty-state">No medications added to the master list yet.</td></tr>) : (
// //                         clinicMedications.map((med) => (
// //                             <tr key={med.id} className={editingMedicationId === med.id ? "row-highlight" : ""}>
// //                                 <td className="font-semibold">{med.name}</td>
// //                                 <td>{med.default_dosage || "N/A"}</td>
// //                                 <td>
// //                                     <div className="action-buttons">
// //                                         <button onClick={() => handleEditMedicationClick(med)} className="btn-edit">Edit</button>
// //                                         <button onClick={() => handleDeleteMedication(med.id)} className="btn-delete">Remove</button>
// //                                     </div>
// //                                 </td>
// //                             </tr>
// //                         ))
// //                     )}
// //                 </tbody>
// //                 </table>
// //             </div>
// //           </div>
// //         )}

// //       </div>
// //     </div>
// //   );
// // }

// // export default DentistSettings;


// import React, { useState, useEffect } from "react";
// import toast from "react-hot-toast";
// import api from "../../api/apiClient"; 
// import "../../styles/pages/dentist/DentistSettings.css";

// function DentistSettings() {
//   const [activeTab, setActiveTab] = useState("aides");

//   // --- DENTAL AIDES STATE ---
//   const [aides, setAides] = useState([]);
//   const [newAide, setNewAide] = useState({ firstName: "", middleName: "", lastName: "", email: "", password: "", phone: "" });
//   const [editingAideId, setEditingAideId] = useState(null);

//   // --- CLINIC SERVICES STATE ---
//   const [services, setServices] = useState([]);
//   const [newService, setNewService] = useState({ name: "", minPrice: "", maxPrice: "", estimatedDuration: "" });
//   const [editingServiceId, setEditingServiceId] = useState(null);

//   // --- MEDICATIONS STATE ---
//   const [clinicMedications, setClinicMedications] = useState([]);
//   const [newMedication, setNewMedication] = useState({ name: "", defaultDosage: "" });
//   const [editingMedicationId, setEditingMedicationId] = useState(null);

//   // Fetch data when the page loads
//   useEffect(() => {
//     const loadData = async () => {
//       try {
//         const staffList = await api.getDentists();
//         const aidesOnly = staffList.filter(staff => staff.specialization === 'Dental Aide');
//         setAides(aidesOnly);

//         const servicesList = await api.getServices();
//         setServices(servicesList);

//         const medsList = await api.getClinicMedications();
//         setClinicMedications(medsList);

//       } catch (error) {
//         console.error("Failed to load settings data:", error);
//       }
//     };
//     loadData();
//   }, []);

//   // --- AIDE HANDLERS ---
//   const handleSaveAide = async (e) => {
//     e.preventDefault();
//     if (!newAide.firstName || !newAide.lastName || !newAide.email || !newAide.phone) {
//       return toast.error("First Name, Last Name, Phone, and Email are required.");
//     }
    
//     if (!editingAideId && !newAide.password) {
//         return toast.error("Password is required for new accounts.");
//     }

//     try {
//       const fullNameDisplay = `${newAide.firstName} ${newAide.middleName ? newAide.middleName + " " : ""}${newAide.lastName}`.trim();
//       const payload = {
//         first_name: newAide.firstName, 
//         last_name: newAide.lastName, 
//         middle_name: newAide.middleName, 
//         email: newAide.email, 
//         phone: newAide.phone,
//         specialization: "Dental Aide", 
//         role: "aide", 
//         status: "Available"
//       };

//       if (editingAideId) {
//         await api.updateDentist(editingAideId, payload);
//         setAides(aides.map(a => a.id === editingAideId ? { ...a, name: fullNameDisplay, email: newAide.email, phone: newAide.phone, first_name: newAide.firstName, last_name: newAide.lastName, middle_name: newAide.middleName } : a));
//         toast.success("Dental Aide account updated successfully!");
//       } else {
//         payload.password = newAide.password;
//         const newStaff = await api.createDentist(payload);
//         setAides([...aides, { id: newStaff.id, name: fullNameDisplay, email: newAide.email, phone: newAide.phone, first_name: newAide.firstName, last_name: newAide.lastName, middle_name: newAide.middleName }]);
//         toast.success("Dental Aide account created successfully!");
//       }
      
//       cancelAideEdit();
//     } catch (error) {
//       toast.error(error.message || "Failed to save aide.");
//     }
//   };

//   const handleEditAideClick = (aide) => {
//       setEditingAideId(aide.id);
//       setNewAide({
//           firstName: aide.first_name || aide.name.split(' ')[0] || "",
//           middleName: aide.middle_name || "",
//           lastName: aide.last_name || aide.name.split(' ').pop() || "",
//           email: aide.email || "",
//           password: "", 
//           phone: aide.phone || ""
//       });
//   };

//   const cancelAideEdit = () => {
//       setEditingAideId(null);
//       setNewAide({ firstName: "", middleName: "", lastName: "", email: "", password: "", phone: "" });
//   };

//   const handleDeleteAide = async (id) => {
//     try {
//       await api.deleteDentist(id); 
//       setAides(aides.filter(aide => aide.id !== id));
//       toast.success("Dental Aide securely removed.");
//     } catch (error) {
//       toast.error(error.message);
//     }
//   };

//   // --- SERVICE HANDLERS ---
//   const handleSaveService = async (e) => {
//     e.preventDefault();
//     if (!newService.name || !newService.minPrice || !newService.maxPrice || !newService.estimatedDuration) {
//         return toast.error("All service fields are required.");
//     }
//     if (Number(newService.minPrice) > Number(newService.maxPrice)) {
//         return toast.error("Minimum price cannot be higher than the maximum price.");
//     }

//     const payload = {
//         name: newService.name,
//         minPrice: newService.minPrice,
//         maxPrice: newService.maxPrice,
//         estimated_duration: newService.estimatedDuration
//     };

//     try {
//         if (editingServiceId) {
//             await api.updateService(editingServiceId, payload);
//             setServices(services.map(s => s.id === editingServiceId ? { ...s, name: payload.name, min_price: payload.minPrice, max_price: payload.maxPrice, estimated_duration: payload.estimated_duration } : s));
//             toast.success("Service updated successfully!");
//         } else {
//             const createdService = await api.createService(payload);
//             setServices([...services, { id: createdService.id, name: payload.name, min_price: payload.minPrice, max_price: payload.maxPrice, estimated_duration: payload.estimated_duration }]);
//             toast.success("Service added successfully!");
//         }
//         cancelServiceEdit();
//     } catch (error) {
//         toast.error("Failed to save service");
//     }
//   };

//   const handleEditServiceClick = (service) => {
//       setEditingServiceId(service.id);
//       setNewService({
//           name: service.name,
//           minPrice: service.min_price,
//           maxPrice: service.max_price,
//           estimatedDuration: service.estimated_duration || ""
//       });
//   };

//   const cancelServiceEdit = () => {
//       setEditingServiceId(null);
//       setNewService({ name: "", minPrice: "", maxPrice: "", estimatedDuration: "" });
//   };

//   const handleDeleteService = async (id) => {
//     try {
//         await api.deleteService(id);
//         setServices(services.filter(service => service.id !== id));
//         toast.success("Service removed.");
//     } catch (error) {
//         toast.error("Failed to delete service.");
//     }
//   };

//   // --- MEDICATION HANDLERS ---
//   const handleSaveMedication = async (e) => {
//     e.preventDefault();
//     if (!newMedication.name) {
//         return toast.error("Medication name is required.");
//     }

//     const payload = {
//         name: newMedication.name,
//         default_dosage: newMedication.defaultDosage
//     };

//     try {
//         if (editingMedicationId) {
//             await api.updateClinicMedication(editingMedicationId, payload);
//             setClinicMedications(clinicMedications.map(m => m.id === editingMedicationId ? { ...m, name: payload.name, default_dosage: payload.default_dosage } : m));
//             toast.success("Medication updated successfully!");
//         } else {
//             const createdMed = await api.createClinicMedication(payload);
//             setClinicMedications([...clinicMedications, { id: createdMed.id, name: payload.name, default_dosage: payload.default_dosage }]);
//             toast.success("Medication added successfully!");
//         }
//         cancelMedicationEdit();
//     } catch (error) {
//         toast.error("Failed to save medication");
//     }
//   };

//   const handleEditMedicationClick = (med) => {
//       setEditingMedicationId(med.id);
//       setNewMedication({
//           name: med.name,
//           defaultDosage: med.default_dosage || ""
//       });
//   };

//   const cancelMedicationEdit = () => {
//       setEditingMedicationId(null);
//       setNewMedication({ name: "", defaultDosage: "" });
//   };

//   const handleDeleteMedication = async (id) => {
//     try {
//         await api.deleteClinicMedication(id);
//         setClinicMedications(clinicMedications.filter(med => med.id !== id));
//         toast.success("Medication removed.");
//     } catch (error) {
//         toast.error("Failed to delete medication.");
//     }
//   };

//   return (
//     <div className="settings-dashboard-container">
//       <div className="settings-header-section">
//         <h2>Clinic Settings</h2>
//         <p>Manage your dental staff, services, and medications.</p>
//       </div>

//       <div className="settings-tabs">
//         <button className={activeTab === "aides" ? "active" : ""} onClick={() => setActiveTab("aides")}>Dental Aides</button>
//         <button className={activeTab === "services" ? "active" : ""} onClick={() => setActiveTab("services")}>Clinic Services</button>
//         <button className={activeTab === "medications" ? "active" : ""} onClick={() => setActiveTab("medications")}>Medications</button>
//       </div>

//       <div className="settings-tab-content">
        
//         {/* --- DENTAL AIDES TAB --- */}
//         {activeTab === "aides" && (
//           <div className="animation-fade-in">
//             <div className={`settings-form-card ${editingAideId ? 'editing' : ''}`}>
//                 <h3>
//                     {editingAideId ? "Edit Dental Aide" : "Add New Dental Aide"}
//                     <span className="helper-text">(Press Enter to save, Esc to cancel)</span>
//                 </h3>
//                 <form 
//                     onSubmit={handleSaveAide} 
//                     onKeyDown={(e) => e.key === 'Escape' && cancelAideEdit()}
//                 >
//                     <div className="form-row">
//                         <div className="form-group">
//                             <label>First Name *</label>
//                             <input type="text" placeholder="Juan" value={newAide.firstName} onChange={(e) => setNewAide({ ...newAide, firstName: e.target.value })} />
//                         </div>
//                         <div className="form-group">
//                             <label>Middle Name</label>
//                             <input type="text" placeholder="Dela" value={newAide.middleName} onChange={(e) => setNewAide({ ...newAide, middleName: e.target.value })} />
//                         </div>
//                         <div className="form-group">
//                             <label>Last Name *</label>
//                             <input type="text" placeholder="Cruz" value={newAide.lastName} onChange={(e) => setNewAide({ ...newAide, lastName: e.target.value })} />
//                         </div>
//                         <div className="form-group">
//                             <label>Contact Number *</label>
//                             <input type="text" placeholder="09123456789" value={newAide.phone} onChange={(e) => setNewAide({ ...newAide, phone: e.target.value })} />
//                         </div>
//                     </div>
//                     <div className="form-row form-row-bottom">
//                         <div className="form-group flex-2">
//                             <label>Email Address *</label>
//                             <input type="email" placeholder="juan@clinic.com" value={newAide.email} onChange={(e) => setNewAide({ ...newAide, email: e.target.value })} />
//                         </div>
//                         {!editingAideId && (
//                             <div className="form-group flex-2">
//                                 <label>Given Password *</label>
//                                 <input type="password" placeholder="••••••••" value={newAide.password} onChange={(e) => setNewAide({ ...newAide, password: e.target.value })} />
//                             </div>
//                         )}
//                     </div>
//                     {/* Hidden submit ensures 'Enter' key works */}
//                     <button type="submit" style={{ display: 'none' }}>Submit</button>
//                 </form>
//             </div>

//             <h3 className="table-title">Current Dental Aides</h3>
//             <div className="table-container">
//                 <table className="settings-table">
//                 <thead><tr><th>Staff Name</th><th>Contact</th><th>Email Address</th><th>Actions</th></tr></thead>
//                 <tbody>
//                     {aides.length === 0 ? (<tr><td colSpan="4" className="empty-state">No dental aides registered.</td></tr>) : (
//                         aides.map((aide) => (
//                             <tr key={aide.id} className={editingAideId === aide.id ? "row-highlight" : ""}>
//                                 <td className="font-semibold">{aide.name}</td>
//                                 <td>{aide.phone || "N/A"}</td>
//                                 <td>{aide.email}</td>
//                                 <td>
//                                     <div className="action-buttons">
//                                         <button onClick={() => handleEditAideClick(aide)} className="btn-edit">Edit</button>
//                                         <button onClick={() => handleDeleteAide(aide.id)} className="btn-delete">Remove</button>
//                                     </div>
//                                 </td>
//                             </tr>
//                         ))
//                     )}
//                 </tbody>
//                 </table>
//             </div>
//           </div>
//         )}

//         {/* --- SERVICES TAB --- */}
//         {activeTab === "services" && (
//           <div className="animation-fade-in">
//             <div className={`settings-form-card ${editingServiceId ? 'editing' : ''}`}>
//                 <h3>
//                     {editingServiceId ? "Edit Service" : "Add New Service"}
//                     <span className="helper-text">(Press Enter to save, Esc to cancel)</span>
//                 </h3>
//                 <form 
//                     onSubmit={handleSaveService}
//                     onKeyDown={(e) => e.key === 'Escape' && cancelServiceEdit()}
//                 >
//                     <div className="form-row form-row-bottom">
//                         <div className="form-group flex-2">
//                             <label>Service Name *</label>
//                             <input type="text" placeholder="e.g., Pasta / Filling" value={newService.name} onChange={(e) => setNewService({ ...newService, name: e.target.value })} />
//                         </div>
//                         <div className="form-group">
//                             <label>Duration *</label>
//                             <select 
//                                 value={newService.estimatedDuration} 
//                                 onChange={(e) => setNewService({ ...newService, estimatedDuration: e.target.value })}
//                             >
//                                 <option value="" disabled>Select time</option>
//                                 <option value="15">15 mins</option>
//                                 <option value="30">30 mins</option>
//                                 <option value="45">45 mins</option>
//                                 <option value="60">1 hour</option>
//                                 <option value="90">1.5 hours</option>
//                                 <option value="120">2 hours</option>
//                             </select>
//                         </div>
//                         <div className="form-group">
//                             <label>Min Price (₱) *</label>
//                             <input type="number" placeholder="500" value={newService.minPrice} onChange={(e) => setNewService({ ...newService, minPrice: e.target.value })} />
//                         </div>
//                         <div className="form-group">
//                             <label>Max Price (₱) *</label>
//                             <input type="number" placeholder="1500" value={newService.maxPrice} onChange={(e) => setNewService({ ...newService, maxPrice: e.target.value })} />
//                         </div>
//                     </div>
//                     {/* Hidden submit ensures 'Enter' key works */}
//                     <button type="submit" style={{ display: 'none' }}>Submit</button>
//                 </form>
//             </div>

//             <h3 className="table-title">Available Services & Pricing</h3>
//             <div className="table-container">
//                 <table className="settings-table">
//                 <thead><tr><th>Service Name</th><th>Est. Duration</th><th>Price Range (PHP)</th><th>Actions</th></tr></thead>
//                 <tbody>
//                     {services.length === 0 ? (<tr><td colSpan="4" className="empty-state">No services have been added yet.</td></tr>) : (
//                         services.map((service) => (
//                             <tr key={service.id} className={editingServiceId === service.id ? "row-highlight" : ""}>
//                                 <td className="font-semibold">{service.name}</td>
//                                 <td>{service.estimated_duration ? `${service.estimated_duration} mins` : "N/A"}</td>
//                                 <td>
//                                     <span className="price-badge">₱{service.min_price}</span>
//                                     <span className="price-separator">to</span>
//                                     <span className="price-badge">₱{service.max_price}</span>
//                                 </td>
//                                 <td>
//                                     <div className="action-buttons">
//                                         <button onClick={() => handleEditServiceClick(service)} className="btn-edit">Edit</button>
//                                         <button onClick={() => handleDeleteService(service.id)} className="btn-delete">Remove</button>
//                                     </div>
//                                 </td>
//                             </tr>
//                         ))
//                     )}
//                 </tbody>
//                 </table>
//             </div>
//           </div>
//         )}

//         {/* --- MEDICATIONS TAB --- */}
//         {activeTab === "medications" && (
//           <div className="animation-fade-in">
//             <div className={`settings-form-card ${editingMedicationId ? 'editing' : ''}`}>
//                 <h3>
//                     {editingMedicationId ? "Edit Medication" : "Add Medication to Master List"}
//                     <span className="helper-text">(Press Enter to save, Esc to cancel)</span>
//                 </h3>
//                 <form 
//                     onSubmit={handleSaveMedication}
//                     onKeyDown={(e) => e.key === 'Escape' && cancelMedicationEdit()}
//                 >
//                     <div className="form-row form-row-bottom">
//                         <div className="form-group flex-2">
//                             <label>Medicine Name *</label>
//                             <input type="text" placeholder="e.g., Amoxicillin" value={newMedication.name} onChange={(e) => setNewMedication({ ...newMedication, name: e.target.value })} />
//                         </div>
//                         <div className="form-group flex-2">
//                             <label>Default Dosage</label>
//                             <select 
//                                 value={newMedication.defaultDosage} 
//                                 onChange={(e) => setNewMedication({ ...newMedication, defaultDosage: e.target.value })}
//                             >
//                                 <option value="" disabled>Select dosage</option>
//                                 <option value="125mg">125mg</option>
//                                 <option value="250mg">250mg</option>
//                                 <option value="500mg">500mg</option>
//                                 <option value="875mg">875mg</option>
//                                 <option value="1000mg">1000mg (1g)</option>
//                                 <option value="5ml">5ml</option>
//                                 <option value="10ml">10ml</option>
//                                 <option value="15ml">15ml</option>
//                                 <option value="1 Drop">1 Drop</option>
//                                 <option value="2 Drops">2 Drops</option>
//                                 <option value="As Needed">As Needed</option>
//                                 <option value="N/A">N/A</option>
//                             </select>
//                         </div>
//                     </div>
//                     {/* Hidden submit ensures 'Enter' key works */}
//                     <button type="submit" style={{ display: 'none' }}>Submit</button>
//                 </form>
//             </div>

//             <h3 className="table-title">Current Available Medications</h3>
//             <div className="table-container">
//                 <table className="settings-table">
//                 <thead><tr><th>Medicine Name</th><th>Default Dosage</th><th>Actions</th></tr></thead>
//                 <tbody>
//                     {clinicMedications.length === 0 ? (<tr><td colSpan="3" className="empty-state">No medications added to the master list yet.</td></tr>) : (
//                         clinicMedications.map((med) => (
//                             <tr key={med.id} className={editingMedicationId === med.id ? "row-highlight" : ""}>
//                                 <td className="font-semibold">{med.name}</td>
//                                 <td>{med.default_dosage || "N/A"}</td>
//                                 <td>
//                                     <div className="action-buttons">
//                                         <button onClick={() => handleEditMedicationClick(med)} className="btn-edit">Edit</button>
//                                         <button onClick={() => handleDeleteMedication(med.id)} className="btn-delete">Remove</button>
//                                     </div>
//                                 </td>
//                             </tr>
//                         ))
//                     )}
//                 </tbody>
//                 </table>
//             </div>
//           </div>
//         )}

//       </div>
//     </div>
//   );
// }

// export default DentistSettings;


import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import api from "../../api/apiClient"; 
import "../../styles/pages/dentist/DentistSettings.css";

function DentistSettings() {
  const [activeTab, setActiveTab] = useState("aides");

  // --- DENTAL AIDES STATE ---
  const [aides, setAides] = useState([]);
  const [newAide, setNewAide] = useState({ firstName: "", middleName: "", lastName: "", email: "", password: "", phone: "" });
  const [editingAideId, setEditingAideId] = useState(null);

  // --- CLINIC SERVICES STATE ---
  const [services, setServices] = useState([]);
  const [newService, setNewService] = useState({ name: "", minPrice: "", maxPrice: "", estimatedDuration: "" });
  const [editingServiceId, setEditingServiceId] = useState(null);

  // --- MEDICATIONS STATE ---
  const [clinicMedications, setClinicMedications] = useState([]);
  const [newMedication, setNewMedication] = useState({ name: "", defaultDosage: "" });
  const [editingMedicationId, setEditingMedicationId] = useState(null);

  // Fetch data when the page loads
  useEffect(() => {
    const loadData = async () => {
      try {
        const staffList = await api.getDentists();
        const aidesOnly = staffList.filter(staff => staff.specialization === 'Dental Aide');
        setAides(aidesOnly);

        const servicesList = await api.getServices();
        setServices(servicesList);

        const medsList = await api.getClinicMedications();
        setClinicMedications(medsList);

      } catch (error) {
        console.error("Failed to load settings data:", error);
      }
    };
    loadData();
  }, []);

  // --- AIDE HANDLERS ---
  const handleSaveAide = async (e) => {
    e.preventDefault();
    if (!newAide.firstName || !newAide.lastName || !newAide.email || !newAide.phone) {
      return toast.error("First Name, Last Name, Phone, and Email are required.");
    }
    
    if (!editingAideId && !newAide.password) {
        return toast.error("Password is required for new accounts.");
    }

    try {
      const fullNameDisplay = `${newAide.firstName} ${newAide.middleName ? newAide.middleName + " " : ""}${newAide.lastName}`.trim();
      const payload = {
        first_name: newAide.firstName, 
        last_name: newAide.lastName, 
        middle_name: newAide.middleName, 
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
        toast.success("Dental Aide account created successfully!");
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

  // --- SERVICE HANDLERS ---
  const handleSaveService = async (e) => {
    e.preventDefault();
    if (!newService.name || !newService.minPrice || !newService.maxPrice || !newService.estimatedDuration) {
        return toast.error("All service fields are required.");
    }
    if (Number(newService.minPrice) > Number(newService.maxPrice)) {
        return toast.error("Minimum price cannot be higher than the maximum price.");
    }

    const payload = {
        name: newService.name,
        minPrice: newService.minPrice,
        maxPrice: newService.maxPrice,
        estimated_duration: newService.estimatedDuration
    };

    try {
        if (editingServiceId) {
            await api.updateService(editingServiceId, payload);
            setServices(services.map(s => s.id === editingServiceId ? { ...s, name: payload.name, min_price: payload.minPrice, max_price: payload.maxPrice, estimated_duration: payload.estimated_duration } : s));
            toast.success("Service updated successfully!");
        } else {
            const createdService = await api.createService(payload);
            setServices([...services, { id: createdService.id, name: payload.name, min_price: payload.minPrice, max_price: payload.maxPrice, estimated_duration: payload.estimated_duration }]);
            toast.success("Service added successfully!");
        }
        cancelServiceEdit();
    } catch (error) {
        toast.error("Failed to save service");
    }
  };

  const handleEditServiceClick = (service) => {
      setEditingServiceId(service.id);
      setNewService({
          name: service.name,
          minPrice: service.min_price,
          maxPrice: service.max_price,
          estimatedDuration: service.estimated_duration || ""
      });
  };

  const cancelServiceEdit = () => {
      setEditingServiceId(null);
      setNewService({ name: "", minPrice: "", maxPrice: "", estimatedDuration: "" });
  };

  const handleDeleteService = async (id) => {
    try {
        await api.deleteService(id);
        setServices(services.filter(service => service.id !== id));
        toast.success("Service removed.");
    } catch (error) {
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
        default_dosage: newMedication.defaultDosage
    };

    try {
        if (editingMedicationId) {
            await api.updateClinicMedication(editingMedicationId, payload);
            setClinicMedications(clinicMedications.map(m => m.id === editingMedicationId ? { ...m, name: payload.name, default_dosage: payload.default_dosage } : m));
            toast.success("Medication updated successfully!");
        } else {
            const createdMed = await api.createClinicMedication(payload);
            setClinicMedications([...clinicMedications, { id: createdMed.id, name: payload.name, default_dosage: payload.default_dosage }]);
            toast.success("Medication added successfully!");
        }
        cancelMedicationEdit();
    } catch (error) {
        toast.error("Failed to save medication");
    }
  };

  const handleEditMedicationClick = (med) => {
      setEditingMedicationId(med.id);
      setNewMedication({
          name: med.name,
          defaultDosage: med.default_dosage || ""
      });
  };

  const cancelMedicationEdit = () => {
      setEditingMedicationId(null);
      setNewMedication({ name: "", defaultDosage: "" });
  };

  const handleDeleteMedication = async (id) => {
    try {
        await api.deleteClinicMedication(id);
        setClinicMedications(clinicMedications.filter(med => med.id !== id));
        toast.success("Medication removed.");
    } catch (error) {
        toast.error("Failed to delete medication.");
    }
  };

  // REUSABLE STYLES FOR THE VISIBLE SAVE BUTTONS
  const saveBtnStyle = { padding: '10px 20px', background: '#0ea5e9', color: 'white', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: 'bold' };
  const cancelBtnStyle = { padding: '10px 20px', background: '#94a3b8', color: 'white', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: 'bold' };

  return (
    <div className="settings-dashboard-container">
      <div className="settings-header-section">
        <h2>Clinic Settings</h2>
        <p>Manage your dental staff, services, and medications.</p>
      </div>

      <div className="settings-tabs">
        <button className={activeTab === "aides" ? "active" : ""} onClick={() => setActiveTab("aides")}>Dental Aides</button>
        <button className={activeTab === "services" ? "active" : ""} onClick={() => setActiveTab("services")}>Clinic Services</button>
        <button className={activeTab === "medications" ? "active" : ""} onClick={() => setActiveTab("medications")}>Medications</button>
      </div>

      <div className="settings-tab-content">
        
        {/* --- DENTAL AIDES TAB --- */}
        {activeTab === "aides" && (
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
                                <option value="15">15 mins</option>
                                <option value="30">30 mins</option>
                                <option value="45">45 mins</option>
                                <option value="60">1 hour</option>
                                <option value="90">1.5 hours</option>
                                <option value="120">2 hours</option>
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
                    
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '15px' }}>
                        {editingServiceId && <button type="button" style={cancelBtnStyle} onClick={cancelServiceEdit}>Cancel</button>}
                        <button type="submit" style={saveBtnStyle}>{editingServiceId ? 'Save Changes' : 'Add Service'}</button>
                    </div>
                </form>
            </div>

            <h3 className="table-title">Available Services & Pricing</h3>
            <div className="table-container">
                <table className="settings-table">
                <thead><tr><th>Service Name</th><th>Est. Duration</th><th>Price Range (PHP)</th><th>Actions</th></tr></thead>
                <tbody>
                    {services.length === 0 ? (<tr><td colSpan="4" className="empty-state">No services have been added yet.</td></tr>) : (
                        services.map((service) => (
                            <tr key={service.id} className={editingServiceId === service.id ? "row-highlight" : ""}>
                                <td className="font-semibold">{service.name}</td>
                                <td>{service.estimated_duration ? `${service.estimated_duration} mins` : "N/A"}</td>
                                <td>
                                    <span className="price-badge">₱{service.min_price}</span>
                                    <span className="price-separator">to</span>
                                    <span className="price-badge">₱{service.max_price}</span>
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
                <thead><tr><th>Medicine Name</th><th>Default Dosage</th><th>Actions</th></tr></thead>
                <tbody>
                    {clinicMedications.length === 0 ? (<tr><td colSpan="3" className="empty-state">No medications added to the master list yet.</td></tr>) : (
                        clinicMedications.map((med) => (
                            <tr key={med.id} className={editingMedicationId === med.id ? "row-highlight" : ""}>
                                <td className="font-semibold">{med.name}</td>
                                <td>{med.default_dosage || "N/A"}</td>
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

      </div>
    </div>
  );
}

export default DentistSettings;