// import React, { useState } from "react";
// import { NavLink, useNavigate } from "react-router-dom";
// import useAppStore from "../store/useAppStore";

// // Icons
// import DashboardIcon from "../assets/dashboard.svg";
// import AppointmentIcon from "../assets/appointment.svg";
// import QueueIcon from "../assets/queue.svg";
// import ReportIcon from "../assets/report.svg";
// import DentistIcon from "../assets/dentist.svg";
// import LogoutIcon from "../assets/logout.svg";
// import ConditionIcon from "../assets/condition.svg"; 
// import logo from "../assets/toothlogo.svg";

// function Sidebar({ role }) {
//     const navigate = useNavigate();
//     const { logout, user } = useAppStore();
//     const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

//     const handleLogout = () => {
//         logout();
//         navigate('/');
//     };

//     return (
//         <aside className={`sidebar ${isSidebarCollapsed ? 'collapsed' : ''}`}>
//             <div className="sidebar-header">
//                 <img src={logo} alt="iDENTify Logo" className="sidebar-logo" />
//                 {!isSidebarCollapsed && <h2>iDENTify</h2>}
                
//                 <button 
//                     className="collapse-toggle" 
//                     onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
//                     style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', marginLeft: 'auto', color: 'var(--text-primary, #0f172a)' }}
//                 >
//                     ☰
//                 </button>
//             </div>

//             <nav className="sidebar-nav">
//                 {/* DENTIST LINKS */}
//                 {role === 'dentist' ? (
//                     <>
//                         <NavLink to="/dashboard" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
//                             <img src={DashboardIcon} alt="Dashboard" className="nav-icon" />
//                             {!isSidebarCollapsed && <span>Dashboard</span>}
//                         </NavLink>
//                         <NavLink to="/appointments" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
//                             <img src={AppointmentIcon} alt="Appointments" className="nav-icon" />
//                             {!isSidebarCollapsed && <span>Appointments</span>}
//                         </NavLink>
//                         <NavLink to="/settings" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
//                             <img src={DentistIcon} alt="Settings" className="nav-icon" />
//                             {!isSidebarCollapsed && <span>Clinic Settings</span>}
//                         </NavLink>
//                     </>
//                 ) : (
//                 /* AIDE LINKS */
//                     <>
//                         <NavLink to="/dashboard" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
//                             <img src={DashboardIcon} alt="Dashboard" className="nav-icon" />
//                             {!isSidebarCollapsed && <span>Dashboard</span>}
//                         </NavLink>
//                         <NavLink to="/patients" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
//                             <img src={ConditionIcon} alt="Patients" className="nav-icon" />
//                             {!isSidebarCollapsed && <span>Patients</span>}
//                         </NavLink>
//                         <NavLink to="/appointments" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
//                             <img src={AppointmentIcon} alt="Appointments" className="nav-icon" />
//                             {!isSidebarCollapsed && <span>Appointments</span>}
//                         </NavLink>
//                         <NavLink to="/queue" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
//                             <img src={QueueIcon} alt="Queue" className="nav-icon" />
//                             {!isSidebarCollapsed && <span>Queue</span>}
//                         </NavLink>
//                         <NavLink to="/history" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
//                             <img src={ReportIcon} alt="History" className="nav-icon" />
//                             {!isSidebarCollapsed && <span>History</span>}
//                         </NavLink>
//                         <NavLink to="/dentists" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
//                             <img src={DentistIcon} alt="Dentists" className="nav-icon" />
//                             {!isSidebarCollapsed && <span>Dentists</span>}
//                         </NavLink>
//                         <NavLink to="/reports" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
//                             <img src={ReportIcon} alt="Reports" className="nav-icon" />
//                             {!isSidebarCollapsed && <span>Reports</span>}
//                         </NavLink>
//                     </>
//                 )}
//             </nav>

//             <div className="sidebar-footer">
//                 {!isSidebarCollapsed && (
//                     <div className="user-info">
//                         <p className="user-name">{user?.name || 'User'}</p>
//                         <p className="user-role">{role === 'dentist' ? 'Dentist' : 'Dental Aide'}</p>
//                     </div>
//                 )}
//                 <button className="logout-btn" onClick={handleLogout}>
//                     <img src={LogoutIcon} alt="Logout" className="nav-icon" />
//                     {!isSidebarCollapsed && <span>Log Out</span>}
//                 </button>
//             </div>
//         </aside>
//     );
// }

