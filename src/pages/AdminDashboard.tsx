import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

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
  const [fixing, setFixing] = useState<number | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const token = localStorage.getItem('access_token');
        const headers: any = {};
        if (token) headers.Authorization = `Bearer ${token}`;
        const res = await fetch('/api/dashboard/', { headers });
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
  }, []);

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
        const r = await fetch('/api/dashboard/');
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
      const res = await fetch(`/api/faults/${faultId}/`, {
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
        const r = await fetch('/api/dashboard/', { headers });
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
          <div className="text-sm text-gray-600">Active faults</div>
          <div className="mt-2">
            <div className="text-2xl font-bold">{(active_faults_list?.length ?? data.active_faults)}</div>
            <ul className="mt-3 max-h-48 overflow-auto">
              {active_faults_list && active_faults_list.length > 0 ? (
                active_faults_list.map((f) => (
                  <li key={f.id} className="py-2 flex justify-between items-start border-b last:border-b-0">
                    <div>
                      <div className="font-medium">{f.title}</div>
                      <div className="text-xs text-gray-500">{f.substation || '—'}</div>
                    </div>
                    <div className="text-sm flex items-center gap-2">
                      {f.is_fixed ? (
                        <span className="text-green-600">Fixed</span>
                      ) : (
                        <>
                          <span className="text-red-600">Unfixed</span>
                          <button
                            onClick={() => handleMarkFixed(f.id)}
                            disabled={fixing === f.id}
                            className="ml-2 px-2 py-1 bg-blue-600 text-white text-xs rounded"
                          >
                            {fixing === f.id ? 'Fixing…' : 'Mark fixed'}
                          </button>
                        </>
                      )}
                    </div>
                  </li>
                ))
              ) : (
                <li className="text-sm text-gray-500">No active faults details available.</li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
