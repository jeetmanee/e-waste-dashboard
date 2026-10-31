import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import {
  Activity, ArrowDownToLine, ArrowRight, ArrowUpRight, BookOpen, Building2, Check, ChevronDown,
  ChevronRight, CircleAlert, Clock3, Download, ExternalLink, Eye, File, FileImage, FileSpreadsheet,
  FileText, FolderOpen, Grid2X2, Leaf, List, LockKeyhole, LogIn, LogOut, MoreHorizontal,
  Pin, Plus, Recycle, Search, Settings, ShieldCheck, SlidersHorizontal, Upload, Users, X,
} from 'lucide-react';
import { categories, categoryDetails, organisations as seedOrganisations, reportedQuantities, sources as seedSources } from '../data/project';
import { useAuth } from '../context/AuthContext';
import { UploadModal } from '../components/UploadModal';
import { AddActivityModal, AddSourceModal, EditActivityModal } from '../components/RecordModals';
import { Button, EmptyState, Notice, StatusTag } from '../components/Primitives';
import {
  canPreviewFile, createDocumentUrl, deleteDocument, fileTypeLabel, getProjectSettings, isFilePinned,
  listActivities, listDeliverables, listDocuments, listOrganisations, listSources, listProjectNotes,
  rememberFileOpened, saveProjectSettings, togglePinnedFile, updateDeliverable, updateDocument,
} from '../lib/api';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import type { ActivityRecord, DeliverableRecord, DocumentRecord, OrganisationRecord, SourceRecord } from '../types';
import type { ProjectSettingsRecord } from '../lib/api';
import { FilePreviewModal } from './FilePreviewPage';

const expectedSubmissions: Array<{ title: string; suggestedCategory: string | null; note?: string; folder?: boolean }> = [
  { title: 'IEEE Paper Submission Folder', suggestedCategory: null, note: 'Submission folder · contents not included in the project ZIP', folder: true },
  { title: 'Case Study Report Submission', suggestedCategory: null },
  { title: 'LEED Certificate Rating System of Green Building in India', suggestedCategory: 'environment' },
  { title: 'E waste Campaign Documents_Class Activity', suggestedCategory: 'awareness' },
  { title: 'Companies Following E waste Rules In India', suggestedCategory: 'compliance' },
  { title: 'E waste Recovery Process description_Suggest Changes', suggestedCategory: 'recycling' },
  { title: 'E waste_Comparison of Rules of Different Countries', suggestedCategory: 'compliance' },
  { title: 'Novel Ideas for E waste_PPT Submission for Pitch deck', suggestedCategory: null },
  { title: 'Carbon Foot Print Tacker data Upload', suggestedCategory: 'environment' },
  { title: 'State wise_ E Waste tracker_PPT', suggestedCategory: 'generation' },
  { title: 'E waste India Scenario_Comparison', suggestedCategory: 'generation' },
  { title: 'Assignment_ZERO', suggestedCategory: null },
  { title: 'Assignment 1_E Waste Tracker by excel', suggestedCategory: 'generation' },
];

const defaultProjectSettings: ProjectSettingsRecord = {
  id: 1,
  project_title: 'Nagaland E-Waste Management Tracker',
  semester: null,
  academic_year: null,
  project_status: 'In progress',
  about_text: 'An academic workspace for organising evidence, research and project submissions related to e-waste management in Nagaland.',
  owner_name: null,
  owner_programme: null,
  owner_department: null,
  institution: null,
  public_contact: null,
  updated_at: '',
};

type ToolTab = 'activities' | 'sources' | 'organisations' | 'deliverables' | 'settings';
type ViewMode = 'grid' | 'list';

function useLoad<T>(loader: () => Promise<T>, fallback: T) {
  const [data, setData] = useState<T>(fallback);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try { setData(await loader()); }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not load this section.'); }
    finally { setLoading(false); }
  }, [loader]);
  useEffect(() => { void refresh(); }, [refresh]);
  return { data, loading, error, refresh };
}

