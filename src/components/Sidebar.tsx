'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import {
  QrCode, LayoutDashboard, Layers, History, Mail, Settings,
  LogOut, Crown, ChevronRight, Zap, Shield, X
} from 'lucide-react';
import Image from 'next/image';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/generate', label: 'Generate QR', icon: QrCode },
  { href: '/dashboard/bulk', label: 'Bulk Generator', icon: Layers },
  { href: '/dashboard/history', label: 'QR History', icon: History },
  { href: '/dashboard/campaigns', label: 'Email Campaigns', icon: Mail },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
];

const PLAN_COLORS: Record<string, string> = {
  free: '#64748b', starter: '#6366f1', pro: '#8b5cf6', business: '#ec4899',
};

interface SidebarProps {
  onClose?: () => void;
}

export function Sidebar({ onClose }: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const plan = (session?.user as any)?.plan ?? 'free';
  const role = (session?.user as any)?.role ?? 'user';

  return (
    <aside className="h-full w-64 bg-surface-900 border-r border-surface-800 flex flex-col">
      {/* Logo */}
      <div className="p-5 border-b border-surface-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center shadow-lg flex-shrink-0">
            <QrCode size={18} className="text-white" />
          </div>
          <div>
            <span className="text-lg font-bold text-white">QRForge</span>
            <div className="flex items-center gap-1 mt-0.5">
              <Crown size={10} style={{ color: PLAN_COLORS[plan] }} />
              <span className="text-xs font-medium capitalize" style={{ color: PLAN_COLORS[plan] }}>{plan} Plan</span>
            </div>
          </div>
        </div>
        {/* Close button — mobile only */}
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-surface-500 hover:text-white hover:bg-surface-800 transition-colors"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = href === '/dashboard' ? pathname === href : pathname.startsWith(href);
          return (
            <Link key={href} href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 group ${
                active
                  ? 'bg-brand-500/10 border border-brand-500/20 text-brand-400'
                  : 'text-surface-400 hover:text-surface-100 hover:bg-surface-800 border border-transparent'
              }`}>
              <Icon size={17} className={active ? 'text-brand-400' : 'text-surface-500 group-hover:text-surface-300'} />
              <span className="font-medium text-sm">{label}</span>
              {active && <ChevronRight size={13} className="ml-auto text-brand-400" />}
            </Link>
          );
        })}

        {/* Admin section */}
        {role === 'admin' && (
          <>
            <div className="pt-4 pb-1 px-3">
              <div className="h-px bg-surface-800 mb-3" />
              <p className="text-xs text-surface-500 font-semibold uppercase tracking-wider">Admin</p>
            </div>
            <Link href="/dashboard/admin"
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 group border ${
                pathname.startsWith('/dashboard/admin')
                  ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                  : 'text-surface-400 hover:text-amber-300 hover:bg-amber-500/5 border-transparent'
              }`}>
              <Shield size={17} className={pathname.startsWith('/dashboard/admin') ? 'text-amber-400' : 'text-surface-500 group-hover:text-amber-400'} />
              <span className="font-medium text-sm">Admin Panel</span>
              {pathname.startsWith('/dashboard/admin') && <ChevronRight size={13} className="ml-auto text-amber-400" />}
            </Link>
          </>
        )}
      </nav>

      {/* Upgrade Banner */}
      {plan === 'free' && (
        <div className="mx-3 mb-3 p-4 bg-gradient-to-br from-brand-500/10 to-purple-500/10 border border-brand-500/20 rounded-2xl">
          <div className="flex items-center gap-2 mb-1.5">
            <Zap size={13} className="text-brand-400" />
            <span className="text-sm font-semibold text-brand-300">Upgrade to Pro</span>
          </div>
          <p className="text-xs text-surface-400 mb-3">1000 QR/day, bulk & email campaigns.</p>
          <Link href="/dashboard/settings?tab=billing"
            className="block w-full text-center bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold py-2 rounded-lg transition-colors">
            Upgrade Now
          </Link>
        </div>
      )}

      {/* User */}
      <div className="p-3 border-t border-surface-800">
        <div className="flex items-center gap-3 mb-2 px-1">
          {session?.user?.image ? (
            <Image src={session.user.image} alt="Avatar" width={32} height={32} className="rounded-full flex-shrink-0" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
              {session?.user?.name?.[0] ?? 'U'}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1">
              <p className="text-sm font-semibold text-white truncate">{session?.user?.name}</p>
              {role === 'admin' && <Shield size={10} className="text-amber-400 flex-shrink-0" />}
            </div>
            <p className="text-xs text-surface-400 truncate">{session?.user?.email}</p>
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-surface-400 hover:text-red-400 hover:bg-red-500/10 transition-all text-sm"
        >
          <LogOut size={14} />
          Sign out
        </button>
      </div>
    </aside>
  );
}
