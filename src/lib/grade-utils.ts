import { StudentData, RAW_MARKS_LIMITS, AllCoursesData, SectionData } from '@/src/types';

export function getMidtermTotal(student: StudentData): number {
  const grades = student.grades || {};
  return (parseFloat(grades[13]) || 0) + (parseFloat(grades[14]) || 0);
}

export function getFinalTotal(student: StudentData): number {
  const grades = student.grades || {};
  return (parseFloat(grades[15]) || 0) + (parseFloat(grades[16]) || 0);
}

export function calculateSummativeValues(student: StudentData) {
  const grades = student.grades || {};
  
  const getVal = (key: number) => {
    const v = grades[key];
    return (v !== undefined && v !== null && v !== '') ? parseFloat(v) : NaN;
  };

  const part = getVal(3);
  const ePort = getVal(4);
  const pres = getVal(5);
  const pq1 = getVal(6);
  const pq2 = getVal(7);
  const t1 = getVal(8);
  const t2 = getVal(9);
  const sp = getVal(10);
  const wt = getVal(11);
  const wp = getVal(12);
  const mid1 = getVal(13);
  const mid2 = getVal(14);
  const fin1 = getVal(15);
  const fin2 = getVal(16);

  const format = (val: number) => isNaN(val) ? '' : val.toFixed(1).replace(/\.0$/, '');

  // Applying weights:
  const v1_raw = (!isNaN(part) || !isNaN(ePort)) ? ( ( (isNaN(part) ? 0 : part) + (isNaN(ePort) ? 0 : ePort) ) / 40 * 10 ) : NaN;
  const v2_raw = !isNaN(pres) ? (pres / 25 * 10) : NaN;
  const v3_raw = !isNaN(pq1) ? (pq1 / 10 * 2.5) : NaN;
  const v4_raw = !isNaN(pq2) ? (pq2 / 10 * 2.5) : NaN;
  const v5_raw = !isNaN(t1) ? (t1 / 20 * 5) : NaN;
  const v6_raw = !isNaN(t2) ? (t2 / 20 * 5) : NaN;
  const v7_raw = !isNaN(sp) ? (sp / 20 * 5) : NaN;
  const v8_raw = !isNaN(wt) ? (wt / 20 * 5) : NaN;
  const v9_raw = !isNaN(wp) ? (wp / 20 * 5) : NaN;
  const v10_raw = (!isNaN(mid1) || !isNaN(mid2)) ? ( ( (isNaN(mid1) ? 0 : mid1) + (isNaN(mid2) ? 0 : mid2) ) / 50 * 20 ) : NaN;
  const v11_raw = (!isNaN(fin1) || !isNaN(fin2)) ? ( ( (isNaN(fin1) ? 0 : fin1) + (isNaN(fin2) ? 0 : fin2) ) / 50 * 30 ) : NaN;

  const weights = [v1_raw, v2_raw, v3_raw, v4_raw, v5_raw, v6_raw, v7_raw, v8_raw, v9_raw, v10_raw, v11_raw];
  let totalNum = 0;
  let hasAny = false;
  weights.forEach(w => {
    if (!isNaN(w)) {
      totalNum += w;
      hasAny = true;
    }
  });

  return {
    v1: format(v1_raw), v2: format(v2_raw), v3: format(v3_raw), v4: format(v4_raw), 
    v5: format(v5_raw), v6: format(v6_raw), v7: format(v7_raw), v8: format(v8_raw), 
    v9: format(v9_raw), v10: format(v10_raw), v11: format(v11_raw),
    total: hasAny ? totalNum.toFixed(1).replace(/\.0$/, '') : ''
  };
}

export function calculateFinalValues(student: StudentData) {
  const sv = calculateSummativeValues(student);
  
  const f_v1 = sv.v1;
  const f_pres = sv.v2;
  const f_mid = sv.v10;
  const f_fin = sv.v11;
  
  // Tests is sum of v3 to v9
  const tests_list = [sv.v3, sv.v4, sv.v5, sv.v6, sv.v7, sv.v8, sv.v9];
  let tests_total = 0;
  let has_tests = false;
  tests_list.forEach(v => {
    if (v !== '') {
      tests_total += parseFloat(v);
      has_tests = true;
    }
  });

  const tests_str = has_tests ? tests_total.toFixed(1).replace(/\.0$/, '') : '';
  
  let total_num = 0;
  let has_any = false;
  [f_v1, tests_str, f_pres, f_mid, f_fin].forEach(v => {
    if (v !== '') {
      total_num += parseFloat(v);
      has_any = true;
    }
  });

  const format = (val: number) => isNaN(val) ? '' : val.toFixed(1).replace(/\.0$/, '');

  const totalScore = has_any ? format(total_num) : '';
  const scoreNum = parseFloat(totalScore) || 0;

  const rawStatus = getStudentStatus(student, scoreNum);
  const hasFinalEntered = (student.grades[15] !== undefined && student.grades[15] !== '') || 
                          (student.grades[16] !== undefined && student.grades[16] !== '');

  let finallyValue = rawStatus;
  // Do not show Pass, Not Pass or N/A until the final grades are done
  if (!hasFinalEntered && (rawStatus === 'Pass' || rawStatus === 'Not Pass' || rawStatus === 'None')) {
    finallyValue = '';
  } else if (finallyValue === 'None') {
    finallyValue = '';
  }

  let gradeLetter = '';
  // Calculate grade letter if we have any marks
  if (has_any) {
    // Special handling for FA/WA/PST - they shouldn't show a grade letter or should show F/None depending on policy
    if (['FA', 'WA', 'W'].includes(rawStatus)) {
      gradeLetter = 'F';
    } else if (rawStatus === 'PST' || rawStatus === 'IP' || rawStatus === 'I') {
      gradeLetter = '';
    } else {
      if (scoreNum >= 96) gradeLetter = 'A+';
      else if (scoreNum >= 92) gradeLetter = 'A';
      else if (scoreNum >= 90) gradeLetter = 'A-';
      else if (scoreNum >= 86) gradeLetter = 'B+';
      else if (scoreNum >= 82) gradeLetter = 'B';
      else if (scoreNum >= 80) gradeLetter = 'B-';
      else if (scoreNum >= 76) gradeLetter = 'C+';
      else if (scoreNum >= 72) gradeLetter = 'C';
      else if (scoreNum >= 70) gradeLetter = 'C-';
      else if (scoreNum >= 66) gradeLetter = 'D+';
      else if (scoreNum >= 62) gradeLetter = 'D';
      else if (scoreNum >= 60) gradeLetter = 'D-';
      else if (has_any) gradeLetter = 'F';
    }
  }

  return {
    participationPortfolio: f_v1,
    tests: tests_str,
    presentation: f_pres,
    midterm: f_mid,
    final: f_fin,
    totalScore: totalScore, // Always return the calculated total score
    finallyValue,
    gradeLetter, // Always return the calculated grade letter
    finallyClass: finallyValue === 'Pass' 
        ? (total_num >= 60 ? 'text-green-600 font-bold' : 'text-orange-600 font-bold') 
        : (['Not Pass', 'FA', 'WA', 'PST', 'R', 'F'].includes(finallyValue) ? 'text-red-600 font-bold' : (finallyValue ? 'text-amber-600 font-bold' : '')),
    gradeLetterClass: (gradeLetter === 'F' || finallyValue === 'FA' || finallyValue === 'WA') 
        ? 'text-red-600 font-bold' 
        : (gradeLetter ? 'text-green-600 font-bold' : ''),
    totalClass: has_any 
        ? (total_num >= 60 ? 'text-green-600 font-bold' : (total_num > 0 ? 'text-red-600 font-bold' : ''))
        : '',
    originalTotal: total_num,
    hasFinalEntered
  };
}

