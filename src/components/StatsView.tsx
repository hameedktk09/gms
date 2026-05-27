import React, { useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer,
  Cell,
  LineChart,
  Line,
  Label,
  PieChart,
  Pie
} from 'recharts';
import { 
  ArrowLeft, 
  Download, 
  FileDown,
  ShieldAlert,
  TrendingUp, 
  Users, 
  Award, 
  AlertCircle,
  FileText,
  Printer,
  Calculator,
  BarChart2,
  CheckCircle,
  Activity,
  Mail,
  Send,
  Loader2,
  Search,
  Copy
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { StudentData, SEMESTER_OPTIONS, User, COURSE_OPTIONS, RAW_MARKS_LIMITS } from '@/src/types';
import { calculateFinalValues, calculateAtRiskDistribution, getStudentStatus, parseStudentName } from '@/src/lib/grade-utils';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { toast } from 'sonner';

import { ClfsLogo } from './ClfsLogo';
import { FloatingFeedback } from './FloatingFeedback';
import { cleanInstructorText } from './GradeTable';

interface StatsViewProps {
  students: StudentData[];
  courseCode: string;
  section: string;
  semester: string;
  user: User | null;
  onBack: () => void;
  initialTab?: string;
}

const COLORS = ['#2563eb', '#7c3aed', '#db2777', '#dc2626', '#ea580c', '#d97706', '#65a30d', '#059669', '#0891b2'];

const AnimatedBarShape = (props: any) => {
  const { fill, x, y, width, height, index, radius } = props;
  if (!width || !height) return null;
  const bottomY = y + height;
  const hasRadius = radius && (radius[0] > 0 || radius[1] > 0);
  return (
    <motion.rect
      x={x}
      width={width}
      fill={fill}
      rx={hasRadius ? 2 : 0}
      ry={hasRadius ? 2 : 0}
      initial={{ y: bottomY, height: 0, opacity: 0 }}
      animate={{ y: y, height: height, opacity: 1 }}
      transition={{
        type: "spring",
        stiffness: 100,
        damping: 15,
        mass: 0.8,
        delay: (index || 0) * 0.03
      }}
    />
  );
};

export function StatsView({ students, courseCode, section, semester, user, onBack, initialTab }: StatsViewProps) {
  const [feedback, setFeedback] = React.useState<{ id: string; message: string } | null>(null);
  const [isReminderDialogOpen, setIsReminderDialogOpen] = React.useState(false);
  const [isCerDialogOpen, setIsCerDialogOpen] = React.useState(false);
  const [cerSections, setCerSections] = React.useState<{title: string, content: string}[]>([]);
  const [selectedTask, setSelectedTask] = React.useState<any>(null);
  const [isSending, setIsSending] = React.useState(false);
  const [reminderMessage, setReminderMessage] = React.useState('');
  const [searchTerm, setSearchTerm] = React.useState('');
  const [activeTab, setActiveTab] = React.useState(initialTab || 'raw');

  React.useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const getCourseLabel = (val: string) => {
    return COURSE_OPTIONS.find(o => o.value === val)?.label || val;
  };

  const copyToClipboard = (title: string, data: any[]) => {
    try {
      const headers = Object.keys(data[0]);
      const csvContent = [
        headers.join('\t'),
        ...data.map(row => headers.map(header => row[header]).join('\t'))
      ].join('\n');

      navigator.clipboard.writeText(csvContent);
      toast.success(`${title} copied to clipboard`);
    } catch (err) {
      toast.error('Failed to copy data');
    }
  };

  const CopyButton = ({ title, data, text }: { title: string, data?: any[], text?: string }) => (
    <Button
      variant="outline"
      size="sm"
      onClick={() => {
        if (text) {
          navigator.clipboard.writeText(text);
          toast.success(`${title} copied to clipboard`);
        } else if (data) {
          copyToClipboard(title, data);
        }
      }}
      className="h-7 px-2 text-[10px] font-black text-slate-700 hover:bg-[#FFEE82] hover:text-blue-900 hover:border-[#FFEE82] border-slate-300 bg-white flex items-center gap-1.5 transition-all no-print shadow-sm"
    >
      <Copy className="w-3 h-3" />
      COPY
    </Button>
  );

  const filteredStudents = React.useMemo(() => {
    if (!searchTerm) return students;
    const lowerSearch = searchTerm.toLowerCase();
    return students.filter(s => 
      s.name.toLowerCase().includes(lowerSearch) || 
      s.id.toLowerCase().includes(lowerSearch)
    );
  }, [students, searchTerm]);

  const showFeedback = (id: string, message: string) => {
    setFeedback({ id, message });
  };

  const handleOpenReminder = (task: any) => {
    setSelectedTask(task);
    setReminderMessage(
      `Dear Student,\n\nThis is a friendly reminder that you have not yet completed the "${task.name}" assessment for ${courseCode}. The deadline is approaching. Please ensure you submit your work as soon as possible.\n\nRegards,\nYour Instructor`
    );
    setIsReminderDialogOpen(true);
  };

  const handleSendReminders = async () => {
    if (!selectedTask || selectedTask.pendingList.length === 0) return;

    setIsSending(true);
    try {
      const response = await fetch('/api/send-reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipients: selectedTask.pendingList.map((s: any) => s.email),
          subject: `Deadline Reminder: ${selectedTask.name} (${courseCode})`,
          body: reminderMessage.replace(/\n/g, '<br/>')
        })
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(`Success! Reminders sent to ${data.count} students.`);
        setIsReminderDialogOpen(false);
      } else {
        throw new Error(data.error || 'Failed to send reminders');
      }
    } catch (error: any) {
      console.error("Reminder error:", error);
      toast.error(error.message || "An unexpected error occurred while sending reminders.");
    } finally {
      setIsSending(false);
    }
  };

  const safeFixed = (val: any, digits: number = 1) => {
    const num = parseFloat(val);
    return isNaN(num) ? '0.0' : num.toFixed(digits);
  };
  
  const stats = useMemo(() => {
    if (filteredStudents.length === 0) {
      return {
        totalStudents: 0,
        passCount: 0,
        failCount: 0,
        passRate: '0.0',
        failRate: '0.0',
        avgScore: '0.0',
        minScore: '0.0',
        maxScore: '0.0',
        faCount: 0,
        gradeChartData: [],
        rangeChartData: [],
        grades: {
          'A+': 0, 'A': 0, 'A-': 0,
          'B+': 0, 'B': 0, 'B-': 0,
          'C+': 0, 'C': 0, 'C-': 0,
          'D+': 0, 'D': 0, 'D-': 0,
          'F': 0
        },
        ranges: {
          '90-100': 0, '85-89': 0, '80-84': 0, '75-79': 0, '70-74': 0,
          '65-69': 0, '60-64': 0, '55-59': 0, '50-54': 0, '45-49': 0, '0-44': 0
        },
        assessmentStats: [],
        highPerformers: [],
        lowPerformers: [],
        avgPerformers: [],
        statusCounts: {
          pass: 0, notPass: 0, r: 0, fa: 0, waW: 0, ipI: 0, pst: 0
        },
        genderStats: { male: { total: 0, pass: 0 }, female: { total: 0, pass: 0 } },
        completionStats: [],
        averageCompletion: '0.0'
      };
    }

    const finalData = filteredStudents.map(s => calculateFinalValues(s));
    const totalStudents = filteredStudents.length;
    
    const grades = {
      'A+': 0, 'A': 0, 'A-': 0,
      'B+': 0, 'B': 0, 'B-': 0,
      'C+': 0, 'C': 0, 'C-': 0,
      'D+': 0, 'D': 0, 'D-': 0,
      'F': 0
    };

    const ranges = {
      '90-100': 0,
      '85-89': 0,
      '80-84': 0,
      '75-79': 0,
      '70-74': 0,
      '65-69': 0,
      '60-64': 0,
      '55-59': 0,
      '50-54': 0,
      '45-49': 0,
      '0-44': 0
    };

    finalData.forEach(d => {
      if (d.gradeLetter in grades) grades[d.gradeLetter as keyof typeof grades]++;
      
      const score = parseFloat(d.totalScore);
      if (score >= 90) ranges['90-100']++;
      else if (score >= 85) ranges['85-89']++;
      else if (score >= 80) ranges['80-84']++;
      else if (score >= 75) ranges['75-79']++;
      else if (score >= 70) ranges['70-74']++;
      else if (score >= 65) ranges['65-69']++;
      else if (score >= 60) ranges['60-64']++;
      else if (score >= 55) ranges['55-59']++;
      else if (score >= 50) ranges['50-54']++;
      else if (score >= 45) ranges['45-49']++;
      else ranges['0-44']++;
    });

    const gradeChartData = Object.entries(grades).map(([name, value]) => ({
      name,
      value,
      percentage: safeFixed((value / totalStudents) * 100)
    }));

    const rangeChartData = Object.entries(ranges).map(([name, value]) => ({
      name,
      value,
      percentage: safeFixed((value / totalStudents) * 100)
    }));

    const passCount = finalData.filter(d => d.finallyValue === 'Pass').length;
    const failCount = totalStudents - passCount;
    
    // Gender-based Stats
    const genderStats = {
      male: { total: 0, pass: 0 },
      female: { total: 0, pass: 0 }
    };

    filteredStudents.forEach((s, idx) => {
      const fv = finalData[idx];
      const isPass = fv.finallyValue === 'Pass';
      
      // Determine gender from name if not already set in student object
      let gender = s.gender;
      if (!gender || (gender !== 'M' && gender !== 'F')) {
        const parsed = parseStudentName(s.name || '');
        gender = parsed.gender || undefined;
      }

      // Ensure every student is counted in one of the two categories
      // Defaulting to Male if unknown to satisfy the requirement that Total = M + F
      if (gender === 'F') {
        genderStats.female.total++;
        if (isPass) genderStats.female.pass++;
      } else {
        genderStats.male.total++;
        if (isPass) genderStats.male.pass++;
      }
    });

    // Detailed Status Counts
    const statusCounts = {
      pass: 0,
      notPass: 0,
      r: 0,
      fa: 0,
      waW: 0,
      ipI: 0,
      pst: 0
    };

    filteredStudents.forEach((s, idx) => {
      const fv = finalData[idx];
      const score = parseFloat(fv.totalScore) || 0;
      const status = getStudentStatus(s, score);
      
      if (status === 'Pass') statusCounts.pass++;
      else if (status === 'Not Pass') statusCounts.notPass++;
      else if (status === 'FA') statusCounts.fa++;
      else if (status === 'WA') statusCounts.waW++;
      else if (status === 'IP') statusCounts.ipI++;
      else if (status === 'PST') statusCounts.pst++;
    });

    const faCount = statusCounts.fa;
    const scores = finalData.map(d => parseFloat(d.totalScore)).filter(s => !isNaN(s));
    const avgScore = scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : '0';
    const minScore = scores.length > 0 ? Math.min(...scores).toFixed(1) : '0';
    const maxScore = scores.length > 0 ? Math.max(...scores).toFixed(1) : '0';

    // Assessment Analysis
    const assessmentTypes = [
      { key: 'participationPortfolio', label: 'Participation/Portfolio', max: 10 },
      { key: 'tests', label: 'Tests', max: 30 },
      { key: 'presentation', label: 'Presentation', max: 10 },
      { key: 'midterm', label: 'Midterm', max: 20 },
      { key: 'final', label: 'Final Exam', max: 30 }
    ];

    const assessmentStats = assessmentTypes.map(type => {
      const typeScores = finalData.map(d => parseFloat(d[type.key as keyof typeof d] as string)).filter(s => !isNaN(s));
      const avg = typeScores.length > 0 ? (typeScores.reduce((a, b) => a + b, 0) / typeScores.length) : 0;
      return {
        ...type,
        avg: avg.toFixed(1),
        avgPercentage: safeFixed((avg / type.max) * 100)
      };
    });

    // Consistency Analysis
    const classAvgs = assessmentStats.reduce((acc, curr) => {
      acc[curr.key] = parseFloat(curr.avg);
      return acc;
    }, {} as Record<string, number>);

    const studentPerformance = finalData.map((d, idx) => {
      let aboveCount = 0;
      let belowCount = 0;
      let totalCategories = 0;

      assessmentTypes.forEach(type => {
        const score = parseFloat(d[type.key as keyof typeof d] as string);
        if (!isNaN(score)) {
          totalCategories++;
          if (score > classAvgs[type.key]) aboveCount++;
          else if (score < classAvgs[type.key]) belowCount++;
        }
      });

      return {
        name: filteredStudents[idx].name,
        id: filteredStudents[idx].id,
        aboveCount,
        belowCount,
        totalCategories,
        isHighPerformer: aboveCount >= 4,
        isLowPerformer: belowCount >= 4,
        totalScore: d.totalScore
      };
    });

    const highPerformers = studentPerformance.filter(p => p.isHighPerformer).sort((a, b) => parseFloat(b.totalScore) - parseFloat(a.totalScore));
    const lowPerformers = studentPerformance.filter(p => p.isLowPerformer).sort((a, b) => parseFloat(a.totalScore) - parseFloat(b.totalScore));
    
    // Average Performers are those close to the class average and not categorized as strictly high or low
    const avgScoreNum = parseFloat(avgScore) || 0;
    const avgPerformers = studentPerformance
      .filter(p => !p.isHighPerformer && !p.isLowPerformer)
      .sort((a, b) => Math.abs(parseFloat(a.totalScore) - avgScoreNum) - Math.abs(parseFloat(b.totalScore) - avgScoreNum));

    // Task Completion Analysis
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

      const completedCount = filteredStudents.filter(s => s.grades[fieldIdx] && s.grades[fieldIdx].trim() !== '').length;
      const pendingStudents = filteredStudents.filter(s => !(s.grades[fieldIdx] && s.grades[fieldIdx].trim() !== ''));
      const completionRate = totalStudents > 0 ? (completedCount / totalStudents) * 100 : 0;

      return {
        name: label,
        completed: completedCount,
        pending: totalStudents - completedCount,
        percentage: completionRate.toFixed(1),
        pendingList: pendingStudents.map(ps => ({ 
          name: ps.name, 
          id: ps.id, 
          email: `${ps.id}@asu.edu.om` // Default convention
        }))
      };
    });

    const averageCompletion = completionStats.reduce((acc, curr) => acc + parseFloat(curr.percentage), 0) / completionStats.length;

    return {
      totalStudents,
      passCount,
      failCount,
      passRate: ((passCount / totalStudents) * 100).toFixed(1),
      failRate: ((failCount / totalStudents) * 100).toFixed(1),
      avgScore,
      minScore,
      maxScore,
      faCount,
      gradeChartData,
      rangeChartData,
      grades,
      ranges,
      assessmentStats,
      highPerformers,
      lowPerformers,
      avgPerformers,
      statusCounts,
      genderStats,
      completionStats,
      averageCompletion: averageCompletion.toFixed(1),
      retentionRate: totalStudents > 0 ? ((statusCounts.pass + statusCounts.notPass + statusCounts.pst + statusCounts.ipI) / totalStudents * 100).toFixed(1) : '0.0'
    };
  }, [filteredStudents]);

  const atRiskDist = useMemo(() => calculateAtRiskDistribution(filteredStudents), [filteredStudents]);

  const handleExportPDF = () => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    
    doc.setFontSize(18);
    doc.setTextColor(30, 41, 59);
    doc.text('Statistics Analysis Report', pageWidth / 2, 20, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`${courseCode} - Section ${section}`, pageWidth / 2, 28, { align: 'center' });
    doc.text(`Generated on: ${new Date().toLocaleString()}`, pageWidth / 2, 34, { align: 'center' });

    // Summary Stats
    if (stats) {
      (doc as any).autoTable({
        startY: 45,
        head: [['Metric', 'Value']],
        body: [
          ['Total Students', stats.totalStudents],
          ['Pass Count', stats.passCount],
          ['Fail Count', stats.failCount],
          ['FA (Absence) Count', stats.faCount],
          ['Pass Rate', `${stats.passRate}%`]
        ],
        theme: 'grid',
        headStyles: { fillColor: [30, 41, 59] },
        styles: { fontSize: 9 }
      });
    }

    // Grade Distribution
    if (stats) {
      (doc as any).autoTable({
        startY: (doc as any).lastAutoTable.finalY + 10,
        head: [['Grade', 'Count', 'Percentage']],
        body: stats.gradeChartData.map(d => [d.name, d.value, `${d.percentage}%`]),
        theme: 'grid',
        headStyles: { fillColor: [37, 99, 235] },
        styles: { fontSize: 9 }
      });
    }

    doc.save(`Statistics_${courseCode}_Sec${section}.pdf`);
    showFeedback('export', 'Statistics report exported successfully');
  };

  // Redder No Students Found Row
  const NoStudentsFoundRow = ({ colSpan }: { colSpan: number }) => (
    <>
      <TableRow className="h-12 hover:bg-transparent border-b border-slate-100">
        <TableCell colSpan={colSpan} className="text-center font-black text-red-600 uppercase tracking-widest text-[10px]">
          No Students Found
        </TableCell>
      </TableRow>
      <TableRow className="h-12 hover:bg-transparent border-b border-slate-100">
        <TableCell colSpan={colSpan} className="text-center font-black text-red-600 uppercase tracking-widest text-[10px]">
          No Students Found
        </TableCell>
      </TableRow>
    </>
  );

  const renderNumericalContent = () => (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <div className="bg-slate-50 border border-slate-200 shadow-sm overflow-hidden mb-4">
                  <div className="p-2 border-b border-slate-100 bg-blue-50/20 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Activity className="w-3.5 h-3.5 text-blue-600" />
                      <h3 className="text-[10px] font-bold text-slate-900 uppercase tracking-widest">Section(s) Final Grades Analysis</h3>
                    </div>
                    <CopyButton 
                      title="Result Analysis" 
                      data={[{
                        Enrolled: stats.totalStudents,
                        'Pass Rate': `${stats.passRate}%`,
                        'Fail Rate': `${stats.failRate}%`,
                        'Avg Grade': stats.avgScore
                      }]} 
                    />
                  </div>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-[#00786f] hover:bg-[#00786f] border-none h-11">
                          <TableHead className="text-white font-bold text-[11px] uppercase h-11 text-center border-r border-white/15 tracking-wider">Enrolled</TableHead>
                          <TableHead className="text-white font-bold text-[11px] uppercase h-11 text-center border-r border-white/15 tracking-wider">Pass Rate</TableHead>
                          <TableHead className="text-white font-bold text-[11px] uppercase h-11 text-center border-r border-white/15 tracking-wider">Fail Rate</TableHead>
                          <TableHead className="text-white font-bold text-[11px] uppercase h-11 text-center tracking-wider">Avg Grade</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow className="hover:bg-white h-11 border-b border-slate-200">
                          <TableCell className="text-center py-2 text-[15px] font-courier font-black text-blue-600 border-r border-slate-100">{stats.totalStudents}</TableCell>
                          <TableCell className="text-center py-2 text-[15px] font-courier font-black text-emerald-600 border-r border-slate-100">{stats.passRate}%</TableCell>
                          <TableCell className="text-center py-2 text-[15px] font-courier font-black text-red-600 border-r border-slate-100">{stats.failRate}%</TableCell>
                          <TableCell className="text-center py-2 text-[15px] font-courier font-black text-indigo-600 border-r border-slate-100">{stats.avgScore}</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </div>
            <div className="bg-slate-50 border border-slate-200 shadow-sm overflow-hidden mb-4">
              <div className="p-2.5 border-b border-slate-100 bg-blue-50/20 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-600" />
                  <h3 className="text-[10px] font-bold text-slate-900 uppercase tracking-widest">Gender-Based Analysis</h3>
                </div>
                <CopyButton 
                  title="Gender Analysis" 
                  data={[
                    { Gender: 'Male', ...stats.genderStats.male },
                    { Gender: 'Female', ...stats.genderStats.female }
                  ]} 
                />
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-[#00786f] hover:bg-[#00786f] border-none h-11">
                      <TableHead className="text-white font-bold text-[11px] uppercase h-11 text-center border-r border-white/15">Gender</TableHead>
                      <TableHead className="text-white font-bold text-[11px] uppercase h-11 text-center border-r border-white/15">Total</TableHead>
                      <TableHead className="text-white font-bold text-[11px] uppercase h-11 text-center border-r border-white/15">Pass</TableHead>
                      <TableHead className="text-white font-bold text-[11px] uppercase h-11 text-center border-r border-white/15">Pass %</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow className="hover:bg-white h-11 border-b border-slate-200">
                      <TableCell className="text-center py-2 text-[15px] font-bold text-slate-900 border-r border-slate-100">Male</TableCell>
                      <TableCell className="text-center py-2 text-[15px] font-courier font-black text-slate-900 border-r border-slate-100">{stats.genderStats.male.total}</TableCell>
                      <TableCell className="text-center py-2 text-[15px] font-courier font-black text-green-600 border-r border-slate-100">{stats.genderStats.male.pass}</TableCell>
                      <TableCell className="text-center py-2 text-[15px] font-courier font-black text-green-600 border-r border-slate-100">
                        {stats.genderStats.male.total > 0 ? ((stats.genderStats.male.pass / stats.genderStats.male.total) * 100).toFixed(1) : '0.0'}%
                      </TableCell>
                    </TableRow>
                    <TableRow className="hover:bg-white h-11 border-b border-slate-200">
                      <TableCell className="text-center py-2 text-[15px] font-bold text-slate-900 border-r border-slate-100">Female</TableCell>
                      <TableCell className="text-center py-2 text-[15px] font-courier font-black text-slate-900 border-r border-slate-100">{stats.genderStats.female.total}</TableCell>
                      <TableCell className="text-center py-2 text-[15px] font-courier font-black text-green-600 border-r border-slate-100">{stats.genderStats.female.pass}</TableCell>
                      <TableCell className="text-center py-2 text-[15px] font-courier font-black text-green-600 border-r border-slate-100">
                        {stats.genderStats.female.total > 0 ? ((stats.genderStats.female.pass / stats.genderStats.female.total) * 100).toFixed(1) : '0.0'}%
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Consolidated Numerical Analysis Table */}
            <div className="col-span-1 xl:col-span-2 bg-slate-50 border border-slate-200 shadow-sm overflow-hidden mb-6">
              <div className="p-2.5 border-b border-slate-100 bg-blue-50/20 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-blue-600" />
                  <h3 className="text-[10px] font-bold text-slate-900 uppercase tracking-widest">Final Grades Analysis Summary</h3>
                </div>
                <CopyButton 
                  title="Numerical Analysis" 
                  data={[{
                    'No. of Students': stats.totalStudents,
                    'Highest Score': stats.maxScore,
                    'Class Average': stats.avgScore,
                    'Lowest Score': stats.minScore,
                    'Pass %': stats.passRate,
                    'Not Pass %': stats.failRate,
                    'FA %': (stats.statusCounts.fa / stats.totalStudents * 100).toFixed(1),
                    'WA %': (stats.statusCounts.waW / stats.totalStudents * 100).toFixed(1),
                    'IP %': (stats.statusCounts.ipI / stats.totalStudents * 100).toFixed(1),
                    'PST %': (stats.statusCounts.pst / stats.totalStudents * 100).toFixed(1)
                  }]} 
                />
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-[#00786f] hover:bg-[#00786f] border-none h-14">
                      <TableHead className="text-white font-bold text-[10px] uppercase h-14 text-center border-r border-white/15 leading-tight">No. of<br/>Students</TableHead>
                      <TableHead className="text-white font-bold text-[10px] uppercase h-14 text-center border-r border-white/15 leading-tight">Highest<br/>Score</TableHead>
                      <TableHead className="text-white font-bold text-[10px] uppercase h-14 text-center border-r border-white/15 leading-tight">Class<br/>Average</TableHead>
                      <TableHead className="text-white font-bold text-[10px] uppercase h-14 text-center border-r border-white/15 leading-tight">Lowest<br/>Score</TableHead>
                      <TableHead className="text-white font-bold text-[10px] uppercase h-14 text-center border-r border-white/15 leading-tight">Total Pass<br/>(%age)</TableHead>
                      <TableHead className="text-white font-bold text-[10px] uppercase h-14 text-center border-r border-white/15 leading-tight">Total Not Pass<br/>(%age)</TableHead>
                      <TableHead className="text-white font-bold text-[10px] uppercase h-14 text-center border-r border-white/15 leading-tight">Total R(s)<br/>(%age)</TableHead>
                      <TableHead className="text-white font-bold text-[10px] uppercase h-14 text-center border-r border-white/15 leading-tight">Total FA(s)<br/>(%age)</TableHead>
                      <TableHead className="text-white font-bold text-[10px] uppercase h-14 text-center border-r border-white/15 leading-tight">Total WA/W<br/>(%age)</TableHead>
                      <TableHead className="text-white font-bold text-[10px] uppercase h-14 text-center border-r border-white/15 leading-tight">Total IP/I<br/>(%age)</TableHead>
                      <TableHead className="text-white font-bold text-[10px] uppercase h-14 text-center border-r border-white/15 leading-tight">Total PST<br/>(%age)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats.totalStudents > 0 ? (
                      <TableRow className="hover:bg-white h-12 border-b border-slate-200">
                        <TableCell className="text-center py-2 text-[14px] font-courier font-black text-slate-900 border-r border-slate-100">{stats.totalStudents}</TableCell>
                        <TableCell className="text-center py-2 text-[14px] font-courier font-black text-blue-600 border-r border-slate-100">{stats.maxScore}</TableCell>
                        <TableCell className="text-center py-2 text-[14px] font-courier font-black text-slate-900 border-r border-slate-100">{stats.avgScore}</TableCell>
                        <TableCell className="text-center py-2 text-[14px] font-courier font-black text-red-600 border-r border-slate-100">{stats.minScore}</TableCell>
                        <TableCell className="text-center py-2 text-[14px] font-courier font-black text-emerald-600 border-r border-slate-100">{stats.passRate}%</TableCell>
                        <TableCell className="text-center py-2 text-[14px] font-courier font-black text-red-600 border-r border-slate-100">{stats.failRate}%</TableCell>
                        <TableCell className="text-center py-2 text-[14px] font-courier font-black text-amber-600 border-r border-slate-100">
                          {((stats.statusCounts.r / stats.totalStudents) * 100).toFixed(1)}%
                        </TableCell>
                        <TableCell className="text-center py-2 text-[14px] font-courier font-black text-red-800 border-r border-slate-100">
                          {((stats.statusCounts.fa / stats.totalStudents) * 100).toFixed(1)}%
                        </TableCell>
                        <TableCell className="text-center py-2 text-[14px] font-courier font-black text-slate-500 border-r border-slate-100">
                          {((stats.statusCounts.waW / stats.totalStudents) * 100).toFixed(1)}%
                        </TableCell>
                        <TableCell className="text-center py-2 text-[14px] font-courier font-black text-teal-600 border-r border-slate-100">
                          {((stats.statusCounts.ipI / stats.totalStudents) * 100).toFixed(1)}%
                        </TableCell>
                        <TableCell className="text-center py-2 text-[14px] font-courier font-black text-indigo-600 border-r border-slate-100">
                          {((stats.statusCounts.pst / stats.totalStudents) * 100).toFixed(1)}%
                        </TableCell>
                      </TableRow>
                    ) : <NoStudentsFoundRow colSpan={11} />}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Grid for Gender and Grade Summaries */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6 col-span-1 xl:col-span-2">

              {/* Grade Counts Summary */}
              <div className="bg-slate-50 border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-2.5 border-b border-slate-100 bg-blue-50/20 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-600" />
                    <h3 className="text-[10px] font-bold text-slate-900 uppercase tracking-widest">Grade Counts Summary</h3>
                  </div>
                  <CopyButton title="Grade Counts" data={stats.gradeChartData} />
                </div>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-[#00786f] hover:bg-[#00786f] border-none h-9">
                      <TableHead className="text-white font-bold text-[10px] uppercase h-9 border-r border-white/15">Grade</TableHead>
                      <TableHead className="text-white font-bold text-[10px] uppercase h-9 text-center border-r border-white/15">Count</TableHead>
                      <TableHead className="text-white font-bold text-[10px] uppercase h-9 text-center">Percentage</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats.gradeChartData.map((d) => (
                      <TableRow key={d.name} className="hover:bg-white h-8 border-b border-slate-200">
                        <TableCell className="text-center py-1.5 text-[13px] font-bold text-slate-700 border-r border-slate-100">{d.name}</TableCell>
                        <TableCell className="text-center py-1.5 text-[13px] font-courier font-black text-slate-900 border-r border-slate-100">{d.value}</TableCell>
                        <TableCell className="text-center py-1.5 text-[13px] font-courier font-bold text-slate-500">{d.percentage}%</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Grade Distribution Chart */}
              <div className="bg-slate-50 p-6 border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-blue-600" />
                    <h3 className="text-[10px] font-bold text-slate-900 uppercase tracking-widest">Grade Distribution Visualization</h3>
                  </div>
                  <CopyButton title="Grade Distribution" data={stats.gradeChartData} />
                </div>
                <motion.div 
                  key={activeTab}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5 }}
                  className="h-[250px] w-full"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.gradeChartData} margin={{ bottom: 20, left: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" fontSize={10} axisLine={true} tickLine={true}>
                        <Label value="Grade" offset={-10} position="insideBottom" fontSize={10} fontWeight="bold" fill="#64748b" />
                      </XAxis>
                      <YAxis fontSize={10} axisLine={true} tickLine={true}>
                        <Label value="Students" angle={-90} position="insideLeft" offset={10} fontSize={10} fontWeight="bold" fill="#64748b" />
                      </YAxis>
                      <RechartsTooltip 
                        cursor={{ fill: '#f8fafc' }}
                        content={({ active, payload, label }: any) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-white p-2.5 border border-slate-200 shadow-xl rounded-none">
                                <p className="text-[10px] font-black text-blue-900 uppercase tracking-widest mb-1.5 border-b border-slate-100 pb-1 flex items-center justify-between gap-4">
                                  <span>Grade {label}</span>
                                  <Award className="w-3 h-3 text-blue-600" />
                                </p>
                                <div className="space-y-1">
                                  <div className="flex items-center justify-between gap-4">
                                    <span className="text-xs font-bold text-slate-500 uppercase tracking-tighter">Count:</span>
                                    <span className="text-xs font-black text-slate-900">{payload[0].value} Students</span>
                                  </div>
                                  <div className="flex items-center justify-between gap-4">
                                    <span className="text-xs font-bold text-slate-500 uppercase tracking-tighter">Percentage:</span>
                                    <span className="text-xs font-black text-emerald-600">{payload[0].payload.percentage}%</span>
                                  </div>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar 
                        dataKey="value" 
                        radius={[2, 2, 0, 0]}
                        activeBar={{ stroke: '#00786f', strokeWidth: 1, fillOpacity: 0.9 }}
                        style={{ cursor: 'pointer' }}
                        shape={<AnimatedBarShape radius={[2, 2, 0, 0]} />}
                      >
                        {stats.gradeChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </motion.div>
              </div>
            </div>

            {/* Score Range Table */}
            <div className="bg-slate-100 border border-slate-300 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-100 bg-blue-50/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-blue-600" />
                  <h3 className="text-[10px] font-bold text-slate-900 uppercase tracking-widest">Score Range Summary</h3>
                </div>
                <CopyButton title="Score Range" data={stats.rangeChartData} />
              </div>
              <Table>
                <TableHeader>
                  <TableRow className="bg-[#00786f] hover:bg-[#00786f] border-none">
                    <TableHead className="text-white font-bold text-[11px] uppercase h-10 border-r border-white/15">Range</TableHead>
                    <TableHead className="text-white font-bold text-[11px] uppercase h-10 text-center border-r border-white/15">Student Count</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.rangeChartData.map((d) => (
                    <TableRow key={d.name} className="hover:bg-slate-50/50 border-b border-slate-200">
                      <TableCell className="text-xs font-bold text-slate-700 py-2 border-r border-slate-100">{d.name}</TableCell>
                      <TableCell className="text-center text-xs font-courier font-black text-slate-900 py-2 border-r border-slate-100">{d.value}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Score Range Analysis Chart */}
            <div className="bg-slate-100 p-6 border border-slate-300 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-blue-600" />
                  <h3 className="text-[10px] font-bold text-slate-900 uppercase tracking-widest">Score Performance Trend</h3>
                </div>
                <CopyButton title="Score Performance Trend" data={stats.rangeChartData} />
              </div>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={stats.rangeChartData} margin={{ bottom: 20, left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" fontSize={10} axisLine={true} tickLine={true}>
                      <Label value="Score Range" offset={-10} position="insideBottom" fontSize={10} fontWeight="bold" fill="#64748b" />
                    </XAxis>
                    <YAxis fontSize={10} axisLine={true} tickLine={true}>
                      <Label value="Students" angle={-90} position="insideLeft" offset={10} fontSize={10} fontWeight="bold" fill="#64748b" />
                    </YAxis>
                    <RechartsTooltip 
                      cursor={{ fill: '#f8fafc' }}
                      content={({ active, payload, label }: any) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-white p-2.5 border border-slate-200 shadow-xl rounded-none">
                              <p className="text-[10px] font-black text-blue-900 uppercase tracking-widest mb-1.5 border-b border-slate-100 pb-1 flex items-center justify-between gap-4">
                                <span>Range {label}</span>
                                <TrendingUp className="w-3 h-3 text-blue-600" />
                              </p>
                              <div className="space-y-1">
                                <div className="flex items-center justify-between gap-4">
                                  <span className="text-xs font-bold text-slate-500 uppercase tracking-tighter">Count:</span>
                                  <span className="text-xs font-black text-slate-900">{payload[0].value} Students</span>
                                </div>
                                <div className="flex items-center justify-between gap-4">
                                  <span className="text-xs font-bold text-slate-500 uppercase tracking-tighter">Percentage:</span>
                                  <span className="text-xs font-black text-emerald-600">{payload[0].payload.percentage}%</span>
                                </div>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="value" 
                      stroke="#2563eb" 
                      strokeWidth={3} 
                      dot={{ r: 4, fill: '#2563eb', strokeWidth: 2, stroke: '#fff' }}
                      activeDot={{ r: 6, strokeWidth: 0 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
    </div>
  );

  const renderAtRiskContent = () => (
    <div className="space-y-4">
            <div className="bg-slate-50 border border-slate-200 shadow-sm overflow-hidden text-center">
              <div className="p-2.5 border-b border-slate-100 bg-red-50/20 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600" />
                  <h3 className="text-[10px] font-bold text-slate-900 uppercase tracking-widest">At-Risk Distribution</h3>
                </div>
                <div className="flex items-center gap-4">
                  <CopyButton 
                    title="At-Risk Data" 
                    data={[{
                      Section: section,
                      Course: courseCode,
                      ZERO: atRiskDist.zero,
                      '1-5.5': atRiskDist.range1,
                      '6-11.5': atRiskDist.range2,
                      '12-16': atRiskDist.range3,
                      '16.5-20': atRiskDist.range4,
                      '21-24.5': atRiskDist.range5,
                      '25-27.5': atRiskDist.range6,
                      Total: atRiskDist.atRiskCount
                    }]} 
                  />
                  <div className="flex items-center gap-2">
                    <div className="bg-orange-50 px-2 py-1 border border-orange-100">
                      <span className="text-[9px] font-bold text-orange-700 uppercase tracking-wider whitespace-nowrap">FA(Absence): {stats.faCount}</span>
                    </div>
                    <div className="bg-red-50 px-2 py-1 border border-red-100">
                      <span className="text-[9px] font-bold text-red-700 uppercase tracking-wider whitespace-nowrap">Total At-Risk: {atRiskDist.atRiskCount}</span>
                    </div>
                  </div>
                </div>
              </div>
              <Table>
                <TableHeader>
                  <TableRow className="bg-[#00786f] hover:bg-[#00786f] border-none h-9">
                    <TableHead className="text-white font-bold text-[10px] uppercase h-9 border-r border-white/15 text-center">Section</TableHead>
                    <TableHead className="text-white font-bold text-[10px] uppercase h-9 border-r border-white/15 text-center">Course</TableHead>
                    <TableHead className="text-white font-bold text-[10px] uppercase text-center h-9 text-red-100 border-r border-white/15 text-center">ZERO</TableHead>
                    <TableHead className="text-white font-bold text-[10px] uppercase text-center h-9 text-red-100 border-r border-white/15 text-center">1-5.5</TableHead>
                    <TableHead className="text-white font-bold text-[10px] uppercase text-center h-9 text-red-100 border-r border-white/15 text-center">6-11.5</TableHead>
                    <TableHead className="text-white font-bold text-[10px] uppercase text-center h-9 text-red-100 border-r border-white/15 text-center">12-16</TableHead>
                    <TableHead className="text-white font-bold text-[10px] uppercase text-center h-9 border-r border-white/15 text-center">16.5-20</TableHead>
                    <TableHead className="text-white font-bold text-[10px] uppercase text-center h-9 border-r border-white/15 text-center">21-24.5</TableHead>
                    <TableHead className="text-white font-bold text-[10px] uppercase text-center h-9 border-r border-white/15 text-center">25-27.5</TableHead>
                    <TableHead className="text-white font-bold text-[10px] uppercase text-center h-9 bg-[#00786f] border-r border-white/15 text-center">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow className="hover:bg-white border-b border-slate-200 h-9">
                    <TableCell className="text-center py-1.5 text-[13px] font-bold text-slate-900 border-r border-slate-200">{section}</TableCell>
                    <TableCell className="text-center py-1.5 text-[13px] font-bold text-slate-900 border-r border-slate-200">{courseCode}</TableCell>
                    <TableCell className="text-center py-1.5 text-[13px] font-courier font-bold text-red-600 bg-red-50/10 border-r border-slate-200 text-center">{atRiskDist.zero}</TableCell>
                    <TableCell className="text-center py-1.5 text-[13px] font-courier font-bold text-red-600 bg-red-50/10 border-r border-slate-200 text-center">{atRiskDist.range1}</TableCell>
                    <TableCell className="text-center py-1.5 text-[13px] font-courier font-bold text-red-600 bg-red-50/10 border-r border-slate-200 text-center">{atRiskDist.range2}</TableCell>
                    <TableCell className="text-center py-1.5 text-[13px] font-courier font-bold text-red-600 bg-red-50/10 border-r border-slate-200 text-center">{atRiskDist.range3}</TableCell>
                    <TableCell className="text-center py-1.5 text-[13px] font-courier font-medium text-slate-600 border-r border-slate-200 text-center">{atRiskDist.range4}</TableCell>
                    <TableCell className="text-center py-1.5 text-[13px] font-courier font-medium text-slate-600 border-r border-slate-200 text-center">{atRiskDist.range5}</TableCell>
                    <TableCell className="text-center py-1.5 text-[13px] font-courier font-medium text-slate-600 border-r border-slate-200 text-center">{atRiskDist.range6}</TableCell>
                    <TableCell className="text-center py-1.5 text-[13px] font-courier font-bold text-white bg-red-600 border-r border-slate-200 text-center">{atRiskDist.atRiskCount}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            {/* At-Risk Chart */}
            <div className="bg-slate-100 p-6 border border-slate-300 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600" />
                <h3 className="text-[10px] font-bold text-slate-900 uppercase tracking-widest">Artist Trend</h3>
              </div>
              <motion.div 
                key={activeTab}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="h-[300px] w-full"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={[
                      { name: 'ZERO', value: atRiskDist.zero, percentage: safeFixed((atRiskDist.zero / (stats.totalStudents || 1)) * 100) },
                      { name: '1-5.5', value: atRiskDist.range1, percentage: safeFixed((atRiskDist.range1 / (stats.totalStudents || 1)) * 100) },
                      { name: '6-11.5', value: atRiskDist.range2, percentage: safeFixed((atRiskDist.range2 / (stats.totalStudents || 1)) * 100) },
                      { name: '12-16', value: atRiskDist.range3, percentage: safeFixed((atRiskDist.range3 / (stats.totalStudents || 1)) * 100) },
                      { name: '16.5-20', value: atRiskDist.range4, percentage: safeFixed((atRiskDist.range4 / (stats.totalStudents || 1)) * 100) },
                      { name: '21-24.5', value: atRiskDist.range5, percentage: safeFixed((atRiskDist.range5 / (stats.totalStudents || 1)) * 100) },
                      { name: '25-27.5', value: atRiskDist.range6, percentage: safeFixed((atRiskDist.range6 / (stats.totalStudents || 1)) * 100) },
                    ]}
                    margin={{ bottom: 20, left: 10 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" fontSize={10} axisLine={true} tickLine={true}>
                      <Label value="Score Range (0-27.5)" offset={-10} position="insideBottom" fontSize={10} fontWeight="bold" fill="#64748b" />
                    </XAxis>
                    <YAxis fontSize={10} axisLine={true} tickLine={true}>
                      <Label value="Students" angle={-90} position="insideLeft" offset={10} fontSize={10} fontWeight="bold" fill="#64748b" />
                    </YAxis>
                    <RechartsTooltip 
                      cursor={{ fill: '#f8fafc' }}
                      content={({ active, payload, label }: any) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-white p-2.5 border border-slate-200 shadow-xl rounded-none">
                              <p className="text-[10px] font-black text-red-700 uppercase tracking-widest mb-1.5 border-b border-slate-100 pb-1 flex items-center justify-between gap-4">
                                <span>Range {label}</span>
                                <AlertCircle className="w-3 h-3 text-red-600" />
                              </p>
                              <div className="space-y-1">
                                <div className="flex items-center justify-between gap-4">
                                  <span className="text-xs font-bold text-slate-500 uppercase tracking-tighter">Count:</span>
                                  <span className="text-xs font-black text-slate-900">{payload[0].value} Students</span>
                                </div>
                                <div className="flex items-center justify-between gap-4">
                                  <span className="text-xs font-bold text-slate-500 uppercase tracking-tighter">Section Share:</span>
                                  <span className="text-xs font-black text-red-600">{payload[0].payload.percentage}%</span>
                                </div>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="value" radius={[0, 0, 0, 0]} shape={<AnimatedBarShape radius={[0, 0, 0, 0]} />}>
                      {[
                        { name: 'ZERO', color: '#dc2626' },    // 0% - Red
                        { name: '1-5.5', color: '#ea580c' },  // 4%-20% - Orange-Red
                        { name: '6-11.5', color: '#f97316' }, // 22%-42% - Orange
                        { name: '12-16', color: '#f59e0b' },  // 44%-58% - Amber (towards 59%)
                        { name: '16.5-20', color: '#2563eb' }, // 60%-73% - Blue (start 60%)
                        { name: '21-24.5', color: '#0891b2' }, // 76%-89% - Cyan/Teal
                        { name: '25-27.5', color: '#16a34a' }, // 91%-100% - Green
                      ].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </motion.div>
            </div>
    </div>
  );

  const renderPerformanceContent = () => (
    <div className="space-y-6">
            {/* Faculty Performance Analysis Summary */}
            <div className="bg-white border-2 border-blue-100 p-6 shadow-sm overflow-hidden relative group hover:border-blue-300 transition-all duration-500">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 -mr-16 -mt-16 opacity-50 group-hover:scale-110 transition-transform duration-700" />
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-100">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-blue-900 uppercase tracking-widest">Faculty Performance Summary</h3>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Automated Instructional Effectiveness Report</p>
                  </div>
                  <div className="ml-auto">
                    <CopyButton 
                      title="Performance Summary" 
                      text={`Faculty Performance Summary - ${courseCode} (${section})

Class Mastery: ${stats.avgScore}% Average
Instructional Success: ${stats.passRate}% Pass Rate
Cohort Retention: ${stats.retentionRate}% (Non-FA/W)
KPI Rating: ${parseFloat(stats.passRate) >= 90 ? 'GOLD' : parseFloat(stats.passRate) >= 80 ? 'SILVER' : parseFloat(stats.passRate) >= 60 ? 'BRONZE' : 'STANDARD'}`} 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                  <div className="space-y-1">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Class Mastery</p>
                    <div className="flex items-baseline gap-2">
                      <p className="text-2xl font-black text-slate-900">{stats.avgScore}%</p>
                      <span className="text-[10px] font-bold text-blue-600 uppercase">Avg</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Instructional Success</p>
                    <div className="flex items-baseline gap-2">
                      <p className="text-2xl font-black text-emerald-600">{stats.passRate}%</p>
                      <span className="text-[10px] font-bold text-emerald-600 uppercase">Pass</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Cohort Retention</p>
                    <div className="flex items-baseline gap-2">
                      <p className="text-2xl font-black text-teal-600">{stats.retentionRate}%</p>
                      <span className="text-[10px] font-bold text-teal-600 uppercase">Non-FA/W</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">KPI Rating</p>
                    <div className="flex items-baseline gap-2">
                      <p className="text-2xl font-black text-amber-600 text-center">
                        {parseFloat(stats.passRate) >= 90 ? 'GOLD' : 
                         parseFloat(stats.passRate) >= 80 ? 'SILVER' : 
                         parseFloat(stats.passRate) >= 60 ? 'BRONZE' : 'STANDARD'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              {/* Assessment Performance Analysis Table */}
              <div className="bg-slate-50 border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-2.5 border-b border-slate-100 bg-blue-50/20 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BarChart2 className="w-4 h-4 text-blue-600" />
                    <h3 className="text-[10px] font-bold text-slate-900 uppercase tracking-widest">Performance Data</h3>
                  </div>
                  <CopyButton title="Performance Data" data={stats.assessmentStats} />
                </div>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-[#00786f] hover:bg-[#00786f] border-none h-11">
                      <TableHead className="text-white font-bold text-[11px] uppercase h-11 border-r border-white/15 tracking-wider">Assessment</TableHead>
                      <TableHead className="text-white font-bold text-[11px] uppercase h-11 text-center border-r border-white/15 tracking-wider">Avg (%)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats.assessmentStats.map((entry) => (
                      <TableRow key={entry.label} className="hover:bg-white border-b border-slate-200">
                        <TableCell className="px-4 py-2 text-xs font-bold text-slate-700 border-r border-slate-100 uppercase">{entry.label}</TableCell>
                        <TableCell className="text-center py-2 text-xs font-courier font-bold text-blue-600 border-r border-slate-100">{entry.avgPercentage}%</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Assessment Performance Chart */}
              <div className="bg-slate-100 p-6 border border-slate-300 shadow-sm space-y-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-amber-600" />
                  <h3 className="text-[10px] font-bold text-slate-900 uppercase tracking-widest">Assessment Performance Chart</h3>
                </div>
                <div className="h-[280px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={stats.assessmentStats} margin={{ top: 10, bottom: 20, left: 0, right: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="label" fontSize={9} axisLine={true} tickLine={true} />
                      <YAxis domain={[0, 100]} fontSize={9} axisLine={true} tickLine={true} />
                      <RechartsTooltip 
                        contentStyle={{ borderRadius: '0px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        formatter={(value: any) => [`${value}%`, 'Average Score']}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="avgPercentage" 
                        stroke="#1e3a8a" 
                        strokeWidth={3}
                        dot={(props: any) => {
                          const val = props.value;
                          const color = val < 50 ? '#ef4444' : // Red
                                      val < 65 ? '#f97316' : // Orange
                                      val < 75 ? '#3b82f6' : // Blue
                                      val < 85 ? '#0ea5e9' : // Light Blue
                                      '#10b981'; // Green
                          return (
                            <circle 
                              key={props.key}
                              cx={props.cx} 
                              cy={props.cy} 
                              r={5} 
                              fill={color} 
                              stroke="#fff" 
                              strokeWidth={2} 
                            />
                          );
                        }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Performance Performers Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-center">
              {/* High Performers */}
              <div className="bg-slate-100 border border-slate-300 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-blue-50/50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-blue-600" />
                    <h3 className="text-[10px] font-bold text-slate-900 uppercase tracking-widest">High Performers (Above Avg)</h3>
                  </div>
                  <CopyButton title="High Performers" data={stats.highPerformers.slice(0, 10).map(p => ({ Name: p.name, ID: p.id, Score: p.totalScore }))} />
                </div>
                <div className="max-h-[400px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-[#00786f] hover:bg-[#00786f] border-none h-11">
                        <TableHead className="text-left px-3 text-white font-bold text-[10px] uppercase h-11 border-r border-white/15 tracking-wider">Student Details</TableHead>
                        <TableHead className="text-white font-bold text-[10px] uppercase h-11 text-center border-r border-white/15 tracking-wider">Score</TableHead>
                        <TableHead className="text-white font-bold text-[10px] uppercase h-11 text-center border-r border-white/15 tracking-wider">Above Avg</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stats.highPerformers.length > 0 ? (
                        stats.highPerformers.slice(0, 5).map((p) => (
                          <TableRow key={p.id} className="hover:bg-white border-b border-slate-200">
                            <TableCell className="py-2 px-3 border-r border-slate-100 text-left">
                              <p className="text-xs font-bold text-slate-900 uppercase">{p.name}</p>
                              <p className="text-[10px] font-courier font-bold text-slate-500">{p.id}</p>
                            </TableCell>
                            <TableCell className="text-center text-xs font-courier font-bold text-emerald-600 py-2 border-r border-slate-100">{p.totalScore}</TableCell>
                            <TableCell className="text-center text-[11px] font-courier font-bold text-slate-500 py-2 border-r border-slate-100">{p.aboveCount}/{p.totalCategories}</TableCell>
                          </TableRow>
                        ))
                      ) : <NoStudentsFoundRow colSpan={3} />}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Average Performers */}
              <div className="bg-slate-100 border border-slate-300 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-blue-50/50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-600" />
                    <h3 className="text-[10px] font-bold text-slate-900 uppercase tracking-widest">Average Performers (Around Avg)</h3>
                  </div>
                  <CopyButton title="Average Performers" data={stats.avgPerformers.slice(0, 10).map(p => ({ Name: p.name, ID: p.id, Score: p.totalScore }))} />
                </div>
                <div className="max-h-[400px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-[#00786f] hover:bg-[#00786f] border-none h-11">
                        <TableHead className="text-left px-3 text-white font-bold text-[10px] uppercase h-11 border-r border-white/15 tracking-wider">Student Details</TableHead>
                        <TableHead className="text-white font-bold text-[10px] uppercase h-11 text-center border-r border-white/15 tracking-wider">Score</TableHead>
                        <TableHead className="text-white font-bold text-[10px] uppercase h-11 text-center border-r border-white/15 tracking-wider">Avg Dev</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stats.avgPerformers.length > 0 ? (
                        stats.avgPerformers.slice(0, 5).map((p) => (
                          <TableRow key={p.id} className="hover:bg-white border-b border-slate-200">
                            <TableCell className="py-2 px-3 border-r border-slate-100 text-left">
                              <p className="text-xs font-bold text-slate-900 uppercase">{p.name}</p>
                              <p className="text-[10px] font-courier font-bold text-slate-500">{p.id}</p>
                            </TableCell>
                            <TableCell className="text-center text-xs font-courier font-bold text-slate-700 py-2 border-r border-slate-100">{p.totalScore}</TableCell>
                            <TableCell className="text-center text-[11px] font-courier font-bold text-slate-500 py-2 border-r border-slate-100">
                              ±{safeFixed(Math.abs(parseFloat(p.totalScore) - (parseFloat(stats.avgScore) || 0)))}%
                            </TableCell>
                          </TableRow>
                        ))
                      ) : <NoStudentsFoundRow colSpan={3} />}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Low Performers */}
              <div className="bg-slate-100 border border-slate-300 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-blue-50/50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-blue-600" />
                    <h3 className="text-[10px] font-bold text-slate-900 uppercase tracking-widest">Low Performers (Below Avg)</h3>
                  </div>
                  <CopyButton title="Low Performers" data={stats.lowPerformers.slice(0, 10).map(p => ({ Name: p.name, ID: p.id, Score: p.totalScore }))} />
                </div>
                <div className="max-h-[400px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-[#00786f] hover:bg-[#00786f] border-none h-11">
                        <TableHead className="text-left px-3 text-white font-bold text-[10px] uppercase h-11 border-r border-white/15 tracking-wider">Student Details</TableHead>
                        <TableHead className="text-white font-bold text-[10px] uppercase h-11 text-center border-r border-white/15 tracking-wider">Score</TableHead>
                        <TableHead className="text-white font-bold text-[10px] uppercase h-11 text-center border-r border-white/15 tracking-wider">Below Avg</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stats.lowPerformers.length > 0 ? (
                        stats.lowPerformers.slice(0, 5).map((p) => (
                          <TableRow key={p.id} className="hover:bg-white border-b border-slate-200">
                            <TableCell className="py-2 px-3 border-r border-slate-100 text-left">
                              <p className="text-xs font-bold text-slate-900 uppercase">{p.name}</p>
                              <p className="text-[10px] font-courier font-bold text-slate-500">{p.id}</p>
                            </TableCell>
                            <TableCell className="text-center text-xs font-courier font-bold text-amber-600 py-2 border-r border-slate-100">{p.totalScore}</TableCell>
                            <TableCell className="text-center text-[11px] font-courier font-bold text-slate-500 py-2 border-r border-slate-100">{p.belowCount}/{p.totalCategories}</TableCell>
                          </TableRow>
                        ))
                      ) : <NoStudentsFoundRow colSpan={3} />}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>

            {/* Descriptive Analysis Report */}
            <div className="bg-slate-100 p-8 border border-slate-300 shadow-sm space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Descriptive Analysis Report</h3>
                <div className="flex items-center gap-4">
                  <CopyButton 
                    title="Descriptive Report" 
                    text={`Descriptive Analysis Report - ${courseCode} (${section})

Section Performance: ${
                      (parseFloat(stats.passRate) >= 90 || parseFloat(stats.avgScore) >= 85) ? 'Excellent' :
                      (parseFloat(stats.passRate) >= 80 || parseFloat(stats.avgScore) >= 75) ? 'Good' :
                      (parseFloat(stats.passRate) >= 55 || parseFloat(stats.avgScore) >= 65) ? 'Satisfactory' :
                      'Needs Attention'
                    }

A comprehensive analysis of the ${stats.totalStudents} enrolled students illustrates a clear performance trajectory for this section. The current passing rate stands at ${stats.passRate}%, which suggests a ${
                      parseFloat(stats.passRate) >= 85 ? 'highly successful mastery of the core competencies' :
                      parseFloat(stats.passRate) >= 70 ? 'solid understanding and engagement with the curriculum' :
                      'significant opportunity for instructional intervention and reinforcement'
                    }.

Qualitatively, the grade distribution reflects a ${
                      (stats.grades['A+'] || 0) + (stats.grades['A'] || 0) + (stats.grades['A-'] || 0) > stats.totalStudents * 0.3 ? 'top-heavy performance curve' :
                      (stats.grades['C'] || 0) + (stats.grades['C-'] || 0) > stats.totalStudents * 0.4 ? 'centered distribution' :
                      'varied academic range'
                    }. We observe that ${(stats.grades['A+'] || 0) + (stats.grades['A'] || 0) + (stats.grades['A-'] || 0)} students achieved high distinction (Excellent), while ${stats.failCount || 0} students currently fall below the required threshold for proficiency.

The statistical dispersion is captured by an average grade of ${stats.avgScore || '0.0'}, anchored by a high of ${stats.maxScore || '0.0'} and a low of ${stats.minScore || '0.0'}. This ${String((parseFloat(stats.maxScore) || 0) - (parseFloat(stats.minScore) || 0))} point spread indicates ${
                      (parseFloat(stats.maxScore) || 0) - (parseFloat(stats.minScore) || 0) > 40 ? 'a wide variance in student readiness and background knowledge' :
                      'a relatively cohesive academic standing across the cohort'
                    }.

Critical data points include ${stats.faCount} students (${safeFixed(stats.faCount / stats.totalStudents * 100)}%) with 'FA' (Failure due to Absence) status, representing a primary risk factor for overall section statistics. Furthermore, the at-risk population (scoring below 27.5/50) encompasses ${atRiskDist.atRiskCount} students, requiring immediate focused feedback sessions.

Gender Demographics & Comparative Outcomes:
Male Performance: Of the ${stats.genderStats.male.total} male students, ${stats.genderStats.male.pass} achieved a passing status (${stats.genderStats.male.total > 0 ? ((stats.genderStats.male.pass / stats.genderStats.male.total) * 100).toFixed(1) : 0}%). This demographic accounts for ${safeFixed(stats.genderStats.male.total / stats.totalStudents * 100)}% of the total population.
Female Performance: With ${stats.genderStats.female.total} enrolled female students and ${stats.genderStats.female.pass} passing (${stats.genderStats.female.total > 0 ? ((stats.genderStats.female.pass / stats.genderStats.female.total) * 100).toFixed(1) : 0}%), the cohort shows a ${safeFixed(Math.abs(((stats.genderStats.male.pass / (stats.genderStats.male.total || 1)) - (stats.genderStats.female.pass / (stats.genderStats.female.total || 1))) * 100))}% variance between gender-based performance metrics.`}                
                  />
                  <div className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest border-2 ${
                    (parseFloat(stats.passRate) >= 90 || parseFloat(stats.avgScore) >= 85) ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                    (parseFloat(stats.passRate) >= 80 || parseFloat(stats.avgScore) >= 75) ? 'bg-blue-50 text-blue-700 border-blue-200' :
                    (parseFloat(stats.passRate) >= 55 || parseFloat(stats.avgScore) >= 65) ? 'bg-amber-50 text-amber-700 border-amber-200' :
                    'bg-red-50 text-red-700 border-red-200'
                  }`}>
                    Section Performance: {
                      (parseFloat(stats.passRate) >= 90 || parseFloat(stats.avgScore) >= 85) ? 'Excellent' :
                      (parseFloat(stats.passRate) >= 80 || parseFloat(stats.avgScore) >= 75) ? 'Good' :
                      (parseFloat(stats.passRate) >= 55 || parseFloat(stats.avgScore) >= 65) ? 'Satisfactory' :
                      'Needs Attention'
                    }
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm text-slate-700 font-sans leading-relaxed">
                <div className="space-y-4">
                  <p>
                    A comprehensive analysis of the <strong>{stats.totalStudents}</strong> enrolled students illustrates a clear performance trajectory for this section. 
                    The current passing rate stands at <strong>{stats.passRate}%</strong>, which suggests a {
                      parseFloat(stats.passRate) >= 85 ? 'highly successful mastery of the core competencies' :
                      parseFloat(stats.passRate) >= 70 ? 'solid understanding and engagement with the curriculum' :
                      'significant opportunity for instructional intervention and reinforcement'
                    }.
                  </p>
                  <p>
                    Qualitatively, the grade distribution reflects a <strong>{
                      (stats.grades['A+'] || 0) + (stats.grades['A'] || 0) + (stats.grades['A-'] || 0) > stats.totalStudents * 0.3 ? 'top-heavy performance curve' :
                      (stats.grades['C'] || 0) + (stats.grades['C-'] || 0) > stats.totalStudents * 0.4 ? 'centered distribution' :
                      'varied academic range'
                    }</strong>. We observe that <strong>{(stats.grades['A+'] || 0) + (stats.grades['A'] || 0) + (stats.grades['A-'] || 0)}</strong> students achieved high distinction (Excellent), while <strong>{stats.failCount || 0}</strong> students currently fall below the required threshold for proficiency.
                  </p>
                </div>
                
                <div className="space-y-4">
                  <p>
                    The statistical dispersion is captured by an average grade of <strong>{stats.avgScore || '0.0'}</strong>, anchored by a high of <strong>{stats.maxScore || '0.0'}</strong> and a low of <strong>{stats.minScore || '0.0'}</strong>. 
                    This <strong>{String((parseFloat(stats.maxScore) || 0) - (parseFloat(stats.minScore) || 0))} point spread</strong> indicates {
                      (parseFloat(stats.maxScore) || 0) - (parseFloat(stats.minScore) || 0) > 40 ? 'a wide variance in student readiness and background knowledge' :
                      'a relatively cohesive academic standing across the cohort'
                    }.
                  </p>
                  <p>
                    Critical data points include <strong>{stats.faCount} students ({safeFixed(stats.faCount / stats.totalStudents * 100)}%)</strong> with 'FA' (Failure due to Absence) status, representing a primary risk factor for overall section statistics. 
                    Furthermore, the at-risk population (scoring below 27.5/50) encompasses <strong>{atRiskDist.atRiskCount}</strong> students, requiring immediate focused feedback sessions.
                  </p>
                </div>

                <div className="md:col-span-2 mt-2 p-6 bg-white border-2 border-slate-200 shadow-sm space-y-4 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-3 opacity-10">
                    <Users className="w-16 h-16 text-blue-900" />
                  </div>
                  <h4 className="font-black text-blue-900 text-[11px] uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Gender Demographics & Comparative Outcomes
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-2">
                    <div className="space-y-2">
                      <div className="flex justify-between items-baseline">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Male Performance</span>
                        <span className="text-lg font-black text-blue-600">{stats.genderStats.male.total > 0 ? ((stats.genderStats.male.pass / stats.genderStats.male.total) * 100).toFixed(1) : 0}%</span>
                      </div>
                      <p className="text-xs text-slate-600 leading-normal">
                        Of the <strong>{stats.genderStats.male.total}</strong> male students, <strong>{stats.genderStats.male.pass}</strong> achieved a passing status. This demographic accounts for <strong>{safeFixed(stats.genderStats.male.total / stats.totalStudents * 100)}%</strong> of the total population.
                      </p>
                    </div>
                    <div className="space-y-2 border-l border-slate-100 pl-8">
                      <div className="flex justify-between items-baseline">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Female Performance</span>
                        <span className="text-lg font-black text-emerald-600">{stats.genderStats.female.total > 0 ? ((stats.genderStats.female.pass / stats.genderStats.female.total) * 100).toFixed(1) : 0}%</span>
                      </div>
                      <p className="text-xs text-slate-600 leading-normal">
                        With <strong>{stats.genderStats.female.total}</strong> enrolled female students and <strong>{stats.genderStats.female.pass}</strong> passing, the cohort shows a <strong>{safeFixed(Math.abs(((stats.genderStats.male.pass / (stats.genderStats.male.total || 1)) - (stats.genderStats.female.pass / (stats.genderStats.female.total || 1))) * 100))}% variance</strong> between gender-based performance metrics.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
    </div>
  );

  const renderCompletionContent = () => (
    <div className="space-y-4">
            <div className="bg-slate-50 rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-2.5 border-b border-slate-100 bg-blue-50/20 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-blue-600" />
                  <h3 className="text-[10px] font-bold text-slate-900 uppercase tracking-widest">Completion Data</h3>
                </div>
                <div className="flex items-center gap-3">
                  <CopyButton title="Completion Data" data={stats.completionStats} />
                  <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 border border-emerald-100 uppercase tracking-tight">
                    Progress
                  </span>
                </div>
              </div>
              <Table>
                <TableHeader>
                  <TableRow className="bg-[#00786f] hover:bg-[#00786f] border-none h-11">
                    <TableHead className="text-white font-bold text-[11px] uppercase h-11 border-r border-white/15 tracking-wider">Assessment / Tasks</TableHead>
                    <TableHead className="text-white font-bold text-[11px] uppercase h-11 text-center border-r border-white/15 tracking-wider">Done</TableHead>
                    <TableHead className="text-white font-bold text-[11px] uppercase h-11 text-center border-r border-white/15 tracking-wider">Pending</TableHead>
                    <TableHead className="text-white font-bold text-[11px] uppercase h-11 text-center border-r border-white/15 tracking-wider">(%)</TableHead>
                    <TableHead className="text-white font-bold text-[11px] uppercase h-11 text-center border-r border-white/15 no-print tracking-wider">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.completionStats.map((task, i) => (
                    <TableRow key={i} className="hover:bg-white border-b border-slate-200">
                      <TableCell className="py-2 px-4 border-r border-slate-200 font-bold">
                        <div className="flex flex-col gap-1.5">
                          <p className="text-[11px] font-bold text-slate-700 uppercase leading-none tracking-tight">{task.name}</p>
                          <div className="h-1.5 w-full bg-red-400 overflow-hidden mt-0.5">
                            <div 
                              className="h-full bg-emerald-500 transition-all duration-1000"
                              style={{ width: `${task.percentage}%` }}
                            />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center py-2 text-xs font-courier font-black text-slate-900 border-r border-slate-200">{task.completed}</TableCell>
                      <TableCell className="text-center py-2 text-xs font-courier font-black text-red-600 border-r border-slate-200">{task.pending}</TableCell>
                      <TableCell className="text-center py-2 text-xs font-courier font-black text-emerald-600 border-r border-slate-200">{task.percentage}%</TableCell>
                      <TableCell className="text-center py-1 no-print">
                        {task.pending > 0 && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleOpenReminder(task)}
                            className="h-7 px-3 text-[9px] font-black text-blue-600 bg-white hover:bg-[#FFEE82] hover:text-blue-900 hover:border-[#FFEE82] border-2 border-slate-300 rounded-none transition-all shadow-sm active:scale-95"
                          >
                            REMIND
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-slate-100 border border-slate-300 shadow-sm p-6 flex flex-col items-center justify-center">
                <h3 className="text-[10px] font-bold text-slate-900 mb-6 uppercase tracking-widest">Overall Completion Visualization</h3>
                <div className="relative w-full aspect-square max-w-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Completed', value: parseFloat(stats.averageCompletion) || 0 },
                          { name: 'Pending', value: 100 - (parseFloat(stats.averageCompletion) || 0) }
                        ]}
                        innerRadius="70%"
                        outerRadius="100%"
                        paddingAngle={5}
                        dataKey="value"
                      >
                        <Cell fill="#10b981" />
                        <Cell fill="#ef4444" />
                        <Label 
                          value={`${stats.averageCompletion}%`} 
                          position="center" 
                          style={{ fontSize: '24px', fontWeight: '900', fill: '#1e293b' }}
                        />
                      </Pie>
                      <RechartsTooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="lg:col-span-2 bg-slate-100 p-8 border border-slate-300 shadow-sm space-y-4 h-full">
                <h3 className="text-[10px] font-bold text-slate-900 uppercase tracking-widest border-l-4 border-emerald-500 pl-4 py-1">Completion Insights</h3>
                <p className="text-sm text-slate-700 leading-relaxed font-sans">
                  The overall completion rate for all assessments across this section is <strong className="text-emerald-700 font-bold">{stats.averageCompletion}%</strong>. 
                </p>
                <div className="p-4 bg-emerald-50 border border-emerald-100">
                  <p className="text-xs text-emerald-800 leading-relaxed italic">
                    High completion rates generally correlate with better academic outcomes.
                  </p>
                </div>
              </div>
            </div>
    </div>
  );

  return (
    <div className="flex flex-col h-screen w-full bg-slate-100 pb-5 no-print">
      <Helmet>
        <title>GMS | Grade Management System</title>
      </Helmet>
      {/* 
          Standardized Printing Wrapper 
          This table structure ensures the header repeats on every printed page.
      */}
      <div className="hidden print:block w-full">
        <table className="print-wrapper-table">
          <thead className="print-header-row">
            <tr>
              <td>
                <div className="w-full px-10 py-8 bg-white border-b-4 border-blue-900 mb-8">
                  <div className="grid grid-cols-[auto_1fr_auto] items-center gap-16">
                    <ClfsLogo className="w-56 h-auto max-h-20 object-contain" />
                    <div className="flex flex-col items-center text-center">
                      <h1 className="text-xl font-black text-blue-900 uppercase tracking-[0.3em] leading-tight mb-2">GMS</h1>
                      <h2 className="text-sm font-bold text-blue-700 uppercase tracking-[0.2em] mb-4">Grade Management System</h2>
                    </div>
                    <div className="text-right min-w-[320px]">
                      <div className="space-y-2">
                        <div className="flex flex-col">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">COURSE / CODE</p>
                          <p className="text-base font-black text-blue-900 uppercase tracking-tight truncate max-w-[300px]">
                            {getCourseLabel(courseCode)} ({courseCode})
                          </p>
                        </div>
                        <div className="h-px bg-slate-100 my-1" />
                        <div className="flex justify-between items-center">
                          <div className="text-left">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">SECTION</p>
                            <p className="text-base font-black text-slate-900">{section}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">INSTRUCTOR</p>
                            <p className="text-base font-black text-slate-900">
                              {(() => {
                                const fullText = cleanInstructorText(user?.fullName || 'Administrator');
                                const degreeMatch = fullText.match(/(Bachelor|Diploma|Education|Foundation|Master|Doctorate|Pre-Master|Pre-Session|BSc|BA|BEng|LLB|MA|MSc|MBA|PhD).*$/i);
                                return degreeMatch ? degreeMatch[0] : fullText;
                              })()}
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
          <tbody>
          <tr>
            <td>
              <div className="print-content-container">
                {/* Section 1: Numerical */}
                <div className="p-8">
                  <div className="mb-8 border-b-2 border-slate-200 pb-2">
                    <h2 className="text-2xl font-black text-slate-900 uppercase tracking-widest italic">Section 1: Final Grades Analysis Report</h2>
                  </div>
                  {renderNumericalContent()}
                </div>

                {/* Section 2: At-Risk */}
                <div className="page-break" />
                <div className="p-8">
                  <div className="mb-8 border-b-2 border-slate-200 pb-2">
                    <h2 className="text-2xl font-black text-slate-900 uppercase tracking-widest italic">Section 2: At-Risk Distribution Report</h2>
                  </div>
                  {renderAtRiskContent()}
                </div>

                {/* Section 3: Performance */}
                <div className="page-break" />
                <div className="p-8">
                  <div className="mb-8 border-b-2 border-slate-200 pb-2">
                    <h2 className="text-2xl font-black text-slate-900 uppercase tracking-widest italic">Section 3: Performance Analytics Sheet</h2>
                  </div>
                  {renderPerformanceContent()}
                </div>

                {/* Section 4: Completion */}
                <div className="page-break" />
                <div className="p-8">
                  <div className="mb-8 border-b-2 border-slate-200 pb-2">
                    <h2 className="text-2xl font-black text-slate-900 uppercase tracking-widest italic">Section 4: Syllabus Completion Report</h2>
                  </div>
                  {renderCompletionContent()}
                </div>
              </div>
            </td>
          </tr>
        </tbody>
        </table>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-screen w-full bg-white no-print">


      <div className="px-10 py-2 w-full shrink-0 no-print bg-gradient-to-r from-teal-850 via-[#00786f] to-teal-900 border-b border-teal-950/25 flex items-center justify-between h-[52px]">
          <div className="flex items-center gap-6 shrink-0">
            <div className="flex items-center gap-3">
              <Calculator className="w-5 h-5 text-white" />
              <h1 className="text-lg font-sans font-black italic text-white leading-none uppercase tracking-tighter">Statistical Analysis</h1>
            </div>

            <TabsList className="bg-black/15 p-1 rounded-lg border border-white/5 shadow-inner flex items-center gap-1 no-print">
              <TabsTrigger 
                value="raw" 
                className="py-1 px-4 text-[10px] h-[28px] font-bold uppercase tracking-widest transition-all rounded-md text-teal-100 data-active:bg-[#FFEE82] data-active:text-teal-950 data-active:font-semibold hover:text-white"
              >
                Numerical
              </TabsTrigger>
              <TabsTrigger 
                value="atrisk" 
                className="py-1 px-4 text-[10px] h-[28px] font-bold uppercase tracking-widest transition-all rounded-md text-teal-100 data-active:bg-[#FFEE82] data-active:text-teal-950 data-active:font-semibold hover:text-white"
              >
                At-Risk
              </TabsTrigger>
              <TabsTrigger 
                value="performance" 
                className="py-1 px-4 text-[10px] h-[28px] font-bold uppercase tracking-widest transition-all rounded-md text-teal-100 data-active:bg-[#FFEE82] data-active:text-teal-950 data-active:font-semibold hover:text-white"
              >
                Performance
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex items-center gap-3 ml-auto grow justify-end">
            <TabsList className="bg-black/15 p-1 rounded-lg border border-white/5 shadow-inner flex items-center justify-end gap-1 no-print">
              <TabsTrigger 
                value="completion" 
                className="py-1 px-4 text-[10px] h-[28px] font-bold uppercase tracking-widest transition-all rounded-md text-teal-100 data-active:bg-[#FFEE82] data-active:text-teal-950 data-active:font-semibold hover:text-white"
              >
                Completion
              </TabsTrigger>
            </TabsList>
            
            <div className="h-6 w-px bg-white/10 mx-1" />
            
            <Button 
                onClick={() => {
                  const avgGrade = parseFloat(stats.avgScore);
                  const isBelowTarget = avgGrade < 70;
                  
                  // Simple information display
                  const simpleStatsInfo = `No. of Sections: 1\nAverage Grades of Sections: ${stats.avgScore}%`;

                  const piComment = !isBelowTarget 
                    ? "The PI has been achieved." 
                    : "The PI has not been achieved.";

                  const cerExplanation = isBelowTarget
                    ? `The overall average numeric grade is ${stats.avgScore}%, which is below the 70% target. This shortfall is primarily caused by assessment difficulties encountered in advanced modules, inconsistent attendance patterns, frequent tardiness, low classroom participation, students who are repeaters, students with a poor background in Math, lack of focus, and excessive mobile usage during sessions.`
                    : "The PI has been achieved as the average grade meets the target criteria.";

                  const cerRecommendations = isBelowTarget
                    ? "To address the observed performance challenges, I recommend the following: 1) Implementing a structured attendance monitoring and intervention system, 2) Conducting targeted tutorials to overcome assessment difficulties in advanced modules, 3) Incentivizing classroom participation to boost engagement, and 4) Providing academic support and guidance for students struggling with foundational Math or behavioral issues, such as tardiness, focus, or mobile usage."
                    : "The achievement is satisfactory. Continue with the current teaching methodology and monitor student progress regularly.";

                  const cerOverallView = "The course content and assessments are generally sound. Future planning will focus on improving student engagement and participation to ensure consistent achievement of performance indicators across all sections.";

                  setCerSections([
                    { title: "Statistical Analysis", content: simpleStatsInfo },
                    { title: "Comments", content: piComment },
                    { title: "Explanation for level of achievement below target", content: cerExplanation },
                    { title: "Instructor recommendations to resolve low achievement", content: cerRecommendations },
                    { title: "Overall instructor view and plans for improvement", content: cerOverallView },
                  ]);
                  setIsCerDialogOpen(true);
                }}
                className="h-[32px] px-4 text-[11px] font-bold uppercase tracking-widest gap-2 bg-[#FFEE82] text-teal-950 border border-transparent hover:bg-yellow-300 transition-all shadow hover:shadow-md active:scale-95 rounded-md cursor-pointer"
                title="Course Evaluation Report"
              >
              CER
            </Button>
            
            <div className="h-6 w-px bg-white/10 mx-1" />

            <Button 
              variant="outline" 
              onClick={() => {
                onBack(); 
              }}
              className="h-[32px] px-4 text-[11px] font-bold uppercase tracking-wider gap-2 bg-white/10 text-white border border-white/10 hover:bg-white/20 transition-all shadow-xs active:scale-95 rounded-md cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              Return to editor
            </Button>
          </div>
      </div>

      {/* Main Container Wrapper */}
      <div className="flex-1 min-h-0 flex flex-col mt-0 bg-slate-100">
        <Dialog open={isCerDialogOpen} onOpenChange={setIsCerDialogOpen}>
          <DialogContent className="max-w-6xl w-[95vw] lg:max-w-6xl xl:max-w-7xl max-h-[90vh] flex flex-col">
            <DialogHeader className="shrink-0">
              <DialogTitle className="text-xl font-black uppercase tracking-tighter italic text-blue-900">
                Course Evaluation Report (CER)
              </DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto pr-2 space-y-6 my-4">
              {cerSections.map((section, idx) => (
                <div key={idx} className="relative group">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-500">
                      {section.title}
                    </h4>
                    <Button 
                      size="sm"
                      variant="outline"
                      className="h-7 px-2 text-[10px] font-bold uppercase gap-1 hover:bg-blue-50 border-slate-200"
                      onClick={() => {
                        navigator.clipboard.writeText(section.content);
                        toast.success(`${section.title} copied!`);
                      }}
                    >
                      <Copy className="w-3 h-3" />
                      Copy
                    </Button>
                  </div>
                  <div className="bg-slate-50 p-4 border border-slate-200 text-xs font-mono whitespace-pre-wrap rounded-sm shadow-sm transition-all group-hover:border-blue-200">
                    {section.content}
                  </div>
                </div>
              ))}
            </div>
            <DialogFooter className="shrink-0 border-t pt-4">
              <Button 
                variant="outline"
                className="font-black uppercase tracking-widest text-[11px] h-9 border-2 border-slate-300"
                onClick={() => setIsCerDialogOpen(false)}
              >
                Close
              </Button>
              <Button 
                className="font-black uppercase tracking-widest text-[11px] h-9 bg-blue-900"
                onClick={() => {
                  const fullText = cerSections.map(s => `${s.title}:\n${s.content}`).join('\n\n');
                  navigator.clipboard.writeText(fullText);
                  toast.success("Full report copied to clipboard!");
                }}
              >
                Copy Full Report
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <div className="bg-white border border-slate-200 shadow-xl overflow-hidden relative flex flex-col h-full">
          {/* Simple Header (Matching GradeTable) */}
          <div className="w-full px-10 py-6 bg-white border-b border-slate-100 shrink-0">
            <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr_auto] items-center gap-12">
              <div className="flex items-center justify-center min-w-[260px] h-[120px]">
                <ClfsLogo className="w-64 h-auto max-h-28 object-contain" />
              </div>

              <div className="flex flex-col items-center justify-center text-center">
                <h1 className="text-base md:text-lg font-black text-blue-900 uppercase tracking-[0.25em] whitespace-nowrap leading-none">
                  A'Sharqiyah University
                </h1>
                <h2 className="text-[10px] md:text-xs font-bold text-blue-700 uppercase tracking-[0.15em] mt-3 whitespace-nowrap leading-none">
                  Center For Language and Foundation Studies
                </h2>
                
                {/* Dynamic Title Implementation */}
                <div className="mt-4 w-full flex justify-center">
                  <h3 className="text-xs font-black text-blue-800 uppercase tracking-[0.2em] italic">
                    <TabsContent value="raw" className="mt-0">Numerical Analysis Report</TabsContent>
                    <TabsContent value="atrisk" className="mt-0">At-Risk Distribution Report</TabsContent>
                    <TabsContent value="performance" className="mt-0">Performance Analytics Sheet</TabsContent>
                    <TabsContent value="completion" className="mt-0">Syllabus Completion Report</TabsContent>
                  </h3>
                </div>

                <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.1em] mt-3">
                  {SEMESTER_OPTIONS.find(s => s.value === semester)?.label || semester}
                </span>
              </div>

              <div className="flex flex-col min-w-[420px] justify-center h-[120px]">
                <div className="flex items-center justify-between pb-3 mb-3 border-b-2 border-slate-100">
                  <div className="flex-1">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1.5">Instructor Name</p>
                    <p className="text-base font-black text-slate-900 leading-tight">
                      {(() => {
                        const fullText = cleanInstructorText(user?.fullName || 'Administrator');
                        const degreeMatch = fullText.match(/(Bachelor|Diploma|Education|Foundation|Master|Doctorate|Pre-Master|Pre-Session|BSc|BA|BEng|LLB|MA|MSc|MBA|PhD).*$/i);
                        return degreeMatch ? degreeMatch[0] : fullText;
                      })()}
                    </p>
                  </div>
                  <div className="relative w-48 no-print shrink-0">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input 
                      placeholder="Search students..." 
                      className="pl-10 h-9 text-xs bg-slate-50 shadow-none border-slate-200 focus:border-blue-400 transition-all focus:bg-white rounded-none"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-0">
                  <div className="flex flex-col flex-1">
                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-0.5 leading-none">Course Title</span>
                    <span className="font-black text-blue-900 text-[9px] uppercase leading-tight truncate max-w-[220px]">{getCourseLabel(courseCode)}</span>
                  </div>
                  <div className="w-px h-5 bg-slate-200 mx-4" />
                  <div className="text-center">
                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-0.5 block leading-none">SEC</span>
                    <span className="font-black text-slate-900 text-[11px] tracking-tighter">{section}</span>
                  </div>
                  <div className="w-px h-5 bg-slate-200 mx-4" />
                  <div className="text-center">
                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-0.5 block leading-none">Code</span>
                    <span className="font-black text-slate-700 text-[9px] tracking-tight">{courseCode}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-auto p-4 pt-0 scrollbar-hide">
              <TabsContent value="raw" className="mt-4 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {renderNumericalContent()}
              </TabsContent>
              <TabsContent value="summative" className="mt-4 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {renderNumericalContent()}
              </TabsContent>
              <TabsContent value="final" className="mt-4 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {renderNumericalContent()}
              </TabsContent>
          <TabsContent value="atrisk" className="mt-4 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {renderAtRiskContent()}
          </TabsContent>
          <TabsContent value="performance" className="mt-4 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {renderPerformanceContent()}
          </TabsContent>
          <TabsContent value="completion" className="mt-4 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {renderCompletionContent()}
          </TabsContent>
        </div>
      </div>
    </div>
  </div>

      {/* Reminder Dialog */}
      <Dialog open={isReminderDialogOpen} onOpenChange={setIsReminderDialogOpen}>
        <DialogContent className="sm:max-w-[550px] bg-white border-none shadow-2xl p-0 overflow-hidden">
          <div className="bg-emerald-600 p-5 text-white">
            <DialogHeader>
              <DialogTitle className="text-xl font-black flex items-center gap-3 uppercase tracking-tight">
                <Mail className="w-6 h-6" />
                Deadline Reminder
              </DialogTitle>
              <DialogDescription className="text-emerald-100 font-medium text-xs">
                Sending reminder for: <strong className="text-white">{selectedTask?.name}</strong>
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="p-5 space-y-4">
            <div className="space-y-1.5">
              <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest pl-1">Batch Recipients ({selectedTask?.pendingList.length} students)</label>
              <div className="max-h-[60px] overflow-y-auto p-2 bg-slate-50 border border-slate-200 text-[9px] font-mono text-slate-600 grid grid-cols-2 gap-1 font-bold">
                {selectedTask?.pendingList.map((s: any, i: number) => (
                  <div key={i} className="truncate">{s.email}</div>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest pl-1">Email Message Content</label>
              <textarea 
                value={reminderMessage}
                onChange={(e) => setReminderMessage(e.target.value)}
                className="w-full h-32 p-3 bg-slate-50 border-2 border-slate-200 text-sm text-slate-800 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50/50 transition-all resize-none font-medium leading-relaxed"
              />
            </div>
            
            <div className="flex items-start gap-2.5 p-3 bg-amber-50 border border-amber-100 italic text-[10px] text-amber-700">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <p>Note: This will send individual emails using Resend email service.</p>
            </div>
          </div>

          <DialogFooter className="p-5 pt-0 flex gap-3">
            <Button 
              variant="outline" 
              onClick={() => setIsReminderDialogOpen(false)}
              className="flex-1 h-12 font-bold border-2 border-slate-200 bg-white text-slate-700 hover:bg-[#FFEE82] hover:border-[#FFEE82] hover:text-blue-900 transition-all shadow-sm"
            >
              CANCEL
            </Button>
            <Button 
              onClick={handleSendReminders}
              disabled={isSending}
              className="flex-[2] h-12 font-bold bg-[#FFEE82] text-blue-900 hover:bg-[#FFEE82]/90 border-2 border-[#FFEE82] shadow-lg shadow-emerald-100 transition-all active:scale-95 disabled:opacity-70"
            >
              {isSending ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  SENDING...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5 mr-2" />
                  SEND REMINDERS
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </Tabs>
    </div>
  );
}
