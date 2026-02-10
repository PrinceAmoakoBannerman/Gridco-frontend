import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import fallbackLogo from '../assets/gridco-logo.svg';

function NavItem({ to, label, onClick }: { to: string; label: string; onClick?: () => void }) {
  const loc = useLocation();
  const active = loc.pathname === to;
  return (
    <Link
      to={to}
      onClick={onClick}
      className={`block px-3 py-2 rounded text-sm ${active ? 'bg-gridco-700 text-white' : 'text-gray-200 hover:bg-gridco-700/80'}`}
    >
      {label}
    </Link>
  );
}

export default function Sidebar({ darkMode, toggleDarkMode }: { darkMode: boolean; toggleDarkMode: () => void }): JSX.Element {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev || '';
    };
  }, [open]);

  return (
    <>      {/* Mobile top bar */}
      <div className="md:hidden bg-white dark:bg-gray-800 border-b dark:border-gray-700 fixed top-0 left-0 right-0 z-30">
        <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
            <img
              src="/gridco-logo.png"
              alt="GridCo"
              className="h-8 w-auto"
              onError={(e) => {
                const img = e.currentTarget as HTMLImageElement;
                if (img.src.endsWith('/gridco-logo.png')) img.src = (fallbackLogo as unknown as string) || '';
              }}
            />
          </div>
          <button onClick={() => setOpen(v => !v)} aria-label="Toggle menu" className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" className="text-gridco-800 dark:text-gray-200" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
        {open && (
          <nav className="fixed inset-x-0 top-14 bottom-0 bg-gridco-800 dark:bg-gray-900 text-white shadow-lg z-40 overflow-auto">
            <div className="flex items-center justify-end p-3">
              <button onClick={() => setOpen(false)} aria-label="Close menu" className="p-2 rounded hover:bg-gridco-700/80">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M6 6l12 12M6 18L18 6" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
            <div className="px-2 pb-6">
              <NavItem to="/" label="Home" onClick={() => setOpen(false)} />
              <NavItem to="/admin-dashboard" label="Dashboard" onClick={() => setOpen(false)} />
              <NavItem to="/server-room" label="Server Room" onClick={() => setOpen(false)} />
              <NavItem to="/activity-reports" label="Activity Reports" onClick={() => setOpen(false)} />
              <NavItem to="/field-activity" label="Field Activity Log" onClick={() => setOpen(false)} />
              <NavItem to="/fault-reports" label="Fault Reports" onClick={() => setOpen(false)} />
              <NavItem to="/daily-records" label="Daily Records" onClick={() => setOpen(false)} />
            </div>
          </nav>
        )}
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden md:block w-64 bg-gridco-800 dark:bg-gray-900 text-white min-h-screen p-6">
        <div className="mb-6 flex items-center gap-3">
           <img
             src="/gridco-logo.png"
             alt="GridCo"
             className="h-10 w-auto"
             onError={(e) => {
               const img = e.currentTarget as HTMLImageElement;
               if (img.src.endsWith('/gridco-logo.png')) img.src = (fallbackLogo as unknown as string) || '';
             }}
           />
        </div>

        <nav className="space-y-2 mt-4">
          <NavItem to="/" label="Home" />
          <NavItem to="/admin-dashboard" label="Dashboard" />
          <NavItem to="/server-room" label="Server Room" />
          <NavItem to="/activity-reports" label="Activity Reports" />
          <NavItem to="/field-activity" label="Field Activity Log" />
          <NavItem to="/fault-reports" label="Fault Reports" />
          <NavItem to="/daily-records" label="Daily Records" />
        </nav>

        <div className="mt-auto pt-6">
          <div className="text-xs text-gray-200">Logged in as</div>
          <div className="text-sm font-medium mt-1">Operations User</div>
        </div>
      </aside>
    </>
  );
}
