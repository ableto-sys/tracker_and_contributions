import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import MediaUpload from '../components/MediaUpload';
import { CONTRIBUTION_START_DATE, hasExecutiveAccess } from '../lib/trackerConfig';
import { CheckCircle, Clock, ArrowLeft, AlertCircle, FileCheck } from 'lucide-react';

export default function LogHours() {
  const { user } = useAuth();
  const { addLog } = useData();
  const navigate = useNavigate();

  const today = new Date().toISOString().split('T')[0];

  const [form, setForm] = useState({ date: today, hours: '', notes: '', mediaFiles: [] });
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: '' })); };

  const noteLen = form.notes.trim().length;
  const hasMedia = form.mediaFiles.length > 0;

  const isVerified = hasMedia;
  const verificationPct = hasMedia ? 100 : 0;
  const homePath = hasExecutiveAccess(user?.role) ? '/executive' : '/dashboard';

  const validate = () => {
    const e = {};
    if (!form.date) e.date = 'Date is required.';
    if (form.date && form.date < CONTRIBUTION_START_DATE) e.date = 'Contributions are counted from Tuesday, May 5, 2026 onward.';
    if (!form.hours || isNaN(form.hours) || Number(form.hours) <= 0) e.hours = 'Enter a valid number of hours.';
    if (Number(form.hours) > 24) e.hours = 'Hours cannot exceed 24.';
    if (noteLen < 20) e.notes = 'Please describe your progress (minimum 20 characters).';
    if (!hasMedia) e.mediaFiles = 'Attach at least one picture, video, PDF, or file to verify this entry.';
    return e;
  };

  const submit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setSaving(true);
    const result = await addLog({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      team: user.team,
      date: form.date,
      hours: Number(form.hours),
      notes: form.notes.trim(),
      mediaFiles: form.mediaFiles,
    });

    setSaving(false);

    if (result.error) {
      setErrors({ save: result.error });
      return;
    }

    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center', padding: 24 }}>
        <div style={{
          width: 80, height: 80, borderRadius: '50%',
          background: 'rgba(37,99,235,0.15)', border: '2px solid rgba(96,165,250,0.42)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24,
        }}>
          <CheckCircle size={40} color="var(--success)" />
        </div>
        <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>Hours Logged!</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: 15, marginBottom: 32, maxWidth: 360 }}>
          Your <strong style={{ color: 'var(--accent)' }}>{form.hours}h</strong> work session for{' '}
          <strong style={{ color: 'var(--accent)' }}>{user?.team}</strong>{' '}
          has been recorded and verified.
        </p>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn btn-ghost" onClick={() => { setSubmitted(false); setForm({ date: today, hours: '', notes: '', mediaFiles: [] }); }}>
            Log More Hours
          </button>
          <button className="btn btn-primary" onClick={() => navigate(homePath)}>
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-content">
      <div style={{ maxWidth: 680, margin: '0 auto' }}>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate(homePath)} style={{ marginBottom: 16 }}>
          <ArrowLeft size={14} /> Back
        </button>

        <div className="page-header">
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Clock size={24} color="var(--accent)" /> Log Your Hours
          </h1>
          <p className="page-subtitle">
            Recording working hours for <strong style={{ color: 'var(--text-primary)' }}>{user?.team}</strong>
          </p>
        </div>

        {/* Verification indicator */}
        <div className="card" style={{
          marginBottom: 20,
          borderColor: isVerified ? 'rgba(96,165,250,0.42)' : 'var(--border)',
          background: isVerified ? 'rgba(37,99,235,0.08)' : 'var(--bg-card)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <FileCheck size={16} color={isVerified ? 'var(--success)' : 'var(--text-muted)'} />
              <span style={{ fontSize: 13, fontWeight: 700, color: isVerified ? 'var(--success)' : 'var(--text-secondary)' }}>
                {isVerified ? 'File Evidence Attached' : 'File Evidence Needed'}
              </span>
            </div>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{verificationPct}%</span>
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{
              width: `${verificationPct}%`,
              background: isVerified
                ? 'linear-gradient(90deg, #2563eb, #93c5fd)'
                : 'linear-gradient(90deg, var(--primary), var(--accent))',
            }} />
          </div>
          <div style={{ marginTop: 10, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 5, color: hasMedia ? 'var(--success)' : 'var(--text-muted)' }}>
              {hasMedia ? <CheckCircle size={13} /> : <AlertCircle size={13} />} Supporting file required for verification
            </span>
          </div>
          {!isVerified && (
            <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 6, color: errors.mediaFiles ? 'var(--danger)' : 'var(--text-muted)', fontSize: 13 }}>
              <AlertCircle size={14} /> A file is required before this entry can be submitted.
            </div>
          )}
        </div>

        <div className="card">
          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Date</label>
                <input type="date" className="form-input" value={form.date} min={CONTRIBUTION_START_DATE} max={today} onChange={e => set('date', e.target.value)} />
                {errors.date && <span className="form-error">{errors.date}</span>}
              </div>
              <div className="form-group">
                <label className="form-label">Hours Contributed</label>
                <input type="number" className="form-input" placeholder="e.g. 2.5" min="0.5" max="24" step="0.5" value={form.hours} onChange={e => set('hours', e.target.value)} />
                {errors.hours && <span className="form-error">{errors.hours}</span>}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">
                Progress Notes <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <textarea
                className="form-textarea"
                placeholder="Describe specifically what you accomplished. What was built, researched, designed, or completed? Be as detailed as possible."
                rows={5}
                value={form.notes}
                onChange={e => set('notes', e.target.value)}
                style={{
                  minHeight: 120,
                  borderColor: noteLen >= 50 ? 'rgba(96,165,250,0.42)' : noteLen >= 20 ? 'var(--border)' : errors.notes ? 'rgba(239,68,68,0.4)' : 'var(--border)',
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                {errors.notes
                  ? <span className="form-error">{errors.notes}</span>
                  : <span className="form-hint">Be specific. Minimum 20 characters.</span>
                }
                <span style={{ fontSize: 12, fontWeight: 600, color: noteLen >= 50 ? 'var(--success)' : noteLen >= 20 ? 'var(--warning)' : 'var(--danger)', flexShrink: 0, marginLeft: 8 }}>
                  {noteLen} chars
                </span>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">
                Supporting Media
                <span style={{ color: 'var(--danger)', fontWeight: 600, textTransform: 'none', fontSize: 12, marginLeft: 6 }}>
                  (required)
                </span>
              </label>
              <MediaUpload value={form.mediaFiles} onChange={v => set('mediaFiles', v)} />
              {errors.mediaFiles && <span className="form-error">{errors.mediaFiles}</span>}
            </div>

            <hr className="divider" />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 13 }}>
                {hasMedia && <span style={{ color: 'var(--success)', display: 'inline-flex', alignItems: 'center', gap: 5 }}><CheckCircle size={13} /> {form.mediaFiles.length} file{form.mediaFiles.length !== 1 ? 's' : ''} attached</span>}
                {errors.save && <span className="form-error">{errors.save}</span>}
              </div>
              <button
                className="btn btn-primary btn-lg"
                type="submit"
                disabled={!form.hours || noteLen < 20 || !hasMedia || saving}
                style={{ opacity: (!form.hours || noteLen < 20 || !hasMedia) ? 0.5 : 1 }}
              >
                <FileCheck size={16} /> {saving ? 'Saving...' : 'Submit & Verify'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
