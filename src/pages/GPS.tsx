import { useState, useEffect } from 'react';
import { MapPin, Navigation, Crosshair, Copy, Check, RefreshCw, Compass } from 'lucide-react';
import { useIsMobile } from '../hooks/useIsMobile';

interface GpsData {
  lat: number;
  lng: number;
  accuracy: number;
  altitude: number | null;
  heading: number | null;
  speed: number | null;
  timestamp: number;
}

export default function GPS() {
  const isMobile = useIsMobile();
  const [gpsData, setGpsData] = useState<GpsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [watchId, setWatchId] = useState<number | null>(null);
  const [isTracking, setIsTracking] = useState(false);

  const getLocation = () => {
    setLoading(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      pos => {
        setGpsData({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          altitude: pos.coords.altitude,
          heading: pos.coords.heading,
          speed: pos.coords.speed,
          timestamp: pos.timestamp,
        });
        setLoading(false);
      },
      err => {
        setError(`خطأ في تحديد الموقع: ${err.message}`);
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const startTracking = () => {
    if (!navigator.geolocation) { setError('الجهاز لا يدعم GPS'); return; }
    const id = navigator.geolocation.watchPosition(
      pos => {
        setGpsData({
          lat: pos.coords.latitude, lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy, altitude: pos.coords.altitude,
          heading: pos.coords.heading, speed: pos.coords.speed,
          timestamp: pos.timestamp,
        });
        setError(null);
      },
      err => setError(`خطأ: ${err.message}`),
      { enableHighAccuracy: true }
    );
    setWatchId(id);
    setIsTracking(true);
  };

  const stopTracking = () => {
    if (watchId !== null) { navigator.geolocation.clearWatch(watchId); setWatchId(null); }
    setIsTracking(false);
  };

  useEffect(() => { return () => { if (watchId !== null) navigator.geolocation.clearWatch(watchId); }; }, [watchId]);

  const copyCoords = () => {
    if (!gpsData) return;
    navigator.clipboard.writeText(`${gpsData.lat.toFixed(6)}, ${gpsData.lng.toFixed(6)}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const statCard = (icon: React.ReactNode, label: string, value: string, sub?: string) => (
    <div style={{ background: '#161616', border: '1px solid #1e1e1e', borderRadius: 14, padding: isMobile ? '12px 14px' : '16px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        {icon}
        <span style={{ fontSize: 12, color: '#666' }}>{label}</span>
      </div>
      <div style={{ fontSize: isMobile ? 16 : 20, fontWeight: 700, color: '#e8e8e8', fontFamily: 'monospace' }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: '#555', marginTop: 3 }}>{sub}</div>}
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: isMobile ? 'auto' : '100vh', minHeight: isMobile ? '100vh' : 'auto', padding: isMobile ? 12 : '20px 0 20px 24px', overflow: isMobile ? 'visible' : 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: isMobile ? 16 : 24, flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? 12 : 0 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: isMobile ? 16 : 18, color: '#e8e8e8' }}>تحديد الموقع</div>
          <div style={{ fontSize: 12, color: '#555', marginTop: 2 }}>GPS Location</div>
        </div>
        <div style={{ display: 'flex', gap: 8, width: isMobile ? '100%' : 'auto' }}>
          <button onClick={getLocation} disabled={loading}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: '#111', border: '1px solid #1e1e1e', borderRadius: 12, padding: '9px 14px', cursor: 'pointer', color: '#e8e8e8', fontSize: 13, fontWeight: 500, flex: isMobile ? 1 : undefined }}>
            <RefreshCw size={14} color={loading ? '#f97316' : '#888'} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            تحديث
          </button>
          <button
            onClick={isTracking ? stopTracking : startTracking}
            className={isTracking ? 'btn-secondary' : 'btn-primary'}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px 16px', borderRadius: 12, fontSize: 13, fontWeight: 600, flex: isMobile ? 1 : undefined }}>
            <Navigation size={14} />
            {isTracking ? 'إيقاف التتبع' : 'بدء التتبع'}
          </button>
        </div>
      </div>

      {/* Main position display */}
      <div style={{ background: 'linear-gradient(135deg, #1a1a1a, #111)', border: '1px solid #252525', borderRadius: 20, padding: isMobile ? 16 : 24, marginBottom: isMobile ? 16 : 20, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -20, right: -20, width: 120, height: 120, borderRadius: '50%', background: 'radial-gradient(circle, rgba(249,115,22,0.08) 0%, transparent 70%)' }} />
        {isTracking && (
          <div style={{ position: 'absolute', top: 16, left: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#4ade80', animation: 'pulse 1.5s infinite' }} />
            <span style={{ fontSize: 11, color: '#4ade80', fontWeight: 600 }}>تتبع مباشر</span>
          </div>
        )}
        {gpsData ? (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <Crosshair size={20} color="#f97316" />
              <span style={{ fontSize: 14, fontWeight: 600, color: '#e8e8e8' }}>الموقع الحالي</span>
            </div>
            <div style={{ display: 'flex', gap: isMobile ? 12 : 20, alignItems: 'flex-end', flexWrap: 'wrap', flexDirection: isMobile ? 'column' : 'row' }}>
              <div>
                <div style={{ fontSize: 11, color: '#555', marginBottom: 4 }}>خط العرض</div>
                <div style={{ fontSize: isMobile ? 22 : 28, fontWeight: 700, color: '#f97316', fontFamily: 'monospace' }}>{gpsData.lat.toFixed(6)}°</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: '#555', marginBottom: 4 }}>خط الطول</div>
                <div style={{ fontSize: isMobile ? 22 : 28, fontWeight: 700, color: '#d4952b', fontFamily: 'monospace' }}>{gpsData.lng.toFixed(6)}°</div>
              </div>
              <button onClick={copyCoords} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid #252525', borderRadius: 10, cursor: 'pointer', color: copied ? '#4ade80' : '#aaa', fontSize: 12, fontWeight: 500 }}>
                {copied ? <Check size={13} /> : <Copy size={13} />}
                {copied ? 'تم النسخ' : 'نسخ'}
              </button>
            </div>
            <div style={{ fontSize: 11, color: '#555', marginTop: 10 }}>
              آخر تحديث: {new Date(gpsData.timestamp).toLocaleTimeString('ar-LB')}
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: isMobile ? '16px 0' : '20px 0' }}>
            <MapPin size={40} color="#333" style={{ margin: '0 auto 12px', display: 'block' }} />
            <div style={{ fontSize: 14, color: '#555' }}>{error ?? 'اضغط تحديث للحصول على موقعك الحالي'}</div>
            <button onClick={getLocation} className="btn-primary"
              style={{ marginTop: 16, padding: '10px 24px', borderRadius: 12, fontSize: 13, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <MapPin size={14} /> تحديد الموقع
            </button>
          </div>
        )}
      </div>

      {error && !gpsData && (
        <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 12, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: '#f87171' }}>
          {error}
        </div>
      )}

      {gpsData && (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(2, 1fr)', gap: isMobile ? 8 : 12 }}>
          {statCard(<Crosshair size={16} color="#f97316" />, 'دقة الموقع', `${Math.round(gpsData.accuracy)} م`, 'متر')}
          {gpsData.altitude !== null && statCard(<MapPin size={16} color="#d4952b" />, 'الارتفاع', `${Math.round(gpsData.altitude)} م`, 'فوق سطح البحر')}
          {gpsData.heading !== null && statCard(<Compass size={16} color="#60a5fa" />, 'الاتجاه', `${Math.round(gpsData.heading)}°`, 'من الشمال')}
          {gpsData.speed !== null && statCard(<Navigation size={16} color="#4ade80" />, 'السرعة', `${(gpsData.speed * 3.6).toFixed(1)} كم/س`, 'كيلومتر في الساعة')}
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
      `}</style>
    </div>
  );
}
