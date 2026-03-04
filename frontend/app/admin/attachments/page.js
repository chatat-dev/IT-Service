'use client';
import { useState, useEffect } from 'react';
import { useLanguage } from '../../components/LanguageProvider';
import { useModal } from '../../components/ModalProvider';
import { FiSave, FiPaperclip } from 'react-icons/fi';

export default function AdminAttachmentSettings() {
    const { t } = useLanguage();
    const { showAlert } = useModal();
    const [settings, setSettings] = useState({
        max_file_size_mb: 5,
        allowed_extensions: '.jpg,.jpeg,.png,.gif,.pdf,.doc,.docx,.xls,.xlsx',
        is_active: 1
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        setLoading(true);
        try {
            const token = JSON.parse(localStorage.getItem('user'))?.token;
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://192.168.0.112:5250'}/api/admin/attachment-settings`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setSettings(data);
            }
        } catch (error) {
            console.error('Error fetching settings:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            const token = JSON.parse(localStorage.getItem('user'))?.token;
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://192.168.0.112:5250'}/api/admin/attachment-settings`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(settings)
            });

            if (res.ok) {
                showAlert({ title: 'Success', message: t('saveSuccess') || 'Settings saved successfully.', type: 'success' });
            } else {
                showAlert({ title: 'Error', message: 'Failed to save settings.', type: 'error' });
            }
        } catch (error) {
            console.error('Save error:', error);
            showAlert({ title: 'Error', message: 'Server error.', type: 'error' });
        }
    };

    if (loading) return <div className="p-8 text-center" style={{ color: 'var(--color-primary)' }}>Loading...</div>;

    return (
        <div className="animate-fade-in" style={{ paddingBottom: '3rem' }}>
            <h2 style={{ color: 'var(--color-primary)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FiPaperclip /> {t('attachmentSettings') || 'Attachment Settings'}
            </h2>

            <div className="glass-card" style={{ maxWidth: '600px' }}>
                <form onSubmit={handleSave}>

                    <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                        <input
                            type="checkbox"
                            id="is_active"
                            checked={!!settings.is_active}
                            onChange={(e) => setSettings({ ...settings, is_active: e.target.checked ? 1 : 0 })}
                            style={{ width: '1.25rem', height: '1.25rem', cursor: 'pointer' }}
                        />
                        <label htmlFor="is_active" className="label" style={{ marginBottom: 0, cursor: 'pointer', fontWeight: 'bold' }}>
                            {t('enableAttachments') || 'Enable File Attachments (Tickets & Chat)'}
                        </label>
                    </div>

                    <div className="form-group">
                        <label className="label">{t('maxFileSize') || 'Max File Size (MB)'}</label>
                        <input
                            type="number"
                            className="input"
                            value={settings.max_file_size_mb}
                            onChange={(e) => setSettings({ ...settings, max_file_size_mb: parseInt(e.target.value) || 0 })}
                            min="1"
                            max="50"
                            required
                            disabled={!settings.is_active}
                        />
                        <small style={{ color: 'var(--color-text-muted)' }}>
                            Maximum allowed size per file (Recommend 2-10 MB).
                        </small>
                    </div>

                    <div className="form-group">
                        <label className="label">{t('allowedExtensions') || 'Allowed File Extensions'}</label>
                        <textarea
                            className="input"
                            value={settings.allowed_extensions}
                            onChange={(e) => setSettings({ ...settings, allowed_extensions: e.target.value })}
                            rows="3"
                            required
                            disabled={!settings.is_active}
                            style={{ resize: 'vertical' }}
                        />
                        <small style={{ color: 'var(--color-text-muted)', display: 'block', marginTop: '0.25rem' }}>
                            Example: <code>.jpg,.png,.pdf,.docx,.xlsx</code> (separate by comma).
                        </small>
                    </div>

                    <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}>
                        <FiSave /> {t('saveSettings') || 'Save Settings'}
                    </button>

                </form>
            </div>
        </div>
    );
}
