import { useState, useEffect, useCallback } from 'react';
import { Settings, User, Bell, Database, Users, Shield, Check, X, ChevronDown, ChevronUp, LogOut, UserPlus, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useIsMobile } from '../hooks/useIsMobile';
import type { UserProfile, NavSection, UserRole } from '../types';
import { DEFAULT_PERMISSIONS } from '../types';

const PAGE_LABELS: Record<NavSection, string> = {
  dashboard: 'لوحة التحكم', survey: 'أعمال المساحة', transactions: 'المعاملات',
  clients: 'الزبائن', map: 'الخريطة', field_files: 'ملفات الحقل',
  files: 'الأرشيف', payments: 'المدفوعات', cad: 'ملفات CAD', settings: 'الإعدادات',
};

const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'مدير', employee: 'موظف', accountant: 'محاسب', surveyor: 'مساح',
};

const ROLE_COLORS: Record<UserRole, string> = {
  admin: '#f97316', employee: '#60a5fa', accountant: '#4ade80', surveyor: '#d4952b',
};

export default function SettingsPage() {
  const isMobile = useIsMobile();
  const { profile, isAdmin, refreshProfile, signOut } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [savingPerms, setSavingPerms] = useState<string | null>(null);
  const [editPerms, setEditPerms] = useState<Record<string, any>>({});
  const [showAddUser, setShowAddUser] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newPass, setNewPass] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('employee');
  const [addError, setAddError] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [officeName, setOfficeName] = useState(localStorage.getItem('mz_office') ?? 'مكتب MZ للمساحة');

  const fetchUsers = useCallback(async () => {
    const { data } = await supabase.from('user_profiles').select('*').order('created_at');
    if (data) setUsers(data as UserProfile[]);
  }, []);

  useEffect(() => { if (isAdmin) fetchUsers(); }, [isAdmin, fetchUsers]);

  const toggleExpand = (uid: string, user: UserProfile) => {
    if (expandedUser === uid) { setExpandedUser(null); return; }
    setExpandedUser(uid);
    const defaults = DEFAULT_PERMISSIONS[user.role as UserRole] ?? {};
    const merged: any = {};
    for (const p of Object.keys(PAGE_LABELS) as NavSection[]) {
      merged[p] = { ...((defaults as any)[p] ?? { read: false, write: false }), ...((user.permissions as any)[p] ?? {}) };
    }
    setEditPerms(prev => ({ ...prev, [uid]: merged }));
  };

  const togglePerm = (uid: string, page: NavSection, key: 'read' | 'write') => {
    setEditPerms(prev => ({
      ...prev,
      [uid]: { ...prev[uid], [page]: { ...prev[uid]?.[page], [key]: !prev[uid]?.[page]?.[key] } },
    }));
  };

  const savePerms = async (user: UserProfile, role: UserRole) => {
    setSavingPerms(user.id);
    const effectiveRole = user.is_primary ? 'admin' : role;
    await supabase.from('user_profiles').update({ role: effectiveRole, permissions: editPerms[user.id] ?? {} }).eq('id', user.id);
    setSavingPerms(null);
    fetchUsers();
    if (user.user_id === profile?.user_id) refreshProfile();
  };

  const addUser = async () => {
    if (!newEmail || !newPass || !newName) { setAddError('يرجى تعبئة جميع الحقول'); return; }
    setAddLoading(true); setAddError('');
    const { data, error } = await supabase.auth.signUp({ email: newEmail, password: newPass });
    if (error || !data.user) { setAddError(error?.message ?? 'خطأ'); setAddLoading(false); return; }
    await supabase.from('user_profiles').insert({ user_id: data.user.id, name: newName, email: newEmail, role: newRole, permissions: {} });
    setAddLoading(false); setShowAddUser(false); setNewEmail(''); setNewPass(''); setNewName(''); setNewRole('employee');
    fetchUsers();
  };

  const deleteUser = async (user: UserProfile) => {
    if (user.user_id === profile?.user_id) return;
    if (user.is_primary) return;
    if (!confirm(`حذف المستخدم "${user.name}"؟`)) return;
    await supabase.from('user_profiles').delete().eq('id', user.id);
    fetchUsers();
  };

  const inp: React.CSSProperties = { width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid #252525', borderRadius: 10, padding: '10px 14px', color: '#e8e8e8', fontSize: 13 };

  return (
    <div style={isMobile ? { padding: 12, minHeight: '100vh', height: 'auto' } : { height: '100vh', overflowY: 'auto', padding: '20px 0 40px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
        <Settings size={20} color="#f97316" />
        <div>
          <div style={{ fontWeight: 700, fontSize: 18, color: '#e8e8e8' }}>الإعدادات</div>
          <div style={{ fontSize: 12, color: '#555', marginTop: 2 }}>Settings</div>
        </div>
      </div>

      {/* Profile info */}
      <div style={{ background: 'linear-gradient(135deg, rgba(249,115,22,0.08), rgba(212,149,43,0.05))', border: '1px solid rgba(249,115,22,0.15)', borderRadius: 18, padding: 20, marginBottom: 24, display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'flex-start' : 'center', gap: isMobile ? 12 : 16 }}>
        <div style={{ width: 52, height: 52, borderRadius: 16, background: 'linear-gradient(135deg, #f97316, #d4952b)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: 20, fontWeight: 800, color: 'white' }}>{profile?.name?.charAt(0).toUpperCase() ?? 'U'}</span>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: '#e8e8e8' }}>{profile?.name}</div>
          <div style={{ fontSize: 13, color: '#888', marginTop: 2 }}>{profile?.email}</div>
          <span style={{ fontSize: 11, fontWeight: 700, color: ROLE_COLORS[profile?.role as UserRole ?? 'employee'], background: `${ROLE_COLORS[profile?.role as UserRole ?? 'employee']}18`, borderRadius: 8, padding: '3px 10px', marginTop: 6, display: 'inline-block' }}>
            {ROLE_LABELS[profile?.role as UserRole ?? 'employee']}
          </span>
          {profile?.is_primary && (
            <span style={{ fontSize: 11, fontWeight: 700, color: '#f97316', background: 'rgba(249,115,22,0.12)', borderRadius: 8, padding: '3px 10px', marginTop: 6, display: 'inline-block', marginRight: 6 }}>
              الحساب الأساسي
            </span>
          )}
        </div>
        <button onClick={signOut} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, cursor: 'pointer', color: '#f87171', fontSize: 12, fontWeight: 500, width: isMobile ? '100%' : 'auto', justifyContent: isMobile ? 'center' : 'flex-start' }}>
          <LogOut size={13} /> خروج
        </button>
      </div>

      <div style={isMobile ? {} : { maxWidth: 680 }}>
        {/* Office settings */}
        <Section title="معلومات المكتب">
          <Row icon={<Settings size={15} color="#f97316" />} label="اسم المكتب">
            <input value={officeName} onChange={e => setOfficeName(e.target.value)} style={{ ...inp, width: '100%' }} />
          </Row>
        </Section>

        {/* Users management - admin only */}
        {isAdmin && (
          <Section title="إدارة المستخدمين">
            <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'flex-end', borderBottom: '1px solid #1a1a1a' }}>
              <button onClick={() => setShowAddUser(true)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.25)', borderRadius: 10, cursor: 'pointer', color: '#f97316', fontSize: 12, fontWeight: 600 }}>
                <UserPlus size={13} /> إضافة مستخدم
              </button>
            </div>

            {users.map(u => (
              <div key={u.id} style={{ borderBottom: '1px solid #1a1a1a' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', cursor: 'pointer' }} onClick={() => toggleExpand(u.id, u)}>
                  <div style={{ width: 36, height: 36, borderRadius: 11, background: `${ROLE_COLORS[u.role as UserRole]}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: ROLE_COLORS[u.role as UserRole] }}>{u.name.charAt(0).toUpperCase()}</span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#e8e8e8', display: 'flex', alignItems: 'center', gap: 8 }}>
                      {u.name}
                      {u.is_primary && <span style={{ fontSize: 10, color: '#f97316', fontWeight: 700, background: 'rgba(249,115,22,0.12)', padding: '2px 7px', borderRadius: 6 }}>(الحساب الأساسي)</span>}
                      {u.user_id === profile?.user_id && !u.is_primary && <span style={{ fontSize: 10, color: '#f97316' }}>(أنت)</span>}
                    </div>
                    <div style={{ fontSize: 12, color: '#555' }}>{u.email}</div>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 600, color: ROLE_COLORS[u.role as UserRole], background: `${ROLE_COLORS[u.role as UserRole]}18`, borderRadius: 8, padding: '3px 10px' }}>
                    {ROLE_LABELS[u.role as UserRole]}
                  </span>
                  {expandedUser === u.id ? <ChevronUp size={14} color="#555" /> : <ChevronDown size={14} color="#555" />}
                  {u.user_id !== profile?.user_id && !u.is_primary && (
                    <button onClick={e => { e.stopPropagation(); deleteUser(u); }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#444', padding: 4 }}><X size={13} /></button>
                  )}
                </div>

                {expandedUser === u.id && (
                  <div style={{ padding: '0 16px 16px' }}>
                    {/* Role selector */}
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ fontSize: 12, color: '#888', fontWeight: 600, marginBottom: 8 }}>الدور</div>
                      {u.is_primary ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(249,115,22,0.06)', border: '1px solid rgba(249,115,22,0.15)', borderRadius: 9, padding: '8px 12px', fontSize: 13, color: '#f97316', fontWeight: 700 }}>
                          <Shield size={14} /> مدير — الحساب الأساسي (لا يمكن تغييره)
                        </div>
                      ) : (
                      <div style={{ display: 'flex', gap: 6 }}>
                        {(Object.entries(ROLE_LABELS) as [UserRole, string][]).map(([r, label]) => {
                          const currentRole = (editPerms as any)[`${u.id}_role`] ?? u.role;
                          return (
                            <button key={r} onClick={() => setEditPerms(p => ({ ...p, [`${u.id}_role`]: r }))}
                              style={{ flex: 1, padding: '7px 4px', borderRadius: 9, border: `1.5px solid ${currentRole === r ? ROLE_COLORS[r] : '#252525'}`, background: currentRole === r ? `${ROLE_COLORS[r]}14` : 'transparent', cursor: 'pointer', color: currentRole === r ? ROLE_COLORS[r] : '#666', fontSize: 12, fontWeight: currentRole === r ? 700 : 400 }}>
                              {label}
                            </button>
                          );
                        })}
                      </div>
                      )}
                    </div>

                    {/* Permissions grid */}
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ fontSize: 12, color: '#888', fontWeight: 600, marginBottom: 8 }}>الصلاحيات</div>
                      <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid #1e1e1e', borderRadius: 12, overflow: isMobile ? 'auto' : 'hidden', overflowX: isMobile ? 'auto' : 'visible' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', padding: '8px 14px', borderBottom: '1px solid #1a1a1a', minWidth: isMobile ? 'max-content' : 'auto' }}>
                          <span style={{ fontSize: 11, color: '#555', fontWeight: 600 }}>الصفحة</span>
                          <span style={{ fontSize: 11, color: '#555', fontWeight: 600, width: 52, textAlign: 'center' }}>قراءة</span>
                          <span style={{ fontSize: 11, color: '#555', fontWeight: 600, width: 52, textAlign: 'center' }}>كتابة</span>
                        </div>
                        {(Object.keys(PAGE_LABELS) as NavSection[]).map(page => {
                          const perms = editPerms[u.id]?.[page] ?? { read: false, write: false };
                          return (
                            <div key={page} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', padding: '8px 14px', borderBottom: '1px solid #111', alignItems: 'center', minWidth: isMobile ? 'max-content' : 'auto' }}>
                              <span style={{ fontSize: 13, color: '#ccc' }}>{PAGE_LABELS[page]}</span>
                              <div style={{ width: 52, display: 'flex', justifyContent: 'center' }}>
                                <Toggle on={perms.read} onToggle={() => togglePerm(u.id, page, 'read')} color="#4ade80" />
                              </div>
                              <div style={{ width: 52, display: 'flex', justifyContent: 'center' }}>
                                <Toggle on={perms.write} onToggle={() => togglePerm(u.id, page, 'write')} color="#f97316" />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <button onClick={() => savePerms(u, ((editPerms as any)[`${u.id}_role`] ?? u.role) as UserRole)} disabled={savingPerms === u.id}
                      className="btn-primary" style={{ padding: '9px 20px', borderRadius: 11, fontSize: 13, fontWeight: 600 }}>
                      {savingPerms === u.id ? 'جاري الحفظ...' : 'حفظ الصلاحيات'}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </Section>
        )}

        {/* DB status */}
        <Section title="قاعدة البيانات">
          <Row icon={<Database size={15} color="#4ade80" />} label="Supabase">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#4ade80' }} />
              <span style={{ fontSize: 13, color: '#4ade80' }}>متصل</span>
            </div>
          </Row>
        </Section>

        <button onClick={() => { localStorage.setItem('mz_office', officeName); setSaved(true); setTimeout(() => setSaved(false), 2000); }}
          className="btn-primary" style={{ width: '100%', padding: '13px', borderRadius: 14, fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          {saved ? <><Check size={16} /> تم الحفظ</> : 'حفظ الإعدادات'}
        </button>
      </div>

      {/* Add User Modal */}
      {showAddUser && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="modal-content" style={{ borderRadius: 20, padding: 24, width: isMobile ? 'calc(100vw - 24px)' : 440, maxWidth: isMobile ? 'calc(100vw - 24px)' : 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ fontWeight: 700, fontSize: 16, color: '#e8e8e8' }}>إضافة مستخدم جديد</div>
              <button onClick={() => setShowAddUser(false)} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 8, padding: 6, cursor: 'pointer', color: '#aaa' }}><X size={16} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[{ key: 'name', label: 'الاسم', placeholder: 'الاسم الكامل' }, { key: 'email', label: 'البريد', placeholder: 'email@example.com', type: 'email' }, { key: 'pass', label: 'كلمة السر', placeholder: '••••••••', type: 'password' }].map(({ key, label, placeholder, type }) => (
                <div key={key}>
                  <label style={{ fontSize: 12, color: '#888', marginBottom: 6, display: 'block' }}>{label}</label>
                  <input type={type ?? 'text'} placeholder={placeholder}
                    value={key === 'name' ? newName : key === 'email' ? newEmail : newPass}
                    onChange={e => key === 'name' ? setNewName(e.target.value) : key === 'email' ? setNewEmail(e.target.value) : setNewPass(e.target.value)}
                    style={inp} />
                </div>
              ))}
              <div>
                <label style={{ fontSize: 12, color: '#888', marginBottom: 6, display: 'block' }}>الدور</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  {(Object.entries(ROLE_LABELS) as [UserRole, string][]).map(([r, label]) => (
                    <button key={r} onClick={() => setNewRole(r)}
                      style={{ flex: 1, padding: '8px 4px', borderRadius: 9, border: `1.5px solid ${newRole === r ? ROLE_COLORS[r] : '#252525'}`, background: newRole === r ? `${ROLE_COLORS[r]}14` : 'transparent', cursor: 'pointer', color: newRole === r ? ROLE_COLORS[r] : '#666', fontSize: 12, fontWeight: newRole === r ? 700 : 400 }}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              {addError && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 9, padding: '9px 12px', fontSize: 12, color: '#f87171' }}>
                  <AlertCircle size={13} /> {addError}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button onClick={() => setShowAddUser(false)} className="btn-secondary" style={{ flex: 1, padding: '11px', borderRadius: 12, fontSize: 13, fontWeight: 600 }}>إلغاء</button>
              <button onClick={addUser} disabled={addLoading} className="btn-primary" style={{ flex: 2, padding: '11px', borderRadius: 12, fontSize: 13, fontWeight: 600 }}>
                {addLoading ? 'إنشاء...' : 'إضافة'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Toggle({ on, onToggle, color }: { on: boolean; onToggle: () => void; color: string }) {
  return (
    <button onClick={onToggle} style={{ width: 36, height: 20, borderRadius: 10, background: on ? `${color}30` : '#1e1e1e', border: `1.5px solid ${on ? color : '#333'}`, padding: 0, cursor: 'pointer', position: 'relative', transition: 'all 0.2s', flexShrink: 0 }}>
      <div style={{ width: 13, height: 13, borderRadius: '50%', background: on ? color : '#555', position: 'absolute', top: '50%', transform: 'translateY(-50%)', left: on ? 18 : 2, transition: 'all 0.2s' }} />
    </button>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#555', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10 }}>{title}</div>
      <div style={{ background: '#161616', border: '1px solid #1e1e1e', borderRadius: 16, overflow: 'hidden' }}>{children}</div>
    </div>
  );
}

function Row({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderBottom: '1px solid #1a1a1a' }}>
      <div style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(249,115,22,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 11, color: '#666', marginBottom: 5 }}>{label}</div>
        {children}
      </div>
    </div>
  );
}
