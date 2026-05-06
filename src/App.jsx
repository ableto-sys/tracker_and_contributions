import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import LogHours from './pages/LogHours';
import ExecutiveDashboard from './pages/ExecutiveDashboard';

function ProtectedRoute({ children, executiveOnly = false }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-screen">Loading workspace...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (executiveOnly && user.role !== 'executive') return <Navigate to="/dashboard" replace />;
  return children;
}

function AppShell() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="loading-screen">Loading workspace...</div>;
  }

  return (
    <div className="app-shell">
      {user && <Navbar />}
      <Routes>
        <Route path="/login" element={user
          ? <Navigate to={user.role === 'executive' ? '/executive' : '/dashboard'} replace />
          : <Login />}
        />
        <Route path="/dashboard" element={
          <ProtectedRoute><Dashboard /></ProtectedRoute>
        } />
        <Route path="/log" element={
          <ProtectedRoute><LogHours /></ProtectedRoute>
        } />
        <Route path="/executive" element={
          <ProtectedRoute executiveOnly><ExecutiveDashboard /></ProtectedRoute>
        } />
        <Route path="*" element={
          user
            ? <Navigate to={user.role === 'executive' ? '/executive' : '/dashboard'} replace />
            : <Navigate to="/login" replace />
        } />
      </Routes>
    </div>
  );
}

export default function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <DataProvider>
          <AppShell />
        </DataProvider>
      </AuthProvider>
    </HashRouter>
  );
}
