import React, { useState, useEffect } from 'react';
import { apiRequest } from '../lib/api-client';
import { exportToExcel, exportToPDF } from '../lib/reports-export';
import { 
  HydratedUser, HydratedAttendance, HydratedLeaveRequest, CompanySettings, LeaveType
} from '../types';
import { 
  Calendar, Clock, UserCheck, Play, Square, LogOut, Download, Plus, Trash, AlertCircle, FileText, HelpCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface EmployeeDashboardProps {
  currentUser: HydratedUser;
  onLogout: () => void;
}

export default function EmployeeDashboard({ currentUser, onLogout }: EmployeeDashboardProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'attendance' | 'leaves'>('overview');

  // Datasets
  const [personalLogs, setPersonalLogs] = useState<HydratedAttendance[]>([]);
  const [personalLeaves, setPersonalLeaves] = useState<HydratedLeaveRequest[]>([]);
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [todayLog, setTodayLog] = useState<HydratedAttendance | null>(null);
  const [freshUser, setFreshUser] = useState<HydratedUser | null>(null);
  const [balanceLogs, setBalanceLogs] = useState<any[]>([]);

  // Stats
  const [summaryStats, setSummaryStats] = useState({
    present: 0,
    absent: 0,
    leave: 0,
    halfDay: 0,
    late: 0,
    totalHours: 0
  });

  // Loading
  const [loading, setLoading] = useState(true);
  const [operationLoading, setOperationLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modals / Inputs
  const [applyLeaveModal, setApplyLeaveModal] = useState(false);
  const [punchRemarks, setPunchRemarks] = useState('');
  const [historyMonthFilter, setHistoryMonthFilter] = useState('2026-06');

  // Live timer for working hours
  const [elapsedTime, setElapsedTime] = useState('00:00:00');

  const showMsg = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const loadEmployeeData = async () => {
    setLoading(true);
    try {
      const todayStr = new Date().toLocaleDateString('en-CA');

      // 1. Fetch personal attendance logs
      const logs = await apiRequest<HydratedAttendance[]>(`/api/attendance?userId=${currentUser.id}`);
      setPersonalLogs(logs);

      // Check today's punch state
      const todayRecord = logs.find(l => l.date === todayStr);
      setTodayLog(todayRecord || null);

      // 2. Fetch personal leaves
      const leaves = await apiRequest<HydratedLeaveRequest[]>(`/api/leaves?userId=${currentUser.id}`);
      setPersonalLeaves(leaves);

      // 3. Fetch Settings
      const settingsRes = await apiRequest<CompanySettings>('/api/settings');
      setSettings(settingsRes);

      // 4. Fetch fresh user details for balance state
      const employees = await apiRequest<HydratedUser[]>('/api/employees');
      const me = employees.find(e => e.id === currentUser.id);
      if (me) {
        setFreshUser(me);
      }

      // 5. Fetch personal balance logs
      const balanceLogsRes = await apiRequest<any[]>(`/api/leaves/balance-history?userId=${currentUser.id}`);
      setBalanceLogs(balanceLogsRes);

      // 4. Calculate summary stats
      let present = 0;
      let absent = 0;
      let leave = 0;
      let halfDay = 0;
      let late = 0;
      let totalHours = 0;

      logs.forEach(l => {
        totalHours += l.workingHours || 0;
        if (l.status === 'PRESENT') present++;
        else if (l.status === 'ABSENT') absent++;
        else if (l.status === 'LEAVE') leave++;
        else if (l.status?.startsWith('HALF_DAY')) halfDay++;

        if (l.late > 0) late++;
      });

      setSummaryStats({
        present,
        absent,
        leave,
        halfDay,
        late,
        totalHours: parseFloat(totalHours.toFixed(2))
      });

    } catch (err: any) {
      showMsg('error', err.message || 'Failed to load personal logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEmployeeData();
  }, [activeTab]);

  // Live elapsed time timer when punched in
  useEffect(() => {
    if (!todayLog?.punchIn || todayLog.punchOut) {
      setElapsedTime('00:00:00');
      return;
    }

    const interval = setInterval(() => {
      try {
        const [inH, inM, inS] = todayLog.punchIn!.split(':').map(Number);
        const inDate = new Date();
        inDate.setHours(inH, inM, inS || 0);

        const diffMs = new Date().getTime() - inDate.getTime();
        if (diffMs < 0) return; // server/local skew
        
        const diffHrs = Math.floor(diffMs / 3600000);
        const diffMins = Math.floor((diffMs % 3600000) / 60000);
        const diffSecs = Math.floor((diffMs % 60000) / 1000);

        setElapsedTime(
          `${String(diffHrs).padStart(2, '0')}:${String(diffMins).padStart(2, '0')}:${String(diffSecs).padStart(2, '0')}`
        );
      } catch (e) {
        // Skew safe
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [todayLog]);

  // --- SELF PUNCH OVERRIDE ---
  const handlePunchAction = async (action: 'in' | 'out') => {
    setOperationLoading(true);
    try {
      const res = await apiRequest<{ success: boolean; record: HydratedAttendance }>('/api/attendance/punch', 'POST', {
        userId: currentUser.id,
        action,
        remarks: punchRemarks || undefined
      });

      if (res.success) {
        showMsg('success', `Punch ${action.toUpperCase()} recorded successfully.`);
        setPunchRemarks('');
        loadEmployeeData();
      }
    } catch (err: any) {
      showMsg('error', err.message || 'Punch execution failed.');
    } finally {
      setOperationLoading(false);
    }
  };

  // --- APPLY LEAVE ---
  const handleApplyLeave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setOperationLoading(true);
    const formData = new FormData(e.currentTarget);
    const leaveData = {
      userId: currentUser.id,
      leaveType: formData.get('leaveType') as LeaveType,
      startDate: formData.get('startDate') as string,
      endDate: formData.get('endDate') as string,
      remarks: formData.get('remarks') as string,
    };

    try {
      await apiRequest('/api/leaves', 'POST', leaveData);
      showMsg('success', 'Leave application filed successfully. Pending manager review.');
      setApplyLeaveModal(false);
      loadEmployeeData();
    } catch (err: any) {
      showMsg('error', err.message || 'Failed to submit leave.');
    } finally {
      setOperationLoading(false);
    }
  };

  const handleCancelPendingLeave = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this pending leave request?')) return;
    try {
      await apiRequest(`/api/leaves/${id}`, 'DELETE');
      showMsg('success', 'Leave request cancelled.');
      loadEmployeeData();
    } catch (err: any) {
      showMsg('error', err.message || 'Cancellation failed.');
    }
  };

  // --- EXPORT PERSONAL LEDGER ---
  const handleDownloadPersonalReport = (format: 'excel' | 'pdf') => {
    const title = `${currentUser.name} - Attendance Sheet`;
    const subtitle = `Emp ID: ${currentUser.employeeId} | Period: June 2026`;
    
    // Sort logs chronologically for export
    const chronologicalLogs = [...personalLogs].sort((a, b) => a.date.localeCompare(b.date));

    if (format === 'excel') {
      exportToExcel(title, subtitle, chronologicalLogs, currentUser);
    } else {
      exportToPDF(title, subtitle, chronologicalLogs, currentUser);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      
      {/* Top Header Bar */}
      <header className="bg-white text-slate-900 h-16 flex items-center justify-between px-6 shrink-0 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-white font-bold text-base">
            E
          </div>
          <div>
            <span className="font-bold tracking-tight text-base text-slate-900">eTimeOffice+</span>
            <span className="text-[10px] bg-slate-100 text-slate-800 font-semibold uppercase px-1.5 py-0.5 rounded ml-2">Employee Space</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <div className="text-xs font-semibold text-slate-800">{currentUser.name}</div>
            <div className="text-[10px] text-slate-400 font-bold uppercase">{currentUser.designation?.name || 'Staff Member'}</div>
          </div>
          
          <button 
            onClick={onLogout}
            className="flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 py-1.5 px-3 rounded-md border border-slate-200 transition cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5 text-slate-400" />
            Sign Out
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        
        {/* Navigation Sidebar */}
        <aside className="w-64 bg-white border-r border-slate-200 hidden md:flex flex-col p-4 space-y-1 shrink-0">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-3">Self-Service</div>
          <button
            onClick={() => setActiveTab('overview')}
            className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2.5 transition cursor-pointer ${
              activeTab === 'overview' ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            Overview Terminal
          </button>
          <button
            onClick={() => setActiveTab('attendance')}
            className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2.5 transition cursor-pointer ${
              activeTab === 'attendance' ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Calendar className="w-4 h-4" />
            My Log Calendar
          </button>
          <button
            onClick={() => setActiveTab('leaves')}
            className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2.5 transition cursor-pointer ${
              activeTab === 'leaves' ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Clock className="w-4 h-4" />
            Apply Leave
            {personalLeaves.filter(l => l.status === 'PENDING').length > 0 && (
              <span className="ml-auto bg-slate-200 text-slate-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {personalLeaves.filter(l => l.status === 'PENDING').length}
              </span>
            )}
          </button>
        </aside>

        {/* main workspace content */}
        <main className="flex-1 overflow-y-auto p-6">
          {message && (
            <div className={`p-3 rounded-md text-sm font-medium mb-4 flex items-center gap-2 border ${
              message.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-red-50 border-red-100 text-red-800'
            }`}>
              <AlertCircle className="w-4 h-4 text-slate-600" />
              {message.text}
            </div>
          )}

          {loading ? (
            <div className="h-64 flex flex-col items-center justify-center gap-3">
              <div className="w-6 h-6 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Loading profile...</span>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15 }}
                className="space-y-6"
              >
                
                {/* --- OVERVIEW TAB --- */}
                {activeTab === 'overview' && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-xl font-bold tracking-tight text-slate-900">Welcome back, {currentUser.name}!</h2>
                      <p className="text-xs text-slate-500 mt-1">Employee ID: <span className="font-semibold text-slate-800">{currentUser.employeeId}</span> &bull; Department: <span className="font-semibold text-slate-800">{currentUser.department?.name || 'General'}</span></p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      
                      {/* Active Punch Terminal Panel */}
                      <div className="bg-slate-900 text-white rounded-xl border border-slate-800 p-6 shadow-sm flex flex-col justify-between min-h-[300px]">
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block mb-2">Live Punch Terminal</span>
                          <h3 className="text-base font-bold text-slate-100">Today's Punch Status</h3>
                          <div className="text-xs text-slate-400 mt-1">Date: {new Date().toLocaleDateString()}</div>
                        </div>

                        <div className="text-center py-6">
                          {todayLog?.punchIn && !todayLog?.punchOut ? (
                            <div className="space-y-1">
                              <div className="text-4xl font-mono font-bold tracking-tight text-slate-100">{elapsedTime}</div>
                              <div className="text-xs text-slate-400">Punched IN at {todayLog.punchIn}</div>
                            </div>
                          ) : todayLog?.punchIn && todayLog?.punchOut ? (
                            <div className="space-y-1">
                              <div className="text-xl font-bold text-slate-100 flex items-center justify-center gap-1.5">
                                <UserCheck className="w-5 h-5 text-emerald-400" /> Punched Out
                              </div>
                              <div className="text-xs text-slate-400">Total Hours Worked: {todayLog.workingHours} hrs</div>
                            </div>
                          ) : (
                            <div className="space-y-1 text-slate-400">
                              <div className="text-3xl font-mono font-bold text-slate-300">00:00:00</div>
                              <div className="text-xs">No terminal activity logged today.</div>
                            </div>
                          )}
                        </div>

                        <div className="space-y-4">
                          <input
                            type="text"
                            placeholder="Add tag remarks (optional)..."
                            value={punchRemarks}
                            onChange={(e) => setPunchRemarks(e.target.value)}
                            disabled={todayLog?.punchIn && !!todayLog?.punchOut}
                            className="w-full bg-slate-800 border border-slate-700 rounded-md px-3.5 py-2 text-xs outline-none text-slate-200 placeholder-slate-500 focus:border-slate-500 transition"
                          />

                          <div className="grid grid-cols-2 gap-3">
                            <button
                              onClick={() => handlePunchAction('in')}
                              disabled={operationLoading || !!todayLog?.punchIn}
                              className="bg-white hover:bg-slate-100 disabled:bg-slate-800 disabled:text-slate-600 text-slate-900 font-bold text-xs py-2.5 rounded-md flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                            >
                              <Play className="w-3.5 h-3.5" /> Punch In
                            </button>
                            <button
                              onClick={() => handlePunchAction('out')}
                              disabled={operationLoading || !todayLog?.punchIn || !!todayLog?.punchOut}
                              className="bg-slate-800 hover:bg-slate-700 disabled:bg-slate-800 disabled:text-slate-600 text-white font-bold text-xs py-2.5 rounded-md flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                            >
                              <Square className="w-3.5 h-3.5" /> Punch Out
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Summary Stats Grid */}
                      <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
                        <div>
                          <h3 className="font-bold text-slate-900 text-sm mb-4 uppercase tracking-wider text-slate-500">Monthly Attendance Summary (June 2026)</h3>
                          <div className="grid grid-cols-3 gap-4">
                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                              <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider">Present Days</span>
                              <span className="text-2xl font-bold text-blue-600 mt-1 block">{summaryStats.present + (summaryStats.halfDay * 0.5)}</span>
                            </div>
                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                              <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider">Absent Days</span>
                              <span className="text-2xl font-bold text-red-500 mt-1 block">{summaryStats.absent}</span>
                            </div>
                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                              <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider">On Leave</span>
                              <span className="text-2xl font-bold text-orange-500 mt-1 block">{summaryStats.leave}</span>
                            </div>
                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                              <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider">Half Days</span>
                              <span className="text-2xl font-bold text-amber-500 mt-1 block">{summaryStats.halfDay}</span>
                            </div>
                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                              <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider">Late Arrivals</span>
                              <span className="text-2xl font-bold text-slate-900 mt-1 block">{summaryStats.late}</span>
                            </div>
                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                              <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider">Service Hours</span>
                              <span className="text-2xl font-bold text-slate-900 mt-1 block">{summaryStats.totalHours} hrs</span>
                            </div>
                          </div>
                        </div>

                        <div className="border-t border-slate-100 pt-4 flex justify-between items-center mt-6">
                          <div className="text-xs text-slate-400 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            Office timings: {settings?.officeStartTime} - {settings?.officeEndTime}
                          </div>
                          <button
                            onClick={() => handleDownloadPersonalReport('pdf')}
                            className="text-xs font-bold text-slate-900 hover:text-slate-800 flex items-center gap-1 bg-slate-100 px-3 py-1.5 rounded-md border border-slate-200 cursor-pointer transition"
                          >
                            <Download className="w-3.5 h-3.5 text-slate-700" /> Download Roster Book
                          </button>
                        </div>
                      </div>

                    </div>
                  </div>
                )}

                {/* --- ATTENDANCE HISTORY TAB --- */}
                {activeTab === 'attendance' && (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
                      <div>
                        <h2 className="text-xl font-bold tracking-tight text-slate-900">Attendance Log History</h2>
                        <p className="text-xs text-slate-500 mt-1">Explore past attendance logs and roster records</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleDownloadPersonalReport('excel')}
                          className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold text-xs px-3 py-1.5 rounded-md flex items-center gap-1 cursor-pointer transition shadow-sm"
                        >
                          <FileText className="w-3.5 h-3.5 text-slate-600" /> Export Excel
                        </button>
                        <button
                          onClick={() => handleDownloadPersonalReport('pdf')}
                          className="bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs px-3 py-1.5 rounded-md flex items-center gap-1 cursor-pointer transition"
                        >
                          <Download className="w-3.5 h-3.5" /> Download PDF
                        </button>
                      </div>
                    </div>

                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                      <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Ledger Sheets</span>
                        <input
                          type="month"
                          value={historyMonthFilter}
                          onChange={(e) => setHistoryMonthFilter(e.target.value)}
                          className="border border-slate-200 rounded-md px-2.5 py-1 text-xs outline-none bg-white font-medium text-slate-800"
                        />
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                          <thead className="bg-slate-50 text-slate-500 text-[10px] font-bold uppercase tracking-wider border-b border-slate-200">
                            <tr>
                              <th className="px-5 py-3">Roster Date</th>
                              <th className="px-5 py-3">Punch In</th>
                              <th className="px-5 py-3">Punch Out</th>
                              <th className="px-5 py-3 text-center">Service Hours</th>
                              <th className="px-5 py-3 text-center">Late minutes</th>
                              <th className="px-5 py-3 text-center">Roster Status</th>
                              <th className="px-5 py-3">Remarks</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200">
                            {personalLogs.filter(log => log.date.startsWith(historyMonthFilter)).length === 0 ? (
                              <tr>
                                <td colSpan={7} className="px-5 py-8 text-center text-slate-400 text-xs">
                                  No records found for target month.
                                </td>
                              </tr>
                            ) : (
                              personalLogs.filter(log => log.date.startsWith(historyMonthFilter)).map((log) => (
                                <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                                  <td className="px-5 py-3.5 font-semibold text-slate-950">{log.date}</td>
                                  <td className="px-5 py-3.5 font-mono text-xs text-slate-600">{log.punchIn || '--:--:--'}</td>
                                  <td className="px-5 py-3.5 font-mono text-xs text-slate-600">{log.punchOut || '--:--:--'}</td>
                                  <td className="px-5 py-3.5 text-center font-semibold text-slate-800">{log.workingHours || 0.0} hrs</td>
                                  <td className="px-5 py-3.5 text-center text-xs font-semibold">
                                    {log.late > 0 ? (
                                      <span className="text-amber-600">{log.late} min</span>
                                    ) : (
                                      <span className="text-slate-400">On Time</span>
                                    )}
                                  </td>
                                  <td className="px-5 py-3.5 text-center">
                                    <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold border ${
                                      log.status === 'PRESENT' ? 'bg-green-50 text-green-700 border-green-100' :
                                      log.status === 'ABSENT' ? 'bg-red-50 text-red-700 border-red-100' :
                                      log.status?.startsWith('HALF_DAY') ? 'bg-amber-50 text-amber-700 border-amber-100' :
                                      'bg-blue-50 text-blue-700 border-blue-100'
                                    }`}>
                                      {log.status === 'HALF_DAY_1' ? 'Half Day 1' : log.status === 'HALF_DAY_2' ? 'Half Day 2' : log.status === 'HALF_DAY' ? 'Half Day' : log.status}
                                    </span>
                                  </td>
                                  <td className="px-5 py-3.5 text-slate-500 max-w-[200px] truncate">{log.remarks || '-'}</td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* --- LEAVES TAB --- */}
                {activeTab === 'leaves' && (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
                      <div>
                        <h2 className="text-xl font-bold tracking-tight text-slate-900">Personal Leave Register</h2>
                        <p className="text-xs text-slate-500 mt-1">Apply for leaves or track your approval logs</p>
                      </div>
                      <button
                        onClick={() => setApplyLeaveModal(true)}
                        className="bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs px-3.5 py-2 rounded-md flex items-center gap-1.5 cursor-pointer transition"
                      >
                        <Plus className="w-4 h-4" /> Apply Leave
                      </button>
                    </div>

                    {/* Available Balances Grid */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                        <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Casual Leave (CL)</span>
                        <span className="text-xl font-bold text-slate-800 mt-1 block">{(freshUser || currentUser).casualBalance ?? 0} days</span>
                      </div>
                      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                        <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Sick Leave (SL)</span>
                        <span className="text-xl font-bold text-slate-800 mt-1 block">{(freshUser || currentUser).sickBalance ?? 0} days</span>
                      </div>
                      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                        <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Earned Leave (EL)</span>
                        <span className="text-xl font-bold text-slate-800 mt-1 block">{(freshUser || currentUser).earnedBalance ?? 0} days</span>
                      </div>
                      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                        <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Compensatory Leave (CO)</span>
                        <span className="text-xl font-bold text-slate-800 mt-1 block">{(freshUser || currentUser).compensatoryBalance ?? 0} days</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                      {personalLeaves.length === 0 ? (
                        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400 text-xs font-medium">
                          No leave requests filed yet.
                        </div>
                      ) : (
                        personalLeaves.map((leave) => (
                          <div key={leave.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col md:flex-row justify-between gap-4">
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 px-2 py-0.5 rounded text-slate-800 border border-slate-200">{leave.leaveType.replace('_', ' ')}</span>
                                <span className="text-xs text-slate-400 font-mono">ID: {leave.id}</span>
                              </div>
                              <div className="text-sm text-slate-700 font-medium">
                                Dates: <span className="text-slate-900 font-semibold">{leave.startDate}</span> to <span className="text-slate-900 font-semibold">{leave.endDate}</span>
                              </div>
                              <div className="text-xs text-slate-500">
                                Remarks: "{leave.remarks || 'None'}"
                              </div>
                              {leave.managerRemarks && (
                                <div className="text-xs bg-slate-50 border border-slate-200 p-2.5 rounded-md mt-2 text-slate-600">
                                  <strong className="block text-slate-700">Approver Notes:</strong>
                                  {leave.managerRemarks}
                                </div>
                              )}
                            </div>

                            <div className="flex flex-col justify-between items-end gap-3 shrink-0">
                              <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold uppercase border ${
                                leave.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                leave.status === 'REJECTED' ? 'bg-red-50 text-red-700 border-red-100' :
                                'bg-amber-50 text-amber-700 border-amber-100'
                              }`}>
                                {leave.status}
                              </span>

                              {leave.status === 'PENDING' && (
                                <button
                                  onClick={() => handleCancelPendingLeave(leave.id)}
                                  className="text-xs font-semibold text-red-600 hover:text-red-700 border border-red-200 bg-red-50 hover:bg-red-100 py-1 px-2.5 rounded-md flex items-center gap-1.5 cursor-pointer transition"
                                >
                                  <Trash className="w-3.5 h-3.5" /> Cancel Leave
                                </button>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Balance History Logs */}
                    {balanceLogs.length > 0 && (
                      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm mt-6">
                        <div className="p-4 bg-slate-50 border-b border-slate-200">
                          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">My Leave Balance Adjustments History</h3>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-400 text-[10px] font-bold uppercase tracking-wider border-b border-slate-200">
                              <tr>
                                <th className="px-5 py-2.5">Leave Type</th>
                                <th className="px-5 py-2.5 text-center">Previous</th>
                                <th className="px-5 py-2.5 text-center">New Balance</th>
                                <th className="px-5 py-2.5 text-center">Change</th>
                                <th className="px-5 py-2.5">Adjusted By</th>
                                <th className="px-5 py-2.5">Reason</th>
                                <th className="px-5 py-2.5 text-right">Date</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-150 text-xs">
                              {balanceLogs.map((log) => {
                                const diff = log.newBalance - log.previousBalance;
                                return (
                                  <tr key={log.id} className="hover:bg-slate-50 transition-colors text-slate-700">
                                    <td className="px-5 py-3 font-semibold uppercase">{log.leaveType.replace('_', ' ')}</td>
                                    <td className="px-5 py-3 text-center text-slate-400">{log.previousBalance}</td>
                                    <td className="px-5 py-3 text-center font-bold text-slate-900">{log.newBalance}</td>
                                    <td className="px-5 py-3 text-center">
                                      {diff > 0 ? (
                                        <span className="text-green-600 font-bold">+{diff}</span>
                                      ) : diff < 0 ? (
                                        <span className="text-red-600 font-bold">{diff}</span>
                                      ) : (
                                        <span className="text-slate-400 font-medium">No Change</span>
                                      )}
                                    </td>
                                    <td className="px-5 py-3 text-slate-500">{log.changedByName}</td>
                                    <td className="px-5 py-3 text-slate-600 max-w-[220px] truncate" title={log.reason}>{log.reason}</td>
                                    <td className="px-5 py-3 text-right text-slate-400 font-mono text-[10px]">{new Date(log.createdAt).toLocaleDateString()}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                  </div>
                )}

              </motion.div>
            </AnimatePresence>
          )}
        </main>
      </div>

      {/* Leave Application Modal Form */}
      {applyLeaveModal && (
        <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center p-4 z-50 backdrop-blur-xs">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-xl border border-slate-200 w-full max-w-md overflow-hidden shadow-sm"
          >
            <div className="px-5 py-4 bg-white border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider text-slate-500">File Leave Application</h3>
              <button onClick={() => setApplyLeaveModal(false)} className="text-slate-400 hover:text-slate-950 transition cursor-pointer">
                <Trash className="w-4 h-4" /> {/* close */}
              </button>
            </div>
            <form onSubmit={handleApplyLeave} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Leave Type</label>
                <select
                  required
                  name="leaveType"
                  className="w-full border border-slate-200 rounded-md px-3 py-2 text-xs bg-slate-50 font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
                >
                  <option value="CASUAL_LEAVE">Casual Leave</option>
                  <option value="SICK_LEAVE">Sick Leave</option>
                  <option value="EARNED_LEAVE">Earned Leave</option>
                  <option value="HALF_DAY">Half Day</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Start Date</label>
                  <input
                    type="date"
                    required
                    name="startDate"
                    className="w-full border border-slate-200 rounded-md px-3 py-2 text-xs bg-slate-50 font-medium text-slate-800 outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">End Date</label>
                  <input
                    type="date"
                    required
                    name="endDate"
                    className="w-full border border-slate-200 rounded-md px-3 py-2 text-xs bg-slate-50 font-medium text-slate-800 outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Remarks / Reason</label>
                <textarea
                  required
                  name="remarks"
                  placeholder="Explain your absence context briefly..."
                  className="w-full border border-slate-200 rounded-md px-3 py-2 text-xs bg-slate-50 font-medium text-slate-800 outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
                  rows={3}
                ></textarea>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={operationLoading}
                  className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs py-2 px-4 rounded-md transition cursor-pointer"
                >
                  File Application
                </button>
                <button
                  type="button"
                  onClick={() => setApplyLeaveModal(false)}
                  className="flex-1 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs py-2 px-4 rounded-md transition cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

    </div>
  );
}
