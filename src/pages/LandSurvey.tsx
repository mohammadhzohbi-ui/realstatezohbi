import { useState, useEffect, useCallback } from 'react';
import {
  Plus, Search, X, ChevronDown, ChevronRight,
  Folder, FolderOpen, File, Download, CheckSquare,
  Square, User, MapPin, BookOpen, Ruler,
  Trash2, Check
} from 'lucide-react';
import { supabase, uploadFile } from '../lib/supabase';
import { LEBANON_DATA, getDistricts } from '../lib/data/lebanon';
import { useIsMobile } from '../hooks/useIsMobile';
import { FileUploadWithCamera, FileUploadProgress } from '../components/FileUploadWithCamera';
import type { SurveyWork, SurveyWorkItem, Client } from '../types';

type ViewMode = 'active' | 'library';

export default function LandSurvey() {
  const isMobile = useIsMobile();
  const [viewMode, setViewMode] = useState<ViewMode>('active');
  const [works, setWorks] = useState<SurveyWork[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedWork, setSelectedWork] = useState<SurveyWork | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  // Add work form
  const [form, setForm] = useState({
    client_id: '',
    governorate: '',
    district: '',
    area_name: '',
    property_number: '',
    notes: '',
  });
  const [newItemName, setNewItemName] = useState('');
  const [formItems, setFormItems] = useState<string[]>([]);
  const [formFiles, setFormFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);

  const fetchAll = useCallback(async () => {
    const { data: worksData } = await supabase
      .from('survey_works')
      .select('*, client:clients(name), items:survey_work_items(*), files:survey_work_files(*)')
      .order('created_at', { ascending: false });
    if (worksData) setWorks(worksData as SurveyWork[]);
    const { data: clientsData } = await supabase.from('clients').select('*').order('name');
    if (clientsData) setClients(clientsData);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const activeWorks = works.filter(w => w.status === 'active');
  const completedWorks = works.filter(w => w.status === 'completed');

  const filtered = activeWorks.filter(w =>
    !search || w.area_name.includes(search) || w.property_number.includes(search) ||
    w.governorate.includes(search) || w.district.includes(search) ||
    w.client?.name?.includes(search)
  );

  const saveWork = async () => {
    if (!form.governorate || !form.district || !form.area_name || !form.property_number) return;
    setSaving(true);
    const { data: workData, error } = await supabase.from('survey_works').insert({
      client_id: form.client_id || null,
      governorate: form.governorate,
      district: form.district,
      area_name: form.area_name,
      property_number: form.property_number,
      notes: form.notes || null,
    }).select().maybeSingle();
    if (error || !workData) { setSaving(false); return; }
    const workId = workData.id;
    if (formItems.length > 0) {
      await supabase.from('survey_work_items').insert(
        formItems.map((name, i) => ({ survey_work_id: workId, name, order_index: i }))
      );
    }
    for (const file of formFiles) {
      const url = await uploadFile(file, `survey/${workId}/${Date.now()}_${file.name}`);
      if (url) {
        await supabase.from('survey_work_files').insert({
          survey_work_id: workId, name: file.name, file_url: url, file_size: file.size, mime_type: file.type,
        });
      }
    }
    setSaving(false);
    setShowModal(false);
    resetForm();
    fetchAll();
  };

  const resetForm = () => {
    setForm({ client_id:'', governorate:'', district:'', area_name:'', property_number:'', notes:'' });
    setFormItems([]);
    setFormFiles([]);
    setNewItemName('');
  };

  const toggleItem = async (item: SurveyWorkItem) => {
    await supabase.from('survey_work_items').update({ completed: !item.completed }).eq('id', item.id);
    // Check if all items completed
    const work = works.find(w => w.id === item.survey_work_id);
    if (work) {
      const updatedItems = work.items?.map(i => i.id === item.id ? { ...i, completed: !item.completed } : i) ?? [];
      if (updatedItems.length > 0 && updatedItems.every(i => i.completed)) {
        await supabase.from('survey_works').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', work.id);
      }
    }
    fetchAll();
  };

  const deleteWork = async (id: string) => {
    if (!confirm('حذف هذا العمل؟')) return;
    await supabase.from('survey_works').delete().eq('id', id);
    if (selectedWork?.id === id) setSelectedWork(null);
    fetchAll();
  };

  const toggleNode = (key: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  // Build library tree: governorate > district > first letter > works
  const libraryTree = buildLibraryTree(completedWorks);

  return (
    <div style={{
      display: 'flex',
      height: isMobile ? 'auto' : '100vh',
      minHeight: '100vh',
      overflow: isMobile ? 'auto' : 'hidden',
      overflowY: isMobile ? 'auto' : undefined,
      padding: isMobile ? '12px' : '0',
      flexDirection: isMobile && selectedWork ? 'column' : 'row'
    }}>
      {/* Left panel */}
      {!isMobile || !selectedWork ? (
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        padding: isMobile ? '0' : '20px 0 20px 24px',
        minWidth: 0,
        width: isMobile ? '100%' : 'auto'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, paddingRight: 0 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 18, color: '#e8e8e8' }}>أعمال المساحة</div>
            <div style={{ fontSize: 12, color: '#555', marginTop: 2 }}>Land Survey Works</div>
          </div>
          <button onClick={() => setShowModal(true)} className="btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 12, fontSize: 13, fontWeight: 600 }}>
            <Plus size={16} /> عمل جديد
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, background: '#111', borderRadius: 12, padding: 4, marginBottom: 16 }}>
          {(['active', 'library'] as ViewMode[]).map(m => (
            <button key={m} onClick={() => setViewMode(m)}
              style={{ flex: 1, padding: '8px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, transition: 'all 0.2s',
                background: viewMode === m ? 'linear-gradient(135deg, #f97316, #d4952b)' : 'transparent',
                color: viewMode === m ? 'white' : '#555' }}>
              {m === 'active' ? `الأعمال الجارية (${activeWorks.length})` : `المكتبة (${completedWorks.length})`}
            </button>
          ))}
        </div>

        {viewMode === 'active' && (
          <>
            {/* Search */}
            <div style={{ position: 'relative', marginBottom: 12 }}>
              <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#555' }} />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="بحث بالمنطقة، رقم العقار، الزبون..."
                style={{ width: '100%', background: '#111', border: '1px solid #1e1e1e', borderRadius: 10, padding: '9px 12px 9px 36px', color: '#e8e8e8', fontSize: 13 }} />
            </div>

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {filtered.length === 0 ? (
                <EmptyState icon={<Ruler size={36} color="#333" />} text="لا توجد أعمال جارية" />
              ) : (
                filtered.map(work => (
                  <WorkCard key={work.id} work={work} selected={selectedWork?.id === work.id}
                    onClick={() => setSelectedWork(selectedWork?.id === work.id ? null : work)}
                    onToggleItem={toggleItem} onDelete={deleteWork} />
                ))
              )}
            </div>
          </>
        )}

        {viewMode === 'library' && (
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {libraryTree.length === 0 ? (
              <EmptyState icon={<BookOpen size={36} color="#333" />} text="المكتبة فارغة" />
            ) : (
              libraryTree.map(gov => (
                <TreeNode key={gov.key} label={gov.label} icon={<Folder size={15} />}
                  level={0} expanded={expandedNodes.has(gov.key)} onToggle={() => toggleNode(gov.key)}
                  badge={gov.count}>
                  {gov.districts.map(dist => (
                    <TreeNode key={dist.key} label={dist.label} icon={<Folder size={14} />}
                      level={1} expanded={expandedNodes.has(dist.key)} onToggle={() => toggleNode(dist.key)}
                      badge={dist.count}>
                      {dist.letters.map(letter => (
                        <TreeNode key={letter.key} label={letter.label} icon={<FolderOpen size={13} />}
                          level={2} expanded={expandedNodes.has(letter.key)} onToggle={() => toggleNode(letter.key)}
                          badge={letter.count}>
                          {letter.works.map(w => (
                            <div key={w.id} onClick={() => setSelectedWork(selectedWork?.id === w.id ? null : w)}
                              style={{ paddingRight: 56, paddingTop: 8, paddingBottom: 8, paddingLeft: 12, cursor: 'pointer', borderRadius: 8, marginBottom: 2,
                                background: selectedWork?.id === w.id ? 'rgba(249,115,22,0.08)' : 'transparent',
                                display: 'flex', alignItems: 'center', gap: 8 }}>
                              <File size={13} color="#555" />
                              <span style={{ fontSize: 13, color: '#ccc' }}>
                                عقار رقم {w.property_number} — {w.area_name}
                              </span>
                              <span style={{ marginRight: 'auto' }} className="tag tag-green">مكتمل</span>
                            </div>
                          ))}
                        </TreeNode>
                      ))}
                    </TreeNode>
                  ))}
                </TreeNode>
              ))
            )}
          </div>
        )}
      </div>
      ) : null}

      {/* Right detail panel */}
      {selectedWork && (
        <WorkDetailPanel work={selectedWork} onClose={() => setSelectedWork(null)}
          onToggleItem={toggleItem} onRefresh={fetchAll} isMobile={isMobile} />
      )}

      {/* Add Work Modal */}
      {showModal && (
        <AddWorkModal
          clients={clients}
          form={form}
          setForm={setForm}
          formItems={formItems}
          setFormItems={setFormItems}
          newItemName={newItemName}
          setNewItemName={setNewItemName}
          formFiles={formFiles}
          setFormFiles={setFormFiles}
          saving={saving}
          onSave={saveWork}
          onClose={() => { setShowModal(false); resetForm(); }}
          isMobile={isMobile}
        />
      )}
    </div>
  );
}

