// import React, { useState } from "react";
// import { useNavigate } from "react-router-dom";
// import toast from "react-hot-toast";
// import toothLogo from "../assets/toothlogo.svg";
// import "../styles/pages/Login.css";

// function Login({ setIsLoggedIn }) {
// 	const [isLoginView, setIsLoginView] = useState(true);
// 	const [role, setRole] = useState("aide"); // 'dentist' or 'aide'
// 	const [email, setEmail] = useState("");
// 	const [password, setPassword] = useState("");
// 	const [fullName, setFullName] = useState(""); // Only for signup
// 	const [showPassword, setShowPassword] = useState(false);
// 	const [errors, setErrors] = useState({});
// 	const navigate = useNavigate();

// 	const handleAuth = async (e) => {
// 		e.preventDefault();
// 		const newErrors = {};
// 		let hasError = false;

// 		if (!email.trim()) {
// 			newErrors.email = "Email is required";
// 			hasError = true;
// 		}
// 		if (!password.trim()) {
// 			newErrors.password = "Password is required";
// 			hasError = true;
// 		}
// 		if (!isLoginView && !fullName.trim()) {
// 			newErrors.fullName = "Full name is required";
// 			hasError = true;
// 		}

// 		if (hasError) {
// 			setErrors(newErrors);
// 			return;
// 		}

// 		// TODO: Replace this block with your actual Backend API calls
// 		// Example: const response = await fetch('/api/auth/login', { method: 'POST', ... })
		
// 		if (isLoginView) {
// 			// Mock Login Success
// 			setIsLoggedIn(role);
// 			navigate("/app");
// 			toast.success(`Logged in as ${role}.`);
// 		} else {
// 			// Mock Signup Success (Needs Email Verification logic on backend)
// 			toast.success("Signup successful! Please check your email to verify your account.");
// 			setIsLoginView(true); // Switch back to login view
// 		}
// 	};

// 	const handleInputChange = (field, value) => {
// 		if (field === "email") setEmail(value);
// 		if (field === "password") setPassword(value);
// 		if (field === "fullName") setFullName(value);

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
// 				<form className="login-form" onSubmit={handleAuth}>
// 					<div className="login-form__header-center">
// 						<div className="logo-circle-large">
// 							<img src={toothLogo} alt="iDENTify Logo" className="login-logo-large" />
// 						</div>
// 						<h2 className="login-form__title">
// 							{isLoginView ? "Welcome Back" : "Create an Account"}
// 						</h2>
// 					</div>

// 					{/* Role Selector */}
// 					<div className="role-selector" style={{ display: 'flex', gap: '10px', marginBottom: '20px', justifyContent: 'center' }}>
// 						<label>
// 							<input 
// 								type="radio" 
// 								value="aide" 
// 								checked={role === "aide"} 
// 								onChange={(e) => setRole(e.target.value)} 
// 							/> Dental Aide
// 						</label>
// 						<label>
// 							<input 
// 								type="radio" 
// 								value="dentist" 
// 								checked={role === "dentist"} 
// 								onChange={(e) => setRole(e.target.value)} 
// 							/> Dentist
// 						</label>
// 					</div>

// 					{errors.form && <div className="error-banner">{errors.form}</div>}

// 					{!isLoginView && (
// 						<div className="login-form__group">
// 							<label htmlFor="fullName">Full Name</label>
// 							<input
// 								type="text"
// 								id="fullName"
// 								value={fullName}
// 								onChange={(e) => handleInputChange("fullName", e.target.value)}
// 								placeholder="Dr. Jane Doe"
// 								className={errors.fullName ? "input-error" : ""}
// 							/>
// 							{errors.fullName && <span className="error-text">{errors.fullName}</span>}
// 						</div>
// 					)}

// 					<div className="login-form__group">
// 						<label htmlFor="email">Email</label>
// 						<input
// 							type="email"
// 							id="email"
// 							value={email}
// 							onChange={(e) => handleInputChange("email", e.target.value)}
// 							placeholder="name@email.com"
// 							className={errors.email ? "input-error" : ""}
// 						/>
// 						{errors.email && <span className="error-text">{errors.email}</span>}
// 					</div>

