import { useState, useEffect, useCallback } from 'react';
import { Plus, X, Search, User, Phone, Mail, MapPin, Trash2, Edit3, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useIsMobile } from '../hooks/useIsMobile';
import type { Client } from '../types';

export default function Clients() {
  const isMobile = useIsMobile();
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [selected, setSelected] = useState<Client | null>(null);
  const [form, setForm] = useState({ name: '', phone: '', email: '', address: '', notes: '' });
  const [saving, setSaving] = useState(false);

  const fetchClients = useCallback(async () => {
    const { data } = await supabase.from('clients').select('*').order('name');
    if (data) setClients(data);
  }, []);

  useEffect(() => { fetchClients(); }, [fetchClients]);

  const filtered = clients.filter(c =>
    !search || c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search) || c.email?.includes(search)
  );

  const openAdd = () => {
    setEditing(null);
    setForm({ name: '', phone: '', email: '', address: '', notes: '' });
    setShowModal(true);
  };

  const openEdit = (c: Client) => {
    setEditing(c);
    setForm({ name: c.name, phone: c.phone ?? '', email: c.email ?? '', address: c.address ?? '', notes: c.notes ?? '' });
    setShowModal(true);
  };

  const save = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    if (editing) {
      await supabase.from('clients').update({
        name: form.name, phone: form.phone || null, email: form.email || null,
        address: form.address || null, notes: form.notes || null,
      }).eq('id', editing.id);
    } else {
      await supabase.from('clients').insert({
        name: form.name, phone: form.phone || null, email: form.email || null,
        address: form.address || null, notes: form.notes || null,
      });
    }
    setSaving(false);
    setShowModal(false);
    fetchClients();
  };

  const deleteClient = async (id: string) => {
    if (!confirm('حذف هذا الزبون؟')) return;
    await supabase.from('clients').delete().eq('id', id);
    if (selected?.id === id) setSelected(null);
    fetchClients();
  };

  const inp: React.CSSProperties = { width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid #252525', borderRadius: 10, padding: '10px 14px', color: '#e8e8e8', fontSize: 13 };

  return (
    <div style={{
      display: 'flex',
      height: isMobile ? 'auto' : '100vh',
      minHeight: isMobile ? '100vh' : undefined,
      overflow: isMobile ? 'auto' : 'hidden',
      padding: isMobile ? '12px' : undefined
    }}>
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        padding: isMobile ? 0 : '20px 0 20px 24px',
        minWidth: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 18, color: '#e8e8e8' }}>الزبائن</div>
            <div style={{ fontSize: 12, color: '#555', marginTop: 2 }}>{clients.length} زبون مسجل</div>
          </div>
          <button onClick={openAdd} className="btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 12, fontSize: 13, fontWeight: 600 }}>
            <Plus size={16} /> زبون جديد
          </button>
        </div>

        <div style={{ position: 'relative', marginBottom: 16 }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#555' }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="بحث بالاسم، الهاتف، الإيميل..."
            style={{ width: '100%', background: '#111', border: '1px solid #1e1e1e', borderRadius: 10, padding: '9px 12px 9px 36px', color: '#e8e8e8', fontSize: 13 }} />
        </div>

        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#444', marginTop: 80 }}>
              <User size={40} color="#333" style={{ margin: '0 auto 12px', display: 'block' }} />
              <div style={{ fontSize: 13 }}>لا يوجد زبائن</div>
            </div>
          ) : filtered.map(c => (
            <div key={c.id} onClick={() => setSelected(selected?.id === c.id ? null : c)}
              style={{ background: selected?.id === c.id ? 'rgba(249,115,22,0.06)' : '#161616',
                border: `1px solid ${selected?.id === c.id ? 'rgba(249,115,22,0.3)' : '#1e1e1e'}`,
                borderRadius: 14, padding: '14px 16px', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 42, height: 42, borderRadius: 12, background: 'linear-gradient(135deg, rgba(249,115,22,0.2), rgba(212,149,43,0.1))', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: 16, fontWeight: 700, color: '#f97316' }}>{c.name.charAt(0)}</span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: '#e8e8e8' }}>{c.name}</div>
                <div style={{ display: 'flex', gap: 14, marginTop: 4, flexWrap: 'wrap' }}>
                  {c.phone && <span style={{ fontSize: 12, color: '#777', display: 'flex', alignItems: 'center', gap: 4 }}><Phone size={11} /> {c.phone}</span>}
                  {c.email && <span style={{ fontSize: 12, color: '#777', display: 'flex', alignItems: 'center', gap: 4 }}><Mail size={11} /> {c.email}</span>}
                  {c.address && <span style={{ fontSize: 12, color: '#777', display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={11} /> {c.address}</span>}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={e => { e.stopPropagation(); openEdit(c); }}
                  style={{ background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 8, padding: 8, cursor: 'pointer', color: '#888' }}>
                  <Edit3 size={13} />
                </button>
                <button onClick={e => { e.stopPropagation(); deleteClient(c.id); }}
                  style={{ background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 8, padding: 8, cursor: 'pointer', color: '#888' }}>
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Client detail */}
      {selected && (
        <div style={{
          ...(isMobile ? {
            position: 'fixed',
            inset: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(14,14,14,0.95)',
            backdropFilter: 'blur(20px)',
            zIndex: 40,
            overflow: 'auto',
            padding: '12px',
            display: 'flex',
            flexDirection: 'column'
          } : {
            width: 300,
            background: '#111',
            borderRight: '1px solid #1e1e1e',
            padding: 20,
            overflow: 'auto'
          })
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
            {isMobile && <button onClick={() => setSelected(null)} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 8, padding: 8, cursor: 'pointer', color: '#aaa', fontWeight: 600, fontSize: 12 }}>← رجوع</button>}
            <div style={{ fontWeight: 700, fontSize: 15, color: '#e8e8e8' }}>بطاقة الزبون</div>
            {!isMobile && <button onClick={() => setSelected(null)} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 8, padding: 6, cursor: 'pointer', color: '#aaa' }}>
              <X size={14} />
            </button>}
          </div>
          <div style={{ width: 64, height: 64, borderRadius: 18, background: 'linear-gradient(135deg, #f97316, #d4952b)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <span style={{ fontSize: 24, fontWeight: 700, color: 'white' }}>{selected.name.charAt(0)}</span>
          </div>
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <div style={{ fontWeight: 700, fontSize: 16, color: '#e8e8e8' }}>{selected.name}</div>
            <div style={{ fontSize: 11, color: '#555', marginTop: 4 }}>
              {new Date(selected.created_at).toLocaleDateString('ar-LB')}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { icon: <Phone size={14} />, label: 'الهاتف', value: selected.phone },
              { icon: <Mail size={14} />, label: 'الإيميل', value: selected.email },
              { icon: <MapPin size={14} />, label: 'العنوان', value: selected.address },
            ].map(({ icon, label, value }) => value && (
              <div key={label} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid #1e1e1e', borderRadius: 10, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ color: '#f97316' }}>{icon}</span>
                <div>
                  <div style={{ fontSize: 10, color: '#555', marginBottom: 2 }}>{label}</div>
                  <div style={{ fontSize: 13, color: '#e8e8e8' }}>{value}</div>
                </div>
              </div>
            ))}
            {selected.notes && (
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid #1e1e1e', borderRadius: 10, padding: '10px 12px' }}>
                <div style={{ fontSize: 10, color: '#555', marginBottom: 4 }}>ملاحظات</div>
                <div style={{ fontSize: 13, color: '#ccc' }}>{selected.notes}</div>
              </div>
            )}
            <button onClick={() => openEdit(selected)} className="btn-secondary"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px', borderRadius: 12, fontSize: 13, fontWeight: 600, marginTop: 4 }}>
              <Edit3 size={14} /> تعديل
            </button>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(20px)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: isMobile ? '12px' : undefined }}>
          <div className="modal-content" style={{
            background: 'rgba(14,14,14,0.9)',
            border: '1px solid rgba(255,255,255,0.08)',
            backdropFilter: 'blur(40px)',
            borderRadius: 20,
            padding: 24,
            width: isMobile ? 'calc(100vw - 24px)' : 460,
            maxWidth: isMobile ? 'calc(100vw - 24px)' : undefined
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ fontWeight: 700, fontSize: 16, color: '#e8e8e8' }}>{editing ? 'تعديل الزبون' : 'زبون جديد'}</div>
              <button onClick={() => setShowModal(false)} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 8, padding: 6, cursor: 'pointer', color: '#aaa' }}><X size={16} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { key: 'name', label: 'الاسم *', placeholder: 'اسم الزبون', type: 'text' },
                { key: 'phone', label: 'الهاتف', placeholder: '+961 XX XXX XXX', type: 'tel' },
                { key: 'email', label: 'الإيميل', placeholder: 'email@example.com', type: 'email' },
                { key: 'address', label: 'العنوان', placeholder: 'عنوان الزبون', type: 'text' },
              ].map(({ key, label, placeholder, type }) => (
                <div key={key}>
                  <label style={{ display: 'block', fontSize: 12, color: '#888', marginBottom: 6, fontWeight: 500 }}>{label}</label>
                  <input type={type} value={(form as any)[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    placeholder={placeholder} style={inp} />
                </div>
              ))}
              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#888', marginBottom: 6, fontWeight: 500 }}>ملاحظات</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  rows={3} placeholder="ملاحظات..." style={{ ...inp, resize: 'none' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button onClick={() => setShowModal(false)} className="btn-secondary" style={{ flex: 1, padding: '11px', borderRadius: 12, fontSize: 13, fontWeight: 600 }}>إلغاء</button>
              <button onClick={save} disabled={saving || !form.name.trim()} className="btn-primary"
                style={{ flex: 2, padding: '11px', borderRadius: 12, fontSize: 13, fontWeight: 600 }}>
                {saving ? 'جاري الحفظ...' : editing ? 'حفظ التعديلات' : 'إضافة الزبون'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
