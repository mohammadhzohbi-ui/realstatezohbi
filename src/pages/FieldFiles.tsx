import { useState, useEffect, useCallback } from 'react';
import {
  Upload, Download, Trash2, Plus, X, FolderPlus,
  File, Image, FileText, Archive, Search, Folder
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { FieldFile } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useIsMobile } from '../hooks/useIsMobile';

function getFileIcon(mime?: string) {
  if (!mime) return <File size={18} color="#888" />;
  if (mime.startsWith('image/')) return <Image size={18} color="#f97316" />;
  if (mime.includes('pdf')) return <FileText size={18} color="#f87171" />;
  if (mime.includes('zip') || mime.includes('archive')) return <Archive size={18} color="#d4952b" />;
  if (mime.includes('dwg') || mime.includes('dxf') || mime.includes('autocad')) return <File size={18} color="#60a5fa" />;
  return <File size={18} color="#888" />;
}

function formatSize(bytes?: number) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

export default function FieldFiles() {
  const { profile, canWrite } = useAuth();
  const isMobile = useIsMobile();
  const [files, setFiles] = useState<FieldFile[]>([]);
  const [folders, setFolders] = useState<string[]>(['عام']);
  const [activeFolder, setActiveFolder] = useState('عام');
  const [search, setSearch] = useState('');
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [showFolderMenu, setShowFolderMenu] = useState(false);

  const fetchFiles = useCallback(async () => {
    const { data } = await supabase.from('field_files').select('*').order('created_at', { ascending: false });
    if (data) {
      setFiles(data as FieldFile[]);
      const uniqueFolders = [...new Set(data.map((f: FieldFile) => f.folder))];
      setFolders(['عام', ...uniqueFolders.filter(f => f !== 'عام')]);
    }
  }, []);

  useEffect(() => { fetchFiles(); }, [fetchFiles]);

  const uploadFiles = async (fileList: FileList | null) => {
    if (!fileList || !canWrite('field_files')) return;
    setUploading(true);
    for (const file of Array.from(fileList)) {
      const path = `field/${activeFolder}/${Date.now()}_${file.name}`;
      const { data, error } = await supabase.storage.from('field-files').upload(path, file, { upsert: true });
      if (!error && data) {
        const { data: urlData } = supabase.storage.from('field-files').getPublicUrl(data.path);
        await supabase.from('field_files').insert({
          name: file.name, file_url: urlData.publicUrl, file_size: file.size,
          mime_type: file.type, folder: activeFolder, uploaded_by: profile?.name ?? 'Unknown',
        });
      }
    }
    setUploading(false);
    fetchFiles();
  };

  const deleteFile = async (file: FieldFile) => {
    if (!canWrite('field_files')) return;
    if (!confirm(`حذف "${file.name}"?`)) return;
    await supabase.from('field_files').delete().eq('id', file.id);
    fetchFiles();
  };

  const addFolder = () => {
    if (!newFolderName.trim() || folders.includes(newFolderName.trim())) return;
    setFolders(f => [...f, newFolderName.trim()]);
    setActiveFolder(newFolderName.trim());
    setNewFolderName('');
    setShowNewFolder(false);
  };

  const folderFiles = files.filter(f =>
    f.folder === activeFolder &&
    (!search || f.name.toLowerCase().includes(search.toLowerCase()) || f.description?.includes(search))
  );

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    uploadFiles(e.dataTransfer.files);
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: isMobile ? 'column' : 'row',
      height: isMobile ? 'auto' : '100vh',
      minHeight: isMobile ? '100vh' : 'auto',
      overflow: isMobile ? 'visible' : 'hidden'
    }}>
      {/* Folder sidebar / mobile toggle */}
      {!isMobile && (
      <div style={{ width: 200, background: '#0e0e0e', borderLeft: '1px solid #1a1a1a', padding: '20px 12px', display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, paddingRight: 4 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#666', letterSpacing: 1 }}>المجلدات</span>
          <button onClick={() => setShowNewFolder(true)} title="مجلد جديد"
            style={{ background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.2)', borderRadius: 7, padding: '4px 6px', cursor: 'pointer', color: '#f97316' }}>
            <FolderPlus size={13} />
          </button>
        </div>

        {showNewFolder && (
          <div style={{ marginBottom: 8 }}>
            <input value={newFolderName} onChange={e => setNewFolderName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addFolder()}
              placeholder="اسم المجلد" autoFocus
              style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(249,115,22,0.3)', borderRadius: 8, padding: '7px 10px', color: '#e8e8e8', fontSize: 12 }} />
            <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
              <button onClick={addFolder} style={{ flex: 1, background: 'rgba(249,115,22,0.15)', border: '1px solid rgba(249,115,22,0.25)', borderRadius: 6, padding: '5px', cursor: 'pointer', color: '#f97316', fontSize: 11, fontWeight: 600 }}>إضافة</button>
              <button onClick={() => setShowNewFolder(false)} style={{ flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid #252525', borderRadius: 6, padding: '5px', cursor: 'pointer', color: '#888', fontSize: 11 }}>إلغاء</button>
            </div>
          </div>
        )}

        {folders.map(folder => {
          const count = files.filter(f => f.folder === folder).length;
          const isActive = activeFolder === folder;
          return (
            <button key={folder} onClick={() => setActiveFolder(folder)}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 10px', borderRadius: 10, border: 'none', cursor: 'pointer', textAlign: 'right', transition: 'all 0.15s',
                background: isActive ? 'rgba(249,115,22,0.12)' : 'transparent',
                color: isActive ? '#f97316' : '#777' }}>
              <Folder size={14} />
              <span style={{ flex: 1, fontSize: 13, fontWeight: isActive ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{folder}</span>
              <span style={{ fontSize: 10, color: isActive ? '#f97316' : '#444', background: isActive ? 'rgba(249,115,22,0.15)' : '#1e1e1e', borderRadius: 8, padding: '1px 6px' }}>{count}</span>
            </button>
          );
        })}

        <div style={{ marginTop: 'auto', padding: '12px 4px 0', borderTop: '1px solid #1a1a1a' }}>
          <div style={{ fontSize: 11, color: '#444' }}>
            {files.length} ملف · {(files.reduce((a, f) => a + (f.file_size ?? 0), 0) / 1048576).toFixed(1)} MB
          </div>
        </div>
      </div>
      )}

      {/* Mobile folder dropdown */}
      {isMobile && (
      <div style={{ background: '#0e0e0e', borderBottom: '1px solid #1a1a1a', padding: '12px', position: 'relative' }}>
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowFolderMenu(!showFolderMenu)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
              padding: '9px 12px',
              borderRadius: 10,
              border: '1px solid #1e1e1e',
              background: 'rgba(249,115,22,0.08)',
              cursor: 'pointer',
              color: '#f97316',
              fontSize: 13,
              fontWeight: 600
            }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Folder size={14} />
              {activeFolder}
            </span>
            <span>{showFolderMenu ? '▲' : '▼'}</span>
          </button>
          {showFolderMenu && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              marginTop: 4,
              background: '#0e0e0e',
              border: '1px solid #1a1a1a',
              borderRadius: 10,
              zIndex: 50,
              maxHeight: 200,
              overflowY: 'auto'
            }}>
              {folders.map(folder => {
                const count = files.filter(f => f.folder === folder).length;
                const isActive = activeFolder === folder;
                return (
                  <button
                    key={folder}
                    onClick={() => {
                      setActiveFolder(folder);
                      setShowFolderMenu(false);
                    }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '9px 12px',
                      border: 'none',
                      cursor: 'pointer',
                      textAlign: 'right',
                      background: isActive ? 'rgba(249,115,22,0.12)' : 'transparent',
                      color: isActive ? '#f97316' : '#777',
                      transition: 'all 0.15s',
                      fontSize: 13
                    }}>
                    <Folder size={14} />
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{folder}</span>
                    <span style={{ fontSize: 10, color: isActive ? '#f97316' : '#444', background: isActive ? 'rgba(249,115,22,0.15)' : '#1e1e1e', borderRadius: 8, padding: '1px 6px' }}>{count}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
        {!showNewFolder && (
          <button
            onClick={() => setShowNewFolder(true)}
            style={{
              width: '100%',
              marginTop: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              padding: '7px 12px',
              background: 'rgba(249,115,22,0.1)',
              border: '1px solid rgba(249,115,22,0.2)',
              borderRadius: 8,
              cursor: 'pointer',
              color: '#f97316',
              fontSize: 12,
              fontWeight: 600
            }}>
            <FolderPlus size={13} /> مجلد جديد
          </button>
        )}
        {showNewFolder && (
          <div style={{ marginTop: 8 }}>
            <input
              value={newFolderName}
              onChange={e => setNewFolderName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addFolder()}
              placeholder="اسم المجلد"
              autoFocus
              style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(249,115,22,0.3)', borderRadius: 8, padding: '7px 10px', color: '#e8e8e8', fontSize: 12, marginBottom: 6 }} />
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                onClick={addFolder}
                style={{ flex: 1, background: 'rgba(249,115,22,0.15)', border: '1px solid rgba(249,115,22,0.25)', borderRadius: 6, padding: '6px', cursor: 'pointer', color: '#f97316', fontSize: 11, fontWeight: 600 }}>
                إضافة
              </button>
              <button
                onClick={() => setShowNewFolder(false)}
                style={{ flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid #252525', borderRadius: 6, padding: '6px', cursor: 'pointer', color: '#888', fontSize: 11 }}>
                إلغاء
              </button>
            </div>
          </div>
        )}
      </div>
      )}

      {/* Main area */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        height: isMobile ? 'auto' : '100vh',
        minHeight: isMobile ? 'auto' : 'auto',
        padding: isMobile ? 12 : '20px 0 20px 24px',
        overflow: isMobile ? 'visible' : 'hidden',
        overflowY: isMobile ? 'auto' : 'hidden'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: isMobile ? 'flex-start' : 'center',
          justifyContent: isMobile ? 'flex-start' : 'space-between',
          marginBottom: isMobile ? 12 : 16,
          flexShrink: 0,
          gap: isMobile ? 12 : 0
        }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: isMobile ? 16 : 18, color: '#e8e8e8' }}>ملفات الحقل</div>
            <div style={{ fontSize: 12, color: '#555', marginTop: 2 }}>{activeFolder} · {folderFiles.length} ملف</div>
          </div>
          {canWrite('field_files') && (
            <label className="btn-primary" style={{
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              padding: '9px 16px',
              borderRadius: 12,
              fontSize: isMobile ? 12 : 13,
              fontWeight: 600,
              cursor: 'pointer',
              width: isMobile ? '100%' : 'auto',
              justifyContent: isMobile ? 'center' : 'flex-start'
            }}>
              <Upload size={15} /> {uploading ? 'جاري الرفع...' : 'رفع ملفات'}
              <input type="file" multiple style={{ display: 'none' }} onChange={e => uploadFiles(e.target.files)} disabled={uploading} />
            </label>
          )}
        </div>

        {/* Search */}
        <div style={{ position: 'relative', marginBottom: 14, flexShrink: 0 }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#555' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث في الملفات..."
            style={{ width: '100%', background: '#111', border: '1px solid #1e1e1e', borderRadius: 10, padding: '9px 12px 9px 36px', color: '#e8e8e8', fontSize: 13 }} />
        </div>

        {/* Drop zone + files */}
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          style={{
            flex: isMobile ? 'none' : 1,
            overflowY: 'auto',
            border: dragOver ? '2px dashed #f97316' : '2px dashed transparent',
            borderRadius: 14,
            transition: 'border 0.2s',
            padding: dragOver ? 8 : 0,
            width: '100%'
          }}>
          {dragOver && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 120, fontSize: 14, color: '#f97316', fontWeight: 600, gap: 8 }}>
              <Upload size={24} /> اسحب الملفات هنا
            </div>
          )}
          {!dragOver && folderFiles.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#444', marginTop: 60 }}>
              <Folder size={48} color="#1e1e1e" style={{ margin: '0 auto 14px', display: 'block' }} />
              <div style={{ fontSize: 14, marginBottom: 8 }}>المجلد فارغ</div>
              <div style={{ fontSize: 12, color: '#333' }}>ارفع ملفات أو اسحبها هنا</div>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? 'repeat(auto-fill, minmax(140px, 1fr))' : 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: isMobile ? 8 : 10
            }}>
              {folderFiles.map(file => (
                <FileCard key={file.id} file={file} onDelete={deleteFile} canDelete={canWrite('field_files')} isMobile={isMobile} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FileCard({ file, onDelete, canDelete, isMobile }: { file: FieldFile; onDelete: (f: FieldFile) => void; canDelete: boolean; isMobile: boolean }) {
  const isImage = file.mime_type?.startsWith('image/');

  return (
    <div className="file-card" style={{ background: '#161616', border: '1px solid #1e1e1e', borderRadius: 14, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      {/* Preview */}
      <div style={{
        height: isMobile ? 70 : 100,
        background: '#111',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative'
      }}>
        {isImage && file.file_url ? (
          <img src={file.file_url} alt={file.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: isMobile ? 4 : 6 }}>
            {getFileIcon(file.mime_type)}
            <span style={{ fontSize: isMobile ? 8 : 10, color: '#555', fontWeight: 600 }}>
              {file.mime_type?.split('/')[1]?.toUpperCase() ?? 'FILE'}
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div style={{ padding: isMobile ? '8px 10px 10px' : '10px 12px 12px', flex: 1, display: 'flex', flexDirection: 'column', gap: isMobile ? 4 : 6 }}>
        <div style={{
          fontSize: isMobile ? 11 : 13,
          fontWeight: 600,
          color: '#e8e8e8',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          lineHeight: 1.2
        }} title={file.name}>
          {file.name}
        </div>
        <div style={{
          fontSize: isMobile ? 9 : 11,
          color: '#555',
          display: 'flex',
          justifyContent: 'space-between',
          flexDirection: isMobile ? 'column' : 'row',
          gap: isMobile ? 2 : 0
        }}>
          <span>{formatSize(file.file_size)}</span>
          <span>{new Date(file.created_at).toLocaleDateString('ar-LB')}</span>
        </div>
        {file.uploaded_by && !isMobile && <div style={{ fontSize: 10, color: '#444' }}>رُفع بواسطة: {file.uploaded_by}</div>}

        {/* Actions */}
        <div style={{ display: 'flex', gap: isMobile ? 4 : 6, marginTop: 2 }}>
          {file.file_url && (
            <a href={file.file_url} download={file.name} target="_blank" rel="noreferrer"
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: isMobile ? 'center' : 'center',
                gap: 3,
                padding: isMobile ? '5px' : '7px',
                background: 'rgba(249,115,22,0.1)',
                border: '1px solid rgba(249,115,22,0.2)',
                borderRadius: 8,
                color: '#f97316',
                fontSize: isMobile ? 9 : 11,
                fontWeight: 600,
                textDecoration: 'none'
              }}>
              <Download size={isMobile ? 10 : 12} /> تنزيل
            </a>
          )}
          {canDelete && (
            <button onClick={() => onDelete(file)} style={{
              padding: isMobile ? '5px 4px' : '7px 10px',
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.15)',
              borderRadius: 8,
              cursor: 'pointer',
              color: '#f87171',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 3,
              fontSize: isMobile ? 9 : 11,
              fontWeight: 600
            }}>
              <Trash2 size={isMobile ? 10 : 12} /> حذف
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
