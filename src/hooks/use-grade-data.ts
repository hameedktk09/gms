import { useState, useEffect, useCallback } from 'react';
import { AllCoursesData, SectionData, StudentData } from '@/src/types';

const STORAGE_KEY = 'SGS_All_Courses';

export function useGradeData() {
  const [allData, setAllData] = useState<AllCoursesData>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : {};
  });
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  // Fetch all grades from backend on mount
  useEffect(() => {
    const loadGradesData = async () => {
      try {
        const res = await fetch("/api/grades");
        const json = await res.json();
        if (json.success && json.grades) {
          setAllData(json.grades);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(json.grades));
        }
      } catch (e) {
        console.warn("Failed to load grades from backend, using local:", e);
      } finally {
        setIsDataLoaded(true);
      }
    };
    loadGradesData();
  }, []);

  // Save to backend and local storage on updates after backend load complete
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allData));
    
    if (isDataLoaded) {
      const saveGradesData = async () => {
        try {
          await fetch("/api/grades", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ grades: allData })
          });
        } catch (e) {
          console.error("Failed to save grades in backend:", e);
        }
      };
      saveGradesData();
    }
  }, [allData, isDataLoaded]);

  const [currentCourse, setCurrentCourse] = useState(() => localStorage.getItem('SGS_currentCourse') || 'FPPI002');
  const [currentSection, setCurrentSection] = useState(() => localStorage.getItem('SGS_currentSection') || '00');
  const [currentSemester, setCurrentSemester] = useState(() => localStorage.getItem('SGS_currentSemester') || 'Fall');

  useEffect(() => {
    localStorage.setItem('SGS_currentCourse', currentCourse);
  }, [currentCourse]);
  
  useEffect(() => {
    localStorage.setItem('SGS_currentSection', currentSection);
  }, [currentSection]);
  
  useEffect(() => {
    localStorage.setItem('SGS_currentSemester', currentSemester);
  }, [currentSemester]);

  const getSectionKey = useCallback((semester: string, course: string, section: string) => {
    return `SGS_${semester}_${course}_Sec${section.padStart(2, '0')}`;
  }, []);

  const currentSectionKey = getSectionKey(currentSemester, currentCourse, currentSection);
  const currentSectionData: SectionData = allData[currentSectionKey] || {
    students: [],
    isLocked: false,
    formData: { semester: currentSemester, course: currentCourse, section: currentSection }
  };

  const saveAllData = (newDataOrFn: AllCoursesData | ((prev: AllCoursesData) => AllCoursesData)) => {
    setAllData(prev => (typeof newDataOrFn === 'function' ? newDataOrFn(prev) : newDataOrFn));
  };

  const updateStudentGrade = (studentId: string, gradeIndex: number, value: string, isBypass: boolean = false) => {
    setAllData(prevData => {
      const sectionKey = getSectionKey(currentSemester, currentCourse, currentSection);
      const section = prevData[sectionKey];
      
      if (!section || (section.isLocked && !isBypass)) return prevData;
      
      const studentIdx = section.students.findIndex(s => s.id === studentId);
      if (studentIdx === -1) return prevData;

      const newStudents = [...section.students];
      const student = { ...newStudents[studentIdx] };
      student.grades = { ...student.grades, [gradeIndex]: value };
      newStudents[studentIdx] = student;

      const newSection = { ...section, students: newStudents };
      return { ...prevData, [sectionKey]: newSection };
    });
  };

  const setStudents = (students: StudentData[]) => {
    const newData = { ...allData };
    newData[currentSectionKey] = {
      ...currentSectionData,
      students
    };
    saveAllData(newData);
  };

  const toggleLock = () => {
    const newData = { ...allData };
    newData[currentSectionKey] = {
      ...currentSectionData,
      isLocked: !currentSectionData.isLocked
    };
    saveAllData(newData);
  };

  const lockSection = useCallback(() => {
    setAllData(prev => {
      const key = getSectionKey(currentSemester, currentCourse, currentSection);
      if (!prev[key]) return prev;
      return {
        ...prev,
        [key]: {
          ...prev[key],
          isLocked: true
        }
      };
    });
  }, [currentSemester, currentCourse, currentSection, getSectionKey]);

  const clearGrades = () => {
    const newData = { ...allData };
    const section = { ...currentSectionData };
    section.students = section.students.map(s => ({
      ...s,
      grades: {}
    }));
    newData[currentSectionKey] = section;
    saveAllData(newData);
  };

  const clearStudents = () => {
    const newData = { ...allData };
    newData[currentSectionKey] = {
      ...currentSectionData,
      students: [],
      formData: {
        ...currentSectionData.formData,
        semester: "ABC Semester",
        instructor: "Instructor's Name",
        courseTitle: "English",
        course: "FP000x",
        section: "xx"
      }
    };
    saveAllData(newData);
  };
  
  const updateSectionMetaData = (semester: string, course: string, section: string, instructor?: string, courseTitle?: string) => {
    setCurrentSemester(semester);
    setCurrentCourse(course);
    setCurrentSection(section);
    
    setAllData(prevData => {
      const sectionKey = getSectionKey(semester, course, section);
      const existingSection = prevData[sectionKey] || {
        students: [],
        isLocked: false,
        formData: { semester, course, section }
      };
      
      const newSection = {
        ...existingSection,
        formData: {
          ...existingSection.formData,
          semester,
          course,
          section,
          instructor: instructor || existingSection.formData.instructor,
          courseTitle: courseTitle || existingSection.formData.courseTitle
        }
      };
      
      return { ...prevData, [sectionKey]: newSection };
    });
  };

  const getAvailableCourses = useCallback(() => {
    const courses = new Set<string>();
    const englishCourses = ['FP00000', 'FPPI002', 'FPIN003', 'FPAD004'];
    
    // Prioritize sections that actually have student records
    (Object.entries(allData) as Array<[string, SectionData]>).forEach(([key, section]) => {
      const match = key.match(new RegExp(`SGS_${currentSemester}_(.*)_Sec.*`));
      if (match && match[1] && section.students && section.students.length > 0) {
        if (englishCourses.includes(match[1])) {
          courses.add(match[1]);
        }
      }
    });

    // Ensure the current active course is always included so it remains selectable
    if (currentCourse && englishCourses.includes(currentCourse)) {
      courses.add(currentCourse);
    }

    // Fallback: If no courses have students, return any configured course keys
    if (courses.size === 0 || (courses.size === 1 && courses.has(currentCourse) && (!allData[getSectionKey(currentSemester, currentCourse, currentSection)]?.students || allData[getSectionKey(currentSemester, currentCourse, currentSection)].students.length === 0))) {
      Object.keys(allData).forEach(key => {
        const match = key.match(new RegExp(`SGS_${currentSemester}_(.*)_Sec.*`));
        if (match && match[1] && englishCourses.includes(match[1])) courses.add(match[1]);
      });
    }

    // Secondary Fallback
    if (courses.size === 0) return ['FP00000'];
    return Array.from(courses).sort();
  }, [allData, currentSemester, currentCourse, currentSection, getSectionKey]);

  const getAvailableSections = useCallback((course: string) => {
    const sections = new Set<string>();
    
    // Prioritize sections that actually have student records
    (Object.entries(allData) as Array<[string, SectionData]>).forEach(([key, section]) => {
      const match = key.match(new RegExp(`SGS_${currentSemester}_${course}_Sec(.*)`));
      if (match && match[1] && section.students && section.students.length > 0) {
        sections.add(match[1]);
      }
    });

    // Ensure current section is always selectable if we are viewing this course
    if (course === currentCourse && currentSection) {
      sections.add(currentSection);
    }

    // Fallback: If no sections for this course have students, return any matching keys
    if (sections.size === 0 || (course === currentCourse && sections.size === 1 && sections.has(currentSection) && (!allData[getSectionKey(currentSemester, course, currentSection)]?.students || allData[getSectionKey(currentSemester, course, currentSection)].students.length === 0))) {
      Object.keys(allData).forEach(key => {
        const match = key.match(new RegExp(`SGS_${currentSemester}_${course}_Sec(.*)`));
        if (match && match[1]) sections.add(match[1]);
      });
    }

    // Secondary Fallback
    if (sections.size === 0) return ['01'];
    return Array.from(sections).sort();
  }, [allData, currentSemester, currentCourse, currentSection, getSectionKey]);

  return {
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
    lockSection,
    saveAllData,
    getAvailableCourses,
    getAvailableSections,
    updateSectionMetaData,
    getSectionKey,
  };
}
