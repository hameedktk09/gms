import React from 'react';
import { GradeTable, cleanInstructorText } from './GradeTable';
import { StatsView } from './StatsView';
import { FinalReport } from './FinalReport';
import { ViewType, StudentData, User, AllCoursesData, SEMESTER_OPTIONS, COURSE_OPTIONS } from '@/src/types';
import { ClfsLogo } from './ClfsLogo';
import { cn } from '@/lib/utils';

interface PrintReportProps {
  students: StudentData[];
  courseCode: string;
  section: string;
  semester: string;
  user: User | null;
  allData: AllCoursesData;
  currentSectionData: any;
  availableCourses: string[];
  availableSections: string[];
  getSectionKey: (semester: string, course: string, section: string) => string;
}

const PrintHeader = ({ 
  semester, 
  courseCode, 
  section, 
  user, 
  title,
  availableCourses 
}: { 
  semester: string; 
  courseCode: string; 
  section: string; 
  user: User | null; 
  title: string;
  availableCourses: string[];
}) => {
  const getCourseLabel = (val: string) => {
    return COURSE_OPTIONS.find(o => o.value === val)?.label || val;
  };

  return (
    <div className="w-full px-8 py-6 bg-white border-b-2 border-slate-200 mb-6">
      <div className="grid grid-cols-[auto_1fr_auto] items-center gap-8">
        <div className="flex items-center justify-center">
          <ClfsLogo className="w-48 h-24 object-contain" />
        </div>
        
        <div className="flex flex-col items-center text-center gap-2">
          <h1 className="text-base font-black text-blue-600 uppercase tracking-[0.2em]">
            A'Sharqiyah University
          </h1>
          <h2 className="text-sm font-bold text-blue-800 uppercase tracking-[0.15em]">
            Center For Language and Foundation Studies
          </h2>
          <span className="text-xs font-bold text-slate-500 uppercase tracking-[0.1em]">
            GMS | Grade Management System
          </span>
          <span className="text-xs font-black text-blue-700 uppercase tracking-[0.1em]">
            {SEMESTER_OPTIONS.find(s => s.value === semester)?.label || semester}
          </span>
        </div>

        <div className="flex flex-col gap-3 min-w-[250px]">
          <div className="bg-slate-50 p-2 rounded border border-slate-200">
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Instructor Name</p>
            <p className="text-[11px] font-black text-slate-900">
              {(() => {
                const fullText = cleanInstructorText(user?.fullName || 'Administrator');
                const degreeMatch = fullText.match(/(Bachelor|Diploma|Education|Foundation|Master|Doctorate|Pre-Master|Pre-Session|BSc|BA|BEng|LLB|MA|MSc|MBA|PhD).*$/i);
                return degreeMatch ? degreeMatch[0] : fullText;
              })()}
            </p>
          </div>
          <div className="grid grid-cols-[1fr_auto_auto] gap-2 bg-slate-50 p-2 rounded border border-slate-200">
            <div>
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Course Full Name</p>
              <p className="text-[10px] font-black text-slate-900 uppercase truncate max-w-[150px]">{getCourseLabel(courseCode)}</p>
            </div>
            <div className="w-px h-full bg-slate-300 mx-1" />
            <div>
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Code</p>
              <p className="text-[10px] font-bold text-slate-700">{courseCode}</p>
            </div>
            <div className="w-px h-full bg-slate-300 mx-1" />
            <div>
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Section</p>
              <p className="text-[10px] font-bold text-slate-700">{section}</p>
            </div>
          </div>
        </div>
      </div>
      <div className="mt-4 text-center border-t border-slate-100 pt-2">
        <h2 className="text-sm font-black text-slate-800 uppercase tracking-[0.3em]">{title}</h2>
      </div>
    </div>
  );
};

const PrintFooter = () => (
  <div className="print-footer">
    <div className="flex justify-between items-center px-8">
      <a href="https://asu.edu.om" className="text-[#1447e6] hover:underline">A'Sharqiyah University - GMS Report</a>
      <p>Page <span className="pageNumber"></span></p>
      <p>{new Date().toLocaleDateString()}</p>
    </div>
  </div>
);

export function PrintReport({ 
  students, 
  courseCode, 
  section, 
  semester, 
  user, 
  allData, 
  currentSectionData,
  availableCourses,
  availableSections,
  getSectionKey
}: PrintReportProps) {
  const views: ViewType[] = ['raw', 'summative', 'final', 'performance', 'final-report'];
  
  const getViewTitle = (view: ViewType) => {
    switch(view) {
      case 'raw': return 'Raw Grades Sheet';
      case 'summative': return 'Real Grades Sheet';
      case 'final': return 'Final Grades Sheet';
      case 'performance': return 'Performance Analysis Report';
      case 'final-report': return 'Final Course Report';
      default: return 'Grades Report';
    }
  };

  return (
    <div className="hidden print:block w-full bg-white font-sans">
      {views.map((view, index) => (
        <div 
          key={view} 
          className={cn(
            "w-full", 
            index > 0 && "page-break",
            view === 'final-report' ? "print-portrait" : "print-landscape"
          )}
        >
          {view !== 'final-report' && (
            <PrintHeader 
              semester={semester}
              courseCode={courseCode}
              section={section}
              user={user}
              title={getViewTitle(view)}
              availableCourses={availableCourses}
            />
          )}
          <div className={cn(view !== 'final-report' && "px-8 pb-12")}>
            {view === 'final-report' ? (
              <FinalReport 
                students={students}
                courseCode={courseCode}
                section={section}
                semester={semester}
                user={user}
                onBack={() => {}}
                metadata={currentSectionData.formData}
              />
            ) : (
              <GradeTable 
                view={view}
                students={students}
                isLocked={true}
                hidePrintHeader={true}
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
                getSectionKey={getSectionKey}
                hasUnsavedChanges={false}
                allData={allData}
                currentSectionData={currentSectionData}
                semester={semester}
                setSemester={() => {}}
                course={courseCode}
                setCourse={() => {}}
                section={section}
                setSection={() => {}}
                availableCourses={availableCourses}
                availableSections={availableSections}
                user={user}
                onLogout={() => {}}
                onOpenAdmin={() => {}}
                onChangePassword={() => {}}
              />
            )}
          </div>
          <PrintFooter />
        </div>
      ))}
      
      <div className="page-break w-full print-landscape">
        <StatsView 
          students={students}
          courseCode={courseCode}
          section={section}
          semester={semester}
          user={user}
          onBack={() => {}}
        />
        <PrintFooter />
      </div>
    </div>
  );
}
