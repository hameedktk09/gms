import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User, UserRole, AllCoursesData, SectionData, StudentData, RegistrationRequest } from '@/src/types';
import { cn } from '@/lib/utils';
import {
  Users, 
  UserPlus, 
  Trash2, 
  CheckCircle2, 
  KeyRound, 
  ChevronRight,
  BookOpen,
  Calculator,
  Cpu,
  Search,
  FileText,
  Copy,
  ExternalLink,
  Eye,
  EyeOff
} from 'lucide-react';
import { getCourseReportSummary, calculateFinalValues, getStudentStatus } from '@/src/lib/grade-utils';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from "sonner";
import { ClfsLogo } from './ClfsLogo';
import { cleanInstructorText } from './GradeTable';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface AdminDashboardProps {
  allUsers: Record<string, User>;
  allData: AllCoursesData;
  currentUserRole?: UserRole;
  currentUsername?: string;
  currentSemester?: string;
  onAddUser: (user: User) => void;
  onImportUsers: (users: Record<string, User>) => void;
  onDeleteUser: (username: string) => void;
  onApproveUser: (username: string) => void;
  onResetPassword: (username: string, newPass: string) => void;
  onUpdateSectionData: (key: string, data: SectionData) => void;
  onPrintBooklet: (semester: string) => void;
  onClose: () => void;
  registrationRequests?: RegistrationRequest[];
  onApproveRequest?: (requestId: string, chosenUsername?: string, chosenPassword?: string) => void;
  onRejectRequest?: (requestId: string) => void;
  onRemoveRequest?: (requestId: string) => void;
  isPageLayout?: boolean;
  onLogout?: () => void;
  onOpenGradesForInstructor?: (username: string, subject: string) => void;
}

