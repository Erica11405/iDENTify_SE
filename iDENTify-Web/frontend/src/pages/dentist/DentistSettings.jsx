// // // import React, { useState, useEffect } from "react";
// // // import toast from "react-hot-toast";
// // // import api from "../../api/apiClient"; 
// // // import "../../styles/pages/dentist/DentistSettings.css";

// // // function DentistSettings({ userRole }) {
// // //   const [activeTab, setActiveTab] = useState("aides");

// // //   const [aides, setAides] = useState([]);
// // //   const [services, setServices] = useState([
// // //     { id: 1, name: "Teeth Cleaning", price: 1500 }
// // //   ]);

// // //   const [newAide, setNewAide] = useState({ fullName: "", email: "", password: "" });
// // //   const [newService, setNewService] = useState({ name: "", price: "" });

// // //   // 1. Fetch real aides from the database when the page loads
// // //   useEffect(() => {
// // //     const loadStaff = async () => {
// // //       try {
// // //         const staffList = await api.getDentists();
// // //         // Filter the list to ONLY show people with the "Dental Aide" specialization
// // //         const aidesOnly = staffList.filter(staff => staff.specialization === 'Dental Aide');
// // //         setAides(aidesOnly);
// // //       } catch (error) {
// // //         console.error("Failed to load aides:", error);
// // //       }
// // //     };
// // //     loadStaff();
// // //   }, []);

// // //   // 2. Add Aide securely to the database
// // //   const handleAddAide = async (e) => {
// // //     e.preventDefault();
// // //     if (!newAide.fullName || !newAide.email || !newAide.password) {
// // //       return toast.error("All fields are required.");
// // //     }

// // //     // Split the name for the database (first name and last name)
// // //     const nameParts = newAide.fullName.trim().split(" ");
// // //     const firstName = nameParts[0];
// // //     const lastName = nameParts.slice(1).join(" ");

// // //     try {
// // //       // Send the data to the backend to create the profile AND the login account!
// // //       const newStaff = await api.createDentist({
// // //         first_name: firstName,
// // //         last_name: lastName,
// // //         email: newAide.email,
// // //         password: newAide.password,
// // //         specialization: "Dental Aide", // This exact word triggers the backend to set their role as 'aide'
// // //         role: "aide",
// // //         status: "Available"
// // //       });

// // //       // Immediately display the new aide on the screen without needing to refresh
// // //       setAides([...aides, { id: newStaff.id, name: newAide.fullName, email: newAide.email }]);
// // //       setNewAide({ fullName: "", email: "", password: "" });
// // //       toast.success("Dental Aide account created successfully!");
      
// // //     } catch (error) {
// // //       console.error("Error creating aide:", error);
// // //       toast.error(error.message || "Failed to create aide. Email might already exist.");
// // //     }
// // //   };

// // //   // 3. Delete Aide from the database
// // //   const handleDeleteAide = async (id) => {
// // //     try {
// // //       // Calling the delete endpoint directly
// // //       const API_BASE = import.meta.env.VITE_API_BASE;
// // //       const res = await fetch(`${API_BASE}/dentists/${id}`, { method: 'DELETE' });
      
// // //       if (!res.ok) throw new Error("Failed to delete aide");

// // //       // Remove from the screen
// // //       setAides(aides.filter(aide => aide.id !== id));
// // //       toast.success("Dental Aide securely removed.");
// // //     } catch (error) {
// // //       toast.error(error.message);
// // //     }
// // //   };

// // //   const handleAddService = (e) => {
// // //     e.preventDefault();
// // //     if (!newService.name || !newService.price) return toast.error("All fields are required.");
// // //     const addedService = { id: Date.now(), ...newService };
// // //     setServices([...services, addedService]);
// // //     setNewService({ name: "", price: "" });
// // //     toast.success("Service added successfully!");
// // //   };

// // //   const handleDeleteService = (id) => {
// // //     setServices(services.filter(service => service.id !== id));
// // //     toast.success("Service removed.");
// // //   };

// // //   return (
// // //     <div className="dashboard-container" style={{ padding: "20px" }}>
// // //       <h2>Clinic Settings</h2>

// // //       <div className="tabs" style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
// // //         <button 
// // //           onClick={() => setActiveTab("aides")} 
// // //           style={{ padding: "10px", fontWeight: "bold", border: "none", borderBottom: activeTab === "aides" ? "3px solid var(--primary-color)" : "none", background: "none", cursor: "pointer" }}
// // //         >
// // //           Dental Aides
// // //         </button>
// // //         <button 
// // //           onClick={() => setActiveTab("services")} 
// // //           style={{ padding: "10px", fontWeight: "bold", border: "none", borderBottom: activeTab === "services" ? "3px solid var(--primary-color)" : "none", background: "none", cursor: "pointer" }}
// // //         >
// // //           Clinic Services
// // //         </button>
// // //       </div>

// // //       <div className="tab-content">
// // //         {activeTab === "aides" && (
// // //           <div className="aides-section">
// // //             <h3>Add New Dental Aide</h3>
// // //             <form onSubmit={handleAddAide} style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
// // //               <input type="text" placeholder="Full Name" value={newAide.fullName} onChange={(e) => setNewAide({ ...newAide, fullName: e.target.value })} style={{ padding: "10px", border: "1px solid #ddd", borderRadius: "4px" }} />
// // //               <input type="email" placeholder="Email Address" value={newAide.email} onChange={(e) => setNewAide({ ...newAide, email: e.target.value })} style={{ padding: "10px", border: "1px solid #ddd", borderRadius: "4px" }} />
// // //               <input type="password" placeholder="Temporary Password" value={newAide.password} onChange={(e) => setNewAide({ ...newAide, password: e.target.value })} style={{ padding: "10px", border: "1px solid #ddd", borderRadius: "4px" }} />
// // //               <button type="submit" style={{ padding: "10px 15px", backgroundColor: "var(--primary-color)", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>Create Account</button>
// // //             </form>

