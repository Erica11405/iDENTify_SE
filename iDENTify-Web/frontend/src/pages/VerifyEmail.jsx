import React, { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../api/apiClient";
import useAppStore from "../store/useAppStore";
import toothLogo from "../assets/toothlogo.svg";
import "../styles/pages/Signup.css"; // Reuse signup styles

function resolveSignupErrorMessage(error, fallback) {
    const code = String(error?.body?.code || '').trim().toUpperCase();
    if (code === 'SUPERADMIN_WORKFLOW_NOT_CONFIGURED') {
        return 'Superadmin approval workflow is not configured yet. Please run the latest backend migrations and try again.';
    }
    return error?.message || fallback;
}

function shouldRequirePasswordChange(user, responseFlag) {
    if (responseFlag === true) return true;
    const rawValue = user?.require_password_change ?? user?.requirePasswordChange;
    if (rawValue === true || rawValue === 1) return true;
    return String(rawValue || "").trim().toLowerCase() === "true" || String(rawValue || "").trim() === "1";
}

function VerifyEmail() {
    const navigate = useNavigate();
    const location = useLocation();
    const { setUser } = useAppStore();
    const [otpCode, setOtpCode] = useState("");
    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Get registration data from navigation state
    const regData = location.state || {};
    const { email, firstName, middleName, surname, password, confirmPassword } = regData;

    useEffect(() => {
        if (!email) {
            toast.error("Invalid session. Please start registration again.");
            navigate("/signup");
        }
    }, [email, navigate]);

    const handleOtpChange = (e) => {
        setErrors({});
        setOtpCode(String(e.target.value || "").replace(/\D/g, "").slice(0, 6));
    };

    const handleVerifyAndSignup = async (e) => {
        e.preventDefault();
        if (otpCode.length !== 6) {
            setErrors({ otp: "Please enter the 6-digit verification code" });
            return;
        }

        setIsSubmitting(true);
        try {
            // 1. Complete Signup
            await api.signupSuperadmin({ 
                firstName, 
                middleName, 
                surname, 
                email, 
                password, 
                confirmPassword, 
                otp: otpCode 
            });

            // 2. Auto-login after successful signup
            const loginResponse = await api.login({ email, password });
            const nextUser = loginResponse?.user;

            if (!nextUser) {
                toast.success("Account created! Please log in.");
                navigate("/");
                return;
            }

            const requirePasswordChange = shouldRequirePasswordChange(nextUser, loginResponse?.requirePasswordChange);
            setUser({
                ...nextUser,
                require_password_change: requirePasswordChange,
            });

            if (requirePasswordChange) {
                toast.success("Welcome! Please update your password.");
                navigate("/change-password");
                return;
            }

            toast.success("Account verified! Complete your clinic setup.");
            navigate("/superadmin/request");
        } catch (error) {
            const message = resolveSignupErrorMessage(error, "Verification failed.");
            toast.error(message);
            setErrors({ form: message });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleResendOtp = async () => {
        try {
            await api.sendSuperadminSignupOtp({ email });
            toast.success("New code sent to your email!");
        } catch (error) {
            toast.error("Failed to resend code.");
        }
    };

    if (!email) return null;

    return (
        <div className="signup-page">
            <div className="signup-visual">
                <div className="signup-visual__header">
                    <h1 className="signup-visual__title">Verify Your Identity</h1>
                    <p className="signup-visual__subtitle">Final step to secure your account</p>
                </div>
            </div>

            <div className="signup-form-container">
                <form className="signup-form" onSubmit={handleVerifyAndSignup}>
                    <div className="signup-form__header-center">
                        <div className="logo-circle-large">
                            <img src={toothLogo} alt="iDENTify Logo" className="signup-logo-large" />
                        </div>
                        <h2 className="signup-form__title">Email Verification</h2>
                        <p className="signup-form__subtitle">
                            We've sent a code to <strong>{email}</strong>
                        </p>
                    </div>

                    {errors.form && (
                        <div className="error-banner" style={{ color: 'red', textAlign: 'center', marginBottom: '10px' }}>
                            {errors.form}
                        </div>
                    )}

                    <div className="signup-form__group">
                        <label htmlFor="otp">Verification Code</label>
                        <input 
                            type="text" 
                            id="otp" 
                            value={otpCode} 
                            onChange={handleOtpChange} 
                            placeholder="Enter 6-digit code" 
                            maxLength="6"
                            disabled={isSubmitting}
                            style={{ textAlign: "center", fontSize: "1.2rem", letterSpacing: "5px" }}
                            className={errors.otp ? "input-error" : ""} 
                        />
                        {errors.otp && <span className="error-text">{errors.otp}</span>}
                    </div>

                    <button type="submit" className="signup-form__button" disabled={isSubmitting}>
                        {isSubmitting ? "Verifying..." : "Verify & Create Account"}
                    </button>
                    
                    <div style={{ textAlign: "center", marginTop: "20px" }}>
                        <p style={{ marginBottom: "10px", fontSize: "0.9rem", color: "#666" }}>
                            Didn't receive the code?
                        </p>
                        <button 
                            type="button" 
                            onClick={handleResendOtp}
                            disabled={isSubmitting}
                            style={{ 
                                background: "none", 
                                border: "none", 
                                color: "var(--primary-color)", 
                                cursor: "pointer", 
                                fontWeight: "bold",
                                textDecoration: "underline"
                            }}
                        >
                            Resend Code
                        </button>
                    </div>

                    <p style={{ textAlign: "center", marginTop: "20px" }}>
                        <Link to="/signup" style={{ color: "#666", fontSize: "0.9rem" }}>
                            &larr; Back to registration
                        </Link>
                    </p>
                </form>
            </div>
        </div>
    );
}

export default VerifyEmail;
