// // import React, { useState, useEffect } from "react";
// // import toast from "react-hot-toast";
// // import api from "../../api/apiClient"; 
// // import "../../styles/pages/dentist/DentistSettings.css";

// // function DentistSettings() {
// //   const [activeTab, setActiveTab] = useState("aides");

// //   // --- DENTAL AIDES STATE ---
// //   const [aides, setAides] = useState([]);
// //   const [newAide, setNewAide] = useState({ firstName: "", middleName: "", lastName: "", email: "", password: "", phone: "" });

// //   // --- CLINIC SERVICES STATE ---
// //   const [services, setServices] = useState([]);
// //   const [newService, setNewService] = useState({ name: "", minPrice: "", maxPrice: "", estimatedDuration: "" });

// //   // 1. Fetch real aides and services when the page loads
// //   useEffect(() => {
// //     const loadData = async () => {
// //       try {
// //         const staffList = await api.getDentists();
// //         // ONLY show staff with "Dental Aide" specialization here
// //         const aidesOnly = staffList.filter(staff => staff.specialization === 'Dental Aide');
// //         setAides(aidesOnly);

// //         // Fetch dynamic services from the database
// //         const servicesList = await api.getServices();
// //         setServices(servicesList);
// //       } catch (error) {
// //         console.error("Failed to load settings data:", error);
// //       }
// //     };
// //     loadData();
// //   }, []);

// //   // 2. Handle Add Aide
// //   const handleAddAide = async (e) => {
// //     e.preventDefault();
// //     if (!newAide.firstName || !newAide.lastName || !newAide.email || !newAide.password || !newAide.phone) {
// //       return toast.error("First Name, Last Name, Phone, Email, and Password are required.");
// //     }
// //     try {
// //       const fullNameDisplay = `${newAide.firstName} ${newAide.middleName ? newAide.middleName + " " : ""}${newAide.lastName}`.trim();
// //       const newStaff = await api.createDentist({
// //         first_name: newAide.firstName, 
// //         last_name: newAide.lastName, 
// //         middle_name: newAide.middleName, 
// //         email: newAide.email, 
// //         password: newAide.password,
// //         phone: newAide.phone,
// //         specialization: "Dental Aide", // This ensures it displays in this specific list
// //         role: "aide", 
// //         status: "Available"
// //       });
// //       setAides([...aides, { id: newStaff.id, name: fullNameDisplay, email: newAide.email, phone: newAide.phone }]);
// //       setNewAide({ firstName: "", middleName: "", lastName: "", email: "", password: "", phone: "" });
// //       toast.success("Dental Aide account created successfully!");
// //     } catch (error) {
// //       toast.error(error.message || "Failed to create aide.");
// //     }
// //   };

// //   // 3. Handle Delete Aide
// //   const handleDeleteAide = async (id) => {
// //     try {
// //       await api.deleteDentist(id); // Use the API client instead of raw fetch
// //       setAides(aides.filter(aide => aide.id !== id));
// //       toast.success("Dental Aide securely removed.");
// //     } catch (error) {
// //       toast.error(error.message);
// //     }
// //   };

// //   // 4. Handle Add Service
// //   const handleAddService = async (e) => {
// //     e.preventDefault();
// //     if (!newService.name || !newService.minPrice || !newService.maxPrice || !newService.estimatedDuration) {
// //         return toast.error("All service fields are required.");
// //     }
// //     if (Number(newService.minPrice) > Number(newService.maxPrice)) {
// //         return toast.error("Minimum price cannot be higher than the maximum price.");
// //     }

// //     try {
// //         const createdService = await api.createService({
// //             ...newService,
// //             estimated_duration: newService.estimatedDuration
// //         });
// //         setServices([...services, { id: createdService.id, name: newService.name, min_price: newService.minPrice, max_price: newService.maxPrice, estimated_duration: newService.estimatedDuration }]);
// //         setNewService({ name: "", minPrice: "", maxPrice: "", estimatedDuration: "" });
// //         toast.success("Service added successfully!");
// //     } catch (error) {
// //         toast.error("Failed to add service");
// //     }
// //   };

// //   // 5. Handle Delete Service
// //   const handleDeleteService = async (id) => {
// //     try {
// //         await api.deleteService(id);
// //         setServices(services.filter(service => service.id !== id));
// //         toast.success("Service removed.");
// //     } catch (error) {
// //         toast.error("Failed to delete service.");
// //     }
// //   };

// //   return (
// //     <div className="dashboard-container" style={{ padding: "20px", maxWidth: "1200px", margin: "0 auto" }}>
// //       <div style={{ marginBottom: "25px" }}>
// //         <h2 style={{ fontSize: "24px", color: "#1e293b", marginBottom: "5px" }}>Clinic Settings</h2>
// //         <p style={{ color: "#64748b" }}>Manage your dental staff and the clinic's offered services.</p>
// //       </div>

