export type ViewType = 'raw' | 'summative' | 'final' | 'performance' | 'statistics' | 'at-risk' | 'completion' | 'final-report';

export type UserRole = 'admin' | 'instructor';

export interface User {
  uid: string;
  email: string;
  fullName: string;
  role: UserRole;
  approved: boolean;
  username?: string;
  subject?: string;
  password?: string;
  mustChangePassword?: boolean;
}

export interface RegistrationRequest {
  id: string;
  fullName: string;
  email: string;
  subject: 'English';
  requestedAt: string;
  status: 'pending' | 'approved' | 'rejected';
  generatedUsername?: string;
  generatedPassword?: string;
}

export interface StudentData {
  id: string;
  name: string;
  grades: { [key: number]: string };
  gender?: 'M' | 'F';
  status?: string;
  absentees?: string;
  attendanceStatus?: string;
  major?: string;
  tardy?: string;
  attendancePercentage?: string;
  warning?: string;
}

export interface SectionData {
  students: StudentData[];
  deletedStudentIds?: string[];
  isLocked: boolean;
  isCorrectionMode?: boolean;
  formData: {
    semester: string;
    course: string;
    section: string;
    instructor?: string;
    courseTitle?: string;
  };
}

export interface AllCoursesData {
  [key: string]: SectionData;
}

export const RAW_MARKS_LIMITS: { [key: number]: number } = {
  3: 20, // Part
  4: 20, // E-Port
  5: 25, // Pres
  6: 10, // Pop Quiz 1
  7: 10, // Pop Quiz 2
  8: 20, // Test 1 GV
  9: 20, // Test 2 LR
  10: 20, // S. Test
  11: 20, // W. Test
  12: 20, // W. Port
  13: 40, // Midterm LRGV
  14: 10, // Midterm Writing
  15: 40, // Final LRGV
  16: 10, // Final Writing
};

export const SUMMATIVE_MARKS_LIMITS: { [key: number]: number } = {
  3: 10, // Part+e-Port
  4: 10, // Presentation
  5: 2.5, // Pop Quiz 1
  6: 2.5, // Pop Quiz 2
  7: 5, // Test 1 GV
  8: 5, // Test 2 LR
  9: 5, // S. Test
  10: 5, // W. Test
  11: 5, // W. Port
  12: 20, // Midterm
  13: 30, // Final
};

export const FINAL_MARKS_LIMITS: { [key: number]: number } = {
  3: 10,
  4: 30,
  5: 10,
  6: 20,
  7: 30,
};

export const COURSE_OPTIONS = [
  { value: 'FPPI002', label: 'English Pre-Intermediate' },
  { value: 'FPIN003', label: 'English Intermediate' },
  { value: 'FPAD004', label: 'English Advance' },
];

export const SEMESTER_OPTIONS = [
  { value: 'Semester', label: 'Semester' },
  { value: 'Fall', label: 'Fall Semester 2026' },
  { value: 'Spring', label: 'Spring Semester 2026' },
  { value: 'Summer', label: 'Summer Semester 2026' },
];
