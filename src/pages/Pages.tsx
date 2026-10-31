import { useEffect, useMemo, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Activity, ArrowDownToLine, ArrowRight, ArrowUpRight, BookOpen, CheckCircle2, ChevronRight, CircleHelp,
  Clock3, Download, Eye, File, FileSpreadsheet, FileText, Filter, FolderOpen, Image as ImageIcon,
  Grid2X2, List, LockKeyhole, MapPin, Plus, Pin, Recycle, Search, ShieldCheck, Upload, Users, X,
} from 'lucide-react';
import { categories, categoryDetails, expectedSubmissions, organisations as seedOrganisations, reportedQuantities, sources as seedSources } from '../data/project';
import { useAuth } from '../context/AuthContext';
import { canPreviewFile, createDocumentUrl, fileTypeLabel, getDocument, getProjectSettings, saveProjectSettings, listProjectNotes, getRecentFileIds, getPinnedFileIds, isFilePinned, rememberFileOpened, togglePinnedFile, updateDeliverable, updateDocument, deleteDocument, updateActivity, deleteActivity, listActivities, listDeliverables, listDocuments, listOrganisations, listSources } from '../lib/api';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import type { ActivityRecord, DeliverableRecord, DocumentRecord, OrganisationRecord, SourceRecord } from '../types';
import type { ProjectSettingsRecord } from '../lib/api';
import { AddActivityModal, AddSourceModal, EditActivityModal } from '../components/RecordModals';
import { UploadModal } from '../components/UploadModal';
import { Button, EmptyState, ExternalLink, MetaRow, Notice, PageHeader, Panel, StatusTag } from '../components/Primitives';