// //       <div className="tabs" style={{ display: "flex", gap: "20px", borderBottom: "2px solid #e2e8f0", marginBottom: "30px" }}>
// //         <button onClick={() => setActiveTab("aides")} style={{ padding: "12px 5px", fontSize: "16px", fontWeight: "600", border: "none", borderBottom: activeTab === "aides" ? "3px solid var(--primary-color)" : "3px solid transparent", background: "none", color: activeTab === "aides" ? "var(--primary-color)" : "#64748b", cursor: "pointer", transition: "all 0.2s" }}>Dental Aides</button>
// //         <button onClick={() => setActiveTab("services")} style={{ padding: "12px 5px", fontSize: "16px", fontWeight: "600", border: "none", borderBottom: activeTab === "services" ? "3px solid var(--primary-color)" : "3px solid transparent", background: "none", color: activeTab === "services" ? "var(--primary-color)" : "#64748b", cursor: "pointer", transition: "all 0.2s" }}>Clinic Services</button>
// //       </div>

// //       <div className="tab-content">
// //         {activeTab === "aides" && (
// //           <div className="aides-section animation-fade-in">
// //             <div style={{ background: "#f8fafc", padding: "20px", borderRadius: "8px", border: "1px solid #e2e8f0", marginBottom: "30px" }}>
// //                 <h3 style={{ marginTop: 0, marginBottom: "15px", color: "#334155" }}>Add New Dental Aide</h3>
// //                 <form onSubmit={handleAddAide} style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
// //                 <div style={{ display: "flex", gap: "15px", flexWrap: "wrap" }}>
// //                     <div style={{ flex: 1, minWidth: "150px" }}><label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#475569", marginBottom: "5px" }}>First Name *</label><input type="text" placeholder="Juan" value={newAide.firstName} onChange={(e) => setNewAide({ ...newAide, firstName: e.target.value })} style={{ width: "100%", padding: "10px", border: "1px solid #cbd5e1", borderRadius: "6px" }} /></div>
// //                     <div style={{ flex: 1, minWidth: "150px" }}><label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#475569", marginBottom: "5px" }}>Middle Name (Optional)</label><input type="text" placeholder="Dela" value={newAide.middleName} onChange={(e) => setNewAide({ ...newAide, middleName: e.target.value })} style={{ width: "100%", padding: "10px", border: "1px solid #cbd5e1", borderRadius: "6px" }} /></div>
// //                     <div style={{ flex: 1, minWidth: "150px" }}><label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#475569", marginBottom: "5px" }}>Last Name *</label><input type="text" placeholder="Cruz" value={newAide.lastName} onChange={(e) => setNewAide({ ...newAide, lastName: e.target.value })} style={{ width: "100%", padding: "10px", border: "1px solid #cbd5e1", borderRadius: "6px" }} /></div>
// //                     <div style={{ flex: 1, minWidth: "150px" }}><label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#475569", marginBottom: "5px" }}>Contact Number *</label><input type="text" placeholder="09123456789" value={newAide.phone} onChange={(e) => setNewAide({ ...newAide, phone: e.target.value })} style={{ width: "100%", padding: "10px", border: "1px solid #cbd5e1", borderRadius: "6px" }} /></div>
// //                 </div>
// //                 <div style={{ display: "flex", gap: "15px", flexWrap: "wrap", alignItems: "flex-end" }}>
// //                     <div style={{ flex: 2, minWidth: "250px" }}><label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#475569", marginBottom: "5px" }}>Email Address *</label><input type="email" placeholder="juan@clinic.com" value={newAide.email} onChange={(e) => setNewAide({ ...newAide, email: e.target.value })} style={{ width: "100%", padding: "10px", border: "1px solid #cbd5e1", borderRadius: "6px" }} /></div>
// //                     <div style={{ flex: 2, minWidth: "250px" }}><label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#475569", marginBottom: "5px" }}>Given Password *</label><input type="password" placeholder="••••••••" value={newAide.password} onChange={(e) => setNewAide({ ...newAide, password: e.target.value })} style={{ width: "100%", padding: "10px", border: "1px solid #cbd5e1", borderRadius: "6px" }} /></div>
// //                     <button type="submit" style={{ flex: 1, minWidth: "150px", padding: "11px 15px", backgroundColor: "var(--primary-color)", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold", transition: "0.2s" }}>Create Account</button>
// //                 </div>
// //                 </form>
// //             </div>

