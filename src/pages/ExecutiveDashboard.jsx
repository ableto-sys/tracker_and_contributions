import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import LogCard from '../components/LogCard';
import { TEAM_META, TEAM_OPTIONS } from '../lib/trackerConfig';
import { getBackendLabel } from '../lib/supabaseClient';
import {
  Clock, Users, BarChart3, Search, Download,
  ArrowLeft, Calendar, TrendingUp, FileCheck, Flame,
  Image, ChevronRight, Activity, AlertTriangle, ShieldCheck,
  DatabaseZap, RefreshCw
} from 'lucide-react';

function getInitials(name) {
  return name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';
}

function formatDate(d) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function isLogVerified(log) {
  return log.verificationStatus === 'verified' || log.mediaFiles?.length > 0 || log.notes?.length >= 50;
}

function weeksAgo(weeksBack) {
  const d = new Date();
  d.setDate(d.getDate() - weeksBack * 7);
  return d;
}

function weekKey(date) {
  const d = new Date(date);
  const monday = new Date(d);
  monday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return monday.toISOString().split('T')[0];
}

// Mini activity bar chart for the last 10 weeks.
function ActivityChart({ logs }) {
  const weeks = useMemo(() => {
    const map = {};
    for (let i = 9; i >= 0; i--) {
      const d = weeksAgo(i);
      const key = weekKey(d);
      map[key] = { key, hours: 0, label: new Date(key).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) };
    }
    logs.forEach(l => {
      const k = weekKey(l.date);
      if (map[k]) map[k].hours += Number(l.hours);
    });
    return Object.values(map);
  }, [logs]);

  const max = Math.max(...weeks.map(w => w.hours), 1);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 64 }}>
        {weeks.map(w => (
          <div key={w.key} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }} title={`${w.label}: ${w.hours}h`}>
            <div style={{
              width: '100%', borderRadius: 4,
              height: `${Math.max((w.hours / max) * 100, w.hours > 0 ? 8 : 3)}%`,
              background: w.hours > 0 ? 'linear-gradient(180deg, var(--accent), #1d4ed8)' : 'var(--border)',
              transition: 'height 0.4s ease',
              minHeight: w.hours > 0 ? 6 : 3,
            }} />
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{weeks[0]?.label}</span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>This week</span>
      </div>
    </div>
  );
}

// Per-day heatmap for the last 30 days.
function DayHeatmap({ logs }) {
  const days = useMemo(() => {
    const map = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const k = d.toISOString().split('T')[0];
      map[k] = 0;
    }
    logs.forEach(l => { if (map[l.date] !== undefined) map[l.date] += Number(l.hours); });
    return Object.entries(map);
  }, [logs]);

  const max = Math.max(...days.map(([, h]) => h), 1);

  return (
    <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
      {days.map(([date, hours]) => {
        const intensity = hours > 0 ? Math.max(0.2, hours / max) : 0;
        return (
          <div
            key={date}
            title={`${formatDate(date)}: ${hours}h`}
            style={{
              width: 14, height: 14, borderRadius: 3,
              background: hours > 0
                ? `rgba(37,99,235,${intensity})`
                : 'var(--border)',
              border: hours > 0 ? `1px solid rgba(96,165,250,${intensity * 0.5})` : '1px solid transparent',
              cursor: 'default',
            }}
          />
        );
      })}
    </div>
  );
}

