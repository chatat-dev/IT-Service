const nodemailer = require('nodemailer');
const pool = require('../config/db');

// Get SMTP settings from database
const getSmtpConfig = async () => {
    try {
        const [rows] = await pool.query('SELECT * FROM email_settings ORDER BY id DESC LIMIT 1');
        if (rows.length === 0) return null;
        return rows[0];
    } catch (err) {
        console.error('Error fetching SMTP config:', err.message);
        return null;
    }
};

// Create transporter from saved settings
const createTransporter = async () => {
    const config = await getSmtpConfig();
    if (!config) return null;

    const transporterOpts = {
        host: config.smtp_host,
        port: config.smtp_port,
        secure: config.smtp_port === 465,
        auth: {
            user: config.smtp_user,
            pass: config.smtp_pass
        }
    };

    return nodemailer.createTransport(transporterOpts);
};

// Send email helper
const sendEmail = async ({ to, subject, html, attachments }) => {
    try {
        const transporter = await createTransporter();
        if (!transporter) {
            console.warn('No SMTP settings configured. Email not sent.');
            return false;
        }

        const config = await getSmtpConfig();
        const mailOptions = {
            from: config.sender_email
                ? `"${config.sender_name || 'IT Service'}" <${config.sender_email}>`
                : `"${config.sender_name || 'IT Service'}" <${config.smtp_user}>`,
            to,
            subject,
            html,
            attachments
        };

        await transporter.sendMail(mailOptions);
        console.log(`Email sent to ${to}: ${subject}`);
        return true;
    } catch (err) {
        console.error('Email send error:', err.message);
        return false;
    }
};

module.exports = { getSmtpConfig, sendEmail };