// // //             <h3>Current Dental Aides</h3>
// // //             <table className="data-table" style={{ width: "100%", borderCollapse: "collapse", marginTop: "10px" }}>
// // //               <thead>
// // //                 <tr style={{ backgroundColor: "#f9fafb", textAlign: "left" }}>
// // //                   <th style={{ padding: "12px", borderBottom: "1px solid #ddd" }}>Name</th>
// // //                   <th style={{ padding: "12px", borderBottom: "1px solid #ddd" }}>Email</th>
// // //                   <th style={{ padding: "12px", borderBottom: "1px solid #ddd" }}>Actions</th>
// // //                 </tr>
// // //               </thead>
// // //               <tbody>
// // //                 {aides.map((aide) => (
// // //                   <tr key={aide.id}>
// // //                     <td style={{ padding: "12px", borderBottom: "1px solid #eee" }}>{aide.name}</td>
// // //                     <td style={{ padding: "12px", borderBottom: "1px solid #eee" }}>{aide.email}</td>
// // //                     <td style={{ padding: "12px", borderBottom: "1px solid #eee" }}>
// // //                       <button onClick={() => handleDeleteAide(aide.id)} style={{ color: "red", background: "none", border: "none", cursor: "pointer" }}>Remove</button>
// // //                     </td>
// // //                   </tr>
// // //                 ))}
// // //               </tbody>
// // //             </table>
// // //           </div>
// // //         )}

// // //         {activeTab === "services" && (
// // //           <div className="services-section">
// // //             <h3>Add New Service</h3>
// // //             <form onSubmit={handleAddService} style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
// // //               <input type="text" placeholder="Service Name" value={newService.name} onChange={(e) => setNewService({ ...newService, name: e.target.value })} style={{ padding: "10px", border: "1px solid #ddd", borderRadius: "4px" }} />
// // //               <input type="number" placeholder="Price (PHP)" value={newService.price} onChange={(e) => setNewService({ ...newService, price: e.target.value })} style={{ padding: "10px", border: "1px solid #ddd", borderRadius: "4px" }} />
// // //               <button type="submit" style={{ padding: "10px 15px", backgroundColor: "var(--primary-color)", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>Add Service</button>
// // //             </form>

// // //             <h3>Available Services</h3>
// // //             <table className="data-table" style={{ width: "100%", borderCollapse: "collapse", marginTop: "10px" }}>
// // //               <thead>
// // //                 <tr style={{ backgroundColor: "#f9fafb", textAlign: "left" }}>
// // //                   <th style={{ padding: "12px", borderBottom: "1px solid #ddd" }}>Service</th>
// // //                   <th style={{ padding: "12px", borderBottom: "1px solid #ddd" }}>Price (PHP)</th>
// // //                   <th style={{ padding: "12px", borderBottom: "1px solid #ddd" }}>Actions</th>
// // //                 </tr>
// // //               </thead>
// // //               <tbody>
// // //                 {services.map((service) => (
// // //                   <tr key={service.id}>
// // //                     <td style={{ padding: "12px", borderBottom: "1px solid #eee" }}>{service.name}</td>
// // //                     <td style={{ padding: "12px", borderBottom: "1px solid #eee" }}>₱{service.price}</td>
// // //                     <td style={{ padding: "12px", borderBottom: "1px solid #eee" }}>
// // //                       <button onClick={() => handleDeleteService(service.id)} style={{ color: "red", background: "none", border: "none", cursor: "pointer" }}>Remove</button>
// // //                     </td>
// // //                   </tr>
// // //                 ))}
// // //               </tbody>
// // //             </table>
// // //           </div>
// // //         )}
// // //       </div>
// // //     </div>
// // //   );
// // // }

// // // export default DentistSettings;

// // import React, { useState, useEffect } from "react";
// // import toast from "react-hot-toast";
// // import api from "../../api/apiClient"; 
// // import "../../styles/pages/dentist/DentistSettings.css";

// // function DentistSettings() {
// //   const [activeTab, setActiveTab] = useState("aides");

// //   // --- DENTAL AIDES STATE ---
// //   const [aides, setAides] = useState([]);
// //   const [newAide, setNewAide] = useState({ 
// //     firstName: "", 
// //     middleName: "", 
// //     lastName: "", 
// //     email: "", 
// //     password: "" 
// //   });

// //   // --- CLINIC SERVICES STATE ---
// //   const [services, setServices] = useState([
// //     { id: 1, name: "Teeth Cleaning", minPrice: 1000, maxPrice: 1500 },
// //     { id: 2, name: "Tooth Extraction", minPrice: 800, maxPrice: 2000 }
// //   ]);
// //   const [newService, setNewService] = useState({ name: "", minPrice: "", maxPrice: "" });

// //   // 1. Fetch real aides when the page loads
// //   useEffect(() => {
// //     const loadStaff = async () => {
// //       try {
// //         const staffList = await api.getDentists();
// //         const aidesOnly = staffList.filter(staff => staff.specialization === 'Dental Aide');
// //         setAides(aidesOnly);
// //       } catch (error) {
// //         console.error("Failed to load aides:", error);
// //       }
// //     };
// //     loadStaff();
// //   }, []);

// //   // 2. Handle Add Aide
// //   const handleAddAide = async (e) => {
// //     e.preventDefault();
// //     if (!newAide.firstName || !newAide.lastName || !newAide.email || !newAide.password) {
// //       return toast.error("First Name, Last Name, Email, and Password are required.");
// //     }

// //     try {
// //       const fullNameDisplay = `${newAide.firstName} ${newAide.middleName ? newAide.middleName + " " : ""}${newAide.lastName}`.trim();

// //       const newStaff = await api.createDentist({
// //         first_name: newAide.firstName,
// //         last_name: newAide.lastName,
// //         middle_name: newAide.middleName, // Passed safely even if backend ignores it
// //         email: newAide.email,
// //         password: newAide.password,
// //         specialization: "Dental Aide", 
// //         role: "aide",
// //         status: "Available"
// //       });

// //       setAides([...aides, { id: newStaff.id, name: fullNameDisplay, email: newAide.email }]);
// //       setNewAide({ firstName: "", middleName: "", lastName: "", email: "", password: "" });
// //       toast.success("Dental Aide account created successfully!");
      
// //     } catch (error) {
// //       console.error("Error creating aide:", error);
// //       toast.error(error.message || "Failed to create aide. Email might already exist.");
// //     }
// //   };

// //   // 3. Handle Delete Aide
// //   const handleDeleteAide = async (id) => {
// //     try {
// //       const API_BASE = import.meta.env.VITE_API_BASE;
// //       const res = await fetch(`${API_BASE}/dentists/${id}`, { method: 'DELETE' });
      
// //       if (!res.ok) throw new Error("Failed to delete aide");

// //       setAides(aides.filter(aide => aide.id !== id));
// //       toast.success("Dental Aide securely removed.");
// //     } catch (error) {
// //       toast.error(error.message);
// //     }
// //   };

