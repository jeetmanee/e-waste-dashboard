import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AppLayout } from './components/AppLayout';
import {
  AboutPage, ActivitiesPage, CategoryPage, DeliverableDetailPage, DeliverablesPage, FileDetailsPage, FilesPage, LoginPage,
  NotFoundPage, OrganisationsPage, OrganisationDetailPage, OverviewPage, ResearchPage, SearchPage,
  SettingsPage, TrackerPage,
} from './pages/Pages';
import { FilePreviewPage } from './pages/FilePreviewPage';
import './styles.css';

function App() {
  return <AuthProvider><BrowserRouter>
    <Routes>
      <Route path="/files/:id/preview" element={<FilePreviewPage/>}/>
      <Route element={<AppLayout/>}>
        <Route path="/" element={<OverviewPage/>}/>
        <Route path="/tracker" element={<TrackerPage/>}/>
        <Route path="/tracker/:slug" element={<CategoryPage/>}/>
        <Route path="/files" element={<FilesPage/>}/>
        <Route path="/files/:id" element={<FileDetailsPage/>}/>
        <Route path="/activities" element={<ActivitiesPage/>}/>
        <Route path="/research" element={<ResearchPage/>}/>
        <Route path="/organisations" element={<OrganisationsPage/>}/>
        <Route path="/organisations/:id" element={<OrganisationDetailPage/>}/>
        <Route path="/deliverables" element={<DeliverablesPage/>}/>
        <Route path="/deliverables/:id" element={<DeliverableDetailPage/>}/>
        <Route path="/about" element={<AboutPage/>}/>
        <Route path="/settings" element={<SettingsPage/>}/>
        <Route path="/search" element={<SearchPage/>}/>
        <Route path="/login" element={<LoginPage/>}/>
        <Route path="/404" element={<NotFoundPage/>}/>
        <Route path="*" element={<Navigate to="/404" replace/>}/>
      </Route>
    </Routes>
  </BrowserRouter></AuthProvider>;
}

export default App;
