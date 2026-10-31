import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Activity, Archive, BookOpen, ChevronDown, ChevronRight, FileText, FolderOpen, Globe2,
  LayoutDashboard, LogIn, Menu, Recycle, Search, Settings, Users, X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getProjectSettings, saveProjectSettings } from '../lib/api';

const trackerLinks = [
  ['generation', 'Generation & inventory'], ['collection', 'Collection performance'], ['recycling', 'Formal recycling'],
  ['compliance', 'Regulatory compliance'], ['informal-sector', 'Informal sector'], ['environment', 'Environmental safeguards'], ['awareness', 'Awareness & outreach'],
] as const;

export function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [trackerOpen, setTrackerOpen] = useState(true);
  const [query, setQuery] = useState('');
  const [semester, setSemester] = useState('');
  const [semesterLoading, setSemesterLoading] = useState(true);
  const [semesterSaving, setSemesterSaving] = useState(false);
  const [semesterError, setSemesterError] = useState('');
  const { user, isMember, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    let active = true;
    const refreshSemester = async () => {
      try {
        const settings = await getProjectSettings();
        if (active) setSemester(settings?.semester || '');
        if (active) setSemesterError('');
      } catch {
        if (active) setSemesterError('Could not load the saved semester.');
      } finally {
        if (active) setSemesterLoading(false);
      }
    };
    void refreshSemester();
    window.addEventListener('project-settings-updated', refreshSemester);
    return () => {
      active = false;
      window.removeEventListener('project-settings-updated', refreshSemester);
    };
  }, []);

  const updateSemester = async (nextSemester: string) => {
    const previousSemester = semester;
    setSemester(nextSemester);
    setSemesterSaving(true);
    setSemesterError('');
    try {
      const current = await getProjectSettings();
      await saveProjectSettings({
        id: current?.id ?? 1,
        project_title: current?.project_title || 'Nagaland E-Waste Management Tracker',
        semester: nextSemester || null,
        academic_year: current?.academic_year ?? null,
        project_status: current?.project_status ?? 'In progress',
        about_text: current?.about_text ?? null,
        owner_name: current?.owner_name ?? null,
        owner_programme: current?.owner_programme ?? null,
        owner_department: current?.owner_department ?? null,
        institution: current?.institution ?? null,
        public_contact: current?.public_contact ?? null,
      });
      window.dispatchEvent(new Event('project-settings-updated'));
    } catch (error) {
      setSemester(previousSemester);
      setSemesterError(error instanceof Error ? error.message : 'Could not save the semester.');
    } finally {
      setSemesterSaving(false);
    }
  };

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    if (query.trim()) navigate(`/search?q=${encodeURIComponent(query.trim())}`);
  };

  const sidebar = <>
    <div className="brand-lockup">
      <div className="brand-mark"><Recycle size={21}/></div>
      <div><strong>Nagaland E-Waste<br/>Management Tracker</strong><span>Academic project workspace</span></div>
    </div>
    <nav className="side-nav" aria-label="Main navigation">
      <NavLink to="/" end className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}><LayoutDashboard size={16}/>Overview</NavLink>
      <button className={`nav-link nav-parent ${location.pathname.startsWith('/tracker') ? 'active' : ''}`} onClick={() => setTrackerOpen(!trackerOpen)}>
        <Archive size={16}/><span>E-waste tracker</span>{trackerOpen ? <ChevronDown size={14}/> : <ChevronRight size={14}/>}
      </button>
      {trackerOpen && <div className="nav-sublist">{trackerLinks.map(([slug, label]) => <NavLink key={slug} to={`/tracker/${slug}`} className={({ isActive }) => `nav-sub-link ${isActive ? 'active' : ''}`}>{label}</NavLink>)}</div>}
      <NavLink to="/files" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}><FolderOpen size={16}/>Files & resources</NavLink>
      <NavLink to="/activities" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}><Activity size={16}/>Activity log</NavLink>
      <NavLink to="/research" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}><BookOpen size={16}/>Research & sources</NavLink>
      <NavLink to="/organisations" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}><Users size={16}/>Organisations</NavLink>
      <NavLink to="/deliverables" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}><FileText size={16}/>Deliverables</NavLink>
      <NavLink to="/about" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}><Globe2 size={16}/>About</NavLink>
    </nav>
    <div className="sidebar-bottom">
      <NavLink to="/settings" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}><Settings size={16}/>Settings</NavLink>
      {user ? <div className="profile-mini"><div className="avatar">{user.email?.slice(0, 1).toUpperCase()}</div><div className="profile-copy"><strong>{user.email}</strong><span>{isMember ? 'Project member' : 'Signed in · viewer'}</span></div><button title="Sign out" onClick={() => void signOut()}><LogIn size={15}/></button></div> : <NavLink to="/login" className="sign-in-mini"><LogIn size={15}/>Sign in to contribute</NavLink>}
    </div>
  </>;

  return <div className="app-shell">
    <aside className="sidebar desktop-sidebar">{sidebar}</aside>
    {mobileOpen && <div className="mobile-overlay" onClick={() => setMobileOpen(false)}><aside className="sidebar mobile-sidebar" onClick={e => e.stopPropagation()}><button className="mobile-close" onClick={() => setMobileOpen(false)}><X size={18}/></button>{sidebar}</aside></div>}
    <div className="main-column">
      <header className="topbar">
        <button className="mobile-menu-button icon-button" aria-label="Open menu" onClick={() => setMobileOpen(true)}><Menu size={19}/></button>
        <div className="breadcrumbs"><span>Workspace</span><span>/</span><strong>{getSectionName(location.pathname)}</strong></div>
        <div className="topbar-tools">
          <form className="global-search" onSubmit={submitSearch}><Search size={15}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search the workspace" aria-label="Search the workspace"/><kbd>⌘ K</kbd></form>
          {isMember ? (
            <select
              className="topbar-semester"
              value={semester}
              disabled={semesterLoading || semesterSaving}
              onChange={event => void updateSemester(event.target.value)}
              aria-label="Set active semester"
              title={semesterError || (semesterSaving ? 'Saving semester…' : 'Choose the active semester')}
            >
              <option value="">Semester not set</option>
              {Array.from({ length: 8 }, (_, index) => `Semester ${index + 1}`).map(option => <option key={option} value={option}>{option}</option>)}
              {semester && !/^Semester [1-8]$/.test(semester) && <option value={semester}>{semester}</option>}
            </select>
          ) : (
            <NavLink className="topbar-semester" to="/settings">{semester || 'Semester not set'} <ChevronDown size={13}/></NavLink>
          )}
        </div>
      </header>
      <main className="main-content"><Outlet/></main>
    </div>
  </div>;
}

function getSectionName(path: string) {
  if (path === '/') return 'Overview';
  const parts = path.split('/').filter(Boolean);
  const first = parts[0] || 'Overview';
  const names: Record<string, string> = { tracker: 'E-waste tracker', files: 'Files & resources', activities: 'Activity log', research: 'Research & sources', organisations: 'Organisations', deliverables: 'Deliverables', about: 'About', settings: 'Settings', login: 'Sign in', search: 'Search' };
  return names[first] || first;
}
