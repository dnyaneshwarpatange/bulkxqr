'use client';
import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Upload, Layers, Download, Trash2, Plus, X, FileSpreadsheet,
  FileText, AlertCircle, Settings2, ChevronDown, Check, Mail,
  ToggleLeft, ToggleRight, FileType, Archive, Send, Loader2
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface BulkItem { content: string; label: string; email?: string; }

interface ColumnMapping {
  qrColumn: number | null;
  labelColumn: number | null;
  emailColumn: number | null;
  headers: string[];
  preview: string[][];
}

export default function BulkPage() {
  const [items, setItems] = useState<BulkItem[]>([{ content: '', label: '', email: '' }]);
  const [batchName, setBatchName] = useState('My Batch');
  const [color, setColor] = useState('#000000');
  const [bgColor, setBgColor] = useState('#ffffff');
  const [size, setSize] = useState(300);
  const [exportFormat, setExportFormat] = useState<'zip' | 'docx'>('zip');
  const [sendEmails, setSendEmails] = useState(false);
  const [emailSubject, setEmailSubject] = useState('Your QR Code');
  const [emailBody, setEmailBody] = useState('Please find your personalised QR code attached below.');
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Column mapping state
  const [mapping, setMapping] = useState<ColumnMapping | null>(null);
  const [showMappingModal, setShowMappingModal] = useState(false);
  const [rawRows, setRawRows] = useState<string[][]>([]);
  const [totalRows, setTotalRows] = useState(0);

  const applyMapping = useCallback((rows: string[][], qrCol: number, labelCol: number, emailCol: number | null, headers: string[]) => {
    const dataRows = headers.length > 0 ? rows.slice(1) : rows;
    const parsed = dataRows.map((row, i) => ({
      content: String(row[qrCol] ?? '').trim(),
      label: labelCol >= 0 ? String(row[labelCol] ?? `Item ${i + 1}`).trim() : `Item ${i + 1}`,
      email: emailCol !== null && emailCol >= 0 ? String(row[emailCol] ?? '').trim() : '',
    })).filter(r => r.content);
    setItems(parsed.length > 0 ? parsed : [{ content: '', label: '', email: '' }]);
    // Auto-enable send emails if email column was mapped
    if (emailCol !== null && emailCol >= 0) setSendEmails(true);
    setShowMappingModal(false);
  }, []);

  const parseFile = useCallback((file: File) => {
    const name = file.name.toLowerCase();
    if (name.endsWith('.csv') || name.endsWith('.txt')) {
      const reader = new FileReader();
      reader.onload = e => {
        const text = e.target?.result as string;
        const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
        const rows = lines.map(line => line.split(',').map(c => c.replace(/^"|"$/g, '').trim()));
        if (rows.length === 0) return;
        const hasHeader = rows[0].some(c => /label|name|content|url|text|value|email/i.test(c));
        const headers = hasHeader ? rows[0] : [];
        setTotalRows(rows.length - (hasHeader ? 1 : 0));
        setRawRows(rows);
        setMapping({
          headers,
          qrColumn: hasHeader ? Math.max(0, rows[0].findIndex(c => /content|url|text|value/i.test(c))) : 0,
          labelColumn: hasHeader ? rows[0].findIndex(c => /label|name/i.test(c)) : -1,
          emailColumn: hasHeader ? rows[0].findIndex(c => /email/i.test(c)) : null,
          preview: rows.slice(0, 6),
        });
        setShowMappingModal(true);
      };
      reader.readAsText(file);
    } else if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
      const reader = new FileReader();
      reader.onload = e => {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rawData: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });
        const rows = rawData.map(row => row.map(c => String(c ?? '')));
        if (rows.length === 0) return;
        const hasHeader = rows[0].some(c => /label|name|content|url|text|value|email/i.test(c));
        const headers = hasHeader ? rows[0] : [];
        setTotalRows(rows.length - (hasHeader ? 1 : 0));
        setRawRows(rows);
        setMapping({
          headers,
          qrColumn: hasHeader ? Math.max(0, rows[0].findIndex(c => /content|url|text|value/i.test(c))) : 1,
          labelColumn: hasHeader ? rows[0].findIndex(c => /label|name/i.test(c)) : 0,
          emailColumn: hasHeader ? rows[0].findIndex(c => /email/i.test(c)) : null,
          preview: rows.slice(0, 6),
        });
        setShowMappingModal(true);
      };
      reader.readAsArrayBuffer(file);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: accepted => { if (accepted[0]) parseFile(accepted[0]); },
    accept: {
      'text/csv': ['.csv'], 'text/plain': ['.txt'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
    },
    maxFiles: 1,
  });

  const generate = async () => {
    const validItems = items.filter(i => i.content.trim());
    if (!validItems.length) { setError('Add at least one item with content'); return; }
    if (sendEmails && validItems.some(i => !i.email?.trim())) {
      setError('All items must have an email address when email sending is enabled'); return;
    }
    setGenerating(true); setError(''); setSuccess('');
    setProgress({ done: 0, total: validItems.length });

    // Simulate progress since the API processes server-side
    const progressInterval = setInterval(() => {
      setProgress(p => p ? { ...p, done: Math.min(p.done + Math.ceil(p.total / 20), p.total - 1) } : p);
    }, 200);

    try {
      const res = await fetch('/api/qr/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: validItems, batchName, color, bgColor, size, exportFormat, sendEmails, emailSubject, emailBody }),
      });

      clearInterval(progressInterval);
      setProgress({ done: validItems.length, total: validItems.length });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? 'Failed to generate'); return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${batchName.replace(/\s+/g, '_')}_qrcodes.${exportFormat}`;
      a.click();
      URL.revokeObjectURL(url);

      const emailMsg = sendEmails ? ` Emails sent to ${validItems.length} recipients.` : '';
      setSuccess(`✅ Generated ${validItems.length} QR codes!${emailMsg}`);
    } catch {
      clearInterval(progressInterval);
      setError('Network error. Please try again.');
    } finally {
      setGenerating(false);
      setTimeout(() => setProgress(null), 2000);
    }
  };

  const downloadTemplate = () => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([
      ['Label / Name', 'QR Content (URL, text, email, etc.)', 'Email Address'],
      ['Company Website', 'https://company.com', 'john@company.com'],
      ['Contact Email', 'contact@company.com', 'jane@company.com'],
      ['Event Ticket #001', 'https://event.com/ticket/001', 'guest1@email.com'],
      ['Product SKU-42', 'https://shop.com/product/42', 'customer@email.com'],
    ]);
    ws['!cols'] = [{ wch: 25 }, { wch: 45 }, { wch: 30 }];
    XLSX.utils.book_append_sheet(wb, ws, 'QR Data');
    XLSX.writeFile(wb, 'BulkXQR_template.xlsx');
  };

  const addItem = () => setItems(prev => [...prev, { content: '', label: '', email: '' }]);
  const removeItem = (i: number) => setItems(prev => prev.filter((_, idx) => idx !== i));
  const updateItem = (i: number, field: 'content' | 'label' | 'email', val: string) => {
    setItems(prev => prev.map((item, idx) => idx === i ? { ...item, [field]: val } : item));
  };

  const validCount = items.filter(i => i.content.trim()).length;
  const allHeaders = mapping?.headers.length ? mapping.headers : rawRows[0] ?? [];
  const emailsMapped = (mapping?.emailColumn ?? -1) >= 0;
  const progressPct = progress ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <div className="animate-fade-in max-w-5xl">
      {/* Column Mapping Modal */}
      {showMappingModal && mapping && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="card max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-white">Map Your Columns</h3>
                <p className="text-sm text-surface-400 mt-0.5">
                  {totalRows.toLocaleString()} rows detected — map columns once and we handle the rest
                </p>
              </div>
              <button onClick={() => setShowMappingModal(false)} className="text-surface-400 hover:text-white"><X size={18} /></button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              {[
                { label: 'QR Content Column', sub: 'URL, text, or data to encode', key: 'qrColumn', required: true, color: 'brand' },
                { label: 'Label Column', sub: 'Name for each QR code file', key: 'labelColumn', required: false, color: 'green' },
                { label: 'Email Column', sub: 'Send each QR to this address', key: 'emailColumn', required: false, color: 'purple' },
              ].map(({ label, sub, key, required, color }) => (
                <div key={key}>
                  <label className="block text-sm font-semibold text-surface-300 mb-1">
                    {label} {required ? <span className="text-red-400">*</span> : <span className="text-surface-500">(optional)</span>}
                  </label>
                  <p className="text-xs text-surface-500 mb-2">{sub}</p>
                  <div className="relative">
                    <select
                      value={(mapping as any)[key] ?? -1}
                      onChange={e => setMapping(m => m ? { ...m, [key]: e.target.value === '-1' ? (required ? null : -1) : Number(e.target.value) } : m)}
                      className="input-field w-full appearance-none pr-8"
                    >
                      {!required && <option value={-1}>— None</option>}
                      {(allHeaders.length > 0 ? allHeaders : rawRows[0] ?? []).map((h, i) => (
                        <option key={i} value={i}>{h || `Column ${i + 1}`}</option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 pointer-events-none" />
                  </div>
                </div>
              ))}
            </div>

            {/* Preview table */}
            <div className="mb-6">
              <p className="text-sm font-semibold text-surface-300 mb-3">Preview (first 5 rows of {totalRows.toLocaleString()} total)</p>
              <div className="overflow-x-auto rounded-xl border border-surface-700">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-surface-700 bg-surface-800/50">
                      {(allHeaders.length > 0 ? allHeaders : rawRows[0] ?? []).map((h, i) => (
                        <th key={i} className={`px-3 py-2.5 text-left text-xs font-semibold ${
                          i === mapping.qrColumn ? 'text-brand-400' :
                          i === mapping.labelColumn ? 'text-green-400' :
                          i === mapping.emailColumn ? 'text-purple-400' : 'text-surface-400'
                        }`}>
                          {h || `Col ${i + 1}`}
                          {i === mapping.qrColumn && <span className="ml-1">▸ QR</span>}
                          {i === mapping.labelColumn && <span className="ml-1">▸ Label</span>}
                          {i === mapping.emailColumn && <span className="ml-1">▸ Email</span>}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {mapping.preview.slice(allHeaders.length > 0 ? 1 : 0, 6).map((row, ri) => (
                      <tr key={ri} className="border-b border-surface-800 last:border-0">
                        {row.map((cell, ci) => (
                          <td key={ci} className={`px-3 py-2 text-xs max-w-[140px] truncate ${
                            ci === mapping.qrColumn ? 'text-brand-300 font-medium' :
                            ci === mapping.labelColumn ? 'text-green-300' :
                            ci === mapping.emailColumn ? 'text-purple-300' : 'text-surface-400'
                          }`}>
                            {cell || '—'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setShowMappingModal(false)} className="btn-secondary flex-1">Cancel</button>
              <button
                onClick={() => {
                  if (mapping.qrColumn === null) return;
                  applyMapping(rawRows, mapping.qrColumn, mapping.labelColumn ?? -1, mapping.emailColumn, allHeaders);
                }}
                disabled={mapping.qrColumn === null}
                className="btn-primary flex-1 justify-center"
              >
                <Check size={15} /> Apply & Load {totalRows.toLocaleString()} Rows
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Bulk QR Generator</h1>
        <p className="text-surface-400">Upload a file or enter items manually. Optionally send each QR directly via email.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Config Panel */}
        <div className="space-y-5">
          <div className="card card-glow">
            <label className="block text-sm font-semibold text-surface-300 mb-3">Batch Name</label>
            <input value={batchName} onChange={e => setBatchName(e.target.value)} className="input-field" />
          </div>

          <div className="card card-glow space-y-4">
            <label className="block text-sm font-semibold text-surface-300">Colors & Size</label>
            <div>
              <label className="block text-xs text-surface-400 mb-2">QR Color</label>
              <div className="flex gap-2 items-center">
                <input type="color" value={color} onChange={e => setColor(e.target.value)}
                  className="w-9 h-9 rounded-lg cursor-pointer border border-surface-600 bg-transparent" />
                <input value={color} onChange={e => setColor(e.target.value)} className="input-field text-xs py-2" />
              </div>
            </div>
            <div>
              <label className="block text-xs text-surface-400 mb-2">Background</label>
              <div className="flex gap-2 items-center">
                <input type="color" value={bgColor} onChange={e => setBgColor(e.target.value)}
                  className="w-9 h-9 rounded-lg cursor-pointer border border-surface-600 bg-transparent" />
                <input value={bgColor} onChange={e => setBgColor(e.target.value)} className="input-field text-xs py-2" />
              </div>
            </div>
            <div>
              <label className="block text-xs text-surface-400 mb-2">QR Size (px)</label>
              <input type="number" min={100} max={1000} step={50} value={size}
                onChange={e => setSize(Number(e.target.value))} className="input-field text-sm py-2" />
            </div>
          </div>

          <div className="card card-glow">
            <label className="block text-sm font-semibold text-surface-300 mb-3">Export Format</label>
            <div className="space-y-2">
              {[
                { value: 'zip', label: '📦 ZIP Archive', desc: 'Individual PNG files in a ZIP', icon: Archive },
                { value: 'docx', label: '📄 Word Document', desc: 'QR codes embedded in a .docx file', icon: FileType },
              ].map(f => (
                <label key={f.value} className={`flex gap-3 p-3 rounded-xl cursor-pointer transition-all border ${exportFormat === f.value ? 'border-brand-500 bg-brand-500/10' : 'border-surface-700 hover:border-surface-600'}`}>
                  <input type="radio" name="format" value={f.value} checked={exportFormat === f.value}
                    onChange={() => setExportFormat(f.value as any)} className="mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-white">{f.label}</p>
                    <p className="text-xs text-surface-400">{f.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Email Campaign Toggle */}
          <div className="card card-glow space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail size={15} className="text-purple-400" />
                <span className="text-sm font-semibold text-surface-300">Send via Email</span>
              </div>
              <button onClick={() => setSendEmails(v => !v)} className={`transition-colors ${sendEmails ? 'text-purple-400' : 'text-surface-600'}`}>
                {sendEmails ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
              </button>
            </div>
            {sendEmails && (
              <div className="space-y-3 pt-1 border-t border-surface-700">
                {!emailsMapped && (
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2 text-xs text-amber-400 flex gap-2 items-start">
                    <AlertCircle size={13} className="mt-0.5 flex-shrink-0" />
                    Map an <strong>Email column</strong> in your file, or fill the Email field per row below.
                  </div>
                )}
                <div>
                  <label className="block text-xs text-surface-400 mb-1">Email Subject</label>
                  <input value={emailSubject} onChange={e => setEmailSubject(e.target.value)}
                    className="input-field text-sm py-2" placeholder="Your QR Code" />
                </div>
                <div>
                  <label className="block text-xs text-surface-400 mb-1">Email Body</label>
                  <textarea value={emailBody} onChange={e => setEmailBody(e.target.value)}
                    rows={3} className="input-field text-sm resize-none"
                    placeholder="Message body (the QR code will be shown below)..." />
                </div>
              </div>
            )}
          </div>

          {/* Generate button & progress */}
          <div className="space-y-3">
            <button onClick={generate} disabled={generating} className="btn-primary w-full justify-center py-3.5">
              {generating ? <Loader2 size={18} className="animate-spin" /> : <Layers size={18} />}
              {generating ? 'Processing…' : `Generate ${validCount} QR Code${validCount !== 1 ? 's' : ''}`}
            </button>

            {/* Clean progress bar — no line-by-line rendering */}
            {progress && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-surface-400">
                  <span>{generating ? 'Generating QR codes…' : '✅ Complete!'}</span>
                  <span>{progress.done} / {progress.total}</span>
                </div>
                <div className="h-2 bg-surface-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-brand-500 to-purple-500 rounded-full transition-all duration-300"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                {sendEmails && generating && (
                  <p className="text-xs text-purple-400 flex items-center gap-1">
                    <Send size={11} /> Emails will be dispatched after generation…
                  </p>
                )}
              </div>
            )}

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-red-400 text-sm flex gap-2">
                <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />{error}
              </div>
            )}
            {success && (
              <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 text-green-400 text-sm">{success}</div>
            )}
          </div>
        </div>

        {/* Items Panel */}
        <div className="lg:col-span-2 space-y-4">
          {/* Dropzone */}
          <div {...getRootProps()} className={`card border-2 border-dashed cursor-pointer transition-all ${isDragActive ? 'border-brand-500 bg-brand-500/5' : 'border-surface-600 hover:border-surface-500'}`}>
            <input {...getInputProps()} />
            <div className="text-center py-6">
              <Upload size={32} className={`mx-auto mb-3 ${isDragActive ? 'text-brand-400' : 'text-surface-500'}`} />
              <p className="font-semibold text-white mb-1">
                {isDragActive ? 'Drop your file here' : 'Upload Excel, CSV, or TXT'}
              </p>
              <p className="text-sm text-surface-400 mb-3">
                Column mapper opens automatically — no manual editing needed for large files
              </p>
              <div className="flex items-center justify-center gap-3">
                <span className="flex items-center gap-1.5 text-xs text-surface-400 bg-surface-700 px-3 py-1.5 rounded-lg">
                  <FileSpreadsheet size={12} /> .xlsx / .xls
                </span>
                <span className="flex items-center gap-1.5 text-xs text-surface-400 bg-surface-700 px-3 py-1.5 rounded-lg">
                  <FileText size={12} /> .csv / .txt
                </span>
              </div>
            </div>
          </div>

          {rawRows.length > 0 && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-surface-400">
                <FileSpreadsheet size={14} className="text-green-400" />
                <span><strong className="text-white">{totalRows.toLocaleString()}</strong> rows loaded</span>
                {emailsMapped && <span className="text-purple-400 flex items-center gap-1"><Mail size={12} /> Email column mapped</span>}
              </div>
              <button onClick={() => setShowMappingModal(true)}
                className="flex items-center gap-2 text-sm text-brand-400 hover:text-brand-300 font-medium">
                <Settings2 size={14} /> Re-map columns
              </button>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h3 className="text-sm font-semibold text-surface-300">
                Items <span className="text-surface-500">({validCount} valid)</span>
              </h3>
              <button onClick={downloadTemplate} className="text-xs text-brand-400 hover:underline flex items-center gap-1">
                <Download size={11} /> Template
              </button>
            </div>
            <button onClick={addItem} className="btn-secondary text-xs px-3 py-1.5">
              <Plus size={13} /> Add Row
            </button>
          </div>

          {/* Summary view for large datasets — only show rows if ≤ 50 */}
          {items.length > 50 ? (
            <div className="card bg-surface-800/50 border border-surface-700">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-brand-500/20 flex items-center justify-center">
                  <Layers size={18} className="text-brand-400" />
                </div>
                <div>
                  <p className="font-semibold text-white">{items.length.toLocaleString()} rows loaded</p>
                  <p className="text-xs text-surface-400">Edit is disabled for large batches — re-upload to change data</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-surface-900 rounded-xl p-3">
                  <div className="text-lg font-bold text-white">{validCount.toLocaleString()}</div>
                  <div className="text-xs text-surface-400">Valid QR rows</div>
                </div>
                <div className="bg-surface-900 rounded-xl p-3">
                  <div className="text-lg font-bold text-white">{items.filter(i => i.email?.trim()).length.toLocaleString()}</div>
                  <div className="text-xs text-surface-400">With email</div>
                </div>
                <div className="bg-surface-900 rounded-xl p-3">
                  <div className="text-lg font-bold text-white">{(items.length - validCount).toLocaleString()}</div>
                  <div className="text-xs text-surface-400">Skipped (empty)</div>
                </div>
              </div>
              <p className="text-xs text-surface-500 mt-3 text-center">First 3 rows: {items.slice(0, 3).map(i => i.label || i.content).join(' · ')}</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
              <div className="grid gap-1 text-xs text-surface-500 px-7" style={{ gridTemplateColumns: '1fr 1fr' + (sendEmails ? ' 1fr' : '') }}>
                <span>Label</span>
                <span>QR Content</span>
                {sendEmails && <span className="text-purple-400">Email</span>}
              </div>
              {items.map((item, i) => (
                <div key={i} className="flex gap-2 items-center group">
                  <span className="text-xs text-surface-500 w-6 text-right flex-shrink-0">{i + 1}</span>
                  <input value={item.label} onChange={e => updateItem(i, 'label', e.target.value)}
                    placeholder="Label" className="input-field text-sm py-2 flex-1 min-w-0" />
                  <input value={item.content} onChange={e => updateItem(i, 'content', e.target.value)}
                    placeholder="Content (URL, text…)" className="input-field text-sm py-2 flex-1 min-w-0" />
                  {sendEmails && (
                    <input value={item.email || ''} onChange={e => updateItem(i, 'email', e.target.value)}
                      placeholder="email@example.com" type="email"
                      className="input-field text-sm py-2 flex-1 min-w-0 border-purple-500/30 focus:border-purple-500" />
                  )}
                  <button onClick={() => removeItem(i)} disabled={items.length === 1}
                    className="p-2 text-surface-600 hover:text-red-400 transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100 disabled:hidden">
                    <X size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
