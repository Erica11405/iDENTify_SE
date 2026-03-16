// frontend/src/pages/Settings.jsx
import React, { useState } from "react";
import toast from "react-hot-toast";
import "../styles/base.css"; // Ensure this uses your standard table and button classes

function Settings({ userRole }) {
  const [activeTab, setActiveTab] = useState("aides");

  // Mock Data (To be replaced with API calls)
  const [aides, setAides] = useState([
    { id: 1, fullName: "Sarah Connor", email: "sarah@identify.com" }
  ]);
  const [services, setServices] = useState([
    { id: 1, name: "Teeth Cleaning", price: 1500 }
  ]);

  // Form States
  const [newAide, setNewAide] = useState({ fullName: "", email: "", password: "" });
  const [newService, setNewService] = useState({ name: "", price: "" });

  // Handlers for Aides
  const handleAddAide = (e) => {
    e.preventDefault();
    if (!newAide.fullName || !newAide.email || !newAide.password) return toast.error("All fields are required.");
    const addedAide = { id: Date.now(), ...newAide };
    setAides([...aides, addedAide]);
    setNewAide({ fullName: "", email: "", password: "" });
    toast.success("Dental Aide added successfully!");
  };

  const handleDeleteAide = (id) => {
    setAides(aides.filter(aide => aide.id !== id));
    toast.success("Dental Aide removed.");
  };

  // Handlers for Services
  const handleAddService = (e) => {
    e.preventDefault();
    if (!newService.name || !newService.price) return toast.error("All fields are required.");
    const addedService = { id: Date.now(), ...newService };
    setServices([...services, addedService]);
    setNewService({ name: "", price: "" });
    toast.success("Service added successfully!");
  };

  const handleDeleteService = (id) => {
    setServices(services.filter(service => service.id !== id));
    toast.success("Service removed.");
  };

  if (userRole !== 'dentist') {
    return <div className="error-banner">Access Denied. Dentists only.</div>;
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Clinic Settings</h1>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "20px", marginBottom: "20px" }}>
        <button 
          className={`tab-button ${activeTab === "aides" ? "active" : ""}`} 
          onClick={() => setActiveTab("aides")}
          style={{ padding: "10px 20px", cursor: "pointer", borderBottom: activeTab === "aides" ? "2px solid var(--primary-color)" : "none", background: "none", border: "none", fontWeight: "bold" }}
        >
          Manage Dental Aides
        </button>
        <button 
          className={`tab-button ${activeTab === "services" ? "active" : ""}`} 
          onClick={() => setActiveTab("services")}
          style={{ padding: "10px 20px", cursor: "pointer", borderBottom: activeTab === "services" ? "2px solid var(--primary-color)" : "none", background: "none", border: "none", fontWeight: "bold" }}
        >
          Manage Services
        </button>
      </div>

      <div className="settings-content card" style={{ padding: "20px", backgroundColor: "#fff", borderRadius: "8px", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }}>
        
        {/* AIDES TAB */}
        {activeTab === "aides" && (
          <div>
            <h3>Add New Dental Aide</h3>
            <form onSubmit={handleAddAide} style={{ display: "flex", gap: "10px", marginBottom: "30px", flexWrap: "wrap" }}>
              <input type="text" placeholder="Full Name" value={newAide.fullName} onChange={(e) => setNewAide({...newAide, fullName: e.target.value})} style={{ padding: "10px", borderRadius: "4px", border: "1px solid #ccc", flex: "1" }} />
              <input type="email" placeholder="Email Address" value={newAide.email} onChange={(e) => setNewAide({...newAide, email: e.target.value})} style={{ padding: "10px", borderRadius: "4px", border: "1px solid #ccc", flex: "1" }} />
              <input type="password" placeholder="Temporary Password" value={newAide.password} onChange={(e) => setNewAide({...newAide, password: e.target.value})} style={{ padding: "10px", borderRadius: "4px", border: "1px solid #ccc", flex: "1" }} />
              <button type="submit" style={{ padding: "10px 20px", backgroundColor: "var(--primary-color)", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>Add Aide</button>
            </form>

            <h3>Current Dental Aides</h3>
            <table className="data-table" style={{ width: "100%", borderCollapse: "collapse", marginTop: "10px" }}>
              <thead>
                <tr style={{ backgroundColor: "#f9fafb", textAlign: "left" }}>
                  <th style={{ padding: "12px", borderBottom: "1px solid #ddd" }}>Name</th>
                  <th style={{ padding: "12px", borderBottom: "1px solid #ddd" }}>Email</th>
                  <th style={{ padding: "12px", borderBottom: "1px solid #ddd" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {aides.map((aide) => (
                  <tr key={aide.id}>
                    <td style={{ padding: "12px", borderBottom: "1px solid #eee" }}>{aide.fullName}</td>
                    <td style={{ padding: "12px", borderBottom: "1px solid #eee" }}>{aide.email}</td>
                    <td style={{ padding: "12px", borderBottom: "1px solid #eee" }}>
                      <button onClick={() => handleDeleteAide(aide.id)} style={{ color: "red", background: "none", border: "none", cursor: "pointer" }}>Remove</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* SERVICES TAB */}
        {activeTab === "services" && (
          <div>
            <h3>Add New Service</h3>
            <form onSubmit={handleAddService} style={{ display: "flex", gap: "10px", marginBottom: "30px" }}>
              <input type="text" placeholder="Service Name" value={newService.name} onChange={(e) => setNewService({...newService, name: e.target.value})} style={{ padding: "10px", borderRadius: "4px", border: "1px solid #ccc", flex: "2" }} />
              <input type="number" placeholder="Price (PHP)" value={newService.price} onChange={(e) => setNewService({...newService, price: e.target.value})} style={{ padding: "10px", borderRadius: "4px", border: "1px solid #ccc", flex: "1" }} />
              <button type="submit" style={{ padding: "10px 20px", backgroundColor: "var(--primary-color)", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>Add Service</button>
            </form>

            <h3>Available Services</h3>
            <table className="data-table" style={{ width: "100%", borderCollapse: "collapse", marginTop: "10px" }}>
              <thead>
                <tr style={{ backgroundColor: "#f9fafb", textAlign: "left" }}>
                  <th style={{ padding: "12px", borderBottom: "1px solid #ddd" }}>Service</th>
                  <th style={{ padding: "12px", borderBottom: "1px solid #ddd" }}>Price (PHP)</th>
                  <th style={{ padding: "12px", borderBottom: "1px solid #ddd" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {services.map((service) => (
                  <tr key={service.id}>
                    <td style={{ padding: "12px", borderBottom: "1px solid #eee" }}>{service.name}</td>
                    <td style={{ padding: "12px", borderBottom: "1px solid #eee" }}>₱{service.price}</td>
                    <td style={{ padding: "12px", borderBottom: "1px solid #eee" }}>
                      <button onClick={() => handleDeleteService(service.id)} style={{ color: "red", background: "none", border: "none", cursor: "pointer" }}>Remove</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default Settings;