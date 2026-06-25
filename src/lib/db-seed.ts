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
    companyName: 'eTimeOffice Enterprise',
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
    // Managers
    {
      id: 'usr-mgr1',
      employeeId: 'EMP002',
      name: 'Sarah Jenkins',
      email: 'sarah@etimeoffice.com',
      mobile: '+1 (555) 014-9988',
      password: 'manager123',
      role: 'MANAGER',
      status: 'ACTIVE',
      joiningDate: '2025-03-10',
      departmentId: 'dept-eng',
      designationId: 'desg-mgr',
      createdAt: '2025-03-10T09:00:00.000Z',
      updatedAt: '2025-03-10T09:00:00.000Z',
    },
    {
      id: 'usr-mgr2',
      employeeId: 'EMP003',
      name: 'Michael Chang',
      email: 'michael@etimeoffice.com',
      mobile: '+1 (555) 018-7722',
      password: 'manager123',
      role: 'MANAGER',
      status: 'ACTIVE',
      joiningDate: '2025-04-01',
      departmentId: 'dept-hr',
      designationId: 'desg-mgr',
      createdAt: '2025-04-01T09:00:00.000Z',
      updatedAt: '2025-04-01T09:00:00.000Z',
    },
  ];

  // 20 Employees
  const employeeNames = [
    { name: 'Emma Watson', email: 'emma@etimeoffice.com', dept: 'dept-eng', desg: 'desg-se' },
    { name: 'Daniel Radcliffe', email: 'daniel@etimeoffice.com', dept: 'dept-eng', desg: 'desg-se' },
    { name: 'Rupert Grint', email: 'rupert@etimeoffice.com', dept: 'dept-eng', desg: 'desg-qa' },
    { name: 'Olivia Colman', email: 'olivia@etimeoffice.com', dept: 'dept-hr', desg: 'desg-assoc' },
    { name: 'David Tennant', email: 'david@etimeoffice.com', dept: 'dept-sales', desg: 'desg-assoc' },
    { name: 'Benedict Cumberbatch', email: 'benedict@etimeoffice.com', dept: 'dept-eng', desg: 'desg-se' },
    { name: 'Tom Hiddleston', email: 'tom@etimeoffice.com', dept: 'dept-mkt', desg: 'desg-assoc' },
    { name: 'Idris Elba', email: 'idris@etimeoffice.com', dept: 'dept-sales', desg: 'desg-assoc' },
    { name: 'Florence Pugh', email: 'florence@etimeoffice.com', dept: 'dept-eng', desg: 'desg-se' },
    { name: 'Saoirse Ronan', email: 'saoirse@etimeoffice.com', dept: 'dept-eng', desg: 'desg-qa' },
    { name: 'Gary Oldman', email: 'gary@etimeoffice.com', dept: 'dept-hr', desg: 'desg-assoc' },
    { name: 'Helen Mirren', email: 'helen@etimeoffice.com', dept: 'dept-mkt', desg: 'desg-assoc' },
    { name: 'Jude Law', email: 'jude@etimeoffice.com', dept: 'dept-eng', desg: 'desg-se' },
    { name: 'Keira Knightley', email: 'keira@etimeoffice.com', dept: 'dept-sales', desg: 'desg-assoc' },
    { name: 'Dev Patel', email: 'dev@etimeoffice.com', dept: 'dept-eng', desg: 'desg-se' },
    { name: 'Emily Blunt', email: 'emily@etimeoffice.com', dept: 'dept-mkt', desg: 'desg-assoc' },
    { name: 'Cillian Murphy', email: 'cillian@etimeoffice.com', dept: 'dept-eng', desg: 'desg-se' },
    { name: 'John Boyega', email: 'john@etimeoffice.com', dept: 'dept-eng', desg: 'desg-se' },
    { name: 'Daisy Ridley', email: 'daisy@etimeoffice.com', dept: 'dept-eng', desg: 'desg-qa' },
    { name: 'Colin Firth', email: 'colin@etimeoffice.com', dept: 'dept-sales', desg: 'desg-assoc' }
  ];

  employeeNames.forEach((emp, index) => {
    const idNum = index + 4;
    const empId = `EMP${String(idNum).padStart(3, '0')}`;
    const managerId = emp.dept === 'dept-eng' ? 'usr-mgr1' : 'usr-mgr2';
    
    users.push({
      id: `usr-${empId.toLowerCase()}`,
      employeeId: empId,
      name: emp.name,
      email: emp.email,
      mobile: `+1 (555) 012-${String(1000 + idNum).substring(1)}`,
      password: 'employee123',
      role: 'EMPLOYEE',
      status: 'ACTIVE',
      joiningDate: '2025-06-01',
      departmentId: emp.dept,
      designationId: emp.desg,
      managerId: managerId,
      createdAt: '2025-06-01T09:00:00.000Z',
      updatedAt: '2025-06-01T09:00:00.000Z',
    });
  });

  // Generates past 14 days of dynamic attendance records
  // Let's target dates between 2026-06-10 and 2026-06-24
  const attendances: Attendance[] = [];
  const leaveRequests: LeaveRequest[] = [];

  const dates: string[] = [];
  for (let d = 10; d <= 24; d++) {
    dates.push(`2026-06-${String(d).padStart(2, '0')}`);
  }

  // Pre-generate some Leave Requests
  // Approved leaves
  leaveRequests.push({
    id: 'leave-1',
    userId: 'usr-emp004', // Emma Watson
    leaveType: 'CASUAL_LEAVE',
    startDate: '2026-06-15',
    endDate: '2026-06-16',
    status: 'APPROVED',
    remarks: 'Family gathering',
    managerRemarks: 'Approved. Enjoy your time off.',
    approvedById: 'usr-mgr1',
    createdAt: '2026-06-12T10:00:00.000Z',
    updatedAt: '2026-06-12T14:30:00.000Z',
  });

  leaveRequests.push({
    id: 'leave-2',
    userId: 'usr-emp008', // Benedict Cumberbatch
    leaveType: 'SICK_LEAVE',
    startDate: '2026-06-18',
    endDate: '2026-06-18',
    status: 'APPROVED',
    remarks: 'Dental appointment',
    managerRemarks: 'Get well soon!',
    approvedById: 'usr-mgr1',
    createdAt: '2026-06-17T08:30:00.000Z',
    updatedAt: '2026-06-17T09:15:00.000Z',
  });

  // Pending leaves
  leaveRequests.push({
    id: 'leave-3',
    userId: 'usr-emp005', // Daniel Radcliffe
    leaveType: 'EARNED_LEAVE',
    startDate: '2026-06-28',
    endDate: '2026-06-30',
    status: 'PENDING',
    remarks: 'Summer vacation plans',
    createdAt: '2026-06-23T11:00:00.000Z',
    updatedAt: '2026-06-23T11:00:00.000Z',
  });

  leaveRequests.push({
    id: 'leave-4',
    userId: 'usr-emp011', // Tom Hiddleston
    leaveType: 'CASUAL_LEAVE',
    startDate: '2026-06-26',
    endDate: '2026-06-26',
    status: 'PENDING',
    remarks: 'Personal administrative work',
    createdAt: '2026-06-24T09:00:00.000Z',
    updatedAt: '2026-06-24T09:00:00.000Z',
  });

  // Rejected leaves
  leaveRequests.push({
    id: 'leave-5',
    userId: 'usr-emp006', // Rupert Grint
    leaveType: 'HALF_DAY',
    startDate: '2026-06-11',
    endDate: '2026-06-11',
    status: 'REJECTED',
    remarks: 'Going to movie premiere',
    managerRemarks: 'Sorry, we have a major release delivery that afternoon.',
    approvedById: 'usr-mgr1',
    createdAt: '2026-06-10T15:00:00.000Z',
    updatedAt: '2026-06-10T16:30:00.000Z',
  });

  // Populate Attendance Records for past dates
  users.forEach((user) => {
    // Skip Admin for attendance generally, but let's add some just in case
    if (user.role === 'ADMIN') return;

    dates.forEach((dateStr) => {
      // Is Sunday or Saturday?
      const dayOfWeek = new Date(dateStr).getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      if (isWeekend) {
        // No attendance records for weekends generally
        return;
      }

      // Check if user is on approved leave for this date
      const approvedLeave = leaveRequests.find(
        (lr) =>
          lr.userId === user.id &&
          lr.status === 'APPROVED' &&
          dateStr >= lr.startDate &&
          dateStr <= lr.endDate
      );

      if (approvedLeave) {
        attendances.push({
          id: `att-${user.id}-${dateStr}`,
          userId: user.id,
          date: dateStr,
          workingHours: 0.0,
          status: 'LEAVE',
          late: 0,
          remarks: `On Approved Leave: ${approvedLeave.leaveType}`,
          createdAt: `${dateStr}T18:00:00.000Z`,
          updatedAt: `${dateStr}T18:00:00.000Z`,
        });
        return;
      }

      // Random state: Present, Late, Absent (with low probability)
      const rand = Math.random();

      if (rand < 0.06) {
        // Absent (6% probability)
        attendances.push({
          id: `att-${user.id}-${dateStr}`,
          userId: user.id,
          date: dateStr,
          workingHours: 0.0,
          status: 'ABSENT',
          late: 0,
          remarks: 'Absent without notice',
          createdAt: `${dateStr}T09:00:00.000Z`,
          updatedAt: `${dateStr}T18:00:00.000Z`,
        });
      } else if (rand < 0.20) {
        // Late (14% probability)
        // Late arrival around 09:20 - 10:15
        const lateMins = Math.floor(Math.random() * 50) + 16; // > 15 mins (grace time)
        const checkInHour = lateMins >= 60 ? '10' : '09';
        const checkInMin = String(lateMins % 60).padStart(2, '0');
        const checkInTime = `${checkInHour}:${checkInMin}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}`;
        const checkOutTime = `18:${String(Math.floor(Math.random() * 30)).padStart(2, '0')}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}`;
        
        // Calculate hours
        const [inH, inM] = checkInTime.split(':').map(Number);
        const [outH, outM] = checkOutTime.split(':').map(Number);
        const workHours = parseFloat(((outH + outM/60) - (inH + inM/60)).toFixed(2));

        attendances.push({
          id: `att-${user.id}-${dateStr}`,
          userId: user.id,
          date: dateStr,
          punchIn: checkInTime,
          punchOut: checkOutTime,
          workingHours: workHours,
          status: 'PRESENT',
          late: lateMins,
          remarks: 'Late Entry',
          createdAt: `${dateStr}T${checkInTime}Z`,
          updatedAt: `${dateStr}T${checkOutTime}Z`,
        });
      } else if (rand < 0.26) {
        // Half Day (6% probability)
        // Punches in at 09:00, punches out at 13:15
        const checkInTime = `09:03:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}`;
        const checkOutTime = `13:10:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}`;
        const workHours = 4.1;

        attendances.push({
          id: `att-${user.id}-${dateStr}`,
          userId: user.id,
          date: dateStr,
          punchIn: checkInTime,
          punchOut: checkOutTime,
          workingHours: workHours,
          status: 'HALF_DAY',
          late: 3,
          remarks: 'Half Day (Early Departure)',
          createdAt: `${dateStr}T${checkInTime}Z`,
          updatedAt: `${dateStr}T${checkOutTime}Z`,
        });
      } else {
        // Normal On-Time Present (74% probability)
        const checkInMin = String(Math.floor(Math.random() * 15)).padStart(2, '0'); // within grace (09:00 - 09:15)
        const checkInTime = `09:${checkInMin}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}`;
        const checkOutTime = `18:${String(Math.floor(Math.random() * 20) + 5).padStart(2, '0')}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}`;
        
        const [inH, inM] = checkInTime.split(':').map(Number);
        const [outH, outM] = checkOutTime.split(':').map(Number);
        const workHours = parseFloat(((outH + outM/60) - (inH + inM/60)).toFixed(2));

        attendances.push({
          id: `att-${user.id}-${dateStr}`,
          userId: user.id,
          date: dateStr,
          punchIn: checkInTime,
          punchOut: checkOutTime,
          workingHours: workHours,
          status: 'PRESENT',
          late: 0,
          remarks: 'Normal Present',
          createdAt: `${dateStr}T${checkInTime}Z`,
          updatedAt: `${dateStr}T${checkOutTime}Z`,
        });
      }
    });
  });

  return {
    users,
    departments,
    designations,
    attendances,
    leaveRequests,
    companySettings,
  };
}
