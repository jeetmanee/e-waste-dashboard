import { useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { X } from 'lucide-react';
import { categories } from '../data/project';
import { createActivity, createSource, updateActivity, deleteActivity } from '../lib/api';
import type { ActivityRecord } from '../types';
import type { Visibility } from '../types';
import { Button } from './Primitives';

export function AddActivityModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ title: '', description: '', activity_type: 'Research', category: 'generation', activity_date: new Date().toISOString().slice(0, 10), status: 'Completed', visibility: 'private' as Visibility });
  const [error, setError] = useState(''); const [saving, setSaving] = useState(false);
  const change = (key: string, value: string) => setForm(current => ({ ...current, [key]: value }));
  const submit = async (e: FormEvent) => { e.preventDefault(); setSaving(true); setError(''); try { await createActivity(form); onSaved(); onClose(); } catch (err) { setError(err instanceof Error ? err.message : 'Could not save activity.'); } finally { setSaving(false); } };
  return <Modal title="Record an activity" eyebrow="Activity log" onClose={onClose}>
    <form className="form-grid" onSubmit={submit}>
      <label className="field-full">Activity title<input required value={form.title} onChange={e => change('title', e.target.value)} placeholder="What did you work on?"/></label>
      <label>Date<input type="date" required value={form.activity_date} onChange={e => change('activity_date', e.target.value)}/></label>
      <label>Activity type<select value={form.activity_type} onChange={e => change('activity_type', e.target.value)}>{['Research','Meeting','Fieldwork','Analysis','Documentation','Presentation','Review','Outreach'].map(x => <option key={x}>{x}</option>)}</select></label>
      <label>Related category<select value={form.category} onChange={e => change('category', e.target.value)}>{categories.map(x => <option key={x.slug} value={x.slug}>{x.title}</option>)}</select></label>
      <label>Status<select value={form.status} onChange={e => change('status', e.target.value)}>{['Planned','In progress','Completed','Under review'].map(x => <option key={x}>{x}</option>)}</select></label>
      <label className="field-full">Description<textarea rows={4} value={form.description} onChange={e => change('description', e.target.value)} placeholder="Record what happened, what was learned and any limitations."/></label>
      <label className="field-full">Visibility<select value={form.visibility} onChange={e => change('visibility', e.target.value as Visibility)}><option value="private">Private · project members only</option><option value="public">Public · visible to everyone</option></select></label>
      {error && <p className="field-error field-full">{error}</p>}
      <div className="modal-footer field-full"><Button variant="secondary" type="button" onClick={onClose}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save activity'}</Button></div>
    </form>
  </Modal>;
}

export function EditActivityModal({ item, onClose, onSaved }: { item: ActivityRecord; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ title: item.title, description: item.description || '', activity_type: item.activity_type, category: item.category || 'generation', activity_date: item.activity_date, status: item.status, visibility: item.visibility });
  const [error, setError] = useState(''); const [saving, setSaving] = useState(false);
  const change = (key: string, value: string) => setForm(current => ({ ...current, [key]: value }));
  const submit = async (e: FormEvent) => { e.preventDefault(); setSaving(true); setError(''); try { await updateActivity(item.id, form); onSaved(); onClose(); } catch (err) { setError(err instanceof Error ? err.message : 'Could not update activity.'); } finally { setSaving(false); } };
  const remove = async () => { if (!window.confirm(`Delete the activity “${item.title}”?`)) return; setSaving(true); try { await deleteActivity(item.id); onSaved(); onClose(); } catch (err) { setError(err instanceof Error ? err.message : 'Could not delete activity.'); } finally { setSaving(false); } };
  return <Modal title="Edit activity" eyebrow="Activity log" onClose={onClose}>
    <form className="form-grid" onSubmit={submit}>
      <label className="field-full">Activity title<input required value={form.title} onChange={e => change('title', e.target.value)}/></label>
      <label>Date<input type="date" required value={form.activity_date} onChange={e => change('activity_date', e.target.value)}/></label>
      <label>Activity type<select value={form.activity_type} onChange={e => change('activity_type', e.target.value)}>{['Research','Meeting','Fieldwork','Analysis','Documentation','Presentation','Review','Outreach'].map(x => <option key={x}>{x}</option>)}</select></label>
      <label>Related category<select value={form.category} onChange={e => change('category', e.target.value)}>{categories.map(x => <option key={x.slug} value={x.slug}>{x.title}</option>)}</select></label>
      <label>Status<select value={form.status} onChange={e => change('status', e.target.value)}>{['Planned','In progress','Completed','Under review'].map(x => <option key={x}>{x}</option>)}</select></label>
      <label className="field-full">Description<textarea rows={4} value={form.description} onChange={e => change('description', e.target.value)}/></label>
      <label className="field-full">Visibility<select value={form.visibility} onChange={e => change('visibility', e.target.value as 'public'|'private')}><option value="private">Private · project members only</option><option value="public">Public · visible to everyone</option></select></label>
      {error && <p className="field-error field-full">{error}</p>}
      <div className="modal-footer field-full"><Button variant="danger" type="button" onClick={() => void remove()} disabled={saving}>Delete activity</Button><div><Button variant="secondary" type="button" onClick={onClose}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</Button></div></div>
    </form>
  </Modal>;
}

