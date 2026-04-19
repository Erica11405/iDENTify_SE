const express = require('express');
const router = express.Router();
const db = require('../db'); 
const bcrypt = require('bcrypt');
const { sendEmail } = require('../utils/mailer');
const { normalizeApprovalStatus } = require('../utils/accessControl');

const OTP_EXPIRY_MS = 10 * 60 * 1000;
const LOGIN_OTP_ROLES = new Set(['dentist', 'aide']);

// Temporary in-memory store for Sign-Up OTPs
const signupOtpStore = new Map();
let signupOtpTableReady = false;
let signupOtpTableUnavailable = false;
let hasPasswordChangeRequiredColumnCache = null;
let hasApprovalStatusColumnCache = null;

function normalizeRole(role) {
    const normalized = String(role || '').trim().toLowerCase();
    if (normalized === 'super_admin') return 'superadmin';
    return normalized;
}

function toEmail(value) {
    return String(value || '').trim().toLowerCase();
}

function getSignupOtpKey(scope, email) {
    return `${scope}:${toEmail(email)}`;
}

function normalizeOtp(value) {
    return String(value || '').replace(/\D/g, '');
}

function generateOtpCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

function composeFullName(firstName, middleName, surname) {
    return [firstName, middleName, surname]
        .map((part) => String(part || '').trim())
        .filter(Boolean)
        .join(' ');
}

function toPublicUser(userRecord) {
    return {
        id: userRecord.id,
        name: userRecord.full_name || userRecord.email,
        email: userRecord.email,
        role: normalizeRole(userRecord.role),
        dentist_id: userRecord.dentist_id || null,
        clinic_id: userRecord.clinic_id || null,
        branch_id: userRecord.branch_id || null,
        require_password_change: Boolean(Number(userRecord.password_change_required || 0)),
        approval_status: normalizeApprovalStatus(userRecord.approval_status),
    };
}

async function hasPasswordChangeRequiredColumn() {
    if (hasPasswordChangeRequiredColumnCache !== null) {
        return hasPasswordChangeRequiredColumnCache;
    }

    try {
        const [rows] = await db.query("SHOW COLUMNS FROM users LIKE 'password_change_required'");
        hasPasswordChangeRequiredColumnCache = rows.length > 0;
    } catch (_err) {
        hasPasswordChangeRequiredColumnCache = false;
    }

    return hasPasswordChangeRequiredColumnCache;
}

async function hasApprovalStatusColumn() {
    if (hasApprovalStatusColumnCache !== null) {
        return hasApprovalStatusColumnCache;
    }

    try {
        const [rows] = await db.query("SHOW COLUMNS FROM users LIKE 'approval_status'");
        hasApprovalStatusColumnCache = rows.length > 0;
    } catch (_err) {
        hasApprovalStatusColumnCache = false;
    }

    return hasApprovalStatusColumnCache;
}

async function sendOtpEmail({ email, name, otpCode, subject, introText }) {
    await sendEmail({
        to: email,
        subject,
        text: `Hello ${name || 'there'},\n\n${introText}: ${otpCode}\n\nThis code will expire in 10 minutes.`,
    });
}

async function ensureEmailNotRegistered(email) {
    const [existingUser] = await db.query('SELECT id FROM users WHERE email = ? LIMIT 1', [email]);
    return existingUser.length === 0;
}

async function ensureSignupOtpTable() {
    if (signupOtpTableReady) return true;
    if (signupOtpTableUnavailable) return false;

    try {
        await db.query(
            `CREATE TABLE IF NOT EXISTS signup_otp_codes (
                scope VARCHAR(32) NOT NULL,
                email VARCHAR(255) NOT NULL,
                otp_code VARCHAR(10) NOT NULL,
                expires_at DATETIME NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (scope, email)
            )`
        );
        signupOtpTableReady = true;
        return true;
    } catch (err) {
        signupOtpTableUnavailable = true;
        console.warn('Signup OTP table unavailable, using in-memory fallback only:', err.message);
        return false;
    }
}

async function saveSignupOtp(scope, email, otpCode, expiresAt) {
    const scopedKey = getSignupOtpKey(scope, email);
    const value = { otpCode, expiresAt };

    signupOtpStore.set(scopedKey, value);
    // Legacy fallback key for compatibility if older logic referenced plain email.
    signupOtpStore.set(email, value);

    const canPersist = await ensureSignupOtpTable();
    if (!canPersist) return;

    try {
        await db.query(
            `INSERT INTO signup_otp_codes (scope, email, otp_code, expires_at)
             VALUES (?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE otp_code = VALUES(otp_code), expires_at = VALUES(expires_at), created_at = CURRENT_TIMESTAMP`,
            [scope, email, otpCode, new Date(expiresAt)]
        );
    } catch (err) {
        console.error('Failed to persist signup OTP:', err);
    }
}

