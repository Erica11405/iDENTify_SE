
// import React, { Suspense, lazy, useState } from "react";
// import { Routes, Route, Navigate, useLocation } from "react-router-dom";

// import Login from "./pages/Login.jsx";
// import AppLayout from "./layout/AppLayout.jsx";

// const Dashboard = lazy(() => import("./pages/Dashboard.jsx"));
// const Appointments = lazy(() => import("./pages/Appointments.jsx"));
// const Queue = lazy(() => import("./pages/Queue.jsx"));
// const History = lazy(() => import("./pages/History.jsx"));
// const Reports = lazy(() => import("./pages/Reports.jsx"));
// const Dentists = lazy(() => import("./pages/Dentists.jsx"));
// const PatientForm = lazy(() => import("./pages/PatientForm.jsx"));
// const Patients = lazy(() => import("./pages/Patients.jsx"));
// const Settings = lazy(() => import("./pages/Settings.jsx")); // NEW SETTINGS PAGE

// function ProtectedRoute({ isLoggedIn, children }) {
//   const location = useLocation();
//   if (!isLoggedIn) {
//     return <Navigate to="/" replace state={{ from: location }} />;
//   }
//   return children;
// }

// function App() {
//   // Store the role instead of just a boolean (e.g., 'dentist' or 'aide')
//   const [userRole, setUserRole] = useState(() => {
//     return localStorage.getItem("userRole") || null;
//   });

//   const handleLogin = (role) => {
//     localStorage.setItem("userRole", role);
//     setUserRole(role);
//   };

//   const handleLogout = () => {
//     localStorage.clear();
//     setUserRole(null);
//   };

//   return (
//     <Routes>
//       <Route path="/" element={userRole ? <Navigate to="/app" replace /> : <Login setIsLoggedIn={handleLogin} />} />

//       <Route
//         path="/app"
//         element={
//           <ProtectedRoute isLoggedIn={!!userRole}>
//             {/* Pass userRole to layout to hide/show sidebar items */}
//             <AppLayout setIsLoggedIn={handleLogout} userRole={userRole} />
//           </ProtectedRoute>
//         }
//       >
//         {/* Pass userRole to pages so they can adapt their UI */}
//         <Route index element={<Suspense fallback={<div>Loading…</div>}><Dashboard userRole={userRole} /></Suspense>} />
//         <Route path="appointments" element={<Suspense fallback={<div>Loading appointments…</div>}><Appointments userRole={userRole} /></Suspense>} />
//         <Route path="queue" element={<Suspense fallback={<div>Loading queue…</div>}><Queue userRole={userRole} /></Suspense>} />
//         <Route path="history" element={<Suspense fallback={<div>Loading history…</div>}><History userRole={userRole} /></Suspense>} />
//         <Route path="reports" element={<Suspense fallback={<div>Loading reports…</div>}><Reports userRole={userRole} /></Suspense>} />
//         <Route path="dentists" element={<Suspense fallback={<div>Loading dentists…</div>}><Dentists userRole={userRole} /></Suspense>} />
//         <Route path="patients" element={<Suspense fallback={<div>Loading patients…</div>}><Patients userRole={userRole} /></Suspense>} />
//         <Route path="patient/:id" element={<Suspense fallback={<div>Loading patient…</div>}><PatientForm userRole={userRole} /></Suspense>} />

//         {/* DENTIST ONLY ROUTE */}
//         {userRole === 'dentist' && (
//             <Route path="settings" element={<Suspense fallback={<div>Loading settings…</div>}><Settings userRole={userRole} /></Suspense>} />
//         )}
//       </Route>

//       <Route path="*" element={<Navigate to="/" />} />
//     </Routes>
//   );
// }

// export default App;


// frontend/src/App.jsx
import React, { Suspense, lazy, useState } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";

import Login from "./pages/Login.jsx";
import AppLayout from "./layout/AppLayout.jsx";

// --- AIDE PAGES ---
const AideDashboard = lazy(() => import("./pages/aide/Dashboard.jsx"));
const AideAppointments = lazy(() => import("./pages/aide/Appointments.jsx"));
const AideQueue = lazy(() => import("./pages/aide/Queue.jsx"));
const AideHistory = lazy(() => import("./pages/aide/History.jsx"));
const AideReports = lazy(() => import("./pages/aide/Reports.jsx"));
const AideDentists = lazy(() => import("./pages/aide/Dentists.jsx"));
const AidePatients = lazy(() => import("./pages/aide/Patients.jsx"));
const PatientForm = lazy(() => import("./pages/aide/PatientForm.jsx")); // Shared for review

// --- DENTIST PAGES ---
const DentistDashboard = lazy(() => import("./pages/dentist/Dashboard.jsx"));
const DentistAppointments = lazy(() => import("./pages/dentist/Appointments.jsx"));
const DentistSettings = lazy(() => import("./pages/dentist/Settings.jsx"));

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
            
            {/* Allow Dentist to view patient forms for review mode */}
            <Route path="patient/:id" element={<Suspense fallback={<div>Loading patient…</div>}><PatientForm userRole={userRole} /></Suspense>} />
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
            
            <Route path="patient/:id" element={<Suspense fallback={<div>Loading patient…</div>}><PatientForm userRole={userRole} /></Suspense>} />
          </>
        )}
      </Route>

      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default App;