const cron = require('node-cron');
const pool = require('../config/db');
const ExcelJS = require('exceljs');
const { sendEmail } = require('../lib/email');

// Generate Excel buffer
const generateExcelBuffer = async (from, to) => {
    let query = `
        SELECT t.ticket_no, t.status, t.description, t.ip_address, t.solution,
            t.created_at, t.closed_at, t.guest_name, t.guest_phone,
            l.name as location_name, c.name as category_name,
            u.name as assigned_name, u2.name as requester_name
        FROM tickets t
        LEFT JOIN locations l ON t.location_id = l.id
        LEFT JOIN categories c ON t.category_id = c.id
        LEFT JOIN users u ON t.assigned_to = u.id
        LEFT JOIN users u2 ON t.user_id = u2.id
        WHERE 1=1
    `;
    const params = [];
    if (from) { query += ' AND t.created_at >= ?'; params.push(from); }
    if (to) { query += ' AND t.created_at <= ?'; params.push(to + ' 23:59:59'); }
    query += ' ORDER BY t.created_at DESC';

    const [rows] = await pool.query(query, params);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Report');

    worksheet.columns = [
        { header: 'Ticket No', key: 'ticket_no', width: 15 },
        { header: 'Status', key: 'status', width: 12 },
        { header: 'Requester', key: 'requester_name', width: 25 },
        { header: 'Guest Name', key: 'guest_name', width: 25 },
        { header: 'Location', key: 'location_name', width: 25 },
        { header: 'Category', key: 'category_name', width: 25 },
        { header: 'Assigned To', key: 'assigned_name', width: 25 },
        { header: 'Description', key: 'description', width: 50 },
        { header: 'Solution', key: 'solution', width: 50 },
        { header: 'Created At', key: 'created_at', width: 22 },
        { header: 'Closed At', key: 'closed_at', width: 22 },
    ];

    const formattedRows = rows.map(r => ({
        ticket_no: r.ticket_no,
        status: r.status,
        requester_name: r.requester_name || '',
        guest_name: r.guest_name || '',
        location_name: r.location_name || '',
        category_name: r.category_name || '',
        assigned_name: r.assigned_name || '',
        description: r.description || '',
        solution: r.solution || '',
        created_at: r.created_at ? new Date(r.created_at).toLocaleString() : '',
        closed_at: r.closed_at ? new Date(r.closed_at).toLocaleString() : ''
    }));

    worksheet.addRows(formattedRows);
    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
};

// Start cron job
const initAutoReportCron = () => {
    // Run every day at 00:00 (Midnight)
    cron.schedule('0 0 * * *', async () => {
        try {
            const [settings] = await pool.query('SELECT * FROM auto_reports ORDER BY id DESC LIMIT 1');
            if (settings.length === 0 || !settings[0].is_active || !settings[0].recipients) return;

            const { frequency, recipients } = settings[0];
            const now = new Date();
            const recipientList = recipients.split(',').map(e => e.trim()).filter(e => e);
            if (recipientList.length === 0) return;

            const sendReport = async (title, fromDateStr, toDateStr) => {
                const buffer = await generateExcelBuffer(fromDateStr, toDateStr);
                await sendEmail({
                    to: recipientList.join(', '),
                    subject: title,
                    html: `
                        <h2>${title}</h2>
                        <p>Here is the automated IT Service report generated for the period <strong>${fromDateStr}</strong> to <strong>${toDateStr}</strong>.</p>
                        <p>Please find the attached Excel (.xlsx) file.</p>
                        <br>
                        <p>Best regards,<br>IT Service Portal System</p>
                    `,
                    attachments: [
                        { filename: `IT_Report_${fromDateStr}_to_${toDateStr}.xlsx`, content: buffer }
                    ]
                });
                console.log(`✅ [${new Date().toISOString()}] Auto Report sent successfully to: ${recipientList.join(', ')}`);
            };

            const isWeekly = (frequency === 'weekly' || frequency === 'both') && now.getDay() === 1;
            const isMonthly = (frequency === 'monthly' || frequency === 'both') && now.getDate() === 1;

            if (isWeekly) {
                const lastMon = new Date(now);
                lastMon.setDate(now.getDate() - 7);
                const lastSun = new Date(now);
                lastSun.setDate(now.getDate() - 1);

                const fromDateStr = lastMon.toISOString().split('T')[0];
                const toDateStr = lastSun.toISOString().split('T')[0];
                await sendReport(`Weekly IT Report (${fromDateStr} to ${toDateStr})`, fromDateStr, toDateStr);
            }

            if (isMonthly) {
                const lastMonthFirstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                const lastMonthLastDay = new Date(now.getFullYear(), now.getMonth(), 0);

                const fromDateStr = lastMonthFirstDay.toISOString().split('T')[0];
                const toDateStr = lastMonthLastDay.toISOString().split('T')[0];
                await sendReport(`Monthly IT Report (${fromDateStr} to ${toDateStr})`, fromDateStr, toDateStr);
            }
        } catch (err) {
            console.error('❌ Auto Report Cron Error:', err.message);
        }
    });
    console.log('✅ Auto Report Cron Job scheduled (Runs daily at midnight to check conditions)');
};

module.exports = initAutoReportCron;
