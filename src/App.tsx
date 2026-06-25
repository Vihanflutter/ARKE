import { useState, useEffect } from 'react';
import LoginView from './components/LoginView';
import AdminDashboard from './components/AdminDashboard';
import ManagerDashboard from './components/ManagerDashboard';
import EmployeeDashboard from './components/EmployeeDashboard';
import { HydratedUser } from './types';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<HydratedUser | null>(null);
  const [appReady, setAppReady] = useState(false);

  useEffect(() => {
    // Restore session on launch
    try {
      const stored = localStorage.getItem('session_user');
      if (stored) {
        setCurrentUser(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Session restore failed', e);
    } finally {
      setAppReady(true);
    }
  }, []);

  const handleLoginSuccess = (user: HydratedUser) => {
    setCurrentUser(user);
    try {
      localStorage.setItem('session_user', JSON.stringify(user));
    } catch (e) {
      console.error('Failed storing session', e);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    try {
      localStorage.removeItem('session_user');
    } catch (e) {
      console.error('Failed clearing session', e);
    }
  };

  if (!appReady) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
        <div className="w-8 h-8 border-3 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
        <span className="text-xs font-semibold text-slate-500 mt-3 uppercase tracking-wider">eTimeOffice Enterprise</span>
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      {!currentUser ? (
        <motion.div
          key="login"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          <LoginView onLoginSuccess={handleLoginSuccess} />
        </motion.div>
      ) : (
        <motion.div
          key="dashboard"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="min-h-screen bg-slate-50"
          transition={{ duration: 0.15 }}
        >
          {currentUser.role === 'ADMIN' && (
            <AdminDashboard currentUser={currentUser} onLogout={handleLogout} />
          )}
          {currentUser.role === 'MANAGER' && (
            <ManagerDashboard currentUser={currentUser} onLogout={handleLogout} />
          )}
          {currentUser.role === 'EMPLOYEE' && (
            <EmployeeDashboard currentUser={currentUser} onLogout={handleLogout} />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
