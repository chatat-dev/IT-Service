'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLanguage } from '../../components/LanguageProvider';
import { useModal } from '../../components/ModalProvider';
import { FiPlus, FiMonitor, FiSearch, FiEdit2, FiInfo, FiTrash2 } from 'react-icons/fi';

export default function ComputersList() {
    const { t } = useLanguage();
    const router = useRouter();
    const { showAlert, showConfirm } = useModal();
    const [token, setToken] = useState('');
    const [computers, setComputers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        if (user?.role !== 'it' && user?.role !== 'admin' && user?.role !== 'super_user') {
            router.push('/login');
            return;
        }
        setToken(user.token);
        fetchComputers(user.token);
    }, []);

    const fetchComputers = async (authToken, query = '') => {
        setLoading(true);
        try {
            const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://192.168.0.112:5250'}/api/computers${query ? `?keyword=${encodeURIComponent(query)}` : ''}`;
            const res = await fetch(url, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            if (res.ok) {
                const data = await res.json();
                setComputers(data);
            } else {
                console.error('Failed to fetch computers');
            }
        } catch (err) {
            console.error('Network Error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e) => {
        e.preventDefault();
        fetchComputers(token, searchTerm);
    };

    const handleDelete = async (computerId, assetName) => {
        showConfirm({
            title: 'Confirm Delete',
            message: `Are you sure you want to delete computer "${assetName}"? This action cannot be undone.`,
            onConfirm: async () => {
                try {
                    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://192.168.0.112:5250'}/api/computers/${computerId}`, {
                        method: 'DELETE',
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (res.ok) {
                        showAlert({ title: 'Success', message: 'Computer deleted successfully', type: 'success' });
                        setComputers(computers.filter(c => c.id !== computerId));
                    } else {
                        const errorData = await res.json();
                        showAlert({ title: 'Error', message: errorData.message || 'Failed to delete computer', type: 'error' });
                    }
                } catch (err) {
                    console.error('Network Error:', err);
                    showAlert({ title: 'Error', message: 'Network error occurred while deleting', type: 'error' });
                }
            }
        });
    };

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '3rem' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
                <div style={{ minWidth: 0 }}>
                    <h1 style={{ fontSize: 'clamp(1.4rem, 5vw, 2.5rem)', fontWeight: '800', margin: 0, color: 'var(--color-text-main)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <FiMonitor color="var(--color-primary)" /> {t('listComputer') || 'Inventory'}
                    </h1>
                    <p style={{ color: 'var(--color-text-muted)', margin: '0.5rem 0 0', fontSize: '0.95rem' }}>
                        {t('manageTrackAssets') || 'Manage and track hardware assets.'}
                    </p>
                </div>
                <Link href="/it/computers/add" style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem',
                    borderRadius: '0.75rem', background: 'var(--color-primary)', color: 'white',
                    fontWeight: '600', textDecoration: 'none', boxShadow: '0 4px 12px rgba(79,70,229,0.25)', transition: 'transform 0.2s',
                    whiteSpace: 'nowrap', flex: '0 0 auto'
                }}>
                    <FiPlus /> {t('addComputer') || 'Add Computer'}
                </Link>
            </div>

            <div style={{ background: 'var(--color-bg-card)', padding: '1.5rem', borderRadius: '1.5rem', boxShadow: '0 4px 24px rgba(0,0,0,0.06)', marginBottom: '2rem' }}>
                <form onSubmit={handleSearch} style={{ display: 'flex', gap: '1rem' }}>
                    <div style={{ flex: 1, position: 'relative' }}>
                        <FiSearch style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)', fontSize: '1.25rem' }} />
                        <input
                            type="text"
                            placeholder={t('searchInventory') || "Search by Asset No, Device Name, Emp ID..."}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{
                                width: '100%', padding: '1rem 1rem 1rem 3rem', borderRadius: '1rem',
                                border: '1px solid rgba(0,0,0,0.1)', background: 'var(--color-bg-main)',
                                color: 'var(--color-text-main)', fontSize: '1rem', outline: 'none'
                            }}
                        />
                    </div>
                    <button type="submit" style={{
                        padding: '1rem 2rem', borderRadius: '1rem', background: 'var(--color-bg-main)',
                        border: '1px solid rgba(0,0,0,0.1)', color: 'var(--color-text-main)', fontWeight: '600', cursor: 'pointer'
                    }}>
                        {t('search') || 'Search'}
                    </button>
                </form>
            </div>

            <div className="desktop-only" style={{ background: 'var(--color-bg-card)', borderRadius: '1.5rem', boxShadow: '0 4px 24px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ background: 'rgba(0,0,0,0.02)', borderBottom: '2px solid rgba(0,0,0,0.05)' }}>
                                <th style={{ padding: '1.25rem 1.5rem', color: 'var(--color-text-main)', fontWeight: '600' }}>{t('pcAssetNo') || 'Asset No.'}</th>
                                <th style={{ padding: '1.25rem 1.5rem', color: 'var(--color-text-main)', fontWeight: '600' }}>{t('deviceName') || 'Device Name'}</th>
                                <th style={{ padding: '1.25rem 1.5rem', color: 'var(--color-text-main)', fontWeight: '600' }}>{t('deviceType') || 'Type'}</th>
                                <th style={{ padding: '1.25rem 1.5rem', color: 'var(--color-text-main)', fontWeight: '600' }}>{t('employeeName') || 'Employee'}</th>
                                <th style={{ padding: '1.25rem 1.5rem', color: 'var(--color-text-main)', fontWeight: '600' }}>{t('department') || 'Department'}</th>
                                <th style={{ padding: '1.25rem 1.5rem', color: 'var(--color-text-main)', fontWeight: '600' }}>{t('statusPc') || 'Status'}</th>
                                <th style={{ padding: '1.25rem 1.5rem', textAlign: 'center', color: 'var(--color-text-main)', fontWeight: '600' }}>{t('actions') || 'Actions'}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>Loading inventory...</td></tr>
                            ) : computers.length === 0 ? (
                                <tr><td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>No computers found.</td></tr>
                            ) : (
                                computers.map(comp => (
                                    <tr key={comp.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.05)', transition: 'background 0.2s' }}>
                                        <td style={{ padding: '1.25rem 1.5rem', fontWeight: '500' }}>{comp.pc_asset_no || '-'}</td>
                                        <td style={{ padding: '1.25rem 1.5rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                {comp.device_name || '-'}
                                                {(!comp.device_type_id || !comp.device_name || !comp.purchase_date || !comp.serial_number) && (
                                                    <div title="Incomplete Information (Missing SN, OS, Type, or Date)" style={{
                                                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                                        width: '20px', height: '20px', borderRadius: '50%',
                                                        background: 'rgba(234, 179, 8, 0.15)', color: '#eab308',
                                                        fontSize: '0.85rem', fontWeight: 'bold', cursor: 'help'
                                                    }}>!</div>
                                                )}
                                            </div>
                                        </td>
                                        <td style={{ padding: '1.25rem 1.5rem' }}>
                                            <span style={{ background: 'rgba(79, 70, 229, 0.1)', color: 'var(--color-primary)', padding: '0.25rem 0.75rem', borderRadius: '1rem', fontSize: '0.85rem', fontWeight: '600' }}>
                                                {comp.device_type_name || 'N/A'}
                                            </span>
                                        </td>
                                        <td style={{ padding: '1.25rem 1.5rem' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                <span style={{ fontWeight: '500' }}>{comp.emp_name || '-'}</span>
                                                <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>{comp.emp_id || ''}</span>
                                            </div>
                                        </td>
                                        <td style={{ padding: '1.25rem 1.5rem', color: 'var(--color-text-muted)' }}>{comp.department_name || '-'}</td>
                                        <td style={{ padding: '1.25rem 1.5rem' }}>
                                            <span style={{
                                                display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                                                color: comp.status_pc === 'Y' ? 'var(--color-success)' : 'var(--color-danger)',
                                                fontWeight: '600', fontSize: '0.9rem'
                                            }}>
                                                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: comp.status_pc === 'Y' ? 'var(--color-success)' : 'var(--color-danger)' }}></span>
                                                {comp.status_pc === 'Y' ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td style={{ padding: '1.25rem 1.5rem', textAlign: 'center' }}>
                                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                                                <Link href={`/it/computers/${comp.id}`} style={{
                                                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                                    width: '36px', height: '36px', borderRadius: '0.75rem',
                                                    background: 'rgba(79, 70, 229, 0.1)', color: 'var(--color-primary)',
                                                    transition: 'all 0.2s', textDecoration: 'none'
                                                }} title="Edit/View">
                                                    <FiEdit2 />
                                                </Link>
                                                <button onClick={() => handleDelete(comp.id, comp.pc_asset_no || comp.device_name)} style={{
                                                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                                    width: '36px', height: '36px', borderRadius: '0.75rem',
                                                    background: 'rgba(239, 68, 68, 0.1)', color: 'var(--color-danger)', border: 'none',
                                                    transition: 'all 0.2s', cursor: 'pointer'
                                                }} title="Delete">
                                                    <FiTrash2 />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Mobile View */}
            <div className="mobile-only" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {loading ? (
                    <div className="glass-card" style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>Loading inventory...</div>
                ) : computers.length === 0 ? (
                    <div className="glass-card" style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>No computers found.</div>
                ) : (
                    computers.map(comp => (
                        <div key={comp.id} className="glass-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                    <strong style={{ fontSize: '1.1rem', color: 'var(--color-text-main)' }}>{comp.pc_asset_no || '-'}</strong>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
                                        {comp.device_name || '-'}
                                        {(!comp.device_type_id || !comp.device_name || !comp.purchase_date || !comp.serial_number) && (
                                            <span title="Incomplete Information" style={{
                                                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                                width: '18px', height: '18px', borderRadius: '50%',
                                                background: 'rgba(234, 179, 8, 0.15)', color: '#eab308',
                                                fontSize: '0.8rem', fontWeight: 'bold'
                                            }}>!</span>
                                        )}
                                    </div>
                                </div>
                                <span style={{
                                    display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                                    color: comp.status_pc === 'Y' ? 'var(--color-success)' : 'var(--color-danger)',
                                    fontWeight: '600', fontSize: '0.85rem'
                                }}>
                                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: comp.status_pc === 'Y' ? 'var(--color-success)' : 'var(--color-danger)' }}></span>
                                    {comp.status_pc === 'Y' ? 'Active' : 'Inactive'}
                                </span>
                            </div>

                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                <span style={{ background: 'rgba(79, 70, 229, 0.1)', color: 'var(--color-primary)', padding: '0.2rem 0.6rem', borderRadius: '1rem', fontSize: '0.8rem', fontWeight: '600' }}>
                                    {comp.device_type_name || 'N/A'}
                                </span>
                            </div>

                            <div style={{ fontSize: '0.9rem', color: 'var(--color-text-main)', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                <div>👤 {comp.emp_name || '-'} {comp.emp_id ? `(${comp.emp_id})` : ''}</div>
                                <div style={{ color: 'var(--color-text-muted)' }}>🏢 {comp.department_name || '-'}</div>
                            </div>

                            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                                <Link href={`/it/computers/${comp.id}`} style={{
                                    flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                                    padding: '0.5rem', borderRadius: '0.5rem',
                                    background: 'rgba(79, 70, 229, 0.1)', color: 'var(--color-primary)',
                                    transition: 'all 0.2s', textDecoration: 'none', fontWeight: '600', fontSize: '0.9rem'
                                }}>
                                    <FiEdit2 /> Edit
                                </Link>
                                <button onClick={() => handleDelete(comp.id, comp.pc_asset_no || comp.device_name)} style={{
                                    flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                                    padding: '0.5rem', borderRadius: '0.5rem',
                                    background: 'rgba(239, 68, 68, 0.1)', color: 'var(--color-danger)', border: 'none',
                                    transition: 'all 0.2s', cursor: 'pointer', fontWeight: '600', fontSize: '0.9rem'
                                }}>
                                    <FiTrash2 /> Delete
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