export function WorkspacePage() {
  const { user, isMember, isAdmin, signOut, configured } = useAuth();
  const docs = useLoad(listDocuments, [] as DocumentRecord[]);
  const sources = useLoad(listSources, seedSources as SourceRecord[]);
  const organisations = useLoad(listOrganisations, seedOrganisations as OrganisationRecord[]);
  const activities = useLoad(listActivities, [] as ActivityRecord[]);
  const deliverables = useLoad(listDeliverables, [] as DeliverableRecord[]);
  const settings = useLoad(getProjectSettings, null as ProjectSettingsRecord | null);

  const [activeSection, setActiveSection] = useState('home');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [fileType, setFileType] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadPreset, setUploadPreset] = useState<{ title?: string; category?: string } | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [editFile, setEditFile] = useState<DocumentRecord | null>(null);
  const [categoryDialog, setCategoryDialog] = useState<string | null>(null);
  const [toolsTab, setToolsTab] = useState<ToolTab | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  const slots = useMemo(() => expectedSubmissions.filter(slot => {
    const normalised = normalise(slot.title);
    return !docs.data.some(doc => normalise(doc.title) === normalised || normalise(doc.file_name.replace(/\.[^.]+$/, '')) === normalised);
  }), [docs.data]);

  const availableTypes = useMemo(() => Array.from(new Set(docs.data.map(doc => fileTypeLabel(doc.mime_type, doc.file_name)))).sort(), [docs.data]);
  const visibleDocuments = useMemo(() => docs.data.filter(doc => {
    const haystack = `${doc.title} ${doc.file_name} ${doc.description ?? ''} ${doc.tags.join(' ')}`.toLowerCase();
    return (!searchQuery || haystack.includes(searchQuery.toLowerCase())) &&
      (selectedCategory === 'all' || doc.category === selectedCategory) &&
      (fileType === 'all' || fileTypeLabel(doc.mime_type, doc.file_name) === fileType);
  }).sort((a, b) => sortBy === 'title'
    ? a.title.localeCompare(b.title)
    : sortBy === 'oldest'
      ? +new Date(a.created_at) - +new Date(b.created_at)
      : +new Date(b.created_at) - +new Date(a.created_at)), [docs.data, searchQuery, selectedCategory, fileType, sortBy]);
  const visibleSlots = useMemo(() => slots.filter(slot => {
    const categoryMatch = selectedCategory === 'all' || slot.suggestedCategory === selectedCategory;
    const textMatch = !searchQuery || slot.title.toLowerCase().includes(searchQuery.toLowerCase());
    return categoryMatch && textMatch && fileType === 'all';
  }), [slots, selectedCategory, searchQuery, fileType]);

  const jumpTo = (id: string) => {
    setActiveSection(id);
    window.history.replaceState(null, '', `#${id}`);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setProfileOpen(false);
  };

  useEffect(() => {
    const ids = ['home', 'repository', 'about'];
    const observer = new IntersectionObserver(entries => {
      const visible = entries.filter(entry => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible) setActiveSection(visible.target.id);
    }, { rootMargin: '-20% 0px -60% 0px', threshold: [0, .15, .35, .6] });
    ids.forEach(id => { const node = document.getElementById(id); if (node) observer.observe(node); });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const initialHash = window.location.hash.replace('#', '');
    if (['home', 'repository', 'about', 'categories'].includes(initialHash)) {
      window.setTimeout(() => document.getElementById(initialHash)?.scrollIntoView({ behavior: 'instant' as ScrollBehavior }), 60);
    }
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        jumpTo('repository');
        window.setTimeout(() => searchRef.current?.focus(), 280);
      }
      if (event.key === 'Escape') setProfileOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const openUpload = (preset?: { title?: string; category?: string }) => {
    setUploadPreset(preset ?? null);
    setUploadOpen(true);
    setProfileOpen(false);
  };

  const clearFilters = () => { setSelectedCategory('all'); setSearchQuery(''); setFileType('all'); setSortBy('newest'); };

  const selectCategory = (slug: string) => {
    setSelectedCategory(slug);
    setFileType('all');
    jumpTo('repository');
  };

  const downloadFile = async (file: DocumentRecord) => {
    setDownloadingId(file.id);
    setDownloadError('');
    try {
      const url = await createDocumentUrl(file, true);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = file.file_name;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
    } catch (err) {
      setDownloadError(err instanceof Error ? err.message : 'Download failed.');
    } finally { setDownloadingId(null); }
  };

  const startPreview = (file: DocumentRecord) => {
    rememberFileOpened(file.id);
    setPreviewId(file.id);
  };

  return <div className="ew-app">
    <header className="ew-header">
      <button className="ew-brand" onClick={() => jumpTo('home')} aria-label="Go to overview">
        <span className="ew-brand-mark"><Recycle size={19} /></span>
        <span><strong>NAGALAND E-WASTE</strong><small>PROJECT ARCHIVE</small></span>
      </button>
      <nav className="ew-nav" aria-label="Main navigation">
        {(['home', 'repository', 'about'] as const).map(id => <button key={id} onClick={() => jumpTo(id)} className={activeSection === id ? 'active' : ''}>{id === 'home' ? 'Overview' : id === 'repository' ? 'Repository' : 'About'}</button>)}
      </nav>
      <div className="ew-header-actions">
        <button className="ew-search-shortcut" onClick={() => { jumpTo('repository'); window.setTimeout(() => searchRef.current?.focus(), 280); }}><Search size={14} /><span>Search archive</span><kbd>⌘ K</kbd></button>
        {isMember ? <div className="ew-profile-wrap">
          <button className="ew-profile-trigger" onClick={() => setProfileOpen(value => !value)} aria-expanded={profileOpen}>
            <span className="ew-avatar">{user?.email?.slice(0, 1).toUpperCase() || 'M'}</span><span className="ew-profile-email">{user?.email?.split('@')[0] || 'Member'}</span><ChevronDown size={13} />
          </button>
          {profileOpen && <div className="ew-profile-menu">
            <div className="ew-menu-user"><strong>{user?.email}</strong><span>{isAdmin ? 'Administrator' : 'Authorised member'}</span></div>
            <button onClick={() => { setToolsTab('activities'); setProfileOpen(false); }}><Activity size={14} />Workspace tools</button>
            <button onClick={() => openUpload()}><Upload size={14} />Upload files</button>
            <button onClick={() => void signOut()}><LogOut size={14} />Sign out</button>
          </div>}
        </div> : <a className="ew-member-link" href="/login"><LogIn size={14} />Member access</a>}
      </div>
    </header>

    <main>
      <section id="home" className="ew-hero-section ew-anchor-section">
        <div className="ew-container">
          <div className="ew-hero">
            <div className="ew-hero-copy">
              <p className="ew-eyebrow"><span className="ew-live-dot" /> ACADEMIC PROJECT · NAGALAND</p>
              <h1>One place for every piece of <em>e-waste evidence.</em></h1>
              <p className="ew-hero-description">A considered workspace for research, submissions and project documentation on e-waste management in Nagaland — organised, searchable and ready to explore.</p>
              <div className="ew-hero-actions">
                <button className="ew-btn ew-btn-primary" onClick={() => jumpTo('repository')}>Explore repository <ArrowRight size={15} /></button>
                <button className="ew-btn ew-btn-secondary" onClick={() => jumpTo('categories')}>Browse categories <ChevronDown size={14} /></button>
              </div>
              <div className="ew-hero-footnote"><span className="ew-footnote-dot" /> PUBLIC VIEW · MEMBER-ONLY CONTRIBUTIONS</div>
            </div>
            <div className="ew-hero-visual" aria-hidden="true">
              <div className="ew-orbit ew-orbit-one" /><div className="ew-orbit ew-orbit-two" /><div className="ew-orbit ew-orbit-three" />
              <div className="ew-orbit-core"><Recycle size={35} /></div>
              <span className="ew-orbit-label ew-label-top">EVIDENCE / 07</span>
              <span className="ew-orbit-label ew-label-bottom">NAGALAND · INDIA</span>
              <span className="ew-orbit-node node-one" /><span className="ew-orbit-node node-two" /><span className="ew-orbit-node node-three" />
              <div className="ew-visual-caption"><span className="ew-caption-square" /> SOURCE-LED RESEARCH</div>
            </div>
          </div>

          <div className="ew-stat-strip">
            <div><strong>{docs.data.length.toString().padStart(2, '0')}</strong><span>DOCUMENTS ARCHIVED</span><small>Original files currently attached</small></div>
            <div><strong>13</strong><span>SUBMISSION RECORDS</span><small>Titles supplied · files pending</small></div>
            <div><strong>{organisations.data.length.toString().padStart(2, '0')}</strong><span>COLLECTION LEADS</span><small>Directory-listed connections</small></div>
            <div className="ew-stat-note"><span className="ew-star">✳</span><p>One organised space for the project’s research, reports and working submissions.</p></div>
          </div>
        </div>
      </section>

      <section id="categories" className="ew-section ew-container ew-anchor-section">
        <div className="ew-section-heading">
          <div><p className="ew-eyebrow">THE COLLECTION</p><h2>Browse by <em>category.</em></h2></div>
          <p>Seven connected workstreams. Select one to filter the archive and find relevant material.</p>
        </div>
        <div className="ew-category-grid">
          {categories.map(category => <article key={category.slug} className={`ew-category-card ${selectedCategory === category.slug ? 'is-selected' : ''}`}>
            <button className="ew-category-main" onClick={() => selectCategory(category.slug)} aria-label={`Browse ${category.title}`}>
              <span className="ew-category-top"><span>{category.number} / 07</span><ArrowUpRight size={15} /></span>
              <span className="ew-category-icon"><CategoryIcon slug={category.slug} /></span>
              <strong>{category.title}</strong>
              <small>{category.description}</small>
              <span className="ew-category-foot"><span>{category.status}</span><ChevronRight size={14} /></span>
            </button>
            <button className="ew-category-info" onClick={() => setCategoryDialog(category.slug)} aria-label={`Read about ${category.title}`}>Category overview <ArrowUpRight size={12} /></button>
          </article>)}
        </div>
        <div className="ew-quantities-band">
          <div className="ew-quantities-copy"><p className="ew-eyebrow">LATEST REPORTED VALUES</p><h3>Numbers need <em>context.</em></h3><p>These values are reproduced as reported. Their generation-versus-collection terminology remains unresolved.</p></div>
          {reportedQuantities.map(item => <div className="ew-quantity" key={item.financialYear}><span>{item.financialYear}</span><strong>{item.label}</strong><small>Reported quantity · pending reconciliation</small></div>)}
        </div>
      </section>

      <section id="repository" className="ew-section ew-repository-section ew-anchor-section">
        <div className="ew-container">
          <div className="ew-section-heading ew-repository-heading">
            <div><p className="ew-eyebrow">DOCUMENT LIBRARY</p><h2>Find the <em>right file.</em></h2></div>
            <div className="ew-count-block"><strong>{visibleDocuments.length + visibleSlots.length}</strong><span>ITEMS IN VIEW</span></div>
          </div>
          <div className="ew-repository-controls">
            <label className="ew-search-field"><Search size={16} /><input ref={searchRef} value={searchQuery} onChange={event => setSearchQuery(event.target.value)} placeholder="Search titles, filenames, tags..." aria-label="Search document archive" /><kbd>ENTER</kbd></label>
            <div className="ew-filter-controls">
              <label className="ew-select-wrap"><span className="sr-only">Category</span><select value={selectedCategory} onChange={event => setSelectedCategory(event.target.value)}><option value="all">All categories</option>{categories.map(item => <option key={item.slug} value={item.slug}>{item.title}</option>)}</select><ChevronDown size={12} /></label>
              <label className="ew-select-wrap"><span className="sr-only">File type</span><select value={fileType} onChange={event => setFileType(event.target.value)}><option value="all">All file types</option>{availableTypes.map(type => <option key={type}>{type}</option>)}</select><ChevronDown size={12} /></label>
              <label className="ew-select-wrap ew-sort-select"><span className="sr-only">Sort files</span><select value={sortBy} onChange={event => setSortBy(event.target.value)}><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="title">A–Z</option></select><ChevronDown size={12} /></label>
              <div className="ew-view-toggle" aria-label="Archive view"><button onClick={() => setViewMode('grid')} className={viewMode === 'grid' ? 'active' : ''} aria-label="Grid view"><Grid2X2 size={15} /></button><button onClick={() => setViewMode('list')} className={viewMode === 'list' ? 'active' : ''} aria-label="List view"><List size={15} /></button></div>
              <button className={`ew-filter-toggle ${showFilters ? 'active' : ''}`} onClick={() => setShowFilters(value => !value)} aria-expanded={showFilters}><SlidersHorizontal size={14} /><span>Filters</span></button>
            </div>
          </div>
          {showFilters && <div className="ew-filter-row">
            <span>FILTERED COLLECTION:</span>
            <button className={selectedCategory === 'all' ? 'active' : ''} onClick={() => setSelectedCategory('all')}>All workstreams</button>
            {categories.map(item => <button key={item.slug} className={selectedCategory === item.slug ? 'active' : ''} onClick={() => setSelectedCategory(selectedCategory === item.slug ? 'all' : item.slug)}>{item.title}</button>)}
            <button className="ew-clear-filters" onClick={clearFilters}>Clear filters <X size={12} /></button>
          </div>}
          {(selectedCategory !== 'all' || fileType !== 'all' || searchQuery) && <div className="ew-active-filters"><span>Filtered collection:</span>{selectedCategory !== 'all' && <StatusPill>{categories.find(item => item.slug === selectedCategory)?.short || selectedCategory}</StatusPill>}{fileType !== 'all' && <StatusPill>{fileType}</StatusPill>}{searchQuery && <StatusPill>“{searchQuery}”</StatusPill>}<button onClick={clearFilters}>Clear filters <X size={12} /></button></div>}
          {downloadError && <div className="ew-inline-error"><CircleAlert size={14} />{downloadError}<button onClick={() => setDownloadError('')}><X size={13} /></button></div>}
          {docs.loading ? <LoadingArchive /> : visibleDocuments.length || visibleSlots.length ? <div className={`ew-document-grid ${viewMode === 'list' ? 'is-list' : ''}`}>
            {visibleDocuments.map(file => <DocumentCard key={file.id} file={file} onView={() => startPreview(file)} onDownload={() => void downloadFile(file)} onEdit={() => setEditFile(file)} downloading={downloadingId === file.id} isMember={isMember} />)}
            {visibleSlots.map(slot => <SubmissionCard key={slot.title} slot={slot} isMember={isMember} onUpload={() => openUpload({ title: slot.folder ? undefined : slot.title, category: slot.suggestedCategory || undefined })} viewMode={viewMode} />)}
          </div> : <div className="ew-no-results"><Search size={21} /><strong>No matching documents</strong><p>Try another search, category or file type.</p><button onClick={clearFilters}>Reset search</button></div>}
          {docs.error && <p className="ew-inline-error"><CircleAlert size={14} />{docs.error}</p>}
          <div className="ew-repository-foot"><span>Showing {visibleDocuments.length + visibleSlots.length} of {docs.data.length + slots.length} items · Public files only</span><span>{isMember ? 'Member view · public and authorised files' : 'Publicly visible files only'}</span></div>
        </div>
      </section>

      <section id="about" className="ew-section ew-about-section ew-anchor-section">
        <div className="ew-container">
          <div className="ew-about-card">
            <div className="ew-about-mark"><span>✳</span></div>
            <div className="ew-about-copy"><p className="ew-eyebrow">NAGALAND · ACADEMIC ARCHIVE</p><h2>{settings.data?.project_title || defaultProjectSettings.project_title}</h2><p>{settings.data?.about_text || defaultProjectSettings.about_text}</p><div className="ew-about-meta"><span>{settings.data?.institution || 'Academic project workspace'}</span><span>{settings.data?.semester || 'Semester not set'}</span><span>{settings.data?.project_status || 'Project in progress'}</span></div></div>
            <div className="ew-about-actions"><button className="ew-btn ew-btn-primary" onClick={() => setToolsTab('sources')}>Explore the archive <ArrowRight size={14} /></button>{isMember && <button className="ew-about-settings" onClick={() => setToolsTab('settings')}><Settings size={14} />Project settings</button>}</div>
          </div>
          <div className="ew-about-links">
            <button onClick={() => setToolsTab('sources')}><BookOpen size={18} /><span><strong>Research sources</strong><small>Original publications and reference leads</small></span><ArrowUpRight size={15} /></button>
            <button onClick={() => setToolsTab('organisations')}><Building2 size={18} /><span><strong>Collection connections</strong><small>Directory-listed locations and contacts</small></span><ArrowUpRight size={15} /></button>
            <button onClick={() => setToolsTab('activities')}><Activity size={18} /><span><strong>Project activity</strong><small>Meetings, research and documentation log</small></span><ArrowUpRight size={15} /></button>
            <button onClick={() => setToolsTab('deliverables')}><FileText size={18} /><span><strong>Deliverables</strong><small>Proposed outputs and attached submissions</small></span><ArrowUpRight size={15} /></button>
          </div>
          <div className="ew-integrity-note"><ShieldCheck size={16} /><p><strong>Evidence before conclusions.</strong> The reported quantities have conflicting generation and collection labels across sources. Directory entries are leads for verification, not confirmed operating or recycling facilities.</p></div>
        </div>
      </section>
    </main>

    <footer className="ew-footer"><div className="ew-container"><div className="ew-footer-brand"><span className="ew-brand-mark"><Recycle size={17} /></span><span><strong>NAGALAND E-WASTE</strong><small>PROJECT ARCHIVE</small></span></div><span>Academic documentation workspace · Public browsing, authorised contributions</span><button onClick={() => jumpTo('home')}>Back to top ↑</button></div></footer>

    {uploadOpen && <UploadModal onClose={() => { setUploadOpen(false); setUploadPreset(null); }} onUploaded={() => { void docs.refresh(); }} initialTitle={uploadPreset?.title} presetCategory={uploadPreset?.category} />}
    {previewId && <FilePreviewModal id={previewId} onClose={() => setPreviewId(null)} />}
    {editFile && <DocumentEditModal file={editFile} onClose={() => setEditFile(null)} onSaved={() => { void docs.refresh(); setEditFile(null); }} />}
    {categoryDialog && <CategoryDialog slug={categoryDialog} sources={sources.data} organisations={organisations.data} onClose={() => setCategoryDialog(null)} />}
    {toolsTab && <ToolsModal tab={toolsTab} onTabChange={setToolsTab} onClose={() => setToolsTab(null)} sources={sources.data} organisations={organisations.data} activities={activities.data} deliverables={deliverables.data} settings={settings.data} onRefresh={() => { void Promise.all([sources.refresh(), organisations.refresh(), activities.refresh(), deliverables.refresh(), settings.refresh()]); }} />}
  </div>;
}
  
