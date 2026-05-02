'use client';
import { useState, useCallback } from 'react';
import {
  QrCode, Download, RefreshCw, Copy, Check, Palette, Settings2,
  Mail, Send, X, ToggleLeft, ToggleRight, Loader2, CheckCircle
} from 'lucide-react';

const QR_TYPES = [
  { value: 'text', label: '📝 Text' }, { value: 'url', label: '🔗 URL' },
  { value: 'email', label: '📧 Email' }, { value: 'phone', label: '📱 Phone' },
  { value: 'wifi', label: '📶 WiFi' }, { value: 'vcard', label: '👤 vCard' },
];
const SIZES = [
  { value: 200, label: 'Small (200px)' }, { value: 300, label: 'Medium (300px)' },
  { value: 500, label: 'Large (500px)' }, { value: 800, label: 'XL (800px)' },
];

export default function GeneratePage() {
  const [content, setContent] = useState('');
  const [label, setLabel] = useState('');
  const [type, setType] = useState('url');
  const [color, setColor] = useState('#000000');
  const [bgColor, setBgColor] = useState('#ffffff');
  const [size, setSize] = useState(300);
  const [format, setFormat] = useState<'png' | 'svg'>('png');
  const [qrData, setQrData] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);

  // Email panel state
  const [showEmailPanel, setShowEmailPanel] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [emailSubject, setEmailSubject] = useState('Your QR Code');
  const [emailBody, setEmailBody] = useState('Please find your QR code below.');
  const [sending, setSending] = useState(false);
  const [emailResult, setEmailResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const generate = async () => {
    if (!content.trim()) { setError('Please enter some content'); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/qr/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, label, type, color, bgColor, size, format }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Failed to generate'); return; }
      setQrData(data.qrData);
      setRemaining(data.remaining);
      setEmailResult(null);
    } catch { setError('Network error. Please try again.'); }
    finally { setLoading(false); }
  };

  const download = () => {
    if (!qrData) return;
    const a = document.createElement('a');
    a.href = format === 'svg' ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(qrData)}` : qrData;
    a.download = `qr_${label || 'code'}.${format}`;
    a.click();
  };

  const copyToClipboard = async () => {
    if (!qrData) return;
    await navigator.clipboard.writeText(qrData);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const sendViaEmail = async () => {
    if (!recipientEmail.trim()) { setEmailResult({ ok: false, msg: 'Enter a recipient email' }); return; }
    if (!qrData) return;
    setSending(true); setEmailResult(null);
    try {
      const res = await fetch('/api/qr/send-single', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientEmail, recipientName, subject: emailSubject, body: emailBody,
          qrContent: content, qrSize: size, qrColor: color, qrBgColor: bgColor,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setEmailResult({ ok: true, msg: `QR code sent to ${recipientEmail}` });
        setRecipientEmail(''); setRecipientName('');
      } else {
        setEmailResult({ ok: false, msg: data.error ?? 'Failed to send' });
      }
    } catch { setEmailResult({ ok: false, msg: 'Network error' }); }
    finally { setSending(false); }
  };

  const getPlaceholder = () => {
    const placeholders: Record<string, string> = {
      url: 'https://example.com', email: 'contact@example.com', phone: '+1234567890',
      wifi: 'WIFI:S:NetworkName;T:WPA;P:password;;',
      vcard: 'BEGIN:VCARD\nFN:John Doe\nTEL:+1234567890\nEND:VCARD',
      text: 'Enter any text here...',
    };
    return placeholders[type] ?? 'Enter content...';
  };

  return (
    <div className="animate-fade-in max-w-5xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Generate QR Code</h1>
        <p className="text-surface-400">Create a custom QR code and optionally send it directly via email</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left: Input */}
        <div className="space-y-6">
          <div className="card card-glow">
            <label className="block text-sm font-semibold text-surface-300 mb-3">QR Code Type</label>
            <div className="grid grid-cols-3 gap-2">
              {QR_TYPES.map(t => (
                <button key={t.value} onClick={() => setType(t.value)}
                  className={`py-2 px-3 rounded-xl text-sm font-medium transition-all ${type === t.value ? 'bg-brand-500 text-white' : 'bg-surface-700 text-surface-300 hover:bg-surface-600'}`}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="card card-glow">
            <label className="block text-sm font-semibold text-surface-300 mb-3">Content *</label>
            <textarea value={content} onChange={e => setContent(e.target.value)}
              placeholder={getPlaceholder()} rows={4} className="input-field resize-none" />
            <div className="mt-3">
              <label className="block text-sm text-surface-400 mb-2">Label (optional)</label>
              <input value={label} onChange={e => setLabel(e.target.value)}
                placeholder="My QR Code" className="input-field" />
            </div>
          </div>

          <div className="card card-glow">
            <div className="flex items-center gap-2 mb-4">
              <Palette size={16} className="text-brand-400" />
              <label className="text-sm font-semibold text-surface-300">Customization</label>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs text-surface-400 mb-2">QR Color</label>
                <div className="flex gap-2 items-center">
                  <input type="color" value={color} onChange={e => setColor(e.target.value)}
                    className="w-10 h-10 rounded-lg cursor-pointer border border-surface-600 bg-transparent" />
                  <input value={color} onChange={e => setColor(e.target.value)}
                    className="input-field text-xs py-2" placeholder="#000000" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-surface-400 mb-2">Background</label>
                <div className="flex gap-2 items-center">
                  <input type="color" value={bgColor} onChange={e => setBgColor(e.target.value)}
                    className="w-10 h-10 rounded-lg cursor-pointer border border-surface-600 bg-transparent" />
                  <input value={bgColor} onChange={e => setBgColor(e.target.value)}
                    className="input-field text-xs py-2" placeholder="#ffffff" />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-surface-400 mb-2">Size</label>
                <select value={size} onChange={e => setSize(Number(e.target.value))} className="input-field text-sm py-2">
                  {SIZES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-surface-400 mb-2">Format</label>
                <div className="flex gap-2">
                  {['png', 'svg'].map(f => (
                    <button key={f} onClick={() => setFormat(f as 'png' | 'svg')}
                      className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${format === f ? 'bg-brand-500 text-white' : 'bg-surface-700 text-surface-300 hover:bg-surface-600'}`}>
                      {f.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {error && <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-400 text-sm">{error}</div>}

          <button onClick={generate} disabled={loading} className="btn-primary w-full justify-center py-4 text-base">
            {loading ? <RefreshCw size={18} className="animate-spin" /> : <QrCode size={18} />}
            {loading ? 'Generating...' : 'Generate QR Code'}
          </button>

          {remaining !== null && (
            <p className="text-center text-sm text-surface-400">{remaining} QR codes remaining today</p>
          )}
        </div>

        {/* Right: Preview + Email */}
        <div className="space-y-4">
          <div className="card card-glow flex flex-col items-center justify-center min-h-80 sticky top-8">
            {qrData ? (
              <div className="w-full text-center space-y-6">
                <div className="inline-block p-4 bg-white rounded-2xl shadow-lg">
                  {format === 'svg' ? (
                    <div dangerouslySetInnerHTML={{ __html: qrData }} style={{ width: 200, height: 200 }} />
                  ) : (
                    <img src={qrData} alt="Generated QR Code" className="w-48 h-48 object-contain" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold text-white mb-1">{label || 'QR Code'}</p>
                  <p className="text-xs text-surface-400 truncate max-w-xs mx-auto">{content}</p>
                </div>
                <div className="flex gap-3 justify-center flex-wrap">
                  <button onClick={download} className="btn-primary text-sm px-5 py-2.5">
                    <Download size={15} /> Download {format.toUpperCase()}
                  </button>
                  <button onClick={copyToClipboard} className="btn-secondary text-sm px-4 py-2.5">
                    {copied ? <Check size={15} className="text-green-400" /> : <Copy size={15} />}
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                  <button
                    onClick={() => setShowEmailPanel(v => !v)}
                    className={`text-sm px-4 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-all border ${showEmailPanel ? 'bg-purple-500/20 border-purple-500/40 text-purple-300' : 'bg-surface-700 border-surface-600 text-surface-300 hover:bg-surface-600'}`}
                  >
                    <Mail size={15} /> {showEmailPanel ? 'Hide Email' : 'Send Email'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center">
                <div className="w-24 h-24 mx-auto mb-4 rounded-2xl bg-surface-700 flex items-center justify-center">
                  <QrCode size={40} className="text-surface-500" />
                </div>
                <p className="text-surface-400 font-medium">Your QR code will appear here</p>
                <p className="text-surface-500 text-sm mt-1">Enter content and click Generate</p>
              </div>
            )}
          </div>

          {/* Email panel — only visible after QR is generated */}
          {qrData && showEmailPanel && (
            <div className="card card-glow border border-purple-500/20 bg-purple-500/5 space-y-4">
              <div className="flex items-center gap-2">
                <Mail size={16} className="text-purple-400" />
                <h3 className="text-sm font-bold text-white">Send QR via Email</h3>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-surface-400 mb-1">Recipient Name</label>
                  <input value={recipientName} onChange={e => setRecipientName(e.target.value)}
                    placeholder="John Doe" className="input-field text-sm py-2" />
                </div>
                <div>
                  <label className="block text-xs text-surface-400 mb-1">Recipient Email *</label>
                  <input value={recipientEmail} onChange={e => setRecipientEmail(e.target.value)}
                    placeholder="john@example.com" type="email" className="input-field text-sm py-2" />
                </div>
              </div>

              <div>
                <label className="block text-xs text-surface-400 mb-1">Subject</label>
                <input value={emailSubject} onChange={e => setEmailSubject(e.target.value)}
                  className="input-field text-sm py-2" />
              </div>

              <div>
                <label className="block text-xs text-surface-400 mb-1">Message Body</label>
                <textarea value={emailBody} onChange={e => setEmailBody(e.target.value)}
                  rows={2} className="input-field text-sm resize-none" />
              </div>

              {emailResult && (
                <div className={`text-sm rounded-xl px-3 py-2 flex items-center gap-2 ${
                  emailResult.ok ? 'bg-green-500/10 border border-green-500/20 text-green-400' : 'bg-red-500/10 border border-red-500/20 text-red-400'
                }`}>
                  {emailResult.ok ? <CheckCircle size={14} /> : <X size={14} />}
                  {emailResult.msg}
                </div>
              )}

              <button onClick={sendViaEmail} disabled={sending || !recipientEmail.trim()}
                className="btn-primary w-full justify-center py-2.5 text-sm bg-purple-600 hover:bg-purple-500">
                {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                {sending ? 'Sending…' : 'Send QR Code'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
