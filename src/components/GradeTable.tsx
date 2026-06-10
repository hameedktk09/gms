import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'motion/react';
import {
  Table,
  TableBody,
  TableFooter,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  ViewType, 
  StudentData, 
  RAW_MARKS_LIMITS,
  SUMMATIVE_MARKS_LIMITS,
  AllCoursesData,
  COURSE_OPTIONS,
  SEMESTER_OPTIONS,
  User
} from '@/src/types';
import { ClfsLogo } from './ClfsLogo';
import { 
  calculateFinalValues, 
  calculateSummativeValues, 
  getPerformanceAnalysisData,
  calculateAtRiskDistribution,
  getStudentStatus,
  generatePetitionResponse,
  getGradeColorClass,
  getGradeColor,
  generateSISExportScript,
  generateSISCleanScript,
  parseStudentName,
  getCourseReportSummary
} from '@/src/lib/grade-utils';
import { cn } from '@/lib/utils';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { 
  TrendingUp,
  Mail, 
  ChevronDown,
  ChevronUp, 
  FileText, 
  ExternalLink, 
  Eye,
  Send,
  Search,
  BarChart3,
  AlertCircle,
  CheckCircle,
  ShieldAlert,
  FileDown, 
  FileUp, 
  Trash2, 
  Lock, 
  Unlock, 
  Terminal,
  FileSpreadsheet,
  FileJson,
  Eraser,
  ClipboardCheck,
  ClipboardX,
  Save,
  Download,
  Printer,
  Table as TableIcon,
  PieChart,
  Calculator,
  LogOut,
  BookOpen,
  Users,
  KeyRound,
  Plus,
  Sparkles,
} from 'lucide-react';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { toast } from "sonner";
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

import { FinalReport } from './FinalReport';
import { FloatingFeedback } from './FloatingFeedback';
import { StudentDetailModal } from './StudentDetailModal';

export function cleanInstructorText(text: string): string {
  if (!text) return '';
  // Truncate at first occurrence of case-insensitive metadata keywords / details
  const pattern = /\b(Semester|Course|Crs|Sec|Section|Dept|Academic\s+Year|Year|Fall|Spring|Summer|20\d{2})\b/i;
  const match = text.match(pattern);
  if (match && match.index !== undefined) {
    text = text.substring(0, match.index).trim();
  }
  return text.replace(/^[:,\s-]+|[:,\s-]+$/g, '').trim();
}

interface GradeTableProps {
  view: ViewType;
  students: StudentData[];
  isLocked: boolean;
  onUpdateGrade: (studentId: string, index: number, value: string) => void;
  onShowStats: () => void;
  onToggleLock: () => void;
  onClearGrades: () => void;
  onClearStudents: () => void;
  onImportStudents: (students: StudentData[], options?: { isProfileOnly?: boolean, isAttendanceOnly?: boolean, targetKey?: string }) => void;
  onSyncImport?: (valid: StudentData[], deleted: StudentData[], targetKey?: string) => void;
  onBulkSyncImport?: (sections: Array<{ validStudents: StudentData[]; deletedStudents: StudentData[]; targetKey: string }>) => void;
  onImportAllData: (data: AllCoursesData) => void;
  onSetView: (view: ViewType) => void;
  onUpdateMetaData: (semester: string, course: string, section: string, instructor?: string, courseTitle?: string) => void;
  onSaveJson: () => void;
  onSaveLocal: () => void;
  getSectionKey: (semester: string, course: string, section: string) => string;
  hasUnsavedChanges: boolean;
  allData: AllCoursesData;
  currentSectionData: any;
  semester: string;
  setSemester: (v: string) => void;
  course: string;
  setCourse: (v: string) => void;
  section: string;
  setSection: (v: string) => void;
  availableCourses: string[];
  availableSections: string[];
  user: User | null;
  onLogout: () => void;
  onOpenAdmin: () => void;
  onChangePassword: () => void;
  onAddSection?: (sectionCode: string) => void;
  hidePrintHeader?: boolean;
  isCloudActive?: boolean;
}

