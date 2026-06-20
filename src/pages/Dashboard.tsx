import { useState, useEffect, useCallback } from 'react';
import {
  ChevronLeft, ChevronRight, Plus, X, Clock,
  User, Ruler, FileText, Calendar, Paperclip, Download, Trash2, Edit2, Check
} from 'lucide-react';
import { supabase, uploadFile } from '../lib/supabase';
import type { Appointment, Client } from '../types';
import Logo from '../components/Logo';
import { useIsMobile } from '../hooks/useIsMobile';

const DAYS_AR = ['أحد', 'اثن', 'ثلا', 'أرب', 'خمي', 'جمع', 'سبت'];
const MONTHS_AR = [
  'يناير','فبراير','مارس','أبريل','مايو','يونيو',
  'يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'
];

export default function Dashboard() {
  const isMobile = useIsMobile();
  const today = new Date();
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(today);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: '',
    client_id: '',
    work_type: 'survey' as 'survey' | 'transaction',
    date: today.toISOString().split('T')[0],
    time: '',
    property_ref: '',
    notes: '',
  });
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);

  const fetchAppointments = useCallback(async () => {
    const { data } = await supabase
      .from('appointments')
      .select('*, client:clients(name)')
      .order('date', { ascending: true });
    if (data) setAppointments(data as Appointment[]);
  }, []);

  const fetchClients = useCallback(async () => {
    const { data } = await supabase.from('clients').select('*').order('name');
    if (data) setClients(data);
  }, []);

  useEffect(() => { fetchAppointments(); fetchClients(); }, [fetchAppointments, fetchClients]);

  const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).getDay();

  const getAppointmentsForDate = (d: Date) => {
    const dateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    return appointments.filter(a => a.date === dateStr);
  };

  const selectedDayAppointments = getAppointmentsForDate(selectedDate);

  const handleSave = async () => {
    if (!form.title || !form.date) return;
    setLoading(true);
    let fileUrl: string | null = null;
    if (fileToUpload) {
      fileUrl = await uploadFile(fileToUpload, `appointments/${Date.now()}_${fileToUpload.name}`);
    }

    if (editingId) {
      const { error } = await supabase.from('appointments').update({
        title: form.title,
        client_id: form.client_id || null,
        work_type: form.work_type,
        date: form.date,
        time: form.time || null,
        property_ref: form.property_ref || null,
        notes: form.notes || null,
        file_url: fileUrl || undefined,
      }).eq('id', editingId);
      if (!error) {
        setEditingId(null);
      }
    } else {
      const { error } = await supabase.from('appointments').insert({
        title: form.title,
        client_id: form.client_id || null,
        work_type: form.work_type,
        date: form.date,
        time: form.time || null,
        property_ref: form.property_ref || null,
        notes: form.notes || null,
        file_url: fileUrl,
      });
    }
    setLoading(false);
    if (!editingId) {
      await fetchAppointments();
      setShowModal(false);
    } else {
      await fetchAppointments();
    }
    resetForm();
  };

  const deleteAppointment = async (id: string) => {
    if (!confirm('حذف هذا الموعد؟')) return;
    await supabase.from('appointments').delete().eq('id', id);
    fetchAppointments();
  };

  const startEdit = (appt: Appointment) => {
    setEditingId(appt.id);
    setForm({
      title: appt.title,
      client_id: appt.client_id || '',
      work_type: appt.work_type,
      date: appt.date,
      time: appt.time || '',
      property_ref: appt.property_ref || '',
      notes: appt.notes || '',
    });
    setFileToUpload(null);
    setShowModal(true);
  };

  const resetForm = () => {
    setForm({ title:'', client_id:'', work_type:'survey', date: today.toISOString().split('T')[0], time:'', property_ref:'', notes:'' });
    setFileToUpload(null);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    resetForm();
  };

  const prevMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth()-1, 1));
  const nextMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth()+1, 1));

  const isToday = (d: number) =>
    d === today.getDate() && viewDate.getMonth() === today.getMonth() && viewDate.getFullYear() === today.getFullYear();

  const isSelected = (d: number) =>
    d === selectedDate.getDate() && viewDate.getMonth() === selectedDate.getMonth() && viewDate.getFullYear() === selectedDate.getFullYear();

  const hasAppt = (d: number) => {
    const dt = new Date(viewDate.getFullYear(), viewDate.getMonth(), d);
    return getAppointmentsForDate(dt).length > 0;
  };

  const statsData = [
    { label: 'مواعيد اليوم', value: getAppointmentsForDate(today).length, color: '#f97316' },
    { label: 'هذا الشهر', value: appointments.filter(a => a.date.startsWith(`${viewDate.getFullYear()}-${String(viewDate.getMonth()+1).padStart(2,'0')}`)).length, color: '#d4952b' },
    { label: 'إجمالي المواعيد', value: appointments.length, color: '#60a5fa' },
  ];

  return (
    <div className="section-enter" style={{ display: 'flex', flexDirection: 'column', height: isMobile ? 'auto' : '100vh', minHeight: '100vh', padding: isMobile ? 12 : '20px 0 20px 24px', gap: 20, overflow: isMobile ? 'visible' : 'hidden', overflowY: isMobile ? 'auto' : undefined }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Logo size="md" />
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 13, color: '#666' }}>
            {today.toLocaleDateString('ar-LB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(3, 1fr)', gap: 12 }}>
        {statsData.map((s, i) => (
          <div key={i} style={{ flex: 1, background: '#161616', border: '1px solid #1e1e1e', borderRadius: 14, padding: '14px 18px' }}>
            <div style={{ fontSize: 26, fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Calendar + appointments */}
      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 20, flex: 1, minHeight: 0 }}>
        {/* Calendar widget */}
        <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: 20, padding: 20, width: isMobile ? '100%' : 340, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Month nav */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <button onClick={prevMonth} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: 8, padding: '6px 8px', cursor: 'pointer', color: '#aaa' }}>
              <ChevronLeft size={16} />
            </button>
            <div style={{ fontWeight: 600, fontSize: 15, color: '#e8e8e8' }}>
              {MONTHS_AR[viewDate.getMonth()]} {viewDate.getFullYear()}
            </div>
            <button onClick={nextMonth} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: 8, padding: '6px 8px', cursor: 'pointer', color: '#aaa' }}>
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Day headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
            {DAYS_AR.map(d => (
              <div key={d} style={{ textAlign: 'center', fontSize: isMobile ? 8 : 10, color: '#555', fontWeight: 600, padding: '4px 0' }}>{d}</div>
            ))}
          </div>

          {/* Days grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: isMobile ? 1 : 2 }}>
            {Array.from({ length: firstDayOfMonth }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
              const todayDay = isToday(day);
              const selDay = isSelected(day);
              const hasA = hasAppt(day);
              return (
                <button
                  key={day}
                  onClick={() => setSelectedDate(new Date(viewDate.getFullYear(), viewDate.getMonth(), day))}
                  style={{
                    aspect: '1/1',
                    borderRadius: 10,
                    border: todayDay && !selDay ? '1.5px solid rgba(249,115,22,0.5)' : '1.5px solid transparent',
                    background: selDay ? 'linear-gradient(135deg, #f97316, #d4952b)' : todayDay ? 'rgba(249,115,22,0.1)' : 'transparent',
                    color: selDay ? 'white' : todayDay ? '#f97316' : '#ccc',
                    cursor: 'pointer',
                    fontSize: isMobile ? 11 : 13,
                    fontWeight: selDay || todayDay ? 600 : 400,
                    position: 'relative',
                    transition: 'all 0.15s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 1,
                  }}
                >
                  {day}
                  {hasA && (
                    <div style={{
                      width: 4, height: 4, borderRadius: '50%',
                      background: selDay ? 'rgba(255,255,255,0.8)' : '#f97316',
                    }} />
                  )}
                </button>
              );
            })}
          </div>

          {/* Add button */}
          <button
            onClick={() => {
              const d = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth()+1).padStart(2,'0')}-${String(selectedDate.getDate()).padStart(2,'0')}`;
              setForm(f => ({ ...f, date: d }));
              setShowModal(true);
            }}
            className="btn-primary"
            style={{ borderRadius: 12, padding: '10px 0', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%' }}
          >
            <Plus size={16} />
            إضافة موعد
          </button>
        </div>

        {/* Appointments list */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0, width: isMobile ? '100%' : 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 15, color: '#e8e8e8' }}>
                {selectedDate.toLocaleDateString('ar-LB', { weekday: 'long', day: 'numeric', month: 'long' })}
              </div>
              <div style={{ fontSize: 12, color: '#555', marginTop: 2 }}>
                {selectedDayAppointments.length} موعد
              </div>
            </div>
            <Calendar size={18} color="#f97316" />
          </div>

          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {selectedDayAppointments.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#444', marginTop: 60, fontSize: 13 }}>
                <Calendar size={40} color="#333" style={{ margin: '0 auto 12px' }} />
                <div>لا توجد مواعيد لهذا اليوم</div>
              </div>
            ) : (
              selectedDayAppointments.map(appt => (
                <div key={appt.id} style={{ background: '#161616', border: '1px solid #1e1e1e', borderRadius: 14, padding: isMobile ? '12px' : '14px 16px', display: 'flex', alignItems: 'flex-start', gap: 12, width: '100%', flexDirection: isMobile ? 'column' : 'row' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flex: 1, width: '100%' }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                      background: appt.work_type === 'survey' ? 'rgba(249,115,22,0.15)' : 'rgba(212,149,43,0.15)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {appt.work_type === 'survey' ? <Ruler size={16} color="#f97316" /> : <FileText size={16} color="#d4952b" />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, color: '#e8e8e8' }}>{appt.title}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4, flexWrap: 'wrap' }}>
                        {appt.client && (
                          <span style={{ fontSize: 12, color: '#888', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <User size={11} /> {(appt.client as any).name}
                          </span>
                        )}
                        {appt.time && (
                          <span style={{ fontSize: 12, color: '#888', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Clock size={11} /> {appt.time}
                          </span>
                        )}
                        <span className={`tag ${appt.work_type === 'survey' ? 'tag-orange' : 'tag-gold'}`}>
                          {appt.work_type === 'survey' ? 'مساحة' : 'معاملة'}
                        </span>
                      </div>
                      {appt.notes && <div style={{ fontSize: 12, color: '#666', marginTop: 6 }}>{appt.notes}</div>}
                      {appt.file_url && (
                        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                          <a href={appt.file_url} download target="_blank" rel="noreferrer"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#f97316', textDecoration: 'none', background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.2)', borderRadius: 8, padding: '5px 10px', fontWeight: 600 }}>
                            <Download size={12} /> تنزيل الملف
                          </a>
                          <a href={appt.file_url} target="_blank" rel="noreferrer"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#60a5fa', textDecoration: 'none', background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.2)', borderRadius: 8, padding: '5px 10px', fontWeight: 600 }}>
                            <FileText size={12} /> فتح
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0, marginTop: isMobile ? 8 : 0 }}>
                    <button onClick={() => startEdit(appt)}
                      style={{ background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.2)', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', color: '#60a5fa', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600 }}>
                      <Edit2 size={12} /> تعديل
                    </button>
                    <button onClick={() => deleteAppointment(appt.id)}
                      style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', color: '#f87171', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600 }}>
                      <Trash2 size={12} /> حذف
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Add/Edit Appointment Modal */}
      {showModal && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(20px)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="modal-content" style={{ background: 'rgba(14,14,14,0.9)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(40px)', borderRadius: 20, padding: 24, width: isMobile ? 'calc(100vw - 24px)' : 480, maxWidth: isMobile ? 'calc(100vw - 24px)' : '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ fontWeight: 700, fontSize: 16, color: '#e8e8e8' }}>{editingId ? 'تعديل الموعد' : 'إضافة موعد جديد'}</div>
              <button onClick={closeModal} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 8, padding: 6, cursor: 'pointer', color: '#aaa' }}>
                <X size={16} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <FormField label="عنوان الموعد *">
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="أدخل عنوان الموعد" style={inputStyle} />
              </FormField>

              <FormField label="الزبون">
                <select value={form.client_id} onChange={e => setForm(f => ({ ...f, client_id: e.target.value }))} style={inputStyle}>
                  <option value="">-- اختر زبون --</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </FormField>

              <FormField label="نوع العمل">
                <div style={{ display: 'flex', gap: 8 }}>
                  {(['survey', 'transaction'] as const).map(wt => (
                    <button key={wt} onClick={() => setForm(f => ({ ...f, work_type: wt }))}
                      style={{ flex: 1, padding: '10px', borderRadius: 10, border: form.work_type === wt ? '1.5px solid #f97316' : '1.5px solid #252525', background: form.work_type === wt ? 'rgba(249,115,22,0.1)' : 'rgba(255,255,255,0.03)', cursor: 'pointer', color: form.work_type === wt ? '#f97316' : '#888', fontSize: 13, fontWeight: 500 }}>
                      {wt === 'survey' ? 'مساحة' : 'معاملة'}
                    </button>
                  ))}
                </div>
              </FormField>

              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
                <FormField label="التاريخ *">
                  <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} style={inputStyle} />
                </FormField>
                <FormField label="الوقت">
                  <input type="time" value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))} style={inputStyle} />
                </FormField>
              </div>

              <FormField label="مرجع العقار">
                <input value={form.property_ref} onChange={e => setForm(f => ({ ...f, property_ref: e.target.value }))}
                  placeholder="مثال: بيروت / مزرعة / 512" style={inputStyle} />
              </FormField>

              <FormField label="ملاحظات">
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="ملاحظات..." rows={3} style={{ ...inputStyle, resize: 'none' }} />
              </FormField>

              <FormField label="ملف مرفق">
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'rgba(255,255,255,0.03)', border: '1px dashed #333', borderRadius: 10, cursor: 'pointer', color: '#888', fontSize: 13 }}>
                  <Paperclip size={14} />
                  {fileToUpload ? fileToUpload.name : 'اختر ملف'}
                  <input type="file" style={{ display: 'none' }} onChange={e => setFileToUpload(e.target.files?.[0] ?? null)} />
                </label>
              </FormField>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button onClick={closeModal} className="btn-secondary" style={{ flex: 1, padding: '11px', borderRadius: 12, fontSize: 13, fontWeight: 600 }}>
                إلغاء
              </button>
              <button onClick={handleSave} disabled={loading} className="btn-primary" style={{ flex: 2, padding: '11px', borderRadius: 12, fontSize: 13, fontWeight: 600 }}>
                {loading ? 'جاري الحفظ...' : editingId ? 'حفظ التعديلات' : 'حفظ الموعد'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 12, color: '#888', marginBottom: 6, fontWeight: 500 }}>{label}</label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid #252525',
  borderRadius: 10,
  padding: '10px 14px',
  color: '#e8e8e8',
  fontSize: 13,
};
