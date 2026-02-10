import { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';

export default function DailyRecords(): JSX.Element {
  const [date, setDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function fetchRecords() {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('access_token');
      const headers: any = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch(`${API_BASE_URL}/daily-records/?date=${date}`, { headers });
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) setError('Authentication required. Sign in first.');
        else setError(`Failed to fetch: ${res.status}`);
        setData(null);
        return;
      }
      const j = await res.json();
      setData(j);
    } catch (e) {
      setError('Network error');
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    (async () => {
      const token = localStorage.getItem('access_token');
      if (!token) return;
      try {
        const res = await fetch(`${API_BASE_URL}/auth/user/`, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) return;
        // user info fetched but not needed for current functionality
      } catch (_) {
        // ignore
      }
    })();
  }, []);

  async function exportCsv() {
    try {
      setError(null);
      const token = localStorage.getItem('access_token');
      const headers: any = {};
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch(`${API_BASE_URL}/export/daily-records/csv/?date=${date}`, { headers });
      if (!res.ok) {
        if (res.status === 403) setError('Export denied: admin access required');
        else setError('Failed to export CSV');
        return;
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `daily_records_${date}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      setError('Export failed');
    }
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Daily Records</h1>
      <div className="mt-4 bg-white dark:bg-gray-800 p-4 rounded shadow">
        <div className="flex items-center gap-3">
          <input type="date" value={date} onChange={e=>setDate(e.target.value)} className="border dark:border-gray-600 p-2 rounded bg-white dark:bg-gray-700 dark:text-white" />
          <button onClick={fetchRecords} className="px-3 py-2 bg-gridco-700 hover:bg-gridco-600 text-white rounded">Load</button>
          <button onClick={exportCsv} className="px-3 py-2 bg-gray-200 dark:bg-gray-700 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600 rounded">Export CSV</button>
        </div>
        {error && <div className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</div>}
        {loading && <div className="mt-3 dark:text-gray-300">Loading…</div>}

        {data && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-gray-700 p-3 rounded shadow">
              <div className="font-semibold dark:text-white">Server Room Entries</div>
              <ul className="mt-2 max-h-64 overflow-auto text-sm">
                {data.server_room_entries.length === 0 && <li className="text-gray-500 dark:text-gray-400">No entries</li>}
                {data.server_room_entries.map((e:any) => (
                  <li key={e.id} className="py-1 border-b dark:border-gray-600 last:border-b-0">
                    <div className="font-medium dark:text-white">{e.staff}</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">{e.time_in} — {e.time_out ?? '—'}</div>
                    <div className="text-xs dark:text-gray-300">{e.reason}</div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-white dark:bg-gray-700 p-3 rounded shadow">
              <div className="font-semibold dark:text-white">Field Activities</div>
              <ul className="mt-2 max-h-64 overflow-auto text-sm">
                {data.field_activities.length === 0 && <li className="text-gray-500 dark:text-gray-400">No activities</li>}
                {data.field_activities.map((f:any) => (
                  <li key={f.id} className="py-1 border-b dark:border-gray-600 last:border-b-0">
                    <div className="font-medium dark:text-white">{f.staff} — {f.substation}</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">Out: {f.time_out} • Return: {f.time_returned ?? '—'}</div>
                    <div className="text-xs dark:text-gray-300">{f.work_done}</div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-white dark:bg-gray-700 p-3 rounded shadow">
              <div className="font-semibold dark:text-white">Faults</div>
              <ul className="mt-2 max-h-64 overflow-auto text-sm">
                {data.faults.length === 0 && <li className="text-gray-500 dark:text-gray-400">No faults</li>}
                {data.faults.map((f:any) => (
                  <li key={f.id} className="py-1 border-b dark:border-gray-600 last:border-b-0">
                    <div className="font-medium dark:text-white">{f.title}</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">{f.reported_by} • {f.location}</div>
                    <div className="text-xs dark:text-gray-300">{f.description}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Status: {f.status}</div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
