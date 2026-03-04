'use client';
export default function AdminDashboard() {
    return (
        <div className="animate-fade-in">
            <h2 style={{ color: 'var(--color-primary)', marginBottom: '1.5rem' }}>Administrator Dashboard</h2>

            <div className="glass-card" style={{ marginBottom: '2rem' }}>
                <h3>Welcome strictly to the Admin Portal!</h3>
                <p style={{ color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>
                    Use the side navigation menus to control the organizational configurations, problem categories, and system user roles.
                </p>
            </div>

            <div className="grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
                <a href="/admin/users" style={{ textDecoration: 'none' }}>
                    <div className="glass-card" style={{ transition: 'all 0.3s ease', cursor: 'pointer' }}>
                        <h4 style={{ color: 'var(--color-secondary)' }}>User Management</h4>
                        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>Approve pending members and assign IT/Admin roles.</p>
                    </div>
                </a>
                <a href="/admin/locations" style={{ textDecoration: 'none' }}>
                    <div className="glass-card" style={{ transition: 'all 0.3s ease', cursor: 'pointer' }}>
                        <h4 style={{ color: 'var(--color-secondary)' }}>Org Hierarchy</h4>
                        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>Configure Locations, Companies, Sites, and Departments.</p>
                    </div>
                </a>
                <a href="/admin/categories" style={{ textDecoration: 'none' }}>
                    <div className="glass-card" style={{ transition: 'all 0.3s ease', cursor: 'pointer' }}>
                        <h4 style={{ color: 'var(--color-secondary)' }}>Categories</h4>
                        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>Add new problem types for the ticketing system.</p>
                    </div>
                </a>
            </div>
        </div>
    );
}
