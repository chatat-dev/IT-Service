'use client';
import { useState, useEffect } from 'react';
import './globals.css';
import { useLanguage } from './components/LanguageProvider';
import StyledSelect from './components/StyledSelect';
import RepairSuccess from './components/RepairSuccess';
import FileDropZone from './components/FileDropZone';

export default function GuestPage() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('report');
  const [publicData, setPublicData] = useState({ locations: [], companies: [], sites: [], departments: [], categories: [] });
  const router = require('next/navigation').useRouter();

  useEffect(() => {
    // Auto-redirect if already logged in
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    if (user && user.token && user.role) {
      if (user.role === 'admin') router.push('/admin');
      else if (user.role === 'it' || user.role === 'super_user') router.push('/it');
      else if (user.role === 'user') router.push('/user/report');
    }
  }, [router]);

  // Forms states
  const [formData, setFormData] = useState({
    location_id: '', company_id: '', site_id: '', department_id: '', category_id: '',
    guest_name: '', guest_phone: '', description: ''
  });
  const [message, setMessage] = useState(null);

  // Tracking state
  const [searchWord, setSearchWord] = useState('');
  const [trackedTickets, setTrackedTickets] = useState([]);
  const [selectedTrack, setSelectedTrack] = useState(null);
  const [selectedFiles, setSelectedFiles] = useState([]);

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

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://192.168.0.112:5250'}/api/tickets/guest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: `${t('ticketSuccess')} ${data.ticket_no}` });
        setFormData({ location_id: '', company_id: '', site_id: '', department_id: '', category_id: '', guest_name: '', guest_phone: '', description: '' });
        setSelectedFiles([]);
      } else {
        setMessage({ type: 'error', text: data.message || t('failedSubmit') });
      }
    } catch (err) {
      setMessage({ type: 'error', text: t('serverError') });
    }
  };

  const handleTrackSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://192.168.0.112:5250'}/api/tickets/track?keyword=${searchWord}`);
      const data = await res.json();
      if (res.ok) setTrackedTickets(data);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="container animate-fade-in" style={{ paddingBottom: '4rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h1 style={{ color: 'var(--color-primary)' }}>{t('welcomeTitle')}</h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '1.1rem' }}>{t('welcomeSub')}</p>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
        <button
          className={`btn ${activeTab === 'report' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setActiveTab('report')}
          style={{ flex: '1 1 0', minWidth: '120px', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.75rem 1rem' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="12" y1="18" x2="12" y2="12" /><line x1="9" y1="15" x2="15" y2="15" /></svg>
          {t('reportIssue')}
        </button>
        <button
          className={`btn ${activeTab === 'track' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setActiveTab('track')}
          style={{ flex: '1 1 0', minWidth: '120px', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.75rem 1rem' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
          {t('trackIssue')}
        </button>
        <a href="/register" className="btn btn-outline"
          style={{ flex: '1 1 0', minWidth: '120px', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.75rem 1rem' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /><line x1="20" y1="8" x2="20" y2="14" /><line x1="23" y1="11" x2="17" y2="11" /></svg>
          {t('registerMember')}
        </a>
      </div>

      <div className="glass-card">
        {activeTab === 'report' && (
          <div className="animate-slide-up">
            <h2 style={{ marginBottom: '1.5rem', color: 'var(--color-secondary)' }}>{t('submitRepairTitle')}</h2>

            {message && message.type === 'success' ? (
              <RepairSuccess
                message={message.text}
                t={t}
                onReset={() => {
                  setMessage(null);
                  setFormData({ location_id: '', company_id: '', site_id: '', department_id: '', category_id: '', guest_name: '', guest_phone: '', description: '' });
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
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
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

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
                    <div className="form-group">
                      <label className="label">{t('fullNameLabel')}</label>
                      <input type="text" name="guest_name" className="input" required value={formData.guest_name} onChange={handleInputChange} />
                    </div>
                    <div className="form-group">
                      <label className="label">{t('contactPhoneLabel')}</label>
                      <input type="text" name="guest_phone" className="input" value={formData.guest_phone} onChange={handleInputChange} />
                    </div>
                  </div>


                  <div className="form-group">
                    <label className="label">{t('issueDetailsLabel')}</label>
                    <textarea name="description" className="textarea" required value={formData.description || ''} onChange={handleInputChange} placeholder={t('issuePlaceholder')}></textarea>
                  </div>

                  <FileDropZone
                    files={selectedFiles}
                    onChange={setSelectedFiles}
                    maxSizeMB={publicData.attachmentSettings?.max_file_size_mb}
                    allowedExtensions={publicData.attachmentSettings?.allowed_extensions}
                    isActive={publicData.attachmentSettings?.is_active}
                  />

                  <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                    <button type="button" className="btn btn-outline" onClick={() => setFormData({ location_id: '', company_id: '', site_id: '', department_id: '', category_id: '', guest_name: '', guest_phone: '', description: '' })}>{t('resetBtn')}</button>
                    <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>{t('submitRequestBtn')}</button>
                  </div>
                </form>
              </>
            )}
          </div>
        )}

        {activeTab === 'track' && (
          <div className="animate-slide-up">
            <h2 style={{ marginBottom: '1.5rem', color: 'var(--color-secondary)' }}>{t('trackIssueTitle')}</h2>
            <form onSubmit={handleTrackSubmit} style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
              <input type="text" className="input" placeholder={t('searchPlaceholder')} value={searchWord} onChange={e => setSearchWord(e.target.value)} required />
              <button type="submit" className="btn btn-primary">{t('searchBtn')}</button>
            </form>

            {trackedTickets.length > 0 ? (
              <div style={{ display: 'grid', gap: '1rem' }}>
                {trackedTickets.map(tk => {
                  const statusColor = tk.status === 'closed' ? '#10b981' : tk.status === 'in_progress' ? '#f59e0b' : '#6366f1';
                  const statusLabel = tk.status === 'closed' ? 'Closed' : tk.status === 'in_progress' ? 'In Progress' : 'Open';
                  return (
                    <div key={tk.id}
                      onClick={() => setSelectedTrack(tk)}
                      style={{
                        background: 'var(--color-surface)', border: '1px solid var(--color-glass-border)',
                        borderRadius: '12px', padding: '1.25rem 1.5rem', cursor: 'pointer',
                        transition: 'all 0.2s ease', borderLeft: `4px solid ${statusColor}`,
                        display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.5rem', alignItems: 'center',
                      }}
                      onMouseOver={e => e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.1)'}
                      onMouseOut={e => e.currentTarget.style.boxShadow = 'none'}
                    >
                      <div>
                        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '0.4rem' }}>
                          <strong style={{ color: 'var(--color-primary)', fontSize: '1rem' }}>{tk.ticket_no}</strong>
                          <span style={{
                            background: statusColor, color: '#fff', padding: '0.15rem 0.6rem',
                            borderRadius: '20px', fontSize: '0.7rem', fontWeight: '600', textTransform: 'uppercase'
                          }}>
                            {statusLabel}
                          </span>
                        </div>
                        <p style={{ color: 'var(--color-text-main)', margin: '0 0 0.3rem', fontSize: '0.9rem' }}>
                          {tk.description?.substring(0, 80)}{tk.description?.length > 80 ? '...' : ''}
                        </p>
                        <div style={{ display: 'flex', gap: '1.5rem', color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
                          <span>📅 {new Date(tk.created_at).toLocaleDateString()}</span>
                          <span>👤 {tk.guest_name || tk.user_name || '-'}</span>
                          <span>🔧 {tk.assigned_name || 'Unassigned'}</span>
                        </div>
                      </div>
                      <div style={{ color: 'var(--color-text-muted)', fontSize: '1.2rem' }}>▶</div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
                {t('noTicketsFound')}
              </div>
            )}

            {/* Detail Modal */}
            {selectedTrack && (
              <div style={{
                position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
                display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999, padding: '1rem'
              }} onClick={() => setSelectedTrack(null)}>
                <div style={{
                  background: '#ffffff', borderRadius: '16px', padding: '2rem', width: '520px', maxWidth: '92vw',
                  maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
                  animation: 'modalSlideUp 0.3s ease'
                }} onClick={e => e.stopPropagation()}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h3 style={{ margin: 0, color: '#6366f1', fontSize: '1.2rem' }}>📋 {selectedTrack.ticket_no}</h3>
                    <button onClick={() => setSelectedTrack(null)} style={{
                      background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#9ca3af'
                    }}>✕</button>
                  </div>

                  {/* Status Badge */}
                  <div style={{ marginBottom: '1.5rem' }}>
                    <span style={{
                      background: selectedTrack.status === 'closed' ? '#10b981' : selectedTrack.status === 'in_progress' ? '#f59e0b' : '#6366f1',
                      color: '#fff', padding: '0.3rem 1rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: '600'
                    }}>
                      {selectedTrack.status === 'closed' ? '✅ Closed' : selectedTrack.status === 'in_progress' ? '🔄 In Progress' : '🆕 Open'}
                    </span>
                  </div>

                  {/* Info Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                    {[
                      { label: '👤 Requester', value: selectedTrack.guest_name || selectedTrack.user_name || '-' },
                      { label: '📞 Phone', value: selectedTrack.guest_phone || selectedTrack.phone || '-' },
                      { label: '📅 Created', value: new Date(selectedTrack.created_at).toLocaleString() },
                      { label: '🔧 Assigned To', value: selectedTrack.assigned_name || 'Unassigned' },
                      { label: '📍 Location', value: selectedTrack.location_name || '-' },
                      { label: '🏢 Company', value: selectedTrack.company_name || '-' },
                    ].map((item, i) => (
                      <div key={i} style={{ padding: '0.6rem', background: '#f9fafb', borderRadius: '8px' }}>
                        <div style={{ fontSize: '0.7rem', color: '#9ca3af', fontWeight: '600', marginBottom: '0.2rem' }}>{item.label}</div>
                        <div style={{ fontSize: '0.85rem', color: '#374151', fontWeight: '500' }}>{item.value}</div>
                      </div>
                    ))}
                  </div>

                  {/* Description */}
                  <div style={{ marginBottom: '1.5rem' }}>
                    <div style={{ fontSize: '0.8rem', color: '#9ca3af', fontWeight: '600', marginBottom: '0.4rem' }}>📝 Issue Description</div>
                    <div style={{
                      padding: '1rem', background: '#f9fafb', borderRadius: '8px',
                      color: '#374151', fontSize: '0.9rem', lineHeight: '1.6',
                      whiteSpace: 'pre-wrap', maxHeight: '150px', overflowY: 'auto'
                    }}>
                      {selectedTrack.description || '-'}
                    </div>
                  </div>

                  {/* Attachments */}
                  {selectedTrack.attachment_urls && (() => {
                    try {
                      const parsed = typeof selectedTrack.attachment_urls === 'string' ? JSON.parse(selectedTrack.attachment_urls) : selectedTrack.attachment_urls;
                      return parsed.length > 0 ? (
                        <div style={{ marginBottom: '1.5rem' }}>
                          <div style={{ fontSize: '0.8rem', color: '#9ca3af', fontWeight: '600', marginBottom: '0.4rem' }}>📎 {t('attached')}</div>
                          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                            {parsed.map((f, i) => (
                              <a key={i} href={`${process.env.NEXT_PUBLIC_API_URL || 'http://192.168.0.112:5250'}${f.url}`} target="_blank" rel="noreferrer"
                                style={{ padding: '0.4rem 0.8rem', background: '#e0e7ff', color: '#4338ca', borderRadius: '4px', fontSize: '0.8rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>
                                {f.name}
                              </a>
                            ))}
                          </div>
                        </div>
                      ) : null;
                    } catch (err) { return null; }
                  })()}

                  {/* Solution (if closed) */}
                  {selectedTrack.solution && (
                    <div style={{ marginBottom: '1rem' }}>
                      <div style={{ fontSize: '0.8rem', color: '#9ca3af', fontWeight: '600', marginBottom: '0.4rem' }}>💡 Solution</div>
                      <div style={{
                        padding: '1rem', background: '#ecfdf5', borderRadius: '8px', border: '1px solid #a7f3d0',
                        color: '#065f46', fontSize: '0.9rem', lineHeight: '1.6', whiteSpace: 'pre-wrap'
                      }}>
                        {selectedTrack.solution}
                      </div>
                    </div>
                  )}

                  {selectedTrack.closed_at && (
                    <div style={{ textAlign: 'center', fontSize: '0.8rem', color: '#10b981', fontWeight: '500' }}>
                      ✅ Closed on {new Date(selectedTrack.closed_at).toLocaleString()}
                    </div>
                  )}
                </div>
              </div>
            )}

            <style jsx>{`
              @keyframes modalSlideUp { from { opacity: 0; transform: translateY(20px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
            `}</style>
          </div>
        )}
      </div>
    </div>
  );
}
