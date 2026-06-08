import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { Resend } from 'resend';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from "@google/genai";
import { readDb, writeDb } from "./server-db.js";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Database API - Login
  app.post("/api/auth/login", (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, error: "Username and password required" });
    }
    const db = readDb();
    const foundUser = db.users[username];
    if (foundUser) {
      if (foundUser.password !== password) {
        return res.status(401).json({ success: false, error: "Invalid credentials" });
      }
      if (!foundUser.approved) {
        return res.status(403).json({ success: false, error: "Account pending approval" });
      }
      return res.json({ success: true, user: foundUser });
    }
    return res.status(404).json({ success: false, error: "Please contact Admin to add your credentials" });
  });

  // Database API - Change Password
  app.post("/api/auth/change-password", (req, res) => {
    const { username, newPassword } = req.body;
    const db = readDb();
    if (db.users[username]) {
      db.users[username].password = newPassword;
      db.users[username].mustChangePassword = false;
      writeDb(db);
      return res.json({ success: true, user: db.users[username] });
    }
    return res.status(404).json({ success: false, error: "User not found" });
  });

  // Database API - Skip Password Change
  app.post("/api/auth/skip-password-change", (req, res) => {
    const { username } = req.body;
    const db = readDb();
    if (db.users[username]) {
      db.users[username].mustChangePassword = false;
      writeDb(db);
      return res.json({ success: true, user: db.users[username] });
    }
    return res.status(404).json({ success: false, error: "User not found" });
  });

  // Admin API - Get All Users
  app.get("/api/admin/users", (req, res) => {
    const db = readDb();
    res.json({ success: true, users: db.users });
  });

  // Admin API - Add User
  app.post("/api/admin/users", (req, res) => {
    const newUser = req.body;
    const db = readDb();
    db.users[newUser.username] = newUser;
    writeDb(db);
    res.json({ success: true, users: db.users });
  });

  // Admin API - Delete User
  app.delete("/api/admin/users/:username", (req, res) => {
    const { username } = req.params;
    const db = readDb();
    delete db.users[username];
    writeDb(db);
    res.json({ success: true, users: db.users });
  });

  // Admin API - Approve User
  app.put("/api/admin/users/:username/approve", (req, res) => {
    const { username } = req.params;
    const db = readDb();
    if (db.users[username]) {
      db.users[username].approved = true;
      writeDb(db);
      res.json({ success: true, users: db.users });
    } else {
      res.status(404).json({ success: false, error: "User not found" });
    }
  });

  // Admin API - Reset Password
  app.put("/api/admin/users/:username/reset-password", (req, res) => {
    const { username } = req.params;
    const { newPassword } = req.body;
    const db = readDb();
    if (db.users[username]) {
      db.users[username].password = newPassword;
      writeDb(db);
      res.json({ success: true, users: db.users });
    } else {
      res.status(404).json({ success: false, error: "User not found" });
    }
  });

  // Admin API - Import Users
  app.post("/api/admin/import-users", (req, res) => {
    const { users } = req.body;
    const db = readDb();
    db.users = { ...db.users, ...users };
    writeDb(db);
    res.json({ success: true, users: db.users });
  });

  // Registration Requests API - Get All
  app.get("/api/registration-requests", (req, res) => {
    const db = readDb();
    res.json({ success: true, requests: db.registrationRequests });
  });

  // Registration Requests API - Create Request
  app.post("/api/registration-requests", (req, res) => {
    const newRequest = req.body;
    const db = readDb();
    
    const existing = db.registrationRequests.find(r => r.email.toLowerCase() === newRequest.email.toLowerCase() && r.status === 'pending');
    if (existing) {
      return res.status(400).json({ success: false, message: "A request for this official email is already pending approval." });
    }

    db.registrationRequests.unshift(newRequest);
    writeDb(db);
    res.json({ success: true, requests: db.registrationRequests });
  });

  // Registration Requests API - Approve Request
  app.put("/api/registration-requests/:id/approve", (req, res) => {
    const { id } = req.params;
    const { chosenUsername, chosenPassword } = req.body;
    const db = readDb();
    
    const reqIndex = db.registrationRequests.findIndex(r => r.id === id);
    if (reqIndex === -1) {
      return res.status(404).json({ success: false, error: "Request not found" });
    }

    const reqObj = db.registrationRequests[reqIndex];
    let generatedUsername = chosenUsername ? chosenUsername.trim().toLowerCase() : reqObj.email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    
    if (!chosenUsername && db.users[generatedUsername]) {
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

    db.users[generatedUsername] = newUser;
    db.registrationRequests[reqIndex] = {
      ...reqObj,
      status: 'approved',
      generatedUsername,
      generatedPassword: defaultPass
    };

    writeDb(db);
    res.json({ success: true, requests: db.registrationRequests, users: db.users });
  });

  // Registration Requests API - Reject Request
  app.put("/api/registration-requests/:id/reject", (req, res) => {
    const { id } = req.params;
    const db = readDb();
    const reqIndex = db.registrationRequests.findIndex(r => r.id === id);
    if (reqIndex !== -1) {
      db.registrationRequests[reqIndex].status = 'rejected';
      writeDb(db);
      res.json({ success: true, requests: db.registrationRequests });
    } else {
      res.status(404).json({ success: false, error: "Request not found" });
    }
  });

  // Registration Requests API - Remove Request completely
  app.delete("/api/registration-requests/:id", (req, res) => {
    const { id } = req.params;
    const db = readDb();
    const reqObj = db.registrationRequests.find(r => r.id === id);
    if (!reqObj) {
      return res.status(404).json({ success: false, error: "Request not found" });
    }

    if (reqObj.status === 'approved' && reqObj.generatedUsername) {
      delete db.users[reqObj.generatedUsername];
    }

    db.registrationRequests = db.registrationRequests.filter(r => r.id !== id);
    writeDb(db);
    res.json({ success: true, requests: db.registrationRequests, users: db.users });
  });

  // Grades API - Get All Grades (Sections)
  app.get("/api/grades", (req, res) => {
    const db = readDb();
    res.json({ success: true, grades: db.grades });
  });

  // Grades API - Save/Update All Grades
  app.post("/api/grades", (req, res) => {
    const { grades } = req.body;
    const db = readDb();
    db.grades = grades;
    writeDb(db);
    res.json({ success: true, grades: db.grades });
  });

  // API - Get Cached Report
  app.get("/api/cache/reports/:key", (req, res) => {
    const { key } = req.params;
    const db = readDb();
    const report = db.aiReports[key];
    if (report) {
      res.json({ success: true, report });
    } else {
      res.status(404).json({ success: false, error: "Not found" });
    }
  });

  // API - Cache Report
  app.post("/api/cache/reports/:key", (req, res) => {
    const { key } = req.params;
    const { report } = req.body;
    const db = readDb();
    db.aiReports[key] = report;
    writeDb(db);
    res.json({ success: true });
  });

  // API - Delete Cached Report
  app.delete("/api/cache/reports/:key", (req, res) => {
    const { key } = req.params;
    const db = readDb();
    delete db.aiReports[key];
    writeDb(db);
    res.json({ success: true });
  });

  // API - Get Cached Remark
  app.get("/api/cache/remarks/:id", (req, res) => {
    const { id } = req.params;
    const db = readDb();
    const remark = db.studentRemarks[id];
    if (remark) {
      res.json({ success: true, remarks: remark });
    } else {
      res.status(404).json({ success: false, error: "Not found" });
    }
  });

  // API - Cache Remark
  app.post("/api/cache/remarks/:id", (req, res) => {
    const { id } = req.params;
    const { remarks } = req.body;
    const db = readDb();
    db.studentRemarks[id] = remarks;
    writeDb(db);
    res.json({ success: true });
  });

  // API - Delete Cached Remark
  app.delete("/api/cache/remarks/:id", (req, res) => {
    const { id } = req.params;
    const db = readDb();
    delete db.studentRemarks[id];
    writeDb(db);
    res.json({ success: true });
  });

  // Email API Route
  app.post("/api/send-reminders", async (req, res) => {
    const { recipients, subject, body } = req.body;
    
    if (!process.env.RESEND_API_KEY) {
      console.error("RESEND_API_KEY is not set");
      return res.status(500).json({ error: "Email service not configured. Please set RESEND_API_KEY in environment variables." });
    }

    const resend = new Resend(process.env.RESEND_API_KEY);

    try {
      // Send bulk emails (Resend supports up to 50 recipients per call or individual calls)
      // For simplicity and to avoid hitting batch limits immediately, we'll send them individually 
      // but in parallel. In production, consider a queue or batching.
      const sendPromises = recipients.map((email: string) => 
        resend.emails.send({
          from: 'GMS <reminders@resend.dev>', // Note: Use your verified domain in production
          to: email,
          subject: subject,
          html: body,
        })
      );

      await Promise.all(sendPromises);
      res.json({ success: true, count: recipients.length });
    } catch (error: any) {
      console.error("Failed to send emails:", error);
      res.status(500).json({ error: error.message || "Failed to send emails" });
    }
  });

  // Gemini API Route for Statistical Analysis reports using gemini-3.5-flash
  app.post("/api/generate-ai-reports", async (req, res) => {
    const { courseCode, courseName, section, stats, atRiskDist } = req.body;

    if (!process.env.GEMINI_API_KEY) {
      console.error("GEMINI_API_KEY is not set");
      return res.status(500).json({ error: "AI service is not configured. Please set GEMINI_API_KEY in environment variables." });
    }

    try {
      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const completionStatsStr = (stats.completionStats || []).map((t: any) => 
        `- ${t.name}: Completed: ${t.completed}, Pending: ${t.pending} (${t.percentage}%)`
      ).join('\n');

      const systemPrompt = `You are a professional academic analyst for A'Sharqiyah University, Center For Language and Foundation Studies.
Your job is to analyze the provided statistical data for Course: ${courseCode} (${courseName || 'General Studies'}), Section: ${section}, and generate a highly cohesive, professional, and mathematically rigorous set of reports and remarks.
All generated text must be sophisticated, objective, scholarly, and realistic. Use proper academic terminology. Avoid generic AI prefixes or over-enthusiastic phrases. Keep a formal, human tone that suits university administrators and the Department Head.`;

      const userMessage = `Please analyze the following class performance metrics and generate the reports specified in the response schema:

Class Performance Metrics:
- Total Enrolled Students: ${stats.totalStudents}
- Passing Students: ${stats.passCount} (${stats.passRate}%)
- Failing Students: ${stats.failCount} (${stats.failRate}%)
- Average Score: ${stats.avgScore} / 50
- Maximum Score: ${stats.maxScore}
- Minimum Score: ${stats.minScore}
- 'FA' (Failure due to Absence) Count: ${stats.faCount}
- Overall Course Syllabus Completion Rate: ${stats.averageCompletion}%
- Grade Distribution: ${JSON.stringify(stats.grades)}
- Score Range Distribution: ${JSON.stringify(stats.ranges)}
- At-Risk Students Count (score < 27.5): ${atRiskDist.atRiskCount}
- At-Risk distribution: ZERO score: ${atRiskDist.zero}, 1-5.5 score: ${atRiskDist.range1}, 6-11.5 score: ${atRiskDist.range2}, 12-16 score: ${atRiskDist.range3}, 16.5-20 score: ${atRiskDist.range4}, 21-24.5 score: ${atRiskDist.range5}, 25-27.5 score: ${atRiskDist.range6}
- Male Students: Total ${stats.genderStats?.male?.total || 0}, Passing ${stats.genderStats?.male?.pass || 0}
- Female Students: Total ${stats.genderStats?.female?.total || 0}, Passing ${stats.genderStats?.female?.pass || 0}

Syllabus Completion Details:
${completionStatsStr}

Please generate custom, sophisticated and context-appropriate entries for the fields below.
CRITICAL DESIGN RULE: In all text fields below, you MUST wrap every number (e.g., "35", "10", "42.5", "1"), percentage (e.g., "78%", "90%"), grade letter (e.g., "A+", "A", "C-", "F"), and critical academic/pedagogical terms in double asterisks (e.g., **Excellent**, **At-Risk**, **Syllabus Completion**, **Failure due to Absence**, **Attendance**, etc.) so they are rendered as bold in the user interface.

Required fields:
1. categoryPerformance (e.g. "EXCELLENT", "GOOD", "SATISFACTORY", or "NEEDS ATTENTION" based on the statistics)
2. descriptiveAnalysis: A highly professional 2-3 paragraph academic narrative analyzing these figures.
3. genderDemographics: An objective comparative analysis of male vs female outcomes.
4. completionInsights: Analytical remarks about the syllabus completion rate and its clear educational correlations with performance.
5. cerComments: Short academic comments on Performance Indicator (PI) achievements. Note that the passing target is an average of 70% (35 out of 50).
6. cerExplanation: Constructive analysis explaining factors that impacted achievement (e.g. repeaters, background in maths, attention during classes, tardiness, distraction, mobile phone usage).
7. cerRecommendations: Concrete, practical, curriculum-focused recommendations to raise or maintain achievement.
8. cerOverallView: Overall view on the assessments and curriculum structure, with forward planning ideas.`;

      // Attempt generation with automatic retries and fallback models in case of temporary 503 unavailability
      const runWithModelOptions = async (models: string[]) => {
        let lastError: any = null;
        for (const model of models) {
          let retryDelay = 1000;
          for (let attempt = 1; attempt <= 3; attempt++) {
            try {
              console.log(`[AI Copilot] Requesting generation using ${model} (attempt ${attempt}/3)...`);
              const response = await ai.models.generateContent({
                model: model,
                contents: [
                  { role: "user", parts: [{ text: userMessage }] }
                ],
                config: {
                  systemInstruction: systemPrompt,
                  responseMimeType: "application/json",
                  responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                      categoryPerformance: { type: Type.STRING },
                      descriptiveAnalysis: { type: Type.STRING },
                      genderDemographics: { type: Type.STRING },
                      completionInsights: { type: Type.STRING },
                      cerComments: { type: Type.STRING },
                      cerExplanation: { type: Type.STRING },
                      cerRecommendations: { type: Type.STRING },
                      cerOverallView: { type: Type.STRING }
                    },
                    required: [
                      "categoryPerformance", "descriptiveAnalysis", "genderDemographics", "completionInsights",
                      "cerComments", "cerExplanation", "cerRecommendations", "cerOverallView"
                    ]
                  }
                }
              });
              if (response && response.text) {
                console.log(`[AI Copilot] Successfully generated text using ${model}`);
                return response;
              }
            } catch (err: any) {
              lastError = err;
              console.warn(`[AI Copilot] Attempt ${attempt} on model ${model} failed: ${err.message || err}`);
              
              const isTemporary = 
                err.status === 503 || 
                err.status === 429 || 
                err.message?.includes("503") || 
                err.message?.includes("UNAVAILABLE") ||
                err.message?.includes("high demand") ||
                err.message?.includes("Resource has been exhausted") ||
                err.status === "UNAVAILABLE";

              if (!isTemporary) {
                // Not a temporary 503/429/overload error (e.g. invalid arguments), stop retrying this model
                break;
              }

              if (attempt < 3) {
                console.log(`[AI Copilot] Waiting ${retryDelay}ms before retry...`);
                await new Promise(resolve => setTimeout(resolve, retryDelay));
                retryDelay *= 2; // exponential backoff
              }
            }
          }
        }
        throw lastError;
      };

      const response = await runWithModelOptions(["gemini-3.5-flash", "gemini-flash-latest", "gemini-3.1-flash-lite"]);

      const parsedData = JSON.parse(response.text.trim());
      res.json({ success: true, reports: parsedData });
    } catch (error: any) {
      console.error("Gemini report generation failed:", error);
      res.status(500).json({ error: error.message || "Failed to generate AI report" });
    }
  });

  // Endpoint to generate dynamic highly context-appropriate academic remarks for an individual student (Instructor Remarks)
  app.post("/api/generate-student-remarks", async (req, res) => {
    const { student, fv, sv, pa, status } = req.body;

    if (!process.env.GEMINI_API_KEY) {
      console.error("GEMINI_API_KEY is not set");
      return res.status(500).json({ error: "AI service is not configured. Please set GEMINI_API_KEY in environment variables." });
    }

    try {
      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const systemPrompt = `You are a professional academic instructor at A'Sharqiyah University, Center For Language and Foundation Studies.
Your job is to generate a custom, highly professional, and context-appropriate paragraph of "Instructor Remarks" (or "Petition Response") for the student.
The remarks must be sophisticated, objective, and realistic. Use proper academic terminology. Avoid generic AI prefixes or overly glowing phrases. Keep a formal, human, yet constructive and supportive tone suitable for official university records.`;

      const userMessage = `Please generate standard academic remarks or a petition response statement for this student:
- Name: ${student.name} (Gender: ${student.gender || 'Unknown'})
- ID: ${student.id}
- Final Grade Letter: ${fv.gradeLetter} (Overall Score: ${fv.totalScore}%)
- Current Status: ${status}
- Attendance Status: Warning Level: ${pa.absenceWarning || 'Regular'} (Hours: ${student.absenceHours || 0})

Student Academic Breakdown:
- Participation / Portfolio: ${sv.v1} / 10
- Presentation: ${sv.v2} / 10
- Pop Quiz 1: ${sv.v3} / 2.5
- Pop Quiz 2: ${sv.v4} / 2.5
- Test 1 (Grammar/Vocabulary): ${sv.v5} / 5
- Test 2 (Listening/Reading): ${sv.v6} / 5
- Speaking Test: ${sv.v7} / 5
- Writing Test: ${sv.v8} / 5
- Writing Portfolio: ${sv.v9} / 5
- Midterm: ${sv.v10} / 20
- Final Exam: ${sv.v11} / 30

CRITICAL DESIGN RULE: You MUST wrap every number (e.g., "35", "10", "42.5", "1"), percentage (e.g., "78%", "90%"), grade letter (e.g., "A+", "A", "C-", "F"), and critical academic/pedagogical terms in double asterisks (e.g., **Excellent**, **At-Risk**, **Syllabus Completion**, **Failure due to Absence**, **Attendance**, etc.) so they are rendered as bold in the user interface.

Response format: Return a JSON object with a single field: "remarks": "The generated remarks text here..."`;

      const runWithModelOptions = async (models: string[]) => {
        let lastError: any = null;
        for (const model of models) {
          let retryDelay = 1000;
          for (let attempt = 1; attempt <= 3; attempt++) {
            try {
              console.log(`[AI Student Remarks] Requesting generation using ${model} (attempt ${attempt}/3)...`);
              const response = await ai.models.generateContent({
                model: model,
                contents: [
                  { role: "user", parts: [{ text: userMessage }] }
                ],
                config: {
                  systemInstruction: systemPrompt,
                  responseMimeType: "application/json",
                  responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                      remarks: { type: Type.STRING }
                    },
                    required: ["remarks"]
                  }
                }
              });
              if (response && response.text) {
                console.log(`[AI Student Remarks] Successfully generated remarks using ${model}`);
                return response;
              }
            } catch (err: any) {
              lastError = err;
              console.warn(`[AI Student Remarks] Attempt ${attempt} on model ${model} failed: ${err.message || err}`);
              
              const isTemporary = 
                err.status === 503 || 
                err.status === 429 || 
                err.message?.includes("503") || 
                err.message?.includes("UNAVAILABLE") ||
                err.message?.includes("high demand") ||
                err.message?.includes("Resource has been exhausted") ||
                err.status === "UNAVAILABLE";

              if (!isTemporary) {
                break;
              }

              if (attempt < 3) {
                await new Promise(resolve => setTimeout(resolve, retryDelay));
                retryDelay *= 2;
              }
            }
          }
        }
        throw lastError;
      };

      const response = await runWithModelOptions(["gemini-3.5-flash", "gemini-flash-latest", "gemini-3.1-flash-lite"]);
      const parsedData = JSON.parse(response.text.trim());
      res.json({ success: true, remarks: parsedData.remarks });
    } catch (error: any) {
      console.error("Gemini student remarks generation failed:", error);
      res.status(500).json({ error: error.message || "Failed to generate AI remarks" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    
    // SPA Fallback: Serve index.html for any unhandled routes
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