function useLoad<T>(loader: () => Promise<T>, fallback: T, dependencies: unknown[] = []) {
  const [data, setData] = useState<T>(fallback);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const refresh = async () => {
    setLoading(true); setError('');
    try { setData(await loader()); }
    catch (err) { setError(err instanceof Error ? err.message : 'Unable to load this section.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void refresh(); }, dependencies);
  return { data, setData, loading, error, refresh };
}

function MemberAction({ children, to = '/login' }: { children: ReactNode; to?: string }) {
  const { isMember } = useAuth();
  return isMember ? <>{children}</> : <Link className="button button-secondary button-sm" to={to}><LockKeyhole size={14}/>Sign in to contribute</Link>;
}

export function OverviewPage() {
  const { isMember } = useAuth();
  const docs = useLoad(listDocuments, [] as DocumentRecord[]);
  const activities = useLoad(listActivities, [] as ActivityRecord[]);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const countFiles = docs.data.length;
  return <>
    <section className="overview-hero">
      <div className="overview-copy">
        <p className="eyebrow">Welcome to your project workspace</p>
        <h1>Everything related to the project, in one place.</h1>
        <p>Research, activities, resources and deliverables from a semester-long e-waste management project in Nagaland.</p>
        <div className="hero-meta"><StatusTag>Semester not set</StatusTag><StatusTag>Project status not set</StatusTag><Link to="/about" className="text-link">Edit project details <ArrowUpRight size={13}/></Link></div>
        <div className="quick-actions">
          <MemberAction><Button onClick={() => setUploadOpen(true)}><Upload size={15}/>Upload a file</Button></MemberAction>
          <MemberAction><Button variant="secondary" onClick={() => setActivityOpen(true)}><Plus size={15}/>Add an activity</Button></MemberAction>
          <Link to="/research" className="button button-secondary"><BookOpen size={15}/>Add a research source</Link>
          <Link to="/tracker" className="button button-quiet">Open the e-waste tracker <ArrowUpRight size={14}/></Link>
        </div>
      </div>
      <div className="hero-shortcuts">
        <Link to="/research" className="shortcut-card shortcut-tall"><BookOpen size={18}/><ArrowUpRight size={15}/><strong>Research & sources</strong><span>Verify originals, capture findings and connect the evidence.</span></Link>
        <Link to="/tracker" className="shortcut-card"><Recycle size={18}/><ArrowUpRight size={15}/><strong>E-waste tracker</strong><span>Explore seven workstreams across Nagaland’s e-waste landscape.</span></Link>
        <Link to="/files" className="shortcut-card"><FolderOpen size={18}/><ArrowUpRight size={15}/><strong>Files & resources</strong><span>Your semester archive.</span></Link>
      </div>
    </section>

    <div className="overview-grid-two">
      <Panel title="Recent files" action={<Link className="text-link" to="/files">All files <ArrowUpRight size={13}/></Link>}>
        {docs.loading ? <LoadingRows/> : docs.data.length ? <div className="compact-list">{docs.data.slice(0, 4).map(doc => <FileRow key={doc.id} file={doc}/>)}</div> : <EmptyState icon={<FolderOpen size={20}/>} title="Your archive starts here" description="No files have been uploaded. Add original reports, research papers or working documents." action={<MemberAction><Button size="sm" onClick={() => setUploadOpen(true)}>Upload a file</Button></MemberAction>} />}
        {docs.error && <p className="field-error">{docs.error}</p>}
      </Panel>
      <Panel title="Recent activity" action={<Link className="text-link" to="/activities">Activity log <ArrowUpRight size={13}/></Link>}>
        {activities.loading ? <LoadingRows/> : activities.data.length ? <div className="timeline compact">{activities.data.slice(0, 4).map(item => <ActivityRow key={item.id} item={item} onChanged={() => void activities.refresh()}/>)}</div> : <EmptyState icon={<Activity size={20}/>} title="No activity logged yet" description="Document your first research session, meeting or fieldwork when it happens." action={<MemberAction><Button size="sm" variant="secondary" onClick={() => setActivityOpen(true)}>Add an activity</Button></MemberAction>} />}
      </Panel>
    </div>

    <div className="overview-grid-two overview-lower">
      <Panel title="Important documents">
        <div className="reference-box"><strong>Original source documents</strong><p>NPCB newsletter · CPCB report to NGT · E-Waste Management Rules, 2022</p><StatusTag tone="amber">Awaiting original documents</StatusTag><span className="small muted">These reference leads are not uploaded files.</span></div>
      </Panel>
      <Panel title="Semester planning">
        <div className="reference-box"><strong>Deadlines not yet set</strong><p>Set the semester and add submission dates when your academic schedule is confirmed.</p><Link to="/settings" className="button button-secondary button-sm">Set semester & dates</Link></div>
      </Panel>
    </div>

    <Panel title="Active workstream directory" action={<Link className="text-link" to="/tracker">Open tracker <ArrowUpRight size={13}/></Link>}>
      <div className="workstream-list">{categories.map(item => <Link to={`/tracker/${item.slug}`} key={item.slug}><span className="workstream-number">{item.number}</span><strong>{item.title}</strong><span className="workstream-status">{item.status}</span><ArrowUpRight size={14}/></Link>)}</div>
    </Panel>
    <div className="workspace-note"><ShieldCheck size={17}/><div><strong>Public project archive</strong><span>Anyone can browse published records. Uploading and editing are restricted to authorised project members.</span></div>{!isMember && <Link to="/login">Member sign in <ArrowUpRight size={13}/></Link>}</div>
    {uploadOpen && <UploadModal onClose={() => setUploadOpen(false)} onUploaded={() => { void docs.refresh(); }}/>} 
    {activityOpen && <AddActivityModal onClose={() => setActivityOpen(false)} onSaved={() => { void activities.refresh(); }}/>} 
  </>;
}

export function TrackerPage() {
  return <>
    <PageHeader eyebrow="Nagaland / workstream index" title="Understand the landscape. Build the evidence." description="Seven connected workstreams for researching e-waste management in Nagaland. Keep source evidence, project observations and assumptions distinct." action={<Link to="/research" className="button button-primary"><Plus size={15}/>Add a research source</Link>}/>
    <Notice tone="info"><strong>A research tracker, not an official statistical return.</strong><br/>The workspace organises brief-supplied reference leads and project documentation. It does not establish verified generation, collection coverage or facility performance.</Notice>
    <Panel title="Explore the seven categories"><div className="category-directory">{categories.map(item => <Link key={item.slug} to={`/tracker/${item.slug}`} className="category-row"><span>{item.number}</span><div><strong>{item.title}</strong><small>{item.description}</small></div><div className="category-row-status"><small>Data availability</small><strong>{item.status}</strong></div><ArrowUpRight size={16}/></Link>)}</div></Panel>
    <Panel title="Reported quantities">
      <div className="quantity-grid">{reportedQuantities.map(row => <div className="quantity-stat" key={row.financialYear}><span>{row.financialYear}</span><strong>{row.label}</strong><small>Brief-supplied reference · pending verification</small></div>)}</div>
      <Notice tone="warning"><strong>Read the quantities with care.</strong><br/>The NPCB newsletter describes these values as collected; a CPCB report to the NGT uses generation terminology for the same values. Original records and definitions await verification. These are not verified generation or collection totals.</Notice>
    </Panel>
    <div className="two-col-bottom"><Panel title="A state-focused archive"><p className="body-copy">Organise state-level publications alongside location-specific directory leads. District-level comparisons need consistent definitions and primary evidence before analysis.</p></Panel><Panel title="Evidence key"><div className="tag-row"><StatusTag>Source excerpt</StatusTag><StatusTag tone="blue">Project note</StatusTag><StatusTag tone="amber">Assumption · label explicitly</StatusTag></div></Panel></div>
  </>;
}

export function CategoryPage() {
  const { slug = '' } = useParams();
  const item = categories.find(x => x.slug === slug);
  const details = categoryDetails[slug];
  if (!item || !details) return <NotFoundPage/>;
  const relatedSources = seedSources.filter(x => x.category === slug);
  return <>
    <PageHeader eyebrow={`E-waste tracker / ${item.number}`} title={item.title} description={item.description} action={<div className="button-row"><Link to={`/files?category=${item.slug}`} className="button button-secondary"><FolderOpen size={14}/>View related files</Link><Link to="/research" className="button button-primary"><Plus size={15}/>Add evidence</Link></div>}/>
    <div className="tag-row"><StatusTag tone="amber">{item.status}</StatusTag><StatusTag>Original sources required where noted</StatusTag></div>
    {slug === 'generation' && <Panel title="Reported quantities">
      <div className="quantity-grid">{reportedQuantities.map(row => <div className="quantity-stat" key={row.financialYear}><span>{row.financialYear}</span><strong>{row.label}</strong><small>Brief-supplied reference · pending verification</small></div>)}</div>
      <Notice tone="warning">The source terminology conflict remains unresolved. Do not describe these figures as a confirmed generation or collection series until NPCB confirms the definition.</Notice>
    </Panel>}
    {slug === 'collection' && <Panel title="Directory-listed connections"><OrganisationCompactList items={seedOrganisations}/></Panel>}
    {slug === 'recycling' && <Notice tone="info"><strong>A collection listing is not a recycling authorisation.</strong><br/>The directory connections do not establish an authorised recycling plant in Nagaland. No in-state processing capacity is verified in the sources used here.</Notice>}
    <Panel title="What the available evidence can tell us"><ul className="evidence-list">{details.findings.map((line, i) => <li key={i}>{line}</li>)}</ul></Panel>
    <Panel title="Evidence gaps & next questions"><div className="gap-grid">{details.gaps.map((line, i) => <div className="gap-item" key={i}><span className="gap-dot"/><p>{line}</p></div>)}</div><div className="subsection"><h3>Suggested next steps</h3><ol className="next-list">{details.next.map((line, i) => <li key={i}>{line}</li>)}</ol></div></Panel>
    <Panel title="Government publications & directory references" action={<Link to="/research" className="text-link">Research library <ArrowUpRight size={13}/></Link>}>
      {relatedSources.length ? <div className="source-list">{relatedSources.map(source => <SourceRow source={source} key={source.id}/>)}</div> : <EmptyState title="No source records linked yet" description="Add the original publication or source reference when it becomes available."/>}
    </Panel>
    <ProjectNotes category={slug}/>
  </>;
}

export function FilesPage() {
  const { isMember } = useAuth();
  const files = useLoad(listDocuments, [] as DocumentRecord[]);
  const [searchParams, setSearchParams] = useSearchParams();
  const urlCategory = searchParams.get('category') || 'all';
  const validUrlCategory = categories.some(item => item.slug === urlCategory) ? urlCategory : 'all';
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadTitle, setUploadTitle] = useState<string | undefined>(undefined);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState(validUrlCategory);
  const [type, setType] = useState('all');
  const [sort, setSort] = useState('newest');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [activeTab, setActiveTab] = useState<'recent'|'opened'|'pinned'>('recent');
  const [preferenceTick, setPreferenceTick] = useState(0);

  useEffect(() => { setCategory(validUrlCategory); }, [validUrlCategory]);
  useEffect(() => {
    const update = () => setPreferenceTick(x => x + 1);
    window.addEventListener('file-preferences-changed', update);
    window.addEventListener('storage', update);
    return () => {
      window.removeEventListener('file-preferences-changed', update);
      window.removeEventListener('storage', update);
    };
  }, []);

  const availableTypes = useMemo(
    () => Array.from(new Set(files.data.map(file => fileTypeLabel(file.mime_type, file.file_name)))).sort(),
    [files.data],
  );

  const filtered = useMemo(() => files.data.filter(file => {
    const haystack = `${file.title} ${file.file_name} ${file.description ?? ''} ${file.tags.join(' ')}`.toLowerCase();
    return (!query || haystack.includes(query.toLowerCase()))
      && (category === 'all' || file.category === category)
      && (type === 'all' || fileTypeLabel(file.mime_type, file.file_name) === type);
  }).filter(file => activeTab === 'recent' ? true : activeTab === 'opened'
    ? getRecentFileIds().includes(file.id)
    : isFilePinned(file.id)
  ).sort((a, b) => {
    if (activeTab === 'opened') return getRecentFileIds().indexOf(a.id) - getRecentFileIds().indexOf(b.id);
    if (activeTab === 'pinned') return getPinnedFileIds().indexOf(a.id) - getPinnedFileIds().indexOf(b.id);
    if (sort === 'oldest') return +new Date(a.created_at) - +new Date(b.created_at);
    if (sort === 'title') return a.title.localeCompare(b.title);
    return +new Date(b.created_at) - +new Date(a.created_at);
  }), [files.data, query, category, type, sort, activeTab, preferenceTick]);

  const submissionRows = useMemo(() => expectedSubmissions.map(record => ({
    ...record,
    attachedCount: files.data.filter(file => normaliseSubmissionTitle(file.title) === normaliseSubmissionTitle(record.title)).length,
  })), [files.data]);

  const changeCategory = (value: string) => {
    setCategory(value);
    const next = new URLSearchParams(searchParams);
    if (value === 'all') next.delete('category');
    else next.set('category', value);
    setSearchParams(next, { replace: true });
  };

  const clearFilters = () => {
    setQuery('');
    setType('all');
    changeCategory('all');
    setSort('newest');
    setActiveTab('recent');
  };

  const openUpload = (title?: string) => {
    setUploadTitle(title);
    setUploadOpen(true);
  };

  return <>
    <PageHeader eyebrow="Semester documentation archive" title="Files & resources" description="Original evidence and working documents, organised with the context that makes them useful." action={isMember ? <Button onClick={() => openUpload()}><Upload size={15}/>Upload a file</Button> : <Link to="/login" className="button button-primary"><LockKeyhole size={14}/>Member sign in</Link>}/>
    <div className="files-layout">
      <aside className="filter-sidebar">
        <strong>Browse by workstream</strong>
        <button className={category === 'all' ? 'filter-choice active' : 'filter-choice'} onClick={() => changeCategory('all')}>All resources</button>
        {categories.map(item => <button key={item.slug} className={category === item.slug ? 'filter-choice active' : 'filter-choice'} onClick={() => changeCategory(item.slug)}>{item.title}</button>)}
        <div className="filter-divider"/>
        <strong>File types</strong>
        <div className="tag-row">{availableTypes.length ? availableTypes.map(value => <button key={value} className={`filter-chip ${type === value ? 'selected' : ''}`} onClick={() => setType(type === value ? 'all' : value)}>{value}</button>) : <span className="small muted">Types appear after files are uploaded.</span>}</div>
      </aside>
      <div className="files-main">
        <div className="tabs-row">
          <button className={activeTab==='recent'?'active':''} onClick={()=>setActiveTab('recent')}>Recently added</button>
          <button className={activeTab==='opened'?'active':''} onClick={()=>setActiveTab('opened')}>Recently opened</button>
          <button className={activeTab==='pinned'?'active':''} onClick={()=>setActiveTab('pinned')}>Pinned on this device</button>
        </div>
        <div className="search-filter-row">
          <div className="search-field"><Search size={16}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search titles, filenames, tags or descriptions"/></div>
          <select value={type} onChange={e => setType(e.target.value)}><option value="all">All file types</option>{availableTypes.map(value => <option key={value} value={value}>{value}</option>)}</select>
          <select value={category} onChange={e => changeCategory(e.target.value)}><option value="all">All workstreams</option>{categories.map(item => <option key={item.slug} value={item.slug}>{item.title}</option>)}</select>
          <select value={sort} onChange={e => setSort(e.target.value)}><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="title">Title A–Z</option></select>
          <div className="view-toggle" role="group" aria-label="Archive layout">
            <button type="button" className={viewMode === 'grid' ? 'active' : ''} onClick={() => setViewMode('grid')} aria-label="Grid view" title="Grid view"><Grid2X2 size={15}/></button>
            <button type="button" className={viewMode === 'list' ? 'active' : ''} onClick={() => setViewMode('list')} aria-label="List view" title="List view"><List size={16}/></button>
          </div>
        </div>
        {(query || category !== 'all' || type !== 'all' || activeTab !== 'recent') && <div className="active-filter-line"><span>{filtered.length} matching file{filtered.length === 1 ? '' : 's'}</span><button className="text-button" onClick={clearFilters}>Clear filters <X size={12}/></button></div>}
        {files.loading ? <LoadingRows/> : filtered.length ? <div className={`file-list ${viewMode === 'grid' ? 'file-grid' : 'file-list-mode'}`}>{filtered.map(file => <FileCard key={file.id} file={file}/>)}</div> : <EmptyState icon={<FolderOpen size={22}/>} title={files.data.length ? 'No files match these filters' : 'Make room for the originals'} description={files.data.length ? 'Try another search or clear the filters.' : 'No files have been uploaded. Add original reports, research papers and working documents to build a traceable semester archive.'} action={isMember ? <Button onClick={() => openUpload()}><Upload size={14}/>Upload a file</Button> : <Link to="/login" className="button button-secondary">Sign in to contribute</Link>}/>}
        {files.error && <p className="field-error">{files.error}</p>}
        <div className="repository-note"><strong>Every file keeps its context</strong><span>Title · Type · Description · Category · Tags · Date · Uploader · Workstream · Origin · Version · Semester</span><small>Reference sources without original attachments remain in Research & sources until an original file is supplied.</small></div>
      </div>
    </div>

    <Panel title="Submission records" action={<StatusTag tone="amber">{submissionRows.filter(row => row.attachedCount === 0).length} awaiting files</StatusTag>}>
      <p className="body-copy submission-intro">These are the submission titles supplied for the project. An entry becomes a linked archive record once the original file is attached; no placeholder is treated as an uploaded document.</p>
      <div className="submission-record-list">
        {submissionRows.map((record, index) => <div className="submission-record" key={record.title}>
          <span className="submission-record-number">{String(index + 1).padStart(2, '0')}</span>
          <div className="submission-record-copy"><strong>{record.title}</strong><small>{record.title === 'IEEE Paper Submission Folder' ? 'Folder · multiple documents may be attached' : 'Submission record'}</small></div>
          <StatusTag tone={record.attachedCount ? 'green' : 'amber'}>{record.attachedCount ? `${record.attachedCount} file${record.attachedCount === 1 ? '' : 's'} attached` : 'Awaiting file'}</StatusTag>
          {isMember ? <Button size="sm" variant="secondary" onClick={() => openUpload(record.title)}>{record.title === 'IEEE Paper Submission Folder' ? 'Add documents' : record.attachedCount ? 'Attach another' : 'Attach file'}</Button> : <Link to="/login" className="button button-quiet button-sm">Member upload <LockKeyhole size={12}/></Link>}
        </div>)}
      </div>
    </Panel>
    {uploadOpen && <UploadModal initialTitle={uploadTitle} onClose={() => { setUploadOpen(false); setUploadTitle(undefined); }} onUploaded={() => { void files.refresh(); }}/ >}
  </>;
}

export function FileDetailsPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { isMember } = useAuth();
  const [file,setFile]=useState<DocumentRecord|null>(null);const [loading,setLoading]=useState(true);const [error,setError]=useState('');
  const [editing,setEditing]=useState(false);const [saving,setSaving]=useState(false);const [form,setForm]=useState({title:'',description:'',category:'generation',tags:'',visibility:'private' as 'public'|'private'});
  const refresh=async()=>{setLoading(true);try{const record=await getDocument(id);setFile(record);if(record)setForm({title:record.title,description:record.description||'',category:record.category,tags:record.tags.join(', '),visibility:record.visibility});}catch(e){setError(e instanceof Error?e.message:'Could not load file.');}finally{setLoading(false);}};
  useEffect(()=>{void refresh();},[id]);
  const save=async(e:FormEvent)=>{e.preventDefault();if(!file)return;setSaving(true);setError('');try{await updateDocument(file.id,{title:form.title,description:form.description,category:form.category,tags:form.tags.split(',').map(x=>x.trim()).filter(Boolean),visibility:form.visibility});setEditing(false);await refresh();}catch(err){setError(err instanceof Error?err.message:'Could not update file.');}finally{setSaving(false);}};
  const remove=async()=>{if(!file||!window.confirm(`Delete ${file.file_name} from the archive? This cannot be undone.`))return;setSaving(true);try{await deleteDocument(file);navigate('/files');}catch(err){setError(err instanceof Error?err.message:'Could not delete file.');}finally{setSaving(false);}};
  if(loading)return <LoadingPage/>;
  if(error&&!file)return <ErrorPanel message={error}/>;
  if(!file)return <EmptyState title="File not found" description="This file may have been removed or is not publicly available."/>;
  return <>
    <PageHeader eyebrow="Files & resources / File details" title={file.title} description={file.description || 'No description supplied.'} action={<div className="button-row"><FileActions file={file}/>{isMember&&<Button variant="secondary" onClick={()=>setEditing(x=>!x)}>{editing?'Cancel edit':'Edit details'}</Button>}</div>}/>
    {error&&<p className="field-error">{error}</p>}
    {editing&&isMember&&<Panel title="Edit file details"><form className="form-grid" onSubmit={save}>
      <label className="field-full">Title<input required value={form.title} onChange={e=>setForm(x=>({...x,title:e.target.value}))}/></label>
      <label>Category<select value={form.category} onChange={e=>setForm(x=>({...x,category:e.target.value}))}>{categories.map(c=><option key={c.slug} value={c.slug}>{c.title}</option>)}</select></label>
      <label>Visibility<select value={form.visibility} onChange={e=>setForm(x=>({...x,visibility:e.target.value as 'public'|'private'}))}><option value="private">Private · members only</option><option value="public">Public · everyone can view</option></select></label>
      <label className="field-full">Description<textarea rows={3} value={form.description} onChange={e=>setForm(x=>({...x,description:e.target.value}))}/></label>
      <label className="field-full">Tags<input value={form.tags} onChange={e=>setForm(x=>({...x,tags:e.target.value}))} placeholder="official source, fieldwork"/></label>
      <div className="modal-footer field-full"><Button type="button" variant="danger" onClick={()=>void remove()} disabled={saving}>Delete file</Button><div><Button type="button" variant="secondary" onClick={()=>setEditing(false)}>Cancel</Button><Button type="submit" disabled={saving}>{saving?'Saving…':'Save changes'}</Button></div></div>
    </form></Panel>}
    <div className="details-grid"><div>
      <Panel title="File information"><div className="meta-grid"><MetaRow label="Filename" value={file.file_name}/><MetaRow label="Format" value={fileTypeLabel(file.mime_type,file.file_name)}/><MetaRow label="Size" value={formatBytes(file.file_size)}/><MetaRow label="Uploaded" value={formatDate(file.created_at)}/><MetaRow label="Category" value={categoryTitle(file.category)}/><MetaRow label="Visibility" value={file.visibility}/><MetaRow label="Version" value={file.version || 'Not set'}/><MetaRow label="Semester" value={file.semester || 'Not set'}/></div></Panel>
      <Panel title="Description"><p className="body-copy">{file.description || 'No description supplied.'}</p><div className="tag-row">{file.tags.map(tag=><StatusTag key={tag}>{tag}</StatusTag>)}</div></Panel>
      <Panel title="Related records"><p className="muted">No related activity or source has been linked yet.</p></Panel>
    </div><aside><Panel title="Access"><StatusTag tone={file.visibility==='public'?'green':'amber'}>{file.visibility==='public'?'Publicly viewable':'Project members only'}</StatusTag><div className="button-stack"><FileActions file={file}/></div></Panel><Panel title="Version history"><p className="muted">Current version: {file.version || '1.0'}</p><p className="small muted">Version history is recorded as new revisions are attached by project members.</p></Panel></aside></div>
  </>;
}

export function ActivitiesPage() {
  const {isMember}=useAuth();const items=useLoad(listActivities,[] as ActivityRecord[]);const [open,setOpen]=useState(false);const [query,setQuery]=useState('');const [kind,setKind]=useState('all');
  const filtered=items.data.filter(x=>(!query||`${x.title} ${x.description||''}`.toLowerCase().includes(query.toLowerCase()))&&(kind==='all'||x.activity_type===kind));
  return <>
    <PageHeader eyebrow="Project documentation / chronological archive" title="Activity log" description="A traceable record of research, meetings, fieldwork and documentation. Proposed work belongs outside the completed activity feed." action={isMember?<Button onClick={()=>setOpen(true)}><Plus size={15}/>Add an activity</Button>:<Link to="/login" className="button button-primary"><LockKeyhole size={14}/>Member sign in</Link>}/>
    <div className="search-filter-row"><div className="search-field"><Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search activity titles, descriptions or categories"/></div><select value={kind} onChange={e=>setKind(e.target.value)}><option value="all">Activity type</option>{['Research','Meeting','Fieldwork','Analysis','Documentation','Presentation','Review','Outreach'].map(x=><option key={x}>{x}</option>)}</select></div>
    <Panel title="Logged activities">{items.loading?<LoadingRows/>:filtered.length?<div className="timeline">{filtered.map(item=><ActivityRow key={item.id} item={item} onChanged={() => void items.refresh()}/>)}</div>:<EmptyState icon={<Activity size={22}/>} title="No logged activities" description="The archive is empty. Add an activity to record research, meetings or fieldwork." action={isMember?<Button onClick={()=>setOpen(true)}>Add an activity</Button>:undefined}/>}</Panel>
    {!items.data.length&&<Panel title="Suggested first steps"><div className="suggested-list">{['Set the semester and academic context','Attach and verify the original reference documents','Confirm the collection directory entries','Define the first source-linked research questions'].map((x,i)=><div key={i}><span>{String(i+1).padStart(2,'0')}</span>{x}<StatusTag tone="amber">Proposed</StatusTag></div>)}</div></Panel>}
    {open&&<AddActivityModal onClose={()=>setOpen(false)} onSaved={()=>void items.refresh()}/>}
  </>;
}

export function ResearchPage() {
  const {isMember}=useAuth();const data=useLoad(listSources,seedSources as SourceRecord[]);const [open,setOpen]=useState(false);const [query,setQuery]=useState('');const [status,setStatus]=useState('all');
  const filtered=data.data.filter(source=>(!query||`${source.title} ${source.publisher||''} ${source.description||''}`.toLowerCase().includes(query.toLowerCase()))&&(status==='all'||source.verification_status===status));
  return <>
    <PageHeader eyebrow="Evidence library" title="Research & sources" description="Keep published material separate from project notes and assumptions. Follow the evidence back to its origin." action={isMember?<Button onClick={()=>setOpen(true)}><Plus size={15}/>Add a research source</Button>:<Link to="/login" className="button button-primary"><LockKeyhole size={14}/>Member sign in</Link>}/>
    <div className="search-filter-row"><div className="search-field"><Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search reference titles, publishers or findings"/></div><select value={status} onChange={e=>setStatus(e.target.value)}><option value="all">Verification status</option><option>Pending verification</option><option>Verified</option><option>Not verified</option></select></div>
    <div className="tag-row"><StatusTag>Government</StatusTag><StatusTag>PCB</StatusTag><StatusTag>CPCB</StatusTag><StatusTag>MoEFCC</StatusTag><StatusTag>Papers</StatusTag><StatusTag>News</StatusTag><StatusTag>Company</StatusTag><StatusTag>Directory</StatusTag></div>
    <Notice tone="warning"><strong>Reference leads, not attached publications.</strong><br/>The following sources were supplied in the project brief. Original documents and URLs should be checked before treating them as verified project attachments.</Notice>
    <Panel title="Brief-supplied reference leads">{data.loading?<LoadingRows/>:<div className="source-list">{filtered.map(source=><SourceRow key={source.id} source={source}/>)}</div>}{data.error&&<p className="field-error">{data.error}</p>}</Panel>
    <Panel title="Project notes"><EmptyState title="No project notes recorded" description="Capture your own observations here. Label assumptions separately from excerpts of published material."/></Panel>
    {open&&<AddSourceModal onClose={()=>setOpen(false)} onSaved={()=>void data.refresh()}/>}
  </>;
}

export function OrganisationsPage() {
  const data=useLoad(listOrganisations,seedOrganisations as OrganisationRecord[]);const [query,setQuery]=useState('');const [city,setCity]=useState('all');
  const filtered=data.data.filter(org=>(!query||`${org.name} ${org.address||''} ${org.location||''}`.toLowerCase().includes(query.toLowerCase()))&&(city==='all'||org.location===city));
  return <>
    <PageHeader eyebrow="Connection directory" title="Organisations" description="Directory-listed Nagaland collection connections. A listing is not evidence of current operation, recycler authorisation or processing capacity."/>
    <div className="search-filter-row"><div className="search-field"><Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search organisation, locality or address"/></div><select value={city} onChange={e=>setCity(e.target.value)}><option value="all">Location · All</option><option>Kohima</option><option>Dimapur</option></select></div>
    <div className="tag-row"><StatusTag tone="blue">Collection connections</StatusTag><StatusTag>Recyclers</StatusTag><StatusTag>Logistics</StatusTag><StatusTag>EPR</StatusTag><StatusTag>Government</StatusTag></div>
    <Notice tone="warning"><strong>Directory-listed does not mean independently verified.</strong><br/>Original directory references are required. Address, current operation, contact details, capabilities and authorisation status need primary-source confirmation.</Notice>
    <Panel title="Supplied collection connections">{filtered.map(org=><OrganisationCard key={org.id} org={org}/>)}</Panel>
    <p className="small muted">Other types are available for future records, but no entries have been seeded for them. Collection points and recyclers remain separate classifications.</p>
  </>;
}

export function DeliverablesPage() {
  const {isMember}=useAuth();const data=useLoad(listDeliverables,[] as DeliverableRecord[]);
  return <>
    <PageHeader eyebrow="Proposed submission archive" title="Deliverables" description="A place for the outputs the project intends to develop. These are proposed deliverables, not completed work or uploaded submissions."/>
    <Notice tone="info"><strong>No submissions are assumed.</strong><br/>A deliverable becomes viewable and downloadable only after an original file is attached. Nothing is marked final by default.</Notice>
    <Panel title="Project deliverables">{data.data.map((item,i)=><div className="deliverable-row" key={item.id}><span>{String(i+1).padStart(2,'0')}</span><div><Link to={`/deliverables/${item.id}`}><strong>{item.title}</strong></Link><small>{item.status} · {item.document_id?'File attached':'No file attached'} · {item.version||'Version not set'}</small></div><StatusTag tone={item.status==='Finalised'?'green':item.status==='In progress'?'blue':'amber'}>{item.status}</StatusTag><Link className="button button-secondary button-sm" to={`/deliverables/${item.id}`}>{isMember?'Manage':'Details'}</Link></div>)}</Panel>
    <Panel title="Status legend"><div className="status-legend"><span><StatusTag>Draft</StatusTag><small>Template or initial working file</small></span><span><StatusTag tone="blue">In progress</StatusTag><small>Work actively being developed</small></span><span><StatusTag tone="amber">Under review</StatusTag><small>Submitted for documented review</small></span><span><StatusTag tone="green">Finalised</StatusTag><small>Final version confirmed</small></span></div></Panel>
  </>;
}

export function DeliverableDetailPage() {
  const {id=''}=useParams();const {isMember}=useAuth();const [item,setItem]=useState<DeliverableRecord|null>(null);const [files,setFiles]=useState<DocumentRecord[]>([]);const [loading,setLoading]=useState(true);const [saving,setSaving]=useState(false);const [error,setError]=useState('');
  const [form,setForm]=useState({title:'',description:'',status:'Not started',document_id:'',version:'',visibility:'public'});
  const refresh=async()=>{setLoading(true);try{const [deliverables,documents]=await Promise.all([listDeliverables(),listDocuments()]);const found=deliverables.find(x=>x.id===id)||null;setItem(found);setFiles(documents);if(found)setForm({title:found.title,description:found.description||'',status:found.status,document_id:found.document_id||'',version:found.version||'',visibility:found.visibility});}catch(err){setError(err instanceof Error?err.message:'Could not load deliverable.');}finally{setLoading(false);}};
  useEffect(()=>{void refresh();},[id]);
  const save=async(e:FormEvent)=>{
    e.preventDefault();
    if(!item)return;
    const selectedFile=files.find(file=>file.id===form.document_id);
    if(form.visibility==='public' && selectedFile && selectedFile.visibility!=='public'){
      setError('This deliverable is set to public, but its attached file is private. Publish the file first, or keep the deliverable private.');
      return;
    }
    setSaving(true);setError('');
    try{
      await updateDeliverable(item.id,{title:form.title,description:form.description,status:form.status,document_id:form.document_id||null,version:form.version||null,visibility:form.visibility as 'public'|'private'});
      await refresh();
    }catch(err){setError(err instanceof Error?err.message:'Could not update deliverable.');}
    finally{setSaving(false);}
  };
  if(loading)return <LoadingPage/>;if(!item)return <NotFoundPage/>;
  const attached=files.find(file=>file.id===item.document_id);
  const attachedButNotVisible=Boolean(item.document_id && !attached && !isMember);
  return <>
    <PageHeader eyebrow="Deliverables / record" title={item.title} description={item.description||'A proposed project output. Attach the original working file when it exists.'} action={<Link to="/deliverables" className="button button-secondary">Back to deliverables</Link>}/>
    <div className="details-grid"><div>
      <Panel title="Deliverable file">{attached?<><div className="file-row"><FileText size={18}/><div><strong>{attached.title}</strong><small>{attached.file_name} · {formatBytes(attached.file_size)}</small></div><FileActions file={attached}/></div></>:attachedButNotVisible?<Notice tone="info">An original file is attached to this deliverable, but it is not publicly published. An authorised project member can publish the file or make the deliverable private.</Notice>:<EmptyState icon={<FileText size={20}/>} title="No file attached" description="The deliverable is not available to view or download until an original file is attached."/>}</Panel>
      <Panel title="Proposed structure"><p className="body-copy">Keep the source methodology, supporting files, version notes and completion evidence together. A status change should reflect an actual project update.</p></Panel>
    </div><aside>
      <Panel title="Archive metadata"><MetaRow label="Status" value={item.status}/><MetaRow label="Version" value={item.version||'Not set'}/><MetaRow label="Visibility" value={item.visibility}/><MetaRow label="Last updated" value={formatDate(item.updated_at)}/></Panel>
      {isMember?<Panel title="Update deliverable"><form className="form-grid" onSubmit={save}>
        <label className="field-full">Title<input value={form.title} onChange={e=>setForm(x=>({...x,title:e.target.value}))}/></label>
        <label className="field-full">Description<textarea rows={3} value={form.description} onChange={e=>setForm(x=>({...x,description:e.target.value}))}/></label>
        <label className="field-full">Status<select value={form.status} onChange={e=>setForm(x=>({...x,status:e.target.value}))}>{['Not started','Draft','In progress','Under review','Finalised','Archived'].map(x=><option key={x}>{x}</option>)}</select></label>
        <label className="field-full">Attach a file<select value={form.document_id} onChange={e=>setForm(x=>({...x,document_id:e.target.value}))}><option value="">No file attached</option>{files.map(file=><option key={file.id} value={file.id}>{file.title} · {file.file_name}</option>)}</select></label>
        <label>Version<input value={form.version} onChange={e=>setForm(x=>({...x,version:e.target.value}))} placeholder="e.g. 1.0"/></label>
        <label>Visibility<select value={form.visibility} onChange={e=>setForm(x=>({...x,visibility:e.target.value}))}><option value="private">Private</option><option value="public">Public</option></select></label>
        {error&&<p className="field-error field-full">{error}</p>}
        <div className="field-full button-row"><Button type="submit" disabled={saving}>{saving?'Saving…':'Save deliverable'}</Button></div>
      </form></Panel>:<Notice tone="info">Only authorised project members can update deliverable status or attach files.</Notice>}
    </aside></div>
  </>;
}

export function AboutPage() {
  const { isMember } = useAuth();
  const settings = useLoad(getProjectSettings, null as ProjectSettingsRecord | null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({
    project_title: 'Nagaland E-Waste Management Tracker', semester: '', academic_year: '', project_status: '', about_text: '',
    owner_name: '', owner_programme: '', owner_department: '', institution: '', public_contact: '',
  });
  useEffect(() => {
    if (settings.data) setForm({
      project_title: settings.data.project_title || 'Nagaland E-Waste Management Tracker', semester: settings.data.semester || '',
      academic_year: settings.data.academic_year || '', project_status: settings.data.project_status || '', about_text: settings.data.about_text || '',
      owner_name: settings.data.owner_name || '', owner_programme: settings.data.owner_programme || '', owner_department: settings.data.owner_department || '',
      institution: settings.data.institution || '', public_contact: settings.data.public_contact || '',
    });
  }, [settings.data]);
  const change = (key: string, value: string) => setForm(current => ({ ...current, [key]: value }));
  const save = async (e: FormEvent) => {
    e.preventDefault(); setSaving(true); setMessage('');
    try {
      await saveProjectSettings(form);
      await settings.refresh();
      window.dispatchEvent(new Event('project-settings-updated'));
      setEditing(false);
      setMessage('Project details updated.');
    }
    catch (err) { setMessage(err instanceof Error ? err.message : 'Could not save project details.'); }
    finally { setSaving(false); }
  };
  useEffect(() => {
    if (editing) window.setTimeout(() => document.getElementById('project-details-edit-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
  }, [editing]);
  return <>
    <PageHeader eyebrow="Academic research repository / semester documentation archive" title={form.project_title || 'Nagaland E-Waste Management Tracker'} description="A semester-long academic project workspace for organising research on e-waste management in Nagaland, recording project work and maintaining a traceable documentation archive." action={isMember ? <Button variant="secondary" onClick={() => setEditing(x => !x)}>{editing ? 'Cancel editing' : 'Edit project details'}</Button> : undefined}/>
    {message && <Notice tone={message.includes('updated') ? 'success' : 'warning'}>{message}</Notice>}
    {editing && isMember && <Panel title="Edit project and owner details"><form id="project-details-edit-form" className="form-grid" onSubmit={save}>
      <label className="field-full">Project title<input value={form.project_title} onChange={e => change('project_title', e.target.value)}/></label>
      <label>Semester<input value={form.semester} onChange={e => change('semester', e.target.value)} placeholder="e.g. Semester 5"/></label>
      <label>Academic year<input value={form.academic_year} onChange={e => change('academic_year', e.target.value)} placeholder="e.g. 2026–27"/></label>
      <label>Project status<input value={form.project_status} onChange={e => change('project_status', e.target.value)} placeholder="e.g. In progress"/></label>
      <label>Institution<input value={form.institution} onChange={e => change('institution', e.target.value)} placeholder="Your institution"/></label>
      <label>Programme<input value={form.owner_programme} onChange={e => change('owner_programme', e.target.value)} placeholder="Your programme"/></label>
      <label>Department<input value={form.owner_department} onChange={e => change('owner_department', e.target.value)} placeholder="Your department"/></label>
      <label>Project owner<input value={form.owner_name} onChange={e => change('owner_name', e.target.value)} placeholder="Your name"/></label>
      <label>Public contact (optional)<input value={form.public_contact} onChange={e => change('public_contact', e.target.value)} placeholder="Optional email"/></label>
      <label className="field-full">Project overview<textarea rows={3} value={form.about_text} onChange={e => change('about_text', e.target.value)} placeholder="Describe the project in your own words."/></label>
      <div className="modal-footer field-full"><span className="small muted">Only authorised members can edit this information.</span><Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save details'}</Button></div>
    </form></Panel>}
    <div className="about-top-grid"><Panel title="The problem we propose to study"><p className="body-copy">{form.about_text || 'Understanding e-waste management requires more than isolated quantities. Definitions, source provenance, collection connections and downstream evidence need to be documented consistently before meaningful conclusions can be drawn.'}</p><p className="body-copy">The supplied reference leads contain unresolved terminology. This workspace makes those limitations visible rather than presenting an unsupported performance assessment.</p></Panel><Panel title="Academic context"><MetaRow label="Semester" value={form.semester || 'Not set'}/><MetaRow label="Academic year" value={form.academic_year || 'Not set'}/><MetaRow label="Programme" value={form.owner_programme || 'Not supplied'}/><MetaRow label="Department" value={form.owner_department || 'Not supplied'}/><MetaRow label="Institution" value={form.institution || 'Not supplied'}/><MetaRow label="Project status" value={form.project_status || 'Not set'}/></Panel></div>
    <Panel title="Project objectives"><div className="objective-list">{['Build a transparent, source-linked state-wise tracker.','Document the limits of available generation, collection and treatment evidence.','Maintain a semester archive of research, activities and deliverables.','Develop proposed outputs without overstating verification or completed work.'].map((x,i)=><div key={i}><span>{String(i+1).padStart(2,'0')}</span>{x}</div>)}</div></Panel>
    <Panel title="Scope"><p className="body-copy">Generation & inventory · Collection performance · Formal recycling & treatment · Regulatory compliance · Informal sector integration · Environmental & health safeguards · Awareness & outreach.</p></Panel>
    <Panel title="Proposed methodology"><div className="method-grid"><div><StatusTag tone="amber">Proposed</StatusTag><strong>Locate & verify</strong><p>Obtain original publications and check definitions, dates and reporting boundaries.</p></div><div><StatusTag tone="amber">Proposed</StatusTag><strong>Organise & document</strong><p>Link evidence to categories, keep notes and distinguish separate source types.</p></div><div><StatusTag tone="amber">Proposed</StatusTag><strong>Review & synthesise</strong><p>Identify supported findings, record gaps and prepare proposed deliverables.</p></div></div></Panel>
    <Notice tone="info"><strong>Expected outcomes / proposed, not achieved.</strong><br/>A source-linked state tracker, an evidence-aware scorecard, a collection connection directory, a research report and a structured semester documentation archive. No research, fieldwork or deliverable completion is claimed.</Notice>
    <Panel title="Project owner" action={isMember ? <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>Edit owner details</Button> : undefined}><div className="profile-placeholder"><div className="profile-photo"><Users size={23}/><small>Photo optional</small></div><div><strong>{form.owner_name || 'Project owner not set'}</strong><p>{[form.owner_programme, form.owner_department, form.institution].filter(Boolean).join(' · ') || 'Your programme · Your department · Your institution'}</p><small className="muted">{form.public_contact || 'No public contact supplied'}</small></div></div>{!form.owner_name && <p className="small muted">Use Edit owner details to add your name, programme, department and institution. Public contact information is optional.</p>}</Panel>
    <p className="small muted">{settings.error}</p>
  </>;
}

export function SettingsPage() {
  const {isMember,isAdmin,configured,user,signOut}=useAuth();
  const settings = useLoad(getProjectSettings, null as ProjectSettingsRecord | null);
  const [form, setForm] = useState({
    project_title: 'Nagaland E-Waste Management Tracker',
    semester: '',
    academic_year: '',
    project_status: 'In progress',
    about_text: '',
    owner_name: '',
    owner_programme: '',
    owner_department: '',
    institution: '',
    public_contact: '',
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!settings.data) return;
    setForm({
      project_title: settings.data.project_title || 'Nagaland E-Waste Management Tracker',
      semester: settings.data.semester || '',
      academic_year: settings.data.academic_year || '',
      project_status: settings.data.project_status || 'In progress',
      about_text: settings.data.about_text || '',
      owner_name: settings.data.owner_name || '',
      owner_programme: settings.data.owner_programme || '',
      owner_department: settings.data.owner_department || '',
      institution: settings.data.institution || '',
      public_contact: settings.data.public_contact || '',
    });
  }, [settings.data]);

  const change = (key: keyof typeof form, value: string) => setForm(current => ({ ...current, [key]: value }));
  const save = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');
    try {
      await saveProjectSettings(form);
      await settings.refresh();
      window.dispatchEvent(new Event('project-settings-updated'));
      setMessage('Project settings saved successfully.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save project settings.');
    } finally {
      setSaving(false);
    }
  };

  return <>
    <PageHeader eyebrow="Workspace configuration" title="Settings" description="Manage project identity, academic context and public archive preferences."/>
    <Panel title="Public access"><Notice tone="info">The website is designed for public browsing. Uploading and editing require an authorised project-member account. Newly uploaded files default to private until a member explicitly publishes them.</Notice></Panel>
    <Panel title="Account"><MetaRow label="Signed in as" value={user?.email||'Not signed in'}/><MetaRow label="Permission" value={isAdmin?'Administrator':isMember?'Project member':'Public visitor'}/><MetaRow label="Database" value={configured?'Supabase connected':'Not configured'}/><div className="button-row">{user?<Button variant="secondary" onClick={()=>void signOut()}>Sign out</Button>:<Link className="button button-primary" to="/login">Member sign in</Link>}</div></Panel>
    <Panel title="Semester & project details">
      <p className="body-copy">Set the active semester and academic context here. The semester selector in the top bar is connected to this saved setting.</p>
      {settings.error && <p className="field-error">{settings.error}</p>}
      {isMember ? <form className="form-grid" onSubmit={save}>
        <label className="field-full">Project title<input value={form.project_title} onChange={event => change('project_title', event.target.value)} placeholder="Project title"/></label>
        <label>Semester<select value={form.semester} onChange={event => change('semester', event.target.value)}>
          <option value="">Select semester</option>
          {Array.from({ length: 8 }, (_, index) => `Semester ${index + 1}`).map(option => <option key={option} value={option}>{option}</option>)}
          {form.semester && !/^Semester [1-8]$/.test(form.semester) && <option value={form.semester}>{form.semester}</option>}
        </select></label>
        <label>Academic year<input value={form.academic_year} onChange={event => change('academic_year', event.target.value)} placeholder="e.g. 2026–27"/></label>
        <label>Project status<select value={form.project_status} onChange={event => change('project_status', event.target.value)}><option>Planning</option><option>In progress</option><option>Under review</option><option>Completed</option><option>On hold</option></select></label>
        <label>Institution<input value={form.institution} onChange={event => change('institution', event.target.value)} placeholder="Your institution"/></label>
        <label>Project owner<input value={form.owner_name} onChange={event => change('owner_name', event.target.value)} placeholder="Your name"/></label>
        <label>Programme<input value={form.owner_programme} onChange={event => change('owner_programme', event.target.value)} placeholder="e.g. B.Tech Computer Engineering"/></label>
        <label>Department<input value={form.owner_department} onChange={event => change('owner_department', event.target.value)} placeholder="e.g. Computer Engineering"/></label>
        <label>Public contact (optional)<input value={form.public_contact} onChange={event => change('public_contact', event.target.value)} placeholder="Optional public email"/></label>
        <label className="field-full">Project overview<textarea rows={3} value={form.about_text} onChange={event => change('about_text', event.target.value)} placeholder="Briefly describe the project."/></label>
        {message && <Notice tone="success">{message}</Notice>}
        {error && <p className="field-error field-full">{error}</p>}
        <div className="field-full button-row"><span className="small muted">Only authorised project members can edit these details. Public contact is optional.</span><Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save project details'}</Button></div>
      </form> : <Notice tone="info">Sign in with an authorised project-member account to edit semester and project-owner details.</Notice>}
    </Panel>
    <Panel title="Deployment setup"><ol className="next-list"><li>Create a Supabase project and run the SQL migration included with this codebase.</li><li>Add the Supabase URL and publishable/anon key to Netlify environment variables.</li><li>Invite project members and add their user IDs to the project_members table.</li><li>Deploy the Vite build on Netlify.</li></ol></Panel>
  </>;
}

export function SearchPage() {
  const [params]=useSearchParams();const query=params.get('q')||'';
  const docs=useLoad(listDocuments,[] as DocumentRecord[]);const sources=useLoad(listSources,seedSources as SourceRecord[]);const orgs=useLoad(listOrganisations,seedOrganisations as OrganisationRecord[]);const activities=useLoad(listActivities,[] as ActivityRecord[]);const deliverables=useLoad(listDeliverables,[] as DeliverableRecord[]);
  const q=query.toLowerCase();
  const matchedDocs=docs.data.filter(x=>`${x.title} ${x.file_name} ${x.description||''} ${x.tags.join(' ')}`.toLowerCase().includes(q));
  const matchedSources=sources.data.filter(x=>`${x.title} ${x.publisher||''} ${x.description||''}`.toLowerCase().includes(q));
  const matchedOrgs=orgs.data.filter(x=>`${x.name} ${x.location||''} ${x.address||''}`.toLowerCase().includes(q));
  const matchedActivities=activities.data.filter(x=>`${x.title} ${x.description||''} ${x.activity_type}`.toLowerCase().includes(q));
  const matchedDeliverables=deliverables.data.filter(x=>`${x.title} ${x.description||''} ${x.status}`.toLowerCase().includes(q));
  return <><PageHeader eyebrow="Global search" title={query?`Results for “${query}”`:'Search the workspace'} description="Search across files, source references, organisations, activities and deliverables."/>
    <Panel title={`Files · ${matchedDocs.length}`}>{matchedDocs.length?matchedDocs.map(x=><FileRow key={x.id} file={x}/>):<p className="muted small">No matching uploaded files.</p>}</Panel>
    <Panel title={`Research sources · ${matchedSources.length}`}>{matchedSources.length?matchedSources.map(x=><SourceRow key={x.id} source={x}/>):<p className="muted small">No matching source references.</p>}</Panel>
    <Panel title={`Organisations · ${matchedOrgs.length}`}>{matchedOrgs.length?matchedOrgs.map(x=><OrganisationCard key={x.id} org={x}/>):<p className="muted small">No matching organisations.</p>}</Panel>
    <Panel title={`Activities · ${matchedActivities.length}`}>{matchedActivities.length?matchedActivities.map(x=><ActivityRow key={x.id} item={x}/>):<p className="muted small">No matching activities.</p>}</Panel>
    <Panel title={`Deliverables · ${matchedDeliverables.length}`}>{matchedDeliverables.length?matchedDeliverables.map(x=><div className="deliverable-row" key={x.id}><span>↗</span><div><strong>{x.title}</strong><small>{x.status} · {x.description||'No description supplied.'}</small></div></div>):<p className="muted small">No matching deliverables.</p>}</Panel>
  </>;
}

export function LoginPage() {
  const {configured,signIn,user,isMember}=useAuth();const [email,setEmail]=useState('');const [password,setPassword]=useState('');const [error,setError]=useState('');const [busy,setBusy]=useState(false);const navigate=useNavigate();
  const submit=async(e:FormEvent)=>{e.preventDefault();setBusy(true);setError('');const result=await signIn(email,password);setBusy(false);if(result.error)setError(result.error);else navigate('/');};
  return <div className="auth-page"><div className="auth-card"><div className="brand-mark large"><Recycle size={24}/></div><p className="eyebrow">Project member access</p><h1>Sign in to contribute.</h1><p className="muted">The workspace is publicly viewable. Only authorised members can upload files or edit project records.</p>{user&&<Notice tone={isMember?'success':'warning'}>{isMember?'You are signed in as an authorised member.':'This account is signed in but has not been authorised as a project member.'}</Notice>}{!configured&&<Notice tone="warning">Supabase authentication is not configured yet. Add the environment variables before enabling member access.</Notice>}<form onSubmit={submit} className="auth-form"><label>Email address<input type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)}/></label><label>Password<input type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)}/></label>{error&&<p className="field-error">{error}</p>}<Button type="submit" disabled={busy||!configured}>{busy?'Signing in…':'Sign in'}</Button></form><Link to="/" className="text-link">Return to public workspace <ArrowRight size={13}/></Link></div></div>;
}

