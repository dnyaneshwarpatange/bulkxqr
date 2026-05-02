'use client';
import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  Shield, Users, QrCode, Mail, TrendingUp, Search, Crown,
  ChevronLeft, ChevronRight, Check, X, AlertCircle, CheckCircle,
  Zap, Star, Building2, User, RefreshCw, BarChart3, Tag, Server,
  Plus, Trash2, Edit2, Save, Wifi, Eye, EyeOff, Loader2, Copy, ToggleLeft, ToggleRight
} from 'lucide-react';

const PLAN_COLORS: Record<string, string> = {
  free: '#64748b', starter: '#6366f1', pro: '#8b5cf6', business: '#ec4899',
};
type AdminUser = {
  id: string; name: string | null; email: string; image: string | null;
  role: string; createdAt: string;
  subscription: { plan: string; status: string; endDate: string | null } | null;
  _count: { qrCodes: number; campaigns: number; payments: number };
};
type Stats = {
  totalUsers: number; totalQR: number; totalCampaigns: number; totalRevenue: number;
  planBreakdown: Record<string, number>; recentUsers: any[]; recentPayments: any[];
};
type Coupon = {
  id: string; code: string; description: string | null;
  discountType: string; discountValue: number; maxUses: number; usedCount: number;
  expiresAt: string | null; isActive: boolean; applicableTo: string; createdAt: string;
};
type SmtpConfig = {
  id?: string; host: string; port: number; secure: boolean;
  user: string; password: string; fromEmail: string; fromName: string;
  rejectUnauthorized: boolean; isActive: boolean;
};

const DEFAULT_SMTP: SmtpConfig = {
  host: '', port: 587, secure: false, user: '', password: '',
  fromEmail: '', fromName: 'QRForge', rejectUnauthorized: true, isActive: true,
};

const BLANK_COUPON = {
  code: '', description: '', discountType: 'percentage', discountValue: 10,
  maxUses: 0, expiresAt: '', isActive: true, applicableTo: 'all',
};