// //   // 4. Handle Add Service
// //   const handleAddService = (e) => {
// //     e.preventDefault();
// //     if (!newService.name || !newService.minPrice || !newService.maxPrice) {
// //         return toast.error("All service fields are required.");
// //     }
    
// //     if (Number(newService.minPrice) > Number(newService.maxPrice)) {
// //         return toast.error("Minimum price cannot be higher than the maximum price.");
// //     }

// //     const addedService = { id: Date.now(), ...newService };
// //     setServices([...services, addedService]);
// //     setNewService({ name: "", minPrice: "", maxPrice: "" });
// //     toast.success("Service added successfully!");
// //   };

// //   // 5. Handle Delete Service
// //   const handleDeleteService = (id) => {
// //     setServices(services.filter(service => service.id !== id));
// //     toast.success("Service removed.");
// //   };

// //   return (
// //     <div className="dashboard-container" style={{ padding: "20px", maxWidth: "1200px", margin: "0 auto" }}>
// //       <div style={{ marginBottom: "25px" }}>
// //         <h2 style={{ fontSize: "24px", color: "#1e293b", marginBottom: "5px" }}>Clinic Settings</h2>
// //         <p style={{ color: "#64748b" }}>Manage your dental staff and the clinic's offered services.</p>
// //       </div>

// //       {/* TABS */}
// //       <div className="tabs" style={{ display: "flex", gap: "20px", borderBottom: "2px solid #e2e8f0", marginBottom: "30px" }}>
// //         <button 
// //           onClick={() => setActiveTab("aides")} 
// //           style={{ padding: "12px 5px", fontSize: "16px", fontWeight: "600", border: "none", borderBottom: activeTab === "aides" ? "3px solid var(--primary-color)" : "3px solid transparent", background: "none", color: activeTab === "aides" ? "var(--primary-color)" : "#64748b", cursor: "pointer", transition: "all 0.2s" }}
// //         >
// //           Dental Aides
// //         </button>
// //         <button 
// //           onClick={() => setActiveTab("services")} 
// //           style={{ padding: "12px 5px", fontSize: "16px", fontWeight: "600", border: "none", borderBottom: activeTab === "services" ? "3px solid var(--primary-color)" : "3px solid transparent", background: "none", color: activeTab === "services" ? "var(--primary-color)" : "#64748b", cursor: "pointer", transition: "all 0.2s" }}
// //         >
// //           Clinic Services
// //         </button>
// //       </div>

// //       <div className="tab-content">
// //         {activeTab === "aides" && (
// //           <div className="aides-section animation-fade-in">
// //             <div style={{ background: "#f8fafc", padding: "20px", borderRadius: "8px", border: "1px solid #e2e8f0", marginBottom: "30px" }}>
// //                 <h3 style={{ marginTop: 0, marginBottom: "15px", color: "#334155" }}>Add New Dental Aide</h3>
// //                 <form onSubmit={handleAddAide} style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
                
// //                 {/* Top Row: Names */}
// //                 <div style={{ display: "flex", gap: "15px", flexWrap: "wrap" }}>
// //                     <div style={{ flex: 1, minWidth: "200px" }}>
// //                         <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#475569", marginBottom: "5px" }}>First Name *</label>
// //                         <input type="text" placeholder="Juan" value={newAide.firstName} onChange={(e) => setNewAide({ ...newAide, firstName: e.target.value })} style={{ width: "100%", padding: "10px", border: "1px solid #cbd5e1", borderRadius: "6px" }} />
// //                     </div>
// //                     <div style={{ flex: 1, minWidth: "200px" }}>
// //                         <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#475569", marginBottom: "5px" }}>Middle Name (Optional)</label>
// //                         <input type="text" placeholder="Dela" value={newAide.middleName} onChange={(e) => setNewAide({ ...newAide, middleName: e.target.value })} style={{ width: "100%", padding: "10px", border: "1px solid #cbd5e1", borderRadius: "6px" }} />
// //                     </div>
// //                     <div style={{ flex: 1, minWidth: "200px" }}>
// //                         <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#475569", marginBottom: "5px" }}>Last Name *</label>
// //                         <input type="text" placeholder="Cruz" value={newAide.lastName} onChange={(e) => setNewAide({ ...newAide, lastName: e.target.value })} style={{ width: "100%", padding: "10px", border: "1px solid #cbd5e1", borderRadius: "6px" }} />
// //                     </div>
// //                 </div>

// //                 {/* Bottom Row: Credentials */}
// //                 <div style={{ display: "flex", gap: "15px", flexWrap: "wrap", alignItems: "flex-end" }}>
// //                     <div style={{ flex: 2, minWidth: "250px" }}>
// //                         <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#475569", marginBottom: "5px" }}>Email Address *</label>
// //                         <input type="email" placeholder="juan@clinic.com" value={newAide.email} onChange={(e) => setNewAide({ ...newAide, email: e.target.value })} style={{ width: "100%", padding: "10px", border: "1px solid #cbd5e1", borderRadius: "6px" }} />
// //                     </div>
// //                     <div style={{ flex: 2, minWidth: "250px" }}>
// //                         <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#475569", marginBottom: "5px" }}>Given Password *</label>
// //                         <input type="password" placeholder="••••••••" value={newAide.password} onChange={(e) => setNewAide({ ...newAide, password: e.target.value })} style={{ width: "100%", padding: "10px", border: "1px solid #cbd5e1", borderRadius: "6px" }} />
// //                     </div>
// //                     <button type="submit" style={{ flex: 1, minWidth: "150px", padding: "11px 15px", backgroundColor: "var(--primary-color)", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold", transition: "0.2s" }}>
// //                         Create Account
// //                     </button>
// //                 </div>
// //                 </form>
// //             </div>

