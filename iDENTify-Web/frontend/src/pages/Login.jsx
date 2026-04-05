// import React, { useState } from "react";
// import { useNavigate, Link } from "react-router-dom";
// import toast from "react-hot-toast";
// import api from "../api/apiClient"; 
// import useAppStore from "../store/useAppStore";
// import toothLogo from "../assets/toothlogo.svg";
// import "../styles/pages/LoginPage.css";

// function Login() {
//     const [role, setRole] = useState("aide"); 
//     const [email, setEmail] = useState("");
//     const [password, setPassword] = useState("");
//     const [showPassword, setShowPassword] = useState(false);
//     const [errors, setErrors] = useState({});
    
//     const navigate = useNavigate();
//     const { setUser } = useAppStore();

//     const handleInputChange = (field, value) => {
//         setErrors((prev) => ({ ...prev, [field]: null, form: null }));
//         if (field === "email") setEmail(value);
//         if (field === "password") setPassword(value);
//     };

//     const handleSubmit = async (e) => {
//         e.preventDefault();
//         const newErrors = {};

//         if (!email.trim()) newErrors.email = "Email is required";
//         if (!password.trim()) newErrors.password = "Password is required";

//         if (Object.keys(newErrors).length > 0) {
//             setErrors(newErrors);
//             return;
//         }

//         try {
//             const response = await api.login({ email, password, role });
//             setUser(response.user); 
//             toast.success(response.message || "Welcome back!");
//             navigate("/dashboard");
//         } catch (error) {
//             setErrors({ form: error.message || "Invalid credentials." });
//             toast.error(error.message || "Invalid credentials.");
//         }
//     };

//     return (
//         <div className="login-page">
//             <div className="login-visual">
//                 <div className="login-visual__header">
//                     <h1 className="login-visual__title">Welcome to iDENTify</h1>
//                     <p className="login-visual__subtitle">Dental Clinic Management System</p>
//                 </div>
//             </div>

//             <div className="login-form-container">
//                 <form className="login-form" onSubmit={handleSubmit}>
//                     <div className="login-form__header-center">
//                         <div className="logo-circle-large">
//                             <img src={toothLogo} alt="iDENTify Logo" className="login-logo-large" />
//                         </div>
//                         <h2 className="login-form__title">Welcome Back</h2>
//                         <p className="login-form__subtitle">Log in to your account</p>
//                     </div>

//                     <div className="role-selector" style={{ display: 'flex', gap: '15px', marginBottom: '20px', justifyContent: 'center' }}>
//                         <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
//                             <input 
//                                 type="radio" 
//                                 value="aide" 
//                                 checked={role === "aide"} 
//                                 onChange={(e) => setRole(e.target.value)} 
//                             /> Dental Aide
//                         </label>
//                         <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
//                             <input 
//                                 type="radio" 
//                                 value="dentist" 
//                                 checked={role === "dentist"} 
//                                 onChange={(e) => setRole(e.target.value)} 
//                             /> Dentist
//                         </label>
//                     </div>

//                     {errors.form && <div className="error-banner" style={{color: 'red', textAlign: 'center', marginBottom: '10px'}}>{errors.form}</div>}

//                     <div className="login-form__group">
//                         <label htmlFor="email">Email</label>
//                         <input 
//                             type="email" 
//                             id="email" 
//                             value={email} 
//                             onChange={(e) => handleInputChange("email", e.target.value)} 
//                             placeholder="name@email.com" 
//                             className={errors.email ? "input-error" : ""} 
//                         />
//                         {errors.email && <span className="error-text">{errors.email}</span>}
//                     </div>

//                     <div className="login-form__group">
//                         <label htmlFor="password">Password</label>
//                         <div className="password-input-wrapper">
//                             <input 
//                                 type={showPassword ? "text" : "password"} 
//                                 id="password" 
//                                 value={password} 
//                                 onChange={(e) => handleInputChange("password", e.target.value)} 
//                                 placeholder="••••••••" 
//                                 className={errors.password ? "input-error" : ""} 
//                             />
//                             <button 
//                                 type="button" 
//                                 className="password-toggle-btn" 
//                                 onClick={() => setShowPassword(!showPassword)}
//                             >
//                                 {showPassword ? "Hide" : "Show"}
//                             </button>
//                         </div>
//                         {errors.password && <span className="error-text">{errors.password}</span>}
//                     </div>

//                     <button type="submit" className="login-form__button">Login</button>

//                     {/* CORRECTED: Only dentists can see the signup link */}
//                     {role === "dentist" && (
//                         <p style={{ textAlign: "center", marginTop: "15px" }}>
//                             Don't have an account? <Link to="/signup" style={{ color: "var(--primary-color)", fontWeight: "bold" }}>Sign up here</Link>
//                         </p>
//                     )}
//                 </form>
//             </div>
//         </div>
//     );
// }

// export default Login;


import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../api/apiClient"; 
import useAppStore from "../store/useAppStore";
import toothLogo from "../assets/toothlogo.svg";
import "../styles/pages/LoginPage.css";

