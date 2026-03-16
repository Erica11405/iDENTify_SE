import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";
import toothLogo from "../assets/toothlogo.svg";
import "../styles/pages/Login.css";

function SignUp() {
	const [firstName, setFirstName] = useState("");
	const [middleName, setMiddleName] = useState("");
	const [surname, setSurname] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [errors, setErrors] = useState({});
	const navigate = useNavigate();

	const validateEmail = (testEmail) => {
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(testEmail)) {
			return "Please enter a valid email address.";
		}
		return null;
	};

	const handleSignUp = async (e) => {
		e.preventDefault();
		const newErrors = {};
		let hasError = false;

		if (!firstName.trim()) { newErrors.firstName = "First name is required"; hasError = true; }
		if (!surname.trim()) { newErrors.surname = "Surname is required"; hasError = true; }
		const emailError = validateEmail(email);
		if (emailError) { newErrors.email = emailError; hasError = true; }
		if (!password.trim()) { newErrors.password = "Password is required"; hasError = true; }

		if (hasError) {
			setErrors(newErrors);
			return;
		}

		try {
			// Sending data to our new backend route
			const response = await fetch('http://localhost:8080/api/auth/signup/dentist', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					firstName,
					surname,
					email,
					password,
					clinicPassword: password // We are using the password field to check the master password for now
				})
			});

			const data = await response.json();

			if (!response.ok) {
				toast.error(data.error || "Failed to create account.");
				setErrors({ form: data.error });
				return;
			}

			toast.success("Dentist account successfully created!");
			navigate("/login"); 

		} catch (error) {
			console.error("Signup fetch error:", error);
			toast.error("Cannot connect to server. Is the backend running?");
		}
	};

	const handleInputChange = (field, value) => {
		if (field === "firstName") setFirstName(value);
		if (field === "middleName") setMiddleName(value);
		if (field === "surname") setSurname(value);
		if (field === "email") setEmail(value);
		if (field === "password") setPassword(value);
		if (errors[field] || errors.form) { setErrors((prev) => ({ ...prev, [field]: null, form: null })); }
	};

	return (
		<div className="login-page">
			<div className="login-visual">
				<div className="login-visual__header">
					<h1 className="login-visual__title">Welcome to iDENTify</h1>
					<p className="login-visual__subtitle">Dental Clinic Management System</p>
				</div>
			</div>

			<div className="login-form-container">
				<form className="login-form" onSubmit={handleSignUp}>
					<div className="login-form__header-center">
						<div className="logo-circle-large">
							<img src={toothLogo} alt="iDENTify Logo" className="login-logo-large" />
						</div>
						<h2 className="login-form__title">Dentist Registration</h2>
						<p className="login-form__subtitle">Create your administrative account</p>
					</div>

					{errors.form && <div className="error-banner">{errors.form}</div>}

					<div className="login-form__group">
						<label htmlFor="firstName">First Name</label>
						<input type="text" id="firstName" value={firstName} onChange={(e) => handleInputChange("firstName", e.target.value)} placeholder="Jane" className={errors.firstName ? "input-error" : ""} />
						{errors.firstName && <span className="error-text">{errors.firstName}</span>}
					</div>

					<div className="login-form__group">
						<label htmlFor="middleName">Middle Name (Optional)</label>
						<input type="text" id="middleName" value={middleName} onChange={(e) => handleInputChange("middleName", e.target.value)} placeholder="A." />
					</div>

					<div className="login-form__group">
						<label htmlFor="surname">Surname</label>
						<input type="text" id="surname" value={surname} onChange={(e) => handleInputChange("surname", e.target.value)} placeholder="Doe" className={errors.surname ? "input-error" : ""} />
						{errors.surname && <span className="error-text">{errors.surname}</span>}
					</div>

					<div className="login-form__group">
						<label htmlFor="email">Email</label>
						<input type="email" id="email" value={email} onChange={(e) => handleInputChange("email", e.target.value)} placeholder="name@email.com" className={errors.email ? "input-error" : ""} />
						{errors.email && <span className="error-text">{errors.email}</span>}
					</div>

					<div className="login-form__group">
						<label htmlFor="password">Clinic Settings Password</label>
						<div className="password-input-wrapper">
							<input type={showPassword ? "text" : "password"} id="password" value={password} onChange={(e) => handleInputChange("password", e.target.value)} placeholder="Enter authorized clinic password" className={errors.password ? "input-error" : ""} />
							<button type="button" className="password-toggle-btn" onClick={() => setShowPassword(!showPassword)}>{showPassword ? "Hide" : "Show"}</button>
						</div>
						{errors.password && <span className="error-text">{errors.password}</span>}
					</div>

					<button type="submit" className="login-form__button">Create Account</button>

					<p style={{ textAlign: "center", marginTop: "15px" }}>
						Already have an account? <Link to="/login" style={{ color: "var(--primary-color)", fontWeight: "bold" }}>Log in here</Link>
					</p>
				</form>
			</div>
		</div>
	);
}

export default SignUp;