async function getSignupOtpRecord(scope, email) {
    const scopedKey = getSignupOtpKey(scope, email);
    const memoryRecord = signupOtpStore.get(scopedKey) || signupOtpStore.get(email);
    if (memoryRecord) return memoryRecord;

    const canPersist = await ensureSignupOtpTable();
    if (!canPersist) return null;

    try {
        const [rows] = await db.query(
            `SELECT otp_code, expires_at FROM signup_otp_codes WHERE scope = ? AND email = ? LIMIT 1`,
            [scope, email]
        );
        if (!rows.length) return null;

        const row = rows[0];
        return {
            otpCode: String(row.otp_code || ''),
            expiresAt: new Date(row.expires_at).getTime(),
        };
    } catch (err) {
        console.error('Failed to read persisted signup OTP:', err);
        return null;
    }
}

async function clearSignupOtp(scope, email) {
    signupOtpStore.delete(getSignupOtpKey(scope, email));
    signupOtpStore.delete(email);

    const canPersist = await ensureSignupOtpTable();
    if (!canPersist) return;

    try {
        await db.query(`DELETE FROM signup_otp_codes WHERE scope = ? AND email = ?`, [scope, email]);
    } catch (err) {
        console.error('Failed to clear persisted signup OTP:', err);
    }
}

// --- STEP 1: SEND OTP FOR SUPER ADMIN SIGN UP ---
router.post('/signup/superadmin/send-otp', async (req, res) => {
    const email = toEmail(req.body?.email);

    if (!email) {
        return res.status(400).json({ error: 'Email is required.' });
    }

    try {
        const isAvailable = await ensureEmailNotRegistered(email);
        if (!isAvailable) {
            return res.status(400).json({ error: 'Email is already registered.' });
        }

        const otpCode = generateOtpCode();
        const expiresAt = Date.now() + OTP_EXPIRY_MS;

        await saveSignupOtp('superadmin', email, otpCode, expiresAt);

        await sendOtpEmail({
            email,
            otpCode,
            subject: 'Verify your iDENTify Super Admin Registration',
            introText: 'Your registration verification code is',
        });

        res.status(200).json({ message: 'Verification code sent to email.' });
    } catch (err) {
        console.error('Super Admin OTP Send Error:', err);
        res.status(500).json({ error: 'Failed to send verification email.' });
    }
});

// --- STEP 2: VERIFY OTP & CREATE SUPER ADMIN ACCOUNT ---
router.post('/signup/superadmin', async (req, res) => {
    const {
        firstName,
        middleName,
        surname,
        email: rawEmail,
        password,
        confirmPassword,
        otp: rawOtp,
    } = req.body || {};

    const email = toEmail(rawEmail);
    const otp = normalizeOtp(rawOtp);

    if (!firstName || !surname || !email || !password || !otp) {
        return res.status(400).json({ error: 'First name, surname, email, password, and OTP are required.' });
    }

    if (confirmPassword && password !== confirmPassword) {
        return res.status(400).json({ error: 'Passwords do not match.' });
    }

    try {
        const record = await getSignupOtpRecord('superadmin', email);
        if (!record || normalizeOtp(record.otpCode) !== otp) {
            return res.status(400).json({ error: 'Invalid verification code.' });
        }

        if (Date.now() > record.expiresAt) {
            await clearSignupOtp('superadmin', email);
            return res.status(400).json({ error: 'Verification code has expired. Please sign up again.' });
        }

        const fullName = composeFullName(firstName, middleName, surname);
        const hashedPassword = await bcrypt.hash(password, 10);
        const supportsApprovalStatus = await hasApprovalStatusColumn();

        if (supportsApprovalStatus) {
            await db.query(
                `INSERT INTO users (
                    email,
                    password_hash,
                    full_name,
                    last_name,
                    role,
                    is_verified,
                    is_archived,
                    approval_status,
                    approved_at,
                    approved_by_user_id,
                    declined_at,
                    decline_reason
                )
                VALUES (?, ?, ?, ?, 'superadmin', 1, 0, 'pending_requirements', NULL, NULL, NULL, NULL)`,
                [email, hashedPassword, fullName, String(surname).trim()]
            );
        } else {
            await db.query(
                `INSERT INTO users (email, password_hash, full_name, last_name, role, is_verified, is_archived)
                 VALUES (?, ?, ?, ?, 'superadmin', 1, 0)`,
                [email, hashedPassword, fullName, String(surname).trim()]
            );
        }

        await clearSignupOtp('superadmin', email);

        res.status(201).json({
            message: 'Super admin account created. Please submit your requirements for approval.',
            approval_status: supportsApprovalStatus ? 'pending_requirements' : 'approved',
        });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'This email is already taken.' });
        }
        console.error('Super Admin Signup Error:', err);
        res.status(500).json({ error: 'Server error during sign up.' });
    }
});

