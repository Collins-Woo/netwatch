import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { MainLayout } from './components/Layout';
import Dashboard from './pages/Dashboard';
import TasksPage from './pages/TasksPage';
import NodesPage from './pages/NodesPage';
import AlertsPage from './pages/AlertsPage';
import StatusPage from './pages/StatusPage';
import HistoryPage from './pages/HistoryPage';
import UserPage from './pages/UserPage';

function App() {
  return (
    <BrowserRouter>
      <MainLayout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/tasks" element={<TasksPage />} />
          <Route path="/nodes" element={<NodesPage />} />
          <Route path="/alerts" element={<AlertsPage />} />
          <Route path="/status" element={<StatusPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/users" element={<UserPage />} />
        </Routes>
      </MainLayout>
    </BrowserRouter>
  );
}

export default App;
