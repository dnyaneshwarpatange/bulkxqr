'use client';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { QrCode, Layers, Mail, TrendingUp, Zap, ArrowRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';

interface Stats {
  usage: { todayCount: number; totalCount: number; campaignCount: number; dailyLimit: number };
  plan: string;
  limits: { name: string; daily_qr_limit: number };
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<Stats | null>(null);
  const [chartData, setChartData] = useState<Array<{ date: string; count: number }>>([]);

  useEffect(() => {
    fetch('/api/user/subscription').then(r => r.json()).then(setStats);
    fetch('/api/user/stats').then(r => r.json()).then(d => setChartData(d.chartData ?? []));
  }, []);

  const usagePct = stats ? Math.min(100, Math.round((stats.usage.todayCount / (stats.usage.dailyLimit || 1)) * 100)) : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">
          Welcome back, {session?.user?.name?.split(' ')[0]} 👋
        </h1>
        <p className="text-surface-400 text-sm sm:text-base">Here's what's happening with your QR codes today.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
        {[
          { label: "Today's QR", value: stats?.usage.todayCount ?? 0, icon: QrCode, color: '#6366f1', sub: `of ${stats?.usage.dailyLimit ?? 10} limit` },
          { label: 'Total Generated', value: stats?.usage.totalCount ?? 0, icon: TrendingUp, color: '#8b5cf6', sub: 'All time' },
          { label: 'Campaigns', value: stats?.usage.campaignCount ?? 0, icon: Mail, color: '#ec4899', sub: 'Email sent' },
          { label: 'Plan', value: stats?.limits.name ?? 'Free', icon: Zap, color: '#f59e0b', sub: 'Current plan' },
        ].map((card, i) => (
          <div key={i} className="card card-glow">
            <div className="flex items-start justify-between mb-3">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${card.color}20` }}>
                <card.icon size={18} style={{ color: card.color }} />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-white mb-0.5">{card.value}</div>
            <div className="text-xs text-surface-500 font-medium uppercase tracking-wide">{card.label}</div>
            <div className="text-xs text-surface-500 mt-0.5">{card.sub}</div>
          </div>
        ))}
      </div>

      {/* Usage Bar */}
      <div className="card card-glow">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-white text-sm sm:text-base">Daily Usage</h3>
          <span className="text-xs sm:text-sm text-surface-400">{stats?.usage.todayCount ?? 0} / {stats?.usage.dailyLimit ?? 10}</span>
        </div>
        <div className="h-2 bg-surface-700 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-700"
            style={{ width: `${usagePct}%`, background: usagePct > 80 ? '#ef4444' : '#6366f1' }} />
        </div>
        <div className="flex justify-between mt-2">
          <span className="text-xs text-surface-500">{usagePct}% used</span>
          {usagePct > 80 && (
            <Link href="/dashboard/settings?tab=billing" className="text-xs text-brand-400 hover:underline flex items-center gap-1">
              Upgrade <ArrowRight size={10} />
            </Link>
          )}
        </div>
      </div>

      {/* Chart */}
      <div className="card card-glow">
        <h3 className="font-semibold text-white mb-5 text-sm sm:text-base">QR Generation — Last 7 Days</h3>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={v => format(new Date(v), 'MMM d')} />
              <YAxis tick={{ fill: '#64748b', fontSize: 10 }} />
              <Tooltip
                contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '10px', color: '#f1f5f9', fontSize: '12px' }}
                cursor={{ fill: 'rgba(99,102,241,0.05)' }}
              />
              <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-36 flex items-center justify-center text-surface-500 text-sm">
            Generate your first QR code to see analytics
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div>
        <h3 className="font-semibold text-white mb-3 text-sm sm:text-base">Quick Actions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          {[
            { href: '/dashboard/generate', icon: QrCode, label: 'Generate QR', desc: 'Create a single QR instantly', color: '#6366f1' },
            { href: '/dashboard/bulk', icon: Layers, label: 'Bulk Generate', desc: 'Upload Excel, CSV or text', color: '#8b5cf6' },
            { href: '/dashboard/campaigns', icon: Mail, label: 'Email Campaign', desc: 'Send QR codes to your list', color: '#ec4899' },
          ].map((action, i) => (
            <Link key={i} href={action.href}
              className="card card-glow hover:border-surface-600 active:scale-[0.98] transition-all duration-150 group flex items-center gap-4 sm:flex-col sm:items-start">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${action.color}20` }}>
                <action.icon size={20} style={{ color: action.color }} />
              </div>
              <div>
                <p className="font-semibold text-white text-sm group-hover:text-brand-400 transition-colors">{action.label}</p>
                <p className="text-xs text-surface-400 mt-0.5">{action.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
