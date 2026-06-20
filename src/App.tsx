import { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Sidebar from './components/Sidebar';
import NotesWidget from './components/NotesWidget';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import LandSurvey from './pages/LandSurvey';
import Transactions from './pages/Transactions';
import Clients from './pages/Clients';
import MapView from './pages/MapView';
import FieldFiles from './pages/FieldFiles';
import Files from './pages/Files';
import Payments from './pages/Payments';
import CADViewer from './pages/CADViewer';
import SettingsPage from './pages/Settings';
import GPS from './pages/GPS';
import type { NavSection } from './types';
import { useIsMobile } from './hooks/useIsMobile';

function AppContent() {
  const { session, loading, canRead } = useAuth();
  const [active, setActive] = useState<NavSection>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const isMobile = useIsMobile();

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <img src="/images/17f13e3b-0748-4057-8175-6ae9ca15047e.jpg" alt="MZ"
            style={{ width: 56, height: 56, borderRadius: 16, objectFit: 'cover', margin: '0 auto 16px', display: 'block', opacity: 0.8 }} />
          <div style={{ fontSize: 13, color: '#555' }}>جاري التحميل...</div>
        </div>
      </div>
    );
  }

  if (!session) return <Auth />;

  const handleNav = (section: NavSection) => {
    if (canRead(section)) setActive(section);
  };

  const renderPage = () => {
    if (!canRead(active)) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: 16 }}>
          <div style={{ fontSize: 48 }}>&#x1F512;</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#e8e8e8' }}>غير مصرح</div>
          <div style={{ fontSize: 13, color: '#555' }}>ليس لديك صلاحية للوصول إلى هذه الصفحة</div>
        </div>
      );
    }
    switch (active) {
      case 'dashboard': return <Dashboard />;
      case 'survey': return <LandSurvey />;
      case 'transactions': return <Transactions />;
      case 'clients': return <Clients />;
      case 'map': return <MapView />;
      case 'field_files': return <FieldFiles />;
      case 'files': return <Files />;
      case 'payments': return <Payments />;
      case 'cad': return <CADViewer />;
      case 'settings': return <SettingsPage />;
      case 'gps': return <GPS />;
      default: return <Dashboard />;
    }
  };

  const isMapActive = active === 'map';

  if (isMobile) {
    return (
      <div style={{ background: '#0a0a0a', direction: 'rtl', position: 'relative', minHeight: '100vh' }}>
        <div key={active} className="section-enter" style={{ paddingBottom: isMapActive ? 0 : 80, marginBottom: isMapActive ? 0 : 64 }}>
          {renderPage()}
        </div>
        <Sidebar active={active} onChange={handleNav} open={false} onToggle={() => {}} />
        {!isMapActive && <NotesWidget />}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#0a0a0a', direction: 'rtl' }}>
      <Sidebar active={active} onChange={handleNav} open={sidebarOpen} onToggle={() => setSidebarOpen(o => !o)} />
      <div key={active} className="section-enter" style={{ flex: 1, overflow: 'hidden', minWidth: 0, direction: 'rtl', position: 'relative' }}>
        {renderPage()}
      </div>
      {!isMapActive && <NotesWidget />}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
