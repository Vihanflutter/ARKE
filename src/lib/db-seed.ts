import { User, Department, Designation, Attendance, LeaveRequest, CompanySettings } from '../types';

export function getSeedData() {
  const departments: Department[] = [
    { id: 'dept-eng', name: 'Engineering', description: 'Software Development and IT infrastructure', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
    { id: 'dept-hr', name: 'Human Resources', description: 'Recruitment, Talent and Culture', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
    { id: 'dept-mkt', name: 'Marketing', description: 'Product Marketing, SEO, and Brand', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
    { id: 'dept-sales', name: 'Sales & Business Development', description: 'Inbound and Outbound sales', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
    { id: 'dept-editing', name: 'Editing', description: 'Video, audio, and content editing team', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
    { id: 'dept-smm', name: 'Social Media Managers', description: 'Social media growth and campaigns', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
    { id: 'dept-dm', name: 'Digital Marketing', description: 'Online advertising and digital growth', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
    { id: 'dept-tech', name: 'Tech Team', description: 'Technical operations, development, and support', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  ];

  const designations: Designation[] = [
    { id: 'desg-admin', name: 'HR Director / Administrator', description: 'System Admin and Operations', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
    { id: 'desg-mgr', name: 'Department Manager', description: 'Leads team and reviews leaves', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
    { id: 'desg-se', name: 'Senior Software Engineer', description: 'Full stack development', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
    { id: 'desg-qa', name: 'Quality Assurance Engineer', description: 'Testing and automation', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
    { id: 'desg-assoc', name: 'Operations Associate', description: 'Day to day support', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  ];

  const companySettings: CompanySettings = {
    id: 'settings-global',
    companyName: 'Arke',
    officeStartTime: '09:00',
    officeEndTime: '18:00',
    graceTimeMinutes: 15,
    halfDayHours: 4.0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };

  const users: User[] = [
    // Admin
    {
      id: 'usr-admin',
      employeeId: 'EMP001',
      name: 'Alexander Pierce',
      email: 'admin@etimeoffice.com',
      mobile: '+1 (555) 019-2834',
      password: 'admin123', // Clean, simple authentication
      role: 'ADMIN',
      status: 'ACTIVE',
      joiningDate: '2025-01-15',
      createdAt: '2025-01-15T09:00:00.000Z',
      updatedAt: '2025-01-15T09:00:00.000Z',
    },
  ];

  const attendances: Attendance[] = [];
  const leaveRequests: LeaveRequest[] = [];

  return {
    users,
    departments,
    designations,
    attendances,
    leaveRequests,
    companySettings,
  };
}