export function AddSourceModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ title: '', publisher: '', author: '', source_type: 'Government publication', url: '', publication_date: '', accessed_date: new Date().toISOString().slice(0, 10), description: '', findings: '', category: 'generation', verification_status: 'Pending verification', visibility: 'private' as Visibility });
  const [error, setError] = useState(''); const [saving, setSaving] = useState(false);
  const change = (key: string, value: string) => setForm(current => ({ ...current, [key]: value }));
  const submit = async (e: FormEvent) => { e.preventDefault(); setSaving(true); setError(''); try { await createSource(form); onSaved(); onClose(); } catch (err) { setError(err instanceof Error ? err.message : 'Could not save source.'); } finally { setSaving(false); } };
  return <Modal title="Add a research source" eyebrow="Research & sources" onClose={onClose}>
    <form className="form-grid" onSubmit={submit}>
      <label className="field-full">Exact source title<input required value={form.title} onChange={e => change('title', e.target.value)} placeholder="Title as published"/></label>
      <label>Publisher / organisation<input value={form.publisher} onChange={e => change('publisher', e.target.value)}/></label>
      <label>Author<input value={form.author} onChange={e => change('author', e.target.value)}/></label>
      <label>Source type<select value={form.source_type} onChange={e => change('source_type', e.target.value)}>{['Government publication','Government report','Academic paper','Industry directory','News article','Company website','Other'].map(x => <option key={x}>{x}</option>)}</select></label>
      <label>Related category<select value={form.category} onChange={e => change('category', e.target.value)}>{categories.map(x => <option key={x.slug} value={x.slug}>{x.title}</option>)}</select></label>
      <label className="field-full">Original URL<input type="url" value={form.url} onChange={e => change('url', e.target.value)} placeholder="https://"/></label>
      <label>Publication date<input value={form.publication_date} onChange={e => change('publication_date', e.target.value)} placeholder="Not supplied"/></label>
      <label>Date accessed<input type="date" value={form.accessed_date} onChange={e => change('accessed_date', e.target.value)}/></label>
      <label className="field-full">Description<textarea rows={2} value={form.description} onChange={e => change('description', e.target.value)}/></label>
      <label className="field-full">Findings / source excerpt<textarea rows={3} value={form.findings} onChange={e => change('findings', e.target.value)}/></label>
      <label>Verification<select value={form.verification_status} onChange={e => change('verification_status', e.target.value)}><option>Pending verification</option><option>Not verified</option><option>Verified</option></select></label>
      <label>Visibility<select value={form.visibility} onChange={e => change('visibility', e.target.value as Visibility)}><option value="private">Private</option><option value="public">Public</option></select></label>
      {error && <p className="field-error field-full">{error}</p>}
      <div className="modal-footer field-full"><Button variant="secondary" type="button" onClick={onClose}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save source'}</Button></div>
    </form>
  </Modal>;
}

function Modal({ title, eyebrow, children, onClose }: { title: string; eyebrow: string; children: ReactNode; onClose: () => void }) {
  return <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}><section className="modal" role="dialog" aria-modal="true"><div className="modal-heading"><div><p className="eyebrow">{eyebrow}</p><h2>{title}</h2></div><button className="icon-button" onClick={onClose}><X size={18}/></button></div>{children}</section></div>;
}
