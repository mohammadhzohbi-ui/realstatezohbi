import { useState, useEffect, useCallback, useRef } from 'react';
import { X, Plus, Pin, Trash2, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Note } from '../types';

const NOTE_COLORS = ['#f97316', '#d4952b', '#4ade80', '#60a5fa', '#f87171', '#c084fc'];

export default function NotesWidget() {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newColor, setNewColor] = useState('#f97316');
  const [showNew, setShowNew] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const fetchNotes = useCallback(async () => {
    const { data } = await supabase.from('notes').select('*').order('pinned', { ascending: false }).order('created_at', { ascending: false });
    if (data) setNotes(data as Note[]);
  }, []);

  useEffect(() => { if (open) fetchNotes(); }, [open, fetchNotes]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        const fab = document.getElementById('notes-fab');
        if (fab && fab.contains(e.target as Node)) return;
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const addNote = async () => {
    if (!newContent.trim()) return;
    await supabase.from('notes').insert({ content: newContent.trim(), color: newColor, pinned: false });
    setNewContent('');
    setShowNew(false);
    fetchNotes();
  };

  const deleteNote = async (id: string) => {
    await supabase.from('notes').delete().eq('id', id);
    fetchNotes();
  };

  const togglePin = async (note: Note) => {
    await supabase.from('notes').update({ pinned: !note.pinned }).eq('id', note.id);
    fetchNotes();
  };

  const saveEdit = async () => {
    if (!editingId) return;
    await supabase.from('notes').update({ content: editContent, updated_at: new Date().toISOString() }).eq('id', editingId);
    setEditingId(null);
    fetchNotes();
  };

  const startEdit = (note: Note) => {
    setEditingId(note.id);
    setEditContent(note.content);
  };

  return (
    <>
      {/* FAB button */}
      <button
        id="notes-fab"
        onClick={() => setOpen(o => !o)}
        className="notes-fab"
        style={{ background: 'linear-gradient(135deg, #f97316, #d4952b)', border: 'none', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        title="الملاحظات"
      >
        <img src="/images/17f13e3b-0748-4057-8175-6ae9ca15047e.jpg" alt="Notes"
          style={{ width: 46, height: 46, borderRadius: 14, objectFit: 'cover' }} />
      </button>

      {/* Notes panel */}
      {open && (
        <div ref={panelRef} className="notes-panel" style={{ background: 'rgba(12,12,12,0.92)', backdropFilter: 'blur(32px)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 18, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {/* Header */}
          <div style={{ padding: '14px 16px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <img src="/images/17f13e3b-0748-4057-8175-6ae9ca15047e.jpg" alt="MZ" style={{ width: 22, height: 22, borderRadius: 6, objectFit: 'cover' }} />
              <span style={{ fontWeight: 700, fontSize: 14, color: '#e8e8e8' }}>الملاحظات</span>
              <span style={{ fontSize: 11, color: '#555', background: '#1e1e1e', borderRadius: 8, padding: '2px 7px' }}>{notes.length}</span>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => setShowNew(s => !s)}
                style={{ width: 28, height: 28, borderRadius: 8, background: showNew ? 'rgba(249,115,22,0.15)' : 'rgba(255,255,255,0.06)', border: `1px solid ${showNew ? 'rgba(249,115,22,0.3)' : 'rgba(255,255,255,0.08)'}`, cursor: 'pointer', color: showNew ? '#f97316' : '#888', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Plus size={14} />
              </button>
              <button onClick={() => setOpen(false)}
                style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer', color: '#888', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={13} />
              </button>
            </div>
          </div>

          {/* New note input */}
          {showNew && (
            <div style={{ padding: '12px 14px', borderBottom: '1px solid rgba(255,255,255,0.04)', background: 'rgba(249,115,22,0.04)' }}>
              <textarea value={newContent} onChange={e => setNewContent(e.target.value)}
                placeholder="اكتب ملاحظتك..."
                rows={3} autoFocus
                style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '8px 12px', color: '#e8e8e8', fontSize: 13, resize: 'none', fontFamily: 'inherit' }}
                onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) addNote(); }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                <div style={{ display: 'flex', gap: 5 }}>
                  {NOTE_COLORS.map(c => (
                    <button key={c} onClick={() => setNewColor(c)}
                      style={{ width: 16, height: 16, borderRadius: '50%', background: c, border: newColor === c ? '2px solid white' : '2px solid transparent', cursor: 'pointer', padding: 0 }} />
                  ))}
                </div>
                <button onClick={addNote}
                  style={{ marginRight: 'auto', background: 'linear-gradient(135deg, #f97316, #d4952b)', border: 'none', borderRadius: 8, padding: '5px 14px', cursor: 'pointer', color: 'white', fontSize: 12, fontWeight: 600 }}>
                  إضافة
                </button>
              </div>
            </div>
          )}

          {/* Notes list */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 360 }}>
            {notes.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#444', padding: '30px 0', fontSize: 13 }}>
                لا توجد ملاحظات
              </div>
            ) : notes.map(note => (
              <div key={note.id} style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${note.color}28`, borderRadius: 12, padding: '10px 12px', position: 'relative' }}>
                <div style={{ width: 3, height: '100%', background: note.color, position: 'absolute', right: 0, top: 0, borderRadius: '0 12px 12px 0' }} />
                {editingId === note.id ? (
                  <div>
                    <textarea value={editContent} onChange={e => setEditContent(e.target.value)} rows={3} autoFocus
                      style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '6px 10px', color: '#e8e8e8', fontSize: 13, resize: 'none', fontFamily: 'inherit' }} />
                    <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                      <button onClick={saveEdit} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: 7, padding: '4px 10px', cursor: 'pointer', color: '#4ade80', fontSize: 12 }}>
                        <Check size={11} /> حفظ
                      </button>
                      <button onClick={() => setEditingId(null)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 7, padding: '4px 10px', cursor: 'pointer', color: '#888', fontSize: 12 }}>
                        إلغاء
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p onClick={() => startEdit(note)} style={{ fontSize: 13, color: '#e8e8e8', lineHeight: 1.6, cursor: 'text', whiteSpace: 'pre-wrap', paddingLeft: 8 }}>
                      {note.content}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6, paddingLeft: 8 }}>
                      <span style={{ fontSize: 10, color: '#444' }}>{new Date(note.updated_at).toLocaleDateString('ar-LB')}</span>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button onClick={() => togglePin(note)} title={note.pinned ? 'إلغاء التثبيت' : 'تثبيت'}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: note.pinned ? '#f97316' : '#444', padding: '2px 4px' }}>
                          <Pin size={11} fill={note.pinned ? '#f97316' : 'none'} />
                        </button>
                        <button onClick={() => deleteNote(note.id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#444', padding: '2px 4px' }}>
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
