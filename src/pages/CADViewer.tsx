import { useState, useEffect, useCallback } from 'react';
import {
  Upload, Download, Trash2, Plus, X, Search,
  File, Layers, Maximize2, ExternalLink, Eye, FolderOpen
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { CadFile, SurveyWork } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useIsMobile } from '../hooks/useIsMobile';

function formatSize(bytes?: number) {
  if (!bytes) return '';
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

const CAD_EXT = ['dwg', 'dxf', 'dgn', 'dwf', 'ifc', 'rvt', 'skp'];
const IMG_EXT = ['png', 'jpg', 'jpeg', 'pdf', 'svg'];

function getExt(name: string) { return name.split('.').pop()?.toLowerCase() ?? ''; }

function getFileColor(ext: string) {
  if (['dwg', 'dxf', 'dgn'].includes(ext)) return '#60a5fa';
  if (['pdf'].includes(ext)) return '#f87171';
  if (['png', 'jpg', 'jpeg', 'svg'].includes(ext)) return '#4ade80';
  return '#d4952b';
}

export default function CADViewer() {
  const { canWrite } = useAuth();
  const isMobile = useIsMobile();
  const [files, setFiles] = useState<CadFile[]>([]);
  const [works, setWorks] = useState<SurveyWork[]>([]);
  const [search, setSearch] = useState('');
  const [filterWork, setFilterWork] = useState('');
  const [previewing, setPreviewing] = useState<CadFile | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [uploadForm, setUploadForm] = useState({ project_name: '', survey_work_id: '', description: '' });
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);

  const fetchAll = useCallback(async () => {
    const [cf, sw] = await Promise.all([
      supabase.from('cad_files').select('*').order('created_at', { ascending: false }),
      supabase.from('survey_works').select('id, area_name, property_number, governorate').order('area_name'),
    ]);
    if (cf.data) setFiles(cf.data as CadFile[]);
    if (sw.data) setWorks(sw.data as SurveyWork[]);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const uploadFiles = async () => {
    if (!pendingFiles.length) return;
    setUploading(true);
    for (const file of pendingFiles) {
      const path = `cad/${Date.now()}_${file.name}`;
      const { data, error } = await supabase.storage.from('cad-files').upload(path, file, { upsert: true });
      if (!error && data) {
        const { data: urlData } = supabase.storage.from('cad-files').getPublicUrl(data.path);
        await supabase.from('cad_files').insert({
          name: file.name, file_url: urlData.publicUrl, file_size: file.size, mime_type: file.type,
          survey_work_id: uploadForm.survey_work_id || null,
          project_name: uploadForm.project_name || null,
          description: uploadForm.description || null,
        });
      }
    }
    setUploading(false);
    setShowUpload(false);
    setPendingFiles([]);
    setUploadForm({ project_name: '', survey_work_id: '', description: '' });
    fetchAll();
  };

  const deleteFile = async (id: string) => {
    if (!confirm('حذف هذا الملف؟')) return;
    await supabase.from('cad_files').delete().eq('id', id);
    if (previewing?.id === id) setPreviewing(null);
    fetchAll();
  };

  const filtered = files.filter(f => {
    if (search && !f.name.toLowerCase().includes(search.toLowerCase()) && !f.project_name?.includes(search)) return false;
    if (filterWork && f.survey_work_id !== filterWork) return false;
    return true;
  });

  const openInViewer = (file: CadFile) => {
    const ext = getExt(file.name);
    if (file.file_url) {
      if (IMG_EXT.includes(ext) || ext === 'pdf') {
        window.open(file.file_url, '_blank');
      } else if (CAD_EXT.includes(ext)) {
        window.open(`https://viewer.autodesk.com/id/${encodeURIComponent(file.file_url)}`, '_blank');
      } else {
        window.open(file.file_url, '_blank');
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const dropped = Array.from(e.dataTransfer.files);
    if (dropped.length) { setPendingFiles(dropped); setShowUpload(true); }
  };

  const inp: React.CSSProperties = { width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid #252525', borderRadius: 10, padding: '10px 14px', color: '#e8e8e8', fontSize: 13 };

  return (
    <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', height: isMobile ? 'auto' : '100vh', minHeight: isMobile ? '100vh' : 'auto', overflow: isMobile ? 'auto' : 'hidden' }}>
      {/* File list panel */}
      <div style={{ flex: isMobile ? 'none' : 1, display: previewing && isMobile ? 'none' : 'flex', flexDirection: 'column', padding: isMobile ? 12 : '20px 0 20px 24px', overflow: 'hidden', width: isMobile ? '100%' : 'auto', height: isMobile ? 'auto' : '100vh', overflowY: isMobile ? 'auto' : 'hidden' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexShrink: 0 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 18, color: '#e8e8e8' }}>ملفات CAD</div>
            <div style={{ fontSize: 12, color: '#555', marginTop: 2 }}>{filtered.length} ملف · DWG · DXF · PDF</div>
          </div>
          {canWrite('cad') && (
            <button onClick={() => setShowUpload(true)} className="btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 12, fontSize: 13, fontWeight: 600 }}>
              <Plus size={15} /> رفع ملف
            </button>
          )}
        </div>

        {/* Search + filter */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexShrink: 0 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#555' }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث..."
              style={{ width: '100%', background: '#111', border: '1px solid #1e1e1e', borderRadius: 10, padding: '9px 12px 9px 36px', color: '#e8e8e8', fontSize: 13 }} />
          </div>
          <select value={filterWork} onChange={e => setFilterWork(e.target.value)}
            style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: 10, padding: '9px 12px', color: '#e8e8e8', fontSize: 13, minWidth: 160 }}>
            <option value="">كل الأعمال</option>
            {works.map(w => <option key={w.id} value={w.id}>{w.area_name} — {w.property_number}</option>)}
          </select>
        </div>

        {/* Drop zone */}
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          style={{ flex: 1, overflowY: 'auto', border: dragOver ? '2px dashed rgba(249,115,22,0.5)' : '2px dashed transparent', borderRadius: 14, transition: 'border 0.2s' }}>
          {dragOver ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 200, gap: 12, color: '#f97316' }}>
              <Layers size={40} />
              <div style={{ fontSize: 14, fontWeight: 600 }}>اسحب ملفات CAD هنا</div>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#333', marginTop: 80 }}>
              <Layers size={48} color="#1e1e1e" style={{ margin: '0 auto 14px', display: 'block' }} />
              <div style={{ fontSize: 14, color: '#555' }}>لا توجد ملفات</div>
              <div style={{ fontSize: 12, color: '#333', marginTop: 4 }}>ارفع ملفات DWG أو DXF أو PDF</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {filtered.map(file => {
                const ext = getExt(file.name);
                const color = getFileColor(ext);
                const isSelected = previewing?.id === file.id;
                return (
                  <div key={file.id} onClick={() => setPreviewing(isSelected ? null : file)}
                    className="file-card" style={{ background: isSelected ? 'rgba(249,115,22,0.06)' : '#161616', border: `1px solid ${isSelected ? 'rgba(249,115,22,0.3)' : '#1e1e1e'}`, borderRadius: 14, padding: '12px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: `${color}18`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, flexShrink: 0 }}>
                      <File size={18} color={color} />
                      <span style={{ fontSize: 8, fontWeight: 700, color, letterSpacing: 0.5 }}>{ext.toUpperCase()}</span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, color: '#e8e8e8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</div>
                      <div style={{ display: 'flex', gap: 10, marginTop: 4, flexWrap: 'wrap' }}>
                        {file.project_name && <span style={{ fontSize: 12, color: '#666' }}>{file.project_name}</span>}
                        {file.file_size && <span style={{ fontSize: 11, color: '#555' }}>{formatSize(file.file_size)}</span>}
                        <span style={{ fontSize: 11, color: '#555' }}>{new Date(file.created_at).toLocaleDateString('ar-LB')}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      <button onClick={e => { e.stopPropagation(); openInViewer(file); }} title="فتح في عارض"
                        style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.2)', cursor: 'pointer', color: '#60a5fa', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Eye size={14} />
                      </button>
                      {file.file_url && (
                        <a href={file.file_url} download={file.name} onClick={e => e.stopPropagation()}
                          style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.2)', color: '#f97316', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>
                          <Download size={14} />
                        </a>
                      )}
                      {canWrite('cad') && (
                        <button onClick={e => { e.stopPropagation(); deleteFile(file.id); }}
                          style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', cursor: 'pointer', color: '#f87171', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Preview panel */}
      {previewing && (
        <div className="panel-glass" style={{ width: isMobile ? '100%' : 380, display: 'flex', flexDirection: 'column', height: isMobile ? 'auto' : '100vh', minHeight: isMobile ? 'auto' : 'auto', overflow: isMobile ? 'auto' : 'hidden', overflowY: isMobile ? 'auto' : 'hidden' }}>
          <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div style={{ flex: 1, minWidth: 0, paddingLeft: 8 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#e8e8e8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{previewing.name}</div>
              <div style={{ fontSize: 11, color: '#555', marginTop: 3 }}>{getExt(previewing.name).toUpperCase()} · {formatSize(previewing.file_size)}</div>
            </div>
            <button onClick={() => setPreviewing(null)} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 8, padding: 6, cursor: 'pointer', color: '#aaa', flexShrink: 0 }}>
              <X size={14} />
            </button>
          </div>

          <div style={{ flex: 1, overflow: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Preview */}
            <div style={{ background: '#0a0a0a', border: '1px solid #1e1e1e', borderRadius: 12, overflow: 'hidden', minHeight: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {previewing.file_url && ['png', 'jpg', 'jpeg', 'svg'].includes(getExt(previewing.name)) ? (
                <img src={previewing.file_url} alt={previewing.name} style={{ maxWidth: '100%', maxHeight: 300, objectFit: 'contain' }} />
              ) : previewing.file_url && getExt(previewing.name) === 'pdf' ? (
                <iframe src={previewing.file_url} style={{ width: '100%', height: 280, border: 'none' }} title="PDF preview" />
              ) : (
                <div style={{ textAlign: 'center', padding: 40 }}>
                  <File size={48} color={getFileColor(getExt(previewing.name))} style={{ margin: '0 auto 12px', display: 'block' }} />
                  <div style={{ fontSize: 13, color: '#555' }}>معاينة غير متاحة</div>
                  <div style={{ fontSize: 12, color: '#444', marginTop: 4 }}>افتح الملف في تطبيق متخصص</div>
                </div>
              )}
            </div>

            {/* Info */}
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid #1e1e1e', borderRadius: 12, padding: '12px 14px' }}>
              {[
                { label: 'اسم الملف', value: previewing.name },
                { label: 'المشروع', value: previewing.project_name },
                { label: 'الحجم', value: formatSize(previewing.file_size) },
                { label: 'التاريخ', value: new Date(previewing.created_at).toLocaleDateString('ar-LB') },
                { label: 'الوصف', value: previewing.description },
              ].filter(i => i.value).map(({ label, value }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #1a1a1a', fontSize: 12 }}>
                  <span style={{ color: '#666' }}>{label}</span>
                  <span style={{ color: '#ccc', textAlign: 'left', maxWidth: '60%', overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</span>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => openInViewer(previewing)} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px', background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.25)', borderRadius: 11, cursor: 'pointer', color: '#60a5fa', fontSize: 13, fontWeight: 600 }}>
                <ExternalLink size={14} /> فتح في عارض
              </button>
              {previewing.file_url && (
                <a href={previewing.file_url} download={previewing.name}
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px', background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.25)', borderRadius: 11, color: '#f97316', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
                  <Download size={14} /> تنزيل
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUpload && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="modal-content" style={{ borderRadius: 20, padding: 24, width: isMobile ? 'calc(100vw - 24px)' : 480, maxWidth: isMobile ? 'calc(100vw - 24px)' : 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ fontWeight: 700, fontSize: 16, color: '#e8e8e8' }}>رفع ملفات CAD</div>
              <button onClick={() => { setShowUpload(false); setPendingFiles([]); }} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 8, padding: 6, cursor: 'pointer', color: '#aaa' }}><X size={16} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '20px', background: 'rgba(255,255,255,0.03)', border: pendingFiles.length ? '2px solid rgba(249,115,22,0.4)' : '2px dashed #333', borderRadius: 14, cursor: 'pointer' }}>
                <Layers size={32} color={pendingFiles.length ? '#f97316' : '#444'} />
                <span style={{ fontSize: 13, color: pendingFiles.length ? '#f97316' : '#666' }}>
                  {pendingFiles.length ? `${pendingFiles.length} ملف مختار` : 'اختر ملفات DWG / DXF / PDF'}
                </span>
                <input type="file" multiple accept=".dwg,.dxf,.dgn,.pdf,.png,.jpg,.svg,.ifc" style={{ display: 'none' }} onChange={e => setPendingFiles(Array.from(e.target.files ?? []))} />
              </label>
              {pendingFiles.map((f, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#888' }}>
                  <File size={12} color={getFileColor(getExt(f.name))} /> {f.name} <span style={{ color: '#555' }}>({formatSize(f.size)})</span>
                </div>
              ))}
              <div>
                <label style={{ fontSize: 12, color: '#888', marginBottom: 6, display: 'block' }}>اسم المشروع</label>
                <input value={uploadForm.project_name} onChange={e => setUploadForm(f => ({ ...f, project_name: e.target.value }))}
                  placeholder="اسم المشروع أو العمل المساحي" style={inp} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#888', marginBottom: 6, display: 'block' }}>ربط بعمل مساحي</label>
                <select value={uploadForm.survey_work_id} onChange={e => setUploadForm(f => ({ ...f, survey_work_id: e.target.value }))} style={inp}>
                  <option value="">-- اختياري --</option>
                  {works.map(w => <option key={w.id} value={w.id}>{w.area_name} / {w.property_number}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button onClick={() => { setShowUpload(false); setPendingFiles([]); }} className="btn-secondary" style={{ flex: 1, padding: '11px', borderRadius: 12, fontSize: 13, fontWeight: 600 }}>إلغاء</button>
              <button onClick={uploadFiles} disabled={uploading || !pendingFiles.length} className="btn-primary" style={{ flex: 2, padding: '11px', borderRadius: 12, fontSize: 13, fontWeight: 600 }}>
                {uploading ? 'جاري الرفع...' : 'رفع الملفات'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