// export default Sidebar;

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
    // Changed 'logout' to 'resetStore' to match your zustand store definition
    const { resetStore, user } = useAppStore();
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

    const handleLogout = () => {
        // resetStore clears the user state and all clinic data
        resetStore();
        navigate('/');
    };

    return (
        <aside className={`sidebar ${isSidebarCollapsed ? 'collapsed' : ''}`}>
            <div className="sidebar-header">
                <img src={logo} alt="iDENTify Logo" className="sidebar-logo" />
                {!isSidebarCollapsed && <h2>iDENTify</h2>}
                
                <button 
                    className="collapse-toggle" 
                    onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                    style={{ 
                        background: 'none', 
                        border: 'none', 
                        cursor: 'pointer', 
                        fontSize: '20px', 
                        marginLeft: 'auto', 
                        color: 'var(--text-primary, #0f172a)' 
                    }}
                >
                    ☰
                </button>
            </div>

            <nav className="sidebar-nav">
                {/* DENTIST LINKS */}
                {role === 'dentist' ? (
                    <>
                        <NavLink to="/dashboard" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
                            <img src={DashboardIcon} alt="Dashboard" className="nav-icon" />
                            {!isSidebarCollapsed && <span>Dashboard</span>}
                        </NavLink>
                        <NavLink to="/appointments" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
                            <img src={AppointmentIcon} alt="Appointments" className="nav-icon" />
                            {!isSidebarCollapsed && <span>Appointments</span>}
                        </NavLink>
                        <NavLink to="/settings" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
                            <img src={DentistIcon} alt="Settings" className="nav-icon" />
                            {!isSidebarCollapsed && <span>Clinic Settings</span>}
                        </NavLink>
                    </>
                ) : (
                /* AIDE LINKS */
                    <>
                        <NavLink to="/dashboard" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
                            <img src={DashboardIcon} alt="Dashboard" className="nav-icon" />
                            {!isSidebarCollapsed && <span>Dashboard</span>}
                        </NavLink>
                        <NavLink to="/patients" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
                            <img src={ConditionIcon} alt="Patients" className="nav-icon" />
                            {!isSidebarCollapsed && <span>Patients</span>}
                        </NavLink>
                        <NavLink to="/appointments" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
                            <img src={AppointmentIcon} alt="Appointments" className="nav-icon" />
                            {!isSidebarCollapsed && <span>Appointments</span>}
                        </NavLink>
                        <NavLink to="/queue" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
                            <img src={QueueIcon} alt="Queue" className="nav-icon" />
                            {!isSidebarCollapsed && <span>Queue</span>}
                        </NavLink>
                        <NavLink to="/history" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
                            <img src={ReportIcon} alt="History" className="nav-icon" />
                            {!isSidebarCollapsed && <span>History</span>}
                        </NavLink>
                        <NavLink to="/dentists" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
                            <img src={DentistIcon} alt="Dentists" className="nav-icon" />
                            {!isSidebarCollapsed && <span>Dentists</span>}
                        </NavLink>
                        <NavLink to="/reports" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
                            <img src={ReportIcon} alt="Reports" className="nav-icon" />
                            {!isSidebarCollapsed && <span>Reports</span>}
                        </NavLink>
                    </>
                )}
            </nav>

            <div className="sidebar-footer">
                {!isSidebarCollapsed && (
                    <div className="user-info">
                        <p className="user-name">{user?.name || 'User'}</p>
                        <p className="user-role">{role === 'dentist' ? 'Dentist' : 'Dental Aide'}</p>
                    </div>
                )}
                <button className="logout-btn" onClick={handleLogout}>
                    <img src={LogoutIcon} alt="Logout" className="nav-icon" />
                    {!isSidebarCollapsed && <span>Log Out</span>}
                </button>
            </div>
        </aside>
    );
}

export default Sidebar;