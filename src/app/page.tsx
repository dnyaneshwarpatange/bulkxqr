'use client';
import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { QrCode, Zap, Mail, BarChart3, Shield, Download, ArrowRight, Check, Star } from 'lucide-react';

const PLANS = [
  {
    name: 'Free', price: '₹0', period: '/forever', color: '#64748b',
    features: ['10 QR codes/day', 'PNG format', 'Basic customization', 'Download history'],
    cta: 'Get Started Free', planKey: 'free',
  },
  {
    name: 'Starter', price: '₹499', period: '/month', color: '#6366f1',
    features: ['200 QR codes/day', 'PNG + SVG formats', 'Bulk upload (100 rows)', '500 emails/month', 'ZIP export'],
    cta: 'Start Starter', planKey: 'starter',
  },
  {
    name: 'Pro', price: '₹1,499', period: '/month', color: '#8b5cf6', popular: true,
    features: ['1000 QR codes/day', 'All formats (PNG/SVG/PDF)', 'Bulk upload (1000 rows)', '5000 emails/month', 'Analytics dashboard', 'Custom branding'],
    cta: 'Go Pro', planKey: 'pro',
  },
  {
    name: 'Business', price: '₹4,999', period: '/month', color: '#ec4899',
    features: ['Unlimited QR codes', 'All export formats', 'Bulk upload (10,000 rows)', '50,000 emails/month', 'White-label', 'Dedicated support'],
    cta: 'Contact Sales', planKey: 'business',
  },
];

const FEATURES = [
  { icon: QrCode, title: 'Single & Bulk QR', desc: 'Generate one QR or thousands at once from Excel, CSV, or text input.' },
  { icon: Download, title: 'Multiple Formats', desc: 'Export as PNG, SVG, ZIP archives, or Excel files with embedded QR codes.' },
  { icon: Mail, title: 'Email Campaigns', desc: 'Send personalized QR codes to bulk recipients with our built-in email tool.' },
  { icon: BarChart3, title: 'Analytics', desc: 'Track your QR generation history and usage with beautiful dashboards.' },
  { icon: Zap, title: 'Lightning Fast', desc: 'Generate 1000+ QR codes in seconds with our optimized batch engine.' },
  { icon: Shield, title: 'Secure & Private', desc: 'Your data is encrypted and never shared. Google OAuth for secure login.' },
];

export default function LandingPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (session) router.push('/dashboard');
  }, [session, router]);

  const handleLogin = async () => {
    setLoading(true);
    await signIn('google', { callbackUrl: '/dashboard' });
  };

  return (
    <div className="min-h-screen bg-surface-950">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-surface-950/80 backdrop-blur-xl border-b border-surface-800">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center">
              <QrCode size={18} className="text-white" />
            </div>
            <span className="text-xl font-bold text-white">QRForge</span>
          </div>
          <button onClick={handleLogin} disabled={loading}
            className="btn-primary text-sm">
            {loading ? 'Loading...' : 'Sign in with Google'}
            <ArrowRight size={16} />
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-24 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-mesh-gradient opacity-50" />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-brand-500/20 rounded-full blur-3xl" />
        <div className="max-w-5xl mx-auto text-center relative">
          <div className="inline-flex items-center gap-2 bg-surface-800 border border-surface-700 rounded-full px-4 py-2 mb-8">
            <Star size={14} className="text-yellow-400 fill-yellow-400" />
            <span className="text-sm text-surface-300">Trusted by 10,000+ businesses worldwide</span>
          </div>
          <h1 className="text-6xl md:text-7xl font-bold leading-tight mb-6">
            <span className="text-white">The Professional</span><br />
            <span className="gradient-text">QR Code Platform</span>
          </h1>
          <p className="text-xl text-surface-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Generate single or bulk QR codes, run email campaigns, and analyze performance — all in one powerful platform built for businesses of any size.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button onClick={handleLogin} disabled={loading}
              className="btn-primary text-base px-8 py-4">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google — It's Free
            </button>
            <a href="#features" className="btn-secondary text-base px-8 py-4">
              See Features
            </a>
          </div>
          <p className="text-sm text-surface-500 mt-4">No credit card required • Free forever plan available</p>
        </div>

        {/* Hero Preview */}
        <div className="max-w-4xl mx-auto mt-20 relative">
          <div className="bg-surface-800 border border-surface-700 rounded-3xl p-8 shadow-2xl">
            <div className="grid grid-cols-3 gap-4">
              {['https://qrforge.app', 'contact@business.com', 'Event Ticket #001'].map((text, i) => (
                <div key={i} className="bg-surface-900 rounded-2xl p-4 text-center">
                  <div className="w-24 h-24 mx-auto bg-white rounded-xl flex items-center justify-center mb-3">
                    <QrCode size={60} className="text-surface-900" />
                  </div>
                  <p className="text-xs text-surface-400 truncate">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">Everything you need</h2>
            <p className="text-surface-400 text-lg">A complete QR code platform, not just a generator</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f, i) => (
              <div key={i} className="card card-glow hover:border-brand-500/30 transition-all duration-300 group">
                <div className="w-12 h-12 rounded-2xl bg-brand-500/10 flex items-center justify-center mb-4 group-hover:bg-brand-500/20 transition-colors">
                  <f.icon size={24} className="text-brand-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{f.title}</h3>
                <p className="text-surface-400 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 px-6 bg-surface-900/50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">Simple, transparent pricing</h2>
            <p className="text-surface-400 text-lg">Start free, scale as you grow</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {PLANS.map((plan) => (
              <div key={plan.planKey} className={`card relative ${plan.popular ? 'border-brand-500 ring-2 ring-brand-500/20' : ''}`}>
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                    MOST POPULAR
                  </div>
                )}
                <div className="mb-4">
                  <div className="w-8 h-1 rounded-full mb-3" style={{ background: plan.color }} />
                  <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                  <div className="flex items-baseline gap-1 mt-2">
                    <span className="text-3xl font-bold text-white">{plan.price}</span>
                    <span className="text-surface-400 text-sm">{plan.period}</span>
                  </div>
                </div>
                <ul className="space-y-2 mb-6">
                  {plan.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <Check size={14} className="text-green-400 mt-0.5 flex-shrink-0" />
                      <span className="text-surface-300">{f}</span>
                    </li>
                  ))}
                </ul>
                <button onClick={handleLogin}
                  className="w-full py-2.5 rounded-xl font-semibold text-sm transition-all"
                  style={{ background: plan.popular ? plan.color : 'transparent', color: plan.popular ? 'white' : plan.color, border: `1px solid ${plan.color}` }}>
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-surface-800">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center">
              <QrCode size={16} className="text-white" />
            </div>
            <span className="font-bold text-white">QRForge</span>
          </div>
          <p className="text-surface-500 text-sm">© 2024 QRForge. Professional QR Code Platform.</p>
        </div>
      </footer>
    </div>
  );
}