// //             <h3 style={{ color: "#334155", marginBottom: "15px" }}>Current Dental Aides</h3>
// //             <div style={{ overflowX: "auto", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
// //                 <table style={{ width: "100%", borderCollapse: "collapse", backgroundColor: "white" }}>
// //                 <thead><tr style={{ backgroundColor: "#f1f5f9", textAlign: "left" }}><th style={{ padding: "15px", borderBottom: "1px solid #e2e8f0", color: "#475569" }}>Staff Name</th><th style={{ padding: "15px", borderBottom: "1px solid #e2e8f0", color: "#475569" }}>Contact</th><th style={{ padding: "15px", borderBottom: "1px solid #e2e8f0", color: "#475569" }}>Email Address</th><th style={{ padding: "15px", borderBottom: "1px solid #e2e8f0", color: "#475569", width: "100px" }}>Actions</th></tr></thead>
// //                 <tbody>
// //                     {aides.length === 0 ? (<tr><td colSpan="4" style={{ padding: "20px", textAlign: "center", color: "#94a3b8" }}>No dental aides registered.</td></tr>) : (
// //                         aides.map((aide) => (<tr key={aide.id} style={{ transition: "background 0.2s" }}><td style={{ padding: "15px", borderBottom: "1px solid #f1f5f9", fontWeight: "500", color: "#1e293b" }}>{aide.name}</td><td style={{ padding: "15px", borderBottom: "1px solid #f1f5f9", color: "#64748b" }}>{aide.phone || "N/A"}</td><td style={{ padding: "15px", borderBottom: "1px solid #f1f5f9", color: "#64748b" }}>{aide.email}</td><td style={{ padding: "15px", borderBottom: "1px solid #f1f5f9" }}><button onClick={() => handleDeleteAide(aide.id)} style={{ color: "#ef4444", background: "#fef2f2", padding: "8px 12px", borderRadius: "6px", border: "1px solid #fca5a5", cursor: "pointer", fontWeight: "600" }}>Remove</button></td></tr>))
// //                     )}
// //                 </tbody>
// //                 </table>
// //             </div>
// //           </div>
// //         )}

// //         {activeTab === "services" && (
// //           <div className="services-section animation-fade-in">
// //             <div style={{ background: "#f8fafc", padding: "20px", borderRadius: "8px", border: "1px solid #e2e8f0", marginBottom: "30px" }}>
// //                 <h3 style={{ marginTop: 0, marginBottom: "15px", color: "#334155" }}>Add New Service</h3>
// //                 <form onSubmit={handleAddService} style={{ display: "flex", gap: "15px", flexWrap: "wrap", alignItems: "flex-end" }}>
// //                     <div style={{ flex: 2, minWidth: "200px" }}><label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#475569", marginBottom: "5px" }}>Service Name *</label><input type="text" placeholder="e.g., Pasta / Filling" value={newService.name} onChange={(e) => setNewService({ ...newService, name: e.target.value })} style={{ width: "100%", padding: "10px", border: "1px solid #cbd5e1", borderRadius: "6px" }} /></div>
// //                     <div style={{ flex: 1, minWidth: "120px" }}><label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#475569", marginBottom: "5px" }}>Duration (mins) *</label><input type="number" placeholder="45" value={newService.estimatedDuration} onChange={(e) => setNewService({ ...newService, estimatedDuration: e.target.value })} style={{ width: "100%", padding: "10px", border: "1px solid #cbd5e1", borderRadius: "6px" }} /></div>
// //                     <div style={{ flex: 1, minWidth: "120px" }}><label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#475569", marginBottom: "5px" }}>Min Price (₱) *</label><input type="number" placeholder="500" value={newService.minPrice} onChange={(e) => setNewService({ ...newService, minPrice: e.target.value })} style={{ width: "100%", padding: "10px", border: "1px solid #cbd5e1", borderRadius: "6px" }} /></div>
// //                     <div style={{ flex: 1, minWidth: "120px" }}><label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#475569", marginBottom: "5px" }}>Max Price (₱) *</label><input type="number" placeholder="1500" value={newService.maxPrice} onChange={(e) => setNewService({ ...newService, maxPrice: e.target.value })} style={{ width: "100%", padding: "10px", border: "1px solid #cbd5e1", borderRadius: "6px" }} /></div>
// //                     <button type="submit" style={{ flex: 1, minWidth: "120px", padding: "11px 15px", backgroundColor: "var(--primary-color)", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" }}>Add Service</button>
// //                 </form>
// //             </div>

