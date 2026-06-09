import fs from 'fs';
import path from 'path';

const DB_FILE = path.join(process.cwd(), 'data', 'gms-db.json');

const DEFAULT_ADMIN = {
  uid: 'admin-1',
  email: 'h.rehman@asu.edu.om',
  fullName: 'System Administrator',
  role: 'admin',
  approved: true,
  username: 'admin',
  password: 'hrk26'
};

export interface DbSchema {
  users: Record<string, any>;
  registrationRequests: any[];
  grades: Record<string, any>;
  aiReports: Record<string, any>;
  studentRemarks: Record<string, any>;
  feedbackReports?: any[];
}

function initDb() {
  const dir = path.dirname(DB_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    const initialData: DbSchema = {
      users: {
        [DEFAULT_ADMIN.username]: DEFAULT_ADMIN
      },
      registrationRequests: [],
      grades: {},
      aiReports: {},
      studentRemarks: {}
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2), 'utf-8');
  }
}

export function readDb(): DbSchema {
  initDb();
  try {
    const content = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error("Failed to read database:", error);
    return {
      users: { [DEFAULT_ADMIN.username]: DEFAULT_ADMIN },
      registrationRequests: [],
      grades: {},
      aiReports: {},
      studentRemarks: {}
    };
  }
}

export function writeDb(data: DbSchema) {
  initDb();
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error("Failed to write database:", error);
  }
}
