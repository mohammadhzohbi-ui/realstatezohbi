import { useState } from 'react';
import { Maximize2, Minimize2, RefreshCw } from 'lucide-react';
import { useIsMobile } from '../hooks/useIsMobile';

const EXTERNAL_APP_URL = 'https://sshc1pqn6a.zite.so';

export default function MapView() {
  const [fullscreen, setFullscreen] = useState(false);
  const [key, setKey] = useState(0);
  const isMobile = useIsMobile();

  const headerH = 48;
  const bottomNavH = isMobile ? 64 : 0;

  if (fullscreen) {
    return (
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100, background: '#0a0a0a', display: 'flex', flexDirection: 'column' }}>
        <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 10, display: 'flex', gap: 6 }}>
          <button onClick={() => setKey(k => k + 1)}
            style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 10, padding: '7px 10px', cursor: 'pointer', color: '#aaa', fontSize: 11, touchAction: 'manipulation' }}>
            <RefreshCw size={12} /> إعادة تحميل
          </button>
          <button onClick={() => setFullscreen(false)}
            style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 10, padding: '8px 12px', cursor: 'pointer', color: '#e8e8e8', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, touchAction: 'manipulation' }}>
            <Minimize2 size={14} /> خروج
          </button>
        </div>
        <iframe
          key={`fs-${key}`}
          src={EXTERNAL_APP_URL}
          style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
          title="Interactive Map Application"
          allow="geolocation; camera; fullscreen"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-downloads"
        />
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 24, background: 'linear-gradient(90deg, rgba(10,10,10,0.85), transparent, rgba(10,10,10,0.85))', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 12px', pointerEvents: 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <img src="/images/17f13e3b-0748-4057-8175-6ae9ca15047e.jpg" alt="MZ" style={{ width: 14, height: 14, borderRadius: 4, objectFit: 'cover' }} />
            <span style={{ fontSize: 9, color: 'rgba(249,115,22,0.8)', fontWeight: 600, letterSpacing: 0.5 }}>MZ Survey</span>
          </div>
          <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)' }}>الخريطة التفاعلية</span>
        </div>
      </div>
    );
  }

  const iframeHeight = `calc(100vh - ${headerH + bottomNavH + 28}px)`;

  return (
    <div style={{
      width: '100%', height: '100vh', overflow: 'hidden',
      padding: isMobile ? 10 : 14,
      paddingBottom: isMobile ? (64 + 10) : 14,
      boxSizing: 'border-box',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: headerH, flexShrink: 0 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: isMobile ? 14 : 16, color: '#e8e8e8' }}>الخريطة التفاعلية</div>
          <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>Interactive Map</div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => setKey(k => k + 1)}
            style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '7px 10px', cursor: 'pointer', color: '#aaa', fontSize: 11, touchAction: 'manipulation' }}>
            <RefreshCw size={12} /> إعادة تحميل
          </button>
          <button onClick={() => setFullscreen(true)}
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '7px 10px', cursor: 'pointer', color: '#aaa', touchAction: 'manipulation' }}>
            <Maximize2 size={14} />
          </button>
        </div>
      </div>

      <div style={{
        width: '100%', height: iframeHeight,
        position: 'relative', borderRadius: 14, overflow: 'hidden',
        border: '1px solid rgba(255,255,255,0.06)',
      }}>
        <iframe
          key={`norm-${key}`}
          src={EXTERNAL_APP_URL}
          style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
          title="Interactive Map Application"
          allow="geolocation; camera; fullscreen"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-downloads"
        />
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 24, background: 'linear-gradient(90deg, rgba(10,10,10,0.85), transparent, rgba(10,10,10,0.85))', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 12px', pointerEvents: 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <img src="/images/17f13e3b-0748-4057-8175-6ae9ca15047e.jpg" alt="MZ" style={{ width: 14, height: 14, borderRadius: 4, objectFit: 'cover' }} />
            <span style={{ fontSize: 9, color: 'rgba(249,115,22,0.8)', fontWeight: 600, letterSpacing: 0.5 }}>MZ Survey</span>
          </div>
          <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)' }}>الخريطة التفاعلية</span>
        </div>
      </div>
    </div>
  );
}