// //             <h3 style={{ color: "#334155", marginBottom: "15px" }}>Available Services & Pricing</h3>
// //             <div style={{ overflowX: "auto", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
// //                 <table style={{ width: "100%", borderCollapse: "collapse", backgroundColor: "white" }}>
// //                 <thead><tr style={{ backgroundColor: "#f1f5f9", textAlign: "left" }}><th style={{ padding: "15px", borderBottom: "1px solid #e2e8f0", color: "#475569" }}>Service Name</th><th style={{ padding: "15px", borderBottom: "1px solid #e2e8f0", color: "#475569" }}>Est. Duration</th><th style={{ padding: "15px", borderBottom: "1px solid #e2e8f0", color: "#475569" }}>Price Range (PHP)</th><th style={{ padding: "15px", borderBottom: "1px solid #e2e8f0", color: "#475569", width: "100px" }}>Actions</th></tr></thead>
// //                 <tbody>
// //                     {services.length === 0 ? (<tr><td colSpan="4" style={{ padding: "20px", textAlign: "center", color: "#94a3b8" }}>No services have been added yet.</td></tr>) : (
// //                         services.map((service) => (<tr key={service.id} style={{ transition: "background 0.2s" }}><td style={{ padding: "15px", borderBottom: "1px solid #f1f5f9", fontWeight: "600", color: "#1e293b" }}>{service.name}</td><td style={{ padding: "15px", borderBottom: "1px solid #f1f5f9", color: "#64748b" }}>{service.estimated_duration ? `${service.estimated_duration} mins` : "N/A"}</td><td style={{ padding: "15px", borderBottom: "1px solid #f1f5f9", color: "#0f172a" }}><span style={{ background: "#f1f5f9", padding: "4px 8px", borderRadius: "4px", fontSize: "14px" }}>₱{service.min_price}</span><span style={{ margin: "0 8px", color: "#94a3b8" }}>to</span><span style={{ background: "#f1f5f9", padding: "4px 8px", borderRadius: "4px", fontSize: "14px" }}>₱{service.max_price}</span></td><td style={{ padding: "15px", borderBottom: "1px solid #f1f5f9" }}><button onClick={() => handleDeleteService(service.id)} style={{ color: "#ef4444", background: "#fef2f2", padding: "8px 12px", borderRadius: "6px", border: "1px solid #fca5a5", cursor: "pointer", fontWeight: "600" }}>Remove</button></td></tr>))
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
//     <div className="dashboard-container" style={{ padding: "20px", maxWidth: "1200px", margin: "0 auto" }}>
//       <div style={{ marginBottom: "25px" }}>
//         <h2 style={{ fontSize: "24px", color: "#1e293b", marginBottom: "5px" }}>Clinic Settings</h2>
//         <p style={{ color: "#64748b" }}>Manage your dental staff, services, and medications.</p>
//       </div>

//       <div className="tabs" style={{ display: "flex", gap: "20px", borderBottom: "2px solid #e2e8f0", marginBottom: "30px" }}>
//         <button onClick={() => setActiveTab("aides")} style={{ padding: "12px 5px", fontSize: "16px", fontWeight: "600", border: "none", borderBottom: activeTab === "aides" ? "3px solid var(--primary-color)" : "3px solid transparent", background: "none", color: activeTab === "aides" ? "var(--primary-color)" : "#64748b", cursor: "pointer", transition: "all 0.2s" }}>Dental Aides</button>
//         <button onClick={() => setActiveTab("services")} style={{ padding: "12px 5px", fontSize: "16px", fontWeight: "600", border: "none", borderBottom: activeTab === "services" ? "3px solid var(--primary-color)" : "3px solid transparent", background: "none", color: activeTab === "services" ? "var(--primary-color)" : "#64748b", cursor: "pointer", transition: "all 0.2s" }}>Clinic Services</button>
//         <button onClick={() => setActiveTab("medications")} style={{ padding: "12px 5px", fontSize: "16px", fontWeight: "600", border: "none", borderBottom: activeTab === "medications" ? "3px solid var(--primary-color)" : "3px solid transparent", background: "none", color: activeTab === "medications" ? "var(--primary-color)" : "#64748b", cursor: "pointer", transition: "all 0.2s" }}>Medications</button>
//       </div>

//       <div className="tab-content">
        
