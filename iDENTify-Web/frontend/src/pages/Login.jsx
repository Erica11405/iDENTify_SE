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
//             // This calls the login function from your apiClient.js
//             const response = await api.login({ email, password, role });
            
//             // This saves the user to your store to stop the looping
//             setUser(response.user); 
            
//             toast.success(response.message || "Welcome back!");
//             navigate("/dashboard");
//         } catch (error) {
//             console.error("Login fetch error:", error);
//             setErrors({ form: error.message || "Invalid credentials." });
//             toast.error(error.message || "Invalid credentials.");
//         }
//     };

//     return (
//         <div className="login-page">
//             {/* Left side visual area - This creates the split screen */}
//             <div className="login-visual">
//                 <div className="login-visual__header">
//                     <h1 className="login-visual__title">Welcome to iDENTify</h1>
//                     <p className="login-visual__subtitle">Dental Clinic Management System</p>
//                 </div>
//             </div>

//             {/* Right side form area */}
//             <div className="login-form-container">
//                 <form className="login-form" onSubmit={handleSubmit}>
//                     <div className="login-form__header-center">
//                         <div className="logo-circle-large">
//                             <img src={toothLogo} alt="iDENTify Logo" className="login-logo-large" />
//                         </div>
//                         <h2 className="login-form__title">Welcome Back</h2>
//                         <p className="login-form__subtitle">Log in to your account</p>
//                     </div>

//                     {/* Role Selector with radio buttons as per your screenshot */}
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

//                     <p style={{ textAlign: "center", marginTop: "15px" }}>
//                         Don't have an account? <Link to="/signup" style={{ color: "var(--primary-color)", fontWeight: "bold" }}>Sign up here</Link>
//                     </p>
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
    const [errors, setErrors] = useState({});
    
    const navigate = useNavigate();
    const { setUser } = useAppStore();

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
            setUser(response.user); 
            toast.success(response.message || "Welcome back!");
            navigate("/dashboard");
        } catch (error) {
            setErrors({ form: error.message || "Invalid credentials." });
            toast.error(error.message || "Invalid credentials.");
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
                <form className="login-form" onSubmit={handleSubmit}>
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

                    <button type="submit" className="login-form__button">Login</button>

                    {/* CORRECTED: Only dentists see the signup link */}
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