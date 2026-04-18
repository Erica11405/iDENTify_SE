import React, { useMemo, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../api/apiClient";
import useAppStore from "../store/useAppStore";
import toothLogo from "../assets/toothlogo.svg";
import "../styles/pages/LoginPage.css";

function getHomeRoute(role) {
    if (role === "superadmin" || role === "globaladmin") return "/admin/dashboard";
    return "/dashboard";
}

export default function ChangePasswordRequired() {
    const navigate = useNavigate();
    const { user, setUser, resetStore } = useAppStore();

    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [errors, setErrors] = useState({});

    const userEmail = useMemo(() => String(user?.email || "").trim(), [user?.email]);
    const passwordStrengthHint = useMemo(() => {
        const value = newPassword.trim();
        if (!value) return "Use at least 8 characters with a mix of letters, numbers, and symbols.";
        if (value.length < 8) return "Too short: use at least 8 characters.";

        const checks = [
            /[a-z]/.test(value),
            /[A-Z]/.test(value),
            /\d/.test(value),
            /[^A-Za-z0-9]/.test(value),
        ].filter(Boolean).length;

        if (checks <= 1) return "Weak password. Add upper/lowercase letters, numbers, and symbols.";
        if (checks <= 2) return "Fair password. Add one more character type for stronger security.";
        return "Strong password format.";
    }, [newPassword]);

    if (!user || !userEmail) {
        return <Navigate to="/" replace />;
    }

    const handleSubmit = async (event) => {
        event.preventDefault();

        const nextErrors = {};
        if (!currentPassword.trim()) nextErrors.currentPassword = "Current password is required.";
        if (!newPassword.trim()) nextErrors.newPassword = "New password is required.";
        if (newPassword.trim() && newPassword.trim().length < 8) {
            nextErrors.newPassword = "New password must be at least 8 characters long.";
        }
        if (!confirmPassword.trim()) nextErrors.confirmPassword = "Please confirm your new password.";
        if (newPassword && confirmPassword && newPassword !== confirmPassword) {
            nextErrors.confirmPassword = "New password and confirm password do not match.";
        }

        if (Object.keys(nextErrors).length > 0) {
            setErrors(nextErrors);
            return;
        }

        setSubmitting(true);
        setErrors({});

        try {
            const response = await api.changePassword({
                email: userEmail,
                currentPassword,
                newPassword,
                confirmPassword,
            });

            const responseUser = response?.user && typeof response.user === "object" ? response.user : {};
            const updatedUser = {
                ...user,
                ...responseUser,
                require_password_change: false,
                requirePasswordChange: false,
            };

            setUser(updatedUser);
            toast.success(response?.message || "Password updated successfully.");
            navigate(getHomeRoute(updatedUser.role), { replace: true });
        } catch (error) {
            const message = error?.message || "Failed to update password.";
            setErrors({ form: message });
            toast.error(message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="login-page">
            <div className="login-visual">
                <div className="login-visual__header">
                    <span className="login-visual__eyebrow">Account Security</span>
                    <h1 className="login-visual__title">Password Update Required</h1>
                    <p className="login-visual__subtitle">
                        For security, please replace your temporary password before you continue.
                    </p>
                </div>
            </div>

            <div className="login-form-container">
                <form className="login-form" onSubmit={handleSubmit}>
                    <div className="login-form__header-center">
                        <div className="logo-circle-large">
                            <img src={toothLogo} alt="iDENTify Logo" className="login-logo-large" />
                        </div>
                        <h2 className="login-form__title">Set Your New Password</h2>
                        <p className="login-form__subtitle">Signed in as <strong>{userEmail}</strong></p>
                    </div>

                    {errors.form ? (
                        <div className="error-banner">{errors.form}</div>
                    ) : null}

                    <div className="login-form__group">
                        <label htmlFor="currentPassword">Current Password</label>
                        <div className="password-input-wrapper">
                            <input
                                id="currentPassword"
                                type={showCurrentPassword ? "text" : "password"}
                                value={currentPassword}
                                autoComplete="current-password"
                                onChange={(event) => {
                                    setCurrentPassword(event.target.value);
                                    setErrors((prev) => ({ ...prev, currentPassword: null, form: null }));
                                }}
                                placeholder="Enter your current password"
                                className={errors.currentPassword ? "input-error" : ""}
                            />
                            <button
                                type="button"
                                className="password-toggle-btn"
                                aria-label={showCurrentPassword ? "Hide current password" : "Show current password"}
                                onClick={() => setShowCurrentPassword((prev) => !prev)}
                            >
                                {showCurrentPassword ? "Hide" : "Show"}
                            </button>
                        </div>
                        {errors.currentPassword ? <span className="error-text">{errors.currentPassword}</span> : null}
                    </div>

                    <div className="login-form__group">
                        <label htmlFor="newPassword">New Password</label>
                        <div className="password-input-wrapper">
                            <input
                                id="newPassword"
                                type={showNewPassword ? "text" : "password"}
                                value={newPassword}
                                autoComplete="new-password"
                                onChange={(event) => {
                                    setNewPassword(event.target.value);
                                    setErrors((prev) => ({ ...prev, newPassword: null, confirmPassword: null, form: null }));
                                }}
                                placeholder="Create a new password"
                                className={errors.newPassword ? "input-error" : ""}
                            />
                            <button
                                type="button"
                                className="password-toggle-btn"
                                aria-label={showNewPassword ? "Hide new password" : "Show new password"}
                                onClick={() => setShowNewPassword((prev) => !prev)}
                            >
                                {showNewPassword ? "Hide" : "Show"}
                            </button>
                        </div>
                        <span className="login-form__hint">{passwordStrengthHint}</span>
                        {errors.newPassword ? <span className="error-text">{errors.newPassword}</span> : null}
                    </div>

                    <div className="login-form__group">
                        <label htmlFor="confirmPassword">Confirm New Password</label>
                        <div className="password-input-wrapper">
                            <input
                                id="confirmPassword"
                                type={showConfirmPassword ? "text" : "password"}
                                value={confirmPassword}
                                autoComplete="new-password"
                                onChange={(event) => {
                                    setConfirmPassword(event.target.value);
                                    setErrors((prev) => ({ ...prev, confirmPassword: null, form: null }));
                                }}
                                placeholder="Re-enter your new password"
                                className={errors.confirmPassword ? "input-error" : ""}
                            />
                            <button
                                type="button"
                                className="password-toggle-btn"
                                aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                                onClick={() => setShowConfirmPassword((prev) => !prev)}
                            >
                                {showConfirmPassword ? "Hide" : "Show"}
                            </button>
                        </div>
                        {errors.confirmPassword ? <span className="error-text">{errors.confirmPassword}</span> : null}
                    </div>

                    <button type="submit" className="login-form__button" disabled={submitting}>
                        {submitting ? "Updating Password..." : "Update Password"}
                    </button>

                    <p className="login-form__secondary-actions">
                        <button
                            type="button"
                            onClick={() => {
                                resetStore();
                                navigate("/", { replace: true });
                            }}
                            className="login-form__text-button"
                        >
                            Sign Out
                        </button>
                        <span className="login-form__divider">|</span>
                        <Link to="/download" className="login-form__text-link">
                            Download App
                        </Link>
                    </p>
                </form>
            </div>
        </div>
    );
}
