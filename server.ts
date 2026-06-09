import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { Resend } from 'resend';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from "@google/genai";

// .env.local takes precedence over .env (used for local overrides like PORT)
dotenv.config({ path: ['.env.local', '.env'] });

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());

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