export function getPerformanceAnalysisData(student: StudentData) {
  const fv = calculateFinalValues(student);
  const grades = student.grades || {};
  const quiz1 = parseFloat(grades[6]) || 0;
  const test1 = parseFloat(grades[8]) || 0;
  const midterm = getMidtermTotal(student);
  const speaking = parseFloat(grades[10]) || 0;
  const quiz2 = parseFloat(grades[7]) || 0;
  const writing = parseFloat(grades[11]) || 0;

  const hasQuiz1 = grades[6] !== undefined && grades[6] !== '';
  const hasTest1 = grades[8] !== undefined && grades[8] !== '';
  const hasMidterm = (grades[13] !== undefined && grades[13] !== '') && (grades[14] !== undefined && grades[14] !== '');
  const hasSpeaking = grades[10] !== undefined && grades[10] !== '';
  const hasQuiz2 = grades[7] !== undefined && grades[7] !== '';
  const hasWriting = grades[11] !== undefined && grades[11] !== '';

  let academicStatus1 = '', academicStatus2 = '', academicStatus3 = '', overallStatus = '', atRiskCounts = 0, academicAtRiskCount = 0;

  if (hasQuiz1 && hasTest1) {
    const combined = (quiz1 + test1) / 30 * 100;
    academicStatus1 = combined >= 60 ? 'Normal' : 'At-Risk';
    if (academicStatus1 === 'At-Risk') {
      atRiskCounts++;
      academicAtRiskCount++;
    }
  }

  if (hasQuiz1 && hasTest1 && hasMidterm) {
    const combined = (quiz1 + test1 + midterm) / 80 * 100;
    academicStatus2 = combined >= 60 ? 'Normal' : 'At-Risk';
    if (academicStatus2 === 'At-Risk') {
      atRiskCounts++;
      academicAtRiskCount++;
    }
  }

  if (hasQuiz1 && hasTest1 && hasMidterm && hasSpeaking && hasQuiz2 && hasWriting) {
    const combined = (quiz1 + test1 + midterm + speaking + quiz2 + writing) / 130 * 100;
    academicStatus3 = combined >= 60 ? 'Normal' : 'At-Risk';
    if (academicStatus3 === 'At-Risk') {
      atRiskCounts++;
      academicAtRiskCount++;
    }
  }

  let totalEarned = 0;
  let totalMax = 0;
  let hasAnyAssessment = false;

  const assessmentKeys = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
  
  assessmentKeys.forEach(key => {
    if (grades[key] !== undefined && grades[key] !== '') {
      totalEarned += parseFloat(grades[key]) || 0;
      totalMax += RAW_MARKS_LIMITS[key];
      hasAnyAssessment = true;
    }
  });

  if (hasAnyAssessment && totalMax > 0) {
    const percentage = (totalEarned / totalMax) * 100;
    overallStatus = percentage >= 60 ? 'Normal' : 'At-Risk';
    if (overallStatus === 'At-Risk') {
      atRiskCounts++;
    }
  }

  // Calculate Absence Warnings - prioritize imported warning field
  let absenceWarning = student.warning?.trim() || '';
  
  // Check if there is ANY grade data entered
  const hasGrades = hasAnyAssessment;

  // Normalization: mapping to standard names and discarding junk (like "3.")
  const lowerWarning = absenceWarning.toLowerCase().trim();
  if (lowerWarning.replace(/\s/g, '').includes('1st') || lowerWarning.includes('10%')) {
    absenceWarning = '1st Warning';
  } else if (lowerWarning.replace(/\s/g, '').includes('2nd') || lowerWarning.includes('13.33%')) {
    absenceWarning = '2nd Warning';
  } else if (lowerWarning.replace(/\s/g, '').includes('3rd') || lowerWarning.includes('16.66%')) {
    absenceWarning = '3rd Warning';
  } else if (absenceWarning.toUpperCase() === 'FA' || lowerWarning.includes('fa')) {
    absenceWarning = 'FA Warning';
  } else if (lowerWarning === 'regular' || lowerWarning === 'normal') {
    absenceWarning = 'Regular';
  } else if (lowerWarning.includes('warning')) {
    // Keep generic warning text if it exists but wasn't caught above, 
    // but remove leading junk like "3. "
    absenceWarning = absenceWarning.replace(/^\d+[\.\s]*/, '').trim();
  } else {
    // Discard other text (like ID numbers or row indexes "3.")
    absenceWarning = hasGrades ? 'Regular' : '';
  }
  // Otherwise keep the original "x-warning" or whatever is in the field

  return {
    academicStatus1,
    academicStatus2,
    academicStatus3,
    overallStatus,
    absenceWarning,
    atRiskCounts: atRiskCounts === 0 ? '' : atRiskCounts.toString(),
    academicAtRiskCount,
    finallyValue: fv.finallyValue,
    finallyClass: fv.finallyClass,
  };
}