//         {activeTab === "aides" && (
//           <div className="aides-section animation-fade-in">
//             <div style={{ background: editingAideId ? "#eff6ff" : "#f8fafc", padding: "20px", borderRadius: "8px", border: editingAideId ? "1px solid #bfdbfe" : "1px solid #e2e8f0", marginBottom: "30px", transition: "all 0.3s" }}>
//                 <h3 style={{ marginTop: 0, marginBottom: "15px", color: editingAideId ? "#1d4ed8" : "#334155" }}>
//                     {editingAideId ? "Edit Dental Aide" : "Add New Dental Aide"}
//                 </h3>
//                 <form onSubmit={handleSaveAide} style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
//                 <div style={{ display: "flex", gap: "15px", flexWrap: "wrap" }}>
//                     <div style={{ flex: 1, minWidth: "150px" }}><label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#475569", marginBottom: "5px" }}>First Name *</label><input type="text" placeholder="Juan" value={newAide.firstName} onChange={(e) => setNewAide({ ...newAide, firstName: e.target.value })} style={{ width: "100%", padding: "10px", border: "1px solid #cbd5e1", borderRadius: "6px" }} /></div>
//                     <div style={{ flex: 1, minWidth: "150px" }}><label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#475569", marginBottom: "5px" }}>Middle Name (Optional)</label><input type="text" placeholder="Dela" value={newAide.middleName} onChange={(e) => setNewAide({ ...newAide, middleName: e.target.value })} style={{ width: "100%", padding: "10px", border: "1px solid #cbd5e1", borderRadius: "6px" }} /></div>
//                     <div style={{ flex: 1, minWidth: "150px" }}><label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#475569", marginBottom: "5px" }}>Last Name *</label><input type="text" placeholder="Cruz" value={newAide.lastName} onChange={(e) => setNewAide({ ...newAide, lastName: e.target.value })} style={{ width: "100%", padding: "10px", border: "1px solid #cbd5e1", borderRadius: "6px" }} /></div>
//                     <div style={{ flex: 1, minWidth: "150px" }}><label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#475569", marginBottom: "5px" }}>Contact Number *</label><input type="text" placeholder="09123456789" value={newAide.phone} onChange={(e) => setNewAide({ ...newAide, phone: e.target.value })} style={{ width: "100%", padding: "10px", border: "1px solid #cbd5e1", borderRadius: "6px" }} /></div>
//                 </div>
//                 <div style={{ display: "flex", gap: "15px", flexWrap: "wrap", alignItems: "flex-end" }}>
//                     <div style={{ flex: 2, minWidth: "250px" }}><label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#475569", marginBottom: "5px" }}>Email Address *</label><input type="email" placeholder="juan@clinic.com" value={newAide.email} onChange={(e) => setNewAide({ ...newAide, email: e.target.value })} style={{ width: "100%", padding: "10px", border: "1px solid #cbd5e1", borderRadius: "6px" }} /></div>
                    
//                     {!editingAideId && (
//                         <div style={{ flex: 2, minWidth: "250px" }}><label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#475569", marginBottom: "5px" }}>Given Password *</label><input type="password" placeholder="••••••••" value={newAide.password} onChange={(e) => setNewAide({ ...newAide, password: e.target.value })} style={{ width: "100%", padding: "10px", border: "1px solid #cbd5e1", borderRadius: "6px" }} /></div>
//                     )}
                    
//                     <div style={{ display: "flex", gap: "10px", flex: 1, minWidth: "200px" }}>
//                         <button type="submit" style={{ flex: 1, padding: "11px 15px", backgroundColor: "var(--primary-color)", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold", transition: "0.2s" }}>
//                             {editingAideId ? "Update Account" : "Create Account"}
//                         </button>
//                         {editingAideId && (
//                             <button type="button" onClick={cancelAideEdit} style={{ flex: 1, padding: "11px 15px", backgroundColor: "#e2e8f0", color: "#475569", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold", transition: "0.2s" }}>
//                                 Cancel
//                             </button>
//                         )}
//                     </div>
//                 </div>
//                 </form>
//             </div>

//             <h3 style={{ color: "#334155", marginBottom: "15px" }}>Current Dental Aides</h3>
//             <div style={{ overflowX: "auto", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
//                 <table style={{ width: "100%", borderCollapse: "collapse", backgroundColor: "white" }}>
//                 <thead><tr style={{ backgroundColor: "#f1f5f9", textAlign: "left" }}><th style={{ padding: "15px", borderBottom: "1px solid #e2e8f0", color: "#475569" }}>Staff Name</th><th style={{ padding: "15px", borderBottom: "1px solid #e2e8f0", color: "#475569" }}>Contact</th><th style={{ padding: "15px", borderBottom: "1px solid #e2e8f0", color: "#475569" }}>Email Address</th><th style={{ padding: "15px", borderBottom: "1px solid #e2e8f0", color: "#475569", width: "150px" }}>Actions</th></tr></thead>
//                 <tbody>
//                     {aides.length === 0 ? (<tr><td colSpan="4" style={{ padding: "20px", textAlign: "center", color: "#94a3b8" }}>No dental aides registered.</td></tr>) : (
//                         aides.map((aide) => (
//                             <tr key={aide.id} style={{ transition: "background 0.2s", backgroundColor: editingAideId === aide.id ? "#f8fafc" : "transparent" }}>
//                                 <td style={{ padding: "15px", borderBottom: "1px solid #f1f5f9", fontWeight: "500", color: "#1e293b" }}>{aide.name}</td>
//                                 <td style={{ padding: "15px", borderBottom: "1px solid #f1f5f9", color: "#64748b" }}>{aide.phone || "N/A"}</td>
//                                 <td style={{ padding: "15px", borderBottom: "1px solid #f1f5f9", color: "#64748b" }}>{aide.email}</td>
//                                 <td style={{ padding: "15px", borderBottom: "1px solid #f1f5f9" }}>
//                                     <div style={{ display: "flex", gap: "8px" }}>
//                                         <button onClick={() => handleEditAideClick(aide)} style={{ color: "#0284c7", background: "#e0f2fe", padding: "8px 12px", borderRadius: "6px", border: "1px solid #bae6fd", cursor: "pointer", fontWeight: "600" }}>Edit</button>
//                                         <button onClick={() => handleDeleteAide(aide.id)} style={{ color: "#ef4444", background: "#fef2f2", padding: "8px 12px", borderRadius: "6px", border: "1px solid #fca5a5", cursor: "pointer", fontWeight: "600" }}>Remove</button>
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