function Login() {
    const [role, setRole] = useState("aide"); 
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    
    // OTP verification states
    const [isOtpStep, setIsOtpStep] = useState(false);
    const [otpCode, setOtpCode] = useState("");

    const [errors, setErrors] = useState({});
    
    const navigate = useNavigate();
    const { setUser } = useAppStore();

    const handleInputChange = (field, value) => {
        setErrors((prev) => ({ ...prev, [field]: null, form: null }));
        if (field === "email") setEmail(value);
        if (field === "password") setPassword(value);
        if (field === "otp") setOtpCode(value);
    };

    // Submitting Email & Password
    const handleLoginSubmit = async (e) => {
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
            
            if (response.requireOtp) {
                // Aide flow: Require OTP
                toast.success(response.message || "OTP sent to your email!");
                setIsOtpStep(true); 
            } else {
                // Dentist flow: Instant Login
                setUser(response.user); 
                toast.success(response.message || "Welcome back!");
                navigate("/dashboard");
            }
        } catch (error) {
            setErrors({ form: error.message || "Invalid credentials." });
            toast.error(error.message || "Invalid credentials.");
        }
    };

    // Submitting the OTP Code (Only Aides will see this)
    const handleOtpSubmit = async (e) => {
        e.preventDefault();
        if (!otpCode.trim()) {
            setErrors({ otp: "Verification code is required" });
            return;
        }

        try {
            const response = await api.verifyOtp({ email, otp: otpCode, role });
            setUser(response.user); 
            toast.success(response.message || "Welcome back!");
            navigate("/dashboard");
        } catch (error) {
            setErrors({ form: error.message || "Invalid verification code." });
            toast.error(error.message || "Invalid verification code.");
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
                {!isOtpStep ? (
                    <form className="login-form" onSubmit={handleLoginSubmit}>
                        <div className="login-form__header-center">
                            <div className="logo-circle-large">
                                <img src={toothLogo} alt="iDENTify Logo" className="login-logo-large" />
                            </div>
                            <h2 className="login-form__title">Welcome Back</h2>
                            <p className="login-form__subtitle">Log in to your account</p>
                        </div>

                        <div className="role-selector" style={{ display: 'flex', gap: '15px', marginBottom: '20px', justifyContent: 'center' }}>
                            <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <input 
                                    type="radio" 
                                    value="aide" 
                                    checked={role === "aide"} 
                                    onChange={(e) => setRole(e.target.value)} 
                                /> Dental Aide
                            </label>
                            <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <input 
                                    type="radio" 
                                    value="dentist" 
                                    checked={role === "dentist"} 
                                    onChange={(e) => setRole(e.target.value)} 
                                /> Dentist
                            </label>
                        </div>

                        {errors.form && <div className="error-banner" style={{color: 'red', textAlign: 'center', marginBottom: '10px'}}>{errors.form}</div>}

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

                        <button type="submit" className="login-form__button">Continue</button>

                        {role === "dentist" && (
                            <p style={{ textAlign: "center", marginTop: "15px" }}>
                                Don't have an account? <Link to="/signup" style={{ color: "var(--primary-color)", fontWeight: "bold" }}>Sign up here</Link>
                            </p>
                        )}
                    </form>
                ) : (
                    <form className="login-form" onSubmit={handleOtpSubmit}>
                        <div className="login-form__header-center">
                            <div className="logo-circle-large">
                                <img src={toothLogo} alt="iDENTify Logo" className="login-logo-large" />
                            </div>
                            <h2 className="login-form__title">2-Step Verification</h2>
                            <p className="login-form__subtitle">We sent a 6-digit code to <strong>{email}</strong></p>
                        </div>

                        {errors.form && <div className="error-banner" style={{color: 'red', textAlign: 'center', marginBottom: '10px'}}>{errors.form}</div>}

                        <div className="login-form__group">
                            <label htmlFor="otp">Verification Code</label>
                            <input 
                                type="text" 
                                id="otp" 
                                value={otpCode} 
                                onChange={(e) => handleInputChange("otp", e.target.value)} 
                                placeholder="Enter 6-digit code" 
                                maxLength="6"
                                style={{ textAlign: "center", fontSize: "1.2rem", letterSpacing: "5px" }}
                                className={errors.otp ? "input-error" : ""} 
                            />
                            {errors.otp && <span className="error-text">{errors.otp}</span>}
                        </div>

                        <button type="submit" className="login-form__button">Verify & Login</button>
                        
                        <p style={{ textAlign: "center", marginTop: "15px" }}>
                            <button 
                                type="button" 
                                onClick={() => setIsOtpStep(false)} 
                                style={{ background: "none", border: "none", color: "var(--primary-color)", cursor: "pointer", fontWeight: "bold" }}
                            >
                                &larr; Back to Login
                            </button>
                        </p>
                    </form>
                )}
            </div>
        </div>
    );
}

export default Login;