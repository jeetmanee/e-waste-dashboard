import { supabase, STORAGE_BUCKET, isSupabaseConfigured } from './supabase';
import { organisations as seedOrganisations, sources as seedSources, initialDeliverables } from '../data/project';
import type { ActivityRecord, DeliverableRecord, DocumentRecord, OrganisationRecord, SourceRecord, Visibility } from '../types';

function requireClient() {
  if (!supabase) throw new Error('The workspace database is not connected yet. Configure Supabase to enable uploads and editing.');
  return supabase;
}

export async function listDocuments(): Promise<DocumentRecord[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from('documents').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as DocumentRecord[];
}

export async function getDocument(id: string): Promise<DocumentRecord | null> {
  const client = requireClient();
  const { data, error } = await client.from('documents').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data as DocumentRecord | null;
}

export async function uploadDocument(input: {
  file: File; title: string; description: string; category: string; tags: string[];
  visibility: Visibility; workstream?: string; semester?: string; version?: string;
}, userId: string): Promise<DocumentRecord> {
  const client = requireClient();
  if (!userId) throw new Error('Sign in with an authorised project-member account to upload files.');
  const safeName = input.file.name.replace(/[^a-zA-Z0-9._-]+/g, '-').slice(-140);
  const path = `${userId}/${new Date().getFullYear()}/${crypto.randomUUID()}-${safeName}`;
  const { error: uploadError } = await client.storage.from(STORAGE_BUCKET).upload(path, input.file, {
    contentType: input.file.type || 'application/octet-stream', upsert: false,
  });
  if (uploadError) throw uploadError;

  const row = {
    title: input.title.trim() || input.file.name,
    file_name: input.file.name,
    description: input.description.trim() || null,
    storage_path: path,
    mime_type: input.file.type || 'application/octet-stream',
    file_size: input.file.size,
    category: input.category,
    tags: input.tags,
    visibility: input.visibility,
    workstream: input.workstream || null,
    semester: input.semester || null,
    version: input.version || '1.0',
    uploaded_by: userId,
  };
  const { data, error } = await client.from('documents').insert(row).select('*').single();
  if (error) {
    await client.storage.from(STORAGE_BUCKET).remove([path]);
    throw error;
  }
  return data as DocumentRecord;
}

export async function updateDocument(id: string, updates: Partial<Pick<DocumentRecord, 'title' | 'description' | 'category' | 'tags' | 'visibility' | 'workstream' | 'semester' | 'version'>>): Promise<void> {
  const client = requireClient();
  const { error } = await client.from('documents').update(updates).eq('id', id);
  if (error) throw error;
}

export async function deleteDocument(record: DocumentRecord): Promise<void> {
  const client = requireClient();
  const { error: storageError } = await client.storage.from(STORAGE_BUCKET).remove([record.storage_path]);
  if (storageError) throw storageError;
  const { error } = await client.from('documents').delete().eq('id', record.id);
  if (error) throw error;
}

export async function createDocumentUrl(record: DocumentRecord, download = false): Promise<string> {
  const client = requireClient();
  const { data, error } = await client.storage.from(STORAGE_BUCKET).createSignedUrl(
    record.storage_path, 60 * 15, download ? { download: record.file_name } : undefined,
  );
  if (error) throw error;
  return data.signedUrl;
}

export async function listActivities(): Promise<ActivityRecord[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from('activities').select('*').order('activity_date', { ascending: false });
  if (error) throw error;
  return (data ?? []) as ActivityRecord[];
}

export async function createActivity(input: {
  title: string; description: string; activity_type: string; category: string; activity_date: string; status: string; visibility: Visibility;
}): Promise<ActivityRecord> {
  const client = requireClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) throw new Error('Sign in with an authorised project-member account.');
  const { data, error } = await client.from('activities').insert({ ...input, created_by: user.id }).select('*').single();
  if (error) throw error;
  return data as ActivityRecord;
}

export async function updateActivity(id: string, updates: Partial<Pick<ActivityRecord, 'title' | 'description' | 'activity_type' | 'category' | 'activity_date' | 'status' | 'visibility'>>): Promise<void> {
  const client = requireClient();
  const { error } = await client.from('activities').update(updates).eq('id', id);
  if (error) throw error;
}

export async function deleteActivity(id: string): Promise<void> {
  const client = requireClient();
  const { error } = await client.from('activities').delete().eq('id', id);
  if (error) throw error;
}

export async function listSources(): Promise<SourceRecord[]> {
  if (!supabase) return seedSources;
  const { data, error } = await supabase.from('research_sources').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return ((data?.length ? data : seedSources) as SourceRecord[]);
}