//         {activeTab === "services" && (
//           <div className="services-section animation-fade-in">
//             <div style={{ background: editingServiceId ? "#eff6ff" : "#f8fafc", padding: "20px", borderRadius: "8px", border: editingServiceId ? "1px solid #bfdbfe" : "1px solid #e2e8f0", marginBottom: "30px", transition: "all 0.3s" }}>
//                 <h3 style={{ marginTop: 0, marginBottom: "15px", color: editingServiceId ? "#1d4ed8" : "#334155" }}>
//                     {editingServiceId ? "Edit Service" : "Add New Service"}
//                 </h3>
//                 <form onSubmit={handleSaveService} style={{ display: "flex", gap: "15px", flexWrap: "wrap", alignItems: "flex-end" }}>
//                     <div style={{ flex: 2, minWidth: "200px" }}><label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#475569", marginBottom: "5px" }}>Service Name *</label><input type="text" placeholder="e.g., Pasta / Filling" value={newService.name} onChange={(e) => setNewService({ ...newService, name: e.target.value })} style={{ width: "100%", padding: "10px", border: "1px solid #cbd5e1", borderRadius: "6px" }} /></div>
//                     <div style={{ flex: 1, minWidth: "120px" }}><label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#475569", marginBottom: "5px" }}>Duration (mins) *</label><input type="number" placeholder="45" value={newService.estimatedDuration} onChange={(e) => setNewService({ ...newService, estimatedDuration: e.target.value })} style={{ width: "100%", padding: "10px", border: "1px solid #cbd5e1", borderRadius: "6px" }} /></div>
//                     <div style={{ flex: 1, minWidth: "120px" }}><label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#475569", marginBottom: "5px" }}>Min Price (₱) *</label><input type="number" placeholder="500" value={newService.minPrice} onChange={(e) => setNewService({ ...newService, minPrice: e.target.value })} style={{ width: "100%", padding: "10px", border: "1px solid #cbd5e1", borderRadius: "6px" }} /></div>
//                     <div style={{ flex: 1, minWidth: "120px" }}><label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#475569", marginBottom: "5px" }}>Max Price (₱) *</label><input type="number" placeholder="1500" value={newService.maxPrice} onChange={(e) => setNewService({ ...newService, maxPrice: e.target.value })} style={{ width: "100%", padding: "10px", border: "1px solid #cbd5e1", borderRadius: "6px" }} /></div>
                    
//                     <div style={{ display: "flex", gap: "10px", flex: 1, minWidth: "200px" }}>
//                         <button type="submit" style={{ flex: 1, padding: "11px 15px", backgroundColor: "var(--primary-color)", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" }}>
//                             {editingServiceId ? "Update" : "Add Service"}
//                         </button>
//                         {editingServiceId && (
//                             <button type="button" onClick={cancelServiceEdit} style={{ flex: 1, padding: "11px 15px", backgroundColor: "#e2e8f0", color: "#475569", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" }}>
//                                 Cancel
//                             </button>
//                         )}
//                     </div>
//                 </form>
//             </div>

