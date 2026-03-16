// import React, { useState, useEffect } from "react";
// import useApi from "../hooks/useApi";
// import { NavLink, Outlet, useNavigate } from "react-router-dom";
// import "../styles/layout/AppLayout.css";

// import DashboardIcon from "../assets/dashboard.svg";
// import AppointmentIcon from "../assets/appointment.svg";
// import QueueIcon from "../assets/queue.svg";
// import ReportIcon from "../assets/report.svg";
// import DentistIcon from "../assets/dentist.svg";
// import LogoutIcon from "../assets/logout.svg";

// function AppLayout({ setIsLoggedIn }) {
// 	const navigate = useNavigate();
// 	const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
// 	const { loadPatients, loadAppointments, loadQueue } = useApi();
// 	const [isLoadingData, setIsLoadingData] = useState(false);

// 	useEffect(() => {
// 		let mounted = true;
// 		async function initData() {
// 			setIsLoadingData(true);
// 			try {
// 				await Promise.all([loadPatients(), loadAppointments(), loadQueue()]);
// 			} catch (error) {
// 				console.error('Failed to load initial data:', error);
// 			} finally {
// 				if (mounted) setIsLoadingData(false);
// 			}
// 		}
// 		initData();
// 		return () => { mounted = false; };
// 	}, [loadPatients, loadAppointments, loadQueue]);

// 	const handleLogout = () => {
// 		setIsLoggedIn();
// 		navigate("/");
// 	};

// 	const toggleSidebar = () => {
// 		setIsSidebarCollapsed(!isSidebarCollapsed);
// 	};

// 	return (
// 		<div className="layout">
// 			{isLoadingData && (
// 				<div className="data-loading-overlay">
// 					<div className="data-loading-message">Loading clinic data…</div>
// 				</div>
// 			)}
// 			<aside className={`sidebar ${isSidebarCollapsed ? "collapsed" : ""}`}>
// 				<div className="sidebar-header">
// 					<span className="sidebar-title">iDENTify</span>
// 				</div>
// 				<button className="toggle-btn" onClick={toggleSidebar}>
// 					{isSidebarCollapsed ? (
// 						<svg
// 							xmlns="http://www.w3.org/2000/svg"
// 							width="24"
// 							height="24"
// 							viewBox="0 0 24 24"
// 							fill="none"
// 							stroke="currentColor"
// 							strokeWidth="2"
// 							strokeLinecap="round"
// 							strokeLinejoin="round"
// 						>
// 							<line x1="3" y1="12" x2="21" y2="12" />
// 							<line x1="3" y1="6" x2="21" y2="6" />
// 							<line x1="3" y1="18" x2="21" y2="18" />
// 						</svg>
// 					) : (
// 						<svg
// 							xmlns="http://www.w3.org/2000/svg"
// 							width="24"
// 							height="24"
// 							viewBox="0 0 24 24"
// 							fill="none"
// 							stroke="currentColor"
// 							strokeWidth="2"
// 							strokeLinecap="round"
// 							strokeLinejoin="round"
// 						>
// 							<line x1="18" y1="6" x2="6" y2="18" />
// 							<line x1="6" y1="6" x2="18" y2="18" />
// 						</svg>
// 					)}
// 				</button>

// 				<nav>
// 					<NavLink to="/app" end>
// 						<img src={DashboardIcon} alt="Dashboard" />
// 						<span>Dashboard</span>
// 					</NavLink>
// 					<NavLink to="/app/appointments">
// 						<img src={AppointmentIcon} alt="Appointments" />
// 						<span>Appointments</span>
// 					</NavLink>
// 					<NavLink to="/app/queue">
// 						<img src={QueueIcon} alt="Queue" />
// 						<span>Queue</span>
// 					</NavLink>
// 					<NavLink to="/app/reports">
// 						<img src={ReportIcon} alt="Reports" />
// 						<span>Reports</span>
// 					</NavLink>
// 					<NavLink to="/app/dentists">
// 						<img src={DentistIcon} alt="Dentists" />
// 						<span>Dentists</span>
// 					</NavLink>
// 					{/* <NavLink to="/app/patients">
// 						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
// 							<circle cx="12" cy="8" r="3" stroke="currentColor" strokeWidth="1.5" />
// 							<path d="M4 18c1.3-3.6 4.6-6 8-6s6.7 2.4 8 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
// 						</svg>
// 						<span>Patients</span>
// 					</NavLink> */}
// 					<NavLink to="/app/history">
// 						<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
// 							<path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
// 						</svg>
// 						<span>History</span>
// 					</NavLink>
// 				</nav>

// 				<button onClick={handleLogout} className="logout-btn">
// 					<img src={LogoutIcon} alt="Logout" />
// 					<span>Logout</span>
// 				</button>
// 			</aside>

// 			<main className="content">
// 				<Outlet />
// 			</main>
// 		</div>
// 	);
// }


// export default AppLayout;

import React from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";

// Standardizing your icon imports based on your existing assets folder
import dashboardIcon from "../assets/dashboard.svg";
import appointmentIcon from "../assets/appointment.svg";
import queueIcon from "../assets/queue.svg";
import historyIcon from "../assets/toothform.svg"; 
import reportsIcon from "../assets/report.svg";
import dentistIcon from "../assets/dentist.svg";
import logoutIcon from "../assets/logout.svg";
import "../styles/layout/AppLayout.css";

function AppLayout({ setIsLoggedIn, userRole }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    setIsLoggedIn();
    navigate("/");
  };

  return (
    <div className="app-layout">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2>iDENTify</h2>
          {/* Display the active role directly in the sidebar */}
          <p style={{ fontSize: "0.85rem", color: "var(--primary-color)", fontWeight: "bold", marginTop: "-10px", marginBottom: "20px" }}>
            {userRole === 'dentist' ? 'Dentist Account' : 'Dental Aide'}
          </p>
        </div>

        <nav className="sidebar-nav">
          <NavLink to="/app" end className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
            <img src={dashboardIcon} alt="Dashboard" className="nav-icon" />
            <span>Dashboard</span>
          </NavLink>

          <NavLink to="/app/appointments" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
            <img src={appointmentIcon} alt="Appointments" className="nav-icon" />
            <span>Appointments</span>
          </NavLink>

          <NavLink to="/app/queue" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
            <img src={queueIcon} alt="Queue" className="nav-icon" />
            <span>Queue</span>
          </NavLink>

          <NavLink to="/app/history" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
            <img src={historyIcon} alt="History" className="nav-icon" />
            <span>History</span>
          </NavLink>

          <NavLink to="/app/patients" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
            <img src={historyIcon} alt="Patients" className="nav-icon" />
            <span>Patients</span>
          </NavLink>

          <NavLink to="/app/reports" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
            <img src={reportsIcon} alt="Reports" className="nav-icon" />
            <span>Reports</span>
          </NavLink>

          <NavLink to="/app/dentists" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
            <img src={dentistIcon} alt="Dentists" className="nav-icon" />
            <span>Dentists</span>
          </NavLink>

          {/* DENTIST ONLY: Settings Menu */}
          {userRole === 'dentist' && (
            <NavLink to="/app/settings" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
              <img src={dentistIcon} alt="Settings" className="nav-icon" /> 
              <span>Settings</span>
            </NavLink>
          )}
        </nav>

        <div className="sidebar-footer">
          <button className="logout-button" onClick={handleLogout}>
            <img src={logoutIcon} alt="Logout" className="nav-icon" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}

export default AppLayout;