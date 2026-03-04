const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const pool = require('../config/db');

const generateToken = (id, role) => {
    return jwt.sign({ id, role }, process.env.JWT_SECRET || 'fallback_secret_key', {
        expiresIn: '1d',
    });
};

const loginUser = async (req, res) => {
    const { username, password } = req.body;

    try {
        const [rows] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
        if (rows.length === 0) {
            return res.status(401).json({ message: 'Invalid username or password' });
        }

        const user = rows[0];

        // Check password
        let isMatch = false;
        // For admin default we might have set it as raw '123456' or hashed in DB. Assuming it's hashed.
        // If we want to support raw fallback for initial setup:
        if (password === user.password) {
            // In case we manually inserted plain text
            isMatch = true;
        } else {
            isMatch = await bcrypt.compare(password, user.password);
        }

        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid username or password' });
        }

        if (!user.status) {
            return res.status(403).json({ message: 'User account is disabled' });
        }

        if (user.role === 'pending_guest') {
            return res.status(403).json({ message: 'Account is pending approval' });
        }

        res.json({
            id: user.id,
            name: user.name,
            lname: user.lname,
            username: user.username,
            email: user.email,
            phone: user.phone,
            role: user.role,
            location_id: user.location_id,
            company_id: user.company_id,
            site_id: user.site_id,
            department_id: user.department_id,
            token: generateToken(user.id, user.role),
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error during login' });
    }
};

const registerUser = async (req, res) => {
    const { location_id, company_id, site_id, department_id, emp_id, name, lname, phone, email, username, password } = req.body;
    try {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const [result] = await pool.query(
            'INSERT INTO users (location_id, company_id, site_id, department_id, emp_id, name, lname, phone, email, username, password, role, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [location_id || null, company_id || null, site_id || null, department_id || null, emp_id || null, name, lname || null, phone || null, email || null, username, hashedPassword, 'pending_guest', 0]
        );

        const io = req.app.get('io');
        if (io) {
            io.emit('refresh_users');
        }

        res.status(201).json({ id: result.insertId, message: 'Registration submitted for approval' });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') return res.status(400).json({ message: 'Username already exists' });
        res.status(500).json({ message: 'Server error during registration', error: error.message });
    }
};

const updateProfile = async (req, res) => {
    const { name, lname, phone, email, oldPassword, newPassword } = req.body;
    const trimmedEmail = email && email.trim() !== "" ? email.trim() : null;
    const trimmedPhone = phone && phone.trim() !== "" ? phone.trim() : null;
    try {
        if (newPassword) {
            // Check old password
            const [rows] = await pool.query('SELECT password FROM users WHERE id = ?', [req.user.id]);
            if (rows.length === 0) return res.status(404).json({ message: 'User not found' });

            const isMatch = await bcrypt.compare(oldPassword, rows[0].password);
            if (!isMatch) {
                return res.status(401).json({ message: 'Incorrect old password' });
            }

            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(newPassword, salt);
            await pool.query(
                'UPDATE users SET name = ?, lname = ?, phone = ?, email = ?, password = ? WHERE id = ?',
                [name, lname, trimmedPhone, trimmedEmail, hashedPassword, req.user.id]
            );
        } else {
            await pool.query(
                'UPDATE users SET name = ?, lname = ?, phone = ?, email = ? WHERE id = ?',
                [name, lname, trimmedPhone, trimmedEmail, req.user.id]
            );
        }
        res.json({ message: 'Profile updated successfully' });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ message: 'Server error during profile update' });
    }
};

const getProfile = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT id, name, lname, email, phone, username, role FROM users WHERE id = ?', [req.user.id]);
        if (rows.length === 0) return res.status(404).json({ message: 'User not found' });
        res.json(rows[0]);
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ message: 'Server error fetching profile' });
    }
};

const changePassword = async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    try {
        const [rows] = await pool.query('SELECT password FROM users WHERE id = ?', [req.user.id]);
        if (rows.length === 0) return res.status(404).json({ message: 'User not found' });

        const isMatch = await bcrypt.compare(currentPassword, rows[0].password);
        if (!isMatch) {
            // Check if plaintext was the match for legacy support
            if (currentPassword !== rows[0].password) {
                return res.status(401).json({ message: 'Incorrect current password' });
            }
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);
        await pool.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, req.user.id]);

        res.json({ message: 'Password changed successfully' });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ message: 'Server error changing password' });
    }
};

module.exports = {
    loginUser,
    registerUser,
    updateProfile,
    getProfile,
    changePassword
};
