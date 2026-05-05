import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import CreateComplaint from './pages/CreateComplaint';
import AdminPanel from './pages/AdminPanel';
import UserManagement from './pages/UserManagement';
import RoleManagement from './pages/RoleManagement';
import ProfileSettings from './pages/ProfileSettings';
import Landing from './pages/Landing';
import OrganizationsPage from './pages/OrganizationsPage';
import Navbar from './components/Navbar';
import NotificationToast from './components/NotificationToast';
import { hasAnyPermission } from './utils/permissions';

const ProtectedRoute = ({ children, roles, permissions }) => {
  const { user, loading } = useAuth();
  
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );
  if (!user) return <Navigate to="/login" />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" />;
  if (permissions && !hasAnyPermission(user, permissions)) return <Navigate to="/dashboard" />;
  
  return children;
};

const AppContent = () => {
  const { user } = useAuth();
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (user?.id && token) {
      const wsBase = (import.meta.env.VITE_WS_URL || 'ws://localhost:8000').replace(/\/$/, '');
      const ws = new WebSocket(`${wsBase}/ws/${user.id}?token=${encodeURIComponent(token)}`);
      ws.onmessage = (event) => {
        const [type, id, title, sender] = event.data.split('|');
        if (type === 'NEW_CASE' && (user.role === 'admin' || user.role === 'staff')) {
          setNotification(`New Case Reported: "${title}" by ${sender}`);
        } else if (type === 'STATUS_UPDATE') {
          setNotification(`Your complaint status was updated!`);
        } else if (type === 'ASSIGNMENT_UPDATE') {
          setNotification(`A complaint was assigned to you: "${title}"`);
        }
      };
      return () => ws.close();
    }
  }, [user]);

  return (
    <div className="min-h-screen bg-[#f5f7fb]">
      <Navbar />
      <main className="min-h-screen px-4 pb-12 pt-24 sm:px-6 lg:ml-64 lg:px-8">
      <div className="mx-auto w-full max-w-7xl">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/complaints/new" 
            element={
              <ProtectedRoute>
                <CreateComplaint />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin" 
            element={
              <ProtectedRoute permissions={['complaints:update', 'complaints:assign', 'users:manage', 'roles:manage']}>
                <AdminPanel />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/users" 
            element={
              <ProtectedRoute permissions={['users:manage']}>
                <UserManagement />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/roles" 
            element={
              <ProtectedRoute permissions={['roles:manage']}>
                <RoleManagement />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/platform/organizations" 
            element={
              <ProtectedRoute permissions={['organizations:manage']}>
                <OrganizationsPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/settings" 
            element={
              <ProtectedRoute>
                <ProfileSettings />
              </ProtectedRoute>
            } 
          />
        </Routes>
      </div>
      </main>
      {notification && (
        <NotificationToast 
          message={notification} 
          onClose={() => setNotification(null)} 
        />
      )}
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
