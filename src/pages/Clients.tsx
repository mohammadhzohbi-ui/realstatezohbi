import { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, X, Search, User, Phone, Mail, MapPin, Trash2, Edit3, Check, FileText, Ruler, Camera, Paperclip, Download, ExternalLink } from 'lucide-react';
import { supabase, uploadFile } from '../lib/supabase';
import { useIsMobile } from '../hooks/useIsMobile';
import type { Client, SurveyWork, Transaction } from '../types';

interface ClientFile {
  id: string;
  name: string;
  file_url?: string;
  context: string;
  contextId: string;
  contextName: string;
  created_at: string;
}

export default function Clients() {
  const isMobile = useIsMobile();
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [selected, setSelected] = useState<Client | null>(null);
  const [form, setForm] = useState({ name: '', phone: '', email: '', address: '', notes: '' });
  const [saving, setSaving] = useState(false);

  // Client detail data
  const [clientSurveyWorks, setClientSurveyWorks] = useState<SurveyWork[]>([]);
  const [clientTransactions, setClientTransactions] = useState<Transaction[]>([]);
  const [clientFiles, setClientFiles] = useState<ClientFile[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const fetchClients = useCallback(async () => {
    const { data } = await supabase.from('clients').select('*').order('name');
    if (data) setClients(data);
  }, []);

  useEffect(() => { fetchClients(); }, [fetchClients]);

  const fetchClientDetail = async (clientId: string) => {
    setLoadingDetail(true);
    const [swData, txData, swFiles, txFiles] = await Promise.all([
      supabase.from('survey_works').select('*, items:survey_work_items(*)').eq('client_id', clientId).order('created_at', { ascending: false }),
      supabase.from('transactions').select('*, transaction_type:transaction_types(name), stage_statuses:transaction_stage_status(*)').eq('client_id', clientId).order('created_at', { ascending: false }),
      supabase.from('survey_work_files').select('*, survey_work:survey_works(id, area_name, property_number)').eq('survey_work.client_id', clientId),
      supabase.from('transaction_files').select('*, tss:transaction_stage_status(id, transaction:transactions(id, area_name, client_id))').eq('tss.transaction.client_id', clientId),
    ]);

    setClientSurveyWorks(swData.data || []);
    setClientTransactions(txData.data || []);

    const files: ClientFile[] = [];
    for (const f of (swFiles.data || []) as any[]) {
      files.push({
        id: f.id, name: f.name, file_url: f.file_url,
        context: 'مساحة', contextId: f.survey_work_id,
        contextName: `${f.survey_work?.area_name || ''} - عقار ${f.survey_work?.property_number || ''}`,
        created_at: f.created_at,
      });
    }
    for (const f of (txFiles.data || []) as any[]) {
      files.push({
        id: f.id, name: f.name, file_url: f.file_url,
        context: 'معاملة', contextId: f.transaction_stage_status_id,
        contextName: f.tss?.transaction?.area_name || 'معاملة',
        created_at: f.created_at,
      });
    }
    setClientFiles(files);
    setLoadingDetail(false);
  };

  useEffect(() => {
    if (selected) fetchClientDetail(selected.id);
    else {
      setClientSurveyWorks([]);
      setClientTransactions([]);
      setClientFiles([]);
    }
  }, [selected?.id]);

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

      {/* Client detail panel */}
      {selected && (
        <ClientDetailPanel
          client={selected}
          surveyWorks={clientSurveyWorks}
          transactions={clientTransactions}
          files={clientFiles}
          loading={loadingDetail}
          isMobile={isMobile}
          onClose={() => setSelected(null)}
          onEdit={() => openEdit(selected)}
        />
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(24px)',
          zIndex: 50, display: 'flex', alignItems: isMobile ? 'flex-end' : 'center',
          justifyContent: 'center', padding: isMobile ? 0 : undefined
        }}>
          <div className="modal-content" style={{
            background: 'rgba(14,14,14,0.97)',
            border: isMobile ? 'none' : '1px solid rgba(255,255,255,0.08)',
            backdropFilter: 'blur(40px)',
            borderRadius: isMobile ? '20px 20px 0 0' : 20,
            padding: isMobile ? 20 : 24,
            paddingTop: isMobile ? 'max(20px, env(safe-area-inset-top, 20px))' : 24,
            paddingBottom: isMobile ? 'max(20px, env(safe-area-inset-bottom, 20px))' : 24,
            width: isMobile ? '100vw' : 460,
            maxWidth: isMobile ? '100vw' : 460,
            maxHeight: isMobile ? '92vh' : '90vh',
            overflowY: 'auto', WebkitOverflowScrolling: 'touch'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ fontWeight: 700, fontSize: 16, color: '#e8e8e8' }}>{editing ? 'تعديل الزبون' : 'زبون جديد'}</div>
              <button onClick={() => setShowModal(false)} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 8, padding: 8, cursor: 'pointer', color: '#aaa', minHeight: 40 }}><X size={18} /></button>
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
                    placeholder={placeholder} style={{ ...inp, minHeight: isMobile ? 48 : 'auto', fontSize: isMobile ? 14 : 13 }} />
                </div>
              ))}
              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#888', marginBottom: 6, fontWeight: 500 }}>ملاحظات</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  rows={3} placeholder="ملاحظات..." style={{ ...inp, resize: 'none', fontSize: isMobile ? 14 : 13 }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 20, flexDirection: isMobile ? 'column' : 'row' }}>
              <button onClick={() => setShowModal(false)} className="btn-secondary" style={{ flex: 1, padding: isMobile ? 14 : '11px', borderRadius: 12, fontSize: 13, fontWeight: 600, minHeight: isMobile ? 48 : 'auto' }}>إلغاء</button>
              <button onClick={save} disabled={saving || !form.name.trim()} className="btn-primary"
                style={{ flex: isMobile ? 1 : 2, padding: isMobile ? 14 : '11px', borderRadius: 12, fontSize: 13, fontWeight: 600, minHeight: isMobile ? 48 : 'auto' }}>
                {saving ? 'جاري الحفظ...' : editing ? 'حفظ التعديلات' : 'إضافة الزبون'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ClientDetailPanel({ client, surveyWorks, transactions, files, loading, isMobile, onClose, onEdit }: {
  client: Client;
  surveyWorks: SurveyWork[];
  transactions: Transaction[];
  files: ClientFile[];
  loading: boolean;
  isMobile: boolean;
  onClose: () => void;
  onEdit: () => void;
}) {
  const [activeTab, setActiveTab] = useState<'overview' | 'works' | 'transactions' | 'files'>('overview');

  const panelStyle = isMobile ? {
    position: 'fixed' as const,
    inset: 0,
    width: '100vw',
    height: '100vh',
    background: 'rgba(14,14,14,0.98)',
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    zIndex: 100,
    overflow: 'auto',
    display: 'flex',
    flexDirection: 'column' as const,
    paddingTop: 'max(0px, env(safe-area-inset-top, 0px))',
    paddingBottom: 'max(0px, env(safe-area-inset-bottom, 0px))'
  } : {
    width: 420,
    background: '#111',
    borderRight: '1px solid #1e1e1e',
    display: 'flex',
    flexDirection: 'column' as const,
    height: '100vh',
    overflow: 'hidden'
  };

  return (
    <div style={panelStyle}>
      {/* Header */}
      <div style={{ padding: isMobile ? 14 : 16, borderBottom: '1px solid #1e1e1e' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          {isMobile && (
            <button onClick={onClose} style={{
              background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 10,
              padding: 10, cursor: 'pointer', color: '#ccc', fontWeight: 600, fontSize: 13,
              display: 'flex', alignItems: 'center', gap: 4, minHeight: 44
            }}>
              ← رجوع
            </button>
          )}
          <div style={{ fontWeight: 700, fontSize: 15, color: '#e8e8e8' }}>ملف الزبون</div>
          {!isMobile && (
            <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 8, padding: 6, cursor: 'pointer', color: '#aaa' }}>
              <X size={14} />
            </button>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: 'linear-gradient(135deg, #f97316, #d4952b)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 22, fontWeight: 700, color: 'white' }}>{client.name.charAt(0)}</span>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 16, color: '#e8e8e8' }}>{client.name}</div>
            <div style={{ fontSize: 11, color: '#555', marginTop: 4 }}>
              مسجل منذ {new Date(client.created_at).toLocaleDateString('ar-LB')}
            </div>
          </div>
          <button onClick={onEdit} style={{ background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.2)', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', color: '#f97316', fontSize: 12, fontWeight: 600 }}>
            <Edit3 size={12} style={{ display: 'inline', marginLeft: 4 }} /> تعديل
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, padding: isMobile ? 10 : 12, background: 'rgba(255,255,255,0.02)', flexWrap: 'wrap' }}>
        {(['overview', 'works', 'transactions', 'files'] as const).map(tab => {
          const labels = { overview: 'نظرة عامة', works: `الأعمال (${surveyWorks.length})`, transactions: `المعاملات (${transactions.length})`, files: `الملفات (${files.length})` };
          return (
            <button key={tab} onClick={() => setActiveTab(tab)}
              style={{
                flex: 1, minWidth: isMobile ? '45%' : 'auto',
                padding: isMobile ? 12 : 10, borderRadius: 10, border: 'none', cursor: 'pointer',
                fontSize: isMobile ? 12 : 11, fontWeight: 600, transition: 'all 0.2s',
                background: activeTab === tab ? 'linear-gradient(135deg, #f97316, #d4952b)' : 'rgba(255,255,255,0.04)',
                color: activeTab === tab ? 'white' : '#888',
                minHeight: isMobile ? 44 : 'auto'
              }}>
              {labels[tab]}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
        {loading ? (
          <div style={{ textAlign: 'center', color: '#555', paddingTop: 40 }}>جاري التحميل...</div>
        ) : (
          <>
            {activeTab === 'overview' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {client.phone && (
                  <InfoRow icon={<Phone size={14} />} label="الهاتف" value={client.phone} />
                )}
                {client.email && (
                  <InfoRow icon={<Mail size={14} />} label="الإيميل" value={client.email} />
                )}
                {client.address && (
                  <InfoRow icon={<MapPin size={14} />} label="العنوان" value={client.address} />
                )}
                {client.notes && (
                  <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid #1e1e1e', borderRadius: 10, padding: '10px 12px' }}>
                    <div style={{ fontSize: 10, color: '#555', marginBottom: 4 }}>ملاحظات</div>
                    <div style={{ fontSize: 13, color: '#ccc' }}>{client.notes}</div>
                  </div>
                )}

                {/* Quick stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginTop: 8 }}>
                  <StatCard label="أعمال مساحة" value={surveyWorks.length} color="#f97316" />
                  <StatCard label="معاملات" value={transactions.length} color="#d4952b" />
                  <StatCard label="ملفات" value={files.length} color="#4ade80" />
                </div>

                {/* Recent works */}
                {surveyWorks.length > 0 && (
                  <div style={{ marginTop: 16 }}>
                    <div style={{ fontSize: 12, color: '#888', fontWeight: 600, marginBottom: 8 }}>آخر الأعمال</div>
                    {surveyWorks.slice(0, 3).map(w => (
                      <div key={w.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: '#161616', border: '1px solid #1e1e1e', borderRadius: 10, marginBottom: 6 }}>
                        <Ruler size={14} color="#f97316" />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, color: '#e8e8e8' }}>{w.area_name}</div>
                          <div style={{ fontSize: 11, color: '#666' }}>عقار {w.property_number}</div>
                        </div>
                        <span className={`tag ${w.status === 'completed' ? 'tag-green' : 'tag-orange'}`}>
                          {w.status === 'completed' ? 'مكتمل' : 'جاري'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'works' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {surveyWorks.length === 0 ? (
                  <EmptyState icon={<Ruler size={28} />} text="لا توجد أعمال مساحة" />
                ) : surveyWorks.map(w => (
                  <div key={w.id} style={{ background: '#161616', border: '1px solid #1e1e1e', borderRadius: 12, padding: '12px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13, color: '#e8e8e8' }}>{w.area_name}</div>
                        <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>عقار {w.property_number} — {w.district}</div>
                      </div>
                      <span className={`tag ${w.status === 'completed' ? 'tag-green' : 'tag-orange'}`}>
                        {w.status === 'completed' ? 'مكتمل' : 'جاري'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                      <div style={{ fontSize: 11, color: '#555', background: '#1e1e1e', padding: '4px 8px', borderRadius: 6 }}>
                        {(w.items || []).filter(i => i.completed).length}/{(w.items || []).length} مراحل
                      </div>
                      <div style={{ fontSize: 11, color: '#555' }}>
                        {new Date(w.created_at).toLocaleDateString('ar-LB')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'transactions' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {transactions.length === 0 ? (
                  <EmptyState icon={<FileText size={28} />} text="لا توجد معاملات" />
                ) : transactions.map(t => (
                  <div key={t.id} style={{ background: '#161616', border: '1px solid #1e1e1e', borderRadius: 12, padding: '12px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13, color: '#e8e8e8' }}>
                          {(t.transaction_type as any)?.name || 'معاملة'}
                        </div>
                        {t.area_name && <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>{t.area_name}</div>}
                      </div>
                      <span className={`tag ${t.status === 'completed' ? 'tag-green' : 'tag-gold'}`}>
                        {t.status === 'completed' ? 'مكتمل' : 'جاري'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                      <div style={{ fontSize: 11, color: '#555', background: '#1e1e1e', padding: '4px 8px', borderRadius: 6 }}>
                        {(t.stage_statuses || []).filter(s => s.completed).length}/{(t.stage_statuses || []).length} مراحل
                      </div>
                      <div style={{ fontSize: 11, color: '#555' }}>
                        {new Date(t.created_at).toLocaleDateString('ar-LB')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'files' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {files.length === 0 ? (
                  <EmptyState icon={<Paperclip size={28} />} text="لا توجد ملفات" />
                ) : files.map(f => (
                  <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: '#161616', border: '1px solid #1e1e1e', borderRadius: 10 }}>
                    <FileText size={14} color={f.context === 'مساحة' ? '#f97316' : '#d4952b'} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, color: '#e8e8e8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</div>
                      <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>{f.contextName}</div>
                    </div>
                    <span className={`tag ${f.context === 'مساحة' ? 'tag-orange' : 'tag-gold'}`}>{f.context}</span>
                    {f.file_url && (
                      <a href={f.file_url} download target="_blank" rel="noreferrer" style={{ color: '#f97316', padding: 4 }}>
                        <Download size={14} />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid #1e1e1e', borderRadius: 10, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ color: '#f97316' }}>{icon}</span>
      <div>
        <div style={{ fontSize: 10, color: '#555', marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: 13, color: '#e8e8e8' }}>{value}</div>
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid #1e1e1e', borderRadius: 10, padding: '12px', textAlign: 'center' }}>
      <div style={{ fontSize: 20, fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: 10, color: '#666', marginTop: 4 }}>{label}</div>
    </div>
  );
}

function EmptyState({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div style={{ textAlign: 'center', color: '#444', paddingTop: 40 }}>
      <div style={{ marginBottom: 8 }}>{icon}</div>
      <div style={{ fontSize: 13 }}>{text}</div>
    </div>
  );
}