function WorkCard({ work, selected, onClick, onToggleItem, onDelete }: {
  work: SurveyWork; selected: boolean;
  onClick: () => void; onToggleItem: (item: SurveyWorkItem) => void; onDelete: (id: string) => void;
}) {
  const items = work.items ?? [];
  const completed = items.filter(i => i.completed).length;
  const progress = items.length > 0 ? (completed / items.length) * 100 : 0;

  return (
    <div onClick={onClick} style={{ background: selected ? 'rgba(249,115,22,0.06)' : '#161616',
      border: `1px solid ${selected ? 'rgba(249,115,22,0.3)' : '#1e1e1e'}`, borderRadius: 14, padding: '14px 16px',
      cursor: 'pointer', transition: 'all 0.2s' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 600, fontSize: 14, color: '#e8e8e8' }}>{work.area_name}</span>
            <span style={{ fontSize: 12, color: '#888' }}>عقار {work.property_number}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, color: '#666', display: 'flex', alignItems: 'center', gap: 4 }}>
              <MapPin size={11} /> {work.governorate} / {work.district}
            </span>
            {work.client && (
              <span style={{ fontSize: 12, color: '#666', display: 'flex', alignItems: 'center', gap: 4 }}>
                <User size={11} /> {(work.client as any).name}
              </span>
            )}
          </div>
          {items.length > 0 && (
            <div style={{ marginTop: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 11, color: '#666' }}>{completed}/{items.length} مراحل مكتملة</span>
                <span style={{ fontSize: 11, color: '#f97316' }}>{Math.round(progress)}%</span>
              </div>
              <div style={{ height: 4, background: '#1e1e1e', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg, #f97316, #d4952b)', borderRadius: 2, transition: 'width 0.3s' }} />
              </div>
            </div>
          )}
        </div>
        <button onClick={e => { e.stopPropagation(); onDelete(work.id); }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#444', padding: 4, flexShrink: 0 }}>
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

function WorkDetailPanel({ work, onClose, onToggleItem, onRefresh, isMobile }: {
  work: SurveyWork; onClose: () => void;
  onToggleItem: (item: SurveyWorkItem) => void; onRefresh: () => void; isMobile: boolean;
}) {
  const [newNote, setNote] = useState(work.notes ?? '');
  const [savingNote, setSavingNote] = useState(false);
  const [filesToUpload, setFilesToUpload] = useState<File[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [statusChanging, setStatusChanging] = useState(false);

  const saveNote = async () => {
    setSavingNote(true);
    await supabase.from('survey_works').update({ notes: newNote }).eq('id', work.id);
    setSavingNote(false);
    onRefresh();
  };

  const addFiles = async () => {
    if (filesToUpload.length === 0) return;
    setUploadingFiles(true);
    for (const file of filesToUpload) {
      const url = await uploadFile(file, `survey/${work.id}/${Date.now()}_${file.name}`);
      if (url) {
        await supabase.from('survey_work_files').insert({
          survey_work_id: work.id, name: file.name, file_url: url,
          file_size: file.size, mime_type: file.type
        });
      }
    }
    setFilesToUpload([]);
    setUploadingFiles(false);
    onRefresh();
  };

  const toggleStatus = async () => {
    setStatusChanging(true);
    const newStatus = work.status === 'completed' ? 'active' : 'completed';
    await supabase.from('survey_works').update({
      status: newStatus,
      completed_at: newStatus === 'completed' ? new Date().toISOString() : null
    }).eq('id', work.id);
    setStatusChanging(false);
    onRefresh();
  };

  const items = work.items ?? [];
  const files = work.files ?? [];

  return (
    <div style={{
      width: isMobile ? '100%' : 340,
      background: '#111',
      borderRight: isMobile ? 'none' : '1px solid #1e1e1e',
      display: 'flex',
      flexDirection: 'column',
      height: isMobile ? 'auto' : '100vh',
      minHeight: isMobile ? '100vh' : 'auto',
      overflow: isMobile ? 'auto' : 'hidden'
    }}>
      <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid #1e1e1e', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {isMobile && (
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#aaa', padding: 0, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4, fontSize: 13 }}>
              <ChevronRight size={16} style={{ transform: 'rotate(180deg)' }} /> رجوع
            </button>
          )}
          <div style={{ fontWeight: 700, fontSize: 15, color: '#e8e8e8' }}>{work.area_name}</div>
          <div style={{ fontSize: 12, color: '#666', marginTop: 3 }}>عقار {work.property_number} — {work.district}</div>
        </div>
        {!isMobile && (
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 8, padding: 6, cursor: 'pointer', color: '#aaa', flexShrink: 0 }}>
            <X size={14} />
          </button>
        )}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 18 }}>
        {/* Status badge with toggle */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span className={`tag ${work.status === 'completed' ? 'tag-green' : 'tag-orange'}`}>
            {work.status === 'completed' ? 'مكتمل' : 'جاري'}
          </span>
          <span style={{ fontSize: 12, color: '#555' }}>
            {new Date(work.created_at).toLocaleDateString('ar-LB')}
          </span>
          <button onClick={toggleStatus} disabled={statusChanging}
            style={{
              padding: '5px 12px',
              borderRadius: 8,
              border: 'none',
              cursor: 'pointer',
              fontSize: 11,
              fontWeight: 600,
              background: work.status === 'completed' ? 'rgba(249,115,22,0.1)' : 'rgba(34,197,94,0.1)',
              color: work.status === 'completed' ? '#f97316' : '#4ade80',
              display: 'flex',
              alignItems: 'center',
              gap: 4
            }}>
            <Check size={12} />
            {work.status === 'completed' ? 'إعادة فتح' : 'إغلاق'}
          </button>
        </div>

        {/* Required items with completion dates */}
        <div>
          <div style={{ fontSize: 12, color: '#888', fontWeight: 600, marginBottom: 10 }}>المراحل المطلوبة</div>
          {items.length === 0 ? (
            <div style={{ fontSize: 12, color: '#444' }}>لا توجد مراحل</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {items.sort((a, b) => a.order_index - b.order_index).map(item => (
                <div key={item.id} onClick={() => onToggleItem(item)}
                  className="stage-item" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 10, cursor: 'pointer',
                    background: item.completed ? 'rgba(34,197,94,0.06)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${item.completed ? 'rgba(34,197,94,0.2)' : '#1e1e1e'}` }}>
                  {item.completed ? <CheckSquare size={15} color="#4ade80" /> : <Square size={15} color="#555" />}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, color: item.completed ? '#4ade80' : '#ccc',
                      textDecoration: item.completed ? 'line-through' : 'none', opacity: item.completed ? 0.7 : 1 }}>
                      {item.name}
                    </div>
                    {item.completed && item.completed_at && (
                      <div style={{ fontSize: 10, color: '#555', marginTop: 2 }}>
                        تم الإنجاز: {new Date(item.completed_at).toLocaleDateString('ar-LB')}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Notes */}
        <div>
          <div style={{ fontSize: 12, color: '#888', fontWeight: 600, marginBottom: 8 }}>ملاحظات</div>
          <textarea value={newNote} onChange={e => setNote(e.target.value)} rows={3}
            placeholder="أضف ملاحظات..."
            style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid #252525', borderRadius: 10, padding: '10px 12px', color: '#e8e8e8', fontSize: 13, resize: 'none' }} />
          <button onClick={saveNote} disabled={savingNote} className="btn-primary"
            style={{ marginTop: 6, padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600 }}>
            {savingNote ? 'حفظ...' : 'حفظ الملاحظات'}
          </button>
        </div>

        {/* Files */}
        <div>
          <div style={{ fontSize: 12, color: '#888', fontWeight: 600, marginBottom: 8 }}>الملفات المرفقة</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {files.map(f => (
              <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: 'rgba(255,255,255,0.03)', border: '1px solid #1e1e1e', borderRadius: 8 }}>
                <File size={13} color="#d4952b" />
                <span style={{ fontSize: 12, color: '#ccc', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
                {f.file_url && (
                  <a href={f.file_url} download target="_blank" rel="noreferrer"
                    style={{ color: '#f97316', display: 'flex' }}><Download size={13} /></a>
                )}
              </div>
            ))}
          </div>
          <div style={{ marginTop: 8 }}>
            <FileUploadWithCamera onFilesSelected={(fs) => setFilesToUpload(prev => [...prev, ...fs])} multiple={true} compact={true} />
            <FileUploadProgress files={filesToUpload} onRemove={(i) => setFilesToUpload(prev => prev.filter((_, j) => j !== i))} compact={true} />
            {filesToUpload.length > 0 && (
              <button onClick={addFiles} disabled={uploadingFiles} className="btn-primary"
                style={{ marginTop: 6, padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, width: '100%' }}>
                {uploadingFiles ? 'رفع...' : `رفع ${filesToUpload.length} ملفات`}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function AddWorkModal({ clients, form, setForm, formItems, setFormItems, newItemName, setNewItemName, formFiles, setFormFiles, saving, onSave, onClose, isMobile }: {
  clients: Client[]; form: any; setForm: any;
  formItems: string[]; setFormItems: any;
  newItemName: string; setNewItemName: any;
  formFiles: File[]; setFormFiles: any;
  saving: boolean; onSave: () => void; onClose: () => void; isMobile: boolean;
}) {
  const districts = getDistricts(form.governorate);
  const inp: React.CSSProperties = { width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid #252525', borderRadius: 10, padding: '10px 14px', color: '#e8e8e8', fontSize: 13 };

  return (
    <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(20px)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="modal-content" style={{
        background: 'rgba(14,14,14,0.9)',
        border: '1px solid rgba(255,255,255,0.08)',
        backdropFilter: 'blur(40px)',
        borderRadius: 20,
        padding: 24,
        width: isMobile ? 'calc(100vw - 24px)' : 540,
        maxWidth: isMobile ? 'calc(100vw - 24px)' : '540px',
        maxHeight: '90vh',
        overflowY: 'auto'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: '#e8e8e8' }}>عمل مساحي جديد</div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 8, padding: 6, cursor: 'pointer', color: '#aaa' }}><X size={16} /></button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <FF label="الزبون">
            <select value={form.client_id} onChange={e => setForm((f: any) => ({ ...f, client_id: e.target.value }))} style={inp}>
              <option value="">-- اختر زبون --</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </FF>

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
            <FF label="المحافظة *">
              <select value={form.governorate} onChange={e => setForm((f: any) => ({ ...f, governorate: e.target.value, district: '' }))} style={inp}>
                <option value="">-- اختر محافظة --</option>
                {LEBANON_DATA.map(g => <option key={g.name} value={g.name}>{g.name}</option>)}
              </select>
            </FF>
            <FF label="القضاء *">
              <select value={form.district} onChange={e => setForm((f: any) => ({ ...f, district: e.target.value }))} style={inp} disabled={!form.governorate}>
                <option value="">-- اختر قضاء --</option>
                {districts.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </FF>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
            <FF label="المنطقة العقارية *">
              <input value={form.area_name} onChange={e => setForm((f: any) => ({ ...f, area_name: e.target.value }))}
                placeholder="اسم المنطقة العقارية" style={inp} />
            </FF>
            <FF label="رقم العقار *">
              <input value={form.property_number} onChange={e => setForm((f: any) => ({ ...f, property_number: e.target.value }))}
                placeholder="رقم العقار" style={inp} />
            </FF>
          </div>

          <FF label="المراحل المطلوبة">
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <input value={newItemName} onChange={e => setNewItemName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && newItemName.trim()) { setFormItems((p: string[]) => [...p, newItemName.trim()]); setNewItemName(''); }}}
                placeholder="اسم المرحلة..." style={{ ...inp, flex: 1 }} />
              <button onClick={() => { if (newItemName.trim()) { setFormItems((p: string[]) => [...p, newItemName.trim()]); setNewItemName(''); }}}
                style={{ background: 'rgba(249,115,22,0.15)', border: '1px solid rgba(249,115,22,0.3)', borderRadius: 10, padding: '0 14px', cursor: 'pointer', color: '#f97316' }}>
                <Plus size={16} />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {formItems.map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', background: 'rgba(255,255,255,0.03)', border: '1px solid #1e1e1e', borderRadius: 8 }}>
                  <Square size={13} color="#555" />
                  <span style={{ flex: 1, fontSize: 13, color: '#ccc' }}>{item}</span>
                  <button onClick={() => setFormItems((p: string[]) => p.filter((_: string, j: number) => j !== i))}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#555' }}><X size={12} /></button>
                </div>
              ))}
            </div>
          </FF>

          <FF label="ملاحظات">
            <textarea value={form.notes} onChange={e => setForm((f: any) => ({ ...f, notes: e.target.value }))}
              placeholder="ملاحظات..." rows={2} style={{ ...inp, resize: 'none' }} />
          </FF>

          <FF label="الملفات">
            <FileUploadWithCamera onFilesSelected={(fs) => setFormFiles((prev: File[]) => [...prev, ...fs])} multiple={true} />
            <FileUploadProgress files={formFiles} onRemove={(i) => setFormFiles((prev: File[]) => prev.filter((_, j) => j !== i))} />
          </FF>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <button onClick={onClose} className="btn-secondary" style={{ flex: 1, padding: '11px', borderRadius: 12, fontSize: 13, fontWeight: 600 }}>إلغاء</button>
          <button onClick={onSave} disabled={saving || !form.governorate || !form.district || !form.area_name || !form.property_number}
            className="btn-primary" style={{ flex: 2, padding: '11px', borderRadius: 12, fontSize: 13, fontWeight: 600, opacity: (!form.governorate || !form.district || !form.area_name || !form.property_number) ? 0.5 : 1 }}>
            {saving ? 'جاري الحفظ...' : 'حفظ العمل'}
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

function TreeNode({ label, icon, level, expanded, onToggle, badge, children }: {
  label: string; icon: React.ReactNode; level: number; expanded: boolean;
  onToggle: () => void; badge?: number; children?: React.ReactNode;
}) {
  return (
    <div>
      <div onClick={onToggle} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: `9px 12px 9px ${12 + level * 16}px`, borderRadius: 8, cursor: 'pointer', marginBottom: 2, transition: 'background 0.15s' }}
        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'}
        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
        {expanded ? <ChevronDown size={13} color="#555" /> : <ChevronRight size={13} color="#555" />}
        <span style={{ color: level === 0 ? '#f97316' : level === 1 ? '#d4952b' : '#aaa' }}>{icon}</span>
        <span style={{ fontSize: 13, fontWeight: level === 0 ? 600 : 500, color: level === 0 ? '#e8e8e8' : '#bbb', flex: 1 }}>{label}</span>
        {badge !== undefined && (
          <span style={{ fontSize: 11, color: '#555', background: '#1e1e1e', borderRadius: 10, padding: '2px 7px' }}>{badge}</span>
        )}
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
    letters: { key: string; label: string; count: number; works: SurveyWork[] }[] }[];
}

function buildLibraryTree(works: SurveyWork[]): LibTree[] {
  const tree: Record<string, Record<string, Record<string, SurveyWork[]>>> = {};
  for (const w of works) {
    const g = w.governorate;
    const d = w.district;
    const l = w.area_name.charAt(0).toUpperCase();
    if (!tree[g]) tree[g] = {};
    if (!tree[g][d]) tree[g][d] = {};
    if (!tree[g][d][l]) tree[g][d][l] = [];
    tree[g][d][l].push(w);
  }
  return Object.entries(tree).map(([gov, districts]) => ({
    key: gov, label: gov,
    count: Object.values(districts).flatMap(d => Object.values(d)).flat().length,
    districts: Object.entries(districts).map(([dist, letters]) => ({
      key: `${gov}-${dist}`, label: dist,
      count: Object.values(letters).flat().length,
      letters: Object.entries(letters)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([letter, letterWorks]) => ({
          key: `${gov}-${dist}-${letter}`, label: letter,
          count: letterWorks.length,
          works: letterWorks.sort((a, b) => a.property_number.localeCompare(b.property_number, undefined, { numeric: true })),
        })),
    })),
  }));
}
