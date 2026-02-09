import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { API_BASE_URL } from '../config';

type DashboardData = {
  total_staff_online_today: number;
  active_faults: number;
  server_room_entries_today: number;
  field_activities_today: number;
  faults_trend: number[];
  attendance_trend: number[];
  field_activities_trend?: number[];
  most_visited_substations: { name: string; count: number }[];
  dates: string[];
  active_staff_today?: { id: number; name: string; role?: string }[];
  active_faults_list?: { id: number; title: string; substation?: string; is_fixed?: boolean }[];
};

export default function AdminDashboard(): JSX.Element {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [fixing, setFixing] = useState<number | null>(null);
  const [assigningId, setAssigningId] = useState<number | null>(null);
  const [faults, setFaults] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const token = localStorage.getItem('access_token');
        const headers: any = {};
        if (token) headers.Authorization = `Bearer ${token}`;
        const res = await fetch(`${API_BASE_URL}/dashboard/`, { headers });
        const text = await res.text();

        if (!res.ok) {
          throw new Error(`${res.status} ${res.statusText} - ${text.slice(0, 500)}`);
        }

        let json = null;
        try {
          json = text ? JSON.parse(text) : null;
        } catch (e) {
          throw new Error(`Invalid JSON from dashboard API - response: ${text.slice(0, 500)}`);
        }

        setData(json);
      } catch (err) {
        console.error(err);
        setData(null);
        setError(err instanceof Error ? err.message : String(err));
      }
    };
    load();
    loadFaults();
  }, []);

  const loadFaults = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const headers: any = {};
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch(`${API_BASE_URL}/fault-reports/`, { headers });
      if (!res.ok) return;
      const json = await res.json();
      setFaults(json);
    } catch (e) {
      console.error('Failed to load faults:', e);
    }
  };

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

  if (!data) {
    return (
      <div className="p-6">
        {error ? (
          <div className="text-red-600">Error: {error}</div>
        ) : (
          <div>Loading dashboard...</div>
        )}
      </div>
    );
  }

  const dates = data.dates || [];
  const faults_trend = data.faults_trend || [];
  const attendance_trend = data.attendance_trend || [];
  const field_activities_trend = data.field_activities_trend || [];
  const most_visited_substations = data.most_visited_substations || [];
  const active_staff_today = data.active_staff_today || [];
  const active_faults_list = data.active_faults_list || [];

  const handleMarkFixed = async (faultId: number) => {
    if (!data) return;
    setFixing(faultId);

    // Optimistic update: remove from active_faults_list and decrement count
    setData((prev) => {
      if (!prev) return prev;
      const newList = (prev.active_faults_list || []).filter((f) => f.id !== faultId);
      return { ...prev, active_faults_list: newList, active_faults: Math.max(0, prev.active_faults - 1) };
    });

    try {
      const tokenCheck = localStorage.getItem('access_token');
      if (!tokenCheck) {
        // no token: revert optimistic update and inform user
        setError('Not signed in — please sign in to mark faults resolved.');
        // reload latest dashboard to revert optimistic update
        const r = await fetch(`${API_BASE_URL}/dashboard/`);
        const txt = await r.text();
        const json = txt ? JSON.parse(txt) : null;
        setData(json);
        setFixing(null);
        return;
      }
      // Try PATCH first
      const token = localStorage.getItem('access_token');
      const headers: any = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch(`${API_BASE_URL}/faults/${faultId}/`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ status: 'resolved' }),
      });
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          // token invalid or expired
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          setError('Authentication required — please sign in again.');
        } else {
          setError(`Failed to mark fault resolved (${res.status})`);
        }
        throw new Error(`Failed to mark fault resolved (${res.status})`);
      }
    } catch (err) {
      // On error, reload dashboard to revert optimistic change
      try {
        const token = localStorage.getItem('access_token');
        const headers: any = {};
        if (token) headers.Authorization = `Bearer ${token}`;
        const r = await fetch(`${API_BASE_URL}/dashboard/`, { headers });
        const txt = await r.text();
        const json = txt ? JSON.parse(txt) : null;
        setData(json);
        setError(err instanceof Error ? err.message : String(err));
      } catch (e) {
        setError('Failed to update dashboard after marking fault fixed.');
      }
    } finally {
      setFixing(null);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
      {error && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 text-red-700 rounded">{error}</div>
      )}
      {success && (
        <div className="mt-3 p-3 bg-green-50 border border-green-200 text-green-700 rounded">{success}</div>
      )}

      <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded shadow">
          <div className="text-sm text-gray-500">Staff online today</div>
          <div className="text-2xl font-bold">{data.total_staff_online_today}</div>
          {active_staff_today && active_staff_today.length > 0 && (
            <ul className="text-xs text-gray-600 mt-2">
              {active_staff_today.slice(0,3).map(s => (
                <li key={s.id}>{s.name}{s.role ? ` — ${s.role}` : ''}</li>
              ))}
              {active_staff_today.length > 3 && <li>and more…</li>}
            </ul>
          )}
        </div>
        <div className="bg-white p-4 rounded shadow"> <div className="text-sm text-gray-500">Active faults</div><div className="text-2xl font-bold">{data.active_faults}</div></div>
        <div className="bg-white p-4 rounded shadow"> <div className="text-sm text-gray-500">Server room entries</div><div className="text-2xl font-bold">{data.server_room_entries_today}</div></div>
        <div className="bg-white p-4 rounded shadow"> <div className="text-sm text-gray-500">Field activities</div><div className="text-2xl font-bold">{data.field_activities_today}</div></div>
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-4 rounded shadow">
          <div className="text-sm text-gray-600">Fault trends (7 days)</div>
          <div className="w-full h-48 mt-2">
            <ResponsiveContainer>
              <LineChart data={dates.map((d, i) => ({ date: d, faults: faults_trend[i] ?? 0 }))}>
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="faults" stroke="#1e40af" strokeWidth={2} dot={{ r: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-4 rounded shadow">
          <div className="text-sm text-gray-600">Attendance trends (7 days)</div>
          <div className="w-full h-48 mt-2">
            <ResponsiveContainer>
              <BarChart data={dates.map((d, i) => ({ date: d, attendance: attendance_trend[i] ?? 0 }))}>
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="attendance" fill="#0b2545" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Field activities trend and lists for active staff / faults */}
      <div className="mt-6 bg-white p-4 rounded shadow">
        <div className="text-sm text-gray-600">Most visited substations</div>
        <ul className="mt-2">
          {most_visited_substations.length === 0 && <li className="text-sm text-gray-500">No data</li>}
          {most_visited_substations.map((s, idx) => (
            <li key={idx} className="flex justify-between py-2 border-b last:border-b-0">
              <span>{s.name}</span>
              <span className="text-sm text-gray-600">{s.count}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Field activities trend - wide */}
      <div className="mt-6 bg-white p-4 rounded shadow">
        <div className="text-sm text-gray-600">Field activities (7 days)</div>
        <div className="w-full h-48 mt-2">
          <ResponsiveContainer>
            <LineChart data={dates.map((d, i) => ({ date: d, activities: field_activities_trend[i] ?? 0 }))}>
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="activities" stroke="#047857" strokeWidth={2} dot={{ r: 2 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-4 rounded shadow">
          <div className="text-sm text-gray-600">Active staff today</div>
          <div className="mt-2">
            <div className="text-2xl font-bold">{active_staff_today?.length ?? data.total_staff_online_today}</div>
            <ul className="mt-3 max-h-48 overflow-auto">
              {active_staff_today && active_staff_today.length > 0 ? (
                active_staff_today.map((s) => (
                  <li key={s.id} className="py-1 flex justify-between items-center border-b last:border-b-0">
                    <span>{s.name}</span>
                    <span className="text-xs text-gray-500">{s.role || 'Staff'}</span>
                  </li>
                ))
              ) : (
                <li className="text-sm text-gray-500">No active staff list available.</li>
              )}
            </ul>
          </div>
        </div>

        <div className="bg-white p-4 rounded shadow">
          <div className="text-sm text-gray-600">All Faults</div>
          <div className="mt-2">
            <ul className="mt-3 max-h-96 overflow-auto space-y-2">
              {faults.length === 0 ? (
                <li className="text-sm text-gray-500">No faults</li>
              ) : (
                faults.map((f) => (
                  <li key={f.id} className="py-2 px-2 border rounded bg-gray-50">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="font-medium text-sm">{f.title}</div>
                        <div className="text-xs text-gray-600">{f.location} • Status: {f.status}</div>
                        <div className="text-xs text-gray-700 mt-1">
                          Assigned to: <span className="font-medium">{f.assigned_to || <span className="text-gray-500 italic">Unassigned</span>}</span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 flex gap-2 items-center">
                      <input 
                        type="text" 
                        placeholder="Staff name or ID" 
                        id={`assign-${f.id}`}
                        className="border px-2 py-1 text-xs flex-1"
                      />
                      <button 
                        onClick={() => {
                          const input = document.getElementById(`assign-${f.id}`) as HTMLInputElement;
                          const inputVal = input.value.trim();
                          if (!inputVal) {
                            setError('Please enter a staff name or ID');
                            return;
                          }
                          assignFault(f.id, inputVal);
                          input.value = '';
                        }}
                        disabled={assigningId === f.id}
                        className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 disabled:bg-gray-400"
                      >
                        {assigningId === f.id ? 'Assigning...' : 'Assign'}
                      </button>
                      <button 
                        onClick={() => assignFault(f.id, null)}
                        disabled={assigningId === f.id}
                        className="px-2 py-1 bg-gray-400 text-white text-xs rounded hover:bg-gray-500 disabled:bg-gray-300"
                      >
                        Clear
                      </button>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
