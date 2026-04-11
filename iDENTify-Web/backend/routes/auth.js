// const express = require('express');
// const router = express.Router();
// const db = require('../db'); 
// const bcrypt = require('bcrypt');
// const nodemailer = require('nodemailer');

// // Configure your email transporter
// const transporter = nodemailer.createTransport({
//     service: 'gmail',
//     auth: {
//         user: 'ericaaquino0114@gmail.com', 
//         pass: 'seumvvibmpgzzseg' 
//     }
// });

// // Temporary in-memory store for Sign-Up OTPs
// const signupOtpStore = new Map();

// // --- STEP 1: SEND OTP FOR DENTIST SIGN UP ---
// router.post('/signup/dentist/send-otp', async (req, res) => {
//     const { email } = req.body;

//     try {
//         const [existingUser] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
//         if (existingUser.length > 0) {
//             return res.status(400).json({ error: "Email is already registered." });
//         }

//         const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
//         const expiresAt = Date.now() + 10 * 60000; // 10 minutes
        
//         signupOtpStore.set(email, { otpCode, expiresAt });

//         const mailOptions = {
//             from: 'iDENTify Clinic <your_email@gmail.com>',
//             to: email,
//             subject: 'Verify your iDENTify Registration',
//             text: `Welcome to iDENTify!\n\nYour registration verification code is: ${otpCode}\n\nThis code will expire in 10 minutes.`
//         };

//         await transporter.sendMail(mailOptions);
//         res.status(200).json({ message: "Verification code sent to email." });
//     } catch (err) {
//         console.error("OTP Send Error:", err);
//         res.status(500).json({ error: "Failed to send verification email." });
//     }
// });

// // --- STEP 2: VERIFY OTP & CREATE DENTIST ACCOUNT ---
// router.post('/signup/dentist', async (req, res) => {
//     const { firstName, surname, email, password, otp } = req.body;

//     try {
//         // Verify the OTP
//         const record = signupOtpStore.get(email);
//         if (!record || record.otpCode !== otp) {
//             return res.status(400).json({ error: "Invalid verification code." });
//         }
//         if (Date.now() > record.expiresAt) {
//             signupOtpStore.delete(email);
//             return res.status(400).json({ error: "Verification code has expired. Please try signing up again." });
//         }

//         // OTP is valid, proceed with creating the account
//         const fullName = `${firstName} ${surname}`;
//         const salt = await bcrypt.genSalt(10);
//         const hashedPassword = await bcrypt.hash(password, salt);

//         const dentistSql = `INSERT INTO dentists (name, first_name, last_name, email, status) VALUES (?, ?, ?, ?, 'Available')`;
//         const [dentistResult] = await db.query(dentistSql, [fullName, firstName, surname, email]);
//         const newDentistId = dentistResult.insertId;

//         const userSql = `INSERT INTO users (email, password_hash, full_name, role, dentist_id, is_verified) VALUES (?, ?, ?, 'dentist', ?, 1)`;
//         await db.query(userSql, [email, hashedPassword, fullName, newDentistId]);

//         // Clear the OTP from memory
//         signupOtpStore.delete(email);

//         res.status(201).json({ message: "Dentist account created successfully!" });
//     } catch (err) {
//         if (err.code === 'ER_DUP_ENTRY') {
//             return res.status(400).json({ error: "This email is already taken." });
//         }
//         res.status(500).json({ error: "Server error during sign up." });
//     }
// });

// // --- INITIAL LOGIN ---
// router.post('/login', async (req, res) => {
//     const { email, password, role } = req.body;

//     try {
//         const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
//         if (users.length === 0) return res.status(404).json({ error: "Account not found." });

//         const userRecord = users[0];

//         if (role && (!userRecord.role || userRecord.role.toLowerCase() !== role.toLowerCase())) {
//             return res.status(401).json({ error: "Incorrect role selected for this account." });
//         }

//         const isMatch = await bcrypt.compare(password, userRecord.password_hash);
//         if (!isMatch) return res.status(401).json({ error: "Invalid password." });

//         // DENTIST LOGIC: Instant Login (No OTP)
//         if (userRecord.role.toLowerCase() === 'dentist') {
//             return res.status(200).json({ 
//                 message: "Login successful", 
//                 requireOtp: false, 
//                 user: { id: userRecord.id, name: userRecord.full_name, email: userRecord.email, role: userRecord.role, dentist_id: userRecord.dentist_id } 
//             });
//         }

//         // AIDE LOGIC: Requires OTP
//         const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
//         const expiresAt = new Date(Date.now() + 10 * 60000); 
        
//         await db.query('UPDATE users SET otp_code = ?, otp_expires_at = ? WHERE id = ?', [otpCode, expiresAt, userRecord.id]);

//         const mailOptions = {
//             from: 'iDENTify Clinic <your_email@gmail.com>',
//             to: email,
//             subject: 'Your iDENTify Login Verification Code',
//             text: `Hello ${userRecord.full_name},\n\nYour login verification code is: ${otpCode}\n\nThis code will expire in 10 minutes.`
//         };

//         await transporter.sendMail(mailOptions);

//         res.status(200).json({ message: "OTP sent to your email", requireOtp: true, email: email, role: role });

//     } catch (err) {
//         console.error("Login Crash:", err);
//         res.status(500).json({ error: "Server crash: " + err.message });
//     }
// });

// // --- VERIFY OTP (Completes the login for AIDES) ---
// router.post('/verify-otp', async (req, res) => {
//     const { email, otp, role } = req.body;

//     try {
//         const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
//         if (users.length === 0) return res.status(404).json({ error: "Account not found." });

//         const userRecord = users[0];

//         if (!userRecord.otp_code || userRecord.otp_code !== otp) {
//             return res.status(400).json({ error: "Invalid verification code." });
//         }

