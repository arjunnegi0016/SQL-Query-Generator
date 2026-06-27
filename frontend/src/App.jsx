import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import AuthLayout from './layouts/AuthLayout';
import DashboardPage from './pages/DashboardPage';
import SqlGeneratorPage from './pages/SqlGeneratorPage';
import SqlTerminalPage from './pages/SqlTerminalPage';
import QueryHistoryPage from './pages/QueryHistoryPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import SettingsPage from './pages/SettingsPage';
import SavedQueriesPage from './pages/SavedQueriesPage';
import ProtectedRoute from './components/ProtectedRoute';
import { Toaster } from 'react-hot-toast';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Auth Routes */}
        <Route path="/auth" element={<AuthLayout />}>
          <Route path="login" element={<LoginPage />} />
          <Route path="signup" element={<SignupPage />} />
          <Route path="forgot-password" element={<ForgotPasswordPage />} />
        </Route>

        {/* Main App Routes */}
        <Route path="/" element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="generator" element={<SqlGeneratorPage />} />
          <Route path="terminal" element={<SqlTerminalPage />} />
          <Route path="history" element={<QueryHistoryPage />} />
          <Route path="schemas" element={<div>Schemas (TODO)</div>} />
          <Route path="analytics" element={<div>Analytics (TODO)</div>} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="saved-queries" element={<SavedQueriesPage />} />
        </Route>
      </Routes>
      <Toaster position="top-right" />
    </BrowserRouter>
  );
}

export default App;
