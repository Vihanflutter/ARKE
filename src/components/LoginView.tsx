import React, { useState, useEffect } from 'react';
import { apiRequest } from '../lib/api-client';
import { HydratedUser } from '../types';
import { Lock, Mail, Users, ArrowRight, ShieldCheck, UserCheck, Eye, EyeOff, Search } from 'lucide-react';
import { motion } from 'motion/react';

interface QuickAccessUser {
  id: string;
  name: string;
  email: string;
  employeeId: string;
  role: string;
  password: string;
  status: string;
}

interface LoginViewProps {
  onLoginSuccess: (user: HydratedUser) => void;
}

export default function LoginView({ onLoginSuccess }: LoginViewProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [quickUsers, setQuickUsers] = useState<QuickAccessUser[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    let active = true;
    const fetchQuickUsers = async () => {
      try {
        const users = await apiRequest<QuickAccessUser[]>('/api/auth/quick-access-users', 'GET');
        if (active) {
          setQuickUsers(users);
        }
      } catch (err) {
        console.error('Failed to load quick access users:', err);
      }
    };
    fetchQuickUsers();
    return () => {
      active = false;
    };
  }, []);

  const filteredUsers = quickUsers.filter(u => 
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.employeeId.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.email && u.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please provide email/ID and password.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await apiRequest<{ success: boolean; user: HydratedUser }>('/api/auth/login', 'POST', {
        emailOrEmployeeId: username,
        password,
      });

      if (data.success) {
        onLoginSuccess(data.user);
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  // Quick fill developer helpers
  const handleQuickLogin = (email: string, pass: string) => {
    setUsername(email);
    setPassword(pass);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      {/* Dynamic Quick Access on Desktop */}
      <div className="absolute top-4 right-4 bg-white shadow-md rounded-2xl p-4 w-80 hidden md:block border border-slate-200/80">
        <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 mb-2.5 uppercase tracking-wider">
          <UserCheck className="w-4 h-4 text-emerald-600" />
          Quick Access Accounts
        </h4>
        <p className="text-[10px] text-slate-500 mb-3 font-medium leading-normal">
          Click any registered employee to instantly autofill and sign in.
        </p>

        {/* Dynamic Search box */}
        {quickUsers.length > 0 && (
          <div className="relative mb-3">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search name, ID or role..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-[11px] pl-8 pr-3 py-1.5 border border-slate-200 rounded-xl outline-none focus:border-slate-400 bg-slate-50/50"
            />
          </div>
        )}

        <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
          {filteredUsers.length === 0 ? (
            <div className="text-center py-6 text-slate-400 text-[11px] font-medium">
              No matching employees found
            </div>
          ) : (
            filteredUsers.map((u) => (
              <button 
                key={u.id}
                onClick={() => handleQuickLogin(u.email || u.employeeId, u.password)}
                className="w-full text-left bg-slate-50/70 hover:bg-slate-100/95 active:scale-[0.98] p-2.5 rounded-xl transition-all font-sans flex items-center justify-between border border-slate-100 hover:border-slate-200 group"
              >
                <div className="flex flex-col min-w-0 pr-2">
                  <span className="font-semibold text-slate-800 text-xs truncate group-hover:text-slate-900">{u.name}</span>
                  <span className="text-[10px] text-slate-500 font-mono truncate">{u.employeeId}</span>
                </div>
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                  u.role === 'ADMIN' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                  u.role === 'MGR' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                  'bg-slate-100 text-slate-700 border border-slate-200'
                }`}>
                  {u.role}
                </span>
              </button>
            ))
          )}
        </div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden"
      >
        <div className="p-8 pb-6 bg-white text-slate-900 border-b border-slate-100">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-white font-bold text-base">
              E
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-slate-900">eTimeOffice+</h2>
              <p className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase">Enterprise Attendance</p>
            </div>
          </div>
          
          <h3 className="text-xl font-bold text-slate-900">Sign In</h3>
          <p className="text-slate-500 text-xs mt-1">Access secure human resource panel</p>
        </div>

        <div className="p-8">
          {error && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="bg-red-50 border border-red-100 text-red-700 p-3 rounded-lg text-xs mb-6 font-medium"
            >
              {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Employee ID or Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  placeholder="EMP001 or admin@etimeoffice.com"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent bg-slate-50 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Secure Account Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent bg-slate-50 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 px-4 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-md text-sm transition-all duration-150 flex items-center justify-center gap-2 group disabled:opacity-70 mt-2 cursor-pointer"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  Authenticate Credentials
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Dynamic Quick Access for Mobile */}
          <div className="mt-6 border-t border-slate-100 pt-5 block md:hidden">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2.5">
              QUICK ACCESS ACCOUNTS
            </span>
            {quickUsers.length > 0 && (
              <div className="relative mb-2.5">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search name, ID or role..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full text-xs pl-8 pr-3 py-1.5 border border-slate-150 rounded-xl outline-none focus:border-slate-300 bg-slate-50/50"
                />
              </div>
            )}
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-2 px-2 scrollbar-none max-h-32">
              {filteredUsers.length === 0 ? (
                <div className="text-[11px] text-slate-400 py-2">No matching accounts</div>
              ) : (
                filteredUsers.map((u) => (
                  <button 
                    key={u.id}
                    type="button"
                    onClick={() => handleQuickLogin(u.email || u.employeeId, u.password)}
                    className="flex-shrink-0 bg-slate-50 hover:bg-slate-100 px-3 py-2 rounded-xl border border-slate-200/60 text-left min-w-[130px] max-w-[150px]"
                  >
                    <div className="text-xs font-bold text-slate-800 truncate">{u.name}</div>
                    <div className="text-[9px] text-slate-500 font-mono truncate">{u.employeeId}</div>
                    <div className="mt-1 flex items-center justify-between">
                      <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full ${
                        u.role === 'ADMIN' ? 'bg-emerald-50 text-emerald-700' :
                        u.role === 'MGR' ? 'bg-blue-50 text-blue-700' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {u.role}
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="bg-slate-50 px-8 py-4 border-t border-slate-150 text-center text-xs text-slate-500 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-slate-700" />
          Enterprise Session Protected
        </div>
      </motion.div>
    </div>
  );
}
