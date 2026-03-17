// import React, { useState } from "react";
// import { useNavigate, Link } from "react-router-dom";
// import toast from "react-hot-toast";
// import api from "../api/apiClient"; //
// import toothLogo from "../assets/toothlogo.svg";
// import "../styles/pages/Login.css";

// function SignUp() {
// 	const [firstName, setFirstName] = useState("");
// 	const [middleName, setMiddleName] = useState("");
// 	const [surname, setSurname] = useState("");
// 	const [email, setEmail] = useState("");
// 	const [password, setPassword] = useState("");
// 	const [confirmPassword, setConfirmPassword] = useState(""); 
// 	const [clinicPassword, setClinicPassword] = useState(""); 
// 	const [showPassword, setShowPassword] = useState(false);
// 	const [errors, setErrors] = useState({});
// 	const navigate = useNavigate();

// 	const validateEmail = (testEmail) => {
// 		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// 		if (!emailRegex.test(testEmail)) {
// 			return "Please enter a valid email address.";
// 		}
// 		return null;
// 	};

// 	const handleSignUp = async (e) => {
// 		e.preventDefault();
// 		const newErrors = {};
// 		let hasError = false;

// 		if (!firstName.trim()) { newErrors.firstName = "First name is required"; hasError = true; }
// 		if (!surname.trim()) { newErrors.surname = "Surname is required"; hasError = true; }
// 		const emailError = validateEmail(email);
// 		if (emailError) { newErrors.email = emailError; hasError = true; }
// 		if (!password.trim()) { newErrors.password = "Password is required"; hasError = true; }
// 		if (!confirmPassword.trim()) { newErrors.confirmPassword = "Confirm your password"; hasError = true; }
// 		if (!clinicPassword.trim()) { newErrors.clinicPassword = "Clinic Master Password is required"; hasError = true; }
		
// 		if (password !== confirmPassword) {
// 			newErrors.confirmPassword = "Passwords do not match!";
// 			hasError = true;
// 		}

// 		if (hasError) {
// 			setErrors(newErrors);
// 			return;
// 		}

// 		try {
// 			// Using the shared api client ensures it points to your hosted URL
// 			await api.signupDentist({
// 				firstName,
// 				surname,
// 				email,
// 				password,
// 				clinicPassword
// 			});

// 			toast.success("Dentist account successfully created!");
// 			navigate("/"); 

// 		} catch (error) {
// 			console.error("Signup error:", error);
// 			// Display the specific error message from the backend
// 			toast.error(error.message || "Cannot connect to server.");
// 			setErrors({ form: error.message });
// 		}
// 	};

// 	const handleInputChange = (field, value) => {
// 		if (field === "firstName") setFirstName(value);
// 		if (field === "middleName") setMiddleName(value);
// 		if (field === "surname") setSurname(value);
// 		if (field === "email") setEmail(value);
// 		if (field === "password") setPassword(value);
// 		if (field === "confirmPassword") setConfirmPassword(value);
// 		if (field === "clinicPassword") setClinicPassword(value);
		
// 		if (errors[field] || errors.form) { 
// 			setErrors((prev) => ({ ...prev, [field]: null, form: null })); 
// 		}
// 	};

// 	return (
// 		<div className="login-page">
// 			<div className="login-visual">
// 				<div className="login-visual__header">
// 					<h1 className="login-visual__title">Welcome to iDENTify</h1>
// 					<p className="login-visual__subtitle">Dental Clinic Management System</p>
// 				</div>
// 			</div>

// 			<div className="login-form-container">
// 				<form className="login-form" onSubmit={handleSignUp}>
// 					<div className="login-form__header-center">
// 						<div className="logo-circle-large">
// 							<img src={toothLogo} alt="iDENTify Logo" className="login-logo-large" />
// 						</div>
// 						<h2 className="login-form__title">Dentist Registration</h2>
// 						<p className="login-form__subtitle">Create your administrative account</p>
// 					</div>

// 					{errors.form && <div className="error-banner">{errors.form}</div>}

// 					<div className="login-form__group">
// 						<label htmlFor="firstName">First Name</label>
// 						<input type="text" id="firstName" value={firstName} onChange={(e) => handleInputChange("firstName", e.target.value)} placeholder="Jane" className={errors.firstName ? "input-error" : ""} />
// 						{errors.firstName && <span className="error-text">{errors.firstName}</span>}
// 					</div>

// 					<div className="login-form__group">
// 						<label htmlFor="middleName">Middle Name (Optional)</label>
// 						<input type="text" id="middleName" value={middleName} onChange={(e) => handleInputChange("middleName", e.target.value)} placeholder="A." />
// 					</div>

// 					<div className="login-form__group">
// 						<label htmlFor="surname">Surname</label>
// 						<input type="text" id="surname" value={surname} onChange={(e) => handleInputChange("surname", e.target.value)} placeholder="Doe" className={errors.surname ? "input-error" : ""} />
// 						{errors.surname && <span className="error-text">{errors.surname}</span>}
// 					</div>

// 					<div className="login-form__group">
// 						<label htmlFor="email">Email</label>
// 						<input type="email" id="email" value={email} onChange={(e) => handleInputChange("email", e.target.value)} placeholder="name@email.com" className={errors.email ? "input-error" : ""} />
// 						{errors.email && <span className="error-text">{errors.email}</span>}
// 					</div>

