import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/pages/Landing.css';

const ToothIcon = () => (
    <svg className="landing-tooth-icon" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M32 4C24 4 16 10 16 20C16 26 17.5 31 18 36C18.8 42 20 56 24 56C26 56 27 52 28 46C29 40 30 38 32 38C34 38 35 40 36 46C37 52 38 56 40 56C44 56 45.2 42 46 36C46.5 31 48 26 48 20C48 10 40 4 32 4Z" fill="#185FA5" opacity="0.15"/>
        <path d="M32 4C24 4 16 10 16 20C16 26 17.5 31 18 36C18.8 42 20 56 24 56C26 56 27 52 28 46C29 40 30 38 32 38C34 38 35 40 36 46C37 52 38 56 40 56C44 56 45.2 42 46 36C46.5 31 48 26 48 20C48 10 40 4 32 4Z" stroke="#185FA5" strokeWidth="2.5" strokeLinejoin="round"/>
        <path d="M23 18C23 18 24 14 28 14" stroke="#185FA5" strokeWidth="2" strokeLinecap="round" opacity="0.5"/>
    </svg>
);

const CheckIcon = () => (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <circle cx="9" cy="9" r="9" fill="#378ADD" fillOpacity="0.15"/>
        <path d="M5.5 9L7.5 11L12.5 6.5" stroke="#185FA5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);

const PhoneIcon = () => (
    <svg width="22" height="22" viewBox="0 0 28 28" fill="none">
        <rect x="9" y="5" width="10" height="18" rx="2" stroke="#185FA5" strokeWidth="1.5"/>
        <circle cx="14" cy="20" r="1" fill="#185FA5"/>
        <path d="M12 7h4" stroke="#185FA5" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
);

const PortalIcon = () => (
    <svg width="22" height="22" viewBox="0 0 28 28" fill="none">
        <rect x="4" y="6" width="20" height="14" rx="2" stroke="#185FA5" strokeWidth="1.5"/>
        <path d="M10 22h8M14 20v2" stroke="#185FA5" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M8 12h4M8 15h8" stroke="#185FA5" strokeWidth="1.5" strokeLinecap="round" opacity="0.6"/>
    </svg>
);

const features = [
    'Appointment scheduling',
    'Patient record management',
    'Treatment history tracking',
    'Staff & admin dashboard',
];

function Landing() {
    return (
        <div className="landing-wrapper">

            <header className="landing-nav">
                <div className="landing-nav-inner">
                    <div className="landing-brand">
                        <ToothIcon />
                        <span className="landing-brand-name">i<span className="brand-accent">DENT</span>ify</span>
                    </div>
                    <Link to="/" className="nav-login-btn">Staff login</Link>
                </div>
            </header>

            <main className="landing-main">
                <section className="landing-hero">
                    <div className="hero-badge">Dental clinic management system</div>
                    <h1 className="hero-title">
                        Smarter care,<br />
                        <span className="hero-title-accent">seamless records.</span>
                    </h1>
                    <p className="hero-subtitle">
                        iDENTify brings together your clinic's operations and patient experience in one clean, modern platform.
                    </p>
                    <ul className="hero-features">
                        {features.map((f) => (
                            <li key={f} className="hero-feature-item">
                                <CheckIcon />
                                <span>{f}</span>
                            </li>
                        ))}
                    </ul>
                </section>

                <section className="landing-cards">
                    <div className="action-card card-mobile">
                        <div className="card-header">
                            <div className="card-icon-box"><PhoneIcon /></div>
                            <div>
                                <h2 className="card-title">Mobile app</h2>
                                <p className="card-sub">For patients</p>
                            </div>
                        </div>
                        <p className="card-body">
                            Download our Android app to book appointments, view your dental records, and receive reminders — right from your phone.
                        </p>
                        <a href="/iDENTify.apk" download className="card-btn btn-outline">
                            <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                                <path d="M8 2v8M5 7l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                <path d="M3 13h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                            </svg>
                            Download APK
                        </a>
                    </div>

                    <div className="action-card card-portal">
                        <div className="card-header">
                            <div className="card-icon-box"><PortalIcon /></div>
                            <div>
                                <h2 className="card-title">Web portal</h2>
                                <p className="card-sub">For clinic staff</p>
                            </div>
                        </div>
                        <p className="card-body">
                            Manage patient records, appointments, and daily clinic operations from a secure web dashboard built for your team.
                        </p>
                        <Link to="/" className="card-btn btn-solid">
                            <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                                <rect x="2" y="3" width="12" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
                                <path d="M6 14h4M8 12v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                            </svg>
                            Go to login
                        </Link>
                    </div>
                </section>
            </main>

            <footer className="landing-footer">
                <p>© {new Date().getFullYear()} iDENTify &mdash; Built for modern dental clinics.</p>
            </footer>
        </div>
    );
}

export default Landing;