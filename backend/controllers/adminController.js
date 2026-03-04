const pool = require('../config/db');

// --- LOCATIONS ---

const getLocations = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM locations ORDER BY id DESC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching locations', error: err.message });
    }
};

const createLocation = async (req, res) => {
    const { name } = req.body;
    try {
        const [result] = await pool.query('INSERT INTO locations (name, status) VALUES (?, 1)', [name]);
        res.status(201).json({ id: result.insertId, name, status: 1 });
    } catch (err) {
        res.status(500).json({ message: 'Error creating location', error: err.message });
    }
};

const updateLocation = async (req, res) => {
    const { id } = req.params;
    const { name } = req.body;
    try {
        await pool.query('UPDATE locations SET name = ? WHERE id = ?', [name, id]);
        res.json({ message: 'Location updated' });
    } catch (err) {
        res.status(500).json({ message: 'Error updating location', error: err.message });
    }
};

const toggleLocationStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body; // Expects 1 or 0
    try {
        await pool.query('UPDATE locations SET status = ? WHERE id = ?', [status, id]);
        res.json({ message: 'Location status updated' });
    } catch (err) {
        res.status(500).json({ message: 'Error updating status', error: err.message });
    }
};

// --- COMPANIES ---

const getCompanies = async (req, res) => {
    try {
        const [rows] = await pool.query(`
      SELECT c.*, l.name as location_name 
      FROM companies c
      LEFT JOIN locations l ON c.location_id = l.id
      ORDER BY c.id DESC
    `);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching companies', error: err.message });
    }
};

const createCompany = async (req, res) => {
    const { location_id, name, description } = req.body;
    try {
        const [result] = await pool.query(
            'INSERT INTO companies (location_id, name, description, status) VALUES (?, ?, ?, 1)',
            [location_id, name, description || null]
        );
        res.status(201).json({ id: result.insertId, location_id, name, description, status: 1 });
    } catch (err) {
        res.status(500).json({ message: 'Error creating company', error: err.message });
    }
};

const updateCompany = async (req, res) => {
    const { id } = req.params;
    const { location_id, name, description } = req.body;
    try {
        await pool.query(
            'UPDATE companies SET location_id = ?, name = ?, description = ? WHERE id = ?',
            [location_id, name, description || null, id]
        );
        res.json({ message: 'Company updated' });
    } catch (err) {
        res.status(500).json({ message: 'Error updating company', error: err.message });
    }
};

const toggleCompanyStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    try {
        await pool.query('UPDATE companies SET status = ? WHERE id = ?', [status, id]);
        res.json({ message: 'Company status updated' });
    } catch (err) {
        res.status(500).json({ message: 'Error updating status', error: err.message });
    }
};

// --- SITES ---
const getSites = async (req, res) => {
    try {
        const [rows] = await pool.query(`
      SELECT s.*, c.name as company_name 
      FROM sites s
      LEFT JOIN companies c ON s.company_id = c.id
      ORDER BY s.id DESC
    `);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching sites' });
    }
};

const createSite = async (req, res) => {
    const { company_id, name, description } = req.body;
    try {
        const [result] = await pool.query(
            'INSERT INTO sites (company_id, name, description, status) VALUES (?, ?, ?, 1)',
            [company_id, name, description || null]
        );
        res.status(201).json({ id: result.insertId, company_id, name, status: 1 });
    } catch (err) {
        res.status(500).json({ message: 'Error creating site' });
    }
};

const updateSite = async (req, res) => {
    const { id } = req.params;
    const { company_id, name, description } = req.body;
    try {
        await pool.query(
            'UPDATE sites SET company_id = ?, name = ?, description = ? WHERE id = ?',
            [company_id, name, description || null, id]
        );
        res.json({ message: 'Site updated' });
    } catch (err) {
        res.status(500).json({ message: 'Error updating site' });
    }
};

const toggleSiteStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    try {
        await pool.query('UPDATE sites SET status = ? WHERE id = ?', [status, id]);
        res.json({ message: 'Site status updated' });
    } catch (err) {
        res.status(500).json({ message: 'Error updating status' });
    }
};

// --- DEPARTMENTS ---
const getDepartments = async (req, res) => {
    try {
        const [rows] = await pool.query(`
      SELECT d.*, s.name as site_name 
      FROM departments d
      LEFT JOIN sites s ON d.site_id = s.id
      ORDER BY d.id DESC
    `);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching departments' });
    }
};

const createDepartment = async (req, res) => {
    const { site_id, dept_code, name, description } = req.body;
    try {
        const [result] = await pool.query(
            'INSERT INTO departments (site_id, dept_code, name, description) VALUES (?, ?, ?, ?)',
            [site_id, dept_code, name, description || null]
        );
        res.status(201).json({ id: result.insertId, site_id, name, status: 1 });
    } catch (err) {
        res.status(500).json({ message: 'Error creating dept' });
    }
};

const updateDepartment = async (req, res) => {
    const { id } = req.params;
    const { site_id, dept_code, name, description } = req.body;
    try {
        await pool.query(
            'UPDATE departments SET site_id = ?, dept_code = ?, name = ?, description = ? WHERE id = ?',
            [site_id, dept_code, name, description || null, id]
        );
        res.json({ message: 'Department updated' });
    } catch (err) {
        res.status(500).json({ message: 'Error updating dept' });
    }
};

const toggleDepartmentStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    try {
        await pool.query('UPDATE departments SET status = ? WHERE id = ?', [status, id]);
        res.json({ message: 'Department status updated' });
    } catch (err) {
        res.status(500).json({ message: 'Error updating status' });
    }
};

// --- CATEGORIES ---
const getCategories = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM categories ORDER BY id DESC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching categories' });
    }
};

const createCategory = async (req, res) => {
    const { name, description } = req.body;
    try {
        const [result] = await pool.query(
            'INSERT INTO categories (name, description) VALUES (?, ?)',
            [name, description || null]
        );
        res.status(201).json({ id: result.insertId, name, status: 1 });
    } catch (err) {
        res.status(500).json({ message: 'Error creating category' });
    }
};

const updateCategory = async (req, res) => {
    const { id } = req.params;
    const { name, description } = req.body;
    try {
        await pool.query(
            'UPDATE categories SET name = ?, description = ? WHERE id = ?',
            [name, description || null, id]
        );
        res.json({ message: 'Category updated' });
    } catch (err) {
        res.status(500).json({ message: 'Error updating category' });
    }
};

const toggleCategoryStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    try {
        await pool.query('UPDATE categories SET status = ? WHERE id = ?', [status, id]);
        res.json({ message: 'Category status updated' });
    } catch (err) {
        res.status(500).json({ message: 'Error updating status' });
    }
};

// --- USERS ---
const bcrypt = require('bcryptjs');

const getUsers = async (req, res) => {
    try {
        const [rows] = await pool.query(`
      SELECT u.id, u.username, u.name, u.lname, u.role, u.status, u.emp_id, u.phone, u.email,
        u.location_id, u.company_id, u.site_id, u.department_id,
        l.name as location_name, c.name as company_name, s.name as site_name, d.name as dept_name
      FROM users u
      LEFT JOIN locations l ON u.location_id = l.id
      LEFT JOIN companies c ON u.company_id = c.id
      LEFT JOIN sites s ON u.site_id = s.id
      LEFT JOIN departments d ON u.department_id = d.id
      ORDER BY u.id DESC
    `);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching users' });
    }
};