//             <h3 style={{ color: "#334155", marginBottom: "15px" }}>Available Services & Pricing</h3>
//             <div style={{ overflowX: "auto", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
//                 <table style={{ width: "100%", borderCollapse: "collapse", backgroundColor: "white" }}>
//                 <thead><tr style={{ backgroundColor: "#f1f5f9", textAlign: "left" }}><th style={{ padding: "15px", borderBottom: "1px solid #e2e8f0", color: "#475569" }}>Service Name</th><th style={{ padding: "15px", borderBottom: "1px solid #e2e8f0", color: "#475569" }}>Est. Duration</th><th style={{ padding: "15px", borderBottom: "1px solid #e2e8f0", color: "#475569" }}>Price Range (PHP)</th><th style={{ padding: "15px", borderBottom: "1px solid #e2e8f0", color: "#475569", width: "150px" }}>Actions</th></tr></thead>
//                 <tbody>
//                     {services.length === 0 ? (<tr><td colSpan="4" style={{ padding: "20px", textAlign: "center", color: "#94a3b8" }}>No services have been added yet.</td></tr>) : (
//                         services.map((service) => (
//                             <tr key={service.id} style={{ transition: "background 0.2s", backgroundColor: editingServiceId === service.id ? "#f8fafc" : "transparent" }}>
//                                 <td style={{ padding: "15px", borderBottom: "1px solid #f1f5f9", fontWeight: "600", color: "#1e293b" }}>{service.name}</td>
//                                 <td style={{ padding: "15px", borderBottom: "1px solid #f1f5f9", color: "#64748b" }}>{service.estimated_duration ? `${service.estimated_duration} mins` : "N/A"}</td>
//                                 <td style={{ padding: "15px", borderBottom: "1px solid #f1f5f9", color: "#0f172a" }}><span style={{ background: "#f1f5f9", padding: "4px 8px", borderRadius: "4px", fontSize: "14px" }}>₱{service.min_price}</span><span style={{ margin: "0 8px", color: "#94a3b8" }}>to</span><span style={{ background: "#f1f5f9", padding: "4px 8px", borderRadius: "4px", fontSize: "14px" }}>₱{service.max_price}</span></td>
//                                 <td style={{ padding: "15px", borderBottom: "1px solid #f1f5f9" }}>
//                                     <div style={{ display: "flex", gap: "8px" }}>
//                                         <button onClick={() => handleEditServiceClick(service)} style={{ color: "#0284c7", background: "#e0f2fe", padding: "8px 12px", borderRadius: "6px", border: "1px solid #bae6fd", cursor: "pointer", fontWeight: "600" }}>Edit</button>
//                                         <button onClick={() => handleDeleteService(service.id)} style={{ color: "#ef4444", background: "#fef2f2", padding: "8px 12px", borderRadius: "6px", border: "1px solid #fca5a5", cursor: "pointer", fontWeight: "600" }}>Remove</button>
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

//         {activeTab === "medications" && (
//           <div className="medications-section animation-fade-in">
//             <div style={{ background: editingMedicationId ? "#fdf4ff" : "#fdf4ff", padding: "20px", borderRadius: "8px", border: editingMedicationId ? "1px solid #d946ef" : "1px solid #fbcfe8", marginBottom: "30px", transition: "all 0.3s" }}>
//                 <h3 style={{ marginTop: 0, marginBottom: "15px", color: editingMedicationId ? "#a21caf" : "#86198f" }}>
//                     {editingMedicationId ? "Edit Medication" : "Add Medication to Master List"}
//                 </h3>
//                 <form onSubmit={handleSaveMedication} style={{ display: "flex", gap: "15px", flexWrap: "wrap", alignItems: "flex-end" }}>
//                     <div style={{ flex: 2, minWidth: "200px" }}><label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#86198f", marginBottom: "5px" }}>Medicine Name *</label><input type="text" placeholder="e.g., Amoxicillin" value={newMedication.name} onChange={(e) => setNewMedication({ ...newMedication, name: e.target.value })} style={{ width: "100%", padding: "10px", border: "1px solid #f9a8d4", borderRadius: "6px" }} /></div>
//                     <div style={{ flex: 1, minWidth: "150px" }}><label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#86198f", marginBottom: "5px" }}>Default Dosage</label><input type="text" placeholder="e.g., 500mg" value={newMedication.defaultDosage} onChange={(e) => setNewMedication({ ...newMedication, defaultDosage: e.target.value })} style={{ width: "100%", padding: "10px", border: "1px solid #f9a8d4", borderRadius: "6px" }} /></div>
                    
//                     <div style={{ display: "flex", gap: "10px", flex: 1, minWidth: "200px" }}>
//                         <button type="submit" style={{ flex: 1, padding: "11px 15px", backgroundColor: "#c026d3", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" }}>
//                             {editingMedicationId ? "Update" : "Add Medicine"}
//                         </button>
//                         {editingMedicationId && (
//                             <button type="button" onClick={cancelMedicationEdit} style={{ flex: 1, padding: "11px 15px", backgroundColor: "#f3e8ff", color: "#a21caf", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" }}>
//                                 Cancel
//                             </button>
//                         )}
//                     </div>
//                 </form>
//             </div>