export function OrganisationDetailPage() {
  const {id=''}=useParams();const data=useLoad(listOrganisations,seedOrganisations as OrganisationRecord[]);const org=data.data.find(x=>x.id===id);
  if(data.loading)return <LoadingPage/>;if(!org)return <NotFoundPage/>;
  return <><PageHeader eyebrow={`Organisations / ${org.location}`} title={org.name} description={org.address||'Address not supplied.'}/><Notice tone="warning">Directory-listed collection connection. No recycling authorisation, current operating status or processing capacity is claimed.</Notice><div className="two-col-bottom"><Panel title="Directory information"><MetaRow label="Classification" value={org.organisation_type}/><MetaRow label="Location" value={org.location||'Not supplied'}/><MetaRow label="Address" value={org.address||'Not supplied'}/><MetaRow label="Verification" value={org.verification_status}/></Panel><Panel title="Contacts & capabilities"><MetaRow label="Contact" value={org.contact_name||'Not verified'}/><MetaRow label="Phone" value={org.phone||'Not supplied'}/><MetaRow label="Email" value={org.email||'Not verified'}/><MetaRow label="Authorisation" value="Not verified"/>{org.website&&<ExternalLink href={org.website}>Open directory source</ExternalLink>}</Panel></div><Panel title="Verification history"><EmptyState title="No verification history yet" description="Record checks only after the original directory or primary evidence has been reviewed."/></Panel></>;
}

