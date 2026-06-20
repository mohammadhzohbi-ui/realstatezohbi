import { useState, useEffect, useCallback } from 'react';
import { Plus, X, TrendingUp, TrendingDown, DollarSign, Trash2, Filter } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Payment, Client } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useIsMobile } from '../hooks/useIsMobile';

const WORK_TYPE_AR: Record<string, string> = {
  survey: 'مساحة', transaction: 'معاملة', consultation: 'استشارة', daily: 'يومية', other: 'أخرى',
};
const CURRENCY_SYMBOLS: Record<string, string> = { USD: '$', LBP: 'ل.ل', EUR: '€' };

export default function Payments() {
  const { canWrite } = useAuth();
  const isMobile = useIsMobile();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'paid' | 'pending'>('all');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    client_id: '', work_type: 'survey', amount: '', currency: 'USD',
    type: 'income', status: 'paid', description: '', payment_date: new Date().toISOString().split('T')[0], notes: '',
  });
  const [saving, setSaving] = useState(false);

  const fetchAll = useCallback(async () => {
    const [p, c] = await Promise.all([
      supabase.from('payments').select('*, client:clients(name)').order('payment_date', { ascending: false }),
      supabase.from('clients').select('id, name').order('name'),
    ]);
    if (p.data) setPayments(p.data as Payment[]);
    if (c.data) setClients(c.data);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const filtered = payments.filter(p => {
    if (filter !== 'all' && p.type !== filter) return false;
    if (filterStatus !== 'all' && p.status !== filterStatus) return false;
    return true;
  });

  const totalIncome = payments.filter(p => p.type === 'income' && p.status === 'paid').reduce((a, p) => a + (p.currency === 'USD' ? p.amount : p.currency === 'EUR' ? p.amount * 1.08 : p.amount / 89500), 0);
  const totalExpense = payments.filter(p => p.type === 'expense').reduce((a, p) => a + (p.currency === 'USD' ? p.amount : p.currency === 'EUR' ? p.amount * 1.08 : p.amount / 89500), 0);
  const pending = payments.filter(p => p.status === 'pending').reduce((a, p) => a + p.amount, 0);

  const save = async () => {
    if (!form.amount || parseFloat(form.amount) <= 0) return;
    setSaving(true);
    await supabase.from('payments').insert({
      client_id: form.client_id || null, work_type: form.work_type,
      amount: parseFloat(form.amount), currency: form.currency,
      type: form.type, status: form.status,
      description: form.description || null,
      payment_date: form.payment_date, notes: form.notes || null,
    });
    setSaving(false);
    setShowModal(false);
    setForm({ client_id:'', work_type:'survey', amount:'', currency:'USD', type:'income', status:'paid', description:'', payment_date: new Date().toISOString().split('T')[0], notes:'' });
    fetchAll();
  };

  const del = async (id: string) => {
    if (!confirm('حذف هذه العملية؟')) return;
    await supabase.from('payments').delete().eq('id', id);
    fetchAll();
  };

  const inp: React.CSSProperties = { width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid #252525', borderRadius: 10, padding: '10px 14px', color: '#e8e8e8', fontSize: 13 };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: isMobile ? 'auto' : '100vh', minHeight: '100vh', padding: isMobile ? 12 : '20px 0 20px 24px', overflow: isMobile ? 'visible' : 'hidden', overflowY: isMobile ? 'auto' : undefined }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexShrink: 0 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 18, color: '#e8e8e8' }}>المدفوعات والمقبوضات</div>
          <div style={{ fontSize: 12, color: '#555', marginTop: 2 }}>Payments & Receipts</div>
        </div>
        {canWrite('payments') && (
          <button onClick={() => setShowModal(true)} className="btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 12, fontSize: 13, fontWeight: 600 }}>
            <Plus size={15} /> إضافة
          </button>
        )}
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: 12, marginBottom: 20, flexShrink: 0 }}>
        <StatCard icon={<TrendingUp size={18} color="#4ade80" />} label="إجمالي الإيرادات (USD)" value={`$${totalIncome.toFixed(2)}`} color="#4ade80" bg="rgba(34,197,94,0.08)" />
        <StatCard icon={<TrendingDown size={18} color="#f87171" />} label="إجمالي المصاريف (USD)" value={`$${totalExpense.toFixed(2)}`} color="#f87171" bg="rgba(239,68,68,0.08)" />
        <StatCard icon={<DollarSign size={18} color="#d4952b" />} label="مستحقات قيد الانتظار" value={`${pending.toFixed(2)}`} color="#d4952b" bg="rgba(212,149,43,0.08)" />
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexShrink: 0, flexWrap: 'wrap' }}>
        {(['all', 'income', 'expense'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{ padding: '6px 14px', borderRadius: 9, border: `1px solid ${filter === f ? 'rgba(249,115,22,0.4)' : '#1e1e1e'}`, cursor: 'pointer', fontSize: 12, fontWeight: 500, background: filter === f ? 'rgba(249,115,22,0.1)' : 'transparent', color: filter === f ? '#f97316' : '#666' }}>
            {f === 'all' ? 'الكل' : f === 'income' ? 'دخل' : 'مصروف'}
          </button>
        ))}
        <div style={{ width: 1, background: '#1e1e1e', margin: '0 4px' }} />
        {(['all', 'paid', 'pending'] as const).map(s => (
          <button key={s} onClick={() => setFilterStatus(s)}
            style={{ padding: '6px 14px', borderRadius: 9, border: `1px solid ${filterStatus === s ? 'rgba(212,149,43,0.4)' : '#1e1e1e'}`, cursor: 'pointer', fontSize: 12, fontWeight: 500, background: filterStatus === s ? 'rgba(212,149,43,0.1)' : 'transparent', color: filterStatus === s ? '#d4952b' : '#666' }}>
            {s === 'all' ? 'الكل' : s === 'paid' ? 'مدفوع' : 'معلق'}
          </button>
        ))}
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#444', marginTop: 60 }}>
            <DollarSign size={40} color="#222" style={{ margin: '0 auto 12px', display: 'block' }} />
            <div style={{ fontSize: 13 }}>لا توجد سجلات</div>
          </div>
        ) : filtered.map(p => (
          <PaymentRow key={p.id} payment={p} onDelete={del} canDelete={canWrite('payments')} isMobile={isMobile} />
        ))}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="modal-content" style={{ borderRadius: 20, padding: 24, width: isMobile ? 'calc(100vw - 24px)' : 500, maxWidth: isMobile ? 'calc(100vw - 24px)' : undefined, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ fontWeight: 700, fontSize: 16, color: '#e8e8e8' }}>إضافة عملية مالية</div>
              <button onClick={() => setShowModal(false)} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 8, padding: 6, cursor: 'pointer', color: '#aaa' }}><X size={16} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Type toggle */}
              <div style={{ display: 'flex', gap: 8 }}>
                {(['income', 'expense'] as const).map(t => (
                  <button key={t} onClick={() => setForm(f => ({ ...f, type: t }))}
                    style={{ flex: 1, padding: '10px', borderRadius: 10, border: `1.5px solid ${form.type === t ? (t === 'income' ? 'rgba(34,197,94,0.4)' : 'rgba(239,68,68,0.4)') : '#252525'}`, background: form.type === t ? (t === 'income' ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)') : 'rgba(255,255,255,0.03)', cursor: 'pointer', color: form.type === t ? (t === 'income' ? '#4ade80' : '#f87171') : '#888', fontSize: 13, fontWeight: 600 }}>
                    {t === 'income' ? '↑ دخل' : '↓ مصروف'}
                  </button>
                ))}
              </div>

              <FF label="الزبون">
                <select value={form.client_id} onChange={e => setForm(f => ({ ...f, client_id: e.target.value }))} style={inp}>
                  <option value="">-- اختر زبون --</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </FF>

              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
                <FF label="المبلغ *">
                  <input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0.00" style={inp} />
                </FF>
                <FF label="العملة">
                  <select value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))} style={inp}>
                    <option value="USD">دولار (USD)</option>
                    <option value="LBP">ليرة لبنانية (LBP)</option>
                    <option value="EUR">يورو (EUR)</option>
                  </select>
                </FF>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
                <FF label="نوع العمل">
                  <select value={form.work_type} onChange={e => setForm(f => ({ ...f, work_type: e.target.value }))} style={inp}>
                    {Object.entries(WORK_TYPE_AR).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </FF>
                <FF label="الحالة">
                  <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} style={inp}>
                    <option value="paid">مدفوع</option>
                    <option value="pending">معلق</option>
                    <option value="cancelled">ملغى</option>
                  </select>
                </FF>
              </div>

              <FF label="التاريخ">
                <input type="date" value={form.payment_date} onChange={e => setForm(f => ({ ...f, payment_date: e.target.value }))} style={inp} />
              </FF>
              <FF label="وصف">
                <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="وصف العملية..." style={inp} />
              </FF>
              <FF label="ملاحظات">
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} style={{ ...inp, resize: 'none' }} />
              </FF>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button onClick={() => setShowModal(false)} className="btn-secondary" style={{ flex: 1, padding: '11px', borderRadius: 12, fontSize: 13, fontWeight: 600 }}>إلغاء</button>
              <button onClick={save} disabled={saving || !form.amount} className="btn-primary" style={{ flex: 2, padding: '11px', borderRadius: 12, fontSize: 13, fontWeight: 600 }}>
                {saving ? 'جاري الحفظ...' : 'حفظ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, color, bg }: { icon: React.ReactNode; label: string; value: string; color: string; bg: string }) {
  return (
    <div style={{ background: bg, border: `1px solid ${color}22`, borderRadius: 14, padding: '14px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>{icon}<span style={{ fontSize: 12, color: '#888' }}>{label}</span></div>
      <div style={{ fontSize: 22, fontWeight: 700, color, fontFamily: 'monospace' }}>{value}</div>
    </div>
  );
}

function PaymentRow({ payment, onDelete, canDelete, isMobile }: { payment: Payment; onDelete: (id: string) => void; canDelete: boolean; isMobile: boolean }) {
  const isIncome = payment.type === 'income';
  const sym = CURRENCY_SYMBOLS[payment.currency] ?? payment.currency;
  return (
    <div style={{ background: '#161616', border: '1px solid #1e1e1e', borderRadius: 14, padding: isMobile ? '12px 12px' : '14px 16px', display: 'flex', alignItems: isMobile ? 'flex-start' : 'center', gap: isMobile ? 10 : 14, flexDirection: isMobile ? 'column' : 'row' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 14, width: '100%' }}>
        <div style={{ width: isMobile ? 32 : 38, height: isMobile ? 32 : 38, borderRadius: 11, background: isIncome ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {isIncome ? <TrendingUp size={isMobile ? 14 : 17} color="#4ade80" /> : <TrendingDown size={isMobile ? 14 : 17} color="#f87171" />}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 600, fontSize: isMobile ? 12 : 14, color: '#e8e8e8' }}>{payment.description || WORK_TYPE_AR[payment.work_type]}</span>
            {payment.client && <span style={{ fontSize: isMobile ? 10 : 12, color: '#666' }}>· {(payment.client as any).name}</span>}
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 4, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: isMobile ? 10 : 12, color: '#555' }}>{new Date(payment.payment_date).toLocaleDateString('ar-LB')}</span>
            <span className={`tag ${WORK_TYPE_AR[payment.work_type] ? 'tag-gold' : 'tag-blue'}`}>{WORK_TYPE_AR[payment.work_type]}</span>
            <span className={`tag ${payment.status === 'paid' ? 'tag-green' : payment.status === 'pending' ? 'tag-orange' : 'tag-red'}`}>
              {payment.status === 'paid' ? 'مدفوع' : payment.status === 'pending' ? 'معلق' : 'ملغى'}
            </span>
          </div>
        </div>
        <div style={{ textAlign: 'left', flexShrink: 0 }}>
          <div style={{ fontSize: isMobile ? 14 : 18, fontWeight: 700, color: isIncome ? '#4ade80' : '#f87171', fontFamily: 'monospace' }}>
            {isIncome ? '+' : '-'}{sym}{payment.amount.toFixed(2)}
          </div>
        </div>
      </div>
      {canDelete && (
        <button onClick={() => onDelete(payment.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#444', padding: 4, alignSelf: isMobile ? 'flex-end' : 'center' }}><Trash2 size={13} /></button>
      )}
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
