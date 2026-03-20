const express = require('express');
const router = express.Router();
const db = require('../db'); 
const bcrypt = require('bcrypt');

// --- DENTIST SIGN UP ---
// This remains public for new dentists to join the system.
router.post('/signup/dentist', async (req, res) => {
    const { firstName, surname, email, password } = req.body;

    try {
        const [existingUser] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        if (existingUser.length > 0) {
            return res.status(400).json({ error: "Email is already registered." });
        }

        const fullName = `${firstName} ${surname}`;
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Insert into dentists table first
        const dentistSql = `INSERT INTO dentists (name, first_name, last_name, email, status) VALUES (?, ?, ?, ?, 'Available')`;
        const [dentistResult] = await db.query(dentistSql, [fullName, firstName, surname, email]);
        const newDentistId = dentistResult.insertId;

        // Insert into users table with 'dentist' role
        const userSql = `INSERT INTO users (email, password_hash, full_name, role, dentist_id, is_verified) VALUES (?, ?, ?, 'dentist', ?, 1)`;
        await db.query(userSql, [email, hashedPassword, fullName, newDentistId]);

        res.status(201).json({ message: "Dentist account created successfully!" });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: "This email is already taken in the system." });
        }
        res.status(500).json({ error: "Server error during sign up." });
    }
});

// --- UNIVERSAL LOGIN (Dentists & Aides) ---
router.post('/login', async (req, res) => {
    const { email, password, role } = req.body;

    try {
        const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        
        if (users.length === 0) {
            return res.status(404).json({ error: "Account not found." });
        }

        const userRecord = users[0];

        if (role) {
            if (!userRecord.role || userRecord.role.toLowerCase() !== role.toLowerCase()) {
                return res.status(401).json({ error: "Incorrect role selected for this account." });
            }
        }

        const isMatch = await bcrypt.compare(password, userRecord.password_hash);
        
        if (!isMatch) {
            return res.status(401).json({ error: "Invalid password." });
        }

        res.status(200).json({ 
            message: "Login successful", 
            user: {
                id: userRecord.id,
                name: userRecord.full_name,
                email: userRecord.email,
                role: userRecord.role,
                dentist_id: userRecord.dentist_id
            } 
        });

    } catch (err) {
        console.error("Login Crash Report:", err);
        // This will send the exact error directly to your frontend screen!
        res.status(500).json({ error: "Server crash: " + err.message });
    }
});

module.exports = router;