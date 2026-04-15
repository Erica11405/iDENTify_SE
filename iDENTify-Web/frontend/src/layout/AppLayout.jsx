import React from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar"; 
import "../styles/layout/AppLayout.css";

function AppLayout({ userRole }) {
  return (
    <div className="layout">
      {/* The Sidebar component automatically handles the Aide vs Dentist links based on userRole */}
      <Sidebar role={userRole} />
      
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}

export default AppLayout;