import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import LogCard from '../components/LogCard';
import { TEAM_META } from '../lib/trackerConfig';
import { Clock, Plus, TrendingUp, Calendar, FileText } from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuth();
  const { getLogsForUser } = useData();
  const navigate = useNavigate();

  const myLogs = getLogsForUser(user?.id);
  const totalHours = myLogs.reduce((s, l) => s + Number(l.hours), 0);
  const teamColor = TEAM_META[user?.team]?.color || 'var(--accent)';

  const thisWeek = myLogs.filter(l => {
    const d = new Date(l.date);
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    return d >= startOfWeek;
  });
  const weekHours = thisWeek.reduce((s, l) => s + Number(l.hours), 0);

  return (
    <div className="page-content">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div className="page-header" style={{ marginBottom: 0 }}>
          <h1 className="page-title">My Dashboard</h1>
          <p className="page-subtitle">
            Track your working hours for&nbsp;
            <span style={{ color: teamColor, fontWeight: 700 }}>{user?.team}</span>
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/log')}>
          <Plus size={16} /> Log Hours
        </button>
      </div>

      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(37,99,235,0.15)' }}>
            <Clock size={22} color="var(--accent)" />
          </div>
          <div>
            <div className="stat-value" style={{ color: 'var(--accent)' }}>{totalHours}h</div>
            <div className="stat-label">Total Hours Logged</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(59,130,246,0.14)' }}>
            <TrendingUp size={22} color="#93c5fd" />
          </div>
          <div>
            <div className="stat-value" style={{ color: '#93c5fd' }}>{weekHours}h</div>
            <div className="stat-label">This Week</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(96,165,250,0.12)' }}>
            <FileText size={22} color="#bfdbfe" />
          </div>
          <div>
            <div className="stat-value" style={{ color: '#bfdbfe' }}>{myLogs.length}</div>
            <div className="stat-label">Total Entries</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(147,197,253,0.10)' }}>
            <Calendar size={22} color="#dbeafe" />
          </div>
          <div>
            <div className="stat-value" style={{ color: '#dbeafe' }}>{myLogs.length > 0 ? (totalHours / myLogs.length).toFixed(1) : 0}h</div>
            <div className="stat-label">Avg per Session</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 className="section-title" style={{ marginBottom: 0 }}>
          <Clock size={17} color="var(--accent)" /> My Work Log History
        </h2>
        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{myLogs.length} entries</span>
      </div>

      {myLogs.length === 0 ? (
        <div className="empty-state">
          <Clock size={48} />
          <h3>No entries yet</h3>
          <p>Start by logging your first work session.</p>
          <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => navigate('/log')}>
            <Plus size={16} /> Log First Hours
          </button>
        </div>
      ) : (
        <div className="logs-list">
          {[...myLogs].sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt)).map(log => (
            <LogCard key={log.id} log={log} />
          ))}
        </div>
      )}
    </div>
  );
}
