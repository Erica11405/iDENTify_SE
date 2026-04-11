// import React, { useState } from "react";
// import { useNavigate, Link } from "react-router-dom";
// import toast from "react-hot-toast";
// import api from "../api/apiClient";
// import toothLogo from "../assets/toothlogo.svg";
// import "../styles/pages/Signup.css"; 

// function SignUp() {
// 	const [firstName, setFirstName] = useState("");
// 	const [surname, setSurname] = useState("");
// 	const [email, setEmail] = useState("");
// 	const [password, setPassword] = useState("");
// 	const [confirmPassword, setConfirmPassword] = useState(""); 
// 	const [showPassword, setShowPassword] = useState(false);
    
//     // OTP States
//     const [isOtpStep, setIsOtpStep] = useState(false);
//     const [otpCode, setOtpCode] = useState("");

// 	const [errors, setErrors] = useState({});
// 	const navigate = useNavigate();

// 	const handleInputChange = (field, value) => {
// 		setErrors((prev) => ({ ...prev, [field]: null }));
// 		if (field === "firstName") setFirstName(value);
// 		if (field === "surname") setSurname(value);
// 		if (field === "email") setEmail(value);
// 		if (field === "password") setPassword(value);
// 		if (field === "confirmPassword") setConfirmPassword(value);
//         if (field === "otp") setOtpCode(value);
// 	};

//     // Step 1: Validate form and request OTP
// 	const handleSendOtp = async (e) => {
// 		e.preventDefault();
// 		const newErrors = {};

// 		if (!firstName.trim()) newErrors.firstName = "First name is required";
// 		if (!surname.trim()) newErrors.surname = "Surname is required";
// 		if (!email.trim()) newErrors.email = "Email is required";
// 		if (password.length < 6) newErrors.password = "Password must be at least 6 characters";
// 		if (password !== confirmPassword) newErrors.confirmPassword = "Passwords do not match";

// 		if (Object.keys(newErrors).length > 0) {
// 			setErrors(newErrors);
// 			return;
// 		}

// 		try {
//             // Ask backend to send an email verification code
// 			await api.sendSignupOtp({ email });
// 			toast.success("Verification code sent to your email!");
//             setIsOtpStep(true);
// 		} catch (error) {
// 			toast.error(error.message || "Failed to send verification code.");
//             setErrors({ form: error.message });
// 		}
// 	};

//     // Step 2: Verify OTP and finalize account creation
//     const handleVerifyAndSignup = async (e) => {
//         e.preventDefault();
//         if (!otpCode.trim()) {
//             setErrors({ otp: "Verification code is required" });
//             return;
//         }

//         try {
// 			await api.signupDentist({ firstName, surname, email, password, otp: otpCode });
// 			toast.success("Account verified and created! You can now log in.");
// 			navigate("/");
// 		} catch (error) {
// 			toast.error(error.message || "Signup failed.");
//             setErrors({ form: error.message });
// 		}
//     }

// 	return (
// 		<div className="signup-page">
// 			<div className="signup-visual">
// 				<div className="signup-visual__header">
// 					<h1 className="signup-visual__title">Welcome to iDENTify</h1>
// 					<p className="signup-visual__subtitle">Dental Clinic Management System</p>
// 				</div>
// 			</div>

// 			<div className="signup-form-container">
//                 {!isOtpStep ? (
//                     <form className="signup-form" onSubmit={handleSendOtp}>
//                         <div className="signup-form__header-center">
//                             <div className="logo-circle-large">
//                                 <img src={toothLogo} alt="iDENTify Logo" className="signup-logo-large" />
//                             </div>
//                             <h2 className="signup-form__title">Dentist Registration</h2>
//                             <p className="signup-form__subtitle">Create your administrative account</p>
//                         </div>

//                         {errors.form && <div className="error-banner" style={{color: 'red', textAlign: 'center', marginBottom: '10px'}}>{errors.form}</div>}

//                         <div className="signup-form__group">
//                             <label>First Name</label>
//                             <input type="text" value={firstName} onChange={(e) => handleInputChange("firstName", e.target.value)} placeholder="Jane" className={errors.firstName ? "input-error" : ""} />
//                             {errors.firstName && <span className="error-text">{errors.firstName}</span>}
//                         </div>

//                         <div className="signup-form__group">
//                             <label>Surname</label>
//                             <input type="text" value={surname} onChange={(e) => handleInputChange("surname", e.target.value)} placeholder="Doe" className={errors.surname ? "input-error" : ""} />
//                             {errors.surname && <span className="error-text">{errors.surname}</span>}
//                         </div>

//                         <div className="signup-form__group">
//                             <label>Email</label>
//                             <input type="email" value={email} onChange={(e) => handleInputChange("email", e.target.value)} placeholder="name@email.com" className={errors.email ? "input-error" : ""} />
//                             {errors.email && <span className="error-text">{errors.email}</span>}
//                         </div>

//                         <div className="signup-form__group">
//                             <label>Password</label>
//                             <div className="password-input-wrapper">
//                                 <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => handleInputChange("password", e.target.value)} placeholder="••••••••" className={errors.password ? "input-error" : ""} />
//                                 <button type="button" className="password-toggle-btn" onClick={() => setShowPassword(!showPassword)}>{showPassword ? "Hide" : "Show"}</button>
//                             </div>
//                             {errors.password && <span className="error-text">{errors.password}</span>}
//                         </div>

