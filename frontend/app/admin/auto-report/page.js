'use client';
import { useState, useEffect } from 'react';
import { useLanguage } from '../../components/LanguageProvider';
import { useModal } from '../../components/ModalProvider';
import StyledSelect from '../../components/StyledSelect';

export default function AutoReportPage() {
    const { t } = useLanguage();
    const { showAlert, showConfirm } = useModal();
    const [settings, setSettings] = useState({ frequency: 'weekly', recipients: '', is_active: false });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://192.168.0.112:5250'}/api/admin/auto-report`, {
                headers: { 'Authorization': `Bearer ${user.token}` }
            });
            const data = await res.json();
            if (res.ok) {
                setSettings({
                    frequency: data.frequency || 'weekly',
                    recipients: data.recipients || '',
                    is_active: data.is_active === 1 || data.is_active === true
                });
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        showConfirm({
            title: 'Save Auto Report Settings',
            message: 'Are you sure you want to save these settings, emails will be sent automatically based on this schedule.',
            onConfirm: async () => {
                try {
                    const user = JSON.parse(localStorage.getItem('user') || '{}');
                    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://192.168.0.112:5250'}/api/admin/auto-report`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${user.token}`
                        },
                        body: JSON.stringify(settings)
                    });

                    if (res.ok) {
                        showAlert({ title: 'Success', message: 'Auto report settings saved successfully.', type: 'success' });
                    } else {
                        showAlert({ title: 'Error', message: 'Failed to save settings.', type: 'error' });
                    }
                } catch (err) {
                    showAlert({ title: 'Error', message: 'Network error.', type: 'error' });
                }
            }
        });
    };

    if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>;

    return (
        <div className="animate-fade-in">
            <h2 style={{ color: 'var(--color-primary)', marginBottom: '1.5rem' }}>{t('autoReportSettingsTitle')}</h2>

            <div className="glass-card" style={{ maxWidth: '600px', margin: '0 auto' }}>
                <form onSubmit={handleSave}>
                    <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                        <input
                            type="checkbox"
                            id="is_active"
                            checked={settings.is_active}
                            onChange={(e) => setSettings({ ...settings, is_active: e.target.checked })}
                            style={{ width: '1.25rem', height: '1.25rem', cursor: 'pointer' }}
                        />
                        <label htmlFor="is_active" className="label" style={{ marginBottom: 0, cursor: 'pointer', fontWeight: 'bold' }}>
                            {t('enableAutomatedEmails')}
                        </label>
                    </div>

                    <div className="form-group">
                        <label className="label">{t('frequency')}</label>
                        <StyledSelect
                            options={[
                                { value: 'weekly', label: t('weeklyFrequency') },
                                { value: 'monthly', label: t('monthlyFrequency') },
                                { value: 'both', label: t('bothFrequency') }
                            ]}
                            value={settings.frequency}
                            onChange={(val) => setSettings({ ...settings, frequency: val || 'weekly' })}
                            placeholder={t('frequency')}
                            isDisabled={!settings.is_active}
                        />
                        <small style={{ color: 'var(--color-text-muted)', display: 'block', marginTop: '0.25rem' }}>
                            {settings.frequency === 'weekly' ? t('weeklyDesc') :
                                settings.frequency === 'monthly' ? t('monthlyDesc') :
                                    t('bothDesc')}
                        </small>
                    </div>

                    <div className="form-group">
                        <label className="label">{t('recipientsLabel')}</label>
                        <textarea
                            className="textarea"
                            value={settings.recipients}
                            onChange={(e) => setSettings({ ...settings, recipients: e.target.value })}
                            placeholder={t('recipientsPlaceholder')}
                            rows="4"
                            disabled={!settings.is_active}
                            required={settings.is_active}
                        ></textarea>
                        <small style={{ color: 'var(--color-text-muted)', display: 'block', marginTop: '0.25rem' }}>
                            {t('recipientsHelpText')}
                        </small>
                    </div>

                    <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                        {t('saveSettings')}
                    </button>
                </form>
            </div>
        </div>
    );
}