//             <h3 style={{ color: "#334155", marginBottom: "15px" }}>Current Available Medications</h3>
//             <div style={{ overflowX: "auto", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
//                 <table style={{ width: "100%", borderCollapse: "collapse", backgroundColor: "white" }}>
//                 <thead><tr style={{ backgroundColor: "#f1f5f9", textAlign: "left" }}><th style={{ padding: "15px", borderBottom: "1px solid #e2e8f0", color: "#475569" }}>Medicine Name</th><th style={{ padding: "15px", borderBottom: "1px solid #e2e8f0", color: "#475569" }}>Default Dosage</th><th style={{ padding: "15px", borderBottom: "1px solid #e2e8f0", color: "#475569", width: "150px" }}>Actions</th></tr></thead>
//                 <tbody>
//                     {clinicMedications.length === 0 ? (<tr><td colSpan="3" style={{ padding: "20px", textAlign: "center", color: "#94a3b8" }}>No medications added to the master list yet.</td></tr>) : (
//                         clinicMedications.map((med) => (
//                             <tr key={med.id} style={{ transition: "background 0.2s", backgroundColor: editingMedicationId === med.id ? "#faf5ff" : "transparent" }}>
//                                 <td style={{ padding: "15px", borderBottom: "1px solid #f1f5f9", fontWeight: "600", color: "#1e293b" }}>{med.name}</td>
//                                 <td style={{ padding: "15px", borderBottom: "1px solid #f1f5f9", color: "#64748b" }}>{med.default_dosage || "N/A"}</td>
//                                 <td style={{ padding: "15px", borderBottom: "1px solid #f1f5f9" }}>
//                                     <div style={{ display: "flex", gap: "8px" }}>
//                                         <button onClick={() => handleEditMedicationClick(med)} style={{ color: "#9333ea", background: "#fae8ff", padding: "8px 12px", borderRadius: "6px", border: "1px solid #f3e8ff", cursor: "pointer", fontWeight: "600" }}>Edit</button>
//                                         <button onClick={() => handleDeleteMedication(med.id)} style={{ color: "#ef4444", background: "#fef2f2", padding: "8px 12px", borderRadius: "6px", border: "1px solid #fca5a5", cursor: "pointer", fontWeight: "600" }}>Remove</button>
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
                <h3>{editingAideId ? "Edit Dental Aide" : "Add New Dental Aide"}</h3>
                <form onSubmit={handleSaveAide}>
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
                        <div className="form-actions">
                            <button type="submit" className="btn-primary">
                                {editingAideId ? "Update Account" : "Add Account"}
                            </button>
                            {editingAideId && (
                                <button type="button" onClick={cancelAideEdit} className="btn-secondary">Cancel</button>
                            )}
                        </div>
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
                <h3>{editingServiceId ? "Edit Service" : "Add New Service"}</h3>
                <form onSubmit={handleSaveService}>
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
                        
                        <div className="form-actions">
                            <button type="submit" className="btn-primary">
                                {editingServiceId ? "Update" : "Add Service"}
                            </button>
                            {editingServiceId && (
                                <button type="button" onClick={cancelServiceEdit} className="btn-secondary">Cancel</button>
                            )}
                        </div>
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
            <div className={`settings-form-card ${editingMedicationId ? 'editing-purple' : 'form-purple'}`}>
                <h3>{editingMedicationId ? "Edit Medication" : "Add Medication to Master List"}</h3>
                <form onSubmit={handleSaveMedication}>
                    <div className="form-row form-row-bottom">
                        <div className="form-group flex-2">
                            <label>Medicine Name *</label>
                            <input type="text" placeholder="e.g., Amoxicillin" value={newMedication.name} onChange={(e) => setNewMedication({ ...newMedication, name: e.target.value })} className="input-purple" />
                        </div>
                        <div className="form-group">
                            <label>Default Dosage</label>
                            <input type="text" placeholder="e.g., 500mg" value={newMedication.defaultDosage} onChange={(e) => setNewMedication({ ...newMedication, defaultDosage: e.target.value })} className="input-purple" />
                        </div>
                        
                        <div className="form-actions">
                            <button type="submit" className="btn-primary-purple">
                                {editingMedicationId ? "Update" : "Add Medicine"}
                            </button>
                            {editingMedicationId && (
                                <button type="button" onClick={cancelMedicationEdit} className="btn-secondary-purple">Cancel</button>
                            )}
                        </div>
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
                            <tr key={med.id} className={editingMedicationId === med.id ? "row-highlight-purple" : ""}>
                                <td className="font-semibold">{med.name}</td>
                                <td>{med.default_dosage || "N/A"}</td>
                                <td>
                                    <div className="action-buttons">
                                        <button onClick={() => handleEditMedicationClick(med)} className="btn-edit-purple">Edit</button>
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