// Member stat chip.
function StatChip({ icon, value, label, color = 'var(--accent)' }) {
  return (
    <div style={{
      background: 'var(--bg-surface)', border: '1px solid var(--border)',
      borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12,
    }}>
      <div style={{ color, flexShrink: 0 }}>{icon}</div>
      <div>
        <div style={{ fontSize: 22, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{label}</div>
      </div>
    </div>
  );
}

// Member detail view.
function MemberDetail({ member, logs, onBack }) {
  const meta = TEAM_META[member.team] || { color: '#93c5fd', bg: 'rgba(59,130,246,0.12)' };
  const memberLogs = logs.filter(l => l.userId === member.userId)
    .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));

  const totalHours = memberLogs.reduce((s, l) => s + Number(l.hours), 0);

  const thisWeekHours = memberLogs.filter(l => {
    const d = new Date(l.date);
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    return d >= startOfWeek;
  }).reduce((s, l) => s + Number(l.hours), 0);

  const thisMonthHours = memberLogs.filter(l => {
    const d = new Date(l.date);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).reduce((s, l) => s + Number(l.hours), 0);

  const avgPerSession = memberLogs.length > 0 ? (totalHours / memberLogs.length).toFixed(1) : 0;

  const verificationRate = memberLogs.length > 0
    ? Math.round((memberLogs.filter(isLogVerified).length / memberLogs.length) * 100)
    : 0;

  const totalMediaFiles = memberLogs.reduce((s, l) => s + (l.mediaFiles?.length || 0), 0);

  const lastActive = memberLogs[0]?.date ? formatDate(memberLogs[0].date) : 'Never';

  // Activity streak across consecutive weeks.
  const streak = useMemo(() => {
    if (!memberLogs.length) return 0;
    let count = 0;
    for (let i = 0; i < 52; i++) {
      const weekStart = weeksAgo(i);
      const weekEnd = weeksAgo(i - 1);
      const hasEntry = memberLogs.some(l => {
        const d = new Date(l.date);
        return d >= weekStart && d < weekEnd;
      });
      if (hasEntry) count++;
      else if (i > 0) break;
    }
    return count;
  }, [memberLogs]);

  return (
    <div>
      <button className="btn btn-ghost btn-sm" onClick={onBack} style={{ marginBottom: 20 }}>
        <ArrowLeft size={14} /> All Members
      </button>

      {/* Header */}
      <div className="card" style={{ marginBottom: 20, background: `linear-gradient(135deg, var(--bg-card), ${meta.bg})` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
          <div className="avatar avatar-lg" style={{
            background: `linear-gradient(135deg, ${meta.color}88, ${meta.color}44)`,
            color: meta.color, width: 64, height: 64, fontSize: 22,
          }}>
            {getInitials(member.name)}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>{member.name}</h2>
              {member.role === 'executive' && (
                <span className="badge badge-exec">Exec Board</span>
              )}
            </div>
            <span className={`badge`} style={{ marginTop: 6, background: meta.bg, color: meta.color, border: `1px solid ${meta.color}44` }}>
              {member.team}
            </span>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6 }}>
              Last active: <span style={{ color: 'var(--text-secondary)' }}>{lastActive}</span>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 42, fontWeight: 900, color: meta.color, lineHeight: 1 }}>{totalHours}h</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>total contributed</div>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px,1fr))', gap: 12, marginBottom: 20 }}>
        <StatChip icon={<TrendingUp size={20} />} value={`${thisWeekHours}h`} label="This Week"   color="#93c5fd" />
        <StatChip icon={<Calendar   size={20} />} value={`${thisMonthHours}h`} label="This Month" color="#60a5fa" />
        <StatChip icon={<Clock      size={20} />} value={`${avgPerSession}h`} label="Avg / Session" color="#bfdbfe" />
        <StatChip icon={<BarChart3  size={20} />} value={memberLogs.length}  label="Total Entries" color="#dbeafe" />
        <StatChip icon={<Flame      size={20} />} value={`${streak}w`}       label="Week Streak"  color="#93c5fd" />
        <StatChip icon={<FileCheck  size={20} />} value={`${verificationRate}%`} label="Verified Logs" color="#bfdbfe" />
        <StatChip icon={<Image      size={20} />} value={totalMediaFiles}    label="Files Uploaded" color="#60a5fa" />
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        <div className="card">
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Activity size={14} /> Weekly Activity (last 10 weeks)
          </div>
          <ActivityChart logs={memberLogs} />
        </div>
        <div className="card">
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Calendar size={14} /> Daily Heatmap (last 30 days)
          </div>
          <DayHeatmap logs={memberLogs} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10 }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Less</span>
            {[0.1, 0.3, 0.5, 0.7, 1].map(o => (
              <div key={o} style={{ width: 12, height: 12, borderRadius: 2, background: `rgba(37,99,235,${o})` }} />
            ))}
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>More</span>
          </div>
        </div>
      </div>

      {/* Log entries */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Clock size={16} color="var(--accent)" /> Work Log History
        </h3>
        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{memberLogs.length} entries</span>
      </div>

      {memberLogs.length === 0 ? (
        <div className="empty-state"><Clock size={40} /><h3>No entries yet</h3></div>
      ) : (
        <div className="logs-list">
          {memberLogs.map(log => <LogCard key={log.id} log={log} />)}
        </div>
      )}
    </div>
  );
}

