import React, { useState } from 'react';
import { API_BASE_URL } from '../config';

const API = `${API_BASE_URL}/fault-reports/`;

export default function FaultReport() {
  const [form, setForm] = useState({
    title: '',
    description: '',
    date_reported: '',
    reported_by: '',
    location: '',
    severity: 'low',
    status: 'open',
    resolution_remarks: '',
  });
  const [attachment, setAttachment] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [faults, setFaults] = useState<any[]>([]);
  const [loadingFaults, setLoadingFaults] = useState(true);
  const [assigningId, setAssigningId] = useState<number | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((s) => ({ ...s, [name]: value }));
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAttachment(e.target.files?.[0] ?? null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v as string));
      if (attachment) fd.append('attachment', attachment);

      const res = await fetch(API, { method: 'POST', body: fd });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error || `${res.status} ${res.statusText}`);
      }
      setSuccess('Report submitted');
      // reload faults
      loadFaults();
      setForm({ title: '', description: '', date_reported: '', reported_by: '', location: '', severity: 'low', status: 'open', resolution_remarks: '' });
      setAttachment(null);
    } catch (err: any) {
      setError(err.message || 'Submit failed');
    } finally {
      setSubmitting(false);
    }
  };

  const loadFaults = async () => {
    setLoadingFaults(true);
    try {
      const token = localStorage.getItem('access_token');
      const headers: any = {};
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch(API, { headers });
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          setError('Not authorized — please sign in');
        }
        setFaults([]);
        return;
      }
      const json = await res.json();
      setFaults(json);
    } catch (e) {
      setFaults([]);
    } finally {
      setLoadingFaults(false);
    }
  };

  React.useEffect(() => { loadFaults(); }, []);

  const assignFault = async (faultId: number, assignedToId: string | number | null) => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      setError('You must sign in to assign faults');
      return;
    }
    const headers: any = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
    setAssigningId(faultId);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`${API_BASE_URL}/faults/${faultId}/`, { 
        method: 'PATCH', 
        headers, 
        body: JSON.stringify({ assigned_to: assignedToId }) 
      });
      
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        if (res.status === 401 || res.status === 403) {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          setError('Not authorized — please sign in');
        } else if (errData.error) {
          setError(`Assignment failed: ${errData.error}`);
        } else {
          setError(`Assignment failed (${res.status})`);
        }
        setAssigningId(null);
        return;
      }
      
      // Successful assignment - update local state immediately
      setFaults(prev => prev.map(f => {
        if (f.id === faultId) {
          return {
            ...f,
            assigned_to: typeof assignedToId === 'string' ? assignedToId : assignedToId,
            assigned_to_id: assignedToId
          };
        }
        return f;
      }));
      
      const currentFault = faults.find(f => f.id === faultId);
      if (assignedToId) {
        setSuccess(`Fault "${currentFault?.title || 'Unknown'}" assigned to "${assignedToId}"`);
      } else {
        setSuccess(`Fault "${currentFault?.title || 'Unknown'}" unassigned`);
      }
      
      // Reload faults in background to ensure sync with backend
      await loadFaults();
    } catch (e: any) {
      setError(`Assignment error: ${e.message || 'Failed to assign fault'}`);
      console.error('Assignment error:', e);
    } finally {
      setAssigningId(null);
    }
  };

  const toggleFaultStatus = async (id: number, currentStatus: string) => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      setError('You must sign in to change fault status');
      return;
    }
    const headers: any = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
    const newStatus = currentStatus && currentStatus.toLowerCase() !== 'resolved' ? 'resolved' : 'open';
    // optimistic update
    const prev = faults.slice();
    setFaults((p) => p.map(f => f.id === id ? { ...f, status: newStatus } : f));
    try {
      const res = await fetch(`${API_BASE_URL}/faults/${id}/`, { method: 'PATCH', headers, body: JSON.stringify({ status: newStatus }) });
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          setError('Not authorized — please sign in');
        }
        // revert on error
        setFaults(prev);
      }
    } catch (e) {
      setFaults(prev);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">Fault / Incident Report</h1>

      <form onSubmit={handleSubmit} className="bg-white p-4 rounded shadow max-w-2xl space-y-3">
        <input name="title" value={form.title} onChange={handleChange} placeholder="Fault title" className="w-full border px-2 py-1" required />
        <textarea name="description" value={form.description} onChange={handleChange} placeholder="Description" className="w-full border px-2 py-1" required />
        <div className="flex gap-2">
          <input name="date_reported" value={form.date_reported} onChange={handleChange} type="date" className="border px-2 py-1" required />
          <input name="reported_by" value={form.reported_by} onChange={handleChange} placeholder="Reported by" className="border px-2 py-1 flex-1" required />
        </div>

        <div className="flex gap-2">
          <input name="location" value={form.location} onChange={handleChange} placeholder="Location (substation / office)" className="border px-2 py-1 flex-1" required />
          <select name="severity" value={form.severity} onChange={handleChange} className="border px-2 py-1">
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
          <select name="status" value={form.status} onChange={handleChange} className="border px-2 py-1">
            <option value="open">Open</option>
            <option value="in progress">In Progress</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>

        <textarea name="resolution_remarks" value={form.resolution_remarks} onChange={handleChange} placeholder="Resolution remarks (optional)" className="w-full border px-2 py-1" />

        <div>
          <label className="block mb-1">Attach image/file</label>
          <input type="file" onChange={handleFile} />
        </div>

        {error && <div className="text-red-600">{error}</div>}
        {success && <div className="text-green-600">{success}</div>}

        <div>
          <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded" disabled={submitting}>{submitting ? 'Submitting…' : 'Submit Report'}</button>
        </div>
      </form>

        <div className="mt-6">
          <h2 className="text-xl font-semibold mb-2">Existing Faults</h2>
          {loadingFaults ? <div>Loading faults…</div> : (
            <ul className="space-y-2">
              {faults.length === 0 && <li className="text-sm text-gray-500">No fault reports</li>}
              {faults.map(f => (
                <li key={f.id} className="p-3 border rounded">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="font-medium">{f.title}</div>
                      <div className="text-xs text-gray-500">{f.location} — reported by {f.reported_by || '—'}</div>
                      <div className="text-sm mt-1">{f.description}</div>
                      <div className="text-xs text-gray-700 mt-2">
                        <span className="font-medium">Assigned to:</span> {
                          f.assigned_to ? (
                            typeof f.assigned_to === 'object' 
                              ? `${f.assigned_to.first_name || f.assigned_to.username || f.assigned_to.name || 'Staff ' + f.assigned_to.id}`
                              : f.assigned_to
                          ) : (
                            <span className="text-gray-500 italic">Unassigned</span>
                          )
                        }
                      </div>
                    </div>
                    <div className="text-right ml-4">
                      <div className="text-sm mb-2">Status: {f.status}</div>
                      <button onClick={() => toggleFaultStatus(f.id, f.status)} className="px-2 py-1 bg-blue-600 text-white rounded text-sm">
                        {f.status && f.status.toLowerCase() !== 'resolved' ? 'Mark resolved' : 'Reopen'}
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 pt-2 border-t">
                    <label className="block text-xs font-medium mb-1">Assign to staff (name or ID):</label>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        placeholder="Staff name or ID" 
                        id={`assign-input-${f.id}`}
                        className="border px-2 py-1 flex-1 text-sm"
                      />
                      <button 
                        onClick={() => {
                          const input = document.getElementById(`assign-input-${f.id}`) as HTMLInputElement;
                          const inputVal = input.value.trim();
                          if (!inputVal) {
                            setError('Please enter a staff name or ID');
                            return;
                          }
                          assignFault(f.id, inputVal);
                          input.value = '';
                        }}
                        disabled={assigningId === f.id}
                        className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 disabled:bg-gray-500"
                      >
                        {assigningId === f.id ? 'Assigning...' : 'Assign'}
                      </button>
                      <button 
                        onClick={() => assignFault(f.id, null)}
                        disabled={assigningId === f.id}
                        className="px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600 disabled:bg-gray-400"
                      >
                        Unassign
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
    </div>
  );
}