//         if (new Date() > new Date(userRecord.otp_expires_at)) {
//             return res.status(400).json({ error: "Verification code has expired." });
//         }

//         await db.query('UPDATE users SET otp_code = NULL, otp_expires_at = NULL WHERE id = ?', [userRecord.id]);

//         res.status(200).json({ 
//             message: "Login successful", 
//             user: { id: userRecord.id, name: userRecord.full_name, email: userRecord.email, role: userRecord.role, dentist_id: userRecord.dentist_id } 
//         });

//     } catch (err) {
//         console.error("OTP Verification Error:", err);
//         res.status(500).json({ error: "Server crash during OTP verification." });
//     }
// });

// module.exports = router;

const express = require('express');
const router = express.Router();
const db = require('../db'); 
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');

const OTP_EXPIRY_MS = 10 * 60 * 1000;
const LOGIN_OTP_ROLES = new Set(['dentist', 'aide']);

// Configure your email transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'ericaaquino0114@gmail.com', 
        pass: 'seumvvibmpgzzseg'
    }
});

// Temporary in-memory store for Sign-Up OTPs
const signupOtpStore = new Map();

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
    };
}

async function sendOtpEmail({ email, name, otpCode, subject, introText }) {
    const mailOptions = {
        from: 'iDENTify Clinic <your_email@gmail.com>',
        to: email,
        subject,
        text: `Hello ${name || 'there'},\n\n${introText}: ${otpCode}\n\nThis code will expire in 10 minutes.`,
    };

    await transporter.sendMail(mailOptions);
}

async function ensureEmailNotRegistered(email) {
    const [existingUser] = await db.query('SELECT id FROM users WHERE email = ? LIMIT 1', [email]);
    return existingUser.length === 0;
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

        signupOtpStore.set(getSignupOtpKey('superadmin', email), { otpCode, expiresAt });

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
        otp,
    } = req.body || {};

    const email = toEmail(rawEmail);

    if (!firstName || !surname || !email || !password || !otp) {
        return res.status(400).json({ error: 'First name, surname, email, password, and OTP are required.' });
    }

    if (confirmPassword && password !== confirmPassword) {
        return res.status(400).json({ error: 'Passwords do not match.' });
    }

    try {
        const otpKey = getSignupOtpKey('superadmin', email);
        const record = signupOtpStore.get(otpKey);
        if (!record || record.otpCode !== otp) {
            return res.status(400).json({ error: 'Invalid verification code.' });
        }

        if (Date.now() > record.expiresAt) {
            signupOtpStore.delete(otpKey);
            return res.status(400).json({ error: 'Verification code has expired. Please sign up again.' });
        }

        const fullName = composeFullName(firstName, middleName, surname);
        const hashedPassword = await bcrypt.hash(password, 10);

        await db.query(
            `INSERT INTO users (email, password_hash, full_name, last_name, role, is_verified, is_archived)
             VALUES (?, ?, ?, ?, 'superadmin', 1, 0)`,
            [email, hashedPassword, fullName, String(surname).trim()]
        );

        signupOtpStore.delete(otpKey);

        res.status(201).json({ message: 'Super admin account created successfully.' });
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
        
        signupOtpStore.set(getSignupOtpKey('dentist', email), { otpCode, expiresAt });

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
    const { firstName, middleName, surname, email: rawEmail, password, otp } = req.body || {};
    const email = toEmail(rawEmail);

    if (!firstName || !surname || !email || !password || !otp) {
        return res.status(400).json({ error: 'First name, surname, email, password, and OTP are required.' });
    }

    try {
        const otpKey = getSignupOtpKey('dentist', email);
        const record = signupOtpStore.get(otpKey);
        if (!record || record.otpCode !== otp) {
            return res.status(400).json({ error: "Invalid verification code." });
        }

        if (Date.now() > record.expiresAt) {
            signupOtpStore.delete(otpKey);
            return res.status(400).json({ error: "Verification code has expired. Please try signing up again." });
        }

        const fullName = composeFullName(firstName, middleName, surname);
        const hashedPassword = await bcrypt.hash(password, 10);

        const dentistSql = `INSERT INTO dentists (name, first_name, middle_name, last_name, email, status) VALUES (?, ?, ?, ?, ?, 'Available')`;
        const [dentistResult] = await db.query(dentistSql, [fullName, firstName, middleName || null, surname, email]);
        const newDentistId = dentistResult.insertId;

        const userSql = `INSERT INTO users (email, password_hash, full_name, last_name, role, dentist_id, is_verified, is_archived) VALUES (?, ?, ?, ?, 'dentist', ?, 1, 0)`;
        await db.query(userSql, [email, hashedPassword, fullName, String(surname).trim(), newDentistId]);

        signupOtpStore.delete(otpKey);

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

        if (Number(userRecord.is_archived) === 1) {
            return res.status(403).json({ error: 'This account has been archived. Please contact the super admin.' });
        }

        const isMatch = await bcrypt.compare(password, userRecord.password_hash);
        if (!isMatch) return res.status(401).json({ error: "Invalid password." });

        if (role === 'superadmin') {
            return res.status(200).json({ 
                message: "Login successful", 
                requireOtp: false, 
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

        if (Number(userRecord.is_archived) === 1) {
            return res.status(403).json({ error: 'This account has been archived. Please contact the super admin.' });
        }

        if (role === 'superadmin') {
            return res.status(400).json({ error: 'Super admin accounts do not require OTP during login.' });
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
            user: toPublicUser(userRecord),
        });

    } catch (err) {
        console.error("OTP Verification Error:", err);
        res.status(500).json({ error: "Server crash during OTP verification." });
    }
});

module.exports = router;