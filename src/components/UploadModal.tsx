import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { FileUp, Plus, Trash2, UploadCloud, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { categories } from '../data/project';
import { uploadDocument } from '../lib/api';
import type { Visibility } from '../types';
import { Button } from './Primitives';

type PendingFile = { key: string; file: File; title: string; description: string; category: string; tags: string; visibility: Visibility; status: 'queued' | 'uploading' | 'done' | 'failed'; error?: string };

export function UploadModal({ onClose, onUploaded, initialTitle, presetCategory }: { onClose: () => void; onUploaded: () => void; initialTitle?: string, presetCategory?: string; }) {
  const { user, isMember, configured } = useAuth();
  const [files, setFiles] = useState<PendingFile[]>([]);
  const [dragging, setDragging] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const completed = useMemo(() => files.filter(f => f.status === 'done').length, [files]);

  const addFiles = (picked: FileList | File[]) => {
    const incoming = Array.from(picked).map(file => ({
      key: crypto.randomUUID(), file, title: initialTitle?.trim() || file.name.replace(/\.[^.]+$/, ''), description: '', category: presetCategory || 'generation', tags: '', visibility: 'private' as Visibility, status: 'queued' as const,
    }));
    setFiles(current => [...current, ...incoming]);
    setMessage('');
  };

  const patch = (key: string, updates: Partial<PendingFile>) => setFiles(current => current.map(item => item.key === key ? { ...item, ...updates } : item));

  const startUpload = async () => {
    if (!isMember || !user || !configured) { setMessage('An authorised project-member account and a connected Supabase project are required.'); return; }
    if (!files.length) { setMessage('Choose at least one file to upload.'); return; }
    setSaving(true); setMessage('');
    let hasError = false;
    for (const item of files) {
      if (item.status === 'done') continue;
      patch(item.key, { status: 'uploading', error: undefined });
      try {
        await uploadDocument({
          file: item.file, title: item.title, description: item.description, category: item.category,
          tags: item.tags.split(',').map(x => x.trim()).filter(Boolean), visibility: item.visibility,
        }, user.id);
        patch(item.key, { status: 'done' });
      } catch (error) {
        hasError = true;
        patch(item.key, { status: 'failed', error: error instanceof Error ? error.message : 'Upload failed.' });
      }
    }
    setSaving(false);
    if (!hasError) { onUploaded(); setMessage('All files uploaded successfully.'); }
    else setMessage('Some files could not be uploaded. Failed files are retained so you can retry.');
  };

  return <div className="modal-backdrop" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget && !saving) onClose(); }}>
    <section className="modal upload-modal" role="dialog" aria-modal="true" aria-labelledby="upload-title">
      <div className="modal-heading"><div><p className="eyebrow">Files & resources</p><h2 id="upload-title">Add files to the archive</h2><p>Upload original documents and keep them connected to the project.</p></div><button className="icon-button" onClick={onClose} disabled={saving}><X size={18} /></button></div>
      {!configured && <div className="notice notice-warning"><FileUp size={16} /><div>Supabase is not connected. The upload interface is ready, but persistent uploads activate after environment setup.</div></div>}
      {!isMember && <div className="notice notice-info"><FileUp size={16} /><div>Only authorised project members can upload. Sign in with an invited account to continue.</div></div>}
      <label className={`dropzone ${dragging ? 'dragging' : ''}`} onDragOver={e => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={e => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }}>
        <UploadCloud size={26} /><strong>Drag and drop files here</strong><span>Or choose files from your device · PDF, DOCX, PPTX, XLSX, CSV and images</span>
        <input type="file" multiple onChange={e => { if (e.target.files) addFiles(e.target.files); e.currentTarget.value = ''; }} accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.csv,.png,.jpg,.jpeg,.webp,.zip" />
        <span className="button button-secondary button-sm">Choose files</span>
      </label>
      {files.length > 0 && <div className="selected-files"><div className="selected-heading"><strong>{files.length} selected file{files.length === 1 ? '' : 's'}</strong><button className="text-button" onClick={() => setFiles([])} disabled={saving}>Clear all</button></div>
        {files.map(item => <div className="pending-file" key={item.key}>
          <div className="pending-file-top"><div className="file-type-icon">{item.file.name.split('.').pop()?.toUpperCase().slice(0, 4)}</div><div className="pending-file-info"><strong>{item.file.name}</strong><span>{formatBytes(item.file.size)} · {item.status === 'queued' ? 'Ready to upload' : item.status === 'uploading' ? 'Uploading…' : item.status === 'done' ? 'Uploaded' : 'Upload failed'}</span></div>{item.status !== 'uploading' && item.status !== 'done' && <button className="icon-button" aria-label="Remove file" onClick={() => setFiles(current => current.filter(x => x.key !== item.key))}><Trash2 size={15} /></button>}</div>
          {item.status !== 'done' && <div className="pending-file-fields">
            <label>Title<input value={item.title} onChange={e => patch(item.key, { title: e.target.value })} /></label>
            <label>Category<select value={item.category} onChange={e => patch(item.key, { category: e.target.value })}>{categories.map(c => <option key={c.slug} value={c.slug}>{c.title}</option>)}</select></label>
            <label className="field-full">Description<textarea rows={2} value={item.description} onChange={e => patch(item.key, { description: e.target.value })} placeholder="What is this file about?" /></label>
            <label className="field-full">Tags<input value={item.tags} onChange={e => patch(item.key, { tags: e.target.value })} placeholder="official source, collection, fieldwork" /></label>
            <label>Visibility<select value={item.visibility} onChange={e => patch(item.key, { visibility: e.target.value as Visibility })}><option value="private">Private · project members only</option><option value="public">Public · visible to everyone</option></select></label>
          </div>}
          {item.error && <p className="field-error">{item.error}</p>}
        </div>)}
      </div>}
      {message && <p className={message.toLowerCase().includes('success') ? 'success-message' : 'field-error'}>{message}</p>}
      <div className="modal-footer"><span className="muted small">{completed} of {files.length} uploaded · New uploads default to private</span><div><Button variant="secondary" onClick={onClose} disabled={saving}>Close</Button><Button onClick={() => void startUpload()} disabled={saving || !files.some(f => f.status !== 'done')}>{saving ? 'Uploading…' : 'Upload originals'}</Button></div></div>
    </section>
  </div>;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