const createUser = async (req, res) => {
    const { location_id, company_id, site_id, department_id, emp_id, name, lname, username, password, phone, email, role } = req.body;
    try {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const loc_id = location_id || null;
        const comp_id = company_id || null;
        const s_id = site_id || null;
        const dept_id = department_id || null;
        const e_id = emp_id || null;
        const p_phone = phone || null;
        const p_email = email || null;

        const [result] = await pool.query(
            'INSERT INTO users (location_id, company_id, site_id, department_id, emp_id, name, lname, username, password, phone, email, role) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [loc_id, comp_id, s_id, dept_id, e_id, name, lname || null, username, hashedPassword, p_phone, p_email, role]
        );
        res.status(201).json({ id: result.insertId, username, status: 1 });
    } catch (err) {
        res.status(500).json({ message: 'Error creating user', error: err.message });
    }
};

const updateUser = async (req, res) => {
    const { id } = req.params;
    const { location_id, company_id, site_id, department_id, emp_id, name, lname, username, password, phone, email, role } = req.body;
    try {
        const loc_id = location_id || null;
        const comp_id = company_id || null;
        const s_id = site_id || null;
        const dept_id = department_id || null;
        const e_id = emp_id || null;
        const p_phone = phone || null;
        const p_email = email || null;

        if (password) {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);
            await pool.query(
                'UPDATE users SET location_id=?, company_id=?, site_id=?, department_id=?, emp_id=?, name=?, lname=?, username=?, password=?, phone=?, email=?, role=? WHERE id=?',
                [loc_id, comp_id, s_id, dept_id, e_id, name, lname || null, username, hashedPassword, p_phone, p_email, role, id]
            );
        } else {
            await pool.query(
                'UPDATE users SET location_id=?, company_id=?, site_id=?, department_id=?, emp_id=?, name=?, lname=?, username=?, phone=?, email=?, role=? WHERE id=?',
                [loc_id, comp_id, s_id, dept_id, e_id, name, lname || null, username, p_phone, p_email, role, id]
            );
        }
        res.json({ message: 'User updated' });
    } catch (err) {
        res.status(500).json({ message: 'Error updating user' });
    }
};

const toggleUserStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    try {
        await pool.query('UPDATE users SET status = ? WHERE id = ?', [status, id]);

        // If turning off, force logout the user via Socket.IO
        if (status === 0 || status === false || status === '0') {
            const io = req.app.get('io');
            if (io) {
                io.emit('force_logout', { userId: id });
            }
        }

        res.json({ message: 'User status updated' });
    } catch (err) {
        res.status(500).json({ message: 'Error updating status' });
    }
};

const deleteUser = async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM users WHERE id = ?', [id]);
        res.json({ message: 'User deleted successfully' });
    } catch (err) {
        if (err.code === 'ER_ROW_IS_REFERENCED_2' || err.code === 'ER_ROW_IS_REFERENCED') {
            return res.status(400).json({
                message: 'Cannot delete user with existing tickets or history. Please disable their status instead.',
                errorPattern: 'FOREIGN_KEY_CONSTRAINT'
            });
        }
        res.status(500).json({ message: 'Error deleting user', error: err.message });
    }
};

// --- EMAIL SETTINGS ---
const getEmailSettings = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM email_settings ORDER BY id DESC LIMIT 1');
        res.json(rows.length > 0 ? rows[0] : null);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching email settings', error: err.message });
    }
};

const saveEmailSettings = async (req, res) => {
    const { provider, smtp_host, smtp_port, smtp_user, smtp_pass, sender_name, sender_email } = req.body;
    try {
        // Delete old and insert new
        await pool.query('DELETE FROM email_settings');
        await pool.query(
            'INSERT INTO email_settings (provider, smtp_host, smtp_port, smtp_user, smtp_pass, sender_name, sender_email) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [provider || 'custom', smtp_host, smtp_port || 587, smtp_user, smtp_pass, sender_name || 'IT Service', sender_email || null]
        );
        res.json({ message: 'Email settings saved' });
    } catch (err) {
        res.status(500).json({ message: 'Error saving email settings', error: err.message });
    }
};

