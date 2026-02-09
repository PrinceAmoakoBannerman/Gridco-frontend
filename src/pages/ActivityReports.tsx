import { useEffect, useState } from 'react';

type Report = {
  id: number;
  staff?: string;
  substation?: string;
  date?: string;
  time_out?: string | null;
  time_returned?: string | null;
  purpose?: string;
  work_done?: string;
  materials_used?: string;
  supervisor_approval?: string;
};

export default function ActivityReports() {
  const [reports, setReports] = useState<Report[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const res = await fetch('/api/activity-reports/');
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        let data = null;
        try {
          data = await res.json();
        } catch (parseErr) {
          throw new Error('Invalid JSON response');
        }
        setReports(data);
      } catch (err: any) {
        setError(err.message || 'Fetch error');
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, []);

  async function exportWeekly(start?: string, end?: string) {
    try {
      setError(null);
      const params = new URLSearchParams();
      if (start) params.set('start', start);
      if (end) params.set('end', end);
      const res = await fetch(`/api/export/activity-reports/weekly/?${params.toString()}`);
      if (!res.ok) { setError('Failed to export weekly CSV'); return; }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `activity_reports_weekly_${start || 'latest'}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      setError('Export failed');
    }
  }

  async function exportMonthly(month?: string) {
    try {
      setError(null);
      const params = new URLSearchParams();
      let m = month;
      if (!m) {
        const d = new Date();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        m = `${d.getFullYear()}-${mm}`;
      }
      params.set('month', m);
      const res = await fetch(`/api/export/activity-reports/monthly/?${params.toString()}`);
      if (!res.ok) { setError('Failed to export monthly CSV'); return; }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `activity_reports_month_${m}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      setError('Export failed');
    }
  }

  if (loading) return <div>Loading activity reports…</div>;
  if (error) return <div className="text-red-600">Error: {error}</div>;
  if (!reports || reports.length === 0) return <div>No activity reports available.</div>;

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">Activity Reports</h1>
      <div className="space-y-4">
        <div className="flex gap-2 mb-2">
          <button onClick={() => exportWeekly()} className="px-3 py-2 bg-gray-200 rounded">Export Weekly CSV</button>
          <button onClick={() => exportMonthly()} className="px-3 py-2 bg-gray-200 rounded">Export Monthly CSV</button>
        </div>
        {reports.map((r) => (
          <div key={r.id} className="bg-white p-4 rounded shadow">
            <div className="flex justify-between items-start">
              <div>
                <div className="text-lg font-medium">{r.work_done || r.purpose || 'Activity'}</div>
                <div className="text-sm text-gray-600">{r.staff} — {r.substation}</div>
              </div>
              <div className="text-sm text-gray-500">{r.date}</div>
            </div>

            <div className="mt-2 text-sm text-gray-700">Purpose: {r.purpose || '—'}</div>
            <div className="mt-1 text-sm text-gray-700">Work done: {r.work_done || '—'}</div>
            <div className="mt-1 text-sm text-gray-700">Materials used: {r.materials_used || '—'}</div>
            <div className="mt-1 text-sm text-gray-700">Time out: {r.time_out || '—'} — Returned: {r.time_returned || '—'}</div>
            <div className="mt-1 text-sm text-gray-700">Supervisor approval: {r.supervisor_approval || '—'}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
