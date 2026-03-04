'use client';
import { useState, useEffect, use } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useLanguage } from '../../../components/LanguageProvider';
import { useModal } from '../../../components/ModalProvider';
import { FiSave, FiX, FiSearch, FiMonitor, FiCpu, FiHardDrive, FiActivity, FiUser, FiMapPin, FiInfo, FiPlus, FiTrash2, FiDownload, FiTool, FiEdit2 } from 'react-icons/fi';
import QRCode from 'qrcode';
import StyledSelect from '../../../components/StyledSelect';

export default function EditComputer({ params }) {
    const { showAlert, showConfirm } = useModal();
    const { t } = useLanguage();
    const router = useRouter();
    const [token, setToken] = useState('');
    const [currentUserId, setCurrentUserId] = useState(null);
    const [id, setId] = useState(null);

    useEffect(() => {
        // Bulletproof Vanilla JS fallback for Next 14/15 URL dynamic segments
        let finalId = null;
        if (typeof window !== 'undefined') {
            const pathParts = window.location.pathname.split('/');
            finalId = pathParts[pathParts.length - 1]; // e.g. /it/computers/4 => 4
        }
        setId(finalId);
    }, []);

    // Delay fetching until ID is resolved
    useEffect(() => {
        if (id) {
            console.log("Resolved ID:", id);
        }
    }, [id]);

    const [masterData, setMasterData] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // For employee search
    const [searchEmpId, setSearchEmpId] = useState('');
    const [isSearchingEmp, setIsSearchingEmp] = useState(false);

    // Initial 30 Fields Data Structure
    const [formData, setFormData] = useState({
        location_id: '',
        company_id: '',
        building_name: '',
        site_id: '',
        device_type_id: '',
        status_pc: 'Y',
        emp_id: '',
        emp_name: '',
        department_id: '',
        pc_asset_no: '',
        device_name: '',
        notebook_brand_model: '',
        serial_number: '',
        os_id: '',
        windows_product_key: '',
        ms_office_id: '',
        purchase_date: '',
        issue_date: '',
        cpu_core: '',
        ram_gb: '',
        script_install_status_id: '',
        vpn_status: 'N',
        backup_status: 'N',
        ups_asset_no: '',
        accessories: '',
        extension_no: '',
        notes: ['']
    });

    const [existingNotes, setExistingNotes] = useState([]);
    const [repairHistory, setRepairHistory] = useState([]);
    const [manualLogs, setManualLogs] = useState([]);
    const [showRepairForm, setShowRepairForm] = useState(false);
    const [repairForm, setRepairForm] = useState({ repair_date: '', description: '', solution: '' });
    const [editingLogId, setEditingLogId] = useState(null);
    const [deviceAge, setDeviceAge] = useState('');
    const [serviceLifeGroup, setServiceLifeGroup] = useState('');
    const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');

    useEffect(() => {
        if (!id) return; // Wait for id to be resolved
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        if (!user?.token) {
            // Not logged in — redirect to login with return path
            window.location.href = `/login?redirect=${encodeURIComponent(`/it/computers/${id}`)}`;
            return;
        }
        setToken(user.token);
        if (user?.id) setCurrentUserId(user.id);

        const load = async () => {
            await fetchMasterData();
            await fetchComputer(user.token);
            await fetchRepairHistory(user.token);
        };
        load();
    }, [id]);

    const generateQR = async () => {
        try {
            const url = `${window.location.origin}/it/computers/${id}`;
            const qrUrl = await QRCode.toDataURL(url, { width: 300, margin: 2, color: { dark: '#4f46e5', light: '#ffffff' } });
            setQrCodeDataUrl(qrUrl);
        } catch (err) {
            console.error('QR Generator failed', err);
        }
    };

    const downloadQR = () => {
        if (!qrCodeDataUrl) return;
        const link = document.createElement('a');
        link.href = qrCodeDataUrl;
        link.download = `PC-QR-${formData.pc_asset_no || id}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Age Calculation
    useEffect(() => {
        if (formData.purchase_date) {
            const purchase = new Date(formData.purchase_date);
            const now = new Date();
            if (purchase > now) {
                setDeviceAge('0 Years 0 Months');
                setServiceLifeGroup('0 - 5 Years');
                return;
            }
            let years = now.getFullYear() - purchase.getFullYear();
            let months = now.getMonth() - purchase.getMonth();
            if (months < 0) {
                years--;
                months += 12;
            }
            setDeviceAge(`${years} Years ${months} Months`);

            if (years <= 5) setServiceLifeGroup('0 - 5 Years');
            else if (years <= 10) setServiceLifeGroup('6 - 10 Years');
            else setServiceLifeGroup('11+ Years');
        } else {
            setDeviceAge('');
            setServiceLifeGroup('');
        }
    }, [formData.purchase_date]);

    // Dropdowns
    const availableCompanies = masterData.companies?.filter(c => !formData.location_id || c.location_id === parseInt(formData.location_id)) || [];
    const availableSites = masterData.sites?.filter(s => !formData.company_id || s.company_id === parseInt(formData.company_id)) || [];
    const availableDepartments = masterData.departments?.filter(d => !formData.site_id || d.site_id === parseInt(formData.site_id)) || [];

    const fetchMasterData = async () => {
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://192.168.0.112:5250'}/api/public/data`);
            if (res.ok) {
                const data = await res.json();
                setMasterData(data);
            }
        } catch (err) { console.error(err); }
    };

    const fetchComputer = async (authToken) => {
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://192.168.0.112:5250'}/api/computers/${id}`, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            if (res.ok) {
                const data = await res.json();
                const parseDate = (d) => d ? new Date(d).toISOString().split('T')[0] : '';
                setFormData({
                    location_id: data.location_id || '',
                    company_id: data.company_id || '',
                    building_name: data.building_name || '',
                    site_id: data.site_id || '',
                    device_type_id: data.device_type_id || '',
                    status_pc: data.status_pc || 'Y',
                    emp_id: data.emp_id || '',
                    emp_name: data.emp_name || '',
                    department_id: data.department_id || '',
                    pc_asset_no: data.pc_asset_no || '',
                    device_name: data.device_name || '',
                    notebook_brand_model: data.notebook_brand_model || '',
                    serial_number: data.serial_number || '',
                    os_id: data.os_id || '',
                    windows_product_key: data.windows_product_key || '',
                    ms_office_id: data.ms_office_id || '',
                    purchase_date: parseDate(data.purchase_date),
                    issue_date: parseDate(data.issue_date),
                    cpu_core: data.cpu_core || '',
                    ram_gb: data.ram_gb || '',
                    script_install_status_id: data.script_install_status_id || '',
                    vpn_status: data.vpn_status || 'N',
                    backup_status: data.backup_status || 'N',
                    ups_asset_no: data.ups_asset_no || '',
                    accessories: data.accessories || '',
                    extension_no: data.extension_no || '',
                    notes: [''] // Always leave 1 empty for new ones
                });
                setExistingNotes(data.notes || []);
                setSearchEmpId(data.emp_id || '');
                setIsLoading(false);
            } else {
                showAlert({ title: 'Error', message: 'Computer not found', type: 'error', onClose: () => router.push('/it/computers') });
            }
        } catch (err) {
            console.error(err);
            setIsLoading(false);
        }
    };

    const fetchRepairHistory = async (authToken) => {
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://192.168.0.112:5250'}/api/computers/${id}/repair-history`, {
                headers: { 'Authorization': `Bearer ${authToken || token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setRepairHistory(Array.isArray(data.tickets) ? data.tickets : []);
                setManualLogs(Array.isArray(data.manualLogs) ? data.manualLogs : []);
            }
        } catch (err) { console.error('Error fetching repair history:', err); }
    };

    const submitRepairLog = async () => {
        if (!repairForm.repair_date || !repairForm.description) return;
        try {
            const url = editingLogId
                ? `${process.env.NEXT_PUBLIC_API_URL || 'http://192.168.0.112:5250'}/api/computers/${id}/repair-logs/${editingLogId}`
                : `${process.env.NEXT_PUBLIC_API_URL || 'http://192.168.0.112:5250'}/api/computers/${id}/repair-logs`;
            const res = await fetch(url, {
                method: editingLogId ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(repairForm)
            });
            if (res.ok) {
                setRepairForm({ repair_date: '', description: '', solution: '' });
                setShowRepairForm(false);
                setEditingLogId(null);
                fetchRepairHistory();
            } else {
                const err = await res.json();
                alert(err.message || 'Error');
            }
        } catch (err) { console.error(err); }
    };

    const startEditLog = (log) => {
        const parseDate = (d) => d ? new Date(d).toISOString().split('T')[0] : '';
        setRepairForm({ repair_date: parseDate(log.repair_date), description: log.description || '', solution: log.solution || '' });
        setEditingLogId(log.id);
        setShowRepairForm(true);
    };

    const cancelRepairForm = () => {
        setShowRepairForm(false);
        setEditingLogId(null);
        setRepairForm({ repair_date: '', description: '', solution: '' });
    };

    const deleteRepairLog = async (logId) => {
        if (!confirm('ต้องการลบประวัติการซ่อมนี้?')) return;
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://192.168.0.112:5250'}/api/computers/${id}/repair-logs/${logId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                fetchRepairHistory();
            } else {
                const err = await res.json();
                alert(err.message || 'Error');
            }
        } catch (err) { console.error(err); }
    };

    const handleSearchEmployee = async () => {
        if (!searchEmpId.trim()) return;
        setIsSearchingEmp(true);
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://192.168.0.112:5250'}/api/computers/search-emp?emp_id=${encodeURIComponent(searchEmpId)}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setFormData(prev => ({
                    ...prev,
                    emp_id: data.emp_id || searchEmpId,
                    emp_name: `${data.name || ''} ${data.lname || ''}`.trim(),
                    department_id: data.department_id || prev.department_id || '',
                    company_id: data.company_id || prev.company_id || '',
                    site_id: data.site_id || prev.site_id || '',
                    location_id: data.location_id || prev.location_id || ''
                }));
                showAlert({ title: 'Success', message: 'Employee auto-filled.', type: 'success' });
            } else {
                showAlert({ title: 'Not Found', message: 'Employee not found.', type: 'warning' });
            }
        } catch (err) {
            console.error('Search error:', err);
        } finally {
            setIsSearchingEmp(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleNoteChange = (index, value) => {
        const newNotes = [...formData.notes];
        newNotes[index] = value;
        setFormData(prev => ({ ...prev, notes: newNotes }));
    };

    const addNoteField = () => setFormData(prev => ({ ...prev, notes: [...prev.notes, ''] }));
    const removeNoteField = (index) => {
        const newNotes = [...formData.notes];
        newNotes.splice(index, 1);
        setFormData(prev => ({ ...prev, notes: newNotes.length ? newNotes : [''] }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        showConfirm({
            title: 'Confirm Update',
            message: 'Are you sure you want to update this computer ?',
            onConfirm: async () => {
                setIsSubmitting(true);
                try {
                    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://192.168.0.112:5250'}/api/computers/${id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                        body: JSON.stringify(formData)
                    });

                    if (res.ok) {
                        showAlert({
                            title: 'Success',
                            message: 'Computer updated successfully.',
                            type: 'success',
                            onClose: () => {
                                // Reload to get fresh notes
                                window.location.reload();
                            }
                        });
                    } else {
                        const errData = await res.json();
                        showAlert({ title: 'Error', message: errData.message || 'Update failed', type: 'error' });
                    }
                } catch (err) {
                    showAlert({ title: 'Error', message: 'Network error.', type: 'error' });
                } finally {
                    setIsSubmitting(false);
                }
            }
        });
    };

    const cardStyle = { background: 'var(--color-bg-card)', padding: '2rem', borderRadius: '1.5rem', boxShadow: '0 4px 24px rgba(0,0,0,0.06)', marginBottom: '2rem' };
    const sectionTitleStyle = { fontSize: '1.25rem', fontWeight: '700', color: 'var(--color-primary)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', borderBottom: '2px solid rgba(79, 70, 229, 0.1)', paddingBottom: '0.5rem' };
    const labelStyle = { display: 'block', fontSize: '0.875rem', fontWeight: '600', color: 'var(--color-text-main)', marginBottom: '0.5rem' };
    const inputStyle = { width: '100%', padding: '0.75rem 1rem', borderRadius: '0.75rem', border: '1px solid rgba(0,0,0,0.1)', background: 'var(--color-bg-main)', color: 'var(--color-text-main)', fontSize: '0.95rem', outline: 'none' };
    const readOnlyStyle = { ...inputStyle, background: 'rgba(0,0,0,0.03)', color: 'var(--color-text-muted)', cursor: 'not-allowed' };
    const gridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' };

    if (isLoading) return <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)', fontWeight: '600' }}>Loading Data...</div>;

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '3rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', fontWeight: '800', margin: 0, color: 'var(--color-text-main)' }}>Update Computer</h1>
                    <p style={{ color: 'var(--color-text-muted)', margin: '0.5rem 0 0' }}>Ref ID: {id}</p>
                </div>

                <div style={{ background: 'var(--color-bg-card)', padding: '1rem', borderRadius: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', boxShadow: '0 4px 12px rgba(0,0,0,0.04)' }}>
                    {qrCodeDataUrl ? (
                        <img src={qrCodeDataUrl} alt="QR Code" style={{ width: '80px', height: '80px', borderRadius: '0.5rem' }} />
                    ) : (
                        <div style={{ width: '80px', height: '80px', background: 'rgba(0,0,0,0.03)', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', fontSize: '0.8rem', textAlign: 'center' }}>No QR</div>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <button onClick={generateQR} style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', border: '1px solid var(--color-primary)', background: 'transparent', color: 'var(--color-primary)', fontWeight: '600', cursor: 'pointer', fontSize: '0.85rem' }}>Generate QR</button>
                        {qrCodeDataUrl && <button onClick={downloadQR} style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', border: 'none', background: 'var(--color-primary)', color: 'white', fontWeight: '600', cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><FiDownload /> Download</button>}
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit}>
                <div style={cardStyle}>
                    <h2 style={sectionTitleStyle}><FiUser />{t('assignmentLocation')}</h2>
                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                        <div style={{ flex: 1, minWidth: '200px' }}>
                            <label style={labelStyle}>{t('searchEmpId')}</label>
                            <input type="text" value={searchEmpId} onChange={(e) => setSearchEmpId(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleSearchEmployee())} placeholder="Enter Employee ID..." style={inputStyle} />
                        </div>
                        <button type="button" onClick={handleSearchEmployee} disabled={isSearchingEmp} style={{ padding: '0.75rem 1.5rem', borderRadius: '0.75rem', background: 'var(--color-primary)', color: 'white', fontWeight: '600', border: 'none', cursor: isSearchingEmp ? 'not-allowed' : 'pointer' }}>
                            <FiSearch /> {isSearchingEmp ? 'Searching...' : 'Search'}
                        </button>
                    </div>

                    <div className="grid" style={gridStyle}>
                        <div><label style={labelStyle}>{t('employeeId')}</label><input type="text" name="emp_id" value={formData.emp_id} onChange={handleChange} required style={inputStyle} /></div>
                        <div><label style={labelStyle}>{t('employeeName')}</label><input type="text" name="emp_name" value={formData.emp_name} onChange={handleChange} required style={inputStyle} /></div>
                        <div><label style={labelStyle}>{t('extNoPhone')}</label><input type="text" name="extension_no" value={formData.extension_no} onChange={handleChange} style={inputStyle} /></div>
                        <div><label style={labelStyle}>{t('location')}</label>
                            <StyledSelect
                                options={masterData.locations?.map(l => ({ value: l.id, label: l.name })) || []}
                                value={formData.location_id}
                                onChange={(val) => setFormData(prev => ({ ...prev, location_id: val }))}
                                placeholder={t('selectLocation')}
                            />
                        </div>
                        <div><label style={labelStyle}>{t('company')}</label>
                            <StyledSelect
                                options={availableCompanies.map(c => ({ value: c.id, label: c.name }))}
                                value={formData.company_id}
                                onChange={(val) => setFormData(prev => ({ ...prev, company_id: val }))}
                                placeholder={t('selectCompany')}
                            />
                        </div>
                        <div><label style={labelStyle}>{t('buildingName')}</label><input type="text" name="building_name" value={formData.building_name} onChange={handleChange} style={inputStyle} /></div>
                        <div><label style={labelStyle}>{t('site')}</label>
                            <StyledSelect
                                options={availableSites.map(s => ({ value: s.id, label: s.name }))}
                                value={formData.site_id}
                                onChange={(val) => setFormData(prev => ({ ...prev, site_id: val }))}
                                placeholder={t('selectSite')}
                            />
                        </div>
                        <div><label style={labelStyle}>{t('department')}</label>
                            <StyledSelect
                                options={availableDepartments.map(d => ({ value: d.id, label: d.name }))}
                                value={formData.department_id}
                                onChange={(val) => setFormData(prev => ({ ...prev, department_id: val }))}
                                placeholder={t('selectDepartment')}
                            />
                        </div>
                    </div>
                </div>

                <div style={cardStyle}>
                    <h2 style={sectionTitleStyle}><FiMonitor />{t('hardwareDetails')}</h2>
                    <div className="grid" style={gridStyle}>
                        <div><label style={labelStyle}>{t('deviceType')}</label>
                            <StyledSelect
                                options={masterData.deviceTypes?.map(d => ({ value: d.id, label: d.name })) || []}
                                value={formData.device_type_id}
                                onChange={(val) => setFormData(prev => ({ ...prev, device_type_id: val }))}
                                placeholder={t('selectType')}
                            />
                        </div>
                        <div><label style={labelStyle}>{t('pcAssetNo')}</label><input type="text" name="pc_asset_no" value={formData.pc_asset_no} onChange={handleChange} style={inputStyle} /></div>
                        <div><label style={labelStyle}>{t('deviceName')}</label><input type="text" name="device_name" value={formData.device_name} onChange={handleChange} style={inputStyle} /></div>
                        <div><label style={labelStyle}>{t('notebookBrandModel')}</label><input type="text" name="notebook_brand_model" value={formData.notebook_brand_model} onChange={handleChange} style={inputStyle} /></div>
                        <div><label style={labelStyle}>{t('serialNumberSn')}</label><input type="text" name="serial_number" value={formData.serial_number} onChange={handleChange} style={inputStyle} /></div>
                        <div><label style={labelStyle}>{t('statusPc')}</label>
                            <div style={{ display: 'flex', gap: '1rem', padding: '0.75rem 0' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}><input type="radio" name="status_pc" value="Y" checked={formData.status_pc === 'Y'} onChange={handleChange} />{t('active')}</label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: 'var(--color-danger)' }}><input type="radio" name="status_pc" value="N" checked={formData.status_pc === 'N'} onChange={handleChange} />{t('inactive')}</label>
                            </div>
                        </div>
                    </div>
                </div>

                <div style={cardStyle}>
                    <h2 style={sectionTitleStyle}><FiCpu /> {t('specificationsSoftware')}</h2>
                    <div className="grid" style={gridStyle}>
                        <div><label style={labelStyle}>{t('cpuCore')}</label><input type="text" name="cpu_core" value={formData.cpu_core} onChange={handleChange} style={inputStyle} /></div>
                        <div><label style={labelStyle}>{t('ramGb')}</label><input type="text" name="ram_gb" value={formData.ram_gb} onChange={handleChange} style={inputStyle} /></div>
                        <div><label style={labelStyle}>{t('os')}</label>
                            <StyledSelect
                                options={masterData.operatingSystems?.map(o => ({ value: o.id, label: o.name })) || []}
                                value={formData.os_id}
                                onChange={(val) => setFormData(prev => ({ ...prev, os_id: val }))}
                                placeholder={t('selectOs')}
                            />
                        </div>
                        <div><label style={labelStyle}>{t('windowsProductKey')}</label><input type="text" name="windows_product_key" value={formData.windows_product_key} onChange={handleChange} style={inputStyle} /></div>
                        <div><label style={labelStyle}>{t('msOffice')}</label>
                            <StyledSelect
                                options={masterData.msOffices?.map(m => ({ value: m.id, label: m.name })) || []}
                                value={formData.ms_office_id}
                                onChange={(val) => setFormData(prev => ({ ...prev, ms_office_id: val }))}
                                placeholder={t('selectMsOffice')}
                            />
                        </div>
                        <div><label style={labelStyle}>{t('scriptInstallStatus')}</label>
                            <StyledSelect
                                options={masterData.scriptInstallStatuses?.map(s => ({ value: s.id, label: s.name })) || []}
                                value={formData.script_install_status_id}
                                onChange={(val) => setFormData(prev => ({ ...prev, script_install_status_id: val }))}
                                placeholder={t('selectStatus')}
                            />
                        </div>
                    </div>
                </div>

                <div style={cardStyle}>
                    <h2 style={sectionTitleStyle}><FiActivity /> {t('networkAdditionalAssets')}</h2>
                    <div className="grid" style={gridStyle}>
                        <div><label style={labelStyle}>{t('vpnStatus')}</label>
                            <div style={{ display: 'flex', gap: '1rem', padding: '0.75rem 0' }}>
                                <label><input type="radio" name="vpn_status" value="Y" checked={formData.vpn_status === 'Y'} onChange={handleChange} />{t('yes')}</label>
                                <label><input type="radio" name="vpn_status" value="N" checked={formData.vpn_status === 'N'} onChange={handleChange} />{t('no')}</label>
                            </div>
                        </div>
                        <div><label style={labelStyle}>{t('backupStatus')}</label>
                            <div style={{ display: 'flex', gap: '1rem', padding: '0.75rem 0' }}>
                                <label><input type="radio" name="backup_status" value="Y" checked={formData.backup_status === 'Y'} onChange={handleChange} />{t('yes')}</label>
                                <label><input type="radio" name="backup_status" value="N" checked={formData.backup_status === 'N'} onChange={handleChange} />{t('no')}</label>
                            </div>
                        </div>
                        <div><label style={labelStyle}>{t('upsAssetNo')}</label><input type="text" name="ups_asset_no" value={formData.ups_asset_no} onChange={handleChange} style={inputStyle} /></div>
                        <div><label style={labelStyle}>{t('accessories')}</label><input type="text" name="accessories" value={formData.accessories} onChange={handleChange} style={inputStyle} /></div>
                    </div>
                </div>

                <div style={cardStyle}>
                    <h2 style={sectionTitleStyle}><FiInfo /> {t('lifespanWarranty')}</h2>
                    <div className="grid" style={gridStyle}>
                        <div><label style={labelStyle}>{t('purchaseDate')}</label><input type="date" name="purchase_date" value={formData.purchase_date} onChange={handleChange} style={inputStyle} /></div>
                        <div><label style={labelStyle}>{t('issueDate')}</label><input type="date" name="issue_date" value={formData.issue_date} onChange={handleChange} style={inputStyle} /></div>
                        <div><label style={labelStyle}>{t('deviceAgeAuto')}</label><input type="text" value={deviceAge} readOnly style={readOnlyStyle} /></div>
                        <div><label style={labelStyle}>{t('serviceLifeGroupAuto')}</label><input type="text" value={serviceLifeGroup} readOnly style={{ ...readOnlyStyle, fontWeight: 'bold' }} /></div>
                    </div>
                </div>

                <div style={cardStyle}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '2px solid rgba(79, 70, 229, 0.1)', paddingBottom: '0.75rem' }}>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '0.75rem', margin: 0 }}>
                            <FiInfo className="desktop-only" /> 
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span>{t('additionalNotes') || 'Additional Notes'}</span>
                                <span className="mobile-only" style={{ fontSize: '0.75rem', fontWeight: 'normal', color: 'var(--color-text-muted)' }}>บันทึกเพิ่มเติม</span>
                            </div>
                        </h2>
                        <button type="button" onClick={addNoteField} style={{ background: 'var(--color-primary)', color: '#fff', border: 'none', padding: '0.6rem 1.2rem', borderRadius: '2rem', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', boxShadow: '0 4px 12px rgba(79,70,229,0.25)' }}>
                            <FiPlus strokeWidth={3} /> Add New Note
                        </button>
                    </div>

                    {/* Show Existing Notes */}
                    {existingNotes && existingNotes.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem' }}>
                            <h4 style={{ margin: 0, color: 'var(--color-text-muted)' }}>Past Notes:</h4>
                            {existingNotes.map((note) => (
                                <div key={note.id} style={{ padding: '1rem', background: 'rgba(0,0,0,0.02)', borderRadius: '0.75rem', borderLeft: '4px solid var(--color-primary)' }}>
                                    <p style={{ margin: '0 0 0.5rem', fontSize: '0.95rem', color: 'var(--color-text-main)' }}>{note.note_text}</p>
                                    <small style={{ color: 'var(--color-text-muted)' }}>By: {note.user_name} on {new Date(note.created_at).toLocaleString()}</small>
                                </div>
                            ))}
                        </div>
                    )}

                    <h4 style={{ margin: '0 0 1rem', color: 'var(--color-text-muted)' }}>New Note Entries:</h4>
                    {formData.notes.map((note, index) => (
                        <div key={index} style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                            <textarea value={note} onChange={(e) => handleNoteChange(index, e.target.value)} placeholder={`New note ${index + 1}...`} style={{ ...inputStyle, resize: 'vertical', minHeight: '60px' }} />
                            {formData.notes.length > 1 && (
                                <button type="button" onClick={() => removeNoteField(index)} style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--color-danger)', border: 'none', padding: '0 1rem', borderRadius: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <FiTrash2 size={20} />
                                </button>
                            )}
                        </div>
                    ))}
                </div>

                {/* Repair History */}
                <div style={cardStyle}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '2px solid rgba(79, 70, 229, 0.1)', paddingBottom: '0.75rem' }}>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '0.75rem', margin: 0 }}>
                            <FiTool className="desktop-only" />
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span>ประวัติการซ่อม</span>
                                <span style={{ fontSize: '0.8rem', fontWeight: 'normal', color: 'var(--color-text-muted)', marginTop: '-0.1rem' }}>(Repair History)</span>
                            </div>
                        </h2>
                        <button type="button" onClick={() => setShowRepairForm(!showRepairForm)} style={{ background: 'rgba(79, 70, 229, 0.1)', color: 'var(--color-primary)', border: 'none', padding: '0.6rem 1.2rem', borderRadius: '0.5rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                            <FiPlus strokeWidth={3} /> เพิ่มประวัติการซ่อม
                        </button>
                    </div>

                    {showRepairForm && (
                        <div style={{ padding: '1.25rem', background: 'rgba(79,70,229,0.03)', borderRadius: '1rem', border: '1px solid rgba(79,70,229,0.1)', marginBottom: '1.5rem' }}>
                            <h4 style={{ margin: '0 0 1rem', color: 'var(--color-primary)', fontWeight: '600' }}>{editingLogId ? 'แก้ไขประวัติการซ่อม' : 'เพิ่มประวัติการซ่อมใหม่'}</h4>
                            <div style={{ marginBottom: '1rem', maxWidth: '280px' }}>
                                <label style={labelStyle}>วันที่ซ่อม *</label>
                                <input type="date" value={repairForm.repair_date} onChange={e => setRepairForm(p => ({ ...p, repair_date: e.target.value }))} style={{ ...inputStyle, background: '#fff' }} required />
                            </div>
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={labelStyle}>รายละเอียดปัญหา *</label>
                                <textarea value={repairForm.description} onChange={e => setRepairForm(p => ({ ...p, description: e.target.value }))} placeholder="อธิบายอาการหรือปัญหาที่พบ..." style={{ ...inputStyle, minHeight: '60px', resize: 'vertical', background: '#fff' }} required />
                            </div>
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={labelStyle}>วิธีแก้ไข</label>
                                <textarea value={repairForm.solution} onChange={e => setRepairForm(p => ({ ...p, solution: e.target.value }))} placeholder="อธิบายวิธีแก้ไข..." style={{ ...inputStyle, minHeight: '60px', resize: 'vertical', background: '#fff' }} />
                            </div>
                            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                                <button type="button" onClick={cancelRepairForm} style={{ padding: '0.5rem 1.25rem', borderRadius: '0.5rem', border: '1px solid rgba(0,0,0,0.1)', background: 'transparent', cursor: 'pointer', fontWeight: '600' }}>ยกเลิก</button>
                                <button type="button" onClick={submitRepairLog} disabled={!repairForm.repair_date || !repairForm.description} style={{ padding: '0.5rem 1.25rem', borderRadius: '0.5rem', border: 'none', background: 'var(--color-primary)', color: 'white', fontWeight: '600', cursor: (!repairForm.repair_date || !repairForm.description) ? 'not-allowed' : 'pointer', opacity: (!repairForm.repair_date || !repairForm.description) ? 0.5 : 1 }}>
                                    <FiSave style={{ marginRight: '0.25rem', verticalAlign: 'middle' }} /> {editingLogId ? 'อัปเดต' : 'บันทึก'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Ticket-based repairs */}
                    {repairHistory.length > 0 && (
                        <>
                            <h4 style={{ margin: '0 0 0.75rem', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>จาก Ticket ({repairHistory.length})</h4>
                            
                            {/* Desktop Table */}
                            <div className="desktop-only" style={{ overflowX: 'auto', marginBottom: '1.5rem' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                                    <thead>
                                        <tr style={{ background: 'rgba(79,70,229,0.05)', textAlign: 'left' }}>
                                            <th style={{ padding: '0.6rem 0.75rem', fontWeight: '700', borderBottom: '2px solid rgba(79,70,229,0.1)' }}>Ticket No.</th>
                                            <th style={{ padding: '0.6rem 0.75rem', fontWeight: '700', borderBottom: '2px solid rgba(79,70,229,0.1)' }}>วันที่แจ้ง</th>
                                            <th style={{ padding: '0.6rem 0.75rem', fontWeight: '700', borderBottom: '2px solid rgba(79,70,229,0.1)' }}>ผู้แจ้ง</th>
                                            <th style={{ padding: '0.6rem 0.75rem', fontWeight: '700', borderBottom: '2px solid rgba(79,70,229,0.1)' }}>หมวดหมู่</th>
                                            <th style={{ padding: '0.6rem 0.75rem', fontWeight: '700', borderBottom: '2px solid rgba(79,70,229,0.1)' }}>รายละเอียด</th>
                                            <th style={{ padding: '0.6rem 0.75rem', fontWeight: '700', borderBottom: '2px solid rgba(79,70,229,0.1)' }}>ผู้รับผิดชอบ</th>
                                            <th style={{ padding: '0.6rem 0.75rem', fontWeight: '700', borderBottom: '2px solid rgba(79,70,229,0.1)' }}>สถานะ</th>
                                            <th style={{ padding: '0.6rem 0.75rem', fontWeight: '700', borderBottom: '2px solid rgba(79,70,229,0.1)' }}>วิธีแก้ไข</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {repairHistory.map(tk => {
                                            const requester = tk.guest_name || `${tk.requester_name || ''} ${tk.requester_lname || ''}`.trim() || '-';
                                            const statusColors = { open: '#f59e0b', in_progress: '#3b82f6', closed: '#10b981' };
                                            const statusLabels = { open: 'Open', in_progress: 'In Progress', closed: 'Closed' };
                                            return (
                                                <tr key={tk.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                                                    <td style={{ padding: '0.6rem 0.75rem', fontWeight: '600', color: 'var(--color-primary)' }}>{tk.ticket_no}</td>
                                                    <td style={{ padding: '0.6rem 0.75rem' }}>{new Date(tk.created_at).toLocaleDateString()}</td>
                                                    <td style={{ padding: '0.6rem 0.75rem' }}>{requester}</td>
                                                    <td style={{ padding: '0.6rem 0.75rem' }}>{tk.category_name || '-'}</td>
                                                    <td style={{ padding: '0.6rem 0.75rem', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tk.description || '-'}</td>
                                                    <td style={{ padding: '0.6rem 0.75rem' }}>{tk.assigned_name || '-'}</td>
                                                    <td style={{ padding: '0.6rem 0.75rem' }}>
                                                        <span style={{ padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: '600', background: `${statusColors[tk.status] || '#888'}20`, color: statusColors[tk.status] || '#888' }}>
                                                            {statusLabels[tk.status] || tk.status}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '0.6rem 0.75rem', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tk.solution || '-'}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile Cards */}
                            <div className="mobile-only" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
                                {repairHistory.map(tk => {
                                    const requester = tk.guest_name || `${tk.requester_name || ''} ${tk.requester_lname || ''}`.trim() || '-';
                                    const statusColors = { open: '#f59e0b', in_progress: '#3b82f6', closed: '#10b981' };
                                    const statusLabels = { open: 'Open', in_progress: 'In Progress', closed: 'Closed' };
                                    return (
                                        <div key={tk.id} style={{ background: 'var(--color-bg-base)', border: '1px solid rgba(79,70,229,0.15)', borderRadius: '0.75rem', padding: '1rem', borderLeft: `4px solid ${statusColors[tk.status] || '#888'}` }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                                <strong style={{ color: 'var(--color-primary)', fontSize: '0.95rem' }}>{tk.ticket_no}</strong>
                                                <span style={{ padding: '0.15rem 0.5rem', borderRadius: '999px', fontSize: '0.7rem', fontWeight: '600', background: `${statusColors[tk.status] || '#888'}20`, color: statusColors[tk.status] || '#888' }}>
                                                    {statusLabels[tk.status] || tk.status}
                                                </span>
                                            </div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.75rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                                                <div>📅 {new Date(tk.created_at).toLocaleDateString()}</div>
                                                <div>👤 {requester}</div>
                                            </div>
                                            <div style={{ fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                                                <span style={{ fontWeight: '600', color: 'var(--color-text-muted)' }}>ปัญหา: </span>{tk.description || '-'}
                                            </div>
                                            <div style={{ fontSize: '0.85rem', background: 'rgba(79,70,229,0.03)', padding: '0.5rem', borderRadius: '0.5rem' }}>
                                                <span style={{ fontWeight: '600', color: 'var(--color-text-muted)' }}>วิธีแก้ไข: </span>{tk.solution || '-'}
                                            </div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.5rem', textAlign: 'right' }}>
                                                ผู้รับผิดชอบ: {tk.assigned_name || '-'}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}

                    {/* Manual repair logs */}
                    {manualLogs.length > 0 && (
                        <>
                            <h4 style={{ margin: '0 0 0.75rem', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>บันทึกโดย IT ({manualLogs.length})</h4>
                            
                            {/* Desktop Table */}
                            <div className="desktop-only" style={{ overflowX: 'auto', marginBottom: '1rem' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                                    <thead>
                                        <tr style={{ background: 'rgba(16,185,129,0.05)', textAlign: 'left' }}>
                                            <th style={{ padding: '0.6rem 0.75rem', fontWeight: '700', borderBottom: '2px solid rgba(16,185,129,0.15)' }}>วันที่ซ่อม</th>
                                            <th style={{ padding: '0.6rem 0.75rem', fontWeight: '700', borderBottom: '2px solid rgba(16,185,129,0.15)' }}>รายละเอียดปัญหา</th>
                                            <th style={{ padding: '0.6rem 0.75rem', fontWeight: '700', borderBottom: '2px solid rgba(16,185,129,0.15)' }}>วิธีแก้ไข</th>
                                            <th style={{ padding: '0.6rem 0.75rem', fontWeight: '700', borderBottom: '2px solid rgba(16,185,129,0.15)' }}>ช่างผู้ดำเนินการ</th>
                                            <th style={{ padding: '0.6rem 0.75rem', fontWeight: '700', borderBottom: '2px solid rgba(16,185,129,0.15)' }}>บันทึกโดย</th>
                                            <th style={{ padding: '0.6rem 0.75rem', fontWeight: '700', borderBottom: '2px solid rgba(16,185,129,0.15)', width: '80px' }}></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {manualLogs.map(log => (
                                            <tr key={log.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                                                <td style={{ padding: '0.6rem 0.75rem', fontWeight: '600' }}>{new Date(log.repair_date).toLocaleDateString()}</td>
                                                <td style={{ padding: '0.6rem 0.75rem', maxWidth: '220px' }}>{log.description}</td>
                                                <td style={{ padding: '0.6rem 0.75rem', maxWidth: '220px' }}>{log.solution || '-'}</td>
                                                <td style={{ padding: '0.6rem 0.75rem' }}>{log.technician || '-'}</td>
                                                <td style={{ padding: '0.6rem 0.75rem', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{log.created_by_name || '-'}</td>
                                                <td style={{ padding: '0.6rem 0.75rem' }}>
                                                    {log.created_by === currentUserId && (
                                                        <div style={{ display: 'flex', gap: '0.35rem' }}>
                                                            <button type="button" onClick={() => startEditLog(log)} style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6', border: 'none', borderRadius: '0.4rem', padding: '0.3rem 0.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                                                                <FiEdit2 size={14} />
                                                            </button>
                                                            <button type="button" onClick={() => deleteRepairLog(log.id)} style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--color-danger)', border: 'none', borderRadius: '0.4rem', padding: '0.3rem 0.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                                                                <FiTrash2 size={14} />
                                                            </button>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile Cards */}
                            <div className="mobile-only" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
                                {manualLogs.map(log => (
                                    <div key={log.id} style={{ background: 'var(--color-bg-base)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '0.75rem', padding: '1rem', borderLeft: '4px solid #10b981', position: 'relative' }}>
                                        {log.created_by === currentUserId && (
                                            <div style={{ position: 'absolute', top: '0.75rem', right: '0.75rem', display: 'flex', gap: '0.35rem' }}>
                                                <button type="button" onClick={() => startEditLog(log)} style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6', border: 'none', borderRadius: '0.4rem', padding: '0.3rem', cursor: 'pointer' }}>
                                                    <FiEdit2 size={14} />
                                                </button>
                                                <button type="button" onClick={() => deleteRepairLog(log.id)} style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--color-danger)', border: 'none', borderRadius: '0.4rem', padding: '0.3rem', cursor: 'pointer' }}>
                                                    <FiTrash2 size={14} />
                                                </button>
                                            </div>
                                        )}
                                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>
                                            📅 {new Date(log.repair_date).toLocaleDateString()}
                                        </div>
                                        <div style={{ fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                                            <span style={{ fontWeight: '600', color: 'var(--color-text-muted)' }}>ปัญหา: </span>{log.description}
                                        </div>
                                        <div style={{ fontSize: '0.85rem', background: 'rgba(16,185,129,0.05)', padding: '0.5rem', borderRadius: '0.5rem', marginBottom: '0.5rem' }}>
                                            <span style={{ fontWeight: '600', color: 'var(--color-text-muted)' }}>วิธีแก้ไข: </span>{log.solution || '-'}
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                                            <div>ช่าง: {log.technician || '-'}</div>
                                            <div style={{ textAlign: 'right' }}>โดย: {log.created_by_name || '-'}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}

                    {repairHistory.length === 0 && manualLogs.length === 0 && (
                        <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '1.5rem 0' }}>ยังไม่มีประวัติการซ่อม</p>
                    )}
                </div>

                <div className="form-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
                    <button type="submit" disabled={isSubmitting} style={{
                        padding: '1rem 2.5rem', borderRadius: '1rem', background: 'linear-gradient(135deg, var(--color-primary) 0%, rgba(79,70,229,0.8) 100%)', color: 'white', fontSize: '1.1rem', fontWeight: '700', border: 'none', cursor: isSubmitting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', boxShadow: '0 8px 20px rgba(79,70,229,0.25)', transition: 'all 0.3s'
                    }}>
                        {isSubmitting ? 'Saving...' : <><FiSave size={22} /> {t('updatePcDetails')}</>}
                    </button>
                </div>
            </form>
        </div>
    );
}