// --- PENDING USER APPROVAL (IT) ---
const getPendingUsers = async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT u.*, l.name as location_name, c.name as company_name, s.name as site_name, d.name as dept_name
            FROM users u
            LEFT JOIN locations l ON u.location_id = l.id
            LEFT JOIN companies c ON u.company_id = c.id
            LEFT JOIN sites s ON u.site_id = s.id
            LEFT JOIN departments d ON u.department_id = d.id
            WHERE u.role = 'pending_guest'
            ORDER BY u.id DESC
        `);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching pending users', error: err.message });
    }
};

const approveUser = async (req, res) => {
    const { id } = req.params;
    try {
        const [userRows] = await pool.query('SELECT * FROM users WHERE id = ? AND role = ?', [id, 'pending_guest']);
        if (userRows.length === 0) return res.status(404).json({ message: 'Pending user not found' });

        await pool.query('UPDATE users SET role = ? WHERE id = ?', ['user', id]);

        // Send approval email if user has email
        const user = userRows[0];
        if (user.email) {
            try {
                const { sendEmail } = require('../lib/email');
                await sendEmail({
                    to: user.email,
                    subject: 'Account Approved — IT Service',
                    html: `<h2>สวัสดี ${user.name} ${user.lname || ''}</h2>
                    <p>บัญชีของคุณได้รับการอนุมัติเรียบร้อยแล้ว</p>
                    <p>คุณสามารถเข้าสู่ระบบด้วย Username: <strong>${user.username}</strong></p>
                    <p>ขอบคุณครับ/ค่ะ<br/>IT Service Team</p>`
                });
            } catch (emailErr) {
                console.error('Approval email failed:', emailErr.message);
            }
        }

        res.json({ message: 'User approved' });
    } catch (err) {
        res.status(500).json({ message: 'Error approving user', error: err.message });
    }
};

const rejectUser = async (req, res) => {
    const { id } = req.params;
    try {
        const [userRows] = await pool.query('SELECT * FROM users WHERE id = ? AND role = ?', [id, 'pending_guest']);
        if (userRows.length === 0) return res.status(404).json({ message: 'Pending user not found' });

        await pool.query('DELETE FROM users WHERE id = ?', [id]);
        res.json({ message: 'User rejected and deleted' });
    } catch (err) {
        res.status(500).json({ message: 'Error rejecting user', error: err.message });
    }
};

// --- AUTO REPORT SETTINGS ---
const getAutoReportSettings = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM auto_reports ORDER BY id DESC LIMIT 1');
        res.json(rows.length > 0 ? rows[0] : { frequency: 'weekly', recipients: '', is_active: false });
    } catch (err) {
        res.status(500).json({ message: 'Error fetching auto report settings', error: err.message });
    }
};

const saveAutoReportSettings = async (req, res) => {
    const { frequency, recipients, is_active } = req.body;
    try {
        await pool.query('DELETE FROM auto_reports');
        await pool.query(
            'INSERT INTO auto_reports (frequency, recipients, is_active) VALUES (?, ?, ?)',
            [frequency, recipients || '', is_active ? 1 : 0]
        );
        res.json({ message: 'Auto report settings saved' });
    } catch (err) {
        res.status(500).json({ message: 'Error saving auto report settings', error: err.message });
    }
};

module.exports = {
    getLocations, createLocation, updateLocation, toggleLocationStatus,
    getCompanies, createCompany, updateCompany, toggleCompanyStatus,
    getSites, createSite, updateSite, toggleSiteStatus,
    getDepartments, createDepartment, updateDepartment, toggleDepartmentStatus,
    getCategories, createCategory, updateCategory, toggleCategoryStatus,
    getUsers, createUser, updateUser, toggleUserStatus, deleteUser,
    getEmailSettings, saveEmailSettings,
    getPendingUsers, approveUser, rejectUser,
    getAutoReportSettings, saveAutoReportSettings
};

