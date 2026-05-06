import { useState } from 'react';
import { Calendar, Clock, FileText, Image, Film, File, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { TEAM_META } from '../lib/trackerConfig';

function MediaIcon({ type }) {
  if (type?.startsWith('image')) return <Image size={13} />;
  if (type?.startsWith('video')) return <Film size={13} />;
  return <File size={13} />;
}

export default function LogCard({ log, showUser = false }) {
  const { user } = useAuth();
  const { deleteLog } = useData();
  const [lightbox, setLightbox] = useState(null);

  const meta = TEAM_META[log.team] || { color: '#93c5fd', badge: 'badge-blue' };
  const initials = log.userName?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  const formatDate = (d) => new Date(d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  const formatTime = (d) => new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  const images = log.mediaFiles?.filter(f => f.type?.startsWith('image')) || [];
  const others = log.mediaFiles?.filter(f => !f.type?.startsWith('image')) || [];

  const canDelete = user?.id === log.userId || user?.role === 'executive';

  return (
    <>
      <div className="log-card">
        <div className="log-card-header">
          {showUser && (
            <div className="avatar" style={{ background: `linear-gradient(135deg, ${meta.color}99, ${meta.color}44)`, color: meta.color }}>
              {initials}
            </div>
          )}
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              {showUser && <span style={{ fontWeight: 700, fontSize: 15 }}>{log.userName}</span>}
              <span className={`badge ${meta.badge}`}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: meta.color, display: 'inline-block' }} />
                {log.team}
              </span>
              <span style={{
                background: 'rgba(37,99,235,0.15)', color: '#60a5fa',
                borderRadius: 20, padding: '2px 10px', fontSize: 13, fontWeight: 800, border: '1px solid rgba(37,99,235,0.3)'
              }}>
                {log.hours}h
              </span>
            </div>
          </div>
          {canDelete && (
            <button
              className="btn btn-danger btn-sm"
              style={{ padding: '5px 8px' }}
              onClick={() => deleteLog(log.id)}
              title="Delete entry"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>

        <p className="log-card-notes">
          <FileText size={13} style={{ display: 'inline', marginRight: 5, opacity: 0.6, verticalAlign: 'middle' }} />
          {log.notes}
        </p>

        {images.length > 0 && (
          <div className="media-grid">
            {images.map((f, i) => (
              <img
                key={i}
                src={f.url}
                alt={f.name}
                className="media-thumb"
                onClick={() => setLightbox(f.url)}
              />
            ))}
          </div>
        )}

        {others.length > 0 && (
          <div className="media-grid" style={{ marginTop: images.length ? 6 : 10 }}>
            {others.map((f, i) => (
              <a key={i} href={f.url} target="_blank" rel="noreferrer" className="media-file-chip">
                <MediaIcon type={f.type} />
                {f.name}
              </a>
            ))}
          </div>
        )}

        <div className="log-card-meta">
          <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Calendar size={11} /> {formatDate(log.date)}
          </span>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Clock size={11} /> Submitted {formatTime(log.submittedAt)}
          </span>
        </div>
      </div>

      {lightbox && (
        <div className="lightbox-overlay" onClick={() => setLightbox(null)}>
          <img src={lightbox} className="lightbox-img" onClick={e => e.stopPropagation()} alt="Preview" />
        </div>
      )}
    </>
  );
}