// Member card in the Members tab.
function MemberCard({ member, logs, onClick }) {
  const meta = TEAM_META[member.team] || { color: '#93c5fd', bg: 'rgba(59,130,246,0.12)' };
  const memberLogs = logs.filter(l => l.userId === member.userId);
  const totalHours = memberLogs.reduce((s, l) => s + Number(l.hours), 0);
  const lastActive = memberLogs.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))[0]?.date;
  const verRate = memberLogs.length > 0
    ? Math.round((memberLogs.filter(isLogVerified).length / memberLogs.length) * 100)
    : 0;

  const recentWeekHours = memberLogs.filter(l => {
    const d = new Date(l.date);
    return (new Date() - d) < 7 * 86400000;
  }).reduce((s, l) => s + Number(l.hours), 0);

  return (
    <div
      className="card"
      onClick={onClick}
      style={{ cursor: 'pointer', transition: 'all 0.2s', borderColor: 'var(--border)' }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = meta.color + '66'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'none'; }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <div className="avatar" style={{ background: `linear-gradient(135deg, ${meta.color}88, ${meta.color}33)`, color: meta.color }}>
          {getInitials(member.name)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontWeight: 700, fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{member.name}</span>
            {member.role === 'executive' && <span className="badge badge-exec" style={{ fontSize: 10, padding: '1px 6px' }}>Exec Board</span>}
          </div>
          <span style={{ fontSize: 12, color: meta.color }}>{member.team}</span>
        </div>
        <ChevronRight size={16} color="var(--text-muted)" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 14 }}>
        {[
          { label: 'Total', value: `${totalHours}h`, color: meta.color },
          { label: 'This week', value: `${recentWeekHours}h`, color: '#93c5fd' },
          { label: 'Entries', value: memberLogs.length, color: '#bfdbfe' },
        ].map(s => (
          <div key={s.label} style={{ textAlign: 'center', background: 'var(--bg-surface)', borderRadius: 8, padding: '8px 4px' }}>
            <div style={{ fontSize: 17, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ marginBottom: 10 }}>
        <ActivityChart logs={memberLogs} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          {lastActive ? `Last: ${formatDate(lastActive)}` : 'No activity yet'}
        </span>
        <span style={{ fontSize: 12, color: verRate >= 50 ? 'var(--success)' : 'var(--text-muted)', fontWeight: 600 }}>
          <FileCheck size={11} style={{ display: 'inline', marginRight: 3 }} />
          {verRate}% verified
        </span>
      </div>
    </div>
  );
}

// Main executive dashboard.
export default function ExecutiveDashboard() {
  const { user } = useAuth();
  const { getAllLogs, getStats, getLogsForUser, getMembers, refreshLogs, loading, syncError } = useData();
  const navigate = useNavigate();
  const [teamFilter, setTeamFilter] = useState('All Teams');
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('overview');
  const [selectedMember, setSelectedMember] = useState(null);

  const stats = getStats();
  const allLogs = getAllLogs();
  const members = getMembers();
  const now = new Date();
  const daysAgo = (days) => {
    const date = new Date(now);
    date.setDate(date.getDate() - days);
    return date;
  };

  const myLogs = getLogsForUser(user?.id);
  const startOfWeek = new Date();
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  const myWeekLogs = myLogs.filter(l => new Date(l.date) >= startOfWeek);
  const myWeekHours = myWeekLogs.reduce((s, l) => s + Number(l.hours), 0);
  const myTotalHours = myLogs.reduce((s, l) => s + Number(l.hours), 0);

  const recentLogs = allLogs.filter(log => new Date(log.date) >= daysAgo(7));
  const monthLogs = allLogs.filter(log => new Date(log.date) >= daysAgo(30));
  const recentHours = recentLogs.reduce((sum, log) => sum + Number(log.hours), 0);
  const monthHours = monthLogs.reduce((sum, log) => sum + Number(log.hours), 0);
  const activeContributors = members.filter(member => member.entries > 0).length;
  const avgHoursPerContributor = activeContributors ? (stats.total / activeContributors).toFixed(1) : 0;
  const verifiedLogs = allLogs.filter(isLogVerified);
  const verificationRate = allLogs.length ? Math.round((verifiedLogs.length / allLogs.length) * 100) : 0;

  const latestActivityByUser = new Map();
  allLogs.forEach(log => {
    const current = latestActivityByUser.get(log.userId);
    const submitted = new Date(log.submittedAt);
    if (!current || submitted > current) latestActivityByUser.set(log.userId, submitted);
  });

  const attentionMembers = members.filter(member => {
    const lastActivity = latestActivityByUser.get(member.userId);
    if (!lastActivity) return true;
    return now - lastActivity > 14 * 86400000;
  });

  const topTeam = TEAM_OPTIONS.slice(1)
    .map(team => ({ team, hours: stats.byTeam[team] || 0 }))
    .sort((a, b) => b.hours - a.hours)[0];

  const filteredLogs = useMemo(() => {
    return allLogs.filter(l => {
      const matchTeam = teamFilter === 'All Teams' || l.team === teamFilter;
      const matchSearch = !search || l.userName.toLowerCase().includes(search.toLowerCase()) || l.notes.toLowerCase().includes(search.toLowerCase());
      return matchTeam && matchSearch;
    });
  }, [allLogs, teamFilter, search]);

  const maxHours = members[0]?.hours || 1;

  const exportCSV = () => {
    const rows = [['Name', 'Team', 'Date', 'Hours', 'Notes', 'Media Files', 'Submitted At']];
    allLogs.forEach(l => rows.push([l.userName, l.team, l.date, l.hours, `"${l.notes.replace(/"/g, '""')}"`, l.mediaFiles?.length || 0, l.submittedAt]));
    const csv = rows.map(r => r.join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `ableto-working-hours-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  // Member detail view
  if (selectedMember) {
    return (
      <div className="page-content">
        <MemberDetail
          member={selectedMember}
          logs={allLogs}
          onBack={() => setSelectedMember(null)}
        />
      </div>
    );
  }

  return (
    <div className="page-content">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div className="page-header" style={{ marginBottom: 0 }}>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <BarChart3 size={26} color="var(--accent)" /> Executive Overview
          </h1>
          <p className="page-subtitle">All team hours, activity, evidence, and progress</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="backend-pill">
            <DatabaseZap size={13} />
            {getBackendLabel()}
          </div>
          <button className="btn btn-ghost" onClick={refreshLogs} disabled={loading}>
            <RefreshCw size={15} /> {loading ? 'Syncing...' : 'Refresh'}
          </button>
          <button className="btn btn-ghost" onClick={exportCSV}>
            <Download size={15} /> Export CSV
          </button>
        </div>
      </div>

      {syncError && (
        <div className="sync-alert">
          <AlertTriangle size={15} />
          {syncError}
        </div>
      )}

      {/* My Week banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(37,99,235,0.16), rgba(2,6,23,0.18))',
        border: '1px solid rgba(37,99,235,0.25)',
        borderRadius: 'var(--radius-lg)',
        padding: '18px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 16,
        marginBottom: 20,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 46, height: 46, borderRadius: 12,
            background: 'rgba(37,99,235,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Clock size={22} color="var(--accent)" />
          </div>
          <div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              My Hours This Week
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 2 }}>
              <span style={{ fontSize: 28, fontWeight: 900, color: 'var(--accent)', lineHeight: 1 }}>{myWeekHours}h</span>
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                across {myWeekLogs.length} entr{myWeekLogs.length !== 1 ? 'ies' : 'y'}, {myTotalHours}h total
              </span>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {myWeekLogs.length > 0 && (
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setSelectedMember(members.find(m => m.userId === user?.id) || { userId: user?.id, name: user?.name, team: user?.team, role: user?.role })}
            >
              <Users size={14} /> My Activity
            </button>
          )}
          <button className="btn btn-primary" onClick={() => navigate('/log')}>
            <Clock size={15} /> Log My Hours
          </button>
        </div>
      </div>

      <div className="board-brief">
        <div className="board-summary">
          <div className="board-eyebrow">Board Brief</div>
          <h2>Working hours are ready for board review</h2>
          <p>
            {monthHours} hours were logged in the last 30 days across {activeContributors} active contributor{activeContributors !== 1 ? 's' : ''}.
            {attentionMembers.length
              ? ` ${attentionMembers.length} member${attentionMembers.length !== 1 ? 's need' : ' needs'} follow up based on recent activity.`
              : ' Every tracked member has recent activity.'}
          </p>
          <div className="board-summary-actions">
            <button className="btn btn-primary btn-sm" onClick={() => setTab('feed')}>
              <Activity size={14} /> Review Feed
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => setTab('members')}>
              <Users size={14} /> Review Members
            </button>
          </div>
        </div>

        {[
          {
            icon: <TrendingUp size={18} />,
            label: 'Last 7 days',
            value: `${recentHours}h`,
            note: `${recentLogs.length} entr${recentLogs.length !== 1 ? 'ies' : 'y'}`,
            color: 'var(--accent)',
          },
          {
            icon: <ShieldCheck size={18} />,
            label: 'Evidence quality',
            value: `${verificationRate}%`,
            note: 'verified logs',
            color: '#bfdbfe',
          },
          {
            icon: <BarChart3 size={18} />,
            label: 'Top team',
            value: topTeam?.hours ? `${topTeam.hours}h` : '0h',
            note: topTeam?.team || 'No data yet',
            color: TEAM_META[topTeam?.team]?.color || '#93c5fd',
          },
          {
            icon: <AlertTriangle size={18} />,
            label: 'Attention',
            value: attentionMembers.length,
            note: 'needs review',
            color: attentionMembers.length ? '#93c5fd' : '#bfdbfe',
          },
        ].map(card => (
          <div className="board-metric" key={card.label}>
            <div className="board-metric-icon" style={{ color: card.color }}>{card.icon}</div>
            <div className="board-metric-label">{card.label}</div>
            <div className="board-metric-value" style={{ color: card.color }}>{card.value}</div>
            <div className="board-metric-note">{card.note}</div>
          </div>
        ))}
      </div>

      {/* Global stats */}
      <div className="stats-row" style={{ marginBottom: 24 }}>
        {[
          { icon: <Clock size={22} color="var(--accent)" />, bg: 'rgba(37,99,235,0.15)', value: `${stats.total}h`, label: 'Total Hours', color: 'var(--accent)' },
          { icon: <Users size={22} color="#93c5fd" />, bg: 'rgba(59,130,246,0.14)', value: activeContributors, label: 'Active Contributors', color: '#93c5fd' },
          { icon: <Activity size={22} color="#bfdbfe" />, bg: 'rgba(96,165,250,0.12)', value: stats.count, label: 'Total Entries', color: '#bfdbfe' },
          { icon: <BarChart3 size={22} color="#dbeafe" />, bg: 'rgba(147,197,253,0.10)', value: `${avgHoursPerContributor}h`, label: 'Avg Contributor', color: '#dbeafe' },
          { icon: <FileCheck size={22} color="#60a5fa" />, bg: 'rgba(37,99,235,0.15)', value: `${verificationRate}%`, label: 'Verified Logs', color: '#60a5fa' },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div className="stat-icon" style={{ background: s.bg }}>{s.icon}</div>
            <div>
              <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="tabs">
        {[
          { key: 'overview',  label: 'Team Breakdown' },
          { key: 'members',   label: `Members (${members.length})` },
          { key: 'feed',      label: 'Activity Feed' },
          { key: 'ranking', label: 'Hours Ranking' },
        ].map(t => (
          <button key={t.key} className={`tab ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Team Breakdown tab */}
      {tab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px,1fr))', gap: 14 }}>
          {TEAM_OPTIONS.slice(1).map(team => {
            const meta = TEAM_META[team] || { color: '#93c5fd', bg: 'rgba(59,130,246,0.12)' };
            const hours = stats.byTeam[team] || 0;
            const pct = stats.total > 0 ? Math.round((hours / stats.total) * 100) : 0;
            const teamMembers = members.filter(m => m.team === team);
            const teamLogs = allLogs.filter(l => l.team === team);
            const verRate = teamLogs.length > 0
              ? Math.round(teamLogs.filter(isLogVerified).length / teamLogs.length * 100)
              : 0;
            return (
              <div key={team} className="card" style={{ borderLeft: `3px solid ${meta.color}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: meta.color }}>{team}</span>
                  <span style={{ fontSize: 26, fontWeight: 900, color: meta.color }}>{hours}h</span>
                </div>
                <div className="progress-bar" style={{ marginBottom: 8 }}>
                  <div className="progress-fill" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${meta.color}66, ${meta.color})` }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)' }}>
                  <span>{pct}% of total</span>
                  <span>{teamMembers.length} member{teamMembers.length !== 1 ? 's' : ''}</span>
                </div>
                <hr className="divider" style={{ margin: '12px 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ color: 'var(--text-muted)' }}>{teamLogs.length} entries</span>
                  <span style={{ color: verRate >= 50 ? 'var(--success)' : 'var(--text-muted)', fontWeight: 600 }}>
                    <FileCheck size={11} style={{ display: 'inline', marginRight: 3 }} />{verRate}% verified
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Members tab */}
      {tab === 'members' && (
        <>
          <div className="filter-bar">
            <select className="form-select" value={teamFilter} onChange={e => setTeamFilter(e.target.value)} style={{ maxWidth: 240 }}>
              {TEAM_OPTIONS.map(t => <option key={t}>{t}</option>)}
            </select>
            {teamFilter !== 'All Teams' && (
              <button className="btn btn-ghost btn-sm" onClick={() => setTeamFilter('All Teams')}>Clear</button>
            )}
            <span style={{ fontSize: 13, color: 'var(--text-muted)', marginLeft: 'auto' }}>
              {members.filter(m => teamFilter === 'All Teams' || m.team === teamFilter).length} members
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px,1fr))', gap: 16 }}>
            {members
              .filter(m => teamFilter === 'All Teams' || m.team === teamFilter)
              .map(m => (
                <MemberCard key={m.userId} member={m} logs={allLogs} onClick={() => setSelectedMember(m)} />
              ))}
          </div>
          {members.filter(m => teamFilter === 'All Teams' || m.team === teamFilter).length === 0 && (
            <div className="empty-state"><Users size={48} /><h3>No members found</h3></div>
          )}
        </>
      )}

      {/* Activity Feed tab */}
      {tab === 'feed' && (
        <>
          <div className="filter-bar">
            <div style={{ position: 'relative', flex: 1, minWidth: 180, maxWidth: 280 }}>
              <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input className="form-input" placeholder="Search by name or note..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 34 }} />
            </div>
            <select className="form-select" value={teamFilter} onChange={e => setTeamFilter(e.target.value)} style={{ maxWidth: 240 }}>
              {TEAM_OPTIONS.map(t => <option key={t}>{t}</option>)}
            </select>
            {(teamFilter !== 'All Teams' || search) && (
              <button className="btn btn-ghost btn-sm" onClick={() => { setTeamFilter('All Teams'); setSearch(''); }}>Clear</button>
            )}
            <span style={{ fontSize: 13, color: 'var(--text-muted)', marginLeft: 'auto' }}>{filteredLogs.length} entries</span>
          </div>
          {filteredLogs.length === 0 ? (
            <div className="empty-state"><Clock size={48} /><h3>No entries found</h3><p>Adjust your filters.</p></div>
          ) : (
            <div className="logs-list">
              {filteredLogs.map(log => (
                <div key={log.id}>
                  <LogCard log={log} showUser />
                  <div style={{ height: 4 }} />
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ fontSize: 12 }}
                      onClick={() => setSelectedMember(members.find(m => m.userId === log.userId))}
                    >
                      <Users size={12} /> View Profile
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Hours ranking tab */}
      {tab === 'ranking' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {members.length === 0 ? (
            <div className="empty-state"><Users size={48} /><h3>No contributors yet</h3></div>
          ) : members.map((m, i) => {
            const meta = TEAM_META[m.team] || { color: '#93c5fd' };
            const pct = (m.hours / maxHours) * 100;
            const memberLogs = allLogs.filter(l => l.userId === m.userId);
            const verRate = memberLogs.length > 0
              ? Math.round(memberLogs.filter(isLogVerified).length / memberLogs.length * 100)
              : 0;
            const rankColor = i < 3 ? '#bfdbfe' : 'var(--text-muted)';
            return (
              <div
                key={m.userId}
                className="card card-sm"
                style={{ display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', transition: 'all 0.2s' }}
                onClick={() => setSelectedMember(m)}
                onMouseEnter={e => { e.currentTarget.style.borderColor = meta.color + '55'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; }}
              >
                <div style={{ fontSize: 16, fontWeight: 800, color: rankColor, width: 28, textAlign: 'center', flexShrink: 0 }}>
                  #{i + 1}
                </div>
                <div className="avatar" style={{ background: `linear-gradient(135deg, ${meta.color}88, ${meta.color}33)`, color: meta.color }}>
                  {getInitials(m.name)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 700, fontSize: 15 }}>{m.name}</span>
                      <span style={{ fontSize: 12, color: meta.color }}>{m.team}</span>
                      {m.role === 'executive' && <span className="badge badge-exec" style={{ fontSize: 10 }}>Exec Board</span>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{m.entries} entries</span>
                      <span style={{ fontSize: 12, color: verRate >= 50 ? 'var(--success)' : 'var(--text-muted)' }}>
                        <FileCheck size={11} style={{ display: 'inline', marginRight: 2 }} />{verRate}%
                      </span>
                      <span style={{ fontWeight: 800, fontSize: 20, color: meta.color }}>{m.hours}h</span>
                    </div>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${meta.color}55, ${meta.color})` }} />
                  </div>
                </div>
                <ChevronRight size={16} color="var(--text-muted)" style={{ flexShrink: 0 }} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
