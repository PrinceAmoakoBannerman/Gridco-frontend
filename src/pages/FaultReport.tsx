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
  const [feedbacks, setFeedbacks] = useState<{[key: number]: any[]}>({});
  const [feedbackForm, setFeedbackForm] = useState<{[key: number]: {name: string; email: string; text: string}}>({});
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('access_token'));

  // Check auth status and refresh token if needed on mount
  React.useEffect(() => {
    const checkAndRefreshAuth = async () => {
      const token = localStorage.getItem('access_token');
      const refreshToken = localStorage.getItem('refresh_token');
      
      if (!token && refreshToken) {
        // Try to refresh token
        try {
          const res = await fetch(`${API_BASE_URL}/auth/token/refresh/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh: refreshToken }),
          });
          if (res.ok) {
            const json = await res.json();
            localStorage.setItem('access_token', json.access);
            setIsAuthenticated(true);
          } else {
            // Refresh failed, clear tokens
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            setIsAuthenticated(false);
          }
        } catch (e) {
          console.error('Token refresh failed:', e);
          setIsAuthenticated(false);
        }
      } else if (token) {
        setIsAuthenticated(true);
      }
    };
    
    checkAndRefreshAuth();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((s) => ({ ...s, [name]: value }));
  };

  // Helper to get valid token, refresh if needed
  const getValidToken = async (): Promise<string | null> => {
    let token = localStorage.getItem('access_token');
    
    if (!token) {
      const refreshToken = localStorage.getItem('refresh_token');
      if (!refreshToken) {
        setIsAuthenticated(false);
        return null;
      }
      
      // Try to refresh
      try {
        const res = await fetch(`${API_BASE_URL}/auth/token/refresh/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh: refreshToken }),
        });
        if (res.ok) {
          const json = await res.json();
          localStorage.setItem('access_token', json.access);
          setIsAuthenticated(true);
          return json.access;
        } else {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          setIsAuthenticated(false);
          setError('Session expired. Please sign in again.');
          return null;
        }
      } catch (e) {
        setIsAuthenticated(false);
        return null;
      }
    }
    
    return token;
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

      const token = await getValidToken();
      const headers: any = {};
      if (token) headers.Authorization = `Bearer ${token}`;

      const res = await fetch(API, { method: 'POST', body: fd, headers });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        if (res.status === 401 || res.status === 403) {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          setIsAuthenticated(false);
          throw new Error('Session expired. Please sign in again.');
        }
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
      const token = await getValidToken();
      const headers: any = {};
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch(API, { headers });
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          setIsAuthenticated(false);
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

  React.useEffect(() => {
    faults.forEach(f => {
      if (f.status && f.status.toLowerCase() === 'resolved') {
        loadFeedbacks(f.id);
      }
    });
  }, [faults]);

  const loadFeedbacks = async (faultId: number) => {
    try {
      const token = await getValidToken();
      const headers: any = {};
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch(`${API_BASE_URL}/fault-feedbacks/${faultId}/`, { headers });
      if (!res.ok) return;
      const json = await res.json();
      setFeedbacks(prev => ({ ...prev, [faultId]: json }));
    } catch (e) {
      console.error('Failed to load feedbacks:', e);
    }
  };

  const submitFeedback = async (faultId: number) => {
    const form = feedbackForm[faultId];
    if (!form || !form.name.trim() || !form.email.trim() || !form.text.trim()) {
      setError('Please fill in all feedback fields');
      return;
    }

    const token = await getValidToken();
    const headers: any = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;

    try {
      const res = await fetch(`${API_BASE_URL}/fault-feedbacks/`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          fault_id: faultId,
          staff_name: form.name.trim(),
          staff_email: form.email.trim(),
          feedback_text: form.text.trim()
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        if (res.status === 401 || res.status === 403) {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          setIsAuthenticated(false);
          setError('Session expired. Please sign in again.');
        } else {
          setError(`Feedback submission failed: ${errData.error || res.statusText}`);
        }
        return;
      }

      setSuccess('Feedback submitted successfully!');
      // Clear form and reload feedbacks
      setFeedbackForm(prev => ({ 
        ...prev, 
        [faultId]: { name: '', email: '', text: '' }
      }));
      await loadFeedbacks(faultId);
    } catch (e: any) {
      setError(`Error submitting feedback: ${e.message}`);
    }
  };

  const assignFault = async (faultId: number, assignedToId: string | number | null) => {
    const token = await getValidToken();
    if (!token) {
      setError('Please sign in to assign faults');
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
          setIsAuthenticated(false);
          setError('Session expired. Please sign in again.');
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
    const token = await getValidToken();
    if (!token) {
      setError('Please sign in to change fault status');
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
          setIsAuthenticated(false);
          setError('Session expired. Please sign in again.');
        }
        // revert on error
        setFaults(prev);
      }
    } catch (e) {
      setFaults(prev);
    }
  };

  return (
    <div className="p-3 sm:p-6">
      <h1 className="text-xl sm:text-2xl font-semibold mb-3 sm:mb-4">Fault / Incident Report</h1>

      <form onSubmit={handleSubmit} className="bg-white p-3 sm:p-4 rounded shadow max-w-2xl space-y-3">
        <input name="title" value={form.title} onChange={handleChange} placeholder="Fault title" className="w-full border px-2 py-2 text-sm sm:text-base rounded" required />
        <textarea name="description" value={form.description} onChange={handleChange} placeholder="Description" className="w-full border px-2 py-2 text-sm sm:text-base rounded min-h-[80px]" required />
        <div className="flex flex-col sm:flex-row gap-2">
          <input name="date_reported" value={form.date_reported} onChange={handleChange} type="date" className="border px-2 py-2 text-sm sm:text-base rounded w-full sm:w-auto" required />
          <input name="reported_by" value={form.reported_by} onChange={handleChange} placeholder="Reported by" className="border px-2 py-2 text-sm sm:text-base rounded flex-1" required />
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <input name="location" value={form.location} onChange={handleChange} placeholder="Location (substation / office)" className="border px-2 py-2 text-sm sm:text-base rounded flex-1" required />
          <select name="severity" value={form.severity} onChange={handleChange} className="border px-2 py-2 text-sm sm:text-base rounded">
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
          <select name="status" value={form.status} onChange={handleChange} className="border px-2 py-2 text-sm sm:text-base rounded">
            <option value="open">Open</option>
            <option value="in progress">In Progress</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>

        <textarea name="resolution_remarks" value={form.resolution_remarks} onChange={handleChange} placeholder="Resolution remarks (optional)" className="w-full border px-2 py-2 text-sm sm:text-base rounded min-h-[60px]" />

        <div>
          <label className="block mb-1 text-sm sm:text-base">Attach image/file</label>
          <input type="file" onChange={handleFile} className="text-sm" />
        </div>

        {error && <div className="text-red-600 text-sm">{error}</div>}
        {success && <div className="text-green-600 text-sm">{success}</div>}

        <div>
          <button type="submit" className="w-full sm:w-auto bg-blue-600 text-white px-4 py-2 rounded text-sm sm:text-base" disabled={submitting}>{submitting ? 'Submitting…' : 'Submit Report'}</button>
        </div>
      </form>

        <div className="mt-4 sm:mt-6">
          <h2 className="text-lg sm:text-xl font-semibold mb-2">Existing Faults</h2>
          {loadingFaults ? <div className="text-sm">Loading faults…</div> : (
            <ul className="space-y-3">
              {faults.length === 0 && <li className="text-sm text-gray-500">No fault reports</li>}
              {faults.map(f => (
                <li key={f.id} className="p-3 border rounded bg-white shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                    <div className="flex-1">
                      <div className="font-medium text-sm sm:text-base">{f.title}</div>
                      <div className="text-xs text-gray-500 mt-1">{f.location} — reported by {f.reported_by || '—'}</div>
                      <div className="text-xs sm:text-sm mt-2">{f.description}</div>
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
                      {f.attachment_url && (
                        <div className="text-xs text-gray-700 mt-2">
                          <span className="font-medium">Attachment:</span> {' '}
                          <a href={f.attachment_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                            View / Download
                          </a>
                        </div>
                      )}
                    </div>
                    <div className="flex sm:flex-col items-center sm:items-end gap-2 sm:gap-0">
                      <div className="text-xs sm:text-sm flex-1 sm:flex-none sm:mb-2">Status: {f.status}</div>
                      <button onClick={() => toggleFaultStatus(f.id, f.status)} className="px-2 py-1 bg-blue-600 text-white rounded text-xs sm:text-sm whitespace-nowrap">
                        {f.status && f.status.toLowerCase() !== 'resolved' ? 'Mark resolved' : 'Reopen'}
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t">
                    <label className="block text-xs font-medium mb-2">Assign to staff (name or ID):</label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input 
                        type="text" 
                        placeholder="Staff name or ID" 
                        id={`assign-input-${f.id}`}
                        className="border px-2 py-2 flex-1 text-sm rounded"
                      />
                      <div className="flex gap-2">
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
                          className="px-3 py-2 bg-green-600 text-white rounded text-xs sm:text-sm hover:bg-green-700 disabled:bg-gray-500 flex-1 sm:flex-none"
                        >
                          {assigningId === f.id ? 'Assigning...' : 'Assign'}
                        </button>
                        <button 
                          onClick={() => assignFault(f.id, null)}
                          disabled={assigningId === f.id}
                          className="px-3 py-2 bg-gray-500 text-white rounded text-xs sm:text-sm hover:bg-gray-600 disabled:bg-gray-400 flex-1 sm:flex-none"
                        >
                          Unassign
                        </button>
                      </div>
                    </div>

                    {f.status && f.status.toLowerCase() === 'resolved' && (
                      <div className="mt-4 pt-4 border-t">
                        <h4 className="text-sm font-medium mb-3">Feedback for this resolved fault:</h4>
                        
                        {/* Existing feedbacks */}
                        {feedbacks[f.id] && feedbacks[f.id].length > 0 && (
                          <div className="mb-4 space-y-2 bg-blue-50 p-3 rounded">
                            <div className="text-xs font-semibold text-blue-900">Received Feedback:</div>
                            {feedbacks[f.id].map((fb: any, idx: number) => (
                              <div key={idx} className="text-xs border-l-2 border-blue-300 pl-2">
                                <div className="font-medium">{fb.staff_name} ({fb.staff_email})</div>
                                <div className="text-gray-700 mt-1">{fb.feedback_text}</div>
                                <div className="text-gray-500 text-xs mt-1">{new Date(fb.date_submitted).toLocaleString()}</div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Feedback submission form */}
                        <div className="space-y-2">
                          <input
                            type="text"
                            placeholder="Your name"
                            value={feedbackForm[f.id]?.name || ''}
                            onChange={(e) => setFeedbackForm(prev => ({
                              ...prev,
                              [f.id]: { ...prev[f.id] || { name: '', email: '', text: '' }, name: e.target.value }
                            }))}
                            className="w-full border px-2 py-1 text-xs rounded"
                          />
                          <input
                            type="email"
                            placeholder="Your email"
                            value={feedbackForm[f.id]?.email || ''}
                            onChange={(e) => setFeedbackForm(prev => ({
                              ...prev,
                              [f.id]: { ...prev[f.id] || { name: '', email: '', text: '' }, email: e.target.value }
                            }))}
                            className="w-full border px-2 py-1 text-xs rounded"
                          />
                          <textarea
                            placeholder="Your feedback..."
                            value={feedbackForm[f.id]?.text || ''}
                            onChange={(e) => setFeedbackForm(prev => ({
                              ...prev,
                              [f.id]: { ...prev[f.id] || { name: '', email: '', text: '' }, text: e.target.value }
                            }))}
                            className="w-full border px-2 py-1 text-xs rounded min-h-[60px]"
                          />
                          <button
                            onClick={() => submitFeedback(f.id)}
                            className="w-full px-3 py-2 bg-purple-600 text-white rounded text-xs hover:bg-purple-700"
                          >
                            Submit Feedback
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
    </div>
  );
}