// --- STEP 1: SEND OTP FOR DENTIST SIGN UP ---
router.post('/signup/dentist/send-otp', async (req, res) => {
    const email = toEmail(req.body?.email);

    if (!email) {
        return res.status(400).json({ error: 'Email is required.' });
    }

    try {
        const isAvailable = await ensureEmailNotRegistered(email);
        if (!isAvailable) {
            return res.status(400).json({ error: "Email is already registered." });
        }

        const otpCode = generateOtpCode();
        const expiresAt = Date.now() + OTP_EXPIRY_MS;
        
        await saveSignupOtp('dentist', email, otpCode, expiresAt);

        await sendOtpEmail({
            email,
            otpCode,
            subject: 'Verify your iDENTify Registration',
            introText: 'Your registration verification code is',
        });

        res.status(200).json({ message: "Verification code sent to email." });
    } catch (err) {
        console.error("OTP Send Error:", err);
        res.status(500).json({ error: "Failed to send verification email." });
    }
});

// --- STEP 2: VERIFY OTP & CREATE DENTIST ACCOUNT ---
router.post('/signup/dentist', async (req, res) => {
    const { firstName, middleName, surname, email: rawEmail, password, otp: rawOtp } = req.body || {};
    const email = toEmail(rawEmail);
    const otp = normalizeOtp(rawOtp);

    if (!firstName || !surname || !email || !password || !otp) {
        return res.status(400).json({ error: 'First name, surname, email, password, and OTP are required.' });
    }

    try {
        const record = await getSignupOtpRecord('dentist', email);
        if (!record || normalizeOtp(record.otpCode) !== otp) {
            return res.status(400).json({ error: "Invalid verification code." });
        }

        if (Date.now() > record.expiresAt) {
            await clearSignupOtp('dentist', email);
            return res.status(400).json({ error: "Verification code has expired. Please try signing up again." });
        }

        const fullName = composeFullName(firstName, middleName, surname);
        const hashedPassword = await bcrypt.hash(password, 10);

        const dentistSql = `INSERT INTO dentists (name, first_name, middle_name, last_name, email, status) VALUES (?, ?, ?, ?, ?, 'Available')`;
        const [dentistResult] = await db.query(dentistSql, [fullName, firstName, middleName || null, surname, email]);
        const newDentistId = dentistResult.insertId;

        const userSql = `INSERT INTO users (email, password_hash, full_name, last_name, role, dentist_id, is_verified, is_archived) VALUES (?, ?, ?, ?, 'dentist', ?, 1, 0)`;
        await db.query(userSql, [email, hashedPassword, fullName, String(surname).trim(), newDentistId]);

        await clearSignupOtp('dentist', email);

        res.status(201).json({ message: "Dentist account created successfully!" });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: "This email is already taken." });
        }
        console.error('Dentist Signup Error:', err);
        res.status(500).json({ error: "Server error during sign up." });
    }
});

// --- INITIAL LOGIN ---
router.post('/login', async (req, res) => {
    const email = toEmail(req.body?.email);
    const password = String(req.body?.password || '');

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required.' });
    }

    try {
        const [users] = await db.query('SELECT * FROM users WHERE email = ? LIMIT 1', [email]);
        if (users.length === 0) return res.status(404).json({ error: "Account not found." });

        const userRecord = users[0];
        const role = normalizeRole(userRecord.role);
        const requirePasswordChange = Boolean(Number(userRecord.password_change_required || 0));

        if (Number(userRecord.is_archived) === 1) {
            return res.status(403).json({ error: 'This account has been archived. Please contact the super admin.' });
        }

        const isMatch = await bcrypt.compare(password, userRecord.password_hash);
        if (!isMatch) return res.status(401).json({ error: "Invalid password." });

        if (role === 'superadmin' || role === 'globaladmin') {
            const approvalStatus = normalizeApprovalStatus(userRecord.approval_status);
            return res.status(200).json({ 
                message: role === 'globaladmin' || approvalStatus === 'approved'
                    ? 'Login successful'
                    : 'Login successful. Complete your approval process to continue.',
                requireOtp: false, 
                requirePasswordChange,
                user: toPublicUser(userRecord),
            });
        }

        if (!LOGIN_OTP_ROLES.has(role)) {
            return res.status(403).json({ error: 'Unsupported account role.' });
        }

        const otpCode = generateOtpCode();
        const expiresAt = new Date(Date.now() + OTP_EXPIRY_MS);
        
        await db.query('UPDATE users SET otp_code = ?, otp_expires_at = ? WHERE id = ?', [otpCode, expiresAt, userRecord.id]);

        await sendOtpEmail({
            email,
            name: userRecord.full_name,
            otpCode,
            subject: 'Your iDENTify Login Verification Code',
            introText: 'Your login verification code is',
        });

        res.status(200).json({
            message: "OTP sent to your email",
            requireOtp: true,
            email,
        });

    } catch (err) {
        console.error("Login Crash:", err);
        res.status(500).json({ error: "Server crash: " + err.message });
    }
});

