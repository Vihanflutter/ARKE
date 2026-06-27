import React, { useState, useEffect } from 'react';
import { apiRequest } from '../lib/api-client';
import { exportToExcel, exportToPDF } from '../lib/reports-export';
import { 
  HydratedUser, HydratedAttendance, HydratedLeaveRequest, Department, Designation, CompanySettings
} from '../types';
import { 
  Users, UserCheck, UserMinus, CalendarClock, Download, Filter, 
  CheckCircle, XCircle, ChevronRight, LogOut, Check, X, AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ManagerDashboardProps {
  currentUser: HydratedUser;
  onLogout: () => void;
}

export default function ManagerDashboard({ currentUser, onLogout }: ManagerDashboardProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'team' | 'leaves' | 'reports'>('overview');
  
  // Datasets
  const [teamEmployees, setTeamEmployees] = useState<HydratedUser[]>([]);
  const [teamAttendances, setTeamAttendances] = useState<HydratedAttendance[]>([]);
  const [teamLeaves, setTeamLeaves] = useState<HydratedLeaveRequest[]>([]);
  const [settings, setSettings] = useState<CompanySettings | null>(null);

  // Stats
  const [stats, setStats] = useState({
    totalTeam: 0,
    presentToday: 0,
    absentToday: 0,
    onLeaveToday: 0
  });

  // Loading
  const [loading, setLoading] = useState(true);
  const [operationLoading, setOperationLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modals
  const [leaveRemarksModal, setLeaveRemarksModal] = useState<{ open: boolean; leave?: HydratedLeaveRequest; action?: 'approve' | 'reject' }>({ open: false });

  // Filters
  const [teamSearch, setTeamSearch] = useState('');
  const [attDateFilter, setAttDateFilter] = useState(new Date().toLocaleDateString('en-CA'));
  const [reportMonth, setReportMonth] = useState('2026-06');
  const [leaveStatusFilter, setLeaveStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');

  const showMsg = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const loadManagerData = async () => {
    setLoading(true);
    try {
      const todayStr = new Date().toLocaleDateString('en-CA');

      // 1. Fetch team employees
      const empsRes = await apiRequest<HydratedUser[]>('/api/employees');
      // Filter employees whose managerId matches the current user
      const team = empsRes.filter(e => e.managerId === currentUser.id);
      setTeamEmployees(team);

      const teamIds = team.map(e => e.id);

      // 2. Fetch team attendances
      const attRes = await apiRequest<HydratedAttendance[]>(`/api/attendance?date=${attDateFilter}`);
      const filteredAtt = attRes.filter(a => teamIds.includes(a.userId));
      setTeamAttendances(filteredAtt);

      // 3. Fetch team leaves
      const leavesRes = await apiRequest<HydratedLeaveRequest[]>('/api/leaves');
      const filteredLeaves = leavesRes.filter(l => teamIds.includes(l.userId));
      setTeamLeaves(filteredLeaves);

      // 4. Calculate stats for team
      const present = filteredAtt.filter(a => a.status === 'PRESENT' || a.status === 'HALF_DAY').length;
      const onLeave = filteredAtt.filter(a => a.status === 'LEAVE').length;
      const absentCount = filteredAtt.filter(a => a.status === 'ABSENT').length;
      
      const loggedUserIds = new Set(filteredAtt.map(a => a.userId));
      const unloggedCount = team.filter(e => !loggedUserIds.has(e.id)).length;
      const finalAbsents = absentCount + unloggedCount;

      setStats({
        totalTeam: team.length,
        presentToday: present,
        absentToday: finalAbsents,
        onLeaveToday: onLeave
      });

      // 5. Fetch Settings
      const settingsRes = await apiRequest<CompanySettings>('/api/settings');
      setSettings(settingsRes);

    } catch (err: any) {
      showMsg('error', err.message || 'Failed loading team dashboard metrics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadManagerData();
  }, [activeTab, attDateFilter]);

  // --- REVIEW TEAM LEAVES ---
  const handleReviewLeave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setOperationLoading(true);
    const formData = new FormData(e.currentTarget);
    const managerRemarks = formData.get('managerRemarks') as string;
    const leaveId = leaveRemarksModal.leave?.id;
    const action = leaveRemarksModal.action === 'approve' ? 'APPROVED' : 'REJECTED';

    try {
      await apiRequest(`/api/leaves/${leaveId}`, 'PUT', {
        status: action,
        managerRemarks,
        approvedById: currentUser.id
      });
      showMsg('success', `Team leave request has been ${action.toLowerCase()}.`);
      setLeaveRemarksModal({ open: false });
      loadManagerData();
    } catch (err: any) {
      showMsg('error', err.message || 'Leave status modification failed');
    } finally {
      setOperationLoading(false);
    }
  };

  // --- EXPORT TEAM REPORT ---
  const handleDownloadTeamReport = async (format: 'pdf' | 'excel') => {
    setOperationLoading(true);
    try {
      // Fetch monthly attendance logs for team
      const monthlyRes = await apiRequest<HydratedAttendance[]>(`/api/attendance?month=${reportMonth}`);
      
      const teamIds = teamEmployees.map(e => e.id);
      const teamMonthlyLogs = monthlyRes.filter(a => teamIds.includes(a.userId));

      if (teamMonthlyLogs.length === 0) {
        showMsg('error', 'No attendance logs discovered for team in chosen month.');
        return;
      }

      const title = `Team Attendance Matrix`;
      const subtitle = `Manager: ${currentUser.name} | Month: ${reportMonth}`;

      if (format === 'excel') {
        await exportToExcel(title, subtitle, teamMonthlyLogs);
      } else {
        exportToPDF(title, subtitle, teamMonthlyLogs);
      }
    } catch (err: any) {
      showMsg('error', 'Report generation failed.');
    } finally {
      setOperationLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      
      {/* Top Navbar */}
      <header className="bg-white text-slate-900 h-16 flex items-center justify-between px-6 shrink-0 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-white font-bold text-base">
            E
          </div>
          <div>
            <span className="font-bold tracking-tight text-base text-slate-900">eTimeOffice+</span>
            <span className="text-[10px] bg-slate-100 text-slate-800 font-semibold uppercase px-1.5 py-0.5 rounded ml-2">Team Space</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <div className="text-xs font-semibold text-slate-800">{currentUser.name}</div>
            <div className="text-[10px] text-slate-400 font-bold uppercase">Team Manager &bull; {currentUser.department?.name}</div>
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
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-3">Management</div>
          <button
            onClick={() => setActiveTab('overview')}
            className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2.5 transition cursor-pointer ${
              activeTab === 'overview' ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            Overview Console
          </button>
          <button
            onClick={() => setActiveTab('team')}
            className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2.5 transition cursor-pointer ${
              activeTab === 'team' ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Users className="w-4 h-4" />
            My Team List
          </button>
          <button
            onClick={() => setActiveTab('leaves')}
            className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2.5 transition cursor-pointer ${
              activeTab === 'leaves' ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <CalendarClock className="w-4 h-4" />
            Team Leaves
            {teamLeaves.filter(l => l.status === 'PENDING').length > 0 && (
              <span className="ml-auto bg-slate-200 text-slate-800 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {teamLeaves.filter(l => l.status === 'PENDING').length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2.5 transition cursor-pointer ${
              activeTab === 'reports' ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Download className="w-4 h-4" />
            Team Reports
          </button>
        </aside>

        {/* Workspace panel */}
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
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Retrieving Team records...</span>
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
                      <h2 className="text-xl font-bold tracking-tight text-slate-900">Team Performance</h2>
                      <p className="text-xs text-slate-500 mt-1">Department: <span className="font-semibold text-slate-800">{currentUser.department?.name || 'Operations'}</span></p>
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                        <div className="w-10 h-10 bg-slate-100 text-slate-900 rounded-lg flex items-center justify-center">
                          <Users className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Total Team</div>
                          <div className="text-2xl font-bold text-slate-900 mt-0.5">{stats.totalTeam}</div>
                        </div>
                      </div>

                      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                        <div className="w-10 h-10 bg-slate-100 text-blue-600 rounded-lg flex items-center justify-center">
                          <UserCheck className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Present Today</div>
                          <div className="text-2xl font-bold text-blue-600 mt-0.5">{stats.presentToday}</div>
                        </div>
                      </div>

                      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                        <div className="w-10 h-10 bg-slate-100 text-red-500 rounded-lg flex items-center justify-center">
                          <UserMinus className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Absent Today</div>
                          <div className="text-2xl font-bold text-red-500 mt-0.5">{stats.absentToday}</div>
                        </div>
                      </div>

                      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                        <div className="w-10 h-10 bg-slate-100 text-orange-500 rounded-lg flex items-center justify-center">
                          <CalendarClock className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">On Leave</div>
                          <div className="text-2xl font-bold text-orange-500 mt-0.5">{stats.onLeaveToday}</div>
                        </div>
                      </div>
                    </div>

                    {/* Team logs matrix */}
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                      <div className="p-5 border-b border-slate-200 flex items-center justify-between">
                        <div>
                          <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider text-slate-500">Today's Team Roster Log</h3>
                          <p className="text-xs text-slate-400 mt-1">Live logs from your department team</p>
                        </div>
                        <input
                          type="date"
                          value={attDateFilter}
                          onChange={(e) => setAttDateFilter(e.target.value)}
                          className="border border-slate-200 rounded-md px-2.5 py-1 text-xs outline-none bg-white font-medium text-slate-800"
                        />
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                          <thead className="bg-slate-50 text-slate-500 text-[10px] font-bold uppercase tracking-wider border-b border-slate-200">
                            <tr>
                              <th className="px-5 py-3">Employee</th>
                              <th className="px-5 py-3">Punch In</th>
                              <th className="px-5 py-3">Punch Out</th>
                              <th className="px-5 py-3">Hours</th>
                              <th className="px-5 py-3 text-center">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200">
                            {teamAttendances.length === 0 ? (
                              <tr>
                                <td colSpan={5} className="px-5 py-8 text-center text-slate-400 text-xs font-medium">
                                  No punches logged by team members for chosen date.
                                </td>
                              </tr>
                            ) : (
                              teamAttendances.map((log) => (
                                <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                                  <td className="px-5 py-3.5">
                                    <div className="font-semibold text-slate-950">{log.user?.name}</div>
                                    <div className="text-xs text-slate-400 font-mono mt-0.5">{log.user?.employeeId} &bull; {log.user?.designation?.name}</div>
                                  </td>
                                  <td className="px-5 py-3.5 font-mono text-xs text-slate-600">{log.punchIn || '--:--:--'}</td>
                                  <td className="px-5 py-3.5 font-mono text-xs text-slate-600">{log.punchOut || '--:--:--'}</td>
                                  <td className="px-5 py-3.5 font-semibold text-slate-800">{log.workingHours || 0.0} hrs</td>
                                  <td className="px-5 py-3.5 text-center">
                                    <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold border ${
                                      log.status === 'PRESENT' ? 'bg-green-50 text-green-700 border-green-100' :
                                      log.status === 'ABSENT' ? 'bg-red-50 text-red-700 border-red-100' :
                                      log.status === 'HALF_DAY' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                                      'bg-blue-50 text-blue-700 border-blue-100'
                                    }`}>
                                      {log.status}
                                    </span>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* --- TEAM LIST TAB --- */}
                {activeTab === 'team' && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-xl font-bold tracking-tight text-slate-900">My Reporting Team Directory</h2>
                      <p className="text-xs text-slate-500 mt-1">Employee dossier listing for your department bounds</p>
                    </div>

                    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex">
                      <div className="relative flex-1">
                        <Filter className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 w-4 h-4" />
                        <input
                          type="text"
                          placeholder="Type employee name..."
                          value={teamSearch}
                          onChange={(e) => setTeamSearch(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-md outline-none text-xs bg-slate-50 text-slate-800"
                        />
                      </div>
                    </div>

                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 text-[10px] font-bold uppercase tracking-wider border-b border-slate-200">
                          <tr>
                            <th className="px-5 py-3">Employee</th>
                            <th className="px-5 py-3">Email / Phone</th>
                            <th className="px-5 py-3">Designation</th>
                            <th className="px-5 py-3">Joining Date</th>
                            <th className="px-5 py-3">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {teamEmployees.filter(emp => emp.name.toLowerCase().includes(teamSearch.toLowerCase())).length === 0 ? (
                            <tr>
                              <td colSpan={5} className="px-5 py-8 text-center text-slate-400 text-xs font-medium">
                                No team members matched query.
                              </td>
                            </tr>
                          ) : (
                            teamEmployees.filter(emp => emp.name.toLowerCase().includes(teamSearch.toLowerCase())).map((emp) => (
                              <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-5 py-3.5">
                                  <div className="font-semibold text-slate-950">{emp.name}</div>
                                  <div className="text-xs text-slate-400 font-mono mt-0.5">{emp.employeeId}</div>
                                </td>
                                <td className="px-5 py-3.5 font-mono text-xs text-slate-600">
                                  <div>{emp.email}</div>
                                  <div className="text-slate-400 mt-0.5">{emp.mobile || 'No Mobile'}</div>
                                </td>
                                <td className="px-5 py-3.5 text-slate-700 font-medium">{emp.designation?.name || 'N/A'}</td>
                                <td className="px-5 py-3.5 text-slate-500 font-medium">{emp.joiningDate}</td>
                                <td className="px-5 py-3.5">
                                  <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold border ${emp.status === 'ACTIVE' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-slate-100 border-slate-200'}`}>
                                    {emp.status}
                                  </span>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* --- TEAM LEAVES TAB --- */}
                {activeTab === 'leaves' && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-xl font-bold tracking-tight text-slate-900">Review Team Leave Requests</h2>
                      <p className="text-xs text-slate-500 mt-1">Grant or deny team leaves securely</p>
                    </div>

                    {/* Status filter tabs */}
                    <div className="flex border-b border-slate-200 gap-1 overflow-x-auto pb-1">
                      {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map((status) => {
                        const count = status === 'ALL' 
                          ? teamLeaves.length 
                          : teamLeaves.filter(l => l.status === status).length;
                        return (
                          <button
                            key={status}
                            type="button"
                            onClick={() => setLeaveStatusFilter(status)}
                            className={`py-2 px-3.5 border-b-2 font-medium text-xs transition-all relative flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                              leaveStatusFilter === status
                                ? 'border-slate-900 text-slate-900 font-semibold'
                                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                            }`}
                          >
                            <span className="capitalize">{status.toLowerCase()}</span>
                            {count > 0 && (
                              <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded-full text-[10px] font-bold border border-slate-200">
                                {count}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    <div className="space-y-4">
                      {teamLeaves.filter(l => leaveStatusFilter === 'ALL' || l.status === leaveStatusFilter).length === 0 ? (
                        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400 text-xs font-medium">
                          No {leaveStatusFilter === 'ALL' ? '' : leaveStatusFilter.toLowerCase() + ' '}team leaves found.
                        </div>
                      ) : (
                        teamLeaves
                          .filter(l => leaveStatusFilter === 'ALL' || l.status === leaveStatusFilter)
                          .map((leave) => (
                          <div key={leave.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col md:flex-row justify-between gap-4">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-900 text-sm">{leave.user?.name}</span>
                                <span className="text-xs text-slate-400 font-mono">({leave.user?.employeeId})</span>
                                <span className="text-[10px] text-slate-500 font-semibold bg-slate-100 px-2 py-0.5 rounded border border-slate-200">{leave.user?.designation?.name}</span>
                              </div>
                              <div className="text-xs text-slate-700 font-medium">
                                Wants <strong className="font-semibold text-slate-900 uppercase">{leave.leaveType.replace('_', ' ')}</strong> from{' '}
                                <strong className="font-semibold text-slate-900">{leave.startDate}</strong> to <strong className="font-semibold text-slate-900">{leave.endDate}</strong>
                              </div>
                              <div className="text-xs text-slate-500">
                                Remarks: "{leave.remarks || 'No notes left by applicant.'}"
                              </div>
                              {leave.managerRemarks && (
                                <div className="text-xs bg-slate-50 p-2.5 border border-slate-200 rounded-md text-slate-600 mt-2">
                                  <span className="font-bold block text-slate-700">Approver Notes:</span>
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
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => setLeaveRemarksModal({ open: true, leave, action: 'approve' })}
                                    className="bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs px-3 py-1.5 rounded-md flex items-center gap-1 cursor-pointer transition"
                                  >
                                    <Check className="w-3.5 h-3.5" /> Approve
                                  </button>
                                  <button
                                    onClick={() => setLeaveRemarksModal({ open: true, leave, action: 'reject' })}
                                    className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold text-xs px-3 py-1.5 rounded-md flex items-center gap-1 cursor-pointer transition shadow-sm"
                                  >
                                    <X className="w-3.5 h-3.5 text-slate-500" /> Reject
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* --- TEAM REPORTS TAB --- */}
                {activeTab === 'reports' && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-xl font-bold tracking-tight text-slate-900">Compile Team Attendance Reports</h2>
                      <p className="text-xs text-slate-500 mt-1">Download dynamic spreadsheet matrices representing team service logs</p>
                    </div>

                    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm max-w-xl">
                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Adjust Month Target</label>
                          <input
                            type="month"
                            value={reportMonth}
                            onChange={(e) => setReportMonth(e.target.value)}
                            className="w-full border border-slate-200 rounded-md px-3.5 py-2 text-xs bg-slate-50 font-medium outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
                          />
                        </div>

                        <div className="pt-4 space-y-2.5">
                          <button
                            onClick={() => handleDownloadTeamReport('excel')}
                            disabled={operationLoading}
                            className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs py-2.5 rounded-md flex items-center justify-center gap-2 cursor-pointer border border-slate-200 transition"
                          >
                            <Download className="w-4 h-4 text-slate-700" /> Download MS Excel Sheet
                          </button>
                          <button
                            onClick={() => handleDownloadTeamReport('pdf')}
                            disabled={operationLoading}
                            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs py-2.5 rounded-md flex items-center justify-center gap-2 cursor-pointer transition"
                          >
                            <Download className="w-4 h-4" /> Download PDF Document
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

              </motion.div>
            </AnimatePresence>
          )}
        </main>
      </div>

      {/* Leave Approval Modal */}
      {leaveRemarksModal.open && (
        <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center p-4 z-50 backdrop-blur-xs">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-xl border border-slate-200 w-full max-w-sm overflow-hidden shadow-sm"
          >
            <div className="px-5 py-4 bg-white border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider text-slate-500">
                {leaveRemarksModal.action === 'approve' ? 'Approve Team Leave' : 'Reject Team Leave'}
              </h3>
              <button onClick={() => setLeaveRemarksModal({ open: false })} className="text-slate-400 hover:text-slate-950 transition cursor-pointer">
                <XCircle className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleReviewLeave} className="p-5 space-y-4">
              <div className="text-xs text-slate-600">
                Decision remarks for <span className="font-bold text-slate-800">{leaveRemarksModal.leave?.user?.name}</span>'s leave:
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Remarks / Reasoning</label>
                <textarea
                  required
                  name="managerRemarks"
                  placeholder="Explain approval or rejection context..."
                  className="w-full border border-slate-200 rounded-md px-3.5 py-2 text-xs bg-slate-50 font-medium outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
                  rows={3}
                ></textarea>
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  className={`flex-1 text-white font-semibold text-xs py-2 px-4 rounded-md transition cursor-pointer ${
                    leaveRemarksModal.action === 'approve' ? 'bg-slate-900 hover:bg-slate-800' : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  Save Decision
                </button>
                <button
                  type="button"
                  onClick={() => setLeaveRemarksModal({ open: false })}
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
