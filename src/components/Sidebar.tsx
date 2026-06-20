import { useState } from 'react';
import {
  LayoutDashboard, FolderOpen, Map, Ruler,
  FileText, Users, Settings, DollarSign, LayoutGrid,
  Folder, LogOut, ChevronLeft, Menu, Navigation
} from 'lucide-react';
import type { NavSection } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useIsMobile } from '../hooks/useIsMobile';

interface NavItem {
  id: NavSection;
  icon: React.ReactNode;
  label: string;
  labelAr: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', icon: <LayoutDashboard size={19} />, label: 'Dash', labelAr: 'لوحة التحكم' },
  { id: 'survey', icon: <Ruler size={19} />, label: 'Survey', labelAr: 'المساحة' },
  { id: 'transactions', icon: <FileText size={19} />, label: 'Trans', labelAr: 'المعاملات' },
  { id: 'clients', icon: <Users size={19} />, label: 'Clients', labelAr: 'الزبائن' },
  { id: 'map', icon: <Map size={19} />, label: 'Map', labelAr: 'الخريطة' },
  { id: 'gps', icon: <Navigation size={19} />, label: 'GPS', labelAr: 'الموقع' },
  { id: 'field_files', icon: <Folder size={19} />, label: 'Field', labelAr: 'الحقل' },
  { id: 'files', icon: <FolderOpen size={19} />, label: 'Archive', labelAr: 'الأرشيف' },
  { id: 'payments', icon: <DollarSign size={19} />, label: 'Pay', labelAr: 'المدفوعات' },
  { id: 'cad', icon: <LayoutGrid size={19} />, label: 'CAD', labelAr: 'CAD' },
  { id: 'settings', icon: <Settings size={19} />, label: 'Config', labelAr: 'الإعدادات' },
];

const MOBILE_ITEMS = NAV_ITEMS.slice(0, 5);
const MORE_ITEMS = NAV_ITEMS.slice(5);

interface SidebarProps {
  active: NavSection;
  onChange: (section: NavSection) => void;
  open: boolean;
  onToggle: () => void;
}

export default function Sidebar({ active, onChange, open, onToggle }: SidebarProps) {
  const { profile, canRead, signOut } = useAuth();
  const isMobile = useIsMobile();

  if (isMobile) {
    return <MobileBottomNav active={active} onChange={onChange} profile={profile} signOut={signOut} canRead={canRead} />;
  }

  return <DesktopSidebar active={active} onChange={onChange} open={open} onToggle={onToggle} profile={profile} signOut={signOut} canRead={canRead} />;
}

function MobileBottomNav({ active, onChange, profile, signOut, canRead }: {
  active: NavSection;
  onChange: (s: NavSection) => void;
  profile: any;
  signOut: () => void;
  canRead: (p: NavSection) => boolean;
}) {
  const [showMore, setShowMore] = useState(false);
  const isMoreActive = MORE_ITEMS.some(i => i.id === active);

  const handleMoreItemClick = (id: NavSection) => {
    if (canRead(id)) {
      onChange(id);
      setShowMore(false);
    }
  };

  return (
    <>
      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        height: 64, background: '#0d0d0d', borderTop: '1px solid #1e1e1e',
        display: 'flex', alignItems: 'center', justifyContent: 'space-around',
        zIndex: 60, padding: '0 4px', flexShrink: 0,
      }}>
        {MOBILE_ITEMS.map(item => (
          <MobileTab key={item.id} item={item} active={active === item.id} hasAccess={canRead(item.id)} onChange={onChange} />
        ))}
        <button
          onClick={(e) => { e.preventDefault(); setShowMore(m => !m); }}
          style={{
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
            background: showMore ? 'rgba(249,115,22,0.1)' : 'none', border: 'none', cursor: 'pointer', padding: '6px 0', minHeight: 50,
            color: isMoreActive || showMore ? '#f97316' : '#555', position: 'relative',
            touchAction: 'manipulation',
          }}>
          <Menu size={18} />
          <span style={{ fontSize: 9, fontWeight: 700 }}>المزيد</span>
          {(isMoreActive || showMore) && <div style={{ position: 'absolute', top: 0, left: '25%', right: '25%', height: 2, background: '#f97316', borderRadius: 2 }} />}
        </button>
      </nav>

      {showMore && (
        <div
          onClick={() => setShowMore(false)}
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 55 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              background: 'rgba(14,14,14,0.97)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
              border: 'none', borderBottom: 'none',
              padding: 16, paddingBottom: 80,
              display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10,
            }}
          >
            {MORE_ITEMS.map(item => {
              const accessible = canRead(item.id);
              return (
                <button key={item.id}
                  onClick={(e) => { e.stopPropagation(); handleMoreItemClick(item.id); }}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
                    padding: '14px 4px', borderRadius: 12, border: 'none',
                    cursor: accessible ? 'pointer' : 'not-allowed',
                    background: active === item.id ? 'rgba(249,115,22,0.15)' : 'rgba(255,255,255,0.05)',
                    color: active === item.id ? '#f97316' : accessible ? '#ccc' : '#333',
                    opacity: accessible ? 1 : 0.35,
                    touchAction: 'manipulation',
                  }}>
                  {item.icon}
                  <span style={{ fontSize: 10, fontWeight: 600 }}>{item.labelAr}</span>
                </button>
              );
            })}
            {profile && (
              <button
                onClick={(e) => { e.stopPropagation(); setShowMore(false); signOut(); }}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
                  padding: '14px 4px', borderRadius: 12, border: 'none', cursor: 'pointer',
                  background: 'rgba(239,68,68,0.08)', color: '#f87171',
                  touchAction: 'manipulation',
                }}>
                <LogOut size={18} />
                <span style={{ fontSize: 10, fontWeight: 600 }}>خروج</span>
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function MobileTab({ item, active, hasAccess, onChange }: { item: NavItem; active: boolean; hasAccess: boolean; onChange: (s: NavSection) => void }) {
  return (
    <button
      onClick={(e) => { e.preventDefault(); if (hasAccess) onChange(item.id); }}
      style={{
        flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
        background: 'none', border: 'none', cursor: hasAccess ? 'pointer' : 'not-allowed',
        padding: '6px 0', minHeight: 50, position: 'relative',
        color: active ? '#f97316' : hasAccess ? '#555' : '#2a2a2a',
        opacity: hasAccess ? 1 : 0.35,
        touchAction: 'manipulation',
      }}>
      {item.icon}
      <span style={{ fontSize: 9, fontWeight: 700 }}>{item.labelAr}</span>
      {active && <div style={{ position: 'absolute', top: 0, left: '20%', right: '20%', height: 2, background: '#f97316', borderRadius: 2 }} />}
    </button>
  );
}

