'use client';
import { useState, useEffect } from 'react';
import { useLanguage } from '../components/LanguageProvider';

export default function UserProfile() {
    const { t } = useLanguage();
    const [profile, setProfile] = useState({});
    const [token, setToken] = useState('');
    const [isEditing, setIsEditing] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        lname: '',
        phone: '',
        email: '',
        oldPassword: '',
        newPassword: '',
    });

    const [message, setMessage] = useState({ text: '', type: '' });

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        setToken(user.token);
        setProfile(user);
        setFormData({
            ...user,
            phone: user.phone || '',
            email: user.email || '',
            oldPassword: '',
            newPassword: ''
        });
    }, []);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage({ text: '', type: '' });
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://192.168.0.112:5250'}/api/auth/profile`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            const data = await res.json();

            if (res.ok) {
                setMessage({ text: t('profileUpdated'), type: 'success' });
                // Update local storage
                const updatedUser = { ...profile, name: formData.name, lname: formData.lname, phone: formData.phone, email: formData.email };
                localStorage.setItem('user', JSON.stringify(updatedUser));
                setProfile(updatedUser);
                setFormData({ ...formData, oldPassword: '', newPassword: '' });
                setIsEditing(false);
            } else {
                setMessage({ text: data.message || t('errorUpdatingProfile'), type: 'error' });
            }
        } catch (err) {
            console.error(err);
            setMessage({ text: t('connectivityError'), type: 'error' });
        }
    };

    return (
        <div className="animate-fade-in" style={{ maxWidth: '700px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ color: 'var(--color-primary)', margin: 0 }}>{t('myProfile')}</h2>
                {!isEditing && (
                    <button className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }} onClick={() => setIsEditing(true)}>
                        {t('editProfile')}
                    </button>
                )}
            </div>

            <div className="glass-card" style={{ padding: '2rem' }}>
                {message.text && (
                    <div style={{
                        padding: '1rem', marginBottom: '1.5rem', borderRadius: '8px',
                        background: message.type === 'success' ? '#d1fae5' : '#fee2e2',
                        color: message.type === 'success' ? '#065f46' : '#991b1b',
                        border: `1px solid ${message.type === 'success' ? '#34d399' : '#f87171'}`
                    }}>
                        {message.text}
                    </div>
                )}

                {isEditing ? (
                    <form onSubmit={handleSubmit}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                            <div className="form-group">
                                <label className="label">{t('firstName')}</label>
                                <input type="text" className="input" name="name" value={formData.name} onChange={handleChange} required />
                            </div>
                            <div className="form-group">
                                <label className="label">{t('lastName')}</label>
                                <input type="text" className="input" name="lname" value={formData.lname} onChange={handleChange} />
                            </div>
                            <div className="form-group">
                                <label className="label">{t('phone')}</label>
                                <input type="text" className="input" name="phone" value={formData.phone} onChange={handleChange} />
                            </div>
                            <div className="form-group">
                                <label className="label">{t('email')}</label>
                                <input type="email" className="input" name="email" value={formData.email} onChange={handleChange} />
                            </div>
                        </div>

                        <h4 style={{ margin: '1.5rem 0 1rem', borderBottom: '1px solid var(--color-glass-border)', paddingBottom: '0.5rem' }}>{t('changePasswordOptional')}</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
                            <div className="form-group">
                                <label className="label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span>{t('oldPassword')}</span>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{t('requiredIfChanging')}</span>
                                </label>
                                <input type="password" className="input" name="oldPassword" value={formData.oldPassword} onChange={handleChange} />
                            </div>
                            <div className="form-group">
                                <label className="label">{t('newPassword')}</label>
                                <input type="password" className="input" name="newPassword" value={formData.newPassword} onChange={handleChange} />
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                            <button type="button" className="btn btn-outline" onClick={() => { setIsEditing(false); setMessage({ text: '', type: '' }); }}>{t('cancel')}</button>
                            <button type="submit" className="btn btn-primary">{t('saveProfile')}</button>
                        </div>
                    </form>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
                        <div>
                            <label className="label" style={{ color: 'var(--color-text-muted)' }}>{t('name')}</label>
                            <div style={{ fontSize: '1.1rem', fontWeight: '500' }}>{profile.name} {profile.lname}</div>
                        </div>
                        <div>
                            <label className="label" style={{ color: 'var(--color-text-muted)' }}>{t('role')}</label>
                            <div><span className="badge badge-success" style={{ textTransform: 'uppercase' }}>{profile.role}</span></div>
                        </div>
                        <div>
                            <label className="label" style={{ color: 'var(--color-text-muted)' }}>{t('username')}</label>
                            <div style={{ fontSize: '1.1rem' }}>{profile.username}</div>
                        </div>
                        <div>
                            <label className="label" style={{ color: 'var(--color-text-muted)' }}>{t('contact')}</label>
                            <div style={{ fontSize: '1rem' }}>
                                {profile.email && <div>📧 {profile.email}</div>}
                                {profile.phone && <div>📞 {profile.phone}</div>}
                                {!profile.email && !profile.phone && <span style={{ color: 'var(--color-text-muted)' }}>{t('noContactInfo')}</span>}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div style={{ textAlign: 'center', marginTop: '2rem' }}>
                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>{t('orgDetailsNote')}</p>
            </div>
        </div>
    );
}
