import { useState } from 'react';
import type { FormEvent } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Activity, Archive, BookOpen, ChevronDown, ChevronRight, FileText, FolderOpen, Globe2,
  LayoutDashboard, LogIn, Menu, Recycle, Search, Settings, Users, X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const trackerLinks = [
  ['generation', 'Generation & inventory'], ['collection', 'Collection performance'], ['recycling', 'Formal recycling'],
  ['compliance', 'Regulatory compliance'], ['informal-sector', 'Informal sector'], ['environment', 'Environmental safeguards'], ['awareness', 'Awareness & outreach'],
] as const;

export function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [trackerOpen, setTrackerOpen] = useState(true);
  const [query, setQuery] = useState('');
  const { user, isMember, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

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
          <NavLink className="topbar-semester" to="/settings">Semester not set <ChevronDown size={13}/></NavLink>
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
