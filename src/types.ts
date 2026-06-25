export type Role = 'ADMIN' | 'MANAGER' | 'EMPLOYEE';

export type EmployeeStatus = 'ACTIVE' | 'INACTIVE';

export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'HALF_DAY' | 'LEAVE';

export type LeaveType = 'CASUAL_LEAVE' | 'SICK_LEAVE' | 'EARNED_LEAVE' | 'HALF_DAY';

export type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface User {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  mobile?: string;
  password?: string; // Stored hashed or plain for simple auth simulation
  role: Role;
  status: EmployeeStatus;
  joiningDate: string; // YYYY-MM-DD or ISO
  departmentId?: string;
  designationId?: string;
  managerId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Department {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Designation {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Attendance {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  punchIn?: string; // HH:MM:SS
  punchOut?: string; // HH:MM:SS
  workingHours: number;
  status: AttendanceStatus;
  late: number; // minutes
  remarks?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LeaveRequest {
  id: string;
  userId: string;
  leaveType: LeaveType;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  status: LeaveStatus;
  remarks?: string;
  managerRemarks?: string;
  approvedById?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CompanySettings {
  id: string;
  companyName: string;
  officeStartTime: string; // HH:MM
  officeEndTime: string; // HH:MM
  graceTimeMinutes: number;
  halfDayHours: number;
  createdAt: string;
  updatedAt: string;
}

// Full hydrated types for the UI
export interface HydratedUser extends Omit<User, 'password'> {
  department?: Department;
  designation?: Designation;
  manager?: Omit<User, 'password'>;
}

export interface HydratedAttendance extends Attendance {
  user?: HydratedUser;
}

export interface HydratedLeaveRequest extends LeaveRequest {
  user?: HydratedUser;
  approvedBy?: HydratedUser;
}
