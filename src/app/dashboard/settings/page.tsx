'use client';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { Settings, CreditCard, User, Check, Crown, ArrowRight, AlertCircle, CheckCircle, Shield, Wifi } from 'lucide-react';
import Image from 'next/image';

const PLANS = [
  { key: 'free',     name: 'Free',     price: '₹0',     period: '/forever', color: '#64748b', features: ['10 QR codes/day', 'PNG only', 'Basic customization'] },
  { key: 'starter',  name: 'Starter',  price: '₹499',   period: '/month',   color: '#6366f1', features: ['200 QR codes/day', 'PNG + SVG', 'Bulk (100 rows)', '500 emails/month'] },
  { key: 'pro',      name: 'Pro',      price: '₹1,499', period: '/month',   color: '#8b5cf6', popular: true, features: ['1000 QR codes/day', 'All formats', 'Bulk (1000 rows)', '5000 emails/month', 'Analytics'] },
  { key: 'business', name: 'Business', price: '₹4,999', period: '/month',   color: '#ec4899', features: ['Unlimited QR codes', 'All formats', 'Bulk (10K rows)', '50K emails/month', 'White-label'] },
];

declare global { interface Window { Razorpay: any; } }

export default function SettingsPage() {
  const { data: session, update: updateSession } = useSession();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams?.get('tab') ?? 'profile');
  const [subData, setSubData] = useState<any>(null);
  const [paying, setPaying] = useState<string | null>(null);
  const [payError, setPayError] = useState('');
  const [paySuccess, setPaySuccess] = useState('');
  const [smtpResult, setSmtpResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [smtpTesting, setSmtpTesting] = useState(false);
  const role = (session?.user as any)?.role;

  useEffect(() => {
    fetch('/api/user/subscription').then(r => r.json()).then(setSubData);
  }, []);

  const currentPlan = subData?.plan ?? 'free';

  const handleUpgrade = async (planKey: string) => {
    if (planKey === 'free' || planKey === currentPlan) return;
    setPaying(planKey); setPayError(''); setPaySuccess('');
    try {
      const orderRes = await fetch('/api/payment/create-order', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planKey }),
      });
      const orderData = await orderRes.json();
      if (!orderRes.ok) {
        const msg = orderData.error ?? 'Failed to create order';
        const isConfig = msg.toLowerCase().includes('razorpay') || msg.toLowerCase().includes('configured');
        setPayError(isConfig ? `⚠️ ${msg} — Add real Razorpay keys to .env and restart.` : msg);
        setPaying(null); return;
      }

      if (!window.Razorpay) {
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        document.head.appendChild(script);
        await new Promise(resolve => script.onload = resolve);
      }

      const rzp = new window.Razorpay({
        key: orderData.keyId, amount: orderData.amount, currency: orderData.currency,
        name: 'QRForge', description: `${orderData.planName} Plan — 1 Month`,
        order_id: orderData.orderId,
        handler: async (response: any) => {
          const vRes = await fetch('/api/payment/verify', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...response, plan: planKey }),
          });
          const vData = await vRes.json();
          if (vData.success) {
            setPaySuccess(`Upgraded to ${orderData.planName}!`);
            fetch('/api/user/subscription').then(r => r.json()).then(setSubData);
            await updateSession();
          } else { setPayError('Verification failed. Contact support.'); }
        },
        prefill: { name: session?.user?.name ?? '', email: session?.user?.email ?? '' },
        theme: { color: '#6366f1' },
        modal: { ondismiss: () => setPaying(null) },
      });
      rzp.open();
    } catch { setPayError('Payment failed. Please try again.'); }
    finally { setPaying(null); }
  };

  const testSmtp = async () => {
    setSmtpTesting(true); setSmtpResult(null);
    try {
      const res = await fetch('/api/admin/test-smtp', { method: 'POST' });
      setSmtpResult(await res.json());
    } catch { setSmtpResult({ ok: false, message: 'Network error' }); }
    finally { setSmtpTesting(false); }
  };

  const TABS = [
    { key: 'profile', label: 'Profile', icon: User },
    { key: 'billing', label: 'Billing', icon: CreditCard },
    ...(role === 'admin' ? [{ key: 'server', label: 'Server', icon: Shield }] : []),
  ];

  return (
    <div className="animate-fade-in max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">Settings</h1>
        <p className="text-surface-400 text-sm">Manage your account and subscription</p>
      </div>

      {/* Tabs — scrollable on mobile */}
      <div className="flex gap-1 bg-surface-800 p-1 rounded-2xl w-full sm:w-fit mb-6 overflow-x-auto">
        {TABS.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === tab.key ? 'bg-surface-700 text-white shadow' : 'text-surface-400 hover:text-surface-200'
            }`}>
            <tab.icon size={14} />{tab.label}
          </button>
        ))}
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="space-y-5">
          <div className="card card-glow">
            <h2 className="text-base sm:text-lg font-bold text-white mb-5">Account Details</h2>
            <div className="flex flex-col sm:flex-row items-start gap-5">
              {session?.user?.image ? (
                <Image src={session.user.image} alt="Avatar" width={64} height={64} className="rounded-2xl shadow-lg flex-shrink-0" />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-brand-500 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
                  {session?.user?.name?.[0] ?? 'U'}
                </div>
              )}
              <div className="flex-1 space-y-4 w-full">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-surface-400 mb-2">Full Name</label>
                    <div className="input-field opacity-60 cursor-not-allowed">{session?.user?.name}</div>
                  </div>
                  <div>
                    <label className="block text-xs text-surface-400 mb-2">Email Address</label>
                    <div className="input-field opacity-60 cursor-not-allowed">{session?.user?.email}</div>
                  </div>
                </div>
                <p className="text-xs text-surface-500">Account details are managed through Google.</p>
              </div>
            </div>
          </div>

          <div className="card card-glow">
            <h2 className="text-base sm:text-lg font-bold text-white mb-4">Usage Summary</h2>
            {subData && (
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Today', value: subData.usage?.todayCount ?? 0, sub: `of ${subData.usage?.dailyLimit ?? 10}` },
                  { label: 'Total QR', value: subData.usage?.totalCount ?? 0, sub: 'all time' },
                  { label: 'Campaigns', value: subData.usage?.campaignCount ?? 0, sub: 'email' },
                ].map((s, i) => (
                  <div key={i} className="bg-surface-900 rounded-2xl p-3 sm:p-4">
                    <div className="text-xl sm:text-2xl font-bold text-white">{s.value}</div>
                    <div className="text-xs text-surface-400">{s.label}</div>
                    <div className="text-xs text-surface-500 mt-0.5">{s.sub}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Billing Tab */}
      {activeTab === 'billing' && (
        <div className="space-y-5">
          {payError && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-400 text-sm flex gap-2">
              <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />{payError}
            </div>
          )}
          {paySuccess && (
            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 text-green-400 text-sm flex gap-2">
              <CheckCircle size={16} />{paySuccess}
            </div>
          )}

          <div className="card card-glow border-brand-500/20">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Crown size={15} className="text-brand-400" />
                  <span className="text-sm font-semibold text-brand-400">Current Plan</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-white capitalize">{currentPlan} Plan</h3>
                {subData?.endDate && (
                  <p className="text-sm text-surface-400 mt-1">
                    Renews {new Date(subData.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                )}
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold text-green-400 bg-green-500/10 flex-shrink-0">ACTIVE</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {PLANS.map(plan => {
              const isCurrent = plan.key === currentPlan;
              const isLoading = paying === plan.key;
              return (
                <div key={plan.key} className={`card relative transition-all ${isCurrent ? 'border-brand-500 ring-2 ring-brand-500/20' : 'hover:border-surface-600'}`}>
                  {plan.popular && !isCurrent && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand-500 text-white text-xs font-bold px-3 py-1 rounded-full">POPULAR</div>
                  )}
                  {isCurrent && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                      <Check size={10} /> CURRENT
                    </div>
                  )}
                  <div className="mb-4 mt-1">
                    <div className="w-6 h-1 rounded-full mb-2" style={{ background: plan.color }} />
                    <h3 className="text-base font-bold text-white">{plan.name}</h3>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold text-white">{plan.price}</span>
                      <span className="text-surface-400 text-xs">{plan.period}</span>
                    </div>
                  </div>
                  <ul className="space-y-1.5 mb-5">
                    {plan.features.map((f, i) => (
                      <li key={i} className="flex items-center gap-2 text-xs">
                        <Check size={11} className="text-green-400 flex-shrink-0" />
                        <span className="text-surface-300">{f}</span>
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => handleUpgrade(plan.key)}
                    disabled={isCurrent || plan.key === 'free' || !!paying}
                    className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 active:scale-95 ${
                      isCurrent ? 'bg-green-500/10 text-green-400 cursor-default' :
                      plan.key === 'free' ? 'bg-surface-700 text-surface-400 cursor-not-allowed' :
                      'text-white hover:opacity-90 disabled:opacity-50'
                    }`}
                    style={!isCurrent && plan.key !== 'free' ? { background: plan.color } : {}}>
                    {isCurrent ? (<><Check size={13} /> Current</>) :
                     plan.key === 'free' ? 'Free Plan' :
                     isLoading ? 'Processing…' :
                     (<>Upgrade <ArrowRight size={13} /></>)}
                  </button>
                </div>
              );
            })}
          </div>

          <div className="card bg-surface-900/50">
            <p className="text-xs text-surface-400 text-center">
              Secure payments by Razorpay. Prices in INR, billed monthly. Cancel anytime.
            </p>
          </div>
        </div>
      )}

      {/* Server Tab — admin only */}
      {activeTab === 'server' && role === 'admin' && (
        <div className="space-y-5">
          <div className="card card-glow">
            <div className="flex items-center gap-2 mb-1">
              <Wifi size={16} className="text-brand-400" />
              <h2 className="text-base font-bold text-white">SMTP Mail Server</h2>
            </div>
            <p className="text-sm text-surface-400 mb-5">Test your mail server connection configured in <code className="text-brand-400 text-xs bg-surface-900 px-1.5 py-0.5 rounded">.env</code></p>

            <div className="bg-surface-900 rounded-xl p-4 mb-5 font-mono text-xs space-y-1">
              <p className="text-surface-500"># Current config (from .env)</p>
              <p><span className="text-brand-400">SMTP_HOST</span>=<span className="text-green-400">{process.env.NEXT_PUBLIC_SMTP_HOST_DISPLAY ?? '"smtp.gmail.com"'}</span></p>
              <p><span className="text-brand-400">SMTP_PORT</span>=<span className="text-green-400">587</span></p>
              <p><span className="text-brand-400">SMTP_SECURE</span>=<span className="text-green-400">false</span></p>
            </div>

            <button onClick={testSmtp} disabled={smtpTesting} className="btn-primary">
              <Wifi size={15} />
              {smtpTesting ? 'Testing…' : 'Test Connection'}
            </button>

            {smtpResult && (
              <div className={`mt-4 flex items-center gap-2 p-3 rounded-xl text-sm ${smtpResult.ok ? 'bg-green-500/10 border border-green-500/20 text-green-400' : 'bg-red-500/10 border border-red-500/20 text-red-400'}`}>
                {smtpResult.ok ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
                {smtpResult.message}
              </div>
            )}
          </div>

          <div className="card card-glow">
            <h3 className="font-bold text-white mb-4">Self-Hosted Mail Options</h3>
            <div className="space-y-3">
              {[
                { name: 'Postal (Recommended)', desc: 'Full-featured open-source mail server. Web UI, bounce handling, tracking.', url: 'https://postalserver.io', badge: 'Free & OSS' },
                { name: 'Mailcow', desc: 'Docker-based mail server with spam filtering, DKIM, and web admin panel.', url: 'https://mailcow.email', badge: 'Free & OSS' },
                { name: 'SMTP2GO', desc: 'Managed SMTP relay — 1000 free emails/month, great deliverability.', url: 'https://smtp2go.com', badge: 'Free tier' },
                { name: 'Resend', desc: 'Developer-friendly email API with generous free tier.', url: 'https://resend.com', badge: 'Free tier' },
              ].map((opt, i) => (
                <a key={i} href={opt.url} target="_blank" rel="noopener noreferrer"
                  className="flex items-start gap-3 p-3 rounded-xl border border-surface-700 hover:border-surface-500 transition-colors group">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-semibold text-white group-hover:text-brand-400 transition-colors">{opt.name}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 font-medium">{opt.badge}</span>
                    </div>
                    <p className="text-xs text-surface-400">{opt.desc}</p>
                  </div>
                  <ArrowRight size={14} className="text-surface-500 group-hover:text-brand-400 transition-colors mt-0.5 flex-shrink-0" />
                </a>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
