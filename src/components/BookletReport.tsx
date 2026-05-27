import React from 'react';
import { GradeTable } from './GradeTable';
import { StatsView } from './StatsView';
import { FinalReport } from './FinalReport';
import { StudentData, User, AllCoursesData, SEMESTER_OPTIONS, COURSE_OPTIONS } from '@/src/types';
import { ClfsLogo } from './ClfsLogo';
import { cn } from '@/lib/utils';

interface BookletReportProps {
  allData: AllCoursesData;
  user: User | null;
  semester: string;
}

const BookletCover = ({ semester, courseName, courseCode, section, instructorName }: { 
  semester: string, 
  courseName: string, 
  courseCode: string, 
  section: string, 
  instructorName: string 
}) => {
  const semesterLabel = SEMESTER_OPTIONS.find(s => s.value === semester)?.label || semester;
  
  return (
    <div className="w-full h-[290mm] flex flex-col items-center justify-center p-16 bg-white text-blue-950 border-[24px] border-blue-950 relative overflow-hidden">
      {/* Decorative Elements */}
      <div className="absolute top-[-100px] right-[-100px] w-80 h-80 bg-blue-50 rounded-full opacity-50" />
      <div className="absolute bottom-[-50px] left-[-50px] w-64 h-64 bg-blue-50 rounded-full opacity-30" />
      
      <div className="flex-1 flex flex-col items-center justify-center text-center space-y-12 z-10 w-full">
        <div className="bg-white p-8 border-8 border-blue-950 shadow-2xl mb-4">
          <ClfsLogo className="w-80 h-32 object-contain" />
        </div>
        
        <div className="space-y-6">
          <div className="flex flex-col items-center">
            <h1 className="text-6xl font-black uppercase tracking-[0.2em] mb-2">
              COURSE DOSSIER
            </h1>
            <div className="w-full h-1.5 bg-blue-950 mt-2"></div>
            <div className="w-1/2 h-1 bg-blue-950 mt-1"></div>
          </div>
          <h2 className="text-4xl font-bold uppercase tracking-[0.15em] text-blue-800">
            {semesterLabel}
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-8 w-full max-w-2xl text-left bg-blue-50/30 p-12 border-2 border-blue-950/10">
          <div className="space-y-1">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.5em]">Course Name</p>
            <p className="text-3xl font-black uppercase text-blue-950 leading-tight">{courseName}</p>
          </div>
          
          <div className="grid grid-cols-2 gap-12">
            <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.5em]">Course Code</p>
                <p className="text-3xl font-black uppercase text-blue-950">{courseCode}</p>
            </div>
            <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.5em]">Section No.</p>
                <p className="text-3xl font-black uppercase text-blue-950">{section}</p>
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.5em]">Academic Instructor</p>
            <p className="text-3xl font-black uppercase text-blue-950">{instructorName}</p>
          </div>
        </div>

        <div className="pt-16 flex flex-col items-center space-y-4">
          <div className="w-16 h-1 w-blue-950"></div>
          <div className="text-center">
            <p className="text-xs font-black uppercase tracking-[0.4em] text-slate-500 mb-1">Center For Language and Foundation Studies</p>
            <p className="text-lg font-black uppercase tracking-[0.2em] text-blue-950">A'Sharqiyah University</p>
          </div>
        </div>
      </div>
      
      <div className="w-full text-center py-10 border-t border-slate-200 mt-auto z-10">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-white px-4 relative -top-12 inline-block">
          Official Academic Records
        </p>
        <p className="text-[9px] font-bold text-slate-300 uppercase tracking-[0.3em]">
          Ref: CD-{courseCode}-{section}-{semester.toUpperCase()}-2026
        </p>
      </div>
    </div>
  );
};

const BookletBackCover = ({ semester, courseCode, section }: { semester: string, courseCode: string, section: string }) => {
  return (
    <div className="w-full h-[290mm] flex flex-col items-center justify-center p-16 bg-blue-950 text-white relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-5 bg-[radial-gradient(circle_at_center,white_0%,transparent_70%)]"></div>
        <div className="z-10 flex flex-col items-center text-center space-y-8">
            <div className="w-32 h-32 border-4 border-white/20 rotate-45 flex items-center justify-center">
                <div className="-rotate-45 font-black text-4xl opacity-40">CD</div>
            </div>
            <div className="space-y-2">
                <h3 className="text-2xl font-black uppercase tracking-[0.3em]">End of Dossier</h3>
                <p className="text-blue-300 text-xs font-bold uppercase tracking-widest">Section {section} | {courseCode}</p>
            </div>
            <div className="w-12 h-0.5 bg-blue-400/30"></div>
            <p className="max-w-xs text-[10px] text-blue-400/60 uppercase tracking-widest leading-relaxed">
                This document contains confidential academic performance data and grades.
                Unauthorized reproduction or disclosure is strictly prohibited under institutional policy.
            </p>
        </div>
        <div className="mt-auto z-10 pb-10">
            <ClfsLogo className="w-32 h-16 object-contain brightness-0 invert opacity-30" />
        </div>
    </div>
  );
}

