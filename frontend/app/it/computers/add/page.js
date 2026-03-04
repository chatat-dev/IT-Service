'use client';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLanguage } from '../../../components/LanguageProvider';
import { useModal } from '../../../components/ModalProvider';
import { FiSave, FiX, FiSearch, FiMonitor, FiCpu, FiHardDrive, FiActivity, FiUser, FiMapPin, FiInfo, FiPlus, FiTrash2 } from 'react-icons/fi';
import StyledSelect from '../../../components/StyledSelect';

export default function AddComputer() {
    const { showAlert, showConfirm } = useModal();
    const { t } = useLanguage();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [token, setToken] = useState('');
    const [masterData, setMasterData] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    // For employee search
    const [searchEmpId, setSearchEmpId] = useState('');
    const [isSearchingEmp, setIsSearchingEmp] = useState(false);
    const [prefillTicket, setPrefillTicket] = useState('');

    // Initial 30 Fields Data Structure
    const [formData, setFormData] = useState({
        // 1. Updated Date/Time handled by DB mostly, but forms don't send it unless needed.
        location_id: '',               // 2
        company_id: '',                // 3
        building_name: '',             // 4
        site_id: '',                   // 5
        device_type_id: '',            // 6
        status_pc: 'Y',                // 7 (Y=Active, N=Inactive)
        emp_id: '',                    // 8
        emp_name: '',                  // 9 (Full Name)
        department_id: '',             // 10
        pc_asset_no: '',               // 11
        device_name: '',               // 12
        notebook_brand_model: '',      // 13
        serial_number: '',             // 14
        os_id: '',                     // 15
        windows_product_key: '',       // 16
        ms_office_id: '',              // 17
        purchase_date: '',             // 18
        issue_date: '',                // 19
        // 20 & 21 are calculated on the fly
        cpu_core: '',                  // 22
        ram_gb: '',                    // 23
        script_install_status_id: '',  // 24
        vpn_status: 'N',               // 25
        backup_status: 'N',            // 26
        ups_asset_no: '',              // 27
        accessories: '',               // 28
        extension_no: '',              // 29
        notes: ['']                    // 30
    });

    const [deviceAge, setDeviceAge] = useState('');
    const [serviceLifeGroup, setServiceLifeGroup] = useState('');

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        if (user?.token) setToken(user.token);
        fetchMasterData();

        // Pre-fill from URL params (from Link Asset modal)
        const empId = searchParams.get('emp_id');
        const empName = searchParams.get('emp_name');
        const extNo = searchParams.get('extension_no');
        const locId = searchParams.get('location_id');
        const compId = searchParams.get('company_id');
        const siteId = searchParams.get('site_id');
        const deptId = searchParams.get('department_id');
        const fromTicket = searchParams.get('from_ticket');

        if (empId || empName || locId || compId) {
            setFormData(prev => ({
                ...prev,
                emp_id: empId || prev.emp_id,
                emp_name: empName || prev.emp_name,
                extension_no: extNo || prev.extension_no,
                location_id: locId || prev.location_id,
                company_id: compId || prev.company_id,
                site_id: siteId || prev.site_id,
                department_id: deptId || prev.department_id,
            }));
            if (empId) setSearchEmpId(empId);
        }
        if (fromTicket) setPrefillTicket(fromTicket);
    }, []);

    // Effect to calculate "Device Age" and "Service Life Group" when purchase_date changes
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

            if (years <= 5) {
                setServiceLifeGroup('0 - 5 Years');
            } else if (years <= 10) {
                setServiceLifeGroup('6 - 10 Years');
            } else {
                setServiceLifeGroup('11+ Years');
            }
        } else {
            setDeviceAge('');
            setServiceLifeGroup('');
        }
    }, [formData.purchase_date]);

    // Derived dropdowns based on selections
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
        } catch (err) {
            console.error('Error fetching master data:', err);
        }
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
                    emp_id: data.employee_id || searchEmpId,
                    emp_name: `${data.name || ''} ${data.lname || ''}`.trim(),
                    department_id: data.department_id || prev.department_id || '',
                    company_id: data.company_id || prev.company_id || '',
                    site_id: data.site_id || prev.site_id || '',
                    location_id: data.location_id || prev.location_id || ''
                }));
                showAlert({ title: t('searchSuccess') || 'Success', message: t('searchSuccessMsg') || 'Employee data loaded.', type: 'success' });
            } else {
                showAlert({ title: t('searchNotFound') || 'Not Found', message: t('searchNotFoundMsg') || 'Employee not found in the system.', type: 'warning' });
                setFormData(prev => ({ ...prev, emp_id: searchEmpId }));
            }
        } catch (err) {
            console.error('Search error:', err);
            showAlert({ title: t('error') || 'Error', message: t('searchErrorMsg') || 'Failed to search employee.', type: 'error' });
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

    const addNoteField = () => {
        setFormData(prev => ({ ...prev, notes: [...prev.notes, ''] }));
    };

    const removeNoteField = (index) => {
        const newNotes = [...formData.notes];
        newNotes.splice(index, 1);
        setFormData(prev => ({ ...prev, notes: newNotes.length ? newNotes : [''] }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        showConfirm({
            title: t('confirmAddComputer'),
            message: t('confirmAddComputerMsg'),
            onConfirm: async () => {
                setIsSubmitting(true);
                try {
                    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://192.168.0.112:5250'}/api/computers`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify(formData)
                    });

                    if (res.ok) {
                        showAlert({
                            title: 'Success',
                            message: 'Computer added successfully.',
                            type: 'success',
                            onClose: () => router.push('/it/computers')
                        });
                    } else {
                        const errData = await res.json();
                        showAlert({ title: 'Error', message: errData.message || 'Failed to add computer', type: 'error' });
                    }
                } catch (err) {
                    showAlert({ title: 'Error', message: 'Network error. Please try again.', type: 'error' });
                } finally {
                    setIsSubmitting(false);
                }
            }
        });
    };

    // Styling constants
    const cardStyle = {
        background: 'var(--color-bg-card)',
        padding: '2rem',
        borderRadius: '1.5rem',
        boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
        marginBottom: '2rem'
    };

    const sectionTitleStyle = {
        fontSize: '1.25rem',
        fontWeight: '700',
        color: 'var(--color-primary)',
        marginBottom: '1.5rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        borderBottom: '2px solid rgba(79, 70, 229, 0.1)',
        paddingBottom: '0.5rem'
    };

    const labelStyle = {
        display: 'block',
        fontSize: '0.875rem',
        fontWeight: '600',
        color: 'var(--color-text-main)',
        marginBottom: '0.5rem'
    };

    const inputStyle = {
        width: '100%',
        padding: '0.75rem 1rem',
        borderRadius: '0.75rem',
        border: '1px solid rgba(0,0,0,0.1)',
        background: 'var(--color-bg-main)',
        color: 'var(--color-text-main)',
        fontSize: '0.95rem',
        transition: 'all 0.2s',
        outline: 'none'
    };

    const readOnlyStyle = {
        ...inputStyle,
        background: 'rgba(0,0,0,0.03)',
        color: 'var(--color-text-muted)',
        cursor: 'not-allowed'
    };

    const gridStyle = {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '1.5rem',
        marginBottom: '1.5rem'
    };

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '3rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', fontWeight: '800', margin: 0, color: 'var(--color-text-main)' }}>Add Computer</h1>
                    <p style={{ color: 'var(--color-text-muted)', margin: '0.5rem 0 0' }}>Register a new hardware asset to the inventory.</p>
                </div>
                <button
                    onClick={() => router.back()}
                    style={{
                        padding: '0.75rem 1.5rem',
                        borderRadius: '0.75rem',
                        border: '1px solid rgba(0,0,0,0.1)',
                        background: 'transparent',
                        color: 'var(--color-text-main)',
                        fontWeight: '600',
                        cursor: 'pointer'
                    }}
                >
                    Cancel
                </button>
            </div>

            <form onSubmit={handleSubmit}>
                {/* 1. Ownership & Location Info */}
                <div style={cardStyle}>
                    <h2 style={sectionTitleStyle}><FiUser />{t('assignmentLocation')}</h2>

                    {/* Employee Search Top Bar */}
                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', alignItems: 'flex-end' }}>
                        <div style={{ flex: 1 }}>
                            <label style={labelStyle}>{t('searchEmpId')}</label>
                            <input
                                type="text"
                                value={searchEmpId}
                                onChange={(e) => setSearchEmpId(e.target.value)}
                                placeholder="Enter Employee ID..."
                                style={inputStyle}
                                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleSearchEmployee())}
                            />
                        </div>
                        <button
                            type="button"
                            onClick={handleSearchEmployee}
                            disabled={isSearchingEmp}
                            style={{
                                padding: '0.75rem 1.5rem',
                                borderRadius: '0.75rem',
                                background: 'var(--color-primary)',
                                color: 'white',
                                fontWeight: '600',
                                border: 'none',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                cursor: isSearchingEmp ? 'not-allowed' : 'pointer',
                                opacity: isSearchingEmp ? 0.7 : 1
                            }}
                        >
                            <FiSearch /> {isSearchingEmp ? 'Searching...' : 'Search'}
                        </button>
                    </div>

                    <div style={gridStyle}>
                        <div>
                            <label style={labelStyle}>{t('employeeId')}</label>
                            <input type="text" name="emp_id" value={formData.emp_id} onChange={handleChange} required style={inputStyle} />
                        </div>
                        <div>
                            <label style={labelStyle}>{t('employeeName')}</label>
                            <input type="text" name="emp_name" value={formData.emp_name} onChange={handleChange} required style={inputStyle} />
                        </div>
                        <div>
                            <label style={labelStyle}>{t('extNoPhone')}</label>
                            <input type="text" name="extension_no" value={formData.extension_no} onChange={handleChange} style={inputStyle} />
                        </div>
                        <div>
                            <label style={labelStyle}>{t('location')}</label>
                            <StyledSelect
                                options={masterData.locations?.map(l => ({ value: l.id, label: l.name })) || []}
                                value={formData.location_id}
                                onChange={(val) => setFormData({ ...formData, location_id: val })}
                                placeholder={t('selectLocation')}
                            />
                        </div>
                        <div>
                            <label style={labelStyle}>{t('company')}</label>
                            <StyledSelect
                                options={availableCompanies.map(c => ({ value: c.id, label: `${c.name}${c.description ? ` — ${c.description}` : ''}` }))}
                                value={formData.company_id}
                                onChange={(val) => setFormData({ ...formData, company_id: val })}
                                placeholder={t('selectCompany')}
                            />
                        </div>
                        <div>
                            <label style={labelStyle}>{t('buildingName')}</label>
                            <input type="text" name="building_name" value={formData.building_name} onChange={handleChange} style={inputStyle} />
                        </div>
                        <div>
                            <label style={labelStyle}>{t('site')}</label>
                            <StyledSelect
                                options={availableSites.map(s => ({ value: s.id, label: `${s.name}${s.description ? ` — ${s.description}` : ''}` }))}
                                value={formData.site_id}
                                onChange={(val) => setFormData({ ...formData, site_id: val })}
                                placeholder={t('selectSite')}
                            />
                        </div>
                        <div>
                            <label style={labelStyle}>{t('department')}</label>
                            <StyledSelect
                                options={availableDepartments.map(d => ({ value: d.id, label: `${d.name}${d.description ? ` — ${d.description}` : ''}` }))}
                                value={formData.department_id}
                                onChange={(val) => setFormData({ ...formData, department_id: val })}
                                placeholder={t('selectDepartment')}
                            />
                        </div>
                    </div>
                </div>

                {/* 2. Hardware Information */}
                <div style={cardStyle}>
                    <h2 style={sectionTitleStyle}><FiMonitor />{t('hardwareDetails')}</h2>
                    <div style={gridStyle}>
                        <div>
                            <label style={labelStyle}>{t('deviceType')}</label>
                            <StyledSelect
                                options={masterData.deviceTypes?.map(d => ({ value: d.id, label: d.name })) || []}
                                value={formData.device_type_id}
                                onChange={(val) => setFormData({ ...formData, device_type_id: val })}
                                placeholder={t('selectType')}
                            />
                        </div>
                        <div>
                            <label style={labelStyle}>{t('pcAssetNo')}</label>
                            <input type="text" name="pc_asset_no" value={formData.pc_asset_no} onChange={handleChange} style={inputStyle} />
                        </div>
                        <div>
                            <label style={labelStyle}>{t('deviceName')}</label>
                            <input type="text" name="device_name" value={formData.device_name} onChange={handleChange} style={inputStyle} />
                        </div>
                        <div>
                            <label style={labelStyle}>{t('notebookBrandModel')}</label>
                            <input type="text" name="notebook_brand_model" value={formData.notebook_brand_model} onChange={handleChange} style={inputStyle} />
                        </div>
                        <div>
                            <label style={labelStyle}>{t('serialNumberSn')}</label>
                            <input type="text" name="serial_number" value={formData.serial_number} onChange={handleChange} style={inputStyle} />
                        </div>
                        <div>
                            <label style={labelStyle}>{t('statusPc')}</label>
                            <div style={{ display: 'flex', gap: '1rem', padding: '0.75rem 0' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                    <input type="radio" name="status_pc" value="Y" checked={formData.status_pc === 'Y'} onChange={handleChange} />{t('active')}</label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: 'var(--color-danger)' }}>
                                    <input type="radio" name="status_pc" value="N" checked={formData.status_pc === 'N'} onChange={handleChange} />{t('inactive')}</label>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 3. Specifications & Software */}
                <div style={cardStyle}>
                    <h2 style={sectionTitleStyle}><FiCpu /> {t('specificationsSoftware')}</h2>
                    <div style={gridStyle}>
                        <div>
                            <label style={labelStyle}>{t('cpuCore')}</label>
                            <input type="text" name="cpu_core" value={formData.cpu_core} onChange={handleChange} placeholder={t('egCpu')} style={inputStyle} />
                        </div>
                        <div>
                            <label style={labelStyle}>{t('ramGb')}</label>
                            <input type="text" name="ram_gb" value={formData.ram_gb} onChange={handleChange} placeholder={t('egRam')} style={inputStyle} />
                        </div>
                        <div>
                            <label style={labelStyle}>{t('os')}</label>
                            <StyledSelect
                                options={masterData.operatingSystems?.map(o => ({ value: o.id, label: o.name })) || []}
                                value={formData.os_id}
                                onChange={(val) => setFormData({ ...formData, os_id: val })}
                                placeholder={t('selectOs')}
                            />
                        </div>
                        <div>
                            <label style={labelStyle}>{t('windowsProductKey')}</label>
                            <input type="text" name="windows_product_key" value={formData.windows_product_key} onChange={handleChange} style={inputStyle} />
                        </div>
                        <div>
                            <label style={labelStyle}>{t('msOffice')}</label>
                            <StyledSelect
                                options={masterData.msOffices?.map(m => ({ value: m.id, label: m.name })) || []}
                                value={formData.ms_office_id}
                                onChange={(val) => setFormData({ ...formData, ms_office_id: val })}
                                placeholder={t('selectMsOffice')}
                            />
                        </div>
                        <div>
                            <label style={labelStyle}>{t('scriptInstallStatus')}</label>
                            <StyledSelect
                                options={masterData.scriptInstallStatuses?.map(s => ({ value: s.id, label: s.name })) || []}
                                value={formData.script_install_status_id}
                                onChange={(val) => setFormData({ ...formData, script_install_status_id: val })}
                                placeholder={t('selectStatus')}
                            />
                        </div>
                    </div>
                </div>

                {/* 4. Network & Add-ons */}
                <div style={cardStyle}>
                    <h2 style={sectionTitleStyle}><FiActivity /> {t('networkAdditionalAssets')}</h2>
                    <div style={gridStyle}>
                        <div>
                            <label style={labelStyle}>{t('vpnStatus')}</label>
                            <div style={{ display: 'flex', gap: '1rem', padding: '0.75rem 0' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                    <input type="radio" name="vpn_status" value="Y" checked={formData.vpn_status === 'Y'} onChange={handleChange} />{t('yes')}</label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                    <input type="radio" name="vpn_status" value="N" checked={formData.vpn_status === 'N'} onChange={handleChange} />{t('no')}</label>
                            </div>
                        </div>
                        <div>
                            <label style={labelStyle}>{t('backupStatus')}</label>
                            <div style={{ display: 'flex', gap: '1rem', padding: '0.75rem 0' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                    <input type="radio" name="backup_status" value="Y" checked={formData.backup_status === 'Y'} onChange={handleChange} />{t('yes')}</label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                    <input type="radio" name="backup_status" value="N" checked={formData.backup_status === 'N'} onChange={handleChange} />{t('no')}</label>
                            </div>
                        </div>
                        <div>
                            <label style={labelStyle}>{t('upsAssetNo')}</label>
                            <input type="text" name="ups_asset_no" value={formData.ups_asset_no} onChange={handleChange} style={inputStyle} />
                        </div>
                        <div>
                            <label style={labelStyle}>{t('accessories')}</label>
                            <input type="text" name="accessories" value={formData.accessories} onChange={handleChange} placeholder={t('accessoriesPlaceholder')} style={inputStyle} />
                        </div>
                    </div>
                </div>

                {/* 5. Lifespan & Timeline */}
                <div style={cardStyle}>
                    <h2 style={sectionTitleStyle}><FiInfo /> {t('lifespanWarranty')}</h2>
                    <div style={gridStyle}>
                        <div>
                            <label style={labelStyle}>{t('purchaseDate')}</label>
                            <input type="date" name="purchase_date" value={formData.purchase_date} onChange={handleChange} style={inputStyle} />
                        </div>
                        <div>
                            <label style={labelStyle}>{t('issueDate')}</label>
                            <input type="date" name="issue_date" value={formData.issue_date} onChange={handleChange} style={inputStyle} />
                        </div>
                        <div>
                            <label style={labelStyle}>{t('deviceAgeAuto')}</label>
                            <input type="text" value={deviceAge} readOnly style={readOnlyStyle} />
                        </div>
                        <div>
                            <label style={labelStyle}>{t('serviceLifeGroupAuto')}</label>
                            <input type="text" value={serviceLifeGroup} readOnly style={{
                                ...readOnlyStyle,
                                fontWeight: 'bold',
                                color: serviceLifeGroup === '11+ Years' ? 'var(--color-danger)' : serviceLifeGroup === '6 - 10 Years' ? 'var(--color-warning)' : 'var(--color-success)'
                            }} />
                        </div>
                    </div>
                </div>

                {/* 6. Notes Array */}
                <div style={cardStyle}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '2px solid rgba(79, 70, 229, 0.1)', paddingBottom: '0.5rem' }}>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '0.75rem', margin: 0 }}><FiInfo /> {t('additionalNotes')}</h2>
                        <button type="button" onClick={addNoteField} style={{ background: 'rgba(79, 70, 229, 0.1)', color: 'var(--color-primary)', border: 'none', padding: '0.5rem 1rem', borderRadius: '0.5rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                            <FiPlus />{t('addNote')}</button>
                    </div>
                    {formData.notes.map((note, index) => (
                        <div key={index} style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                            <textarea
                                value={note}
                                onChange={(e) => handleNoteChange(index, e.target.value)}
                                placeholder={`Note ${index + 1}...`}
                                style={{ ...inputStyle, resize: 'vertical', minHeight: '60px' }}
                            />
                            {formData.notes.length > 1 && (
                                <button type="button" onClick={() => removeNoteField(index)} style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--color-danger)', border: 'none', padding: '0 1rem', borderRadius: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <FiTrash2 size={20} />
                                </button>
                            )}
                        </div>
                    ))}
                </div>

                {/* Submit Action */}
                <div className="form-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        style={{
                            padding: '1rem 2.5rem',
                            borderRadius: '1rem',
                            background: 'linear-gradient(135deg, var(--color-primary) 0%, rgba(79,70,229,0.8) 100%)',
                            color: 'white',
                            fontSize: '1.1rem',
                            fontWeight: '700',
                            border: 'none',
                            cursor: isSubmitting ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.75rem',
                            boxShadow: '0 8px 20px rgba(79,70,229,0.25)',
                            transition: 'all 0.3s'
                        }}
                    >
                        {isSubmitting ? 'Saving...' : <><FiSave size={22} /> {t('saveComputerToInventory')}</>}
                    </button>
                </div>
            </form>
        </div>
    );
}
