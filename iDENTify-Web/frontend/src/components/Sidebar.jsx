// import React, { useState } from "react";
// import { NavLink, useNavigate } from "react-router-dom";
// import useAppStore from "../store/useAppStore";
// import ProfileModal from "./ProfileModal"; // <-- Import the new modal component

// // Icons
// import DashboardIcon from "../assets/dashboard.svg";
// import AppointmentIcon from "../assets/appointment.svg";
// import QueueIcon from "../assets/queue.svg";
// import ReportIcon from "../assets/report.svg";
// import DentistIcon from "../assets/dentist.svg";
// import LogoutIcon from "../assets/logout.svg";

// function roleLabel(role) {
//     if (role === 'superadmin') return 'Super Admin';
//     if (role === 'dentist') return 'Dentist';
//     return 'Dental Aide';
// }

// function Sidebar({ role }) {
//     const navigate = useNavigate();
//     const { resetStore, user } = useAppStore();
//     const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    
//     // State to control the profile modal
//     const [showProfileModal, setShowProfileModal] = useState(false);

//     const handleLogout = () => {
//         resetStore();
//         navigate('/');
//     };

//     return (
//         <>
//             <aside className={`sidebar ${isSidebarCollapsed ? 'collapsed' : ''}`}>
                
//                 {/* Header kept original: iDENTify left, button right */}
//                 <div className="sidebar-header">
//                     <span className="sidebar-title">iDENTify</span>
                    
//                     <button 
//                         className="toggle-btn" 
//                         onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
//                     >
//                         {isSidebarCollapsed ? (
//                             <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#334e68" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
//                         ) : (
//                             <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#334e68" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
//                         )}
//                     </button>
//                 </div>

//                 {/* Name placed right below the header, centered, with padding */}
//                 {!isSidebarCollapsed && (
//                     <div style={{ textAlign: 'center', paddingTop: '15px', paddingBottom: '10px', color: '#334e68' }}>
//                         {/* Clickable name */}
//                         <p 
//                             onClick={() => setShowProfileModal(true)}
//                             title="View Profile Details"
//                             style={{ 
//                                 margin: 0, 
//                                 fontWeight: 'bold', 
//                                 fontSize: '1rem', 
//                                 cursor: 'pointer',
//                                 display: 'inline-block' 
//                             }}
//                             onMouseOver={(e) => e.target.style.textDecoration = 'underline'}
//                             onMouseOut={(e) => e.target.style.textDecoration = 'none'}
//                         >
//                             {user?.name || 'User'}
//                         </p>
//                         <p style={{ margin: 0, fontSize: '0.85rem', opacity: 0.8 }}>{roleLabel(role)}</p>
//                     </div>
//                 )}

//                 <nav>
//                     {role === 'superadmin' ? (
//                         <>
//                             <NavLink to="/admin/dashboard" className={({ isActive }) => isActive ? 'active' : ''}>
//                                 <img src={DashboardIcon} alt="Dashboard" />
//                                 <span>Dashboard</span>
//                             </NavLink>
//                             <NavLink to="/admin/users" className={({ isActive }) => isActive ? 'active' : ''}>
//                                 <img src={DentistIcon} alt="Users" />
//                                 <span>User Management</span>
//                             </NavLink>
//                             <NavLink to="/admin/reports" className={({ isActive }) => isActive ? 'active' : ''}>
//                                 <img src={ReportIcon} alt="Reports" />
//                                 <span>Reports</span>
//                             </NavLink>
//                             <NavLink to="/admin/settings" className={({ isActive }) => isActive ? 'active' : ''}>
//                                 <img src={AppointmentIcon} alt="Clinic Settings" />
//                                 <span>Clinic Settings</span>
//                             </NavLink>
//                             <NavLink to="/admin/archive" className={({ isActive }) => isActive ? 'active' : ''}>
//                                 <img src={QueueIcon} alt="Archive" />
//                                 <span>Archive</span>
//                             </NavLink>
//                         </>
//                     ) : role === 'dentist' ? (
//                         <>
//                             <NavLink to="/dashboard" className={({ isActive }) => isActive ? 'active' : ''}>
//                                 <img src={DashboardIcon} alt="Dashboard" />
//                                 <span>Dashboard</span>
//                             </NavLink>
//                             <NavLink to="/appointments" className={({ isActive }) => isActive ? 'active' : ''}>
//                                 <img src={AppointmentIcon} alt="Appointments" />
//                                 <span>Appointments</span>
//                             </NavLink>
//                             <NavLink to="/reports" className={({ isActive }) => isActive ? 'active' : ''}>
//                                 <img src={ReportIcon} alt="Reports" />
//                                 <span>Reports</span>
//                             </NavLink>
//                             <NavLink to="/settings" className={({ isActive }) => isActive ? 'active' : ''}>
//                                 <img src={DentistIcon} alt="Settings" />
//                                 <span>Clinic Settings</span>
//                             </NavLink>
//                         </>
//                     ) : (
//                     /* AIDE LINKS */
//                         <>
//                             <NavLink to="/dashboard" className={({ isActive }) => isActive ? 'active' : ''}>
//                                 <img src={DashboardIcon} alt="Dashboard" />
//                                 <span>Dashboard</span>
//                             </NavLink>
//                             <NavLink to="/appointments" className={({ isActive }) => isActive ? 'active' : ''}>
//                                 <img src={AppointmentIcon} alt="Appointments" />
//                                 <span>Appointments</span>
//                             </NavLink>
//                             <NavLink to="/queue" className={({ isActive }) => isActive ? 'active' : ''}>
//                                 <img src={QueueIcon} alt="Queue" />
//                                 <span>Queue</span>
//                             </NavLink>
//                             <NavLink to="/history" className={({ isActive }) => isActive ? 'active' : ''}>
//                                 <img src={ReportIcon} alt="History" />
//                                 <span>History</span>
//                             </NavLink>
//                             <NavLink to="/payments" className={({ isActive }) => isActive ? 'active' : ''}>
//                                 <img src={AppointmentIcon} alt="Payments" />
//                                 <span>Payments</span>
//                             </NavLink>
//                             <NavLink to="/reports" className={({ isActive }) => isActive ? 'active' : ''}>
//                                 <img src={ReportIcon} alt="Reports" />
//                                 <span>Reports</span>
//                             </NavLink>
//                         </>
//                     )}
//                 </nav>
                