// //             <h3 style={{ color: "#334155", marginBottom: "15px" }}>Current Dental Aides</h3>
// //             <div style={{ overflowX: "auto", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
// //                 <table style={{ width: "100%", borderCollapse: "collapse", backgroundColor: "white" }}>
// //                 <thead>
// //                     <tr style={{ backgroundColor: "#f1f5f9", textAlign: "left" }}>
// //                     <th style={{ padding: "15px", borderBottom: "1px solid #e2e8f0", color: "#475569" }}>Staff Name</th>
// //                     <th style={{ padding: "15px", borderBottom: "1px solid #e2e8f0", color: "#475569" }}>Email Address</th>
// //                     <th style={{ padding: "15px", borderBottom: "1px solid #e2e8f0", color: "#475569", width: "100px" }}>Actions</th>
// //                     </tr>
// //                 </thead>
// //                 <tbody>
// //                     {aides.length === 0 ? (
// //                         <tr><td colSpan="3" style={{ padding: "20px", textAlign: "center", color: "#94a3b8" }}>No dental aides registered.</td></tr>
// //                     ) : (
// //                         aides.map((aide) => (
// //                         <tr key={aide.id} style={{ transition: "background 0.2s" }}>
// //                             <td style={{ padding: "15px", borderBottom: "1px solid #f1f5f9", fontWeight: "500", color: "#1e293b" }}>{aide.name}</td>
// //                             <td style={{ padding: "15px", borderBottom: "1px solid #f1f5f9", color: "#64748b" }}>{aide.email}</td>
// //                             <td style={{ padding: "15px", borderBottom: "1px solid #f1f5f9" }}>
// //                             <button onClick={() => handleDeleteAide(aide.id)} style={{ color: "#ef4444", background: "#fef2f2", padding: "8px 12px", borderRadius: "6px", border: "1px solid #fca5a5", cursor: "pointer", fontWeight: "600" }}>Remove</button>
// //                             </td>
// //                         </tr>
// //                         ))
// //                     )}
// //                 </tbody>
// //                 </table>
// //             </div>
// //           </div>
// //         )}

// //         {activeTab === "services" && (
// //           <div className="services-section animation-fade-in">
// //             <div style={{ background: "#f0fdf4", padding: "20px", borderRadius: "8px", border: "1px solid #bbf7d0", marginBottom: "30px" }}>
// //                 <h3 style={{ marginTop: 0, marginBottom: "15px", color: "#166534" }}>Add New Service</h3>
// //                 <form onSubmit={handleAddService} style={{ display: "flex", gap: "15px", flexWrap: "wrap", alignItems: "flex-end" }}>
// //                     <div style={{ flex: 2, minWidth: "200px" }}>
// //                         <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#166534", marginBottom: "5px" }}>Service Name *</label>
// //                         <input type="text" placeholder="e.g., Pasta / Filling" value={newService.name} onChange={(e) => setNewService({ ...newService, name: e.target.value })} style={{ width: "100%", padding: "10px", border: "1px solid #86efac", borderRadius: "6px" }} />
// //                     </div>
// //                     <div style={{ flex: 1, minWidth: "120px" }}>
// //                         <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#166534", marginBottom: "5px" }}>Min Price (₱) *</label>
// //                         <input type="number" placeholder="500" value={newService.minPrice} onChange={(e) => setNewService({ ...newService, minPrice: e.target.value })} style={{ width: "100%", padding: "10px", border: "1px solid #86efac", borderRadius: "6px" }} />
// //                     </div>
// //                     <div style={{ flex: 1, minWidth: "120px" }}>
// //                         <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#166534", marginBottom: "5px" }}>Max Price (₱) *</label>
// //                         <input type="number" placeholder="1500" value={newService.maxPrice} onChange={(e) => setNewService({ ...newService, maxPrice: e.target.value })} style={{ width: "100%", padding: "10px", border: "1px solid #86efac", borderRadius: "6px" }} />
// //                     </div>
// //                     <button type="submit" style={{ flex: 1, minWidth: "120px", padding: "11px 15px", backgroundColor: "#16a34a", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" }}>
// //                         Add Service
// //                     </button>
// //                 </form>
// //             </div>

// //             <h3 style={{ color: "#334155", marginBottom: "15px" }}>Available Services & Pricing</h3>
// //             <div style={{ overflowX: "auto", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
// //                 <table style={{ width: "100%", borderCollapse: "collapse", backgroundColor: "white" }}>
// //                 <thead>
// //                     <tr style={{ backgroundColor: "#f1f5f9", textAlign: "left" }}>
// //                     <th style={{ padding: "15px", borderBottom: "1px solid #e2e8f0", color: "#475569" }}>Service Name</th>
// //                     <th style={{ padding: "15px", borderBottom: "1px solid #e2e8f0", color: "#475569" }}>Price Range (PHP)</th>
// //                     <th style={{ padding: "15px", borderBottom: "1px solid #e2e8f0", color: "#475569", width: "100px" }}>Actions</th>
// //                     </tr>
// //                 </thead>
// //                 <tbody>
// //                     {services.length === 0 ? (
// //                         <tr><td colSpan="3" style={{ padding: "20px", textAlign: "center", color: "#94a3b8" }}>No services have been added yet.</td></tr>
// //                     ) : (
// //                         services.map((service) => (
// //                         <tr key={service.id} style={{ transition: "background 0.2s" }}>
// //                             <td style={{ padding: "15px", borderBottom: "1px solid #f1f5f9", fontWeight: "600", color: "#1e293b" }}>{service.name}</td>
// //                             <td style={{ padding: "15px", borderBottom: "1px solid #f1f5f9", color: "#0f172a" }}>
// //                                 <span style={{ background: "#f1f5f9", padding: "4px 8px", borderRadius: "4px", fontSize: "14px" }}>₱{service.minPrice}</span>
// //                                 <span style={{ margin: "0 8px", color: "#94a3b8" }}>to</span>
// //                                 <span style={{ background: "#f1f5f9", padding: "4px 8px", borderRadius: "4px", fontSize: "14px" }}>₱{service.maxPrice}</span>
// //                             </td>
// //                             <td style={{ padding: "15px", borderBottom: "1px solid #f1f5f9" }}>
// //                             <button onClick={() => handleDeleteService(service.id)} style={{ color: "#ef4444", background: "#fef2f2", padding: "8px 12px", borderRadius: "6px", border: "1px solid #fca5a5", cursor: "pointer", fontWeight: "600" }}>Remove</button>
// //                             </td>
// //                         </tr>
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
//   const [newAide, setNewAide] = useState({ firstName: "", middleName: "", lastName: "", email: "", password: "" });

//   // --- CLINIC SERVICES STATE ---
//   const [services, setServices] = useState([]);
//   const [newService, setNewService] = useState({ name: "", minPrice: "", maxPrice: "" });

//   // 1. Fetch real aides and services when the page loads
//   useEffect(() => {
//     const loadData = async () => {
//       try {
//         const staffList = await api.getDentists();
//         const aidesOnly = staffList.filter(staff => staff.specialization === 'Dental Aide');
//         setAides(aidesOnly);

