const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const dotenv = require('dotenv');
const pool = require('./config/db');

dotenv.config();
const app = express();
const server = http.createServer(app);

// Setup Socket.io
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

app.set('io', io);
app.use(cors());
app.use(express.json());

// Auto-create tables if missing
(async () => {
    try {
        await pool.query(`CREATE TABLE IF NOT EXISTS email_settings (
            id INT AUTO_INCREMENT PRIMARY KEY,
            provider ENUM('gmail','outlook','custom') DEFAULT 'custom',
            smtp_host VARCHAR(255) NOT NULL,
            smtp_port INT DEFAULT 587,
            smtp_user VARCHAR(255) NOT NULL,
            smtp_pass VARCHAR(255) NOT NULL,
            sender_name VARCHAR(255) DEFAULT 'IT Service',
            sender_email VARCHAR(255),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )`);
        console.log('✅ email_settings table ready');

        await pool.query(`CREATE TABLE IF NOT EXISTS ticket_participants (
            ticket_id INT NOT NULL,
            user_id INT NOT NULL,
            PRIMARY KEY (ticket_id, user_id)
        )`);
        console.log('✅ ticket_participants table ready');

        await pool.query(`CREATE TABLE IF NOT EXISTS attachment_settings (
            id INT AUTO_INCREMENT PRIMARY KEY,
            max_file_size_mb INT NOT NULL DEFAULT 5,
            allowed_extensions TEXT NOT NULL,
            is_active BOOLEAN DEFAULT TRUE
        )`);
        await pool.query(`INSERT IGNORE INTO attachment_settings (id, max_file_size_mb, allowed_extensions) VALUES (1, 5, '.jpg,.jpeg,.png,.gif,.pdf,.doc,.docx,.xls,.xlsx')`);
        console.log('✅ attachment_settings table ready');

        await pool.query(`CREATE TABLE IF NOT EXISTS news (
            id INT AUTO_INCREMENT PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            content TEXT NOT NULL,
            status TINYINT DEFAULT 1,
            author_id INT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL
        )`);
        console.log('✅ news table ready');

        await pool.query(`CREATE TABLE IF NOT EXISTS auto_reports (
            id INT AUTO_INCREMENT PRIMARY KEY,
            frequency ENUM('weekly', 'monthly', 'both') DEFAULT 'weekly',
            recipients TEXT NOT NULL,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )`);

        try {
            await pool.query(`ALTER TABLE auto_reports MODIFY COLUMN frequency ENUM('weekly', 'monthly', 'both') DEFAULT 'weekly'`);
        } catch (e) { console.error('Error modifying auto_reports frequency:', e.message); }
        console.log('✅ auto_reports table ready');

        // Insert default auto report settings if empty
        const [arRows] = await pool.query('SELECT count(*) as c FROM auto_reports');
        if (arRows[0].c === 0) {
            await pool.query("INSERT INTO auto_reports (frequency, recipients, is_active) VALUES ('weekly', '', 0)");
        }

        // Add keep_chat_history column to tickets if it doesn't exist
        try {
            await pool.query(`ALTER TABLE tickets ADD COLUMN keep_chat_history BOOLEAN DEFAULT FALSE`);
            console.log('✅ Added keep_chat_history column to tickets table');
        } catch (alterErr) {
            // Ignore if column already exists
            if (alterErr.code !== 'ER_DUP_FIELDNAME') {
                console.warn('⚠️ Could not add keep_chat_history column:', alterErr.message);
            }
        }

        // Add is_pinned column to tickets if it doesn't exist
        try {
            await pool.query(`ALTER TABLE tickets ADD COLUMN is_pinned BOOLEAN DEFAULT FALSE`);
            console.log('✅ Added is_pinned column to tickets table');
        } catch (alterErr) {
            if (alterErr.code !== 'ER_DUP_FIELDNAME') {
                console.warn('⚠️ Could not add is_pinned column:', alterErr.message);
            }
        }

        // Add attachment_urls column to tickets if it doesn't exist
        try {
            await pool.query(`ALTER TABLE tickets ADD COLUMN attachment_urls JSON DEFAULT NULL`);
            console.log('✅ Added attachment_urls column to tickets table');
        } catch (alterErr) {
            if (alterErr.code !== 'ER_DUP_FIELDNAME') {
                console.warn('⚠️ Could not add attachment_urls column:', alterErr.message);
            }
        }

        await pool.query(`CREATE TABLE IF NOT EXISTS chat_reads (
            ticket_id INT NOT NULL,
            user_id INT NOT NULL,
            last_read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY(ticket_id, user_id),
            FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )`);
        console.log('✅ chat_reads table ready');

        await pool.query(`CREATE TABLE IF NOT EXISTS computer_repair_logs (
            id INT AUTO_INCREMENT PRIMARY KEY,
            computer_id INT NOT NULL,
            repair_date DATE NOT NULL,
            description TEXT NOT NULL,
            solution TEXT,
            technician VARCHAR(255),
            created_by INT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (computer_id) REFERENCES computers(id) ON DELETE CASCADE,
            FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
        )`);
        console.log('✅ computer_repair_logs table ready');

    } catch (err) { console.error('Migration error:', err.message); }
})();