function normalise(value: string) { return value.toLowerCase().replace(/[^a-z0-9]/g, ''); }
function prettyDate(value: string) { if (!value) return 'Date not supplied'; const date = new Date(value); return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(date); }
function bytesLabel(bytes: number) { if (!bytes) return 'Size not supplied'; if (bytes < 1024) return `${bytes} B`; if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)} KB`; return `${(bytes / 1048576).toFixed(1)} MB`; }

function CategoryIcon({ slug }: { slug: string }) {
  if (slug === 'generation') return <FileSpreadsheet size={21} />;
  if (slug === 'collection') return <Recycle size={21} />;
  if (slug === 'recycling') return <Leaf size={21} />;
  if (slug === 'compliance') return <ShieldCheck size={21} />;
  if (slug === 'informal-sector') return <Users size={21} />;
  if (slug === 'environment') return <Leaf size={21} />;
  return <Activity size={21} />;
}

function StatusPill({ children }: { children: ReactNode }) { return <span className="ew-status-pill">{children}</span>; }

function DocumentCard({ file, onView, onDownload, onEdit, downloading, isMember }: { file: DocumentRecord; onView: () => void; onDownload: () => void; onEdit: () => void; downloading: boolean; isMember: boolean }) {
  const [pinned, setPinned] = useState(isFilePinned(file.id));
  const togglePin = () => { togglePinnedFile(file.id); setPinned(isFilePinned(file.id)); };
  const type = fileTypeLabel(file.mime_type, file.file_name);
  return <article className="ew-document-card">
    <div className="ew-document-top"><span className={`ew-file-type type-${type.toLowerCase()}`}>{type.slice(0, 5)}</span><div className="ew-document-top-actions">{file.visibility === 'private' && <span className="ew-private-tag"><LockKeyhole size={10} />PRIVATE</span>}<button className={`ew-pin ${pinned ? 'is-pinned' : ''}`} onClick={togglePin} aria-label={pinned ? 'Unpin document' : 'Pin document'} title={pinned ? 'Unpin' : 'Pin'}><Pin size={13} /></button>{isMember && <button className="ew-more" onClick={onEdit} aria-label="Edit document details"><MoreHorizontal size={17} /></button>}</div></div>
    <div className="ew-document-content"><strong title={file.title}>{file.title}</strong><p>{file.description || file.file_name}</p><div className="ew-document-meta"><span>{prettyDate(file.created_at)}</span><span>{bytesLabel(file.file_size)}</span></div><div className="ew-document-tags"><StatusPill>{categories.find(category => category.slug === file.category)?.short || 'Project file'}</StatusPill>{file.tags.slice(0, 2).map(tag => <StatusPill key={tag}>{tag}</StatusPill>)}</div></div>
    <div className="ew-document-actions"><button className="ew-mini-btn ew-mini-primary" onClick={onView}><Eye size={12} />View file</button><button className="ew-mini-btn" onClick={onDownload} disabled={downloading}><Download size={12} />{downloading ? 'Preparing…' : 'Download'}</button></div>
  </article>;
}

function SubmissionCard({ slot, isMember, onUpload, viewMode }: { slot: typeof expectedSubmissions[number]; isMember: boolean; onUpload: () => void; viewMode: ViewMode }) {
  const category = categories.find(item => item.slug === slot.suggestedCategory);
  return <article className={`ew-document-card ew-pending-card ${viewMode === 'list' ? 'pending-list' : ''}`}>
    <div className="ew-document-top"><span className="ew-file-type type-pending">{slot.folder ? 'DIR' : 'WAIT'}</span><span className="ew-awaiting-tag"><Clock3 size={10} />AWAITING FILE</span></div>
    <div className="ew-document-content"><strong title={slot.title}>{slot.title}</strong><p>{slot.note || 'Title supplied for the project archive. Original file has not been attached yet.'}</p><div className="ew-document-meta"><span>Submission record</span><span>Original pending</span></div><div className="ew-document-tags">{category ? <StatusPill>Suggested · {category.short}</StatusPill> : <StatusPill>Category not assigned</StatusPill>}</div></div>
    <div className="ew-document-actions">{isMember ? <button className="ew-mini-btn ew-mini-primary" onClick={onUpload}><Upload size={12} />Attach file</button> : <span className="ew-slot-note"><LockKeyhole size={11} />Member upload</span>}</div>
  </article>;
}

function LoadingArchive() { return <div className="ew-document-grid">{Array.from({ length: 6 }).map((_, index) => <div className="ew-loading-card" key={index} />)}</div>; }

function Dialog({ title, subtitle, children, onClose, className = '' }: { title: string; subtitle?: string; children: ReactNode; onClose: () => void; className?: string }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = oldOverflow; };
  }, [onClose]);
  return <div className="ew-dialog-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}><section className={`ew-dialog ${className}`} role="dialog" aria-modal="true"><header className="ew-dialog-header"><div><p className="ew-eyebrow">PROJECT ARCHIVE</p><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div><button className="ew-dialog-close" onClick={onClose} aria-label="Close dialog"><X size={18} /></button></header>{children}</section></div>;
}

function CategoryDialog({ slug, sources, organisations, onClose }: { slug: string; sources: SourceRecord[]; organisations: OrganisationRecord[]; onClose: () => void }) {
  const category = categories.find(item => item.slug === slug);
  const details = categoryDetails[slug];
  if (!category || !details) return null;
  const related = sources.filter(source => source.category === slug);
  return <Dialog title={category.title} subtitle={category.description} onClose={onClose} className="ew-category-dialog">
    <div className="ew-dialog-body">
      <div className="ew-category-dialog-status"><StatusPill>{category.status}</StatusPill><span>Research overview · {category.number}/07</span></div>
      {slug === 'generation' && <div className="ew-dialog-quantities">{reportedQuantities.map(item => <div key={item.financialYear}><small>{item.financialYear}</small><strong>{item.label}</strong></div>)}</div>}
      {slug === 'collection' && <div className="ew-dialog-list"><h3>Directory-listed connections</h3>{organisations.map(org => <div key={org.id} className="ew-dialog-record"><Building2 size={15} /><div><strong>{org.name} · {org.location}</strong><p>{org.address}</p><small>{org.verification_status} · {org.phone || 'Contact not supplied'}</small></div></div>)}</div>}
      <div className="ew-detail-grid"><div><h3>What the available evidence can tell us</h3><ul>{details.findings.map((line, index) => <li key={index}>{line}</li>)}</ul></div><div><h3>Evidence gaps</h3><ul>{details.gaps.map((line, index) => <li key={index}>{line}</li>)}</ul></div></div>
      <div className="ew-next-steps"><h3>Suggested next steps</h3><ol>{details.next.map((line, index) => <li key={index}>{line}</li>)}</ol></div>
      {related.length > 0 && <div className="ew-dialog-list"><h3>Related research sources</h3>{related.map(source => <SourceListItem key={source.id} source={source} />)}</div>}
      <ProjectNotes category={slug} />
      {slug === 'generation' && <Notice tone="warning"><strong>Terminology remains unresolved.</strong> The NPCB newsletter describes these values as collected; a CPCB report to the NGT uses generation terminology for the same values. They are not verified generation or collection totals.</Notice>}
    </div>
  </Dialog>;
}

function ProjectNotes({ category }: { category: string }) {
  const { isMember, user } = useAuth();
  const [notes, setNotes] = useState<Array<{ id: string; body: string; created_at: string }>>([]);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const refresh = async () => {
    setLoading(true);
    try { setNotes(await listProjectNotes(category)); }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not load project notes.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void refresh(); }, [category]);
  const save = async () => {
    if (!text.trim() || !supabase || !user) return;
    setSaving(true); setError('');
    try {
      const { data, error: insertError } = await supabase.from('project_notes').insert({ category, body: text.trim(), visibility: 'private', created_by: user.id }).select('id,body,created_at').single();
      if (insertError) throw insertError;
      setNotes(current => [data, ...current]); setText('');
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not save note.'); }
    finally { setSaving(false); }
  };
  return <div className="ew-notes-block"><div className="ew-tool-heading"><div><h3>Project notes</h3><p>Keep observations distinct from published source material.</p></div>{isMember && <StatusPill>Private notes</StatusPill>}</div>
    {loading ? <p className="ew-muted">Loading notes…</p> : notes.length ? notes.map(note => <div className="ew-note-item" key={note.id}><p>{note.body}</p><small>{prettyDate(note.created_at)}</small></div>) : <p className="ew-muted">No notes recorded for this category.</p>}
    {isMember ? <div className="ew-note-form"><textarea rows={3} value={text} onChange={event => setText(event.target.value)} placeholder="Add a private research observation…" /><button className="ew-btn ew-btn-secondary" onClick={() => void save()} disabled={saving || !text.trim() || !isSupabaseConfigured}>{saving ? 'Saving…' : 'Add private note'} <Plus size={13} /></button></div> : <p className="ew-muted">Sign in as an authorised member to add private notes.</p>}
    {error && <p className="ew-inline-error">{error}</p>}
  </div>;
}

function SourceListItem({ source }: { source: SourceRecord }) {
  return <div className="ew-dialog-record"><BookOpen size={15} /><div><strong>{source.title}</strong><p>{source.description}</p><small>{source.publisher || source.source_type} · {source.verification_status}</small></div>{source.url && <a href={source.url} target="_blank" rel="noreferrer" aria-label="Open source"><ExternalLink size={13} /></a>}</div>;
}

function DocumentEditModal({ file, onClose, onSaved }: { file: DocumentRecord; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ title: file.title, description: file.description || '', category: file.category, tags: file.tags.join(', '), visibility: file.visibility });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const change = (key: string, value: string) => setForm(current => ({ ...current, [key]: value }));
  const save = async (event: FormEvent) => {
    event.preventDefault(); setSaving(true); setError('');
    try { await updateDocument(file.id, { title: form.title.trim(), description: form.description, category: form.category, tags: form.tags.split(',').map(tag => tag.trim()).filter(Boolean), visibility: form.visibility as 'public' | 'private' }); onSaved(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not update document.'); }
    finally { setSaving(false); }
  };
  const remove = async () => {
    if (!window.confirm(`Delete “${file.title}” from the archive? This cannot be undone.`)) return;
    setDeleting(true); setError('');
    try { await deleteDocument(file); onSaved(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not delete document.'); setDeleting(false); }
  };
  return <Dialog title="Edit document details" subtitle={file.file_name} onClose={onClose} className="ew-edit-dialog"><form className="ew-form-grid" onSubmit={save}>
    <label className="field-full">Display title<input required value={form.title} onChange={event => change('title', event.target.value)} /></label>
    <label>Workstream<select value={form.category} onChange={event => change('category', event.target.value)}>{categories.map(item => <option key={item.slug} value={item.slug}>{item.title}</option>)}</select></label>
    <label>Visibility<select value={form.visibility} onChange={event => change('visibility', event.target.value)}><option value="private">Private · members only</option><option value="public">Public · everyone can view</option></select></label>
    <label className="field-full">Description<textarea rows={3} value={form.description} onChange={event => change('description', event.target.value)} /></label>
    <label className="field-full">Tags<input value={form.tags} onChange={event => change('tags', event.target.value)} placeholder="research, project submission" /></label>
    {error && <p className="ew-inline-error field-full">{error}</p>}
    <div className="ew-form-actions field-full"><button type="button" className="ew-danger-btn" onClick={() => void remove()} disabled={saving || deleting}>Delete file</button><div><button type="button" className="ew-btn ew-btn-secondary" onClick={onClose}>Cancel</button><button type="submit" className="ew-btn ew-btn-primary" disabled={saving || deleting}>{saving ? 'Saving…' : 'Save changes'}</button></div></div>
  </form></Dialog>;
}

function ToolsModal({ tab, onTabChange, onClose, sources, organisations, activities, deliverables, settings, onRefresh }: { tab: ToolTab; onTabChange: (tab: ToolTab) => void; onClose: () => void; sources: SourceRecord[]; organisations: OrganisationRecord[]; activities: ActivityRecord[]; deliverables: DeliverableRecord[]; settings: ProjectSettingsRecord | null; onRefresh: () => void }) {
  const { isMember, isAdmin } = useAuth();
  const [addActivity, setAddActivity] = useState(false);
  const [addSource, setAddSource] = useState(false);
  const [editingActivity, setEditingActivity] = useState<ActivityRecord | null>(null);
  return <>
    <Dialog title="Workspace tools" subtitle="Project records and contribution controls are grouped here, away from the public archive navigation." onClose={onClose} className="ew-tools-dialog">
      <div className="ew-tool-tabs">{([
        ['activities', 'Activity log', Activity], ['sources', 'Research sources', BookOpen], ['organisations', 'Organisations', Building2], ['deliverables', 'Deliverables', FileText], ['settings', 'Settings', Settings],
      ] as const).map(([id, label, Icon]) => <button key={id} className={tab === id ? 'active' : ''} onClick={() => onTabChange(id)}><Icon size={14} />{label}</button>)}</div>
      <div className="ew-tools-content">
        {tab === 'activities' && <div className="ew-tool-panel"><div className="ew-tool-heading"><div><h3>Activity log</h3><p>Completed work only. Planned actions should remain separate.</p></div>{isMember && <button className="ew-btn ew-btn-primary" onClick={() => setAddActivity(true)}><Plus size={13} />Add activity</button>}</div>
          {activities.length ? activities.map(item => <div className="ew-tool-row" key={item.id}><div><strong>{item.title}</strong><p>{item.description || 'No description supplied.'}</p><small>{prettyDate(item.activity_date)} · {item.activity_type}</small></div><div className="ew-tool-row-end"><StatusPill>{item.status}</StatusPill>{isMember && <button className="ew-icon-action" onClick={() => setEditingActivity(item)} aria-label="Edit activity"><MoreHorizontal size={16} /></button>}</div></div>) : <div className="ew-tool-empty"><Activity size={20} /><strong>No activity logged yet</strong><p>Research sessions, meetings and documentation can be recorded here.</p></div>}
        </div>}
        {tab === 'sources' && <div className="ew-tool-panel"><div className="ew-tool-heading"><div><h3>Research sources</h3><p>Reference leads and source records. Keep verification status visible.</p></div>{isMember && <button className="ew-btn ew-btn-primary" onClick={() => setAddSource(true)}><Plus size={13} />Add source</button>}</div>
          {sources.length ? sources.map(source => <SourceListItem source={source} key={source.id} />) : <div className="ew-tool-empty"><BookOpen size={20} /><strong>No research sources recorded</strong></div>}
        </div>}
        {tab === 'organisations' && <div className="ew-tool-panel"><div className="ew-tool-heading"><div><h3>Collection connections</h3><p>Directory-listed locations. Current operation and authorisation are not independently verified.</p></div><StatusPill>{organisations.length} listings</StatusPill></div>
          {organisations.map(org => <div className="ew-tool-row" key={org.id}><div><strong>{org.name} · {org.location}</strong><p>{org.address}</p><small>{org.phone || 'Contact not supplied'} · {org.verification_status}</small>{org.website && <a className="ew-source-link" href={org.website} target="_blank" rel="noreferrer">Open directory source <ExternalLink size={11} /></a>}</div></div>)}
        </div>}
        {tab === 'deliverables' && <DeliverablesTool deliverables={deliverables} isMember={isMember} onRefresh={onRefresh} />}
        {tab === 'settings' && <SettingsTool settings={settings} isMember={isMember} isAdmin={isAdmin} onRefresh={onRefresh} />}
      </div>
    </Dialog>
    {addActivity && <AddActivityModal onClose={() => setAddActivity(false)} onSaved={onRefresh} />}
    {addSource && <AddSourceModal onClose={() => setAddSource(false)} onSaved={onRefresh} />}
    {editingActivity && <EditActivityModal item={editingActivity} onClose={() => setEditingActivity(null)} onSaved={onRefresh} />}
  </>;
}

function DeliverablesTool({ deliverables, isMember, onRefresh }: { deliverables: DeliverableRecord[]; isMember: boolean; onRefresh: () => void }) {
  const [savingId, setSavingId] = useState('');
  const [error, setError] = useState('');
  const saveStatus = async (item: DeliverableRecord, status: string) => {
    setSavingId(item.id); setError('');
    try { await updateDeliverable(item.id, { status }); onRefresh(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not update status.'); }
    finally { setSavingId(''); }
  };
  return <div className="ew-tool-panel"><div className="ew-tool-heading"><div><h3>Deliverables</h3><p>Proposed project outputs. Status is only changed when a member records it.</p></div></div>
    {deliverables.length ? deliverables.map(item => <div className="ew-tool-row ew-deliverable-row" key={item.id}><div><strong>{item.title}</strong><p>{item.description || 'No description supplied.'}</p><small>{item.document_id ? 'File attached' : 'No file attached'} · {item.version || 'Version not set'}</small></div>{isMember ? <select value={item.status} disabled={savingId === item.id} onChange={event => void saveStatus(item, event.target.value)}>{['Not started', 'In progress', 'Under review', 'Finalised'].map(status => <option key={status}>{status}</option>)}</select> : <StatusPill>{item.status}</StatusPill>}</div>) : <div className="ew-tool-empty"><FileText size={20} /><strong>No deliverables recorded</strong><p>Outputs appear here after they are added to the project deliverables table.</p></div>}
    {error && <p className="ew-inline-error">{error}</p>}
  </div>;
}

function SettingsTool({ settings, isMember, isAdmin, onRefresh }: { settings: ProjectSettingsRecord | null; isMember: boolean; isAdmin: boolean; onRefresh: () => void }) {
  const [form, setForm] = useState({
    project_title: settings?.project_title || defaultProjectSettings.project_title,
    semester: settings?.semester || '', academic_year: settings?.academic_year || '', project_status: settings?.project_status || 'In progress',
    about_text: settings?.about_text || defaultProjectSettings.about_text || '', owner_name: settings?.owner_name || '', owner_programme: settings?.owner_programme || '',
    owner_department: settings?.owner_department || '', institution: settings?.institution || '', public_contact: settings?.public_contact || '',
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!settings) return;
    setForm({
      project_title: settings.project_title || defaultProjectSettings.project_title,
      semester: settings.semester || '',
      academic_year: settings.academic_year || '',
      project_status: settings.project_status || 'In progress',
      about_text: settings.about_text || defaultProjectSettings.about_text || '',
      owner_name: settings.owner_name || '',
      owner_programme: settings.owner_programme || '',
      owner_department: settings.owner_department || '',
      institution: settings.institution || '',
      public_contact: settings.public_contact || '',
    });
  }, [settings]);

  const save = async (event: FormEvent) => {
    event.preventDefault(); setSaving(true); setError(''); setMessage('');
    try { await saveProjectSettings(form); onRefresh(); setMessage('Project information saved.'); }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not save project details.'); }
    finally { setSaving(false); }
  };
  return <div className="ew-tool-panel"><div className="ew-tool-heading"><div><h3>Project settings</h3><p>Public browsing is enabled; editing and uploads require an authorised member.</p></div><StatusPill>{isAdmin ? 'Administrator' : isMember ? 'Project member' : 'Public visitor'}</StatusPill></div>
    <Notice tone="info">Public files can be viewed by everyone. New uploads default to private; a member must explicitly publish a file to make it public.</Notice>
    {isMember ? <form className="ew-form-grid" onSubmit={save}>
      <label className="field-full">Project title<input value={form.project_title} onChange={event => setForm(current => ({ ...current, project_title: event.target.value }))} /></label>
      <label>Semester<input value={form.semester} onChange={event => setForm(current => ({ ...current, semester: event.target.value }))} placeholder="e.g. Semester 5" /></label>
      <label>Academic year<input value={form.academic_year} onChange={event => setForm(current => ({ ...current, academic_year: event.target.value }))} placeholder="e.g. 2026–27" /></label>
      <label>Project status<input value={form.project_status} onChange={event => setForm(current => ({ ...current, project_status: event.target.value }))} /></label>
      <label>Institution<input value={form.institution} onChange={event => setForm(current => ({ ...current, institution: event.target.value }))} /></label>
      <label>Project owner<input value={form.owner_name} onChange={event => setForm(current => ({ ...current, owner_name: event.target.value }))} /></label>
      <label>Programme<input value={form.owner_programme} onChange={event => setForm(current => ({ ...current, owner_programme: event.target.value }))} /></label>
      <label>Department<input value={form.owner_department} onChange={event => setForm(current => ({ ...current, owner_department: event.target.value }))} /></label>
      <label>Public contact<input value={form.public_contact} onChange={event => setForm(current => ({ ...current, public_contact: event.target.value }))} /></label>
      <label className="field-full">Project overview<textarea rows={3} value={form.about_text} onChange={event => setForm(current => ({ ...current, about_text: event.target.value }))} /></label>
      {message && <p className="ew-success-message field-full"><Check size={14} />{message}</p>}{error && <p className="ew-inline-error field-full">{error}</p>}
      <div className="ew-form-actions field-full"><span>Changes update the public About section.</span><button className="ew-btn ew-btn-primary" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save project details'}</button></div>
    </form> : <p className="ew-muted">Sign in with an authorised member account to edit project details.</p>}
  </div>;
}
