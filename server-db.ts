import fs from 'fs';
import path from 'path';
import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  initializeFirestore, 
  doc, 
  setDoc, 
  getDocs, 
  collection, 
  deleteDoc,
  getDocFromServer,
  setLogLevel
} from "firebase/firestore";

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

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: null,
      email: null,
      emailVerified: null,
      isAnonymous: null,
      tenantId: null,
      providerInfo: []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

let dbInstance: any = null;

export function getFirebaseDb() {
  if (dbInstance) return dbInstance;

  const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
  if (!fs.existsSync(configPath)) {
    console.warn("firebase-applet-config.json not found, using local storage mode only.");
    return null;
  }

  try {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const app = getApps().length === 0 ? initializeApp(config) : getApp();
    setLogLevel("error");
    dbInstance = initializeFirestore(app, { experimentalForceLongPolling: true }, config.firestoreDatabaseId);
    return dbInstance;
  } catch (err) {
    console.error("Failed to initialize Firebase app:", err);
    return null;
  }
}

async function testConnection(db: any) {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log("Firebase connection verified and active!");
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration or status.");
    }
  }
}

async function loadAllFromFirestore() {
  const db = getFirebaseDb();
  if (!db) return null;

  try {
    const usersSnap = await getDocs(collection(db, "users"));
    const users: Record<string, any> = {};
    usersSnap.forEach(doc => {
      users[doc.id] = doc.data();
    });

    const regSnap = await getDocs(collection(db, "registrationRequests"));
    const registrationRequests: any[] = [];
    regSnap.forEach(doc => {
      registrationRequests.push({ id: doc.id, ...doc.data() });
    });

    const gradesSnap = await getDocs(collection(db, "sectionGrades"));
    const grades: Record<string, any> = {};
    gradesSnap.forEach(doc => {
      grades[doc.id] = doc.data();
    });

    const aiSnap = await getDocs(collection(db, "aiReports"));
    const aiReports: Record<string, any> = {};
    aiSnap.forEach(doc => {
      aiReports[doc.id] = doc.data();
    });

    const remarksSnap = await getDocs(collection(db, "studentRemarks"));
    const studentRemarks: Record<string, any> = {};
    remarksSnap.forEach(doc => {
      studentRemarks[doc.id] = doc.data();
    });

    const feedbackSnap = await getDocs(collection(db, "feedbackReports"));
    const feedbackReports: any[] = [];
    feedbackSnap.forEach(doc => {
      feedbackReports.push({ id: doc.id, ...doc.data() });
    });

    return {
      users,
      registrationRequests,
      grades,
      aiReports,
      studentRemarks,
      feedbackReports
    };
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, "all_collections");
    return null;
  }
}

async function migrateLocalToFirestore(localDb: DbSchema) {
  const db = getFirebaseDb();
  if (!db) return;

  try {
    console.log("Starting automatic database migration to Firestore...");
    
    // 1. Users
    for (const [username, userData] of Object.entries(localDb.users)) {
      await setDoc(doc(db, "users", username), userData);
    }

    // 2. Registration Requests
    for (const req of (localDb.registrationRequests || [])) {
      if (req.id) {
        await setDoc(doc(db, "registrationRequests", req.id), req);
      }
    }

    // 3. Grades
    for (const [secKey, secData] of Object.entries(localDb.grades || {})) {
      await setDoc(doc(db, "sectionGrades", secKey), secData);
    }

    // 4. AI Reports
    for (const [repKey, repData] of Object.entries(localDb.aiReports || {})) {
      await setDoc(doc(db, "aiReports", repKey), repData);
    }

    // 5. Student Remarks
    for (const [remKey, remData] of Object.entries(localDb.studentRemarks || {})) {
      await setDoc(doc(db, "studentRemarks", remKey), remData);
    }

    // 6. Feedback Reports
    for (const fb of (localDb.feedbackReports || [])) {
      if (fb.id) {
        await setDoc(doc(db, "feedbackReports", fb.id), fb);
      }
    }

    console.log("Database migration to Firestore finished successfully!");
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, "migration");
  }
}

let cachedDb: DbSchema | null = null;

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
  
  if (cachedDb) {
    return cachedDb;
  }

  try {
    const content = fs.readFileSync(DB_FILE, 'utf-8');
    cachedDb = JSON.parse(content);
  } catch (error) {
    cachedDb = {
      users: { [DEFAULT_ADMIN.username]: DEFAULT_ADMIN },
      registrationRequests: [],
      grades: {},
      aiReports: {},
      studentRemarks: {}
    };
  }

  return cachedDb;
}

