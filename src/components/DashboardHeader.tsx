import React from 'react';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { LogOut, BookOpen, Users, ShieldAlert } from 'lucide-react';
import { ViewType, COURSE_OPTIONS, SEMESTER_OPTIONS } from '@/src/types';
import { ClfsLogo } from './ClfsLogo';
import { cleanInstructorText } from './GradeTable';
import { User } from '@/src/types';
import { cn } from '@/lib/utils';

interface DashboardHeaderProps {
  semester: string;
  setSemester: (v: string) => void;
  course: string;
  setCourse: (v: string) => void;
  section: string;
  setSection: (v: string) => void;
  view: ViewType;
  setView: (v: ViewType) => void;
  availableCourses: string[];
  availableSections: string[];
  hasData: boolean;
  user: User | null;
  onLogout: () => void;
  onOpenAdmin: () => void;
  onSaveLocal?: () => void;
  sectionData?: any;
  hasUnsavedChanges?: boolean;
}

export function DashboardHeader({
  semester,
  setSemester,
  course,
  setCourse,
  section,
  setSection,
  view,
  setView,
  availableCourses,
  availableSections,
  hasData,
  user,
  onLogout,
  onOpenAdmin,
  onSaveLocal,
  sectionData,
  hasUnsavedChanges
}: DashboardHeaderProps) {
  const viewLabels: Record<ViewType, string> = {
    raw: 'Raw Grades Sheet',
    summative: 'Real Grades Sheet',
    final: 'Final Grades Sheet',
    performance: 'Performance Analysis',
    statistics: 'Statistics Analysis',
    'at-risk': 'At-Risk Distribution',
    completion: 'Completion Report',
    'final-report': 'Final Course Report'
  };

  const getCourseLabel = (val: string) => {
    return COURSE_OPTIONS.find(o => o.value === val)?.label || val;
  };

  return (
    <div className="px-4 pt-1">
      <div className="bg-slate-100 border border-slate-300 shadow-sm no-print">
        <div className="w-full px-4 py-2">
          <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr_auto] items-start gap-6">
            {/* Left: Logo */}
            <div className="flex items-start justify-center lg:justify-start">
              <div className="flex items-center justify-center min-w-[240px] h-[116px] transition-all">
                <ClfsLogo className="w-56 h-auto max-h-[100px] object-contain" />
              </div>
            </div>

            {/* Middle: University Info and View Switcher */}
            <div className="flex flex-col items-center justify-start text-center gap-4 px-2 print:bg-white print:border-none print:p-0 print:shadow-none">
              <div className="w-full bg-white p-3 border border-slate-200 shadow-sm flex flex-col items-center justify-center h-[116px] print:border-none print:shadow-none print:p-0 print:h-auto">
                <div className="flex flex-col items-center gap-1.5">
                  <h1 className="text-[20px] leading-[25px] font-black text-teal-950 uppercase tracking-[0.25em] print:text-teal-950 print:text-lg">
                    A'Sharqiyah University
                  </h1>
                  <h2 className="text-xs md:text-sm font-serif font-bold italic text-teal-800 uppercase tracking-[0.15em] print:text-teal-850 print:text-base">
                    Center For Language and Foundation Studies
                  </h2>
                  <div className="flex items-center gap-3 mt-1 underline-offset-4 decoration-teal-200">
                    <span className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-[0.1em] print:text-slate-700 print:text-xs">
                      GMS | Grade Management System
                    </span>
                    <div className="w-1 h-1 bg-slate-300" />
                    <span className="text-[10px] md:text-xs font-black text-teal-900 uppercase tracking-[0.1em] print:text-teal-900 print:text-xs">
                      {SEMESTER_OPTIONS.find(s => s.value === semester)?.label || semester}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-wrap items-center justify-center gap-2 mt-1 no-print">
                {[
                  { id: 'raw', label: 'Numerical' },
                  { id: 'summative', label: 'Real' },
                  { id: 'final', label: 'Final' },
                  { id: 'at-risk', label: 'At-Risk' },
                  { id: 'performance', label: 'Performance' },
                  { id: 'completion', label: 'Completion' }
                ].filter(v => {
                  if (view === 'raw' && (v.id === 'at-risk' || v.id === 'completion')) return false;
                  return true;
                }).map(v => (
                  <button 
                    key={v.id}
                    onClick={() => setView(v.id as ViewType)}
                    className={cn(
                      "px-6 py-3 text-xs font-black uppercase tracking-wider transition-all border shadow-sm",
                      view === v.id 
                        ? "bg-[#FFEE82] text-teal-950 border-[#FFEE82] ring-2 ring-[#FFEE82]/10" 
                        : "bg-slate-100 text-slate-600 border-slate-300 hover:border-[#FFEE82] hover:text-teal-950 hover:bg-[#FFEE82]"
                    )}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Right: Instructor Info and Course/Section Consolidated Tray */}
            <div className="flex flex-col min-h-[116px] min-w-[340px] bg-white border border-slate-200 shadow-sm overflow-hidden no-print print:block print:border-none print:shadow-none print:p-0 font-sans">
              {/* Top Row: Instructor Info and Logout */}
              <div className="flex items-center gap-2 p-3 border-b border-slate-100">
                <div className="flex-1 flex items-center gap-3">
                  {(user?.role === 'admin' || user?.role === 'instructor') && (
                    <Button 
                      variant="outline" 
                      size="icon" 
                      onClick={onOpenAdmin}
                      className="w-9 h-9 bg-slate-100 text-[#00786f] border-slate-300 hover:bg-[#FFEE82] hover:text-teal-950 hover:border-[#FFEE82] transition-all no-print shadow-sm shrink-0"
                      title={user?.role === 'admin' ? "Admin Dashboard" : "Instructor Directory"}
                    >
                      <ShieldAlert className="w-5 h-5" />
                    </Button>
                  )}
                  <div className="flex flex-col items-start">
                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Instructor Name</p>
                    <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-[#e8f5e9] border border-emerald-300 shadow-sm">
                      <p className="text-[11px] font-bold text-emerald-950 leading-tight">
                        {cleanInstructorText(sectionData?.formData?.instructor || user?.fullName || 'Administrator')}
                      </p>
                      <div className="inline-flex items-center gap-1 bg-emerald-600 text-white text-[8px] font-extrabold px-1.5 py-0.5 rounded tracking-wider leading-none">
                        <span className="w-1.5 h-1.5 rounded-full bg-white relative flex">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white"></span>
                        </span>
                        LIVE
                      </div>
                    </div>
                  </div>
                </div>

                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => onLogout()}
                  className="h-9 px-4 text-[11px] font-black uppercase tracking-widest gap-2 bg-slate-100 text-red-600 border-slate-300 hover:bg-[#FFEE82] hover:text-red-900 hover:border-[#FFEE82] transition-all active:scale-95 shadow-sm shrink-0"
                  title="Logout"
                >
                  LOGOUT
                  <LogOut className="w-3.5 h-3.5" />
                </Button>
              </div>

              {/* Bottom Row: Course/Section */}
              <div className="flex items-center gap-2 p-3 min-w-[300px]">
                <div className="flex flex-col flex-1 px-1">
                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 leading-none">Course Full Name</span>
                  <Select value={course} onValueChange={setCourse}>
                    <SelectTrigger className="h-5 border-none bg-transparent p-0 font-serif font-bold text-slate-900 focus:ring-0 text-[11px] uppercase tracking-tight no-print w-full flex items-center gap-1">
                      <SelectValue className="truncate">{sectionData?.formData?.courseTitle || getCourseLabel(course)}</SelectValue>
                    </SelectTrigger>
                    <span className="hidden print:block text-[11px] font-serif font-bold text-black uppercase leading-tight">{sectionData?.formData?.courseTitle || getCourseLabel(course)}</span>
                    <SelectContent className="bg-white border-slate-200 text-slate-900">
                      {COURSE_OPTIONS.filter(c => availableCourses.includes(c.value)).map(c => {
                        return (
                          <SelectItem key={c.value} value={c.value} className="!font-normal text-teal-700">
                            {c.label}
                          </SelectItem>
                        );
                      })}
                      {availableCourses.length === 0 && (
                        <div className="p-4 text-center text-xs text-slate-400 italic">
                          No courses uploaded yet.<br/>Please import a file to start.
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-px h-6 bg-slate-100 mx-1" />
                <div className="flex flex-col px-1 shrink-0">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 leading-none">Code</span>
                  <span className="text-[11px] font-bold text-slate-700">{course}</span>
                </div>
                <div className="w-px h-6 bg-slate-100 mx-1" />
                <div className="flex flex-col px-1 shrink-0">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 leading-none">Section</span>
                  <Select value={section} onValueChange={setSection}>
                    <SelectTrigger className="h-5 border-none bg-transparent p-0 font-bold text-slate-700 focus:ring-0 text-[11px] no-print flex items-center gap-1">
                      <SelectValue />
                    </SelectTrigger>
                    <span className="hidden print:block text-[11px] font-bold text-black">{section}</span>
                    <SelectContent className="bg-white border-slate-200 text-slate-900">
                      {availableSections.length > 0 ? (
                        availableSections.map(s => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))
                      ) : (
                        <SelectItem value={section}>{section}</SelectItem>
                      )}
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
}