// 					<div className="login-form__group">
// 						<label htmlFor="password">Your Login Password</label>
// 						<div className="password-input-wrapper">
// 							<input type={showPassword ? "text" : "password"} id="password" value={password} onChange={(e) => handleInputChange("password", e.target.value)} placeholder="Create a secure password" className={errors.password ? "input-error" : ""} />
// 							<button type="button" className="password-toggle-btn" onClick={() => setShowPassword(!showPassword)}>{showPassword ? "Hide" : "Show"}</button>
// 						</div>
// 						{errors.password && <span className="error-text">{errors.password}</span>}
// 					</div>
					
// 					<div className="login-form__group">
// 						<label htmlFor="confirmPassword">Confirm Password</label>
// 						<div className="password-input-wrapper">
// 							<input type={showPassword ? "text" : "password"} id="confirmPassword" value={confirmPassword} onChange={(e) => handleInputChange("confirmPassword", e.target.value)} placeholder="Confirm your password" className={errors.confirmPassword ? "input-error" : ""} />
// 						</div>
// 						{errors.confirmPassword && <span className="error-text">{errors.confirmPassword}</span>}
// 					</div>

// 					<div className="login-form__group">
// 						<label htmlFor="clinicPassword">Clinic Master Password</label>
// 						<div className="password-input-wrapper">
// 							<input type={showPassword ? "text" : "password"} id="clinicPassword" value={clinicPassword} onChange={(e) => handleInputChange("clinicPassword", e.target.value)} placeholder="Enter authorized clinic key" className={errors.clinicPassword ? "input-error" : ""} />
// 						</div>
// 						<p style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>Required to prove you are authorized staff.</p>
// 						{errors.clinicPassword && <span className="error-text">{errors.clinicPassword}</span>}
// 					</div>

// 					<button type="submit" className="login-form__button">Create Account</button>

// 					<p style={{ textAlign: "center", marginTop: "15px" }}>
// 						Already have an account? <Link to="/" style={{ color: "var(--primary-color)", fontWeight: "bold" }}>Log in here</Link>
// 					</p>
// 				</form>
// 			</div>
// 		</div>
// 	);
// }

// export default SignUp;

import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../api/apiClient"; //
import toothLogo from "../assets/toothlogo.svg";
import "../styles/pages/Login.css";

function SignUp() {
	const [firstName, setFirstName] = useState("");
	const [middleName, setMiddleName] = useState("");
	const [surname, setSurname] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState(""); 
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
		if (!confirmPassword.trim()) { newErrors.confirmPassword = "Confirm your password"; hasError = true; }
		
		if (password !== confirmPassword) {
			newErrors.confirmPassword = "Passwords do not match!";
			hasError = true;
		}

		if (hasError) {
			setErrors(newErrors);
			return;
		}

		try {
			// Using the shared api client ensures it points to your hosted URL
			await api.signupDentist({
				firstName,
				surname,
				email,
				password
			});

			toast.success("Dentist account successfully created!");
			navigate("/"); 

		} catch (error) {
			console.error("Signup error:", error);
			// Display the specific error message from the backend
			toast.error(error.message || "Cannot connect to server.");
			setErrors({ form: error.message });
		}
	};

	const handleInputChange = (field, value) => {
		if (field === "firstName") setFirstName(value);
		if (field === "middleName") setMiddleName(value);
		if (field === "surname") setSurname(value);
		if (field === "email") setEmail(value);
		if (field === "password") setPassword(value);
		if (field === "confirmPassword") setConfirmPassword(value);
		
		if (errors[field] || errors.form) { 
			setErrors((prev) => ({ ...prev, [field]: null, form: null })); 
		}
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
						<label htmlFor="password">Your Login Password</label>
						<div className="password-input-wrapper">
							<input type={showPassword ? "text" : "password"} id="password" value={password} onChange={(e) => handleInputChange("password", e.target.value)} placeholder="Create a secure password" className={errors.password ? "input-error" : ""} />
							<button type="button" className="password-toggle-btn" onClick={() => setShowPassword(!showPassword)}>{showPassword ? "Hide" : "Show"}</button>
						</div>
						{errors.password && <span className="error-text">{errors.password}</span>}
					</div>
					
					<div className="login-form__group">
						<label htmlFor="confirmPassword">Confirm Password</label>
						<div className="password-input-wrapper">
							<input type={showPassword ? "text" : "password"} id="confirmPassword" value={confirmPassword} onChange={(e) => handleInputChange("confirmPassword", e.target.value)} placeholder="Confirm your password" className={errors.confirmPassword ? "input-error" : ""} />
						</div>
						{errors.confirmPassword && <span className="error-text">{errors.confirmPassword}</span>}
					</div>

					<button type="submit" className="login-form__button">Create Account</button>

					<p style={{ textAlign: "center", marginTop: "15px" }}>
						Already have an account? <Link to="/" style={{ color: "var(--primary-color)", fontWeight: "bold" }}>Log in here</Link>
					</p>
				</form>
			</div>
		</div>
	);
}

export default SignUp;