export function writeDb(newDb: DbSchema) {
  initDb();
  
  // Write to local json file synchronously immediately for local durability
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(newDb, null, 2), 'utf-8');
  } catch (error) {
    console.error("Failed to write database file:", error);
  }

  // Calculate and sync only the changes to Firestore in the background
  const oldDb = cachedDb || readDb();
  cachedDb = JSON.parse(JSON.stringify(newDb));

  const db = getFirebaseDb();
  if (!db) return;

  Promise.resolve().then(async () => {
    try {
      // 1. Users
      const oldUsers = oldDb.users || {};
      const newUsers = newDb.users || {};
      for (const [username, user] of Object.entries(newUsers)) {
        if (JSON.stringify(user) !== JSON.stringify(oldUsers[username])) {
          await setDoc(doc(db, "users", username), user);
        }
      }
      for (const username of Object.keys(oldUsers)) {
        if (!newUsers[username]) {
          await deleteDoc(doc(db, "users", username));
        }
      }

      // 2. Registration Requests
      const oldReqs = oldDb.registrationRequests || [];
      const newReqs = newDb.registrationRequests || [];
      const oldReqsMap = new Map(oldReqs.map((r: any) => [r.id, r]));
      const newReqsMap = new Map(newReqs.map((r: any) => [r.id, r]));

      for (const [id, req] of newReqsMap.entries()) {
        if (JSON.stringify(req) !== JSON.stringify(oldReqsMap.get(id))) {
          await setDoc(doc(db, "registrationRequests", id), req);
        }
      }
      for (const id of oldReqsMap.keys()) {
        if (!newReqsMap.has(id)) {
          await deleteDoc(doc(db, "registrationRequests", id));
        }
      }

      // 3. Section Grades
      const oldGrades = oldDb.grades || {};
      const newGrades = newDb.grades || {};
      for (const [secKey, secData] of Object.entries(newGrades)) {
        if (JSON.stringify(secData) !== JSON.stringify(oldGrades[secKey])) {
          await setDoc(doc(db, "sectionGrades", secKey), secData);
        }
      }
      for (const secKey of Object.keys(oldGrades)) {
        if (!newGrades[secKey]) {
          await deleteDoc(doc(db, "sectionGrades", secKey));
        }
      }

      // 4. AI Reports
      const oldAi = oldDb.aiReports || {};
      const newAi = newDb.aiReports || {};
      for (const [key, val] of Object.entries(newAi)) {
        if (JSON.stringify(val) !== JSON.stringify(oldAi[key])) {
          await setDoc(doc(db, "aiReports", key), val);
        }
      }
      for (const key of Object.keys(oldAi)) {
        if (!newAi[key]) {
          await deleteDoc(doc(db, "aiReports", key));
        }
      }

      // 5. Student Remarks
      const oldRem = oldDb.studentRemarks || {};
      const newRem = newDb.studentRemarks || {};
      for (const [key, val] of Object.entries(newRem)) {
        if (JSON.stringify(val) !== JSON.stringify(oldRem[key])) {
          await setDoc(doc(db, "studentRemarks", key), val);
        }
      }
      for (const key of Object.keys(oldRem)) {
        if (!newRem[key]) {
          await deleteDoc(doc(db, "studentRemarks", key));
        }
      }

      // 6. Feedback Reports
      const oldFb = oldDb.feedbackReports || [];
      const newFb = newDb.feedbackReports || [];
      const oldFbMap = new Map(oldFb.map((f: any) => [f.id, f]));
      const newFbMap = new Map(newFb.map((f: any) => [f.id, f]));

      for (const [id, fb] of newFbMap.entries()) {
        if (JSON.stringify(fb) !== JSON.stringify(oldFbMap.get(id))) {
          await setDoc(doc(db, "feedbackReports", id), fb);
        }
      }
      for (const id of oldFbMap.keys()) {
        if (!newFbMap.has(id)) {
          await deleteDoc(doc(db, "feedbackReports", id));
        }
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, "async_diff_sync");
    }
  });
}

export async function initializeFirestoreDb() {
  const db = getFirebaseDb();
  if (!db) {
    console.log("Working in offline backup local mode.");
    return;
  }

  // Perform Connection Test (CRITICAL Guideline constraint)
  await testConnection(db);

  try {
    console.log("Loading initial records from cloud Firestore...");
    const firestoreData = await loadAllFromFirestore();
    const localDb = readDb(); // Loads local JSON file

    if (firestoreData) {
      const hasCloudUsers = firestoreData.users && Object.keys(firestoreData.users).length > 0;
      if (hasCloudUsers) {
        console.log("Found cloud database records. Syncing memory cache with Firestore.");
        cachedDb = {
          users: firestoreData.users,
          registrationRequests: firestoreData.registrationRequests || [],
          grades: firestoreData.grades || {},
          aiReports: firestoreData.aiReports || {},
          studentRemarks: firestoreData.studentRemarks || {},
          feedbackReports: firestoreData.feedbackReports || []
        };
        
        // Keep the local backup file synchronous
        try {
          fs.writeFileSync(DB_FILE, JSON.stringify(cachedDb, null, 2), 'utf-8');
        } catch (err) {}
      } else {
        // Cloud is empty. Perform migration.
        console.log("Cloud Firestore is empty. Initializing automatic migration from local backup...");
        await migrateLocalToFirestore(localDb);
        cachedDb = localDb;
      }
    } else {
      console.log("Could not load Firestore records. Keeping local database cache.");
      cachedDb = localDb;
    }
  } catch (err) {
    console.error("Initiation of Firestore failed, using cached database.", err);
  }
}
