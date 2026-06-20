import { useState, useEffect } from 'react';
import { Eye, EyeOff, LogIn, UserPlus, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { DEFAULT_PERMISSIONS } from '../types';

export default function Auth() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isFirstUser, setIsFirstUser] = useState(false);

  useEffect(() => {
    supabase.from('user_profiles').select('id', { count: 'exact', head: true }).then(({ count }) => {
      if (count === 0) { setIsFirstUser(true); setMode('register'); }
    });
  }, []);

  const inp: React.CSSProperties = {
    width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 12, padding: '12px 16px', color: '#e8e8e8', fontSize: 14,
  };

  const handleSubmit = async () => {
    setError('');
    if (!email || !password) { setError('يرجى تعبئة جميع الحقول'); return; }
    if (mode === 'register' && !name) { setError('يرجى إدخال الاسم'); return; }
    setLoading(true);

    if (mode === 'login') {
      const { error: e } = await supabase.auth.signInWithPassword({ email, password });
      if (e) { setError(e.message === 'Invalid login credentials' ? 'البريد أو كلمة السر غير صحيحة' : e.message); }
    } else {
      const { data, error: e } = await supabase.auth.signUp({ email, password });
      if (e) { setError(e.message); setLoading(false); return; }
      if (data.user) {
        const role = isFirstUser ? 'admin' : 'employee';
        await supabase.from('user_profiles').insert({
          user_id: data.user.id, name, email,
          role, permissions: {}, is_primary: isFirstUser,
        });
        if (!isFirstUser) {
          setError('');
          setMode('login');
          setLoading(false);
          return;
        }
      }
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, position: 'relative', overflow: 'hidden' }}>
      {/* Background decoration */}
      <div style={{ position: 'absolute', top: -200, right: -200, width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(249,115,22,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: -200, left: -200, width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(212,149,43,0.05) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <div style={{ width: '100%', maxWidth: 420 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <img src="/images/17f13e3b-0748-4057-8175-6ae9ca15047e.jpg" alt="MZ"
            style={{ width: 72, height: 72, borderRadius: 20, objectFit: 'cover', margin: '0 auto 16px', display: 'block', boxShadow: '0 8px 32px rgba(249,115,22,0.3)' }} />
          <div style={{ fontSize: 22, fontWeight: 800, color: '#f97316' }}>MZ Survey</div>
          <div style={{ fontSize: 13, color: '#666', marginTop: 4 }}>مكتب المساحة المتنقل</div>
        </div>

        {/* Card */}
        <div style={{ background: 'rgba(18,18,18,0.9)', backdropFilter: 'blur(40px)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 24, padding: 32 }}>
          {isFirstUser && (
            <div style={{ background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.3)', borderRadius: 12, padding: '12px 16px', marginBottom: 20, fontSize: 13, color: '#f97316' }}>
              أول مستخدم — سيتم تعيينك كمدير تلقائياً
            </div>
          )}

          {!isFirstUser && (
            <div style={{ display: 'flex', gap: 4, background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 4, marginBottom: 24 }}>
              {(['login', 'register'] as const).map(m => (
                <button key={m} onClick={() => { setMode(m); setError(''); }}
                  style={{ flex: 1, padding: '9px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, transition: 'all 0.2s',
                    background: mode === m ? 'linear-gradient(135deg, #f97316, #d4952b)' : 'transparent',
                    color: mode === m ? 'white' : '#666' }}>
                  {m === 'login' ? 'تسجيل الدخول' : 'حساب جديد'}
                </button>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {mode === 'register' && (
              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#777', marginBottom: 7, fontWeight: 500 }}>الاسم الكامل</label>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="اسمك الكامل" style={inp} />
              </div>
            )}
            <div>
              <label style={{ display: 'block', fontSize: 12, color: '#777', marginBottom: 7, fontWeight: 500 }}>البريد الإلكتروني</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@example.com"
                style={inp} onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: '#777', marginBottom: 7, fontWeight: 500 }}>كلمة السر</label>
              <div style={{ position: 'relative' }}>
                <input type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••" style={{ ...inp, paddingLeft: 42 }} onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
                <button onClick={() => setShowPass(!showPass)} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#666' }}>
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#f87171' }}>
                <AlertCircle size={15} /> {error}
              </div>
            )}

            <button onClick={handleSubmit} disabled={loading}
              style={{ background: 'linear-gradient(135deg, #f97316, #d4952b)', border: 'none', borderRadius: 12, padding: '13px', color: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 4, opacity: loading ? 0.7 : 1, transition: 'all 0.2s' }}
              onMouseEnter={e => !loading && ((e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)')}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'}>
              {loading ? '...' : mode === 'login' ? <><LogIn size={16} /> دخول</> : <><UserPlus size={16} /> إنشاء حساب</>}
            </button>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: 16, fontSize: 12, color: '#444' }}>
          MZ Survey Office v1.0
        </div>
      </div>
    </div>
  );
}