//                         <div className="signup-form__group">
//                             <label>Confirm Password</label>
//                             <input type={showPassword ? "text" : "password"} value={confirmPassword} onChange={(e) => handleInputChange("confirmPassword", e.target.value)} placeholder="••••••••" className={errors.confirmPassword ? "input-error" : ""} />
//                             {errors.confirmPassword && <span className="error-text">{errors.confirmPassword}</span>}
//                         </div>

//                         <button type="submit" className="signup-form__button">Verify Email</button>
//                         <p style={{ textAlign: "center", marginTop: "15px" }}>
//                             Already have an account? <Link to="/" style={{ color: "var(--primary-color)", fontWeight: "bold" }}>Log in here</Link>
//                         </p>
//                     </form>
//                 ) : (
//                     <form className="signup-form" onSubmit={handleVerifyAndSignup}>
//                         <div className="signup-form__header-center">
//                             <div className="logo-circle-large">
//                                 <img src={toothLogo} alt="iDENTify Logo" className="signup-logo-large" />
//                             </div>
//                             <h2 className="signup-form__title">Verify Your Email</h2>
//                             <p className="signup-form__subtitle">We sent a 6-digit code to <strong>{email}</strong></p>
//                         </div>

//                         {errors.form && <div className="error-banner" style={{color: 'red', textAlign: 'center', marginBottom: '10px'}}>{errors.form}</div>}

//                         <div className="signup-form__group">
//                             <label htmlFor="otp">Verification Code</label>
//                             <input 
//                                 type="text" 
//                                 id="otp" 
//                                 value={otpCode} 
//                                 onChange={(e) => handleInputChange("otp", e.target.value)} 
//                                 placeholder="Enter 6-digit code" 
//                                 maxLength="6"
//                                 style={{ textAlign: "center", fontSize: "1.2rem", letterSpacing: "5px" }}
//                                 className={errors.otp ? "input-error" : ""} 
//                             />
//                             {errors.otp && <span className="error-text">{errors.otp}</span>}
//                         </div>

//                         <button type="submit" className="signup-form__button">Create Account</button>
                        
//                         <p style={{ textAlign: "center", marginTop: "15px" }}>
//                             <button 
//                                 type="button" 
//                                 onClick={() => setIsOtpStep(false)} 
//                                 style={{ background: "none", border: "none", color: "var(--primary-color)", cursor: "pointer", fontWeight: "bold" }}
//                             >
//                                 &larr; Back to Details
//                             </button>
//                         </p>
//                     </form>
//                 )}
// 			</div>
// 		</div>
// 	);
// }

// export default SignUp;


import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../api/apiClient";
import toothLogo from "../assets/toothlogo.svg";
import "../styles/pages/Signup.css"; 

function SignUp() {
	const [firstName, setFirstName] = useState("");
	const [middleName, setMiddleName] = useState(""); // New Middle Name state
	const [surname, setSurname] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState(""); 
	const [showPassword, setShowPassword] = useState(false);
    
    // OTP States
    const [isOtpStep, setIsOtpStep] = useState(false);
    const [otpCode, setOtpCode] = useState("");

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
        if (field === "otp") setOtpCode(value);
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
            setIsOtpStep(true);
		} catch (error) {
			toast.error(error.message || "Failed to send verification code.");
            setErrors({ form: error.message });
		}
	};

    // Step 2: Verify OTP and finalize account creation
    const handleVerifyAndSignup = async (e) => {
        e.preventDefault();
        if (!otpCode.trim()) {
            setErrors({ otp: "Verification code is required" });
            return;
        }

        try {
			await api.signupSuperadmin({ firstName, middleName, surname, email, password, confirmPassword, otp: otpCode });
			toast.success("Super admin account verified and created! You can now log in.");
			navigate("/");
		} catch (error) {
			toast.error(error.message || "Signup failed.");
            setErrors({ form: error.message });
		}
    }

	return (
		<div className="signup-page">
			<div className="signup-visual">
				<div className="signup-visual__header">
					<h1 className="signup-visual__title">Welcome to iDENTify</h1>
					<p className="signup-visual__subtitle">Dental Clinic Management System</p>
				</div>
			</div>

			<div className="signup-form-container">
                {!isOtpStep ? (
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

                        <button type="submit" className="signup-form__button">Verify Email</button>
                        <p style={{ textAlign: "center", marginTop: "15px" }}>
                            Already have an account? <Link to="/" style={{ color: "var(--primary-color)", fontWeight: "bold" }}>Log in here</Link>
                        </p>
                    </form>
                ) : (
                    <form className="signup-form" onSubmit={handleVerifyAndSignup}>
                        <div className="signup-form__header-center">
                            <div className="logo-circle-large">
                                <img src={toothLogo} alt="iDENTify Logo" className="signup-logo-large" />
                            </div>
                            <h2 className="signup-form__title">Verify Your Email</h2>
                            <p className="signup-form__subtitle">We sent a 6-digit code to <strong>{email}</strong></p>
                        </div>

                        {errors.form && <div className="error-banner" style={{color: 'red', textAlign: 'center', marginBottom: '10px'}}>{errors.form}</div>}

                        <div className="signup-form__group">
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

                        <button type="submit" className="signup-form__button">Create Account</button>
                        
                        <p style={{ textAlign: "center", marginTop: "15px" }}>
                            <button 
                                type="button" 
                                onClick={() => setIsOtpStep(false)} 
                                style={{ background: "none", border: "none", color: "var(--primary-color)", cursor: "pointer", fontWeight: "bold" }}
                            >
                                &larr; Back to Details
                            </button>
                        </p>
                    </form>
                )}
			</div>
		</div>
	);
}

export default SignUp;