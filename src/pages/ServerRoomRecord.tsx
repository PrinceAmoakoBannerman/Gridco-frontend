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

type Visitor = {
  id: number;
  staff_id: string;
  name: string;
  purpose: string;
  date: string;
  time_in: string;
  time_out: string | null;
};

const API = `${API_BASE_URL}/server-room/`;
const VISITOR_API = `${API_BASE_URL}/server-room-visitors/`;

export default function ServerRoomRecord() {
  const [items, setItems] = useState<Entry[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [visitors, setVisitors] = useState<Visitor[] | null>(null);
  const [visitorLoading, setVisitorLoading] = useState(true);
  const [visitorError, setVisitorError] = useState<string | null>(null);

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

  const [visitorForm, setVisitorForm] = useState({
    staff_id: '',
    name: '',
    purpose: '',
    time_in: '',
    time_out: '',
  });
  const [visitorSubmitting, setVisitorSubmitting] = useState(false);
  const [visitorSuccess, setVisitorSuccess] = useState<string | null>(null);

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

  useEffect(() => {
    const fetchVisitors = async () => {
      try {
        const res = await fetch(VISITOR_API);
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        const data = await res.json();
        setVisitors(data);
      } catch (err: any) {
        setVisitorError(err.message || 'Fetch error');
      } finally {
        setVisitorLoading(false);
      }
    };

    fetchVisitors();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((s) => ({ ...s, [name]: value }));
  };

  const handleVisitorChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setVisitorForm((s) => ({ ...s, [name]: value }));
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

  const handleVisitorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setVisitorSubmitting(true);
    setVisitorError(null);
    setVisitorSuccess(null);
    try {
      const res = await fetch(VISITOR_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(visitorForm),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error || `${res.status} ${res.statusText}`);
      }
      const created = await res.json();
      setVisitors((prev) => (prev ? [created, ...prev] : [created]));
      setVisitorForm({ staff_id: '', name: '', purpose: '', time_in: '', time_out: '' });
      setVisitorSuccess('Visitor signed in');
    } catch (err: any) {
      setVisitorError(err.message || 'Submit error');
    } finally {
      setVisitorSubmitting(false);
    }
  };

  if (loading) return <div className="text-gray-900 dark:text-white">Loading server room records…</div>;
  if (error) return <div className="text-red-600 dark:text-red-400">Error: {error}</div>;

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">Server Room Entry Log</h1>

      <form onSubmit={handleVisitorSubmit} className="bg-white dark:bg-gray-800 p-6 rounded shadow mb-6 max-w-3xl">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Visitor Sign-In</h2>
          <div className="text-xs text-gray-500 dark:text-gray-400">Sign in before filling the server room form.</div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3 items-end">
          <label>
            <div className="text-sm text-gray-600 dark:text-gray-300 mb-1">Staff ID</div>
            <input aria-label="Staff ID" name="staff_id" value={visitorForm.staff_id} onChange={handleVisitorChange} placeholder="Staff ID" className="w-full border dark:border-gray-600 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gridco-200 bg-white dark:bg-gray-700 dark:text-white dark:placeholder-gray-400" required />
          </label>
          <label className="md:col-span-2">
            <div className="text-sm text-gray-600 dark:text-gray-300 mb-1">Name</div>
            <input aria-label="Name" name="name" value={visitorForm.name} onChange={handleVisitorChange} placeholder="Full name" className="w-full border dark:border-gray-600 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gridco-200 bg-white dark:bg-gray-700 dark:text-white dark:placeholder-gray-400" required />
          </label>
        </div>

        <label className="block mt-3">
          <div className="text-sm text-gray-600 dark:text-gray-300 mb-1">Purpose</div>
          <textarea aria-label="Purpose" name="purpose" value={visitorForm.purpose} onChange={handleVisitorChange} placeholder="Purpose of visit" className="w-full border dark:border-gray-600 rounded px-3 py-2 min-h-[80px] bg-white dark:bg-gray-700 dark:text-white dark:placeholder-gray-400" required />
        </label>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
          <label>
            <div className="text-sm text-gray-600 dark:text-gray-300 mb-1">Time in</div>
            <input aria-label="Time in" name="time_in" value={visitorForm.time_in} onChange={handleVisitorChange} type="time" className="w-full border dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 dark:text-white" required />
          </label>
          <label>
            <div className="text-sm text-gray-600 dark:text-gray-300 mb-1">Time out</div>
            <input aria-label="Time out" name="time_out" value={visitorForm.time_out} onChange={handleVisitorChange} type="time" className="w-full border dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 dark:text-white" />
          </label>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button type="submit" className="bg-gridco-700 hover:bg-gridco-800 text-white px-5 py-2 rounded disabled:opacity-60" disabled={visitorSubmitting}>
            {visitorSubmitting ? 'Signing in…' : 'Sign In Visitor'}
          </button>
          {visitorSuccess && <div className="text-green-600 dark:text-green-400 text-sm">{visitorSuccess}</div>}
          {visitorError && <div className="text-red-600 dark:text-red-400 text-sm">{visitorError}</div>}
        </div>
      </form>

      <div className="mb-8">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Recent Visitor Sign-Ins</h3>
        {visitorLoading && <div className="text-gray-700 dark:text-gray-300">Loading visitors…</div>}
        {!visitorLoading && visitorError && <div className="text-red-600 dark:text-red-400">Error: {visitorError}</div>}
        {!visitorLoading && !visitorError && (!visitors || visitors.length === 0) && (
          <div className="text-gray-700 dark:text-gray-300">No visitor sign-ins yet.</div>
        )}
        <div className="space-y-2">
          {visitors?.map((v) => (
            <div key={v.id} className="bg-white dark:bg-gray-800 p-3 rounded shadow">
              <div className="flex justify-between items-center">
                <div className="font-medium dark:text-white">{v.name} ({v.staff_id})</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">{v.date}</div>
              </div>
              <div className="text-sm text-gray-700 dark:text-gray-300">{v.time_in} — {v.time_out || '—'}</div>
              <div className="mt-2 dark:text-gray-300">Purpose: {v.purpose || '—'}</div>
            </div>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 p-6 rounded shadow mb-6 max-w-3xl">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
          <label className="col-span-2">
            <div className="text-sm text-gray-600 dark:text-gray-300 mb-1">Staff</div>
            <input aria-label="Staff" name="staff" value={form.staff} onChange={handleChange} placeholder="Staff" className="w-full border dark:border-gray-600 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gridco-200 bg-white dark:bg-gray-700 dark:text-white dark:placeholder-gray-400" required />
          </label>
          <label>
            <div className="text-sm text-gray-600 dark:text-gray-300 mb-1">Date</div>
            <input aria-label="Date" name="date" value={form.date} onChange={handleChange} type="date" className="w-full border dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 dark:text-white" required />
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
          <label>
            <div className="text-sm text-gray-600 dark:text-gray-300 mb-1">Time in</div>
            <input aria-label="Time in" name="time_in" value={form.time_in} onChange={handleChange} type="time" className="w-full border dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 dark:text-white" required />
          </label>
          <label>
            <div className="text-sm text-gray-600 dark:text-gray-300 mb-1">Time out</div>
            <input aria-label="Time out" name="time_out" value={form.time_out} onChange={handleChange} type="time" className="w-full border dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 dark:text-white" />
          </label>
        </div>

        <label className="block mt-3">
          <div className="text-sm text-gray-600 dark:text-gray-300 mb-1">Reason for entry</div>
          <textarea aria-label="Reason for entry" name="reason" value={form.reason} onChange={handleChange} placeholder="Reason for entry" className="w-full border dark:border-gray-600 rounded px-3 py-2 min-h-[80px] bg-white dark:bg-gray-700 dark:text-white dark:placeholder-gray-400" />
        </label>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
          <label>
            <div className="text-sm text-gray-600 dark:text-gray-300 mb-1">Equipment touched</div>
            <input name="equipment_touched" value={form.equipment_touched} onChange={handleChange} placeholder="Equipment touched" className="w-full border dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 dark:text-white dark:placeholder-gray-400" />
          </label>
          <label>
            <div className="text-sm text-gray-600 dark:text-gray-300 mb-1">Supervisor on duty</div>
            <input name="supervisor" value={form.supervisor} onChange={handleChange} placeholder="Supervisor on duty" className="w-full border dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 dark:text-white dark:placeholder-gray-400" />
          </label>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded disabled:opacity-60" disabled={submitting}>
            {submitting ? 'Saving…' : 'Save Entry'}
          </button>
          {success && <div className="text-green-600 dark:text-green-400 text-sm">{success}</div>}
          {error && <div className="text-red-600 dark:text-red-400 text-sm">{error}</div>}
        </div>
      </form>

      <div className="space-y-3">
        {(!items || items.length === 0) && <div className="text-gray-700 dark:text-gray-300">No server room records available.</div>}
        {items?.map((it) => (
          <div key={it.id} className="bg-white dark:bg-gray-800 p-3 rounded shadow">
            <div className="flex justify-between items-center">
              <div className="font-medium dark:text-white">{it.staff}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">{it.date}</div>
            </div>
            <div className="text-sm text-gray-700 dark:text-gray-300">{it.time_in} — {it.time_out || '—'}</div>
            <div className="mt-2 dark:text-gray-300">Reason: {it.reason || '—'}</div>
            <div className="mt-1 text-sm dark:text-gray-300">Equipment: {it.equipment_touched || '—'}</div>
            <div className="mt-1 text-sm dark:text-gray-300">Supervisor: {it.supervisor || '—'}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