//         // Fetch dynamic services from the database
//         const servicesList = await api.getServices();
//         setServices(servicesList);
//       } catch (error) {
//         console.error("Failed to load settings data:", error);
//       }
//     };
//     loadData();
//   }, []);

//   // 2. Handle Add Aide
//   const handleAddAide = async (e) => {
//     e.preventDefault();
//     if (!newAide.firstName || !newAide.lastName || !newAide.email || !newAide.password) {
//       return toast.error("First Name, Last Name, Email, and Password are required.");
//     }
//     try {
//       const fullNameDisplay = `${newAide.firstName} ${newAide.middleName ? newAide.middleName + " " : ""}${newAide.lastName}`.trim();
//       const newStaff = await api.createDentist({
//         first_name: newAide.firstName, last_name: newAide.lastName, middle_name: newAide.middleName, email: newAide.email, password: newAide.password, specialization: "Dental Aide", role: "aide", status: "Available"
//       });
//       setAides([...aides, { id: newStaff.id, name: fullNameDisplay, email: newAide.email }]);
//       setNewAide({ firstName: "", middleName: "", lastName: "", email: "", password: "" });
//       toast.success("Dental Aide account created successfully!");
//     } catch (error) {
//       toast.error(error.message || "Failed to create aide.");
//     }
//   };

//   // 3. Handle Delete Aide
//   const handleDeleteAide = async (id) => {
//     try {
//       await api.deleteDentist(id); // Use the API client instead of raw fetch
//       setAides(aides.filter(aide => aide.id !== id));
//       toast.success("Dental Aide securely removed.");
//     } catch (error) {
//       toast.error(error.message);
//     }
//   };

//   // 4. Handle Add Service
//   const handleAddService = async (e) => {
//     e.preventDefault();
//     if (!newService.name || !newService.minPrice || !newService.maxPrice) {
//         return toast.error("All service fields are required.");
//     }
//     if (Number(newService.minPrice) > Number(newService.maxPrice)) {
//         return toast.error("Minimum price cannot be higher than the maximum price.");
//     }

//     try {
//         const createdService = await api.createService(newService);
//         setServices([...services, { id: createdService.id, name: newService.name, min_price: newService.minPrice, max_price: newService.maxPrice }]);
//         setNewService({ name: "", minPrice: "", maxPrice: "" });
//         toast.success("Service added successfully!");
//     } catch (error) {
//         toast.error("Failed to add service");
//     }
//   };

//   // 5. Handle Delete Service
//   const handleDeleteService = async (id) => {
//     try {
//         await api.deleteService(id);
//         setServices(services.filter(service => service.id !== id));
//         toast.success("Service removed.");
//     } catch (error) {
//         toast.error("Failed to delete service.");
//     }
//   };

//   return (
//     <div className="dashboard-container" style={{ padding: "20px", maxWidth: "1200px", margin: "0 auto" }}>
//       <div style={{ marginBottom: "25px" }}>
//         <h2 style={{ fontSize: "24px", color: "#1e293b", marginBottom: "5px" }}>Clinic Settings</h2>
//         <p style={{ color: "#64748b" }}>Manage your dental staff and the clinic's offered services.</p>
//       </div>

//       <div className="tabs" style={{ display: "flex", gap: "20px", borderBottom: "2px solid #e2e8f0", marginBottom: "30px" }}>
//         <button onClick={() => setActiveTab("aides")} style={{ padding: "12px 5px", fontSize: "16px", fontWeight: "600", border: "none", borderBottom: activeTab === "aides" ? "3px solid var(--primary-color)" : "3px solid transparent", background: "none", color: activeTab === "aides" ? "var(--primary-color)" : "#64748b", cursor: "pointer", transition: "all 0.2s" }}>Dental Aides</button>
//         <button onClick={() => setActiveTab("services")} style={{ padding: "12px 5px", fontSize: "16px", fontWeight: "600", border: "none", borderBottom: activeTab === "services" ? "3px solid var(--primary-color)" : "3px solid transparent", background: "none", color: activeTab === "services" ? "var(--primary-color)" : "#64748b", cursor: "pointer", transition: "all 0.2s" }}>Clinic Services</button>
//       </div>

//       <div className="tab-content">
//         {activeTab === "aides" && (
//           <div className="aides-section animation-fade-in">
//             <div style={{ background: "#f8fafc", padding: "20px", borderRadius: "8px", border: "1px solid #e2e8f0", marginBottom: "30px" }}>
//                 <h3 style={{ marginTop: 0, marginBottom: "15px", color: "#334155" }}>Add New Dental Aide</h3>
//                 <form onSubmit={handleAddAide} style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
//                 <div style={{ display: "flex", gap: "15px", flexWrap: "wrap" }}>
//                     <div style={{ flex: 1, minWidth: "200px" }}><label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#475569", marginBottom: "5px" }}>First Name *</label><input type="text" placeholder="Juan" value={newAide.firstName} onChange={(e) => setNewAide({ ...newAide, firstName: e.target.value })} style={{ width: "100%", padding: "10px", border: "1px solid #cbd5e1", borderRadius: "6px" }} /></div>
//                     <div style={{ flex: 1, minWidth: "200px" }}><label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#475569", marginBottom: "5px" }}>Middle Name (Optional)</label><input type="text" placeholder="Dela" value={newAide.middleName} onChange={(e) => setNewAide({ ...newAide, middleName: e.target.value })} style={{ width: "100%", padding: "10px", border: "1px solid #cbd5e1", borderRadius: "6px" }} /></div>
//                     <div style={{ flex: 1, minWidth: "200px" }}><label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#475569", marginBottom: "5px" }}>Last Name *</label><input type="text" placeholder="Cruz" value={newAide.lastName} onChange={(e) => setNewAide({ ...newAide, lastName: e.target.value })} style={{ width: "100%", padding: "10px", border: "1px solid #cbd5e1", borderRadius: "6px" }} /></div>
//                 </div>
//                 <div style={{ display: "flex", gap: "15px", flexWrap: "wrap", alignItems: "flex-end" }}>
//                     <div style={{ flex: 2, minWidth: "250px" }}><label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#475569", marginBottom: "5px" }}>Email Address *</label><input type="email" placeholder="juan@clinic.com" value={newAide.email} onChange={(e) => setNewAide({ ...newAide, email: e.target.value })} style={{ width: "100%", padding: "10px", border: "1px solid #cbd5e1", borderRadius: "6px" }} /></div>
//                     <div style={{ flex: 2, minWidth: "250px" }}><label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#475569", marginBottom: "5px" }}>Given Password *</label><input type="password" placeholder="••••••••" value={newAide.password} onChange={(e) => setNewAide({ ...newAide, password: e.target.value })} style={{ width: "100%", padding: "10px", border: "1px solid #cbd5e1", borderRadius: "6px" }} /></div>
//                     <button type="submit" style={{ flex: 1, minWidth: "150px", padding: "11px 15px", backgroundColor: "var(--primary-color)", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold", transition: "0.2s" }}>Create Account</button>
//                 </div>
//                 </form>
//             </div>