export function NotFoundPage() { return <EmptyState title="This page could not be found" description="The page may have moved. Return to the project overview." action={<Link className="button button-primary" to="/">Go to overview</Link>}/>; }

function FileCard({file}:{file:DocumentRecord}) {
  return <article className="file-card"><div className="file-card-icon">{fileTypeLabel(file.mime_type,file.file_name)==='Image'?<ImageIcon size={19}/>:<FileText size={19}/>}</div><div className="file-card-main"><div className="file-title-line"><Link to={`/files/${file.id}`}><strong>{file.title}</strong></Link><StatusTag>{fileTypeLabel(file.mime_type,file.file_name)}</StatusTag>{file.visibility==='private'&&<StatusTag tone="amber">Private</StatusTag>}<button className={`pin-button ${isFilePinned(file.id)?'pinned':''}`} title={isFilePinned(file.id)?'Remove pin':'Pin on this device'} onClick={()=>togglePinnedFile(file.id)}><Pin size={13}/></button></div><p>{file.description||file.file_name}</p><div className="file-meta"><span>{formatBytes(file.file_size)}</span><span>{formatDate(file.created_at)}</span><span>{categoryTitle(file.category)}</span>{file.tags.map(tag=><StatusTag key={tag}>{tag}</StatusTag>)}</div></div><div className="file-card-actions"><FileActions file={file}/><Link to={`/files/${file.id}`} className="button button-quiet button-sm">Details</Link></div></article>;
}

