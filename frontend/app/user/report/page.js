'use client';
import { useState, useEffect } from 'react';
import { useLanguage } from '../../components/LanguageProvider';

import RepairSuccess from '../../components/RepairSuccess';
import FileDropZone from '../../components/FileDropZone';

export default function UserReport() {
    const { t } = useLanguage();
    const [formData, setFormData] = useState({ description: '' });
    const [message, setMessage] = useState(null);
    const [token, setToken] = useState('');
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [publicData, setPublicData] = useState({});

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        setToken(user.token);
        fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://192.168.0.112:5250'}/api/public/data`)
            .then(res => res.json())
            .then(data => setPublicData(data))
            .catch(err => console.error("Could not load public data:", err));
    }, []);

    const handleReportSubmit = async (e) => {
        e.preventDefault();
        setMessage(null);
        try {
            let attachmentUrls = [];
            if (selectedFiles.length > 0) {
                const uploadData = new FormData();
                selectedFiles.forEach(f => uploadData.append('files', f));

                const uploadRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://192.168.0.112:5250'}/api/tickets/upload`, {
                    method: 'POST',
                    body: uploadData
                });

                const uploadResult = await uploadRes.json();
                if (!uploadRes.ok) {
                    setMessage({ type: 'error', text: uploadResult.message || t('uploadFailed') });
                    return;
                }
                attachmentUrls = uploadResult.files;
            }

            const payload = { ...formData, attachment_urls: attachmentUrls };

            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://192.168.0.112:5250'}/api/tickets`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (res.ok) {
                setMessage({ type: 'success', text: `${t('ticketCreatedSuccess')} ${data.ticket_no}` });
                setFormData({ description: '' });
                setSelectedFiles([]);
            } else {
                setMessage({ type: 'error', text: data.message || t('submitFailed') });
            }
        } catch (err) {
            setMessage({ type: 'error', text: t('serverConnectionError') });
        }
    };

    return (
        <div className="animate-fade-in" style={{ maxWidth: '700px', margin: '0 auto' }}>
            <h2 style={{ color: 'var(--color-primary)', marginBottom: '1.5rem' }}>{t('reportNewIssue')}</h2>

            <div className="glass-card">
                {message && message.type === 'success' ? (
                    <RepairSuccess
                        message={message.text}
                        t={t}
                        onReset={() => {
                            setMessage(null);
                            setFormData({ description: '' });
                            setSelectedFiles([]);
                        }}
                    />
                ) : (
                    <>
                        {message && message.type === 'error' && (
                            <div className={`badge badge-error`} style={{ padding: '1rem', width: '100%', marginBottom: '1.5rem', display: 'block' }}>
                                {message.text}
                            </div>
                        )}

                        <form onSubmit={handleReportSubmit}>
                            <div className="form-group">
                                <label className="label">{t('issueDetailsUserLabel')}</label>
                                <textarea className="textarea" required value={formData.description || ''} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder={t('issueDetailsUserPlaceholder')} style={{ minHeight: '150px' }}></textarea>
                            </div>

                            <FileDropZone
                                files={selectedFiles}
                                onChange={setSelectedFiles}
                                maxSizeMB={publicData.attachmentSettings?.max_file_size_mb}
                                allowedExtensions={publicData.attachmentSettings?.allowed_extensions}
                                isActive={publicData.attachmentSettings?.is_active}
                            />

                            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>{t('submitIssueBtn')}</button>
                            </div>
                        </form>
                    </>
                )}
            </div>
        </div>
    );
}