export default function AdminPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const role = (session?.user as any)?.role;

  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'coupons' | 'smtp'>('overview');
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);

  // Coupons state
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [couponsLoading, setCouponsLoading] = useState(false);
  const [showCouponForm, setShowCouponForm] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [couponForm, setCouponForm] = useState(BLANK_COUPON);
  const [couponSaving, setCouponSaving] = useState(false);

  // SMTP state
  const [smtpConfig, setSmtpConfig] = useState<SmtpConfig>(DEFAULT_SMTP);
  const [smtpLoaded, setSmtpLoaded] = useState(false);
  const [smtpSaving, setSmtpSaving] = useState(false);
  const [smtpTesting, setSmtpTesting] = useState(false);
  const [smtpResult, setSmtpResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [showSmtpPass, setShowSmtpPass] = useState(false);

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    if (session && role !== 'admin') router.replace('/dashboard');
  }, [session, role, router]);

  const loadStats = useCallback(async () => {
    const res = await fetch('/api/admin/stats');
    if (res.ok) setStats(await res.json());
  }, []);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), ...(search ? { search } : {}) });
    const res = await fetch(`/api/admin/users?${params}`);
    if (res.ok) {
      const data = await res.json();
      setUsers(data.users); setTotal(data.total); setPages(data.pages);
    }
    setLoading(false);
  }, [page, search]);

  const loadCoupons = useCallback(async () => {
    setCouponsLoading(true);
    const res = await fetch('/api/admin/coupons');
    if (res.ok) {
      const data = await res.json();
      setCoupons(data.coupons);
    }
    setCouponsLoading(false);
  }, []);

  const loadSmtp = useCallback(async () => {
    const res = await fetch('/api/admin/smtp-config');
    if (res.ok) {
      const data = await res.json();
      if (data.config) setSmtpConfig(data.config);
    }
    setSmtpLoaded(true);
  }, []);

  useEffect(() => { loadStats(); }, [loadStats]);
  useEffect(() => { if (activeTab === 'users') loadUsers(); }, [activeTab, loadUsers]);
  useEffect(() => { if (activeTab === 'coupons') loadCoupons(); }, [activeTab, loadCoupons]);
  useEffect(() => { if (activeTab === 'smtp') loadSmtp(); }, [activeTab, loadSmtp]);

  const doAction = async (userId: string, action: string, extra: Record<string, string> = {}) => {
    setActionLoading(`${userId}-${action}`);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action, ...extra }),
      });
      const data = await res.json();
      if (res.ok) { showToast('success', data.message ?? 'Done'); loadUsers(); loadStats(); setSelectedUser(null); }
      else showToast('error', data.error ?? 'Failed');
    } catch { showToast('error', 'Network error'); }
    finally { setActionLoading(null); }
  };

  // ── Coupon actions ─────────────────────────────────────────────────────────
  const saveCoupon = async () => {
    setCouponSaving(true);
    try {
      const method = editingCoupon ? 'PATCH' : 'POST';
      const body = editingCoupon ? { id: editingCoupon.id, ...couponForm } : couponForm;
      const res = await fetch('/api/admin/coupons', {
        method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok) {
        showToast('success', editingCoupon ? 'Coupon updated' : 'Coupon created');
        setShowCouponForm(false); setEditingCoupon(null); setCouponForm(BLANK_COUPON);
        loadCoupons();
      } else { showToast('error', data.error ?? 'Failed'); }
    } catch { showToast('error', 'Network error'); }
    finally { setCouponSaving(false); }
  };

  const deleteCoupon = async (id: string) => {
    if (!confirm('Delete this coupon?')) return;
    const res = await fetch(`/api/admin/coupons?id=${id}`, { method: 'DELETE' });
    if (res.ok) { showToast('success', 'Coupon deleted'); loadCoupons(); }
    else showToast('error', 'Failed to delete');
  };

  const startEditCoupon = (c: Coupon) => {
    setEditingCoupon(c);
    setCouponForm({
      code: c.code, description: c.description ?? '', discountType: c.discountType,
      discountValue: c.discountValue, maxUses: c.maxUses,
      expiresAt: c.expiresAt ? c.expiresAt.substring(0, 10) : '',
      isActive: c.isActive, applicableTo: c.applicableTo,
    });
    setShowCouponForm(true);
  };

  const copyCouponCode = (code: string) => {
    navigator.clipboard.writeText(code);
    showToast('success', `Copied: ${code}`);
  };

  // ── SMTP actions ───────────────────────────────────────────────────────────
  const saveSmtp = async () => {
    setSmtpSaving(true); setSmtpResult(null);
    try {
      const res = await fetch('/api/admin/smtp-config', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(smtpConfig),
      });
      const data = await res.json();
      if (res.ok) { showToast('success', 'SMTP configuration saved'); setSmtpConfig(data.config); }
      else showToast('error', data.error ?? 'Failed to save');
    } catch { showToast('error', 'Network error'); }
    finally { setSmtpSaving(false); }
  };

  const testSmtp = async () => {
    setSmtpTesting(true); setSmtpResult(null);
    try {
      const res = await fetch('/api/admin/test-smtp', { method: 'POST' });
      setSmtpResult(await res.json());
    } catch { setSmtpResult({ ok: false, message: 'Network error' }); }
    finally { setSmtpTesting(false); }
  };

  const clearSmtp = async () => {
    if (!confirm('Remove SMTP configuration? The system will fall back to .env variables.')) return;
    await fetch('/api/admin/smtp-config', { method: 'DELETE' });
    setSmtpConfig(DEFAULT_SMTP); showToast('success', 'SMTP config cleared');
  };

  if (role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-64 text-surface-400">
        <div className="text-center"><Shield size={40} className="mx-auto mb-3 opacity-30" /><p className="text-sm">Admin access required</p></div>
      </div>
    );
  }

  const TABS = [
    { key: 'overview', label: 'Overview', icon: BarChart3 },
    { key: 'users', label: 'Users', icon: Users },
    { key: 'coupons', label: 'Coupons', icon: Tag },
    { key: 'smtp', label: 'SMTP', icon: Server },
  ] as const;

  return (
    <div className="animate-fade-in">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-xl text-sm font-medium max-w-xs ${
          toast.type === 'success' ? 'bg-green-500/20 border border-green-500/30 text-green-400' : 'bg-red-500/20 border border-red-500/30 text-red-400'
        }`}>
          {toast.type === 'success' ? <CheckCircle size={15} /> : <AlertCircle size={15} />}{toast.msg}
        </div>
      )}

      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1"><Shield size={16} className="text-amber-400" /><span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Admin</span></div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Admin Dashboard</h1>
          <p className="text-surface-400 text-sm mt-1 hidden sm:block">Manage users, subscriptions, coupons and server settings</p>
        </div>
        <button onClick={() => { loadStats(); if (activeTab === 'users') loadUsers(); if (activeTab === 'coupons') loadCoupons(); }}
          className="btn-secondary text-sm flex-shrink-0"><RefreshCw size={13} /><span className="hidden sm:inline">Refresh</span></button>
      </div>

      <div className="flex gap-1 bg-surface-800 p-1 rounded-2xl w-fit mb-6 flex-wrap">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${activeTab === key ? 'bg-surface-700 text-white shadow' : 'text-surface-400 hover:text-surface-200'}`}>
            <Icon size={14} />{label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ────────────────────────────────────────────────────── */}
      {activeTab === 'overview' && stats && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
            {[
              { label: 'Users', value: stats.totalUsers, icon: Users, color: '#6366f1' },
              { label: 'QR Codes', value: stats.totalQR.toLocaleString(), icon: QrCode, color: '#8b5cf6' },
              { label: 'Campaigns', value: stats.totalCampaigns, icon: Mail, color: '#ec4899' },
              { label: 'Revenue', value: `₹${stats.totalRevenue.toLocaleString()}`, icon: TrendingUp, color: '#f59e0b' },
            ].map((card, i) => (
              <div key={i} className="card card-glow">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: `${card.color}20` }}>
                  <card.icon size={18} style={{ color: card.color }} />
                </div>
                <div className="text-2xl font-bold text-white">{card.value}</div>
                <div className="text-xs text-surface-400 mt-0.5">{card.label}</div>
              </div>
            ))}
          </div>
          <div className="card card-glow">
            <h3 className="font-bold text-white mb-4 text-sm sm:text-base">Subscription Distribution</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {['free', 'starter', 'pro', 'business'].map(plan => {
                const count = stats.planBreakdown[plan] ?? 0;
                const pct = stats.totalUsers ? Math.round((count / stats.totalUsers) * 100) : 0;
                return (
                  <div key={plan} className="bg-surface-900 rounded-xl p-3">
                    <div className="flex items-center gap-1.5 mb-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: PLAN_COLORS[plan] }} />
                      <span className="text-xs font-semibold text-white capitalize">{plan}</span>
                    </div>
                    <div className="text-xl font-bold text-white">{count}</div>
                    <div className="text-xs text-surface-400">{pct}%</div>
                    <div className="mt-2 h-1 bg-surface-700 rounded-full">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: PLAN_COLORS[plan] }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="card card-glow">
              <h3 className="font-bold text-white mb-4 text-sm">Recent Signups</h3>
              <div className="space-y-3">
                {stats.recentUsers.map((u: any) => (
                  <div key={u.id} className="flex items-center gap-3 min-w-0">
                    {u.image ? <Image src={u.image} alt="" width={30} height={30} className="rounded-full flex-shrink-0" />
                      : <div className="w-8 h-8 rounded-full bg-brand-500/20 flex items-center justify-center text-brand-400 text-sm font-bold flex-shrink-0">{u.name?.[0] ?? 'U'}</div>}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{u.name ?? 'Unknown'}</p>
                      <p className="text-xs text-surface-400 truncate">{u.email}</p>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium capitalize flex-shrink-0"
                      style={{ background: `${PLAN_COLORS[u.subscription?.plan ?? 'free']}20`, color: PLAN_COLORS[u.subscription?.plan ?? 'free'] }}>
                      {u.subscription?.plan ?? 'free'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="card card-glow">
              <h3 className="font-bold text-white mb-4 text-sm">Recent Payments</h3>
              <div className="space-y-3">
                {stats.recentPayments.map((p: any) => (
                  <div key={p.id} className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                      <TrendingUp size={14} className="text-amber-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{p.user?.name ?? p.user?.email}</p>
                      <p className="text-xs text-surface-400 capitalize">{p.plan} plan</p>
                    </div>
                    <span className="text-sm font-bold text-amber-400 flex-shrink-0">₹{p.amount}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── USERS ───────────────────────────────────────────────────────── */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="relative">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-surface-400" />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search by name or email…" className="input-field pl-11 w-full" />
          </div>
          <div className="text-xs text-surface-500">{total.toLocaleString()} users</div>
          {loading ? (
            <div className="card card-glow text-center py-12 text-surface-400"><Loader2 size={24} className="mx-auto animate-spin mb-2" />Loading…</div>
          ) : (
            <div className="card card-glow overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-700 text-left">
                    {['User', 'Plan', 'QR / Campaigns', 'Role', 'Actions'].map(h => (
                      <th key={h} className="pb-3 pr-4 text-xs text-surface-400 font-semibold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} className="border-b border-surface-800 last:border-0 hover:bg-surface-800/50 transition-colors">
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-3">
                          {u.image ? <Image src={u.image} alt="" width={32} height={32} className="rounded-full flex-shrink-0" />
                            : <div className="w-8 h-8 rounded-full bg-brand-500/20 flex items-center justify-center text-brand-400 text-sm font-bold flex-shrink-0">{u.name?.[0] ?? 'U'}</div>}
                          <div>
                            <p className="font-medium text-white">{u.name ?? '—'}</p>
                            <p className="text-xs text-surface-400">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 pr-4">
                        <span className="text-xs px-2 py-1 rounded-full font-semibold capitalize"
                          style={{ background: `${PLAN_COLORS[u.subscription?.plan ?? 'free']}20`, color: PLAN_COLORS[u.subscription?.plan ?? 'free'] }}>
                          {u.subscription?.plan ?? 'free'}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-surface-400 text-xs">{u._count.qrCodes} / {u._count.campaigns}</td>
                      <td className="py-3 pr-4">
                        <span className={`text-xs px-2 py-1 rounded-full ${u.role === 'admin' ? 'bg-amber-500/20 text-amber-400' : 'bg-surface-700 text-surface-400'}`}>{u.role}</span>
                      </td>
                      <td className="py-3">
                        <button onClick={() => setSelectedUser(u)} className="text-xs text-brand-400 hover:text-brand-300">Manage</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {pages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary p-2 disabled:opacity-40"><ChevronLeft size={16} /></button>
              <span className="text-sm text-surface-400">Page {page} of {pages}</span>
              <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages} className="btn-secondary p-2 disabled:opacity-40"><ChevronRight size={16} /></button>
            </div>
          )}
        </div>
      )}

      {/* ── COUPONS ─────────────────────────────────────────────────────── */}
      {activeTab === 'coupons' && (
        <div className="space-y-5">
          {/* Create/Edit Form */}
          {showCouponForm && (
            <div className="card card-glow border border-brand-500/20 bg-brand-500/5">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-bold text-white">{editingCoupon ? 'Edit Coupon' : 'Create Coupon'}</h3>
                <button onClick={() => { setShowCouponForm(false); setEditingCoupon(null); setCouponForm(BLANK_COUPON); }} className="text-surface-400 hover:text-white"><X size={18} /></button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-5">
                <div>
                  <label className="block text-xs text-surface-400 mb-1">Coupon Code *</label>
                  <input value={couponForm.code} onChange={e => setCouponForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                    placeholder="SUMMER20" className="input-field font-mono text-sm" disabled={!!editingCoupon} />
                </div>
                <div>
                  <label className="block text-xs text-surface-400 mb-1">Discount Type</label>
                  <select value={couponForm.discountType} onChange={e => setCouponForm(f => ({ ...f, discountType: e.target.value }))} className="input-field text-sm">
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount (₹)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-surface-400 mb-1">Discount Value *</label>
                  <input type="number" value={couponForm.discountValue} min={0}
                    onChange={e => setCouponForm(f => ({ ...f, discountValue: parseFloat(e.target.value) || 0 }))}
                    className="input-field text-sm"
                    placeholder={couponForm.discountType === 'percentage' ? 'e.g. 20 (for 20%)' : 'e.g. 100 (for ₹100)'} />
                </div>
                <div>
                  <label className="block text-xs text-surface-400 mb-1">Max Uses (0 = unlimited)</label>
                  <input type="number" value={couponForm.maxUses} min={0}
                    onChange={e => setCouponForm(f => ({ ...f, maxUses: parseInt(e.target.value) || 0 }))} className="input-field text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-surface-400 mb-1">Expires At (optional)</label>
                  <input type="date" value={couponForm.expiresAt} onChange={e => setCouponForm(f => ({ ...f, expiresAt: e.target.value }))} className="input-field text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-surface-400 mb-1">Applicable To</label>
                  <select value={couponForm.applicableTo} onChange={e => setCouponForm(f => ({ ...f, applicableTo: e.target.value }))} className="input-field text-sm">
                    <option value="all">All Plans</option>
                    <option value="starter">Starter</option>
                    <option value="pro">Pro</option>
                    <option value="business">Business</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs text-surface-400 mb-1">Description (internal note)</label>
                  <input value={couponForm.description} onChange={e => setCouponForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="Summer 2025 promo…" className="input-field text-sm" />
                </div>
                <div className="flex items-center gap-3">
                  <label className="text-xs text-surface-400">Active</label>
                  <button onClick={() => setCouponForm(f => ({ ...f, isActive: !f.isActive }))}>
                    {couponForm.isActive ? <ToggleRight size={28} className="text-green-400" /> : <ToggleLeft size={28} className="text-surface-600" />}
                  </button>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => { setShowCouponForm(false); setEditingCoupon(null); setCouponForm(BLANK_COUPON); }} className="btn-secondary">Cancel</button>
                <button onClick={saveCoupon} disabled={couponSaving || !couponForm.code} className="btn-primary">
                  {couponSaving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                  {editingCoupon ? 'Update Coupon' : 'Create Coupon'}
                </button>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-white">Discount Coupons</h3>
              <p className="text-xs text-surface-400 mt-0.5">{coupons.length} coupon{coupons.length !== 1 ? 's' : ''} total</p>
            </div>
            {!showCouponForm && (
              <button onClick={() => { setShowCouponForm(true); setEditingCoupon(null); setCouponForm(BLANK_COUPON); }} className="btn-primary text-sm">
                <Plus size={14} /> New Coupon
              </button>
            )}
          </div>

          {couponsLoading ? (
            <div className="card card-glow text-center py-10 text-surface-400"><Loader2 size={22} className="mx-auto animate-spin mb-2" />Loading…</div>
          ) : coupons.length === 0 ? (
            <div className="card card-glow text-center py-14">
              <Tag size={36} className="mx-auto mb-3 text-surface-600" />
              <p className="text-surface-400 font-medium">No coupons yet</p>
              <p className="text-surface-500 text-sm">Create your first discount coupon above</p>
            </div>
          ) : (
            <div className="card card-glow overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-700 text-left">
                    {['Code', 'Discount', 'Usage', 'Expires', 'Plans', 'Status', 'Actions'].map(h => (
                      <th key={h} className="pb-3 pr-4 text-xs text-surface-400 font-semibold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {coupons.map(c => (
                    <tr key={c.id} className="border-b border-surface-800 last:border-0 hover:bg-surface-800/30">
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-white">{c.code}</span>
                          <button onClick={() => copyCouponCode(c.code)} className="text-surface-500 hover:text-brand-400"><Copy size={12} /></button>
                        </div>
                        {c.description && <p className="text-xs text-surface-500 mt-0.5">{c.description}</p>}
                      </td>
                      <td className="py-3 pr-4">
                        <span className="font-semibold text-green-400">
                          {c.discountType === 'percentage' ? `${c.discountValue}%` : `₹${c.discountValue}`}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-surface-400 text-xs">
                        {c.usedCount} / {c.maxUses === 0 ? '∞' : c.maxUses}
                        {c.maxUses > 0 && (
                          <div className="mt-1 h-1 w-16 bg-surface-700 rounded-full">
                            <div className="h-full bg-brand-500 rounded-full" style={{ width: `${Math.min(100, (c.usedCount / c.maxUses) * 100)}%` }} />
                          </div>
                        )}
                      </td>
                      <td className="py-3 pr-4 text-xs text-surface-400">
                        {c.expiresAt ? new Date(c.expiresAt).toLocaleDateString() : '—'}
                        {c.expiresAt && new Date(c.expiresAt) < new Date() && <span className="ml-1 text-red-400">expired</span>}
                      </td>
                      <td className="py-3 pr-4">
                        <span className="text-xs capitalize px-2 py-0.5 bg-surface-700 rounded-full text-surface-300">{c.applicableTo}</span>
                      </td>
                      <td className="py-3 pr-4">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${c.isActive ? 'bg-green-500/20 text-green-400' : 'bg-surface-700 text-surface-500'}`}>
                          {c.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <button onClick={() => startEditCoupon(c)} className="p-1.5 text-surface-400 hover:text-brand-400 transition-colors"><Edit2 size={13} /></button>
                          <button onClick={() => deleteCoupon(c.id)} className="p-1.5 text-surface-400 hover:text-red-400 transition-colors"><Trash2 size={13} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── SMTP ────────────────────────────────────────────────────────── */}
      {activeTab === 'smtp' && (
        <div className="max-w-2xl space-y-5">
          <div>
            <h3 className="font-bold text-white">SMTP Server Configuration</h3>
            <p className="text-sm text-surface-400 mt-1">
              Configure your own SMTP server for sending emails. This overrides <code className="text-brand-400 text-xs bg-surface-800 px-1 py-0.5 rounded">.env</code> variables.
            </p>
          </div>

          {!smtpLoaded ? (
            <div className="card card-glow text-center py-10"><Loader2 size={22} className="mx-auto animate-spin mb-2 text-surface-400" />Loading…</div>
          ) : (
            <div className="card card-glow space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs text-surface-400 mb-1">SMTP Host *</label>
                  <input value={smtpConfig.host} onChange={e => setSmtpConfig(s => ({ ...s, host: e.target.value }))}
                    placeholder="smtp.gmail.com or mail.yourdomain.com" className="input-field text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-surface-400 mb-1">Port</label>
                  <input type="number" value={smtpConfig.port} onChange={e => setSmtpConfig(s => ({ ...s, port: parseInt(e.target.value) || 587 }))}
                    className="input-field text-sm" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-surface-400 mb-1">Username / Email</label>
                  <input value={smtpConfig.user} onChange={e => setSmtpConfig(s => ({ ...s, user: e.target.value }))}
                    placeholder="user@yourdomain.com" className="input-field text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-surface-400 mb-1">Password / App Password</label>
                  <div className="relative">
                    <input
                      type={showSmtpPass ? 'text' : 'password'}
                      value={smtpConfig.password}
                      onChange={e => setSmtpConfig(s => ({ ...s, password: e.target.value }))}
                      placeholder="Leave blank to keep existing"
                      className="input-field text-sm pr-10" />
                    <button onClick={() => setShowSmtpPass(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-200">
                      {showSmtpPass ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-surface-400 mb-1">From Email *</label>
                  <input value={smtpConfig.fromEmail} onChange={e => setSmtpConfig(s => ({ ...s, fromEmail: e.target.value }))}
                    placeholder="noreply@yourdomain.com" type="email" className="input-field text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-surface-400 mb-1">From Name</label>
                  <input value={smtpConfig.fromName} onChange={e => setSmtpConfig(s => ({ ...s, fromName: e.target.value }))}
                    placeholder="QRForge" className="input-field text-sm" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 pt-1">
                {[
                  { key: 'secure', label: 'Use TLS/SSL', sub: 'Port 465 typically' },
                  { key: 'rejectUnauthorized', label: 'Verify TLS Cert', sub: 'Disable for self-signed' },
                  { key: 'isActive', label: 'Use DB Config', sub: 'Override .env settings' },
                ].map(({ key, label, sub }) => (
                  <div key={key} className="flex flex-col gap-1">
                    <label className="text-xs text-surface-400">{label}</label>
                    <p className="text-xs text-surface-600">{sub}</p>
                    <button onClick={() => setSmtpConfig(s => ({ ...s, [key]: !(s as any)[key] }))}>
                      {(smtpConfig as any)[key]
                        ? <ToggleRight size={28} className="text-green-400" />
                        : <ToggleLeft size={28} className="text-surface-600" />}
                    </button>
                  </div>
                ))}
              </div>

              {smtpResult && (
                <div className={`flex items-center gap-2 text-sm rounded-xl px-4 py-3 border ${
                  smtpResult.ok ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-400'
                }`}>
                  {smtpResult.ok ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                  {smtpResult.message}
                </div>
              )}

              <div className="flex gap-3 pt-2 flex-wrap">
                <button onClick={saveSmtp} disabled={smtpSaving || !smtpConfig.host || !smtpConfig.fromEmail} className="btn-primary">
                  {smtpSaving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Save Configuration
                </button>
                <button onClick={testSmtp} disabled={smtpTesting} className="btn-secondary">
                  {smtpTesting ? <Loader2 size={15} className="animate-spin" /> : <Wifi size={15} />} Test Connection
                </button>
                <button onClick={clearSmtp} className="text-sm text-red-400 hover:text-red-300 px-3 py-2 rounded-xl hover:bg-red-500/10 transition-all">
                  <Trash2 size={14} className="inline mr-1" /> Clear Config
                </button>
              </div>

              <div className="bg-surface-900 rounded-xl p-4 text-xs text-surface-400 space-y-1.5">
                <p className="font-semibold text-surface-300">Common SMTP Settings:</p>
                <p>• <strong className="text-white">Gmail:</strong> smtp.gmail.com : 587, TLS off, use App Password</p>
                <p>• <strong className="text-white">Mailgun:</strong> smtp.mailgun.org : 587</p>
                <p>• <strong className="text-white">SendGrid:</strong> smtp.sendgrid.net : 587, user = "apikey"</p>
                <p>• <strong className="text-white">Self-hosted (Postfix):</strong> localhost : 25, no auth, TLS cert verify off</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* User manage modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="card max-w-md w-full">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-white">Manage User</h3>
              <button onClick={() => setSelectedUser(null)} className="text-surface-400 hover:text-white"><X size={18} /></button>
            </div>
            <div className="flex items-center gap-3 mb-5 pb-5 border-b border-surface-700">
              {selectedUser.image ? <Image src={selectedUser.image} alt="" width={44} height={44} className="rounded-full" />
                : <div className="w-11 h-11 rounded-full bg-brand-500/20 flex items-center justify-center text-brand-400 font-bold">{selectedUser.name?.[0] ?? 'U'}</div>}
              <div>
                <p className="font-semibold text-white">{selectedUser.name ?? 'Unknown'}</p>
                <p className="text-xs text-surface-400">{selectedUser.email}</p>
              </div>
            </div>
            <div className="space-y-3">
              <p className="text-xs font-semibold text-surface-400 uppercase tracking-wider">Change Plan</p>
              <div className="grid grid-cols-2 gap-2">
                {['free', 'starter', 'pro', 'business'].map(plan => (
                  <button key={plan} disabled={actionLoading !== null}
                    onClick={() => doAction(selectedUser.id, 'set-plan', { plan })}
                    className={`py-2 px-3 rounded-xl text-sm font-medium capitalize transition-all border ${selectedUser.subscription?.plan === plan ? 'border-brand-500 bg-brand-500/20 text-brand-300' : 'border-surface-700 hover:border-surface-600 text-surface-300'}`}>
                    {actionLoading === `${selectedUser.id}-set-plan` ? '…' : plan}
                  </button>
                ))}
              </div>
              <div className="pt-3 border-t border-surface-700 space-y-2">
                <p className="text-xs font-semibold text-surface-400 uppercase tracking-wider">Role & Access</p>
                <div className="flex gap-2">
                  <button disabled={!!actionLoading} onClick={() => doAction(selectedUser.id, 'toggle-role')}
                    className="btn-secondary flex-1 text-sm justify-center">
                    {actionLoading === `${selectedUser.id}-toggle-role` ? '…' : selectedUser.role === 'admin' ? '👤 Remove Admin' : '🛡️ Make Admin'}
                  </button>
                  <button disabled={!!actionLoading} onClick={() => doAction(selectedUser.id, 'delete')}
                    className="text-sm px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all">
                    {actionLoading === `${selectedUser.id}-delete` ? '…' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
