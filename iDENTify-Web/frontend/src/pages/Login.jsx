// // import React, { useState } from "react";
// // import { useNavigate, Link } from "react-router-dom";
// // import toast from "react-hot-toast";
// // import toothLogo from "../assets/toothlogo.svg";
// // import "../styles/pages/Login.css";

// // function Login({ setIsLoggedIn }) {
// // 	const [role, setRole] = useState("aide"); // 'dentist' or 'aide'
// // 	const [email, setEmail] = useState("");
// // 	const [password, setPassword] = useState("");
// // 	const [showPassword, setShowPassword] = useState(false);
// // 	const [errors, setErrors] = useState({});
// // 	const navigate = useNavigate();

// // 	const handleAuth = async (e) => {
// // 		e.preventDefault();
// // 		const newErrors = {};
// // 		let hasError = false;

// // 		if (!email.trim()) { newErrors.email = "Email is required"; hasError = true; }
// // 		if (!password.trim()) { newErrors.password = "Password is required"; hasError = true; }

// // 		if (hasError) {
// // 			setErrors(newErrors);
// // 			return;
// // 		}

// // 		try {
// // 			// Connecting to our new backend route
// // 			const response = await fetch('http://localhost:8080/api/auth/login', {
// // 				method: 'POST',
// // 				headers: { 'Content-Type': 'application/json' },
// // 				body: JSON.stringify({ email, password, role })
// // 			});

// // 			const data = await response.json();

// // 			if (!response.ok) {
// // 				toast.error(data.error || "Login failed.");
// // 				setErrors({ form: data.error });
// // 				return;
// // 			}

// // 			// Success! Pass the role to App.jsx to unlock the dashboard
// // 			setIsLoggedIn(data.user.role);
// // 			navigate("/app");
// // 			toast.success(`Welcome back, ${data.user.name}!`);

// // 		} catch (error) {
// // 			console.error("Login fetch error:", error);
// // 			toast.error("Cannot connect to server. Is the backend running?");
// // 		}
// // 	};

// // 	const handleInputChange = (field, value) => {
// // 		if (field === "email") setEmail(value);
// // 		if (field === "password") setPassword(value);
// // 		if (errors[field] || errors.form) {
// // 			setErrors((prev) => ({ ...prev, [field]: null, form: null }));
// // 		}
// // 	};

// // 	return (
// // 		<div className="login-page">
// // 			<div className="login-visual">
// // 				<div className="login-visual__header">
// // 					<h1 className="login-visual__title">Welcome to iDENTify</h1>
// // 					<p className="login-visual__subtitle">Dental Clinic Management System</p>
// // 				</div>
// // 			</div>

// // 			<div className="login-form-container">
// // 				<form className="login-form" onSubmit={handleAuth}>
// // 					<div className="login-form__header-center">
// // 						<div className="logo-circle-large">
// // 							<img src={toothLogo} alt="iDENTify Logo" className="login-logo-large" />
// // 						</div>
// // 						<h2 className="login-form__title">Welcome Back</h2>
// // 					</div>

// // 					{/* Role Selector */}
// // 					<div className="role-selector" style={{ display: 'flex', gap: '10px', marginBottom: '20px', justifyContent: 'center' }}>
// // 						<label>
// // 							<input type="radio" value="aide" checked={role === "aide"} onChange={(e) => setRole(e.target.value)} /> Dental Aide
// // 						</label>
// // 						<label>
// // 							<input type="radio" value="dentist" checked={role === "dentist"} onChange={(e) => setRole(e.target.value)} /> Dentist
// // 						</label>
// // 					</div>

// // 					{errors.form && <div className="error-banner">{errors.form}</div>}

// // 					<div className="login-form__group">
// // 						<label htmlFor="email">Email</label>
// // 						<input type="email" id="email" value={email} onChange={(e) => handleInputChange("email", e.target.value)} placeholder="name@email.com" className={errors.email ? "input-error" : ""} />
// // 						{errors.email && <span className="error-text">{errors.email}</span>}
// // 					</div>