export function GradeTable({ 
  view, 
  students, 
  isLocked, 
  onUpdateGrade, 
  onShowStats,
  onToggleLock,
  onClearGrades,
  onClearStudents,
  onImportStudents,
  onSyncImport,
  onBulkSyncImport,
  onImportAllData,
  onSetView,
  onUpdateMetaData,
  onSaveJson,
  onSaveLocal,
  getSectionKey,
  hasUnsavedChanges,
  allData,
  currentSectionData,
  semester,
  setSemester,
  course,
  setCourse,
  section,
  setSection,
  availableCourses,
  availableSections,
  user,
  onLogout,
  onOpenAdmin,
  onChangePassword,
  onAddSection,
  hidePrintHeader,
  isCloudActive
}: GradeTableProps) {
  const [emailCategory, setEmailCategory] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const hasAnyStudentsInSemester = React.useMemo(() => {
    return Object.values(allData).some(sec => {
      return sec.formData?.semester === semester && sec.students && sec.students.length > 0;
    });
  }, [allData, semester]);

  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const renderSortIndicator = (key: string) => {
    if (!sortConfig || sortConfig.key !== key) return <div className="w-3 h-3 ml-1 inline-block" />;
    return sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3 ml-1 inline" /> : <ChevronDown className="w-3 h-3 ml-1 inline" />;
  };
  const [selectedStudent, setSelectedStudent] = useState<StudentData | null>(null);
  const [importResults, setImportResults] = useState<{
    multiple: boolean;
    sections: {
      fileName: string;
      targetKey: string;
      semester: string;
      course: string;
      section: string;
      validStudents: StudentData[];
      newStudents: StudentData[];
      deletedStudents: StudentData[];
      errors: { row: number; message: string; data?: string }[];
      totalRows: number;
    }[];
  } | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const htmlInputRef = useRef<HTMLInputElement>(null);
  const jsonInputRef = useRef<HTMLInputElement>(null);
  const excelInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const pendingFocusIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (pendingFocusIdRef.current) {
      const el = document.getElementById(pendingFocusIdRef.current);
      if (el) {
        (el as HTMLInputElement).focus();
        (el as HTMLInputElement).select();
      }
      pendingFocusIdRef.current = null;
    }
  });

  const uploadedSections = React.useMemo(() => {
    const sections: string[] = [];
    const currentCourse = currentSectionData.formData.course;
    const currentSemester = currentSectionData.formData.semester;

    Object.entries(allData).forEach(([key, section]) => {
      // Only include sections for the current course and semester
      if (key.startsWith(`SGS_${currentSemester}_${currentCourse}_`) && 
          section.students.length > 0 && 
          section.formData.section) {
        sections.push(`Sec-${section.formData.section}.CSV`);
      }
    });
    return sections;
  }, [allData, currentSectionData.formData.course, currentSectionData.formData.semester]);


  const importTooltip = uploadedSections.length > 0 
    ? `Uploaded: ${uploadedSections.join(', ')}` 
    : "Expected format: Sec-x.CVS, Sec-x.CSV";

  const getAvailableSemesters = () => {
    const semesters = new Set<string>();
    semesters.add(semester);
    
    // Add all semesters found in allData keys
    Object.keys(allData).forEach(key => {
      const match = key.match(/^SGS_([^_]+)_/);
      if (match && match[1]) {
        semesters.add(match[1]);
      }
    });
    
    // Also parse from semester values in section data formData
    Object.values(allData).forEach(sec => {
      if (sec.formData?.semester) {
        semesters.add(sec.formData.semester);
      }
    });

    return Array.from(semesters).sort();
  };

  const extractMetadataFromFilename = (fileName: string) => {
    const baseName = fileName.replace(/\.[^/.]+$/, "");
    
    // Course patterns (highest to lowest priority)
    const coursePatterns = [
      // English course codes
      { pattern: /FP00000/i, code: 'FPPI002' },
      { pattern: /FPPI002/i, code: 'FPPI002' },
      { pattern: /FPIN003/i, code: 'FPIN003' },
      { pattern: /FPAD004/i, code: 'FPAD004' },
      
      // English course names
      { pattern: /English\s*Advance/i, code: 'FPAD004' },
      { pattern: /English\s*Intermediate/i, code: 'FPIN003' },
      { pattern: /English\s*Pre-Intermediate/i, code: 'FPPI002' },
      { pattern: /English/i, code: 'FPPI002' }
    ];
    
    // Section patterns
    const sectionPatterns = [
      /Section[\s_.-]*#?[\s_.-]*(\d{1,2})/i, 
      /Sec[\s_.-]*#?[\s_.-]*(\d{1,2})/i, 
      /Sec\s*-\s*(\d+)/i, // Explicitly match Sec-4
      /S(\d{1,2})\b/i,
      /[\s_-]S?(\d{1,2})[\s_-]/i,
      /S?(\d{1,2})$/i,
      /\bS(\d{1,2})\b/i,
      /\b(\d{1,2})\b/
    ];

    // Semester patterns (case-insensitive)
    const semesterPatterns = [
      { pattern: /FALL/i, value: 'Fall' },
      { pattern: /SPRING/i, value: 'Spring' },
      { pattern: /SUMMER/i, value: 'Summer' }
    ];

    // Find course
    let detectedCode = "";
    for (const { pattern, code } of coursePatterns) {
      if (pattern.test(baseName)) {
        detectedCode = code;
        break;
      }
    }
    
    // Find section
    let detectedSection = "";
    for (const pattern of sectionPatterns) {
      const match = baseName.match(pattern);
      if (match && match[1]) {
        detectedSection = match[1].padStart(2, '0');
        break;
      }
    }

    // Find semester
    let detectedSemester = "";
    for (const { pattern, value } of semesterPatterns) {
      if (pattern.test(baseName)) {
        detectedSemester = value;
        break;
      }
    }

    return { 
      semester: detectedSemester || undefined, 
      course: detectedCode || undefined, 
      section: detectedSection || undefined 
    };
  };

  const handleCsvImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setIsSaving(true);
    try {
      const parsedSectionsList = [];

      for (let f = 0; f < files.length; f++) {
        const file = files[f];
        const meta = extractMetadataFromFilename(file.name);
        
        // Determine the target identifiers for this file
        const targetSemester = meta.semester || currentSectionData.formData.semester || "Fall";
        const targetCourse = meta.course || currentSectionData.formData.course || "FPPI002";
        const targetSection = meta.section || (meta.course && meta.course !== course ? "01" : currentSectionData.formData.section || "01");
        const targetKey = getSectionKey(targetSemester, targetCourse, targetSection);

        const content = await file.text();
        let students: StudentData[] = [];
        let errors: { row: number; message: string; data?: string }[] = [];

        // CSV parsing
        const lines = content.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
        if (lines.length > 0) {
          // Detect headers from the first line
          const headers = lines[0].split(/[,\t;]/).map(h => h.trim().replace(/^["']|["']$/g, '').toLowerCase());
          
          // Precise high-priority match for ID
          let idIndex = headers.findIndex(h => 
            h === 'id' || 
            h === 'student id' || 
            h === 'student_id' || 
            h === 'student code' || 
            h === 'studentcode' || 
            h === 'std id' || 
            h === 'stud id' || 
            h === 'id no' || 
            h === 'id no.' || 
            h === 'id number'
          );

          if (idIndex === -1) {
            // Priority 2: contains specific ID descriptors
            idIndex = headers.findIndex(h => 
              h.includes('student id') || 
              h.includes('student_id') || 
              h.includes('id number') || 
              h.includes('std id') || 
              h.includes('stud id')
            );
          }

          if (idIndex === -1) {
            // Priority 3: any column containing 'id' or 'code' (excluding non-id strings)
            idIndex = headers.findIndex(h => 
              (h.includes('id') || h.includes('code')) && 
              !h.includes('guide') && 
              !h.includes('provided') && 
              !h.includes('name')
            );
          }

          if (idIndex === -1) {
            // Priority 4: 'no' or 'no.' (excluding phone numbers / mobile)
            idIndex = headers.findIndex(h => 
              (h === 'no.' || h === 'no' || h === 'sno' || h === 's.no') && 
              !h.includes('phone') && 
              !h.includes('mobile')
            );
          }

          // Precise high-priority match for Name
          let nameIndex = headers.findIndex(h => 
            h === 'name' || 
            h === 'student name' || 
            h === 'student_name' || 
            h === 'full name' || 
            h === 'fullname' || 
            h === 'english name' || 
            h === 'name english' || 
            h === 'student name english'
          );

          if (nameIndex === -1) {
            // Priority 2: contains 'name' but NOT identifiers, contact info, or serial number indicators
            nameIndex = headers.findIndex(h => 
              h.includes('name') && 
              !h.includes('id') && 
              !h.includes('code') && 
              !h.includes('no') && 
              !h.includes('number') && 
              !h.includes('phone') && 
              !h.includes('mobile')
            );
          }

          if (nameIndex === -1) {
            // Priority 3: contains 'student' but NOT identifiers, contact info, etc.
            nameIndex = headers.findIndex(h => 
              h.includes('student') && 
              !h.includes('id') && 
              !h.includes('code') && 
              !h.includes('no') && 
              !h.includes('number') && 
              !h.includes('phone') && 
              !h.includes('mobile')
            );
          }

          let genderIndex = headers.findIndex(h => h === 'gender' || h === 'sex' || h === 'm/f' || h === 'g' || h.includes('gender') || h.includes('sex'));
          let statusIndex = headers.findIndex(h => h === 'status' || h === 'state' || h === 'remark' || h === 'remarks' || h.includes('status') || h.includes('remark') || h.includes('state'));

          // Core fallbacks if nothing matched
          if (idIndex === -1) idIndex = 0;
          if (nameIndex === -1) nameIndex = idIndex === 0 ? 1 : 0;
          if (genderIndex === -1) genderIndex = -1;
          if (statusIndex === -1) statusIndex = -1;

          // Crucial safeguard: Ensure student Name and ID don't point to the exact same column
          if (nameIndex === idIndex) {
            if (idIndex === 0) {
              nameIndex = 1;
            } else {
              idIndex = 0;
            }
          }

          // Find indices of final weighted grade columns
          let partPortIdx = -1;
          let testsIdx = -1;
          let presIdx = -1;
          let midtermIdx = -1;
          let finalIdx = -1;
          
          // Find indices of raw grade columns
          let raw_partIdx = -1;
          let raw_eportIdx = -1;
          let raw_presIdx = -1;
          let raw_pq1Idx = -1;
          let raw_pq2Idx = -1;
          let raw_t1Idx = -1;
          let raw_t2Idx = -1;
          let raw_stestIdx = -1;
          let raw_wtestIdx = -1;
          let raw_wportIdx = -1;
          let raw_mid1Idx = -1;
          let raw_mid2Idx = -1;
          let raw_fin1Idx = -1;
          let raw_fin2Idx = -1;

          headers.forEach((h, idx) => {
            if (idx === idIndex || idx === nameIndex) return;
            const hClean = h.toLowerCase().trim();
            
            // Final/Summative Headers Matching (matching columns from user's CSV)
            if ((hClean.includes('participation') && hClean.includes('portfolio')) || 
                (hClean.includes('participation') && hClean.includes('e-portfolio')) || 
                (hClean.includes('participation') && hClean.includes('eportfolio')) || 
                hClean.includes('part and e-port') || 
                hClean.includes('part & e-port')) {
              partPortIdx = idx;
            } else if (hClean.includes('tests of') || hClean.includes('tests [') || hClean === 'tests' || hClean === 'tests of 30') {
              testsIdx = idx;
            } else if (hClean.includes('presentation of') || hClean.includes('presentation [') || hClean === 'presentation' || hClean === 'presentation of 10') {
              presIdx = idx;
            } else if (hClean.includes('midterm of') || hClean.includes('midterm [') || hClean === 'midterm' || hClean === 'midterm of 20') {
              midtermIdx = idx;
            } else if (hClean.includes('final of') || hClean.includes('final [') || hClean.includes('final exam') || hClean === 'final of 30' || hClean === 'final') {
              finalIdx = idx;
            }
            
            // Raw Headers Matching (keys 3 to 16)
            else if (hClean === 'participation' || hClean === 'part' || hClean.startsWith('participation (')) {
              raw_partIdx = idx;
            } else if (hClean === 'e-portfolio' || hClean === 'eportfolio' || hClean === 'e-port' || hClean === 'eport') {
              raw_eportIdx = idx;
            } else if (hClean === 'presentation' || hClean === 'pres') {
              raw_presIdx = idx;
            } else if (hClean.includes('pop quiz 1') || hClean === 'pq1' || hClean === 'quiz1' || hClean === 'quiz 1') {
              raw_pq1Idx = idx;
            } else if (hClean.includes('pop quiz 2') || hClean === 'pq2' || hClean === 'quiz2' || hClean === 'quiz 2') {
              raw_pq2Idx = idx;
            } else if (hClean.includes('test 1') || hClean === 't1') {
              raw_t1Idx = idx;
            } else if (hClean.includes('test 2') || hClean === 't2') {
              raw_t2Idx = idx;
            } else if (hClean.includes('speaking test') || hClean === 's. test' || hClean === 's test' || hClean === 'speaking') {
              raw_stestIdx = idx;
            } else if (hClean.includes('writing test') || hClean === 'w. test' || hClean === 'w test' || hClean === 'writing') {
              raw_wtestIdx = idx;
            } else if (hClean.includes('writing portfolio') || hClean === 'w. port' || hClean === 'w port' || hClean === 'writing portfolio') {
              raw_wportIdx = idx;
            } else if (hClean.includes('midterm lrgv') || hClean.includes('midterm (lrgv)') || hClean.includes('midterm lrgv 40')) {
              raw_mid1Idx = idx;
            } else if (hClean.includes('midterm writing') || hClean.includes('midterm writing 10')) {
              raw_mid2Idx = idx;
            } else if (hClean.includes('final lrgv') || hClean.includes('final (lrgv)') || hClean.includes('final lrgv 40')) {
              raw_fin1Idx = idx;
            } else if (hClean.includes('final writing') || hClean.includes('final writing 10')) {
              raw_fin2Idx = idx;
            }
          });

          // Fallback presentation matching if exact final/raw checks overlapping
          if (presIdx === -1 && raw_presIdx !== -1) presIdx = raw_presIdx;

          for (let i = 1; i < lines.length; i++) {
            const rowText = lines[i].trim();
            if (!rowText) continue;

            const parts = rowText.split(/[,\t;]/).map(p => p.trim().replace(/^["']|["']$/g, ''));
            
            let id = idIndex !== -1 && idIndex < parts.length ? parts[idIndex] || '' : '';
            let name = nameIndex !== -1 && nameIndex < parts.length ? parts[nameIndex] || '' : '';
            let genderRaw = genderIndex !== -1 && genderIndex < parts.length ? parts[genderIndex] || '' : '';
            let statusVal = statusIndex !== -1 && statusIndex < parts.length ? parts[statusIndex] || '' : '';

            if (!id || !name || !genderRaw) {
              let fallbackId = '';
              let fallbackName = '';
              let fallbackGender = '';
              let fallbackStatus = '';

              for (let j = 0; j < parts.length; j++) {
                const p = parts[j].trim();
                if (/^\d{5,9}$/.test(p)) {
                  fallbackId = p;
                } else if (/^(Male|Female|M|F)$/i.test(p)) {
                  fallbackGender = p[0].toUpperCase();
                } else if (p.length > 0 && !fallbackName) {
                  fallbackName = p;
                } else if (p.length > 0 && j === parts.length - 1) {
                  if (/^(FA|W|WA|PST|IP|I)$/i.test(p)) {
                    fallbackStatus = p;
                  }
                }
              }
              if (fallbackId && fallbackName) {
                id = fallbackId;
                name = fallbackName;
                if (fallbackGender) genderRaw = fallbackGender;
                if (fallbackStatus && !statusVal) statusVal = fallbackStatus;
              }
            }

            id = id.trim().replace(/\D/g, '');
            
            // Double safeguard: If final name consists purely of digits, it's actually an ID, so don't fill it in student name
            if (name && /^\d+$/.test(name.replace(/[\s-]/g, ''))) {
              name = '';
            }
            
            let genderNormalized: 'M' | 'F' | undefined = undefined;
            if (/^(M|Male)$/i.test(genderRaw.trim())) {
              genderNormalized = 'M';
            } else if (/^(F|Female)$/i.test(genderRaw.trim())) {
              genderNormalized = 'F';
            }

            if (id && name) {
              const parsedNameInfo = parseStudentName(name);
              const finalName = parsedNameInfo.cleanedName || name;
              const finalGender = genderNormalized || (parsedNameInfo.gender as 'M' | 'F') || 'M';
              
              let rawFinalStatus = (statusVal || parsedNameInfo.status || '').toUpperCase().trim();
              if (/^\d+(\.\d+)?$/.test(rawFinalStatus)) {
                rawFinalStatus = '';
              }
              const finalStatus = rawFinalStatus;

              // Parse and map grades dynamically if grades columns are detected
              const studentGrades: { [key: number]: string } = {};

              const extractVal = (colIdx: number) => {
                if (colIdx === -1 || colIdx >= parts.length) return undefined;
                const rawVal = parts[colIdx]?.trim() || '';
                const num = parseFloat(rawVal);
                return isNaN(num) ? undefined : num;
              };

              // 1. Map individual raw columns if available
              if (extractVal(raw_partIdx) !== undefined) studentGrades[3] = String(extractVal(raw_partIdx));
              if (extractVal(raw_eportIdx) !== undefined) studentGrades[4] = String(extractVal(raw_eportIdx));
              if (extractVal(raw_presIdx) !== undefined) studentGrades[5] = String(extractVal(raw_presIdx));
              if (extractVal(raw_pq1Idx) !== undefined) studentGrades[6] = String(extractVal(raw_pq1Idx));
              if (extractVal(raw_pq2Idx) !== undefined) studentGrades[7] = String(extractVal(raw_pq2Idx));
              if (extractVal(raw_t1Idx) !== undefined) studentGrades[8] = String(extractVal(raw_t1Idx));
              if (extractVal(raw_t2Idx) !== undefined) studentGrades[9] = String(extractVal(raw_t2Idx));
              if (extractVal(raw_stestIdx) !== undefined) studentGrades[10] = String(extractVal(raw_stestIdx));
              if (extractVal(raw_wtestIdx) !== undefined) studentGrades[11] = String(extractVal(raw_wtestIdx));
              if (extractVal(raw_wportIdx) !== undefined) studentGrades[12] = String(extractVal(raw_wportIdx));
              if (extractVal(raw_mid1Idx) !== undefined) studentGrades[13] = String(extractVal(raw_mid1Idx));
              if (extractVal(raw_mid2Idx) !== undefined) studentGrades[14] = String(extractVal(raw_mid2Idx));
              if (extractVal(raw_fin1Idx) !== undefined) studentGrades[15] = String(extractVal(raw_fin1Idx));
              if (extractVal(raw_fin2Idx) !== undefined) studentGrades[16] = String(extractVal(raw_fin2Idx));

              // 2. Map final weighted categories (e.g. from user's attached file)
              const partPortVal = extractVal(partPortIdx);
              if (partPortVal !== undefined) {
                const rawEqVal = (partPortVal / 10) * 20;
                const fmt = (Math.round(rawEqVal * 10) / 10).toString();
                studentGrades[3] = fmt;
                studentGrades[4] = fmt;
              }

              const testsVal = extractVal(testsIdx);
              if (testsVal !== undefined) {
                const rawEq5 = (testsVal / 30) * 20;
                const rawEq2_5 = (testsVal / 30) * 10;
                const fmt5 = (Math.round(rawEq5 * 10) / 10).toString();
                const fmt2_5 = (Math.round(rawEq2_5 * 10) / 10).toString();
                studentGrades[6] = fmt2_5;
                studentGrades[7] = fmt2_5;
                studentGrades[8] = fmt5;
                studentGrades[9] = fmt5;
                studentGrades[10] = fmt5;
                studentGrades[11] = fmt5;
                studentGrades[12] = fmt5;
              }

              const presVal = extractVal(presIdx);
              if (presVal !== undefined) {
                const rawEqVal = (presVal / 10) * 25;
                studentGrades[5] = (Math.round(rawEqVal * 10) / 10).toString();
              }

              const midtermVal = extractVal(midtermIdx);
              if (midtermVal !== undefined) {
                const rawEq13 = (midtermVal / 20) * 40;
                const rawEq14 = (midtermVal / 20) * 10;
                studentGrades[13] = (Math.round(rawEq13 * 10) / 10).toString();
                studentGrades[14] = (Math.round(rawEq14 * 10) / 10).toString();
              }

              const finalVal = extractVal(finalIdx);
              if (finalVal !== undefined) {
                const rawEq15 = (finalVal / 30) * 40;
                const rawEq16 = (finalVal / 30) * 10;
                studentGrades[15] = (Math.round(rawEq15 * 10) / 10).toString();
                studentGrades[16] = (Math.round(rawEq16 * 10) / 10).toString();
              }

              students.push({
                id: id.padStart(7, '0'),
                name: finalName,
                gender: finalGender as 'M' | 'F',
                status: finalStatus || undefined,
                grades: studentGrades
              });
            } else {
              errors.push({
                row: i + 1,
                message: `Unable to extract ID and Student Name robustly`,
                data: rowText.length > 60 ? rowText.substring(0, 60) + '...' : rowText
              });
            }
          }

          if (students.length > 0 || errors.length > 0) {
            const targetSectionObj = allData[targetKey] || { students: [] };
            const existingIds = new Set(targetSectionObj.students.map((s: StudentData) => (s.id || '').trim()));
            const csvIds = new Set(students.map((s: StudentData) => (s.id || '').trim()));

            parsedSectionsList.push({
              fileName: file.name,
              targetKey: targetKey,
              semester: targetSemester,
              course: targetCourse,
              section: targetSection,
              validStudents: students,
              newStudents: students.filter(s => {
                const id = (s.id || '').trim();
                return id && !existingIds.has(id);
              }),
              deletedStudents: targetSectionObj.students.filter((s: StudentData) => {
                const id = (s.id || '').trim();
                return id && !csvIds.has(id);
              }),
              errors: errors,
              totalRows: lines.length - 1
            });
          }
        }
      }

      if (parsedSectionsList.length > 0) {
        setImportResults({
          multiple: parsedSectionsList.length > 1,
          sections: parsedSectionsList
        });
      } else {
        toast.error("No valid student data found in files");
      }
    } catch (err) {
      toast.error("Failed to parse file(s)");
    } finally {
      setIsSaving(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleJsonImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsSaving(true);
    try {
      const content = await file.text();
      const data = JSON.parse(content);
      console.log('Importing JSON data:', data);
      
      // Determine format: single section (SectionData), wrapped section, or full backup (AllCoursesData)
      const keys = Object.keys(data);
      const isSingleSectionWrapped = keys.length === 1 && data[keys[0]].students && data[keys[0]].formData;
      const isSingleSectionBare = data.students && data.formData;

      let mappedSemesterMsg = "";

      if (isSingleSectionWrapped) {
        const originalKey = keys[0];
        const sectionObj = data[originalKey];
        const origSem = sectionObj.formData.semester;
        
        // Map to currently selected/active semester
        const mappedSem = semester;
        const mappedCourse = sectionObj.formData.course;
        const mappedSec = sectionObj.formData.section;
        
        sectionObj.formData.semester = mappedSem;
        const newKey = getSectionKey(mappedSem, mappedCourse, mappedSec);
        
        onUpdateMetaData(mappedSem, mappedCourse, mappedSec);
        onImportAllData({ [newKey]: sectionObj });
        
        if (origSem !== mappedSem) {
          mappedSemesterMsg = `Mapped from ${origSem} to ${mappedSem}`;
        }
      } else if (isSingleSectionBare) {
        const origSem = data.formData.semester;
        
        // Map to currently selected/active semester
        const mappedSem = semester;
        const mappedCourse = data.formData.course || course;
        const mappedSec = data.formData.section || section;
        
        data.formData.semester = mappedSem;
        const newKey = getSectionKey(mappedSem, mappedCourse, mappedSec);
        
        onUpdateMetaData(mappedSem, mappedCourse, mappedSec);
        onImportAllData({ [newKey]: data });
        
        if (origSem !== mappedSem) {
          mappedSemesterMsg = `Mapped from ${origSem} to ${mappedSem}`;
        }
      } else {
        // Assume it's AllCoursesData (full export)
        // Map ALL section records to the currently selected active semester
        const mappedData: any = {};
        let mappedCount = 0;
        
        Object.keys(data).forEach(oldKey => {
          const sectionData = data[oldKey];
          if (sectionData && sectionData.students && sectionData.formData) {
            const origSem = sectionData.formData.semester;
            const mappedSem = semester;
            const mappedCourse = sectionData.formData.course;
            const mappedSec = sectionData.formData.section;
            
            sectionData.formData.semester = mappedSem;
            const newKey = getSectionKey(mappedSem, mappedCourse, mappedSec);
            mappedData[newKey] = sectionData;
            
            if (origSem !== mappedSem) {
              mappedCount++;
            }
          } else {
            mappedData[oldKey] = sectionData;
          }
        });
        
        onImportAllData(mappedData);
        if (mappedCount > 0) {
          mappedSemesterMsg = `Mapped ${mappedCount} section(s) to current semester ${semester}`;
        }
      }
      
      const successMsg = mappedSemesterMsg 
        ? `Grades imported successfully (${mappedSemesterMsg})`
        : 'Grades imported successfully from JSON';
        
      showFeedback('import', successMsg);
    } catch (err) {
      console.error(err);
      toast.error("Invalid JSON file");
    } finally {
      setIsSaving(false);
      if (e.target) e.target.value = '';
    }
  };

  const handlePdfImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsSaving(true);
    try {
      const pdfjsLib = await import('pdfjs-dist');
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(' ');
        fullText += pageText + '\n';
      }

      // 1. Extract Header Metadata
      let semester = '';
      let courseCode = '';
      let courseTitle = '';
      let section = '';
      let instructor = '';

      const semesterMatch = fullText.match(/Semester\s+(\d{4})(\d)/i);
      if (semesterMatch) {
        const type = semesterMatch[2];
        const typeMap: { [key: string]: string } = { '1': 'Fall', '2': 'Spring', '3': 'Summer' };
        semester = typeMap[type] || 'Spring';
      }

      const crsMatch = fullText.match(/Crs\.#\s+([A-Z0-9]+)/i);
      if (crsMatch) courseCode = crsMatch[1];

      const titleMatch = fullText.match(/Course Title\s+(.*?)\s+Section/i);
      if (titleMatch) courseTitle = titleMatch[1].trim();

      // Improved section matching with multiple patterns and lookaheads
      const sectionMatch = fullText.match(/Section\s*[:#-]*\s*(\d+)/i) || 
                           fullText.match(/Sec\s*[:#-]*\s*(\d+)/i) ||
                           fullText.match(/Section\s+(0\d|\d+)/i) ||
                           fullText.match(/\bSection\b[^\d]*(\d+)/i) ||
                           fullText.match(/S\s*(\d{1,2})\b/i) ||
                           fullText.match(/Section\s*\n\s*(\d+)/i) ||
                           fullText.match(/Section[^\d]*(\d+)/i) ||
                           fullText.match(/\b(\d{1,2})\b(?=\s+Instructor)/i) ||
                           fullText.match(/(\d+)(?=\s+Instructor)/i) ||
                           fullText.match(/Section\s*(\d+)/i);
      if (sectionMatch) section = sectionMatch[1].padStart(2, '0');

      const instructorMatch = fullText.match(/Instructor\s+(.*?)\s+Section Schedule/i);
      if (instructorMatch) {
        instructor = cleanInstructorText(instructorMatch[1]);
      }

      // Fallback to filename if metadata not found in content
      const fileMeta = extractMetadataFromFilename(file.name);
      if (!semester && fileMeta.semester) semester = fileMeta.semester;
      if (!courseCode && fileMeta.course) courseCode = fileMeta.course;
      if (!section && fileMeta.section) section = fileMeta.section;

      const targetSemester = semester || currentSectionData.formData.semester;
      const targetCourseCode = courseCode || currentSectionData.formData.course;
      const targetSection = section || (courseCode && courseCode !== course ? "01" : currentSectionData.formData.section);
      const targetKey = getSectionKey(targetSemester, targetCourseCode, targetSection);

      if (targetSemester || targetCourseCode || targetSection || instructor || courseTitle) {
        onUpdateMetaData(
          targetSemester, 
          targetCourseCode, 
          targetSection,
          cleanInstructorText(instructor || currentSectionData.formData.instructor),
          courseTitle || currentSectionData.formData.courseTitle
        );
      }

      // 2. Extract Student Data
      // Split by "No." followed by a number and a dot, or just look for ID patterns
      const studentMatches = fullText.matchAll(/(\d+)\.\s+(\d{7,10})\s+(.*?)(?=\s+\d+\.\s+\d{7,10}|$)/gs);
      const importedStudents: StudentData[] = [];

      // Alternative approach: split by ID pattern
      const parts = fullText.split(/(?=\b\d{7,10}\b)/);
      
      parts.forEach(part => {
        const idMatch = part.match(/^(\d{7,10})/);
        if (idMatch) {
          const id = idMatch[1].padStart(7, '0');
          // Extract name - usually follows ID
          let name = '';
          let major = '';
          let absentees: string | undefined = undefined;
          let tardy: string | undefined = undefined;
          let percentage = '';
          let warning = '';
          let status = '';

          // Pattern: Absence Tardy Excused Net Percentage Warning/Status
          // Example: 42 0 4 42.00 15.56% 2nd Warning
          // Example: 42 0 4 42.00 15.56% FA
          // More robust search for percentage as anchor
          const percentageMatch = part.match(/(\d+(?:\.\d+)?%)/);
          let metricsMatchIndex = -1;
          
          if (percentageMatch) {
            metricsMatchIndex = percentageMatch.index || -1;
            // Look for 3-4 numbers before the percentage
            const beforeP = part.substring(0, metricsMatchIndex);
            // Reverse find the last set of numbers
            const statsSearch = beforeP.match(/(\d+)\s+(\d+)\s+(\d+)\s+(\d+(?:\.\d+)?)\s*$/);
            
            if (statsSearch) {
              absentees = statsSearch[1];
              tardy = statsSearch[2];
              percentage = percentageMatch[1];
              metricsMatchIndex = statsSearch.index || metricsMatchIndex;
              
              const afterP = part.substring(percentageMatch.index! + percentageMatch[0].length).trim();
              const warningMatch = afterP.match(/^(.*?)(?:\s+(FA|WA|W|PST|IP|I)\b|$)/i);
              if (warningMatch) {
                warning = warningMatch[1].trim();
                status = (warningMatch[2] || "").toUpperCase();
              }
            } else {
              // Just use percentage if leading numbers are in weird format
              percentage = percentageMatch[1];
            }
          }

          // The text between ID and Metrics is "Name + Major"
          const textBeforeStats = metricsMatchIndex !== -1 
            ? part.substring(id.length, metricsMatchIndex).trim()
            : part.substring(id.length).trim();
          
          if (textBeforeStats) {
            // keywords that indicate start of major
            const majorKeywords = [
              "Bachelor", "Master", "Diploma", "Education", "Foundation", "Certificate", "Bridge", "Level", "Preparatory", "Prep", "BSc", "B.Sc", "BA", "B.A", "BEng", "LLB", "MA", "M.A", "MSc", "M.Sc", "MBA", "PhD",
              "Science", "Arts", "Engineering", "Business", "Computing", "Health", "Information", "Medical", "Architecture", "Technology", "Management",
              "Accounting", "Finance", "Economics", "Internal", "Applied", "Laboratory", "Public", "Social", "Natural", "Computer", "General",
              "Software", "Civil", "Mechanical", "Electrical", "Chemical", "Petroleum", "Environmental", "Environment", "Interior", "Graphic", "Digital", "Marketing",
              "Human", "International", "Middle", "Strategic", "Law", "Tourism", "English", "Mathematics", "Math", "Biology", "Physics", "Chemistry", "Arabic", "Islamic",
              "Special", "Early", "Physical", "Sports", "Translation", "Literature", "Security", "Journalism", "Communication", "Nursing", "Pharmacy"
            ];
            
            const majorRegex = new RegExp(`\\b(${majorKeywords.join('|')})\\b`, 'i');
            const keywordMatch = textBeforeStats.match(majorRegex);
            
            if (keywordMatch && keywordMatch.index !== undefined) {
              name = textBeforeStats.substring(0, keywordMatch.index).replace(/\r?\n/g, ' ').trim();
              major = textBeforeStats.substring(keywordMatch.index).replace(/\r?\n/g, ' ').trim();
            } else {
              name = textBeforeStats.replace(/\r?\n/g, ' ').trim();
            }
          }

          if (name || percentage) {
            // Robust name normalization including hyphen support
            const normalizedName = name.split(/\s+/)
              .map(word => word.split('-')
                .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
                .join('-'))
              .join(' ');

            importedStudents.push({
              id,
              name: normalizedName,
              status: status,
              major: major,
              absentees,
              tardy,
              attendancePercentage: percentage,
              warning,
              grades: {}
            });
          }
        }
      });

      if (importedStudents.length > 0) {
        onImportStudents(importedStudents, { isAttendanceOnly: true, targetKey });
        showFeedback('import', `Metadata & Attendance synced for ${importedStudents.length} students`);
      } else {
        toast.error("No valid student data found in the PDF");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to parse PDF");
    } finally {
      setIsSaving(false);
      if (pdfInputRef.current) pdfInputRef.current.value = '';
    }
  };

  const handleExportPDF = () => {
    const doc = new jsPDF('landscape');
    doc.text(`Grade Sheet - ${currentSectionData.formData.course} - Section ${currentSectionData.formData.section}`, 14, 15);
    const headers = [['#', 'ID', 'Name', ...Object.keys(currentSectionData.students[0]?.grades || {})]];
    const data = currentSectionData.students.map((s: any, i: number) => [
      i + 1,
      s.id,
      s.name,
      ...Object.values(s.grades)
    ]);
    (doc as any).autoTable({
      head: headers,
      body: data,
      startY: 20,
      theme: 'grid',
      styles: { fontSize: 8 }
    });
    doc.save(`Grades ${currentSectionData.formData.course} Sec ${currentSectionData.formData.section}.pdf`);
    showFeedback('save-as', 'PDF exported successfully');
  };

  const copySISExport = async () => {
    setIsSaving(true);
    await new Promise(resolve => setTimeout(resolve, 100)); // Ensure spinner shows up
    // Only use students from the CURRENT section
    const script = generateSISExportScript(students);
    try {
      await navigator.clipboard.writeText(script);
      showFeedback('copy-sis', 'Copied');
    } catch (err) {
      const textArea = document.createElement("textarea");
      textArea.value = script;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        showFeedback('copy-sis', 'Copied');
      } catch (err) {
        toast.error("Failed to copy script");
      }
      document.body.removeChild(textArea);
    } finally {
      setIsSaving(false);
    }
  };

  const copySISClean = async () => {
    setIsSaving(true);
    await new Promise(resolve => setTimeout(resolve, 100)); // Ensure spinner shows up
    // Use only current students for cleanup too
    const script = generateSISCleanScript(students);
    try {
      await navigator.clipboard.writeText(script);
      showFeedback('copy-sis', 'Copied');
    } catch (err) {
      const textArea = document.createElement("textarea");
      textArea.value = script;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        showFeedback('copy-sis', 'Copied');
      } catch (err) {
        toast.error("Failed to copy script");
      }
      document.body.removeChild(textArea);
    } finally {
      setIsSaving(false);
    }
  };

  const printAllSheets = () => {
    // We can use the existing print functionality but we need to trigger it for all views
    // Standard approach in this app is to show the print wrapper
    // But since it's an iframe environment, we'll try to trigger a window.print()
    // that includes all sections if possible, or just advise the user.
    // However, the requested HTML script has a specific confirmPrintAllSheets function
    // that creates a new window.
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Please allow pop-ups to print all sheets');
      return;
    }

    const currentSemLabel = SEMESTER_OPTIONS.find(s => s.value === semester)?.label || semester;
    const courseLabel = COURSE_OPTIONS.find(o => o.value === course)?.label || course;
    const instructorText = currentSectionData.formData.instructor ? ` | Instructor: ${cleanInstructorText(currentSectionData.formData.instructor)}` : '';
    
    const headerHtml = `
        <div class="header-info">
          <img src="https://raw.githubusercontent.com/hameedktk09/cms/main/clfs-logo.png" alt="logo" />
          <h1>A'Sharqiyah University</h1>
          <p>Center For Language and Foundation Studies</p>
          <p><strong>${currentSemLabel}</strong></p>
          <p>Course: ${courseLabel} (${course}) | Section: ${section}${instructorText}</p>
        </div>
    `;

    let printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>GMS - All Grade Sheets</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
          @page { size: landscape; margin: 20px; }
          body { font-family: sans-serif; padding: 20px; background: white; color: #334155; }
          .page-container { page-break-after: always; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th, td { border: 1px solid #e2e8f0; padding: 6px; text-align: center; font-size: 11px; }
          th { background: #f8fafc; color: #1e293b; font-weight: 700; }
          h2 { color: #0f766e; text-align: center; margin-top: 20px; margin-bottom: 15px; border-bottom: 2px solid #0f766e; padding-bottom: 5px; font-size: 16px; text-transform: uppercase; }
          .header-info { text-align: center; margin-bottom: 20px; border-bottom: 1px solid #e2e8f0; padding-bottom: 15px; }
          .header-info img { max-width: 120px; margin-bottom: 10px; }
          .header-info h1 { font-size: 20px; margin: 0; color: #0f172a; font-weight: 800; }
          .header-info p { font-size: 14px; margin: 4px 0; color: #475569; }
        </style>
      </head>
      <body class="bg-white">
    `;

    const createSection = (title: string, content: string) => `
      <div class="page-container">
        ${headerHtml}
        <h2>${title}</h2>
        ${content}
      </div>
    `;

    // 1. Raw Grades
    let rawGradesTable = `<table><thead><tr><th>#</th><th>ID</th><th>Name</th><th>Part</th><th>E-Port</th><th>Pres</th><th>Q1</th><th>Q2</th><th>T1</th><th>T2</th><th>Sp</th><th>Wt</th><th>W.P</th><th>Midm</th><th>Fin</th></tr></thead><tbody>`;
    students.forEach((s, idx) => {
      rawGradesTable += `<tr><td>${idx+1}</td><td>${s.id}</td><td style="text-align:left; white-space: nowrap;">${s.name}</td><td>${s.grades[3]||''}</td><td>${s.grades[4]||''}</td><td>${s.grades[5]||''}</td><td>${s.grades[6]||''}</td><td>${s.grades[7]||''}</td><td>${s.grades[8]||''}</td><td>${s.grades[9]||''}</td><td>${s.grades[10]||''}</td><td>${s.grades[11]||''}</td><td>${s.grades[12]||''}</td><td>${s.grades[13]||''}</td><td>${s.grades[15]||''}</td></tr>`;
    });
    rawGradesTable += `</tbody></table>`;
    printContent += createSection("Raw Grades Sheet", rawGradesTable);

    // 2. Real Grades (No Summative)
    let realGradesTable = `<table><thead><tr><th>#</th><th>ID</th><th>Name</th><th>Part/Prt</th><th>Pres</th><th>Q1</th><th>Q2</th><th>T1</th><th>T2</th><th>Sp</th><th>Wt</th><th>WP</th><th>Mid</th><th>Fin</th><th>Total</th></tr></thead><tbody>`;
    students.forEach((s, idx) => {
      const sv = calculateSummativeValues(s);
      realGradesTable += `<tr><td>${idx+1}</td><td>${s.id}</td><td style="text-align:left; white-space: nowrap;">${s.name}</td><td>${sv.v1}</td><td>${sv.v2}</td><td>${sv.v3}</td><td>${sv.v4}</td><td>${sv.v5}</td><td>${sv.v6}</td><td>${sv.v7}</td><td>${sv.v8}</td><td>${sv.v9}</td><td>${sv.v10}</td><td>${sv.v11}</td><td><strong>${sv.total}</strong></td></tr>`;
    });
    realGradesTable += `</tbody></table>`;
    printContent += createSection("Real Grades Sheet", realGradesTable);

    // 3. Final Grades
    let finalGradesTable = `<table><thead><tr><th>#</th><th>ID</th><th>Name</th><th>Port</th><th>Tests</th><th>Pres</th><th>Mid</th><th>Fin</th><th>Total</th><th>Result</th><th>Grade</th></tr></thead><tbody>`;
    students.forEach((s, idx) => {
      const fv = calculateFinalValues(s);
      finalGradesTable += `<tr><td>${idx+1}</td><td>${s.id}</td><td style="text-align:left; white-space: nowrap;">${s.name}</td><td>${fv.participationPortfolio}</td><td>${fv.tests}</td><td>${fv.presentation}</td><td>${fv.midterm}</td><td>${fv.final}</td><td><strong>${fv.totalScore}</strong></td><td>${fv.finallyValue}</td><td><strong>${fv.gradeLetter}</strong></td></tr>`;
    });
    finalGradesTable += `</tbody></table>`;
    printContent += createSection("Final Grades Sheet", finalGradesTable);

    // 4. Performance Diagnostics Report
    let perfTable = `<table><thead><tr><th>#</th><th>ID</th><th>Name</th><th>Status-1</th><th>Status-2</th><th>Status-3</th><th>Overall</th><th>Warnings</th><th>Attendance Status</th><th>Finally</th></tr></thead><tbody>`;
    students.forEach((s, idx) => {
      const pa = getPerformanceAnalysisData(s);
      const fv = calculateFinalValues(s);
      perfTable += `<tr><td>${idx+1}</td><td>${s.id}</td><td style="text-align:left; white-space: nowrap;">${s.name}</td><td>${pa.academicStatus1}</td><td>${pa.academicStatus2}</td><td>${pa.academicStatus3}</td><td><strong>${pa.overallStatus}</strong></td><td>${pa.atRiskCounts}</td><td>${pa.absenceWarning}</td><td><strong>${fv.finallyValue}</strong></td></tr>`;
    });
    perfTable += `</tbody></table>`;
    printContent += createSection("Performance Diagnostics Report", perfTable);
    
    // Add Numerical, At-Risk, Performance, Completion
    
    // 5. Numerical Analysis
    let numericalList = students.map(s => calculateFinalValues(s));
    let numTable = `<table><thead><tr><th>Metric</th><th>Value</th></tr></thead><tbody>
      <tr><td>Average Score</td><td>${(numericalList.reduce((a,b) => a + (parseFloat(b.totalScore) || 0), 0) / (numericalList.length || 1)).toFixed(1)}</td></tr>
      <tr><td>Pass Rate</td><td>${((numericalList.filter(f => f.finallyValue === 'Pass').length/ (numericalList.length || 1)) * 100).toFixed(1)}%</td></tr>
    </tbody></table>`;
    printContent += createSection("Numerical Analysis Report", numTable);
    
    // 6. At-Risk
    let atRiskData = calculateAtRiskDistribution(students);
    // Assuming atRiskData needs some sort of conversion for printing
    let atRiskTable = `<table><thead><tr><th>Category</th><th>Count</th></tr></thead><tbody>
      <tr><td>Total Students</td><td>${students.length}</td></tr>
      <tr><td>At-Risk</td><td>${(atRiskData as any).atRiskCount || 0}</td></tr>
    </tbody></table>`;
    printContent += createSection("At-Risk Distribution Report", atRiskTable);
    
    // 7. Performance Analytics
    // Replicating a simple table for performance diagnostics
    let perfAnalyticsTable = `<table><thead><tr><th>Component</th><th>Average</th></tr></thead><tbody>
      <tr><td>Overall Performance</td><td>${students.length > 0 ? (numericalList.reduce((acc, curr) => acc + (parseFloat(curr.totalScore) || 0), 0) / students.length).toFixed(1) : 0}</td></tr>
      <tr><td>Retention Rate</td><td>${students.length > 0 ? ((numericalList.filter(s => ['Pass', 'Not Pass', 'PST', 'IP', 'I'].includes(s.finallyValue)).length) / students.length * 100).toFixed(1) : '0.0'}%</td></tr>
    </tbody></table>`;
    printContent += createSection("Performance Analytics Report", perfAnalyticsTable);
    
    // 8. Syllabus Completion
    // Placeholder as this is complex for section
    let completionTable = `<table><thead><tr><th>Report</th><th>Status</th></tr></thead><tbody>
       <tr><td>Syllabus Completion</td><td>Data available in system</td></tr>
    </tbody></table>`;
    printContent += createSection("Syllabus Completion Report", completionTable);

    printContent += `</body></html>`;
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };

  const hasFinalGrades = React.useMemo(() => {
    return students.some(s => {
      const grades = s.grades || {};
      const f1 = (grades[15] !== undefined && grades[15] !== null) ? String(grades[15]).trim() : '';
      const f2 = (grades[16] !== undefined && grades[16] !== null) ? String(grades[16]).trim() : '';
      return f1 !== '' || f2 !== '';
    });
  }, [students]);

  const filteredStudents = React.useMemo(() => {
    let filtered = students
      .filter(s => 
        (s.id?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (s.name?.toLowerCase() || '').includes(searchTerm.toLowerCase())
      );

    if (emailCategory && emailCategory !== 'all') {
      filtered = filtered.filter(s => {
        switch (emailCategory) {
          // Old Options
          case 'at-risk': {
            const pa = getPerformanceAnalysisData(s);
            const fv = calculateFinalValues(s);
            // In Performance Diagnostics: include only those who are at-risk before the Final exam
            return pa.overallStatus === 'At-Risk' && !fv.hasFinalEntered;
          }
          case 'improved': {
            const pa = getPerformanceAnalysisData(s);
            // Was at-risk at status 1 or 2, but is now normal overall
            const wasAtRisk = pa.academicStatus1 === 'At-Risk' || pa.academicStatus2 === 'At-Risk';
            const isNormalNow = pa.overallStatus === 'Normal';
            return wasAtRisk && isNormalNow;
          }
          case 'appreciable': {
            const fv = calculateFinalValues(s);
            return fv.finallyValue === 'Pass';
          }
          case 'in-progress-early': {
            const fv = calculateFinalValues(s);
            return fv.finallyValue === '' || fv.finallyValue === 'IP' || fv.finallyValue === 'I';
          }
          case 'fail-absence-early': {
            return s.name && (s.name.includes('(FA)') || s.name.includes('(WA)'));
          }
          case 'email-letter': {
            // Logic for Absence Warning!: At-Risk students OR students with absence warnings
            const pa = getPerformanceAnalysisData(s);
            const fv = calculateFinalValues(s);
            // Include At-Risk only before final exam. Absence warnings always included.
            const isAtRiskBeforeFinal = pa.overallStatus === 'At-Risk' && !fv.hasFinalEntered;
            return isAtRiskBeforeFinal || (pa.absenceWarning !== 'Regular' && pa.absenceWarning !== '');
          }
          
          // New Options
          case 'pass': {
            const fv = calculateFinalValues(s);
            return fv.finallyValue === 'Pass';
          }
          case 'not-pass': {
            const fv = calculateFinalValues(s);
            return fv.finallyValue === 'Not Pass';
          }
          case 'ip': {
            const fv = calculateFinalValues(s);
            return fv.finallyValue === 'IP' || fv.finallyValue === 'I' || fv.finallyValue === '';
          }
          case 'fa': {
            const fv = calculateFinalValues(s);
            return fv.finallyValue === 'FA';
          }
          case 'wa': {
            const fv = calculateFinalValues(s);
            return fv.finallyValue === 'WA' || fv.finallyValue === 'W';
          }
          case 'pst': {
            const fv = calculateFinalValues(s);
            return fv.finallyValue === 'PST';
          }
          default:
            return true;
        }
      });
    }

    if (!sortConfig) {
      return [...filtered].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }

    const sorted = [...filtered].sort((a, b) => {
      const getSortValue = (student: StudentData, key: string) => {
        if (key === 'id') return student.id || '';
        if (key === 'name') return student.name || '';
        
        if (key.startsWith('raw-')) {
          const idx = parseInt(key.split('-')[1]);
          const val = student.grades[idx];
          return parseFloat(val) || 0;
        }
        
        if (key.startsWith('summative-')) {
          const sv = calculateSummativeValues(student);
          const subKey = key.split('-')[1];
          if (subKey === 'total') return parseFloat(sv.total) || 0;
          return parseFloat((sv as any)[subKey]) || 0;
        }
        
        if (key.startsWith('final-')) {
          const fv = calculateFinalValues(student);
          const subKey = key.split('-')[1];
          if (subKey === 'total') return parseFloat(fv.totalScore) || 0;
          if (subKey === 'grade') return fv.gradeLetter || '';
          if (subKey === 'result') return fv.finallyValue || '';
          return parseFloat((fv as any)[subKey]) || 0;
        }

        return '';
      };

      const valA = getSortValue(a, sortConfig.key);
      const valB = getSortValue(b, sortConfig.key);

      if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [students, searchTerm, emailCategory, sortConfig]);

  const showGradeError = (message: string, target: HTMLElement) => {
    const rect = target.getBoundingClientRect();
    const popup = document.createElement('div');
    popup.className = 'grade-popup-error';
    popup.textContent = message;
    popup.style.left = `${rect.left + rect.width / 2 - 80}px`;
    popup.style.top = `${rect.top - 40}px`;
    document.body.appendChild(popup);
    setTimeout(() => {
      if (popup.parentNode) popup.parentNode.removeChild(popup);
    }, 1500);
  };

  const handleGradeBlur = (studentId: string, gradeIdx: number, value: string, target: HTMLInputElement) => {
    if (value === '') return;
    
    const max = view === 'raw' ? RAW_MARKS_LIMITS[gradeIdx] : SUMMATIVE_MARKS_LIMITS[gradeIdx];
    if (max === undefined) return;

    const num = parseFloat(value);
    const isValidFormat = /^\d*\.?\d*$/.test(value);
    
    if (isNaN(num) || num < 0 || num > max || !isValidFormat) {
      onUpdateGrade(studentId, gradeIdx, '');
      showGradeError(`Invalid! Range 0-${max}`, target);
      setTimeout(() => target.focus(), 0);
    }
  };

  const ensureCellVisible = (inputEl: HTMLInputElement) => {
    if (!scrollContainerRef.current) return;
    
    const container = scrollContainerRef.current;
    const inputRect = inputEl.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    
    // Find sticky column width within the same row if possible
    const rowEl = inputEl.closest('tr');
    const stickyCell = rowEl?.querySelector('.sticky');
    const stickyWidth = stickyCell?.getBoundingClientRect().width || 180;
    
    // Horizontal check
    const relativeLeft = inputRect.left - containerRect.left;
    if (relativeLeft < stickyWidth) {
      // It's under the sticky column, scroll it out
      container.scrollBy({
        left: relativeLeft - stickyWidth - 20, // Add some margin
        behavior: 'smooth'
      });
    } else if (inputRect.right > containerRect.right) {
      // It's off to the right
      container.scrollBy({
        left: inputRect.right - containerRect.right + 20,
        behavior: 'smooth'
      });
    }
  };

  const handleGradeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, rowIndex: number, colIndex: number) => {
    const isShift = e.shiftKey;
    const focusCell = (row: number, col: number) => {
      const id = `grade-input-${row}-${col}`;
      
      // Set it as pending so useEffect can catch it after any potential re-render
      pendingFocusIdRef.current = id;
      
      // Try immediate focus - using a small timeout helps ensure it happens 
      // after the blur handling of the previous cell completes its re-render request
      setTimeout(() => {
        const el = document.getElementById(id);
        if (el) {
          const input = el as HTMLInputElement;
          input.focus();
          input.select();
          ensureCellVisible(input);
        }
      }, 0);
      
      return true;
    };

    if (e.key === 'Tab') {
      e.preventDefault();
      // Tab moves Right, wraps to next row
      let nextRow = rowIndex;
      let nextCol = isShift ? colIndex - 1 : colIndex + 1;
      
      if (nextCol > 16) {
        nextCol = 3;
        nextRow += 1;
      } else if (nextCol < 3) {
        nextCol = 16;
        nextRow -= 1;
      }
      
      if (nextRow >= 0 && nextRow < filteredStudents.length) {
        focusCell(nextRow, nextCol);
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      // Enter moves Down, stays in column
      let nextRow = isShift ? rowIndex - 1 : rowIndex + 1;
      if (nextRow >= 0 && nextRow < filteredStudents.length) {
        focusCell(nextRow, colIndex);
      } else if (nextRow === filteredStudents.length && !isShift) {
        // Wrap from bottom of one col to top of next? 
        // No, let's wrap to next COLUMN top row if finishing a column
        if (colIndex < 16) {
          focusCell(0, colIndex + 1);
        }
      } else if (nextRow === -1 && isShift) {
        // Wrap from top of one col to bottom of prev
        if (colIndex > 3) {
          focusCell(filteredStudents.length - 1, colIndex - 1);
        }
      }
    } else if (e.key === 'ArrowRight' && (e.target as HTMLInputElement).selectionStart === (e.target as HTMLInputElement).value.length) {
      focusCell(rowIndex, colIndex + 1);
    } else if (e.key === 'ArrowLeft' && (e.target as HTMLInputElement).selectionStart === 0) {
      focusCell(rowIndex, colIndex - 1);
    } else if (e.key === 'ArrowDown') {
      focusCell(rowIndex + 1, colIndex);
    } else if (e.key === 'ArrowUp') {
      focusCell(rowIndex - 1, colIndex);
    }
  };

  const OptimizedGradeInput = ({ 
    studentId, 
    gradeIdx, 
    rowIndex,
    initialValue, 
    onUpdate, 
    onBlur, 
    onKeyDown, 
    isLocked, 
    user, 
    currentSectionData,
    hasUnsavedChanges
  }: { 
    studentId: string, 
    gradeIdx: number, 
    rowIndex: number,
    initialValue: string, 
    onUpdate: (id: string, idx: number, val: string) => void,
    onBlur: (id: string, idx: number, val: string, target: HTMLInputElement) => void,
    onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>, row: number, col: number) => void,
    isLocked: boolean,
    user: User | null,
    currentSectionData: any,
    hasUnsavedChanges: boolean
  }) => {
    const [localValue, setLocalValue] = useState(initialValue);
    const lastValueRef = useRef(initialValue);

    useEffect(() => {
      setLocalValue(initialValue);
      lastValueRef.current = initialValue;
    }, [initialValue]);

    const handleLocalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      // Only allow numbers and decimal point
      if (val === '' || /^\d*\.?\d*$/.test(val)) {
        setLocalValue(val);
      }
    };

    const handleLocalBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      let val = localValue.trim();
      const max = RAW_MARKS_LIMITS[gradeIdx];
      
      if (val !== '') {
        const num = parseFloat(val);
        if (isNaN(num)) {
          val = lastValueRef.current;
        } else {
          // Clamp values
          if (num < 0) {
            val = '0';
          } else if (max !== undefined && num > max) {
            val = '';
            toast.error(`Maximum allowed for this column is ${max}`, {
              id: `max-error-${gradeIdx}`,
              duration: 2000
            });
            const target = e.target as HTMLInputElement;
            setTimeout(() => {
              target.focus();
              target.select();
            }, 50);
          }
        }
      }

      setLocalValue(val);
      if (val !== lastValueRef.current) {
        onUpdate(studentId, gradeIdx, val);
        lastValueRef.current = val;
      }
      onBlur(studentId, gradeIdx, val, e.target as HTMLInputElement);
    };

    const isDisabled = (isLocked && user?.role !== 'admin') || (user?.role === 'instructor' && !!initialValue && !hasUnsavedChanges && !currentSectionData.isCorrectionMode);

    const handleLockedClick = () => {
      if (isDisabled && user?.role === 'instructor') {
        toast.error("For Grades Modification, Please consult your Line Manager or General Coordinator with a valid reason.", {
          id: 'locked-cell-error',
          duration: 3000,
          icon: <ShieldAlert className="w-4 h-4 text-red-500" />
        });
      }
    };

    return (
      <div onClick={handleLockedClick} className="w-full h-full">
        <Input
          id={`grade-input-${rowIndex}-${gradeIdx}`}
          type="text"
          value={localValue}
          onChange={handleLocalChange}
          onBlur={handleLocalBlur}
          onKeyDown={(e) => onKeyDown(e, rowIndex, gradeIdx)}
          onFocus={(e) => {
            if (isDisabled) {
              e.target.blur();
              handleLockedClick();
            } else {
              e.target.select();
            }
          }}
          readOnly={isDisabled}
          className={cn(
            "h-9 w-full border-none rounded-none text-center text-[14px] font-courier transition-all focus-visible:ring-1 focus-visible:ring-primary focus-visible:bg-primary/5",
            getGradeColorClass(localValue || '', gradeIdx),
            isDisabled 
              ? "bg-slate-50 border-transparent text-slate-500 font-bold cursor-not-allowed select-none" 
              : "bg-slate-50 border-slate-300"
          )}
        />
      </div>
    );
  };

  const handleCategoryEmail = (category: string) => {
    if (!category) {
      toast.error("Please select a category first.");
      return;
    }

    let recipients: string[] = [];
    let subject = 'Academic Support';
    let body = 'Dear Student,\n\nPlease visit my office to discuss your academic progress.';

    switch (category) {
      case 'all':
        recipients = students.filter(s => s.id).map(s => `${s.id}@asu.edu.om`);
        subject = 'Important Course Announcement';
        body = 'Dear Student,\n\nThis is an important announcement regarding your course. Please check the course portal for updates and important information.\n\nBest regards,\nYour Instructor';
        break;
        
      // Old Options
      case 'at-risk':
        recipients = students.filter(s => {
          const pa = getPerformanceAnalysisData(s);
          const fv = calculateFinalValues(s);
          // Only before final exam
          return pa.overallStatus === 'At-Risk' && !fv.hasFinalEntered && s.id;
        }).map(s => `${s.id}@asu.edu.om`);
        subject = 'Academic Support Needed - At-Risk Status';
        body = 'Dear Student,\n\nOur records indicate that you may need additional academic support. Please visit during office hours to discuss strategies for improvement.\n\nBest regards,\nYour Instructor';
        break;
      case 'improved':
        recipients = students.filter(s => {
          const pa = getPerformanceAnalysisData(s);
          const wasAtRisk = pa.academicStatus1 === 'At-Risk' || pa.academicStatus2 === 'At-Risk';
          const isNormalNow = pa.overallStatus === 'Normal';
          return wasAtRisk && isNormalNow && s.id;
        }).map(s => `${s.id}@asu.edu.om`);
        subject = 'Appreciation for Your Academic Improvement';
        body = 'Dear Student,\n\nI want to take a moment to personally acknowledge the dedication and hard work you have been putting into this course.\n\nI have noticed a significant and positive improvement in your recent academic performance, moving from at-risk to a normal standing. Turning things around requires true effort, and your commitment is showing clear results.\n\nPlease keep up the excellent work, and do not hesitate to reach out if you need any further support as we continue through the semester. I am very proud of your progress!\n\nBest regards,\nYour Instructor';
        break;
      case 'appreciable':
        recipients = students.filter(s => {
          const fv = calculateFinalValues(s);
          return fv.finallyValue === 'Pass' && s.id;
        }).map(s => `${s.id}@asu.edu.om`);
        subject = 'Appreciation for Excellent Academic Performance';
        body = 'Dear Student,\n\nCongratulations on your excellent performance! Your dedication to your studies is commendable.\n\nBest regards,\nYour Instructor';
        break;
      case 'in-progress-early':
        recipients = students.filter(s => {
          const fv = calculateFinalValues(s);
          return (fv.finallyValue === '' || fv.finallyValue === 'IP' || fv.finallyValue === 'I') && s.id;
        }).map(s => `${s.id}@asu.edu.om`);
        subject = 'Incomplete Grade Status';
        body = 'Dear Student,\n\nOur records show that you have an incomplete grade. Please contact me to discuss how to complete the required work.\n\nBest regards,\nYour Instructor';
        break;
      case 'fail-absence-early':
        recipients = students.filter(s => s.name && (s.name.includes('(FA)') || s.name.includes('(WA)')) && s.id).map(s => `${s.id}@asu.edu.om`);
        subject = 'Important: Course Completion Status';
        body = 'Dear Student,\n\nOur records indicate issues with your course completion. Please contact me urgently to discuss your academic standing.\n\nBest regards,\nYour Instructor';
        break;
      case 'email-letter':
        recipients = students.filter(s => {
          const pa = getPerformanceAnalysisData(s);
          const fv = calculateFinalValues(s);
          // Only include At-Risk if before final exam
          const isAtRiskBeforeFinal = pa.overallStatus === 'At-Risk' && !fv.hasFinalEntered;
          return (isAtRiskBeforeFinal || (pa.absenceWarning && pa.absenceWarning !== 'Regular')) && s.id;
        }).map(s => `${s.id}@asu.edu.om`);
        subject = 'Academic Performance & Attendance Warning';
        body = 'Dear Student,\n\nThis is to inform you about your current academic performance and/or attendance status in this course. It is important that you maintain consistent attendance and focus on your assessments to ensure success.\n\nPlease visit my office during the scheduled hours to discuss your standing.\n\nBest regards,\nYour Instructor';
        break;

      // New Options
      case 'pass':
        recipients = students.filter(s => {
          const fv = calculateFinalValues(s);
          return fv.finallyValue === 'Pass' && s.id;
        }).map(s => `${s.id}@asu.edu.om`);
        subject = 'Congratulations on Passing';
        body = 'Dear Student,\n\nCongratulations on successfully passing the course! Your dedication to your studies is commendable.\n\nBest regards,\nYour Instructor';
        break;
      case 'not-pass':
        recipients = students.filter(s => {
          const fv = calculateFinalValues(s);
          return fv.finallyValue === 'Not Pass' && s.id;
        }).map(s => `${s.id}@asu.edu.om`);
        subject = 'Course Result Update';
        body = 'Dear Student,\n\nPlease contact me regarding your course result to discuss your academic progress and next steps.\n\nBest regards,\nYour Instructor';
        break;
      case 'ip':
        recipients = students.filter(s => {
          const fv = calculateFinalValues(s);
          return (fv.finallyValue === 'IP' || fv.finallyValue === 'I' || fv.finallyValue === '') && s.id;
        }).map(s => `${s.id}@asu.edu.om`);
        subject = 'Incomplete Grade Status (IP)';
        body = 'Dear Student,\n\nOur records show that you have an incomplete grade (In Progress). Please contact me to discuss how to complete the required work.\n\nBest regards,\nYour Instructor';
        break;
      case 'fa':
        recipients = students.filter(s => {
          const fv = calculateFinalValues(s);
          return fv.finallyValue === 'FA' && s.id;
        }).map(s => `${s.id}@asu.edu.om`);
        subject = 'Important: Course Completion Status (FA)';
        body = 'Dear Student,\n\nOur records indicate a Fail Absence (FA) status for your course. Please contact me urgently to discuss your academic standing.\n\nBest regards,\nYour Instructor';
        break;
      case 'wa':
        recipients = students.filter(s => {
          const fv = calculateFinalValues(s);
          return (fv.finallyValue === 'WA' || fv.finallyValue === 'W') && s.id;
        }).map(s => `${s.id}@asu.edu.om`);
        subject = 'Important: Course Withdrawal Status (WA/W)';
        body = 'Dear Student,\n\nOur records indicate a Withdrawal status for your course. Please contact me or the administration if you have any questions.\n\nBest regards,\nYour Instructor';
        break;
      case 'pst':
        recipients = students.filter(s => {
          const fv = calculateFinalValues(s);
          return fv.finallyValue === 'PST' && s.id;
        }).map(s => `${s.id}@asu.edu.om`);
        subject = 'Important: Probationary Status (PST)';
        body = 'Dear Student,\n\nOur records indicate a Probationary Status (PST). Please contact me urgently to discuss your academic standing and support options.\n\nBest regards,\nYour Instructor';
        break;
    }

    if (recipients.length === 0) {
      toast.error(`No students found in the ${category} category.`);
      return;
    }

    window.location.href = `mailto:${recipients.join(',')}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const renderRawHeader = () => (
    <TableRow className="bg-[#00786f] border-none">
      <TableHead className="w-10 text-center font-bold border-r border-white/15 text-xs bg-[#00786f] text-white sticky top-0 z-20 align-middle">#</TableHead>
      <TableHead 
        className={cn(
          "w-[85px] font-bold border-r border-white/15 text-xs bg-[#00786f] text-white sticky top-0 z-20 align-middle cursor-pointer hover:bg-[#00635c] transition-colors",
          sortConfig?.key === 'id' && "bg-[#00534d] shadow-inner"
        )}
        onClick={() => requestSort('id')}
      >
        <div className="flex items-center justify-center">
          ID NUMBER {renderSortIndicator('id')}
        </div>
      </TableHead>
      <TableHead 
        className={cn(
          "min-w-[125px] font-bold border-r border-white/15 text-xs bg-[#00786f] text-white sticky top-0 left-0 z-30 align-middle cursor-pointer hover:bg-[#00635c] transition-colors",
          sortConfig?.key === 'name' && "bg-[#00534d] shadow-inner"
        )}
        onClick={() => requestSort('name')}
      >
        <div className="flex items-center px-2">
          STUDENT NAME {renderSortIndicator('name')}
        </div>
      </TableHead>
      {[
        { label: 'Part', full: 'Participation', max: 20, idx: 3 },
        { label: 'E-Port', full: 'Electronic Portfolio', max: 20, idx: 4 },
        { label: 'Pres', full: 'Presentation', max: 25, idx: 5 },
        { label: 'Pop Quiz 1', full: '', max: 10, idx: 6 },
        { label: 'Pop Quiz 2', full: '', max: 10, idx: 7 },
        { label: 'Test 1 GV', full: 'Grammar & Vocabulary', max: 20, idx: 8 },
        { label: 'Test 2 LR', full: 'Listening & Reading', max: 20, idx: 9 },
        { label: 'S. Test', full: 'Speaking Test', max: 20, idx: 10 },
        { label: 'W. Test', full: 'Writing Test', max: 20, idx: 11 },
        { label: 'W. Port', full: 'Writing Portfolio', max: 20, idx: 12 },
        { label: 'Midterm', full: '', max: '(LRGV) [40]', idx: 13 },
        { label: 'Midterm', full: '', max: 10, idx: 14 },
        { label: 'Final', full: '', max: '(LRGV) [40]', idx: 15 },
        { label: 'Final', full: '', max: 10, idx: 16 },
      ].map((h, i, arr) => (
        <TableHead key={h.idx} className={cn(
          "text-center px-1 border-r border-white/15 bg-[#00786f] sticky top-0 z-20 align-middle cursor-pointer hover:bg-[#00635c] transition-colors",
          sortConfig?.key === `raw-${h.idx}` && "bg-[#00534d] shadow-inner",
          i === arr.length - 1 && "border-r-0"
        )} onClick={() => requestSort(`raw-${h.idx}`)}>
          {h.full ? (
            <Tooltip>
              <TooltipTrigger render={
                <div className="cursor-help text-center mx-1">
                  <div className="text-[10px] font-bold text-white uppercase leading-none mb-1 flex items-center justify-center">
                    {h.label} {renderSortIndicator(`raw-${h.idx}`)}
                  </div>
                  <div className="text-[11px] font-bold font-courier text-white leading-none">
                    {typeof h.max === 'string' && h.max.includes('[') ? h.max : `[${h.max}]`}
                  </div>
                </div>
              } />
              <TooltipContent>{h.full}</TooltipContent>
            </Tooltip>
          ) : (
            <div className="text-center mx-1">
              <div className="text-[10px] font-bold text-white uppercase leading-none mb-1 flex items-center justify-center">
                {h.label} {renderSortIndicator(`raw-${h.idx}`)}
              </div>
              <div className="text-[11px] font-bold font-courier text-white leading-none">
                {typeof h.max === 'string' && h.max.includes('[') ? h.max : `[${h.max}]`}
              </div>
            </div>
          )}
        </TableHead>
      ))}
    </TableRow>
  );

  const renderSummativeHeader = () => (
    <TableRow className="bg-[#00786f] border-none italic">
      <TableHead className="w-10 text-center font-bold border-r border-white/15 text-xs bg-[#00786f] text-white sticky top-0 z-20 align-middle">#</TableHead>
      <TableHead 
        className={cn(
          "w-[85px] font-bold border-r border-white/15 text-xs bg-[#00786f] text-white sticky top-0 z-20 align-middle cursor-pointer hover:bg-[#00635c] transition-colors",
          sortConfig?.key === 'id' && "bg-[#00534d] shadow-inner"
        )}
        onClick={() => requestSort('id')}
      >
        <div className="flex items-center justify-center font-bold">
          ID NUMBER {renderSortIndicator('id')}
        </div>
      </TableHead>
      <TableHead 
        className={cn(
          "min-w-[125px] font-bold border-r border-white/15 text-xs bg-[#00786f] text-white sticky top-0 left-0 z-30 align-middle cursor-pointer hover:bg-[#00635c] transition-colors",
          sortConfig?.key === 'name' && "bg-[#00534d] shadow-inner"
        )}
        onClick={() => requestSort('name')}
      >
        <div className="flex items-center px-2 font-bold">
          STUDENT NAME {renderSortIndicator('name')}
        </div>
      </TableHead>
      {[
        { label: 'Part+e-Port', full: 'Participation + Electronic Portfolio', max: '10%', key: 'v1' },
        { label: 'Pres', full: 'Presentation', max: '10%', key: 'v2' },
        { label: 'Pop Quiz 1', full: '', max: '2.5%', key: 'v3' },
        { label: 'Pop Quiz 2', full: '', max: '2.5%', key: 'v4' },
        { label: 'Test 1 GV', full: 'Grammar & Vocabulary', max: '5%', key: 'v5' },
        { label: 'Test 2 LR', full: 'Listening & Reading', max: '5%', key: 'v6' },
        { label: 'S. Test', full: 'Speaking Test', max: '5%', key: 'v7' },
        { label: 'W. Test', full: 'Writing Test', max: '5%', key: 'v8' },
        { label: 'W. Port', full: 'Writing Portfolio', max: '5%', key: 'v9' },
        { label: 'Midterm', full: '', max: '20%', key: 'v10' },
        { label: 'Final Exam', full: '', max: '30%', key: 'v11' },
        { label: 'Total', full: '', max: '100%', key: 'total' },
      ].map((h, i, arr) => (
        <TableHead key={i} className={cn(
          "text-center px-1 border-r border-white/15 bg-[#00786f] sticky top-0 z-20 align-middle whitespace-nowrap cursor-pointer hover:bg-[#00635c] transition-colors",
          sortConfig?.key === `summative-${h.key}` && "bg-[#00534d] shadow-inner",
          i === arr.length - 1 && ""
        )} onClick={() => requestSort(`summative-${h.key}`)}>
          {h.full ? (
            <Tooltip>
              <TooltipTrigger render={
                <div className="cursor-help mx-2">
                  <div className="text-[10px] font-bold text-white uppercase leading-none mb-1 flex items-center justify-center">
                    {h.label} {renderSortIndicator(`summative-${h.key}`)}
                  </div>
                  <div className="text-[11px] font-bold font-courier text-white leading-none">[{h.max}]</div>
                </div>
              } />
              <TooltipContent>{h.full}</TooltipContent>
            </Tooltip>
          ) : (
            <div className="mx-2">
              <div className="text-[10px] font-bold text-white uppercase leading-none mb-1 flex items-center justify-center">
                {h.label} {renderSortIndicator(`summative-${h.key}`)}
              </div>
              <div className="text-[11px] font-bold font-courier text-white leading-none">[{h.max}]</div>
            </div>
          )}
        </TableHead>
      ))}
    </TableRow>
  );

  const renderFinalHeader = () => (
    <TableRow className="bg-[#00786f] border-none">
      <TableHead className="w-10 text-center font-bold border-r border-white/15 text-xs bg-[#00786f] text-white sticky top-0 z-20 align-middle">#</TableHead>
      <TableHead 
        className={cn(
          "w-[85px] font-bold border-r border-white/15 text-xs bg-[#00786f] text-white sticky top-0 z-20 align-middle cursor-pointer hover:bg-[#00635c] transition-colors",
          sortConfig?.key === 'id' && "bg-[#00534d] shadow-inner"
        )}
        onClick={() => requestSort('id')}
      >
        <div className="flex items-center justify-center font-bold">
          ID NUMBER {renderSortIndicator('id')}
        </div>
      </TableHead>
      <TableHead 
        className={cn(
          "min-w-[125px] font-bold border-r border-white/15 text-xs bg-[#00786f] text-white sticky top-0 left-0 z-30 align-middle cursor-pointer hover:bg-[#00635c] transition-colors",
          sortConfig?.key === 'name' && "bg-[#00534d] shadow-inner"
        )}
        onClick={() => requestSort('name')}
      >
        <div className="flex items-center px-2 font-bold">
          STUDENT NAME {renderSortIndicator('name')}
        </div>
      </TableHead>
      {[
        { label: 'Part and e-Port', full: '', max: '10%', key: 'participationPortfolio' },
        { label: 'Tests', full: '', max: '30%', key: 'tests' },
        { label: 'Presentation', full: '', max: '10%', key: 'presentation' },
        { label: 'Midterm', full: '', max: '20%', key: 'midterm' },
        { label: 'Final Exam', full: '', max: '30%', key: 'final' },
        { label: 'Total', full: '', max: '100%', key: 'total' },
        { label: 'Result', full: '', max: 'P or NP', key: 'result' },
        { label: 'Grade', full: '', max: 'A+ to F', key: 'grade' },
      ].map((h, i, arr) => (
        <TableHead key={i} className={cn(
          "text-center px-1 border-r border-white/15 bg-[#00786f] sticky top-0 z-20 align-middle whitespace-nowrap cursor-pointer hover:bg-[#00635c] transition-colors",
          sortConfig?.key === `final-${h.key}` && "bg-[#00534d] shadow-inner",
          i === arr.length - 1 && ""
        )} onClick={() => requestSort(`final-${h.key}`)}>
          {h.full ? (
            <Tooltip>
              <TooltipTrigger render={
                <div className="cursor-help mx-2">
                  <div className="text-[10px] font-bold text-white uppercase leading-none mb-1 flex items-center justify-center">
                    {h.label} {renderSortIndicator(`final-${h.key}`)}
                  </div>
                  <div className="text-[11px] font-bold font-courier text-white leading-none">[{h.max}]</div>
                </div>
              } />
              <TooltipContent>{h.full}</TooltipContent>
            </Tooltip>
          ) : (
            <div className="mx-2">
              <div className="text-[10px] font-bold text-white uppercase leading-none mb-1 flex items-center justify-center">
                {h.label} {renderSortIndicator(`final-${h.key}`)}
              </div>
              <div className="text-[11px] font-bold font-courier text-white leading-none">[{h.max}]</div>
            </div>
          )}
        </TableHead>
      ))}
    </TableRow>
  );

  const renderPerformanceHeader = () => (
    <TableRow className="bg-[#00786f] border-none">
      <TableHead className="w-10 text-center font-bold border-r border-white/15 text-xs bg-[#00786f] text-white sticky top-0 z-20 align-middle">#</TableHead>
      <TableHead 
        className={cn(
          "w-[65px] font-bold border-r border-white/15 text-xs bg-[#00786f] text-white sticky top-0 z-20 align-middle cursor-pointer hover:bg-[#00635c] transition-colors",
          sortConfig?.key === 'id' && "bg-[#00534d] shadow-inner"
        )}
        onClick={() => requestSort('id')}
      >
        <div className="flex items-center justify-center font-bold">
          ID NUMBER {renderSortIndicator('id')}
        </div>
      </TableHead>
      <TableHead 
        className={cn(
          "min-w-[125px] font-bold border-r border-white/15 text-xs bg-[#00786f] text-white sticky top-0 left-0 z-30 align-middle cursor-pointer hover:bg-[#00635c] transition-colors",
          sortConfig?.key === 'name' && "bg-[#00534d] shadow-inner"
        )}
        onClick={() => requestSort('name')}
      >
        <div className="flex items-center px-2 font-bold">
          STUDENT NAME {renderSortIndicator('name')}
        </div>
      </TableHead>
      {[
        { label: 'Academic Status-1', tooltip: 'Pop Quiz 1 + Test 1 (GV)' },
        { label: 'Academic Status-2', tooltip: 'Status-1 + Midterm' },
        { label: 'Academic Status-3', tooltip: 'Status-2 + S. Test + Pop Quiz 2 + W. Test' },
        { label: 'Overall Academic', tooltip: '' },
        { label: 'No. of Warnings', tooltip: 'At-Risk Score' },
        { label: 'Absence Warnings', tooltip: '' },
        { label: 'Finally', tooltip: '' }
      ].map((h, i, arr) => (
        <TableHead key={i} className={cn(
          "text-center font-bold text-[10px] border-r border-white/20 uppercase bg-[#00786f] text-white sticky top-0 z-20 align-middle",
          i === arr.length - 1 && ""
        )}>
          {h.tooltip ? (
            <Tooltip>
              <TooltipTrigger render={<div className="cursor-help text-white">{h.label}</div>} />
              <TooltipContent>{h.tooltip}</TooltipContent>
            </Tooltip>
          ) : (
            <div className="text-white">{h.label}</div>
          )}
        </TableHead>
      ))}
      <TableHead className="text-center font-bold text-xs min-w-[150px] border-r border-teal-650 bg-[#00786f] text-white">
        <div className="flex items-center justify-center gap-1.5">
          <Select value={emailCategory} onValueChange={setEmailCategory}>
            <SelectTrigger className="h-7 w-[120px] text-[10px] font-bold uppercase bg-slate-100 border-slate-350 text-slate-800 rounded-md">
              <SelectValue placeholder="EMAIL GROUP" />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
              <SelectItem value="all">All Students</SelectItem>
              <SelectItem value="at-risk">At-Risk Students</SelectItem>
              <SelectItem value="improved">Improved Students</SelectItem>
              <SelectItem value="appreciable">Appreciable Students</SelectItem>
              <SelectItem value="in-progress-early">In-Progress Students</SelectItem>
              <SelectItem value="fail-absence-early">Fail Absence</SelectItem>
              <SelectItem value="email-letter">Absence Warning!</SelectItem>
              <div className="h-px bg-slate-700 my-1 mx-2"></div>
              <div className="px-2 py-1.5 text-xs font-semibold text-slate-400">Final Results</div>
              <SelectItem value="pass">Pass</SelectItem>
              <SelectItem value="not-pass">Not Pass</SelectItem>
              <SelectItem value="ip">In Progress (IP/I)</SelectItem>
              <SelectItem value="fa">Fail Absence (FA)</SelectItem>
              <SelectItem value="wa">Withdrawal (WA/W)</SelectItem>
              <SelectItem value="pst">Probationary (PST)</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            size="sm" 
            variant="ghost" 
            className="h-7 w-7 p-0 text-teal-600 hover:text-teal-950 hover:bg-[#FFEE82] transition-all bg-slate-100 border border-slate-300 rounded-md shadow-xs active:scale-95"
            onClick={() => handleCategoryEmail(emailCategory)}
          >
            <Send className="w-3.5 h-3.5" />
          </Button>
        </div>
      </TableHead>
    </TableRow>
  );

  const [feedback, setFeedback] = useState<{ id: string; message: string } | null>(null);

  const showFeedback = (id: string, message: string) => {
    setFeedback({ id, message });
  };

  const renderHeaderControls = () => (
    <div className="flex flex-wrap items-center gap-2 no-print">
        {view === 'raw' && (
          <div className="flex items-center gap-2">
            <DropdownMenu>
              {uploadedSections.length > 0 ? (
                <Tooltip>
                  <TooltipTrigger render={
                    <DropdownMenuTrigger render={
                      <Button variant="outline" className={cn("relative gap-2 bg-slate-100 shadow-sm border-slate-300 hover:border-[#FFEE82] hover:bg-[#FFEE82] hover:text-[#00786f] text-[11px] font-bold h-[32px] px-3.5 uppercase tracking-wider no-print transition-all rounded-md")}>
                        <FileDown className="w-4 h-4 text-teal-600" />
                        Import
                        <FloatingFeedback 
                          message={feedback?.message || ''} 
                          isVisible={feedback?.id === 'import'} 
                          onComplete={() => setFeedback(null)} 
                        />
                      </Button>
                    } />
                  } />
                  <TooltipContent>
                    <p>{importTooltip}</p>
                  </TooltipContent>
                </Tooltip>
              ) : (
                <DropdownMenuTrigger render={
                  <Button variant="outline" className={cn("relative gap-2 bg-slate-100 shadow-sm border-slate-300 hover:border-[#FFEE82] hover:bg-[#FFEE82] hover:text-[#00786f] text-[11px] font-bold h-[32px] px-3.5 uppercase tracking-wider no-print transition-all rounded-md")}>
                    <FileDown className="w-4 h-4 text-teal-600" />
                    Import
                    <FloatingFeedback 
                      message={feedback?.message || ''} 
                      isVisible={feedback?.id === 'import'} 
                      onComplete={() => setFeedback(null)} 
                    />
                  </Button>
                } />
              )}
              <DropdownMenuContent align="start" className="w-56 bg-white border border-slate-100 shadow-xl rounded-md">
                <DropdownMenuItem onClick={() => htmlInputRef.current?.click()} className="gap-2 text-xs py-2 focus:bg-slate-50 cursor-pointer">
                  <FileText className="w-4 h-4 text-teal-600" />
                  Names (CSV)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => jsonInputRef.current?.click()} className="gap-2 text-xs py-2 focus:bg-slate-50 cursor-pointer">
                  <FileJson className="w-4 h-4 text-teal-600" />
                  Grades (JSON)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = '.pdf';
                  input.onchange = async (e: any) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    await handlePdfImport({ target: { files: [file] } } as any);
                  };
                  input.click();
                }} className="gap-2 text-xs py-2 focus:bg-slate-50 cursor-pointer">
                  <FileText className="w-4 h-4 text-amber-600" />
                  Attendance Report
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="flex items-center gap-2">
              <Button 
                onClick={() => {
                  onSaveLocal();
                  showFeedback('save', 'Data saved successfully to browser storage.');
                }}
                variant="outline"
                className={cn(
                  "relative gap-2 text-[11px] font-bold h-[32px] px-3.5 uppercase tracking-wider no-print transition-all shadow-sm rounded-md active:scale-95",
                  hasUnsavedChanges 
                    ? "bg-[#FFEE82] text-amber-950 font-black border-[#FFEE82] animate-pulse" 
                    : "bg-slate-100 text-emerald-700 border-slate-300 hover:bg-emerald-50 hover:border-emerald-300"
                )}
              >
                <Save className={cn("w-4 h-4", hasUnsavedChanges && "animate-bounce")} />
                {hasUnsavedChanges ? "Save!" : "Saved"}
                <FloatingFeedback 
                  message={feedback?.message || ''} 
                  isVisible={feedback?.id === 'save'} 
                  onComplete={() => setFeedback(null)} 
                />
              </Button>
              <Button 
                onClick={onSaveJson}
                variant="outline"
                className="gap-2 text-[11px] font-bold h-[32px] px-3.5 uppercase tracking-wider no-print text-teal-600 bg-slate-100 border-slate-300 hover:border-[#FFEE82] hover:bg-[#FFEE82] hover:text-[#00786f] transition-all shadow-sm rounded-md active:scale-95"
                title="Save permanent backup to JSON"
              >
                <FileJson className="w-4 h-4" />
                JSON
              </Button>
            </div>

            <Button 
              variant="outline" 
              onClick={() => {
                onToggleLock();
                showFeedback('lock', isLocked ? 'Data Unlocked!' : 'Data Locked!');
              }}
              className={cn(
                "relative gap-2 shadow-sm border-slate-300 text-[11px] font-bold h-[32px] px-3.5 uppercase tracking-wider no-print transition-all rounded-md active:scale-95",
                isLocked
                  ? "bg-[#FFEE82] text-amber-950 font-black border-[#FFEE82]"
                  : "bg-slate-100 text-slate-700 hover:border-[#FFEE82] hover:bg-[#FFEE82] hover:text-amber-950"
              )}
            >
              {isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
              {isLocked ? "Unlock" : "Lock"}
              <FloatingFeedback 
                message={feedback?.message || ''} 
                isVisible={feedback?.id === 'lock'} 
                onComplete={() => setFeedback(null)} 
              />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger className={cn(buttonVariants({ variant: "outline" }), "gap-2 bg-slate-100 shadow-sm border-slate-300 hover:border-red-200 hover:bg-red-50 text-red-600 text-[11px] font-bold h-[32px] px-3.5 uppercase tracking-wider no-print transition-all rounded-md active:scale-95")}>
                <Eraser className="w-4 h-4" />
                Clear
                <FloatingFeedback 
                  message={feedback?.message || ''} 
                  isVisible={feedback?.id === 'clear'} 
                  onComplete={() => setFeedback(null)} 
                />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56 bg-white border border-slate-100 shadow-xl rounded-md">
                <DropdownMenuItem onClick={() => {
                  onClearGrades();
                  showFeedback('clear', 'Cleared');
                }} className="text-red-600 gap-2 text-xs py-2 focus:bg-red-50 cursor-pointer">
                  <Trash2 className="w-4 h-4" />
                  Clear Grades
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => {
                  onClearStudents();
                  showFeedback('clear', 'Cleared');
                }} className="text-red-700 font-bold gap-2 text-xs py-2 focus:bg-red-100 cursor-pointer">
                  <Trash2 className="w-4 h-4" />
                  Clear All
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        {view === 'final' && (
          <Button 
            variant="outline"
            className={cn("relative gap-2 bg-emerald-600 text-white hover:bg-emerald-700 shadow border-transparent text-[11px] font-bold h-[32px] px-4 uppercase tracking-wider no-print transition-all rounded-md active:scale-95")}
            onClick={copySISExport}
          >
            Copy to Console
            <FloatingFeedback 
              message={feedback?.message || ''} 
              isVisible={feedback?.id === 'copy-sis'} 
              onComplete={() => setFeedback(null)} 
            />
          </Button>
        )}
      </div>
  );

  const getCourseLabel = (val: string) => {
    return COURSE_OPTIONS.find(o => o.value === val)?.label || val;
  };

  const renderDocumentHeader = () => (
    <div className="w-full px-6 py-4 bg-slate-50 border-b border-slate-200/60 shrink-0 no-print">
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr_450px] items-center gap-6">
        {/* Left: Logo Card Container */}
        <div className="flex items-center justify-center lg:justify-start">
          <div className="flex items-center justify-center min-w-[270px] h-[80px]">
            <ClfsLogo className="w-64 h-auto max-h-[72px] object-contain" />
          </div>
        </div>

        {/* Middle: University Info */}
        <div className="flex flex-col items-center justify-center text-center px-2">
          <h1 className="text-lg md:text-xl font-black text-slate-900 uppercase tracking-[0.2em] leading-tight">
            A'Sharqiyah University
          </h1>
          <h2 className="text-[10px] md:text-xs font-bold text-teal-700 uppercase tracking-[0.12em] mt-1 leading-tight">
            Center For Language and Foundation Studies
          </h2>
          
          {/* Report Title Badge Row */}
          <div className="mt-3 flex flex-wrap justify-center items-center gap-2">
            <span className={cn(
              "text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-xs border",
              view === 'raw' && "bg-slate-100 text-slate-800 border-slate-200",
              view === 'summative' && "bg-blue-50 text-blue-800 border-blue-100",
              view === 'final' && "bg-emerald-50 text-emerald-800 border-emerald-100",
              view === 'performance' && "bg-indigo-50 text-indigo-800 border-indigo-100"
            )}>
              {view === 'raw' && "Raw Grades Sheet"}
              {view === 'summative' && "Real Grades Sheet"}
              {view === 'final' && "Final Grades Sheet"}
              {view === 'performance' && "Performance Diagnostics"}
            </span>
            <span className="text-[10px] font-bold bg-white border border-slate-200 text-slate-600 uppercase tracking-widest px-3 py-1 rounded-full shadow-xs">
              {SEMESTER_OPTIONS.find(s => s.value === semester)?.label || semester}
            </span>
            {isCloudActive ? (
              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold bg-emerald-50 border border-emerald-200 text-emerald-850 uppercase tracking-widest px-3 py-1 rounded-full shadow-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 relative flex">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                </span>
                Cloud Active
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold bg-amber-50 border border-amber-200 text-amber-850 uppercase tracking-widest px-3 py-1 rounded-full shadow-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 relative flex">
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500"></span>
                </span>
                Local Mode
              </span>
            )}
          </div>

          <div className="mt-4 relative shrink-0 no-print w-48 mx-auto">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <Input 
              placeholder="Search students..." 
              className="pl-8.5 h-8.5 text-[11px] bg-slate-50 border border-slate-200 focus:bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-100 transition-all text-left w-full rounded-lg"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Right: Instructor Info and Course/Section Card */}
        <div className="flex flex-col shrink-0 bg-white border border-slate-200/80 p-3.5 rounded-xl shadow-sm hover:shadow-md transition-all font-sans justify-center max-w-full">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center pb-2.5 mb-2.5 border-b border-slate-100 justify-between gap-3">
            <div className="flex items-center gap-2">
              {view === 'raw' && (user?.role === 'admin' || user?.role === 'instructor') ? (
                <>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={onOpenAdmin}
                    className="bg-slate-100 text-teal-700 border border-slate-300 hover:bg-[#FFEE82] hover:border-transparent hover:text-teal-950 transition-all active:scale-[0.98] shrink-0 text-[10px] font-bold uppercase tracking-widest gap-2 mt-0 shadow-xs rounded-lg animate-fade-in"
                    style={{ width: '175px', height: '34px', marginLeft: '0px' }}
                    title={user?.role === 'admin' ? "Admin Dashboard" : "Instructor Directory"}
                  >
                    <ShieldAlert className="w-3.5 h-3.5" />
                    {user?.role === 'admin' ? "Admin Dashboard" : "Instructor Directory"}
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={printAllSheets}
                    className="bg-slate-100 text-blue-700 border border-slate-300 hover:bg-[#FFEE82] hover:border-transparent hover:text-blue-950 transition-all active:scale-[0.98] shrink-0 text-[10px] font-bold uppercase tracking-widest gap-2 mt-0 shadow-xs rounded-lg animate-fade-in"
                    style={{ width: '120px', height: '34px' }}
                    title="Save All Pages as PDF"
                  >
                    <FileDown className="w-3.5 h-3.5" />
                    Save PDF
                  </Button>
                </>
              ) : (
                <div className="w-[175px] h-[34px] hidden sm:block" />
              )}
            </div>

            <div className="flex items-center justify-end gap-2 flex-grow">
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline"
                  size="sm"
                  onClick={() => onLogout()}
                  className="h-8.5 px-3 text-[10px] font-bold uppercase tracking-widest gap-1.5 bg-slate-100 text-red-600 border border-slate-300 hover:bg-red-50 hover:border-red-200 hover:text-red-700 transition-all active:scale-[0.98] shrink-0 shadow-xs rounded-lg"
                >
                  LOGOUT
                  <LogOut className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-left min-w-[130px] flex-1">
              <div className="text-left flex items-center gap-1.5">
                <div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Instructor</p>
                  <p className="text-[11px] font-bold text-slate-800 leading-tight whitespace-nowrap truncate max-w-[140px] text-left">
                    {(() => {
                      const sectionIns = currentSectionData?.formData?.instructor;
                      const hasPlaceholder = !sectionIns || sectionIns === "Instructor's Name" || sectionIns === "Administrator";
                      const displayIns = hasPlaceholder ? (user?.fullName || 'Administrator') : sectionIns;
                      const fullText = cleanInstructorText(displayIns);
                      const degreeMatch = fullText.match(/(Bachelor|Diploma|Education|Foundation|Master|Doctorate|Pre-Master|Pre-Session|BSc|BA|BEng|LLB|MA|MSc|MBA|PhD).*$/i);
                      return degreeMatch ? degreeMatch[0] : fullText;
                    })()}
                  </p>
                </div>
                <button 
                  onClick={onChangePassword}
                  className="hover:text-teal-600 text-slate-400 p-1 transition-colors self-end rounded-full hover:bg-slate-50"
                  title="Change Password"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-0 shrink-0">
              <div className="flex flex-col px-1.5 min-w-[110px] max-w-[140px] bg-slate-50 border border-slate-100 rounded-lg p-1">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5 leading-none text-left">Course</span>
                <Select value={course} onValueChange={setCourse}>
                  <SelectTrigger className="h-5 border-none bg-transparent p-0 font-bold text-teal-800 hover:text-teal-600 focus:ring-0 text-[11px] uppercase tracking-tight flex items-center gap-0.5 transition-colors w-full justify-start text-left truncate cursor-pointer">
                    <SelectValue>{currentSectionData?.formData?.courseTitle || getCourseLabel(course)}</SelectValue>
                  </SelectTrigger>
                  <SelectContent className="bg-white border border-slate-100 text-slate-900 shadow-xl max-w-[280px] rounded-lg">
                    {hasAnyStudentsInSemester ? (
                      availableCourses.map(ac => {
                        const customTitle = Object.values(allData).find(sec => sec.formData?.course === ac && sec.formData?.courseTitle)?.formData?.courseTitle;
                        const label = customTitle || getCourseLabel(ac);
                        return (
                          <SelectItem key={ac} value={ac} className="!font-normal text-slate-700 focus:bg-teal-50 focus:text-teal-800 cursor-pointer py-2 truncate rounded-md">
                            {label}
                          </SelectItem>
                        );
                      })
                    ) : (
                      <>
                        {COURSE_OPTIONS.filter(c => {
                          if (user?.role === 'instructor' && user?.subject) {
                            if (user.subject === 'English') {
                              return ['FPPI002', 'FPIN003', 'FPAD004'].includes(c.value);
                            } else if (user.subject === 'Mathematics') {
                              return c.value === 'FPMA001';
                            } else if (user.subject === 'Information Technology') {
                              return c.value === 'FPIT001';
                            }
                          }
                          return true;
                        }).map(c => (
                          <SelectItem key={c.value} value={c.value} className="!font-normal text-slate-700 focus:bg-teal-50 focus:text-teal-800 cursor-pointer py-2 truncate rounded-md">
                            {c.label}
                          </SelectItem>
                        ))}
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-px h-6 bg-slate-100 mx-1" />
              <div className="flex flex-col px-1.5 shrink-0 min-w-[45px] bg-slate-50 border border-slate-100 rounded-lg p-1 items-center justify-center">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5 leading-none text-center">Code</span>
                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-tight text-center">{course}</span>
              </div>
              <div className="w-px h-6 bg-slate-100 mx-1" />
              <div className="flex flex-col px-1.5 shrink-0 min-w-[45px] bg-slate-50 border border-slate-100 rounded-lg p-1 items-center justify-center">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5 leading-none text-center">SEC</span>
                <div className="flex items-center gap-1">
                  <Select value={section} onValueChange={setSection}>
                    <SelectTrigger className="h-5 border-none bg-transparent p-0 font-bold text-teal-800 hover:text-teal-600 focus:ring-0 text-[11px] uppercase tracking-tight flex items-center gap-0.5 transition-colors min-w-[28px] justify-center text-center cursor-pointer">
                      <SelectValue>{section}</SelectValue>
                    </SelectTrigger>
                    <SelectContent className="bg-white border border-slate-100 text-slate-900 shadow-xl min-w-[80px] rounded-lg">
                      {availableSections.map(s => (
                        <SelectItem key={s} value={s} className="!font-normal text-slate-700 focus:bg-teal-50 focus:text-teal-800 cursor-pointer py-2 rounded-md">
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderTopAppShell = () => (
    <div className="px-5 py-2 w-full shrink-0 bg-gradient-to-r from-teal-850 via-[#00786f] to-teal-900 border-b border-teal-950/20 no-print">
      <div className="w-full px-0 flex items-center justify-between gap-4 scrollbar-hide h-[42px]">
          
          {/* Left: Main View Switchers in a Segmented Control Container */}
          <div className="flex items-center gap-1.5 bg-black/15 p-1 rounded-lg border border-white/5 shadow-inner shrink-0">
            {[
              { id: 'raw', label: 'Raw Grades' },
              { id: 'summative', label: 'Real Grades' },
              { id: 'final', label: 'Final Grades' }
            ].map(v => (
              <button 
                key={v.id}
                onClick={() => onSetView(v.id as ViewType)}
                className={cn(
                  "px-4.5 h-[32px] text-[11px] font-bold uppercase tracking-wider transition-all rounded-md cursor-pointer flex items-center justify-center select-none active:scale-[0.98]",
                  view === v.id 
                    ? "bg-[#FFEE82] text-teal-950 font-black shadow-md border-transparent scale-102"
                    : "bg-transparent text-teal-100 hover:text-white hover:bg-white/10"
                )}
              >
                {v.label}
              </button>
            ))}
          </div>

          {/* Right: Analytics Categories and Toolbar Controls */}
          <div className="flex items-center justify-end gap-2 flex-1 no-print overflow-x-auto scrollbar-hide">
            {[
              { id: 'at-risk', label: 'At-Risk', icon: AlertCircle, color: 'text-red-600' },
              { id: 'performance', label: 'Performance', icon: BarChart3, color: 'text-teal-600' },
              { id: 'completion', label: 'Completion', icon: CheckCircle, color: 'text-green-600' }
            ].filter(item => {
              if (item.id === 'at-risk' || item.id === 'completion') {
                return false;
              }
              return true;
            }).map(item => (
              <Button 
                key={item.id}
                variant={view === item.id ? "default" : "outline"} 
                onClick={() => {
                  onSetView(item.id as ViewType);
                  showFeedback(item.id, `${item.label} View Loaded`);
                }}
                className={cn(
                  "relative gap-2 shadow-sm text-[11px] font-bold h-[32px] px-3 uppercase tracking-wider no-print transition-all rounded-md select-none",
                  view === item.id 
                    ? "bg-[#FFEE82] text-teal-950 border-transparent shadow" 
                    : cn("bg-slate-100 border-slate-300 text-slate-700 hover:border-[#FFEE82] hover:bg-[#FFEE82] hover:text-teal-950 shadow-xs")
                )}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
                <FloatingFeedback 
                  message={feedback?.message || ''} 
                  isVisible={feedback?.id === item.id} 
                  onComplete={() => setFeedback(null)} 
                />
              </Button>
            ))}

            <div className="flex items-center gap-2 ml-2 border-l border-white/10 pl-2">
              {renderHeaderControls()}
            </div>

            <Button 
              variant="outline"
              onClick={onShowStats}
              className="relative gap-2 bg-[#FFEE82] text-teal-950 shadow hover:bg-yellow-300 border-transparent text-[11px] font-black h-[32px] px-3.5 uppercase tracking-wider no-print transition-all rounded-md shrink-0 ml-1 active:scale-[0.98]"
            >
              <Calculator className="w-4 h-4" />
              Stats Analysis
            </Button>
          </div>

        </div>
    </div>
  );

  return (
    <>
    <div className="flex flex-col h-screen w-full bg-slate-100 no-print">

      {/* 
          Standardized Printing Wrapper 
          Repeating header for every page of the Grade Table.
      */}
      <div className="hidden print:block w-full">
        <table className="print-wrapper-table">
          {!hidePrintHeader && (
            <thead className="print-header-row">
              <tr>
                <td>
                  <div className="w-full px-10 py-8 bg-white border-b-4 border-blue-900 mb-8">
                    <div className="grid grid-cols-[auto_1fr_auto] items-center gap-16">
                      <ClfsLogo className="w-56 h-auto max-h-20 object-contain" />
                      <div className="flex flex-col items-center text-center">
                        <h1 className="text-3xl font-black text-blue-900 uppercase tracking-[0.3em] leading-tight mb-2">A'Sharqiyah University</h1>
                        <h2 className="text-xl font-bold text-blue-700 uppercase tracking-[0.2em] mb-4">Center For Language and Foundation Studies</h2>
                        <div className="px-10 py-2.5 bg-blue-50 border-y-2 border-blue-900/20">
                          <h3 className="text-xl font-black text-blue-800 uppercase tracking-[0.25em] italic">
                            {view === 'raw' && "Official Raw Grades Sheet"}
                            {view === 'summative' && "Official Real Grades Sheet"}
                            {view === 'final' && "Official Final Grades Sheet"}
                            {view === 'performance' && "Student Performance Diagnostics"}
                          </h3>
                        </div>
                      </div>
                      <div className="text-right shrink-0 max-w-[280px]">
                        <div className="space-y-2">
                          <div className="flex flex-col items-end">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">COURSE / CODE</p>
                            <p className="text-xs font-black text-blue-900 uppercase tracking-tight truncate max-w-[280px]">
                              {getCourseLabel(course)} ({course})
                            </p>
                          </div>
                          <div className="h-px bg-slate-100 my-1" />
                          <div className="flex justify-end items-center gap-6">
                            <div className="text-right">
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">SECTION</p>
                              <p className="text-xs font-black text-slate-900">{section}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">INSTRUCTOR</p>
                              <p className="text-xs font-black text-slate-900 truncate max-w-[150px]">
                                <a href="mailto:h.rehman@asu.edu.om" className="hover:underline">
                                  {(() => {
                                    const sectionIns = currentSectionData?.formData?.instructor;
                                    const hasPlaceholder = !sectionIns || sectionIns === "Instructor's Name" || sectionIns === "Administrator";
                                    const displayIns = hasPlaceholder ? (user?.fullName || 'Administrator') : sectionIns;
                                    const fullText = cleanInstructorText(displayIns);
                                    const degreeMatch = fullText.match(/(Bachelor|Diploma|Education|Foundation|Master|Doctorate|Pre-Master|Pre-Session|BSc|BA|BEng|LLB|MA|MSc|MBA|PhD).*$/i);
                                    return degreeMatch ? degreeMatch[0] : fullText;
                                  })()}
                                </a>
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </td>
              </tr>
            </thead>
          )}
          <tbody>
            <tr>
              <td>
                <div className="bg-white shadow-2xl shadow-slate-200/50 border border-slate-200 p-1">
                  <Table className="border-collapse w-full">
                    <TableHeader className="bg-slate-100">
                      {view === 'raw' && renderRawHeader()}
                      {view === 'summative' && renderSummativeHeader()}
                      {view === 'final' && renderFinalHeader()}
                      {view === 'performance' && renderPerformanceHeader()}
                    </TableHeader>
                  <TableBody>
                    {filteredStudents.length === 0 ? (
                      <TableRow className="hover:bg-transparent">
                        <TableCell 
                          colSpan={view === 'raw' ? 20 : view === 'summative' ? 15 : view === 'final' ? 11 : 10} 
                          className="text-center py-8 text-red-600 font-bold uppercase tracking-widest text-sm bg-red-50/10 border-none"
                        >
                          No Students Found in this Section
                        </TableCell>
                      </TableRow>
                    ) : filteredStudents.map((student, i) => {
                      const isAtRisk = getPerformanceAnalysisData(student).overallStatus === 'At-Risk';
                      
                      if (view === 'performance') {
                        const pa = getPerformanceAnalysisData(student);
                        const fv = calculateFinalValues(student);
                        const totalScore = parseFloat(fv.totalScore) || 0;
                        const status = getStudentStatus(student, totalScore);
                        const recommendation = generatePetitionResponse(student);
                        
                        return (
                          <TableRow key={student.id} className="border-b border-slate-200 hover:bg-slate-50">
                            <TableCell className="h-9 text-center font-courier text-[12px] p-0 border-r border-b border-slate-200">{i + 1}</TableCell>
                            <TableCell className="h-9 font-courier text-[12px] px-2 p-0 text-slate-500 border-r border-b border-slate-200">{student.id}</TableCell>
                            <TableCell className="h-9 font-bold text-[12px] px-2 p-0 truncate max-w-[140px] border-r border-b border-slate-200">{student.name}</TableCell>
                            <TableCell className={cn("h-9 text-center font-bold text-[11px] p-0 border-r border-b border-slate-200", pa.academicStatus1 === 'Normal' ? "text-green-600" : pa.academicStatus1 === 'At-Risk' ? "text-red-600" : "")}>{pa.academicStatus1}</TableCell>
                            <TableCell className={cn("h-9 text-center font-bold text-[11px] p-0 border-r border-b border-slate-200", pa.academicStatus2 === 'Normal' ? "text-green-600" : pa.academicStatus2 === 'At-Risk' ? "text-red-600" : "")}>{pa.academicStatus2}</TableCell>
                            <TableCell className={cn("h-9 text-center font-bold text-[11px] p-0 border-r border-b border-slate-200", pa.academicStatus3 === 'Normal' ? "text-green-600" : pa.academicStatus3 === 'At-Risk' ? "text-red-600" : "")}>{pa.academicStatus3}</TableCell>
                            <TableCell className={cn("h-9 text-center font-black text-[11px] p-0 text-blue-700 border-r border-b border-slate-200", pa.overallStatus === 'Normal' ? "text-green-600" : pa.overallStatus === 'At-Risk' ? "text-red-600" : "")}>{pa.overallStatus}</TableCell>
                            <TableCell className="h-9 text-center p-0 border-r border-b border-slate-200">
                              <span className={cn(
                                "px-2 py-0.5 rounded text-[11px] font-black uppercase",
                                pa.overallStatus === 'At-Risk' ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
                              )}>
                                {pa.overallStatus}
                              </span>
                            </TableCell>
                            <TableCell className={cn("h-9 text-center font-bold text-[11px] p-0 whitespace-nowrap border-r border-slate-200", pa.absenceWarning === 'Regular' ? "text-green-600" : pa.absenceWarning ? "bg-red-50 text-red-700 font-black" : "")}>
                              {pa.absenceWarning}
                            </TableCell>
                            <TableCell className={cn("h-9 text-center font-black text-[11px] p-0 border-r border-slate-200", fv.finallyClass)}>{fv.finallyValue || 'N/A'}</TableCell>
                            <TableCell className="h-9 text-[12px] px-2 p-0 leading-tight max-w-[250px] italic text-slate-500 truncate">{recommendation}</TableCell>
                          </TableRow>
                        );
                      }

                      if (view === 'raw') {
                        return (
                          <TableRow key={student.id} className="border-b border-slate-200 hover:bg-slate-50">
                            <TableCell className="text-center font-courier text-[12px] p-0 border-r border-b border-slate-200">{i + 1}</TableCell>
                            <TableCell className="font-courier text-[12px] px-2 p-0 border-r border-b border-slate-200">{student.id}</TableCell>
                            <TableCell className="font-bold text-[12px] px-2 p-0 truncate max-w-[140px] border-r border-b border-slate-200">{student.name}</TableCell>
                            {Array.from({ length: 17 }).map((_, idx) => (
                              <TableCell key={idx} className="h-9 text-center font-courier text-[14px] p-0 border-r border-slate-200 italic text-slate-400">
                                  {
                                    (() => {
                                      const val = student.grades[idx + 1];
                                      const parsed = parseFloat(val);
                                      return (val === "" || val === undefined || isNaN(parsed)) ? '0' : val;
                                    })()
                                  }
                                </TableCell>
                              ))}
                            </TableRow>
                          );
                        }

                        if (view === 'summative') {
                          const sv = calculateSummativeValues(student);
                          return (
                            <TableRow key={student.id} className="border-b border-slate-200">
                              <TableCell className="h-9 text-center font-courier text-[12px] p-0 border-r border-b border-slate-200">{i + 1}</TableCell>
                              <TableCell className="h-9 font-courier text-[12px] px-2 p-0 text-slate-500 border-r border-b border-slate-200">{student.id}</TableCell>
                              <TableCell className="h-9 font-bold text-[12px] px-2 p-0 truncate max-w-[140px] border-r border-b border-slate-200">{student.name}</TableCell>
                              {[sv.v1, sv.v2, sv.v3, sv.v4, sv.v5, sv.v6, sv.v7, sv.v8, sv.v9, sv.v10, sv.v11].map((v, idx) => (
                                <TableCell key={idx} className="h-9 text-center font-courier text-[14px] font-bold p-0 border-r border-slate-200">
                                  {v}
                                </TableCell>
                              ))}
                              <TableCell className="h-10 text-center font-courier font-black text-[14px] p-0 bg-slate-50 border-r border-slate-200">{sv.total}</TableCell>
                            </TableRow>
                          );
                        }

                        if (view === 'final') {
                          const fv = calculateFinalValues(student);
                          const totalScore = parseFloat(fv.totalScore) || 0;
                          const status = getStudentStatus(student, totalScore);
                          const recommendation = generatePetitionResponse(student);
                          
                          return (
                            <TableRow key={student.id} className="border-b border-slate-200">
                              <TableCell className="h-10 text-center font-courier text-xs p-0 border-r border-b border-slate-200">{i + 1}</TableCell>
                              <TableCell className="h-10 font-courier text-xs px-2 p-0 text-slate-500 border-r border-b border-slate-200">{student.id}</TableCell>
                              <TableCell className="h-9 font-bold text-xs px-2 p-0 truncate max-w-[140px] border-r border-b border-slate-200">{student.name}</TableCell>
                              <TableCell className="h-10 text-center font-bold font-courier text-[14px] p-0 italic text-slate-500 border-r border-slate-200">{fv.participationPortfolio}</TableCell>
                              <TableCell className="h-10 text-center font-bold font-courier text-[14px] p-0 italic text-slate-500 border-r border-slate-200">{fv.final}</TableCell>
                              <TableCell className="h-10 text-center font-black font-courier text-[14px] p-0 text-blue-700 border-r border-slate-200">{fv.totalScore}</TableCell>
                              <TableCell className="h-10 text-center p-0 border-r border-slate-200">
                                <span className={cn(
                                  "px-3 py-1 rounded text-[11px] font-black uppercase tracking-widest",
                                  fv.gradeLetter === 'F' || status === 'FA' || status === 'WA' ? "bg-red-100 text-red-700" : 
                                  fv.gradeLetter?.startsWith('A') ? "bg-emerald-100 text-emerald-700" :
                                  "bg-blue-100 text-blue-700"
                                )}>
                                  {fv.gradeLetter || status}
                                </span>
                              </TableCell>
                              <TableCell className="h-10 text-center font-courier font-bold text-[14px] p-0 border-r border-slate-200">
                                {fv.finallyValue}
                              </TableCell>
                              <TableCell className="h-10 text-[12px] font-medium px-2 p-0 leading-tight max-w-[200px] italic text-slate-500 truncate border-r border-slate-200">
                                {recommendation}
                              </TableCell>
                            </TableRow>
                          );
                        }
                        
                        return null;
                      })}
                    </TableBody>
                  </Table>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {renderTopAppShell()}
      {isSaving && (
        <div className="fixed inset-0 bg-slate-900/10 backdrop-blur-sm z-[100] flex items-center justify-center">
          <div className="bg-white p-6 shadow-2xl flex items-center gap-4">
            <div className="w-6 h-6 border-4 border-blue-600 border-t-white animate-spin"></div>
            <div className="text-sm font-bold text-blue-950 uppercase tracking-widest">Saving Changes...</div>
          </div>
        </div>
      )}
      <div className="flex-1 px-5 min-h-0 flex flex-col bg-teal-700 print:bg-white print:p-0">
        <div className="bg-white border border-slate-200 shadow-xl overflow-hidden relative flex flex-col h-full print:border-none print:shadow-none">
          {renderDocumentHeader()}
          <div className="flex-1 overflow-hidden px-0 pb-[5px] pt-0 flex flex-col mt-0 mb-0 mr-0">
            <div className="flex-1 overflow-hidden border-2 border-slate-300 relative flex flex-col pt-[2px] mt-[1px] print:border-none print:mt-0 print:pt-0">
              {view === 'final-report' ? (
                <div className="flex-1 overflow-auto bg-slate-50 print:bg-white">
                  <FinalReport 
                    students={students}
                    courseCode={course}
                    section={section}
                    semester={semester}
                    user={user}
                    onBack={() => onSetView('raw')}
                    metadata={currentSectionData?.formData}
                  />
                </div>
              ) : (
                <div 
                  ref={scrollContainerRef}
                  className="flex-1 overflow-auto max-h-full scrollbar-hide"
                >
                  <Table className="w-full border-separate border-spacing-0 relative text-slate-900">
              <TableHeader>

            {view === 'raw' && renderRawHeader()}
            {view === 'summative' && renderSummativeHeader()}
            {view === 'final' && renderFinalHeader()}
            {view === 'performance' && renderPerformanceHeader()}
            {false && (
              <TableRow className="bg-slate-200 uppercase text-[11px] font-black tracking-wider text-slate-900">
                <TableHead className="border-2 border-slate-600 p-3 text-left">Course Name</TableHead>
                <TableHead className="border-2 border-slate-600 p-3 text-left">Instructor's Name</TableHead>
                <TableHead className="border-2 border-slate-600 p-3 text-center">Total Students</TableHead>
                <TableHead className="border-2 border-slate-600 p-3 text-center">Total Sections</TableHead>
                <TableHead className="border-2 border-slate-600 p-3 text-center">Passed</TableHead>
                <TableHead className="border-2 border-slate-600 p-3 text-center">Failed</TableHead>
                <TableHead className="border-2 border-slate-600 p-3 text-center">No. of FAs/Ws, WAs/PSTs/Ips, Is</TableHead>
              </TableRow>
            )}
          </TableHeader>
                  <TableBody>
                    {filteredStudents.length === 0 ? (
                      <TableRow className="hover:bg-transparent border-none">
                        <TableCell 
                          colSpan={view === 'raw' ? 20 : view === 'summative' ? 15 : view === 'final' ? 11 : 10} 
                          className="text-center py-10 text-red-600 font-black uppercase tracking-widest text-sm bg-red-50/30 border-none"
                        >
                          No Students Found in this Section
                        </TableCell>
                      </TableRow>
                    ) : filteredStudents.map((student, i) => {
                      const pa = getPerformanceAnalysisData(student);
                      const isAtRisk = pa.overallStatus === 'At-Risk';

                      if (view === 'raw') {
                        return (
                          <TableRow 
                            key={student.id} 
                            className={cn(
                              "hover:bg-primary/5 transition-colors group border-b border-slate-300",
                              isAtRisk && "bg-red-50/70 hover:bg-red-100/70"
                            )}
                          >
                            <TableCell className={cn("h-9 text-center text-xs text-slate-400 font-courier border-r border-b border-slate-300", isAtRisk ? "bg-transparent" : "bg-slate-50")}>{i + 1}</TableCell>
                            <TableCell className={cn("h-9 px-2 font-courier text-xs text-slate-600 border-r border-b border-slate-300", isAtRisk ? "bg-transparent" : "bg-slate-50")}>{student.id}</TableCell>
                            <TableCell 
                              className={cn(
                                "h-8 px-2 text-xs font-serif font-bold text-slate-700 border-r border-b border-slate-300 sticky left-0 z-10 transition-colors flex items-center gap-2",
                                isAtRisk ? "bg-red-50" : "bg-slate-50"
                              )}
                            >
                      <div className="flex items-center gap-2">
                        <span className="truncate leading-tight">{student.name}</span>
                        {student.status && (
                          <Tooltip>
                            <TooltipTrigger render={
                              <span className="text-[10px] font-bold text-red-600 ml-1 cursor-help leading-none">
                                (<span className="font-bold">{student.status}</span>)
                              </span>
                            } />
                            <TooltipContent>
                              {student.status === 'FA' ? 'Fail Absence' : 
                               student.status === 'W' ? 'Withdrawal' :
                               student.status === 'WA' ? 'Withdrawal Absence' :
                               student.status === 'PST' ? 'Probationary Status' : 
                               student.status === 'IP' ? 'In Progress' :
                               student.status === 'I' ? 'Incomplete' :
                               student.status}
                            </TooltipContent>
                          </Tooltip>
                        )}
                        {isAtRisk && (
                          <Tooltip>
                            <TooltipTrigger render={
                              <AlertCircle className="w-3.5 h-3.5 text-red-500 fill-red-50 animate-pulse cursor-help" />
                            } />
                            <TooltipContent className="bg-red-600 text-white border-red-700 font-medium">
                              {hasFinalGrades ? 'Remained At-Risk' : 'Student is At-Risk'}
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </TableCell>
                    {Array.from({ length: 14 }, (_, idx) => idx + 3).map((gradeIdx) => {
                      const grades = student.grades || {};

                      return (
                        <TableCell key={gradeIdx} className="h-9 p-0 border-r border-b border-slate-300">
                          <OptimizedGradeInput
                            studentId={student.id}
                            gradeIdx={gradeIdx}
                            rowIndex={i}
                            initialValue={grades[gradeIdx] || ''}
                            onUpdate={onUpdateGrade}
                            onBlur={handleGradeBlur}
                            onKeyDown={handleGradeKeyDown}
                            isLocked={isLocked}
                            user={user}
                            currentSectionData={currentSectionData}
                            hasUnsavedChanges={hasUnsavedChanges}
                          />
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              }

              if (view === 'summative') {
                const sv = calculateSummativeValues(student);
                return (
                  <TableRow 
                    key={student.id} 
                    className={cn(
                      "hover:bg-primary/5 transition-colors group border-b border-slate-300",
                      isAtRisk && "bg-red-50/70 hover:bg-red-100/70"
                    )}
                  >
                    <TableCell className={cn("h-9 text-center text-xs text-slate-400 font-courier border-r border-b border-slate-300", isAtRisk ? "bg-transparent" : "bg-slate-50")}>{i + 1}</TableCell>
                    <TableCell className={cn("h-9 px-2 font-courier text-xs text-slate-600 border-r border-b border-slate-300", isAtRisk ? "bg-transparent" : "bg-slate-50")}>{student.id}</TableCell>
                    <TableCell 
                      className={cn(
                        "h-8 px-2 text-xs font-serif font-bold text-slate-700 border-r border-b border-slate-300 sticky left-0 z-10 transition-colors flex items-center gap-2",
                        isAtRisk ? "bg-red-50" : "bg-slate-50"
                      )}
                    >
                      <button 
                        onClick={() => setSelectedStudent(student)}
                        className="p-1 hover:bg-blue-100 rounded text-blue-600 transition-colors flex-shrink-0"
                        title="View Student Details"
                      >
                        <TableIcon className="w-3.5 h-3.5" />
                      </button>
                      <span className="truncate">{student.name}</span>
                      {student.status && (
                        <Tooltip>
                          <TooltipTrigger render={
                            <span className="text-[10px] font-bold text-red-600 ml-1 cursor-help">
                              (<span className="font-bold">{student.status}</span>)
                            </span>
                          } />
                          <TooltipContent>
                            {student.status === 'FA' ? 'Fail Absence' : 
                             student.status === 'W' ? 'Withdrawal' :
                             student.status === 'WA' ? 'Withdrawal Absence' :
                             student.status === 'PST' ? 'Probationary Status' : 
                             student.status === 'IP' ? 'In Progress' :
                             student.status === 'I' ? 'Incomplete' :
                             student.status}
                          </TooltipContent>
                        </Tooltip>
                      )}
                      {isAtRisk && (
                        <Tooltip>
                          <TooltipTrigger render={
                            <AlertCircle className="w-3.5 h-3.5 text-red-500 fill-red-50 animate-pulse cursor-help" />
                          } />
                          <TooltipContent className="bg-red-600 text-white border-red-700 font-medium">
                            {hasFinalGrades ? 'Remained At-Risk' : 'Student is At-Risk'}
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </TableCell>
                    {[
                      { v: sv.v1, max: 10 },
                      { v: sv.v2, max: 10 },
                      { v: sv.v3, max: 2.5 },
                      { v: sv.v4, max: 2.5 },
                      { v: sv.v5, max: 5 },
                      { v: sv.v6, max: 5 },
                      { v: sv.v7, max: 5 },
                      { v: sv.v8, max: 5 },
                      { v: sv.v9, max: 5 },
                      { v: sv.v10, max: 20 },
                      { v: sv.v11, max: 30 }
                    ].map((item, idx) => (
                      <TableCell key={idx} className={cn("h-9 text-center text-[14px] font-courier font-bold bg-slate-50/30 border-r border-b border-slate-300", getGradeColor(item.v, item.max))}>
                        {item.v}
                      </TableCell>
                    ))}
                    <TableCell className="h-9 text-center text-[14px] font-courier font-bold text-primary bg-primary/5 border-r border-b border-slate-300">
                      {sv.total}
                    </TableCell>
                  </TableRow>
                );
              }

              if (view === 'final') {
                const fv = calculateFinalValues(student);
                return (
                  <TableRow 
                    key={student.id} 
                    className={cn(
                      "hover:bg-primary/5 transition-colors group border-b border-slate-300",
                      isAtRisk && "bg-red-50/70 hover:bg-red-100/70"
                    )}
                  >
                    <TableCell className={cn("h-9 text-center text-xs text-slate-400 font-courier border-r border-b border-slate-300", isAtRisk ? "bg-transparent" : "bg-slate-50")}>{i + 1}</TableCell>
                    <TableCell className={cn("h-9 px-2 font-courier text-xs text-slate-600 border-r border-b border-slate-300", isAtRisk ? "bg-transparent" : "bg-slate-50")}>{student.id}</TableCell>
                    <TableCell 
                      className={cn(
                        "h-8 px-2 text-xs font-serif font-bold text-slate-700 border-r border-b border-slate-300 sticky left-0 z-10 transition-colors flex items-center gap-2",
                        isAtRisk ? "bg-red-50" : "bg-slate-50"
                      )}
                    >
                      <span className="truncate leading-tight">{student.name}</span>
                      {student.status && (
                        <Tooltip>
                          <TooltipTrigger render={
                            <span className="text-[10px] font-bold text-red-600 ml-1 cursor-help leading-none">
                              (<span className="font-bold">{student.status}</span>)
                            </span>
                          } />
                          <TooltipContent>
                            {student.status === 'FA' ? 'Fail Absence' : 
                             student.status === 'W' ? 'Withdrawal' :
                             student.status === 'WA' ? 'Withdrawal Absence' :
                             student.status === 'PST' ? 'Probationary Status' : 
                             student.status === 'IP' ? 'In Progress' :
                             student.status === 'I' ? 'Incomplete' :
                             student.status}
                          </TooltipContent>
                        </Tooltip>
                      )}
                      {isAtRisk && (
                        <Tooltip>
                          <TooltipTrigger render={
                            <AlertCircle className="w-3.5 h-3.5 text-red-500 fill-red-50 animate-pulse cursor-help" />
                          } />
                          <TooltipContent className="bg-red-600 text-white border-red-700 font-medium">
                            {hasFinalGrades ? 'Remained At-Risk' : 'Student is At-Risk'}
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </TableCell>
                    <TableCell className={cn("h-9 text-center text-[14px] font-courier font-bold border-r border-b border-slate-300", getGradeColor(fv.participationPortfolio, 10))}>{fv.participationPortfolio}</TableCell>
                    <TableCell className={cn("h-9 text-center text-[14px] font-courier font-bold border-r border-b border-slate-300", getGradeColor(fv.tests, 30))}>{fv.tests}</TableCell>
                    <TableCell className={cn("h-9 text-center text-[14px] font-courier font-bold border-r border-b border-slate-300", getGradeColor(fv.presentation, 10))}>{fv.presentation}</TableCell>
                    <TableCell className={cn("h-9 text-center text-[14px] font-courier font-bold border-r border-b border-slate-300", getGradeColor(fv.midterm, 20))}>{fv.midterm}</TableCell>
                    <TableCell className={cn("h-9 text-center text-[14px] font-courier font-bold border-r border-b border-slate-300", getGradeColor(fv.final, 30))}>{fv.final}</TableCell>
                    <TableCell className={cn("h-9 text-center text-[14px] font-courier font-bold border-r border-b border-slate-300", fv.totalClass)}>{fv.totalScore}</TableCell>
                    <TableCell className="h-9 text-center text-xs border-r border-b border-slate-300">
                      {fv.finallyValue ? (
                        <Badge 
                          variant="outline"
                          className={cn(
                            "px-3 py-0.5 text-[10px] font-bold uppercase tracking-widest border transition-all",
                            fv.finallyValue === 'Pass' 
                              ? "bg-green-100/80 text-green-700 border-green-200 hover:bg-green-100" 
                              : ['Not Pass', 'FA', 'WA', 'R'].includes(fv.finallyValue) 
                                ? "bg-red-100/80 text-red-700 border-red-200 hover:bg-red-100" 
                                : fv.finallyValue === 'IP' 
                                  ? "bg-blue-100/80 text-blue-700 border-blue-200 hover:bg-blue-100" 
                                  : fv.finallyValue === 'PST' 
                                    ? "bg-amber-100/80 text-amber-700 border-amber-200 hover:bg-amber-100" 
                                    : "bg-slate-100/80 text-slate-700 border-slate-200 hover:bg-slate-100"
                          )}
                        >
                          {fv.finallyValue}
                        </Badge>
                      ) : null}
                    </TableCell>
                    <TableCell className={cn("h-9 text-center text-[14px] font-courier font-bold border-r border-b border-slate-300", fv.gradeLetterClass)}>{fv.gradeLetter}</TableCell>
                  </TableRow>
                );
              }

              if (view === 'performance') {
                const pa = getPerformanceAnalysisData(student);
                const isImproved = (pa.academicStatus1 === 'At-Risk' || pa.academicStatus2 === 'At-Risk') && 
                                  (pa.academicStatus3 === 'Normal' || (pa.overallStatus === 'Normal' && pa.academicStatus3 !== 'At-Risk'));
                
                return (
                  <TableRow 
                    key={student.id} 
                    className={cn(
                      "hover:bg-primary/5 transition-colors group h-8",
                      isAtRisk && "bg-red-50/70 hover:bg-red-100/70",
                      isImproved && "bg-green-50/50 hover:bg-green-100/50"
                    )}
                  >
                    <TableCell className={cn("h-8 align-middle text-center text-xs text-slate-400 font-courier border-r border-b border-slate-300", isAtRisk ? "bg-transparent" : "bg-slate-50")}>{i + 1}</TableCell>
                    <TableCell className={cn("h-8 align-middle px-2 font-courier text-xs text-slate-600 border-r border-b border-slate-300", isAtRisk ? "bg-transparent" : "bg-slate-50")}>{student.id}</TableCell>
                    <TableCell 
                      className={cn(
                        "h-8 px-2 text-[11px] font-serif font-bold text-slate-700 border-r border-b border-slate-300 sticky left-0 z-10 transition-colors",
                        isAtRisk ? "bg-red-50" : isImproved ? "bg-green-50" : "bg-slate-50"
                      )}
                    >
                      <div className="flex items-center gap-2 h-full">
                        <div className="flex flex-col">
                          <span className="truncate leading-tight">{student.name}</span>
                          {isImproved && (
                            <span className="text-[8px] font-black text-green-600 uppercase tracking-tighter leading-none mt-0.5">
                              Improved Student ★
                            </span>
                          )}
                        </div>
                        {student.status && (
                        <Tooltip>
                          <TooltipTrigger render={
                            <span className="text-[10px] font-bold text-red-600 ml-1 cursor-help leading-none">
                              (<span className="font-bold">{student.status}</span>)
                            </span>
                          } />
                          <TooltipContent>
                            {student.status === 'FA' ? 'Fail Absence' : 
                             student.status === 'W' ? 'Withdrawal' :
                             student.status === 'WA' ? 'Withdrawal Absence' :
                             student.status === 'PST' ? 'Probationary Status' : 
                             student.status === 'IP' ? 'In Progress' :
                             student.status === 'I' ? 'Incomplete' :
                             student.status}
                          </TooltipContent>
                        </Tooltip>
                      )}
                      {isAtRisk && (
                          <Tooltip>
                            <TooltipTrigger render={
                              <AlertCircle className="w-3.5 h-3.5 text-red-500 fill-red-50 animate-pulse cursor-help" />
                            } />
                            <TooltipContent className="bg-red-600 text-white border-red-700 font-medium">
                              {hasFinalGrades ? 'Remained At-Risk' : 'Student is At-Risk'}
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className={cn("h-8 align-middle px-2 text-center text-[11px] font-bold border-r border-b border-slate-300 bg-slate-50", pa.academicStatus1 === 'Normal' ? "text-green-600" : pa.academicStatus1 === 'At-Risk' ? "text-red-600" : "")}>
                      {pa.academicStatus1 && (
                        <span>{pa.academicStatus1}</span>
                      )}
                    </TableCell>
                    <TableCell className={cn("h-8 align-middle px-2 text-center text-[11px] font-bold border-r border-b border-slate-300 bg-slate-50", pa.academicStatus2 === 'Normal' ? "text-green-600" : pa.academicStatus2 === 'At-Risk' ? "text-red-600" : "")}>
                      {pa.academicStatus2 && (
                        <span>{pa.academicStatus2}</span>
                      )}
                    </TableCell>
                    <TableCell className={cn("h-8 align-middle px-2 text-center text-[11px] font-bold border-r border-b border-slate-300 bg-slate-50", pa.academicStatus3 === 'Normal' ? "text-green-600" : pa.academicStatus3 === 'At-Risk' ? "text-red-600" : "")}>
                      {pa.academicStatus3 && (
                        <span>{pa.academicStatus3}</span>
                      )}
                    </TableCell>
                    <TableCell className={cn("h-8 align-middle px-2 text-center text-[11px] font-bold border-r border-b border-slate-300 bg-slate-50", pa.overallStatus === 'Normal' ? "text-green-600" : pa.overallStatus === 'At-Risk' ? "text-red-600" : "")}>
                      {pa.overallStatus && (
                        <span>{pa.overallStatus}</span>
                      )}
                    </TableCell>
                    <TableCell className="h-8 align-middle px-2 text-center text-[11px] font-bold font-courier border-r border-b border-slate-300 bg-slate-50">
                      <span className={cn(pa.atRiskCounts && parseInt(pa.atRiskCounts) > 0 ? "text-red-600" : "text-green-600")}>
                        {pa.atRiskCounts}
                      </span>
                    </TableCell>
                    <TableCell className={cn("h-8 align-middle px-2 text-center text-[11px] font-bold border-r border-b border-slate-300 bg-slate-50 whitespace-nowrap", pa.absenceWarning === 'Regular' ? "text-green-600" : pa.absenceWarning ? "text-red-700 bg-red-50 font-black" : "")}>
                      {pa.absenceWarning}
                    </TableCell>
                    <TableCell className={cn("h-8 align-middle px-2 text-center text-[11px] font-bold font-courier border-r border-b border-slate-300 bg-slate-50", pa.finallyClass)}>
                      {pa.finallyValue && (
                        <span>{pa.finallyValue}</span>
                      )}
                    </TableCell>
                    <TableCell className="h-8 align-middle text-center border-r border-b border-slate-300">
                      <DropdownMenu>
                        <DropdownMenuTrigger render={
                          <Button variant="ghost" size="sm" className="h-8 text-[11px] font-bold text-blue-600 hover:text-blue-700 hover:bg-blue-50 gap-1.5 focus:outline-none">
                            <Mail className="w-3.5 h-3.5" />
                            Send Email
                            <ChevronDown className="w-3 h-3 opacity-50" />
                          </Button>
                        } />
                        <DropdownMenuContent align="end" className="w-56">
                          {(() => {
                            const fv = calculateFinalValues(student);
                            const canSendAtRisk = pa.overallStatus === 'At-Risk' && !fv.hasFinalEntered;
                            const isImprovedStudent = (pa.academicStatus1 === 'At-Risk' || pa.academicStatus2 === 'At-Risk') && 
                                                      (pa.academicStatus3 === 'Normal' || (pa.overallStatus === 'Normal' && pa.academicStatus3 !== 'At-Risk'));

                            return (
                              <>
                                {canSendAtRisk && (
                                  <DropdownMenuItem onSelect={() => {
                                    const email = `${student.id}@asu.edu.om`;
                                    const subject = 'Academic At-Risk Notification';
                                    const body = `Dear Student,\n\nI am writing to inform you that your current academic performance in this course is categorized as "At-Risk". We encourage you to attend extra support sessions and consult with your instructor to improve your standing.\n\nBest regards,\nCenter for Language and Foundation Studies`;
                                    window.location.href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                                    toast.success(`Opening at-risk notification for ${student.id}`);
                                  }}>
                                    <AlertCircle className="mr-2 h-4 w-4 text-red-500" />
                                    <span className="font-bold text-red-600">Send At-Risk Letter</span>
                                  </DropdownMenuItem>
                                )}

                                {isImprovedStudent && (
                                  <DropdownMenuItem onSelect={() => {
                                    const email = `${student.id}@asu.edu.om`;
                                    const subject = 'Appreciation: Improved Academic Performance';
                                    const body = `Dear Student,\n\nCongratulations! We have noticed a significant improvement in your academic performance throughout the semester. Your transition from "At-Risk" to a "Normal" standing is highly commendable. Keep up the great work!\n\nBest regards,\nCenter for Language and Foundation Studies`;
                                    window.location.href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                                    toast.success(`Opening appreciation letter for ${student.id}`);
                                  }}>
                                    <TrendingUp className="mr-2 h-4 w-4 text-green-500" />
                                    <span className="font-bold text-green-600">Improved Student Letter</span>
                                  </DropdownMenuItem>
                                )}

                                <DropdownMenuItem onSelect={() => {
                                  const email = `${student.id}@asu.edu.om`;
                                  let subject = 'Academic Support';
                                  let body = 'Dear Student,\n\nPlease visit my office to discuss your academic progress.';
                                  if (pa.finallyValue === 'Not Pass') {
                                    subject = 'Course Result';
                                    body = 'Dear Student,\n\nPlease contact me regarding your course result.';
                                  } else if (pa.finallyValue === 'Pass') {
                                    subject = 'Congratulations';
                                    body = 'Dear Student,\n\nCongratulations on your successful completion!';
                                  }
                                  window.location.href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                                  toast.success(`Opening email client for ${student.id}`);
                                }}>
                                  <Send className="mr-2 h-4 w-4 text-blue-500" />
                                  <span className="font-medium">General Email</span>
                                </DropdownMenuItem>
                              </>
                            );
                          })()}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onSelect={() => toast.error(`No attachments found for ${student.name}.`)}>
                            <FileText className="mr-2 h-4 w-4 text-teal-500" />
                            <span className="font-medium">See New Attachment</span>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onSelect={() => setSelectedStudent(student)}>
                            <ExternalLink className="mr-2 h-4 w-4 text-slate-500" />
                            <span className="font-medium">Student Profile</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => setSelectedStudent(student)}>
                            <Eye className="mr-2 h-4 w-4 text-slate-500" />
                            <span className="font-medium">Academic Record</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              }
              return null;
            })}
          </TableBody>
          <TableFooter className="hidden">
            <TableRow>
              <TableCell colSpan={1} className="p-0"></TableCell>
            </TableRow>
          </TableFooter>
        </Table>
                </div>
              )}
    </div>
    </div>
    </div>
    </div>
    </div>
    <StudentDetailModal 
        student={selectedStudent} 
        isOpen={!!selectedStudent} 
        onClose={() => setSelectedStudent(null)} 
      />
      <input type="file" ref={htmlInputRef} className="hidden" accept=".csv,.html,.htm,.txt" multiple onChange={handleCsvImport} />
      <input type="file" ref={jsonInputRef} className="hidden" accept=".json" onChange={handleJsonImport} />
      <input type="file" ref={pdfInputRef} className="hidden" accept=".pdf" onChange={handlePdfImport} />

      <Dialog open={!!importResults} onOpenChange={(open) => !open && setImportResults(null)}>
        <DialogContent className="sm:max-w-xl max-h-[85vh] flex flex-col p-0 overflow-hidden font-sans border border-slate-200 shadow-2xl rounded-2xl">
          {importResults && !importResults.multiple ? (
            // Existing single section layout
            (() => {
              const singleSection = importResults.sections[0];
              return (
                <>
                  <DialogHeader className="p-6 border-b border-slate-200 bg-slate-50">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "p-2 rounded-full",
                          singleSection.errors.length === 0 ? "bg-green-100 text-green-600" : "bg-amber-100 text-amber-600"
                        )}>
                          {singleSection.errors.length === 0 ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                        </div>
                        <div>
                          <DialogTitle className="text-lg font-black text-slate-900 leading-none mb-1 uppercase tracking-tight">
                            Import Validation Report
                          </DialogTitle>
                          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-none">
                            {singleSection.fileName} (Course: {singleSection.course}, Sec: {singleSection.section})
                          </p>
                        </div>
                      </div>
                    </div>
                  </DialogHeader>

                  <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="bg-green-50/50 p-4 border border-green-100 relative group rounded-xl">
                        <p className="text-[10px] font-black text-green-600 uppercase tracking-widest mb-1">Valid</p>
                        <p className="text-3xl font-black text-green-700 leading-none">{singleSection.validStudents.length || 0}</p>
                      </div>
                      <div className="bg-blue-50/50 p-4 border border-blue-100 relative group rounded-xl">
                        <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">New</p>
                        <p className="text-3xl font-black text-blue-700 leading-none">{singleSection.newStudents.length || 0}</p>
                      </div>
                      <div className="bg-orange-50/50 p-4 border border-orange-100 relative group rounded-xl">
                        <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest mb-1">Deleted</p>
                        <p className="text-3xl font-black text-orange-700 leading-none">{singleSection.deletedStudents.length || 0}</p>
                      </div>
                      <div className="bg-red-50/50 p-4 border border-red-100 relative group rounded-xl">
                        <p className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-1">Errors</p>
                        <p className="text-3xl font-black text-red-700 leading-none">{singleSection.errors.length || 0}</p>
                      </div>
                    </div>

                    {singleSection.deletedStudents && singleSection.deletedStudents.length > 0 && (
                      <div className="space-y-3">
                        <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-widest border-b border-slate-200 pb-2 flex items-center gap-2">
                          <Trash2 className="w-3.5 h-3.5 text-orange-500" />
                          Deleted Students ({singleSection.deletedStudents.length})
                        </h4>
                        <div className="space-y-1 max-h-[30vh] overflow-y-auto pr-2 scrollbar-hide">
                          {singleSection.deletedStudents.map((student, idx) => (
                            <div key={idx} className="text-[10px] text-slate-600 bg-orange-50 p-1.5 border border-orange-100 italic rounded-lg">
                              {student.name} ({student.id})
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {singleSection.errors && singleSection.errors.length > 0 && (
                      <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-2 scrollbar-hide">
                        {singleSection.errors.map((error, idx) => (
                          <div key={idx} className="p-3 bg-white border border-slate-200 hover:border-red-200 hover:bg-red-50/20 transition-all rounded-xl">
                            <div className="flex items-start justify-between gap-4 mb-2">
                              <span className="text-[9px] font-black text-slate-400 bg-slate-100 px-2 py-0.5 uppercase tracking-widest rounded">Row {error.row}</span>
                              <span className="text-[10px] font-bold text-red-600 uppercase tracking-tight">{error.message}</span>
                            </div>
                            {error.data && (
                              <div className="bg-slate-50 p-2 border-l-2 border-slate-300 font-courier text-[10px] text-slate-600 truncate rounded-r-md">
                                &gt; {error.data}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {singleSection.errors.length === 0 && singleSection.validStudents.length > 0 && (
                      <div className="flex flex-col items-center justify-center py-8 text-center bg-green-50/30 border border-dashed border-green-200 rounded-xl">
                        <CheckCircle className="w-12 h-12 text-green-500 mb-3 opacity-20" />
                        <p className="text-xs font-bold text-green-700 uppercase tracking-widest">Everything looks perfect!</p>
                        <p className="text-[10px] text-green-600/70 mt-1">Found {singleSection.validStudents.length} formatted student records.</p>
                      </div>
                    )}
                  </div>

                  <DialogFooter className="p-4 border-t border-slate-200 bg-slate-50 flex flex-row items-center gap-3">
                    <Button 
                      variant="outline"
                      onClick={() => setImportResults(null)}
                      className="flex-1 h-11 text-[11px] font-bold uppercase tracking-widest border border-slate-350 hover:bg-slate-100 hover:text-slate-800 transition-all rounded-xl shadow-xs"
                    >
                      CANCEL
                    </Button>
                    <Button 
                      onClick={() => {
                        if (onSyncImport) {
                          onSyncImport(singleSection.validStudents, singleSection.deletedStudents, singleSection.targetKey);
                          showFeedback('import', `Successfully synced ${singleSection.validStudents.length} records and removed ${singleSection.deletedStudents.length} students`);
                        } else {
                          onImportStudents(singleSection.validStudents, { isProfileOnly: true, targetKey: singleSection.targetKey });
                          showFeedback('import', `Successfully synced ${singleSection.validStudents.length} records`);
                        }
                        setImportResults(null);
                      }}
                      disabled={singleSection.validStudents.length === 0}
                      className="flex-[2] h-11 text-[11px] font-black uppercase tracking-widest bg-teal-700 text-white hover:bg-[#FFEE82] hover:text-teal-950 transition-all shadow-md rounded-xl disabled:opacity-50 disabled:grayscale cursor-pointer"
                    >
                      SYNC {singleSection.validStudents.length || 0} RECORDS
                    </Button>
                  </DialogFooter>
                </>
              );
            })()
          ) : importResults ? (
            // Multiple sections bulk import report
            <>
              <DialogHeader className="p-6 border-b border-slate-200 bg-slate-50">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-teal-100 text-teal-600">
                    <TableIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <DialogTitle className="text-lg font-black text-slate-900 leading-none mb-1 uppercase tracking-tight">
                      Bulk Section Import Report
                    </DialogTitle>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-none">
                      Found {importResults.sections.length} valid sections in selected roster files
                    </p>
                  </div>
                </div>
              </DialogHeader>

              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                <p className="text-xs font-semibold text-slate-500 leading-normal">
                  You can verify each section's data and automatically switch to the imported lists in the student grade sheets:
                </p>

                <div className="space-y-3">
                  {importResults.sections.map((sec, idx) => (
                    <div key={idx} className="p-4 bg-slate-50 border border-slate-200 hover:border-teal-200 hover:bg-white transition-all rounded-xl space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="text-xs font-black text-slate-800 uppercase tracking-tight">
                            Course: {sec.course} — Sec {sec.section}
                          </span>
                          <span className="text-[10px] text-slate-500 font-bold max-w-[320px] truncate">
                            Filename: {sec.fileName}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap justify-end">
                          <Badge className="bg-green-100 hover:bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 border-none rounded">
                            {sec.validStudents.length} Students
                          </Badge>
                          {sec.newStudents.length > 0 && (
                            <Badge className="bg-blue-100 hover:bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 border-none rounded">
                              +{sec.newStudents.length} New
                            </Badge>
                          )}
                          {sec.errors.length > 0 && (
                            <Badge className="bg-red-100 hover:bg-red-100 text-red-700 text-[10px] font-bold px-2 py-0.5 border-none rounded">
                              {sec.errors.length} Errors
                            </Badge>
                          )}
                        </div>
                      </div>

                      {sec.errors.length > 0 && (
                        <div className="text-[10px] text-red-600 bg-red-50 p-2.5 border border-red-100 rounded-lg space-y-1">
                          <p className="font-bold">Errors in {sec.fileName}:</p>
                          <div className="space-y-1 max-h-[100px] overflow-y-auto">
                            {sec.errors.map((err, errIdx) => (
                              <div key={errIdx}>• Row {err.row}: {err.message}</div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <DialogFooter className="p-4 border-t border-slate-200 bg-slate-50 flex flex-row items-center gap-3">
                <Button 
                  variant="outline"
                  onClick={() => setImportResults(null)}
                  className="flex-1 h-11 text-[11px] font-bold uppercase tracking-widest border border-slate-350 hover:bg-slate-100 hover:text-slate-800 transition-all rounded-xl shadow-xs"
                >
                  CANCEL
                </Button>
                <Button 
                  onClick={() => {
                    const totalCount = importResults.sections.reduce((acc, s) => acc + s.validStudents.length, 0);
                    if (onBulkSyncImport) {
                      onBulkSyncImport(importResults.sections);
                      showFeedback('import', `Successfully bulk imported ${importResults.sections.length} sections (${totalCount} students)`);
                    } else {
                      // Fallback: loop through and sync single sections
                      importResults.sections.forEach(sec => {
                        if (onSyncImport) {
                          onSyncImport(sec.validStudents, sec.deletedStudents, sec.targetKey);
                        } else {
                          onImportStudents(sec.validStudents, { isProfileOnly: true, targetKey: sec.targetKey });
                        }
                      });
                      showFeedback('import', `Successfully imported ${totalCount} records`);
                    }
                    setImportResults(null);
                  }}
                  disabled={importResults.sections.length === 0}
                  className="flex-[2] h-11 text-[11px] font-black uppercase tracking-widest bg-teal-700 text-white hover:bg-[#FFEE82] hover:text-teal-950 transition-all shadow-md rounded-xl disabled:opacity-50 disabled:grayscale cursor-pointer"
                >
                  SYNC ALL {importResults.sections.length} SECTIONS
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
