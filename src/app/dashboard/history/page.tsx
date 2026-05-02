'use client';
import { useState, useEffect } from 'react';
import { History, Search, Trash2, Download, RefreshCw, QrCode, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';

interface QRRecord { id: string; content: string; label: string; type: string; color: string; bgColor: string; size: number; isBulk: boolean; batchName: string | null; createdAt: string; }

export default function HistoryPage() {
  const [records, setRecords] = useState<QRRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<QRRecord | null>(null);
  const [previewData, setPreviewData] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const fetchHistory = async (p = 1, q = search) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/qr/history?page=${p}&limit=15&search=${encodeURIComponent(q)}`);
      const data = await res.json();
      setRecords(data.qrCodes ?? []);
      setTotal(data.total ?? 0);
      setPages(data.pages ?? 1);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchHistory(); }, []);

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); setPage(1); fetchHistory(1, search); };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this QR code?')) return;
    await fetch('/api/qr/history', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    fetchHistory(page);
    if (selected?.id === id) { setSelected(null); setPreviewData(null); }
  };

  const handlePreview = async (record: QRRecord) => {
    setSelected(record);
    setPreviewLoading(true);
    try {
      const res = await fetch('/api/qr/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: record.content, color: record.color, bgColor: record.bgColor, size: 250 }),
      });
      const data = await res.json();
      setPreviewData(data.qrData);
    } finally { setPreviewLoading(false); }
  };

  const downloadQR = () => {
    if (!previewData || !selected) return;
    const a = document.createElement('a');
    a.href = previewData;
    a.download = `qr_${selected.label || 'code'}.png`;
    a.click();
  };

  return (
    <div className="animate-fade-in max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">QR History</h1>
        <p className="text-surface-400">Browse and manage all your generated QR codes ({total} total)</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <form onSubmit={handleSearch} className="flex gap-3">
            <div className="flex-1 relative">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-500" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search by content or label..." className="input-field pl-10" />
            </div>
            <button type="submit" className="btn-secondary px-4">Search</button>
            <button type="button" onClick={() => fetchHistory(page)} className="btn-secondary px-3">
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            </button>
          </form>

          <div className="card card-glow overflow-hidden">
            {loading ? (
              <div className="space-y-3 p-4">
                {[...Array(5)].map((_, i) => <div key={i} className="skeleton h-14 rounded-xl" />)}
              </div>
            ) : records.length === 0 ? (
              <div className="py-16 text-center">
                <QrCode size={40} className="mx-auto mb-3 text-surface-600" />
                <p className="text-surface-400 font-medium">No QR codes found</p>
                <p className="text-surface-500 text-sm mt-1">Generate your first QR code to see it here</p>
              </div>
            ) : (
              <div className="divide-y divide-surface-700">
                {records.map(record => (
                  <div key={record.id}
                    onClick={() => handlePreview(record)}
                    className={`flex items-center gap-4 p-4 cursor-pointer transition-all hover:bg-surface-700/50 ${selected?.id === record.id ? 'bg-brand-500/10 border-l-2 border-brand-500' : ''}`}>
                    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center flex-shrink-0 shadow">
                      <QrCode size={20} className="text-surface-900" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white text-sm truncate">{record.label || record.content}</p>
                      <p className="text-xs text-surface-400 truncate mt-0.5">{record.content}</p>
                    </div>
                    <div className="text-right flex-shrink-0 hidden sm:block">
                      <p className="text-xs text-surface-400">{format(new Date(record.createdAt), 'MMM d, yyyy')}</p>
                      {record.isBulk && <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full">Bulk</span>}
                    </div>
                    <button onClick={e => { e.stopPropagation(); handleDelete(record.id); }}
                      className="p-2 text-surface-500 hover:text-red-400 transition-colors flex-shrink-0">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pagination */}
          {pages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-surface-400">Page {page} of {pages}</p>
              <div className="flex gap-2">
                <button onClick={() => { const p = page-1; setPage(p); fetchHistory(p); }} disabled={page === 1} className="btn-secondary px-3 py-2 disabled:opacity-50">
                  <ChevronLeft size={15} />
                </button>
                <button onClick={() => { const p = page+1; setPage(p); fetchHistory(p); }} disabled={page === pages} className="btn-secondary px-3 py-2 disabled:opacity-50">
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Preview Panel */}
        <div className="card card-glow sticky top-8 h-fit">
          {selected ? (
            <div className="text-center space-y-4">
              <h3 className="font-semibold text-white text-sm">Preview</h3>
              {previewLoading ? (
                <div className="skeleton w-48 h-48 mx-auto rounded-2xl" />
              ) : previewData ? (
                <div className="inline-block p-3 bg-white rounded-2xl shadow">
                  <img src={previewData} alt="QR Preview" className="w-44 h-44 object-contain" />
                </div>
              ) : null}
              <div className="text-left space-y-2">
                <div className="bg-surface-900 rounded-xl p-3">
                  <p className="text-xs text-surface-500 mb-1">Label</p>
                  <p className="text-sm text-white font-medium">{selected.label || '—'}</p>
                </div>
                <div className="bg-surface-900 rounded-xl p-3">
                  <p className="text-xs text-surface-500 mb-1">Content</p>
                  <p className="text-sm text-white break-all">{selected.content}</p>
                </div>
                <div className="bg-surface-900 rounded-xl p-3">
                  <p className="text-xs text-surface-500 mb-1">Created</p>
                  <p className="text-sm text-white">{format(new Date(selected.createdAt), 'PPp')}</p>
                </div>
              </div>
              <button onClick={downloadQR} disabled={!previewData} className="btn-primary w-full justify-center text-sm">
                <Download size={15} /> Download PNG
              </button>
            </div>
          ) : (
            <div className="py-12 text-center">
              <History size={32} className="mx-auto mb-3 text-surface-600" />
              <p className="text-surface-400 text-sm">Click a record to preview</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