function FileRow({file}:{file:DocumentRecord}) {
  return <div className="file-row"><FileText size={17}/><div><Link to={`/files/${file.id}`}><strong>{file.title}</strong></Link><small>{file.file_name} · {formatBytes(file.file_size)}</small></div><span className="muted small">{formatDate(file.created_at)}</span><FileActions file={file}/></div>;
}

function FileActions({file}:{file:DocumentRecord}) {
  const [busy,setBusy]=useState(false);const [error,setError]=useState('');
  const view=async()=>{rememberFileOpened(file.id);const target=window.open('about:blank','_blank');if(!target){setError('Allow pop-ups to open the file in a new tab.');return;}setBusy(true);try{target.location.href=`/files/${file.id}/preview`;}catch{target.close();setError('Could not open file preview.');}finally{setBusy(false);}};
  const download=async()=>{setBusy(true);setError('');try{const url=await createDocumentUrl(file,true);const anchor=document.createElement('a');anchor.href=url;anchor.download=file.file_name;document.body.appendChild(anchor);anchor.click();anchor.remove();}catch(err){setError(err instanceof Error?err.message:'Download failed.');}finally{setBusy(false);}};
  return <div className="file-actions"><button className="button button-secondary button-sm" onClick={()=>void view()} disabled={busy||!canPreviewFile(file)} title={!canPreviewFile(file)?'Preview is not supported for this format. Open details to download.':'Open in a new tab'}><Eye size={13}/>View</button><button className="button button-secondary button-sm" onClick={()=>void download()} disabled={busy}><Download size={13}/>Download</button>{error&&<span className="field-error action-error">{error}</span>}</div>;
}

