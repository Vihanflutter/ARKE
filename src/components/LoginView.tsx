import React, { useState } from 'react';
import { apiRequest } from '../lib/api-client';
import { HydratedUser } from '../types';
import { Lock, Mail, Users, ArrowRight, ShieldCheck, UserCheck, Eye, EyeOff } from 'lucide-react';
import { motion } from 'motion/react';

interface LoginViewProps {
  onLoginSuccess: (user: HydratedUser) => void;
}

export default function LoginView({ onLoginSuccess }: LoginViewProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

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
      <div className="absolute top-4 right-4 bg-white shadow-sm rounded-xl p-4 max-w-sm hidden md:block border border-slate-200">
        <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 mb-2.5 uppercase tracking-wider">
          <UserCheck className="w-3.5 h-3.5 text-slate-800" />
          Quick Access Demo Roles
        </h4>
        <div className="space-y-1.5 text-xs">
          <button 
            onClick={() => handleQuickLogin('admin@etimeoffice.com', 'admin123')}
            className="w-full text-left bg-slate-50 hover:bg-slate-100 p-2 rounded-lg transition font-mono flex items-center justify-between border border-slate-100"
          >
            <span className="font-medium text-slate-700">Admin (Pierce)</span>
            <span className="text-[10px] text-slate-800 font-semibold px-1.5 py-0.5 bg-slate-100 rounded">ADMIN</span>
          </button>
          <button 
            onClick={() => handleQuickLogin('sarah@etimeoffice.com', 'manager123')}
            className="w-full text-left bg-slate-50 hover:bg-slate-100 p-2 rounded-lg transition font-mono flex items-center justify-between border border-slate-100"
          >
            <span className="font-medium text-slate-700">Manager (Sarah)</span>
            <span className="text-[10px] text-slate-800 font-semibold px-1.5 py-0.5 bg-slate-100 rounded">MGR</span>
          </button>
          <button 
            onClick={() => handleQuickLogin('emma@etimeoffice.com', 'employee123')}
            className="w-full text-left bg-slate-50 hover:bg-slate-100 p-2 rounded-lg transition font-mono flex items-center justify-between border border-slate-100"
          >
            <span className="font-medium text-slate-700">Employee (Emma)</span>
            <span className="text-[10px] text-slate-800 font-semibold px-1.5 py-0.5 bg-slate-100 rounded">EMP</span>
          </button>
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

          {/* Quick Demo Assist for Mobile / Tablet */}
          <div className="mt-8 border-t border-slate-150 pt-6 block md:hidden">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-3">
              DEMO PRESETS
            </span>
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <button 
                onClick={() => handleQuickLogin('admin@etimeoffice.com', 'admin123')}
                className="bg-slate-100 hover:bg-slate-200 text-slate-800 py-2 rounded-md font-medium transition"
              >
                Admin
              </button>
              <button 
                onClick={() => handleQuickLogin('sarah@etimeoffice.com', 'manager123')}
                className="bg-slate-100 hover:bg-slate-200 text-slate-800 py-2 rounded-md font-medium transition"
              >
                Manager
              </button>
              <button 
                onClick={() => handleQuickLogin('emma@etimeoffice.com', 'employee123')}
                className="bg-slate-100 hover:bg-slate-200 text-slate-800 py-2 rounded-md font-medium transition"
              >
                Employee
              </button>
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
