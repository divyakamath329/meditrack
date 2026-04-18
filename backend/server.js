
require('dotenv').config();const express = require('express');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const cors = require('cors');
const bodyParser = require('body-parser');
const { createConnection } = require('./db');

const app = express();
const PORT = 3000;

//MIDDLEWARE
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));

// EMAIL SETUP
let transporter;

try {
    transporter = nodemailer.createTransport({
        service: 'gmail',
     auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
}
    });

    transporter.verify((error, success) => {
        if (error) {
            console.log('❌ EMAIL SETUP FAILED:', error.message);
        } else {
            console.log('✅ EMAIL READY TO SEND!');
        }
    });

    console.log('📧 Email service started');

} catch (error) {
    console.log('⚠️ Email setup error:', error.message);
    transporter = null;
}

// SIGNUP 
app.post('/api/signup', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Email and password required' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const connection = await createConnection();
        
        // Check if user exists
        const [existingUsers] = await connection.execute(
            'SELECT id FROM users WHERE email = ?',
            [email]
        );

        if (existingUsers.length > 0) {
            await connection.end();
            return res.status(400).json({ success: false, message: 'Account already exists' });
        }

  // Generate OTP
const otp = Math.floor(100000 + Math.random() * 900000).toString();

// Create user
await connection.execute(
    'INSERT INTO users (email, password, otp, is_verified) VALUES (?, ?, ?, 0)',
    [email, hashedPassword, otp]
);
        // SEND WELCOME 
if (transporter) {
    try {
        await transporter.sendMail({
            from: '"MediTrack" <hegdedisha333@gmail.com>',
            to: email,
       subject: '🔐 MediTrack OTP Verification',
html: `
    <div style="font-family: Arial; padding: 20px;">
        <h2 style="color:#5c4cff;">Verify your email</h2>
        <p>Your OTP is:</p>
        <h1 style="letter-spacing: 5px;">${otp}</h1>
        <p>Enter this OTP to activate your account.</p>
    </div>

            `
        });

        console.log('✅ EMAIL SENT SUCCESSFULLY to:', email);

    } catch (emailError) {
        console.log('⚠️ Email failed (account still created):', emailError.message);
    }
} else {
    console.log('📧 Email service unavailable - Account created:', email);
}
        res.json({ success: true, message: 'Account created successfully! Check your email.' });

    } catch (error) {
        console.error('Signup error:', error);
        
        if (error.code === 'ER_DUP_ENTRY' || error.errno === 1062) {
            res.status(400).json({ success: false, message: 'Account already exists' });
        } else {
            res.status(500).json({ success: false, message: 'Server error. Please try again.' });
        }
    }
});

// LOGIN 
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const connection = await createConnection();
        const [rows] = await connection.execute(
            'SELECT * FROM users WHERE email = ?',
            [email]
        );
        await connection.end();

        if (rows.length === 0) {
            return res.status(400).json({ success: false, message: 'Invalid email or password' });
        }

        const user = rows[0];
        if (!user.is_verified) {
    return res.status(400).json({
        success: false,
        message: 'Verify OTP first'
    });
}
        const valid = await bcrypt.compare(password, user.password);

        if (!valid) {
            return res.status(400).json({ success: false, message: 'Invalid email or password' });
        }

        res.json({
            success: true,
            user: { id: user.id, email: user.email }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// DASHBOARD
app.get('/api/dashboard/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;

        const connection = await createConnection();

        const [userRows] = await connection.execute(
            'SELECT email FROM users WHERE id = ?',
            [userId]
        );

        if (userRows.length === 0) {
            await connection.end();
            return res.status(404).json({ error: 'User not found' });
        }

        const userEmail = userRows[0].email;

        const [[medCount]] = await connection.execute(
            'SELECT COUNT(*) as count FROM medications WHERE user_id = ?',
            [userId]
        );

        const [medications] = await connection.execute(
            'SELECT * FROM medications WHERE user_id = ? ORDER BY created_at DESC',
            [userId]
        );

        await connection.end();

        res.json({
            userEmail,
            medicationsCount: medCount.count,
            medications
        });

    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// GET MEDICATIONS
app.get('/get-medications', async (req, res) => {
    try {
        const email = req.query.email;

        const connection = await createConnection();

        const [users] = await connection.execute(
            'SELECT id FROM users WHERE email = ?',
            [email]
        );

        if (users.length === 0) {
            await connection.end();
            return res.json({ medications: [] });
        }

        const userId = users[0].id;

        const [medications] = await connection.execute(
            'SELECT * FROM medications WHERE user_id = ? ORDER BY created_at DESC',
            [userId]
        );

        await connection.end();

        res.json({ medications });

    } catch (error) {
        console.error('Get medications error:', error);
        res.json({ medications: [] });
    }
});

// ADD MEDICATION
app.post('/add-medication', async (req, res) => {
    try {
        const {
            email,
            name,
            dosage,
            frequency,
            start_date,
            end_date,
            expiry_date
        } = req.body;

        const connection = await createConnection();

        const [users] = await connection.execute(
            'SELECT id FROM users WHERE email = ?',
            [email]
        );

        if (users.length === 0) {
            await connection.end();
            return res.status(400).json({ success: false, message: 'User not found' });
        }

        const userId = users[0].id;

        await connection.execute(
            `INSERT INTO medications 
            (user_id, name, dosage, frequency, start_date, end_date, expiry_date)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [userId, name, dosage, frequency, start_date || null, end_date || null, expiry_date || null]
        );

        await connection.end();

        res.json({ success: true, message: 'Medication added' });

    } catch (error) {
        console.error('Add medication error:', error);
        res.status(500).json({ success: false, message: 'Failed to add medication' });
    }
});

//  DELETE MEDICATION
app.delete('/delete-medication/:id', async (req, res) => {
    try {
        const id = req.params.id;

        const connection = await createConnection();

        const [result] = await connection.execute(
            'DELETE FROM medications WHERE id = ?',
            [id]
        );

        await connection.end();

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Medication not found' });
        }

        res.json({ success: true, message: 'Deleted successfully' });

    } catch (error) {
        console.error('Delete error:', error);
        res.status(500).json({ success: false, message: 'Delete failed' });
    }
});

// START SERVER 
app.post('/api/verify-otp', async (req, res) => {
    try {
        const { email, otp } = req.body;

        const connection = await createConnection();

        const [rows] = await connection.execute(
            'SELECT otp FROM users WHERE email = ?',
            [email]
        );

        if (rows.length === 0) {
            await connection.end();
            return res.status(400).json({ success: false, message: 'User not found' });
        }

        if (rows[0].otp !== otp) {
            await connection.end();
            return res.status(400).json({ success: false, message: 'Invalid OTP' });
        }

        await connection.execute(
            'UPDATE users SET is_verified = 1, otp = NULL WHERE email = ?',
            [email]
        );

        await connection.end();

        res.json({ success: true, message: 'Verified!' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log('✅ Ready for signups and emails!');
});