export function AdminDashboard({ 
  allUsers, 
  allData,
  currentUserRole,
  currentUsername,
  currentSemester = 'Fall',
  onAddUser, 
  onImportUsers,
  onDeleteUser, 
  onApproveUser, 
  onResetPassword,
  onUpdateSectionData,
  onPrintBooklet,
  onClose,
  registrationRequests = [],
  onApproveRequest,
  onRejectRequest,
  onRemoveRequest,
  isPageLayout = false,
  onLogout,
  onOpenGradesForInstructor
}: AdminDashboardProps) {
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [emailPrefix, setEmailPrefix] = useState('');
  const [password, setPassword] = useState('');
  const [subject, setSubject] = useState('English');
  const [activeTab, setActiveTab] = useState<string>('English');
  const [instructorSearch, setInstructorSearch] = useState('');
  const [isCerDialogOpen, setIsCerDialogOpen] = useState(false);
  const [cerSections, setCerSections] = useState<{title: string, content: string}[]>([]);
  const [generatedPassword, setGeneratedPassword] = useState<{username: string, fullName: string, pass: string} | null>(null);
  
  const [showUsername, setShowUsername] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // States for registration request approval
  const [selectedRequest, setSelectedRequest] = useState<RegistrationRequest | null>(null);
  const [customUsername, setCustomUsername] = useState('');
  const [customPassword, setCustomPassword] = useState('');
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);

  const pendingRequestsCount = registrationRequests.filter(r => r.status === 'pending').length;

  const [usernameManuallyEdited, setUsernameManuallyEdited] = useState(false);
  const [requestToRemove, setRequestToRemove] = useState<string | null>(null);
  const [instructorToDelete, setInstructorToDelete] = useState<string | null>(null);
  const [argLink, setArgLink] = useState(() => {
    let saved = localStorage.getItem('clfs_arg_link');
    if (saved === 'https://aistudio.google.com/apps/9b17021e-10b9-4481-af0d-13c4c5136811?showPreview=true&showAssistant=true') {
      saved = 'https://aistudio.google.com/apps/9b17021e-10b9-4481-af0d-13c4c5136811?showPreview=true&showAssistant=true&fullscreenApplet=true';
      localStorage.setItem('clfs_arg_link', saved || '');
    }
    return saved || 'https://aistudio.google.com/apps/9b17021e-10b9-4481-af0d-13c4c5136811?showPreview=true&showAssistant=true&fullscreenApplet=true';
  });

  const handleEmailPrefixChange = (val: string) => {
    setEmailPrefix(val);
    if (!usernameManuallyEdited) {
      // Suggest the username: their name (prefix) before @asu.edu.om
      setUsername(val.toLowerCase().replace(/[^a-zA-Z0-9]/g, ''));
    }
  };

  const handleUsernameChange = (val: string) => {
    setUsername(val);
    setUsernameManuallyEdited(true);
  };

  const getFilteredAllData = () => {
    const filtered: AllCoursesData = {};
    const userObj = currentUsername ? allUsers[currentUsername] : null;

    Object.entries(allData).forEach(([key, section]) => {
      const courseName = (section.formData.courseTitle || section.formData.course || '').trim();
      
      if (courseName === '' || !courseName.toLowerCase().includes('english')) {
          return;
      }

      if (currentUserRole !== 'admin') {
        if (!userObj) return;
        const userFullName = cleanInstructorText(userObj.fullName || '').trim().toLowerCase();
        const userName = (userObj.username || '').trim().toLowerCase();
        const userEmail = (userObj.email || '').trim().toLowerCase();
        const instructorField = cleanInstructorText(section.formData.instructor || '').trim().toLowerCase();

        if (
          instructorField !== userFullName && 
          instructorField !== userName && 
          (!userEmail || instructorField !== userEmail)
        ) {
          return;
        }
      }
      filtered[key] = section;
    });
    
    return filtered;
  };



  const generateSecurePassword = () => {
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+";
    const length = 12;
    let retVal = "";
    const values = new Uint32Array(length);
    window.crypto.getRandomValues(values);
    for (let i = 0; i < length; i++) {
        retVal += charset[values[i] % charset.length];
    }
    return retVal;
  };

  const handleResetPassword = (u: User) => {
    const newPass = generateSecurePassword();
    onResetPassword(u.username!, newPass);
    setGeneratedPassword({ username: u.username!, fullName: u.fullName, pass: newPass });
    toast.success(`Password reset for ${u.fullName}`);
  };

  const handleAddInstructor = () => {
    if (!fullName || !username || !password || !emailPrefix) {
      toast.error("Please fill in all fields");
      return;
    }
    if (allUsers[username]) {
      toast.error("Username already exists");
      return;
    }

    const fullEmail = emailPrefix.trim().toLowerCase() + "@asu.edu.om";

    onAddUser({
      uid: Math.random().toString(36).substr(2, 9),
      email: fullEmail,
      username,
      fullName,
      password,
      subject,
      approved: true,
      role: 'instructor',
      mustChangePassword: true
    });

    setFullName('');
    setUsername('');
    setEmailPrefix('');
    setPassword('');
    setUsernameManuallyEdited(false);
    toast.success(`Instructor ${fullName} added successfully`);
  };

  const instructors = Object.values(allUsers).filter(u => u.role === 'instructor' && u.subject === 'English');
  const filteredInstructors = instructors.filter(u => {
    // If instructor, only see themselves
    if (currentUserRole === 'instructor' && u.username !== currentUsername) {
        return false;
    }
    const matchesSubject = u.subject === activeTab;
    const matchesSearch = 
      u.fullName.toLowerCase().includes(instructorSearch.toLowerCase()) || 
      u.username?.toLowerCase().includes(instructorSearch.toLowerCase());
    return matchesSubject && matchesSearch;
  });

  const contentBody = (
    <div className={cn(
      "bg-white flex flex-col overflow-hidden w-full",
      isPageLayout ? "shadow-lg border border-slate-200 rounded-xl" : "h-full"
    )}>
      <div className="bg-slate-900 p-6 text-white flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-4">
          <div className="p-1">
            <ClfsLogo className="w-40 h-10 object-contain" />
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-teal-600 flex items-center justify-center rounded-lg shadow-inner">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold font-serif italic text-teal-100">
                {currentUserRole === 'admin' ? 'Admin Dashboard' : 'Instructor Dashboard'}
              </h2>
              <p className="text-slate-400 text-[10px] uppercase tracking-[0.2em] font-bold">
                {currentUserRole === 'admin' ? 'Instructor Management' : 'Instructor Section Reports'}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {currentUserRole === 'admin' && (
            <Button 
              onClick={onClose} 
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold uppercase tracking-wider text-[10px] rounded-lg h-9 px-4 transition-all shrink-0 shadow-sm flex items-center gap-1.5"
            >
              <BookOpen className="w-3.5 h-3.5" />
              Open Grades
            </Button>
          )}
          {isPageLayout && onLogout && (
            <Button 
              variant="destructive" 
              onClick={onLogout} 
              className="bg-red-600 hover:bg-red-750 text-white font-bold uppercase tracking-wider text-[10px] rounded-lg h-9 px-4 transition-all shrink-0 shadow shadow-red-105"
            >
              LOG OUT
            </Button>
          )}
          {!isPageLayout && (
            <Button variant="ghost" onClick={onClose} className="text-white hover:bg-[#FFEE82] hover:text-teal-950 font-bold uppercase tracking-wider text-[10px] rounded-lg h-8 px-4 transition-all">CLOSE</Button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8 bg-slate-50/50">
        {currentUserRole === 'instructor' ? (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Instructor Registration Information and Credentials */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200/60 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-green-150 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 border border-green-200 flex items-center justify-center rounded-xl shadow-xs">
                    <CheckCircle2 className="w-5 h-5 text-green-700" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">Registration Information</h3>
                    <p className="text-[10px] text-green-700 font-extrabold uppercase tracking-wider">Registered Instructor Details</p>
                  </div>
                </div>
                <div className="bg-green-600 text-white font-black text-[10px] tracking-widest uppercase px-3 py-1.5 rounded-full select-none shadow-sm shadow-green-200/60 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span>
                  Registered
                </div>
              </div>

              {(() => {
                const userObj = currentUsername ? allUsers[currentUsername] : null;
                if (!userObj) return <p className="text-xs text-red-500 font-semibold p-4">Account details are not available.</p>;

                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3.5">
                      <div className="flex justify-between items-center py-2 border-b border-green-200/40">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Full Name</span>
                        <span className="text-xs font-black text-slate-800 uppercase tracking-tight">{userObj.fullName}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-green-200/40">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Email Address</span>
                        <span className="text-xs font-bold text-slate-700 font-mono">{userObj.email}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-green-200/40">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Assigned Subject</span>
                        <span className="text-xs font-bold text-teal-800 bg-teal-50 px-2.5 py-0.5 rounded border border-teal-200 uppercase tracking-wider">{userObj.subject}</span>
                      </div>
                    </div>

                    <div className="space-y-3.5 bg-white p-5 border border-slate-200 rounded-xl shadow-xs">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 border-b pb-2">Access Credentials</h4>
                      
                      {/* Username row */}
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Username (ID)</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-black bg-slate-100 text-slate-800 px-3 py-1 rounded select-all border border-slate-200">
                            {showUsername ? userObj.username : "•••••••"}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:bg-slate-100 text-slate-500 hover:text-slate-900 rounded"
                            onClick={() => setShowUsername(!showUsername)}
                            type="button"
                          >
                            {showUsername ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </Button>
                        </div>
                      </div>

                      {/* Password row */}
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Password</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-black bg-slate-100 text-slate-800 px-3 py-1 rounded select-all border border-slate-200">
                            {showPassword ? userObj.password : "•••••••••••"}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:bg-slate-100 text-slate-500 hover:text-slate-900 rounded"
                            onClick={() => setShowPassword(!showPassword)}
                            type="button"
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="flex items-center justify-between bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <div className="space-y-1">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Push Section Data to ARG</h3>
                <p className="text-xs text-slate-500 font-medium">Export and transfer your course data to the Annual Report Generator.</p>
              </div>
              <Button
                  onClick={() => {
                      const actualData = getCourseReportSummary(getFilteredAllData(), currentSemester);
                      if (actualData.length === 0) {
                        toast.error("No data found for this semester");
                        return;
                      }

                      const headers = "Course Name\tInstructor’s Name\tTotal Students\tTotal Sections\tPassed\tFailed\tFA\tWA/W\tI/IP\tPST\tOthers\n";
                      const rows = actualData.map(r => `${r.courseName}\t${r.instructors}\t${r.totalStudents}\t${r.totalSections}\t${r.passed}\t${r.failed}\t${r.fas}\t${r.ws}\t${r.ips + r.is}\t${r.psts}\t${r.others}`).join('\n');

                      navigator.clipboard.writeText(headers + rows).then(() => {
                         toast.success("Data copied to clipboard for ARG!");
                         window.open('https://aistudio.google.com/apps/9b17021e-10b9-4481-af0d-13c4c5136811?showPreview=true&showAssistant=true&fullscreenApplet=true', '_blank');
                      });
                  }}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-widest px-5 h-11 shadow-md shrink-0 flex items-center gap-2 rounded-xl transition-all hover:scale-[1.02] active:scale-95"
              >
                  <ExternalLink className="w-4 h-4" />
                  Push data to ARG
              </Button>
            </div>

            {/* Performance Report Table */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-teal-950">
                    <FileText className="w-5 h-5 text-teal-600" />
                    <h3 className="text-xl font-black uppercase tracking-tight">My Section Performance Reports</h3>
                  </div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Performance summary for your classes</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="px-4 py-2 text-[10px] font-black uppercase tracking-widest bg-teal-50 text-teal-950 border-2 border-teal-200">
                    {currentSemester} Semester 2026
                  </div>
                </div>
              </div>

              <div className="border border-slate-200 shadow-sm bg-white overflow-x-auto w-full">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-[#00786f] uppercase text-[10px] font-bold tracking-wider text-white hover:bg-[#00786f] border-none">
                      <TableHead className="border-r border-white/15 p-2 text-left whitespace-nowrap text-white font-bold h-10">Course Name</TableHead>
                      <TableHead className="border-r border-white/15 p-2 text-left whitespace-nowrap text-white font-bold h-10">Instructor’s Name</TableHead>
                      <TableHead className="border-r border-white/15 p-2 text-center whitespace-nowrap text-white font-bold h-10">Total Students</TableHead>
                      <TableHead className="border-r border-white/15 p-2 text-center whitespace-nowrap text-white font-bold h-10">Total Sections</TableHead>
                      <TableHead className="border-r border-white/15 p-2 text-center whitespace-nowrap text-white font-bold h-10">Passed</TableHead>
                      <TableHead className="border-r border-white/15 p-2 text-center whitespace-nowrap text-white font-bold h-10">Failed</TableHead>
                      <TableHead className="border-r border-white/15 p-2 text-center whitespace-nowrap text-white font-bold h-10">FA</TableHead>
                      <TableHead className="border-r border-white/15 p-2 text-center whitespace-nowrap text-white font-bold h-10">WA/W</TableHead>
                      <TableHead className="border-r border-white/15 p-2 text-center whitespace-nowrap text-white font-bold h-10">I/IP</TableHead>
                      <TableHead className="border-r border-white/15 p-2 text-center whitespace-nowrap text-white font-bold h-10">PST</TableHead>
                      <TableHead className="p-2 text-center whitespace-nowrap text-white font-bold h-10">Others</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(() => {
                      const actualData = getCourseReportSummary(getFilteredAllData(), currentSemester);
                      
                      if (actualData.length === 0) {
                        return (
                          <TableRow>
                            <TableCell colSpan={11} className="p-8 text-center text-slate-400 font-bold uppercase tracking-widest">
                              No data available for {currentSemester} Semester 2026
                            </TableCell>
                          </TableRow>
                        );
                      }

                      return actualData.map(row => {
                        return (
                          <TableRow key={row.courseName} className="hover:bg-slate-50 border-b border-slate-300 h-11">
                            <TableCell className="border-r border-slate-400 p-2 text-[11px] font-bold text-slate-900 whitespace-nowrap">{row.courseName}</TableCell>
                            <TableCell className="border-r border-slate-400 p-2 text-[11px] text-slate-700 whitespace-nowrap">{row.instructors}</TableCell>
                            <TableCell className="border-r border-slate-400 p-2 text-center text-[12px] font-courier font-medium">{row.totalStudents}</TableCell>
                            <TableCell className="border-r border-slate-400 p-2 text-center text-[12px] font-courier font-medium">{row.totalSections}</TableCell>
                            <TableCell className="border-r border-slate-400 p-2 text-center text-[12px] font-courier font-bold text-green-800">{row.passed}</TableCell>
                            <TableCell className="border-r border-slate-400 p-2 text-center text-[12px] font-courier font-bold text-red-800">{row.failed}</TableCell>
                            <TableCell className="border-r border-slate-400 p-2 text-center text-[12px] font-courier text-slate-800 font-medium">{row.fas}</TableCell>
                            <TableCell className="border-r border-slate-400 p-2 text-center text-[12px] font-courier text-slate-800 font-medium">{row.ws}</TableCell>
                            <TableCell className="border-r border-slate-400 p-2 text-center text-[12px] font-courier text-slate-800 font-medium">{row.ips + row.is}</TableCell>
                            <TableCell className="border-r border-slate-400 p-2 text-center text-[12px] font-courier text-slate-800 font-medium">{row.psts}</TableCell>
                            <TableCell className="p-2 text-center text-xs font-courier text-slate-800 font-medium">{row.others}</TableCell>
                          </TableRow>
                        );
                      });
                    })()}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        ) : (
          <Tabs defaultValue={currentUserRole === 'admin' ? "add" : "directory"} className="w-full space-y-8">
            <div className="flex justify-center">
              <TabsList className="bg-slate-100/80 p-1 border border-slate-200/60 rounded-xl shadow-xs flex items-center gap-1 flex-wrap justify-center group-data-horizontal/tabs:h-auto md:group-data-horizontal/tabs:h-12">
                {currentUserRole === 'admin' && (
                  <TabsTrigger 
                     value="add" 
                     className="px-3.5 h-10 text-xs font-bold uppercase tracking-wider data-active:bg-[#FFEE82] data-active:text-teal-950 data-active:shadow-sm transition-all flex items-center gap-2 rounded-lg whitespace-nowrap"
                  >
                    <UserPlus className="w-4 h-4" />
                    Add New Instructor
                  </TabsTrigger>
                )}

                <TabsTrigger 
                   value="directory" 
                   className="px-3.5 h-10 text-xs font-bold uppercase tracking-wider data-active:bg-[#FFEE82] data-active:text-teal-950 data-active:shadow-sm transition-all flex items-center gap-2 rounded-lg whitespace-nowrap"
                >
                  <Users className="w-4 h-4" />
                  Instructor Directory
                </TabsTrigger>

                {currentUserRole === 'admin' && (
                  <>
                    <TabsTrigger 
                       value="reports" 
                       className="px-3.5 h-10 text-xs font-bold uppercase tracking-wider data-active:bg-[#FFEE82] data-active:text-teal-950 data-active:shadow-sm transition-all flex items-center gap-2 rounded-lg whitespace-nowrap"
                    >
                      <FileText className="w-4 h-4" />
                      Annual Report Generator
                    </TabsTrigger>

                    <TabsTrigger 
                       value="requests" 
                       className="px-3.5 h-10 text-xs font-bold uppercase tracking-wider data-active:bg-[#FFEE82] data-active:text-teal-950 data-active:shadow-sm transition-all flex items-center gap-2 rounded-lg whitespace-nowrap relative"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Registration Requests
                      {pendingRequestsCount > 0 && (
                        <span className="absolute -top-1 -right-1 bg-red-600 text-white font-bold text-[9px] min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center animate-pulse border border-white">
                          {pendingRequestsCount}
                        </span>
                      )}
                    </TabsTrigger>
                  </>
                )}


              </TabsList>
            </div>

            {currentUserRole === 'admin' && (
              <TabsContent value="add" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="max-w-2xl mx-auto space-y-6">
                  <div className="flex items-center gap-3 text-slate-850">
                    <div className="w-10 h-10 bg-teal-50 border border-teal-100 flex items-center justify-center rounded-lg">
                      <UserPlus className="w-5 h-5 text-teal-600" />
                    </div>
                    <h3 className="text-xl font-black uppercase tracking-tight text-slate-900">Add New Instructor</h3>
                  </div>
                
                <div className={cn(
                  "space-y-6 bg-white p-8 border border-slate-200 shadow-sm rounded-xl",
                  currentUserRole !== 'admin' && "opacity-50 pointer-events-none grayscale"
                )}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Full Name</label>
                    <Input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Dr. Hameed Ur Rehman" className="bg-white h-12 text-sm border-slate-200 focus:border-teal-500 focus:ring-4 focus:ring-teal-50/50 transition-all font-medium" disabled={currentUserRole !== 'admin'} />
                    </div>
                    <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Username (ID)</label>
                    <Input value={username} onChange={e => handleUsernameChange(e.target.value)} placeholder="E0000" className="bg-white h-12 text-sm border-slate-200 focus:border-teal-500 focus:ring-4 focus:ring-teal-50/50 transition-all font-medium" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Email Address</label>
                    <div className="flex items-center">
                      <Input 
                        value={emailPrefix} 
                        onChange={e => handleEmailPrefixChange(e.target.value)} 
                        placeholder="instructor" 
                        className="bg-white h-12 text-sm border-slate-200 border-r-0 rounded-r-none focus:border-teal-500 focus:ring-4 focus:ring-teal-50/50 transition-all font-medium flex-1" 
                      />
                      <span className="h-12 px-3 border border-slate-200 bg-slate-100 flex items-center justify-center text-xs font-semibold text-slate-500 rounded-r-md select-none border-l-0">
                        @asu.edu.om
                      </span>
                    </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Initial Password</label>
                      <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="bg-white h-12 text-sm border-slate-200 focus:border-teal-500 focus:ring-4 focus:ring-teal-50/50 transition-all font-bold" />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Assign Subject</label>
                      <Select value={subject} onValueChange={setSubject}>
                        <SelectTrigger className="bg-white h-12 text-sm border-slate-200 focus:border-teal-500 focus:ring-4 focus:ring-teal-50/50 transition-all font-bold">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-slate-200">
                          <SelectItem value="English">English Language</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="pt-4">
                    <Button 
                      onClick={handleAddInstructor} 
                      className="w-full h-14 bg-slate-100 hover:bg-[#FFEE82] text-teal-950 font-black text-sm uppercase tracking-[0.2em] shadow-lg border-2 border-slate-400 hover:border-[#FFEE82] transition-all active:scale-95"
                      disabled={currentUserRole !== 'admin'}
                    >
                      {currentUserRole !== 'admin' ? 'Admin Access Only' : 'Register New Instructor'}
                    </Button>
                    
                    {currentUserRole !== 'admin' && (
                      <p className="mt-4 text-[10px] text-red-500 font-bold text-center uppercase tracking-widest p-3 bg-red-50 border border-red-100">
                        Restricted: Your account does not have permission to add new instructors.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>
            )}



            {currentUserRole === 'admin' && (
              <TabsContent value="reports" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* External Annual Report Generator (ARG) Integration Banner */}
              <div className="bg-gradient-to-r from-teal-50 to-emerald-50 border-2 border-teal-200 p-5 rounded-2xl shadow-sm space-y-3.5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
                  <div className="space-y-1">
                    <h4 className="font-extrabold text-teal-950 uppercase tracking-tight text-sm flex items-center gap-2">
                      <ExternalLink className="w-4 h-4 text-teal-600" />
                      Annual Report Generator (ARG) - External Link
                    </h4>
                    <p className="text-xs font-semibold text-slate-500 max-w-2xl leading-relaxed">
                      This specialized external system is loaded with comparative parameters. Click below to launch the tool; the required report data will be automatically copied to your clipboard for easy filling.
                    </p>
                  </div>
                  <Button 
                    onClick={() => {
                      const linkToOpen = argLink.trim() || 'https://aistudio.google.com/apps/9b17021e-10b9-4481-af0d-13c4c5136811?showPreview=true&showAssistant=true&fullscreenApplet=true';
                      window.open(linkToOpen.startsWith('http') ? linkToOpen : `https://${linkToOpen}`, '_blank');
                    }}
                    className="bg-teal-600 hover:bg-teal-700 text-white font-black text-xs uppercase tracking-widest px-5 h-11 shadow-md shrink-0 flex items-center gap-2 rounded-xl transition-all hover:scale-[1.02] active:scale-95"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Launch Generator Tool
                  </Button>
                </div>
                
                <div className="pt-3 border-t border-teal-200/40 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <div className="flex items-center gap-1 text-[10px] font-black text-teal-950 uppercase tracking-widest shrink-0">
                    <span>ARG Web Service Address:</span>
                  </div>
                  <div className="flex items-center gap-2 flex-1 max-w-sm">
                    <Input 
                      type="text" 
                      value={argLink} 
                      onChange={(e) => {
                        const val = e.target.value;
                        setArgLink(val);
                        localStorage.setItem('clfs_arg_link', val);
                      }} 
                      className="h-8 text-[11px] font-mono bg-white border-teal-200 focus:border-teal-500 focus:ring-teal-100 rounded-lg px-3 flex-1"
                      placeholder="https://aistudio.google.com/apps/9b17021e-10b9-4481-af0d-13c4c5136811?showPreview=true&showAssistant=true&fullscreenApplet=true"
                    />
                    <Button 
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const linkToOpen = argLink.trim() || 'https://aistudio.google.com/apps/9b17021e-10b9-4481-af0d-13c4c5136811?showPreview=true&showAssistant=true&fullscreenApplet=true';
                        window.open(linkToOpen.startsWith('http') ? linkToOpen : `https://${linkToOpen}`, '_blank');
                      }}
                      className="h-8 text-[10px] font-bold uppercase tracking-wider bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 px-3 rounded-lg shrink-0 shadow-xs"
                    >
                      Visit
                    </Button>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-teal-950">
                      <FileText className="w-5 h-5" />
                      <h3 className="text-xl font-black uppercase tracking-tight">Annual Report Generator</h3>
                    </div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Consolidated performance data across all sections</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="px-4 py-2 text-[10px] font-black uppercase tracking-widest bg-teal-50 text-teal-950 border-2 border-teal-200">
                      {currentSemester} Semester 2026
                    </div>
                    <Button 
                      onClick={() => {
                        const actualData = getCourseReportSummary(getFilteredAllData(), currentSemester);
                        if (actualData.length === 0) {
                          toast.error("No data found for this semester");
                          return;
                        }
                        
                        const headers = "Course Name\tInstructor’s Name\tTotal Students\tTotal Sections\tPassed\tFailed\tFA\tWA/W\tI/IP\tPST\tOthers\n";
                        const rows = actualData.map(r => `${r.courseName}\t${r.instructors}\t${r.totalStudents}\t${r.totalSections}\t${r.passed}\t${r.failed}\t${r.fas}\t${r.ws}\t${r.ips + r.is}\t${r.psts}\t${r.others}`).join('\n');
                        
                        // Copy data
                        navigator.clipboard.writeText(headers + rows).then(() => {
                           toast.success("Report data copied for ARG!");
                           
                           // Open ARG link
                           const linkToOpen = argLink.trim() || 'https://aistudio.google.com/apps/9b17021e-10b9-4481-af0d-13c4c5136811?showPreview=true&showAssistant=true&fullscreenApplet=true';
                           setTimeout(() => {
                             window.open(linkToOpen.startsWith('http') ? linkToOpen : `https://${linkToOpen}`, '_blank');
                           }, 800);
                        });
                      }}
                      className="bg-teal-600 hover:bg-teal-700 text-white font-black text-xs uppercase tracking-widest gap-2 h-11 px-6 rounded-xl shadow-lg animate-pulse"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Launch & Fill ARG
                    </Button>
                </div>
              </div>

                <div className="border border-slate-200 shadow-sm bg-white overflow-x-auto w-full">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-[#00786f] uppercase text-[10px] font-bold tracking-wider text-white hover:bg-[#00786f] border-none">
                        <TableHead className="border-r border-white/15 p-2 text-left whitespace-nowrap text-white font-bold h-10">Course Name</TableHead>
                        <TableHead className="border-r border-white/15 p-2 text-left whitespace-nowrap text-white font-bold h-10">Instructor’s Name</TableHead>
                        <TableHead className="border-r border-white/15 p-2 text-center whitespace-nowrap text-white font-bold h-10">Total Students</TableHead>
                        <TableHead className="border-r border-white/15 p-2 text-center whitespace-nowrap text-white font-bold h-10">Total Sections</TableHead>
                        <TableHead className="border-r border-white/15 p-2 text-center whitespace-nowrap text-white font-bold h-10">Passed</TableHead>
                        <TableHead className="border-r border-white/15 p-2 text-center whitespace-nowrap text-white font-bold h-10">Failed</TableHead>
                        <TableHead className="border-r border-white/15 p-2 text-center whitespace-nowrap text-white font-bold h-10">FA</TableHead>
                        <TableHead className="border-r border-white/15 p-2 text-center whitespace-nowrap text-white font-bold h-10">WA/W</TableHead>
                        <TableHead className="border-r border-white/15 p-2 text-center whitespace-nowrap text-white font-bold h-10">I/IP</TableHead>
                        <TableHead className="border-r border-white/15 p-2 text-center whitespace-nowrap text-white font-bold h-10">PST</TableHead>
                        <TableHead className="p-2 text-center whitespace-nowrap text-white font-bold h-10">Others</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(() => {
                        const actualData = getCourseReportSummary(getFilteredAllData(), currentSemester);
                        
                        if (actualData.length === 0) {
                          return (
                            <TableRow>
                              <TableCell colSpan={11} className="p-8 text-center text-slate-400 font-bold uppercase tracking-widest">
                                No data available for {currentSemester} Semester 2026
                              </TableCell>
                            </TableRow>
                          );
                        }

                        return actualData.map(row => {
                          return (
                            <TableRow key={row.courseName} className="hover:bg-slate-50 border-b border-slate-300 h-11">
                              <TableCell className="border-r border-slate-400 p-2 text-[11px] font-bold text-slate-900 whitespace-nowrap">{row.courseName}</TableCell>
                              <TableCell className="border-r border-slate-400 p-2 text-[11px] text-slate-700 whitespace-nowrap">{row.instructors}</TableCell>
                              <TableCell className="border-r border-slate-400 p-2 text-center text-[12px] font-courier font-medium">{row.totalStudents}</TableCell>
                              <TableCell className="border-r border-slate-400 p-2 text-center text-[12px] font-courier font-medium">{row.totalSections}</TableCell>
                              <TableCell className="border-r border-slate-400 p-2 text-center text-[12px] font-courier font-bold text-green-800">{row.passed}</TableCell>
                              <TableCell className="border-r border-slate-400 p-2 text-center text-[12px] font-courier font-bold text-red-800">{row.failed}</TableCell>
                              <TableCell className="border-r border-slate-400 p-2 text-center text-[12px] font-courier text-slate-800 font-medium">{row.fas}</TableCell>
                              <TableCell className="border-r border-slate-400 p-2 text-center text-[12px] font-courier text-slate-800 font-medium">{row.ws}</TableCell>
                              <TableCell className="border-r border-slate-400 p-2 text-center text-[12px] font-courier text-slate-800 font-medium">{row.ips + row.is}</TableCell>
                              <TableCell className="border-r border-slate-400 p-2 text-center text-[12px] font-courier text-slate-800 font-medium">{row.psts}</TableCell>
                              <TableCell className="p-2 text-center text-xs font-courier text-slate-800 font-medium">{row.others}</TableCell>
                            </TableRow>
                          );
                        });
                      })()}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </TabsContent>
            )}

            <TabsContent value="directory" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-teal-950">
                    <Users className="w-5 h-5" />
                    <h3 className="text-xl font-black uppercase tracking-tight">Instructor Directory</h3>
                  </div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Complete list of registered academic staff</p>
                </div>

                <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4">
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => {
                        const instructorNames = instructors.map(u => u.fullName);
                        const dataStr = JSON.stringify(instructorNames, null, 2);
                        const blob = new Blob([dataStr], { type: "application/json" });
                        const url = URL.createObjectURL(blob);
                        const link = document.createElement("a");
                        link.href = url;
                        link.download = "Instructors List.json";
                        link.click();
                        URL.revokeObjectURL(url);
                        toast.success("Instructors list exported.");
                    }}>Save Instructors List</Button>
                    <input type="file" id="import-json" className="hidden" accept=".json" onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = (e) => {
                            try {
                                const json = JSON.parse(e.target?.result as string);
                                onImportUsers(json);
                                toast.success("Instructor directory imported.");
                            } catch (error) {
                                toast.error("Invalid JSON file.");
                            }
                        };
                        reader.readAsText(file);
                    }} />
                    <Button variant="outline" size="sm" onClick={() => document.getElementById('import-json')?.click()}>Import JSON</Button>
                  </div>
                  <div className="relative w-full md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input 
                      placeholder="Search by name or ID..." 
                      value={instructorSearch}
                      onChange={e => setInstructorSearch(e.target.value)}
                      className="pl-9 h-11 bg-white border-slate-200 text-xs font-bold focus:border-teal-500 transition-all shadow-sm"
                    />
                  </div>

                  <div className="flex bg-slate-100 p-1 border border-slate-200 shadow-inner">
                    {[
                      { id: 'English', icon: BookOpen }
                    ].map(tab => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all ${
                          activeTab === tab.id 
                            ? 'bg-[#FFEE82] text-teal-950 shadow-sm' 
                            : 'bg-slate-100 text-slate-500 border border-slate-300 hover:text-teal-950 hover:bg-[#FFEE82] hover:border-[#FFEE82]'
                        }`}
                      >
                        <tab.icon className="w-3.5 h-3.5" />
                        {tab.id === 'Information Technology' ? 'IT' : tab.id}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <AnimatePresence mode="popLayout">
                  {filteredInstructors.length === 0 ? (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="col-span-full py-20 bg-slate-50 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-4 text-slate-400"
                    >
                      <div className="w-16 h-16 bg-slate-100 flex items-center justify-center">
                        <Users className="w-8 h-8" />
                      </div>
                      <div className="text-center">
                        <p className="font-black uppercase tracking-widest text-sm text-slate-500">No instructors found</p>
                        <p className="text-xs font-bold mt-1">Try adjusting your search or filters</p>
                      </div>
                    </motion.div>
                  ) : (
                    filteredInstructors.map(u => (
                      <motion.div
                        key={u.username}
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className={cn(
                          "flex items-center justify-between p-5 border transition-all group",
                          u.username === currentUsername && (currentUserRole as string) === 'instructor' 
                            ? "bg-green-50 border-green-300 shadow-md shadow-green-100" 
                            : "bg-white border-slate-200 hover:border-teal-400 hover:shadow-xl hover:shadow-teal-50"
                        )}
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-teal-50 flex items-center justify-center text-[#00786f] font-black text-sm border border-teal-100 group-hover:bg-[#00786f] group-hover:text-white transition-all">
                            {u.fullName.charAt(0)}
                          </div>
                          <div>
                            <h4 className="font-black text-slate-900 group-hover:text-teal-700 transition-colors uppercase tracking-tight">
                              {u.fullName}
                              {u.username === currentUsername && (currentUserRole as string) === 'instructor' && (
                                <span className="ml-2 text-[8px] bg-green-600 text-white px-1.5 py-0.5 rounded-full vertical-middle animate-pulse">REGISTERED</span>
                              )}
                            </h4>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              <span className="text-[10px] font-black text-slate-400 border border-slate-200 px-2 py-0.5 rounded uppercase">{u.username}</span>
                              <span className="text-[10px] font-bold text-teal-750 bg-teal-50 px-2 py-0.5 rounded uppercase">{u.subject}</span>
                            </div>
                            {currentUserRole === 'admin' && (
                              <div className="flex items-center gap-1.5 mt-2 bg-slate-100 hover:bg-slate-200/80 px-2.5 py-1 border border-slate-200 rounded-md max-w-max transition-all">
                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-wide">SAVED PASSWORD:</span>
                                <input 
                                  type="text"
                                  value={u.password || ''}
                                  onChange={(e) => {
                                    onResetPassword(u.username!, e.target.value);
                                  }}
                                  className="bg-transparent border-none font-mono font-bold text-slate-800 text-[10.5px] focus:outline-none focus:ring-0 w-28 text-left select-all shrink-0 p-0"
                                  placeholder="No password"
                                  title="Edit password instantly"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {currentUserRole === 'admin' && onOpenGradesForInstructor && (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="h-9 px-3 text-[10px] font-black uppercase tracking-widest gap-2 bg-teal-50 text-teal-800 border-teal-200 hover:border-teal-500 hover:bg-teal-150 shadow-sm transition-all"
                              onClick={() => {
                                onOpenGradesForInstructor(u.username!, u.subject || 'Mathematics');
                              }}
                            >
                              <BookOpen className="w-3.5 h-3.5 text-teal-700" />
                              <span>Open Grades</span>
                            </Button>
                          )}
                          {(currentUserRole === 'admin' || currentUsername === u.username) && (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="h-9 px-3 text-[10px] font-black uppercase tracking-widest gap-2 bg-slate-100 border-slate-300 hover:border-[#FFEE82] hover:bg-[#FFEE82] hover:text-teal-950 shadow-sm transition-all"
                              onClick={() => handleResetPassword(u)}
                            >
                              <KeyRound className="w-4 h-4" />
                              <span className="hidden sm:inline">Reset</span>
                            </Button>
                          )}
                          {currentUserRole === 'admin' && (
                            instructorToDelete === u.username ? (
                              <div className="flex items-center gap-1.5 bg-red-50 border border-red-200 p-1.5 rounded-lg animate-in" id={`confirm-del-${u.username}`}>
                                <span className="text-[9px] font-black text-red-700 uppercase tracking-wide px-1">Remove?</span>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  className="h-7 px-2.5 bg-red-600 hover:bg-red-750 text-white font-black text-[10px] uppercase tracking-wider rounded"
                                  onClick={() => {
                                    onDeleteUser(u.username!);
                                    toast.success(`Instructor ${u.fullName} removed`);
                                    setInstructorToDelete(null);
                                  }}
                                >
                                  Yes, Delete
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 px-2 border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-[10px] uppercase tracking-wider rounded"
                                  onClick={() => setInstructorToDelete(null)}
                                >
                                  Cancel
                                </Button>
                              </div>
                            ) : (
                              <Button 
                                variant="destructive" 
                                size="sm" 
                                className="h-9 w-9 p-0 bg-slate-100 text-red-600 border border-slate-300 hover:border-[#FFEE82] hover:bg-[#FFEE82] hover:text-red-900 shadow-sm transition-all"
                                onClick={() => setInstructorToDelete(u.username || null)}
                                id={`btn-del-${u.username}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )
                          )}
                        </div>
                      </motion.div>
                    ))
                  )}
                </AnimatePresence>
              </div>
            </TabsContent>

            {currentUserRole === 'admin' && (
              <TabsContent value="requests" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-teal-950">
                    <CheckCircle2 className="w-5 h-5 text-teal-600" />
                    <h3 className="text-xl font-black uppercase tracking-tight text-slate-900">Registration Requests</h3>
                  </div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Approve incoming instructor requests and assign access credentials</p>
                </div>

                <div className="border border-slate-200 shadow-sm bg-white overflow-x-auto w-full">
                  <Table className="min-w-full">
                    <TableHeader>
                      <TableRow className="bg-[#00786f] uppercase text-[10px] font-bold tracking-wider text-white hover:bg-[#00786f] border-none">
                        <TableHead className="p-2 text-left text-white h-10 font-bold">Full Name</TableHead>
                        <TableHead className="p-2 text-left text-white h-10 font-bold">Official Email</TableHead>
                        <TableHead className="p-2 text-left text-white h-10 font-bold">Particular Course</TableHead>
                        <TableHead className="p-2 text-center text-white h-10 font-bold">Status</TableHead>
                        <TableHead className="p-2 text-center text-white h-10 font-bold">Actions / Credentials</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {registrationRequests.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="p-8 text-center text-slate-400 font-bold uppercase tracking-widest text-[11px]">
                            No registration requests found.
                          </TableCell>
                        </TableRow>
                      ) : (
                        registrationRequests.map((req) => (
                          <TableRow key={req.id} className="hover:bg-slate-50 border-b border-slate-205">
                            <TableCell className="p-2 text-[12px] font-bold text-slate-900">{req.fullName}</TableCell>
                            <TableCell className="p-2 text-[12px] text-slate-600 font-mono">{req.email}</TableCell>
                            <TableCell className="p-2 text-[12px] font-bold text-slate-700">{req.subject}</TableCell>
                            <TableCell className="p-2 text-center">
                              <span className={cn(
                                "text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-sm",
                                req.status === 'pending' && "bg-amber-100 text-amber-800",
                                req.status === 'approved' && "bg-green-100 text-green-800"
                              )}>
                                {req.status}
                              </span>
                            </TableCell>
                            <TableCell className="p-2 text-center">
                              {req.status === 'pending' ? (
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    setSelectedRequest(req);
                                    const suggestedUser = req.email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
                                    setCustomUsername(suggestedUser);
                                    setCustomPassword("pass" + Math.floor(1000 + Math.random() * 9000));
                                    setIsApproveDialogOpen(true);
                                  }}
                                  className="h-8 bg-teal-600 hover:bg-teal-700 text-white text-[10px] font-bold uppercase tracking-widest shadow-sm rounded-sm"
                                >
                                  Approve & Password
                                </Button>
                              ) : (
                                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                                  <div className="text-[10px] font-semibold text-slate-700 text-left space-y-0.5 max-w-xs">
                                    <div>Username: <span className="font-mono font-bold select-all bg-slate-100 px-1">{req.generatedUsername}</span></div>
                                    <div>Password: <span className="font-mono font-bold select-all bg-slate-100 px-1">{req.generatedPassword}</span></div>
                                  </div>
                                  {requestToRemove === req.id ? (
                                    <div className="flex flex-col gap-1 items-stretch bg-red-50 border border-red-205 p-1.5 rounded-sm shrink-0 animate-in" id={`confirm-req-${req.id}`}>
                                      <span className="text-[8px] font-black text-red-700 uppercase tracking-wide text-center">Remove Credentials?</span>
                                      <div className="flex items-center gap-1.5 justify-center">
                                        <Button
                                          size="sm"
                                          variant="destructive"
                                          onClick={() => {
                                            if (onRemoveRequest) {
                                              onRemoveRequest(req.id);
                                            }
                                            setRequestToRemove(null);
                                          }}
                                          className="h-6 px-2 bg-red-600 hover:bg-red-750 text-white text-[8px] font-black uppercase tracking-wider rounded-sm shrink-0"
                                        >
                                          Yes
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => setRequestToRemove(null)}
                                          className="h-6 px-2 border-slate-300 bg-white hover:bg-slate-100 text-[8px] font-bold uppercase tracking-wider rounded-sm"
                                        >
                                          No
                                        </Button>
                                      </div>
                                    </div>
                                  ) : (
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      onClick={() => {
                                        setRequestToRemove(req.id);
                                      }}
                                      id={`btn-req-remove-${req.id}`}
                                      className="h-7 px-2.5 bg-red-600 hover:bg-red-750 text-white text-[9px] font-bold uppercase tracking-widest rounded-sm shrink-0"
                                    >
                                      Remove
                                    </Button>
                                  )}
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </TabsContent>
            )}
          </Tabs>
        )}
      </div>
    </div>
  );

  const mainLayout = (
    <>
      {contentBody}

      <Dialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
          <DialogContent className="max-w-md bg-white">
            <DialogHeader>
              <DialogTitle className="text-lg font-black uppercase tracking-tight text-teal-800 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-teal-600" />
                Approve Instructor Account
              </DialogTitle>
            </DialogHeader>
            {selectedRequest && (
              <div className="py-4 space-y-4">
                <div className="space-y-3 p-4 bg-slate-50 border border-slate-200">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Instructor Details</span>
                    <p className="text-sm font-bold text-slate-800">{selectedRequest.fullName}</p>
                    <p className="text-xs font-mono text-slate-500">{selectedRequest.email}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Assigned Subject</span>
                    <p className="text-sm font-black text-teal-800">{selectedRequest.subject}</p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Assign Username</label>
                  <Input 
                    type="text" 
                    value={customUsername} 
                    onChange={e => setCustomUsername(e.target.value.toLowerCase().replace(/[^a-zA-Z0-9]/g, ''))} 
                    placeholder="Enter customized username" 
                    className={cn(
                      "bg-white h-11 text-sm border-slate-200 focus:ring-4 font-bold lowercase",
                      customUsername && allUsers[customUsername.trim().toLowerCase()] ? "border-red-300 focus:border-red-500 focus:ring-red-50" : "focus:border-teal-500 focus:ring-teal-50"
                    )} 
                  />
                  {customUsername && allUsers[customUsername.trim().toLowerCase()] ? (
                    <p className="text-[10px] font-bold text-red-600 uppercase tracking-wide">⚠️ Username is already taken by another instructor!</p>
                  ) : (
                    <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wide">Enter custom username or use the prefilled default suggestion.</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Provide Password</label>
                  <Input 
                    type="text" 
                    value={customPassword} 
                    onChange={e => setCustomPassword(e.target.value)} 
                    placeholder="Enter password (e.g., hrk26)" 
                    className="bg-white h-11 text-sm border-slate-200 focus:border-teal-500 focus:ring-4 focus:ring-teal-50 font-bold" 
                  />
                  <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wide">Customize or let the system general password stand.</p>
                </div>
              </div>
            )}
            <DialogFooter className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => setIsApproveDialogOpen(false)}
                className="font-black uppercase tracking-widest text-[10px] h-10 border border-slate-350"
              >
                Cancel
              </Button>
              <Button 
                disabled={!customUsername.trim() || !customPassword.trim() || (customUsername ? !!allUsers[customUsername.trim().toLowerCase()] : false)}
                onClick={() => {
                  if (selectedRequest && onApproveRequest) {
                    onApproveRequest(selectedRequest.id, customUsername.trim().toLowerCase(), customPassword.trim());
                  }
                  setIsApproveDialogOpen(false);
                }}
                className="font-black uppercase tracking-widest text-[10px] h-10 bg-teal-600 hover:bg-teal-700 text-white"
              >
                Confirm Approve
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isCerDialogOpen} onOpenChange={setIsCerDialogOpen}>
          <DialogContent className="max-w-6xl w-[95vw] lg:max-w-6xl xl:max-w-7xl max-h-[90vh] flex flex-col">
            <DialogHeader className="shrink-0">
              <DialogTitle className="text-xl font-black uppercase tracking-tighter italic text-teal-950">
                Consolidated Course Evaluation Report (Admin)
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
                      className="h-7 px-2 text-[10px] font-bold uppercase gap-1 hover:bg-teal-50 border-slate-200"
                      onClick={() => {
                        navigator.clipboard.writeText(section.content);
                        toast.success(`${section.title} copied!`);
                      }}
                    >
                      <Copy className="w-3 h-3" />
                      Copy
                    </Button>
                  </div>
                  <div className="bg-slate-50 p-4 border border-slate-200 text-xs font-mono whitespace-pre-wrap rounded-sm shadow-sm transition-all group-hover:border-teal-200">
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
                className="font-black uppercase tracking-widest text-[11px] h-9 bg-[#00786f] hover:bg-teal-800"
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



        <Dialog open={!!generatedPassword} onOpenChange={(open) => !open && setGeneratedPassword(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl font-black uppercase tracking-tight text-teal-950 flex items-center gap-2">
                <KeyRound className="w-6 h-6 text-[#00786f]" />
                Temporary Access Credentials
              </DialogTitle>
            </DialogHeader>
            <div className="py-6 space-y-4">
              <div className="p-4 bg-teal-55/40 border border-teal-100 rounded-sm space-y-3">
                <p className="text-xs font-bold text-teal-850 uppercase tracking-wider">Please provide these details to the instructor:</p>
                <div className="space-y-2">
                  <div className="flex justify-between items-center py-2 border-b border-teal-100">
                    <span className="text-[10px] font-black text-slate-500 uppercase">Username</span>
                    <span className="text-sm font-bold text-slate-900">{generatedPassword?.username}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-teal-100">
                    <span className="text-[10px] font-black text-slate-500 uppercase">Temporary Password</span>
                    <span className="text-sm font-mono font-bold text-teal-700 bg-white px-2 py-1 border border-teal-150">{generatedPassword?.pass}</span>
                  </div>
                </div>
              </div>
              <p className="text-[10px] font-bold text-slate-400 uppercase leading-relaxed">
                The instructor will be forced to change this password upon their next successful login for security purposes.
              </p>
            </div>
            <DialogFooter>
              <Button 
                className="w-full font-black uppercase tracking-widest text-[11px] h-10 bg-[#00786f] hover:bg-teal-800"
                onClick={() => {
                  if (generatedPassword) {
                    navigator.clipboard.writeText(`Username: ${generatedPassword.username}\nTemporary Password: ${generatedPassword.pass}`);
                    toast.success("Credentials copied to clipboard");
                  }
                }}
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy Credentials
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );

    if (isPageLayout) {
      return mainLayout;
    }

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
        >
          {mainLayout}
        </motion.div>
      </div>
    );
}