// 					<div className="login-form__group">
// 						<label htmlFor="password">Password</label>
// 						<div className="password-input-wrapper">
// 							<input
// 								type={showPassword ? "text" : "password"}
// 								id="password"
// 								value={password}
// 								onChange={(e) => handleInputChange("password", e.target.value)}
// 								placeholder="••••••••"
// 								className={errors.password ? "input-error" : ""}
// 							/>
// 							<button
// 								type="button"
// 								className="password-toggle-btn"
// 								onClick={() => setShowPassword(!showPassword)}
// 							>
// 								{showPassword ? "Hide" : "Show"}
// 							</button>
// 						</div>
// 						{errors.password && <span className="error-text">{errors.password}</span>}
// 					</div>

// 					<button type="submit" className="login-form__button">
// 						{isLoginView ? "Login" : "Sign Up"}
// 					</button>

// 					<p style={{ textAlign: "center", marginTop: "15px", cursor: "pointer", color: "var(--primary-color)" }} onClick={() => setIsLoginView(!isLoginView)}>
// 						{isLoginView ? "Don't have an account? Sign up" : "Already have an account? Log in"}
// 					</p>
// 				</form>
// 			</div>
// 		</div>
// 	);
// }

// export default Login;


import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";
import toothLogo from "../assets/toothlogo.svg";
import "../styles/pages/Login.css";

function Login({ setIsLoggedIn }) {
	const [role, setRole] = useState("aide"); // 'dentist' or 'aide'
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [errors, setErrors] = useState({});
	const navigate = useNavigate();

	const handleAuth = async (e) => {
		e.preventDefault();
		const newErrors = {};
		let hasError = false;

		if (!email.trim()) { newErrors.email = "Email is required"; hasError = true; }
		if (!password.trim()) { newErrors.password = "Password is required"; hasError = true; }

		if (hasError) {
			setErrors(newErrors);
			return;
		}

		try {
			// Connecting to our new backend route
			const response = await fetch('http://localhost:8080/api/auth/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email, password, role })
			});

			const data = await response.json();

			if (!response.ok) {
				toast.error(data.error || "Login failed.");
				setErrors({ form: data.error });
				return;
			}

			// Success! Pass the role to App.jsx to unlock the dashboard
			setIsLoggedIn(data.user.role);
			navigate("/app");
			toast.success(`Welcome back, ${data.user.name}!`);

		} catch (error) {
			console.error("Login fetch error:", error);
			toast.error("Cannot connect to server. Is the backend running?");
		}
	};

	const handleInputChange = (field, value) => {
		if (field === "email") setEmail(value);
		if (field === "password") setPassword(value);
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
				<form className="login-form" onSubmit={handleAuth}>
					<div className="login-form__header-center">
						<div className="logo-circle-large">
							<img src={toothLogo} alt="iDENTify Logo" className="login-logo-large" />
						</div>
						<h2 className="login-form__title">Welcome Back</h2>
					</div>

					{/* Role Selector */}
					<div className="role-selector" style={{ display: 'flex', gap: '10px', marginBottom: '20px', justifyContent: 'center' }}>
						<label>
							<input type="radio" value="aide" checked={role === "aide"} onChange={(e) => setRole(e.target.value)} /> Dental Aide
						</label>
						<label>
							<input type="radio" value="dentist" checked={role === "dentist"} onChange={(e) => setRole(e.target.value)} /> Dentist
						</label>
					</div>

					{errors.form && <div className="error-banner">{errors.form}</div>}

					<div className="login-form__group">
						<label htmlFor="email">Email</label>
						<input type="email" id="email" value={email} onChange={(e) => handleInputChange("email", e.target.value)} placeholder="name@email.com" className={errors.email ? "input-error" : ""} />
						{errors.email && <span className="error-text">{errors.email}</span>}
					</div>

					<div className="login-form__group">
						<label htmlFor="password">Password</label>
						<div className="password-input-wrapper">
							<input type={showPassword ? "text" : "password"} id="password" value={password} onChange={(e) => handleInputChange("password", e.target.value)} placeholder="••••••••" className={errors.password ? "input-error" : ""} />
							<button type="button" className="password-toggle-btn" onClick={() => setShowPassword(!showPassword)}>{showPassword ? "Hide" : "Show"}</button>
						</div>
						{errors.password && <span className="error-text">{errors.password}</span>}
					</div>

					<button type="submit" className="login-form__button">Login</button>

					{role === "dentist" && (
						<p style={{ textAlign: "center", marginTop: "15px" }}>
							Don't have an account? <Link to="/signup" style={{ color: "var(--primary-color)", fontWeight: "bold" }}>Sign up here</Link>
						</p>
					)}
				</form>
			</div>
		</div>
	);
}

export default Login;