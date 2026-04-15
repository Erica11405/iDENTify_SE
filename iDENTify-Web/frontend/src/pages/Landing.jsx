import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/pages/Landing.css';

function Landing() {
    return (
        <div className="landing-wrapper">
            <div className="landing-content">
                <img src="/vite.svg" alt="iDENTify Logo" className="landing-logo" />
                <h1>Welcome to iDENTify</h1>
                <p>Manage your clinic efficiently or access your records on the go.</p>
                
                <div className="landing-actions">
                    <div className="action-card">
                        <h2>Mobile App</h2>
                        <p>Download our Android app to book appointments and view records directly from your phone.</p>
                        {/* Make sure your APK file is placed in the 'public' folder */}
                        <a href="/iDENTify.apk" download className="download-btn">
                            Download APK
                        </a>
                    </div>

                    <div className="action-card">
                        <h2>Web Portal</h2>
                        <p>For clinic staff and administrators to manage records and daily operations.</p>
                        <Link to="/" className="login-link">
                            Go to Login
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Landing;