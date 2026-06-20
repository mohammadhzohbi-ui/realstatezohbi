import { useState, useEffect, useCallback } from 'react';
import { FolderOpen, File, Download, Search, ChevronRight, ChevronDown, Folder, FileText, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useIsMobile } from '../hooks/useIsMobile';
import type { SurveyWork, Client } from '../types';

interface FileEntry {
  id: string;
  name: string;
  file_url?: string;
  file_size?: number;
  mime_type?: string;
  created_at: string;
  context: string;
  contextId: string;
  governorate?: string;
  district?: string;
  area_name?: string;
  survey_work_id?: string;
  transaction_stage_status_id?: string;
}

export default function Files() {
  const isMobile = useIsMobile();
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'tree' | 'list'>('tree');
  const [surveyWorks, setSurveyWorks] = useState<SurveyWork[]>([]);

  const fetchFiles = useCallback(async () => {
    const [swf, tf, swData] = await Promise.all([
      supabase.from('survey_work_files').select('*, survey_work:survey_works(id, governorate, district, area_name, status)'),
      supabase.from('transaction_files').select('*, tss:transaction_stage_status(id, transaction_id, transaction:transactions(id, governorate, district, area_name, status))'),
      supabase.from('survey_works').select('id, status').eq('status', 'active'),
    ]);

    const entries: FileEntry[] = [];

    for (const f of (swf.data ?? []) as any[]) {
      entries.push({
        id: f.id, name: f.name, file_url: f.file_url, file_size: f.file_size, mime_type: f.mime_type, created_at: f.created_at,
        context: 'مساحة', contextId: f.survey_work_id, survey_work_id: f.survey_work_id,
        governorate: f.survey_work?.governorate,
        district: f.survey_work?.district,
        area_name: f.survey_work?.area_name,
      });
    }

    for (const f of (tf.data ?? []) as any[]) {
      const tx = f.tss?.transaction;
      entries.push({
        id: f.id, name: f.name, file_url: f.file_url, file_size: f.file_size, mime_type: f.mime_type, created_at: f.created_at,
        context: 'معاملة', contextId: f.transaction_stage_status_id, transaction_stage_status_id: f.transaction_stage_status_id,
        governorate: tx?.governorate,
        district: tx?.district,
        area_name: tx?.area_name,
      });
    }

    setFiles(entries);
    if (swData.data) setSurveyWorks(swData.data as SurveyWork[]);
  }, []);

  useEffect(() => { fetchFiles(); }, [fetchFiles]);

  const toggle = (k: string) => setExpanded(prev => { const n = new Set(prev); n.has(k) ? n.delete(k) : n.add(k); return n; });

  const filtered = files.filter(f =>
    !search || f.name.toLowerCase().includes(search.toLowerCase()) ||
    f.governorate?.includes(search) || f.district?.includes(search) || f.area_name?.includes(search)
  );

  const deleteFile = async (file: FileEntry) => {
    if (!confirm(`حذف "${file.name}"؟`)) return;
    if (file.context === 'مساحة') {
      await supabase.from('survey_work_files').delete().eq('id', file.id);
    } else {
      await supabase.from('transaction_files').delete().eq('id', file.id);
    }
    fetchFiles();
  };

  const transferToActive = async (file: FileEntry) => {
    if (file.context !== 'مساحة' || !file.survey_work_id) return;
    const targetWork = surveyWorks[0];
    if (!targetWork) {
      alert('لا توجد أعمال جارية للنقل إليها');
      return;
    }
    if (!confirm(`نقل "${file.name}" إلى الأعمال الجارية؟`)) return;
    await supabase.from('survey_work_files').update({ survey_work_id: targetWork.id }).eq('id', file.id);
    fetchFiles();
  };

  // Build tree
  const tree: Record<string, Record<string, FileEntry[]>> = {};
  for (const f of filtered) {
    const g = f.governorate || 'غير محدد';
    const d = f.district || 'غير محدد';
    if (!tree[g]) tree[g] = {};
    if (!tree[g][d]) tree[g][d] = [];
    tree[g][d].push(f);
  }

  const formatSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: isMobile ? 'auto' : '100vh', minHeight: isMobile ? '100vh' : undefined, padding: isMobile ? 12 : '20px 0 20px 24px', overflow: isMobile ? 'auto' : 'hidden', overflowY: isMobile ? 'auto' : undefined }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: isMobile ? 12 : 16, flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? 12 : 0 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: isMobile ? 16 : 18, color: '#e8e8e8' }}>أرشيف الملفات</div>
          <div style={{ fontSize: 12, color: '#555', marginTop: 2 }}>{files.length} ملف</div>
        </div>
        <div style={{ display: 'flex', gap: 4, background: '#111', borderRadius: 10, padding: 3 }}>
          {(['tree', 'list'] as const).map(m => (
            <button key={m} onClick={() => setViewMode(m)}
              style={{ padding: isMobile ? '5px 10px' : '6px 14px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: isMobile ? 11 : 12, fontWeight: 600,
                background: viewMode === m ? 'linear-gradient(135deg, #f97316, #d4952b)' : 'transparent',
                color: viewMode === m ? 'white' : '#555' }}>
              {m === 'tree' ? 'شجرة' : 'قائمة'}
            </button>
          ))}
        </div>
      </div>

      <div style={{ position: 'relative', marginBottom: isMobile ? 10 : 14, width: '100%' }}>
        <Search size={isMobile ? 12 : 14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#555' }} />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="بحث في الملفات..."
          style={{ width: '100%', background: '#111', border: '1px solid #1e1e1e', borderRadius: 10, padding: isMobile ? '8px 12px 8px 32px' : '9px 12px 9px 36px', color: '#e8e8e8', fontSize: isMobile ? 12 : 13 }} />
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {viewMode === 'list' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {filtered.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#444', marginTop: 80 }}>
                <FolderOpen size={40} color="#333" style={{ margin: '0 auto 12px', display: 'block' }} />
                <div style={{ fontSize: 13 }}>لا توجد ملفات</div>
              </div>
            ) : filtered.map(f => (
              <FileRow key={f.id} file={f} formatSize={formatSize} isMobile={isMobile} onDelete={deleteFile} />
            ))}
          </div>
        ) : (
          <div>
            {Object.keys(tree).length === 0 ? (
              <div style={{ textAlign: 'center', color: '#444', marginTop: 80 }}>
                <FolderOpen size={40} color="#333" style={{ margin: '0 auto 12px', display: 'block' }} />
                <div style={{ fontSize: 13 }}>لا توجد ملفات</div>
              </div>
            ) : Object.entries(tree).map(([gov, districts]) => (
              <div key={gov}>
                <div onClick={() => toggle(gov)} style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 6 : 8, padding: isMobile ? '8px 10px' : '10px 12px', borderRadius: 8, cursor: 'pointer', marginBottom: 2 }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                  {expanded.has(gov) ? <ChevronDown size={isMobile ? 12 : 14} color="#555" /> : <ChevronRight size={isMobile ? 12 : 14} color="#555" />}
                  <Folder size={isMobile ? 14 : 16} color="#f97316" />
                  <span style={{ fontSize: isMobile ? 12 : 14, fontWeight: 600, color: '#e8e8e8', flex: 1 }}>{gov}</span>
                  <span style={{ fontSize: 10, color: '#555', background: '#1e1e1e', borderRadius: 10, padding: isMobile ? '2px 6px' : '2px 8px' }}>
                    {Object.values(districts).flat().length}
                  </span>
                </div>
                {expanded.has(gov) && Object.entries(districts).map(([dist, distFiles]) => (
                  <div key={dist}>
                    <div onClick={() => toggle(`${gov}-${dist}`)} style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 6 : 8, padding: isMobile ? '7px 10px 7px 20px' : '8px 12px 8px 28px', borderRadius: 8, cursor: 'pointer', marginBottom: 2 }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                      {expanded.has(`${gov}-${dist}`) ? <ChevronDown size={isMobile ? 11 : 13} color="#555" /> : <ChevronRight size={isMobile ? 11 : 13} color="#555" />}
                      <Folder size={isMobile ? 12 : 14} color="#d4952b" />
                      <span style={{ fontSize: isMobile ? 12 : 13, fontWeight: 500, color: '#ccc', flex: 1 }}>{dist}</span>
                      <span style={{ fontSize: 10, color: '#555', background: '#1e1e1e', borderRadius: 10, padding: isMobile ? '2px 5px' : '2px 7px' }}>{distFiles.length}</span>
                    </div>
                    {expanded.has(`${gov}-${dist}`) && (
                      <div style={{ paddingRight: isMobile ? 24 : 44 }}>
                        {distFiles.map(f => <FileRow key={f.id} file={f} formatSize={formatSize} isMobile={isMobile} onDelete={deleteFile} />)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function FileRow({ file, formatSize, isMobile, onDelete }: { file: FileEntry; formatSize: (b?: number) => string; isMobile: boolean; onDelete: (f: FileEntry) => void }) {
  const isImage = file.mime_type?.startsWith('image/');
  return (
    <div className="file-card" style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 12, padding: isMobile ? '8px 10px' : '10px 14px', background: '#161616', border: '1px solid #1e1e1e', borderRadius: 12 }}>
      <div style={{ width: isMobile ? 30 : 34, height: isMobile ? 30 : 34, borderRadius: 9, background: isImage ? 'rgba(249,115,22,0.1)' : 'rgba(212,149,43,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <File size={isMobile ? 14 : 16} color={isImage ? '#f97316' : '#d4952b'} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: isMobile ? 12 : 13, fontWeight: 500, color: '#e8e8e8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</div>
        <div style={{ fontSize: isMobile ? 10 : 11, color: '#555', marginTop: 2, display: 'flex', gap: isMobile ? 6 : 10, flexWrap: 'wrap' }}>
          <span>{file.area_name ?? ''}</span>
          {file.file_size && <span>{formatSize(file.file_size)}</span>}
          <span className={`tag ${file.context === 'مساحة' ? 'tag-orange' : 'tag-gold'}`}>{file.context}</span>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 4 }}>
        {file.file_url && (
          <a href={file.file_url} download target="_blank" rel="noreferrer"
            style={{ color: '#f97316', background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.2)', borderRadius: 8, padding: isMobile ? '5px 6px' : '6px 8px', display: 'flex', flexShrink: 0, alignItems: 'center', gap: 3, fontSize: isMobile ? 9 : 11, fontWeight: 600, textDecoration: 'none' }}>
            <Download size={isMobile ? 12 : 14} /> تنزيل
          </a>
        )}
        <button onClick={() => onDelete(file)}
          style={{ color: '#f87171', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 8, padding: isMobile ? '5px 6px' : '6px 8px', display: 'flex', flexShrink: 0, alignItems: 'center', gap: 3, fontSize: isMobile ? 9 : 11, fontWeight: 600, cursor: 'pointer' }}>
          <Trash2 size={isMobile ? 12 : 14} /> حذف
        </button>
      </div>
    </div>
  );
}