export function generatePetitionResponse(student: StudentData) {
  const fv = calculateFinalValues(student);
  const sv = calculateSummativeValues(student);
  const pa = getPerformanceAnalysisData(student);
  
  const totalScore = parseFloat(fv.totalScore) || 0;
  const status = getStudentStatus(student, totalScore);
  
  const isMale = student.gender === 'M';
  const isFemale = student.gender === 'F';
  const subCap = isMale ? 'He' : isFemale ? 'She' : 'They';
  const posCap = isMale ? 'His' : isFemale ? 'Her' : 'Their';
  const posLow = isMale ? 'his' : isFemale ? 'her' : 'their';

  // Direct response for FA status
  if (status === 'FA') {
    return "The student has exceeded the University the class attendance policy. This violation of the attendance requirements has resulted in an automatic failure (FA) for the course, regardless of academic performance.";
  }

  const isFail = totalScore > 0 && totalScore < 60;
  const isPass = totalScore >= 60;
  
  if (!isFail && !isPass && fv.finallyValue !== 'Not Pass') return '';

  let statement = "";

  if (isPass) {
    let performanceLevel = "Fair";
    if (totalScore >= 84) performanceLevel = "Excellent";
    else if (totalScore >= 74) performanceLevel = "Very Good";
    else if (totalScore >= 66) performanceLevel = "Good";

    statement += `The student has demonstrated ${performanceLevel} performance overall, achieving a final score of ${totalScore}% (${fv.gradeLetter}). `;

    // Participation check
    const partVal = parseFloat(sv.v1) || 0;
    const partPct = (partVal / 10) * 100;
    if (partPct >= 80) {
      statement += `${subCap} showed high interest and consistent engagement in classroom activities. `;
    } else if (partPct >= 60) {
      statement += `${posCap} participation and engagement levels were satisfactory. `;
    } else {
      statement += `While ${posLow} overall grade is passing, there is room for improvement in classroom participation. `;
    }

    statement += "Keep up the good work!";
    return statement;
  }
  
  // Apply failure specific statement
  statement = "The student's performance throughout the semester has been reviewed. ";

  // Participation check for failing students (sv.v1 is Part + Port, max 10)
  const partVal = parseFloat(sv.v1) || 0;
  const partPct = (partVal / 10) * 100;
  if (partPct < 60) {
    if (partPct < 20) {
      statement += "The student has shown a complete lack of interest towards the study, with negligible participation and engagement in classroom activities. ";
    } else if (partPct < 40) {
      statement += "The student has shown very low interest towards the study, frequently failing to engage with the course material and portfolio requirements. ";
    } else {
      statement += `The student has shown low interest towards the study, as ${posLow} participation and engagement levels were consistently below the required 60% threshold. `;
    }
  } else {
    statement += "While the student's participation was acceptable, other academic factors contributed to the final result. ";
  }

  // Other assessments check
  const failedAssessments: string[] = [];
  const missedAssessments: string[] = [];
  const assessments = [
    { label: 'Presentation', val: sv.v2, max: 10 },
    { label: 'Pop Quiz 1', val: sv.v3, max: 2.5 },
    { label: 'Pop Quiz 2', val: sv.v4, max: 2.5 },
    { label: 'Test 1 (GV)', val: sv.v5, max: 5 },
    { label: 'Test 2 (LR)', val: sv.v6, max: 5 },
    { label: 'Speaking Test', val: sv.v7, max: 5 },
    { label: 'Writing Test', val: sv.v8, max: 5 },
    { label: 'Writing Portfolio', val: sv.v9, max: 5 },
    { label: 'Midterm', val: sv.v10, max: 20 },
    { label: 'Final Exam', val: sv.v11, max: 30 }
  ];

  assessments.forEach(a => {
    const vStr = a.val ? String(a.val).trim() : '';
    const v = parseFloat(vStr) || 0;
    
    if (vStr === '' || vStr === '0') {
      missedAssessments.push(a.label);
    } else if ((v / a.max) * 100 < 60) {
      failedAssessments.push(a.label);
    }
  });

  if (missedAssessments.length > 0) {
    if (missedAssessments.length >= 3) {
      statement += `Critically, the student has missed several key assessments (${missedAssessments.join(', ')}), which indicates a significant lack of commitment to the course requirements. `;
    } else {
      statement += `The student failed to attempt certain assessments, specifically: ${missedAssessments.join(', ')}. `;
    }
  }

  if (failedAssessments.length > 0) {
    statement += `Furthermore, the student failed to meet the passing criteria in other assessments, including: ${failedAssessments.join(', ')}. Performance in these areas was consistently below the 60% passing mark. `;
  }

  // Academic At-Risks
  if (pa.academicAtRiskCount > 0) {
    statement += `Throughout the semester, the student was formally notified of ${posLow} 'At-Risk' status ${pa.academicAtRiskCount} times, yet failed to demonstrate sufficient academic recovery. `;
  }

  // Attendance
  const absVal = parseFloat(String(student.absentees || '0')) || 0;
  if (absVal > 0) {
    statement += `The student's attendance record shows ${absVal} hours, `;
    if (student.attendanceStatus && student.attendanceStatus !== 'N/A') {
      statement += `which led to a ${student.attendanceStatus} warning and severely hindered ${posLow} ability to keep up with the curriculum. `;
    } else {
      statement += `which negatively impacted ${posLow} learning consistency and overall performance. `;
    }
  } else {
    statement += `The student's attendance record shows no absent hours but could not do enough to pass the course. `;
  }

  statement += "In conclusion, the combination of low academic engagement, failure in multiple core assessments, and persistent at-risk status are the definitive factors that led to the student's failure in this course.";

  return statement;
}

export function getStudentStatus(student: StudentData, totalScore: number) {
  const n = (student.name || '').toUpperCase();
  const s = (student.status || '').toUpperCase();
  
  if (n.includes('(FA)') || s === 'FA') return 'FA';
  if (n.includes('(WA)') || s === 'WA') return 'WA';
  if (n.includes('(W)') || s === 'WA') return 'WA'; 
  if (n.includes('(IP)') || s === 'IP') return 'IP';
  if (n.includes('(I)') || s === 'I') return 'I';
  if (n.includes('(PST)') || s === 'PST') return 'PST';
  
  if (totalScore >= 60) return 'Pass';
  if (totalScore > 0) return 'Not Pass';
  
  return 'None';
}

export function calculateAtRiskDistribution(students: StudentData[]) {
  let zero = 0, range1 = 0, range2 = 0, range3 = 0, range4 = 0, range5 = 0, range6 = 0;
  let atRiskCount = 0;

  students.forEach(s => {
    if (!s.id && !s.name) return;
    const grades = s.grades || {};
    const participation = parseFloat(grades[3]) || 0;
    const ePortfolio = parseFloat(grades[4]) || 0;
    const partPortTotal = participation + ePortfolio;

    if (partPortTotal === 0) {
      zero++;
      atRiskCount++;
    } else if (partPortTotal >= 1 && partPortTotal <= 5.5) {
      range1++;
      atRiskCount++;
    } else if (partPortTotal >= 6 && partPortTotal <= 11.5) {
      range2++;
      atRiskCount++;
    } else if (partPortTotal >= 12 && partPortTotal <= 16) {
      range3++;
      atRiskCount++;
    } else if (partPortTotal >= 16.5 && partPortTotal <= 20) {
      range4++;
    } else if (partPortTotal >= 21 && partPortTotal <= 24.5) {
      range5++;
    } else if (partPortTotal >= 25 && partPortTotal <= 27.5) {
      range6++;
    }
  });

  return { zero, range1, range2, range3, range4, range5, range6, atRiskCount };
}

