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

// --- STEP 1: SEND OTP FOR DENTIST SIGN UP ---
router.post('/signup/dentist/send-otp', async (req, res) => {
    const { email } = req.body;

    try {
        const [existingUser] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        if (existingUser.length > 0) {
            return res.status(400).json({ error: "Email is already registered." });
        }

        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = Date.now() + 10 * 60000; // 10 minutes
        
        signupOtpStore.set(email, { otpCode, expiresAt });

        const mailOptions = {
            from: 'iDENTify Clinic <your_email@gmail.com>',
            to: email,
            subject: 'Verify your iDENTify Registration',
            text: `Welcome to iDENTify!\n\nYour registration verification code is: ${otpCode}\n\nThis code will expire in 10 minutes.`
        };

        await transporter.sendMail(mailOptions);
        res.status(200).json({ message: "Verification code sent to email." });
    } catch (err) {
        console.error("OTP Send Error:", err);
        res.status(500).json({ error: "Failed to send verification email." });
    }
});

// --- STEP 2: VERIFY OTP & CREATE DENTIST ACCOUNT ---
router.post('/signup/dentist', async (req, res) => {
    // Added middleName to the destructured body request
    const { firstName, middleName, surname, email, password, otp } = req.body;

    try {
        // Verify the OTP
        const record = signupOtpStore.get(email);
        if (!record || record.otpCode !== otp) {
            return res.status(400).json({ error: "Invalid verification code." });
        }
        if (Date.now() > record.expiresAt) {
            signupOtpStore.delete(email);
            return res.status(400).json({ error: "Verification code has expired. Please try signing up again." });
        }

        // Combine full name dynamically depending on if middleName exists
        const fullName = middleName ? `${firstName} ${middleName} ${surname}` : `${firstName} ${surname}`;
        
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Updated SQL to include middle_name
        const dentistSql = `INSERT INTO dentists (name, first_name, middle_name, last_name, email, status) VALUES (?, ?, ?, ?, ?, 'Available')`;
        // Pass middleName explicitly, or null if it was left blank
        const [dentistResult] = await db.query(dentistSql, [fullName, firstName, middleName || null, surname, email]);
        const newDentistId = dentistResult.insertId;

        const userSql = `INSERT INTO users (email, password_hash, full_name, role, dentist_id, is_verified) VALUES (?, ?, ?, 'dentist', ?, 1)`;
        await db.query(userSql, [email, hashedPassword, fullName, newDentistId]);

        // Clear the OTP from memory
        signupOtpStore.delete(email);

        res.status(201).json({ message: "Dentist account created successfully!" });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: "This email is already taken." });
        }
        res.status(500).json({ error: "Server error during sign up." });
    }
});

// --- INITIAL LOGIN ---
router.post('/login', async (req, res) => {
    const { email, password, role } = req.body;

    try {
        const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        if (users.length === 0) return res.status(404).json({ error: "Account not found." });

        const userRecord = users[0];

        if (role && (!userRecord.role || userRecord.role.toLowerCase() !== role.toLowerCase())) {
            return res.status(401).json({ error: "Incorrect role selected for this account." });
        }

        const isMatch = await bcrypt.compare(password, userRecord.password_hash);
        if (!isMatch) return res.status(401).json({ error: "Invalid password." });

        // DENTIST LOGIC: Instant Login (No OTP)
        if (userRecord.role.toLowerCase() === 'dentist') {
            return res.status(200).json({ 
                message: "Login successful", 
                requireOtp: false, 
                user: { id: userRecord.id, name: userRecord.full_name, email: userRecord.email, role: userRecord.role, dentist_id: userRecord.dentist_id } 
            });
        }

        // AIDE LOGIC: Requires OTP
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60000); 
        
        await db.query('UPDATE users SET otp_code = ?, otp_expires_at = ? WHERE id = ?', [otpCode, expiresAt, userRecord.id]);

        const mailOptions = {
            from: 'iDENTify Clinic <your_email@gmail.com>',
            to: email,
            subject: 'Your iDENTify Login Verification Code',
            text: `Hello ${userRecord.full_name},\n\nYour login verification code is: ${otpCode}\n\nThis code will expire in 10 minutes.`
        };

        await transporter.sendMail(mailOptions);

        res.status(200).json({ message: "OTP sent to your email", requireOtp: true, email: email, role: role });

    } catch (err) {
        console.error("Login Crash:", err);
        res.status(500).json({ error: "Server crash: " + err.message });
    }
});

// --- VERIFY OTP (Completes the login for AIDES) ---
router.post('/verify-otp', async (req, res) => {
    const { email, otp, role } = req.body;

    try {
        const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        if (users.length === 0) return res.status(404).json({ error: "Account not found." });

        const userRecord = users[0];

        if (!userRecord.otp_code || userRecord.otp_code !== otp) {
            return res.status(400).json({ error: "Invalid verification code." });
        }

        if (new Date() > new Date(userRecord.otp_expires_at)) {
            return res.status(400).json({ error: "Verification code has expired." });
        }

        await db.query('UPDATE users SET otp_code = NULL, otp_expires_at = NULL WHERE id = ?', [userRecord.id]);

        res.status(200).json({ 
            message: "Login successful", 
            user: { id: userRecord.id, name: userRecord.full_name, email: userRecord.email, role: userRecord.role, dentist_id: userRecord.dentist_id } 
        });

    } catch (err) {
        console.error("OTP Verification Error:", err);
        res.status(500).json({ error: "Server crash during OTP verification." });
    }
});

module.exports = router;