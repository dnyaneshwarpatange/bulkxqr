'use client';
import { useState, useEffect, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Mail, Plus, Send, Users, Clock, CheckCircle, XCircle, Upload, Trash2, Eye, FileSpreadsheet } from 'lucide-react';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';

interface Campaign {
  id: string; name: string; subject: string; body: string; status: string;
  totalCount: number; sentCount: number; failedCount: number; createdAt: string; sentAt: string | null;
  _count?: { emails: number };
}

interface Recipient { email: string; name: string; qrContent: string; }

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [sending, setSending] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('Hi {name},\n\nPlease find your personalized QR code attached.\n\nBest regards,\nYour Team');
  const [recipients, setRecipients] = useState<Recipient[]>([{ email: '', name: '', qrContent: '' }]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchCampaigns = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/email/campaigns');
      const data = await res.json();
      setCampaigns(data.campaigns ?? []);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchCampaigns(); }, []);

  const onDrop = useCallback((accepted: File[]) => {
    const file = accepted[0];
    if (!file) return;
    const name = file.name.toLowerCase();
    if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
      const reader = new FileReader();
      reader.onload = e => {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });
        const startRow = rows[0]?.some((c: any) => ['email','name','content','qr'].includes(String(c).toLowerCase())) ? 1 : 0;
        const parsed = rows.slice(startRow).map(row => ({
          email: String(row[0] ?? '').trim(),
          name: String(row[1] ?? '').trim(),
          qrContent: String(row[2] ?? row[0] ?? '').trim(),
        })).filter(r => r.email.includes('@'));
        setRecipients(parsed.length > 0 ? parsed : [{ email: '', name: '', qrContent: '' }]);
      };
      reader.readAsArrayBuffer(file);
    } else {
      const reader = new FileReader();
      reader.onload = e => {
        const text = e.target?.result as string;
        const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
        const parsed = lines.map(line => {
          const parts = line.split(',').map(p => p.replace(/"/g, '').trim());
          return { email: parts[0] ?? '', name: parts[1] ?? '', qrContent: parts[2] ?? parts[0] ?? '' };
        }).filter(r => r.email.includes('@'));
        setRecipients(parsed.length > 0 ? parsed : [{ email: '', name: '', qrContent: '' }]);
      };
      reader.readAsText(file);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'text/csv': ['.csv'], 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] },
    maxFiles: 1,
  });

  const createCampaign = async () => {
    if (!name || !subject || !body) { setError('Fill in all required fields'); return; }
    const validRecipients = recipients.filter(r => r.email.includes('@'));
    if (!validRecipients.length) { setError('Add at least one valid recipient'); return; }
    setCreating(true); setError('');
    try {
      const res = await fetch('/api/email/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, subject, body, recipients: validRecipients }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Failed to create'); return; }
      setSuccess('Campaign created! Ready to send.');
      setShowCreate(false);
      fetchCampaigns();
    } catch { setError('Network error'); }
    finally { setCreating(false); }
  };

  const sendCampaign = async (id: string) => {
    if (!confirm('Send this campaign now? This will email all recipients.')) return;
    setSending(id);
    try {
      const res = await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId: id }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(`Sent ${data.sentCount} emails! ${data.failedCount} failed.`);
        fetchCampaigns();
      } else { setError(data.error ?? 'Send failed'); }
    } catch { setError('Network error'); }
    finally { setSending(null); }
  };

  const downloadTemplate = () => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([
      ['Email', 'Name', 'QR Content (URL or text)'],
      ['alice@example.com', 'Alice Smith', 'https://event.com/ticket/001'],
      ['bob@example.com', 'Bob Jones', 'https://event.com/ticket/002'],
    ]);
    ws['!cols'] = [{ wch: 30 }, { wch: 20 }, { wch: 40 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Recipients');
    XLSX.writeFile(wb, 'BulkXQR_campaign_template.xlsx');
  };

  const statusColor: Record<string, string> = {
    draft: '#64748b', sending: '#f59e0b', sent: '#22c55e', failed: '#ef4444',
  };

  const StatusIcon = ({ status }: { status: string }) => {
    if (status === 'sent') return <CheckCircle size={14} className="text-green-400" />;
    if (status === 'failed') return <XCircle size={14} className="text-red-400" />;
    if (status === 'sending') return <Clock size={14} className="text-yellow-400 animate-pulse" />;
    return <Clock size={14} className="text-surface-400" />;
  };

  return (
    <div className="animate-fade-in max-w-6xl">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Email Campaigns</h1>
          <p className="text-surface-400">Send personalized QR codes to your audience</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary">
          <Plus size={16} /> New Campaign
        </button>
      </div>

      {success && <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 text-green-400 text-sm mb-6">{success}</div>}
      {error && <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-400 text-sm mb-6">{error}</div>}

      {/* Campaign List */}
      {loading ? (
        <div className="space-y-4">{[...Array(3)].map((_, i) => <div key={i} className="skeleton h-24 rounded-2xl" />)}</div>
      ) : campaigns.length === 0 ? (
        <div className="card card-glow py-20 text-center">
          <Mail size={48} className="mx-auto mb-4 text-surface-600" />
          <h3 className="text-xl font-bold text-white mb-2">No campaigns yet</h3>
          <p className="text-surface-400 mb-6">Create your first email campaign to send QR codes to your audience</p>
          <button onClick={() => setShowCreate(true)} className="btn-primary mx-auto">
            <Plus size={16} /> Create Campaign
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {campaigns.map(c => (
            <div key={c.id} className="card card-glow">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-bold text-white text-lg">{c.name}</h3>
                    <span className="flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full font-medium capitalize"
                      style={{ background: `${statusColor[c.status]}20`, color: statusColor[c.status] }}>
                      <StatusIcon status={c.status} /> {c.status}
                    </span>
                  </div>
                  <p className="text-surface-400 text-sm mb-3">Subject: {c.subject}</p>
                  <div className="flex flex-wrap gap-4 text-sm">
                    <span className="flex items-center gap-1.5 text-surface-300">
                      <Users size={13} className="text-surface-500" /> {c.totalCount} recipients
                    </span>
                    {c.sentCount > 0 && <span className="text-green-400">{c.sentCount} sent</span>}
                    {c.failedCount > 0 && <span className="text-red-400">{c.failedCount} failed</span>}
                    <span className="text-surface-500">Created {format(new Date(c.createdAt), 'MMM d, yyyy')}</span>
                    {c.sentAt && <span className="text-surface-500">Sent {format(new Date(c.sentAt), 'MMM d, h:mm a')}</span>}
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  {c.status === 'draft' && (
                    <button onClick={() => sendCampaign(c.id)} disabled={sending === c.id}
                      className="btn-primary text-sm px-4 py-2">
                      <Send size={14} /> {sending === c.id ? 'Sending...' : 'Send Now'}
                    </button>
                  )}
                </div>
              </div>
              {c.status !== 'draft' && c.totalCount > 0 && (
                <div className="mt-4 pt-4 border-t border-surface-700">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-surface-400">Delivery rate</span>
                    <span className="text-xs text-white">{Math.round((c.sentCount / c.totalCount) * 100)}%</span>
                  </div>
                  <div className="h-1.5 bg-surface-700 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${Math.round((c.sentCount / c.totalCount) * 100)}%` }} />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create Campaign Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) setShowCreate(false); }}>
          <div className="bg-surface-900 border border-surface-700 rounded-3xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-surface-800 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">New Email Campaign</h2>
              <button onClick={() => setShowCreate(false)} className="text-surface-400 hover:text-white text-2xl leading-none">&times;</button>
            </div>
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-surface-300 mb-2">Campaign Name *</label>
                  <input value={name} onChange={e => setName(e.target.value)} placeholder="Event QR Campaign" className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-surface-300 mb-2">Email Subject *</label>
                  <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Your QR code is ready" className="input-field" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-surface-300 mb-2">Email Body *</label>
                <p className="text-xs text-surface-500 mb-2">Use {'{name}'} to personalize. QR code is auto-embedded below the text.</p>
                <textarea value={body} onChange={e => setBody(e.target.value)} rows={5} className="input-field resize-none" />
              </div>

              {/* Recipients */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-semibold text-surface-300">Recipients *</label>
                  <div className="flex gap-2">
                    <button onClick={downloadTemplate} className="text-xs text-brand-400 hover:underline flex items-center gap-1">
                      <FileSpreadsheet size={12} /> Template
                    </button>
                    <button onClick={() => setRecipients(prev => [...prev, { email: '', name: '', qrContent: '' }])}
                      className="text-xs text-brand-400 hover:underline flex items-center gap-1">
                      <Plus size={12} /> Add Row
                    </button>
                  </div>
                </div>
                <div {...getRootProps()} className={`border-2 border-dashed rounded-xl p-4 mb-4 text-center cursor-pointer transition-all ${isDragActive ? 'border-brand-500 bg-brand-500/5' : 'border-surface-600 hover:border-surface-500'}`}>
                  <input {...getInputProps()} />
                  <Upload size={18} className="mx-auto mb-1 text-surface-500" />
                  <p className="text-sm text-surface-400">Drop CSV/Excel or click to upload</p>
                  <p className="text-xs text-surface-500 mt-1">Columns: Email, Name, QR Content</p>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  <div className="grid grid-cols-3 gap-2 text-xs text-surface-500 px-1">
                    <span>Email *</span><span>Name</span><span>QR Content</span>
                  </div>
                  {recipients.map((r, i) => (
                    <div key={i} className="grid grid-cols-3 gap-2 items-center">
                      <input value={r.email} onChange={e => setRecipients(prev => prev.map((p,idx) => idx===i ? {...p,email:e.target.value} : p))}
                        placeholder="email@example.com" className="input-field text-xs py-2" />
                      <input value={r.name} onChange={e => setRecipients(prev => prev.map((p,idx) => idx===i ? {...p,name:e.target.value} : p))}
                        placeholder="John Doe" className="input-field text-xs py-2" />
                      <div className="flex gap-1">
                        <input value={r.qrContent} onChange={e => setRecipients(prev => prev.map((p,idx) => idx===i ? {...p,qrContent:e.target.value} : p))}
                          placeholder="https://..." className="input-field text-xs py-2 flex-1" />
                        <button onClick={() => setRecipients(prev => prev.filter((_,idx) => idx !== i))} disabled={recipients.length === 1}
                          className="p-2 text-surface-500 hover:text-red-400 transition-colors">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-surface-500 mt-2">{recipients.filter(r=>r.email.includes('@')).length} valid recipients</p>
              </div>

              {error && <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-red-400 text-sm">{error}</div>}
              <div className="flex gap-3">
                <button onClick={() => setShowCreate(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
                <button onClick={createCampaign} disabled={creating} className="btn-primary flex-1 justify-center">
                  <Mail size={16} /> {creating ? 'Creating...' : 'Create Campaign'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
