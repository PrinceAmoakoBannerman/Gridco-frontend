import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import ServerRoomRecord from './pages/ServerRoomRecord';
import FaultReport from './pages/FaultReport';
import ActivityReports from './pages/ActivityReports';
import FieldActivityLog from './pages/FieldActivityLog';
import AdminDashboard from './pages/AdminDashboard';
import Home from './pages/Home';
import DailyRecords from './pages/DailyRecords';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-100 flex">
        <Sidebar />
        <div className="flex-1 pt-14 md:pt-0">
          <header className="bg-white shadow relative z-10">
            <div className="max-w-7xl mx-auto py-4 px-6">
              {/* Header intentionally left minimal to avoid overlapping text */}
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
