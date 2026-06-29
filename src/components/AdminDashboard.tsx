import React, { useState, useEffect } from 'react';
import { apiRequest } from '../lib/api-client';
import { 
  exportToExcel, exportToPDF,
  exportMonthlyRegisterToExcel, exportMonthlyRegisterToPDF,
  exportCompanyWideToExcel, exportCompanyWideToPDF
} from '../lib/reports-export';
import { 
  HydratedUser, HydratedAttendance, HydratedLeaveRequest, Department, Designation, CompanySettings,
  Role, EmployeeStatus, AttendanceStatus, LeaveType, LeaveStatus
} from '../types';
import { 
  Users, UserCheck, UserMinus, CalendarClock, Download, Upload, Search, Plus, Edit, Trash, LockKeyhole,
  CheckCircle, XCircle, Settings, ShieldAlert, FileText, ChevronRight, Filter, AlertCircle, RefreshCw, LogOut, Check, X,
  FolderTree, Briefcase, Eye, EyeOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AdminDashboardProps {
  currentUser: HydratedUser;
  onLogout: () => void;
}

export default function AdminDashboard({ currentUser, onLogout }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'employees' | 'attendance' | 'leaves' | 'reports' | 'settings' | 'departments'>('overview');
  
  // Database States
  const [employees, setEmployees] = useState<HydratedUser[]>([]);
  const [attendances, setAttendances] = useState<HydratedAttendance[]>([]);
  const [leaves, setLeaves] = useState<HydratedLeaveRequest[]>([]);
  const [leaveStatusFilter, setLeaveStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [settings, setSettings] = useState<CompanySettings | null>(null);

  // New Department & Designation States
  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptDesc, setNewDeptDesc] = useState('');
  const [newDesgName, setNewDesgName] = useState('');
  const [newDesgDesc, setNewDesgDesc] = useState('');

  // Stats
  const [stats, setStats] = useState({
    totalEmployees: 0,
    presentToday: 0,
    absentToday: 0,
    onLeaveToday: 0
  });
  const [todayLogs, setTodayLogs] = useState<HydratedAttendance[]>([]);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);

  // Loading & Operations States
  const [loading, setLoading] = useState(true);
  const [operationLoading, setOperationLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modal States
  const [employeeModal, setEmployeeModal] = useState<{ open: boolean; user?: HydratedUser }>({ open: false });
  const [selectedDeptId, setSelectedDeptId] = useState<string>('');
  const [showPass, setShowPass] = useState(false);
  const [showPassReset, setShowPassReset] = useState(false);
  const [passwordResetModal, setPasswordResetModal] = useState<{ open: boolean; userId?: string; userName?: string }>({ open: false });
  const [manualAttendanceModal, setManualAttendanceModal] = useState<{ open: boolean; record?: HydratedAttendance }>({ open: false });
  const [manualStatus, setManualStatus] = useState<AttendanceStatus>('PRESENT');
  const [manualPunchIn, setManualPunchIn] = useState<string>('09:00');
  const [manualPunchOut, setManualPunchOut] = useState<string>('18:00');
  const [leaveRemarksModal, setLeaveRemarksModal] = useState<{ open: boolean; leave?: HydratedLeaveRequest; action?: 'approve' | 'reject' }>({ open: false });

  // Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    open: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  const triggerConfirm = (title: string, message: string, onConfirm: () => void) => {
    setConfirmModal({
      open: true,
      title,
      message,
      onConfirm: () => {
        onConfirm();
        setConfirmModal({ open: false, title: '', message: '', onConfirm: () => {} });
      }
    });
  };

  // Filters
  const [empSearch, setEmpSearch] = useState('');
  const [empDeptFilter, setEmpDeptFilter] = useState('');
  const [attEmpFilter, setAttEmpFilter] = useState('');
  const [attDateFilter, setAttDateFilter] = useState(new Date().toLocaleDateString('en-CA'));
  const [attDeptFilter, setAttDeptFilter] = useState('');
  
  // Reports Filter
  const [reportType, setReportType] = useState<'daily' | 'monthly_employee' | 'monthly_company' | 'department' | 'employee'>('daily');
  const [reportDate, setReportDate] = useState(new Date().toLocaleDateString('en-CA'));
  const [reportMonth, setReportMonth] = useState('2026-06');
  const [reportDeptId, setReportDeptId] = useState('');
  const [reportEmpId, setReportEmpId] = useState('');
  const [reportFromDate, setReportFromDate] = useState('2026-06-01');
  const [reportToDate, setReportToDate] = useState('2026-06-30');

  // Fetch all initial data
  const loadAllData = async () => {
    setLoading(true);
    try {
      const todayStr = new Date().toLocaleDateString('en-CA');
      const statsRes = await apiRequest<{ stats: any; todayLogs: any[]; recentActivities: any[] }>(`/api/dashboard/stats?date=${todayStr}`);
      setStats(statsRes.stats);
      setTodayLogs(statsRes.todayLogs);
      setRecentActivities(statsRes.recentActivities);

      const empsRes = await apiRequest<HydratedUser[]>('/api/employees');
      setEmployees(empsRes);

      const deptsRes = await apiRequest<Department[]>('/api/departments');
      setDepartments(deptsRes);

      const desgsRes = await apiRequest<Designation[]>('/api/designations');
      setDesignations(desgsRes);

      const leavesRes = await apiRequest<HydratedLeaveRequest[]>('/api/leaves');
      setLeaves(leavesRes);

      const attRes = await apiRequest<HydratedAttendance[]>(`/api/attendance?date=${todayStr}`);
      setAttendances(attRes);

      const settingsRes = await apiRequest<CompanySettings>('/api/settings');
      setSettings(settingsRes);
    } catch (err: any) {
      showMsg('error', err.message || 'Failed to load system datasets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, [activeTab]);

  useEffect(() => {
    if (manualAttendanceModal.open) {
      if (manualAttendanceModal.record) {
        setManualStatus(manualAttendanceModal.record.status);
        setManualPunchIn(manualAttendanceModal.record.punchIn?.substring(0, 5) || '09:00');
        setManualPunchOut(manualAttendanceModal.record.punchOut?.substring(0, 5) || '18:00');
      } else {
        setManualStatus('PRESENT');
        setManualPunchIn('09:00');
        setManualPunchOut('18:00');
      }
    }
  }, [manualAttendanceModal]);

  const showMsg = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const openEmployeeModal = (user?: HydratedUser) => {
    setSelectedDeptId(user?.departmentId || '');
    setShowPass(false);
    setEmployeeModal({ open: true, user });
  };

  const openPasswordResetModal = (userId: string, userName: string) => {
    setShowPassReset(false);
    setPasswordResetModal({ open: true, userId, userName });
  };

  // --- CRUD EMPLOYEE ---
  const handleSaveEmployee = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setOperationLoading(true);
    const formData = new FormData(e.currentTarget);
    const empData: any = {
      employeeId: formData.get('employeeId'),
      name: formData.get('name'),
      email: formData.get('email'),
      mobile: formData.get('mobile'),
      role: formData.get('role'),
      status: formData.get('status'),
      departmentId: formData.get('departmentId') || undefined,
      designationId: formData.get('designationId') || undefined,
      managerId: formData.get('managerId') || undefined,
    };

    const isEdit = !!employeeModal.user;
    const url = isEdit ? `/api/employees/${employeeModal.user?.id}` : '/api/employees';
    const method = isEdit ? 'PUT' : 'POST';

    if (!isEdit) {
      empData.password = formData.get('password') || 'employee123';
    }

    let finalDeptId = empData.departmentId;
    if (empData.departmentId === 'NEW_CUSTOM') {
      const newName = formData.get('newDepartmentName')?.toString().trim();
      if (!newName) {
        showMsg('error', 'New department name is required');
        setOperationLoading(false);
        return;
      }
      try {
        const createdDept = await apiRequest<{ id: string; name: string }>('/api/departments', 'POST', {
          name: newName,
          description: 'Added via employee registration'
        });
        finalDeptId = createdDept.id;
      } catch (err: any) {
        const existing = departments.find(d => d.name.toLowerCase() === newName.toLowerCase());
        if (existing) {
          finalDeptId = existing.id;
        } else {
          showMsg('error', err.message || 'Failed to create new department');
          setOperationLoading(false);
          return;
        }
      }
    }
    empData.departmentId = finalDeptId || undefined;

    try {
      await apiRequest(url, method, empData);
      showMsg('success', `Employee profile ${isEdit ? 'updated' : 'registered'} successfully.`);
      setEmployeeModal({ open: false });
      loadAllData();
    } catch (err: any) {
      showMsg('error', err.message || 'Failed to save employee profile');
    } finally {
      setOperationLoading(false);
    }
  };

  const handleDeleteEmployee = (id: string, name: string) => {
    triggerConfirm(
      'Delete Employee Profile',
      `Are you absolutely sure you want to completely delete employee ${name}? All attendance logs and leave requests will be purged.`,
      async () => {
        try {
          await apiRequest(`/api/employees/${id}`, 'DELETE');
          showMsg('success', `${name} has been removed from organization directory.`);
          loadAllData();
        } catch (err: any) {
          showMsg('error', err.message || 'Deletion failed');
        }
      }
    );
  };

  const handleAddDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeptName.trim()) return;
    setOperationLoading(true);
    try {
      await apiRequest('/api/departments', 'POST', { name: newDeptName.trim(), description: newDeptDesc.trim() || undefined });
      showMsg('success', `Department "${newDeptName}" created successfully.`);
      setNewDeptName('');
      setNewDeptDesc('');
      loadAllData();
    } catch (err: any) {
      showMsg('error', err.message || 'Failed to create department');
    } finally {
      setOperationLoading(false);
    }
  };

  const handleDeleteDepartment = (id: string, name: string) => {
    triggerConfirm(
      'Delete Department',
      `Are you sure you want to delete the department "${name}"? Any employees currently assigned to this department will be set to "No Department".`,
      async () => {
        setOperationLoading(true);
        try {
          await apiRequest(`/api/departments/${id}`, 'DELETE');
          showMsg('success', `Department "${name}" deleted successfully.`);
          loadAllData();
        } catch (err: any) {
          showMsg('error', err.message || 'Failed to delete department');
        } finally {
          setOperationLoading(false);
        }
      }
    );
  };

  const handleAddDesignation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDesgName.trim()) return;
    setOperationLoading(true);
    try {
      await apiRequest('/api/designations', 'POST', { name: newDesgName.trim(), description: newDesgDesc.trim() || undefined });
      showMsg('success', `Designation/Role "${newDesgName}" created successfully.`);
      setNewDesgName('');
      setNewDesgDesc('');
      loadAllData();
    } catch (err: any) {
      showMsg('error', err.message || 'Failed to create designation');
    } finally {
      setOperationLoading(false);
    }
  };

  const handleDeleteDesignation = (id: string, name: string) => {
    triggerConfirm(
      'Delete Designation',
      `Are you sure you want to delete the designation "${name}"? Any employees currently assigned to this designation will be set to "No Designation".`,
      async () => {
        setOperationLoading(true);
        try {
          await apiRequest(`/api/designations/${id}`, 'DELETE');
          showMsg('success', `Designation "${name}" deleted successfully.`);
          loadAllData();
        } catch (err: any) {
          showMsg('error', err.message || 'Failed to delete designation');
        } finally {
          setOperationLoading(false);
        }
      }
    );
  };

  const handleResetPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setOperationLoading(true);
    const formData = new FormData(e.currentTarget);
    const newPass = formData.get('newPassword') as string;
    const userId = passwordResetModal.userId;

    try {
      await apiRequest(`/api/employees/${userId}/reset-password`, 'POST', { password: newPass });
      showMsg('success', 'Security password updated successfully.');
      setPasswordResetModal({ open: false });
    } catch (err: any) {
      showMsg('error', err.message || 'Password update failed');
    } finally {
      setOperationLoading(false);
    }
  };

  // --- CRUD ATTENDANCE ---
  const handleSaveManualAttendance = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setOperationLoading(true);
    const formData = new FormData(e.currentTarget);
    const isAbsentOrLeave = manualStatus === 'ABSENT' || manualStatus === 'LEAVE';
    const manualData = {
      userId: (formData.get('userId') as string) || manualAttendanceModal.record?.userId || '',
      date: (formData.get('date') as string) || manualAttendanceModal.record?.date || '',
      punchIn: isAbsentOrLeave ? undefined : (formData.get('punchIn') as string || undefined),
      punchOut: isAbsentOrLeave ? undefined : (formData.get('punchOut') as string || undefined),
      status: manualStatus,
      remarks: formData.get('remarks') as string,
    };

    try {
      await apiRequest('/api/attendance/manual', 'POST', manualData);
      showMsg('success', 'Attendance roster record updated successfully.');
      setManualAttendanceModal({ open: false });
      // Fetch fresh attendances for filter date
      const attRes = await apiRequest<HydratedAttendance[]>(`/api/attendance?date=${attDateFilter}`);
      setAttendances(attRes);
    } catch (err: any) {
      showMsg('error', err.message || 'Failed to register manual entry');
    } finally {
      setOperationLoading(false);
    }
  };

  const handleDeleteAttendance = (id: string, date: string, name: string) => {
    triggerConfirm(
      'Remove Attendance Record',
      `Remove attendance record for ${name} on ${date}?`,
      async () => {
        try {
          await apiRequest(`/api/attendance/${id}`, 'DELETE');
          showMsg('success', 'Roster record removed.');
          const attRes = await apiRequest<HydratedAttendance[]>(`/api/attendance?date=${attDateFilter}`);
          setAttendances(attRes);
        } catch (err: any) {
          showMsg('error', err.message || 'Deletion failed');
        }
      }
    );
  };

  // --- LEAVE ACTIONS ---
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
      showMsg('success', `Leave request has been ${action.toLowerCase()}.`);
      setLeaveRemarksModal({ open: false });
      loadAllData();
    } catch (err: any) {
      showMsg('error', err.message || 'Leave status modification failed');
    } finally {
      setOperationLoading(false);
    }
  };

  // --- SETTINGS SAVE ---
  const handleSaveSettings = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setOperationLoading(true);
    const formData = new FormData(e.currentTarget);
    const updatedSettings = {
      companyName: formData.get('companyName') as string,
      officeStartTime: formData.get('officeStartTime') as string,
      officeEndTime: formData.get('officeEndTime') as string,
      graceTimeMinutes: parseInt(formData.get('graceTimeMinutes') as string) || 0,
      halfDayHours: parseFloat(formData.get('halfDayHours') as string) || 4.0,
    };

    try {
      const updated = await apiRequest<CompanySettings>('/api/settings', 'PUT', updatedSettings);
      setSettings(updated);
      showMsg('success', 'Global system parameters saved.');
    } catch (err: any) {
      showMsg('error', err.message || 'Failed to save settings');
    } finally {
      setOperationLoading(false);
    }
  };

  // Reset database helper
  const handleResetDbToSeed = () => {
    triggerConfirm(
      'Restore Database to Seed State',
      'This will restore the workspace database back to standard eTimeOffice seeds (20 active logs, clean departments, past 14 days attendance). Proceed?',
      async () => {
        setOperationLoading(true);
        try {
          await apiRequest('/api/seed/reset', 'POST');
          showMsg('success', 'Roster database successfully restored to pristine seed state!');
          loadAllData();
        } catch (err: any) {
          showMsg('error', 'Reset trigger failed.');
        } finally {
          setOperationLoading(false);
        }
      }
    );
  };

  const handleDownloadBackup = async () => {
    setOperationLoading(true);
    try {
      const data = await apiRequest<any>('/api/system/export', 'GET');
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `etimeoffice_backup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showMsg('success', 'Database backup downloaded successfully!');
    } catch (err: any) {
      showMsg('error', 'Failed to download backup: ' + (err.message || err));
    } finally {
      setOperationLoading(false);
    }
  };

  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const backup = JSON.parse(event.target?.result as string);
        if (!backup || !Array.isArray(backup.users)) {
          showMsg('error', 'Invalid backup format. Must be a valid JSON file containing users.');
          return;
        }
        
        triggerConfirm(
          'Restore Database Backup',
          `Are you sure you want to restore this backup file? It will replace all current users, attendances, leaves, and settings with ${backup.users.length} users from the file.`,
          async () => {
            setOperationLoading(true);
            try {
              const res = await apiRequest<{ success: boolean; message?: string }>('/api/system/restore', 'POST', backup);
              if (res.success) {
                // Also update local copy in browser so we keep it in sync
                localStorage.setItem('arke_db_backup', JSON.stringify(backup));
                showMsg('success', res.message || 'Database state restored successfully!');
                setTimeout(() => {
                  window.location.reload();
                }, 1500);
              }
            } catch (err: any) {
              showMsg('error', 'Failed to restore backup: ' + (err.message || err));
            } finally {
              setOperationLoading(false);
            }
          }
        );
      } catch (err: any) {
        showMsg('error', 'Failed to parse JSON backup file: ' + (err.message || err));
      }
    };
    reader.readAsText(file);
    // Clear input value so same file can be imported again
    e.target.value = '';
  };

  // --- REPORTS DYNAMIC CALCULATIONS & DUMP ---
  const handleDownloadReport = async (format: 'pdf' | 'excel') => {
    setOperationLoading(true);
    try {
      let url = '/api/attendance?';
      let title = '';
      let subtitle = '';
      let targetUser: HydratedUser | undefined;

      if (reportType === 'daily') {
        url += `date=${reportDate}`;
        title = `Daily Attendance Sheet`;
        subtitle = `Date: ${reportDate}`;
        if (reportDeptId) {
          url += `&departmentId=${reportDeptId}`;
          const dName = departments.find(d => d.id === reportDeptId)?.name || '';
          subtitle += ` | Dept: ${dName}`;
        }
      } else if (reportType === 'monthly_employee') {
        if (!reportEmpId) {
          showMsg('error', 'Please pick an employee.');
          setOperationLoading(false);
          return;
        }
        if (!reportMonth) {
          showMsg('error', 'Please pick a target month.');
          setOperationLoading(false);
          return;
        }
        url += `userId=${reportEmpId}&month=${reportMonth}`;
        const emp = employees.find(e => e.id === reportEmpId);
        if (!emp) {
          showMsg('error', 'Employee not found.');
          setOperationLoading(false);
          return;
        }
        const companyName = settings?.companyName || 'Soching Education';
        const reportLogs = await apiRequest<HydratedAttendance[]>(url);
        if (format === 'excel') {
          await exportMonthlyRegisterToExcel(companyName, reportMonth, emp, reportLogs);
        } else {
          exportMonthlyRegisterToPDF(companyName, reportMonth, emp, reportLogs);
        }
        setOperationLoading(false);
        return;
      } else if (reportType === 'monthly_company') {
        if (!reportMonth) {
          showMsg('error', 'Please pick a target month.');
          setOperationLoading(false);
          return;
        }
        url += `month=${reportMonth}`;
        if (reportDeptId) {
          url += `&departmentId=${reportDeptId}`;
        }
        const companyName = settings?.companyName || 'Soching Education';
        const deptName = reportDeptId ? departments.find(d => d.id === reportDeptId)?.name : undefined;
        const filteredEmployees = reportDeptId ? employees.filter(e => e.departmentId === reportDeptId) : employees;
        const reportLogs = await apiRequest<HydratedAttendance[]>(url);
        if (format === 'excel') {
          await exportCompanyWideToExcel(companyName, reportMonth, filteredEmployees, reportLogs, deptName);
        } else {
          exportCompanyWideToPDF(companyName, reportMonth, filteredEmployees, reportLogs, deptName);
        }
        setOperationLoading(false);
        return;
      } else if (reportType === 'department') {
        if (!reportDeptId) {
          showMsg('error', 'Please pick a department.');
          setOperationLoading(false);
          return;
        }
        url += `departmentId=${reportDeptId}`;
        const dName = departments.find(d => d.id === reportDeptId)?.name || '';
        title = `${dName} Roster Summary`;
        subtitle = `All-Time Logs`;
      } else if (reportType === 'employee') {
        if (!reportEmpId) {
          showMsg('error', 'Please pick an employee.');
          setOperationLoading(false);
          return;
        }
        url += `userId=${reportEmpId}&fromDate=${reportFromDate}&toDate=${reportToDate}`;
        targetUser = employees.find(e => e.id === reportEmpId);
        title = `Employee Dossier Sheet`;
        subtitle = `Period: ${reportFromDate} to ${reportToDate}`;
      }

      const reportLogs = await apiRequest<HydratedAttendance[]>(url);

      if (reportLogs.length === 0) {
        showMsg('error', 'No attendance data discovered for chosen report filters.');
        return;
      }

      if (format === 'excel') {
        await exportToExcel(title, subtitle, reportLogs, targetUser);
      } else {
        exportToPDF(title, subtitle, reportLogs, targetUser);
      }
    } catch (err: any) {
      showMsg('error', 'Failed generating downloadable ledger.');
    } finally {
      setOperationLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      
      {/* Top Bar Header */}
      <header className="bg-white text-slate-900 h-16 flex items-center justify-between px-6 shrink-0 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-white font-bold text-base">
            E
          </div>
          <div>
            <span className="font-bold tracking-tight text-base text-slate-900">eTimeOffice+</span>
            <span className="text-[10px] bg-slate-100 text-slate-800 font-semibold uppercase px-1.5 py-0.5 rounded ml-2">Console</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <div className="text-xs font-semibold text-slate-800">{currentUser.name}</div>
            <div className="text-[10px] text-slate-400 font-bold uppercase">Administrator</div>
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
        <aside className="w-64 bg-white border-r border-slate-200 hidden md:flex flex-col p-4 space-y-1 justify-between shrink-0">
          <div className="space-y-1">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-3">Core Operation</div>
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
              onClick={() => setActiveTab('employees')}
              className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2.5 transition cursor-pointer ${
                activeTab === 'employees' ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Users className="w-4 h-4" />
              Employee Directory
            </button>
            <button
              onClick={() => setActiveTab('attendance')}
              className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2.5 transition cursor-pointer ${
                activeTab === 'attendance' ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <CalendarClock className="w-4 h-4" />
              Attendance Ledger
            </button>
            <button
              onClick={() => setActiveTab('leaves')}
              className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2.5 transition cursor-pointer ${
                activeTab === 'leaves' ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <ShieldAlert className="w-4 h-4" />
              Leave Applications
              {leaves.filter(l => l.status === 'PENDING').length > 0 && (
                <span className="ml-auto bg-slate-200 text-slate-800 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {leaves.filter(l => l.status === 'PENDING').length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('reports')}
              className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2.5 transition cursor-pointer ${
                activeTab === 'reports' ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <FileText className="w-4 h-4" />
              Exportable Reports
            </button>

            <div className="h-px bg-slate-200 my-4"></div>
            
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-3">Administration</div>
            <button
              onClick={() => setActiveTab('departments')}
              className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2.5 transition cursor-pointer mb-1 ${
                activeTab === 'departments' ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <FolderTree className="w-4 h-4 text-slate-500" />
              Departments & Roles
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2.5 transition cursor-pointer ${
                activeTab === 'settings' ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Settings className="w-4 h-4" />
              Office Parameters
            </button>
          </div>
        </aside>

        {/* Main Workspace Frame */}
        <main className="flex-1 overflow-y-auto p-6">
          {message && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-3 rounded-lg text-sm font-medium mb-4 flex items-center gap-2 shadow-sm border ${
                message.type === 'success' 
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                  : 'bg-red-50 border-red-200 text-red-800'
              }`}
            >
              <AlertCircle className="w-4 h-4 text-emerald-600" />
              {message.text}
            </motion.div>
          )}

          {loading ? (
            <div className="h-64 flex flex-col items-center justify-center gap-3">
              <div className="w-6 h-6 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Retrieving HRMS records...</span>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.15 }}
              >
                
                {/* --- OVERVIEW TAB --- */}
                {activeTab === 'overview' && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-xl font-bold tracking-tight text-slate-900">System Dashboard</h2>
                      <p className="text-xs text-slate-500 mt-1">Live indicators for {new Date().toLocaleDateString()}</p>
                    </div>

                    {/* Stats Panel */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                        <div className="w-10 h-10 bg-slate-100 text-slate-900 rounded-lg flex items-center justify-center">
                          <Users className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Total Headcount</div>
                          <div className="text-2xl font-bold text-slate-900 mt-0.5">{stats.totalEmployees}</div>
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
                          <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">On Leave Today</div>
                          <div className="text-2xl font-bold text-orange-500 mt-0.5">{stats.onLeaveToday}</div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                      
                      {/* Today's Log Matrix */}
                      <div className="xl:col-span-2 bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
                          <div>
                            <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider text-slate-500">Today's Attendance Matrix</h3>
                            <p className="text-xs text-slate-400 mt-1">Real-time punch records from terminal</p>
                          </div>
                          <button 
                            onClick={() => setActiveTab('attendance')}
                            className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1 cursor-pointer transition"
                          >
                            Go to Ledger
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-500 text-[10px] font-bold uppercase tracking-wider border-b border-slate-200">
                              <tr>
                                <th className="px-5 py-3">Employee</th>
                                <th className="px-5 py-3">Punch In</th>
                                <th className="px-5 py-3">Punch Out</th>
                                <th className="px-5 py-3 text-center">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                              {todayLogs.length === 0 ? (
                                <tr>
                                  <td colSpan={4} className="px-5 py-8 text-center text-slate-400 text-xs font-medium">
                                    No employee punches documented yet today.
                                  </td>
                                </tr>
                              ) : (
                                todayLogs.map((log) => (
                                  <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-5 py-3.5">
                                      <div className="font-semibold text-slate-950">{log.user?.name}</div>
                                      <div className="text-xs text-slate-400 font-mono mt-0.5">{log.user?.employeeId} &bull; {log.user?.department?.name}</div>
                                    </td>
                                    <td className="px-5 py-3.5 font-mono text-xs text-slate-600">{log.punchIn || '--:--:--'}</td>
                                    <td className="px-5 py-3.5 font-mono text-xs text-slate-600">{log.punchOut || '--:--:--'}</td>
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

                      {/* Recent Activities Feed */}
                      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm flex flex-col">
                        <div className="p-5 border-b border-slate-200">
                          <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider text-slate-500">Roster Activities Feed</h3>
                          <p className="text-xs text-slate-400 mt-1">Live operational events audit trail</p>
                        </div>
                        <div className="p-5 space-y-4 flex-1 overflow-y-auto max-h-[350px]">
                          {recentActivities.length === 0 ? (
                            <div className="text-center text-slate-400 text-xs py-8 font-medium">
                              No recent activities registered.
                            </div>
                          ) : (
                            recentActivities.map((act) => (
                              <div key={act.id} className="flex gap-3 text-xs leading-relaxed">
                                <div className="shrink-0 mt-1">
                                  {act.type === 'LEAVE' ? (
                                    <div className="w-1.5 h-1.5 rounded-full bg-slate-400"></div>
                                  ) : (
                                    <div className="w-1.5 h-1.5 rounded-full bg-slate-900"></div>
                                  )}
                                </div>
                                <div className="space-y-1">
                                  <div className="text-slate-700">
                                    <strong className="font-semibold text-slate-900">{act.user?.name}</strong>: {act.description}
                                  </div>
                                  <div className="text-[10px] text-slate-400 font-mono">
                                    {new Date(act.time).toLocaleString()}
                                  </div>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                    </div>
                  </div>
                )}

                {/* --- EMPLOYEES DIRECTORY TAB --- */}
                {activeTab === 'employees' && (
                  <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <h2 className="text-xl font-bold text-slate-900">Employee Directory</h2>
                        <p className="text-xs text-slate-500 mt-1">Manage digital dossiers, roles and password parameters</p>
                      </div>
                      <button
                        onClick={() => openEmployeeModal()}
                        className="bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs px-4 py-2.5 rounded-lg flex items-center gap-2 shadow-sm transition-all shrink-0 cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        Add New Employee
                      </button>
                    </div>

                    {/* Filter / Search Bar */}
                    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col md:flex-row gap-3">
                      <div className="relative flex-1">
                        <Search className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 w-4 h-4" />
                        <input
                          type="text"
                          placeholder="Search profile name, ID, or email..."
                          value={empSearch}
                          onChange={(e) => setEmpSearch(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 outline-none text-xs focus:border-slate-900 focus:ring-1 focus:ring-slate-100 placeholder-slate-400"
                        />
                      </div>
                      <select
                        value={empDeptFilter}
                        onChange={(e) => setEmpDeptFilter(e.target.value)}
                        className="border border-slate-200 rounded-lg px-3 py-2 text-xs bg-white outline-none focus:border-slate-900"
                      >
                        <option value="">All Departments</option>
                        {departments.map(d => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Employees Table Grid */}
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                          <thead className="bg-slate-50 text-slate-500 text-[10px] font-bold uppercase tracking-wider border-b border-slate-200">
                            <tr>
                              <th className="px-5 py-3">Employee Details</th>
                              <th className="px-5 py-3">Department & Designation</th>
                              <th className="px-5 py-3">Role</th>
                              <th className="px-5 py-3">Manager Assigned</th>
                              <th className="px-5 py-3">Status</th>
                              <th className="px-5 py-3 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200">
                            {employees.filter(emp => {
                              const matchSearch = emp.name.toLowerCase().includes(empSearch.toLowerCase()) || 
                                                  emp.employeeId.toLowerCase().includes(empSearch.toLowerCase()) ||
                                                  emp.email.toLowerCase().includes(empSearch.toLowerCase());
                              const matchDept = empDeptFilter ? emp.departmentId === empDeptFilter : true;
                              return matchSearch && matchDept;
                            }).length === 0 ? (
                              <tr>
                                <td colSpan={6} className="px-5 py-8 text-center text-slate-400 text-xs font-medium">
                                  No employees matching criteria discovered.
                                </td>
                              </tr>
                            ) : (
                              employees.filter(emp => {
                                const matchSearch = emp.name.toLowerCase().includes(empSearch.toLowerCase()) || 
                                                    emp.employeeId.toLowerCase().includes(empSearch.toLowerCase()) ||
                                                    emp.email.toLowerCase().includes(empSearch.toLowerCase());
                                  const matchDept = empDeptFilter ? emp.departmentId === empDeptFilter : true;
                                  return matchSearch && matchDept;
                                }).map((emp) => (
                                  <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-5 py-3.5">
                                      <div className="font-bold text-slate-900">{emp.name}</div>
                                      <div className="text-xs text-slate-400 font-mono mt-0.5">{emp.employeeId} &bull; {emp.email}</div>
                                      <div className="text-[10px] text-slate-400 mt-1">Joined: {emp.joiningDate}</div>
                                    </td>
                                    <td className="px-5 py-3.5">
                                      <div className="font-medium text-slate-700">{emp.department?.name || 'N/A'}</div>
                                      <div className="text-xs text-slate-500 mt-0.5">{emp.designation?.name || 'N/A'}</div>
                                    </td>
                                    <td className="px-5 py-3.5">
                                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${
                                        emp.role === 'ADMIN' ? 'bg-red-50 text-red-700 border-red-100' :
                                        emp.role === 'MANAGER' ? 'bg-slate-100 text-slate-800 border-slate-200' :
                                        'bg-slate-50 text-slate-600 border-slate-200'
                                      }`}>
                                        {emp.role}
                                      </span>
                                    </td>
                                    <td className="px-5 py-3.5 text-slate-600 font-medium text-xs">
                                      {emp.manager?.name || <span className="text-slate-400 italic">None</span>}
                                    </td>
                                    <td className="px-5 py-3.5">
                                      <div className="flex items-center gap-1.5">
                                        <span className={`inline-block w-1.5 h-1.5 rounded-full ${emp.status === 'ACTIVE' ? 'bg-green-500' : 'bg-slate-300'}`}></span>
                                        <span className="text-xs font-semibold text-slate-700 uppercase">{emp.status}</span>
                                      </div>
                                    </td>
                                    <td className="px-5 py-3.5 text-right space-x-1.5 whitespace-nowrap">
                                      <button
                                        onClick={() => openPasswordResetModal(emp.id, emp.name)}
                                        title="Reset Password"
                                        className="p-1.5 rounded-md border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition cursor-pointer inline-block"
                                      >
                                        <LockKeyhole className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        onClick={() => openEmployeeModal(emp)}
                                        title="Edit Employee"
                                        className="p-1.5 rounded-md border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition cursor-pointer inline-block"
                                      >
                                        <Edit className="w-3.5 h-3.5" />
                                      </button>
                                      {emp.id !== currentUser.id && (
                                        <button
                                          onClick={() => handleDeleteEmployee(emp.id, emp.name)}
                                          title="Delete Employee"
                                          className="p-1.5 rounded-md border border-slate-200 text-slate-400 hover:text-red-600 hover:bg-slate-50 transition cursor-pointer inline-block"
                                        >
                                          <Trash className="w-3.5 h-3.5" />
                                        </button>
                                      )}
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

                {/* --- ATTENDANCE LEDGER TAB --- */}
                {activeTab === 'attendance' && (
                  <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <h2 className="text-xl font-bold text-slate-900">Attendance Ledger</h2>
                        <p className="text-xs text-slate-500 mt-1">Edit punches, view work timelines, manual entries</p>
                      </div>
                      <button
                        onClick={() => setManualAttendanceModal({ open: true })}
                        className="bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs px-4 py-2.5 rounded-lg flex items-center gap-2 shadow-sm transition shrink-0 cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        Manual Punch Override
                      </button>
                    </div>

                    {/* Filters block */}
                    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
                      <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                        <Filter className="w-3.5 h-3.5" />
                        Filter Roster Dataset
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Target Roster Date</label>
                          <input
                            type="date"
                            value={attDateFilter}
                            onChange={async (e) => {
                              setAttDateFilter(e.target.value);
                              const res = await apiRequest<HydratedAttendance[]>(`/api/attendance?date=${e.target.value}`);
                              setAttendances(res);
                            }}
                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs bg-white outline-none focus:border-slate-900"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Employee Name Search</label>
                          <input
                            type="text"
                            placeholder="Type employee name..."
                            value={attEmpFilter}
                            onChange={(e) => setAttEmpFilter(e.target.value)}
                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs bg-white outline-none focus:border-slate-900 placeholder-slate-400"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Filter Department</label>
                          <select
                            value={attDeptFilter}
                            onChange={(e) => setAttDeptFilter(e.target.value)}
                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs bg-white outline-none focus:border-slate-900"
                          >
                            <option value="">All Departments</option>
                            {departments.map(d => (
                              <option key={d.id} value={d.id}>{d.name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="flex items-end">
                          <button
                            onClick={async () => {
                              setAttEmpFilter('');
                              setAttDeptFilter('');
                              const today = new Date().toLocaleDateString('en-CA');
                              setAttDateFilter(today);
                              const res = await apiRequest<HydratedAttendance[]>(`/api/attendance?date=${today}`);
                              setAttendances(res);
                            }}
                            className="w-full text-center border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs py-2 rounded-lg transition cursor-pointer"
                          >
                            Reset Roster Filters
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Attendance Table */}
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                          <thead className="bg-slate-50 text-slate-500 text-[10px] font-bold uppercase tracking-wider border-b border-slate-200">
                            <tr>
                              <th className="px-5 py-3">Employee</th>
                              <th className="px-5 py-3">Punch In</th>
                              <th className="px-5 py-3">Punch Out</th>
                              <th className="px-5 py-3 text-center">Service Hours</th>
                              <th className="px-5 py-3 text-center">Late Minute</th>
                              <th className="px-5 py-3 text-center">Roster Status</th>
                              <th className="px-5 py-3">Remarks</th>
                              <th className="px-5 py-3 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200">
                            {attendances.filter(log => {
                              const matchName = log.user?.name.toLowerCase().includes(attEmpFilter.toLowerCase());
                              const matchDept = attDeptFilter ? log.user?.departmentId === attDeptFilter : true;
                              return matchName && matchDept;
                            }).length === 0 ? (
                              <tr>
                                <td colSpan={8} className="px-5 py-8 text-center text-slate-400 text-xs font-medium">
                                  No attendance logs documented for chosen parameters.
                                </td>
                              </tr>
                            ) : (
                              attendances.filter(log => {
                                const matchName = log.user?.name.toLowerCase().includes(attEmpFilter.toLowerCase());
                                const matchDept = attDeptFilter ? log.user?.departmentId === attDeptFilter : true;
                                return matchName && matchDept;
                              }).map((log) => (
                                <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                                  <td className="px-5 py-3.5">
                                    <div className="font-bold text-slate-900">{log.user?.name}</div>
                                    <div className="text-xs text-slate-400 font-mono mt-0.5">{log.user?.employeeId} &bull; {log.user?.department?.name}</div>
                                  </td>
                                  <td className="px-5 py-3.5 font-mono text-xs text-slate-600">{log.punchIn || '--:--:--'}</td>
                                  <td className="px-5 py-3.5 font-mono text-xs text-slate-600">{log.punchOut || '--:--:--'}</td>
                                  <td className="px-5 py-3.5 text-center font-semibold text-slate-700 text-xs">{log.workingHours || 0.0} hrs</td>
                                  <td className="px-5 py-3.5 text-center font-mono text-xs">
                                    {log.late > 0 ? (
                                      <span className="text-amber-600 font-semibold">{log.late} min</span>
                                    ) : (
                                      <span className="text-slate-400">On Time</span>
                                    )}
                                  </td>
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
                                  <td className="px-5 py-3.5 text-slate-500 max-w-[150px] truncate text-xs">{log.remarks || '-'}</td>
                                  <td className="px-5 py-3.5 text-right space-x-1 whitespace-nowrap">
                                    <button
                                      onClick={() => setManualAttendanceModal({ open: true, record: log })}
                                      className="p-1.5 rounded-md border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition inline-block cursor-pointer"
                                    >
                                      <Edit className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteAttendance(log.id, log.date, log.user?.name || '')}
                                      className="p-1.5 rounded-md border border-slate-200 text-slate-400 hover:text-red-600 hover:bg-slate-50 transition inline-block cursor-pointer"
                                    >
                                      <Trash className="w-3.5 h-3.5" />
                                    </button>
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

                {/* --- LEAVE MANAGEMENT TAB --- */}
                {activeTab === 'leaves' && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-xl font-bold text-slate-900">Leave Applications</h2>
                      <p className="text-xs text-slate-500 mt-1">Approve, reject, or comment on employee leave submissions</p>
                    </div>

                    {/* Status filter tabs */}
                    <div className="flex border-b border-slate-200 gap-1 overflow-x-auto pb-1">
                      {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map((status) => {
                        const count = status === 'ALL' 
                          ? leaves.length 
                          : leaves.filter(l => l.status === status).length;
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

                    <div className="grid grid-cols-1 gap-4">
                      {leaves.filter(l => leaveStatusFilter === 'ALL' || l.status === leaveStatusFilter).length === 0 ? (
                        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400 text-xs font-semibold">
                          No {leaveStatusFilter === 'ALL' ? '' : leaveStatusFilter.toLowerCase() + ' '}leave applications found.
                        </div>
                      ) : (
                        leaves
                          .filter(l => leaveStatusFilter === 'ALL' || l.status === leaveStatusFilter)
                          .map((leave) => (
                          <div key={leave.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col md:flex-row justify-between gap-4 hover:shadow-md transition-colors">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-900 text-sm">{leave.user?.name}</span>
                                <span className="text-xs text-slate-400 font-mono">({leave.user?.employeeId})</span>
                                <span className="text-[10px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded font-bold border border-slate-200">{leave.user?.department?.name}</span>
                              </div>
                              <div className="text-xs text-slate-700">
                                Requested <strong className="font-semibold text-slate-900 uppercase">{leave.leaveType.replace('_', ' ')}</strong> from{' '}
                                <strong className="font-semibold text-slate-900">{leave.startDate}</strong> to <strong className="font-semibold text-slate-900">{leave.endDate}</strong>
                              </div>
                              <div className="text-xs text-slate-400 italic">
                                " {leave.remarks || 'No notes left by applicant.'} "
                              </div>
                              {leave.managerRemarks && (
                                <div className="text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-slate-600 mt-2">
                                  <span className="font-bold block text-slate-800">Approver Notes:</span>
                                  {leave.managerRemarks}
                                </div>
                              )}
                            </div>

                            <div className="flex flex-col justify-between items-end shrink-0 gap-3">
                              <span className={`inline-block px-3 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                                leave.status === 'APPROVED' ? 'bg-green-50 text-green-700 border-green-100' :
                                leave.status === 'REJECTED' ? 'bg-red-50 text-red-700 border-red-100' :
                                'bg-amber-50 text-amber-700 border-amber-100 animate-pulse'
                              }`}>
                                {leave.status}
                              </span>

                              {leave.status === 'PENDING' && (
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => setLeaveRemarksModal({ open: true, leave, action: 'approve' })}
                                    className="bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs px-3 py-1.5 rounded-md flex items-center gap-1 transition-all cursor-pointer"
                                  >
                                    <Check className="w-3.5 h-3.5" /> Approve
                                  </button>
                                  <button
                                    onClick={() => setLeaveRemarksModal({ open: true, leave, action: 'reject' })}
                                    className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-semibold text-xs px-3 py-1.5 rounded-md flex items-center gap-1 transition-all cursor-pointer"
                                  >
                                    <X className="w-3.5 h-3.5 text-slate-400" /> Reject
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

                {/* --- REPORTS GENERATION TAB --- */}
                {activeTab === 'reports' && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-xl font-bold text-slate-900">Dynamic Reports Engine</h2>
                      <p className="text-xs text-slate-500 mt-1">Configure report criteria and compile high quality Excel/PDF sheets instantly</p>
                    </div>

                    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        
                        {/* Configuration box */}
                        <div className="space-y-4">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">1. Choose Report Format</label>
                            <div className="grid grid-cols-2 gap-2">
                              <button
                                type="button"
                                onClick={() => setReportType('daily')}
                                className={`py-2.5 px-4 rounded-lg border text-xs font-semibold transition text-left cursor-pointer ${
                                  reportType === 'daily' ? 'border-slate-900 bg-slate-50 text-slate-950' : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                                }`}
                              >
                                Daily Roster Sheet
                              </button>
                              <button
                                type="button"
                                onClick={() => setReportType('monthly_employee')}
                                className={`py-2.5 px-4 rounded-lg border text-xs font-semibold transition text-left cursor-pointer ${
                                  reportType === 'monthly_employee' ? 'border-slate-900 bg-slate-50 text-slate-950' : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                                }`}
                              >
                                Monthly Attendance Register
                              </button>
                              <button
                                type="button"
                                onClick={() => setReportType('monthly_company')}
                                className={`py-2.5 px-4 rounded-lg border text-xs font-semibold transition text-left cursor-pointer ${
                                  reportType === 'monthly_company' ? 'border-slate-900 bg-slate-50 text-slate-950' : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                                }`}
                              >
                                Company-Wide Monthly Matrix
                              </button>
                              <button
                                type="button"
                                onClick={() => setReportType('department')}
                                className={`py-2.5 px-4 rounded-lg border text-xs font-semibold transition text-left cursor-pointer ${
                                  reportType === 'department' ? 'border-slate-900 bg-slate-50 text-slate-950' : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                                }`}
                              >
                                Department Roster Summary
                              </button>
                              <button
                                type="button"
                                onClick={() => setReportType('employee')}
                                className={`py-2.5 px-4 rounded-lg border text-xs font-semibold transition text-left cursor-pointer ${
                                  reportType === 'employee' ? 'border-slate-900 bg-slate-50 text-slate-950' : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                                }`}
                              >
                                Individual Employee Dossier
                              </button>
                            </div>
                          </div>

                          <div className="border-t border-slate-100 pt-4 space-y-3">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">2. Adjust Filters</label>
                            
                            {reportType === 'daily' && (
                              <div>
                                <label className="block text-xs text-slate-500 mb-1">Target Date</label>
                                <input
                                  type="date"
                                  value={reportDate}
                                  onChange={(e) => setReportDate(e.target.value)}
                                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none bg-white focus:border-slate-900"
                                />
                              </div>
                            )}

                            {(reportType === 'monthly_employee' || reportType === 'monthly_company') && (
                              <div>
                                <label className="block text-xs text-slate-500 mb-1">Target Month</label>
                                <input
                                  type="month"
                                  value={reportMonth}
                                  onChange={(e) => setReportMonth(e.target.value)}
                                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none bg-white focus:border-slate-900"
                                />
                              </div>
                            )}

                            {reportType === 'monthly_employee' && (
                              <div>
                                <label className="block text-xs text-slate-500 mb-1">Select Employee Profile</label>
                                <select
                                  value={reportEmpId}
                                  onChange={(e) => setReportEmpId(e.target.value)}
                                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none bg-white focus:border-slate-900"
                                >
                                  <option value="">-- Choose Profile --</option>
                                  {employees.map(e => (
                                    <option key={e.id} value={e.id}>{e.name} ({e.employeeId})</option>
                                  ))}
                                </select>
                              </div>
                            )}

                            {(reportType === 'daily' || reportType === 'monthly_company' || reportType === 'department') && (
                              <div>
                                <label className="block text-xs text-slate-500 mb-1">
                                  {reportType === 'department' ? 'Department' : 'Department (Optional)'}
                                </label>
                                <select
                                  value={reportDeptId}
                                  onChange={(e) => setReportDeptId(e.target.value)}
                                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none bg-white focus:border-slate-900"
                                >
                                  {reportType !== 'department' && <option value="">All Departments</option>}
                                  {reportType === 'department' && <option value="">-- Choose Department --</option>}
                                  {departments.map(d => (
                                    <option key={d.id} value={d.id}>{d.name}</option>
                                  ))}
                                </select>
                              </div>
                            )}

                            {reportType === 'employee' && (
                              <div className="space-y-3">
                                <div>
                                  <label className="block text-xs text-slate-500 mb-1">Select Employee Profile</label>
                                  <select
                                    value={reportEmpId}
                                    onChange={(e) => setReportEmpId(e.target.value)}
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none bg-white focus:border-slate-900"
                                  >
                                    <option value="">-- Choose Profile --</option>
                                    {employees.map(e => (
                                      <option key={e.id} value={e.id}>{e.name} ({e.employeeId})</option>
                                    ))}
                                  </select>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <label className="block text-xs text-slate-500 mb-1">From Date</label>
                                    <input
                                      type="date"
                                      value={reportFromDate}
                                      onChange={(e) => setReportFromDate(e.target.value)}
                                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none bg-white focus:border-slate-900"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs text-slate-500 mb-1">To Date</label>
                                    <input
                                      type="date"
                                      value={reportToDate}
                                      onChange={(e) => setReportToDate(e.target.value)}
                                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none bg-white focus:border-slate-900"
                                    />
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Export trigger box */}
                        <div className="bg-slate-50 rounded-xl p-6 border border-slate-200 flex flex-col justify-between space-y-6">
                          <div>
                            <h4 className="font-bold text-slate-900 text-sm uppercase tracking-wider text-slate-500 mb-2">Build & Export</h4>
                            <p className="text-xs text-slate-400 leading-relaxed mt-1">
                              Your export will compile real-time workspace records and generate beautifully formatted spreadsheets and document structures including summary indicators, service totals, late tallies, and stamp areas.
                            </p>
                          </div>

                          <div className="space-y-2">
                            <button
                              type="button"
                              onClick={() => handleDownloadReport('excel')}
                              disabled={operationLoading}
                              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg text-xs py-2.5 flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                            >
                              <Download className="w-4 h-4 text-emerald-400" /> Download MS Excel Sheet
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDownloadReport('pdf')}
                              disabled={operationLoading}
                              className="w-full bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 font-semibold rounded-lg text-xs py-2.5 flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                            >
                              <Download className="w-4 h-4 text-slate-400" /> Download PDF Document
                            </button>
                          </div>
                        </div>

                      </div>
                    </div>
                  </div>
                )}

                {/* --- SETTINGS TAB --- */}
                {activeTab === 'settings' && settings && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-xl font-bold text-slate-900">Office Parameters Settings</h2>
                      <p className="text-xs text-slate-500 mt-1">Configure global grace periods, starting times, and attendance schedules</p>
                    </div>

                    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm max-w-xl">
                      <form onSubmit={handleSaveSettings} className="space-y-5">
                        <div className="grid grid-cols-1 gap-4">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Company Legal Name</label>
                            <input
                              type="text"
                              required
                              name="companyName"
                              defaultValue={settings.companyName}
                              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-slate-900 bg-white"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Office Start Time</label>
                              <input
                                type="time"
                                required
                                name="officeStartTime"
                                defaultValue={settings.officeStartTime}
                                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-slate-900 bg-white"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Office End Time</label>
                              <input
                                type="time"
                                required
                                name="officeEndTime"
                                defaultValue={settings.officeEndTime}
                                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-slate-900 bg-white"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Grace Period (Minutes)</label>
                              <input
                                type="number"
                                required
                                name="graceTimeMinutes"
                                defaultValue={settings.graceTimeMinutes}
                                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-slate-900 bg-white"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Half-Day Threshold (Hours)</label>
                              <input
                                type="number"
                                step="0.5"
                                required
                                name="halfDayHours"
                                defaultValue={settings.halfDayHours}
                                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-slate-900 bg-white"
                              />
                            </div>
                          </div>
                        </div>

                        <button
                          type="submit"
                          disabled={operationLoading}
                          className="bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs px-4 py-2.5 rounded-lg shadow-sm transition cursor-pointer"
                        >
                          Save Parameters
                        </button>
                      </form>
                    </div>

                    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm max-w-xl">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                          <ShieldAlert className="w-4 h-4 text-slate-500" />
                          System Backup & Disaster Recovery
                        </h3>
                        <p className="text-[11px] text-slate-500 mt-1">
                          Export your database to a JSON file on your desktop, or restore a backup file to instantly recover all employees and attendance sheets.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                        <button
                          onClick={handleDownloadBackup}
                          disabled={operationLoading}
                          className="flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-900 font-semibold text-xs px-4 py-2.5 rounded-lg border border-slate-200 transition cursor-pointer disabled:opacity-50"
                        >
                          <Download className="w-4 h-4 text-slate-600" /> Export DB Backup
                        </button>
                        
                        <label className="flex items-center justify-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs px-4 py-2.5 rounded-lg shadow-sm transition cursor-pointer text-center disabled:opacity-50">
                          <Upload className="w-4 h-4" /> Import DB Backup
                          <input
                            type="file"
                            accept=".json"
                            disabled={operationLoading}
                            onChange={handleImportBackup}
                            className="hidden"
                          />
                        </label>
                      </div>

                      <div className="border-t border-slate-100 pt-4 mt-4">
                        <button
                          onClick={handleResetDbToSeed}
                          disabled={operationLoading}
                          className="flex items-center justify-center gap-1.5 text-red-600 hover:text-red-700 font-semibold text-[11px] hover:underline cursor-pointer disabled:opacity-50"
                        >
                          <RefreshCw className="w-3.5 h-3.5" /> Revert Database to Clean Seed State
                        </button>
                      </div>
                    </div>

                  </div>
                )}

                {/* --- DEPARTMENTS & ROLES TAB --- */}
                {activeTab === 'departments' && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-xl font-bold text-slate-900">Departments & Organizational Roles</h2>
                      <p className="text-xs text-slate-500 mt-1">Structure the company's hierarchy and departments. Admin has full authority to manage these at any time.</p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      
                      {/* DEPARTMENTS CARD */}
                      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col space-y-6">
                        <div>
                          <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                            <FolderTree className="w-4 h-4 text-slate-500" />
                            Departments Manager
                          </h3>
                          <p className="text-[11px] text-slate-400">Add or remove departments within the organization.</p>
                        </div>

                        {/* Add Department Form */}
                        <form onSubmit={handleAddDepartment} className="bg-slate-50 rounded-lg p-4 border border-slate-200/50 space-y-3">
                          <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Create Department</h4>
                          <div className="space-y-2">
                            <input
                              type="text"
                              required
                              placeholder="Department Name (e.g., Engineering)"
                              value={newDeptName}
                              onChange={(e) => setNewDeptName(e.target.value)}
                              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-slate-900 bg-white"
                            />
                            <input
                              type="text"
                              placeholder="Brief Description (optional)"
                              value={newDeptDesc}
                              onChange={(e) => setNewDeptDesc(e.target.value)}
                              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-slate-900 bg-white"
                            />
                          </div>
                          <button
                            type="submit"
                            disabled={operationLoading || !newDeptName.trim()}
                            className="w-full bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-semibold text-xs py-2 rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Add Department
                          </button>
                        </form>

                        {/* Departments List */}
                        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                          <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active Departments ({departments.length})</h4>
                          {departments.length === 0 ? (
                            <div className="text-center py-6 text-xs text-slate-400 border border-dashed border-slate-200 rounded-lg">No departments configured.</div>
                          ) : (
                            departments.map((dept) => {
                              const count = employees.filter(e => e.departmentId === dept.id).length;
                              return (
                                <div key={dept.id} className="flex items-start justify-between p-3 rounded-lg border border-slate-100 hover:border-slate-200 transition group bg-slate-50/30">
                                  <div className="space-y-0.5">
                                    <h5 className="font-semibold text-xs text-slate-800">{dept.name}</h5>
                                    {dept.description && <p className="text-[10px] text-slate-400 line-clamp-1">{dept.description}</p>}
                                    <span className="inline-block bg-slate-100 text-slate-600 text-[9px] font-medium px-1.5 py-0.5 rounded-full mt-1">
                                      {count} {count === 1 ? 'employee' : 'employees'}
                                    </span>
                                  </div>
                                  <button
                                    onClick={() => handleDeleteDepartment(dept.id, dept.name)}
                                    className="p-1.5 text-slate-400 hover:text-red-600 rounded hover:bg-red-50 transition cursor-pointer"
                                    title="Delete Department"
                                  >
                                    <Trash className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>

                      {/* DESIGNATIONS CARD */}
                      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col space-y-6">
                        <div>
                          <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                            <Briefcase className="w-4 h-4 text-slate-500" />
                            Designations & Roles Manager
                          </h3>
                          <p className="text-[11px] text-slate-400">Add or remove titles/roles for your staff.</p>
                        </div>

                        {/* Add Designation Form */}
                        <form onSubmit={handleAddDesignation} className="bg-slate-50 rounded-lg p-4 border border-slate-200/50 space-y-3">
                          <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Create Role / Designation</h4>
                          <div className="space-y-2">
                            <input
                              type="text"
                              required
                              placeholder="Designation Title (e.g., Senior Engineer)"
                              value={newDesgName}
                              onChange={(e) => setNewDesgName(e.target.value)}
                              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-slate-900 bg-white"
                            />
                            <input
                              type="text"
                              placeholder="Brief Description (optional)"
                              value={newDesgDesc}
                              onChange={(e) => setNewDesgDesc(e.target.value)}
                              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-slate-900 bg-white"
                            />
                          </div>
                          <button
                            type="submit"
                            disabled={operationLoading || !newDesgName.trim()}
                            className="w-full bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-semibold text-xs py-2 rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Add Role / Designation
                          </button>
                        </form>

                        {/* Designations List */}
                        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                          <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active Roles ({designations.length})</h4>
                          {designations.length === 0 ? (
                            <div className="text-center py-6 text-xs text-slate-400 border border-dashed border-slate-200 rounded-lg">No roles configured.</div>
                          ) : (
                            designations.map((desg) => {
                              const count = employees.filter(e => e.designationId === desg.id).length;
                              return (
                                <div key={desg.id} className="flex items-start justify-between p-3 rounded-lg border border-slate-100 hover:border-slate-200 transition group bg-slate-50/30">
                                  <div className="space-y-0.5">
                                    <h5 className="font-semibold text-xs text-slate-800">{desg.name}</h5>
                                    {desg.description && <p className="text-[10px] text-slate-400 line-clamp-1">{desg.description}</p>}
                                    <span className="inline-block bg-slate-100 text-slate-600 text-[9px] font-medium px-1.5 py-0.5 rounded-full mt-1">
                                      {count} {count === 1 ? 'employee' : 'employees'}
                                    </span>
                                  </div>
                                  <button
                                    onClick={() => handleDeleteDesignation(desg.id, desg.name)}
                                    className="p-1.5 text-slate-400 hover:text-red-600 rounded hover:bg-red-50 transition cursor-pointer"
                                    title="Delete Role"
                                  >
                                    <Trash className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              );
                            })
                          )}
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

      {/* --- MODAL DIALOGS --- */}

      {/* Employee Add/Edit Dialog */}
      {employeeModal.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl border border-slate-200 w-full max-w-lg overflow-hidden shadow-2xl"
          >
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-lg">{employeeModal.user ? 'Edit Employee Profile' : 'Register New Employee'}</h3>
              <button onClick={() => setEmployeeModal({ open: false })} className="text-slate-400 hover:text-white transition">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveEmployee} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Employee ID</label>
                  <input
                    type="text"
                    required
                    name="employeeId"
                    placeholder="EMP025"
                    disabled={!!employeeModal.user}
                    defaultValue={employeeModal.user?.employeeId}
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    name="name"
                    placeholder="Jane Doe"
                    defaultValue={employeeModal.user?.name}
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    name="email"
                    placeholder="jane@company.com"
                    defaultValue={employeeModal.user?.email}
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Mobile Line</label>
                  <input
                    type="text"
                    name="mobile"
                    placeholder="+1 (555) 012-3456"
                    defaultValue={employeeModal.user?.mobile}
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Department</label>
                  <select
                    name="departmentId"
                    value={selectedDeptId}
                    onChange={(e) => setSelectedDeptId(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm outline-none bg-white font-medium"
                  >
                    <option value="">-- Choose Dept --</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                    <option value="NEW_CUSTOM">+ Write Custom Department (Not Listed)</option>
                  </select>
                  {selectedDeptId === 'NEW_CUSTOM' && (
                    <div className="mt-2.5">
                      <label className="block text-[11px] font-bold text-blue-600 uppercase mb-1">New Department Name</label>
                      <input
                        type="text"
                        name="newDepartmentName"
                        required
                        placeholder="e.g. Editing, Social Media"
                        className="w-full border border-blue-200 rounded-xl px-3 py-1.5 text-xs outline-none focus:border-blue-500 bg-blue-50/15 font-medium"
                      />
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Designation</label>
                  <select
                    name="designationId"
                    defaultValue={employeeModal.user?.designationId || ''}
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm outline-none bg-white"
                  >
                    <option value="">-- Choose Desg --</option>
                    {designations.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Role Assigned</label>
                  <select
                    name="role"
                    defaultValue={employeeModal.user?.role || 'EMPLOYEE'}
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm outline-none bg-white"
                  >
                    <option value="EMPLOYEE">Employee</option>
                    <option value="MANAGER">Manager / Approver</option>
                    <option value="ADMIN">System Administrator</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Operational Status</label>
                  <select
                    name="status"
                    defaultValue={employeeModal.user?.status || 'ACTIVE'}
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm outline-none bg-white"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Direct Manager</label>
                <select
                  name="managerId"
                  defaultValue={employeeModal.user?.managerId || ''}
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm outline-none bg-white"
                >
                  <option value="">-- None --</option>
                  {employees.filter(e => e.role === 'MANAGER' || e.role === 'ADMIN').map(mgr => (
                    <option key={mgr.id} value={mgr.id}>{mgr.name} ({mgr.role})</option>
                  ))}
                </select>
              </div>

              {!employeeModal.user && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Initial Password</label>
                  <div className="relative">
                    <input
                      type={showPass ? "text" : "password"}
                      name="password"
                      defaultValue="employee123"
                      className="w-full border border-slate-200 rounded-xl pl-3.5 pr-10 py-2 text-sm outline-none focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(!showPass)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <button
                  type="submit"
                  disabled={operationLoading}
                  className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm py-2.5 rounded-xl transition"
                >
                  {employeeModal.user ? 'Update Profile' : 'Register Profile'}
                </button>
                <button
                  type="button"
                  onClick={() => setEmployeeModal({ open: false })}
                  className="flex-1 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-sm py-2.5 rounded-xl transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Manual Attendance Override Modal */}
      {manualAttendanceModal.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl border border-slate-200 w-full max-w-md overflow-hidden shadow-2xl"
          >
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-lg">{manualAttendanceModal.record ? 'Edit Attendance Log' : 'Manual Attendance Override'}</h3>
              <button onClick={() => setManualAttendanceModal({ open: false })} className="text-slate-400 hover:text-white transition">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveManualAttendance} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Select Employee</label>
                <select
                  required
                  name="userId"
                  disabled={!!manualAttendanceModal.record}
                  defaultValue={manualAttendanceModal.record?.userId || ''}
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm outline-none bg-white"
                >
                  <option value="">-- Pick Employee --</option>
                  {employees.map(e => (
                    <option key={e.id} value={e.id}>{e.name} ({e.employeeId})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Roster Date</label>
                  <input
                    type="date"
                    required
                    name="date"
                    disabled={!!manualAttendanceModal.record}
                    defaultValue={manualAttendanceModal.record?.date || new Date().toLocaleDateString('en-CA')}
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Status</label>
                  <select
                    name="status"
                    value={manualStatus}
                    onChange={(e) => setManualStatus(e.target.value as AttendanceStatus)}
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm outline-none bg-white font-semibold text-slate-800"
                  >
                    <option value="PRESENT">Present</option>
                    <option value="ABSENT">Absent</option>
                    <option value="HALF_DAY">Half Day</option>
                    <option value="LEAVE">Leave</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Punch In Time</label>
                  <input
                    type="time"
                    name="punchIn"
                    disabled={manualStatus === 'ABSENT' || manualStatus === 'LEAVE'}
                    value={(manualStatus === 'ABSENT' || manualStatus === 'LEAVE') ? '' : manualPunchIn}
                    onChange={(e) => setManualPunchIn(e.target.value)}
                    className={`w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm outline-none focus:border-blue-500 ${(manualStatus === 'ABSENT' || manualStatus === 'LEAVE') ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-white'}`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Punch Out Time</label>
                  <input
                    type="time"
                    name="punchOut"
                    disabled={manualStatus === 'ABSENT' || manualStatus === 'LEAVE'}
                    value={(manualStatus === 'ABSENT' || manualStatus === 'LEAVE') ? '' : manualPunchOut}
                    onChange={(e) => setManualPunchOut(e.target.value)}
                    className={`w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm outline-none focus:border-blue-500 ${(manualStatus === 'ABSENT' || manualStatus === 'LEAVE') ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-white'}`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Override Reason / Remarks</label>
                <textarea
                  name="remarks"
                  placeholder="e.g. Forgot tag, client meeting, remote duty"
                  defaultValue={manualAttendanceModal.record?.remarks || ''}
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm outline-none focus:border-blue-500"
                  rows={2}
                ></textarea>
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  type="submit"
                  disabled={operationLoading}
                  className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm py-2.5 rounded-xl transition"
                >
                  Save Log Record
                </button>
                <button
                  type="button"
                  onClick={() => setManualAttendanceModal({ open: false })}
                  className="flex-1 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-sm py-2.5 rounded-xl transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Leave Approval Remarks Modal */}
      {leaveRemarksModal.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl border border-slate-200 w-full max-w-sm overflow-hidden shadow-2xl"
          >
            <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-base uppercase tracking-wide">
                {leaveRemarksModal.action === 'approve' ? 'Approve Leave Request' : 'Reject Leave Request'}
              </h3>
              <button onClick={() => setLeaveRemarksModal({ open: false })} className="text-slate-400 hover:text-white transition">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleReviewLeave} className="p-5 space-y-4">
              <div className="text-xs text-slate-600 font-medium">
                Reviewing leave filed by <span className="font-bold text-slate-800">{leaveRemarksModal.leave?.user?.name}</span>
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Remarks / Note</label>
                <textarea
                  required
                  name="managerRemarks"
                  placeholder="Add approval comment or reason for rejection..."
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm outline-none focus:border-blue-500"
                  rows={3}
                ></textarea>
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={operationLoading}
                  className={`flex-1 text-white font-semibold text-sm py-2.5 rounded-xl transition ${
                    leaveRemarksModal.action === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-500 hover:bg-red-600'
                  }`}
                >
                  Confirm Decision
                </button>
                <button
                  type="button"
                  onClick={() => setLeaveRemarksModal({ open: false })}
                  className="flex-1 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-sm py-2.5 rounded-xl transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Password Reset Modal */}
      {passwordResetModal.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl border border-slate-200 w-full max-w-sm overflow-hidden shadow-2xl"
          >
            <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-base">Reset Employee Password</h3>
              <button onClick={() => setPasswordResetModal({ open: false })} className="text-slate-400 hover:text-white transition">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleResetPassword} className="p-5 space-y-4">
              <div className="text-xs text-slate-600">
                You are updating password for <strong className="text-slate-800">{passwordResetModal.userName}</strong>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1.5">New Account Password</label>
                <div className="relative">
                  <input
                    type={showPassReset ? "text" : "password"}
                    required
                    name="newPassword"
                    placeholder="Min 4 characters"
                    className="w-full border border-slate-200 rounded-xl pl-3.5 pr-10 py-2 text-sm outline-none focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassReset(!showPassReset)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassReset ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={operationLoading}
                  className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm py-2.5 rounded-xl transition"
                >
                  Update Password
                </button>
                <button
                  type="button"
                  onClick={() => setPasswordResetModal({ open: false })}
                  className="flex-1 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-sm py-2.5 rounded-xl transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Custom Confirmation Modal */}
      {confirmModal.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[999]">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl border border-slate-200 w-full max-w-md overflow-hidden shadow-2xl"
          >
            <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-base flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-500" />
                {confirmModal.title}
              </h3>
              <button 
                onClick={() => setConfirmModal({ open: false, title: '', message: '', onConfirm: () => {} })} 
                className="text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-5">
              <p className="text-sm text-slate-600 leading-relaxed">{confirmModal.message}</p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={confirmModal.onConfirm}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold text-sm py-2.5 rounded-xl transition cursor-pointer"
                >
                  Confirm
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmModal({ open: false, title: '', message: '', onConfirm: () => {} })}
                  className="flex-1 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-sm py-2.5 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

    </div>
  );
}
