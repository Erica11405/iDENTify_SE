const express = require('express');
const router = express.Router();
const db = require('../db'); 
const bcrypt = require('bcrypt');
const { sendEmail } = require('../utils/mailer');
const resend = require('../utils/resend');
const { emailOTPtemplate } = require('../utils/emailOTPtemplate');
const {
    normalizeApprovalStatus,
    getUserTenantAssignment,
    getTenantLifecycleStatus,
    getLifecycleBlockMessage,
} = require('../utils/accessControl');

const OTP_EXPIRY_MS = 10 * 60 * 1000;
const LOGIN_OTP_ROLES = new Set(['dentist', 'aide']);

// Temporary in-memory store for Sign-Up OTPs
const signupOtpStore = new Map();
let signupOtpTableReady = false;
let signupOtpTableUnavailable = false;
let hasPasswordChangeRequiredColumnCache = null;
let hasApprovalStatusColumnCache = null;
let hasSuperadminRequestsTableCache = null;
let hasLoginAuditEventsTableCache = null;

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

function toPositiveInt(value) {
    const parsed = Number.parseInt(String(value || ''), 10);
    if (!Number.isFinite(parsed) || parsed <= 0) return null;
    return parsed;
}

function isMailerNotConfiguredError(error) {
    const message = String(error?.message || '').toLowerCase();
    return message.includes('mailer is not configured') || message.includes('mailer credentials are not configured');
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

async function hasSuperadminRequestsTable() {
    if (hasSuperadminRequestsTableCache !== null) {
        return hasSuperadminRequestsTableCache;
    }

    try {
        const [rows] = await db.query("SHOW TABLES LIKE 'superadmin_access_requests'");
        hasSuperadminRequestsTableCache = rows.length > 0;
    } catch (_err) {
        hasSuperadminRequestsTableCache = false;
    }

    return hasSuperadminRequestsTableCache;
}

async function isSuperadminWorkflowReady() {
    const [supportsApprovalStatus, hasRequestsTable] = await Promise.all([
        hasApprovalStatusColumn(),
        hasSuperadminRequestsTable(),
    ]);

    return supportsApprovalStatus && hasRequestsTable;
}

async function hasLoginAuditEventsTable() {
    if (hasLoginAuditEventsTableCache !== null) {
        return hasLoginAuditEventsTableCache;
    }

    try {
        const [rows] = await db.query("SHOW TABLES LIKE 'login_audit_events'");
        hasLoginAuditEventsTableCache = rows.length > 0;
    } catch (_err) {
        hasLoginAuditEventsTableCache = false;
    }

    return hasLoginAuditEventsTableCache;
}

function resolveClientIp(req) {
    const forwarded = String(req.headers['x-forwarded-for'] || '').trim();
    if (forwarded) {
        return forwarded.split(',')[0].trim();
    }

    return String(req.socket?.remoteAddress || req.ip || '').trim() || null;
}

function isStaffLifecycleRole(role) {
    return role === 'superadmin' || role === 'dentist' || role === 'aide';
}

async function resolveLifecycleBlockForUser(userRecord) {
    const role = normalizeRole(userRecord?.role);
    if (!isStaffLifecycleRole(role)) return null;

    let clinicId = toPositiveInt(userRecord?.clinic_id);
    let branchId = toPositiveInt(userRecord?.branch_id);

    if (!clinicId && !branchId && userRecord?.id) {
        const assignment = await getUserTenantAssignment(userRecord.id);
        clinicId = assignment.clinicId;
        branchId = assignment.branchId;
    }

    if (!clinicId && !branchId) return null;

    try {
        const lifecycle = await getTenantLifecycleStatus({ clinicId, branchId });
        const message = getLifecycleBlockMessage(lifecycle, { action: 'login' });

        if (!message) return null;

        return {
            message,
            lifecycle,
            clinicId,
            branchId,
        };
    } catch (error) {
        console.error('Failed to evaluate tenant lifecycle during login:', error);
        return null;
    }
}

async function writeLoginAuditEvent({ req, userRecord = null, email = null, role = null, outcome = 'failed', failureReason = null }) {
    const hasAuditTable = await hasLoginAuditEventsTable();
    if (!hasAuditTable) return;

    const userId = toPositiveInt(userRecord?.id);
    const normalizedRole = normalizeRole(role || userRecord?.role);

    let clinicId = toPositiveInt(userRecord?.clinic_id);
    let branchId = toPositiveInt(userRecord?.branch_id);

    if (!clinicId && !branchId && userId) {
        const assignment = await getUserTenantAssignment(userId);
        clinicId = assignment.clinicId;
        branchId = assignment.branchId;
    }

    try {
        await db.query(
            `INSERT INTO login_audit_events (
                user_id,
                attempted_email,
                role,
                clinic_id,
                branch_id,
                outcome,
                failure_reason,
                ip_address,
                user_agent
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                userId || null,
                email || userRecord?.email || null,
                normalizedRole || null,
                clinicId || null,
                branchId || null,
                String(outcome || 'failed').slice(0, 32),
                failureReason ? String(failureReason).slice(0, 255) : null,
                resolveClientIp(req),
                String(req.headers['user-agent'] || '').slice(0, 500) || null,
            ]
        );
    } catch (error) {
        console.error('Failed to write login audit event:', error.message || error);
    }
}

async function sendOtpEmail({ email, name, otpCode, subject, introText }) {
    await sendEmail({
        to: email,
        subject,
        text: `Hello ${name || 'there'},\n\n${introText}: ${otpCode}\n\nThis code will expire in 10 minutes.`,
    });
}

async function sendOtpEmailViaResend({ email, name, otpCode, subject }) {
    await resend.sendEmail({
        to: email,
        subject,
        html: emailOTPtemplate(otpCode, name),
    });
}

async function ensureEmailNotRegistered(email) {
    try {
        const [existingUser] = await db.query('SELECT id FROM users WHERE email = ? LIMIT 1', [email]);
        return existingUser.length === 0;
    } catch (err) {
        if (err.code === 'ER_NO_SUCH_TABLE') return true; // Assume available if table doesn't exist yet (migrations will create it)
        throw err;
    }
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
        const workflowReady = await isSuperadminWorkflowReady();
        if (!workflowReady) {
            return res.status(503).json({
                error: 'Superadmin approval workflow is not configured yet. Run latest migration first.',
                code: 'SUPERADMIN_WORKFLOW_NOT_CONFIGURED',
            });
        }

        const isAvailable = await ensureEmailNotRegistered(email);
        if (!isAvailable) {
            return res.status(400).json({ error: 'Email is already registered.' });
        }

        const otpCode = generateOtpCode();
        const expiresAt = Date.now() + OTP_EXPIRY_MS;

        await saveSignupOtp('superadmin', email, otpCode, expiresAt);

        await sendOtpEmailViaResend({
            email,
            otpCode,
            subject: 'Verify your iDENTify Super Admin Registration',
        });

        res.status(200).json({ message: 'Verification code sent to email.' });
    } catch (err) {
        console.error('Super Admin OTP Send Error:', err);
        
        if (err.message && err.message.includes('RESEND_API_KEY')) {
            return res.status(503).json({ 
                error: 'Email service is not configured. Set RESEND_API_KEY in backend .env.' 
            });
        }
        
        if (isMailerNotConfiguredError(err)) {
            return res.status(503).json({
                error: 'OTP email service is not configured. Set MAILER_USER, MAILER_PASS, and MAILER_FROM in backend .env.',
            });
        }
        res.status(500).json({ error: 'Failed to send verification email: ' + (err.message || 'Unknown error') });
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
        const workflowReady = await isSuperadminWorkflowReady();
        if (!workflowReady) {
            return res.status(503).json({
                error: 'Superadmin approval workflow is not configured yet. Run latest migration first.',
                code: 'SUPERADMIN_WORKFLOW_NOT_CONFIGURED',
            });
        }

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

        await clearSignupOtp('superadmin', email);

        res.status(201).json({
            message: 'Super admin account created. Please submit your requirements for approval.',
            approval_status: 'pending_requirements',
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
        if (isMailerNotConfiguredError(err)) {
            return res.status(503).json({
                error: 'OTP email service is not configured. Set MAILER_USER, MAILER_PASS, and MAILER_FROM in backend .env.',
            });
        }
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
        if (users.length === 0) {
            await writeLoginAuditEvent({
                req,
                email,
                outcome: 'failed',
                failureReason: 'account_not_found',
            });
            return res.status(404).json({ error: "Account not found." });
        }

        const userRecord = users[0];
        const role = normalizeRole(userRecord.role);
        const requirePasswordChange = Boolean(Number(userRecord.password_change_required || 0));

        if (Number(userRecord.is_archived) === 1) {
            await writeLoginAuditEvent({
                req,
                userRecord,
                email,
                outcome: 'blocked',
                failureReason: 'account_archived',
            });
            return res.status(403).json({ error: 'This account has been archived. Please contact the super admin.' });
        }

        const isMatch = await bcrypt.compare(password, userRecord.password_hash);
        if (!isMatch) {
            await writeLoginAuditEvent({
                req,
                userRecord,
                email,
                outcome: 'failed',
                failureReason: 'invalid_password',
            });
            return res.status(401).json({ error: "Invalid password." });
        }

        const lifecycleBlock = await resolveLifecycleBlockForUser(userRecord);
        if (lifecycleBlock) {
            await writeLoginAuditEvent({
                req,
                userRecord,
                email,
                outcome: 'blocked',
                failureReason: lifecycleBlock.message,
            });
            return res.status(403).json({
                error: lifecycleBlock.message,
                code: 'TENANT_LIFECYCLE_BLOCKED',
                lifecycle: lifecycleBlock.lifecycle,
            });
        }

        if (role === 'superadmin' || role === 'globaladmin') {
            if (role === 'superadmin') {
                const workflowReady = await isSuperadminWorkflowReady();
                if (!workflowReady) {
                    await writeLoginAuditEvent({
                        req,
                        userRecord,
                        email,
                        outcome: 'blocked',
                        failureReason: 'superadmin_workflow_not_configured',
                    });
                    return res.status(503).json({
                        error: 'Superadmin approval workflow is not configured yet. Run latest migration first.',
                        code: 'SUPERADMIN_WORKFLOW_NOT_CONFIGURED',
                    });
                }
            }

            const approvalStatus = normalizeApprovalStatus(userRecord.approval_status);
            await writeLoginAuditEvent({
                req,
                userRecord,
                email,
                outcome: 'success',
            });
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
            await writeLoginAuditEvent({
                req,
                userRecord,
                email,
                outcome: 'failed',
                failureReason: 'unsupported_role',
            });
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

        await writeLoginAuditEvent({
            req,
            userRecord,
            email,
            outcome: 'otp_challenge',
        });

        res.status(200).json({
            message: "OTP sent to your email",
            requireOtp: true,
            email,
        });

    } catch (err) {
        console.error("Login Crash:", err);
        await writeLoginAuditEvent({
            req,
            email,
            outcome: 'failed',
            failureReason: 'server_error',
        });
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
        if (users.length === 0) {
            await writeLoginAuditEvent({
                req,
                email,
                outcome: 'failed',
                failureReason: 'otp_account_not_found',
            });
            return res.status(404).json({ error: "Account not found." });
        }

        const userRecord = users[0];
        const role = normalizeRole(userRecord.role);
        const requirePasswordChange = Boolean(Number(userRecord.password_change_required || 0));

        if (Number(userRecord.is_archived) === 1) {
            await writeLoginAuditEvent({
                req,
                userRecord,
                email,
                outcome: 'blocked',
                failureReason: 'account_archived',
            });
            return res.status(403).json({ error: 'This account has been archived. Please contact the super admin.' });
        }

        if (role === 'superadmin' || role === 'globaladmin') {
            await writeLoginAuditEvent({
                req,
                userRecord,
                email,
                outcome: 'failed',
                failureReason: 'otp_not_required_for_admin',
            });
            return res.status(400).json({ error: 'Admin accounts do not require OTP during login.' });
        }

        if (!LOGIN_OTP_ROLES.has(role)) {
            await writeLoginAuditEvent({
                req,
                userRecord,
                email,
                outcome: 'failed',
                failureReason: 'unsupported_role',
            });
            return res.status(403).json({ error: 'Unsupported account role.' });
        }

        if (!userRecord.otp_code || userRecord.otp_code !== otp) {
            await writeLoginAuditEvent({
                req,
                userRecord,
                email,
                outcome: 'failed',
                failureReason: 'invalid_otp',
            });
            return res.status(400).json({ error: "Invalid verification code." });
        }

        if (new Date() > new Date(userRecord.otp_expires_at)) {
            await writeLoginAuditEvent({
                req,
                userRecord,
                email,
                outcome: 'failed',
                failureReason: 'otp_expired',
            });
            return res.status(400).json({ error: "Verification code has expired." });
        }

        const lifecycleBlock = await resolveLifecycleBlockForUser(userRecord);
        if (lifecycleBlock) {
            await writeLoginAuditEvent({
                req,
                userRecord,
                email,
                outcome: 'blocked',
                failureReason: lifecycleBlock.message,
            });
            return res.status(403).json({
                error: lifecycleBlock.message,
                code: 'TENANT_LIFECYCLE_BLOCKED',
                lifecycle: lifecycleBlock.lifecycle,
            });
        }

        await db.query('UPDATE users SET otp_code = NULL, otp_expires_at = NULL WHERE id = ?', [userRecord.id]);

        await writeLoginAuditEvent({
            req,
            userRecord,
            email,
            outcome: 'success',
        });

        res.status(200).json({ 
            message: "Login successful", 
            requirePasswordChange,
            user: toPublicUser(userRecord),
        });

    } catch (err) {
        console.error("OTP Verification Error:", err);
        await writeLoginAuditEvent({
            req,
            email,
            outcome: 'failed',
            failureReason: 'otp_server_error',
        });
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