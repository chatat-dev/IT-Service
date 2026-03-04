'use client';
import { useState, useEffect } from 'react';
import { useLanguage } from '../../components/LanguageProvider';
import { useModal } from '../../components/ModalProvider';
import { FiUser, FiLock, FiSave } from 'react-icons/fi';

export default function ITProfilePage() {
    const { t } = useLanguage();
    const { showAlert } = useModal();
    const [token, setToken] = useState('');
    const [loading, setLoading] = useState(true);

    // Profile State
    const [profileData, setProfileData] = useState({
        name: '',
        lname: '',
        email: '',
        phone: '',
        username: ''
    });

    // Password State
    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        setToken(user.token);
        if (user.token) {
            fetchProfile(user.token);
        }
    }, []);

    const fetchProfile = async (t_tok) => {
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://192.168.0.112:5250'}/api/auth/profile`, {
                headers: { 'Authorization': `Bearer ${t_tok}` }
            });
            if (res.ok) {
                const data = await res.json();
                setProfileData({
                    name: data.name || '',
                    lname: data.lname || '',
                    email: data.email || '',
                    phone: data.phone || '',
                    username: data.username || ''
                });
            }
        } catch (error) {
            console.error('Error fetching profile:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleProfileChange = (e) => {
        setProfileData({ ...profileData, [e.target.name]: e.target.value });
    };

    const handlePasswordChange = (e) => {
        setPasswordData({ ...passwordData, [e.target.name]: e.target.value });
    };

    const handleProfileSubmit = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://192.168.0.112:5250'}/api/auth/profile`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    name: profileData.name,
                    lname: profileData.lname,
                    email: profileData.email,
                    phone: profileData.phone
                })
            });

            const data = await res.json();
            if (res.ok) {
                showAlert({ title: 'Success', message: 'Profile updated successfully.', type: 'success' });
                // Update local storage user name if needed
                const user = JSON.parse(localStorage.getItem('user') || '{}');
                user.name = profileData.name;
                localStorage.setItem('user', JSON.stringify(user));
                // trigger a storage event if we want navauth to update
                window.dispatchEvent(new Event('storage'));
            } else {
                showAlert({ title: 'Error', message: data.message || 'Failed to update profile.', type: 'error' });
            }
        } catch (error) {
            console.error('Profile update error:', error);
            showAlert({ title: 'Error', message: 'Server error.', type: 'error' });
        }
    };

    const handlePasswordSubmit = async (e) => {
        e.preventDefault();
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            showAlert({ title: 'Warning', message: 'New passwords do not match.', type: 'warning' });
            return;
        }

        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://192.168.0.112:5250'}/api/auth/change-password`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    currentPassword: passwordData.currentPassword,
                    newPassword: passwordData.newPassword
                })
            });

            const data = await res.json();
            if (res.ok) {
                showAlert({ title: 'Success', message: 'Password changed successfully.', type: 'success' });
                setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
            } else {
                showAlert({ title: 'Error', message: data.message || 'Failed to change password.', type: 'error' });
            }
        } catch (error) {
            console.error('Password change error:', error);
            showAlert({ title: 'Error', message: 'Server error.', type: 'error' });
        }
    };

    if (loading) return <div className="p-8 text-center" style={{ color: 'var(--color-primary)' }}>Loading...</div>;

    return (
        <div className="animate-fade-in" style={{ paddingBottom: '3rem' }}>
            <h2 style={{ color: 'var(--color-primary)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FiUser /> {t('profileSettings') || 'Profile Settings'}
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>

                {/* Profile Information Form */}
                <div className="glass-card">
                    <h3 style={{ borderBottom: '1px solid var(--color-glass-border)', paddingBottom: '0.5rem', marginBottom: '1.5rem', color: 'var(--color-text)' }}>
                        {t('personalInfo') || 'Personal Information'}
                    </h3>
                    <form onSubmit={handleProfileSubmit}>
                        <div className="form-group">
                            <label className="label">{t('usernameLabel')}</label>
                            <input type="text" className="input" value={profileData.username} disabled style={{ backgroundColor: 'var(--color-bg)', cursor: 'not-allowed' }} />
                            <small style={{ color: 'var(--color-text-muted)' }}>Username cannot be changed.</small>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div className="form-group">
                                <label className="label">{t('firstNameLabel')}</label>
                                <input type="text" name="name" className="input" value={profileData.name} onChange={handleProfileChange} required />
                            </div>
                            <div className="form-group">
                                <label className="label">{t('lastNameLabel')}</label>
                                <input type="text" name="lname" className="input" value={profileData.lname} onChange={handleProfileChange} required />
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="label">{t('contactPhoneLabel')}</label>
                            <input type="text" name="phone" className="input" value={profileData.phone} onChange={handleProfileChange} />
                        </div>
                        <div className="form-group">
                            <label className="label">{t('companyEmailLabel')}</label>
                            <input type="email" name="email" className="input" value={profileData.email} onChange={handleProfileChange} />
                        </div>
                        <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>
                            <FiSave /> {t('saveChanges') || 'Save Changes'}
                        </button>
                    </form>
                </div>

                {/* Password Change Form */}
                <div className="glass-card">
                    <h3 style={{ borderBottom: '1px solid var(--color-glass-border)', paddingBottom: '0.5rem', marginBottom: '1.5rem', color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <FiLock /> {t('changePassword') || 'Change Password'}
                    </h3>
                    <form onSubmit={handlePasswordSubmit}>
                        <div className="form-group">
                            <label className="label">{t('currentPassword') || 'Current Password'}</label>
                            <input type="password" name="currentPassword" className="input" value={passwordData.currentPassword} onChange={handlePasswordChange} required />
                        </div>
                        <div className="form-group">
                            <label className="label">{t('newPassword') || 'New Password'}</label>
                            <input type="password" name="newPassword" className="input" value={passwordData.newPassword} onChange={handlePasswordChange} required />
                        </div>
                        <div className="form-group">
                            <label className="label">{t('confirmPassword') || 'Confirm New Password'}</label>
                            <input type="password" name="confirmPassword" className="input" value={passwordData.confirmPassword} onChange={handlePasswordChange} required />
                        </div>
                        <button type="submit" className="btn btn-outline" style={{ width: '100%', marginTop: '1rem' }}>
                            <FiLock /> {t('updatePassword') || 'Update Password'}
                        </button>
                    </form>
                </div>

            </div>
        </div>
    );
}