// --- VERIFY OTP (Completes login for dentist and aide accounts) ---
router.post('/verify-otp', async (req, res) => {
    const email = toEmail(req.body?.email);
    const otp = String(req.body?.otp || '').trim();

    if (!email || !otp) {
        return res.status(400).json({ error: 'Email and verification code are required.' });
    }

    try {
        const [users] = await db.query('SELECT * FROM users WHERE email = ? LIMIT 1', [email]);
        if (users.length === 0) return res.status(404).json({ error: "Account not found." });

        const userRecord = users[0];
        const role = normalizeRole(userRecord.role);
        const requirePasswordChange = Boolean(Number(userRecord.password_change_required || 0));

        if (Number(userRecord.is_archived) === 1) {
            return res.status(403).json({ error: 'This account has been archived. Please contact the super admin.' });
        }

        if (role === 'superadmin' || role === 'globaladmin') {
            return res.status(400).json({ error: 'Admin accounts do not require OTP during login.' });
        }

        if (!LOGIN_OTP_ROLES.has(role)) {
            return res.status(403).json({ error: 'Unsupported account role.' });
        }

        if (!userRecord.otp_code || userRecord.otp_code !== otp) {
            return res.status(400).json({ error: "Invalid verification code." });
        }

        if (new Date() > new Date(userRecord.otp_expires_at)) {
            return res.status(400).json({ error: "Verification code has expired." });
        }

        await db.query('UPDATE users SET otp_code = NULL, otp_expires_at = NULL WHERE id = ?', [userRecord.id]);

        res.status(200).json({ 
            message: "Login successful", 
            requirePasswordChange,
            user: toPublicUser(userRecord),
        });

    } catch (err) {
        console.error("OTP Verification Error:", err);
        res.status(500).json({ error: "Server crash during OTP verification." });
    }
});

router.post('/change-password', async (req, res) => {
    const email = toEmail(req.body?.email);
    const currentPassword = String(req.body?.currentPassword || '');
    const newPassword = String(req.body?.newPassword || '');
    const confirmPassword = String(req.body?.confirmPassword || '');

    if (!email || !currentPassword || !newPassword) {
        return res.status(400).json({ error: 'Email, current password, and new password are required.' });
    }

    if (newPassword.length < 8) {
        return res.status(400).json({ error: 'New password must be at least 8 characters long.' });
    }

    if (confirmPassword && confirmPassword !== newPassword) {
        return res.status(400).json({ error: 'New password and confirm password do not match.' });
    }

    try {
        const [users] = await db.query('SELECT * FROM users WHERE email = ? LIMIT 1', [email]);
        if (users.length === 0) {
            return res.status(404).json({ error: 'Account not found.' });
        }

        const userRecord = users[0];
        if (Number(userRecord.is_archived) === 1) {
            return res.status(403).json({ error: 'This account has been archived. Please contact the super admin.' });
        }

        const passwordMatches = await bcrypt.compare(currentPassword, userRecord.password_hash);
        if (!passwordMatches) {
            return res.status(401).json({ error: 'Current password is incorrect.' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        const supportsPasswordChangeRequired = await hasPasswordChangeRequiredColumn();

        if (supportsPasswordChangeRequired) {
            await db.query(
                `UPDATE users
                 SET password_hash = ?,
                     password_change_required = 0,
                     otp_code = NULL,
                     otp_expires_at = NULL
                 WHERE id = ?`,
                [hashedPassword, userRecord.id]
            );
        } else {
            await db.query(
                `UPDATE users
                 SET password_hash = ?,
                     otp_code = NULL,
                     otp_expires_at = NULL
                 WHERE id = ?`,
                [hashedPassword, userRecord.id]
            );
        }

        return res.status(200).json({
            message: 'Password updated successfully.',
            user: toPublicUser({ ...userRecord, password_change_required: 0 }),
        });
    } catch (err) {
        console.error('Change Password Error:', err);
        return res.status(500).json({ error: 'Failed to change password.' });
    }
});

module.exports = router;