// Basic routes
app.get('/', (req, res) => {
    res.send('IT Service Backend API Running');
});

// Import API routes
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const ticketRoutes = require('./routes/ticketRoutes');
const chatRoutes = require('./routes/chatRoutes');
const publicRoutes = require('./routes/publicRoutes');
const itRoutes = require('./routes/itRoutes');
const computerRoutes = require('./routes/computerRoutes');
const logRoutes = require('./routes/logRoutes');
const newsRoutes = require('./routes/newsRoutes');

app.use('/api/public', publicRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/it', itRoutes);
app.use('/api/computers', computerRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/news', newsRoutes);

// Report routes
const reportRoutes = require('./routes/reportRoutes');
app.use('/api/reports', reportRoutes);

// Serve uploaded files
const path = require('path');
app.use('/uploads', require('express').static(path.join(__dirname, 'uploads')));

// Online users tracking
const onlineUsers = new Map(); // socketId -> { user_id, name }

// Socket.io Events
io.on('connection', (socket) => {
    console.log('User connected to socket:', socket.id);

    socket.on('user_online', (data) => {
        if (data?.user_id) {
            onlineUsers.set(socket.id, { user_id: data.user_id, name: data.name });
            // Broadcast online users list
            const list = [...new Set([...onlineUsers.values()].map(u => u.user_id))];
            io.emit('online_users', list);
        }
    });

    // Join specific ticket chat room
    socket.on('join_ticket', (ticketId) => {
        socket.join(`ticket_${ticketId}`);
    });

    // Handle messages
    socket.on('send_message', async (data) => {
        try {
            const [result] = await pool.query(
                'INSERT INTO chats (ticket_id, sender_id, message, file_urls) VALUES (?, ?, ?, ?)',
                [data.ticket_id, data.sender_id, data.message || null, data.file_urls || null]
            );

            const insertId = result.insertId;
            const [rows] = await pool.query(
                `SELECT c.*, u.name as sender_name, t.user_id as ticket_owner_id 
                 FROM chats c 
                 LEFT JOIN users u ON c.sender_id = u.id 
                 LEFT JOIN tickets t ON c.ticket_id = t.id 
                 WHERE c.id = ?`, [insertId]
            );

            const msgPayload = rows[0];

            io.to(`ticket_${data.ticket_id}`).emit('receive_message', msgPayload);

            // Notify globally so sidebar badges and toast notifications can trigger
            // for users not actively in the ticket room
            io.emit('receive_message_global', msgPayload);
            io.emit('refresh_chats');
        } catch (err) {
            console.error('Socket send_message error:', err);
        }
    });

    socket.on('disconnect', () => {
        onlineUsers.delete(socket.id);
        const list = [...new Set([...onlineUsers.values()].map(u => u.user_id))];
        io.emit('online_users', list);
    });
});

const os = require('os');
const networkInterfaces = os.networkInterfaces();
let ipAddress = 'localhost';

Object.keys(networkInterfaces).forEach((interfaceName) => {
    networkInterfaces[interfaceName].forEach((iface) => {
        if (iface.family === 'IPv4' && !iface.internal) {
            ipAddress = iface.address;
        }
    });
});

const initAutoReportCron = require('./jobs/autoReportJob');
initAutoReportCron();

const initCleanupJob = require('./jobs/cleanupJob');
initCleanupJob();

const PORT = process.env.PORT || 5250;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`\n======================================`);
    console.log(`🚀 Backend Server is running!`);
    console.log(`======================================`);
    console.log(`- Local:   http://localhost:${PORT}`);
    console.log(`- Network: http://${ipAddress}:${PORT}`);
    console.log(`======================================\n`);
});
