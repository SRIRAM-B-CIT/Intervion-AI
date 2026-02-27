import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from './store/useStore';

// Page Imports
import LoginPage from './pages/LoginPage';
import DashboardLayout from './components/DashboardLayout';
import StudentDashboard from './pages/StudentDashboard';
import MockMarathon from './pages/MockMarathon';
import ResumeAnalyzer from './pages/ResumeAnalyzer';
import AptitudeTest from './pages/AptitudeTest';
import CodingLab from './pages/CodingLab';
import HRInterview from './pages/HRInterview';
import GroupDiscussion from './pages/GroupDiscussion'; // <-- ADDED IMPORT
import AdminAnalytics from './pages/AdminAnalytics';
import AdminCMS from './pages/AdminCMS';

function ProtectedRoute({ role }: { role?: 'student' | 'admin' }) {
  const { isAuthenticated, user } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (role && user?.role !== role) {
    return <Navigate to={user?.role === 'admin' ? '/admin' : '/dashboard'} replace />;
  }

  // FIXED: DashboardLayout already contains <Outlet /> inside it, so we just return it directly!
  return <DashboardLayout />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        
        {/* Student Routes */}
        <Route element={<ProtectedRoute role="student" />}>
          <Route path="/dashboard" element={<StudentDashboard />} />
          <Route path="/mock-marathon" element={<MockMarathon />} />
          <Route path="/resume" element={<ResumeAnalyzer />} />
          <Route path="/aptitude" element={<AptitudeTest />} />
          <Route path="/coding" element={<CodingLab />} />
          <Route path="/hr" element={<HRInterview />} />
          <Route path="/group-discussion" element={<GroupDiscussion />} /> {/* <-- ADDED ROUTE */}
        </Route>

        {/* Admin Routes */}
        <Route element={<ProtectedRoute role="admin" />}>
          <Route path="/admin" element={<AdminAnalytics />} />
          <Route path="/admin/students" element={<AdminAnalytics />} />
          <Route path="/admin/cms" element={<AdminCMS />} />
        </Route>

        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}