import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { z } from 'zod';
import { db, initDb } from './src/lib/db-store';
import { AttendanceStatus } from './src/types';

// Helper function to get current date and time in Indian Standard Time (IST)
function getISTDateAndTime(): { dateStr: string; timeStr: string } {
  const now = new Date();
  
  // Format date: YYYY-MM-DD in IST (Asia/Kolkata)
  const dateStr = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(now);
  
  // Format time: HH:MM:SS in IST (Asia/Kolkata)
  const timeStr = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).format(now);
  
  return { dateStr, timeStr };
}

async function startServer() {
  // Initialize Database from Postgres or local fallback
  await initDb();

  const app = express();
  const PORT = 3000;

  // Middleware to parse incoming JSON bodies
  app.use(express.json());

  // ----------------------------------------------------
  // API ROUTES (Must go BEFORE Vite middleware)
  // ----------------------------------------------------

  // --- AUTHENTICATION ---
  const loginSchema = z.object({
    emailOrEmployeeId: z.string().min(1, 'Email or Employee ID is required'),
    password: z.string().min(1, 'Password is required'),
  });

  app.post('/api/auth/login', (req, res) => {
    try {
      const { emailOrEmployeeId, password } = loginSchema.parse(req.body);
      
      const user = db.users.findUnique(
        (u) => (u.email.toLowerCase() === emailOrEmployeeId.toLowerCase() || 
                u.employeeId.toLowerCase() === emailOrEmployeeId.toLowerCase()) && 
               u.password === password
      );

      if (!user) {
        return res.status(401).json({ error: 'Invalid Email/Employee ID or Password' });
      }

      if (user.status === 'INACTIVE') {
        return res.status(403).json({ error: 'Your account is inactive. Please contact admin.' });
      }

      const hydrated = db.hydrateUser(user);
      res.json({ success: true, user: hydrated });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: err.issues[0].message });
      }
      res.status(500).json({ error: 'Authentication failed' });
    }
  });

  // --- QUICK ACCESS USERS ---
  app.get('/api/auth/quick-access-users', (req, res) => {
    try {
      const allUsers = db.users.findMany();
      const quickUsers = allUsers.map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        employeeId: u.employeeId,
        role: u.role,
        password: u.password,
        status: u.status
      }));
      res.json(quickUsers);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch quick access users' });
    }
  });

  // --- DASHBOARD STATS ---
  app.get('/api/dashboard/stats', (req, res) => {
    try {
      const { dateStr: todayIST } = getISTDateAndTime();
      const dateStr = (req.query.date as string) || todayIST;
      
      const allUsers = db.users.findMany();
      const employees = allUsers.filter(u => u.role !== 'ADMIN');
      const totalEmployees = employees.length;

      const attendancesToday = db.attendances.findMany().filter(a => a.date === dateStr);
      
      const presentToday = attendancesToday.filter(a => a.status === 'PRESENT' || a.status === 'HALF_DAY').length;
      const absentToday = attendancesToday.filter(a => a.status === 'ABSENT').length;
      const onLeaveToday = attendancesToday.filter(a => a.status === 'LEAVE').length;

      // Rest who have no attendance logged are considered "Absent" by default for the dashboard
      const loggedUserIds = new Set(attendancesToday.map(a => a.userId));
      const unloggedCount = employees.filter(e => !loggedUserIds.has(e.id)).length;
      const finalAbsentToday = absentToday + unloggedCount;

      // Hydrated Attendance table for today
      const todayLogs = attendancesToday.map(a => db.hydrateAttendance(a));

      // Recent activities: Combine recent leaves and attendance punches
      const recentLeaves = db.leaveRequests.findMany()
        .map(l => db.hydrateLeaveRequest(l))
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        .slice(0, 5)
        .map(l => ({
          id: l.id,
          type: 'LEAVE',
          user: l.user,
          description: `Applied for ${l.leaveType.replace('_', ' ')}: ${l.startDate} to ${l.endDate} (${l.status})`,
          time: l.updatedAt
        }));

      const recentPunches = db.attendances.findMany()
        .map(a => db.hydrateAttendance(a))
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        .slice(0, 8)
        .map(a => ({
          id: a.id,
          type: 'ATTENDANCE',
          user: a.user,
          description: `Punched ${a.punchOut ? 'OUT' : 'IN'} on ${a.date} at ${a.punchOut || a.punchIn} (${a.status})`,
          time: a.updatedAt
        }));

      const recentActivities = [...recentLeaves, ...recentPunches]
        .sort((a, b) => b.time.localeCompare(a.time))
        .slice(0, 10);

      res.json({
        stats: {
          totalEmployees,
          presentToday,
          absentToday: finalAbsentToday,
          onLeaveToday
        },
        todayLogs,
        recentActivities
      });
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch dashboard stats' });
    }
  });

  // --- EMPLOYEES ---
  const employeeSchema = z.object({
    employeeId: z.string().min(3, 'Employee ID must be at least 3 chars'),
    name: z.string().min(2, 'Name must be at least 2 chars'),
    email: z.string().email('Invalid email address'),
    mobile: z.string().optional(),
    role: z.enum(['ADMIN', 'MANAGER', 'EMPLOYEE']),
    status: z.enum(['ACTIVE', 'INACTIVE']),
    departmentId: z.string().optional(),
    designationId: z.string().optional(),
    managerId: z.string().optional(),
    password: z.string().min(4, 'Password must be at least 4 chars'),
    casualBalance: z.number().optional(),
    sickBalance: z.number().optional(),
    earnedBalance: z.number().optional(),
    compensatoryBalance: z.number().optional(),
  });

  app.get('/api/employees', (req, res) => {
    try {
      const allUsers = db.users.findMany();
      const deptFilter = req.query.departmentId as string;
      
      let filtered = allUsers;
      if (deptFilter) {
        filtered = filtered.filter(u => u.departmentId === deptFilter);
      }

      const hydrated = filtered.map(u => db.hydrateUser(u));
      res.json(hydrated);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch employees' });
    }
  });

  app.post('/api/employees', (req, res) => {
    try {
      const body = employeeSchema.parse(req.body);

      // Check uniqueness
      const existingEmail = db.users.findUnique(u => u.email.toLowerCase() === body.email.toLowerCase());
      if (existingEmail) return res.status(400).json({ error: 'Email already exists' });

      const existingEmpId = db.users.findUnique(u => u.employeeId.toLowerCase() === body.employeeId.toLowerCase());
      if (existingEmpId) return res.status(400).json({ error: 'Employee ID already exists' });

      const settings = db.companySettings.find();
      const finalBody = {
        ...body,
        casualBalance: body.casualBalance !== undefined ? body.casualBalance : (settings.casualEntitlement ?? 12),
        sickBalance: body.sickBalance !== undefined ? body.sickBalance : (settings.sickEntitlement ?? 10),
        earnedBalance: body.earnedBalance !== undefined ? body.earnedBalance : (settings.earnedEntitlement ?? 15),
        compensatoryBalance: body.compensatoryBalance !== undefined ? body.compensatoryBalance : (settings.compensatoryEntitlement ?? 0),
      };

      const created = db.users.create(finalBody as any);
      res.status(201).json(db.hydrateUser(created));
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: err.issues[0].message });
      }
      res.status(500).json({ error: 'Failed to create employee' });
    }
  });

  app.put('/api/employees/:id', (req, res) => {
    try {
      const id = req.params.id;
      const partialSchema = employeeSchema.partial().omit({ employeeId: true });
      const body = partialSchema.parse(req.body);

      const updated = db.users.update(id, body);
      res.json(db.hydrateUser(updated));
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: err.issues[0].message });
      }
      res.status(500).json({ error: 'Failed to update employee' });
    }
  });

  app.post('/api/employees/:id/reset-password', (req, res) => {
    try {
      const id = req.params.id;
      const body = z.object({ password: z.string().min(4) }).parse(req.body);
      
      db.users.update(id, { password: body.password });
      res.json({ success: true, message: 'Password reset successful' });
    } catch (err) {
      res.status(500).json({ error: 'Failed to reset password' });
    }
  });

  app.delete('/api/employees/:id', (req, res) => {
    try {
      const id = req.params.id;
      const success = db.users.delete(id);
      if (!success) return res.status(404).json({ error: 'Employee not found' });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Failed to delete employee' });
    }
  });

  // --- ATTENDANCE ---
  app.get('/api/attendance', (req, res) => {
    try {
      const { userId, date, month, departmentId, fromDate, toDate } = req.query;
      let logs = db.attendances.findMany();

      if (userId) {
        logs = logs.filter(a => a.userId === userId);
      }
      if (date) {
        logs = logs.filter(a => a.date === date);
      }
      if (month) {
        // month is YYYY-MM
        logs = logs.filter(a => a.date.startsWith(month as string));
      }
      if (fromDate) {
        logs = logs.filter(a => a.date >= (fromDate as string));
      }
      if (toDate) {
        logs = logs.filter(a => a.date <= (toDate as string));
      }

      let hydrated = logs.map(a => db.hydrateAttendance(a));

      if (departmentId) {
        hydrated = hydrated.filter(a => a.user?.departmentId === departmentId);
      }

      // Sort by date descending, then user
      hydrated.sort((a, b) => b.date.localeCompare(a.date));
      res.json(hydrated);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch attendance' });
    }
  });

  // PUNCH IN / OUT (Self-Service)
  const punchSchema = z.object({
    userId: z.string(),
    action: z.enum(['in', 'out']),
    remarks: z.string().optional(),
  });

  app.post('/api/attendance/punch', (req, res) => {
    try {
      const { userId, action, remarks } = punchSchema.parse(req.body);
      const { dateStr: todayStr, timeStr: nowTimeStr } = getISTDateAndTime();

      const settings = db.companySettings.find();
      const existing = db.attendances.findUnique(a => a.userId === userId && a.date === todayStr);

      if (action === 'in') {
        if (existing?.punchIn) {
          return res.status(400).json({ error: 'You have already punched in for today.' });
        }

        // Calculate Late Minutes
        const [startH, startM] = settings.officeStartTime.split(':').map(Number);
        const [nowH, nowM] = nowTimeStr.split(':').map(Number);

        const startMinutes = startH * 60 + startM;
        const nowMinutes = nowH * 60 + nowM;
        const diff = nowMinutes - startMinutes;
        
        let lateMins = 0;
        if (diff > settings.graceTimeMinutes) {
          lateMins = diff;
        }

        const created = db.attendances.upsert(userId, todayStr, {
          punchIn: nowTimeStr,
          late: lateMins,
          remarks: remarks || (lateMins > 0 ? 'Late Punch' : 'On Time'),
          status: 'PRESENT'
        });

        res.json({ success: true, record: db.hydrateAttendance(created) });
      } else {
        // Punch out
        if (!existing || !existing.punchIn) {
          return res.status(400).json({ error: 'You must punch in first before punching out.' });
        }
        if (existing.punchOut) {
          return res.status(400).json({ error: 'You have already punched out for today.' });
        }

        // Calculate working hours
        const [inH, inM, inS] = existing.punchIn.split(':').map(Number);
        const [outH, outM, outS] = nowTimeStr.split(':').map(Number);

        const inSecs = inH * 3600 + inM * 60 + inS;
        const outSecs = outH * 3600 + outM * 60 + outS;
        const hours = parseFloat(((outSecs - inSecs) / 3600).toFixed(2));

        const settings = db.companySettings.find();
        const halfDayThreshold = settings.halfDayHours;
        const fullDayThreshold = 8.0;

        let status: AttendanceStatus = 'PRESENT';
        if (hours >= fullDayThreshold) {
          status = 'PRESENT';
        } else if (hours >= halfDayThreshold) {
          status = 'HALF_DAY';
        } else {
          status = 'LEAVE';
        }

        const updated = db.attendances.upsert(userId, todayStr, {
          punchOut: nowTimeStr,
          workingHours: hours,
          status,
          remarks: remarks || existing.remarks || 'Normal Punch Out'
        });

        res.json({ success: true, record: db.hydrateAttendance(updated) });
      }
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: err.issues[0].message });
      }
      res.status(500).json({ error: 'Punch action failed' });
    }
  });

  // MANUAL ATTENDANCE (Admin)
  const manualAttendanceSchema = z.object({
    userId: z.string(),
    date: z.string(), // YYYY-MM-DD
    punchIn: z.string().nullable().optional(), // HH:MM
    punchOut: z.string().nullable().optional(), // HH:MM
    status: z.enum(['PRESENT', 'ABSENT', 'HALF_DAY', 'LEAVE']),
    remarks: z.string().nullable().optional(),
  });

  app.post('/api/attendance/manual', (req, res) => {
    try {
      const body = manualAttendanceSchema.parse(req.body);
      
      const isAbsentOrLeave = body.status === 'ABSENT' || body.status === 'LEAVE';
      let workingHours = 0.0;
      let lateMins = 0;

      const punchInStr = (!isAbsentOrLeave && body.punchIn && body.punchIn.trim() !== '') ? body.punchIn : undefined;
      const punchOutStr = (!isAbsentOrLeave && body.punchOut && body.punchOut.trim() !== '') ? body.punchOut : undefined;

      if (punchInStr && punchOutStr) {
        const [inH, inM] = punchInStr.split(':').map(Number);
        const [outH, outM] = punchOutStr.split(':').map(Number);
        workingHours = parseFloat(((outH + outM/60) - (inH + inM/60)).toFixed(2));

        const settings = db.companySettings.find();
        const [startH, startM] = settings.officeStartTime.split(':').map(Number);
        const diff = (inH * 60 + inM) - (startH * 60 + startM);
        if (diff > settings.graceTimeMinutes) {
          lateMins = diff;
        }
      }

      // Format input punch times to include seconds (e.g. HH:MM:00)
      const pIn = punchInStr ? (punchInStr.split(':').length === 2 ? `${punchInStr}:00` : punchInStr) : undefined;
      const pOut = punchOutStr ? (punchOutStr.split(':').length === 2 ? `${punchOutStr}:00` : punchOutStr) : undefined;

      let finalStatus = body.status;
      if (pIn && pOut) {
        const settings = db.companySettings.find();
        const halfDayThreshold = settings.halfDayHours;
        const fullDayThreshold = 8.0;
        if (workingHours >= fullDayThreshold) {
          finalStatus = 'PRESENT';
        } else if (workingHours >= halfDayThreshold) {
          finalStatus = 'HALF_DAY';
        } else {
          finalStatus = 'LEAVE';
        }
      }

      const created = db.attendances.upsert(body.userId, body.date, {
        punchIn: pIn,
        punchOut: pOut,
        workingHours,
        late: lateMins,
        status: finalStatus,
        remarks: body.remarks || 'Manual Entry'
      });

      res.status(201).json(db.hydrateAttendance(created));
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: err.issues[0].message });
      }
      res.status(500).json({ error: 'Manual entry creation failed' });
    }
  });

  app.delete('/api/attendance/:id', (req, res) => {
    try {
      const success = db.attendances.delete(req.params.id);
      if (!success) return res.status(404).json({ error: 'Record not found' });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Failed to delete attendance record' });
    }
  });

  // --- LEAVE REQUESTS & BALANCE MANAGEMENT ---
  function calculateLeaveDays(startDateStr: string, endDateStr: string): number {
    const start = new Date(startDateStr);
    const end = new Date(endDateStr);
    let days = 0;
    const current = new Date(start);
    while (current <= end) {
      const dayOfWeek = current.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) { // exclude Sunday and Saturday
        days++;
      }
      current.setDate(current.getDate() + 1);
    }
    return days > 0 ? days : 1; // fallback to at least 1 day
  }

  const applyLeaveSchema = z.object({
    userId: z.string(),
    leaveType: z.enum(['CASUAL_LEAVE', 'SICK_LEAVE', 'EARNED_LEAVE', 'COMPENSATORY_LEAVE']),
    startDate: z.string(), // YYYY-MM-DD
    endDate: z.string(), // YYYY-MM-DD
    remarks: z.string().optional(),
  });

  const reviewLeaveSchema = z.object({
    status: z.enum(['APPROVED', 'REJECTED']),
    managerRemarks: z.string().optional(),
    approvedById: z.string()
  });

  app.get('/api/leaves', (req, res) => {
    try {
      const { userId, managerId, status } = req.query;
      let leaves = db.leaveRequests.findMany();

      if (userId) {
        leaves = leaves.filter(l => l.userId === userId);
      }
      if (status) {
        leaves = leaves.filter(l => l.status === status);
      }

      let hydrated = leaves.map(l => db.hydrateLeaveRequest(l));

      if (managerId) {
        hydrated = hydrated.filter(l => l.user?.managerId === managerId);
      }

      hydrated.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      res.json(hydrated);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch leaves' });
    }
  });

  app.post('/api/leaves', (req, res) => {
    try {
      const body = applyLeaveSchema.parse(req.body);

      // 1. Validate Date Range
      const start = new Date(body.startDate);
      const end = new Date(body.endDate);
      if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
        return res.status(400).json({ error: 'Invalid date range selected' });
      }

      // 2. Overlapping Leave Verification
      const existingLeaves = db.leaveRequests.findMany().filter(l => l.userId === body.userId && l.status !== 'REJECTED');
      const overlaps = existingLeaves.some(l => {
        return (body.startDate <= l.endDate) && (body.endDate >= l.startDate);
      });
      if (overlaps) {
        return res.status(400).json({ error: 'An overlapping leave request already exists for this period.' });
      }

      // 3. Check Leave Balance
      const user = db.users.findUnique(u => u.id === body.userId);
      if (!user) return res.status(404).json({ error: 'Employee not found' });

      const leaveDays = calculateLeaveDays(body.startDate, body.endDate);
      
      let balance = 0;
      if (body.leaveType === 'CASUAL_LEAVE') {
        balance = user.casualBalance ?? 0;
      } else if (body.leaveType === 'SICK_LEAVE') {
        balance = user.sickBalance ?? 0;
      } else if (body.leaveType === 'EARNED_LEAVE') {
        balance = user.earnedBalance ?? 0;
      } else if (body.leaveType === 'COMPENSATORY_LEAVE') {
        balance = user.compensatoryBalance ?? 0;
      }

      if (leaveDays > balance) {
        return res.status(400).json({ 
          error: `Insufficient leave balance. Requested: ${leaveDays} days, Available: ${balance} days.` 
        });
      }

      const created = db.leaveRequests.create(body as any);
      res.status(201).json(db.hydrateLeaveRequest(created));
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: err.issues[0].message });
      }
      res.status(500).json({ error: 'Failed to apply leave' });
    }
  });

  app.put('/api/leaves/:id', (req, res) => {
    try {
      const body = reviewLeaveSchema.parse(req.body);
      
      // Load current request first
      const existingRequest = db.leaveRequests.findMany().find(l => l.id === req.params.id);
      if (!existingRequest) return res.status(404).json({ error: 'Leave request not found' });

      const user = db.users.findUnique(u => u.id === existingRequest.userId);
      if (!user) return res.status(404).json({ error: 'Employee not found' });

      const leaveDays = calculateLeaveDays(existingRequest.startDate, existingRequest.endDate);

      // If transition from not APPROVED to APPROVED:
      if (body.status === 'APPROVED' && existingRequest.status !== 'APPROVED') {
        let balance = 0;
        let field: 'casualBalance' | 'sickBalance' | 'earnedBalance' | 'compensatoryBalance';
        if (existingRequest.leaveType === 'CASUAL_LEAVE') {
          balance = user.casualBalance ?? 0;
          field = 'casualBalance';
        } else if (existingRequest.leaveType === 'SICK_LEAVE') {
          balance = user.sickBalance ?? 0;
          field = 'sickBalance';
        } else if (existingRequest.leaveType === 'EARNED_LEAVE') {
          balance = user.earnedBalance ?? 0;
          field = 'earnedBalance';
        } else {
          balance = user.compensatoryBalance ?? 0;
          field = 'compensatoryBalance';
        }

        if (leaveDays > balance) {
          return res.status(400).json({ 
            error: `Insufficient leave balance to approve. Needed: ${leaveDays} days, Available: ${balance} days.` 
          });
        }

        // Deduct balance
        db.users.update(user.id, { [field]: balance - leaveDays });
      }

      // If transition from APPROVED to REJECTED (revoked):
      if (body.status !== 'APPROVED' && existingRequest.status === 'APPROVED') {
        let field: 'casualBalance' | 'sickBalance' | 'earnedBalance' | 'compensatoryBalance';
        if (existingRequest.leaveType === 'CASUAL_LEAVE') {
          field = 'casualBalance';
        } else if (existingRequest.leaveType === 'SICK_LEAVE') {
          field = 'sickBalance';
        } else if (existingRequest.leaveType === 'EARNED_LEAVE') {
          field = 'earnedBalance';
        } else {
          field = 'compensatoryBalance';
        }
        const currentBal = user[field] ?? 0;
        db.users.update(user.id, { [field]: currentBal + leaveDays });
      }

      const updated = db.leaveRequests.update(req.params.id, body);
      res.json(db.hydrateLeaveRequest(updated));
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: err.issues[0].message });
      }
      res.status(500).json({ error: 'Failed to review leave request' });
    }
  });

  app.delete('/api/leaves/:id', (req, res) => {
    try {
      const existingRequest = db.leaveRequests.findMany().find(l => l.id === req.params.id);
      if (!existingRequest) return res.status(404).json({ error: 'Leave request not found' });

      // If approved, restore balance before deleting
      if (existingRequest.status === 'APPROVED') {
        const user = db.users.findUnique(u => u.id === existingRequest.userId);
        if (user) {
          const leaveDays = calculateLeaveDays(existingRequest.startDate, existingRequest.endDate);
          let field: 'casualBalance' | 'sickBalance' | 'earnedBalance' | 'compensatoryBalance';
          if (existingRequest.leaveType === 'CASUAL_LEAVE') {
            field = 'casualBalance';
          } else if (existingRequest.leaveType === 'SICK_LEAVE') {
            field = 'sickBalance';
          } else if (existingRequest.leaveType === 'EARNED_LEAVE') {
            field = 'earnedBalance';
          } else {
            field = 'compensatoryBalance';
          }
          const currentBal = user[field] ?? 0;
          db.users.update(user.id, { [field]: currentBal + leaveDays });
        }
      }

      const success = db.leaveRequests.delete(req.params.id);
      if (!success) return res.status(404).json({ error: 'Leave request not found' });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Failed to cancel leave request' });
    }
  });

  // --- MANUAL BALANCE ADJUSTMENT ---
  app.post('/api/employees/:id/leave-balance', (req, res) => {
    try {
      const userId = req.params.id;
      const body = z.object({
        leaveType: z.enum(['CASUAL_LEAVE', 'SICK_LEAVE', 'EARNED_LEAVE', 'COMPENSATORY_LEAVE']),
        action: z.enum(['increase', 'decrease', 'set']),
        amount: z.number().nonnegative('Amount must be non-negative'),
        reason: z.string().min(1, 'Reason is required'),
        changedById: z.string(),
        changedByName: z.string()
      }).parse(req.body);

      const user = db.users.findUnique(u => u.id === userId);
      if (!user) return res.status(404).json({ error: 'Employee not found' });

      let prevBal = 0;
      let balanceField: 'casualBalance' | 'sickBalance' | 'earnedBalance' | 'compensatoryBalance';
      if (body.leaveType === 'CASUAL_LEAVE') {
        prevBal = user.casualBalance ?? 0;
        balanceField = 'casualBalance';
      } else if (body.leaveType === 'SICK_LEAVE') {
        prevBal = user.sickBalance ?? 0;
        balanceField = 'sickBalance';
      } else if (body.leaveType === 'EARNED_LEAVE') {
        prevBal = user.earnedBalance ?? 0;
        balanceField = 'earnedBalance';
      } else {
        prevBal = user.compensatoryBalance ?? 0;
        balanceField = 'compensatoryBalance';
      }

      let newBal = prevBal;
      if (body.action === 'increase') {
        newBal = prevBal + body.amount;
      } else if (body.action === 'decrease') {
        newBal = prevBal - body.amount;
      } else {
        newBal = body.amount;
      }

      if (newBal < 0) {
        return res.status(400).json({ error: 'Leave balance cannot be negative.' });
      }

      const updatedUser = db.users.update(userId, { [balanceField]: newBal });

      db.leaveBalanceLogs.create({
        userId,
        leaveType: body.leaveType,
        previousBalance: prevBal,
        newBalance: newBal,
        changedById: body.changedById,
        changedByName: body.changedByName,
        reason: body.reason
      });

      res.json(db.hydrateUser(updatedUser));
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: err.issues[0].message });
      }
      res.status(500).json({ error: 'Failed to update leave balance' });
    }
  });

  // --- BULK BALANCE ADJUSTMENT ---
  app.post('/api/employees/bulk-leave-balance', (req, res) => {
    try {
      const body = z.object({
        userIds: z.array(z.string()),
        leaveType: z.enum(['CASUAL_LEAVE', 'SICK_LEAVE', 'EARNED_LEAVE', 'COMPENSATORY_LEAVE']),
        action: z.enum(['increase', 'decrease', 'set']),
        amount: z.number().nonnegative(),
        reason: z.string().min(1, 'Reason is required'),
        changedById: z.string(),
        changedByName: z.string()
      }).parse(req.body);

      for (const userId of body.userIds) {
        const user = db.users.findUnique(u => u.id === userId);
        if (!user) continue;

        let prevBal = 0;
        let balanceField: 'casualBalance' | 'sickBalance' | 'earnedBalance' | 'compensatoryBalance';
        if (body.leaveType === 'CASUAL_LEAVE') {
          prevBal = user.casualBalance ?? 0;
          balanceField = 'casualBalance';
        } else if (body.leaveType === 'SICK_LEAVE') {
          prevBal = user.sickBalance ?? 0;
          balanceField = 'sickBalance';
        } else if (body.leaveType === 'EARNED_LEAVE') {
          prevBal = user.earnedBalance ?? 0;
          balanceField = 'earnedBalance';
        } else {
          prevBal = user.compensatoryBalance ?? 0;
          balanceField = 'compensatoryBalance';
        }

        let newBal = prevBal;
        if (body.action === 'increase') {
          newBal = prevBal + body.amount;
        } else if (body.action === 'decrease') {
          newBal = prevBal - body.amount;
        } else {
          newBal = body.amount;
        }

        if (newBal < 0) {
          newBal = 0;
        }

        db.users.update(userId, { [balanceField]: newBal });

        db.leaveBalanceLogs.create({
          userId,
          leaveType: body.leaveType,
          previousBalance: prevBal,
          newBalance: newBal,
          changedById: body.changedById,
          changedByName: body.changedByName,
          reason: body.reason + ' (Bulk Update)'
        });
      }

      res.json({ success: true, message: 'Bulk leave balance update completed.' });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: err.issues[0].message });
      }
      res.status(500).json({ error: 'Bulk update failed' });
    }
  });

  // --- LEAVE BALANCES RESET ---
  app.post('/api/employees/reset-leave-balances', (req, res) => {
    try {
      const body = z.object({
        changedById: z.string(),
        changedByName: z.string(),
        reason: z.string().min(1, 'Reason is required')
      }).parse(req.body);

      const settings = db.companySettings.find();
      const allUsers = db.users.findMany();

      allUsers.forEach(user => {
        if (user.role === 'ADMIN') return;

        const pCasual = user.casualBalance ?? 0;
        const pSick = user.sickBalance ?? 0;
        const pEarned = user.earnedBalance ?? 0;
        const pComp = user.compensatoryBalance ?? 0;

        const nCasual = settings.casualEntitlement ?? 12;
        const nSick = settings.sickEntitlement ?? 10;
        const nEarned = settings.earnedEntitlement ?? 15;
        const nComp = settings.compensatoryEntitlement ?? 0;

        db.users.update(user.id, {
          casualBalance: nCasual,
          sickBalance: nSick,
          earnedBalance: nEarned,
          compensatoryBalance: nComp
        });

        if (pCasual !== nCasual) {
          db.leaveBalanceLogs.create({
            userId: user.id,
            leaveType: 'CASUAL_LEAVE',
            previousBalance: pCasual,
            newBalance: nCasual,
            changedById: body.changedById,
            changedByName: body.changedByName,
            reason: body.reason + ' (Yearly Reset)'
          });
        }
        if (pSick !== nSick) {
          db.leaveBalanceLogs.create({
            userId: user.id,
            leaveType: 'SICK_LEAVE',
            previousBalance: pSick,
            newBalance: nSick,
            changedById: body.changedById,
            changedByName: body.changedByName,
            reason: body.reason + ' (Yearly Reset)'
          });
        }
        if (pEarned !== nEarned) {
          db.leaveBalanceLogs.create({
            userId: user.id,
            leaveType: 'EARNED_LEAVE',
            previousBalance: pEarned,
            newBalance: nEarned,
            changedById: body.changedById,
            changedByName: body.changedByName,
            reason: body.reason + ' (Yearly Reset)'
          });
        }
        if (pComp !== nComp) {
          db.leaveBalanceLogs.create({
            userId: user.id,
            leaveType: 'COMPENSATORY_LEAVE',
            previousBalance: pComp,
            newBalance: nComp,
            changedById: body.changedById,
            changedByName: body.changedByName,
            reason: body.reason + ' (Yearly Reset)'
          });
        }
      });

      res.json({ success: true, message: 'All active employee leave balances reset successfully.' });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: err.issues[0].message });
      }
      res.status(500).json({ error: 'Reset failed' });
    }
  });

  // --- LEAVE AUDIT HISTORY ---
  app.get('/api/leaves/balance-history', (req, res) => {
    try {
      const { userId } = req.query;
      let logs = db.leaveBalanceLogs.findMany();
      if (userId) {
        logs = logs.filter(l => l.userId === userId);
      }
      logs.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      
      const hydrated = logs.map(l => {
        const user = db.users.findUnique(u => u.id === l.userId);
        return {
          ...l,
          employeeName: user ? user.name : 'Unknown',
          employeeId: user ? user.employeeId : ''
        };
      });
      
      res.json(hydrated);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch leave balance history' });
    }
  });

  // --- DEPARTMENTS & DESIGNATIONS ---
  const deptDesgSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    description: z.string().optional()
  });

  app.get('/api/departments', (req, res) => {
    res.json(db.departments.findMany());
  });

  app.post('/api/departments', (req, res) => {
    try {
      const { name, description } = deptDesgSchema.parse(req.body);
      const existing = db.departments.findMany().find(d => d.name.toLowerCase() === name.toLowerCase());
      if (existing) {
        return res.status(400).json({ error: 'Department already exists' });
      }
      const created = db.departments.create(name, description);
      res.status(201).json(created);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: err.issues[0].message });
      }
      res.status(500).json({ error: 'Failed to create department' });
    }
  });

  app.delete('/api/departments/:id', (req, res) => {
    try {
      const success = db.departments.delete(req.params.id);
      if (!success) return res.status(404).json({ error: 'Department not found' });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Failed to delete department' });
    }
  });

  app.get('/api/designations', (req, res) => {
    res.json(db.designations.findMany());
  });

  app.post('/api/designations', (req, res) => {
    try {
      const { name, description } = deptDesgSchema.parse(req.body);
      const existing = db.designations.findMany().find(d => d.name.toLowerCase() === name.toLowerCase());
      if (existing) {
        return res.status(400).json({ error: 'Designation already exists' });
      }
      const created = db.designations.create(name, description);
      res.status(201).json(created);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: err.issues[0].message });
      }
      res.status(500).json({ error: 'Failed to create designation' });
    }
  });

  app.delete('/api/designations/:id', (req, res) => {
    try {
      const success = db.designations.delete(req.params.id);
      if (!success) return res.status(404).json({ error: 'Designation not found' });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Failed to delete designation' });
    }
  });

  // --- SETTINGS ---
  app.get('/api/settings', (req, res) => {
    res.json(db.companySettings.find());
  });

  app.put('/api/settings', (req, res) => {
    try {
      const settingsSchema = z.object({
        companyName: z.string().min(2),
        officeStartTime: z.string(),
        officeEndTime: z.string(),
        graceTimeMinutes: z.number().min(0),
        halfDayHours: z.number().min(1),
        casualEntitlement: z.number().min(0),
        sickEntitlement: z.number().min(0),
        earnedEntitlement: z.number().min(0),
        compensatoryEntitlement: z.number().min(0),
      });
      const body = settingsSchema.parse(req.body);
      const updated = db.companySettings.update(body);
      res.json(updated);
    } catch (err) {
      res.status(400).json({ error: 'Invalid settings fields' });
    }
  });

  // --- SEED TRIGGER ---
  app.post('/api/seed/reset', (req, res) => {
    try {
      db.reset();
      res.json({ success: true, message: 'Database reset to original seed state successfully.' });
    } catch (err) {
      res.status(500).json({ error: 'Failed to reset database' });
    }
  });

  // --- SYSTEM RECOVERY & BACKUP ---
  app.get('/api/system/status', (req, res) => {
    try {
      const allUsers = db.users.findMany();
      const allAtts = db.attendances.findMany();
      const allLeaves = db.leaveRequests.findMany();
      
      // Default seed is true if there is 1 or fewer users and no attendance or leaves
      const isDefaultSeed = allUsers.length <= 1 && allAtts.length === 0 && allLeaves.length === 0;
      
      res.json({
        isDefaultSeed,
        lastUpdated: (db as any).getLastUpdated ? (db as any).getLastUpdated() : undefined,
        userCount: allUsers.length,
        attendanceCount: allAtts.length,
        leaveCount: allLeaves.length
      });
    } catch (err) {
      res.status(500).json({ error: 'Failed to retrieve system status' });
    }
  });

  app.get('/api/system/export', (req, res) => {
    try {
      const data = (db as any).exportAll();
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: 'Failed to export database state' });
    }
  });

  app.post('/api/system/restore', (req, res) => {
    try {
      const data = req.body;
      (db as any).importAll(data);
      res.json({ success: true, message: 'Database state restored successfully.' });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to restore database state' });
    }
  });

  // ----------------------------------------------------
  // VITE DEV SERVER OR STATIC SERVING MIDDLEWARE
  // ----------------------------------------------------
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('Vite development server loaded as Express middleware.');
  } else {
    // In production, serve the compiled static files
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log('Serving production static directory: dist/');
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Express application running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