function DesktopSidebar({ active, onChange, open, onToggle, profile, signOut, canRead }: {
  active: NavSection; onChange: (s: NavSection) => void; open: boolean; onToggle: () => void;
  profile: any; signOut: () => void; canRead: (p: NavSection) => boolean;
}) {
  return (
    <>
      {!open && (
        <button onClick={onToggle}
          style={{
            position: 'fixed', top: '50%', right: 0, transform: 'translateY(-50%)',
            width: 20, height: 56, background: 'rgba(249,115,22,0.15)', border: '1px solid rgba(249,115,22,0.3)',
            borderRight: 'none', borderRadius: '10px 0 0 10px', cursor: 'pointer', color: '#f97316',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 20, transition: 'all 0.2s',
          }}>
          <ChevronLeft size={13} />
        </button>
      )}

      <div style={{
        width: open ? 68 : 0, background: '#0d0d0d', borderLeft: '1px solid #1a1a1a',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        paddingTop: 14, paddingBottom: 16, gap: 2, flexShrink: 0, height: '100vh',
        position: 'relative', zIndex: 10, overflow: 'hidden',
        transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      }}>
        <button onClick={onToggle} title="إخفاء الشريط الجانبي"
          style={{ background: 'none', border: 'none', cursor: 'pointer', marginBottom: 14, marginTop: 2, padding: 0 }}>
          <img src="/images/17f13e3b-0748-4057-8175-6ae9ca15047e.jpg" alt="MZ"
            style={{ width: 38, height: 38, borderRadius: 10, objectFit: 'cover', display: 'block', transition: 'all 0.2s' }} />
        </button>

        <div style={{ width: 36, height: 1, background: '#1e1e1e', marginBottom: 6, flexShrink: 0 }} />

        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', display: 'flex', flexDirection: 'column', gap: 2, width: '100%', alignItems: 'center', paddingBottom: 8 }}>
          {NAV_ITEMS.map((item) => {
            const hasAccess = canRead(item.id);
            const isActive = active === item.id;
            return (
              <button key={item.id} onClick={() => hasAccess && onChange(item.id)} title={item.labelAr}
                style={{
                  width: 50, height: 50, borderRadius: 13, border: 'none', cursor: hasAccess ? 'pointer' : 'not-allowed',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3,
                  transition: 'all 0.2s ease', flexShrink: 0,
                  background: isActive ? 'linear-gradient(135deg, rgba(249,115,22,0.22), rgba(212,149,43,0.12))' : 'transparent',
                  color: isActive ? '#f97316' : hasAccess ? '#555' : '#2a2a2a',
                  boxShadow: isActive ? '0 0 0 1px rgba(249,115,22,0.3)' : 'none',
                  opacity: hasAccess ? 1 : 0.35,
                }}
                onMouseEnter={e => { if (!isActive && hasAccess) { (e.currentTarget as HTMLElement).style.background = 'rgba(249,115,22,0.08)'; (e.currentTarget as HTMLElement).style.color = '#999'; } }}
                onMouseLeave={e => { if (!isActive && hasAccess) { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#555'; } }}>
                {item.icon}
                <span style={{ fontSize: 7.5, fontWeight: 700, letterSpacing: 0.2, whiteSpace: 'nowrap' }}>{item.label.toUpperCase()}</span>
              </button>
            );
          })}
        </div>

        <div style={{ width: 36, height: 1, background: '#1e1e1e', marginBottom: 6, flexShrink: 0 }} />

        {profile && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <div title={profile.name} style={{ width: 32, height: 32, borderRadius: 9, background: 'linear-gradient(135deg, rgba(249,115,22,0.3), rgba(212,149,43,0.2))', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#f97316' }}>{profile.name.charAt(0).toUpperCase()}</span>
            </div>
            <button onClick={signOut} title="تسجيل الخروج"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#444', padding: '4px', borderRadius: 7, transition: 'color 0.2s' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#f87171'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = '#444'}>
              <LogOut size={14} />
            </button>
          </div>
        )}
      </div>
    </>
  );
}
