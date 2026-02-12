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
  const [loadedFeedbacks, setLoadedFeedbacks] = useState<Set<number>>(new Set());
  const [toggledAuditLog, setToggledAuditLog] = useState<Set<number>>(new Set());
  const [auditLogs, setAuditLogs] = useState<{[key: number]: any[]}>({});
  
  // Bulk operations
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkStatus, setBulkStatus] = useState('');
  const [bulkSeverity, setBulkSeverity] = useState('');
  const [bulkAssignedTo, setBulkAssignedTo] = useState('');
  
  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [filterAssigned, setFilterAssigned] = useState('all');

  // Computed filtered faults
  const filteredFaults = React.useMemo(() => {
    return faults.filter(f => {
      // Search filter
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = !searchTerm || 
        f.title?.toLowerCase().includes(searchLower) ||
        f.description?.toLowerCase().includes(searchLower) ||
        f.location?.toLowerCase().includes(searchLower) ||
        f.reported_by?.toLowerCase().includes(searchLower);
      
      // Status filter
      const matchesStatus = filterStatus === 'all' || f.status?.toLowerCase() === filterStatus.toLowerCase();
      
      // Severity filter
      const matchesSeverity = filterSeverity === 'all' || f.severity?.toLowerCase() === filterSeverity.toLowerCase();
      
      // Assignment filter
      const matchesAssigned = filterAssigned === 'all' || 
        (filterAssigned === 'assigned' && f.assigned_to) ||
        (filterAssigned === 'unassigned' && !f.assigned_to);
      
      return matchesSearch && matchesStatus && matchesSeverity && matchesAssigned;
    });
  }, [faults, searchTerm, filterStatus, filterSeverity, filterAssigned]);

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
          } else {
            // Refresh failed, clear tokens
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
          }
        } catch (e) {
          console.error('Token refresh failed:', e);
        }
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
          return json.access;
        } else {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          setError('Session expired. Please sign in again.');
          return null;
        }
      } catch (e) {
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
      if (f.status && f.status.toLowerCase() === 'resolved' && !loadedFeedbacks.has(f.id)) {
        loadFeedbacks(f.id);
      }
    });
  }, [faults, loadedFeedbacks]);

  const loadFeedbacks = async (faultId: number) => {
    // Mark as loaded immediately to prevent duplicate requests
    setLoadedFeedbacks((prev: Set<number>) => new Set(prev).add(faultId));
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

  const loadAuditLog = async (faultId: number) => {
    try {
      const token = await getValidToken();
      const headers: any = {};
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch(`${API_BASE_URL}/audit-log/?model_name=FaultReport&object_id=${faultId}`, { headers });
      if (!res.ok) return;
      const json = await res.json();
      setAuditLogs(prev => ({ ...prev, [faultId]: json }));
    } catch (e) {
      console.error('Failed to load audit log:', e);
    }
  };

  const deleteAttachment = async (faultId: number) => {
    const token = await getValidToken();
    if (!token) {
      setError('Please sign in to delete attachments');
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/faults/${faultId}/attachment/delete/`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        setError(`Failed to delete attachment: ${errData.error || 'Unknown error'}`);
        return;
      }

      setSuccess('Attachment deleted successfully');
      await loadFaults();
    } catch (e: any) {
      setError(`Error deleting attachment: ${e.message}`);
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
          setError('Session expired. Please sign in again.');
        }
        // revert on error
        setFaults(prev);
      }
    } catch (e) {
      setFaults(prev);
    }
  };

  const bulkDeleteFaults = async () => {
    if (selectedIds.size === 0) {
      setError('Please select at least one fault');
      return;
    }

    if (!window.confirm(`Delete ${selectedIds.size} fault(s)? This cannot be undone.`)) {
      return;
    }

    const token = await getValidToken();
    if (!token) {
      setError('Please sign in');
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/bulk/faults/delete/`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ ids: Array.from(selectedIds) })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        setError(`Bulk delete failed: ${errData.error || 'Unknown error'}`);
        return;
      }

      const result = await res.json();
      setSuccess(`${result.deleted_count} fault(s) deleted`);
      setSelectedIds(new Set());
      await loadFaults();
    } catch (e: any) {
      setError(`Error in bulk delete: ${e.message}`);
    }
  };

  const bulkUpdateFaults = async () => {
    if (selectedIds.size === 0) {
      setError('Please select at least one fault');
      return;
    }

    const updates: any = {};
    if (bulkStatus) updates.status = bulkStatus;
    if (bulkSeverity) updates.severity = bulkSeverity;
    if (bulkAssignedTo) updates.assigned_to = bulkAssignedTo;

    if (Object.keys(updates).length === 0) {
      setError('Please select at least one field to update');
      return;
    }

    const token = await getValidToken();
    if (!token) {
      setError('Please sign in');
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/bulk/faults/update/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ ids: Array.from(selectedIds), updates })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        setError(`Bulk update failed: ${errData.error || 'Unknown error'}`);
        return;
      }

      const result = await res.json();
      setSuccess(`${result.updated_count} fault(s) updated`);
      setSelectedIds(new Set());
      setBulkStatus('');
      setBulkSeverity('');
      setBulkAssignedTo('');
      await loadFaults();
    } catch (e: any) {
      setError(`Error in bulk update: ${e.message}`);
    }
  };

  const bulkExportFaults = async () => {
    if (selectedIds.size === 0) {
      setError('Please select at least one fault to export');
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/bulk/faults/export/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ids: Array.from(selectedIds) })
      });

      if (!res.ok) {
        setError('Export failed');
        return;
      }

      // Download the CSV
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `faults_export_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setSuccess('Export completed');
    } catch (e: any) {
      setError(`Error exporting: ${e.message}`);
    }
  };

  return (
    <div className="p-3 sm:p-6">
      <h1 className="text-xl sm:text-2xl font-semibold mb-3 sm:mb-4 text-gray-900 dark:text-white">Fault / Incident Report</h1>

      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 p-3 sm:p-4 rounded shadow max-w-2xl space-y-3">
        <input name="title" value={form.title} onChange={handleChange} placeholder="Fault title" className="w-full border dark:border-gray-600 px-2 py-2 text-sm sm:text-base rounded bg-white dark:bg-gray-700 dark:text-white dark:placeholder-gray-400" required />
        <textarea name="description" value={form.description} onChange={handleChange} placeholder="Description" className="w-full border dark:border-gray-600 px-2 py-2 text-sm sm:text-base rounded min-h-[80px] bg-white dark:bg-gray-700 dark:text-white dark:placeholder-gray-400" required />
        <div className="flex flex-col sm:flex-row gap-2">
          <input name="date_reported" value={form.date_reported} onChange={handleChange} type="date" className="border dark:border-gray-600 px-2 py-2 text-sm sm:text-base rounded w-full sm:w-auto bg-white dark:bg-gray-700 dark:text-white" required />
          <input name="reported_by" value={form.reported_by} onChange={handleChange} placeholder="Reported by" className="border dark:border-gray-600 px-2 py-2 text-sm sm:text-base rounded flex-1 bg-white dark:bg-gray-700 dark:text-white dark:placeholder-gray-400" required />
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <input name="location" value={form.location} onChange={handleChange} placeholder="Location (substation / office)" className="border dark:border-gray-600 px-2 py-2 text-sm sm:text-base rounded flex-1 bg-white dark:bg-gray-700 dark:text-white dark:placeholder-gray-400" required />
          <select name="severity" value={form.severity} onChange={handleChange} className="border dark:border-gray-600 px-2 py-2 text-sm sm:text-base rounded bg-white dark:bg-gray-700 dark:text-white">
            <option className="bg-white dark:bg-gray-700 text-black dark:text-white" value="low">Low</option>
            <option className="bg-white dark:bg-gray-700 text-black dark:text-white" value="medium">Medium</option>
            <option className="bg-white dark:bg-gray-700 text-black dark:text-white" value="high">High</option>
            <option className="bg-white dark:bg-gray-700 text-black dark:text-white" value="critical">Critical</option>
          </select>
          <select name="status" value={form.status} onChange={handleChange} className="border dark:border-gray-600 px-2 py-2 text-sm sm:text-base rounded bg-white dark:bg-gray-700 dark:text-white">
            <option className="bg-white dark:bg-gray-700 text-black dark:text-white" value="open">Open</option>
            <option className="bg-white dark:bg-gray-700 text-black dark:text-white" value="in progress">In Progress</option>
            <option className="bg-white dark:bg-gray-700 text-black dark:text-white" value="resolved">Resolved</option>
          </select>
        </div>

        <textarea name="resolution_remarks" value={form.resolution_remarks} onChange={handleChange} placeholder="Resolution remarks (optional)" className="w-full border dark:border-gray-600 px-2 py-2 text-sm sm:text-base rounded min-h-[60px] bg-white dark:bg-gray-700 dark:text-white dark:placeholder-gray-400" />

        <div>
          <label className="block mb-1 text-sm sm:text-base dark:text-gray-300">Attach image/file</label>
          <input type="file" onChange={handleFile} className="text-sm dark:text-gray-300" />
        </div>

        {error && <div className="text-red-600 dark:text-red-400 text-sm">{error}</div>}
        {success && <div className="text-green-600 dark:text-green-400 text-sm">{success}</div>}

        <div>
          <button type="submit" className="w-full sm:w-auto bg-blue-600 text-white px-4 py-2 rounded text-sm sm:text-base" disabled={submitting}>{submitting ? 'Submitting…' : 'Submit Report'}</button>
        </div>
      </form>

        <div className="mt-4 sm:mt-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <h2 className="text-lg sm:text-xl font-semibold dark:text-white">Existing Faults</h2>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {selectedIds.size > 0 && <span className="mr-3 font-medium">Selected: {selectedIds.size}</span>}
              Showing {filteredFaults.length} of {faults.length} faults
            </div>
          </div>

          {/* Bulk Operations Panel */}
          {selectedIds.size > 0 && (
            <div className="bg-yellow-50 dark:bg-yellow-900/30 p-4 rounded mb-4 border-l-4 border-yellow-400">
              <h3 className="text-sm font-semibold mb-3 dark:text-yellow-200">Bulk Operations ({selectedIds.size} selected)</h3>
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <select value={bulkStatus} onChange={(e) => setBulkStatus(e.target.value)} className="border dark:border-gray-600 px-2 py-2 text-sm rounded bg-white dark:bg-gray-700 dark:text-white">
                    <option value="">Set Status...</option>
                    <option value="open">Open</option>
                    <option value="in progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                  </select>
                  <select value={bulkSeverity} onChange={(e) => setBulkSeverity(e.target.value)} className="border dark:border-gray-600 px-2 py-2 text-sm rounded bg-white dark:bg-gray-700 dark:text-white">
                    <option value="">Set Severity...</option>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                  <input type="text" value={bulkAssignedTo} onChange={(e) => setBulkAssignedTo(e.target.value)} placeholder="Assign to (name/ID)" className="border dark:border-gray-600 px-2 py-2 text-sm rounded bg-white dark:bg-gray-700 dark:text-white dark:placeholder-gray-400" />
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <button onClick={bulkUpdateFaults} disabled={bulkStatus === '' && bulkSeverity === '' && bulkAssignedTo === ''} className="px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded text-sm">Update Selected</button>
                  <button onClick={bulkExportFaults} className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded text-sm">Export Selected</button>
                  <button onClick={bulkDeleteFaults} className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm">Delete Selected</button>
                  <button onClick={() => setSelectedIds(new Set())} className="px-3 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded text-sm">Clear Selection</button>
                </div>
              </div>
            </div>
          )}

          {/* Search and Filter Controls */}
          <div className="bg-white dark:bg-gray-800 p-4 rounded shadow mb-4 space-y-3">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium mb-2 dark:text-gray-300">Search</label>
              <input
                type="text"
                placeholder="Search by title, description, location, or reporter..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full border dark:border-gray-600 px-3 py-2 text-sm rounded bg-white dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
              />
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium mb-2 dark:text-gray-300">Status</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full border dark:border-gray-600 px-3 py-2 text-sm rounded bg-white dark:bg-gray-700 dark:text-white"
                >
                  <option className="bg-white dark:bg-gray-700 text-black dark:text-white" value="all">All Status</option>
                  <option className="bg-white dark:bg-gray-700 text-black dark:text-white" value="open">Open</option>
                  <option className="bg-white dark:bg-gray-700 text-black dark:text-white" value="in progress">In Progress</option>
                  <option className="bg-white dark:bg-gray-700 text-black dark:text-white" value="resolved">Resolved</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 dark:text-gray-300">Severity</label>
                <select
                  value={filterSeverity}
                  onChange={(e) => setFilterSeverity(e.target.value)}
                  className="w-full border dark:border-gray-600 px-3 py-2 text-sm rounded bg-white dark:bg-gray-700 dark:text-white"
                >
                  <option className="bg-white dark:bg-gray-700 text-black dark:text-white" value="all">All Severity</option>
                  <option className="bg-white dark:bg-gray-700 text-black dark:text-white" value="low">Low</option>
                  <option className="bg-white dark:bg-gray-700 text-black dark:text-white" value="medium">Medium</option>
                  <option className="bg-white dark:bg-gray-700 text-black dark:text-white" value="high">High</option>
                  <option className="bg-white dark:bg-gray-700 text-black dark:text-white" value="critical">Critical</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 dark:text-gray-300">Assignment</label>
                <select
                  value={filterAssigned}
                  onChange={(e) => setFilterAssigned(e.target.value)}
                  className="w-full border dark:border-gray-600 px-3 py-2 text-sm rounded bg-white dark:bg-gray-700 dark:text-white"
                >
                  <option className="bg-white dark:bg-gray-700 text-black dark:text-white" value="all">All Faults</option>
                  <option className="bg-white dark:bg-gray-700 text-black dark:text-white" value="assigned">Assigned</option>
                  <option className="bg-white dark:bg-gray-700 text-black dark:text-white" value="unassigned">Unassigned</option>
                </select>
              </div>
            </div>

            {/* Clear Filters Button */}
            {(searchTerm || filterStatus !== 'all' || filterSeverity !== 'all' || filterAssigned !== 'all') && (
              <div className="flex justify-end">
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setFilterStatus('all');
                    setFilterSeverity('all');
                    setFilterAssigned('all');
                  }}
                  className="px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-sm hover:bg-gray-300 dark:hover:bg-gray-600"
                >
                  Clear Filters
                </button>
              </div>
            )}
          </div>

          {loadingFaults ? <div className="text-sm dark:text-gray-400">Loading faults…</div> : (
            <ul className="space-y-3">
              {filteredFaults.length === 0 && (
                <li className="text-sm text-gray-500 dark:text-gray-400">
                  {faults.length === 0 ? 'No fault reports' : 'No faults match your search criteria'}
                </li>
              )}
              {filteredFaults.map(f => (
                <li key={f.id} className="p-3 border dark:border-gray-700 rounded bg-white dark:bg-gray-800 shadow-sm">
                  <div className="flex gap-2 mb-2">
                    <input 
                      type="checkbox"
                      checked={selectedIds.has(f.id)}
                      onChange={(e) => {
                        const newIds = new Set(selectedIds);
                        if (e.target.checked) newIds.add(f.id);
                        else newIds.delete(f.id);
                        setSelectedIds(newIds);
                      }}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                        <div className="flex-1">
                          <div className="font-medium text-sm sm:text-base dark:text-white">{f.title}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{f.location} — reported by {f.reported_by || '—'}</div>
                          <div className="text-xs sm:text-sm mt-2 dark:text-gray-300">{f.description}</div>
                          <div className="text-xs text-gray-700 dark:text-gray-300 mt-2">
                            <span className="font-medium dark:text-gray-200">Assigned to:</span> {
                              f.assigned_to ? (
                                typeof f.assigned_to === 'object' 
                                  ? `${f.assigned_to.first_name || f.assigned_to.username || f.assigned_to.name || 'Staff ' + f.assigned_to.id}`
                                  : f.assigned_to
                              ) : (
                                <span className="text-gray-500 dark:text-gray-400 italic">Unassigned</span>
                              )
                            }
                          </div>
                          {f.attachment_url && (
                            <div className="text-xs text-gray-700 dark:text-gray-300 mt-2">
                              <span className="font-medium dark:text-gray-200">Attachment:</span> {' '}
                              <a href={f.attachment_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">
                                View / Download
                              </a>
                              {' '}
                              <button 
                                onClick={() => deleteAttachment(f.id)}
                                className="ml-2 text-red-600 dark:text-red-400 hover:underline text-xs"
                              >
                                [Delete]
                              </button>
                            </div>
                          )}
                        </div>
                        <div className="flex sm:flex-col items-center sm:items-end gap-2 sm:gap-0">
                          <div className="text-xs sm:text-sm flex-1 sm:flex-none sm:mb-2 dark:text-gray-300">Status: {f.status}</div>
                          <button onClick={() => toggleFaultStatus(f.id, f.status)} className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs sm:text-sm whitespace-nowrap">
                            {f.status && f.status.toLowerCase() !== 'resolved' ? 'Mark resolved' : 'Reopen'}
                          </button>
                        </div>
                      </div>
                      <div className="mt-3 pt-3 border-t dark:border-gray-700">
                        <label className="block text-xs font-medium mb-2 dark:text-gray-300">Assign to staff (name or ID):</label>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <input 
                            type="text" 
                            placeholder="Staff name or ID" 
                            id={`assign-input-${f.id}`}
                            className="border dark:border-gray-600 px-2 py-2 flex-1 text-sm rounded bg-white dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
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

                        {/* Audit Log */}
                        <div className="mt-3">
                          <button
                            onClick={() => {
                              const newToggled = new Set(toggledAuditLog);
                              if (newToggled.has(f.id)) {
                                newToggled.delete(f.id);
                              } else {
                                newToggled.add(f.id);
                                loadAuditLog(f.id);
                              }
                              setToggledAuditLog(newToggled);
                            }}
                            className="text-xs text-gray-600 dark:text-gray-400 hover:underline"
                          >
                            {toggledAuditLog.has(f.id) ? '▼ Hide' : '▶ Show'} Change History
                          </button>
                          {toggledAuditLog.has(f.id) && auditLogs[f.id] && (
                            <div className="mt-2 bg-gray-100 dark:bg-gray-700 p-2 rounded text-xs max-h-[150px] overflow-y-auto">
                              {auditLogs[f.id].length === 0 ? (
                                <p className="text-gray-600 dark:text-gray-400">No changes recorded</p>
                              ) : (
                                <ul className="space-y-1">
                                  {auditLogs[f.id].map((log: any, idx: number) => (
                                    <li key={idx} className="border-b dark:border-gray-600 pb-1">
                                      <div className="font-semibold text-gray-800 dark:text-gray-200">{log.action} by {log.user}</div>
                                      <div className="text-gray-600 dark:text-gray-400">{new Date(log.timestamp).toLocaleString()}</div>
                                      {Object.keys(log.changes || {}).length > 0 && (
                                        <div className="mt-1 text-gray-700 dark:text-gray-300">
                                          {Object.entries(log.changes).map(([key, change]: any) => (
                                            <div key={key}>{key}: {change.old} → {change.new}</div>
                                          ))}
                                        </div>
                                      )}
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          )}
                        </div>

                        {f.status && f.status.toLowerCase() === 'resolved' && (
                          <div className="mt-4 pt-4 border-t dark:border-gray-700">
                            <h4 className="text-sm font-medium mb-3 dark:text-white">Feedback for this resolved fault:</h4>
                            
                            {/* Existing feedbacks */}
                            {feedbacks[f.id] && feedbacks[f.id].length > 0 && (
                              <div className="mb-4 space-y-2 bg-blue-50 dark:bg-blue-900/30 p-3 rounded">
                                <div className="text-xs font-semibold text-blue-900 dark:text-blue-300">Received Feedback:</div>
                                {feedbacks[f.id].map((fb: any, idx: number) => (
                                  <div key={idx} className="text-xs border-l-2 border-blue-300 dark:border-blue-600 pl-2">
                                    <div className="font-medium dark:text-white">{fb.staff_name} ({fb.staff_email})</div>
                                    <div className="text-gray-700 dark:text-gray-300 mt-1">{fb.feedback_text}</div>
                                    <div className="text-gray-500 dark:text-gray-400 text-xs mt-1">{new Date(fb.date_submitted).toLocaleString()}</div>
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
                                className="w-full border dark:border-gray-600 px-2 py-1 text-xs rounded bg-white dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                              />
                              <input
                                type="email"
                                placeholder="Your email"
                                value={feedbackForm[f.id]?.email || ''}
                                onChange={(e) => setFeedbackForm(prev => ({
                                  ...prev,
                                  [f.id]: { ...prev[f.id] || { name: '', email: '', text: '' }, email: e.target.value }
                                }))}
                                className="w-full border dark:border-gray-600 px-2 py-1 text-xs rounded bg-white dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                              />
                              <textarea
                                placeholder="Your feedback..."
                                value={feedbackForm[f.id]?.text || ''}
                                onChange={(e) => setFeedbackForm(prev => ({
                                  ...prev,
                                  [f.id]: { ...prev[f.id] || { name: '', email: '', text: '' }, text: e.target.value }
                                }))}
                                className="w-full border dark:border-gray-600 px-2 py-1 text-xs rounded min-h-[60px] bg-white dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                              />
                              <button
                                onClick={() => submitFeedback(f.id)}
                                className="w-full px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded text-xs"
                              >
                                Submit Feedback
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
</div> ); }