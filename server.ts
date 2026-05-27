import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { Resend } from 'resend';
import dotenv from 'dotenv';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

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
