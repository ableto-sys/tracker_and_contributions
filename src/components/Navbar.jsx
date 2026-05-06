import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getBackendLabel } from '../lib/supabaseClient';
import { BarChart3, Clock, DatabaseZap, LayoutDashboard, LogOut } from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path) => location.pathname === path;
  const initials = user?.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';
  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <div>
          <div className="navbar-brand-name">AbleTo</div>
          <div className="navbar-brand-sub">Working Hours</div>
        </div>
      </div>

      <div className="navbar-nav">
        <button
          className={`navbar-link ${isActive('/dashboard') ? 'active' : ''}`}
          onClick={() => navigate('/dashboard')}
        >
          <LayoutDashboard size={15} /> My Dashboard
        </button>

        {/* Log Hours is always visible and highlighted for executives. */}
        <button
          onClick={() => navigate('/log')}
          className={`navbar-link ${isActive('/log') ? 'active' : ''}`}
          style={user?.role === 'executive' && !isActive('/log') ? {
            background: 'rgba(37,99,235,0.15)',
            color: 'var(--accent)',
            border: '1px solid rgba(37,99,235,0.3)',
          } : {}}
        >
          <Clock size={15} /> Log Hours
        </button>

        {user?.role === 'executive' && (
          <button
            className={`navbar-link ${isActive('/executive') ? 'active' : ''}`}
            onClick={() => navigate('/executive')}
          >
            <BarChart3 size={15} /> Team Overview
          </button>
        )}
      </div>

      <div className="navbar-right">
        <div className="backend-pill" title="Current data backend">
          <DatabaseZap size={13} />
          {getBackendLabel()}
        </div>
        <div className="navbar-user">
          <div className="avatar" style={{ width: 34, height: 34, fontSize: 13 }}>{initials}</div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div className="navbar-user-name">{user?.name}</div>
              {user?.role === 'executive' && (
                <span className="badge badge-exec" style={{ fontSize: 10, padding: '1px 7px' }}>Lead</span>
              )}
            </div>
            <div className="navbar-user-role">{user?.team}</div>
          </div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={handleLogout}>
          <LogOut size={14} /> Sign out
        </button>
      </div>
    </nav>
  );
}