//                 <button className="logout-btn" onClick={handleLogout} style={{ marginTop: 'auto' }}>
//                     <img src={LogoutIcon} alt="Logout" />
//                     <span>Log Out</span>
//                 </button>
//             </aside>

//             {/* Profile Modal Component */}
//             <ProfileModal 
//                 isOpen={showProfileModal} 
//                 onClose={() => setShowProfileModal(false)} 
//                 user={user}
//                 role={role}
//             />
//         </>
//     );
// }

// export default Sidebar;

import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import useAppStore from "../store/useAppStore";
import ProfileModal from "./ProfileModal"; // <-- Import the new modal component
import ConfirmationModal from "./ConfirmationModal";

// Icons
import DashboardIcon from "../assets/dashboard.svg";
import AppointmentIcon from "../assets/appointment.svg";
import QueueIcon from "../assets/queue.svg";
import ReportIcon from "../assets/report.svg";
import DentistIcon from "../assets/dentist.svg";
import LogoutIcon from "../assets/logout.svg";

function roleLabel(role) {
    if (role === 'superadmin') return 'Clinic Admin';
    if (role === 'globaladmin') return 'Global Admin';
    if (role === 'dentist') return 'Dentist';
    return 'Dental Aide';
}

function Sidebar({ role }) {
    const navigate = useNavigate();
    const { resetStore, user } = useAppStore();
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    
    // State to control the profile modal
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [showLogoutModal, setShowLogoutModal] = useState(false);

    const handleLogout = () => {
        setShowLogoutModal(true);
    };

    const confirmLogout = () => {
        setShowLogoutModal(false);
        resetStore();
        navigate('/');
    };

    return (
        <>
            <aside className={`sidebar ${isSidebarCollapsed ? 'collapsed' : ''}`}>
                
                {/* Header kept original: iDENTify left, button right */}
                <div className="sidebar-header">
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

                {/* Name placed right below the header, centered, with padding */}
                {!isSidebarCollapsed && (
                    <div style={{ textAlign: 'center', paddingTop: '15px', paddingBottom: '10px', color: '#334e68' }}>
                        {/* Clickable name */}
                        <p 
                            onClick={() => setShowProfileModal(true)}
                            title="View Profile Details"
                            style={{ 
                                margin: 0, 
                                fontWeight: 'bold', 
                                fontSize: '1rem', 
                                cursor: 'pointer',
                                display: 'inline-block' 
                            }}
                            onMouseOver={(e) => e.target.style.textDecoration = 'underline'}
                            onMouseOut={(e) => e.target.style.textDecoration = 'none'}
                        >
                            {user?.name || 'User'}
                        </p>
                        <p style={{ margin: 0, fontSize: '0.85rem', opacity: 0.8 }}>{roleLabel(role)}</p>
                    </div>
                )}

                <nav>
                    {role === 'globaladmin' ? (
                        <>
                            <NavLink to="/admin/dashboard" className={({ isActive }) => isActive ? 'active' : ''}>
                                <img src={DashboardIcon} alt="Dashboard" />
                                <span>Dashboard</span>
                            </NavLink>
                            <NavLink to="/admin/approvals" className={({ isActive }) => isActive ? 'active' : ''}>
                                <img src={QueueIcon} alt="Approvals" />
                                <span>Approvals</span>
                            </NavLink>
                            <NavLink to="/admin/reports" className={({ isActive }) => isActive ? 'active' : ''}>
                                <img src={ReportIcon} alt="Reports" />
                                <span>Reports</span>
                            </NavLink>
                            <NavLink to="/admin/settings" className={({ isActive }) => isActive ? 'active' : ''}>
                                <img src={AppointmentIcon} alt="Clinic Management" />
                                <span>Clinic Management</span>
                            </NavLink>
                            <NavLink to="/admin/archive" className={({ isActive }) => isActive ? 'active' : ''}>
                                <img src={QueueIcon} alt="Archive" />
                                <span>Archive</span>
                            </NavLink>
                        </>
                    ) : role === 'superadmin' ? (
                        <>
                            <NavLink to="/admin/dashboard" className={({ isActive }) => isActive ? 'active' : ''}>
                                <img src={DashboardIcon} alt="Dashboard" />
                                <span>Dashboard</span>
                            </NavLink>
                            <NavLink to="/admin/users" className={({ isActive }) => isActive ? 'active' : ''}>
                                <img src={DentistIcon} alt="Users" />
                                <span>User Management</span>
                            </NavLink>
                            <NavLink to="/admin/reports" className={({ isActive }) => isActive ? 'active' : ''}>
                                <img src={ReportIcon} alt="Reports" />
                                <span>Reports</span>
                            </NavLink>
                            <NavLink to="/admin/patient-reports" className={({ isActive }) => isActive ? 'active' : ''}>
                                <img src={ReportIcon} alt="Patient Reports" />
                                <span>Patient Reports</span>
                            </NavLink>
                            <NavLink to="/admin/settings" className={({ isActive }) => isActive ? 'active' : ''}>
                                <img src={AppointmentIcon} alt="Clinic Settings" />
                                <span>Clinic Settings</span>
                            </NavLink>
                            <NavLink to="/admin/archive" className={({ isActive }) => isActive ? 'active' : ''}>
                                <img src={QueueIcon} alt="Archive" />
                                <span>Archive</span>
                            </NavLink>
                        </>
                    ) : role === 'dentist' ? (
                        <>
                            <NavLink to="/dashboard" className={({ isActive }) => isActive ? 'active' : ''}>
                                <img src={DashboardIcon} alt="Dashboard" />
                                <span>Dashboard</span>
                            </NavLink>
                            <NavLink to="/appointments" className={({ isActive }) => isActive ? 'active' : ''}>
                                <img src={AppointmentIcon} alt="Appointments" />
                                <span>Appointments</span>
                            </NavLink>
                            <NavLink to="/history" className={({ isActive }) => isActive ? 'active' : ''}>
                                <img src={ReportIcon} alt="History" />
                                <span>History</span>
                            </NavLink>
                            <NavLink to="/payments" className={({ isActive }) => isActive ? 'active' : ''}>
                                <img src={AppointmentIcon} alt="Payments" />
                                <span>Payments</span>
                            </NavLink>
                            <NavLink to="/reports" className={({ isActive }) => isActive ? 'active' : ''}>
                                <img src={ReportIcon} alt="Reports" />
                                <span>Reports</span>
                            </NavLink>
                        </>
                    ) : (
                    /* AIDE LINKS */
                        <>
                            <NavLink to="/dashboard" className={({ isActive }) => isActive ? 'active' : ''}>
                                <img src={DashboardIcon} alt="Dashboard" />
                                <span>Dashboard</span>
                            </NavLink>
                            <NavLink to="/appointments" className={({ isActive }) => isActive ? 'active' : ''}>
                                <img src={AppointmentIcon} alt="Appointments" />
                                <span>Appointments</span>
                            </NavLink>
                            <NavLink to="/walk-in" className={({ isActive }) => isActive ? 'active' : ''}>
                                <img src={QueueIcon} alt="Walk In" />
                                <span>Walk In</span>
                            </NavLink>
                            <NavLink to="/history" className={({ isActive }) => isActive ? 'active' : ''}>
                                <img src={ReportIcon} alt="History" />
                                <span>History</span>
                            </NavLink>
                            <NavLink to="/payments" className={({ isActive }) => isActive ? 'active' : ''}>
                                <img src={AppointmentIcon} alt="Payments" />
                                <span>Payments</span>
                            </NavLink>
                            <NavLink to="/reports" className={({ isActive }) => isActive ? 'active' : ''}>
                                <img src={ReportIcon} alt="Reports" />
                                <span>Reports</span>
                            </NavLink>
                        </>
                    )}
                </nav>
                
                <button className="logout-btn" onClick={handleLogout} style={{ marginTop: 'auto' }}>
                    <img src={LogoutIcon} alt="Logout" />
                    <span>Log Out</span>
                </button>
            </aside>

            {/* Profile Modal Component */}
            <ProfileModal 
                isOpen={showProfileModal} 
                onClose={() => setShowProfileModal(false)} 
                user={user}
                role={role}
            />

            <ConfirmationModal
                isOpen={showLogoutModal}
                onClose={() => setShowLogoutModal(false)}
                onConfirm={confirmLogout}
                message="Are you sure you want to log out?"
            />
        </>
    );
}

export default Sidebar;