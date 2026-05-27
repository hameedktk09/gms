import React, { useState, useRef, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from "@/components/ui/dialog";
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip";
import { StudentData, RAW_MARKS_LIMITS } from '@/src/types';
import { calculateFinalValues, getPerformanceAnalysisData, getStudentStatus, calculateSummativeValues, generatePetitionResponse } from '@/src/lib/grade-utils';
import { AlertCircle, CheckCircle2, TrendingUp, BookOpen, AlertTriangle, MessageSquare, Copy, Check, FileDown, Mail, Image as ImageIcon, X } from 'lucide-react';
import * as htmlToImage from 'html-to-image';
import { cn } from '@/lib/utils';
import { Button } from "@/components/ui/button";
import { DialogClose } from "@/components/ui/dialog";
import { toast } from "sonner";
import html2canvas from 'html2canvas';

interface StudentDetailModalProps {
  student: StudentData | null;
  isOpen: boolean;
  onClose: () => void;
}

export function StudentDetailModal({ student, isOpen, onClose }: StudentDetailModalProps) {
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [cardCopied, setCardCopied] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  
  const pa = student ? getPerformanceAnalysisData(student) : null;
  
  useEffect(() => {
    if (isOpen && student && pa) {
      const normalizedWarning = pa.absenceWarning;
      const isWarning = normalizedWarning && normalizedWarning !== 'Regular' && normalizedWarning !== '';
      const isCriticalStatus = ['FA', 'WA', 'PST'].includes(student.status || '');
      
      if (isCriticalStatus) {
        let statusMsg = '';
        switch(student.status) {
          case 'FA': statusMsg = 'FAIL ABSENCE (FA)'; break;
          case 'WA': statusMsg = 'WITHDRAWAL ABSENCE (WA)'; break;
          case 'PST': statusMsg = 'PROBATIONARY STATUS (PST)'; break;
        }
        toast.error(`CRITICAL: ${student.name} has ${statusMsg}!`, {
          duration: 6000,
        });
      } else if (isWarning) {
        toast.warning(`${student.name} is at Warning Level: ${normalizedWarning}`, {
          duration: 5000,
        });
      }
    }
  }, [isOpen, student, pa?.absenceWarning]);

  if (!student || !pa) return null;

  const fv = calculateFinalValues(student);
  const sv = calculateSummativeValues(student);
  const status = getStudentStatus(student, parseFloat(fv.totalScore) || 0);
  const isAtRisk = pa.overallStatus === 'At-Risk';
  
  const remarks = generatePetitionResponse(student) || 'No remarks.';
  const headerColor = status === 'Pass' ? '#2563eb' : status === 'None' ? '#475569' : '#dc2626';
  const statusText = status === 'Pass' ? 'PASS' : 'NOT PASS';
  const summativeGrades = [
    { label: 'Part + Port', value: sv.v1, weight: 10 },
    { label: 'Presentation', value: sv.v2, weight: 10 },
    { label: 'Pop Quiz 1', value: sv.v3, weight: 2.5 },
    { label: 'Pop Quiz 2', value: sv.v4, weight: 2.5 },
    { label: 'Test 1 (GV)', value: sv.v5, weight: 5 },
    { label: 'Test 2 (LR)', value: sv.v6, weight: 5 },
    { label: 'Speaking Test [5%]', value: sv.v7, weight: 5 },
    { label: 'Writing Test [5%]', value: sv.v8, weight: 5 },
    { label: 'Writing Portfolio [5%]', value: sv.v9, weight: 5 },
    { label: 'Midterm', value: sv.v10, weight: 20 },
    { label: 'Final Exam', value: sv.v11, weight: 30 },
  ];

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Statement copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyCard = async () => {
    if (!cardRef.current) return;
    
    setIsGenerating(true);
    toast.info("Generating professional student card...", {
      duration: 2000
    });
    
    try {
      let blob: Blob | null = null;
      
      // Try html-to-image first
      try {
        blob = await htmlToImage.toBlob(cardRef.current, {
          backgroundColor: '#ffffff',
          pixelRatio: 2,
          skipFonts: true,
          style: {
            transform: 'scale(1)',
            transformOrigin: 'top left'
          }
        });
      } catch (imageErr) {
        console.warn("html-to-image failed, trying html2canvas:", imageErr);
        if (cardRef.current) {
          const canvas = await html2canvas(cardRef.current, {
            useCORS: true,
            scale: 2,
            backgroundColor: '#ffffff'
          });
          blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
        }
      }

      if (blob) {
        try {
          // Attempt to copy image to clipboard
          const item = new ClipboardItem({ 'image/png': blob });
          window.focus(); // Try to bring focus back to document
          await navigator.clipboard.write([item]);
          setCardCopied(true);
          toast.success("Card copied to clipboard! You can now paste it in your email.");
          setTimeout(() => setCardCopied(false), 3000);
        } catch (clipErr) {
          console.error("Clipboard Image Error:", clipErr);
          // Fallback: provide a download link
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `Student_Card_${student.name.replace(/\s+/g, '_')}.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          toast.error("Clipboard access blocked. The card has been downloaded instead.");
        }
      } else {
        toast.error("Failed to generate image card.");
      }
    } catch (err) {
      console.error("Preparation error:", err);
      toast.error("Scale or rendering error. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleOpenOutlook = () => {
    // Lead sentence as requested
    const leadSentence = `Dear Student,\n\nFind your Performance Report so far for the semester.\n\n`;
    const studentEmail = `${student.id}@asu.edu.om`;
    const subject = `Performance Analysis - ${student.name} (${student.id})`;
    
    // Attempting mailto for default behavior (often opens OWA if configured)
    const body = encodeURIComponent(leadSentence + `(Please paste the card here)`);
    const mailtoUrl = `mailto:${studentEmail}?subject=${encodeURIComponent(subject)}&body=${body}`;
    window.location.href = mailtoUrl;
    
    // Provide the direct link as well 
    toast.info("Opening ASU Outlook... Remember to paste the card!", {
      action: {
        label: "Open OWA",
        onClick: () => window.open('https://outlook.office365.com/mail/?realm=asu.edu.om', '_blank')
      },
      duration: 8000
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        onClose();
      }
    }}>
      <TooltipProvider>
        <DialogContent 
          showCloseButton={false}
          className="bg-white p-0 overflow-hidden border border-slate-200 shadow-2xl flex flex-col transition-all duration-300 max-w-[95vw] w-full lg:max-w-[1050px] h-[98vh]"
        >
          {/* Custom Header Controls */}
          <div className="absolute top-4 right-4 z-50 flex items-center gap-2 no-print">
            <DialogClose render={
              <Button
                variant="ghost"
                size="icon-sm"
                className="h-8 w-8 bg-white/20 hover:bg-white/40 text-white border-none backdrop-blur-md"
              >
                <X className="w-4 h-4" />
              </Button>
            } />
          </div>

          {/* Header Section */}
        <div className={cn(
          "p-8 text-white shrink-0 transition-colors duration-500",
          status === 'Pass' ? "bg-blue-600" : 
          status === 'None' ? "bg-slate-600" : "bg-red-600"
        )}>
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <h2 className="text-3xl font-serif font-bold tracking-tight drop-shadow-sm">{student.name}</h2>
                {student.gender && (
                  <span className={cn(
                    "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border",
                    student.gender === 'M' 
                      ? "bg-blue-100 text-blue-700 border-blue-200" 
                      : "bg-pink-100 text-pink-700 border-pink-200"
                  )}>
                    {student.gender === 'M' ? 'Male' : 'Female'}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-6">
                <p className="text-white/90 font-courier text-xl font-bold">{student.id}</p>
                {student.major && (
                  <div className="flex items-center gap-2 bg-white/20 px-3 py-1 border border-white/30 backdrop-blur-sm">
                    <BookOpen className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-widest">{student.major}</span>
                  </div>
                )}
                {student.status && (
                  <Tooltip>
                    <TooltipTrigger render={
                      <div className="flex items-center gap-2 bg-white/20 px-3 py-1 border border-white/30 backdrop-blur-sm cursor-help">
                        <AlertCircle className="w-4 h-4" />
                        <span className="text-xs font-bold uppercase tracking-widest">{student.status}</span>
                      </div>
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
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              {status !== 'None' && (
                <div className={cn(
                  "px-6 py-2 flex items-center gap-3 shadow-lg border border-white/20 backdrop-blur-md mb-1",
                  status === 'Pass' ? "bg-green-500" : "bg-red-500"
                )}>
                  {status === 'Pass' ? (
                    <CheckCircle2 className="w-5 h-5 text-white" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-white" />
                  )}
                  <span className="text-base font-serif font-bold uppercase tracking-widest italic text-white">
                    {status === 'Pass' ? 'PASS' : 'NOT PASS'}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Button 
                  variant="secondary" 
                  size="sm" 
                  onClick={handleCopyCard}
                  disabled={isGenerating}
                  className="bg-slate-100 hover:bg-[#FFEE82] text-slate-700 hover:text-blue-900 border border-slate-300 shadow-sm backdrop-blur-sm transition-all"
                >
                  {isGenerating ? (
                    <div className="w-4 h-4 mr-2 border-2 border-slate-300 border-t-slate-600 animate-spin" />
                  ) : cardCopied ? (
                    <Check className="w-4 h-4 mr-2 text-green-600" />
                  ) : (
                    <Copy className="w-4 h-4 mr-2 text-blue-600" />
                  )}
                  {cardCopied ? 'Copied!' : 'Copy Card'}
                </Button>
                <Button 
                  variant="secondary" 
                  size="sm" 
                  onClick={handleOpenOutlook}
                  className="bg-slate-100 hover:bg-[#FFEE82] text-slate-700 hover:text-blue-900 border border-slate-300 shadow-sm backdrop-blur-sm transition-all"
                >
                  <Mail className="w-4 h-4 mr-2 text-blue-600" />
                  ASU Email
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="p-8 space-y-8 overflow-y-auto flex-1">
          {/* Attendance & Status Alerts */}
          {(() => {
            const warning = student.warning || student.attendanceStatus || '';
            const isWarning = /warning/i.test(warning);
            const status = student.status || '';
            const isCritical = ['FA', 'WA', 'PST'].includes(status);
            
            if (!isWarning && !isCritical) return null;
            
            let title = '';
            let description = '';
            let colorClass = '';
            let icon = <AlertTriangle className="w-5 h-5" />;

            if (isCritical) {
              colorClass = "bg-red-50 border-red-200 text-red-800";
              icon = <AlertCircle className="w-5 h-5 text-red-600" />;
              if (status === 'FA') {
                title = "Critical Status: Fail Absence (FA)";
                description = "This student has reached the threshold for Fail Absence. Immediate administrative action is required.";
              } else if (status === 'WA') {
                title = "Critical Status: Withdrawal Absence (WA)";
                description = "This student has been withdrawn due to excessive absences.";
              } else if (status === 'PST') {
                title = "Status Notice: Probationary Status (PST)";
                description = "This student is currently on academic or attendance probation.";
              }
            } else {
              colorClass = "bg-amber-50 border-amber-200 text-amber-800";
              icon = <AlertTriangle className="w-5 h-5 text-amber-600" />;
              title = `Attendance Warning: ${warning}`;
              description = "This student is approaching the attendance threshold. Please notify the student and monitor closely.";
            }
            
            return (
              <div className={cn(
                "p-4 border flex items-center gap-3 no-print rounded-sm shadow-sm",
                colorClass
              )}>
                {icon}
                <div className="flex-1">
                  <p className="text-sm font-black uppercase tracking-wide leading-tight mb-0.5">
                    {title}
                  </p>
                  <p className="text-xs font-medium opacity-90 italic">
                    {description}
                  </p>
                </div>
              </div>
            );
          })()}

          {/* Top Row: Performance & Attendance */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            {/* Performance Metrics */}
            <div className="lg:col-span-3 space-y-4">
              <h3 className="text-base font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                Current Performance
              </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Tooltip>
                    <TooltipTrigger render={
                      <div className="flex items-stretch justify-between border border-blue-100 overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow group cursor-help">
                        <div className="p-4 bg-blue-50/50 border-r border-blue-100 flex-1 flex items-center min-w-0">
                          <span className="text-[10px] font-bold text-blue-800 uppercase tracking-widest leading-tight truncate">Total Score & Grade</span>
                        </div>
                        <div className="p-4 flex items-center justify-center bg-white shrink-0 gap-3 min-w-[140px]">
                          <span className={cn(
                            "text-xl font-serif font-bold",
                            fv.totalClass || ((parseFloat(fv.totalScore) || 0) < 60 ? "text-red-600" : "text-green-600")
                          )}>
                            {fv.totalScore || '0'}%
                          </span>
                          <span className="text-slate-200 font-bold text-xs italic tracking-tighter">to</span>
                          <span className={cn("text-xl font-serif font-bold", fv.gradeLetterClass || "text-slate-900")}>
                            {fv.gradeLetter || '-'}
                          </span>
                        </div>
                      </div>
                    } />
                    <TooltipContent>Based on the final weighted components (100% total).</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger render={
                      <div className="flex items-stretch justify-between border border-blue-100 overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow group cursor-help">
                        <div className="p-4 bg-blue-50/50 border-r border-blue-100 flex-1 flex items-center min-w-0">
                          <span className="text-xs font-bold text-blue-700 uppercase tracking-wider leading-tight truncate">Overall Status</span>
                        </div>
                        <div className="p-4 flex items-center gap-2 justify-center bg-white shrink-0 min-w-[120px]">
                          {pa.overallStatus === 'At-Risk' ? (
                            <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                          ) : pa.overallStatus === 'Normal' ? (
                            <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
                          ) : (
                            <div className="w-5 h-5 border-2 border-slate-200 border-dashed shrink-0" />
                          )}
                          <span className={cn(
                            "text-xl font-black truncate",
                            pa.overallStatus === 'At-Risk' ? "text-red-600" : 
                            pa.overallStatus === 'Normal' ? "text-green-600" : "text-slate-500"
                          )}>
                            {pa.overallStatus || 'No Data'}
                          </span>
                        </div>
                      </div>
                    } />
                    <TooltipContent>Combination of attendance warnings and academic performance.</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger render={
                      <div className="flex items-stretch justify-between border border-blue-100 overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow group md:col-span-2 cursor-help">
                        <div className="p-4 bg-blue-50/50 border-r border-blue-100 flex-1 flex items-center min-w-0">
                          <span className="text-xs font-bold text-blue-700 uppercase tracking-wider leading-tight truncate">Academic Standing</span>
                        </div>
                        <div className="p-4 flex items-center gap-2 justify-center bg-white shrink-0 min-w-[120px]">
                          {pa.academicAtRiskCount > 0 ? (
                            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
                          ) : (
                            <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                          )}
                          <span className={cn(
                            "text-xl font-black truncate",
                            pa.academicAtRiskCount > 0 ? "text-amber-600" : "text-green-600"
                          )}>
                            {pa.academicAtRiskCount > 0 
                              ? `At-Risk – ${pa.academicAtRiskCount}`
                              : 'Normal'}
                          </span>
                        </div>
                      </div>
                    } />
                    <TooltipContent>Number of assessment components with scores below the 60% passing threshold.</TooltipContent>
                  </Tooltip>
                </div>
            </div>

            {/* Attendance Status */}
            <div className="lg:col-span-2 space-y-4">
              <h3 className="text-base font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-600" />
                Attendance Status
              </h3>
              <div className="grid grid-cols-1 gap-4">
                <div className="flex items-stretch justify-between border border-amber-100 overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow group">
                  <div className="p-4 bg-amber-50/50 border-r border-amber-100 flex-1 flex items-center min-w-0">
                    <span className="text-xs font-bold text-amber-800 uppercase tracking-wider leading-tight truncate">Absence Hours</span>
                  </div>
                  <div className="p-4 flex items-center justify-center bg-white shrink-0 min-w-[70px]">
                    <span className="text-xl font-black text-amber-900">
                      {student.absentees || student.attendancePercentage || '0'}
                    </span>
                  </div>
                </div>

                <div className="flex items-stretch justify-between border border-amber-100 overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow group">
                  <div className="p-4 bg-amber-50/50 border-r border-amber-100 flex-1 flex items-center min-w-0">
                    <span className="text-xs font-bold text-amber-800 uppercase tracking-wider leading-tight truncate">Tardy</span>
                  </div>
                  <div className="p-4 flex items-center justify-center bg-white shrink-0 min-w-[70px]">
                    <span className="text-xl font-black text-amber-900">
                      {student.tardy || '0'}
                    </span>
                  </div>
                </div>

                <div className="flex items-stretch justify-between border border-amber-100 overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow group">
                  <div className="p-4 bg-amber-50/50 border-r border-amber-100 flex-1 flex items-center min-w-0">
                    <span className="text-xs font-bold text-amber-800 uppercase tracking-wider leading-tight truncate">Warning Level</span>
                  </div>
                  <div className="p-4 flex items-center justify-center bg-white shrink-0 min-w-[100px]">
                    {pa.absenceWarning && pa.absenceWarning !== 'Regular' ? (
                      <span className="text-xl font-black text-red-600 truncate max-w-full" title={pa.absenceWarning}>{pa.absenceWarning}</span>
                    ) : (
                      <span className="text-xl font-black text-green-600 truncate">Regular</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Real Grades Sheet (Summative) */}
          <div className="space-y-4">
            <h3 className="text-base font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-500" />
              Real Grades Sheet
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {summativeGrades.map((grade, idx) => {
                const val = parseFloat(grade.value || '0');
                const percentage = (val / grade.weight) * 100;
                const isPass = percentage >= 60;
                return (
                  <div key={idx} className="flex items-stretch justify-between border border-slate-200 overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow group">
                    <div className="p-4 bg-slate-50 border-r border-slate-200 flex-1 flex flex-wrap items-center gap-1.5 min-w-0">
                      <span className="text-xs font-bold text-slate-600 uppercase tracking-wider leading-tight truncate">
                        {grade.label}
                      </span>
                      <span className="bg-blue-600 text-white px-1.5 py-0.5 rounded text-[10px] font-black shrink-0">[{grade.weight}]</span>
                    </div>
                    <div className="p-4 flex items-center justify-center bg-white shrink-0 min-w-[70px]">
                      {grade.value ? (
                        <span className={cn(
                          "text-xl font-black",
                          isPass ? "text-green-600" : "text-red-600"
                        )}>
                          {grade.value}
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-red-500 uppercase tracking-wider bg-red-50 px-1.5 py-0.5 rounded border border-red-100">Missed</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Petition Response Statement */}
          {(() => {
            const response = generatePetitionResponse(student);
            if (!response) return null;
            
            return (
              <div className="space-y-4">
                <h3 className="text-base font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-teal-500" />
                  Instructor Remarks
                </h3>
                <div className="bg-teal-50 p-8 border border-teal-100 shadow-sm relative group">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleCopy(response)}
                    className="absolute top-4 right-4 h-8 text-[11px] font-bold uppercase tracking-widest gap-2 border-slate-300 text-slate-700 bg-slate-100 hover:bg-[#FFEE82] hover:border-[#FFEE82] hover:text-blue-900 transition-all shadow-sm"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4 text-green-600" />
                        COPIED
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 text-blue-600" />
                        COPY
                      </>
                    )}
                  </Button>
                  <p className="text-lg leading-relaxed text-slate-800 font-medium pr-24">
                    {response}
                  </p>
                </div>
              </div>
            );
          })()}
          
          <p className="text-[10px] text-slate-400 italic text-center">* All grades are calculated based on summative weightage rules.</p>
        </div>
      </DialogContent>
    </TooltipProvider>

    {/* Hidden Card for Image Generation - rendered but not visible to user */}
      <div 
        style={{ 
          position: 'absolute', 
          top: '0', 
          left: '0', 
          zIndex: -1, 
          opacity: 0, 
          pointerEvents: 'none',
          overflow: 'hidden',
          width: '650px'
        }}
      >
        <div ref={cardRef} style={{ width: '650px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '0px', overflow: 'hidden', fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" }}>
          <div style={{ backgroundColor: headerColor, padding: '32px', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <img src="https://raw.githubusercontent.com/hameedktk09/gms/main/clfsasu1.png" alt="ASU Logo" style={{ width: '60px', height: '60px', background: '#ffffff', borderRadius: '0px', padding: '4px', objectFit: 'contain' }} crossOrigin="anonymous" />
              <div>
                <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>{student.name}</h1>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <p style={{ margin: '4px 0 0 0', fontSize: '16px', opacity: 0.9 }}>{student.id}</p>
                </div>
              </div>
            </div>
            <span style={{ background: 'rgba(255,255,255,0.2)', padding: '8px 16px', borderRadius: '0px', fontWeight: 'bold', fontSize: '14px', border: '1px solid rgba(255,255,255,0.3)' }}>
              {statusText}
            </span>
          </div>
          
          <div style={{ padding: '32px' }}>
            <div style={{ display: 'flex', background: '#f8fafc', borderRadius: '0px', marginBottom: '24px', border: '1px solid #e2e8f0' }}>
              <div style={{ flex: 1, textAlign: 'center', padding: '20px', borderRight: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '12px', textTransform: 'uppercase', color: '#64748b', fontWeight: 'bold' }}>Total Score</div>
                <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#0f172a', marginTop: '4px' }}>{fv.totalScore}%</div>
              </div>
              <div style={{ flex: 1, textAlign: 'center', padding: '20px' }}>
                <div style={{ fontSize: '12px', textTransform: 'uppercase', color: '#64748b', fontWeight: 'bold' }}>Final Grade</div>
                <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#0f172a', marginTop: '4px' }}>{fv.gradeLetter || '-'}</div>
              </div>
            </div>

            <table style={{ width: '100%', marginBottom: '24px', borderCollapse: 'collapse', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05), 0 2px 4px -2px rgb(0 0 0 / 0.05)' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', background: '#00786f', fontSize: '12px', textTransform: 'uppercase', color: '#FFFFFF', fontWeight: 'bold', borderBottom: '2px solid #005a52', padding: '14px 16px' }}>Assessment</th>
                  <th style={{ textAlign: 'left', background: '#00786f', fontSize: '12px', textTransform: 'uppercase', color: '#FFFFFF', fontWeight: 'bold', borderBottom: '2px solid #005a52', padding: '14px 16px' }}>Weight</th>
                  <th style={{ textAlign: 'left', background: '#00786f', fontSize: '12px', textTransform: 'uppercase', color: '#FFFFFF', fontWeight: 'bold', borderBottom: '2px solid #005a52', padding: '14px 16px' }}>Score</th>
                </tr>
              </thead>
              <tbody>
                {summativeGrades.map((g, idx) => (
                   <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                     <td style={{ borderBottom: '1px solid #e2e8f0', fontSize: '14px', color: '#334155', fontWeight: 600, padding: '14px 16px' }}>{g.label}</td>
                     <td style={{ borderBottom: '1px solid #e2e8f0', fontSize: '14px', color: '#334155', fontWeight: 600, padding: '14px 16px' }}>{g.weight}%</td>
                     <td style={{ borderBottom: '1px solid #e2e8f0', fontSize: '14px', color: '#334155', fontWeight: 600, padding: '14px 16px' }}>
                       {g.value ? g.value : <span style={{ color: '#ef4444', fontSize: '11px', fontWeight: 'bold', padding: '4px 8px', background: '#fef2f2', borderRadius: '6px', border: '1px solid #fee2e2', display: 'inline-block' }}>MISSED</span>}
                     </td>
                   </tr>
                ))}
              </tbody>
            </table>

            <div style={{ background: '#fdf4ff', padding: '24px', borderRadius: '0px', border: '1px solid #f3e8ff' }}>
              <h3 style={{ margin: '0 0 12px 0', fontSize: '13px', textTransform: 'uppercase', color: '#9333ea', fontWeight: 'bold' }}>Instructor Remarks</h3>
              <p style={{ margin: 0, fontSize: '14px', lineHeight: 1.6, color: '#4c1d95' }}>{remarks}</p>
            </div>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
