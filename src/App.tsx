import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import ServerRoomRecord from './pages/ServerRoomRecord';
import FaultReport from './pages/FaultReport';
import ActivityReports from './pages/ActivityReports';
import FieldActivityLog from './pages/FieldActivityLog';
import AdminDashboard from './pages/AdminDashboard';
import Home from './pages/Home';
import DailyRecords from './pages/DailyRecords';

function App() {
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });

  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex">
        <Sidebar darkMode={darkMode} toggleDarkMode={() => setDarkMode(!darkMode)} />
        <div className="flex-1 pt-14 md:pt-0">
          <header className="bg-white dark:bg-gray-800 shadow relative z-10">
            <div className="max-w-7xl mx-auto py-4 px-6 flex justify-end">
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="px-3 py-1 rounded bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-sm hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                {darkMode ? '☀️ Light' : '🌙 Dark'}
              </button>
            </div>
          </header>

          <main className="max-w-7xl mx-auto p-6">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/server-room" element={<ServerRoomRecord />} />
              <Route path="/activity-reports" element={<ActivityReports />} />
              <Route path="/field-activity" element={<FieldActivityLog />} />
              <Route path="/fault-reports" element={<FaultReport />} />
              <Route path="/daily-records" element={<DailyRecords />} />
              <Route path="/admin-dashboard" element={<AdminDashboard />} />
            </Routes>
          </main>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;
