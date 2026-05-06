import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, CheckCircle, ShieldCheck, UserRoundCog } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { TEAMS, hasExecutiveAccess, isSiteAdministrator } from '../lib/trackerConfig';

export default function Profile() {
  const { user, updateProfile } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: user?.name || '',
    team: user?.team || TEAMS[0],
    role: user?.role || 'collaborator',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const needsSetup = user?.profileCompleted === false;
  const isAdmin = isSiteAdministrator(user?.role);
  const isExecutive = hasExecutiveAccess(form.role);

  const set = (key, value) => {
    setForm(current => ({ ...current, [key]: value }));
    setError('');
    setSaved(false);
  };

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setSaved(false);

    if (!form.name.trim()) {
      setError('Full name is required.');
      return;
    }

    setSaving(true);
    const result = await updateProfile({
      name: form.name,
      team: form.team,
      role: form.role,
      profileCompleted: true,
    });
    setSaving(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setSaved(true);
    if (needsSetup) {
      navigate(hasExecutiveAccess(result.user?.role) ? '/executive' : '/dashboard', { replace: true });
    }
  };

  return (
    <div className="page-content">
      <div className="profile-layout">
        <div className="page-header">
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <UserRoundCog size={25} color="var(--accent)" />
            {needsSetup ? 'Complete Your Profile' : 'Profile Settings'}
          </h1>
          <p className="page-subtitle">
            {needsSetup
              ? 'Confirm your name and team before logging hours.'
              : 'Update the team and name used in your work logs.'}
          </p>
        </div>

        {needsSetup && (
          <div className="sync-alert" style={{ marginBottom: 18 }}>
            <AlertCircle size={15} />
            Google sign in needs one more step so AbleTo can place your hours under the correct team.
          </div>
        )}

        <div className="card">
          <form className="auth-form" onSubmit={submit}>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input
                className="form-input"
                value={form.name}
                onChange={event => set('name', event.target.value)}
                placeholder="Your full name"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" value={user?.email || ''} disabled />
              <span className="form-hint">Email is managed through your sign-in method.</span>
            </div>

            <div className="form-group">
              <label className="form-label">Team</label>
              <select className="form-select" value={form.team} onChange={event => set('team', event.target.value)}>
                {TEAMS.map(team => <option key={team} value={team}>{team}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">{isAdmin ? 'Site Access' : 'Executive Board Access'}</label>
              {isAdmin ? (
                <input className="form-input" value="Site Administrator" disabled />
              ) : (
                <button
                  type="button"
                  className={`switch-row ${isExecutive ? 'active' : ''}`}
                  onClick={() => set('role', isExecutive ? 'collaborator' : 'executive')}
                  aria-pressed={isExecutive}
                >
                  <span className="switch-track"><span className="switch-thumb" /></span>
                  <span className="switch-copy">
                    <strong>{isExecutive ? 'Executive Board' : 'Standard Member'}</strong>
                    <span>{isExecutive ? 'Team overview enabled' : 'Personal hours only'}</span>
                  </span>
                </button>
              )}
              <span className="form-hint">
                {isAdmin ? 'Administrative access is active.' : 'Temporary board-only control for this rollout.'}
              </span>
            </div>

            <div className="auth-info" style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <ShieldCheck size={15} style={{ marginTop: 2 }} />
              <span>
                {isExecutive
                  ? isAdmin
                    ? 'You can manage member records, verify entries, and review team activity.'
                    : 'You can log your own hours, review team activity, and see the executive overview.'
                  : 'You can log and manage your own hours. The executive overview is only available to executive board members.'}
              </span>
            </div>

            {error && <div className="auth-error">{error}</div>}
            {saved && !needsSetup && (
              <div className="auth-info" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <CheckCircle size={14} /> Profile updated.
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, flexWrap: 'wrap' }}>
              {!needsSetup && (
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => navigate(hasExecutiveAccess(user?.role) ? '/executive' : '/dashboard')}
                >
                  Back
                </button>
              )}
              <button className="btn btn-primary btn-lg" type="submit" disabled={saving}>
                <UserRoundCog size={16} />
                {saving ? 'Saving...' : needsSetup ? 'Continue' : 'Save Profile'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
