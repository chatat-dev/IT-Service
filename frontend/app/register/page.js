'use client';
import { useState, useEffect } from 'react';
import './../globals.css';
import { useLanguage } from '../components/LanguageProvider';
import StyledSelect from '../components/StyledSelect';

export default function RegisterPage() {
    const { t } = useLanguage();
    const [publicData, setPublicData] = useState({ locations: [], companies: [], sites: [], departments: [] });
    const [formData, setFormData] = useState({
        location_id: '', company_id: '', site_id: '', department_id: '',
        emp_id: '', name: '', lname: '', phone: '', email: '', username: '', password: ''
    });
    const [message, setMessage] = useState(null);

    useEffect(() => {
        fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://192.168.0.112:5250'}/api/public/data`)
            .then(res => res.json())
            .then(data => setPublicData(data))
            .catch(err => console.error("Could not load dropdowns:", err));
    }, []);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        let updates = { [name]: value };
        if (name === 'location_id') { updates.company_id = ''; updates.site_id = ''; updates.department_id = ''; }
        if (name === 'company_id') { updates.site_id = ''; updates.department_id = ''; }
        if (name === 'site_id') { updates.department_id = ''; }

        setFormData(prev => ({ ...prev, ...updates }));
    };

    const handleRegisterSubmit = async (e) => {
        e.preventDefault();
        setMessage(null);
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://192.168.0.112:5250'}/api/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            const data = await res.json();
            if (res.ok) {
                setMessage({ type: 'success', text: t('registerSuccess') });
                setFormData({ location_id: '', company_id: '', site_id: '', department_id: '', emp_id: '', name: '', lname: '', phone: '', email: '', username: '', password: '' });
            } else {
                setMessage({ type: 'error', text: data.message || t('registerFailed') });
            }
        } catch (err) {
            setMessage({ type: 'error', text: t('serverError') });
        }
    };

    return (
        <div className="container animate-fade-in" style={{ paddingBottom: '4rem' }}>
            <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
                <h1 style={{ color: 'var(--color-primary)' }}>{t('memberRegistrationTitle')}</h1>
                <p style={{ color: 'var(--color-text-muted)' }}>{t('memberRegistrationSub')}</p>
            </div>

            <div className="glass-card" style={{ maxWidth: '800px', margin: '0 auto' }}>
                {message && (
                    <div className={`badge badge-${message.type}`} style={{ padding: '1rem', width: '100%', marginBottom: '1.5rem', display: 'block' }}>
                        {message.text}
                    </div>
                )}

                <form onSubmit={handleRegisterSubmit}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                        <div className="form-group">
                            <label className="label">{t('locationLabel')}</label>
                            <StyledSelect
                                options={publicData.locations?.map(l => ({ value: l.id, label: l.name })) || []}
                                value={formData.location_id}
                                onChange={(val) => handleInputChange({ target: { name: 'location_id', value: val || '' } })}
                                placeholder={t('selectLocation')}
                            />
                        </div>
                        <div className="form-group">
                            <label className="label">{t('companyLabel')}</label>
                            <StyledSelect
                                options={formData.location_id ? publicData.companies?.filter(c => c.location_id == formData.location_id).map(c => ({ value: c.id, label: c.name })) : []}
                                value={formData.company_id}
                                onChange={(val) => handleInputChange({ target: { name: 'company_id', value: val || '' } })}
                                placeholder={t('selectCompany')}
                                isDisabled={!formData.location_id}
                            />
                        </div>
                        <div className="form-group">
                            <label className="label">{t('siteLabel')}</label>
                            <StyledSelect
                                options={formData.company_id ? publicData.sites?.filter(s => s.company_id == formData.company_id).map(s => ({ value: s.id, label: s.name })) : []}
                                value={formData.site_id}
                                onChange={(val) => handleInputChange({ target: { name: 'site_id', value: val || '' } })}
                                placeholder={t('selectSite')}
                                isDisabled={!formData.company_id}
                            />
                        </div>
                        <div className="form-group">
                            <label className="label">{t('departmentLabel')}</label>
                            <StyledSelect
                                options={formData.site_id ? publicData.departments?.filter(d => d.site_id == formData.site_id).map(d => ({ value: d.id, label: d.name })) : []}
                                value={formData.department_id}
                                onChange={(val) => handleInputChange({ target: { name: 'department_id', value: val || '' } })}
                                placeholder={t('selectDepartment')}
                                isDisabled={!formData.site_id}
                            />
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginTop: '1rem' }}>
                        <div className="form-group">
                            <label className="label">{t('employeeIdLabel')}</label>
                            <input type="text" name="emp_id" className="input" value={formData.emp_id} onChange={handleInputChange} placeholder="EMP-XXXX" />
                        </div>
                        <div className="form-group">
                            <label className="label">{t('firstNameLabel')}</label>
                            <input type="text" name="name" className="input" required value={formData.name} onChange={handleInputChange} />
                        </div>
                        <div className="form-group">
                            <label className="label">{t('lastNameLabel')}</label>
                            <input type="text" name="lname" className="input" required value={formData.lname} onChange={handleInputChange} />
                        </div>
                        <div className="form-group">
                            <label className="label">{t('contactPhoneLabel')}</label>
                            <input type="text" name="phone" className="input" value={formData.phone} onChange={handleInputChange} />
                        </div>
                        <div className="form-group">
                            <label className="label">{t('companyEmailLabel')}</label>
                            <input type="email" name="email" className="input" value={formData.email} onChange={handleInputChange} />
                        </div>
                    </div>

                    <hr style={{ borderColor: 'var(--color-glass-border)', margin: '2rem 0' }} />

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                        <div className="form-group">
                            <label className="label">{t('usernameLabel')}</label>
                            <input type="text" name="username" className="input" required value={formData.username} onChange={handleInputChange} />
                        </div>
                        <div className="form-group">
                            <label className="label">{t('passwordLabel')}</label>
                            <input type="password" name="password" className="input" required value={formData.password} onChange={handleInputChange} />
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                        <a href="/" className="btn btn-outline">{t('cancel')}</a>
                        <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>{t('submitRegistrationBtn')}</button>
                    </div>
                </form>
            </div>
        </div>
    );
}