//             <h3 style={{ color: "#334155", marginBottom: "15px" }}>Current Dental Aides</h3>
//             <div style={{ overflowX: "auto", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
//                 <table style={{ width: "100%", borderCollapse: "collapse", backgroundColor: "white" }}>
//                 <thead><tr style={{ backgroundColor: "#f1f5f9", textAlign: "left" }}><th style={{ padding: "15px", borderBottom: "1px solid #e2e8f0", color: "#475569" }}>Staff Name</th><th style={{ padding: "15px", borderBottom: "1px solid #e2e8f0", color: "#475569" }}>Email Address</th><th style={{ padding: "15px", borderBottom: "1px solid #e2e8f0", color: "#475569", width: "100px" }}>Actions</th></tr></thead>
//                 <tbody>
//                     {aides.length === 0 ? (<tr><td colSpan="3" style={{ padding: "20px", textAlign: "center", color: "#94a3b8" }}>No dental aides registered.</td></tr>) : (
//                         aides.map((aide) => (<tr key={aide.id} style={{ transition: "background 0.2s" }}><td style={{ padding: "15px", borderBottom: "1px solid #f1f5f9", fontWeight: "500", color: "#1e293b" }}>{aide.name}</td><td style={{ padding: "15px", borderBottom: "1px solid #f1f5f9", color: "#64748b" }}>{aide.email}</td><td style={{ padding: "15px", borderBottom: "1px solid #f1f5f9" }}><button onClick={() => handleDeleteAide(aide.id)} style={{ color: "#ef4444", background: "#fef2f2", padding: "8px 12px", borderRadius: "6px", border: "1px solid #fca5a5", cursor: "pointer", fontWeight: "600" }}>Remove</button></td></tr>))
//                     )}
//                 </tbody>
//                 </table>
//             </div>
//           </div>
//         )}

//         {activeTab === "services" && (
//           <div className="services-section animation-fade-in">
//             <div style={{ background: "#f0fdf4", padding: "20px", borderRadius: "8px", border: "1px solid #bbf7d0", marginBottom: "30px" }}>
//                 <h3 style={{ marginTop: 0, marginBottom: "15px", color: "#166534" }}>Add New Service</h3>
//                 <form onSubmit={handleAddService} style={{ display: "flex", gap: "15px", flexWrap: "wrap", alignItems: "flex-end" }}>
//                     <div style={{ flex: 2, minWidth: "200px" }}><label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#166534", marginBottom: "5px" }}>Service Name *</label><input type="text" placeholder="e.g., Pasta / Filling" value={newService.name} onChange={(e) => setNewService({ ...newService, name: e.target.value })} style={{ width: "100%", padding: "10px", border: "1px solid #86efac", borderRadius: "6px" }} /></div>
//                     <div style={{ flex: 1, minWidth: "120px" }}><label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#166534", marginBottom: "5px" }}>Min Price (₱) *</label><input type="number" placeholder="500" value={newService.minPrice} onChange={(e) => setNewService({ ...newService, minPrice: e.target.value })} style={{ width: "100%", padding: "10px", border: "1px solid #86efac", borderRadius: "6px" }} /></div>
//                     <div style={{ flex: 1, minWidth: "120px" }}><label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#166534", marginBottom: "5px" }}>Max Price (₱) *</label><input type="number" placeholder="1500" value={newService.maxPrice} onChange={(e) => setNewService({ ...newService, maxPrice: e.target.value })} style={{ width: "100%", padding: "10px", border: "1px solid #86efac", borderRadius: "6px" }} /></div>
//                     <button type="submit" style={{ flex: 1, minWidth: "120px", padding: "11px 15px", backgroundColor: "#16a34a", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" }}>Add Service</button>
//                 </form>
//             </div>

