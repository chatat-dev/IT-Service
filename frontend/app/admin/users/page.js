'use client';
import { useState, useEffect, useMemo } from 'react';
import { useModal } from '../../components/ModalProvider';
import { useLanguage } from '../../components/LanguageProvider';
import StyledSelect from '../../components/StyledSelect';

export default function AdminUsers() {
    const { t } = useLanguage();
    const { showAlert, showConfirm } = useModal();
    const [users, setUsers] = useState([]);
    const [publicData, setPublicData] = useState({ locations: [], companies: [], sites: [], departments: [] });
    const [formData, setFormData] = useState({
        id: null, location_id: '', company_id: '', site_id: '', department_id: '',
        emp_id: '', name: '', lname: '', username: '', password: '', phone: '', email: '', role: 'user'
    });
    const [token, setToken] = useState('');
    const [search, setSearch] = useState('');
    const [sortKey, setSortKey] = useState('name');
    const [sortDir, setSortDir] = useState('asc');

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        setToken(user.token);
        if (user.token) {
            fetchUsers(user.token);
            fetchPublicData();
        }
    }, []);

    const fetchUsers = async (t = token) => {
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://192.168.0.112:5250'}/api/admin/users`, { headers: { 'Authorization': `Bearer ${t}` } });
            setUsers(await res.json());
        } catch (err) { console.error(err); }
    };

    const fetchPublicData = async () => {
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://192.168.0.112:5250'}/api/public/data`);
            setPublicData(await res.json());
        } catch (err) { console.error(err); }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const trimUser = formData.username.trim();
        const trimEmp = formData.emp_id.trim();
        if (!trimUser) return;
        const dupUsername = users.find(u => u.username.toLowerCase() === trimUser.toLowerCase() && u.id !== formData.id);
        if (dupUsername) { showAlert({ title: t('duplicateData'), message: `Username "${trimUser}" ${t('alreadyExists')}`, type: 'warning' }); return; }
        if (trimEmp) {
            const dupEmp = users.find(u => u.emp_id && u.emp_id.toLowerCase() === trimEmp.toLowerCase() && u.id !== formData.id);
            if (dupEmp) { showAlert({ title: t('duplicateData'), message: `Employee ID "${trimEmp}" ${t('alreadyExists')}`, type: 'warning' }); return; }
        }
        const method = formData.id ? 'PUT' : 'POST';
        const url = formData.id ? `${process.env.NEXT_PUBLIC_API_URL || 'http://192.168.0.112:5250'}/api/admin/users/${formData.id}` : `${process.env.NEXT_PUBLIC_API_URL || 'http://192.168.0.112:5250'}/api/admin/users`;
        try {
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ ...formData, username: trimUser, emp_id: trimEmp })
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                showAlert({ title: 'Error', message: errorData.message || 'Failed to update user', type: 'error' });
                return;
            }

            setFormData({
                id: null, location_id: '', company_id: '', site_id: '', department_id: '',
                emp_id: '', name: '', lname: '', username: '', password: '', phone: '', email: '', role: 'user'
            });
            fetchUsers();
            showAlert({ title: 'Success', message: formData.id ? 'User updated successfully' : 'User created successfully', type: 'success' });
        } catch (err) {
            console.error(err);
            showAlert({ title: 'Error', message: 'Network error or failed to connect to the server', type: 'error' });
        }
    };

    const toggleStatus = async (id, currentStatus) => {
        try {
            await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://192.168.0.112:5250'}/api/admin/users/${id}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ status: currentStatus === 1 ? 0 : 1 })
            });
            fetchUsers();
        } catch (err) { console.error(err); }
    };

    const handleDelete = (id) => {
        showConfirm({
            title: t('deleteUserConfirm'),
            message: t('deleteUserMsg'),
            onConfirm: async () => {
                try {
                    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://192.168.0.112:5250'}/api/admin/users/${id}`, {
                        method: 'DELETE',
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (!res.ok) {
                        const errData = await res.json();
                        if (errData.errorPattern === 'FOREIGN_KEY_CONSTRAINT') {
                            showAlert({ title: 'Error', message: t('deleteUserErrorRef'), type: 'error' });
                        } else {
                            showAlert({ title: 'Error', message: errData.message || 'Failed to delete user', type: 'error' });
                        }
                        return;
                    }
                    showAlert({ title: 'Success', message: 'User deleted successfully', type: 'success' });
                    fetchUsers();
                } catch (err) {
                    console.error(err);
                    showAlert({ title: 'Error', message: 'Network error', type: 'error' });
                }
            }
        });
    };

    // Derived cascading options - Strict mode (must select parent first)
    const availableCompanies = formData.location_id ? (publicData.companies?.filter(c => c.location_id === parseInt(formData.location_id)) || []) : [];
    const availableSites = formData.company_id ? (publicData.sites?.filter(s => s.company_id === parseInt(formData.company_id)) || []) : [];
    const availableDepartments = formData.site_id ? (publicData.departments?.filter(d => d.site_id === parseInt(formData.site_id)) || []) : [];

    const toggleSort = (key) => {
        if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortKey(key); setSortDir('asc'); }
    };
    const sortArrow = (key) => sortKey === key ? (sortDir === 'asc' ? ' ▲' : ' ▼') : '';

    const filteredData = useMemo(() => {
        let data = [...users];
        if (search.trim()) {
            const q = search.toLowerCase();
            data = data.filter(u =>
                (u.username || '').toLowerCase().includes(q) ||
                (u.name || '').toLowerCase().includes(q) ||
                (u.lname || '').toLowerCase().includes(q) ||
                (`${u.name} ${u.lname}`).toLowerCase().includes(q) ||
                (u.emp_id || '').toLowerCase().includes(q) ||
                (u.role || '').toLowerCase().includes(q) ||
                (u.dept_name || '').toLowerCase().includes(q) ||
                String(u.id).includes(q)
            );
        }
        data.sort((a, b) => {
            let va, vb;
            if (sortKey === 'fullname') {
                va = `${a.name || ''} ${a.lname || ''}`.toLowerCase();
                vb = `${b.name || ''} ${b.lname || ''}`.toLowerCase();
            } else {
                va = a[sortKey]; vb = b[sortKey];
            }
            if (typeof va === 'string') { va = va.toLowerCase(); vb = (vb || '').toLowerCase(); }
            if (va < vb) return sortDir === 'asc' ? -1 : 1;
            if (va > vb) return sortDir === 'asc' ? 1 : -1;
            return 0;
        });
        return data;
    }, [users, search, sortKey, sortDir]);

    const thStyle = { cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' };

    return (
        <div className="animate-fade-in">
            <h2 style={{ color: 'var(--color-primary)', marginBottom: '1.5rem' }}>Manage Users</h2>

            <div className="glass-card" style={{ marginBottom: '2rem' }}>
                <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', alignItems: 'end' }}>

                    <div className="form-group"><label className="label">Location</label>
                        <StyledSelect
                            options={publicData.locations?.map(l => ({ value: l.id, label: l.name })) || []}
                            value={formData.location_id}
                            onChange={(val) => setFormData({ ...formData, location_id: val, company_id: '', site_id: '', department_id: '' })}
                            placeholder="Select Location"
                        />
                    </div>
                    <div className="form-group"><label className="label">Company</label>
                        <StyledSelect
                            options={availableCompanies.map(c => ({ value: c.id, label: `${c.name}${c.description ? ` — ${c.description}` : ''}` }))}
                            value={formData.company_id}
                            onChange={(val) => setFormData({ ...formData, company_id: val, site_id: '', department_id: '' })}
                            disabled={!formData.location_id}
                            placeholder="Select Company"
                        />
                    </div>
                    <div className="form-group"><label className="label">Site</label>
                        <StyledSelect
                            options={availableSites.map(s => ({ value: s.id, label: `${s.name}${s.description ? ` — ${s.description}` : ''}` }))}
                            value={formData.site_id}
                            onChange={(val) => setFormData({ ...formData, site_id: val, department_id: '' })}
                            disabled={!formData.company_id}
                            placeholder="Select Site"
                        />
                    </div>
                    <div className="form-group"><label className="label">Department</label>
                        <StyledSelect
                            options={availableDepartments.map(d => ({ value: d.id, label: `${d.name}${d.description ? ` — ${d.description}` : ''}` }))}
                            value={formData.department_id}
                            onChange={(val) => setFormData({ ...formData, department_id: val })}
                            disabled={!formData.site_id}
                            placeholder="Select Department"
                        />
                    </div>

                    <div className="form-group"><label className="label">Employee ID</label>
                        <input type="text" className="input" value={formData.emp_id} onChange={e => setFormData({ ...formData, emp_id: e.target.value })} />
                    </div>
                    <div className="form-group"><label className="label">First Name *</label>
                        <input type="text" className="input" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                    </div>
                    <div className="form-group"><label className="label">Last Name *</label>
                        <input type="text" className="input" required value={formData.lname} onChange={e => setFormData({ ...formData, lname: e.target.value })} />
                    </div>
                    <div className="form-group"><label className="label">Role *</label>
                        <StyledSelect
                            options={[
                                { value: 'user', label: 'General User' },
                                { value: 'it', label: 'Super User (IT)' },
                                { value: 'admin', label: 'Admin' },
                                { value: 'pending_guest', label: 'Pending Guest' }
                            ]}
                            value={formData.role}
                            onChange={(val) => setFormData({ ...formData, role: val || 'user' })}
                            isClearable={false}
                        />
                    </div>

                    <div className="form-group"><label className="label">Username *</label>
                        <input type="text" className="input" required value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value })} />
                    </div>
                    <div className="form-group"><label className="label">Password {!formData.id && '*'}</label>
                        <input type="password" className="input" required={!formData.id} placeholder={formData.id ? "Leave blank to keep" : ""} value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} />
                    </div>

                    <div className="form-group" style={{ gridColumn: 'span 2' }}>
                        <label className="label" style={{ visibility: 'hidden' }}>Action</label>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>{formData.id ? 'Update' : 'Add'} User</button>
                            {formData.id && <button type="button" className="btn btn-outline" onClick={() => setFormData({ id: null, location_id: '', company_id: '', site_id: '', department_id: '', emp_id: '', name: '', lname: '', username: '', password: '', phone: '', email: '', role: 'user' })}>Cancel</button>}
                        </div>
                    </div>
                </form>
            </div>

            <div className="glass-card" style={{ marginBottom: '1rem', padding: '0.75rem 1.25rem' }}>
                <input type="text" className="input" placeholder="Search users..." value={search} onChange={e => setSearch(e.target.value)} style={{ margin: 0 }} />
            </div>

            <div className="table-container">
                <table className="table" style={{ fontSize: '0.85rem' }}>
                    <thead>
                        <tr>
                            <th style={thStyle} onClick={() => toggleSort('id')}>ID{sortArrow('id')}</th>
                            <th style={thStyle} onClick={() => toggleSort('username')}>Username{sortArrow('username')}</th>
                            <th style={thStyle} onClick={() => toggleSort('fullname')}>Name{sortArrow('fullname')}</th>
                            <th style={thStyle} onClick={() => toggleSort('role')}>Role{sortArrow('role')}</th>
                            <th style={thStyle} onClick={() => toggleSort('dept_name')}>Dept{sortArrow('dept_name')}</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredData.length > 0 ? filteredData.map(user => (
                            <tr key={user.id} className={formData.id === user.id ? 'editing-row' : ''}>
                                <td data-label="ID">{user.id}</td>
                                <td data-label="Username">{user.username}</td>
                                <td data-label="Name">{user.name} {user.lname}</td>
                                <td data-label="Role"><span className={`badge badge-${user.role === 'admin' ? 'error' : user.role === 'it' ? 'warning' : user.role === 'pending_guest' ? 'info' : 'success'}`}>{user.role}</span></td>
                                <td data-label="Dept">{user.dept_name || '-'}</td>
                                <td data-label="Status">
                                    <label className="switch">
                                        <input type="checkbox" checked={user.status === 1} onChange={() => toggleStatus(user.id, user.status)} />
                                        <span className="slider"></span>
                                    </label>
                                </td>
                                <td data-label="Actions">
                                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                                        <button className="btn btn-outline" style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }} onClick={() => setFormData({
                                            id: user.id || null,
                                            location_id: user.location_id != null ? String(user.location_id) : '',
                                            company_id: user.company_id != null ? String(user.company_id) : '',
                                            site_id: user.site_id != null ? String(user.site_id) : '',
                                            department_id: user.department_id != null ? String(user.department_id) : '',
                                            emp_id: user.emp_id || '',
                                            name: user.name || '',
                                            lname: user.lname || '',
                                            username: user.username || '',
                                            password: '',
                                            phone: user.phone || '',
                                            email: user.email || '',
                                            role: user.role || 'user'
                                        })}>Edit</button>
                                        <button className="btn btn-outline" style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', borderColor: 'var(--color-error)', color: 'var(--color-error)' }} onClick={() => handleDelete(user.id)}>Delete</button>
                                    </div>
                                </td>
                            </tr>
                        )) : <tr><td colSpan="7" style={{ textAlign: 'center' }}>No users found</td></tr>}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
