import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import useAppStore from "../store/useAppStore";

// Icons
import DashboardIcon from "../assets/dashboard.svg";
import AppointmentIcon from "../assets/appointment.svg";
import QueueIcon from "../assets/queue.svg";
import ReportIcon from "../assets/report.svg";
import DentistIcon from "../assets/dentist.svg";
import LogoutIcon from "../assets/logout.svg";
import ConditionIcon from "../assets/condition.svg"; 
import logo from "../assets/toothlogo.svg";

function Sidebar({ role }) {
    const navigate = useNavigate();
    const { resetStore, user } = useAppStore();
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

    const handleLogout = () => {
        resetStore();
        navigate('/');
    };

    return (
        <aside className={`sidebar ${isSidebarCollapsed ? 'collapsed' : ''}`}>
            <div className="sidebar-header">
                <img src={logo} alt="iDENTify Logo" className="logo" />
                {/* The CSS specifically looks for .sidebar-title to animate the text hiding */}
                <span className="sidebar-title">iDENTify</span>
                
                <button 
                    className="toggle-btn" 
                    onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                >
                    {isSidebarCollapsed ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#334e68" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#334e68" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    )}
                </button>
            </div>

            <nav>
                {/* DENTIST LINKS */}
                {role === 'dentist' ? (
                    <>
                        <NavLink to="/dashboard" className={({ isActive }) => isActive ? 'active' : ''}>
                            <img src={DashboardIcon} alt="Dashboard" />
                            <span>Dashboard</span>
                        </NavLink>
                        <NavLink to="/appointments" className={({ isActive }) => isActive ? 'active' : ''}>
                            <img src={AppointmentIcon} alt="Appointments" />
                            <span>Appointments</span>
                        </NavLink>
                        <NavLink to="/settings" className={({ isActive }) => isActive ? 'active' : ''}>
                            <img src={DentistIcon} alt="Settings" />
                            <span>Clinic Settings</span>
                        </NavLink>
                    </>
                ) : (
                /* AIDE LINKS */
                    <>
                        <NavLink to="/dashboard" className={({ isActive }) => isActive ? 'active' : ''}>
                            <img src={DashboardIcon} alt="Dashboard" />
                            <span>Dashboard</span>
                        </NavLink>
                        <NavLink to="/patients" className={({ isActive }) => isActive ? 'active' : ''}>
                            <img src={ConditionIcon} alt="Patients" />
                            <span>Patients</span>
                        </NavLink>
                        <NavLink to="/appointments" className={({ isActive }) => isActive ? 'active' : ''}>
                            <img src={AppointmentIcon} alt="Appointments" />
                            <span>Appointments</span>
                        </NavLink>
                        <NavLink to="/queue" className={({ isActive }) => isActive ? 'active' : ''}>
                            <img src={QueueIcon} alt="Queue" />
                            <span>Queue</span>
                        </NavLink>
                        <NavLink to="/history" className={({ isActive }) => isActive ? 'active' : ''}>
                            <img src={ReportIcon} alt="History" />
                            <span>History</span>
                        </NavLink>
                        <NavLink to="/dentists" className={({ isActive }) => isActive ? 'active' : ''}>
                            <img src={DentistIcon} alt="Dentists" />
                            <span>Dentists</span>
                        </NavLink>
                        <NavLink to="/reports" className={({ isActive }) => isActive ? 'active' : ''}>
                            <img src={ReportIcon} alt="Reports" />
                            <span>Reports</span>
                        </NavLink>
                    </>
                )}
            </nav>

            {/* Keeps user info nicely formatted above the logout button */}
            {!isSidebarCollapsed && (
                <div style={{ marginTop: 'auto', paddingBottom: '1rem', textAlign: 'center', color: '#334e68' }}>
                    <p style={{ margin: 0, fontWeight: 'bold', fontSize: '1rem' }}>{user?.name || 'User'}</p>
                    <p style={{ margin: 0, fontSize: '0.85rem', opacity: 0.8 }}>{role === 'dentist' ? 'Dentist' : 'Dental Aide'}</p>
                </div>
            )}
            
            <button className="logout-btn" onClick={handleLogout} style={{ marginTop: isSidebarCollapsed ? 'auto' : '0' }}>
                <img src={LogoutIcon} alt="Logout" />
                <span>Log Out</span>
            </button>
        </aside>
    );
}

export default Sidebar;