// // 					<div className="login-form__group">
// // 						<label htmlFor="password">Password</label>
// // 						<div className="password-input-wrapper">
// // 							<input type={showPassword ? "text" : "password"} id="password" value={password} onChange={(e) => handleInputChange("password", e.target.value)} placeholder="••••••••" className={errors.password ? "input-error" : ""} />
// // 							<button type="button" className="password-toggle-btn" onClick={() => setShowPassword(!showPassword)}>{showPassword ? "Hide" : "Show"}</button>
// // 						</div>
// // 						{errors.password && <span className="error-text">{errors.password}</span>}
// // 					</div>

// // 					<button type="submit" className="login-form__button">Login</button>

// // 					{role === "dentist" && (
// // 						<p style={{ textAlign: "center", marginTop: "15px" }}>
// // 							Don't have an account? <Link to="/signup" style={{ color: "var(--primary-color)", fontWeight: "bold" }}>Sign up here</Link>
// // 						</p>
// // 					)}
// // 				</form>
// // 			</div>
// // 		</div>
// // 	);
// // }

// // export default Login;

// import React, { useState } from "react";
// import { useNavigate, Link } from "react-router-dom";
// import toast from "react-hot-toast";
// import api from "../api/apiClient"; // Standardized Import
// import toothLogo from "../assets/toothlogo.svg";
// import "../styles/pages/Login.css";

// function Login() {
// 	const [role, setRole] = useState("aide");
// 	const [email, setEmail] = useState("");
// 	const [password, setPassword] = useState("");
// 	const [showPassword, setShowPassword] = useState(false);
// 	const [errors, setErrors] = useState({});
// 	const navigate = useNavigate();

// 	const handleInputChange = (field, value) => {
// 		setErrors((prev) => ({ ...prev, [field]: null, form: null }));
// 		if (field === "email") setEmail(value);
// 		if (field === "password") setPassword(value);
// 	};

// 	const handleSubmit = async (e) => {
// 		e.preventDefault();
// 		const newErrors = {};

// 		if (!email.trim()) newErrors.email = "Email is required";
// 		if (!password.trim()) newErrors.password = "Password is required";

// 		if (Object.keys(newErrors).length > 0) {
// 			setErrors(newErrors);
// 			return;
// 		}

// 		try {
// 			// Calling the login function from the api object
// 			const response = await api.login({ email, password, role });
			
// 			// If your store handles the user state, it will update here
// 			toast.success(response.message || "Welcome back!");
// 			navigate("/dashboard");
// 		} catch (error) {
// 			console.error("Login fetch error:", error);
// 			setErrors({ form: error.message || "Failed to connect to server." });
// 			toast.error(error.message || "Invalid credentials.");
// 		}
// 	};

// 	return (
// 		<div className="login-container">
// 			<div className="login-box">
// 				<div className="login-header">
// 					<img src={toothLogo} alt="Logo" className="login-logo" />
// 					<h1>Welcome to iDENTify</h1>
// 					<p>Please login to your account</p>
// 				</div>

// 				<form className="login-form" onSubmit={handleSubmit}>
// 					<div className="role-selector">
// 						<label className={`role-option ${role === "aide" ? "active" : ""}`}>
// 							<input type="radio" value="aide" checked={role === "aide"} onChange={() => setRole("aide")} />
// 							Dental Aide
// 						</label>
// 						<label className={`role-option ${role === "dentist" ? "active" : ""}`}>
// 							<input type="radio" value="dentist" checked={role === "dentist"} onChange={() => setRole("dentist")} />
// 							Dentist
// 						</label>
// 					</div>

// 					{errors.form && <div className="error-banner">{errors.form}</div>}

// 					<div className="login-form__group">
// 						<label htmlFor="email">Email</label>
// 						<input type="email" id="email" value={email} onChange={(e) => handleInputChange("email", e.target.value)} placeholder="name@email.com" className={errors.email ? "input-error" : ""} />
// 						{errors.email && <span className="error-text">{errors.email}</span>}
// 					</div>