export async function createSource(input: {
  title: string; publisher: string; author: string; source_type: string; url: string; publication_date: string;
  accessed_date: string; description: string; findings: string; category: string; verification_status: string; visibility: Visibility;
}): Promise<void> {
  const client = requireClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) throw new Error('Sign in with an authorised project-member account.');
  const { error } = await client.from('research_sources').insert({
    created_by: user.id, title: input.title, publisher: input.publisher || null, author: input.author || null, source_type: input.source_type,
    url: input.url || null, publication_date: input.publication_date || null, accessed_date: input.accessed_date || null,
    description: input.description || null, findings: input.findings || null, category: input.category || null,
    verification_status: input.verification_status, visibility: input.visibility,
  });
  if (error) throw error;
}

export async function listOrganisations(): Promise<OrganisationRecord[]> {
  if (!supabase) return seedOrganisations;
  const { data, error } = await supabase.from('organisations').select('*').order('name');
  if (error) throw error;
  return ((data?.length ? data : seedOrganisations) as OrganisationRecord[]);
}

export async function listDeliverables(): Promise<DeliverableRecord[]> {
  if (!supabase) return initialDeliverables.map((title, index) => ({
    id: `proposed-${index + 1}`, title, description: 'Proposed deliverable · No file attached.', status: 'Not started',
    category: null, document_id: null, version: null, visibility: 'public', updated_at: new Date(0).toISOString(),
  }));
  const { data, error } = await supabase.from('deliverables').select('*').order('updated_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as DeliverableRecord[];
}

export async function updateDeliverable(id: string, updates: Partial<Pick<DeliverableRecord, 'title' | 'description' | 'status' | 'category' | 'document_id' | 'version' | 'visibility'>>): Promise<void> {
  const client = requireClient();
  const { error } = await client.from('deliverables').update(updates).eq('id', id);
  if (error) throw error;
}

export async function listProjectNotes(category: string): Promise<Array<{ id: string; body: string; created_at: string }>> {
  if (!supabase) return [];
  let query = supabase.from('project_notes').select('id,body,created_at').order('created_at', { ascending: false });
  if (category) query = query.eq('category', category);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Array<{ id: string; body: string; created_at: string }>;
}

export interface ProjectSettingsRecord {
  id: number; project_title: string; semester: string | null; academic_year: string | null; project_status: string | null;
  about_text: string | null; owner_name: string | null; owner_programme: string | null; owner_department: string | null;
  institution: string | null; public_contact: string | null; updated_at: string;
}

export async function getProjectSettings(): Promise<ProjectSettingsRecord | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.from('project_settings').select('*').eq('id', 1).maybeSingle();
  if (error) throw error;
  return data as ProjectSettingsRecord | null;
}

export async function saveProjectSettings(input: Partial<ProjectSettingsRecord>): Promise<void> {
  const client = requireClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) throw new Error('Sign in with an authorised project-member account.');
  const { error } = await client.from('project_settings').upsert({ id: 1, ...input, updated_by: user.id }, { onConflict: 'id' });
  if (error) throw error;
}

export function fileTypeLabel(mime: string, filename: string) {
  const ext = filename.split('.').pop()?.toUpperCase() || '';
  if (mime === 'application/pdf' || ext === 'PDF') return 'PDF';
  if (mime.startsWith('image/')) return 'Image';
  if (mime.includes('spreadsheet') || ['XLS', 'XLSX', 'CSV'].includes(ext)) return ext;
  if (['DOC', 'DOCX'].includes(ext)) return ext;
  if (['PPT', 'PPTX'].includes(ext)) return ext;
  return ext || 'File';
}

export function canPreviewFile(record: DocumentRecord) {
  const type = fileTypeLabel(record.mime_type, record.file_name);
  return type === 'PDF' || type === 'Image' || type === 'CSV' || type === 'XLS' || type === 'XLSX';
}

const RECENT_FILES_KEY = 'nagaland-ewaste:recent-files';
const PINNED_FILES_KEY = 'nagaland-ewaste:pinned-files';

export function getRecentFileIds(): string[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(window.localStorage.getItem(RECENT_FILES_KEY) || '[]') as string[]; } catch { return []; }
}

export function rememberFileOpened(id: string) {
  if (typeof window === 'undefined') return;
  const next = [id, ...getRecentFileIds().filter(value => value !== id)].slice(0, 100);
  window.localStorage.setItem(RECENT_FILES_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event('file-preferences-changed'));
}

export function getPinnedFileIds(): string[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(window.localStorage.getItem(PINNED_FILES_KEY) || '[]') as string[]; } catch { return []; }
}

export function togglePinnedFile(id: string) {
  if (typeof window === 'undefined') return;
  const current = getPinnedFileIds();
  const next = current.includes(id) ? current.filter(value => value !== id) : [id, ...current];
  window.localStorage.setItem(PINNED_FILES_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event('file-preferences-changed'));
}

export function isFilePinned(id: string) { return getPinnedFileIds().includes(id); }

export function isLiveDataEnabled() { return isSupabaseConfigured; }
