import React, { useState, useEffect } from 'react';
import fallbackLogo from '../assets/gridco-logo.svg';
import { API_BASE_URL } from '../config';

type DashboardSummary = {
  total_staff_online_today: number;
  active_faults: number;
  field_activities_today: number;
  server_room_entries_today?: number;
  active_staff_today?: { id: number; name: string }[];
};

export default function Home(): JSX.Element {
  const [user, setUser] = useState<string | null>(() => localStorage.getItem('gridco_user'));
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(true);
  // use 'access_token' in localStorage for authenticated sessions
  const [, setAuthChecking] = useState(true);
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [signupOpen, setSignupOpen] = useState(false);
  const [signupUsername, setSignupUsername] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirm, setSignupConfirm] = useState('');
  const [signupMessage, setSignupMessage] = useState<string | null>(null);
  
  

  useEffect(() => {
    if (user) localStorage.setItem('gridco_user', user);
    else localStorage.removeItem('gridco_user');
  }, [user]);

  useEffect(() => {
    const load = async () => {
      try {
        const token = localStorage.getItem('access_token');
        const headers: any = { 'Content-Type': 'application/json' };
        if (token) headers.Authorization = `Bearer ${token}`;
        const res = await fetch(`${API_BASE_URL}/dashboard/`, { headers });
        const text = await res.text();
        const json = text ? JSON.parse(text) : null;
        setSummary(json);
      } catch (e) {
        setSummary(null);
      } finally {
        setLoadingSummary(false);
      }
    };
    load();
  }, []);

  function signIn(e: React.FormEvent) {
    e.preventDefault();
    // Real authentication using JWT token endpoint
    if (!email || !password) {
      setAuthMessage('Enter Staff ID and password');
      return;
    }
    
    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/auth/token/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: email, password }),
        });
        if (res.status === 401 || res.status === 403) {
          // explicit unauthorized/forbidden handling
          setAuthMessage('Sign-in failed: invalid Staff ID or password, or access not allowed.');
          return;
        }
        if (!res.ok) {
          const txt = await res.text();
          setAuthMessage('Sign-in failed: ' + (txt || res.statusText));
          return;
        }
        const json = await res.json();
        const access = json.access;
        const refresh = json.refresh;
        localStorage.setItem('access_token', access);
        if (refresh) localStorage.setItem('refresh_token', refresh);

        // fetch current user to verify account is active/authorized
        const userRes = await fetch(`${API_BASE_URL}/auth/user/`, {
          headers: { Authorization: `Bearer ${access}` },
        });
        if (!userRes.ok) {
          if (userRes.status === 401 || userRes.status === 403) {
            setAuthMessage('Your account is not authorized. Contact admin.');
          } else {
            setAuthMessage('Sign-in succeeded but failed to retrieve user info');
          }
          signOut();
          return;
        }
        const userJson = await userRes.json();
        if (!userJson.is_active) {
          setAuthMessage('Your account is not active. Contact admin.');
          signOut();
          return;
        }
        setAuthMessage(null);
        setUser(userJson.username);
        setEmail('');
        setPassword('');
      } catch (err) {
        setAuthMessage('Sign-in error');
      }
    })();
  }

  function signOut() {
    setUser(null);
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('gridco_user');
  }

  // on mount, validate token and set user
  useEffect(() => {
    (async () => {
      const token = localStorage.getItem('access_token');
      if (!token) {
        setAuthChecking(false);
        return;
      }
      try {
        const res = await fetch(`${API_BASE_URL}/auth/user/`, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) {
          signOut();
          setAuthChecking(false);
          return;
        }
        const u = await res.json();
        if (u.is_active) setUser(u.username);
      } catch (e) {
        signOut();
      } finally {
        setAuthChecking(false);
      }
    })();
  }, []);

  return (
    <div className="p-6">
      <div className="bg-white rounded shadow overflow-visible">
        <div className="flex flex-col lg:flex-row lg:items-start gap-0">
          <div className="w-full lg:w-2/3 p-8">
              <div className="flex items-center gap-4">
              <img
                src="/gridco-logo.png"
                alt="GridCo"
                className="h-12 w-auto"
                onError={(e) => {
                  // if the supplied PNG isn't available, fall back to the bundled SVG
                  const img = e.currentTarget as HTMLImageElement;
                  if (img.src.endsWith('/gridco-logo.png')) img.src = (fallbackLogo as unknown as string) || '';
                }}
              />
              <div>
                <h2 className="text-2xl font-bold text-gridco-800">Operations Portal</h2>
                <p className="text-sm text-gray-600">Corporate operations — secure, professional, responsive.</p>
              </div>
            </div>

            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 border rounded">
                <div className="text-sm text-gray-500">Total staff online today</div>
                <div className="text-xl font-semibold">{loadingSummary ? '…' : summary?.total_staff_online_today ?? '—'}</div>
                {summary?.active_staff_today && summary.active_staff_today.length > 0 && (
                  <ul className="text-xs text-gray-600 mt-2">
                    {summary.active_staff_today.slice(0,3).map(s => (
                      <li key={s.id}>{s.name}</li>
                    ))}
                    {summary.active_staff_today.length > 3 && <li>and more…</li>}
                  </ul>
                )}
              </div>
              <div className="p-4 border rounded">
                <div className="text-sm text-gray-500">Active faults</div>
                <div className="text-xl font-semibold">{loadingSummary ? '…' : summary?.active_faults ?? '—'}</div>
              </div>
              <div className="p-4 border rounded">
                <div className="text-sm text-gray-500">Server room entries</div>
                <div className="text-xl font-semibold">{loadingSummary ? '…' : summary?.server_room_entries_today ?? '—'}</div>
              </div>
              <div className="p-4 border rounded">
                <div className="text-sm text-gray-500">Field activities today</div>
                <div className="text-xl font-semibold">{loadingSummary ? '…' : summary?.field_activities_today ?? '—'}</div>
              </div>
            </div>

            <div className="mt-6 text-sm text-gray-500">
              Last updated: {new Date().toLocaleString()}
            </div>
          </div>

          <aside className="w-full lg:w-1/3 bg-gray-50 p-6 lg:order-none order-last">
            {!user ? (
              <div>
                <h3 className="text-lg font-medium">Sign in</h3>
                <form className="mt-4 space-y-3" onSubmit={signIn}>
                  <label className="block">
                    <div className="text-sm text-gray-600">Staff ID</div>
                    <input value={email} onChange={e=>{ setEmail(e.target.value); setAuthMessage(null); }} className="w-full border rounded p-2" type="text" />
                  </label>
                  <label className="block">
                    <div className="text-sm text-gray-600">Password</div>
                    <input value={password} onChange={e=>{ setPassword(e.target.value); setAuthMessage(null); }} className="w-full border rounded p-2" type="password" />
                  </label>
                  <div className="flex items-center justify-between">
                    <button type="submit" className="bg-gridco-700 text-white px-4 py-2 rounded">Sign in</button>
                    <div className="flex items-center gap-3">
                      <a className="text-sm text-gray-500" href="#" onClick={async (ev) => {
                        ev.preventDefault();
                        const supplied = prompt('Enter your email to recover Staff ID');
                        if (!supplied) return;
                        try {
                          const res = await fetch(`${API_BASE_URL}/auth/lookup/`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ email: supplied }),
                          });
                          if (!res.ok) {
                            const txt = await res.text();
                            setAuthMessage('Lookup failed: ' + txt);
                            return;
                          }
                          const j = await res.json();
                          if (j.username) setAuthMessage('Your Staff ID is: ' + j.username);
                          else setAuthMessage('No account found for that email.');
                        } catch (e) {
                          setAuthMessage('Lookup error');
                        }
                      }}>Forgot?</a>
                      <a className="text-sm text-gridco-700" href="#" onClick={(ev) => { ev.preventDefault(); setSignupOpen(v => !v); setSignupMessage(null); }}>
                        Set initial password
                      </a>
                    </div>
                  </div>
                </form>
                {authMessage && (
                  <div className="mt-3 text-sm text-red-600" role="alert">{authMessage}</div>
                )}
                {signupOpen && (
                  <div className="mt-3 p-3 border rounded bg-white">
                    <div className="text-sm font-medium mb-2">Set your password (first time)</div>
                    <label className="block text-sm mb-1">Staff ID</label>
                    <input value={signupUsername} onChange={e=>setSignupUsername(e.target.value)} className="w-full border rounded p-2 mb-2" type="text" />
                    <label className="block text-sm mb-1">Email</label>
                    <input value={signupEmail} onChange=
                    {e=>setSignupEmail(e.target.value)} className="w-full border rounded p-2 mb-2" type="email" />
                    <label className="block text-sm mb-1">Password</label>
                    <input value={signupPassword} onChange={e=>setSignupPassword(e.target.value)} className="w-full border rounded p-2 mb-2" type="password" />
                    <label className="block text-sm mb-1">Confirm password</label>
                    <input value={signupConfirm} onChange={e=>setSignupConfirm(e.target.value)} className="w-full border rounded p-2 mb-3" type="password" />
                    <div className="flex gap-2">
                      <button type="button" onClick={async () => {
                        setSignupMessage(null);
                        const uname = signupUsername.trim();
                        const mail = signupEmail.trim();
                        if (!uname || !mail || !signupPassword) { setSignupMessage('Fill all fields'); return; }
                        if (signupPassword !== signupConfirm) { setSignupMessage('Passwords do not match'); return; }
                        try {
                          const res = await fetch(`${API_BASE_URL}/auth/set-password/`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ username: uname, email: mail.toLowerCase(), password: signupPassword }),
                          });
                          if (res.status === 201) {
                            // Password created — attempt to sign in automatically
                            try {
                              const tokenRes = await fetch(`${API_BASE_URL}/auth/token/`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ username: uname, password: signupPassword }),
                              });
                              if (tokenRes.ok) {
                                const tjson = await tokenRes.json();
                                const access = tjson.access;
                                const refresh = tjson.refresh;
                                localStorage.setItem('access_token', access);
                                if (refresh) localStorage.setItem('refresh_token', refresh);
                                const userRes = await fetch(`${API_BASE_URL}/auth/user/`, { headers: { Authorization: `Bearer ${access}` } });
                                if (userRes.ok) {
                                  const userJson = await userRes.json();
                                  setUser(userJson.username);
                                  setAuthMessage(null);
                                  setSignupMessage('Password set — signed in.');
                                } else {
                                  setSignupMessage('Password set. Please sign in.');
                                }
                              } else {
                                setSignupMessage('Password set. Please sign in.');
                              }
                            } catch (e) {
                              setSignupMessage('Password set. Please sign in.');
                            }
                            setSignupOpen(false);
                            setSignupUsername(''); setSignupEmail(''); setSignupPassword(''); setSignupConfirm('');
                            return;
                          }
                          let txt = '';
                          try { const j = await res.json(); txt = j.error || j.detail || JSON.stringify(j); } catch (_) { txt = await res.text(); }
                          const low = (txt || '').toString().toLowerCase();
                          if (low.includes('user not found')) txt += ' — verify Staff ID (exact) and that admin created your account.';
                          if (low.includes('email mismatch')) txt += ' — ensure the email you entered matches the one on file.';
                          setSignupMessage('Failed: ' + (txt || res.statusText));
                        } catch (e) {
                          setSignupMessage('Network error');
                        }
                      }} className="px-3 py-2 bg-gridco-700 text-white rounded">Set password</button>
                      <button onClick={() => setSignupOpen(false)} className="px-3 py-2 bg-gray-200 rounded">Cancel</button>
                    </div>
                    {signupMessage && <div className="mt-2 text-sm text-blue-600">{signupMessage}</div>}
                  </div>
                )}
                <div className="text-xs text-gray-400 mt-3">Sign in with your Staff ID and password (accounts managed by admin).</div>
              </div>
            ) : (
              <div>
                <h3 className="text-lg font-medium">Signed in as</h3>
                <div className="mt-3 flex items-center justify-between">
                  <div>
                    <div className="font-semibold">{user}</div>
                    <div className="text-sm text-gray-500">Operations staff</div>
                  </div>
                  <div>
                    <button onClick={signOut} className="bg-gray-200 px-3 py-2 rounded">Sign out</button>
                  </div>
                </div>
                <div className="mt-4">
                  <a href="/admin-dashboard" className="text-sm text-gridco-700">Go to Admin Dashboard</a>
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
