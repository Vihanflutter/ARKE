import { useState, useEffect } from 'react';
import LoginView from './components/LoginView';
import AdminDashboard from './components/AdminDashboard';
import ManagerDashboard from './components/ManagerDashboard';
import EmployeeDashboard from './components/EmployeeDashboard';
import { HydratedUser } from './types';
import { motion, AnimatePresence } from 'motion/react';
import { apiRequest } from './lib/api-client';

export default function App() {
  const [currentUser, setCurrentUser] = useState<HydratedUser | null>(null);
  const [appReady, setAppReady] = useState(false);

  useEffect(() => {
    let active = true;
    
    const initAndSync = async () => {
      try {
        // 1. Fetch server status to see if it's default seed (newly redeployed/reset)
        const status = await apiRequest<{ isDefaultSeed: boolean }>('/api/system/status', 'GET');
        
        if (status.isDefaultSeed && active) {
          // Check if there is a local client-side backup stored in the browser
          const backupStr = localStorage.getItem('arke_db_backup');
          if (backupStr) {
            try {
              const backup = JSON.parse(backupStr);
              if (backup && backup.users && backup.users.length > 0) {
                console.log('Detected clean/re-seeded server. Restoring your manual entries automatically...');
                await apiRequest('/api/system/restore', 'POST', backup);
                console.log('Automatic restore complete.');
              }
            } catch (err) {
              console.error('Failed to restore from local backup:', err);
            }
          }
        }
      } catch (err) {
        console.error('System status/sync check failed:', err);
      }

      // 2. Restore local login session
      if (active) {
        try {
          const stored = localStorage.getItem('session_user');
          if (stored) {
            // Re-verify if this user exists on the server (handles the case where DB changed)
            const userObj = JSON.parse(stored);
            const allUsers = await apiRequest<any[]>('/api/auth/quick-access-users', 'GET');
            const match = allUsers.find(u => u.id === userObj.id);
            if (match) {
              // Get hydrated user from server
              const hydrated = await apiRequest<HydratedUser[]>(`/api/employees`, 'GET')
                .then(list => list.find(u => u.id === userObj.id))
                .catch(() => null);
              
              if (hydrated) {
                setCurrentUser(hydrated);
                localStorage.setItem('session_user', JSON.stringify(hydrated));
              } else {
                setCurrentUser(userObj);
              }
            } else {
              // Session user no longer exists, sign out
              localStorage.removeItem('session_user');
              setCurrentUser(null);
            }
          }
        } catch (e) {
          console.error('Session restore failed', e);
        } finally {
          setAppReady(true);
        }
      }
    };

    initAndSync();

    return () => {
      active = false;
    };
  }, []);

  // Periodic automatic local backups whenever there is an active session
  useEffect(() => {
    if (!currentUser) return;

    const doBackup = async () => {
      try {
        const dbData = await apiRequest<any>('/api/system/export', 'GET');
        if (dbData && dbData.users && dbData.users.length > 0) {
          localStorage.setItem('arke_db_backup', JSON.stringify(dbData));
        }
      } catch (err) {
        console.error('Automatic background backup failed:', err);
      }
    };

    // Backup immediately, then every 8 seconds
    doBackup();
    const interval = setInterval(doBackup, 8000);

    return () => clearInterval(interval);
  }, [currentUser]);

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