export function BookletReport({ allData, user, semester }: BookletReportProps) {
  // Filter data for the selected semester and ensure they have students
  const semesterData = Object.entries(allData).filter(([key, data]) => {
    return data.formData.semester === semester && data.students.length > 0;
  });

  if (semesterData.length === 0) return null;

  const instructorName = user?.fullName || "Administrator";

  return (
    <div className="hidden print:block w-full bg-white font-sans">
      {/* Pages for each section */}
      {semesterData.map(([key, sectionData], index) => {
        const { students, formData } = sectionData;
        const { course, section: sectionNum } = formData;
        const courseLabel = COURSE_OPTIONS.find(o => o.value === course)?.label || course;
        
        return (
          <React.Fragment key={key}>
            {/* Front Cover */}
            <div className="page-break">
                <BookletCover 
                  semester={semester} 
                  courseName={formData.courseTitle || courseLabel}
                  courseCode={course}
                  section={sectionNum}
                  instructorName={instructorName} 
                />
            </div>

            {/* Official Final Result Report (Signature Page) - Moved to first page after cover */}
            <div className="page-break w-full">
                <FinalReport 
                   students={students}
                   courseCode={course}
                   section={sectionNum}
                   semester={semester}
                   user={user}
                   onBack={() => {}}
                   metadata={formData}
                />
            </div>

            {/* Final Grades Sheet */}
            <div className="page-break w-full p-0">
                <GradeTable 
                    view="final"
                    students={students}
                    isLocked={true}
                    onUpdateGrade={() => {}}
                    onShowStats={() => {}}
                    onToggleLock={() => {}}
                    onClearGrades={() => {}}
                    onClearStudents={() => {}}
                    onImportStudents={() => {}}
                    onImportAllData={() => {}}
                    onSetView={() => {}}
                    onUpdateMetaData={() => {}}
                    onSaveJson={() => {}}
                    onSaveLocal={() => {}}
                    getSectionKey={() => key}
                    hasUnsavedChanges={false}
                    allData={allData}
                    currentSectionData={sectionData}
                    semester={semester}
                    setSemester={() => {}}
                    course={course}
                    setCourse={() => {}}
                    section={sectionNum}
                    setSection={() => {}}
                    availableCourses={COURSE_OPTIONS.map(o => o.value)}
                    availableSections={[sectionNum]}
                    user={user}
                    onLogout={() => {}}
                    onOpenAdmin={() => {}}
                    onChangePassword={() => {}}
                />
            </div>

            {/* Real Grades Sheet */}
            <div className="page-break w-full p-0">
                <GradeTable 
                    view="summative"
                    students={students}
                    isLocked={true}
                    onUpdateGrade={() => {}}
                    onShowStats={() => {}}
                    onToggleLock={() => {}}
                    onClearGrades={() => {}}
                    onClearStudents={() => {}}
                    onImportStudents={() => {}}
                    onImportAllData={() => {}}
                    onSetView={() => {}}
                    onUpdateMetaData={() => {}}
                    onSaveJson={() => {}}
                    onSaveLocal={() => {}}
                    getSectionKey={() => key}
                    hasUnsavedChanges={false}
                    allData={allData}
                    currentSectionData={sectionData}
                    semester={semester}
                    setSemester={() => {}}
                    course={course}
                    setCourse={() => {}}
                    section={sectionNum}
                    setSection={() => {}}
                    availableCourses={COURSE_OPTIONS.map(o => o.value)}
                    availableSections={[sectionNum]}
                    user={user}
                    onLogout={() => {}}
                    onOpenAdmin={() => {}}
                    onChangePassword={() => {}}
                />
            </div>

            {/* Raw Grades Sheet */}
            <div className="page-break w-full p-0">
                <GradeTable 
                    view="raw"
                    students={students}
                    isLocked={true}
                    onUpdateGrade={() => {}}
                    onShowStats={() => {}}
                    onToggleLock={() => {}}
                    onClearGrades={() => {}}
                    onClearStudents={() => {}}
                    onImportStudents={() => {}}
                    onImportAllData={() => {}}
                    onSetView={() => {}}
                    onUpdateMetaData={() => {}}
                    onSaveJson={() => {}}
                    onSaveLocal={() => {}}
                    getSectionKey={() => key}
                    hasUnsavedChanges={false}
                    allData={allData}
                    currentSectionData={sectionData}
                    semester={semester}
                    setSemester={() => {}}
                    course={course}
                    setCourse={() => {}}
                    section={sectionNum}
                    setSection={() => {}}
                    availableCourses={COURSE_OPTIONS.map(o => o.value)}
                    availableSections={[sectionNum]}
                    user={user}
                    onLogout={() => {}}
                    onOpenAdmin={() => {}}
                    onChangePassword={() => {}}
                />
            </div>

            {/* Performance and Stats Analysis */}
            <div className="page-break w-full">
                <GradeTable 
                    view="performance"
                    students={students}
                    isLocked={true}
                    onUpdateGrade={() => {}}
                    onShowStats={() => {}}
                    onToggleLock={() => {}}
                    onClearGrades={() => {}}
                    onClearStudents={() => {}}
                    onImportStudents={() => {}}
                    onImportAllData={() => {}}
                    onSetView={() => {}}
                    onUpdateMetaData={() => {}}
                    onSaveJson={() => {}}
                    onSaveLocal={() => {}}
                    getSectionKey={() => key}
                    hasUnsavedChanges={false}
                    allData={allData}
                    currentSectionData={sectionData}
                    semester={semester}
                    setSemester={() => {}}
                    course={course}
                    setCourse={() => {}}
                    section={sectionNum}
                    setSection={() => {}}
                    availableCourses={COURSE_OPTIONS.map(o => o.value)}
                    availableSections={[sectionNum]}
                    user={user}
                    onLogout={() => {}}
                    onOpenAdmin={() => {}}
                    onChangePassword={() => {}}
                />
            </div>

            <div className="page-break w-full">
                <StatsView 
                    students={students}
                    courseCode={course}
                    section={sectionNum}
                    semester={semester}
                    user={user}
                    onBack={() => {}}
                />
            </div>

            {/* Individual Student Profiles (if any or other reports) */}

            {/* Back Cover */}
            <div className="page-break">
                <BookletBackCover 
                  semester={semester}
                  courseCode={course}
                  section={sectionNum}
                />
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}
