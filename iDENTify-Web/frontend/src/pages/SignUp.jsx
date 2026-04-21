import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../api/apiClient";
import useAppStore from "../store/useAppStore";
import toothLogo from "../assets/toothlogo.svg";
import "../styles/pages/Signup.css"; 

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

function SignUp() {
	const [firstName, setFirstName] = useState("");
	const [middleName, setMiddleName] = useState(""); // New Middle Name state
	const [surname, setSurname] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState(""); 
	const [showPassword, setShowPassword] = useState(false);
    
	const [errors, setErrors] = useState({});
	const navigate = useNavigate();

	const handleInputChange = (field, value) => {
		setErrors((prev) => ({ ...prev, [field]: null }));
		if (field === "firstName") setFirstName(value);
		if (field === "middleName") setMiddleName(value); // Handler for Middle Name
		if (field === "surname") setSurname(value);
		if (field === "email") setEmail(value);
		if (field === "password") setPassword(value);
		if (field === "confirmPassword") setConfirmPassword(value);
	};

    // Step 1: Validate form and request OTP
	const handleSendOtp = async (e) => {
		e.preventDefault();
		const newErrors = {};

		if (!firstName.trim()) newErrors.firstName = "First name is required";
		if (!surname.trim()) newErrors.surname = "Surname is required";
		if (!email.trim()) newErrors.email = "Email is required";
		if (password.length < 6) newErrors.password = "Password must be at least 6 characters";
		if (password !== confirmPassword) newErrors.confirmPassword = "Passwords do not match";

        // Note: Middle name has no error check because it is strictly optional!

		if (Object.keys(newErrors).length > 0) {
			setErrors(newErrors);
			return;
		}

		try {
            await api.sendSuperadminSignupOtp({ email });
			toast.success("Verification code sent to your email!");
            // Redirect to separate verification page with form data in state
            navigate("/verify-email", { 
                state: { firstName, middleName, surname, email, password, confirmPassword } 
            });
		} catch (error) {
            const message = resolveSignupErrorMessage(error, "Failed to send verification code.");
            toast.error(message);
            setErrors({ form: message });
		}
	};

	return (
		<div className="signup-page">
			<div className="signup-visual">
				<div className="signup-visual__header">
					<h1 className="signup-visual__title">Welcome to iDENTify</h1>
					<p className="signup-visual__subtitle">Dental Clinic Management System</p>
				</div>
			</div>

			<div className="signup-form-container">
                <form className="signup-form" onSubmit={handleSendOtp}>
                    <div className="signup-form__header-center">
                        <div className="logo-circle-large">
                            <img src={toothLogo} alt="iDENTify Logo" className="signup-logo-large" />
                        </div>
                        <h2 className="signup-form__title">Super Admin Registration</h2>
                        <p className="signup-form__subtitle">Create your clinic owner account</p>
                    </div>

                    {errors.form && <div className="error-banner" style={{color: 'red', textAlign: 'center', marginBottom: '10px'}}>{errors.form}</div>}

                    <div className="signup-form__group">
                        <label>First Name</label>
                        <input type="text" value={firstName} onChange={(e) => handleInputChange("firstName", e.target.value)} placeholder="Jane" className={errors.firstName ? "input-error" : ""} />
                        {errors.firstName && <span className="error-text">{errors.firstName}</span>}
                    </div>

                    {/* NEW MIDDLE NAME INPUT */}
                    <div className="signup-form__group">
                        <label>Middle Name (Optional)</label>
                        <input type="text" value={middleName} onChange={(e) => handleInputChange("middleName", e.target.value)} placeholder="Smith" />
                    </div>

                    <div className="signup-form__group">
                        <label>Surname</label>
                        <input type="text" value={surname} onChange={(e) => handleInputChange("surname", e.target.value)} placeholder="Doe" className={errors.surname ? "input-error" : ""} />
                        {errors.surname && <span className="error-text">{errors.surname}</span>}
                    </div>

                    <div className="signup-form__group">
                        <label>Email</label>
                        <input type="email" value={email} onChange={(e) => handleInputChange("email", e.target.value)} placeholder="name@email.com" className={errors.email ? "input-error" : ""} />
                        {errors.email && <span className="error-text">{errors.email}</span>}
                    </div>

                    <div className="signup-form__group">
                        <label>Password</label>
                        <div className="password-input-wrapper">
                            <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => handleInputChange("password", e.target.value)} placeholder="••••••••" className={errors.password ? "input-error" : ""} />
                            <button type="button" className="password-toggle-btn" onClick={() => setShowPassword(!showPassword)}>{showPassword ? "Hide" : "Show"}</button>
                        </div>
                        {errors.password && <span className="error-text">{errors.password}</span>}
                    </div>

                    <div className="signup-form__group">
                        <label>Confirm Password</label>
                        <input type={showPassword ? "text" : "password"} value={confirmPassword} onChange={(e) => handleInputChange("confirmPassword", e.target.value)} placeholder="••••••••" className={errors.confirmPassword ? "input-error" : ""} />
                        {errors.confirmPassword && <span className="error-text">{errors.confirmPassword}</span>}
                    </div>

                    <button type="submit" className="signup-form__button">Register</button>
                    <p style={{ textAlign: "center", marginTop: "15px" }}>
                        Already have an account? <Link to="/" style={{ color: "var(--primary-color)", fontWeight: "bold" }}>Log in here</Link>
                    </p>
                </form>
			</div>
		</div>
	);
}

export default SignUp;