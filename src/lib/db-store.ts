import { User, Department, Designation, Attendance, LeaveRequest, CompanySettings, HydratedUser, HydratedAttendance, HydratedLeaveRequest } from '../types';
import { getSeedData } from './db-seed';

interface DatabaseSchema {
  users: User[];
  departments: Department[];
  designations: Designation[];
  attendances: Attendance[];
  leaveRequests: LeaveRequest[];
  companySettings: CompanySettings;
  lastUpdated?: string;
}

let memoryDb: DatabaseSchema | null = null;
const isServer = typeof window === 'undefined';
let fsModule: any = null;
let pathModule: any = null;
let pgPool: any = null;

const DB_FILE_PATH = './data/db.json';

// Initialize server-side file dependencies
if (isServer) {
  try {
    // Dynamically require to prevent Webpack/Vite bundler issues in the browser
    const req = eval('require');
    fsModule = req('fs');
    pathModule = req('path');
  } catch (e) {
    console.error('Server module imports failed', e);
  }
}

// Ensure database file exists on the server
function ensureRequiredDepartments(dbData: DatabaseSchema) {
  if (!dbData.departments) dbData.departments = [];
  
  const requiredDepts = [
    { id: 'dept-editing', name: 'Editing', description: 'Video, audio, and content editing team' },
    { id: 'dept-smm', name: 'Social Media Managers', description: 'Social media growth and campaigns' },
    { id: 'dept-dm', name: 'Digital Marketing', description: 'Online advertising and digital growth' },
    { id: 'dept-tech', name: 'Tech Team', description: 'Technical operations, development, and support' }
  ];

  let modified = false;
  requiredDepts.forEach(req => {
    const exists = dbData.departments.some(d => d.id === req.id || d.name.toLowerCase() === req.name.toLowerCase());
    if (!exists) {
      dbData.departments.push({
        ...req,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      modified = true;
    }
  });

  if (modified) {
    saveDb(dbData);
  }
}

// Asynchronously load DB from Postgres or fallback file at server startup
export async function initDb(): Promise<DatabaseSchema> {
  if (memoryDb) return memoryDb;

  const dbUrl = process.env.DATABASE_URL;
  if (isServer && dbUrl) {
    try {
      console.log('PostgreSQL DATABASE_URL found. Initializing PostgreSQL store...');
      const { Pool } = eval('require')('pg');
      
      pgPool = new Pool({
        connectionString: dbUrl,
        ssl: dbUrl.includes('localhost') ? false : { rejectUnauthorized: false }
      });

      // Create table if not exists
      await pgPool.query(`
        CREATE TABLE IF NOT EXISTS _kv_store (
          key VARCHAR(255) PRIMARY KEY,
          value TEXT NOT NULL
        );
      `);

      // Load data
      const res = await pgPool.query("SELECT value FROM _kv_store WHERE key = 'db_json'");
      if (res.rows.length > 0) {
        memoryDb = JSON.parse(res.rows[0].value);
        console.log('Successfully loaded database state from PostgreSQL.');
        ensureRequiredDepartments(memoryDb!);
        return memoryDb!;
      } else {
        console.log('PostgreSQL store is empty. Seeding with initial data...');
        const seed = getSeedData();
        memoryDb = seed;
        ensureRequiredDepartments(seed);
        await pgPool.query(
          "INSERT INTO _kv_store (key, value) VALUES ('db_json', $1) ON CONFLICT (key) DO UPDATE SET value = $1",
          [JSON.stringify(seed)]
        );
        console.log('PostgreSQL store seeded successfully.');
        return seed;
      }
    } catch (err) {
      console.error('Failed to initialize or read from PostgreSQL store. Falling back to local file.', err);
    }
  }

  // Local file loading fallback if no PostgreSQL
  return getDbFileContent();
}

function getDbFileContent(): DatabaseSchema {
  if (memoryDb) return memoryDb;

  if (isServer && fsModule && pathModule) {
    try {
      const resolvedPath = pathModule.resolve(DB_FILE_PATH);
      const dirPath = pathModule.dirname(resolvedPath);

      if (!fsModule.existsSync(dirPath)) {
        fsModule.mkdirSync(dirPath, { recursive: true });
      }

      if (fsModule.existsSync(resolvedPath)) {
        const fileContent = fsModule.readFileSync(resolvedPath, 'utf-8');
        memoryDb = JSON.parse(fileContent);
        ensureRequiredDepartments(memoryDb!);
        return memoryDb!;
      }
    } catch (err) {
      console.error('Failed reading DB file, falling back to memory', err);
    }
  }

  // Load from LocalStorage if in browser, or fall back to Seed
  if (!isServer) {
    try {
      const stored = localStorage.getItem('db_store');
      if (stored) {
        memoryDb = JSON.parse(stored);
        ensureRequiredDepartments(memoryDb!);
        return memoryDb!;
      }
    } catch (e) {
      console.error('LocalStorage read failed', e);
    }
  }

  // Fallback to fresh seed
  console.log('Database file not found. Generating rich seed data...');
  const seed = getSeedData();
  memoryDb = seed;
  ensureRequiredDepartments(seed);
  saveDb(seed);
  return seed;
}

function saveDb(data: DatabaseSchema) {
  data.lastUpdated = new Date().toISOString();
  memoryDb = data;
  if (isServer) {
    // 1. Write to local file backup
    try {
      if (fsModule && pathModule) {
        const resolvedPath = pathModule.resolve(DB_FILE_PATH);
        const dirPath = pathModule.dirname(resolvedPath);
        if (!fsModule.existsSync(dirPath)) {
          fsModule.mkdirSync(dirPath, { recursive: true });
        }
        fsModule.writeFileSync(resolvedPath, JSON.stringify(data, null, 2), 'utf-8');
      }
    } catch (err) {
      console.error('Failed writing local DB file backup', err);
    }

    // 2. Write to PostgreSQL in the background if active
    if (pgPool) {
      pgPool.query(
        "INSERT INTO _kv_store (key, value) VALUES ('db_json', $1) ON CONFLICT (key) DO UPDATE SET value = $1",
        [JSON.stringify(data)]
      ).then(() => {
        // Successfully persisted in the cloud
      }).catch((err: any) => {
        console.error('Failed to save database state to PostgreSQL:', err);
      });
    }
  } else {
    try {
      localStorage.setItem('db_store', JSON.stringify(data));
    } catch (e) {
      console.error('LocalStorage write failed', e);
    }
  }
}

// Core Database Methods mimicking Prisma ORM behavior
export const db = {
  // --- USERS ---
  users: {
    findMany: (): User[] => {
      return getDbFileContent().users;
    },
    findUnique: (predicate: (u: User) => boolean): User | undefined => {
      return getDbFileContent().users.find(predicate);
    },
    create: (data: Omit<User, 'id' | 'createdAt' | 'updatedAt' | 'joiningDate'> & { id?: string, joiningDate?: string }): User => {
      const dbData = getDbFileContent();
      const newUser: User = {
        id: data.id || `usr-emp${String(dbData.users.length + 1).padStart(3, '0')}`,
        joiningDate: data.joiningDate || new Date().toISOString().split('T')[0],
        ...data,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      dbData.users.push(newUser);
      saveDb(dbData);
      return newUser;
    },
    update: (id: string, data: Partial<User>): User => {
      const dbData = getDbFileContent();
      const index = dbData.users.findIndex(u => u.id === id);
      if (index === -1) throw new Error(`User with ID ${id} not found.`);
      
      const updatedUser = {
        ...dbData.users[index],
        ...data,
        updatedAt: new Date().toISOString()
      };
      dbData.users[index] = updatedUser;
      saveDb(dbData);
      return updatedUser;
    },
    delete: (id: string): boolean => {
      const dbData = getDbFileContent();
      const initialLength = dbData.users.length;
      dbData.users = dbData.users.filter(u => u.id !== id);
      // Clean up orphaned records
      dbData.attendances = dbData.attendances.filter(a => a.userId !== id);
      dbData.leaveRequests = dbData.leaveRequests.filter(l => l.userId !== id);
      saveDb(dbData);
      return dbData.users.length < initialLength;
    },
  },

  // --- DEPARTMENTS ---
  departments: {
    findMany: (): Department[] => {
      return getDbFileContent().departments;
    },
    create: (name: string, description?: string): Department => {
      const dbData = getDbFileContent();
      const newDept: Department = {
        id: `dept-${name.toLowerCase().replace(/\s+/g, '-')}-${Date.now().toString().slice(-4)}`,
        name,
        description,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      dbData.departments.push(newDept);
      saveDb(dbData);
      return newDept;
    },
    delete: (id: string): boolean => {
      const dbData = getDbFileContent();
      const initialLength = dbData.departments.length;
      dbData.departments = dbData.departments.filter(d => d.id !== id);
      // Clean up departmentId for users
      dbData.users.forEach(u => {
        if (u.departmentId === id) {
          u.departmentId = null;
        }
      });
      saveDb(dbData);
      return dbData.departments.length < initialLength;
    }
  },

  // --- DESIGNATIONS ---
  designations: {
    findMany: (): Designation[] => {
      return getDbFileContent().designations;
    },
    create: (name: string, description?: string): Designation => {
      const dbData = getDbFileContent();
      const newDesg: Designation = {
        id: `desg-${name.toLowerCase().replace(/\s+/g, '-')}-${Date.now().toString().slice(-4)}`,
        name,
        description,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      dbData.designations.push(newDesg);
      saveDb(dbData);
      return newDesg;
    },
    delete: (id: string): boolean => {
      const dbData = getDbFileContent();
      const initialLength = dbData.designations.length;
      dbData.designations = dbData.designations.filter(d => d.id !== id);
      // Clean up designationId for users
      dbData.users.forEach(u => {
        if (u.designationId === id) {
          u.designationId = null;
        }
      });
      saveDb(dbData);
      return dbData.designations.length < initialLength;
    }
  },

  // --- ATTENDANCE ---
  attendances: {
    findMany: (): Attendance[] => {
      return getDbFileContent().attendances;
    },
    findUnique: (predicate: (a: Attendance) => boolean): Attendance | undefined => {
      return getDbFileContent().attendances.find(predicate);
    },
    upsert: (userId: string, date: string, data: Partial<Attendance>): Attendance => {
      const dbData = getDbFileContent();
      const existingIdx = dbData.attendances.findIndex(a => a.userId === userId && a.date === date);

      const computedStatus = (workingHours: number, originalStatus?: string): string => {
        if (originalStatus === 'LEAVE' || originalStatus === 'ABSENT') return originalStatus;
        if (workingHours >= 8.0) return 'PRESENT';
        if (workingHours >= 4.0) return 'HALF_DAY';
        return 'ABSENT';
      };

      if (existingIdx !== -1) {
        const existing = dbData.attendances[existingIdx];
        const updated = {
          ...existing,
          ...data,
          workingHours: data.workingHours !== undefined ? data.workingHours : existing.workingHours,
          status: (data.status || computedStatus(data.workingHours !== undefined ? data.workingHours : existing.workingHours, data.status || existing.status)) as any,
          updatedAt: new Date().toISOString()
        };
        dbData.attendances[existingIdx] = updated;
        saveDb(dbData);
        return updated;
      } else {
        const newRecord: Attendance = {
          id: `att-${userId}-${date}`,
          userId,
          date,
          punchIn: data.punchIn || undefined,
          punchOut: data.punchOut || undefined,
          workingHours: data.workingHours || 0.0,
          status: (data.status || computedStatus(data.workingHours || 0.0, data.status)) as any,
          late: data.late || 0,
          remarks: data.remarks || '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        dbData.attendances.push(newRecord);
        saveDb(dbData);
        return newRecord;
      }
    },
    delete: (id: string): boolean => {
      const dbData = getDbFileContent();
      const initialLength = dbData.attendances.length;
      dbData.attendances = dbData.attendances.filter(a => a.id !== id);
      saveDb(dbData);
      return dbData.attendances.length < initialLength;
    }
  },

  // --- LEAVE REQUESTS ---
  leaveRequests: {
    findMany: (): LeaveRequest[] => {
      return getDbFileContent().leaveRequests;
    },
    create: (data: Omit<LeaveRequest, 'id' | 'createdAt' | 'updatedAt' | 'status'> & { id?: string }): LeaveRequest => {
      const dbData = getDbFileContent();
      const newLeave: LeaveRequest = {
        id: data.id || `leave-${dbData.leaveRequests.length + 1}`,
        status: 'PENDING',
        ...data,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      dbData.leaveRequests.push(newLeave);
      saveDb(dbData);
      return newLeave;
    },
    update: (id: string, data: Partial<LeaveRequest>): LeaveRequest => {
      const dbData = getDbFileContent();
      const index = dbData.leaveRequests.findIndex(l => l.id === id);
      if (index === -1) throw new Error(`Leave with ID ${id} not found.`);

      const updatedLeave = {
        ...dbData.leaveRequests[index],
        ...data,
        updatedAt: new Date().toISOString()
      };
      dbData.leaveRequests[index] = updatedLeave;

      // If approved, dynamically sync user attendance records for dates within range!
      if (updatedLeave.status === 'APPROVED') {
        const start = new Date(updatedLeave.startDate);
        const end = new Date(updatedLeave.endDate);
        const loop = new Date(start);

        while (loop <= end) {
          const dateStr = loop.toISOString().split('T')[0];
          // Skip weekends
          const day = loop.getDay();
          if (day !== 0 && day !== 6) {
            // Upsert attendance record as LEAVE
            const attIdx = dbData.attendances.findIndex(a => a.userId === updatedLeave.userId && a.date === dateStr);
            if (attIdx !== -1) {
              dbData.attendances[attIdx] = {
                ...dbData.attendances[attIdx],
                status: 'LEAVE',
                workingHours: 0.0,
                remarks: `On Approved Leave: ${updatedLeave.leaveType}`,
                updatedAt: new Date().toISOString()
              };
            } else {
              dbData.attendances.push({
                id: `att-${updatedLeave.userId}-${dateStr}`,
                userId: updatedLeave.userId,
                date: dateStr,
                status: 'LEAVE',
                workingHours: 0.0,
                late: 0,
                remarks: `On Approved Leave: ${updatedLeave.leaveType}`,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              });
            }
          }
          loop.setDate(loop.getDate() + 1);
        }
      }

      saveDb(dbData);
      return updatedLeave;
    },
    delete: (id: string): boolean => {
      const dbData = getDbFileContent();
      const initialLength = dbData.leaveRequests.length;
      dbData.leaveRequests = dbData.leaveRequests.filter(l => l.id !== id);
      saveDb(dbData);
      return dbData.leaveRequests.length < initialLength;
    }
  },

  // --- COMPANY SETTINGS ---
  companySettings: {
    find: (): CompanySettings => {
      return getDbFileContent().companySettings;
    },
    update: (data: Partial<CompanySettings>): CompanySettings => {
      const dbData = getDbFileContent();
      const updated = {
        ...dbData.companySettings,
        ...data,
        updatedAt: new Date().toISOString()
      };
      dbData.companySettings = updated;
      saveDb(dbData);
      return updated;
    }
  },

  // --- HYDRATION HELPERS ---
  hydrateUser: (user: User): HydratedUser => {
    const dbData = getDbFileContent();
    const { password, ...safeUser } = user;
    const department = dbData.departments.find(d => d.id === user.departmentId);
    const designation = dbData.designations.find(d => d.id === user.designationId);
    const managerRaw = user.managerId ? dbData.users.find(u => u.id === user.managerId) : undefined;
    
    let manager: Omit<User, 'password'> | undefined;
    if (managerRaw) {
      const { password: _, ...mSafe } = managerRaw;
      manager = mSafe;
    }

    return {
      ...safeUser,
      department,
      designation,
      manager
    };
  },

  hydrateAttendance: (attendance: Attendance): HydratedAttendance => {
    const dbData = getDbFileContent();
    const userRaw = dbData.users.find(u => u.id === attendance.userId);
    const user = userRaw ? db.hydrateUser(userRaw) : undefined;
    return {
      ...attendance,
      user
    };
  },

  hydrateLeaveRequest: (leave: LeaveRequest): HydratedLeaveRequest => {
    const dbData = getDbFileContent();
    const userRaw = dbData.users.find(u => u.id === leave.userId);
    const user = userRaw ? db.hydrateUser(userRaw) : undefined;

    const approverRaw = leave.approvedById ? dbData.users.find(u => u.id === leave.approvedById) : undefined;
    const approvedBy = approverRaw ? db.hydrateUser(approverRaw) : undefined;

    return {
      ...leave,
      user,
      approvedBy
    };
  },

  reset: () => {
    const seed = getSeedData();
    saveDb(seed);
  },
  exportAll: () => {
    return getDbFileContent();
  },
  importAll: (data: DatabaseSchema) => {
    if (!data || !Array.isArray(data.users)) {
      throw new Error('Invalid database backup format.');
    }
    saveDb(data);
  }
};
