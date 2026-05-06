import { useRef, useState } from 'react';
import { Upload, X, Image, Film, File } from 'lucide-react';

function fileToDataURL(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.readAsDataURL(file);
  });
}

function FileIcon({ type }) {
  if (type?.startsWith('image')) return <Image size={14} />;
  if (type?.startsWith('video')) return <Film size={14} />;
  return <File size={14} />;
}

export default function MediaUpload({ value, onChange }) {
  const inputRef = useRef();
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');

  const processFiles = async (files) => {
    const results = [];
    for (const file of Array.from(files)) {
      if (file.size > 50 * 1024 * 1024) {
        setError(`${file.name} is larger than 50 MB.`);
        continue;
      }

      const url = await fileToDataURL(file);
      results.push({ name: file.name, type: file.type, url, size: file.size, file });
    }

    if (results.length) {
      setError('');
      onChange([...value, ...results]);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    processFiles(e.dataTransfer.files);
  };

  const remove = (i) => onChange(value.filter((_, idx) => idx !== i));

  const formatSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  };

  return (
    <div>
      <div
        className={`upload-zone ${dragging ? 'drag-over' : ''}`}
        onClick={() => inputRef.current.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
      >
        <Upload size={24} style={{ color: 'var(--text-muted)', margin: '0 auto' }} />
        <p style={{ marginTop: 8, color: 'var(--text-secondary)', fontSize: 14, fontWeight: 500 }}>
          Drop files here or <span style={{ color: 'var(--accent)', fontWeight: 600 }}>browse</span>
        </p>
        <p>Photos, videos, PDFs. Max 50 MB each.</p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*,video/*,application/pdf,.pdf"
          style={{ display: 'none' }}
          onChange={e => processFiles(e.target.files)}
        />
      </div>

      {error && <div className="form-error" style={{ marginTop: 8 }}>{error}</div>}

      {value.length > 0 && (
        <div className="upload-preview" style={{ marginTop: 12, flexDirection: 'column', gap: 6 }}>
          {value.map((f, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: 'var(--bg-input)', border: '1px solid var(--border)',
              borderRadius: 8, padding: '8px 12px',
            }}>
              {f.type?.startsWith('image') ? (
                <img src={f.url} alt={f.name} style={{ width: 36, height: 36, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }} />
              ) : (
                <div style={{
                  width: 36, height: 36, borderRadius: 6, background: 'rgba(37,99,235,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)', flexShrink: 0,
                }}>
                  <FileIcon type={f.type} />
                </div>
              )}
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{formatSize(f.size)}</div>
              </div>
              <button
                type="button"
                onClick={() => remove(i)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', padding: 4, cursor: 'pointer', flexShrink: 0 }}
              >
                <X size={15} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