function SourceRow({source}:{source:SourceRecord}) {
  return <div className="source-row"><BookOpen size={17}/><div className="source-main"><strong>{source.title}</strong><p>{source.description}</p><div className="tag-row"><StatusTag tone="amber">{source.verification_status}</StatusTag><StatusTag>{source.source_type}</StatusTag>{source.category&&<StatusTag tone="blue">{categoryTitle(source.category)}</StatusTag>}</div></div><div className="source-actions">{source.url?<ExternalLink href={source.url}>Open source</ExternalLink>:<StatusTag tone="amber">URL not supplied</StatusTag>}</div></div>;
}

function ActivityRow({item,onChanged}:{item:ActivityRecord;onChanged?:()=>void}) {
  const {isMember}=useAuth();const [editing,setEditing]=useState(false);
  return <><div className="activity-row"><div className="activity-marker"/><div className="activity-main"><div className="activity-heading"><strong>{item.title}</strong><StatusTag>{item.activity_type}</StatusTag></div><p>{item.description||'No description supplied.'}</p><small>{formatDate(item.activity_date)} · {item.category?categoryTitle(item.category):'No category'}</small></div><StatusTag tone={item.status==='Completed'?'green':'amber'}>{item.status}</StatusTag>{isMember&&<button className="text-button" onClick={()=>setEditing(true)}>Edit</button>}</div>{editing&&<EditActivityModal item={item} onClose={()=>setEditing(false)} onSaved={()=>onChanged?.()}/>}</>;
}

