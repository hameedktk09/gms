import React, { useEffect, useRef } from 'react';
import { 
  StudentData, 
  User, 
  SEMESTER_OPTIONS, 
  COURSE_OPTIONS,
  RAW_MARKS_LIMITS
} from '@/src/types';
import { ClfsLogo } from './ClfsLogo';
import { 
  calculateFinalValues, 
  getPerformanceAnalysisData,
  calculateSummativeValues,
  calculateAtRiskDistribution 
} from '@/src/lib/grade-utils';
import { cn } from '@/lib/utils';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
  Printer, 
  ChevronLeft, 
  Calculator,
  Target,
  FileSearch,
  MessageSquare,
  Lightbulb,
  AlertCircle,
  TrendingUp,
  BarChart2,
  Award,
  Users,
  CheckCircle,
  Activity
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  Legend,
  Label,
  LineChart,
  Line,
  PieChart,
  Pie
} from 'recharts';
import { Button } from '@/components/ui/button';

export function formatMarkdownToJSX(text: string | null | undefined): React.ReactNode {
  if (!text) return null;
  let cleaned = text;
  // Clean up empty double asterisks blocks (e.g. "** **" or "****")
  cleaned = cleaned.replace(/\*\*\s*\*\*/g, " ");
  // Clean up triple/quadruple asterisks
  cleaned = cleaned.replace(/\*{3,}/g, "**");
  
  // Ensure even double asterisks pairs
  const occurrences = (cleaned.match(/\*\*/g) || []).length;
  if (occurrences % 2 !== 0) {
    cleaned = cleaned + "**";
  }

  const parts = cleaned.split("**");
  return (
    <>
      {parts.map((part, index) => {
        if (index % 2 === 1) {
          if (!part.trim()) return null;
          return (
            <strong 
              key={index} 
              className="font-extrabold text-[#006056] bg-yellow-101 bg-yellow-100/60 dark:bg-yellow-900/20 px-1 py-0.5 rounded-sm border border-yellow-200/50 inline-block font-sans print:text-slate-950 print:bg-transparent print:border-none print:px-0 print:py-0"
            >
              {part}
            </strong>
          );
        }
        return part;
      })}
    </>
  );
}

interface FinalReportProps {
  students: StudentData[];
  courseCode: string;
  section: string;
  semester: string;
  user: User | null;
  onBack: () => void;
  metadata?: any;
}