export function getCourseReportSummary(allData: AllCoursesData, semester?: string) {
  const courseSummary: {
    [key: string]: {
      courseName: string;
      instructors: Set<string>;
      totalStudents: number;
      totalSections: number;
      passed: number;
      failed: number;
      fas: number;
      ws: number;
      psts: number;
      ips: number;
      is: number;
      others: number;
    }
  } = {};

  Object.values(allData).forEach((s) => {
    const section = s as SectionData;
    
    // Filter by semester if provided
    if (semester && semester !== 'Semester' && section.formData.semester !== semester) {
      return;
    }

    const key = `${section.formData.courseTitle || section.formData.course}`;
    if (!courseSummary[key]) {
      courseSummary[key] = {
        courseName: key,
        instructors: new Set(),
        totalStudents: 0,
        totalSections: 0,
        passed: 0,
        failed: 0,
        fas: 0,
        ws: 0,
        psts: 0,
        ips: 0,
        is: 0,
        others: 0,
      };
    }
    const sum = courseSummary[key];
    if (section.formData.instructor) sum.instructors.add(section.formData.instructor);
    sum.totalStudents += section.students.length;
    sum.totalSections += 1;

    section.students.forEach(student => {
      const fv = calculateFinalValues(student);
      const status = getStudentStatus(student, parseFloat(fv.totalScore) || 0);
      if (status === 'Pass') sum.passed++;
      else if (['Not Pass', 'FA', 'WA', 'R'].includes(status)) sum.failed++;
      
      if (status === 'FA') sum.fas++;
      else if (status === 'WA') sum.ws++;
      else if (status === 'PST') sum.psts++;
      else if (status === 'IP') sum.ips++;
      else if (status === 'I') sum.is++;
      else if (status === 'None' || !['Pass', 'Not Pass', 'FA', 'WA', 'IP', 'I', 'PST'].includes(status)) sum.others++;
    });
  });

  const results = Object.values(courseSummary).map(s => ({
    ...s,
    instructors: Array.from(s.instructors).join(', ')
  }));

  // Filter out default "GFP English" / "Instructor's Name" row if we have real/non-empty courses (courses with students)
  const hasRealCourses = results.some(r => r.totalStudents > 0 && r.courseName !== 'GFP English' && r.courseName !== 'GFP English (FP00000)');
  if (hasRealCourses) {
    return results.filter(r => {
      const isDefaultRow = (r.courseName === 'GFP English' || r.courseName === 'GFP English (FP00000)' || r.courseName.includes('FP00000')) && 
                           (r.totalStudents === 0 || r.instructors.includes("Instructor's Name"));
      return !isDefaultRow;
    });
  }

  return results;
}

export function getGradeColor(value: string, max: number) {
  const num = parseFloat(value);
  if (!isNaN(num) && max > 0) {
    const pct = (num / max) * 100;
    if (pct < 60) return 'text-red-600 font-bold';
    return 'text-green-600 font-bold';
  }
  return 'text-slate-600';
}

export function getGradeColorClass(value: string, index: number) {
  const num = parseFloat(value);
  const max = RAW_MARKS_LIMITS[index];
  if (!isNaN(num) && max && num > 0) {
    const pct = (num / max) * 100;
    if (pct < 60) return 'text-red-600 font-bold';
    return 'text-slate-900';
  }
  return '';
}

export function parseStudentName(name: string): { cleanedName: string, gender: 'M' | 'F' | undefined, status: string | undefined } {
  let tempName = name || '';
  
  // Extract status
  const statusMatch = tempName.match(/\((FA|W|WA|PST)\)/i);
  const status = statusMatch ? statusMatch[1].toUpperCase() : undefined;
  
  // Remove status indicators
  tempName = tempName.replace(/\((FA|W|WA|PST)\)/gi, '');
  
  const genderMatch = tempName.match(/[\(\-]([MF])[\)\s]*$/i);
  const gender = genderMatch ? (genderMatch[1].toUpperCase() as 'M' | 'F') : undefined;
  
  // Clean the name - also remove leading numbers/dots common in imports (e.g. "3. John Doe")
  const cleanedName = tempName.replace(/^\d+[\.\s]*/, '').replace(/\s*[\(\-][MF][\)\s]*$/i, '').trim();
  
  return { cleanedName, gender, status };
}