// 					<div className="login-form__group">
// 						<label htmlFor="password">Password</label>
// 						<div className="password-input-wrapper">
// 							<input type={showPassword ? "text" : "password"} id="password" value={password} onChange={(e) => handleInputChange("password", e.target.value)} placeholder="••••••••" className={errors.password ? "input-error" : ""} />
// 							<button type="button" className="password-toggle-btn" onClick={() => setShowPassword(!showPassword)}>{showPassword ? "Hide" : "Show"}</button>
// 						</div>
// 						{errors.password && <span className="error-text">{errors.password}</span>}
// 					</div>

// 					<button type="submit" className="login-form__button">Login</button>

// 					{role === "dentist" && (
// 						<p style={{ textAlign: "center", marginTop: "15px" }}>
// 							Don't have an account? <Link to="/signup">Sign up here</Link>
// 						</p>
// 					)}
// 				</form>
// 			</div>
// 		</div>
// 	);
// }

// export default Login;


import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../api/apiClient";
import useAppStore from "../store/useAppStore"; // Added this import
import toothLogo from "../assets/toothlogo.svg";
import "../styles/pages/Login.css";

function Login() {
    const [role, setRole] = useState("aide");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [errors, setErrors] = useState({});
    
    const navigate = useNavigate();
    const { setUser } = useAppStore(); // Extract setUser to save the session

    const handleInputChange = (field, value) => {
        setErrors((prev) => ({ ...prev, [field]: null, form: null }));
        if (field === "email") setEmail(value);
        if (field === "password") setPassword(value);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const newErrors = {};

        if (!email.trim()) newErrors.email = "Email is required";
        if (!password.trim()) newErrors.password = "Password is required";

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        try {
            const response = await api.login({ email, password, role });
            
            // CRITICAL FIX: Save the user to the store so App.jsx knows you are logged in
            setUser(response.user); 
            
            toast.success(response.message || "Welcome back!");
            navigate("/dashboard");
        } catch (error) {
            console.error("Login fetch error:", error);
            setErrors({ form: error.message || "Invalid credentials." });
            toast.error(error.message || "Invalid credentials.");
        }
    };

    return (
        <div className="login-container">
            <div className="login-box">
                <div className="login-header">
                    <img src={toothLogo} alt="Logo" className="login-logo" />
                    <h1>Welcome to iDENTify</h1>
                    <p>Please login to your account</p>
                </div>

                <form className="login-form" onSubmit={handleSubmit}>
                    <div className="role-selector">
                        <button 
                            type="button"
                            className={`role-option ${role === "aide" ? "active" : ""}`}
                            onClick={() => setRole("aide")}
                        >
                            Dental Aide
                        </button>
                        <button 
                            type="button"
                            className={`role-option ${role === "dentist" ? "active" : ""}`}
                            onClick={() => setRole("dentist")}
                        >
                            Dentist
                        </button>
                    </div>

                    {errors.form && <div className="error-banner" style={{color: 'red', marginBottom: '10px'}}>{errors.form}</div>}

                    <div className="login-form__group">
                        <label htmlFor="email">Email</label>
                        <input 
                            type="email" 
                            id="email" 
                            value={email} 
                            onChange={(e) => handleInputChange("email", e.target.value)} 
                            placeholder="name@email.com" 
                            className={errors.email ? "input-error" : ""} 
                        />
                        {errors.email && <span className="error-text">{errors.email}</span>}
                    </div>

                    <div className="login-form__group">
                        <label htmlFor="password">Password</label>
                        <div className="password-input-wrapper">
                            <input 
                                type={showPassword ? "text" : "password"} 
                                id="password" 
                                value={password} 
                                onChange={(e) => handleInputChange("password", e.target.value)} 
                                placeholder="••••••••" 
                                className={errors.password ? "input-error" : ""} 
                            />
                            <button 
                                type="button" 
                                className="password-toggle-btn" 
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? "Hide" : "Show"}
                            </button>
                        </div>
                        {errors.password && <span className="error-text">{errors.password}</span>}
                    </div>

                    <button type="submit" className="login-form__button">Login</button>

                    {role === "dentist" && (
                        <p style={{ textAlign: "center", marginTop: "15px" }}>
                            Don't have an account? <Link to="/signup">Sign up here</Link>
                        </p>
                    )}
                </form>
            </div>
        </div>
    );
}

export default Login;