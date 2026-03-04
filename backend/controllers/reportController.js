const pool = require('../config/db');
const ExcelJS = require('exceljs');

// Get dashboard stats for IT
const getDashboardStats = async (req, res) => {
    try {
        // Total counts by status
        const [statusCounts] = await pool.query(`
            SELECT status, COUNT(*) as count FROM tickets GROUP BY status
        `);

        // Jobs per IT staff
        const [perIT] = await pool.query(`
            SELECT u.name, u.id, 
                COUNT(CASE WHEN t.status = 'in_progress' THEN 1 END) as active,
                COUNT(CASE WHEN t.status = 'closed' THEN 1 END) as closed,
                COUNT(t.id) as total
            FROM users u
            LEFT JOIN tickets t ON t.assigned_to = u.id
            WHERE u.role = 'it'
            GROUP BY u.id, u.name
            ORDER BY total DESC
        `);

        // Problems by category
        const [byCategory] = await pool.query(`
            SELECT c.name, COUNT(t.id) as count
            FROM tickets t
            LEFT JOIN categories c ON t.category_id = c.id
            WHERE t.category_id IS NOT NULL
            GROUP BY t.category_id, c.name
            ORDER BY count DESC
            LIMIT 10
        `);

        // Problems by location/site
        const [bySite] = await pool.query(`
            SELECT l.name as location_name, COUNT(t.id) as count
            FROM tickets t
            LEFT JOIN locations l ON t.location_id = l.id
            WHERE t.location_id IS NOT NULL
            GROUP BY t.location_id, l.name
            ORDER BY count DESC
            LIMIT 10
        `);

        // Tickets by site
        const [bySiteName] = await pool.query(`
            SELECT s.name as site_name, COUNT(t.id) as count
            FROM tickets t
            LEFT JOIN sites s ON t.site_id = s.id
            WHERE t.site_id IS NOT NULL
            GROUP BY t.site_id, s.name
            ORDER BY count DESC
            LIMIT 10
        `);

        res.json({
            statusCounts: statusCounts.reduce((acc, r) => { acc[r.status] = r.count; return acc; }, {}),
            perIT,
            byCategory,
            bySite,
            bySiteName
        });
    } catch (err) {
        res.status(500).json({ message: 'Error fetching stats', error: err.message });
    }
};

// Export tickets as JSON or Excel
const exportTickets = async (req, res) => {
    const { from, to, format } = req.query;
    try {
        let query = `
            SELECT t.ticket_no, t.status, t.description, t.ip_address, t.solution, t.phone,
                t.created_at, t.closed_at, t.guest_name, t.guest_phone,
                l.name as location_name, c.name as category_name,
                cp.name as company_name, s.name as site_name, d.name as dept_name,
                u.name as assigned_name, u2.name as requester_name, u2.phone as user_phone
            FROM tickets t
            LEFT JOIN locations l ON t.location_id = l.id
            LEFT JOIN companies cp ON t.company_id = cp.id
            LEFT JOIN sites s ON t.site_id = s.id
            LEFT JOIN departments d ON t.department_id = d.id
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

        if (format === 'xlsx') {
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Report');

            worksheet.columns = [
                { header: 'Ticket No', key: 'ticket_no', width: 15 },
                { header: 'Status', key: 'status', width: 12 },
                { header: 'Requester', key: 'requester_name', width: 25 },
                { header: 'Guest Name', key: 'guest_name', width: 25 },
                { header: 'Phone', key: 'phone', width: 15 },
                { header: 'Location', key: 'location_name', width: 20 },
                { header: 'Company', key: 'company_name', width: 20 },
                { header: 'Site', key: 'site_name', width: 20 },
                { header: 'Department', key: 'dept_name', width: 20 },
                { header: 'IP Address', key: 'ip_address', width: 15 },
                { header: 'Category', key: 'category_name', width: 25 },
                { header: 'Assigned To', key: 'assigned_name', width: 25 },
                { header: 'Description', key: 'description', width: 50 },
                { header: 'Solution', key: 'solution', width: 50 },
                { header: 'Created At', key: 'created_at', width: 22 },
                { header: 'Closed At', key: 'closed_at', width: 22 },
            ];

            // Style headers
            worksheet.getRow(1).eachCell((cell) => {
                cell.font = { bold: true };
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFF2F2F2' } // Light gray
                };
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };
            });

            const formattedRows = rows.map(r => ({
                ticket_no: r.ticket_no,
                status: r.status,
                requester_name: r.requester_name || '',
                guest_name: r.guest_name || '',
                phone: r.guest_phone || r.phone || r.user_phone || '',
                location_name: r.location_name || '',
                company_name: r.company_name || '',
                site_name: r.site_name || '',
                dept_name: r.dept_name || '',
                ip_address: r.ip_address || '',
                category_name: r.category_name || '',
                assigned_name: r.assigned_name || '',
                description: r.description || '',
                solution: r.solution || '',
                created_at: r.created_at ? new Date(r.created_at).toLocaleString() : '',
                closed_at: r.closed_at ? new Date(r.closed_at).toLocaleString() : ''
            }));

            worksheet.addRows(formattedRows);

            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', 'attachment; filename="IT_Report.xlsx"');

            await workbook.xlsx.write(res);
            res.end();
            return;
        }

        res.json(rows);
    } catch (err) {
        res.status(500).json({ message: 'Error exporting tickets', error: err.message });
    }
};

module.exports = { getDashboardStats, exportTickets };