export const generateSISExportScript = (students: StudentData[]) => {
  const sanitize = (value: string | undefined) => {
    if (value === undefined || value === null || value === '') return '';
    const num = parseFloat(value);
    if (isNaN(num)) return '';
    return Math.round(num * 10) / 10;
  };

  const exportData = students.map(s => {
    const fv = calculateFinalValues(s);
    const name = s.name || '';
    const { gender, status: parsedStatus } = parseStudentName(name);
    
    const finalStatus = (s.status || parsedStatus || '').toUpperCase();
    const hasSkipStatus = ['FA', 'W', 'WA', 'PST'].includes(finalStatus);
    
    let skipReason = finalStatus;

    return {
      'Student Id': s.id || '',
      'Student Name': name,
      'Gender': gender,
      'HasFA': hasSkipStatus,
      'SkipReason': skipReason,
      'GRD1': hasSkipStatus ? 'SKIP' : sanitize(fv.participationPortfolio),
      'GRD2': hasSkipStatus ? 'SKIP' : sanitize(fv.tests),
      'GRD3': hasSkipStatus ? 'SKIP' : sanitize(fv.presentation),
      'GRD4': hasSkipStatus ? 'SKIP' : sanitize(fv.midterm),
      'GRD8': hasSkipStatus ? 'SKIP' : sanitize(fv.final)
    };
  });

  return `// ============================================
// CLFS Grade Import Script for Oracle APEX
// ============================================
// SKIPS STUDENTS WITH: (FA), (W), (WA), (PST) STATUS
// ============================================
(async function() {
  console.log('%c🔍 CLFS Grade Import Script', 'background: #2196F3; color: white; font-size: 14px; padding: 5px;');
  console.log('%c⏭️ Skipping students with: FA, W, WA, PST', 'background: #ff9800; color: white; font-size: 12px; padding: 3px;');
  
  const __controller = {
    _isPaused: false, _shouldStop: false, _isRunning: false, _cleanupDone: false, _pauseResolve: null,
    showMessage(msg, color='green') {
        const div = document.createElement('div');
        div.innerText = msg;
        div.style.position = 'fixed';
        div.style.top = '10px';
        div.style.right = '10px';
        div.style.backgroundColor = color;
        div.style.color = 'white';
        div.style.padding = '10px';
        div.style.borderRadius = '5px';
        div.style.zIndex = '999999';
        document.body.appendChild(div);
        setTimeout(() => div.remove(), 3000);
        return msg;
    },
    stop() { if (!this._shouldStop && this._isRunning) { this._shouldStop = true; this._isPaused = false; console.log('%c⏹️ STOPPING', 'background: #f44336; color: white;'); if (this._pauseResolve) { this._pauseResolve(); this._pauseResolve = null; } return this.showMessage('Grades Transferring Stopped', '#4CAF50'); } },
    async _check() { if (this._shouldStop) throw new Error('STOPPED_BY_USER'); while (this._isPaused) { await new Promise(resolve => { this._pauseResolve = resolve; }); if (this._shouldStop) throw new Error('STOPPED_BY_USER'); } },
    _start() { this._isRunning = true; this._shouldStop = false; this._isPaused = false; this._cleanupDone = false; },
    _end() { this._isRunning = false; }
  };
  
  window.__controller = __controller;
  __controller._start();
  
  const studentData = ${JSON.stringify(exportData, null, 2)};
  const activeStudents = studentData.filter(s => !s.HasFA);
  const skippedStudents = studentData.filter(s => s.HasFA);
  
  console.log(\`📊 Total: \${studentData.length} | ✅ Active: \${activeStudents.length} | ⏭️ Skipped: \${skippedStudents.length}\`);
  
  const studentMap = new Map();
  activeStudents.forEach(s => { studentMap.set(String(s['Student Id']).trim(), s); });

  function delay(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
  function sanitizeGrade(value) {
    if (!value || value === '' || value === '0' || value === '0.0' || value === '0.00') return '';
    const numValue = parseFloat(value);
    return isNaN(numValue) ? '' : Math.round(numValue * 10) / 10;
  }

  function getColumnIndices() {
    const tables = document.querySelectorAll('table');
    let targetTable = null;
    for (let table of tables) {
      const headers = table.querySelectorAll('thead th, thead td');
      if (headers.length > 0) {
        const headerText = Array.from(headers).map(h => h.innerText.toLowerCase()).join(' ');
        if (headerText.includes('student id') && (headerText.includes('participation') || headerText.includes('tests'))) {
          targetTable = table;
          break;
        }
      }
    }
    if (!targetTable) return { studentId: 0, studentName: 1, participation: 2, tests: 3, presentation: 4, midterm: 5, final: 6 };
    const headers = targetTable.querySelectorAll('thead th, thead td');
    const indices = { studentId: -1, studentName: -1, participation: -1, tests: -1, presentation: -1, midterm: -1, final: -1 };
    headers.forEach((th, idx) => {
      const text = th.innerText.trim().toLowerCase();
      if (text.includes('student id')) indices.studentId = idx;
      else if (text.includes('student name')) indices.studentName = idx;
      else if (text.includes('participation')) indices.participation = idx;
      else if (text.includes('tests')) indices.tests = idx;
      else if (text.includes('presentation')) indices.presentation = idx;
      else if (text.includes('midterm')) indices.midterm = idx;
      else if (text.includes('final')) indices.final = idx;
    });
    return indices;
  }

  async function clickAndFillByColumn(row, columnIndex, value, fieldName, isFirstCell = false) {
    if (columnIndex === -1) return false;
    const cells = row.querySelectorAll('td');
    if (!cells[columnIndex]) return false;
    const cell = cells[columnIndex];
    try {
      cell.scrollIntoView({ behavior: 'smooth', block: 'center' });
      await delay(200);
      await __controller._check();
      cell.click();
      await delay(250);
      if (isFirstCell) { cell.click(); await delay(200); }
      let inputElement = cell.getAttribute('contenteditable') === 'true' ? cell : cell.querySelector('input, textarea, [contenteditable="true"], .apex-item-text, .apex-item-textarea');
      const cleanValue = sanitizeGrade(value);
      if (inputElement) {
        inputElement.focus();
        await delay(150);
        if (inputElement.getAttribute('contenteditable') === 'true') inputElement.innerText = '';
        else inputElement.value = '';
        if (cleanValue !== '') {
          if (inputElement.getAttribute('contenteditable') === 'true') inputElement.innerText = cleanValue;
          else inputElement.value = cleanValue;
        }
        inputElement.dispatchEvent(new Event('focus', { bubbles: true }));
        inputElement.dispatchEvent(new Event('input', { bubbles: true }));
        inputElement.dispatchEvent(new Event('change', { bubbles: true }));
        await delay(100);
        inputElement.dispatchEvent(new Event('blur', { bubbles: true }));
        inputElement.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Enter' }));
        console.log(\`   ✅ \${fieldName}: \${cleanValue || '(empty)'}\`);
        return true;
      } else {
        cell.innerText = cleanValue;
        cell.dispatchEvent(new Event('input', { bubbles: true }));
        console.log(\`   ✅ \${fieldName}: \${cleanValue || '(empty)'} (direct)\`);
        return true;
      }
    } catch (e) {
      if (e.message === 'STOPPED_BY_USER') throw e;
      return false;
    }
  }

  async function processStudentRow(row, student, colIndices) {
    console.log(\`\\n📝 \${student['Student Id']} - \${student['Student Name']}\`);
    const fields = [
      { field: 'GRD1', colIndex: colIndices.participation, desc: 'Participation [10%]', isFirst: true },
      { field: 'GRD2', colIndex: colIndices.tests, desc: 'Tests [30%]', isFirst: false },
      { field: 'GRD3', colIndex: colIndices.presentation, desc: 'Presentation [10%]', isFirst: false },
      { field: 'GRD4', colIndex: colIndices.midterm, desc: 'Midterm [20%]', isFirst: false },
      { field: 'GRD8', colIndex: colIndices.final, desc: 'Final [30%]', isFirst: false }
    ];
    let filledCount = 0;
    for (let i = 0; i < fields.length; i++) {
      const f = fields[i];
      await __controller._check();
      const success = await clickAndFillByColumn(row, f.colIndex, student[f.field], f.desc, f.isFirst);
      if (success) filledCount++;
      await delay(f.isFirst ? 500 : 250);
    }
    console.log(\`   ✓ Completed: \${filledCount}/5\`);
    const finalColIndex = colIndices.final;
    if (finalColIndex !== -1 && row.cells[finalColIndex]) row.cells[finalColIndex].dispatchEvent(new Event('blur', { bubbles: true }));
    await delay(800);
    return filledCount;
  }

  function getStudentRows(colIndices) {
    const rows = [];
    const allRows = document.querySelectorAll('tr');
    for (let row of allRows) {
      if (row.querySelector('th')) continue;
      const cells = row.querySelectorAll('td');
      if (cells.length < 2) continue;
      let studentId = null;
      if (colIndices.studentId !== -1 && cells[colIndices.studentId]) {
        const idMatch = cells[colIndices.studentId]?.innerText?.match(/\\d{7}/);
        if (idMatch) studentId = idMatch[0];
      }
      if (!studentId && colIndices.studentName !== -1 && cells[colIndices.studentName]) {
        const idMatch = cells[colIndices.studentName]?.innerText?.match(/\\d{7}/);
        if (idMatch) studentId = idMatch[0];
      }
      if (!studentId) {
        const stuIdInput = row.querySelector('input[id*="STU_ID"], input[name*="STU_ID"]');
        if (stuIdInput && stuIdInput.value) studentId = String(stuIdInput.value).trim();
      }
      if (studentId && studentMap.has(studentId)) rows.push({ row, studentId });
    }
    return rows;
  }

  function findNextButton() {
    const allElements = document.querySelectorAll('button, a, span, [role="button"], .a-Button, .t-Button');
    for (let el of allElements) {
      if (el.offsetParent === null) continue;
      const text = (el.textContent || '').toLowerCase();
      if (text.includes('next') || text === '>' || text.includes('→')) return el;
    }
    return null;
  }

  console.log('⏳ Starting import...');
  await delay(2000);
  const colIndices = getColumnIndices();
  let pageNum = 1, totalProcessed = 0, totalFilled = 0, maxPages = 50, stoppedByUser = false;
  
  try {
    while (pageNum <= maxPages && studentMap.size > 0) {
      await __controller._check();
      console.log(\`\\n📄 PAGE \${pageNum}\`);
      const studentRows = getStudentRows(colIndices);
      console.log(\`Found \${studentRows.length} students\`);
      for (let { row, studentId } of studentRows) {
        await __controller._check();
        const student = studentMap.get(studentId);
        if (!student) continue;
        totalFilled += await processStudentRow(row, student, colIndices);
        totalProcessed++;
        studentMap.delete(studentId);
        await delay(1000);
      }
      if (studentMap.size === 0) break;
      await __controller._check();
      const nextButton = findNextButton();
      if (nextButton) { nextButton.click(); await delay(3500); pageNum++; }
      else break;
    }
  } catch (e) {
    if (e.message === 'STOPPED_BY_USER') stoppedByUser = true;
    else throw e;
  } finally { __controller._end(); }

  console.log('\\n' + '='.repeat(60));
  if (stoppedByUser) console.log('%c⏹️ STOPPED - Partial data processed', 'background: #ff9800; color: white;');
  else if (studentMap.size === 0) console.log('%c✅ COMPLETE!', 'background: #4CAF50; color: white;');
  else console.log('%c⚠️ PARTIAL', 'background: #ff9800; color: white;');
  console.log(\`Processed: \${totalProcessed}/\${activeStudents.length} | Fields filled: \${totalFilled}\`);
  console.log('='.repeat(60));
  return { success: !stoppedByUser && studentMap.size === 0, processed: totalProcessed, fieldsFilled: totalFilled };
})();`;
};

