import React, { Suspense, lazy, useState } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";

import Login from "./pages/Login.jsx";
import SignUp from "./pages/SignUp.jsx"; // <-- 1. IMPORT SIGNUP HERE
import AppLayout from "./layout/AppLayout.jsx";

// --- DENTAL AIDE PAGES ---
const AideDashboard = lazy(() => import("./pages/aide/Dashboard.jsx"));
const AideAppointments = lazy(() => import("./pages/aide/Appointments.jsx"));
const AideQueue = lazy(() => import("./pages/aide/Queue.jsx"));
const AideHistory = lazy(() => import("./pages/aide/History.jsx"));
const AideReports = lazy(() => import("./pages/aide/Reports.jsx"));
const AideDentists = lazy(() => import("./pages/aide/Dentists.jsx"));
const AidePatients = lazy(() => import("./pages/aide/Patients.jsx"));
const AidePatientForm = lazy(() => import("./pages/aide/PatientForm.jsx")); 

// --- DENTIST PAGES ---
const DentistDashboard = lazy(() => import("./pages/dentist/DentistDashboard.jsx"));
const DentistAppointments = lazy(() => import("./pages/dentist/DentistAppointments.jsx"));
const DentistSettings = lazy(() => import("./pages/dentist/DentistSettings.jsx"));

function ProtectedRoute({ isLoggedIn, children }) {
  const location = useLocation();
  if (!isLoggedIn) {
    return <Navigate to="/" replace state={{ from: location }} />;
  }
  return children;
}

function App() {
  const [userRole, setUserRole] = useState(() => {
    return localStorage.getItem("userRole") || null;
  });

  const handleLogin = (role) => {
    localStorage.setItem("userRole", role);
    setUserRole(role);
  };

  const handleLogout = () => {
    localStorage.clear();
    setUserRole(null);
  };

  return (
    <Routes>
      <Route path="/" element={userRole ? <Navigate to="/app" replace /> : <Login setIsLoggedIn={handleLogin} />} />
      
      {/* 2. ADD THE SIGNUP ROUTE HERE */}
      <Route path="/signup" element={userRole ? <Navigate to="/app" replace /> : <SignUp />} />

      <Route
        path="/app"
        element={
          <ProtectedRoute isLoggedIn={!!userRole}>
            <AppLayout setIsLoggedIn={handleLogout} userRole={userRole} />
          </ProtectedRoute>
        }
      >
        {/* ======================= DENTIST ROUTES ======================= */}
        {userRole === 'dentist' && (
          <>
            <Route index element={<Suspense fallback={<div>Loading…</div>}><DentistDashboard /></Suspense>} />
            <Route path="appointments" element={<Suspense fallback={<div>Loading…</div>}><DentistAppointments /></Suspense>} />
            <Route path="settings" element={<Suspense fallback={<div>Loading…</div>}><DentistSettings userRole={userRole} /></Suspense>} />
            <Route path="patient/:id" element={<Suspense fallback={<div>Loading patient…</div>}><AidePatientForm userRole={userRole} /></Suspense>} />
            <Route path="*" element={<Navigate to="/app" replace />} />
          </>
        )}

        {/* ======================= DENTAL AIDE ROUTES ======================= */}
        {userRole === 'aide' && (
          <>
            <Route index element={<Suspense fallback={<div>Loading…</div>}><AideDashboard userRole={userRole} /></Suspense>} />
            <Route path="appointments" element={<Suspense fallback={<div>Loading…</div>}><AideAppointments userRole={userRole} /></Suspense>} />
            <Route path="queue" element={<Suspense fallback={<div>Loading queue…</div>}><AideQueue userRole={userRole} /></Suspense>} />
            <Route path="history" element={<Suspense fallback={<div>Loading history…</div>}><AideHistory userRole={userRole} /></Suspense>} />
            <Route path="reports" element={<Suspense fallback={<div>Loading reports…</div>}><AideReports userRole={userRole} /></Suspense>} />
            <Route path="dentists" element={<Suspense fallback={<div>Loading dentists…</div>}><AideDentists userRole={userRole} /></Suspense>} />
            <Route path="patients" element={<Suspense fallback={<div>Loading patients…</div>}><AidePatients userRole={userRole} /></Suspense>} />
            <Route path="patient/:id" element={<Suspense fallback={<div>Loading patient…</div>}><AidePatientForm userRole={userRole} /></Suspense>} />
            <Route path="*" element={<Navigate to="/app" replace />} />
          </>
        )}
      </Route>

      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default App;