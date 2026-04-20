import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import useAppStore from './store/useAppStore';

import AppLayout from './layout/AppLayout';
import Login from './pages/Login';
import SignUp from './pages/SignUp';
import Landing from './pages/Landing';
import ChangePasswordRequired from './pages/ChangePasswordRequired';
import SuperAdminRequestGate from './pages/SuperAdminRequestGate';

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

// --- System Admin (Global Admin) Pages ---
import SystemAdminDashboard from './pages/systemadmin/SystemAdminDashboard';
import SystemAdminApprovals from './pages/systemadmin/SystemAdminApprovals';
import SystemAdminClinicManagement from './pages/systemadmin/SystemAdminClinicManagement';
import SystemAdminArchive from './pages/systemadmin/SystemAdminArchive';

function requiresPasswordChange(user) {
    if (!user || typeof user !== 'object') {
        return false;
    }

    const rawValue = user.require_password_change ?? user.requirePasswordChange;
    if (rawValue === true || rawValue === 1) return true;
    if (rawValue === false || rawValue === 0 || rawValue === null || rawValue === undefined) return false;

    const normalized = String(rawValue).trim().toLowerCase();
    return normalized === 'true' || normalized === '1';
}

function normalizeApprovalStatus(value) {
    const normalized = String(value || '').trim().toLowerCase();
    if (normalized === 'pendingrequirements') return 'pending_requirements';
    if (normalized === 'pendingreview') return 'pending_review';

    if (normalized === 'pending_requirements' || normalized === 'pending_review' || normalized === 'approved' || normalized === 'declined') {
        return normalized;
    }

    return 'pending_requirements';
}

function App() {
    const { user } = useAppStore();
    const mustChangePassword = requiresPasswordChange(user);
    const superadminApprovalStatus = user?.role === 'superadmin'
        ? normalizeApprovalStatus(user?.approval_status)
        : 'approved';

    // 1. If not logged in, force them to Login or Signup
    if (!user) {
        return (
            <Routes>
                <Route path="/download" element={<Landing />} />
                <Route path="/" element={<Login />} />
                <Route path="/signup" element={<SignUp />} />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        );
    }

    if (mustChangePassword) {
        return (
            <Routes>
                <Route path="/download" element={<Landing />} />
                <Route path="/change-password" element={<ChangePasswordRequired />} />
                <Route path="*" element={<Navigate to="/change-password" replace />} />
            </Routes>
        );
    }

    if (user?.role === 'superadmin' && superadminApprovalStatus !== 'approved') {
        return (
            <Routes>
                <Route path="/download" element={<Landing />} />
                <Route path="/superadmin/request" element={<SuperAdminRequestGate />} />
                <Route path="*" element={<Navigate to="/superadmin/request" replace />} />
            </Routes>
        );
    }

    // 2. If logged in, wrap the routes inside AppLayout
    return (
        <Routes>
            <Route path="/download" element={<Landing />} />
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

                {user.role === 'globaladmin' && (
                    <>
                        <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />
                        <Route path="/admin/dashboard" element={<SystemAdminDashboard />} />
                        <Route path="/admin/approvals" element={<SystemAdminApprovals />} />
                        <Route path="/admin/settings" element={<SystemAdminClinicManagement />} />
                        <Route path="/admin/archive" element={<SystemAdminArchive />} />
                        <Route path="/admin/users" element={<Navigate to="/admin/dashboard" replace />} />
                        <Route path="/admin/reports" element={<Navigate to="/admin/dashboard" replace />} />
                        <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
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
                        <Route path="/admin/approvals" element={<Navigate to="/admin/dashboard" replace />} />
                        <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
                    </>
                )}

                {user.role !== 'dentist' && user.role !== 'superadmin' && user.role !== 'globaladmin' && (
                    <>
                        <Route path="/" element={<Navigate to="/dashboard" replace />} />
                        <Route path="/dashboard" element={<Dashboard />} />
                        <Route path="/patients" element={<Patients />} />
                        <Route path="/patients/new" element={<PatientForm />} />
                        <Route path="/patients/:id" element={<PatientForm />} />
                        <Route path="/appointments" element={<Appointments />} />
                        <Route path="/walk-in" element={<Queue />} />
                        <Route path="/queue" element={<Navigate to="/walk-in" replace />} />
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