export const generateSISCleanScript = (students: StudentData[]) => {
  const cleanGradesData = students.map(s => {
    const name = s.name || '';
    const { gender, status: parsedStatus } = parseStudentName(name);
    
    const finalStatus = (s.status || parsedStatus || '').toUpperCase();
    const hasSkipStatus = ['FA', 'W', 'WA', 'PST'].includes(finalStatus);
    
    return {
      stu_id: s.id || '',
      stu_name: name,
      gender: gender,
      skip: hasSkipStatus,
      g1: hasSkipStatus ? 'SKIP' : '',
      g2: hasSkipStatus ? 'SKIP' : '',
      g3: hasSkipStatus ? 'SKIP' : '',
      g4: hasSkipStatus ? 'SKIP' : '',
      g8: hasSkipStatus ? 'SKIP' : ''
    };
  });

  return `(async function() {
  console.log('CLEANING GRADES...');
  
  const __controller = {
    _isPaused: false, _shouldStop: false, _isRunning: false, _cleanupDone: false, _pauseResolve: null,
    showMessage(msg, color='green') {
        const div = document.createElement('div');
        div.innerText = msg;
        div.style.position = 'fixed';
        div.style.top = '10px';
        div.style.right = '10px';
        div.style.backgroundColor = color;
        div.style.color = 'white';
        div.style.padding = '10px';
        div.style.borderRadius = '5px';
        div.style.zIndex = '999999';
        document.body.appendChild(div);
        setTimeout(() => div.remove(), 3000);
        return msg;
    },
    stop() { if (!this._shouldStop && this._isRunning) { this._shouldStop = true; this._isPaused = false; if (this._pauseResolve) { this._pauseResolve(); this._pauseResolve = null; } return this.showMessage('Grades Transferring Stopped', '#4CAF50'); } },
    async _check() { if (this._shouldStop) throw new Error('STOPPED_BY_USER'); while (this._isPaused) { await new Promise(resolve => { this._pauseResolve = resolve; }); if (this._shouldStop) throw new Error('STOPPED_BY_USER'); } },
    _start() { this._isRunning = true; this._shouldStop = false; this._isPaused = false; this._cleanupDone = false; },
    _end() { this._isRunning = false; }
  };
  
  window.__controller = __controller;
  __controller._start();
  
  const studentData = ${JSON.stringify(cleanGradesData)};
  const activeStudents = studentData.filter(s => !s.skip);
  const skippedStudents = studentData.filter(s => s.skip);
  
  console.log('Total: ' + studentData.length + ' | Active to CLEAN: ' + activeStudents.length);
  
  const studentMap = new Map();
  activeStudents.forEach(s => { 
    const rawId = String(s.stu_id).trim();
    const noLeadingZeros = rawId.replace(/^0+/, '');
    studentMap.set(rawId, s); 
    if (noLeadingZeros !== rawId) studentMap.set(noLeadingZeros, s);
    // Also add versions with leading zeros if they are missing
    studentMap.set(rawId.padStart(7, '0'), s);
    studentMap.set(rawId.padStart(8, '0'), s);
  });

  function delay(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

  function getColumnIndices() {
    const allRows = document.querySelectorAll('tr');
    let targetRow = null;
    let targetTable = null;
    
    for (let row of allRows) {
      const text = row.innerText.toLowerCase();
      if ((text.includes('student id') || text.includes('id number')) && (text.includes('participation') || text.includes('tests') || text.includes('final'))) {
        targetRow = row;
        targetTable = row.closest('table');
        console.log('✅ Found header row (clean):', text.substring(0, 50) + '...');
        break;
      }
    }
    
    const defaultIndices = { studentId: 0, studentName: 1, participation: 2, tests: 3, presentation: 4, midterm: 5, final: 6 };
    if (!targetRow) {
        console.warn('⚠️ Header row not found by keywords. Using defaults.');
        return { indices: defaultIndices, table: null, headerRow: null };
    }
    
    const cells = targetRow.cells;
    const indices = { studentId: -1, studentName: -1, participation: -1, tests: -1, presentation: -1, midterm: -1, final: -1 };
    
    console.log('--- Current Header Cells (Clean) ---');
    for (let i = 0; i < cells.length; i++) {
        const text = cells[i].innerText.trim().toLowerCase();
        console.log('Column ' + i + ': "' + text + '"');
        if (text.includes('student id') || text.includes('id number') || (text.includes('id') && text.length < 5)) indices.studentId = i;
        else if (text.includes('student name') || text.includes('name')) indices.studentName = i;
        else if (text.includes('participation') || text.includes('e-portfolio') || text.includes('part')) indices.participation = i;
        else if (text.includes('tests')) indices.tests = i;
        else if (text.includes('presentation')) indices.presentation = i;
        else if (text.includes('midterm')) indices.midterm = i;
        else if (text.includes('final')) indices.final = i;
    }
    
    if (indices.studentId === -1) {
        indices.studentId = cells.length > 2 ? 2 : 0;
    }
    
    return { indices, table: targetTable, headerRow: targetRow };
  }

  async function clickAndClearByColumn(row, columnIndex, fieldName, isFirstCell = false) {
    if (columnIndex === -1) return false;
    const cells = row.cells;
    if (!cells[columnIndex]) return false;
    const cell = cells[columnIndex];
    try {
      cell.scrollIntoView({ behavior: 'smooth', block: 'center' });
      await delay(250);
      await __controller._check();
      
      // Activation sequence: multiple events to ensure focus and edit mode
      const events = ['mousedown', 'mouseup', 'click', 'focus'];
      events.forEach(evt => cell.dispatchEvent(new MouseEvent(evt, { bubbles: true, cancelable: true, view: window })));
      
      // Try to click any span or label that might be covering the input
      const cover = cell.querySelector('span, label, .a-GV-cell-display');
      if (cover) {
        cover.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
        cover.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
        cover.click();
        await delay(100);
      }
      
      await delay(150);
      cell.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true, view: window }));
      cell.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Enter', code: 'Enter' }));
      await delay(450);
      
      if (isFirstCell) { 
        cell.click(); 
        await delay(200);
        cell.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true, view: window }));
        await delay(450); 
      }
      
      let inputElement = cell.querySelector('input, textarea, [contenteditable="true"], .apex-item-text, .apex-item-textarea, .GRD_ITEM, input[id^="GRD"]');
      
      // Fallback: check active element if no input found in cell
      if (!inputElement && document.activeElement && 
          (document.activeElement.tagName === 'INPUT' || 
           document.activeElement.tagName === 'TEXTAREA' || 
           document.activeElement.isContentEditable)) {
        inputElement = document.activeElement;
      }

      // Second Fallback: Try to find any input that might have appeared in the DOM
      if (!inputElement) {
        inputElement = document.querySelector('input.active, input.editing, .a-GV-input, .a-GV-cell.is-editing input, .a-GV-editor input');
      }

      // Third Fallback: If still nothing, try one more aggressive click and wait
      if (!inputElement) {
        cell.click();
        await delay(300);
        inputElement = document.querySelector('input.active, input.editing, .a-GV-input, .a-GV-cell.is-editing input, .a-GV-editor input, .apex-item-text:focus, .apex-item-textarea:focus');
      }
      
      if (!inputElement && window.apex && window.apex.item) {
        const activeId = document.activeElement?.id;
        if (activeId) inputElement = document.getElementById(activeId);
      }

      if (inputElement) {
        inputElement.focus();
        await delay(200);
        
        try {
          inputElement.select();
          document.execCommand('delete', false);
          await delay(50);
          document.execCommand('insertText', false, '');
          
          if (inputElement.value !== '') {
            inputElement.value = '';
          }
        } catch (err) {
          inputElement.value = '';
        }
        
        const changeEvents = ['input', 'change', 'blur'];
        changeEvents.forEach(evt => inputElement.dispatchEvent(new Event(evt, { bubbles: true })));
        
        await delay(200);
        inputElement.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Enter', code: 'Enter' }));
        console.log('   ✅ ' + fieldName + ': CLEARED');
        return true;
      } else {
        cell.innerText = '';
        cell.dispatchEvent(new Event('input', { bubbles: true }));
        console.log('   ✅ ' + fieldName + ': CLEARED (direct)');
        return true;
      }
    } catch (e) {
      if (e.message === 'STOPPED_BY_USER') throw e;
      console.error('   ❌ Error clearing ' + fieldName + ':', e);
      return false;
    }
  }

  async function processStudentRowForClean(row, student, colIndices) {
    console.log("------------------------------------------");
    console.log("Cleaning: " + student.stu_id + " - " + student.stu_name);
    const fields = [
      { colIndex: colIndices.participation, desc: 'Participation [10%]', isFirst: true },
      { colIndex: colIndices.tests, desc: 'Tests [30%]', isFirst: false },
      { colIndex: colIndices.presentation, desc: 'Presentation [10%]', isFirst: false },
      { colIndex: colIndices.midterm, desc: 'Midterm [20%]', isFirst: false },
      { colIndex: colIndices.final, desc: 'Final [30%]', isFirst: false }
    ];
    let clearedCount = 0;
    for (let i = 0; i < fields.length; i++) {
      const f = fields[i];
      await __controller._check();
      const success = await clickAndClearByColumn(row, f.colIndex, f.desc, f.isFirst);
      if (success) clearedCount++;
      await delay(f.isFirst ? 500 : 250);
    }
    console.log('   ✓ Cleared: ' + clearedCount + '/5');
    const finalColIndex = colIndices.final;
    if (finalColIndex !== -1 && row.cells[finalColIndex]) row.cells[finalColIndex].dispatchEvent(new Event('blur', { bubbles: true }));
    await delay(800);
    return clearedCount;
  }

  function getStudentRowsForClean(colIndices, targetTable, headerRow, doc) {
    const rows = [];
    const allRows = targetTable ? targetTable.querySelectorAll('tr') : (doc || document).querySelectorAll('tr');
    console.log('🔍 Scanning ' + allRows.length + ' rows for students to clean...');
    
    let matchCount = 0;
    let debugCount = 0;
    for (let row of allRows) {
      // Include all rows, don't skip based on headerRow or THEAD
      
      const cells = row.cells;
      if (!cells || cells.length < 2) continue;
      
      let studentId = null;
      let detectedIds = [];
      
      // Log first few rows for debugging if no matches found yet
      if (matchCount === 0 && debugCount < 10) {
        console.log('   DEBUG Row ' + debugCount + ' text:', row.innerText.substring(0, 150).replace(/\\n/g, ' ') + '...');
        debugCount++;
      }
      
      // Strategy 1: Check the identified Student ID column
      if (colIndices.studentId !== -1 && cells[colIndices.studentId]) {
        const cellText = cells[colIndices.studentId].innerText.trim();
        if (cellText) {
          const idMatch = cellText.match(/\\d{4,12}/);
          if (idMatch) detectedIds.push(idMatch[0]);
          if (/^\\d+$/.test(cellText)) detectedIds.push(cellText);
        }
      }
      
      // Strategy 2: Check the Student Name column
      if (colIndices.studentName !== -1 && cells[colIndices.studentName]) {
        const cellText = cells[colIndices.studentName].innerText.trim();
        const idMatch = cellText.match(/\\d{4,12}/);
        if (idMatch) detectedIds.push(idMatch[0]);
      }
      
      // Strategy 3: Look for common ID inputs or attributes
      const stuIdInput = row.querySelector('input[id*="STU_ID"], input[name*="STU_ID"], input[id*="STUDENT_ID"], input[name*="STUDENT_ID"], [data-id], [data-value]');
      if (stuIdInput) {
        const val = (stuIdInput.value || stuIdInput.getAttribute('data-id') || stuIdInput.getAttribute('data-value') || '').trim();
        const idMatch = val.match(/\\d{4,12}/);
        if (idMatch) detectedIds.push(idMatch[0]);
        if (/^\\d+$/.test(val)) detectedIds.push(val);
      }
      
      // Strategy 4: scan all cells
      for (let cell of cells) {
        const text = cell.innerText.trim();
        const idMatch = text.match(/(\\d{4,12})/);
        if (idMatch) detectedIds.push(idMatch[1]);
      }
      
      // Strategy 5: scan entire row text for any sequence of 4-12 digits
      const rowText = row.innerText.trim();
      const allMatches = rowText.match(/(\\d{4,12})/g);
      if (allMatches) allMatches.forEach(m => detectedIds.push(m));
      
      // Try to find a match
      for (let id of detectedIds) {
        const cleanId = String(id).trim();
        if (studentMap.has(cleanId)) {
          studentId = cleanId;
          break;
        }
        const noLeadingZeros = cleanId.replace(/^0+/, '');
        if (studentMap.has(noLeadingZeros)) {
          studentId = noLeadingZeros;
          break;
        }
        const paddedId = cleanId.padStart(7, '0');
        if (studentMap.has(paddedId)) {
          studentId = paddedId;
          break;
        }
        const paddedId8 = cleanId.padStart(8, '0');
        if (studentMap.has(paddedId8)) {
          studentId = paddedId8;
          break;
        }
      }

      // Strategy 6: Fallback to name matching
      if (!studentId && colIndices.studentName !== -1 && cells[colIndices.studentName]) {
        const sisName = cells[colIndices.studentName].innerText.trim().toLowerCase();
        if (sisName.length > 5) {
          for (let [id, student] of studentMap.entries()) {
            const myRawName = (student['Student Name'] || '').toLowerCase();
            if (sisName.includes(myRawName) || myRawName.includes(sisName)) {
              studentId = id;
              console.log('   ℹ️ Matched by name fallback (clean): ' + student['Student Name']);
              break;
            }
          }
        }
      }
      
      if (studentId) {
        rows.push({ row, studentId });
        matchCount++;
      }
    }
    
    if (matchCount === 0) {
      console.warn('❌ NO STUDENTS MATCHED FOR CLEANING.');
    } else {
      console.log('✅ Matched ' + matchCount + ' students to clean on this page');
    }
    return rows;
  }

  function findNextButton() {
    const allElements = document.querySelectorAll('button, a, span, [role="button"], .a-Button, .t-Button');
    for (let el of allElements) {
      if (el.offsetParent === null) continue;
      const text = (el.textContent || '').toLowerCase();
      if (text.includes('next') || text === '>' || text.includes('→')) return el;
    }
    return null;
  }

  console.log('⏳ Starting grade cleaning...');
  await delay(2000);
  const { indices: colIndices, table: targetTable, headerRow, doc } = getColumnIndices();
  if (!headerRow) {
    console.error('❌ Could not find the grades table header. Please make sure you are on the correct SIS page.');
    __controller._end();
    return;
  }
  
  let pageNum = 1, totalProcessed = 0, totalCleared = 0, maxPages = 50, stoppedByUser = false;
  
  try {
    while (pageNum <= maxPages && studentMap.size > 0) {
      await __controller._check();
      console.log('\\n📄 PAGE ' + pageNum);
      const studentRows = getStudentRowsForClean(colIndices, targetTable, headerRow, doc);
      console.log('Found ' + studentRows.length + ' students to clean');
      for (let { row, studentId } of studentRows) {
        await __controller._check();
        const student = studentMap.get(studentId);
        if (!student) continue;
        totalCleared += await processStudentRowForClean(row, student, colIndices);
        totalProcessed++;
        
        const rawId = String(student['Student Id']).trim();
        const noLeadingZeros = rawId.replace(/^0+/, '');
        studentMap.delete(rawId);
        studentMap.delete(noLeadingZeros);
        studentMap.delete(rawId.padStart(8, '0'));
        
        await delay(1000);
      }
      if (studentMap.size === 0) break;
      await __controller._check();
      const nextButton = findNextButton();
      if (nextButton) { nextButton.click(); await delay(3500); pageNum++; }
      else break;
    }
  } catch (e) {
    if (e.message === 'STOPPED_BY_USER') stoppedByUser = true;
    else throw e;
  } finally { __controller._end(); }

  console.log('\\n' + '='.repeat(60));
  if (stoppedByUser) console.log('%c⏹️ STOPPED - Partial data cleaned', 'background: #ff9800; color: white;');
  else if (studentMap.size === 0) console.log('%c✅ CLEANING COMPLETE!', 'background: #4CAF50; color: white;');
  else console.log('%c⚠️ PARTIAL', 'background: #ff9800; color: white;');
  console.log('Cleaned: ' + totalProcessed + '/' + activeStudents.length + ' | Fields cleared: ' + totalCleared);
  console.log('='.repeat(60));
  return { success: !stoppedByUser && studentMap.size === 0, processed: totalProcessed, fieldsCleared: totalCleared };
})();`;
};
