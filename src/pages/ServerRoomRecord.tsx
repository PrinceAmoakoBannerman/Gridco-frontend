import { useEffect, useState } from 'react';
import { API_BASE_URL } from '../config';

type Entry = {
  id: number;
  staff: string;
  date: string;
  time_in: string;
  time_out: string;
  reason: string;
  equipment_touched: string;
  supervisor: string;
};

const API = `${API_BASE_URL}/server-room/`;

export default function ServerRoomRecord() {
  const [items, setItems] = useState<Entry[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    staff: '',
    date: '',
    time_in: '',
    time_out: '',
    reason: '',
    equipment_touched: '',
    supervisor: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(API);
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        const data = await res.json();
        setItems(data);
      } catch (err: any) {
        setError(err.message || 'Fetch error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((s) => ({ ...s, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error || `${res.status} ${res.statusText}`);
      }
      const created = await res.json();
      setItems((prev) => (prev ? [created, ...prev] : [created]));
      setForm({ staff: '', date: '', time_in: '', time_out: '', reason: '', equipment_touched: '', supervisor: '' });
      setSuccess('Entry saved');
    } catch (err: any) {
      setError(err.message || 'Submit error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div>Loading server room records…</div>;
  if (error) return <div className="text-red-600">Error: {error}</div>;

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">Server Room Entry Log</h1>

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded shadow mb-6 max-w-3xl">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
          <label className="col-span-2">
            <div className="text-sm text-gray-600 mb-1">Staff</div>
            <input aria-label="Staff" name="staff" value={form.staff} onChange={handleChange} placeholder="Staff" className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gridco-200" required />
          </label>
          <label>
            <div className="text-sm text-gray-600 mb-1">Date</div>
            <input aria-label="Date" name="date" value={form.date} onChange={handleChange} type="date" className="w-full border rounded px-3 py-2" required />
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
          <label>
            <div className="text-sm text-gray-600 mb-1">Time in</div>
            <input aria-label="Time in" name="time_in" value={form.time_in} onChange={handleChange} type="time" className="w-full border rounded px-3 py-2" required />
          </label>
          <label>
            <div className="text-sm text-gray-600 mb-1">Time out</div>
            <input aria-label="Time out" name="time_out" value={form.time_out} onChange={handleChange} type="time" className="w-full border rounded px-3 py-2" />
          </label>
        </div>

        <label className="block mt-3">
          <div className="text-sm text-gray-600 mb-1">Reason for entry</div>
          <textarea aria-label="Reason for entry" name="reason" value={form.reason} onChange={handleChange} placeholder="Reason for entry" className="w-full border rounded px-3 py-2 min-h-[80px]" />
        </label>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
          <label>
            <div className="text-sm text-gray-600 mb-1">Equipment touched</div>
            <input name="equipment_touched" value={form.equipment_touched} onChange={handleChange} placeholder="Equipment touched" className="w-full border rounded px-3 py-2" />
          </label>
          <label>
            <div className="text-sm text-gray-600 mb-1">Supervisor on duty</div>
            <input name="supervisor" value={form.supervisor} onChange={handleChange} placeholder="Supervisor on duty" className="w-full border rounded px-3 py-2" />
          </label>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button type="submit" className="bg-blue-600 text-white px-5 py-2 rounded disabled:opacity-60" disabled={submitting}>
            {submitting ? 'Saving…' : 'Save Entry'}
          </button>
          {success && <div className="text-green-600 text-sm">{success}</div>}
          {error && <div className="text-red-600 text-sm">{error}</div>}
        </div>
      </form>

      <div className="space-y-3">
        {(!items || items.length === 0) && <div>No server room records available.</div>}
        {items?.map((it) => (
          <div key={it.id} className="bg-white p-3 rounded shadow">
            <div className="flex justify-between items-center">
              <div className="font-medium">{it.staff}</div>
              <div className="text-sm text-gray-600">{it.date}</div>
            </div>
            <div className="text-sm text-gray-700">{it.time_in} — {it.time_out || '—'}</div>
            <div className="mt-2">Reason: {it.reason || '—'}</div>
            <div className="mt-1 text-sm">Equipment: {it.equipment_touched || '—'}</div>
            <div className="mt-1 text-sm">Supervisor: {it.supervisor || '—'}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
