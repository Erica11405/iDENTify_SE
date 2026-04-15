// import React from 'react';
// import { Routes, Route, Navigate } from 'react-router-dom';
// import useAppStore from './store/useAppStore';

// import AppLayout from './layout/AppLayout';
// import Login from './pages/Login';
// import SignUp from './pages/SignUp';

// // --- Aide Pages ---
// import Dashboard from './pages/aide/Dashboard';
// import Patients from './pages/aide/Patients';
// import PatientForm from './pages/aide/PatientForm';
// import Appointments from './pages/aide/Appointments';
// import Queue from './pages/aide/Queue';
// import History from './pages/aide/History';
// import Dentists from './pages/aide/Dentists';
// import Reports from './pages/aide/Reports';
// import Payments from './pages/aide/Payments';

// // --- Dentist Pages ---
// import DentistDashboard from './pages/dentist/DentistDashboard';
// import DentistAppointments from './pages/dentist/DentistAppointments';
// import DentistSettings from './pages/dentist/DentistSettings';
// import DentistReports from './pages/dentist/DentistReports';

// // --- Super Admin Pages ---
// import SuperAdminDashboard from './pages/superadmin/SuperAdminDashboard';
// import SuperAdminUsers from './pages/superadmin/SuperAdminUsers';
// import SuperAdminReports from './pages/superadmin/SuperAdminReports';
// import SuperAdminSettings from './pages/superadmin/SuperAdminSettings';
// import SuperAdminArchive from './pages/superadmin/SuperAdminArchive';

// function App() {
//     const { user } = useAppStore();

//     // 1. If not logged in, force them to Login or Signup
//     if (!user) {
//         return (
//             <Routes>
//                 <Route path="/" element={<Login />} />
//                 <Route path="/signup" element={<SignUp />} />
//                 <Route path="*" element={<Navigate to="/" replace />} />
//             </Routes>
//         );
//     }

//     // 2. If logged in, wrap the routes inside AppLayout
//     return (
//         <Routes>
//             <Route element={<AppLayout userRole={user.role} />}>
//                 {user.role === 'dentist' && (
//                     <>
//                         <Route path="/" element={<Navigate to="/dashboard" replace />} />
//                         <Route path="/dashboard" element={<DentistDashboard />} />
//                         <Route path="/appointments" element={<DentistAppointments />} />
//                         <Route path="/reports" element={<DentistReports />} />
//                         <Route path="/settings" element={<DentistSettings />} />
//                         <Route path="/patients/:id" element={<PatientForm />} />
//                         <Route path="*" element={<Navigate to="/dashboard" replace />} />
//                     </>
//                 )}

//                 {user.role === 'superadmin' && (
//                     <>
//                         <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />
//                         <Route path="/admin/dashboard" element={<SuperAdminDashboard />} />
//                         <Route path="/admin/users" element={<SuperAdminUsers />} />
//                         <Route path="/admin/reports" element={<SuperAdminReports />} />
//                         <Route path="/admin/settings" element={<SuperAdminSettings />} />
//                         <Route path="/admin/archive" element={<SuperAdminArchive />} />
//                         <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
//                     </>
//                 )}

//                 {user.role !== 'dentist' && user.role !== 'superadmin' && (
//                     <>
//                         <Route path="/" element={<Navigate to="/dashboard" replace />} />
//                         <Route path="/dashboard" element={<Dashboard />} />
//                         <Route path="/patients" element={<Patients />} />
//                         <Route path="/patients/new" element={<PatientForm />} />
//                         <Route path="/patients/:id" element={<PatientForm />} />
//                         <Route path="/appointments" element={<Appointments />} />
//                         <Route path="/queue" element={<Queue />} />
//                         <Route path="/history" element={<History />} />
//                         <Route path="/dentists" element={<Dentists />} />
//                         <Route path="/payments" element={<Payments />} />
//                         <Route path="/reports" element={<Reports />} />
//                         <Route path="*" element={<Navigate to="/dashboard" replace />} />
//                     </>
//                 )}
//             </Route>
//         </Routes>
//     );
// }