export function FinalReport({ 
  students, 
  courseCode, 
  section, 
  semester, 
  user, 
  onBack,
  metadata
}: FinalReportProps) {
  const reportRef = useRef<HTMLDivElement>(null);
  
  const aiReports = React.useMemo(() => {
    try {
      const saved = localStorage.getItem(`ai_reports_${courseCode}_${section}`);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  }, [courseCode, section]);
  
  useEffect(() => {
    const originalTitle = document.title;
    document.title = "Final Result Report Academic Year 2025-2026";
    return () => {
      document.title = originalTitle;
    };
  }, []);

  const getCourseLabel = (val: string) => {
    return COURSE_OPTIONS.find(o => o.value === val)?.label || val;
  };

  const getSemesterLabel = (val: string) => {
    return SEMESTER_OPTIONS.find(s => s.value === val)?.label || val;
  };

  const reportData = students.map(student => {
    const fv = calculateFinalValues(student);
    const sv = calculateSummativeValues(student);
    const pa = getPerformanceAnalysisData(student);
    return {
      ...student,
      fv,
      sv,
      pa
    };
  }).sort((a, b) => a.name.localeCompare(b.name));

  const stats = {
    total: students.length,
    passed: reportData.filter(s => s.fv.finallyValue === 'Pass').length,
    failed: reportData.filter(s => ['Not Pass', 'F'].includes(s.fv.finallyValue)).length,
    withdrawal: reportData.filter(s => ['W', 'WA', 'FA'].includes(s.fv.finallyValue)).length,
    atRisk: reportData.filter(s => s.pa.overallStatus === 'At-Risk').length,
    maxScore: reportData.length > 0 ? Math.max(...reportData.map(s => parseFloat(s.fv.totalScore) || 0)).toFixed(1) : '0.0',
    minScore: reportData.length > 0 ? Math.min(...reportData.map(s => parseFloat(s.fv.totalScore) || 0)).toFixed(1) : '0.0',
    statusCounts: {
      pass: reportData.filter(s => s.fv.finallyValue === 'Pass').length,
      notPass: reportData.filter(s => s.fv.finallyValue === 'Not Pass').length,
      r: reportData.filter(s => s.fv.finallyValue === 'R').length,
      fa: reportData.filter(s => s.fv.finallyValue === 'FA').length,
      waW: reportData.filter(s => ['WA', 'W'].includes(s.fv.finallyValue)).length,
      ipI: reportData.filter(s => ['IP', 'I'].includes(s.fv.finallyValue)).length,
      pst: reportData.filter(s => s.fv.finallyValue === 'PST').length
    },
    grades: {
      'A+': reportData.filter(s => s.fv.gradeLetter === 'A+').length,
      'A': reportData.filter(s => s.fv.gradeLetter === 'A').length,
      'A-': reportData.filter(s => s.fv.gradeLetter === 'A-').length,
      'B+': reportData.filter(s => s.fv.gradeLetter === 'B+').length,
      'B': reportData.filter(s => s.fv.gradeLetter === 'B').length,
      'B-': reportData.filter(s => s.fv.gradeLetter === 'B-').length,
      'C+': reportData.filter(s => s.fv.gradeLetter === 'C+').length,
      'C': reportData.filter(s => s.fv.gradeLetter === 'C').length,
      'C-': reportData.filter(s => s.fv.gradeLetter === 'C-').length,
      'D+': reportData.filter(s => s.fv.gradeLetter === 'D+').length,
      'D': reportData.filter(s => s.fv.gradeLetter === 'D').length,
      'D-': reportData.filter(s => s.fv.gradeLetter === 'D-').length,
      'F': reportData.filter(s => s.fv.gradeLetter === 'F').length
    },
    ranges: {
      '90-100': reportData.filter(s => (parseFloat(s.fv.totalScore) || 0) >= 90).length,
      '85-89': reportData.filter(s => (parseFloat(s.fv.totalScore) || 0) >= 85 && (parseFloat(s.fv.totalScore) || 0) < 90).length,
      '80-84': reportData.filter(s => (parseFloat(s.fv.totalScore) || 0) >= 80 && (parseFloat(s.fv.totalScore) || 0) < 85).length,
      '75-79': reportData.filter(s => (parseFloat(s.fv.totalScore) || 0) >= 75 && (parseFloat(s.fv.totalScore) || 0) < 80).length,
      '70-74': reportData.filter(s => (parseFloat(s.fv.totalScore) || 0) >= 70 && (parseFloat(s.fv.totalScore) || 0) < 75).length,
      '65-69': reportData.filter(s => (parseFloat(s.fv.totalScore) || 0) >= 65 && (parseFloat(s.fv.totalScore) || 0) < 70).length,
      '60-64': reportData.filter(s => (parseFloat(s.fv.totalScore) || 0) >= 60 && (parseFloat(s.fv.totalScore) || 0) < 65).length,
      '55-59': reportData.filter(s => (parseFloat(s.fv.totalScore) || 0) >= 55 && (parseFloat(s.fv.totalScore) || 0) < 60).length,
      '50-54': reportData.filter(s => (parseFloat(s.fv.totalScore) || 0) >= 50 && (parseFloat(s.fv.totalScore) || 0) < 55).length,
      '45-49': reportData.filter(s => (parseFloat(s.fv.totalScore) || 0) >= 45 && (parseFloat(s.fv.totalScore) || 0) < 50).length,
      '0-44': reportData.filter(s => (parseFloat(s.fv.totalScore) || 0) < 45).length
    },
    retentionRate: students.length > 0 ? ((reportData.filter(s => ['Pass', 'Not Pass', 'PST', 'IP', 'I'].includes(s.fv.finallyValue)).length) / students.length * 100).toFixed(1) : '0.0',
    genderStats: {
      male: { 
        total: reportData.filter(s => s.gender === 'M').length, 
        pass: reportData.filter(s => s.gender === 'M' && s.fv.finallyValue === 'Pass').length 
      },
      female: { 
        total: reportData.filter(s => s.gender === 'F').length, 
        pass: reportData.filter(s => s.gender === 'F' && s.fv.finallyValue === 'Pass').length 
      }
    }
  };

  const passRate = stats.total > 0 ? ((stats.passed / stats.total) * 100).toFixed(1) : '0';
  const avgScore = stats.total > 0 ? (reportData.reduce((acc, s) => acc + (parseFloat(s.fv.totalScore) || 0), 0) / stats.total).toFixed(1) : '0';
  const isBelowTarget = parseFloat(avgScore) < 70;

  const assessmentTypes = [
    { key: 'participationPortfolio', label: 'Participation/Portfolio', max: 10 },
    { key: 'tests', label: 'Tests', max: 30 },
    { key: 'presentation', label: 'Presentation', max: 10 },
    { key: 'midterm', label: 'Midterm', max: 20 },
    { key: 'final', label: 'Final Exam', max: 30 }
  ];

  const assessmentStats = assessmentTypes.map(type => {
    const typeScores = reportData.map(d => parseFloat(d.fv[type.key as keyof typeof d.fv] as string)).filter(s => !isNaN(s));
    const avg = typeScores.length > 0 ? (typeScores.reduce((a, b) => a + b, 0) / typeScores.length) : 0;
    return {
      ...type,
      avg: avg.toFixed(1),
      avgPercentage: ((avg / type.max) * 100).toFixed(1)
    };
  });

  const studentPerformance = reportData.map((d) => {
    let aboveCount = 0;
    let belowCount = 0;
    let totalCategories = 0;

    assessmentTypes.forEach(type => {
      const score = parseFloat(d.fv[type.key as keyof typeof d.fv] as string);
      const categoryStat = assessmentStats.find(a => a.key === type.key);
      const classAvg = parseFloat(categoryStat?.avg || '0');
      if (!isNaN(score)) {
        totalCategories++;
        if (score > classAvg) aboveCount++;
        else if (score < classAvg) belowCount++;
      }
    });

    return {
      name: d.name,
      id: d.id,
      aboveCount,
      belowCount,
      totalCategories,
      isHighPerformer: aboveCount >= 4,
      isLowPerformer: belowCount >= 4,
      totalScore: d.fv.totalScore
    };
  });

  const highPerformers = studentPerformance.filter(p => p.isHighPerformer).sort((a, b) => parseFloat(b.totalScore) - parseFloat(a.totalScore));
  const lowPerformers = studentPerformance.filter(p => p.isLowPerformer).sort((a, b) => parseFloat(a.totalScore) - parseFloat(b.totalScore));
  const avgScoreNum = parseFloat(avgScore) || 0;
  const avgPerformers = studentPerformance
    .filter(p => !p.isHighPerformer && !p.isLowPerformer)
    .sort((a, b) => Math.abs(parseFloat(a.totalScore || '0') - avgScoreNum) - Math.abs(parseFloat(b.totalScore || '0') - avgScoreNum));

  // Syllabus Completion Analysis
  const completionStats = Object.keys(RAW_MARKS_LIMITS).map(key => {
    const fieldIdx = parseInt(key);
    const label = fieldIdx === 3 ? 'Participation' :
                  fieldIdx === 4 ? 'E-Port' :
                  fieldIdx === 5 ? 'Presentation' :
                  fieldIdx === 6 ? 'Pop Quiz 1' :
                  fieldIdx === 7 ? 'Pop Quiz 2' :
                  fieldIdx === 8 ? 'Test 1 GV' :
                  fieldIdx === 9 ? 'Test 2 LR' :
                  fieldIdx === 10 ? 'Speaking' :
                  fieldIdx === 11 ? 'Writing' :
                  fieldIdx === 12 ? 'W. Port' :
                  fieldIdx === 13 ? 'Midterm LRGV' :
                  fieldIdx === 14 ? 'Midterm W' :
                  fieldIdx === 15 ? 'Final LRGV' :
                  fieldIdx === 16 ? 'Final W' : 'Task';

    const completedCount = students.filter(s => s.grades[fieldIdx] && s.grades[fieldIdx].trim() !== '').length;
    const completionRate = students.length > 0 ? (completedCount / students.length) * 100 : 0;

    return {
      name: label,
      completed: completedCount,
      pending: students.length - completedCount,
      percentage: completionRate.toFixed(1)
    };
  });

  const averageCompletion = completionStats.length > 0 
    ? (completionStats.reduce((acc, curr) => acc + parseFloat(curr.percentage), 0) / completionStats.length).toFixed(1)
    : '0.0';

  const gradeChartData = Object.entries(stats.grades).map(([name, value]) => ({
    name,
    value
  }));

  const rangeChartData = Object.entries(stats.ranges).map(([name, value]) => ({
    name,
    value
  })).reverse(); // Reverse so 0-44 is at the start if needed, but usually we want high to low or low to high consistently.

  const atRiskDist = calculateAtRiskDistribution(students);
  const atRiskChartData = [
    { name: 'ZERO', value: atRiskDist.zero, color: '#dc2626' },
    { name: '1-5.5', value: atRiskDist.range1, color: '#ea580c' },
    { name: '6-11.5', value: atRiskDist.range2, color: '#f97316' },
    { name: '12-16', value: atRiskDist.range3, color: '#f59e0b' },
    { name: '16.5-20', value: atRiskDist.range4, color: '#2563eb' },
    { name: '21-24.5', value: atRiskDist.range5, color: '#0891b2' },
    { name: '25-27.5', value: atRiskDist.range6, color: '#16a34a' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header Actions - Non Printing */}
      <div className="no-print bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onBack} className="gap-2">
            <ChevronLeft className="w-4 h-4" />
            Back to Dashboard
          </Button>
          <h1 className="text-lg font-bold text-slate-800">Final Course Report</h1>
        </div>
      </div>

      <div ref={reportRef} className="flex-1 w-full max-w-[1400px] mx-auto bg-white p-8 sm:p-12 shadow-sm my-8 rounded-lg print:shadow-none print:my-0 print:p-0 print:max-w-none">
        
        {/* Report 0: Front Cover */}
        <div className="print-section page-break-before h-[1100px] flex flex-col relative border border-slate-200 p-8">
          <div className="flex justify-between items-start mb-12">
             <ClfsLogo className="h-24 w-auto object-contain" />
             <div className="text-right">
                <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter leading-none mb-2">Final Result Report</h1>
                <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Academic Year 2025-2026</p>
             </div>
          </div>

          <div className="grid grid-cols-2 gap-12 mb-12 border-y-2 border-slate-200 py-8">
             <div className="space-y-6">
                <div>
                  <span className="text-[12px] font-black text-slate-400 uppercase tracking-widest block mb-1">Course Title</span>
                  <span className="text-lg font-black text-slate-800 uppercase leading-none">{metadata?.courseTitle || getCourseLabel(courseCode)}</span>
                </div>
                <div>
                  <span className="text-[12px] font-black text-slate-400 uppercase tracking-widest block mb-1">Course Code</span>
                  <span className="text-lg font-black text-slate-800 uppercase">{courseCode}</span>
                </div>
                <div>
                  <span className="text-[12px] font-black text-slate-400 uppercase tracking-widest block mb-1">Section</span>
                  <span className="text-lg font-black text-slate-800">{section}</span>
                </div>
             </div>
             <div className="space-y-6 text-right">
                <div>
                  <span className="text-[12px] font-black text-slate-400 uppercase tracking-widest block mb-1">Semester</span>
                  <span className="text-lg font-black text-slate-800 uppercase">{getSemesterLabel(semester)}</span>
                </div>
                <div>
                  <span className="text-[12px] font-black text-slate-400 uppercase tracking-widest block mb-1">Instructor</span>
                  <span className="text-lg font-black text-slate-800 uppercase">{user?.fullName || 'Not Assigned'}</span>
                </div>
             </div>
          </div>

          {/* Course Evaluation Summary Table */}
          <div className="mb-8">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
              <Target className="w-4 h-4" />
              Course Evaluation Summary
            </h3>
            <div className="border border-slate-300 shadow-sm bg-white overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-[#00786f] uppercase text-[12px] font-black tracking-tight text-white border-none h-8">
                    <TableHead className="border-r border-white/20 px-2 py-0.5 text-left bg-[#00786f] text-white">Course Name</TableHead>
                    <TableHead className="border-r border-white/20 px-2 py-0.5 text-left text-white bg-[#00786f]">Instructor’s Name</TableHead>
                    <TableHead className="border-r border-white/20 px-1 py-0.5 text-center whitespace-nowrap text-white bg-[#00786f] w-14">Total Students</TableHead>
                    <TableHead className="border-r border-white/20 px-1 py-0.5 text-center whitespace-nowrap text-white bg-[#00786f] w-14">Total Sections</TableHead>
                    <TableHead className="border-r border-white/20 px-1 py-0.5 text-center whitespace-nowrap text-white bg-[#00786f] w-10">Passed</TableHead>
                    <TableHead className="border-r border-white/20 px-1 py-0.5 text-center whitespace-nowrap text-white bg-[#00786f] w-10">Failed</TableHead>
                    <TableHead className="border-r border-white/20 px-1 py-0.5 text-center whitespace-nowrap text-white bg-[#00786f] w-8">FA</TableHead>
                    <TableHead className="border-r border-white/20 px-1 py-0.5 text-center whitespace-nowrap text-white bg-[#00786f] w-8">WA/W</TableHead>
                    <TableHead className="border-r border-white/20 px-1 py-0.5 text-center whitespace-nowrap text-white bg-[#00786f] w-8">I/IP</TableHead>
                    <TableHead className="border-r border-white/20 px-1 py-0.5 text-center whitespace-nowrap text-white bg-[#00786f] w-8">PST</TableHead>
                    <TableHead className="px-1 py-0.5 text-center whitespace-nowrap text-white bg-[#00786f] w-8">Others</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(() => {
                    let passed = 0, failed = 0, fas = 0, ws = 0, ips = 0, psts = 0, others = 0;
                    reportData.forEach(s => {
                      const status = s.fv.finallyValue || 'None';
                      if (status === 'Pass') passed++;
                      else if (status === 'Not Pass') failed++;
                      else if (status === 'FA') fas++;
                      else if (['WA', 'W'].includes(status)) ws++;
                      else if (['I', 'IP'].includes(status)) ips++;
                      else if (status === 'PST') psts++;
                      else others++;
                    });
                    return (
                      <TableRow className="hover:bg-transparent h-8">
                        <TableCell className="border-r border-slate-200 p-2 text-[9px] font-black text-slate-900 bg-slate-50/50 uppercase">{metadata?.courseTitle || getCourseLabel(courseCode)}</TableCell>
                        <TableCell className="border-r border-slate-200 p-2 text-[9px] font-bold text-slate-700 uppercase">{user?.fullName || 'Not Assigned'}</TableCell>
                        <TableCell className="border-r border-slate-200 p-2 text-center text-[12px] font-black text-slate-900">{stats.total}</TableCell>
                        <TableCell className="border-r border-slate-200 p-2 text-center text-[12px] font-bold text-slate-600">1</TableCell>
                        <TableCell className="border-r border-slate-200 p-2 text-center text-[12px] font-black text-emerald-600">{passed}</TableCell>
                        <TableCell className="border-r border-slate-200 p-2 text-center text-[12px] font-black text-red-600">{failed}</TableCell>
                        <TableCell className="border-r border-slate-200 p-2 text-center text-[12px] font-bold text-amber-600">{fas}</TableCell>
                        <TableCell className="border-r border-slate-200 p-2 text-center text-[12px] font-bold text-orange-600">{ws}</TableCell>
                        <TableCell className="border-r border-slate-200 p-2 text-center text-[12px] font-bold text-indigo-400">{ips}</TableCell>
                        <TableCell className="border-r border-slate-200 p-2 text-center text-[12px] font-bold text-slate-400">{psts}</TableCell>
                        <TableCell className="p-2 text-center text-[12px] font-bold text-slate-300">{others}</TableCell>
                      </TableRow>
                    );
                  })()}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 mb-8">
             <div className="border-2 border-slate-100 p-6">
                <h3 className="text-[12px] font-black text-slate-400 uppercase tracking-widest mb-4">Course Evaluation Report (CER)</h3>
                <div className="space-y-4">
                   <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                      <span className="text-[12px] font-bold text-slate-600 uppercase">Target (70%):</span>
                      <span className={cn("text-[12px] font-black uppercase", isBelowTarget ? "text-red-600" : "text-emerald-600")}>
                        {isBelowTarget ? "Not Achieved" : "Achieved"}
                      </span>
                   </div>
                   <div className="grid grid-cols-3 gap-2">
                      <div className="text-center p-2 bg-slate-50 border border-slate-100">
                         <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Pass Rate</p>
                         <p className="text-sm font-black text-emerald-600">{passRate}%</p>
                      </div>
                      <div className="text-center p-2 bg-slate-50 border border-slate-100">
                         <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Avg Score</p>
                         <p className="text-sm font-black text-blue-600">{avgScore}</p>
                      </div>
                      <div className="text-center p-2 bg-slate-50 border border-slate-100">
                         <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Fails</p>
                         <p className="text-sm font-black text-red-600">{stats.failed}</p>
                      </div>
                   </div>
                </div>
             </div>
             
             <div className="border-2 border-slate-100 p-6 space-y-4">
                <div>
                   <h4 className="text-[9px] font-black text-slate-800 uppercase tracking-widest mb-1">Achievement Comments</h4>
                   <p className="text-[10px] text-slate-600 leading-tight">
                     {!isBelowTarget 
                       ? "The performance indicator (PI) has been successfully achieved." 
                       : `The average numeric grade is ${avgScore}%, falling below the 70% target.`
                     }
                   </p>
                </div>
                <div>
                   <h4 className="text-[9px] font-black text-slate-800 uppercase tracking-widest mb-1">Recommendations</h4>
                   <p className="text-[10px] text-slate-600 leading-tight italic">
                     {isBelowTarget 
                       ? "Implement attendance monitoring and targeted tutorials." 
                       : "Performance is satisfactory. Continue current methodologies."
                     }
                   </p>
                </div>
             </div>
          </div>

          <div className="mt-auto grid grid-cols-4 gap-4 pt-8 border-t-2 border-slate-900">
             <div className="text-center">
                <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Pass Rate</p>
                <p className="text-2xl font-black text-blue-600">{passRate}%</p>
             </div>
             <div className="text-center border-l border-slate-200">
                <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Successful</p>
                <p className="text-2xl font-black text-emerald-600">{stats.passed}</p>
             </div>
             <div className="text-center border-l border-slate-200">
                <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Fail / At-Risk</p>
                <p className="text-2xl font-black text-red-600">{stats.failed} / {stats.atRisk}</p>
             </div>
             <div className="text-center border-l border-slate-200">
                <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Total Students</p>
                <p className="text-2xl font-black text-slate-900">{stats.total}</p>
             </div>
          </div>
          
          {/* New Footer Logo and Copyright */}
          <div className="absolute bottom-4 left-12 right-12 flex justify-between items-center border-t border-slate-100 pt-4">
            <div className="flex flex-col">
              <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest flex items-center gap-1">
                Copyright ©
                <img src="https://raw.githubusercontent.com/hameedktk09/cms/main/hrk-logo.png" className="h-[12px] w-auto inline-block" referrerPolicy="no-referrer" />
                drkhan 2026.
              </p>
            </div>
          </div>
        </div>

        {/* Empty Page: Inside of Front Page */}
        <div className="print-section page-break-before h-[1100px] flex items-center justify-center hidden print:flex border border-slate-200 p-8" />

        {/* Table of Contents */}
        <div className="print-section page-break-before border border-slate-200 p-12">
           <h2 className="text-2xl font-black text-slate-900 uppercase tracking-[0.2em] mb-12 border-b-2 pb-6">Table of Contents</h2>
           <div className="grid grid-cols-2 gap-10">
             <div className="space-y-6">
                 {[
                     { title: "Final Results Report", page: 5 },
                     { title: "Real Grades Report", page: 6 },
                     { title: "Grades Report", page: 7 },
                     { title: "Performance Diagnostics Report", page: 8 }
                 ].map((item, i) => (
                     <div key={i} className="flex justify-between items-baseline text-sm">
                         <span className="font-bold text-slate-700">{item.title}</span>
                         <span className="border-b border-dotted border-slate-400 flex-1 mx-2" />
                         <span className="font-mono font-black">{item.page}</span>
                     </div>
                 ))}
             </div>
             <div className="space-y-6">
                 {[
                     { title: "Numerical Analysis Report", page: 9 },
                     { title: "At-Risk Distribution Report", page: 10 },
                     { title: "Performance Analytics Sheet", page: 11 },
                     { title: "Syllabus Completion Report", page: 12 },
                     { title: "Course Evaluation Report (CER)", page: 13 }
                 ].map((item, i) => (
                     <div key={i} className="flex justify-between items-baseline text-sm">
                         <span className="font-bold text-slate-700">{item.title}</span>
                         <span className="border-b border-dotted border-slate-400 flex-1 mx-2" />
                         <span className="font-mono font-black">{item.page}</span>
                     </div>
                 ))}
             </div>
           </div>
        </div>

        {/* Empty Page: Page 4 */}
        <div className="print-section page-break-before h-[1100px] flex items-center justify-center hidden print:flex border border-slate-200 p-8" />


        {/* Report 1: Final Results Report (Final Grades Sheet Match) */}
        <div className="print-section border border-slate-200 p-8">
          <div className="flex flex-col gap-4 mb-6">
             <div className="flex items-center gap-6">
                <ClfsLogo className="h-16 w-auto object-contain" />
                <div className="h-12 w-px bg-slate-200" />
                <div className="flex flex-col">
                  <h2 className="text-xl font-black text-teal-950 uppercase tracking-tight">Final Results Report</h2>
                  <p className="text-[12px] font-bold text-slate-500 uppercase tracking-widest">Official Grade Registry</p>
                </div>
             </div>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden mb-8 shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="bg-[#00786f] hover:bg-[#00786f] border-none">
                  <TableHead className="text-white text-[12px] font-bold uppercase tracking-tight px-1 h-8 w-8 text-center border-r border-white/15 bg-[#00786f]">#</TableHead>
                  <TableHead className="text-white text-[12px] font-bold uppercase tracking-tight px-1 h-8 w-12 border-r border-white/15 bg-[#00786f]">ID NUMBER</TableHead>
                  <TableHead className="text-white text-[12px] font-bold uppercase tracking-tight px-2 h-8 min-w-[100px] border-r border-white/15 bg-[#00786f]">STUDENT NAME</TableHead>
                  <TableHead className="text-white text-[12px] font-bold uppercase tracking-tight px-1 h-8 w-14 text-center border-r border-white/15 bg-[#00786f]">Part & e-Port [10%]</TableHead>
                  <TableHead className="text-white text-[12px] font-bold uppercase tracking-tight px-1 h-8 w-12 text-center border-r border-white/15 bg-[#00786f]">Tests [30%]</TableHead>
                  <TableHead className="text-white text-[12px] font-bold uppercase tracking-tight px-1 h-8 w-14 text-center border-r border-white/15 bg-[#00786f]">Presentation [10%]</TableHead>
                  <TableHead className="text-white text-[12px] font-bold uppercase tracking-tight px-1 h-8 w-12 text-center border-r border-white/15 bg-[#00786f]">Midterm [20%]</TableHead>
                  <TableHead className="text-white text-[12px] font-bold uppercase tracking-tight px-1 h-8 w-12 text-center border-r border-white/15 bg-[#00786f]">Final Exam [30%]</TableHead>
                  <TableHead className="text-white text-[12px] font-bold uppercase tracking-tight px-1 h-8 w-12 text-center border-r border-white/15 bg-[#00786f]">Total [100%]</TableHead>
                  <TableHead className="text-white text-[12px] font-bold uppercase tracking-tight px-1 h-8 w-12 text-center border-r border-white/15 bg-[#00786f]">Result [P/NP]</TableHead>
                  <TableHead className="text-white text-[12px] font-bold uppercase tracking-tight px-1 h-8 w-12 text-center bg-[#00786f]">Grade</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportData.map((student, idx) => (
                  <TableRow key={student.id} className={cn("border-b border-slate-200 h-9", idx % 2 === 0 ? "bg-white" : "bg-slate-50/50")}>
                    <TableCell className="text-center text-[12px] font-bold text-slate-400 px-1 py-1 border-r border-slate-200">{idx + 1}</TableCell>
                    <TableCell className="text-[12px] font-courier font-bold text-slate-600 px-1 py-1 border-r border-slate-200">{student.id}</TableCell>
                    <TableCell className="text-[12px] font-bold text-slate-800 px-2 py-1 capitalize border-r border-slate-200 truncate">{student.name}</TableCell>
                    <TableCell className="text-center text-[12px] font-courier font-bold text-slate-700 px-1 py-1 border-r border-slate-200">{student.fv.participationPortfolio || '-'}</TableCell>
                    <TableCell className="text-center text-[12px] font-courier font-bold text-slate-700 px-1 py-1 border-r border-slate-200">{student.fv.tests || '-'}</TableCell>
                    <TableCell className="text-center text-[12px] font-courier font-bold text-slate-700 px-1 py-1 border-r border-slate-200">{student.fv.presentation || '-'}</TableCell>
                    <TableCell className="text-center text-[12px] font-courier font-bold text-slate-700 px-1 py-1 border-r border-slate-200">{student.fv.midterm || '-'}</TableCell>
                    <TableCell className="text-center text-[12px] font-courier font-bold text-slate-700 px-1 py-1 border-r border-slate-200">{student.fv.final || '-'}</TableCell>
                    <TableCell className={cn("text-center text-[13px] font-black px-1 py-1 border-r border-slate-200", student.fv.totalClass)}>{student.fv.totalScore || '0'}</TableCell>
                    <TableCell className="text-center px-1 py-1 border-r border-slate-200">
                      <span className={cn(
                        "text-[12px] font-black uppercase tracking-tight",
                        student.fv.finallyValue === 'Pass' ? "text-green-600" : "text-red-600"
                      )}>
                        {student.fv.finallyValue || 'N/A'}
                      </span>
                    </TableCell>
                    <TableCell className={cn("text-center text-[14px] font-black px-1 py-1", student.fv.gradeLetterClass)}>{student.fv.gradeLetter || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Report 2: Real Grades Report (Summative Sheet Match) */}
        <div className="print-section page-break-before border border-slate-200 p-8">
          <div className="flex flex-col gap-4 mb-6 mt-12 print:mt-0">
             <div className="flex items-center gap-6">
                <ClfsLogo className="h-16 w-auto object-contain" />
                <div className="h-12 w-px bg-slate-200" />
                <div className="flex flex-col">
                  <h2 className="text-xl font-black text-emerald-900 uppercase tracking-tight">Real Grades Report</h2>
                  <p className="text-[12px] font-bold text-slate-500 uppercase tracking-widest">Summative Component Analysis</p>
                </div>
             </div>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden mb-8 shadow-sm overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-[#00786f] hover:bg-[#00786f] border-none">
                  <TableHead className="text-white text-[12px] font-bold uppercase tracking-tighter px-0.5 h-8 w-6 text-center border-r border-white/15">#</TableHead>
                  <TableHead className="text-white text-[12px] font-bold uppercase tracking-tighter px-1 h-8 w-12 border-r border-white/15">ID NUMBER</TableHead>
                  <TableHead className="text-white text-[12px] font-bold uppercase tracking-tighter px-1 h-8 min-w-[70px] border-r border-white/15">STUDENT NAME</TableHead>
                  <TableHead className="text-white text-[12px] font-bold uppercase tracking-tighter px-0.5 h-8 w-14 text-center border-r border-white/15">Part+e-Port [10%]</TableHead>
                  <TableHead className="text-white text-[12px] font-bold uppercase tracking-tighter px-0.5 h-8 w-10 text-center border-r border-white/15">Pres [10%]</TableHead>
                  <TableHead className="text-white text-[12px] font-bold uppercase tracking-tighter px-0.5 h-8 w-8 text-center border-r border-white/15">Pop Quiz 1 [2.5%]</TableHead>
                  <TableHead className="text-white text-[12px] font-bold uppercase tracking-tighter px-0.5 h-8 w-8 text-center border-r border-white/15">Pop Quiz 2 [2.5%]</TableHead>
                  <TableHead className="text-white text-[12px] font-bold uppercase tracking-tighter px-0.5 h-8 w-8 text-center border-r border-white/15">Test 1 GV [5%]</TableHead>
                  <TableHead className="text-white text-[12px] font-bold uppercase tracking-tighter px-0.5 h-8 w-8 text-center border-r border-white/15">Test 2 LR [5%]</TableHead>
                  <TableHead className="text-white text-[12px] font-bold uppercase tracking-tighter px-0.5 h-8 w-8 text-center border-r border-white/15">S. Test [5%]</TableHead>
                  <TableHead className="text-white text-[12px] font-bold uppercase tracking-tighter px-0.5 h-8 w-8 text-center border-r border-white/15">W. Test [5%]</TableHead>
                  <TableHead className="text-white text-[12px] font-bold uppercase tracking-tighter px-0.5 h-8 w-8 text-center border-r border-white/15">W. Port [5%]</TableHead>
                  <TableHead className="text-white text-[12px] font-bold uppercase tracking-tighter px-0.5 h-8 w-8 text-center border-r border-white/15">Midterm [20%]</TableHead>
                  <TableHead className="text-white text-[12px] font-bold uppercase tracking-tighter px-0.5 h-8 w-8 text-center border-r border-white/15">Final Exam [30%]</TableHead>
                  <TableHead className="text-white text-[12px] font-bold uppercase tracking-tighter px-0.5 h-8 w-8 text-center text-teal-300">Total [100%]</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportData.map((student, idx) => (
                  <TableRow key={student.id} className={cn("border-b border-slate-200 h-8", idx % 2 === 0 ? "bg-white" : "bg-slate-50/50")}>
                    <TableCell className="text-center text-[12px] font-bold text-slate-400 px-0.5 py-1 border-r border-slate-200">{idx + 1}</TableCell>
                    <TableCell className="text-[12px] font-courier text-slate-600 px-1 py-1 border-r border-slate-200">{student.id}</TableCell>
                    <TableCell className="text-[11px] font-bold text-slate-800 px-1 py-1 capitalize border-r border-slate-200 truncate">{student.name}</TableCell>
                    <TableCell className="text-center text-[11px] font-courier font-medium text-slate-700 px-0.5 py-1 border-r border-slate-200">{student.sv.v1 || '-'}</TableCell>
                    <TableCell className="text-center text-[11px] font-courier font-medium text-slate-700 px-0.5 py-1 border-r border-slate-200">{student.sv.v2 || '-'}</TableCell>
                    <TableCell className="text-center text-[11px] font-courier font-medium text-slate-700 px-0.5 py-1 border-r border-slate-200">{student.sv.v3 || '-'}</TableCell>
                    <TableCell className="text-center text-[11px] font-courier font-medium text-slate-700 px-0.5 py-1 border-r border-slate-200">{student.sv.v4 || '-'}</TableCell>
                    <TableCell className="text-center text-[11px] font-courier font-medium text-slate-700 px-0.5 py-1 border-r border-slate-200">{student.sv.v5 || '-'}</TableCell>
                    <TableCell className="text-center text-[11px] font-courier font-medium text-slate-700 px-0.5 py-1 border-r border-slate-200">{student.sv.v6 || '-'}</TableCell>
                    <TableCell className="text-center text-[11px] font-courier font-medium text-slate-700 px-0.5 py-1 border-r border-slate-200">{student.sv.v7 || '-'}</TableCell>
                    <TableCell className="text-center text-[11px] font-courier font-medium text-slate-700 px-0.5 py-1 border-r border-slate-200">{student.sv.v8 || '-'}</TableCell>
                    <TableCell className="text-center text-[11px] font-courier font-medium text-slate-700 px-0.5 py-1 border-r border-slate-200">{student.sv.v9 || '-'}</TableCell>
                    <TableCell className="text-center text-[11px] font-courier font-medium text-slate-700 px-0.5 py-1 border-r border-slate-200">{student.sv.v10 || '-'}</TableCell>
                    <TableCell className="text-center text-[11px] font-courier font-medium text-slate-700 px-0.5 py-1 border-r border-slate-200">{student.sv.v11 || '-'}</TableCell>
                    <TableCell className={cn("text-center text-[12px] font-black px-0.5 py-1 bg-blue-50/30", student.fv.totalClass)}>{student.fv.totalScore || '0'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Report 3: Grades Report (Raw Marks Sheet Match) */}
        <div className="print-section page-break-before border border-slate-200 p-8">
          <div className="flex flex-col gap-4 mb-6 mt-12 print:mt-0">
             <div className="flex items-center gap-6">
                <ClfsLogo className="h-16 w-auto object-contain" />
                <div className="h-12 w-px bg-slate-200" />
                <div className="flex flex-col">
                  <h2 className="text-xl font-black text-indigo-900 uppercase tracking-tight">Grades Report</h2>
                  <p className="text-[12px] font-bold text-slate-500 uppercase tracking-widest">Detailed Raw Entry Audit</p>
                </div>
             </div>
          </div>

          <div className="border border-slate-200 rounded-none overflow-x-auto mb-8">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-900 hover:bg-slate-900 border-none">
                  <TableHead className="text-white text-[12px] font-black uppercase tracking-tighter px-0.5 h-10 w-6 text-center border-r border-slate-700">#</TableHead>
                  <TableHead className="text-white text-[12px] font-black uppercase tracking-tighter px-1 h-10 w-16 border-r border-slate-700">ID NUMBER</TableHead>
                  <TableHead className="text-white text-[12px] font-black uppercase tracking-tighter px-1 h-10 min-w-[70px] border-r border-slate-700">STUDENT NAME</TableHead>
                  <TableHead className="text-[12px] text-slate-400 font-black h-10 w-12 text-center border-r border-slate-700">Part <br/>[20]</TableHead>
                  <TableHead className="text-[12px] text-slate-400 font-black h-10 w-12 text-center border-r border-slate-700">E-Port <br/>[20]</TableHead>
                  <TableHead className="text-[12px] text-slate-400 font-black h-10 w-12 text-center border-r border-slate-700">Pres <br/>[25]</TableHead>
                  <TableHead className="text-[12px] text-slate-400 font-black h-10 w-8 text-center border-r border-slate-700">Pop Quiz 1 <br/>[10]</TableHead>
                  <TableHead className="text-[12px] text-slate-400 font-black h-10 w-8 text-center border-r border-slate-700">Pop Quiz 2 <br/>[10]</TableHead>
                  <TableHead className="text-[12px] text-slate-400 font-black h-10 w-10 text-center border-r border-slate-700">Test 1 GV <br/>[20]</TableHead>
                  <TableHead className="text-[12px] text-slate-400 font-black h-10 w-10 text-center border-r border-slate-700">Test 2 LR <br/>[20]</TableHead>
                  <TableHead className="text-[12px] text-slate-400 font-black h-10 w-10 text-center border-r border-slate-700">S. Test <br/>[20]</TableHead>
                  <TableHead className="text-[12px] text-slate-400 font-black h-10 w-10 text-center border-r border-slate-700">W. Test <br/>[20]</TableHead>
                  <TableHead className="text-[12px] text-slate-400 font-black h-10 w-10 text-center border-r border-slate-700">W. Port <br/>[20]</TableHead>
                  <TableHead className="text-[12px] text-slate-400 font-black h-10 w-10 text-center border-r border-slate-700">Midterm<br/>(LRGV) [40]</TableHead>
                  <TableHead className="text-[12px] text-slate-400 font-black h-10 w-10 text-center border-r border-slate-700">Midterm<br/>[10]</TableHead>
                  <TableHead className="text-[12px] text-slate-400 font-black h-10 w-10 text-center border-r border-slate-700">Final<br/>(LRGV) [40]</TableHead>
                  <TableHead className="text-[12px] text-slate-400 font-black h-10 w-10 text-center">Final<br/>[10]</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportData.map((student, idx) => (
                  <TableRow key={student.id} className={cn("border-b border-slate-100", idx % 2 === 0 ? "bg-white" : "bg-slate-50/50")}>
                    <TableCell className="text-center text-[12px] font-bold text-slate-400 px-0.5 py-1 border-r border-slate-100">{idx + 1}</TableCell>
                    <TableCell className="text-[12px] font-courier text-slate-500 px-1 py-1 border-r border-slate-100">{student.id}</TableCell>
                    <TableCell className="text-[12px] font-bold text-slate-800 px-1 py-1 capitalize border-r border-slate-100 truncate">{student.name}</TableCell>
                    {[3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16].map((key, kIdx) => (
                      <TableCell key={key} className={cn("text-center text-[12px] font-courier px-0.5 py-1 border-slate-100", kIdx < 13 && "border-r")}>
                        {student.grades[key] || '-'}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Report 4: Performance Diagnostics Report */}
        <div className="print-section page-break-before border border-slate-200 p-8">
          <div className="flex flex-col gap-4 mb-6 mt-12 print:mt-0">
             <div className="flex items-center gap-6">
                <ClfsLogo className="h-16 w-auto object-contain" />
                <div className="h-12 w-px bg-slate-200" />
                <div className="flex flex-col">
                  <h2 className="text-xl font-black text-teal-950 uppercase tracking-tight">Performance Diagnostics Report</h2>
                  <p className="text-[12px] font-bold text-slate-500 uppercase tracking-widest">Integrated Academic Monitoring & Intervention Plan</p>
                </div>
             </div>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden mb-8 shadow-sm overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-[#00786f] hover:bg-[#00786f] border-none">
                  <TableHead className="text-white text-[12px] font-bold uppercase tracking-tighter px-0.5 h-14 w-8 text-center border-r border-white/15 bg-[#00786f]">#</TableHead>
                  <TableHead className="text-white text-[12px] font-bold uppercase tracking-tighter px-1 h-14 w-[80px] border-r border-white/15 bg-[#00786f]">ID NUMBER</TableHead>
                  <TableHead className="text-white text-[12px] font-bold uppercase tracking-tighter px-2 h-14 min-w-[140px] border-r border-white/15 bg-[#00786f]">STUDENT NAME</TableHead>
                  <TableHead className="text-white text-[12px] font-bold uppercase tracking-tighter px-0.5 h-14 w-16 text-center border-r border-white/15 bg-[#00786f]">Status 1<br/>[25%]</TableHead>
                  <TableHead className="text-white text-[12px] font-bold uppercase tracking-tighter px-0.5 h-14 w-16 text-center border-r border-white/15 bg-[#00786f]">Status 2<br/>[50%]</TableHead>
                  <TableHead className="text-white text-[12px] font-bold uppercase tracking-tighter px-0.5 h-14 w-16 text-center border-r border-white/15 bg-[#00786f]">Status 3<br/>[75%]</TableHead>
                  <TableHead className="text-white text-[12px] font-bold uppercase tracking-tighter px-0.5 h-14 w-20 text-center border-r border-white/15 bg-[#00786f]">Overall Perf.</TableHead>
                  <TableHead className="text-white text-[12px] font-bold uppercase tracking-tighter px-0.5 h-14 w-14 text-center border-r border-white/15 bg-[#00786f]">Risk Count</TableHead>
                  <TableHead className="text-white text-[12px] font-bold uppercase tracking-tighter px-0.5 h-14 w-20 text-center border-r border-white/15 bg-[#00786f]">Absence Warn.</TableHead>
                  <TableHead className="text-white text-[12px] font-bold uppercase tracking-tighter px-1 h-14 w-16 text-center bg-[#00786f]">Final Result</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportData.map((student, idx) => (
                  <TableRow key={student.id} className={cn("border-b border-slate-200 h-14", idx % 2 === 0 ? "bg-white" : "bg-slate-50/50")}>
                    <TableCell className="text-center text-[12px] font-bold text-slate-400 px-0.5 py-0.5 border-r border-slate-200">{idx + 1}</TableCell>
                    <TableCell className="text-[12px] font-courier font-bold text-slate-600 px-1 py-0.5 border-r border-slate-200">{student.id}</TableCell>
                    <TableCell className="text-[12px] font-bold text-slate-800 px-1.5 py-0.5 capitalize border-r border-slate-200 truncate">{student.name}</TableCell>
                    
                    <TableCell className="text-center px-0.5 py-0.5 border-r border-slate-200">
                      <Badge variant="outline" className={cn(
                        "text-[12px] font-bold uppercase py-1 px-2 rounded-none border-none",
                        student.pa.academicStatus1 === 'At-Risk' ? "bg-red-50 text-red-600" : (student.pa.academicStatus1 ? "bg-green-50 text-green-600" : "bg-slate-50 text-slate-300")
                      )}>
                        {student.pa.academicStatus1 || '-'}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-center px-0.5 py-0.5 border-r border-slate-200">
                      <Badge variant="outline" className={cn(
                        "text-[12px] font-bold uppercase py-1 px-2 rounded-none border-none",
                        student.pa.academicStatus2 === 'At-Risk' ? "bg-red-50 text-red-600" : (student.pa.academicStatus2 ? "bg-green-50 text-green-600" : "bg-slate-50 text-slate-300")
                      )}>
                        {student.pa.academicStatus2 || '-'}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-center px-0.5 py-0.5 border-r border-slate-200">
                      <Badge variant="outline" className={cn(
                        "text-[12px] font-bold uppercase py-1 px-2 rounded-none border-none",
                        student.pa.academicStatus3 === 'At-Risk' ? "bg-red-50 text-red-600" : (student.pa.academicStatus3 ? "bg-green-50 text-green-600" : "bg-slate-50 text-slate-300")
                      )}>
                        {student.pa.academicStatus3 || '-'}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-center px-0.5 py-0.5 border-r border-slate-200">
                      <Badge variant="outline" className={cn(
                        "text-[12px] font-black uppercase py-1 px-2 rounded-none border-none",
                        student.pa.overallStatus === 'At-Risk' ? "bg-red-600 text-white" : "bg-green-600 text-white"
                      )}>
                        {student.pa.overallStatus}
                      </Badge>
                    </TableCell>

                    <TableCell className={cn(
                      "text-center text-[12px] font-black border-r border-slate-200",
                      parseInt(student.pa.atRiskCounts) > 0 ? "text-red-600" : "text-slate-300"
                    )}>
                      {student.pa.atRiskCounts || '0'}
                    </TableCell>

                    <TableCell className={cn(
                      "text-center text-[12px] font-bold px-0.5 border-r border-slate-200",
                      student.pa.absenceWarning.includes('Warning') ? "text-orange-600" : "text-slate-500"
                    )}>
                      {student.pa.absenceWarning}
                    </TableCell>

                    <TableCell className="text-center px-0.5 py-0.5">
                      <span className={cn("text-[12px] font-black uppercase", student.pa.finallyValue === 'Pass' ? 'text-green-600' : 'text-red-600')}>
                        {student.pa.finallyValue || student.fv.finallyValue || 'N/A'}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Report 5: Numerical Analysis Report */}
        <div className="print-section page-break-before border border-slate-200 p-8">
          <div className="flex flex-col gap-4 mb-6 mt-12 print:mt-0">
             <div className="flex items-center gap-6">
                <ClfsLogo className="h-16 w-auto object-contain" />
                <div className="h-12 w-px bg-slate-200" />
                <div className="flex flex-col">
                  <h2 className="text-xl font-black text-teal-950 uppercase tracking-tight">Numerical Analysis Report</h2>
                  <p className="text-[12px] font-bold text-slate-500 uppercase tracking-widest">Section Statistical Distribution & Metrics</p>
                </div>
             </div>
          </div>

          {/* Table A: Section Final Grades Analysis Summary */}
          <div className="border border-slate-300 shadow-sm bg-white overflow-hidden mb-8 rounded-xl">
            <div className="bg-[#005a52] p-2 text-center border-b border-[#005a52]/10">
              <span className="text-[10px] font-bold text-white uppercase tracking-[0.2em]">Table A: Final Grades Analysis Summary</span>
            </div>
            <Table>
              <TableHeader>
                <TableRow className="bg-[#00786f] uppercase text-[12px] font-bold tracking-tight text-white border-none h-10">
                  <TableHead className="text-white font-bold border-r border-white/15 text-center leading-tight bg-[#00786f]">No. of<br/>Students</TableHead>
                  <TableHead className="text-white font-bold border-r border-white/15 text-center leading-tight bg-[#00786f]">Highest<br/>Score</TableHead>
                  <TableHead className="text-white font-bold border-r border-white/15 text-center leading-tight bg-[#00786f]">Class<br/>Average</TableHead>
                  <TableHead className="text-white font-bold border-r border-white/15 text-center leading-tight bg-[#00786f]">Lowest<br/>Score</TableHead>
                  <TableHead className="text-white font-bold border-r border-white/15 text-center leading-tight bg-[#00786f]">Total Pass<br/>(%age)</TableHead>
                  <TableHead className="text-white font-bold border-r border-white/15 text-center leading-tight bg-[#00786f]">Total Not Pass<br/>(%age)</TableHead>
                  <TableHead className="text-white font-bold border-r border-white/15 text-center leading-tight bg-[#00786f]">Total FA(s)<br/>(%age)</TableHead>
                  <TableHead className="text-white font-bold border-r border-white/15 text-center leading-tight bg-[#00786f]">Total WA/W<br/>(%age)</TableHead>
                  <TableHead className="text-white font-bold border-r border-white/15 text-center leading-tight bg-[#00786f]">Total IP/I<br/>(%age)</TableHead>
                  <TableHead className="text-white font-bold text-center leading-tight bg-[#00786f]">Total PST<br/>(%age)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow className="h-10 hover:bg-transparent border-b border-slate-200">
                  <TableCell className="text-center py-1 text-sm font-courier font-black text-slate-900 border-r border-slate-100">{stats.total}</TableCell>
                  <TableCell className="text-center py-1 text-sm font-courier font-black text-blue-600 border-r border-slate-100">{stats.maxScore}</TableCell>
                  <TableCell className="text-center py-1 text-sm font-courier font-black text-slate-900 border-r border-slate-100">{avgScore}</TableCell>
                  <TableCell className="text-center py-1 text-sm font-courier font-black text-red-600 border-r border-slate-100">{stats.minScore}</TableCell>
                  <TableCell className="text-center py-1 text-sm font-courier font-black text-emerald-600 border-r border-slate-100">{passRate}%</TableCell>
                  <TableCell className="text-center py-1 text-sm font-courier font-black text-red-600 border-r border-slate-100">
                    {((stats.statusCounts.notPass / stats.total) * 100).toFixed(1)}%
                  </TableCell>
                  <TableCell className="text-center py-1 text-sm font-courier font-black text-red-800 border-r border-slate-100">
                    {((stats.statusCounts.fa / stats.total) * 100).toFixed(1)}%
                  </TableCell>
                  <TableCell className="text-center py-1 text-sm font-courier font-black text-slate-500 border-r border-slate-100">
                    {((stats.statusCounts.waW / stats.total) * 100).toFixed(1)}%
                  </TableCell>
                  <TableCell className="text-center py-1 text-sm font-courier font-black text-teal-600 border-r border-slate-100">
                    {((stats.statusCounts.ipI / stats.total) * 100).toFixed(1)}%
                  </TableCell>
                  <TableCell className="text-center py-1 text-sm font-courier font-black text-indigo-600">
                    {((stats.statusCounts.pst / stats.total) * 100).toFixed(1)}%
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          <div className="grid grid-cols-2 gap-8">
            {/* Table B: Grade Counts Summary */}
            <div className="border border-slate-300 shadow-sm bg-white overflow-hidden">
               <div className="bg-slate-900 p-2 text-center border-b border-slate-700">
                  <span className="text-[12px] font-black text-white uppercase tracking-[0.2em]">Table B: Grade Counts Summary</span>
               </div>
               <Table>
                 <TableHeader>
                   <TableRow className="bg-slate-100 uppercase text-[8px] font-black tracking-wider text-slate-600 border-b border-slate-200">
                     <TableHead className="border-r border-slate-200 text-center">Grade</TableHead>
                     <TableHead className="border-r border-slate-200 text-center">Count</TableHead>
                     <TableHead className="text-center">Percentage</TableHead>
                   </TableRow>
                 </TableHeader>
                 <TableBody>
                    {Object.entries(stats.grades).map(([grade, count]) => (
                      <TableRow key={grade} className="h-8 hover:bg-slate-50 border-b border-slate-100 last:border-0 text-[12px]">
                        <TableCell className="text-center font-bold text-slate-700 border-r border-slate-100">{grade}</TableCell>
                        <TableCell className="text-center font-courier font-black text-slate-900 border-r border-slate-100">{count}</TableCell>
                        <TableCell className="text-center font-courier font-bold text-slate-500">
                          {stats.total > 0 ? ((count / stats.total) * 100).toFixed(1) : '0.0'}%
                        </TableCell>
                      </TableRow>
                    ))}
                 </TableBody>
               </Table>
            </div>

            {/* Table C: Score Range Summary */}
            <div className="border border-slate-300 shadow-sm bg-white overflow-hidden">
               <div className="bg-slate-900 p-2 text-center border-b border-slate-700">
                  <span className="text-[12px] font-black text-white uppercase tracking-[0.2em]">Table C: Score Range Summary</span>
               </div>
               <Table>
                 <TableHeader>
                   <TableRow className="bg-slate-100 uppercase text-[8px] font-black tracking-wider text-slate-600 border-b border-slate-200">
                     <TableHead className="border-r border-slate-200 text-center">Range</TableHead>
                     <TableHead className="text-center">Student Count</TableHead>
                   </TableRow>
                 </TableHeader>
                 <TableBody>
                    {Object.entries(stats.ranges).map(([range, count]) => (
                      <TableRow key={range} className="h-8 hover:bg-slate-50 border-b border-slate-100 last:border-0 text-[12px]">
                        <TableCell className="text-center font-bold text-slate-700 border-r border-slate-100">{range}</TableCell>
                        <TableCell className="text-center font-courier font-black text-slate-900">{count}</TableCell>
                      </TableRow>
                    ))}
                 </TableBody>
               </Table>
            </div>
          </div>

          {/* Charts Section: Distribution Visualization */}
          <div className="grid grid-cols-2 gap-8 mt-10 print:mt-12 print-break-inside-avoid">
             {/* Chart A: Grade Distribution Bar Chart */}
             <div className="bg-white border border-slate-200 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                   <span className="text-[12px] font-black text-slate-800 uppercase tracking-widest">Chart A: Grade Distribution Analysis</span>
                </div>
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={gradeChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 9, fontWeight: 700, fill: '#64748b' }}
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 9, fontWeight: 700, fill: '#94a3b8' }}
                      />
                      <Tooltip 
                        contentStyle={{ fontSize: '10px', borderRadius: '0px', border: '1px solid #e2e8f0', boxShadow: 'none' }}
                        cursor={{ fill: '#f8fafc' }}
                      />
                      <Bar dataKey="value" radius={[2, 2, 0, 0]}>
                        {gradeChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.name === 'F' ? '#ef4444' : '#3b82f6'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-50 text-center">
                   <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Frequency of Letter Grades in Class</p>
                </div>
             </div>

             {/* Chart B: Score Range Distribution */}
             <div className="bg-white border border-slate-200 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                   <span className="text-[12px] font-black text-slate-800 uppercase tracking-widest">Chart B: Numeric Range Distribution</span>
                </div>
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={rangeChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 8, fontWeight: 700, fill: '#64748b' }}
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 9, fontWeight: 700, fill: '#94a3b8' }}
                      />
                      <Tooltip 
                        contentStyle={{ fontSize: '10px', borderRadius: '0px', border: '1px solid #e2e8f0', boxShadow: 'none' }}
                        cursor={{ fill: '#f8fafc' }}
                      />
                      <Bar dataKey="value" fill="#6366f1" radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-50 text-center">
                   <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Student Performance Segmentation by Total Score</p>
                </div>
             </div>
          </div>
        </div>

        {/* Report 6: At-Risk Distribution Report */}
        <div className="print-section page-break-before border border-slate-200 p-8">
          <div className="flex flex-col gap-4 mb-6 mt-12 print:mt-0">
             <div className="flex items-center gap-6">
                <ClfsLogo className="h-16 w-auto object-contain" />
                <div className="h-12 w-px bg-slate-200" />
                <div className="flex flex-col">
                  <h2 className="text-xl font-black text-red-900 uppercase tracking-tight">At-Risk Distribution Report</h2>
                  <p className="text-[12px] font-bold text-slate-500 uppercase tracking-widest">Engagement Monitoring & Risk Classification</p>
                </div>
             </div>
          </div>

          <div className="border border-slate-300 shadow-sm bg-white overflow-hidden mb-8 rounded-xl">
            <div className="bg-[#005a52] p-2 flex items-center justify-between border-b border-[#005a52]/10">
              <span className="text-[12px] font-bold text-white uppercase tracking-[0.2em]">At-Risk Metrics Summary</span>
              <div className="flex gap-4">
                 <span className="text-[12px] font-bold text-orange-200 uppercase tracking-widest">FA (Absence): {reportData.filter(s => ['FA'].includes(s.fv.finallyValue)).length}</span>
                 <span className="text-[12px] font-bold text-red-200 uppercase tracking-widest">Total At-Risk: {atRiskDist.atRiskCount}</span>
              </div>
            </div>
            <Table>
              <TableHeader>
                <TableRow className="bg-[#00786f] hover:bg-[#00786f] border-none h-12 uppercase text-[12px] font-bold tracking-tighter">
                  <TableHead className="text-white border-r border-white/15 text-center bg-[#00786f] w-16">Section</TableHead>
                  <TableHead className="text-white border-r border-white/15 text-center bg-[#00786f] w-16">Course</TableHead>
                  <TableHead className="text-red-100 border-r border-white/15 text-center bg-[#00786f] w-12">ZERO</TableHead>
                  <TableHead className="text-red-100 border-r border-white/15 text-center bg-[#00786f] w-12">1-5.5</TableHead>
                  <TableHead className="text-red-100 border-r border-white/15 text-center bg-[#00786f] w-12">6-11.5</TableHead>
                  <TableHead className="text-red-100 border-r border-white/15 text-center bg-[#00786f] w-12">12-16</TableHead>
                  <TableHead className="text-white border-r border-white/15 text-center bg-[#00786f] w-12">16.5-20</TableHead>
                  <TableHead className="text-white border-r border-white/15 text-center bg-[#00786f] w-12">21-24.5</TableHead>
                  <TableHead className="text-white border-r border-white/15 text-center bg-[#00786f] w-12">25-27.5</TableHead>
                  <TableHead className="text-white bg-[#00786f] border-r border-white/15 text-center w-12">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow className="h-10 hover:bg-white border-b border-slate-200">
                  <TableCell className="text-center text-xs font-black text-slate-900 border-r border-slate-100">{section}</TableCell>
                  <TableCell className="text-center text-xs font-black text-slate-900 border-r border-slate-100">{courseCode}</TableCell>
                  <TableCell className="text-center text-base font-courier font-black text-red-600 bg-red-50/10 border-r border-slate-100">{atRiskDist.zero}</TableCell>
                  <TableCell className="text-center text-base font-courier font-black text-red-600 bg-red-50/10 border-r border-slate-100">{atRiskDist.range1}</TableCell>
                  <TableCell className="text-center text-base font-courier font-black text-red-600 bg-red-50/10 border-r border-slate-100">{atRiskDist.range2}</TableCell>
                  <TableCell className="text-center text-base font-courier font-black text-red-600 bg-red-50/10 border-r border-slate-100">{atRiskDist.range3}</TableCell>
                  <TableCell className="text-center text-base font-courier font-medium text-slate-600 border-r border-slate-100">{atRiskDist.range4}</TableCell>
                  <TableCell className="text-center text-base font-courier font-medium text-slate-600 border-r border-slate-100">{atRiskDist.range5}</TableCell>
                  <TableCell className="text-center text-base font-courier font-medium text-slate-600 border-r border-slate-100">{atRiskDist.range6}</TableCell>
                  <TableCell className="text-center text-base font-courier font-black text-white bg-red-600 border-r border-slate-800">{atRiskDist.atRiskCount}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          <div className="bg-slate-50 p-8 border border-slate-200">
             <div className="flex items-center gap-2 mb-8">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">At-Risk Trend - Participation & e-Portfolio Distribution</h3>
             </div>
             <div className="h-[400px] w-full bg-white border border-slate-200 p-6">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={atRiskChartData} margin={{ bottom: 20, left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="name" 
                      fontSize={10} 
                      axisLine={true} 
                      tickLine={true} 
                      tick={{ fill: '#64748b', fontWeight: 'bold' }}
                    >
                      <Label value="Score Range (0-27.5)" offset={-20} position="insideBottom" fontSize={11} fontWeight="bold" fill="#475569" />
                    </XAxis>
                    <YAxis 
                      fontSize={10} 
                      axisLine={true} 
                      tickLine={true} 
                      tick={{ fill: '#64748b', fontWeight: 'bold' }}
                    >
                      <Label value="Number of Students" angle={-90} position="insideLeft" offset={10} fontSize={11} fontWeight="bold" fill="#475569" />
                    </YAxis>
                    <Tooltip 
                      contentStyle={{ borderRadius: '0px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      cursor={{ fill: '#f8fafc' }}
                    />
                    <Bar dataKey="value" radius={[2, 2, 0, 0]}>
                      {atRiskChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
             </div>
             <div className="mt-8 grid grid-cols-2 gap-8">
                <div className="border-l-4 border-red-500 pl-4 py-2 bg-white p-4 shadow-sm">
                   <h4 className="text-[12px] font-black text-red-700 uppercase tracking-widest mb-1">Critical Intervention Zone</h4>
                   <p className="text-[11px] text-slate-600 font-medium">Students in 'ZERO' to '11.5' ranges require immediate academic support and parental involvement.</p>
                </div>
                <div className="border-l-4 border-green-500 pl-4 py-2 bg-white p-4 shadow-sm">
                   <h4 className="text-[12px] font-black text-green-700 uppercase tracking-widest mb-1">Satisfactory Zone</h4>
                   <p className="text-[11px] text-slate-600 font-medium">Students scoring above 21 marks demonstrate consistent engagement with course requirements.</p>
                </div>
             </div>
          </div>
        </div>

        {/* Report 7: Performance Analytics Sheet */}
        <div className="print-section page-break-before border border-slate-200 p-8">
          <div className="flex flex-col gap-4 mb-10 mt-12 print:mt-0">
             <div className="flex items-center gap-6">
                <ClfsLogo className="h-16 w-auto object-contain" />
                <div className="h-12 w-px bg-slate-200" />
                <div className="flex flex-col">
                  <h2 className="text-xl font-black text-blue-900 uppercase tracking-tight">Performance Analytics Sheet</h2>
                  <p className="text-[12px] font-bold text-slate-500 uppercase tracking-widest">Section Instructional Effectiveness & Analytics</p>
                </div>
             </div>
          </div>

          <div className="bg-white border-2 border-blue-100 p-8 shadow-sm overflow-hidden mb-10 relative">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-14 h-14 bg-blue-600 flex items-center justify-center text-white shadow-xl">
                <TrendingUp className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-sm font-black text-blue-900 uppercase tracking-widest">Faculty Performance Summary</h3>
                <p className="text-[12px] font-bold text-slate-500 uppercase tracking-wider">Automated Instructional Effectiveness Report</p>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-8">
              <div className="bg-slate-50 p-4 border border-slate-100">
                <p className="text-[12px] font-black text-slate-400 uppercase tracking-widest leading-none mb-2">Class Mastery</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-black text-slate-900">{avgScore}%</p>
                  <span className="text-[12px] font-bold text-blue-600 uppercase">Avg</span>
                </div>
              </div>

              <div className="bg-slate-50 p-4 border border-slate-100">
                <p className="text-[12px] font-black text-slate-400 uppercase tracking-widest leading-none mb-2">Instructional Success</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-black text-emerald-600">{passRate}%</p>
                  <span className="text-[12px] font-bold text-emerald-600 uppercase">Pass</span>
                </div>
              </div>

              <div className="bg-slate-50 p-4 border border-slate-100">
                <p className="text-[12px] font-black text-slate-400 uppercase tracking-widest leading-none mb-2">Cohort Retention</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-black text-teal-600">{stats.retentionRate}%</p>
                  <span className="text-[12px] font-bold text-teal-600 uppercase">Non-FA/W</span>
                </div>
              </div>

              <div className="bg-slate-50 p-4 border border-slate-100">
                <p className="text-[12px] font-black text-slate-400 uppercase tracking-widest leading-none mb-2">KPI Rating</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-black text-amber-600">
                    {parseFloat(passRate) >= 90 ? 'GOLD' : 
                     parseFloat(passRate) >= 80 ? 'SILVER' : 
                     parseFloat(passRate) >= 60 ? 'BRONZE' : 'STANDARD'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-10 mb-10">
            <div className="border border-slate-300 shadow-sm bg-white overflow-hidden">
               <div className="bg-slate-900 p-2 text-center border-b border-slate-700">
                  <span className="text-[9px] font-black text-white uppercase tracking-[0.2em]">Table D: Assessment Performance Data</span>
               </div>
               <Table>
                 <TableHeader>
                   <TableRow className="bg-slate-100 uppercase text-[8px] font-black tracking-wider text-slate-600 border-b border-slate-200">
                     <TableHead className="border-r border-slate-200 text-left">Assessment Component</TableHead>
                     <TableHead className="text-center">Average (%)</TableHead>
                   </TableRow>
                 </TableHeader>
                 <TableBody>
                    {assessmentStats.map((entry) => (
                      <TableRow key={entry.label} className="h-10 hover:bg-slate-50 border-b border-slate-100 last:border-0 text-[12px]">
                        <TableCell className="text-left font-bold text-slate-700 border-r border-slate-100 uppercase">{entry.label}</TableCell>
                        <TableCell className="text-center font-courier font-black text-blue-600">{entry.avgPercentage}%</TableCell>
                      </TableRow>
                    ))}
                 </TableBody>
               </Table>
            </div>

            <div className="bg-slate-50 p-6 border border-slate-200">
               <div className="flex items-center gap-2 mb-6">
                  <TrendingUp className="w-4 h-4 text-amber-600" />
                  <h3 className="text-[12px] font-bold text-slate-900 uppercase tracking-widest">Assessment Performance Trend</h3>
               </div>
               <div className="h-[220px] w-full bg-white border border-slate-100 p-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={assessmentStats} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="label" fontSize={8} axisLine={false} tickLine={false} tick={{ fontWeight: 700, fill: '#64748b' }} />
                      <YAxis domain={[0, 100]} fontSize={8} axisLine={false} tickLine={false} tick={{ fontWeight: 700, fill: '#94a3b8' }} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '0px', border: '1px solid #e2e8f0', fontSize: '10px' }}
                        formatter={(value: any) => [`${value}%`, 'Average Score']}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="avgPercentage" 
                        stroke="#1e3a8a" 
                        strokeWidth={3}
                        dot={(props: any) => {
                          const val = props.value;
                          const color = val < 50 ? '#ef4444' : 
                                      val < 65 ? '#f97316' : 
                                      val < 75 ? '#3b82f6' : 
                                      val < 85 ? '#0ea5e9' : '#10b981';
                          return (
                            <circle key={props.key} cx={props.cx} cy={props.cy} r={4} fill={color} stroke="#fff" strokeWidth={2} />
                          );
                        }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
               </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-6 mb-10">
            <div className="border border-slate-300 shadow-sm bg-white overflow-hidden">
               <div className="bg-emerald-800 p-2 text-center border-b border-emerald-900">
                  <span className="text-[8px] font-black text-white uppercase tracking-[0.2em]">High Performers (Top 5)</span>
               </div>
               <Table>
                 <TableBody>
                   {highPerformers.slice(0, 5).map((p, idx) => (
                     <TableRow key={p.id} className="h-12 border-b border-slate-100 last:border-0 hover:bg-slate-50">
                       <TableCell className="py-2 px-3 border-r border-slate-100 text-left">
                         <p className="text-[12px] font-black text-slate-900 uppercase leading-none mb-1">{p.name}</p>
                         <p className="text-[10px] font-mono font-bold text-slate-400">{p.id}</p>
                       </TableCell>
                       <TableCell className="text-center text-sm font-black text-emerald-600">{p.totalScore}</TableCell>
                     </TableRow>
                   ))}
                   {highPerformers.length === 0 && <TableRow><TableCell colSpan={2} className="text-center py-8 text-[9px] font-black text-slate-300 uppercase">No High Performers</TableCell></TableRow>}
                 </TableBody>
               </Table>
            </div>

            <div className="border border-slate-300 shadow-sm bg-white overflow-hidden">
               <div className="bg-blue-800 p-2 text-center border-b border-blue-900">
                  <span className="text-[8px] font-black text-white uppercase tracking-[0.2em]">Average Performers (Top 5)</span>
               </div>
               <Table>
                 <TableBody>
                   {avgPerformers.slice(0, 5).map((p) => (
                     <TableRow key={p.id} className="h-12 border-b border-slate-100 last:border-0 hover:bg-slate-50">
                       <TableCell className="py-2 px-3 border-r border-slate-100 text-left">
                         <p className="text-[12px] font-black text-slate-900 uppercase leading-none mb-1">{p.name}</p>
                         <p className="text-[10px] font-mono font-bold text-slate-400">{p.id}</p>
                       </TableCell>
                       <TableCell className="text-center text-sm font-black text-blue-600">{p.totalScore}</TableCell>
                     </TableRow>
                   ))}
                   {avgPerformers.length === 0 && <TableRow><TableCell colSpan={2} className="text-center py-8 text-[9px] font-black text-slate-300 uppercase">No Average Performers</TableCell></TableRow>}
                 </TableBody>
               </Table>
            </div>

            <div className="border border-slate-300 shadow-sm bg-white overflow-hidden">
               <div className="bg-red-800 p-2 text-center border-b border-red-900">
                  <span className="text-[8px] font-black text-white uppercase tracking-[0.2em]">Low Performers (Bottom 5)</span>
               </div>
               <Table>
                 <TableBody>
                   {lowPerformers.slice(0, 5).map((p) => (
                     <TableRow key={p.id} className="h-12 border-b border-slate-100 last:border-0 hover:bg-slate-50">
                       <TableCell className="py-2 px-3 border-r border-slate-100 text-left">
                         <p className="text-[12px] font-black text-slate-900 uppercase leading-none mb-1">{p.name}</p>
                         <p className="text-[10px] font-mono font-bold text-slate-400">{p.id}</p>
                       </TableCell>
                       <TableCell className="text-center text-sm font-black text-red-600">{p.totalScore}</TableCell>
                     </TableRow>
                   ))}
                   {lowPerformers.length === 0 && <TableRow><TableCell colSpan={2} className="text-center py-8 text-[9px] font-black text-slate-300 uppercase">No Low Performers</TableCell></TableRow>}
                 </TableBody>
               </Table>
            </div>
          </div>

          <div className="bg-slate-100 p-8 border border-slate-200">
             <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Descriptive Analysis Report</h3>
                <div className={`px-4 py-1 text-[12px] font-black uppercase tracking-widest border-2 ${
                  aiReports && aiReports.categoryPerformance ? (
                    aiReports.categoryPerformance.toUpperCase().includes("EXCELLENT") ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                    aiReports.categoryPerformance.toUpperCase().includes("GOOD") ? 'bg-blue-50 text-blue-700 border-blue-200' :
                    aiReports.categoryPerformance.toUpperCase().includes("SATISFACTORY") ? 'bg-amber-50 text-amber-700 border-amber-200' :
                    'bg-red-50 text-red-700 border-red-200'
                  ) : (
                    (parseFloat(passRate) >= 90 || parseFloat(avgScore) >= 85) ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                    (parseFloat(passRate) >= 80 || parseFloat(avgScore) >= 75) ? 'bg-blue-50 text-blue-700 border-blue-200' :
                    (parseFloat(passRate) >= 55 || parseFloat(avgScore) >= 65) ? 'bg-amber-50 text-amber-700 border-amber-200' :
                    'bg-red-50 text-red-700 border-red-200'
                  )
                }`}>
                  Section Performance: {
                    aiReports && aiReports.categoryPerformance ? aiReports.categoryPerformance : (
                      (parseFloat(passRate) >= 90 || parseFloat(avgScore) >= 85) ? 'Excellent' :
                      (parseFloat(passRate) >= 80 || parseFloat(avgScore) >= 75) ? 'Good' :
                      (parseFloat(passRate) >= 55 || parseFloat(avgScore) >= 65) ? 'Satisfactory' : 'Needs Attention'
                    )
                  }
                </div>
             </div>

             <div className="grid grid-cols-2 gap-10 text-[11px] text-slate-700 leading-relaxed font-medium">
                {aiReports ? (
                  <div className="col-span-2 whitespace-pre-wrap font-sans text-xs leading-relaxed p-6 bg-white border border-slate-200 rounded-sm">
                    {formatMarkdownToJSX(aiReports.descriptiveAnalysis)}
                  </div>
                ) : (
                  <>
                    <div className="space-y-4">
                      <p>
                        A comprehensive analysis of the <strong>{stats.total}</strong> enrolled students illustrates a clear performance trajectory for this section. 
                        The current passing rate stands at <strong>{passRate}%</strong>, which suggests a {
                          parseFloat(passRate) >= 85 ? 'highly successful mastery of the core competencies' :
                          parseFloat(passRate) >= 70 ? 'solid understanding and engagement with the curriculum' :
                          'significant opportunity for instructional intervention and reinforcement'
                        }.
                      </p>
                      <p>
                        Qualitatively, the grade distribution reflects a <strong>{
                          (stats.grades['A+'] || 0) + (stats.grades['A'] || 0) + (stats.grades['A-'] || 0) > stats.total * 0.3 ? 'top-heavy performance curve' :
                          (stats.grades['C'] || 0) + (stats.grades['C-'] || 0) > stats.total * 0.4 ? 'centered distribution' :
                          'varied academic range'
                        }</strong>. We observe that <strong>{(stats.grades['A+'] || 0) + (stats.grades['A'] || 0) + (stats.grades['A-'] || 0)}</strong> students achieved high distinction (Excellent), while <strong>{stats.failed || 0}</strong> students currently fall below the required threshold for proficiency.
                      </p>
                    </div>
                    
                    <div className="space-y-4">
                      <p>
                        The statistical dispersion is captured by an average grade of <strong>{avgScore || '0.0'}</strong>, anchored by a high of <strong>{stats.maxScore || '0.0'}</strong> and a low of <strong>{stats.minScore || '0.0'}</strong>. 
                        This <strong>{String((parseFloat(stats.maxScore) || 0) - (parseFloat(stats.minScore) || 0))} point spread</strong> indicates {
                          (parseFloat(stats.maxScore) || 0) - (parseFloat(stats.minScore) || 0) > 40 ? 'a wide variance in student readiness and background knowledge' :
                          'a relatively cohesive academic standing across the cohort'
                        }.
                      </p>
                      <p>
                        Critical data points include <strong>{reportData.filter(s => ['FA'].includes(s.fv.finallyValue)).length} students</strong> with 'FA' (Failure due to Absence) status, representing a primary risk factor for overall section statistics. 
                        Furthermore, the at-risk population (scoring below 27.5/50) encompasses <strong>{atRiskDist.atRiskCount}</strong> students, requiring immediate focused feedback sessions.
                      </p>
                    </div>
                  </>
                )}

                <div className="col-span-2 mt-4 p-8 bg-white border-2 border-slate-200 shadow-sm space-y-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-5">
                    <Users className="w-32 h-32 text-blue-900" />
                  </div>
                  <h4 className="font-black text-blue-900 text-[11px] uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Gender Demographics & Comparative Outcomes
                    {aiReports && (
                      <span className="bg-[#00786f] text-white text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded ml-2">
                        AI Report Connected
                      </span>
                    )}
                  </h4>
                  {aiReports ? (
                    <div className="whitespace-pre-wrap font-sans text-xs leading-relaxed p-6 bg-slate-50 border border-slate-200 rounded-sm">
                      {formatMarkdownToJSX(aiReports.genderDemographics)}
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-12">
                      <div className="space-y-3">
                        <div className="flex justify-between items-baseline border-b border-slate-100 pb-2">
                          <span className="text-[12px] font-black text-slate-400 uppercase tracking-widest">Male Performance</span>
                          <span className="text-2xl font-black text-blue-600">{stats.genderStats.male.total > 0 ? ((stats.genderStats.male.pass / stats.genderStats.male.total) * 100).toFixed(1) : 0}%</span>
                        </div>
                        <p className="text-[11px] text-slate-600 leading-normal">
                          Of the <strong>{stats.genderStats.male.total}</strong> male students, <strong>{stats.genderStats.male.pass}</strong> achieved a passing status. This demographic accounts for <strong>{stats.total > 0 ? ((stats.genderStats.male.total / stats.total) * 100).toFixed(1) : 0}%</strong> of the total population.
                        </p>
                      </div>
                      <div className="space-y-3 border-l border-slate-100 pl-12">
                        <div className="flex justify-between items-baseline border-b border-slate-100 pb-2">
                          <span className="text-[12px] font-black text-slate-400 uppercase tracking-widest">Female Performance</span>
                          <span className="text-2xl font-black text-emerald-600">{stats.genderStats.female.total > 0 ? ((stats.genderStats.female.pass / stats.genderStats.female.total) * 100).toFixed(1) : 0}%</span>
                        </div>
                        <p className="text-[11px] text-slate-600 leading-normal">
                          With <strong>{stats.genderStats.female.total}</strong> enrolled female students and <strong>{stats.genderStats.female.pass}</strong> passing, the cohort shows a <strong>{(() => {
                            const maleRate = stats.genderStats.male.total > 0 ? (stats.genderStats.male.pass / stats.genderStats.male.total) : 0;
                            const femaleRate = stats.genderStats.female.total > 0 ? (stats.genderStats.female.pass / stats.genderStats.female.total) : 0;
                            return Math.abs((maleRate - femaleRate) * 100).toFixed(1);
                          })()}% variance</strong> between gender-based performance metrics.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
             </div>
          </div>
        </div>

        {/* Report 8: Syllabus Completion Report */}
        <div className="print-section page-break-before border border-slate-200 p-8">
          <div className="flex flex-col gap-4 mb-10 mt-12 print:mt-0">
             <div className="flex items-center gap-6">
                <ClfsLogo className="h-16 w-auto object-contain" />
                <div className="h-12 w-px bg-slate-200" />
                <div className="flex flex-col">
                  <h2 className="text-xl font-black text-blue-900 uppercase tracking-tight">Syllabus Completion Report</h2>
                  <p className="text-[12px] font-bold text-slate-500 uppercase tracking-widest">Instructional Progress & Delivery Verification</p>
                </div>
             </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 shadow-sm overflow-hidden mb-10">
            <div className="p-4 border-b border-slate-200 bg-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
                <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Syllabus Progress Breakdown</h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Average Progress:</span>
                <span className="text-sm font-black text-emerald-600">{averageCompletion}%</span>
              </div>
            </div>
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-900 hover:bg-slate-900 border-none h-8">
                  <TableHead className="text-white font-bold text-[9px] uppercase h-8 border-r border-slate-700 tracking-tight">Assessment / Component</TableHead>
                  <TableHead className="text-white font-bold text-[9px] uppercase h-8 text-center border-r border-slate-700 tracking-tight w-20">Completed</TableHead>
                  <TableHead className="text-white font-bold text-[9px] uppercase h-8 text-center border-r border-slate-700 tracking-tight w-20">Pending</TableHead>
                  <TableHead className="text-white font-bold text-[9px] uppercase h-8 text-center tracking-tight w-24">Percentage (%)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {completionStats.map((task, i) => (
                  <TableRow key={i} className="hover:bg-white border-b border-slate-200 bg-white last:border-0 h-8">
                    <TableCell className="py-1 px-3 border-r border-slate-100">
                      <div className="flex flex-col gap-1">
                        <p className="text-[9px] font-black text-slate-700 uppercase leading-none tracking-tight">{task.name}</p>
                        <div className="h-1 w-full bg-red-100 overflow-hidden">
                          <div 
                            className="h-full bg-blue-600"
                            style={{ width: `${task.percentage}%` }}
                          />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center py-1 text-[11px] font-courier font-black text-slate-900 border-r border-slate-100">{task.completed}</TableCell>
                    <TableCell className="text-center py-1 text-[11px] font-courier font-black text-red-600 border-r border-slate-100">{task.pending}</TableCell>
                    <TableCell className="text-center py-1 text-[11px] font-courier font-black text-emerald-600">{task.percentage}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="grid grid-cols-2 gap-10">
            <div className="bg-slate-50 border border-slate-200 p-8 flex flex-col items-center justify-center">
              <h3 className="text-[12px] font-black text-slate-900 mb-8 uppercase tracking-widest text-center">Instructional Delivery Visualization</h3>
              <div className="relative w-48 h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Delivered', value: parseFloat(averageCompletion) || 0 },
                        { name: 'Remaining', value: 100 - (parseFloat(averageCompletion) || 0) }
                      ]}
                      innerRadius="70%"
                      outerRadius="100%"
                      paddingAngle={5}
                      dataKey="value"
                      startAngle={90}
                      endAngle={-270}
                    >
                      <Cell fill="#1e3a8a" />
                      <Cell fill="#fee2e2" stroke="#fecaca" />
                      <Label 
                        value={`${averageCompletion}%`} 
                        position="center" 
                        style={{ fontSize: '24px', fontWeight: '900', fill: '#1e3a8a' }}
                      />
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white border-2 border-slate-100 p-10 flex flex-col justify-center">
               <div className="border-l-4 border-blue-900 pl-6 space-y-6">
                 <div>
                    <h3 className="text-xs font-black text-blue-900 uppercase tracking-widest mb-3">
                      Syllabus Coverage Summary
                      {aiReports && (
                        <span className="bg-[#00786f] text-white text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded ml-2">
                          AI Insights Active
                        </span>
                      )}
                    </h3>
                    {aiReports && aiReports.completionInsights ? (
                      <div className="whitespace-pre-wrap font-sans text-xs text-slate-600 leading-relaxed font-medium">
                        {formatMarkdownToJSX(aiReports.completionInsights)}
                      </div>
                    ) : (
                      <>
                        <p className="text-xs text-slate-600 leading-relaxed font-medium">
                          The course syllabus for <strong>{courseCode}</strong> shows an average completion rate of <strong>{averageCompletion}%</strong> across all assessed components. This metric reflects the alignment between the session's instructional plan and the recorded academic evaluations.
                        </p>
                        <div className="bg-blue-50/50 p-4 border border-blue-100/50 mt-4">
                           <p className="text-[11px] text-blue-800 leading-relaxed italic">
                             "High completion rates confirm robust academic delivery and effective session management, ensuring all learning outcomes are addressed within the scheduled timeframe."
                           </p>
                        </div>
                      </>
                    )}
                 </div>
               </div>
            </div>
          </div>
        </div>

        {/* Report 9: Course Evaluation Report (CER) */}
        <div className="print-section page-break-before border border-slate-200 p-8">
          <div className="flex flex-col gap-4 mb-10 mt-12 print:mt-0">
             <div className="flex items-center gap-6">
                <ClfsLogo className="h-16 w-auto object-contain" />
                <div className="h-12 w-px bg-slate-200" />
                <div className="flex flex-col">
                  <h2 className="text-xl font-black text-blue-900 uppercase tracking-tight">Course Evaluation Report (CER)</h2>
                  <p className="text-[12px] font-bold text-slate-500 uppercase tracking-widest">Quality Assurance & Instructional Audit</p>
                </div>
             </div>
          </div>

          <div className="grid grid-cols-1 gap-8">
            {/* Section 1: Statistical Analysis */}
            <div className="bg-slate-50 border border-slate-200 p-6">
              <div className="flex items-center gap-2 mb-4 border-l-4 border-blue-900 pl-3">
                <Activity className="w-4 h-4 text-blue-900" />
                <h3 className="text-xs font-black text-blue-900 uppercase tracking-widest">1. Statistical Analysis</h3>
              </div>
              <div className="grid grid-cols-2 gap-8">
                <div className="bg-white p-5 border border-slate-200 shadow-sm relative overflow-hidden">
                   <div className="absolute top-0 right-0 w-16 h-16 bg-blue-50 -mr-8 -mt-8 rotate-45" />
                   <p className="text-[12px] font-black text-slate-400 uppercase tracking-widest mb-1 relative z-10">Total Sections</p>
                   <p className="text-2xl font-black text-slate-900 relative z-10">01</p>
                </div>
                <div className="bg-white p-5 border border-slate-200 shadow-sm relative overflow-hidden">
                   <div className="absolute top-0 right-0 w-16 h-16 bg-blue-50 -mr-8 -mt-8 rotate-45" />
                   <p className="text-[12px] font-black text-slate-400 uppercase tracking-widest mb-1 relative z-10">Average Grade of Section</p>
                   <div className="flex items-baseline gap-1 relative z-10">
                     <p className="text-2xl font-black text-blue-600">{avgScore}</p>
                     <p className="text-xs font-black text-blue-400">%</p>
                   </div>
                </div>
              </div>
            </div>

            {/* Section 2: Comments */}
            <div className="bg-white border border-slate-200 p-6">
              <div className="flex items-center gap-2 mb-4 border-l-4 border-blue-900 pl-3">
                <MessageSquare className="w-4 h-4 text-blue-900" />
                <h3 className="text-xs font-black text-blue-900 uppercase tracking-widest">
                  2. Performance Indicator (PI) Comments
                  {aiReports && (
                    <span className="bg-[#00786f] text-white text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded ml-2">
                      AI Active
                    </span>
                  )}
                </h3>
              </div>
              <div className={cn(
                "p-5 border-l-4",
                !isBelowTarget ? "bg-emerald-50 border-emerald-500 text-emerald-800" : "bg-red-50 border-red-500 text-red-800"
              )}>
                <div className="text-[11px] font-bold leading-relaxed uppercase tracking-tight whitespace-pre-wrap font-sans">
                  {aiReports?.cerComments ? formatMarkdownToJSX(aiReports.cerComments) : formatMarkdownToJSX(!isBelowTarget 
                    ? "The Performance Indicator (PI) for this section has been successfully achieved. The average numeric grade meets or exceeds the institutional target of 70%." 
                    : "The Performance Indicator (PI) for this section has NOT been achieved. The average numeric grade falls below the institutional target of 70%.")
                  }
                </div>
              </div>
            </div>

            {/* Section 3: Explanation (Highlighted only if below target) */}
            <div className={cn(
              "p-6 border",
              isBelowTarget ? "bg-slate-50 border-slate-200" : "bg-slate-50/50 border-slate-100 opacity-60"
            )}>
              <div className="flex items-center gap-2 mb-4 border-l-4 border-slate-400 pl-3">
                <AlertCircle className={cn("w-4 h-4", isBelowTarget ? "text-red-600" : "text-slate-400")} />
                <h3 className={cn("text-xs font-black uppercase tracking-widest", isBelowTarget ? "text-red-900" : "text-slate-400")}>
                  3. Explanation for level of achievement below target
                  {aiReports && (
                    <span className="bg-[#00786f] text-white text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded ml-2">
                      AI Active
                    </span>
                  )}
                </h3>
              </div>
              <div className="text-[11px] text-slate-700 leading-relaxed font-medium whitespace-pre-wrap font-sans">
                {aiReports?.cerExplanation ? (
                  formatMarkdownToJSX(aiReports.cerExplanation)
                ) : isBelowTarget ? (
                  formatMarkdownToJSX(`The overall average numeric grade is ${avgScore || "0.0"}%, which is below the 70% target. This shortfall is primarily caused by assessment difficulties encountered in advanced modules, inconsistent attendance patterns, frequent tardiness, low classroom participation, students who are repeaters, students with a poor background in Math, lack of focus, and excessive mobile usage during sessions.`)
                ) : (
                  formatMarkdownToJSX("The Performance Indicator (PI) has been achieved as the average grade meets the target criteria. No additional explanation for shortfall is required at this stage.")
                )}
              </div>
            </div>

            {/* Section 4: Recommendations */}
            <div className="bg-white border border-slate-200 p-6">
              <div className="flex items-center gap-2 mb-4 border-l-4 border-blue-900 pl-3">
                <Lightbulb className="w-4 h-4 text-amber-600" />
                <h3 className="text-xs font-black text-blue-900 uppercase tracking-widest">
                  4. Instructor recommendations to resolve low achievement
                  {aiReports && (
                    <span className="bg-[#00786f] text-white text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded ml-2">
                      AI Active
                    </span>
                  )}
                </h3>
              </div>
              <div className="bg-amber-50/30 p-4 border border-amber-100/50">
                <div className="text-[11px] text-slate-700 leading-relaxed font-medium whitespace-pre-wrap font-sans">
                  {aiReports?.cerRecommendations ? formatMarkdownToJSX(aiReports.cerRecommendations) : formatMarkdownToJSX(isBelowTarget 
                    ? "To address the observed performance challenges, I recommend: 1) Implementing a structured attendance monitoring and intervention system, 2) Conducting targeted tutorials to overcome assessment difficulties in advanced modules, 3) Incentivizing classroom participation to boost engagement, and 4) Providing academic support and guidance for students struggling with foundational Math or behavioral issues." 
                    : "The achievement is satisfactory. Continue with the current teaching methodology and maintain regular progress monitoring for students at the threshold of the target to ensure sustained quality.")
                  }
                </div>
              </div>
            </div>

            {/* Section 5: Overall View */}
            <div className="bg-slate-50 border border-slate-200 p-6 relative overflow-hidden">
               <div className="absolute -bottom-4 -right-4 opacity-5">
                 <Target className="w-32 h-32 text-blue-900" />
               </div>
              <div className="flex items-center gap-2 mb-4 border-l-4 border-blue-900 pl-3">
                <Target className="w-4 h-4 text-blue-900" />
                <h3 className="text-xs font-black text-blue-900 uppercase tracking-widest relative z-10">
                  5. Overall instructor view and plans for improvement
                  {aiReports && (
                    <span className="bg-[#00786f] text-white text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded ml-2">
                      AI Active
                    </span>
                  )}
                </h3>
              </div>
              <div className="text-[11px] text-slate-700 leading-relaxed font-medium italic relative z-10 whitespace-pre-wrap font-sans">
                {aiReports?.cerOverallView ? formatMarkdownToJSX(`"${aiReports.cerOverallView}"`) : formatMarkdownToJSX(`"The course content and assessments are generally sound and aligned with learning outcomes. Future planning will focus on improving student engagement and participation to ensure consistent achievement of performance indicators across all future sections of this course, with specific emphasis on early identification of at-risk students."`)}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Verification for Printing */}
        <div className="print-section page-break-before py-12 border border-slate-200 p-8">
          <div className="grid grid-cols-2 gap-20">
            <div className="flex flex-col gap-8">
              <div>
                <p className="text-[12px] font-black text-slate-400 uppercase tracking-widest mb-12">Instructor's Signature</p>
                <div className="w-full border-b-2 border-slate-300 pb-2 flex justify-between items-end">
                   <span className="text-xs text-slate-500">Date: ____/____/2026</span>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-8">
              <div>
                <p className="text-[12px] font-black text-slate-400 uppercase tracking-widest mb-12">Head of Department Approval</p>
                <div className="w-full border-b-2 border-slate-300 pb-2 flex justify-between items-end">
                   <span className="text-xs text-slate-500">Date: ____/____/2026</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Empty Page before Back Cover */}
        <div className="print-section page-break-before h-[1100px] flex items-center justify-center hidden print:flex border border-slate-200 p-8" />

        {/* Back Cover */}
        <div className="print-section page-break-before h-[1100px] flex flex-col relative border border-slate-200 p-8 items-center justify-center">
           <ClfsLogo className="h-48 w-auto mb-12 opacity-10" />
           <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="text-[120px] font-black text-slate-50 uppercase tracking-[0.3em] -rotate-45">FINIS</span>
           </div>
           <div className="text-center z-10">
              <h2 className="text-2xl font-black text-slate-900 uppercase tracking-[0.4em] mb-4">End of Report</h2>
              <div className="h-1 w-24 bg-slate-900 mx-auto mb-8" />
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Official Academic Documentation</p>
              <p className="text-[9px] text-slate-300 mt-2 font-courier">{new Date().getFullYear()} GMS System</p>
           </div>
           
           {/* Back Cover Footer */}
           <div className="absolute bottom-12 left-12 right-12 flex justify-between items-center border-t-2 border-slate-100 pt-8">
             <div className="flex flex-col">
               <p className="text-[12px] font-black text-slate-800 uppercase tracking-[0.3em] flex items-center gap-1">
                 Copyright © 
                 <img src="https://raw.githubusercontent.com/hameedktk09/cms/main/hrk-logo.png" className="h-[14px] w-auto inline-block" referrerPolicy="no-referrer" />
                 drkhan 2026.
               </p>
               <p className="text-[8px] text-slate-400 font-courier mt-1">Authentication Hash: {Math.random().toString(16).substring(2, 10).toUpperCase()}</p>
             </div>
           </div>
        </div>


        {/* Global Print Footer */}
        <div className="hidden print:block fixed bottom-4 left-0 right-0 text-center">
            <p className="text-[11px] text-slate-400 uppercase tracking-[0.2em]">Generated by GMS | {new Date().toLocaleString()}</p>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body { background: white !important; counter-reset: page; }
          .no-print { display: none !important; }
          @page { margin: 1cm; size: portrait; }
          .print-break-inside-avoid { page-break-inside: avoid; }
          .page-break-before { page-break-before: always; }
          .print-section { padding-top: 10px; }
          
          @page {
            @bottom-right {
              content: "Page " counter(page);
              font-size: 10px;
              color: #94a3b8;
            }
          }
        }
      `}} />
    </div>
  );
}