//             <h3 style={{ color: "#334155", marginBottom: "15px" }}>Available Services & Pricing</h3>
//             <div style={{ overflowX: "auto", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
//                 <table style={{ width: "100%", borderCollapse: "collapse", backgroundColor: "white" }}>
//                 <thead><tr style={{ backgroundColor: "#f1f5f9", textAlign: "left" }}><th style={{ padding: "15px", borderBottom: "1px solid #e2e8f0", color: "#475569" }}>Service Name</th><th style={{ padding: "15px", borderBottom: "1px solid #e2e8f0", color: "#475569" }}>Price Range (PHP)</th><th style={{ padding: "15px", borderBottom: "1px solid #e2e8f0", color: "#475569", width: "100px" }}>Actions</th></tr></thead>
//                 <tbody>
//                     {services.length === 0 ? (<tr><td colSpan="3" style={{ padding: "20px", textAlign: "center", color: "#94a3b8" }}>No services have been added yet.</td></tr>) : (
//                         services.map((service) => (<tr key={service.id} style={{ transition: "background 0.2s" }}><td style={{ padding: "15px", borderBottom: "1px solid #f1f5f9", fontWeight: "600", color: "#1e293b" }}>{service.name}</td><td style={{ padding: "15px", borderBottom: "1px solid #f1f5f9", color: "#0f172a" }}><span style={{ background: "#f1f5f9", padding: "4px 8px", borderRadius: "4px", fontSize: "14px" }}>₱{service.min_price}</span><span style={{ margin: "0 8px", color: "#94a3b8" }}>to</span><span style={{ background: "#f1f5f9", padding: "4px 8px", borderRadius: "4px", fontSize: "14px" }}>₱{service.max_price}</span></td><td style={{ padding: "15px", borderBottom: "1px solid #f1f5f9" }}><button onClick={() => handleDeleteService(service.id)} style={{ color: "#ef4444", background: "#fef2f2", padding: "8px 12px", borderRadius: "6px", border: "1px solid #fca5a5", cursor: "pointer", fontWeight: "600" }}>Remove</button></td></tr>))
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
  const [newAide, setNewAide] = useState({ firstName: "", middleName: "", lastName: "", email: "", password: "" });

  // --- CLINIC SERVICES STATE ---
  const [services, setServices] = useState([]);
  const [newService, setNewService] = useState({ name: "", minPrice: "", maxPrice: "" });

  // 1. Fetch real aides and services when the page loads
  useEffect(() => {
    const loadData = async () => {
      try {
        const staffList = await api.getDentists();
        // ONLY show staff with "Dental Aide" specialization here
        const aidesOnly = staffList.filter(staff => staff.specialization === 'Dental Aide');
        setAides(aidesOnly);

        // Fetch dynamic services from the database
        const servicesList = await api.getServices();
        setServices(servicesList);
      } catch (error) {
        console.error("Failed to load settings data:", error);
      }
    };
    loadData();
  }, []);

  // 2. Handle Add Aide
  const handleAddAide = async (e) => {
    e.preventDefault();
    if (!newAide.firstName || !newAide.lastName || !newAide.email || !newAide.password) {
      return toast.error("First Name, Last Name, Email, and Password are required.");
    }
    try {
      const fullNameDisplay = `${newAide.firstName} ${newAide.middleName ? newAide.middleName + " " : ""}${newAide.lastName}`.trim();
      const newStaff = await api.createDentist({
        first_name: newAide.firstName, 
        last_name: newAide.lastName, 
        middle_name: newAide.middleName, 
        email: newAide.email, 
        password: newAide.password, 
        specialization: "Dental Aide", // This ensures it displays in this specific list
        role: "aide", 
        status: "Available"
      });
      setAides([...aides, { id: newStaff.id, name: fullNameDisplay, email: newAide.email }]);
      setNewAide({ firstName: "", middleName: "", lastName: "", email: "", password: "" });
      toast.success("Dental Aide account created successfully!");
    } catch (error) {
      toast.error(error.message || "Failed to create aide.");
    }
  };

  // 3. Handle Delete Aide
  const handleDeleteAide = async (id) => {
    try {
      await api.deleteDentist(id); // Use the API client instead of raw fetch
      setAides(aides.filter(aide => aide.id !== id));
      toast.success("Dental Aide securely removed.");
    } catch (error) {
      toast.error(error.message);
    }
  };

  // 4. Handle Add Service
  const handleAddService = async (e) => {
    e.preventDefault();
    if (!newService.name || !newService.minPrice || !newService.maxPrice) {
        return toast.error("All service fields are required.");
    }
    if (Number(newService.minPrice) > Number(newService.maxPrice)) {
        return toast.error("Minimum price cannot be higher than the maximum price.");
    }

    try {
        const createdService = await api.createService(newService);
        setServices([...services, { id: createdService.id, name: newService.name, min_price: newService.minPrice, max_price: newService.maxPrice }]);
        setNewService({ name: "", minPrice: "", maxPrice: "" });
        toast.success("Service added successfully!");
    } catch (error) {
        toast.error("Failed to add service");
    }
  };

  // 5. Handle Delete Service
  const handleDeleteService = async (id) => {
    try {
        await api.deleteService(id);
        setServices(services.filter(service => service.id !== id));
        toast.success("Service removed.");
    } catch (error) {
        toast.error("Failed to delete service.");
    }
  };

  return (
    <div className="dashboard-container" style={{ padding: "20px", maxWidth: "1200px", margin: "0 auto" }}>
      <div style={{ marginBottom: "25px" }}>
        <h2 style={{ fontSize: "24px", color: "#1e293b", marginBottom: "5px" }}>Clinic Settings</h2>
        <p style={{ color: "#64748b" }}>Manage your dental staff and the clinic's offered services.</p>
      </div>

      <div className="tabs" style={{ display: "flex", gap: "20px", borderBottom: "2px solid #e2e8f0", marginBottom: "30px" }}>
        <button onClick={() => setActiveTab("aides")} style={{ padding: "12px 5px", fontSize: "16px", fontWeight: "600", border: "none", borderBottom: activeTab === "aides" ? "3px solid var(--primary-color)" : "3px solid transparent", background: "none", color: activeTab === "aides" ? "var(--primary-color)" : "#64748b", cursor: "pointer", transition: "all 0.2s" }}>Dental Aides</button>
        <button onClick={() => setActiveTab("services")} style={{ padding: "12px 5px", fontSize: "16px", fontWeight: "600", border: "none", borderBottom: activeTab === "services" ? "3px solid var(--primary-color)" : "3px solid transparent", background: "none", color: activeTab === "services" ? "var(--primary-color)" : "#64748b", cursor: "pointer", transition: "all 0.2s" }}>Clinic Services</button>
      </div>

      <div className="tab-content">
        {activeTab === "aides" && (
          <div className="aides-section animation-fade-in">
            <div style={{ background: "#f8fafc", padding: "20px", borderRadius: "8px", border: "1px solid #e2e8f0", marginBottom: "30px" }}>
                <h3 style={{ marginTop: 0, marginBottom: "15px", color: "#334155" }}>Add New Dental Aide</h3>
                <form onSubmit={handleAddAide} style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
                <div style={{ display: "flex", gap: "15px", flexWrap: "wrap" }}>
                    <div style={{ flex: 1, minWidth: "200px" }}><label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#475569", marginBottom: "5px" }}>First Name *</label><input type="text" placeholder="Juan" value={newAide.firstName} onChange={(e) => setNewAide({ ...newAide, firstName: e.target.value })} style={{ width: "100%", padding: "10px", border: "1px solid #cbd5e1", borderRadius: "6px" }} /></div>
                    <div style={{ flex: 1, minWidth: "200px" }}><label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#475569", marginBottom: "5px" }}>Middle Name (Optional)</label><input type="text" placeholder="Dela" value={newAide.middleName} onChange={(e) => setNewAide({ ...newAide, middleName: e.target.value })} style={{ width: "100%", padding: "10px", border: "1px solid #cbd5e1", borderRadius: "6px" }} /></div>
                    <div style={{ flex: 1, minWidth: "200px" }}><label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#475569", marginBottom: "5px" }}>Last Name *</label><input type="text" placeholder="Cruz" value={newAide.lastName} onChange={(e) => setNewAide({ ...newAide, lastName: e.target.value })} style={{ width: "100%", padding: "10px", border: "1px solid #cbd5e1", borderRadius: "6px" }} /></div>
                </div>
                <div style={{ display: "flex", gap: "15px", flexWrap: "wrap", alignItems: "flex-end" }}>
                    <div style={{ flex: 2, minWidth: "250px" }}><label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#475569", marginBottom: "5px" }}>Email Address *</label><input type="email" placeholder="juan@clinic.com" value={newAide.email} onChange={(e) => setNewAide({ ...newAide, email: e.target.value })} style={{ width: "100%", padding: "10px", border: "1px solid #cbd5e1", borderRadius: "6px" }} /></div>
                    <div style={{ flex: 2, minWidth: "250px" }}><label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#475569", marginBottom: "5px" }}>Given Password *</label><input type="password" placeholder="••••••••" value={newAide.password} onChange={(e) => setNewAide({ ...newAide, password: e.target.value })} style={{ width: "100%", padding: "10px", border: "1px solid #cbd5e1", borderRadius: "6px" }} /></div>
                    <button type="submit" style={{ flex: 1, minWidth: "150px", padding: "11px 15px", backgroundColor: "var(--primary-color)", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold", transition: "0.2s" }}>Create Account</button>
                </div>
                </form>
            </div>

            <h3 style={{ color: "#334155", marginBottom: "15px" }}>Current Dental Aides</h3>
            <div style={{ overflowX: "auto", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", backgroundColor: "white" }}>
                <thead><tr style={{ backgroundColor: "#f1f5f9", textAlign: "left" }}><th style={{ padding: "15px", borderBottom: "1px solid #e2e8f0", color: "#475569" }}>Staff Name</th><th style={{ padding: "15px", borderBottom: "1px solid #e2e8f0", color: "#475569" }}>Email Address</th><th style={{ padding: "15px", borderBottom: "1px solid #e2e8f0", color: "#475569", width: "100px" }}>Actions</th></tr></thead>
                <tbody>
                    {aides.length === 0 ? (<tr><td colSpan="3" style={{ padding: "20px", textAlign: "center", color: "#94a3b8" }}>No dental aides registered.</td></tr>) : (
                        aides.map((aide) => (<tr key={aide.id} style={{ transition: "background 0.2s" }}><td style={{ padding: "15px", borderBottom: "1px solid #f1f5f9", fontWeight: "500", color: "#1e293b" }}>{aide.name}</td><td style={{ padding: "15px", borderBottom: "1px solid #f1f5f9", color: "#64748b" }}>{aide.email}</td><td style={{ padding: "15px", borderBottom: "1px solid #f1f5f9" }}><button onClick={() => handleDeleteAide(aide.id)} style={{ color: "#ef4444", background: "#fef2f2", padding: "8px 12px", borderRadius: "6px", border: "1px solid #fca5a5", cursor: "pointer", fontWeight: "600" }}>Remove</button></td></tr>))
                    )}
                </tbody>
                </table>
            </div>
          </div>
        )}

        {activeTab === "services" && (
          <div className="services-section animation-fade-in">
            <div style={{ background: "#f0fdf4", padding: "20px", borderRadius: "8px", border: "1px solid #bbf7d0", marginBottom: "30px" }}>
                <h3 style={{ marginTop: 0, marginBottom: "15px", color: "#166534" }}>Add New Service</h3>
                <form onSubmit={handleAddService} style={{ display: "flex", gap: "15px", flexWrap: "wrap", alignItems: "flex-end" }}>
                    <div style={{ flex: 2, minWidth: "200px" }}><label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#166534", marginBottom: "5px" }}>Service Name *</label><input type="text" placeholder="e.g., Pasta / Filling" value={newService.name} onChange={(e) => setNewService({ ...newService, name: e.target.value })} style={{ width: "100%", padding: "10px", border: "1px solid #86efac", borderRadius: "6px" }} /></div>
                    <div style={{ flex: 1, minWidth: "120px" }}><label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#166534", marginBottom: "5px" }}>Min Price (₱) *</label><input type="number" placeholder="500" value={newService.minPrice} onChange={(e) => setNewService({ ...newService, minPrice: e.target.value })} style={{ width: "100%", padding: "10px", border: "1px solid #86efac", borderRadius: "6px" }} /></div>
                    <div style={{ flex: 1, minWidth: "120px" }}><label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#166534", marginBottom: "5px" }}>Max Price (₱) *</label><input type="number" placeholder="1500" value={newService.maxPrice} onChange={(e) => setNewService({ ...newService, maxPrice: e.target.value })} style={{ width: "100%", padding: "10px", border: "1px solid #86efac", borderRadius: "6px" }} /></div>
                    <button type="submit" style={{ flex: 1, minWidth: "120px", padding: "11px 15px", backgroundColor: "#16a34a", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" }}>Add Service</button>
                </form>
            </div>

            <h3 style={{ color: "#334155", marginBottom: "15px" }}>Available Services & Pricing</h3>
            <div style={{ overflowX: "auto", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", backgroundColor: "white" }}>
                <thead><tr style={{ backgroundColor: "#f1f5f9", textAlign: "left" }}><th style={{ padding: "15px", borderBottom: "1px solid #e2e8f0", color: "#475569" }}>Service Name</th><th style={{ padding: "15px", borderBottom: "1px solid #e2e8f0", color: "#475569" }}>Price Range (PHP)</th><th style={{ padding: "15px", borderBottom: "1px solid #e2e8f0", color: "#475569", width: "100px" }}>Actions</th></tr></thead>
                <tbody>
                    {services.length === 0 ? (<tr><td colSpan="3" style={{ padding: "20px", textAlign: "center", color: "#94a3b8" }}>No services have been added yet.</td></tr>) : (
                        services.map((service) => (<tr key={service.id} style={{ transition: "background 0.2s" }}><td style={{ padding: "15px", borderBottom: "1px solid #f1f5f9", fontWeight: "600", color: "#1e293b" }}>{service.name}</td><td style={{ padding: "15px", borderBottom: "1px solid #f1f5f9", color: "#0f172a" }}><span style={{ background: "#f1f5f9", padding: "4px 8px", borderRadius: "4px", fontSize: "14px" }}>₱{service.min_price}</span><span style={{ margin: "0 8px", color: "#94a3b8" }}>to</span><span style={{ background: "#f1f5f9", padding: "4px 8px", borderRadius: "4px", fontSize: "14px" }}>₱{service.max_price}</span></td><td style={{ padding: "15px", borderBottom: "1px solid #f1f5f9" }}><button onClick={() => handleDeleteService(service.id)} style={{ color: "#ef4444", background: "#fef2f2", padding: "8px 12px", borderRadius: "6px", border: "1px solid #fca5a5", cursor: "pointer", fontWeight: "600" }}>Remove</button></td></tr>))
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