// export default App;

import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import useAppStore from './store/useAppStore';

import AppLayout from './layout/AppLayout';
import Login from './pages/Login';
import SignUp from './pages/SignUp';

// --- Aide Pages ---
import Dashboard from './pages/aide/Dashboard';
import Patients from './pages/aide/Patients';
import PatientForm from './pages/aide/PatientForm';
import Appointments from './pages/aide/Appointments';
import Queue from './pages/aide/Queue';
import History from './pages/aide/History';
import Dentists from './pages/aide/Dentists';
import Reports from './pages/aide/Reports';
import Payments from './pages/aide/Payments';

// --- Dentist Pages ---
import DentistDashboard from './pages/dentist/DentistDashboard';
import DentistAppointments from './pages/dentist/DentistAppointments';
import DentistReports from './pages/dentist/DentistReports';
import DentistHistory from './pages/dentist/DentistHistory';
import DentistPayments from './pages/dentist/DentistPayments';

// --- Super Admin Pages ---
import SuperAdminDashboard from './pages/superadmin/SuperAdminDashboard';
import SuperAdminUsers from './pages/superadmin/SuperAdminUsers';
import SuperAdminReports from './pages/superadmin/SuperAdminReports';
import SuperAdminSettings from './pages/superadmin/SuperAdminSettings';
import SuperAdminArchive from './pages/superadmin/SuperAdminArchive';

function App() {
    const { user } = useAppStore();

    // 1. If not logged in, force them to Login or Signup
    if (!user) {
        return (
            <Routes>
                <Route path="/" element={<Login />} />
                <Route path="/signup" element={<SignUp />} />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        );
    }

    // 2. If logged in, wrap the routes inside AppLayout
    return (
        <Routes>
            <Route element={<AppLayout userRole={user.role} />}>
                {user.role === 'dentist' && (
                    <>
                        <Route path="/" element={<Navigate to="/dashboard" replace />} />
                        <Route path="/dashboard" element={<DentistDashboard />} />
                        <Route path="/appointments" element={<DentistAppointments />} />
                        <Route path="/history" element={<DentistHistory />} />
                        <Route path="/payments" element={<DentistPayments />} />
                        <Route path="/reports" element={<DentistReports />} />
                        <Route path="/patients/:id" element={<PatientForm />} />
                        <Route path="*" element={<Navigate to="/dashboard" replace />} />
                    </>
                )}

                {user.role === 'superadmin' && (
                    <>
                        <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />
                        <Route path="/admin/dashboard" element={<SuperAdminDashboard />} />
                        <Route path="/admin/users" element={<SuperAdminUsers />} />
                        <Route path="/admin/reports" element={<SuperAdminReports />} />
                        <Route path="/admin/settings" element={<SuperAdminSettings />} />
                        <Route path="/admin/archive" element={<SuperAdminArchive />} />
                        <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
                    </>
                )}

                {user.role !== 'dentist' && user.role !== 'superadmin' && (
                    <>
                        <Route path="/" element={<Navigate to="/dashboard" replace />} />
                        <Route path="/dashboard" element={<Dashboard />} />
                        <Route path="/patients" element={<Patients />} />
                        <Route path="/patients/new" element={<PatientForm />} />
                        <Route path="/patients/:id" element={<PatientForm />} />
                        <Route path="/appointments" element={<Appointments />} />
                        <Route path="/queue" element={<Queue />} />
                        <Route path="/history" element={<History />} />
                        <Route path="/dentists" element={<Dentists />} />
                        <Route path="/payments" element={<Payments />} />
                        <Route path="/reports" element={<Reports />} />
                        <Route path="*" element={<Navigate to="/dashboard" replace />} />
                    </>
                )}
            </Route>
        </Routes>
    );
}

export default App;