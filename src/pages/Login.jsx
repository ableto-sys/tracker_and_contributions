import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { TEAMS } from '../lib/trackerConfig';
import { Eye, EyeOff, Globe2, LogIn, Mail } from 'lucide-react';

export default function Login() {
  const { login, register, loginWithGoogle, authBackend } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState('login');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({ name: '', email: '', password: '', team: TEAMS[0] });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setLoading(true);

    let result;
    if (mode === 'login') {
      result = await login(form.email, form.password);
    } else {
      if (!form.name.trim()) { setError('Full name is required.'); setLoading(false); return; }
      if (form.password.length < 6) { setError('Password must be at least 6 characters.'); setLoading(false); return; }
      result = await register(form);
    }

    setLoading(false);
    if (result.error) { setError(result.error); return; }
    if (result.pendingConfirmation) { setInfo(result.message); return; }

    navigate(result.user?.role === 'executive' ? '/executive' : '/dashboard');
  };

  const handleGoogle = async () => {
    setError('');
    setInfo('');
    setLoading(true);
    const result = await loginWithGoogle();
    setLoading(false);
    if (result.error) setError(result.error);
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-text">AbleTo</div>
        </div>

        <div className="card">
          <h1 className="auth-title">{mode === 'login' ? 'Welcome back' : 'Join AbleTo'}</h1>
          <p className="auth-subtitle">
            {mode === 'login'
              ? 'Sign in to review team hours and evidence.'
              : 'Create your account to log hours with clear notes and supporting evidence.'}
          </p>

          {error && <div className="auth-error" style={{ marginBottom: 16 }}>{error}</div>}
          {info && <div className="auth-info" style={{ marginBottom: 16 }}>{info}</div>}

          <form className="auth-form" onSubmit={submit}>
            {mode === 'register' && (
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input className="form-input" placeholder="Your full name" value={form.name} onChange={e => set('name', e.target.value)} required />
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                className="form-input"
                type="email"
                placeholder="your@email.com"
                value={form.email}
                onChange={e => set('email', e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  className="form-input"
                  type={show ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={e => set('password', e.target.value)}
                  required
                  style={{ paddingRight: 44 }}
                />
                <button type="button" onClick={() => setShow(s => !s)} style={{
                  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', color: 'var(--text-muted)', padding: 4, cursor: 'pointer'
                }}>
                  {show ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {mode === 'register' && (
              <>
                <div className="form-group">
                  <label className="form-label">Team</label>
                  <select className="form-select" value={form.team} onChange={e => set('team', e.target.value)}>
                    {TEAMS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Executive Board Access</label>
                  <input className="form-input" value="Assigned by AbleTo policy" disabled />
                  <span className="form-hint">
                    Board access is based on the executive email allowlist, not a team title.
                  </span>
                </div>
              </>
            )}

            <button className="btn btn-primary btn-full btn-lg" type="submit" disabled={loading} style={{ marginTop: 4 }}>
              {mode === 'login' ? <LogIn size={16} /> : <Mail size={16} />}
              {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <div className="auth-divider"><span>or</span></div>

          <button className="btn btn-ghost btn-full btn-lg" type="button" onClick={handleGoogle} disabled={loading || authBackend !== 'supabase'}>
            <Globe2 size={16} />
            Continue with Google
          </button>

          {authBackend !== 'supabase' && (
            <div className="auth-provider-note">
              Google activates when Supabase keys are added. Demo sign in is ready with emidaz138@gmail.com.
            </div>
          )}

          <div className="auth-footer">
            {mode === 'login' ? (
              <>Don't have an account? <span onClick={() => { setMode('register'); setError(''); }}>Sign up</span></>
            ) : (
              <>Already have an account? <span onClick={() => { setMode('login'); setError(''); }}>Sign in</span></>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
