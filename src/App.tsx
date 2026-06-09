import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { GradeTable } from '@/src/components/GradeTable';
import { StatsView } from '@/src/components/StatsView';
import { ImportModal } from '@/src/components/ImportModal';
import { Login } from '@/src/components/Login';
import { AdminDashboard } from '@/src/components/AdminDashboard';
import { ChangePasswordModal } from '@/src/components/ChangePasswordModal';
import { PrintReport } from '@/src/components/PrintReport';
import { BookletReport } from '@/src/components/BookletReport';
import { FinalReport } from '@/src/components/FinalReport';
import { useGradeData } from '@/src/hooks/use-grade-data';
import { useAuth } from '@/src/hooks/use-auth';
import { ViewType, StudentData, SectionData, COURSE_OPTIONS, RegistrationRequest } from '@/src/types';
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LogOut, Save, RefreshCw, CheckCircle2, KeyRound } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function App() {
  const [view, setView] = useState<ViewType>('raw');
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isFirstRun, setIsFirstRun] = useState(true);
  const [pendingStudents, setPendingStudents] = useState<StudentData[]>([]);
  const [pendingImportOptions, setPendingImportOptions] = useState<{ isProfileOnly?: boolean, isAttendanceOnly?: boolean, targetKey?: string } | null>(null);
  const [lastSaved, setLastSaved] = useState<Date>(new Date());

  const { 
    user, 
    loading,
    login, 
    logout, 
    addUser, 
    deleteUser, 
    approveUser, 
    resetPassword,
    importUsers,
    changePassword,
    skipPasswordChange,
    allUsers
  } = useAuth();

  const [showOptionalPasswordPrompt, setShowOptionalPasswordPrompt] = useState(false);

  useEffect(() => {
    console.log('Current user state:', user);
    if (user && user.role === 'instructor' && user.mustChangePassword) {
      setShowOptionalPasswordPrompt(true);
    } else {
      setShowOptionalPasswordPrompt(false);
    }
  }, [user]);

  // Registration requests state and helpers
  const [registrationRequests, setRegistrationRequests] = useState<RegistrationRequest[]>(() => {
    const saved = localStorage.getItem('clfs_registration_requests');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('clfs_registration_requests', JSON.stringify(registrationRequests));
  }, [registrationRequests]);

  const handleRequestRegister = (fullName: string, email: string, subject: 'English') => {
    const existing = registrationRequests.find(r => r.email.toLowerCase() === email.toLowerCase() && r.status === 'pending');
    if (existing) {
      return { success: false, message: "A request for this official email is already pending approval." };
    }

    const pendingCount = registrationRequests.filter(r => r.status === 'pending').length + 1;

    const newRequest: RegistrationRequest = {
      id: Math.random().toString(36).substr(2, 9),
      fullName,
      email,
      subject,
      requestedAt: new Date().toISOString(),
      status: 'pending'
    };

    setRegistrationRequests(prev => [newRequest, ...prev]);
    return { 
      success: true, 
      message: `Your request has been sent successfully and is in Queue ${pendingCount}.`,
      queueNumber: pendingCount 
    };
  };

  const handleApproveRequest = (requestId: string, chosenUsername?: string, chosenPassword?: string) => {
    const reqObj = registrationRequests.find(r => r.id === requestId);
    if (!reqObj) return;

    let generatedUsername = chosenUsername ? chosenUsername.trim().toLowerCase() : reqObj.email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    
    if (!chosenUsername && allUsers[generatedUsername]) {
      generatedUsername = `${generatedUsername}${Math.floor(10 + Math.random() * 90)}`;
    }

    const defaultPass = chosenPassword || Math.random().toString(36).substr(2, 8);

    const newUser = {
      uid: reqObj.id,
      email: reqObj.email,
      fullName: reqObj.fullName,
      username: generatedUsername,
      password: defaultPass,
      role: 'instructor' as const,
      subject: reqObj.subject,
      approved: true,
      mustChangePassword: true
    };

    addUser(newUser);

    setRegistrationRequests(prev => prev.map(r => {
      if (r.id === requestId) {
        return {
          ...r,
          status: 'approved',
          generatedUsername,
          generatedPassword: defaultPass
        };
      }
      return r;
    }));

    toast.success(`Instructor account approved!`, {
      description: `Username: ${generatedUsername} | Password: ${defaultPass}`
    });
  };

  const handleRejectRequest = (requestId: string) => {
    setRegistrationRequests(prev => prev.map(r => {
      if (r.id === requestId) {
        return { ...r, status: 'rejected' };
      }
      return r;
    }));
    toast.success("Registration request rejected");
  };

  const handleRemoveRequest = (requestId: string) => {
    const reqObj = registrationRequests.find(r => r.id === requestId);
    if (!reqObj) return;

    if (reqObj.status === 'approved' && reqObj.generatedUsername) {
      deleteUser(reqObj.generatedUsername);
    }

    setRegistrationRequests(prev => prev.filter(r => r.id !== requestId));
    toast.success("Instructor registration completely removed");
  };

  const [isAdminDashboardActive, setIsAdminDashboardActive] = useState(true);

  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [printMode, setPrintMode] = useState<'section' | 'booklet'>('section');
  const [bookletSemester, setBookletSemester] = useState('Fall');
  const [isPrinting, setIsPrinting] = useState(false);

  useEffect(() => {
    document.body.classList.remove('print-mode-section', 'print-mode-booklet');
    document.body.classList.add(`print-mode-${printMode}`);
  }, [printMode]);

  useEffect(() => {
    const handleBeforePrint = () => {
      setIsPrinting(true);
    };
    const handleAfterPrint = () => {
      setIsPrinting(false);
      setPrintMode('section');
    };

    window.addEventListener('beforeprint', handleBeforePrint);
    window.addEventListener('afterprint', handleAfterPrint);
    return () => {
      window.removeEventListener('beforeprint', handleBeforePrint);
      window.removeEventListener('afterprint', handleAfterPrint);
    };
  }, []);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        const message = 'You have unsaved changes in your grade sheet. Please use the SAVE button before leaving to avoid potential data loss.';
        e.returnValue = message;
        return message;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  useEffect(() => {
    const baseTitle = "GMS | Grade Management System";
    if (hasUnsavedChanges) {
      document.title = `* UNSAVED - ${baseTitle}`;
    } else {
      document.title = baseTitle;
    }
  }, [hasUnsavedChanges]);

  const {
    allData,
    currentCourse,
    setCurrentCourse,
    currentSection,
    setCurrentSection,
    currentSemester,
    setCurrentSemester,
    currentSectionData,
    updateStudentGrade,
    setStudents,
    toggleLock,
    clearGrades,
    clearStudents,
    saveAllData,
    getAvailableCourses,
    getAvailableSections,
    updateSectionMetaData,
    getSectionKey,
    lockSection,
  } = useGradeData();

  const handleOpenGradesForInstructor = (username: string, subject: string) => {
    const instructorUser = allUsers[username];
    if (!instructorUser) {
      toast.error(`Instructor ${username} not found.`);
      return;
    }

    let courseCode = 'FP00000';
    if (subject === 'English') {
      courseCode = 'FP00000';
    } else if (subject === 'Mathematics') {
      courseCode = 'FPMA001';
    } else if (subject === 'Information Technology') {
      courseCode = 'FPIT001';
    }

    // Search for any existing section belonging to this instructor
    const userFullName = (instructorUser.fullName || '').trim().toLowerCase();
    const userName = (instructorUser.username || '').trim().toLowerCase();
    const userEmail = (instructorUser.email || '').trim().toLowerCase();

    let foundKey = null;
    let foundSecCode = null;
    let foundSem = null;

    (Object.entries(allData) as Array<[string, SectionData]>).forEach(([key, section]) => {
      // Key format: SGS_Semester_Course_Sec00
      const keyParts = key.split('_');
      const keySem = keyParts[1];
      const keyCourse = keyParts[2];
      const keySec = keyParts[3]?.replace('Sec', '');

      if (keyCourse === courseCode && section.formData) {
        const instructorField = (section.formData.instructor || '').trim().toLowerCase();
        if (
          instructorField === userFullName || 
          instructorField === userName || 
          (userEmail && instructorField === userEmail)
        ) {
          foundKey = key;
          foundSecCode = keySec;
          foundSem = keySem;
        }
      }
    });

    let targetSemester = currentSemester;
    let targetSection = currentSection;

    if (foundKey && foundSecCode) {
      targetSemester = foundSem || currentSemester;
      targetSection = foundSecCode;
      
      setCurrentSemester(targetSemester);
      setCurrentCourse(courseCode);
      setCurrentSection(targetSection);
    } else {
      // Find the first available untaken section code
      let chosenSec = "01";
      for (let i = 1; i <= 99; i++) {
        const secStr = String(i).padStart(2, '0');
        const key = getSectionKey(currentSemester, courseCode, secStr);
        const secData = allData[key];
        if (!secData) {
          chosenSec = secStr;
          break;
        }
        const secIns = (secData.formData?.instructor || '').trim().toLowerCase();
        const worksHere = secIns === userFullName || secIns === userName || secIns === userEmail;
        const isPlaceholder = !secIns || secIns === '' || secIns === "instructor's name" || secIns === "administrator";
        if (isPlaceholder || worksHere) {
          chosenSec = secStr;
          break;
        }
      }

      targetSection = chosenSec;
      setCurrentSemester(currentSemester);
      setCurrentCourse(courseCode);
      setCurrentSection(targetSection);

      // Initialize/Update this section's metadata so GMS displays this instructor
      updateSectionMetaData(
        currentSemester,
        courseCode,
        targetSection,
        instructorUser.fullName,
        COURSE_OPTIONS.find(c => c.value === courseCode)?.label || "English"
      );
    }

    setIsAdminDashboardActive(false);
    toast.success(`Accessing Gradebook for Instructor "${instructorUser.fullName}" (${subject})`);
  };

  // Automatically switch the course to the registered course when an Instructor logs in
  useEffect(() => {
    if (user && user.role === 'instructor' && user.subject) {
      if (user.subject === 'English') {
        const englishCourses = ['FP00000', 'FPPI002', 'FPIN003', 'FPAD004'];
        if (!englishCourses.includes(currentCourse)) {
          setCurrentCourse('FP00000');
        }
      } else if (user.subject === 'Mathematics' && currentCourse !== 'FPMA001') {
        setCurrentCourse('FPMA001');
      } else if (user.subject === 'Information Technology' && currentCourse !== 'FPIT001') {
        setCurrentCourse('FPIT001');
      }

      // Auto-update instructor name if it's the default or empty
      if (currentSectionData && currentSectionData.formData) {
        const currentIns = (currentSectionData.formData.instructor || '').trim().toLowerCase();
        if (currentIns === '' || currentIns === "instructor's name" || currentIns === "administrator") {
           updateSectionMetaData(
             currentSemester,
             currentCourse,
             currentSection,
             user.fullName,
             currentSectionData.formData.courseTitle
           );
        }
      }
    }
  }, [user, currentCourse, currentSection, currentSemester, currentSectionData, setCurrentCourse, updateSectionMetaData]);

  const handleJsonExport = useCallback(async () => {
    if (user?.role !== 'admin') lockSection();
    const dataStr = JSON.stringify(allData, null, 2);
    const fileName = `Grades FPAD004 Sec 15.json`;
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', fileName);
    linkElement.click();
    setHasUnsavedChanges(false);
    setLastSaved(new Date());
    toast.success(user?.role === 'admin' ? "Backup exported successfully." : "Backup exported and grades LOCKED successfully.");
  }, [allData, currentSectionData.formData, lockSection, user?.role]);

  const handleLocalSave = useCallback(() => {
    if (user?.role !== 'admin') lockSection();
    setHasUnsavedChanges(false);
    setLastSaved(new Date());
    toast.success(user?.role === 'admin' ? "Grades saved successfully." : "Grades saved and LOCKED successfully.");
  }, [lockSection, user?.role]);

  const lastNormalizedDataRef = useRef<string>("");

  useEffect(() => {
    const normalized = JSON.stringify(allData, (key, value) => {
      if (key === 'isLocked') return undefined;
      return value;
    });

    if (lastNormalizedDataRef.current === "") {
      lastNormalizedDataRef.current = normalized;
      return;
    }

    if (normalized !== lastNormalizedDataRef.current) {
      setHasUnsavedChanges(true);
      lastNormalizedDataRef.current = normalized;
    }
  }, [allData]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleLocalSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleLocalSave]);

  const handleImportPreview = (importedStudents: StudentData[], options?: { isProfileOnly?: boolean, isAttendanceOnly?: boolean, targetKey?: string }) => {
    const sorted = [...importedStudents].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    setPendingStudents(sorted);
    setPendingImportOptions(options || null);
    setIsImportOpen(true);
  };

  const handleConfirmImport = () => {
    if (pendingStudents.length === 0) return;

    saveAllData((prevAllData) => {
      const profileMap = new Map<string, { name: string, gender?: 'M' | 'F' }>();
      (Object.values(prevAllData) as SectionData[]).forEach(section => {
        section.students.forEach(s => {
          if (s.id && s.name) {
            profileMap.set(s.id.trim(), { name: s.name, gender: s.gender });
          }
        });
      });

      const targetSemesterFromKey = pendingImportOptions?.targetKey?.split('_')[1] || currentSemester;
      const targetCourseFromKey = pendingImportOptions?.targetKey?.split('_')[2] || currentCourse;
      const targetSectionFromKey = pendingImportOptions?.targetKey?.split('_Sec')[1]?.padStart(2, '0') || currentSection;

      const targetKey = pendingImportOptions?.targetKey || getSectionKey(currentSemester, currentCourse, currentSection);
      const targetSectionData = prevAllData[targetKey] || { 
        students: [], 
        isLocked: false, 
        formData: { 
          semester: targetSemesterFromKey, 
          course: targetCourseFromKey, 
          section: targetSectionFromKey,
          courseTitle: COURSE_OPTIONS.find(c => c.value === targetCourseFromKey)?.label || "English",
          instructor: user?.fullName || "Instructor"
        } 
      };
      
      const updatedStudents = [...targetSectionData.students];
      const isAttendanceImport = pendingImportOptions?.isAttendanceOnly;
      const isProfileOnly = pendingImportOptions?.isProfileOnly;
      let matchedCount = 0;
      
      pendingStudents.forEach(imported => {
        const importedId = (imported.id || '').trim();
        const existingIdx = updatedStudents.findIndex(s => (s.id || '').trim() === importedId);
        const globalProfile = profileMap.get(importedId);

        if (existingIdx !== -1) {
          matchedCount++;
          const existing = updatedStudents[existingIdx];
          if (isAttendanceImport) {
            updatedStudents[existingIdx] = {
              ...existing,
              name: (existing.name && existing.name.length > 2) ? existing.name : (imported.name || existing.name),
              gender: existing.gender || imported.gender,
              major: imported.major || existing.major,
              absentees: imported.absentees !== undefined ? imported.absentees : existing.absentees,
              tardy: imported.tardy !== undefined ? imported.tardy : existing.tardy,
              attendancePercentage: imported.attendancePercentage || existing.attendancePercentage,
              warning: imported.warning || existing.warning,
              status: imported.status || existing.status,
              grades: { ...existing.grades }
            };
          } else if (isProfileOnly) {
            updatedStudents[existingIdx] = {
              ...existing,
              name: (existing.name && existing.name.length > 2) ? existing.name : (imported.name || existing.name),
              gender: existing.gender || imported.gender,
              grades: { ...existing.grades } 
            };
          } else {
            updatedStudents[existingIdx] = {
              ...existing,
              name: existing.name && existing.name.length > 2 ? existing.name : (imported.name || globalProfile?.name || existing.name),
              gender: existing.gender || imported.gender || globalProfile?.gender,
              major: existing.major || imported.major,
              status: imported.status || existing.status,
              grades: { ...existing.grades, ...imported.grades }
            };
          }
        } else if (!isAttendanceImport) {
          const finalStudent: StudentData = {
            ...imported,
            name: imported.name || globalProfile?.name || '',
            gender: imported.gender || globalProfile?.gender,
            major: imported.major,
            grades: imported.grades || {},
            absentees: imported.absentees || '0',
            tardy: imported.tardy || '0',
            attendanceStatus: imported.attendanceStatus || ''
          };
          updatedStudents.push(finalStudent);
        }
      });

      if (isAttendanceImport && matchedCount === 0 && targetSectionData.students.length > 0) {
        toast.error("No student IDs matched the current class list. Please verify section numbers.");
        return prevAllData;
      }

      if (isAttendanceImport && matchedCount === 0 && targetSectionData.students.length === 0) {
        pendingStudents.forEach(imported => {
          updatedStudents.push({ ...imported, grades: {} });
        });
      }

      return {
        ...prevAllData,
        [targetKey]: {
          ...targetSectionData,
          students: updatedStudents
        }
      };
    });

    const targetSem = pendingImportOptions?.targetKey?.split('_')[1] || currentSemester;
    const targetCrs = pendingImportOptions?.targetKey?.split('_')[2] || currentCourse;
    const targetSec = pendingImportOptions?.targetKey?.split('_Sec')[1]?.padStart(2, '0') || currentSection;

    if (targetSem !== currentSemester) setCurrentSemester(targetSem);
    if (targetCrs !== currentCourse) setCurrentCourse(targetCrs);
    if (targetSec !== currentSection) setCurrentSection(targetSec);

    setIsImportOpen(false);
    setPendingStudents([]);
    setPendingImportOptions(null);
  };

  const prevCourseRef = useRef(currentCourse);

  useEffect(() => {
    if (prevCourseRef.current !== currentCourse) {
      const sections = getAvailableSections(currentCourse);
      if (sections.length > 0) {
        setCurrentSection(sections[0]);
      }
      prevCourseRef.current = currentCourse;
    }
  }, [currentCourse, getAvailableSections, setCurrentSection]);

  const handleAddSection = (newSectionCode: string) => {
    const sectionKey = getSectionKey(currentSemester, currentCourse, newSectionCode);
    saveAllData(prev => {
      if (prev[sectionKey]) {
        return prev;
      }
      return {
        ...prev,
        [sectionKey]: {
          students: [],
          isLocked: false,
          formData: {
            semester: currentSemester,
            course: currentCourse,
            section: newSectionCode,
            courseTitle: COURSE_OPTIONS.find(c => c.value === currentCourse)?.label || "English",
            instructor: user?.fullName || "Instructor",
          }
        }
      };
    });
    setCurrentSection(newSectionCode);
    toast.success(`Section ${newSectionCode} created successfully!`);
  };

  const handleSyncImport = (validStudents: StudentData[], deletedStudents: StudentData[], targetKey?: string) => {
    const activeKey = targetKey || getSectionKey(currentSemester, currentCourse, currentSection);

    saveAllData((prevAllData) => {
      const targetSectionData: SectionData = prevAllData[activeKey] || {
        students: [],
        isLocked: false,
        formData: {
          semester: activeKey.split('_')[1] || currentSemester,
          course: activeKey.split('_')[2] || currentCourse,
          section: activeKey.split('_Sec')[1]?.padStart(2, '0') || currentSection,
          courseTitle: COURSE_OPTIONS.find(c => c.value === (activeKey.split('_')[2] || currentCourse))?.label || "English",
          instructor: user?.fullName || "Instructor",
        }
      };

      const deletedIds = new Set(deletedStudents.map(s => (s.id || '').trim()));
      let updatedStudents = targetSectionData.students.filter(s => {
        const cleanedId = (s.id || '').trim();
        return !deletedIds.has(cleanedId);
      });

      const existingDeletedIds = new Set(targetSectionData.deletedStudentIds || []);
      deletedStudents.forEach(s => {
        const cleanedId = (s.id || '').trim();
        if (cleanedId) existingDeletedIds.add(cleanedId);
      });
      const updatedDeletedIds = Array.from(existingDeletedIds);

      validStudents.forEach(imported => {
        const importedId = (imported.id || '').trim();
        const existingIdx = updatedStudents.findIndex(s => (s.id || '').trim() === importedId);
        if (existingIdx !== -1) {
          const existing = updatedStudents[existingIdx];
          const existingGrades = existing.grades || {};
          const importedGrades = imported.grades || {};
          updatedStudents[existingIdx] = { 
            ...existing, 
            ...imported,
            grades: { ...existingGrades, ...importedGrades }
          };
        } else {
          updatedStudents.push(imported);
        }
      });

      return {
        ...prevAllData,
        [activeKey]: {
          ...targetSectionData,
          students: updatedStudents,
          deletedStudentIds: updatedDeletedIds
        }
      };
    });

    const targetSem = activeKey.split('_')[1] || currentSemester;
    const targetCrs = activeKey.split('_')[2] || currentCourse;
    const targetSec = activeKey.split('_Sec')[1]?.padStart(2, '0') || currentSection;

    if (targetSem !== currentSemester) setCurrentSemester(targetSem);
    if (targetCrs !== currentCourse) setCurrentCourse(targetCrs);
    if (targetSec !== currentSection) setCurrentSection(targetSec);
  };

  const handleBulkSyncImport = (sections: Array<{ validStudents: StudentData[]; deletedStudents: StudentData[]; targetKey: string }>) => {
    if (sections.length === 0) return;

    saveAllData((prevAllData) => {
      let mergedData = { ...prevAllData };

      sections.forEach(({ validStudents, deletedStudents, targetKey }) => {
        const activeKey = targetKey;
        const targetSectionData: SectionData = mergedData[activeKey] || {
          students: [],
          isLocked: false,
          formData: {
            semester: activeKey.split('_')[1] || currentSemester,
            course: activeKey.split('_')[2] || currentCourse,
            section: activeKey.split('_Sec')[1]?.padStart(2, '0') || currentSection,
            courseTitle: COURSE_OPTIONS.find(c => c.value === (activeKey.split('_')[2] || currentCourse))?.label || "English",
            instructor: user?.fullName || "Instructor",
          }
        };

        const deletedIds = new Set(deletedStudents.map(s => (s.id || '').trim()));
        let updatedStudents = targetSectionData.students.filter(s => {
          const cleanedId = (s.id || '').trim();
          return !deletedIds.has(cleanedId);
        });

        const existingDeletedIds = new Set(targetSectionData.deletedStudentIds || []);
        deletedStudents.forEach(s => {
          const cleanedId = (s.id || '').trim();
          if (cleanedId) existingDeletedIds.add(cleanedId);
        });
        const updatedDeletedIds = Array.from(existingDeletedIds);

        validStudents.forEach(imported => {
          const importedId = (imported.id || '').trim();
          const existingIdx = updatedStudents.findIndex(s => (s.id || '').trim() === importedId);
          if (existingIdx !== -1) {
            const existing = updatedStudents[existingIdx];
            const existingGrades = existing.grades || {};
            const importedGrades = imported.grades || {};
            updatedStudents[existingIdx] = { 
              ...existing, 
              ...imported,
              grades: { ...existingGrades, ...importedGrades }
            };
          } else {
            updatedStudents.push(imported);
          }
        });

        mergedData[activeKey] = {
          ...targetSectionData,
          students: updatedStudents,
          deletedStudentIds: updatedDeletedIds
        };
      });

      return mergedData;
    });

    // Automatically navigate to the FIRST imported section so the user sees the result immediately!
    const firstSection = sections[0];
    const activeKey = firstSection.targetKey;
    const targetSem = activeKey.split('_')[1] || currentSemester;
    const targetCrs = activeKey.split('_')[2] || currentCourse;
    const targetSec = activeKey.split('_Sec')[1]?.padStart(2, '0') || currentSection;

    if (targetSem !== currentSemester) setCurrentSemester(targetSem);
    if (targetCrs !== currentCourse) setCurrentCourse(targetCrs);
    if (targetSec !== currentSection) setCurrentSection(targetSec);
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!user) {
    return (
      <>
        <Login onLogin={login} allUsers={allUsers} onRequestRegister={handleRequestRegister} />
        <Toaster position="top-right" />
      </>
    );
  }

  if (user?.role === 'admin' && isAdminDashboardActive) {
    return (
      <TooltipProvider>
        <div className="min-h-screen bg-slate-100 font-sans text-slate-900 flex flex-col p-4 md:p-8">
          <div className="w-full max-w-[1400px] mx-auto">
            <AdminDashboard 
              allUsers={allUsers}
              allData={allData}
              currentUserRole={user?.role}
              currentUsername={user?.username}
              currentSemester={currentSemester}
              onAddUser={addUser}
              onImportUsers={importUsers}
              onDeleteUser={deleteUser}
              onApproveUser={approveUser}
              onResetPassword={resetPassword}
              onUpdateSectionData={(key, updatedData) => {
                const newData = { ...allData, [key]: updatedData };
                saveAllData(newData);
              }}
              onPrintBooklet={(sem) => {
                setBookletSemester(sem);
                setPrintMode('booklet');
                setIsPrinting(true);
                setTimeout(() => {
                  window.print();
                }, 1500);
              }}
              onClose={() => setIsAdminDashboardActive(false)}
              registrationRequests={registrationRequests}
              onApproveRequest={handleApproveRequest}
              onRejectRequest={handleRejectRequest}
              onRemoveRequest={handleRemoveRequest}
              isPageLayout={true}
              onLogout={logout}
              onOpenGradesForInstructor={handleOpenGradesForInstructor}
            />
          </div>
          <Toaster position="top-right" />
        </div>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <div className={cn("min-h-screen bg-teal-700 font-sans text-slate-900 selection:bg-teal-100 selection:text-teal-900", view !== 'final-report' && "no-print")}>
        <div className="w-full max-w-[1700px] mx-auto bg-white flex flex-col border-x border-slate-200 shadow-2xl">
          {(view === 'statistics' || view === 'at-risk' || view === 'completion') ? (
            <StatsView 
              students={currentSectionData.students}
              courseCode={currentCourse}
              section={currentSection}
              semester={currentSemester}
              user={user}
              onBack={() => setView('raw')}
              initialTab={view === 'at-risk' ? 'atrisk' : view === 'completion' ? 'completion' : 'raw'}
            />
          ) : (
            <>
              <main className="w-full bg-slate-100 p-0 m-0">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={view + currentCourse + currentSection + currentSemester}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    <GradeTable 
                      semester={currentSemester}
                      setSemester={setCurrentSemester}
                      course={currentCourse}
                      setCourse={setCurrentCourse}
                      section={currentSection}
                      setSection={setCurrentSection}
                      availableCourses={(() => {
                        const allAvail = getAvailableCourses();
                        if (user?.role === 'instructor' && user?.subject) {
                          if (user.subject === 'English') {
                            const englishCourses = ['FP00000', 'FPPI002', 'FPIN003', 'FPAD004'];
                            return allAvail.filter(c => englishCourses.includes(c));
                          } else if (user.subject === 'Mathematics') {
                            return allAvail.filter(c => c === 'FPMA001');
                          } else if (user.subject === 'Information Technology') {
                            return allAvail.filter(c => c === 'FPIT001');
                          }
                        }
                        return allAvail;
                      })()}
                      availableSections={getAvailableSections(currentCourse)}
                      user={user}
                      onLogout={() => {
                        if (hasUnsavedChanges) {
                          setIsLogoutDialogOpen(true);
                        } else {
                          logout();
                        }
                      }}
                      onOpenAdmin={() => {
                        if (user?.role === 'admin') {
                          setIsAdminDashboardActive(true);
                        } else {
                          setIsAdminOpen(true);
                        }
                      }}
                      onChangePassword={() => setIsChangePasswordOpen(true)}
                      view={view}
                      students={currentSectionData.students}
                      isLocked={currentSectionData.isLocked}
                      onUpdateGrade={(studentId, index, value) => {
                        updateStudentGrade(studentId, index, value, user?.role === 'admin');
                      }}
                      onShowStats={() => setView('statistics')}
                      onToggleLock={toggleLock}
                      onClearGrades={clearGrades}
                      onClearStudents={clearStudents}
                      onImportStudents={handleImportPreview}
                      onAddSection={handleAddSection}
                      onImportAllData={(newData) => {
                        saveAllData((prevAllData) => {
                          const mergedData = { ...prevAllData };
                          Object.keys(newData).forEach(key => {
                            if (mergedData[key]) {
                              const existingSection = mergedData[key];
                              const importedSection = newData[key];

                              // Filter out deleted students
                              const deletedIds = new Set(existingSection.deletedStudentIds || []);
                              importedSection.students = importedSection.students.filter(s => !deletedIds.has(s.id));

                              const updatedStudents = existingSection.students.map(existingStudent => {
                                const importedStudent = importedSection.students.find(s => s.id === existingStudent.id);
                                if (importedStudent) {
                                  return {
                                    ...existingStudent,
                                    grades: { ...existingStudent.grades, ...importedStudent.grades }
                                  };
                                }
                                return existingStudent;
                              });
                              importedSection.students.forEach(importedStudent => {
                                if (!updatedStudents.find(s => s.id === importedStudent.id)) {
                                  let profileName = importedStudent.name;
                                  let profileGender = importedStudent.gender;
                                  Object.values(prevAllData).forEach(s => {
                                    const found = (s as SectionData).students.find(st => st.id === importedStudent.id);
                                    if (found) {
                                      profileName = found.name;
                                      profileGender = found.gender;
                                    }
                                  });
                                  updatedStudents.push({
                                    ...importedStudent,
                                    name: profileName,
                                    gender: profileGender
                                  });
                                }
                              });
                              mergedData[key] = { ...existingSection, students: updatedStudents };
                            } else {
                              mergedData[key] = newData[key];
                            }
                          });
                          return mergedData;
                        });
                      }}
                      onSetView={setView}
                      onUpdateMetaData={updateSectionMetaData}
                      onSaveJson={handleJsonExport}
                      onSaveLocal={handleLocalSave}
                      getSectionKey={getSectionKey}
                      hasUnsavedChanges={hasUnsavedChanges}
                      allData={allData}
                      currentSectionData={currentSectionData}
                      onSyncImport={handleSyncImport}
                      onBulkSyncImport={handleBulkSyncImport}
                    />
                  </motion.div>
                </AnimatePresence>
              </main>
            </>
          )}

          <AnimatePresence>
            {isAdminOpen && (
              <AdminDashboard 
                allUsers={allUsers}
                allData={allData}
                currentUserRole={user?.role}
                currentUsername={user?.username}
                currentSemester={currentSemester}
                onAddUser={addUser}
                onImportUsers={importUsers}
                onDeleteUser={deleteUser}
                onApproveUser={approveUser}
                onResetPassword={resetPassword}
                onUpdateSectionData={(key, updatedData) => {
                  const newData = { ...allData, [key]: updatedData };
                  saveAllData(newData);
                }}
                onPrintBooklet={(sem) => {
                  setBookletSemester(sem);
                  setIsAdminOpen(false);
                  setPrintMode('booklet');
                  setIsPrinting(true);
                  setTimeout(() => {
                    window.print();
                  }, 1500);
                }}
                onClose={() => setIsAdminOpen(false)}
                registrationRequests={registrationRequests}
                onApproveRequest={handleApproveRequest}
                onRejectRequest={handleRejectRequest}
                onRemoveRequest={handleRemoveRequest}
              />
            )}
          </AnimatePresence>

          <ChangePasswordModal 
            isOpen={isChangePasswordOpen} 
            onClose={() => setIsChangePasswordOpen(false)}
            onConfirm={(newPass) => {
              changePassword(newPass);
              setIsChangePasswordOpen(false);
            }} 
          />

          <Dialog open={showOptionalPasswordPrompt} onOpenChange={setShowOptionalPasswordPrompt}>
            <DialogContent className="sm:max-w-[450px] bg-white">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-teal-800 font-black uppercase tracking-tight">
                  <KeyRound className="w-5 h-5 text-teal-600" />
                  Security Preference
                </DialogTitle>
                <DialogDescription className="py-2 text-xs font-bold text-slate-500 uppercase tracking-wider leading-relaxed">
                  You are logged in with the default password assigned under approval or registration.
                </DialogDescription>
              </DialogHeader>
              <div className="py-3 text-slate-700 text-sm leading-relaxed space-y-2">
                <p>
                  Would you like to <strong>change your password now</strong> for extra account security, or keep utilizing the default assigned credentials?
                </p>
                <p className="text-[11px] text-slate-400 uppercase font-semibold">
                  You can change your password anytime later from the general Portal settings header option.
                </p>
              </div>
              <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-2 border-t mt-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    skipPasswordChange();
                    setShowOptionalPasswordPrompt(false);
                  }}
                  className="font-black uppercase tracking-widest text-[10px] h-10 border border-slate-300 text-slate-750 flex-1"
                >
                  Keep Default / Skip
                </Button>
                <Button 
                  type="button" 
                  onClick={() => {
                    setShowOptionalPasswordPrompt(false);
                    setIsChangePasswordOpen(true);
                  }}
                  className="font-black uppercase tracking-widest text-[10px] h-10 bg-teal-600 hover:bg-teal-700 text-white flex-1"
                >
                  Change Password
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <ImportModal
            isOpen={isImportOpen}
            onClose={() => setIsImportOpen(false)}
            onConfirm={handleConfirmImport}
            students={pendingStudents}
          />
          <Dialog open={isLogoutDialogOpen} onOpenChange={setIsLogoutDialogOpen}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-red-600">
                  <LogOut className="w-5 h-5" />
                  Confirm Logout
                </DialogTitle>
                <DialogDescription className="py-2 text-slate-600">
                  Are you sure you want to logout? Please make sure to <strong>Save to Json</strong> to keep a permanent backup of your data.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="flex flex-col sm:flex-row gap-2">
                <Button type="button" variant="outline" onClick={handleJsonExport} className="gap-2 border-blue-200 text-blue-700 hover:bg-blue-50 font-bold uppercase tracking-wider text-[10px]">
                  <Save className="w-4 h-4" />
                  SAVE JSON
                </Button>
                <div className="flex gap-2">
                  <Button type="button" variant="ghost" onClick={() => setIsLogoutDialogOpen(false)} className="font-bold uppercase tracking-wider text-[10px]">CLOSE</Button>
                  <Button type="button" variant="destructive" onClick={() => { logout(); setIsLogoutDialogOpen(false); }} className="font-bold uppercase tracking-wider text-[10px]">LOGOUT</Button>
                </div>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Toaster position="bottom-right" richColors />
          
          <footer className="w-full py-2 shrink-0 flex items-center justify-center text-center no-print bg-[#00786f] border-t border-teal-900/10">
            <p className="text-white m-0 antialiased font-sans text-[13px] font-medium leading-[14px] px-4">
              <a href="https://www.asu.edu.om/" target="_blank" rel="noopener noreferrer" className="text-blue-400 font-bold hover:text-yellow-200 transition-colors">A'Sharqiyah University</a> : P.O Box 42, Postal Code: 400 Ibra, Sultanate of Oman. <a href="https://www.asu.edu.om/CLFS" target="_blank" rel="noopener noreferrer" className="text-blue-400 font-bold hover:text-yellow-200 transition-colors">Center For Language and Foundation Studies</a>. Copyright &copy; <a href="mailto:h.rehman@asu.edu.om" className="text-blue-400 font-black tracking-wide hover:text-yellow-200 transition-colors">drkhan</a> 2026.
            </p>
          </footer>
        </div>
      </div>

      {isPrinting && (
        <>
          <div className={cn("print-report-section", view === 'final-report' && "no-print")}>
            <PrintReport 
              students={currentSectionData.students}
              courseCode={currentCourse}
              section={currentSection}
              semester={currentSemester}
              user={user}
              allData={allData}
              currentSectionData={currentSectionData}
              availableCourses={getAvailableCourses()}
              availableSections={getAvailableSections(currentCourse)}
              getSectionKey={getSectionKey}
            />
          </div>
          <div className="print-report-booklet">
            <BookletReport 
              allData={allData}
              user={user}
              semester={bookletSemester}
            />
          </div>
        </>
      )}
    </TooltipProvider>
  );
}