function OrganisationCompactList({items}:{items:OrganisationRecord[]}) {
  return <div className="organisation-list">{items.map(org=><OrganisationCard key={org.id} org={org}/>)}</div>;
}

function OrganisationCard({org}:{org:OrganisationRecord}) {
  return <Link to={`/organisations/${org.id}`} className="organisation-card"><div className="organisation-icon"><Users size={18}/></div><div className="organisation-main"><strong>{org.name}</strong><p>{org.address||org.location}</p><div className="tag-row"><StatusTag>{org.organisation_type}</StatusTag><StatusTag tone="amber">{org.verification_status}</StatusTag></div></div><div className="organisation-location"><strong>{org.location}</strong><small>Contact / capability</small><small>{org.phone||'Not verified'}</small></div><ArrowUpRight size={15}/></Link>;
}

function ProjectNotes({category}:{category:string}) {
  const {isMember}=useAuth();
  const [notes,setNotes]=useState<Array<{id:string;text:string;created_at?:string}>>([]);
  const [text,setText]=useState('');const [saving,setSaving]=useState(false);const [error,setError]=useState('');const [loading,setLoading]=useState(true);
  const refresh=async()=>{setLoading(true);try{const rows=await listProjectNotes(category);setNotes(rows.map(row=>({id:row.id,text:row.body,created_at:row.created_at})));}catch(err){setError(err instanceof Error?err.message:'Could not load notes.');}finally{setLoading(false);}};
  useEffect(()=>{void refresh();},[category]);
  const save=async()=>{if(!text.trim())return;if(!supabase){setError('Connect Supabase to save project notes.');return;}setSaving(true);setError('');try{const {data:{user}}=await supabase.auth.getUser();const {data,error:dbError}=await supabase.from('project_notes').insert({category,body:text.trim(),visibility:'private',created_by:user?.id}).select('id,body,created_at').single();if(dbError)throw dbError;setNotes(current=>[{id:data.id,text:data.body,created_at:data.created_at},...current]);setText('');}catch(err){setError(err instanceof Error?err.message:'Could not save note.');}finally{setSaving(false);}};
  return <Panel title="Project notes" action={isMember?<StatusTag tone="blue">Member editing</StatusTag>:<Link className="text-link" to="/login">Sign in to add a note</Link>}>{loading?<LoadingRows/>:notes.length>0&&notes.map(n=><div className="project-note" key={n.id}><p>{n.text}</p>{n.created_at&&<small>{formatDate(n.created_at)}</small>}</div>)}{!loading&&!notes.length&&!isMember&&<EmptyState title="No project notes recorded" description="Capture observations here when you have member access. Keep assumptions separate from published material."/>}{isMember?<div className="note-entry"><textarea value={text} onChange={e=>setText(e.target.value)} rows={3} placeholder="Record an observation. Keep source excerpts and assumptions separate."/><div className="button-row"><Button size="sm" onClick={()=>void save()} disabled={saving||!text.trim()}>{saving?'Saving…':'Add private note'}</Button></div>{error&&<p className="field-error">{error}</p>}</div>:null}</Panel>;
}

function LoadingRows(){return <div className="loading-list"><div/><div/><div/></div>;}
function LoadingPage(){return <div className="loading-screen"><span className="spinner"/><p>Loading workspace…</p></div>;}
function ErrorPanel({message}:{message:string}){return <Notice tone="warning">{message}</Notice>;}
function normaliseSubmissionTitle(value: string) { return value.toLowerCase().replace(/[^a-z0-9]/g, ''); }

function formatBytes(bytes:number){if(bytes<1024)return `${bytes} B`;if(bytes<1048576)return `${(bytes/1024).toFixed(0)} KB`;return `${(bytes/1048576).toFixed(1)} MB`;}
function formatDate(date:string){return new Intl.DateTimeFormat('en-IN',{day:'numeric',month:'short',year:'numeric'}).format(new Date(date));}
function categoryTitle(slug:string){return categories.find(x=>x.slug===slug)?.title||slug;}
