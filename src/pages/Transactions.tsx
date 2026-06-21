import { useState, useEffect, useCallback } from 'react';
import {
  Plus, X, ChevronDown, ChevronRight, Folder, FolderOpen,
  File, Download, User, MapPin, CheckSquare,
  Square, Trash2, Settings, FileText, Image, Check, ArrowLeft
} from 'lucide-react';
import { supabase, uploadFile } from '../lib/supabase';
import { LEBANON_DATA, getDistricts } from '../lib/data/lebanon';
import { useIsMobile } from '../hooks/useIsMobile';
import { FileUploadWithCamera, FileUploadProgress } from '../components/FileUploadWithCamera';
import type { TransactionType, TransactionTypeStage, Transaction, TransactionStageStatus, Client } from '../types';

type TabMode = 'types' | 'active' | 'library';

export default function Transactions() {
  const isMobile = useIsMobile();
  const [tab, setTab] = useState<TabMode>('types');
  const [types, setTypes] = useState<TransactionType[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [selected, setSelected] = useState<Transaction | null>(null);
  const [selectedType, setSelectedType] = useState<TransactionType | null>(null);
  const [showAddType, setShowAddType] = useState(false);
  const [showAddTx, setShowAddTx] = useState(false);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  const fetchAll = useCallback(async () => {
    const { data: typesData } = await supabase
      .from('transaction_types')
      .select('*, stages:transaction_type_stages(*)')
      .order('created_at');
    if (typesData) {
      setTypes(typesData.map(t => ({ ...t, stages: [...(t.stages ?? [])].sort((a: any, b: any) => a.order_index - b.order_index) })));
    }
    const { data: txData } = await supabase
      .from('transactions')
      .select('*, client:clients(name), transaction_type:transaction_types(name), stage_statuses:transaction_stage_status(*, stage:transaction_type_stages(*), files:transaction_files(*))')
      .order('created_at', { ascending: false });
    if (txData) setTransactions(txData as Transaction[]);
    const { data: clientsData } = await supabase.from('clients').select('*').order('name');
    if (clientsData) setClients(clientsData);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const active = transactions.filter(t => t.status === 'active');
  const completed = transactions.filter(t => t.status === 'completed');

  const toggleNode = (k: string) => setExpandedNodes(prev => {
    const next = new Set(prev); next.has(k) ? next.delete(k) : next.add(k); return next;
  });

  const toggleStage = async (ss: TransactionStageStatus) => {
    await supabase.from('transaction_stage_status').update({ completed: !ss.completed }).eq('id', ss.id);
    const tx = transactions.find(t => t.id === ss.transaction_id);
    if (tx) {
      const updated = tx.stage_statuses?.map(s => s.id === ss.id ? { ...s, completed: !ss.completed } : s) ?? [];
      if (updated.length > 0 && updated.every(s => s.completed)) {
        await supabase.from('transactions').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', tx.id);
      }
    }
    fetchAll();
  };

  const deleteType = async (id: string) => {
    if (!confirm('حذف هذا النوع وجميع مراحله؟')) return;
    await supabase.from('transaction_types').delete().eq('id', id);
    if (selectedType?.id === id) setSelectedType(null);
    fetchAll();
  };

  const deleteTx = async (id: string) => {
    if (!confirm('حذف هذه المعاملة؟')) return;
    await supabase.from('transactions').delete().eq('id', id);
    if (selected?.id === id) setSelected(null);
    fetchAll();
  };

  const libraryTree = buildLibraryTree(completed);

  return (
    <div style={{ display: 'flex', height: isMobile ? 'auto' : '100vh', overflow: 'hidden', flexDirection: isMobile ? 'column' : 'row' }}>
      {!isMobile || !selected ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: isMobile ? '12px' : '20px 0 20px 24px', minWidth: 0, minHeight: isMobile ? '100vh' : 'auto', height: isMobile ? 'auto' : '100vh', overflowY: isMobile ? 'auto' : 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 18, color: '#e8e8e8' }}>المعاملات</div>
              <div style={{ fontSize: 12, color: '#555', marginTop: 2 }}>Transactions</div>
            </div>
            <button
              onClick={() => tab === 'types' ? setShowAddType(true) : setShowAddTx(true)}
              className="btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 12, fontSize: 13, fontWeight: 600 }}>
              <Plus size={16} /> {tab === 'types' ? 'نوع جديد' : 'معاملة جديدة'}
            </button>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 4, background: '#111', borderRadius: 12, padding: 4, marginBottom: 16 }}>
            {([['types', `أنواع المعاملات (${types.length})`], ['active', `المعاملات الجارية (${active.length})`], ['library', `المكتبة (${completed.length})`]] as const).map(([m, l]) => (
              <button key={m} onClick={() => setTab(m as TabMode)}
                style={{ flex: 1, padding: isMobile ? '6px' : '8px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: isMobile ? 10 : 12, fontWeight: 600, transition: 'all 0.2s',
                  background: tab === m ? 'linear-gradient(135deg, #f97316, #d4952b)' : 'transparent',
                  color: tab === m ? 'white' : '#555' }}>
                {isMobile ? (m === 'types' ? `أنواع (${types.length})` : m === 'active' ? `جاري (${active.length})` : `مكتبة (${completed.length})`) : l}
              </button>
            ))}
          </div>

          {tab === 'types' && (
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {types.length === 0 ? (
                <EmptyState icon={<Settings size={36} color="#333" />} text="لا توجد أنواع معاملات بعد" />
              ) : types.map(t => (
                <div key={t.id} onClick={() => setSelectedType(selectedType?.id === t.id ? null : t)}
                  style={{ background: selectedType?.id === t.id ? 'rgba(249,115,22,0.06)' : '#161616',
                    border: `1px solid ${selectedType?.id === t.id ? 'rgba(249,115,22,0.3)' : '#1e1e1e'}`,
                    borderRadius: 14, padding: '14px 16px', cursor: 'pointer', transition: 'all 0.2s' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(212,149,43,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <FileText size={16} color="#d4952b" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, color: '#e8e8e8' }}>{t.name}</div>
                      <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>{(t.stages ?? []).length} مراحل</div>
                    </div>
                    <button onClick={e => { e.stopPropagation(); deleteType(t.id); }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#444' }}><Trash2 size={14} /></button>
                  </div>
                  {selectedType?.id === t.id && (
                    <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {(t.stages ?? []).map((s, i) => (
                        <div key={s.id} style={{ display: 'flex', gap: 10, padding: '10px 12px', background: 'rgba(255,255,255,0.03)', border: '1px solid #1e1e1e', borderRadius: 10, alignItems: 'flex-start', flexDirection: isMobile ? 'column' : 'row' }}>
                          <div style={{ width: 22, height: 22, borderRadius: 6, background: 'rgba(249,115,22,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: '#f97316' }}>{i + 1}</span>
                          </div>
                          <div style={{ flex: 1, width: isMobile ? '100%' : 'auto' }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: '#e8e8e8' }}>{s.name}</div>
                            {s.description && <div style={{ fontSize: 12, color: '#666', marginTop: 3 }}>{s.description}</div>}
                            {s.notes && <div style={{ fontSize: 11, color: '#555', marginTop: 3, fontStyle: 'italic' }}>{s.notes}</div>}
                            {s.image_url && (
                              <img src={s.image_url} alt={s.name} style={{ marginTop: 8, maxWidth: '100%', maxHeight: 120, borderRadius: 8, objectFit: 'cover' }} />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {tab === 'active' && (
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {active.length === 0 ? (
                <EmptyState icon={<FileText size={36} color="#333" />} text="لا توجد معاملات جارية" />
              ) : active.map(tx => (
                <TxCard key={tx.id} tx={tx} selected={selected?.id === tx.id}
                  onClick={() => setSelected(selected?.id === tx.id ? null : tx)}
                  onDelete={deleteTx} isMobile={isMobile} />
              ))}
            </div>
          )}

          {tab === 'library' && (
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {libraryTree.length === 0 ? (
                <EmptyState icon={<FolderOpen size={36} color="#333" />} text="مكتبة المعاملات فارغة" />
              ) : libraryTree.map(gov => (
                <TreeNode key={gov.key} label={gov.label} icon={<Folder size={15} />}
                  level={0} expanded={expandedNodes.has(gov.key)} onToggle={() => toggleNode(gov.key)} badge={gov.count}>
                  {gov.districts.map(dist => (
                    <TreeNode key={dist.key} label={dist.label} icon={<Folder size={14} />}
                      level={1} expanded={expandedNodes.has(dist.key)} onToggle={() => toggleNode(dist.key)} badge={dist.count}>
                      {dist.letters.map(letter => (
                        <TreeNode key={letter.key} label={letter.label} icon={<FolderOpen size={13} />}
                          level={2} expanded={expandedNodes.has(letter.key)} onToggle={() => toggleNode(letter.key)} badge={letter.count}>
                          {letter.txs.map(t => (
                            <div key={t.id} onClick={() => setSelected(selected?.id === t.id ? null : t)}
                              style={{ paddingRight: 56, paddingTop: 8, paddingBottom: 8, paddingLeft: 12, cursor: 'pointer', borderRadius: 8, marginBottom: 2,
                                background: selected?.id === t.id ? 'rgba(249,115,22,0.08)' : 'transparent',
                                display: 'flex', alignItems: 'center', gap: 8 }}>
                              <File size={13} color="#555" />
                              <span style={{ fontSize: 13, color: '#ccc' }}>
                                {t.area_name} — عقار {t.property_number}
                              </span>
                              <span className="tag tag-green" style={{ marginRight: 'auto' }}>مكتمل</span>
                            </div>
                          ))}
                        </TreeNode>
                      ))}
                    </TreeNode>
                  ))}
                </TreeNode>
              ))}
            </div>
          )}
        </div>
      ) : null}

      {/* Detail panel - full width overlay on mobile */}
      {selected && (
        isMobile ? (
          <div style={{ position: 'fixed', inset: 0, background: '#111', zIndex: 40, display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '12px', borderBottom: '1px solid #1e1e1e', display: 'flex', alignItems: 'center', gap: 12 }}>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#aaa', padding: 4 }}>
                <ArrowLeft size={20} />
              </button>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#e8e8e8' }}>{(selected.transaction_type as any)?.name ?? 'معاملة'}</div>
                <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>{selected.client ? (selected.client as any).name : ''} {selected.area_name ? `— ${selected.area_name}` : ''}</div>
              </div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              <TxDetailPanel tx={selected} onClose={() => setSelected(null)}
                onToggleStage={toggleStage} onRefresh={fetchAll} isMobile={isMobile} />
            </div>
          </div>
        ) : (
          <TxDetailPanel tx={selected} onClose={() => setSelected(null)}
            onToggleStage={toggleStage} onRefresh={fetchAll} isMobile={isMobile} />
        )
      )}

      {showAddType && (
        <AddTypeModal onClose={() => setShowAddType(false)} onSaved={() => { fetchAll(); setShowAddType(false); }} isMobile={isMobile} />
      )}
      {showAddTx && (
        <AddTxModal types={types} clients={clients} onClose={() => setShowAddTx(false)}
          onSaved={() => { fetchAll(); setShowAddTx(false); }} isMobile={isMobile} />
      )}
    </div>
  );
}

function TxCard({ tx, selected, onClick, onDelete, isMobile }: { tx: Transaction; selected: boolean; onClick: () => void; onDelete: (id: string) => void; isMobile: boolean }) {
  const stages = tx.stage_statuses ?? [];
  const done = stages.filter(s => s.completed).length;
  const progress = stages.length > 0 ? (done / stages.length) * 100 : 0;
  return (
    <div onClick={onClick} style={{ background: selected ? 'rgba(249,115,22,0.06)' : '#161616',
      border: `1px solid ${selected ? 'rgba(249,115,22,0.3)' : '#1e1e1e'}`, borderRadius: 14, padding: '14px 16px', cursor: 'pointer', transition: 'all 0.2s', display: isMobile ? 'block' : 'flex', flexDirection: isMobile ? undefined : 'column' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, flexDirection: isMobile ? 'column' : 'row' }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(212,149,43,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <FileText size={16} color="#d4952b" />
        </div>
        <div style={{ flex: 1, minWidth: 0, width: isMobile ? '100%' : 'auto' }}>
          <div style={{ fontWeight: 600, fontSize: 14, color: '#e8e8e8' }}>
            {(tx.transaction_type as any)?.name ?? 'معاملة'}
          </div>
          <div style={{ display: 'flex', alignItems: isMobile ? 'flex-start' : 'center', gap: 12, marginTop: 4, flexWrap: 'wrap', flexDirection: isMobile ? 'column' : 'row' }}>
            {tx.client && (
              <span style={{ fontSize: 12, color: '#666', display: 'flex', alignItems: 'center', gap: 4 }}>
                <User size={11} /> {(tx.client as any).name}
              </span>
            )}
            {tx.area_name && (
              <span style={{ fontSize: 12, color: '#666', display: 'flex', alignItems: 'center', gap: 4 }}>
                <MapPin size={11} /> {tx.governorate} / {tx.district}
              </span>
            )}
          </div>
          {stages.length > 0 && (
            <div style={{ marginTop: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 11, color: '#666' }}>{done}/{stages.length} مرحلة</span>
                <span style={{ fontSize: 11, color: '#d4952b' }}>{Math.round(progress)}%</span>
              </div>
              <div style={{ height: 4, background: '#1e1e1e', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg, #d4952b, #f97316)', borderRadius: 2, transition: 'width 0.3s' }} />
              </div>
            </div>
          )}
        </div>
        <button onClick={e => { e.stopPropagation(); onDelete(tx.id); }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#444', padding: 4, flexShrink: 0 }}><Trash2 size={14} /></button>
      </div>
    </div>
  );
}

function TxDetailPanel({ tx, onClose, onToggleStage, onRefresh, isMobile }: {
  tx: Transaction; onClose: () => void;
  onToggleStage: (ss: TransactionStageStatus) => void; onRefresh: () => void; isMobile: boolean;
}) {
  const stages = [...(tx.stage_statuses ?? [])].sort((a, b) => (a.stage?.order_index ?? 0) - (b.stage?.order_index ?? 0));
  const [openStage, setOpenStage] = useState<string | null>(null);
  const [stageNotes, setStageNotes] = useState<Record<string, string>>({});
  const [filesToUpload, setFilesToUpload] = useState<Record<string, File[]>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [statusChanging, setStatusChanging] = useState(false);

  const saveStageNote = async (ssId: string) => {
    setSaving(s => ({ ...s, [ssId]: true }));
    await supabase.from('transaction_stage_status').update({ notes: stageNotes[ssId] }).eq('id', ssId);
    setSaving(s => ({ ...s, [ssId]: false }));
    onRefresh();
  };

  const uploadStageFiles = async (ssId: string) => {
    const files = filesToUpload[ssId] || [];
    if (files.length === 0) return;
    setSaving(s => ({ ...s, [`file_${ssId}`]: true }));
    for (const f of files) {
      const url = await uploadFile(f, `transactions/${tx.id}/${ssId}/${Date.now()}_${f.name}`);
      if (url) {
        await supabase.from('transaction_files').insert({ transaction_stage_status_id: ssId, name: f.name, file_url: url, file_size: f.size, mime_type: f.type });
      }
    }
    setFilesToUpload(s => ({ ...s, [ssId]: [] }));
    setSaving(s => ({ ...s, [`file_${ssId}`]: false }));
    onRefresh();
  };

  const toggleStatus = async () => {
    setStatusChanging(true);
    const newStatus = tx.status === 'completed' ? 'active' : 'completed';
    await supabase.from('transactions').update({
      status: newStatus,
      completed_at: newStatus === 'completed' ? new Date().toISOString() : null
    }).eq('id', tx.id);
    setStatusChanging(false);
    onRefresh();
  };

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
      width: 360,
      background: '#111',
      borderRight: '1px solid #1e1e1e',
      display: 'flex',
      flexDirection: 'column' as const,
      height: '100vh',
      overflow: 'hidden'
    };

  return (
    <div style={panelStyle}>
      {isMobile && (
        <div style={{ padding: 14, borderBottom: '1px solid #1e1e1e' }}>
          <button onClick={onClose} style={{
            background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 10,
            padding: 10, cursor: 'pointer', color: '#ccc', fontWeight: 600, fontSize: 13,
            display: 'flex', alignItems: 'center', gap: 4, minHeight: 44
          }}>
            ← رجوع
          </button>
        </div>
      )}
      {!isMobile && (
        <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid #1e1e1e', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: '#e8e8e8' }}>{(tx.transaction_type as any)?.name ?? 'معاملة'}</div>
            <div style={{ fontSize: 12, color: '#666', marginTop: 3 }}>{tx.client ? (tx.client as any).name : ''} {tx.area_name ? `— ${tx.area_name}` : ''}</div>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 8, padding: 6, cursor: 'pointer', color: '#aaa' }}>
            <X size={14} />
          </button>
        </div>
      )}

      <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? 12 : 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span className={`tag ${tx.status === 'completed' ? 'tag-green' : 'tag-gold'}`} style={{ alignSelf: 'flex-start' }}>
            {tx.status === 'completed' ? 'مكتمل' : 'جاري'}
          </span>
          <button onClick={toggleStatus} disabled={statusChanging}
            style={{
              padding: '5px 12px',
              borderRadius: 8,
              border: 'none',
              cursor: 'pointer',
              fontSize: 11,
              fontWeight: 600,
              background: tx.status === 'completed' ? 'rgba(249,115,22,0.1)' : 'rgba(34,197,94,0.1)',
              color: tx.status === 'completed' ? '#f97316' : '#4ade80',
              display: 'flex',
              alignItems: 'center',
              gap: 4
            }}>
            <Check size={12} />
            {tx.status === 'completed' ? 'إعادة فتح' : 'إغلاق'}
          </button>
        </div>

        {stages.map((ss, i) => (
          <div key={ss.id} style={{ background: ss.completed ? 'rgba(34,197,94,0.05)' : 'rgba(255,255,255,0.03)',
            border: `1px solid ${ss.completed ? 'rgba(34,197,94,0.2)' : '#1e1e1e'}`, borderRadius: 12, overflow: 'hidden' }}>
            <div onClick={() => setOpenStage(openStage === ss.id ? null : ss.id)}
              style={{ display: 'flex', alignItems: isMobile ? 'flex-start' : 'center', gap: 10, padding: '12px 14px', cursor: 'pointer', flexDirection: isMobile ? 'column' : 'row' }}>
              <div style={{ width: 24, height: 24, borderRadius: 7, background: ss.completed ? 'rgba(34,197,94,0.15)' : 'rgba(249,115,22,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {ss.completed ? <Check size={13} color="#4ade80" /> : <span style={{ fontSize: 11, fontWeight: 700, color: '#f97316' }}>{i + 1}</span>}
              </div>
              <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: ss.completed ? '#4ade80' : '#ccc', width: isMobile ? '100%' : 'auto' }}>
                {ss.stage?.name ?? `المرحلة ${i + 1}`}
              </span>
              <button onClick={e => { e.stopPropagation(); onToggleStage(ss); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: ss.completed ? '#4ade80' : '#555', flexShrink: 0 }}>
                {ss.completed ? <CheckSquare size={16} /> : <Square size={16} />}
              </button>
            </div>
            {openStage === ss.id && (
              <div style={{ padding: '0 14px 14px', borderTop: '1px solid #1a1a1a' }}>
                {ss.stage?.description && <p style={{ fontSize: 12, color: '#888', marginBottom: 8, marginTop: 10 }}>{ss.stage.description}</p>}
                {ss.stage?.image_url && <img src={ss.stage.image_url} alt="" style={{ maxWidth: '100%', borderRadius: 8, marginBottom: 10 }} />}
                <textarea
                  value={stageNotes[ss.id] ?? (ss.notes ?? '')}
                  onChange={e => setStageNotes(s => ({ ...s, [ss.id]: e.target.value }))}
                  placeholder="ملاحظات هذه المرحلة..."
                  rows={2}
                  style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid #252525', borderRadius: 8, padding: '8px 10px', color: '#e8e8e8', fontSize: 12, resize: 'none', marginTop: 8 }}
                />
                <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                  <button onClick={() => saveStageNote(ss.id)} className="btn-primary"
                    style={{ fontSize: 11, padding: '6px 12px', borderRadius: 7, fontWeight: 600 }}>
                    {saving[ss.id] ? 'حفظ...' : 'حفظ'}
                  </button>
                </div>
                {/* Stage files */}
                <div style={{ marginTop: 10 }}>
                  {(ss.files ?? []).map(f => (
                    <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, padding: '6px 8px', background: 'rgba(255,255,255,0.03)', borderRadius: 7, flexWrap: 'wrap' }}>
                      <File size={11} color="#d4952b" />
                      <span style={{ flex: 1, fontSize: 11, color: '#ccc', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>{f.name}</span>
                      {f.file_url && <a href={f.file_url} download target="_blank" rel="noreferrer" style={{ color: '#f97316', flexShrink: 0 }}><Download size={11} /></a>}
                    </div>
                  ))}
                  <div style={{ marginTop: 6 }}>
                    <FileUploadWithCamera
                      onFilesSelected={(fs) => setFilesToUpload(prev => ({ ...prev, [ss.id]: [...(prev[ss.id] || []), ...fs] }))}
                      multiple={true}
                      compact={true}
                    />
                    <FileUploadProgress
                      files={filesToUpload[ss.id] || []}
                      onRemove={(idx) => setFilesToUpload(prev => ({ ...prev, [ss.id]: (prev[ss.id] || []).filter((_, j) => j !== idx) }))}
                      compact={true}
                    />
                    {(filesToUpload[ss.id]?.length || 0) > 0 && (
                      <button onClick={() => uploadStageFiles(ss.id)} className="btn-primary"
                        style={{ marginTop: 4, fontSize: 11, padding: '6px 12px', borderRadius: 7, fontWeight: 600, width: '100%' }}>
                        {saving[`file_${ss.id}`] ? 'رفع...' : `رفع ${filesToUpload[ss.id]?.length || 0} ملفات`}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function AddTypeModal({ onClose, onSaved, isMobile }: { onClose: () => void; onSaved: () => void; isMobile: boolean }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [stages, setStages] = useState<{ name: string; description: string; notes: string; imageFile: File | null }[]>([]);
  const [saving, setSaving] = useState(false);
  const inp: React.CSSProperties = {
    width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid #252525',
    borderRadius: 10, padding: isMobile ? '12px 14px' : '10px 14px',
    color: '#e8e8e8', fontSize: isMobile ? 14 : 13, minHeight: isMobile ? 48 : 'auto'
  };

  const addStage = () => setStages(s => [...s, { name: '', description: '', notes: '', imageFile: null }]);
  const updateStage = (i: number, key: string, value: any) => setStages(s => s.map((st, j) => j === i ? { ...st, [key]: value } : st));

  const save = async () => {
    if (!name.trim()) return;
    setSaving(true);
    const { data: typeData, error } = await supabase.from('transaction_types').insert({ name: name.trim(), description: description || null }).select().maybeSingle();
    if (error || !typeData) { setSaving(false); return; }
    for (let i = 0; i < stages.length; i++) {
      const st = stages[i];
      if (!st.name.trim()) continue;
      let imageUrl: string | null = null;
      if (st.imageFile) {
        imageUrl = await uploadFile(st.imageFile, `transaction-types/${typeData.id}/${Date.now()}_${st.imageFile.name}`);
      }
      await supabase.from('transaction_type_stages').insert({
        transaction_type_id: typeData.id, name: st.name.trim(),
        description: st.description || null, notes: st.notes || null,
        image_url: imageUrl, order_index: i,
      });
    }
    setSaving(false);
    onSaved();
  };

  const modalWidth = isMobile ? '100vw' : 560;

  return (
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
        width: modalWidth, maxWidth: modalWidth,
        maxHeight: isMobile ? '92vh' : '90vh',
        overflowY: 'auto', WebkitOverflowScrolling: 'touch'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: '#e8e8e8' }}>نوع معاملة جديد</div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 8, padding: 6, cursor: 'pointer', color: '#aaa' }}><X size={16} /></button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <FF label="اسم النوع *">
            <input value={name} onChange={e => setName(e.target.value)} placeholder="مثال: طلب استملاك" style={inp} />
          </FF>
          <FF label="وصف">
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} style={{ ...inp, resize: 'none' }} />
          </FF>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? 8 : 0 }}>
              <span style={{ fontSize: 12, color: '#888', fontWeight: 600 }}>المراحل</span>
              <button onClick={addStage} style={{ background: 'rgba(249,115,22,0.12)', border: '1px solid rgba(249,115,22,0.3)', borderRadius: 8, padding: '5px 12px', cursor: 'pointer', color: '#f97316', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4, width: isMobile ? '100%' : 'auto', justifyContent: 'center' }}>
                <Plus size={13} /> إضافة مرحلة
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {stages.map((st, i) => (
                <div key={i} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid #1e1e1e', borderRadius: 12, padding: '12px 14px' }}>
                  <div style={{ display: 'flex', alignItems: isMobile ? 'flex-start' : 'center', justifyContent: 'space-between', marginBottom: 10, flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? 8 : 0 }}>
                    <span style={{ fontSize: 12, color: '#f97316', fontWeight: 700 }}>المرحلة {i + 1}</span>
                    <button onClick={() => setStages(s => s.filter((_, j) => j !== i))}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#555' }}><X size={13} /></button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <input value={st.name} onChange={e => updateStage(i, 'name', e.target.value)} placeholder="اسم المرحلة *" style={inp} />
                    <input value={st.description} onChange={e => updateStage(i, 'description', e.target.value)} placeholder="وصف المرحلة" style={inp} />
                    <textarea value={st.notes} onChange={e => updateStage(i, 'notes', e.target.value)} placeholder="ملاحظات" rows={2} style={{ ...inp, resize: 'none' }} />
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'rgba(255,255,255,0.03)', border: '1px dashed #333', borderRadius: 8, cursor: 'pointer', color: '#888', fontSize: 12, flexWrap: 'wrap', justifyContent: isMobile ? 'center' : 'flex-start' }}>
                      <Image size={13} />
                      <span>{st.imageFile ? st.imageFile.name : 'إضافة صورة للمرحلة'}</span>
                      <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => updateStage(i, 'imageFile', e.target.files?.[0] ?? null)} />
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 20, flexDirection: isMobile ? 'column-reverse' : 'row' }}>
          <button onClick={onClose} className="btn-secondary" style={{ flex: 1, padding: '11px', borderRadius: 12, fontSize: 13, fontWeight: 600 }}>إلغاء</button>
          <button onClick={save} disabled={saving || !name.trim()} className="btn-primary" style={{ flex: isMobile ? 1 : 2, padding: '11px', borderRadius: 12, fontSize: 13, fontWeight: 600 }}>
            {saving ? 'جاري الحفظ...' : 'حفظ النوع'}
          </button>
        </div>
      </div>
    </div>
  );
}

function AddTxModal({ types, clients, onClose, onSaved, isMobile }: { types: TransactionType[]; clients: Client[]; onClose: () => void; onSaved: () => void; isMobile: boolean }) {
  const [typeId, setTypeId] = useState('');
  const [clientId, setClientId] = useState('');
  const [governorate, setGovernorate] = useState('');
  const [district, setDistrict] = useState('');
  const [areaName, setAreaName] = useState('');
  const [propNum, setPropNum] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const selectedType = types.find(t => t.id === typeId);
  const districts = getDistricts(governorate);

  const save = async () => {
    if (!typeId) return;
    setSaving(true);
    const { data: txData, error } = await supabase.from('transactions').insert({
      transaction_type_id: typeId, client_id: clientId || null,
      governorate: governorate || null, district: district || null,
      area_name: areaName || null, property_number: propNum || null, notes: notes || null,
    }).select().maybeSingle();
    if (error || !txData) { setSaving(false); return; }
    const stgs = selectedType?.stages ?? [];
    if (stgs.length > 0) {
      await supabase.from('transaction_stage_status').insert(
        stgs.map(s => ({ transaction_id: txData.id, stage_id: s.id, completed: false }))
      );
    }
    setSaving(false);
    onSaved();
  };

  const inp: React.CSSProperties = {
    width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid #252525',
    borderRadius: 10, padding: isMobile ? '12px 14px' : '10px 14px',
    color: '#e8e8e8', fontSize: isMobile ? 14 : 13, minHeight: isMobile ? 48 : 'auto'
  };

  const modalWidth = isMobile ? '100vw' : 520;

  return (
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
        width: modalWidth, maxWidth: modalWidth,
        maxHeight: isMobile ? '92vh' : '90vh',
        overflowY: 'auto', WebkitOverflowScrolling: 'touch'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: '#e8e8e8' }}>معاملة جديدة</div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 8, padding: 6, cursor: 'pointer', color: '#aaa' }}><X size={16} /></button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <FF label="نوع المعاملة *">
            <select value={typeId} onChange={e => setTypeId(e.target.value)} style={inp}>
              <option value="">-- اختر النوع --</option>
              {types.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </FF>

          {selectedType && selectedType.stages && selectedType.stages.length > 0 && (
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid #1e1e1e', borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ fontSize: 12, color: '#888', fontWeight: 600, marginBottom: 8 }}>مراحل هذه المعاملة ({selectedType.stages.length})</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {selectedType.stages.map((s, i) => (
                  <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#888', flexWrap: 'wrap' }}>
                    <span style={{ width: 18, height: 18, background: 'rgba(249,115,22,0.1)', borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#f97316', fontWeight: 700, flexShrink: 0 }}>{i+1}</span>
                    {s.name}
                  </div>
                ))}
              </div>
            </div>
          )}

          <FF label="الزبون">
            <select value={clientId} onChange={e => setClientId(e.target.value)} style={inp}>
              <option value="">-- اختر زبون --</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </FF>

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
            <FF label="المحافظة">
              <select value={governorate} onChange={e => { setGovernorate(e.target.value); setDistrict(''); }} style={inp}>
                <option value="">-- اختر محافظة --</option>
                {LEBANON_DATA.map(g => <option key={g.name} value={g.name}>{g.name}</option>)}
              </select>
            </FF>
            <FF label="القضاء">
              <select value={district} onChange={e => setDistrict(e.target.value)} style={inp} disabled={!governorate}>
                <option value="">-- اختر قضاء --</option>
                {districts.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </FF>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
            <FF label="المنطقة العقارية">
              <input value={areaName} onChange={e => setAreaName(e.target.value)} placeholder="اسم المنطقة" style={inp} />
            </FF>
            <FF label="رقم العقار">
              <input value={propNum} onChange={e => setPropNum(e.target.value)} placeholder="رقم العقار" style={inp} />
            </FF>
          </div>

          <FF label="ملاحظات">
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} style={{ ...inp, resize: 'none' }} />
          </FF>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 20, flexDirection: isMobile ? 'column-reverse' : 'row' }}>
          <button onClick={onClose} className="btn-secondary" style={{ flex: 1, padding: '11px', borderRadius: 12, fontSize: 13, fontWeight: 600 }}>إلغاء</button>
          <button onClick={save} disabled={saving || !typeId} className="btn-primary" style={{ flex: isMobile ? 1 : 2, padding: '11px', borderRadius: 12, fontSize: 13, fontWeight: 600, opacity: !typeId ? 0.5 : 1 }}>
            {saving ? 'جاري الحفظ...' : 'إنشاء المعاملة'}
          </button>
        </div>
      </div>
    </div>
  );
}

function FF({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 12, color: '#888', marginBottom: 6, fontWeight: 500 }}>{label}</label>
      {children}
    </div>
  );
}

function TreeNode({ label, icon, level, expanded, onToggle, badge, children }: { label: string; icon: React.ReactNode; level: number; expanded: boolean; onToggle: () => void; badge?: number; children?: React.ReactNode; }) {
  return (
    <div>
      <div onClick={onToggle} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: `9px 12px 9px ${12 + level * 16}px`, borderRadius: 8, cursor: 'pointer', marginBottom: 2 }}
        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'}
        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
        {expanded ? <ChevronDown size={13} color="#555" /> : <ChevronRight size={13} color="#555" />}
        <span style={{ color: level === 0 ? '#f97316' : level === 1 ? '#d4952b' : '#aaa' }}>{icon}</span>
        <span style={{ fontSize: 13, fontWeight: level === 0 ? 600 : 500, color: level === 0 ? '#e8e8e8' : '#bbb', flex: 1 }}>{label}</span>
        {badge !== undefined && <span style={{ fontSize: 11, color: '#555', background: '#1e1e1e', borderRadius: 10, padding: '2px 7px', flexShrink: 0 }}>{badge}</span>}
      </div>
      {expanded && children}
    </div>
  );
}

function EmptyState({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div style={{ textAlign: 'center', color: '#444', marginTop: 80 }}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>{icon}</div>
      <div style={{ fontSize: 13 }}>{text}</div>
    </div>
  );
}

interface LibTree {
  key: string; label: string; count: number;
  districts: { key: string; label: string; count: number;
    letters: { key: string; label: string; count: number; txs: Transaction[] }[] }[];
}

function buildLibraryTree(txs: Transaction[]): LibTree[] {
  const tree: Record<string, Record<string, Record<string, Transaction[]>>> = {};
  for (const t of txs) {
    const g = t.governorate || 'غير محدد';
    const d = t.district || 'غير محدد';
    const l = (t.area_name || 'أ').charAt(0).toUpperCase();
    if (!tree[g]) tree[g] = {};
    if (!tree[g][d]) tree[g][d] = {};
    if (!tree[g][d][l]) tree[g][d][l] = [];
    tree[g][d][l].push(t);
  }
  return Object.entries(tree).map(([gov, districts]) => ({
    key: gov, label: gov,
    count: Object.values(districts).flatMap(d => Object.values(d)).flat().length,
    districts: Object.entries(districts).map(([dist, letters]) => ({
      key: `${gov}-${dist}`, label: dist,
      count: Object.values(letters).flat().length,
      letters: Object.entries(letters).sort(([a], [b]) => a.localeCompare(b)).map(([letter, ltxs]) => ({
        key: `${gov}-${dist}-${letter}`, label: letter, count: ltxs.length,
        txs: ltxs.sort((a, b) => (a.property_number || '').localeCompare(b.property_number || '', undefined, { numeric: true })),
      })),
    })),
  }));
}
