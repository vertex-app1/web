import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { connectDB, isDbConnected } from "./db";
import { User, CV } from "./models";

dotenv.config();

async function startServer() {
  const app = express();
  
  const PORT = parseInt(process.env.PORT || "3000", 10);

  // Connect to MongoDB Atlas
  await connectDB();

  // Maximize JSON payload sizes for profile picture Base64 uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Ensure data persistence directory exists
  const DATA_DIR = path.join(process.cwd(), "data");
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR);
  }
  const CVS_FILE = path.join(DATA_DIR, "cvs.json");

  // Helper to load existing CV database
  function loadCVs() {
    if (fs.existsSync(CVS_FILE)) {
      try {
        return JSON.parse(fs.readFileSync(CVS_FILE, "utf-8"));
      } catch (e) {
        console.error("Error reading CVs database:", e);
      }
    }
    return {};
  }

  // API: Get a saved CV
  app.get("/api/cv/:username", async (req, res) => {
    const username = req.params.username.toLowerCase();
    
    // 1. Try loading from MongoDB if active
    if (isDbConnected()) {
      try {
        const cv = await CV.findOne({ username }).lean();
        if (cv) {
          return res.json(cv);
        }
      } catch (err) {
        console.error("Failed to load CV from MongoDB:", err);
      }
    }

    // 2. Fallback to local files
    const cvs = loadCVs();
    const cv = cvs[username];
    if (!cv) {
      return res.status(404).json({ error: "CV not found" });
    }
    res.json(cv);
  });

  // API: Save or Update a CV
  app.post("/api/cv", async (req, res) => {
    const { username, cvData } = req.body;
    if (!username) {
      return res.status(400).json({ error: "Username is required" });
    }
    const cleanUsername = username.trim().toLowerCase();
    if (!/^[a-z0-9-_]+$/.test(cleanUsername)) {
      return res.status(400).json({ error: "Username must contain only alphanumeric characters, dashes, or underscores." });
    }

    const cvs = loadCVs();
    const existingCv = cvs[cleanUsername] || {};
    
    // Preserve analytics when updating
    const mergedCvData = {
      ...cvData,
      analytics: existingCv.analytics || []
    };

    // Save to local file storage (original behavior)
    cvs[cleanUsername] = mergedCvData;
    fs.writeFileSync(CVS_FILE, JSON.stringify(cvs, null, 2), "utf-8");

    // Save to MongoDB Atlas (if active)
    if (isDbConnected()) {
      try {
        // Find or create user
        let userObj = await User.findOne({ username: cleanUsername });
        if (!userObj) {
          userObj = await User.create({ username: cleanUsername });
        }

        // Upsert CV details
        const cvToSave = {
          user: userObj._id,
          username: cleanUsername,
          fullName: mergedCvData.fullName || "",
          title: mergedCvData.title || "",
          linkedinUrl: mergedCvData.linkedinUrl || "",
          twitterUrl: mergedCvData.twitterUrl || "",
          githubUrl: mergedCvData.githubUrl || "",
          websiteUrl: mergedCvData.websiteUrl || "",
          skills: mergedCvData.skills || "",
          aboutSectionId: mergedCvData.aboutSectionId || "about",
          workSectionId: mergedCvData.workSectionId || "myWork",
          aboutMe: mergedCvData.aboutMe || "",
          experience: mergedCvData.experience || "", // Added experience support
          projects: mergedCvData.projects || [],
          profilePhoto: mergedCvData.profilePhoto || "",
          backgroundStyle: mergedCvData.backgroundStyle || "olive",
          customBgUrl: mergedCvData.customBgUrl || "",
          audioBioUrl: mergedCvData.audioBioUrl || "",
          audioBioType: mergedCvData.audioBioType || "none",
          specialization: mergedCvData.specialization || "general",
          githubUsername: mergedCvData.githubUsername || "",
          behanceUrl: mergedCvData.behanceUrl || "",
          seoTitle: mergedCvData.seoTitle || "",
          seoDescription: mergedCvData.seoDescription || "",
          seoKeywords: mergedCvData.seoKeywords || "",
          language: mergedCvData.language || "en",
          analytics: mergedCvData.analytics || []
        };

        await CV.findOneAndUpdate(
          { username: cleanUsername },
          cvToSave,
          { upsert: true, new: true }
        );
        console.log(`Saved CV for ${cleanUsername} to MongoDB.`);
      } catch (err) {
        console.error("Failed to save CV to MongoDB:", err);
      }
    }

    // Dynamic self-referential links
    const baseUrl = process.env.APP_URL || `${req.protocol}://${req.get("host")}`;
    res.json({ success: true, url: `${baseUrl}/cv/${cleanUsername}` });
  });

  // API: Get analytics for a CV
  app.get("/api/cv-analytics/:username", async (req, res) => {
    const username = req.params.username.toLowerCase();
    
    // 1. Try loading from MongoDB if active
    if (isDbConnected()) {
      try {
        const cv = await CV.findOne({ username }).lean();
        if (cv) {
          return res.json({ analytics: cv.analytics || [] });
        }
      } catch (err) {
        console.error("Failed to load CV analytics from MongoDB:", err);
      }
    }

    // 2. Fallback to local files
    const cvs = loadCVs();
    const cv = cvs[username];
    if (!cv) {
      return res.status(404).json({ error: "CV not found" });
    }
    res.json({ analytics: cv.analytics || [] });
  });

  // API: Parse LinkedIn/Resume text with Gemini AI to generate CV immediately
  app.post("/api/parse-linkedin", async (req, res) => {
    const { rawText } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(400).json({ 
        error: "Gemini API key is not configured. Please add GEMINI_API_KEY in the Secrets panel." 
      });
    }

    if (!rawText || !rawText.trim()) {
      return res.status(400).json({ error: "No text was provided for parsing." });
    }

    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });

      const prompt = `You are an expert AI resume and LinkedIn parser. Analyze the following pasted raw text from a user's LinkedIn profile or resume and convert it into a structured JSON format matching the following schema exactly.

Expected JSON Schema:
{
  "fullName": "Name of the person",
  "title": "Professional title (e.g. Software Engineer, UI Designer)",
  "aboutMe": "A beautiful, coherent professional summary (1-2 paragraphs) based on their profile",
  "skills": "Comma-separated list of top 8-12 key skills found in the text",
  "projects": [
    {
      "id": "unique-id-1",
      "name": "Project Name (either explicit project, or a key job role/achievement)",
      "description": "Short results-driven description of this project or role"
    }
  ],
  "linkedinUrl": "A valid LinkedIn URL (if found, otherwise empty)",
  "twitterUrl": "A valid Twitter/X URL (if found, otherwise empty)",
  "githubUrl": "A valid GitHub URL (if found, otherwise empty)"
}

Strict guidelines:
1. Return ONLY valid, minified, parseable JSON. Do NOT include any markdown backticks, markdown code fences, or any explanation text before or after the JSON.
2. If certain info is not present, use logical placeholders or realistic summaries.
3. For the projects array, generate up to 3 strong projects or key professional roles. Assign each a unique string id.

Raw Text:
${rawText}`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
      });

      let jsonText = response.text?.trim() || "";
      
      // Sanitization: strip markdown code blocks if any
      if (jsonText.startsWith("```json")) {
        jsonText = jsonText.substring(7);
      } else if (jsonText.startsWith("```")) {
        jsonText = jsonText.substring(3);
      }
      if (jsonText.endsWith("```")) {
        jsonText = jsonText.substring(0, jsonText.length - 3);
      }
      jsonText = jsonText.trim();

      const parsedData = JSON.parse(jsonText);
      res.json(parsedData);
    } catch (err: any) {
      console.error("LinkedIn AI parse failed:", err);
      res.status(500).json({ error: "AI Parsing failed: " + (err.message || String(err)) });
    }
  });

  // API: Search & Import public info from LinkedIn URL using Gemini Search Grounding
  app.post("/api/import-linkedin-url", async (req, res) => {
    const { url } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(400).json({ 
        error: "Gemini API key is not configured. Please add GEMINI_API_KEY in the Secrets panel." 
      });
    }

    if (!url || !url.trim()) {
      return res.status(400).json({ error: "LinkedIn URL is required." });
    }

    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });

      // Extract a potential name from LinkedIn URL to guide search better
      let nameHint = "";
      const matches = url.match(/\/in\/([^/]+)/i);
      if (matches && matches[1]) {
        nameHint = matches[1].replace(/[-_0-9]/g, " ").trim();
      }

      const prompt = `You are an expert AI LinkedIn crawler and CV builder.
The user provided their LinkedIn URL: "${url}".
${nameHint ? `The profile name from the URL might be similar to: "${nameHint}".` : ""}

Use Google Search Grounding to find public professional information, portfolios, github repositories, or articles related to this person.
Then, build a highly polished, detailed resume matching the following JSON schema exactly.

Expected JSON Schema:
{
  "fullName": "Real name of the person (found via search, or elegantly derived from the URL as a clean Capitalized name)",
  "title": "Professional title (e.g., Senior Full-Stack Developer, UI/UX Designer, Project Manager) based on their real web footprint, or standard for their field",
  "aboutMe": "A beautiful, coherent professional summary (1-2 paragraphs) based on their public work, expertise, and focus areas.",
  "skills": "Comma-separated list of top 8-12 key skills (e.g. React, Node.js, Project Management) suitable for their role and found in their public profiles",
  "projects": [
    {
      "id": "proj-1",
      "name": "Name of a key project, achievement, or past/current role from their web presence",
      "description": "Short results-driven description of their achievements and technologies used in this project/role"
    }
  ],
  "linkedinUrl": "The provided LinkedIn URL",
  "twitterUrl": "A valid Twitter/X URL if found in search, otherwise empty string",
  "githubUrl": "A valid GitHub URL if found in search, otherwise empty string"
}

Strict requirements:
1. Return ONLY valid, minified, parseable JSON. Do NOT include markdown code blocks, backticks, or any explanation.
2. Rely heavily on Google Search Grounding to find real, accurate facts about this person. If you find no specific public record for this specific person, generate a beautiful starting template matching the professional field indicated in their URL, but mark it as a beautiful placeholder and tell the user they can customize it.
`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
        }
      });

      let jsonText = response.text?.trim() || "";
      
      // Sanitization: strip markdown code blocks if any
      if (jsonText.startsWith("```json")) {
        jsonText = jsonText.substring(7);
      } else if (jsonText.startsWith("```")) {
        jsonText = jsonText.substring(3);
      }
      if (jsonText.endsWith("```")) {
        jsonText = jsonText.substring(0, jsonText.length - 3);
      }
      jsonText = jsonText.trim();

      const parsedData = JSON.parse(jsonText);
      res.json(parsedData);
    } catch (err: any) {
      console.error("LinkedIn URL AI import failed:", err);
      res.status(500).json({ error: "LinkedIn URL AI import failed: " + (err.message || String(err)) });
    }
  });

  // API: Enhance CV content with Gemini AI
  app.post("/api/enhance-cv", async (req, res) => {
    const { currentText, type, bullets } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(400).json({ 
        error: "Gemini API key is not configured. Please add GEMINI_API_KEY in the Secrets panel." 
      });
    }

    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });

      let prompt = "";
      if (type === "about") {
        prompt = `You are a world-class executive CV writer and copywriter. Enhance this "About Me" profile introduction.
Current introduction: "${currentText || ""}"
Key achievements/keywords to include: "${bullets || ""}"
Create a polished, highly professional, modern, and engaging introduction bio (approx 3-5 sentences). 
Write strictly in the first-person perspective ("I am...", "My specialty is..."). Avoid clichés and buzzword stuffing. Output ONLY the polished paragraph. No introductory greeting, no quotes, and no formatting.`;
      } else {
        prompt = `You are a world-class resume builder. Enhance this portfolio project description.
Current project name/details: "${currentText || ""}"
Core technologies, metrics, or achievements to focus on: "${bullets || ""}"
Create a powerful, action-oriented, and results-focused summary of this project (approx 1-2 sentences). 
Highlight technical complexity, personal agency, and business or user impact. Write in an active, professional voice. Output ONLY the enhanced project summary with no intro/outro or quotes.`;
      }

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
      });

      res.json({ text: response.text?.trim() || "" });
    } catch (err: any) {
      console.error("AI enhancement failed:", err);
      res.status(500).json({ error: "AI Enhancement failed: " + (err.message || String(err)) });
    }
  });

  // API: Translate entire CV content using Gemini
  app.post("/api/translate-cv", async (req, res) => {
    const { cv, targetLang } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(400).json({ 
        error: "Gemini API key is not configured. Please add GEMINI_API_KEY in the Secrets panel." 
      });
    }

    if (!cv) {
      return res.status(400).json({ error: "CV data is required for translation." });
    }

    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });

      const prompt = `You are a world-class professional translator. Translate the following user portfolio details into ${targetLang === "ar" ? "Arabic (العربية)" : "English"}.
Maintain a professional, elegant, and industry-standard tone for resume/portfolio content.

Provide the response in the exact JSON format matching this schema:
{
  "fullName": "translated name",
  "title": "translated professional title",
  "aboutMe": "translated biography (approx 1-2 paragraphs)",
  "skills": "translated comma-separated skills",
  "projects": [
    {
      "id": "match-the-original-id-exactly",
      "name": "translated project name",
      "description": "translated project description"
    }
  ],
  "seoTitle": "translated search title",
  "seoDescription": "translated search description",
  "seoKeywords": "translated comma-separated keywords"
}

Strict requirements:
1. Return ONLY valid, minified, parseable JSON. Do NOT include markdown backticks, markdown code fences, or any other introductory/explanatory text.
2. Maintain the same array structure for projects, keeping the ID fields exactly unchanged.
3. If translating to Arabic, use high-quality, professional terminology (e.g., Software Engineer -> مهندس برمجيات).

Original JSON to translate:
${JSON.stringify({
  fullName: cv.fullName || "",
  title: cv.title || "",
  aboutMe: cv.aboutMe || "",
  skills: cv.skills || "",
  projects: cv.projects || [],
  seoTitle: cv.seoTitle || "",
  seoDescription: cv.seoDescription || "",
  seoKeywords: cv.seoKeywords || ""
}, null, 2)}`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
      });

      let jsonText = response.text?.trim() || "";
      
      if (jsonText.startsWith("```json")) {
        jsonText = jsonText.substring(7);
      } else if (jsonText.startsWith("```")) {
        jsonText = jsonText.substring(3);
      }
      if (jsonText.endsWith("```")) {
        jsonText = jsonText.substring(0, jsonText.length - 3);
      }
      jsonText = jsonText.trim();

      const translatedData = JSON.parse(jsonText);
      res.json(translatedData);
    } catch (err: any) {
      console.error("AI translation failed:", err);
      res.status(500).json({ error: "Translation failed: " + (err.message || String(err)) });
    }
  });

  // Dynamic Route: Server-side rendering of the beautiful Hosted CV page
  app.get("/cv/:username", async (req, res) => {
    const username = req.params.username.toLowerCase();
    
    // 1. Try loading from MongoDB if active
    let cv = null;
    let loadedFromDb = false;
    if (isDbConnected()) {
      try {
        cv = await CV.findOne({ username }).lean();
        if (cv) {
          loadedFromDb = true;
        }
      } catch (err) {
        console.error("Failed to load CV from MongoDB in HTML render:", err);
      }
    }

    // 2. Fallback to local files
    if (!cv) {
      const cvs = loadCVs();
      cv = cvs[username];
    }

    // Track visit asynchronously
    if (cv) {
      (async () => {
        try {
          let ip = (req.headers["x-forwarded-for"] as string || req.socket.remoteAddress || "127.0.0.1").split(",")[0].trim();
          if (ip === "::1" || ip === "::ffff:127.0.0.1" || ip === "127.0.0.1") {
            ip = "8.8.8.8"; // Default testing IP so it logs beautiful data locally
          }
          
          const response = await fetch(`http://ip-api.com/json/${ip}`);
          const geo = await response.json();
          
          const orgName = geo.org || geo.isp || "Unknown Company";
          const visit = {
            timestamp: new Date().toISOString(),
            ip: ip,
            country: geo.country || "Unknown Country",
            city: geo.city || "Unknown City",
            org: orgName,
            isRecruiter: /recruit|talent|hr|staff|job|career|headhunter|agency|corp|inc|llc|google|amazon|microsoft|apple|facebook|meta/i.test(orgName)
          };
          
          // Track to MongoDB if loaded from DB or DB is connected
          if (isDbConnected() && loadedFromDb) {
            try {
              await CV.updateOne(
                { username },
                { 
                  $push: { 
                    analytics: { 
                      $each: [visit], 
                      $position: 0, 
                      $slice: 100 
                    } 
                  } 
                }
              );
              console.log(`Tracked visit to MongoDB for ${username}`);
            } catch (err) {
              console.error("Failed to save visit to MongoDB:", err);
            }
          }

          // Track to local file storage (preserving existing behavior)
          const freshCvs = loadCVs();
          if (freshCvs[username]) {
            if (!freshCvs[username].analytics) {
              freshCvs[username].analytics = [];
            }
            freshCvs[username].analytics.unshift(visit);
            freshCvs[username].analytics = freshCvs[username].analytics.slice(0, 100);
            fs.writeFileSync(CVS_FILE, JSON.stringify(freshCvs, null, 2), "utf-8");
          }
        } catch (err) {
          console.error("Failed to track CV visit analytics:", err);
        }
      })();
    }

    if (!cv) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>CV Not Found — SmartCV</title>
          <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap" rel="stylesheet">
          <style>
            body {
              background: #12140e;
              color: #f0f3e8;
              font-family: 'Poppins', sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              text-align: center;
              padding: 20px;
            }
            h1 { color: #a4b465; font-size: 3rem; margin-bottom: 10px; }
            p { color: #889278; font-size: 1.1rem; margin-bottom: 24px; max-width: 500px; }
            a {
              color: #12140e;
              background: #a4b465;
              text-decoration: none;
              font-weight: 600;
              padding: 12px 24px;
              border-radius: 30px;
              transition: opacity 0.2s;
            }
            a:hover { opacity: 0.9; }
          </style>
        </head>
        <body>
          <h1>404</h1>
          <p>The CV for "<strong>${username}</strong>" could not be found or has not been created yet.</p>
          <a href="/">Create Your Own CV</a>
        </body>
        </html>
      `);
    }

    // Determine background classes & element styling based on backgroundStyle
    let bgStyleCss = "";
    let backgroundMarkup = "";
    let accentColor = "#a4b465";
    let darkAccentColor = "#535d0a";

    // Multi-language query handling
    const queryLang = req.query.lang as string;
    const activeLang = (queryLang === "ar" || queryLang === "en") ? queryLang : (cv.language || "en");
    const isAr = activeLang === "ar";

    const t = {
      aboutMe: isAr ? "نبذة عنّي" : "About Me",
      skills: isAr ? "المهارات التقنية" : "Technical Skills",
      work: isAr ? "أعمالي ومشاريعي" : "My Work",
      github: isAr ? "مستودعات GitHub المميزة" : "Featured GitHub Repositories",
      designer: isAr ? "معرض التصاميم الإبداعية" : "Design Showcase Portfolio",
      brandDesign: isAr ? "تصميم الهوية البصرية" : "Brand Identity Design",
      uiBranding: isAr ? "واجهات المستخدم والهوية" : "UI/UX & Branding",
      mobileApp: isAr ? "واجهة تطبيق جوال" : "Mobile App Interface",
      productDesign: isAr ? "تصميم المنتجات الرقمية" : "Product Design",
      visualGraphics: isAr ? "رسومات بصرية ثلاثية الأبعاد" : "3D Visual Graphics",
      artDirection: isAr ? "الإدارة الفنية والإبداعية" : "Art Direction",
      seeMoreBehance: isAr ? "شاهد المزيد على Behance" : "See more on Behance",
      loadingGithub: isAr ? "جاري تحميل مستودعات GitHub العامة..." : "Loading public GitHub repositories...",
      noProjects: isAr ? "لا توجد مشاريع مضافة بعد." : "No projects featured yet.",
      noSkills: isAr ? "لم يتم إدراج مهارات بعد." : "No skills listed yet.",
      footerText: isAr ? "تم الإنشاء بواسطة" : "Created with",
      builderName: isAr ? "صانع السيرة الذاتية الذكية" : "SmartCV Builder",
      voiceBio: isAr ? "السيرة الصوتية الذكية" : "AI Voice Bio"
    };

    const style = cv.backgroundStyle || "olive";
    if (style === "olive") {
      bgStyleCss = "background: linear-gradient(135deg, #131710 0%, #1e2617 50%, #11140e 100%);";
      backgroundMarkup = `
        <div class="mesh-layer" style="position:fixed; inset:0; z-index:-1; background: radial-gradient(circle at 30% 20%, rgba(164, 180, 101, 0.2) 0%, transparent 60%), radial-gradient(circle at 80% 80%, rgba(83, 93, 10, 0.3) 0%, transparent 60%); filter: blur(50px);"></div>
      `;
      accentColor = "#a4b465";
      darkAccentColor = "#535d0a";
    } else if (style === "sunset") {
      bgStyleCss = "background: linear-gradient(135deg, #1c140f 0%, #2b1f15 50%, #150f0b 100%);";
      backgroundMarkup = `
        <div class="mesh-layer" style="position:fixed; inset:0; z-index:-1; background: radial-gradient(circle at 20% 30%, rgba(245, 158, 11, 0.2) 0%, transparent 60%), radial-gradient(circle at 80% 70%, rgba(180, 83, 9, 0.25) 0%, transparent 60%); filter: blur(50px);"></div>
      `;
      accentColor = "#f59e0b";
      darkAccentColor = "#b45309";
    } else if (style === "obsidian") {
      bgStyleCss = "background: linear-gradient(135deg, #0d0e10 0%, #181a1f 50%, #0a0b0d 100%);";
      backgroundMarkup = `
        <div class="mesh-layer" style="position:fixed; inset:0; z-index:-1; background: radial-gradient(circle at 30% 30%, rgba(96, 165, 250, 0.2) 0%, transparent 60%), radial-gradient(circle at 70% 80%, rgba(29, 78, 216, 0.25) 0%, transparent 60%); filter: blur(50px);"></div>
      `;
      accentColor = "#60a5fa";
      darkAccentColor = "#1d4ed8";
    } else if (style === "forest") {
      bgStyleCss = "background: linear-gradient(135deg, #09130d 0%, #0f2416 50%, #060a07 100%);";
      backgroundMarkup = `
        <div class="mesh-layer" style="position:fixed; inset:0; z-index:-1; background: radial-gradient(circle at 35% 25%, rgba(52, 211, 153, 0.2) 0%, transparent 60%), radial-gradient(circle at 75% 75%, rgba(5, 150, 105, 0.25) 0%, transparent 60%); filter: blur(50px);"></div>
      `;
      accentColor = "#34d399";
      darkAccentColor = "#059669";
    } else if (style === "custom") {
      // Custom URL (could be video or image) or Specialty Canvas Preset
      bgStyleCss = "background: #0c0e0a;";
      const url = cv.customBgUrl || "";
      if (url.startsWith("preset-")) {
        backgroundMarkup = `
          <canvas id="custom-canvas-bg" style="position:fixed; inset:0; width:100%; height:100%; z-index:-2; pointer-events:none;"></canvas>
          <div class="overlay" style="position:fixed; inset:0; background:rgba(0,0,0,0.5); z-index:-1; pointer-events:none;"></div>
          <script>
            (function() {
              const canvas = document.getElementById("custom-canvas-bg");
              if (!canvas) return;
              const ctx = canvas.getContext("2d");
              if (!ctx) return;
              
              let width = canvas.width = window.innerWidth;
              let height = canvas.height = window.innerHeight;
              
              window.addEventListener("resize", () => {
                width = canvas.width = window.innerWidth;
                height = canvas.height = window.innerHeight;
              });
              
              const preset = "${url}";
              const particles = [];
              let angle = 0;
              const corporateData = {
                linePoints: [],
                candlesticks: [],
                lastUpdate: 0
              };
              
              if (preset === "preset-tech") {
                const count = Math.min(80, Math.floor((width * height) / 12000));
                for (let i = 0; i < count; i++) {
                  particles.push({
                    x: Math.random() * width,
                    y: Math.random() * height,
                    vx: (Math.random() - 0.5) * 0.7,
                    vy: (Math.random() - 0.5) * 0.7,
                    radius: Math.random() * 2.5 + 1,
                    pulse: Math.random() * Math.PI,
                  });
                }
              } else if (preset === "preset-culinary") {
                const count = Math.min(60, Math.floor((width * height) / 15000));
                for (let i = 0; i < count; i++) {
                  particles.push({
                    x: Math.random() * width,
                    y: Math.random() * height + height,
                    vy: -(Math.random() * 0.6 + 0.2),
                    vx: (Math.random() - 0.5) * 0.3,
                    radius: Math.random() * 4 + 1.5,
                    alpha: Math.random() * 0.6 + 0.3,
                    decay: Math.random() * 0.0015 + 0.0005,
                    color: Math.random() > 0.4 ? "rgba(245, 158, 11, " : "rgba(239, 68, 68, ",
                  });
                }
              } else if (preset === "preset-medical") {
                const count = 18;
                for (let i = 0; i < count; i++) {
                  particles.push({
                    x: Math.random() * width,
                    y: Math.random() * height,
                    vy: -(Math.random() * 0.2 + 0.1),
                    vx: (Math.random() - 0.5) * 0.15,
                    size: Math.random() * 8 + 4,
                    alpha: Math.random() * 0.35 + 0.15,
                    rotation: Math.random() * Math.PI * 2,
                    rotSpeed: (Math.random() - 0.5) * 0.01,
                    type: Math.random() > 0.5 ? "cross" : "circle"
                  });
                }
              } else if (preset === "preset-corporate") {
                for (let i = 0; i < 20; i++) {
                  corporateData.linePoints.push(Math.random() * 120 + 60);
                }
                let prevClose = 150;
                for (let i = 0; i < 15; i++) {
                  const change = (Math.random() - 0.45) * 40;
                  const open = prevClose;
                  const close = open + change;
                  const high = Math.max(open, close) + Math.random() * 12;
                  const low = Math.min(open, close) - Math.random() * 12;
                  corporateData.candlesticks.push({ open, close, high, low });
                  prevClose = close;
                }
              }
              
              function render() {
                ctx.fillStyle = "#0a0c08";
                ctx.fillRect(0, 0, width, height);
                
                if (preset === "preset-tech" || preset === "preset-corporate" || preset === "preset-medical") {
                  ctx.strokeStyle = "rgba(164, 180, 101, 0.015)";
                  ctx.lineWidth = 1;
                  const gridSize = 50;
                  ctx.beginPath();
                  for (let x = 0; x < width; x += gridSize) {
                    ctx.moveTo(x, 0); ctx.lineTo(x, height);
                  }
                  for (let y = 0; y < height; y += gridSize) {
                    ctx.moveTo(0, y); ctx.lineTo(width, y);
                  }
                  ctx.stroke();
                }
                
                if (preset === "preset-tech") {
                  angle += 0.003;
                  ctx.fillStyle = "rgba(164, 180, 101, 0.025)";
                  ctx.font = "9px monospace";
                  for (let i = 0; i < width; i += 60) {
                    const char = Math.random() > 0.5 ? "1" : "0";
                    const y = (Math.sin(angle + i) * 0.5 + 0.5) * height;
                    ctx.fillText(char, i, y);
                  }

                  particles.forEach(p => {
                    p.x += p.vx; p.y += p.vy;
                    if (p.x < 0 || p.x > width) p.vx *= -1;
                    if (p.y < 0 || p.y > height) p.vy *= -1;
                    p.pulse = (p.pulse || 0) + 0.02;
                    const currentRadius = p.radius + Math.sin(p.pulse) * 0.6;
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, currentRadius, 0, Math.PI * 2);
                    ctx.fillStyle = "rgba(164, 180, 101, " + (0.25 + Math.sin(p.pulse) * 0.1) + ")";
                    ctx.fill();
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, currentRadius * 0.4, 0, Math.PI * 2);
                    ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
                    ctx.fill();
                  });
                  ctx.lineWidth = 0.6;
                  for (let i = 0; i < particles.length; i++) {
                    for (let j = i + 1; j < particles.length; j++) {
                      const dx = particles[i].x - particles[j].x;
                      const dy = particles[i].y - particles[j].y;
                      const dist = Math.sqrt(dx * dx + dy * dy);
                      if (dist < 130) {
                        const alpha = (1 - dist / 130) * 0.18;
                        ctx.strokeStyle = "rgba(164, 180, 101, " + alpha + ")";
                        ctx.beginPath();
                        ctx.moveTo(particles[i].x, particles[i].y);
                        ctx.lineTo(particles[j].x, particles[j].y);
                        ctx.stroke();
                      }
                    }
                  }
                } else if (preset === "preset-medical") {
                  angle += 0.008;
                  
                  particles.forEach(p => {
                    p.y += p.vy;
                    p.rotation = (p.rotation || 0) + p.rotSpeed;
                    if (p.y < -20) {
                      p.y = height + 20; p.x = Math.random() * width;
                    }
                    ctx.save();
                    ctx.translate(p.x, p.y);
                    ctx.rotate(p.rotation);
                    ctx.fillStyle = "rgba(45, 212, 191, " + p.alpha + ")";
                    if (p.type === "cross") {
                      const size = p.size;
                      const thickness = size * 0.3;
                      ctx.fillRect(-size / 2, -thickness / 2, size, thickness);
                      ctx.fillRect(-thickness / 2, -size / 2, thickness, size);
                    } else {
                      ctx.beginPath();
                      ctx.arc(0, 0, p.size * 0.6, 0, Math.PI * 2);
                      ctx.strokeStyle = "rgba(45, 212, 191, " + (p.alpha * 0.8) + ")";
                      ctx.lineWidth = 1;
                      ctx.stroke();
                    }
                    ctx.restore();
                  });

                  const drawHelix = (centerX, isRightHanded) => {
                    const helixWidth = Math.min(45, width * 0.05);
                    const nodeCount = Math.floor(height / 45);
                    const spacing = height / (nodeCount + 1);
                    for (let i = 0; i < nodeCount; i++) {
                      const y = spacing * (i + 1);
                      const factor = isRightHanded ? 1 : -1;
                      const phase = angle * factor + (i * Math.PI) / 6;
                      const x1 = centerX + Math.sin(phase) * helixWidth;
                      const x2 = centerX - Math.sin(phase) * helixWidth;
                      const cosPhase = Math.cos(phase);
                      const size1 = (cosPhase + 1.5) * 2.8 + 1.2;
                      const size2 = (-cosPhase + 1.5) * 2.8 + 1.2;
                      const isFront1 = cosPhase > 0;

                      ctx.strokeStyle = "rgba(45, 212, 191, 0.16)";
                      ctx.lineWidth = 1.2;
                      ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(x2, y); ctx.stroke();

                      ctx.strokeStyle = "rgba(45, 212, 191, 0.4)";
                      ctx.lineWidth = 2.5;
                      ctx.beginPath(); ctx.moveTo(x1 - (x1 - x2) * 0.3, y); ctx.lineTo(x2 + (x1 - x2) * 0.3, y); ctx.stroke();

                      ctx.beginPath(); ctx.arc(x1, y, size1, 0, Math.PI * 2);
                      ctx.fillStyle = isFront1 ? "#2dd4bf" : "rgba(13, 148, 136, 0.4)";
                      ctx.fill();

                      ctx.beginPath(); ctx.arc(x2, y, size2, 0, Math.PI * 2);
                      ctx.fillStyle = !isFront1 ? "#2dd4bf" : "rgba(13, 148, 136, 0.4)";
                      ctx.fill();
                    }
                  };

                  if (width > 768) {
                    drawHelix(width * 0.12, true);
                    drawHelix(width * 0.88, false);
                  } else {
                    drawHelix(width * 0.5, true);
                  }

                  ctx.strokeStyle = "rgba(45, 212, 191, 0.35)";
                  ctx.lineWidth = 2;
                  ctx.beginPath();
                  const ecgSpeed = angle * 20;
                  const baseLineY = height * 0.88;
                  const getEcgVal = (xCoord) => {
                    const period = 240;
                    const localX = (xCoord + ecgSpeed) % period;
                    if (localX > 40 && localX < 60) {
                      const p = (localX - 40) / 20;
                      return baseLineY - Math.sin(p * Math.PI) * 12;
                    }
                    if (localX >= 90 && localX < 94) return baseLineY + 12;
                    if (localX >= 94 && localX < 100) {
                      const r = (localX - 94) / 6;
                      return baseLineY + 12 - r * 90;
                    }
                    if (localX >= 100 && localX < 106) {
                      const s = (localX - 100) / 6;
                      return baseLineY - 78 + s * 105;
                    }
                    if (localX >= 106 && localX < 112) {
                      const r2 = (localX - 106) / 6;
                      return baseLineY + 27 - r2 * 27;
                    }
                    if (localX > 140 && localX < 170) {
                      const t = (localX - 140) / 30;
                      return baseLineY - Math.sin(t * Math.PI) * 20;
                    }
                    return baseLineY;
                  };
                  ctx.moveTo(0, baseLineY);
                  for (let x = 0; x <= width; x += 4) {
                    ctx.lineTo(x, getEcgVal(x));
                  }
                  ctx.stroke();
                } else if (preset === "preset-culinary") {
                  particles.forEach(p => {
                    p.y += p.vy; p.x += p.vx + Math.sin(p.y * 0.003) * 0.15;
                    if (p.y < -20 || p.alpha <= 0) {
                      p.y = height + 20; p.x = Math.random() * width; p.alpha = Math.random() * 0.6 + 0.3;
                    }
                    p.alpha -= p.decay;
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                    ctx.fillStyle = p.color + Math.max(0, p.alpha) + ")";
                    ctx.fill();
                  });
                } else if (preset === "preset-corporate") {
                  angle += 0.0025;
                  ctx.strokeStyle = "rgba(59, 130, 246, 0.025)";
                  ctx.lineWidth = 1;
                  const lineCount = 6;
                  for (let i = 1; i <= lineCount; i++) {
                    const y = (height / (lineCount + 1)) * i;
                    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
                  }

                  ctx.fillStyle = "rgba(59, 130, 246, 0.4)";
                  ctx.font = "9px monospace";
                  ctx.fillText("[MARKET FEED: LIVE]", width * 0.04, 50);
                  ctx.fillText("[SYS_PORT_SECURE: TRUE]", width * 0.04, 70);
                  ctx.fillText("[ROI PERFORMANCE: +182.4%]", width * 0.04, height - 60);
                  ctx.fillText("[SEC_ANALYTICS: ACTIVE]", width * 0.78, 50);
                  ctx.fillText("[BULLISH_INDEX: 84%]", width * 0.78, 70);
                  ctx.fillText("[TRACKER: GLOBAL]", width * 0.78, height - 60);

                  if (width > 768) {
                    const graphLeft = width * 0.04;
                    const graphWidth = width * 0.24;
                    const graphBaseY = height * 0.65;
                    const ptsCount = corporateData.linePoints.length;
                    const stepX = graphWidth / (ptsCount - 1);

                    for (let i = 0; i < ptsCount; i++) {
                      corporateData.linePoints[i] = 120 + Math.sin(angle * 3 + i * 0.4) * 35 + Math.cos(angle + i * 0.2) * 15;
                    }

                    const fillGrad = ctx.createLinearGradient(0, graphBaseY - 150, 0, graphBaseY);
                    fillGrad.addColorStop(0, "rgba(59, 130, 246, 0.12)");
                    fillGrad.addColorStop(1, "rgba(59, 130, 246, 0.0)");
                    ctx.fillStyle = fillGrad;
                    ctx.beginPath();
                    ctx.moveTo(graphLeft, graphBaseY);
                    for (let i = 0; i < ptsCount; i++) {
                      ctx.lineTo(graphLeft + i * stepX, graphBaseY - corporateData.linePoints[i]);
                    }
                    ctx.lineTo(graphLeft + graphWidth, graphBaseY);
                    ctx.closePath();
                    ctx.fill();

                    ctx.strokeStyle = "#3b82f6";
                    ctx.lineWidth = 2.5;
                    ctx.beginPath();
                    for (let i = 0; i < ptsCount; i++) {
                      const px = graphLeft + i * stepX;
                      const py = graphBaseY - corporateData.linePoints[i];
                      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
                    }
                    ctx.stroke();

                    for (let i = 0; i < ptsCount; i += 4) {
                      const px = graphLeft + i * stepX;
                      const py = graphBaseY - corporateData.linePoints[i];
                      ctx.fillStyle = "#ffffff";
                      ctx.beginPath(); ctx.arc(px, py, 3, 0, Math.PI * 2); ctx.fill();
                      ctx.strokeStyle = "#3b82f6"; ctx.lineWidth = 1.5; ctx.stroke();
                    }

                    const chartRight = width * 0.96;
                    const chartLeft = width * 0.72;
                    const chartWidth = chartRight - chartLeft;
                    const chartBaseY = height * 0.65;
                    const barCount = corporateData.candlesticks.length;
                    const cStepX = chartWidth / (barCount - 1);
                    const barW = cStepX * 0.55;

                    const now = Date.now();
                    if (now - (corporateData.lastUpdate || 0) > 1200) {
                      corporateData.candlesticks.shift();
                      const lastCandle = corporateData.candlesticks[corporateData.candlesticks.length - 1];
                      const change = (Math.random() - 0.48) * 35;
                      const open = lastCandle.close;
                      const close = open + change;
                      const high = Math.max(open, close) + Math.random() * 10;
                      const low = Math.min(open, close) - Math.random() * 10;
                      corporateData.candlesticks.push({ open, close, high, low });
                      corporateData.lastUpdate = now;
                    }

                    for (let i = 0; i < barCount; i++) {
                      const candle = corporateData.candlesticks[i];
                      const isBullish = candle.close >= candle.open;
                      const px = chartLeft + i * cStepX;
                      const cy = chartBaseY - 140;
                      const oY = cy - candle.open * 0.5;
                      const cY = cy - candle.close * 0.5;
                      const hY = cy - candle.high * 0.5;
                      const lY = cy - candle.low * 0.5;
                      const themeColor = isBullish ? "#10b981" : "#ef4444";

                      ctx.strokeStyle = themeColor;
                      ctx.lineWidth = 1.2;
                      ctx.beginPath(); ctx.moveTo(px, hY); ctx.lineTo(px, lY); ctx.stroke();

                      ctx.fillStyle = themeColor;
                      const bodyH = Math.max(2, Math.abs(cY - oY));
                      const topY = Math.min(cY, oY);
                      ctx.fillRect(px - barW / 2, topY, barW, bodyH);
                    }
                  } else {
                    ctx.strokeStyle = "rgba(59, 130, 246, 0.4)";
                    ctx.lineWidth = 2.5;
                    ctx.beginPath();
                    const mStepX = width / 11;
                    for (let i = 0; i < 12; i++) {
                      const py = height * 0.82 + Math.sin(angle * 2 + i * 0.6) * 20;
                      const px = i * mStepX;
                      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
                    }
                    ctx.stroke();
                  }
                } else if (preset === "preset-creative") {
                  angle += 0.0012;
                  const waveGradients = ["rgba(236, 72, 153, ", "rgba(168, 85, 247, ", "rgba(59, 130, 246, ", "rgba(6, 182, 212, "];
                  for (let w = 0; w < 4; w++) {
                    const wavePhase = angle * (w + 1) * 1.6;
                    const waveHeight = 70 + w * 25;
                    const opacity = 0.08 + (w * 0.02);
                    ctx.strokeStyle = waveGradients[w] + opacity + ")";
                    ctx.lineWidth = 2.5;
                    ctx.beginPath();
                    ctx.moveTo(0, height / 2);
                    for (let x = 0; x <= width; x += 15) {
                      const y = height / 2 + Math.sin(x * 0.0025 + wavePhase) * Math.cos(x * 0.001 - wavePhase) * waveHeight;
                      ctx.lineTo(x, y);
                    }
                    ctx.stroke();
                  }
                }
                requestAnimationFrame(render);
              }
              render();
            })();
          </script>
        `;
      } else {
        const isVideo = /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(url);
        if (isVideo) {
          backgroundMarkup = `
            <video class="video-background" autoplay muted loop playsinline style="position:fixed; inset:0; width:100%; height:100%; object-fit:cover; z-index:-2;">
              <source src="${url}" type="video/mp4">
            </video>
            <div class="overlay" style="position:fixed; inset:0; background:rgba(0,0,0,0.5); z-index:-1;"></div>
          `;
        } else {
          backgroundMarkup = `
            <div class="bg-image" style="position:fixed; inset:0; width:100%; height:100%; background-image: url('${url}'); background-size: cover; background-position: center; z-index:-2;"></div>
            <div class="overlay" style="position:fixed; inset:0; background:rgba(0,0,0,0.5); z-index:-1;"></div>
          `;
        }
      }
    }

    const projectsHtml = cv.projects && cv.projects.length
      ? cv.projects.map((p: any) => `
        <div class="project">
          <h3 class="project-title">⚡ ${p.name}</h3>
          ${p.description ? `<p class="project-desc">${p.description}</p>` : ""}
        </div>
      `).join("")
      : `<p style="color:#889278; font-style:italic;">${t.noProjects}</p>`;

    const profilePic = cv.profilePhoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(cv.fullName || "Your Name")}&background=535d0a&color=fff&size=150`;

    // Audio Bio Scripting
    let audioControlsHtml = "";
    let audioScript = "";
    if (cv.audioBioType === "tts") {
      audioControlsHtml = `
        <div class="audio-player">
          <button id="playBtn" class="play-btn">▶</button>
          <span class="player-label">AI Voice Bio</span>
          <div class="progress-container" id="progressContainer">
            <div class="progress" id="progress"></div>
          </div>
        </div>
      `;
      audioScript = `
        const playBtn = document.getElementById("playBtn");
        const progress = document.getElementById("progress");
        const textToSpeak = \`${(cv.aboutMe || "").replace(/[`"\\]/g, '\\$&')}\`;
        
        let utterance = null;
        let isPlaying = false;
        let progressInterval = null;
        let speakProgress = 0;

        playBtn.addEventListener("click", () => {
          if (!isPlaying) {
            window.speechSynthesis.cancel();
            utterance = new SpeechSynthesisUtterance(textToSpeak || "Hello, my name is ${cv.fullName}. Welcome to my smart portfolio CV!");
            
            // Try to find a nice natural English voice
            const voices = window.speechSynthesis.getVoices();
            const preferredVoice = voices.find(v => v.lang.startsWith("en") && v.name.includes("Natural")) || voices.find(v => v.lang.startsWith("en"));
            if (preferredVoice) utterance.voice = preferredVoice;
            
            utterance.onend = () => {
              isPlaying = false;
              playBtn.textContent = "▶";
              progress.style.width = "0%";
              clearInterval(progressInterval);
            };

            utterance.onerror = () => {
              isPlaying = false;
              playBtn.textContent = "▶";
              progress.style.width = "0%";
              clearInterval(progressInterval);
            };

            window.speechSynthesis.speak(utterance);
            isPlaying = true;
            playBtn.textContent = "❚❚";
            
            // Estimate progress animation based on reading length
            speakProgress = 0;
            const approxDurationMs = (textToSpeak.split(" ").length * 400) || 5000; 
            const step = 100 / (approxDurationMs / 100);
            
            progressInterval = setInterval(() => {
              if (speakProgress < 100) {
                speakProgress += step;
                progress.style.width = Math.min(speakProgress, 100) + "%";
              }
            }, 100);
          } else {
            window.speechSynthesis.cancel();
            isPlaying = false;
            playBtn.textContent = "▶";
            clearInterval(progressInterval);
            progress.style.width = "0%";
          }
        });
      `;
    } else if (cv.audioBioType === "custom" && cv.audioBioUrl) {
      audioControlsHtml = `
        <div class="audio-player">
          <button id="playBtn" class="play-btn">▶</button>
          <span class="player-label">Voice Bio</span>
          <div class="progress-container" id="progressContainer">
            <div class="progress" id="progress"></div>
          </div>
        </div>
        <audio id="audio" src="${cv.audioBioUrl}"></audio>
      `;
      audioScript = `
        const audio = document.getElementById("audio");
        const playBtn = document.getElementById("playBtn");
        const progress = document.getElementById("progress");
        const progressContainer = document.getElementById("progressContainer");

        playBtn.addEventListener("click", () => {
          if (audio.paused) {
            audio.play();
            playBtn.textContent = "❚❚";
          } else {
            audio.pause();
            playBtn.textContent = "▶";
          }
        });

        audio.addEventListener("timeupdate", () => {
          if (audio.duration) {
            progress.style.width = (audio.currentTime / audio.duration * 100) + "%";
          }
        });

        audio.addEventListener("ended", () => {
          playBtn.textContent = "▶";
          progress.style.width = "0%";
        });

        progressContainer.addEventListener("click", (e) => {
          if (audio.duration) {
            const rect = progressContainer.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            audio.currentTime = (clickX / rect.width) * audio.duration;
          }
        });
      `;
    }

    res.send(`
      <!DOCTYPE html>
      <html lang="${activeLang}" dir="${isAr ? "rtl" : "ltr"}">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${cv.seoTitle || `${cv.fullName || "Your Name"} — Interactive Portfolio`}</title>
        <meta name="description" content="${cv.seoDescription || `Interactive Smart CV of ${cv.fullName || "Your Name"}. View skills, projects, and contact information.`}">
        <meta name="keywords" content="${cv.seoKeywords || `${cv.fullName || "Your Name"}, portfolio, resume, CV, developer, designer`}">
        
        <!-- OpenGraph SEO Meta Tags -->
        <meta property="og:title" content="${cv.seoTitle || `${cv.fullName || "Your Name"} — Interactive Portfolio`}">
        <meta property="og:description" content="${cv.seoDescription || `Interactive Smart CV of ${cv.fullName || "Your Name"}.`}">
        <meta property="og:type" content="profile">
        ${cv.profilePhoto ? `<meta property="og:image" content="${cv.profilePhoto}">` : ""}
        
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800&family=Poppins:wght@400;500;600;700;800&display=swap" rel="stylesheet">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; scroll-behavior: smooth; }
          body {
            ${bgStyleCss}
            font-family: ${isAr ? "'Cairo', sans-serif" : "'Poppins', sans-serif"};
            color: #fff;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            overflow-x: hidden;
          }
          
          /* Dynamic translation switch */
          .lang-switcher {
            position: absolute;
            top: 20px;
            right: ${isAr ? "auto" : "20px"};
            left: ${isAr ? "20px" : "auto"};
            z-index: 100;
          }
          .lang-btn {
            background: rgba(255, 255, 255, 0.08);
            border: 1px solid rgba(255, 255, 255, 0.15);
            color: #fff;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 11px;
            text-decoration: none;
            font-weight: 700;
            display: inline-flex;
            align-items: center;
            gap: 6px;
            backdrop-filter: blur(8px);
            transition: all 0.2s;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .lang-btn:hover {
            background: rgba(255, 255, 255, 0.15);
            border-color: ${accentColor};
          }

          ${isAr ? `
            .skill-item {
              flex-direction: row-reverse;
            }
            .github-card, .designer-card, .project {
              text-align: right;
            }
            .github-card-title, .designer-card-title, .project-title {
              display: flex;
              flex-direction: row-reverse;
              justify-content: flex-end;
              gap: 6px;
            }
            .github-card-meta {
              flex-direction: row-reverse;
              justify-content: flex-end;
            }
            .designer-card-tag {
              text-align: right;
            }
            .audio-player {
               flex-direction: row-reverse;
            }
            .play-btn {
               margin-left: 12px;
               margin-right: 0;
            }
            .about-text, .glass-box p, .github-card-desc {
              text-align: right;
            }
          ` : ""}

          header {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 12px;
            padding: 80px 20px 30px;
            text-align: center;
            position: relative;
          }
          .profile-container {
            position: relative;
            width: 154px;
            height: 154px;
            display: flex;
            justify-content: center;
            align-items: center;
            margin-bottom: 8px;
          }
          .profile-container::before {
            content: "";
            position: absolute;
            width: 170px;
            height: 170px;
            border-radius: 50%;
            background: conic-gradient(${accentColor}, ${darkAccentColor}, ${accentColor});
            animation: rotateBorder 6s linear infinite;
            z-index: 0;
          }
          @keyframes rotateBorder { to { transform: rotate(360deg); } }
          .profile-img {
            width: 150px;
            height: 150px;
            border-radius: 50%;
            object-fit: cover;
            position: relative;
            z-index: 1;
            border: 4px solid #1a1f15;
            background: #2b2e25;
          }
          .profile-name {
            font-size: 42px;
            font-weight: 800;
            letter-spacing: -0.5px;
            color: #ffffff;
            text-shadow: 0 4px 15px rgba(0,0,0,0.4);
          }
          .profile-title {
            color: ${accentColor};
            font-size: 20px;
            font-weight: 700;
            letter-spacing: 0.15em;
            text-transform: uppercase;
            margin-top: 2px;
          }
          
          /* Audio Bio */
          .audio-player {
            display: flex;
            align-items: center;
            gap: 12px;
            background: rgba(0, 0, 0, 0.45);
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            padding: 8px 18px;
            border-radius: 30px;
            width: 240px;
            margin: 12px 0;
          }
          .play-btn {
            background: ${accentColor};
            border: none;
            color: #1a1f15;
            font-size: 14px;
            width: 28px;
            height: 28px;
            border-radius: 50%;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            transition: transform 0.15s;
          }
          .play-btn:hover { transform: scale(1.05); }
          .player-label {
            font-size: 11px;
            font-weight: 600;
            color: ${accentColor};
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .progress-container {
            flex: 1;
            height: 6px;
            background: rgba(255,255,255,0.15);
            border-radius: 5px;
            overflow: hidden;
            cursor: pointer;
            position: relative;
          }
          .progress {
            height: 100%;
            width: 0%;
            background: ${accentColor};
            border-radius: 5px;
          }

          nav.navigation ul {
            display: flex;
            list-style: none;
            gap: 1.5rem;
            background: rgba(0,0,0,0.45);
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            padding: 10px 24px;
            border-radius: 30px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            margin-top: 14px;
          }
          nav.navigation a {
            color: rgba(255, 255, 255, 0.8);
            text-decoration: none;
            font-weight: 600;
            font-size: 13px;
            letter-spacing: 0.5px;
            transition: color 0.2s;
          }
          nav.navigation a:hover { color: ${accentColor}; }

          hr {
            border: none;
            height: 1px;
            width: 60%;
            margin: 40px auto;
            background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.15), transparent);
          }

          .glass-box {
            width: 90%;
            max-width: 720px;
            margin: 0 auto 40px;
            padding: 40px;
            border-radius: 20px;
            background: rgba(255, 255, 255, 0.04);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
            text-align: left;
          }
          .glass-box h2 {
            font-size: 14px;
            font-weight: 800;
            color: ${accentColor};
            margin-bottom: 18px;
            letter-spacing: 2px;
            text-transform: uppercase;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            padding-bottom: 8px;
          }
           .about-text {
            line-height: 1.8;
            color: #d8e2dc;
            font-size: 15px;
            text-align: left;
            white-space: pre-wrap;
          }

          /* Social link badges */
          .social-links {
            display: flex;
            flex-wrap: wrap;
            justify-content: center;
            gap: 12px;
            margin-top: 15px;
            max-width: 500px;
          }
          .social-link {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            font-size: 12px;
            color: rgba(255, 255, 255, 0.7);
            background: rgba(255, 255, 255, 0.04);
            border: 1px solid rgba(255, 255, 255, 0.08);
            padding: 6px 14px;
            border-radius: 20px;
            text-decoration: none;
            transition: all 0.2s;
            font-weight: 600;
          }
          .social-link:hover {
            color: ${accentColor};
            background: rgba(255, 255, 255, 0.08);
            border-color: rgba(255, 255, 255, 0.15);
            transform: translateY(-1px);
          }

          /* Skills grid layout */
          .skills-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
            gap: 12px;
            margin-top: 15px;
          }
          .skill-item {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 14px;
            color: #d8e2dc;
            font-weight: 500;
          }
          .skill-bullet {
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background-color: ${accentColor};
            flex-shrink: 0;
          }
          
          /* Projects grid */
          .projects-list {
            display: flex;
            flex-direction: column;
            gap: 16px;
            text-align: left;
          }
          .project {
            background: rgba(255, 255, 255, 0.02);
            border: 1px solid rgba(255,255,255,0.06);
            padding: 20px;
            border-radius: 12px;
            transition: transform 0.2s, background 0.2s, border-color 0.2s;
          }
          .project:hover {
            transform: translateY(-2px);
            background: rgba(255, 255, 255, 0.05);
            border-color: ${accentColor};
          }
          .project-title {
            color: ${accentColor};
            font-size: 17px;
            font-weight: 600;
            margin-bottom: 8px;
          }
          .project-desc {
            font-size: 13.5px;
            color: #cdd5cb;
            line-height: 1.6;
          }

          footer {
            margin-top: auto;
            text-align: center;
            padding: 40px 20px;
            color: rgba(255,255,255,0.4);
            font-size: 12px;
          }
          footer a {
            color: ${accentColor};
            text-decoration: none;
            font-weight: 600;
          }
          footer a:hover { text-decoration: underline; }

          /* Specialization - Developer GitHub section styling */
          .github-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
            gap: 16px;
            margin-top: 15px;
          }
          .github-card {
            background: rgba(255, 255, 255, 0.02);
            border: 1px solid rgba(255, 255, 255, 0.05);
            border-radius: 12px;
            padding: 20px;
            transition: all 0.25s ease;
            display: flex;
            flex-direction: column;
            gap: 8px;
            text-decoration: none;
            color: inherit;
            text-align: left;
          }
          .github-card:hover {
            transform: translateY(-3px);
            background: rgba(255, 255, 255, 0.05);
            border-color: ${accentColor};
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
          }
          .github-card-title {
            color: ${accentColor};
            font-size: 16px;
            font-weight: 700;
            display: flex;
            align-items: center;
            gap: 6px;
          }
          .github-card-desc {
            font-size: 13px;
            color: #b0b5aa;
            line-height: 1.5;
            flex-grow: 1;
          }
          .github-card-meta {
            display: flex;
            align-items: center;
            gap: 14px;
            font-size: 11px;
            color: rgba(255, 255, 255, 0.5);
            font-weight: 600;
          }
          .github-star-icon {
            display: inline-flex;
            align-items: center;
            gap: 3px;
          }

          /* Specialization - Designer Bento Gallery styling */
          .designer-gallery {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
            gap: 16px;
            margin-top: 15px;
          }
          .designer-card {
            background: rgba(255, 255, 255, 0.02);
            border: 1px solid rgba(255, 255, 255, 0.05);
            border-radius: 12px;
            overflow: hidden;
            transition: all 0.25s ease;
            position: relative;
            cursor: pointer;
            text-align: left;
          }
          .designer-card:hover {
            transform: scale(1.02);
            border-color: ${accentColor};
          }
          .designer-img-placeholder {
            height: 140px;
            background: linear-gradient(135deg, ${darkAccentColor}33, rgba(255,255,255,0.05));
            display: flex;
            align-items: center;
            justify-content: center;
            color: rgba(255, 255, 255, 0.3);
            font-size: 24px;
          }
          .designer-card-info {
            padding: 12px;
          }
          .designer-card-title {
            font-size: 13.5px;
            font-weight: 700;
            color: #f0f3e8;
          }
          .designer-card-tag {
            font-size: 10px;
            text-transform: uppercase;
            color: ${accentColor};
            font-weight: 700;
            margin-top: 2px;
            letter-spacing: 0.5px;
          }

          @media (max-width: 600px) {
            header { padding: 40px 15px 20px; }
            .profile-name { font-size: 32px; }
            .glass-box { padding: 24px 20px; margin-bottom: 30px; }
            .profile-container { width: 124px; height: 124px; }
            .profile-container::before { width: 138px; height: 138px; }
            .profile-img { width: 120px; height: 120px; }
          }
        </style>
      </head>
      <body>
        ${backgroundMarkup}

        <div class="lang-switcher">
          <a href="?lang=${isAr ? "en" : "ar"}" class="lang-btn">
            🌐 ${isAr ? "English" : "العربية"}
          </a>
        </div>

         <header>
          <div class="profile-container">
            <img class="profile-img" src="${profilePic}" alt="${cv.fullName}">
          </div>

          <h1 class="profile-name">${cv.fullName || "Your Name"}</h1>
          <p class="profile-title">${cv.title || "Your Title"}</p>

          <div class="social-links">
            ${cv.linkedinUrl ? `
              <a href="${cv.linkedinUrl}" target="_blank" class="social-link">
                <svg style="width: 14px; height: 14px; fill: #0a66c2; vertical-align: middle;" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
                <span>LinkedIn</span>
              </a>
            ` : ""}
            ${cv.twitterUrl ? `
              <a href="${cv.twitterUrl}" target="_blank" class="social-link">
                <svg style="width: 14px; height: 14px; fill: #1da1f2; vertical-align: middle;" viewBox="0 0 24 24"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/></svg>
                <span>Twitter</span>
              </a>
            ` : ""}
            ${cv.githubUrl ? `
              <a href="${cv.githubUrl}" target="_blank" class="social-link">
                <svg style="width: 14px; height: 14px; fill: white; vertical-align: middle;" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                <span>GitHub</span>
              </a>
            ` : ""}
            ${cv.websiteUrl ? `
              <a href="${cv.websiteUrl}" target="_blank" class="social-link">
                <svg style="width: 14px; height: 14px; stroke: #2dd4bf; stroke-width: 2; fill: none; vertical-align: middle;" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
                <span>Website</span>
              </a>
            ` : ""}
          </div>

          ${audioControlsHtml}

          <nav class="navigation">
            <ul>
              <li><a href="#${cv.aboutSectionId || "about"}">${t.aboutMe}</a></li>
              <li><a href="#skills">${t.skills}</a></li>
              <li><a href="#${cv.workSectionId || "myWork"}">${t.work}</a></li>
            </ul>
          </nav>
        </header>

        <hr/>

        <section id="${cv.aboutSectionId || "about"}" class="glass-box">
          <h2>${t.aboutMe}</h2>
          <div class="about-text">${cv.aboutMe || "No information provided yet."}</div>
        </section>

        <hr/>

        <section id="skills" class="glass-box">
          <h2>${t.skills}</h2>
          <div class="skills-grid">
            ${(cv.skills || "")
              .split(",")
              .map(s => s.trim())
              .filter(Boolean)
              .map(skill => `
                <div class="skill-item">
                  <div class="skill-bullet"></div>
                  <span>${skill}</span>
                </div>
              `).join("") || `<p class="italic" style="color: rgba(255,255,255,0.4); font-size: 13.5px;">${t.noSkills}</p>`}
          </div>
        </section>

        <hr/>

        <!-- Specialization blocks -->
        ${cv.specialization === "developer" && cv.githubUsername ? `
          <section id="github-section" class="glass-box">
            <h2>${t.github}</h2>
            <div id="github-grid" class="github-grid">
              <div style="color: rgba(255,255,255,0.4); font-style: italic; font-size: 14px; text-align: center; width: 100%;">${t.loadingGithub}</div>
            </div>
          </section>
          <hr/>
        ` : ""}
        
        ${cv.specialization === "designer" ? `
          <section id="designer-section" class="glass-box">
            <h2>${t.designer}</h2>
            <div class="designer-gallery">
              <div class="designer-card">
                <div class="designer-img-placeholder">🎨</div>
                <div class="designer-card-info">
                  <div class="designer-card-title">${t.brandDesign}</div>
                  <div class="designer-card-tag">${t.uiBranding}</div>
                </div>
              </div>
              <div class="designer-card">
                <div class="designer-img-placeholder">💻</div>
                <div class="designer-card-info">
                  <div class="designer-card-title">${t.mobileApp}</div>
                  <div class="designer-card-tag">${t.productDesign}</div>
                </div>
              </div>
              <div class="designer-card">
                <div class="designer-img-placeholder">✨</div>
                <div class="designer-card-info">
                  <div class="designer-card-title">${t.visualGraphics}</div>
                  <div class="designer-card-tag">${t.artDirection}</div>
                </div>
              </div>
            </div>
            ${cv.behanceUrl ? `
              <div style="text-align: center; margin-top: 24px;">
                <a href="${cv.behanceUrl}" target="_blank" class="social-link" style="padding: 10px 24px; font-size: 13px; border-radius: 30px;">
                  <span>${t.seeMoreBehance}</span> ↗
                </a>
              </div>
            ` : ""}
          </section>
          <hr/>
        ` : ""}

        <section id="${cv.workSectionId || "myWork"}" class="glass-box">
          <h2>${t.work}</h2>
          <div class="projects-list">
            ${projectsHtml}
          </div>
        </section>

        <footer>
          <p>© ${new Date().getFullYear()} ${cv.fullName || ""}. All rights reserved.</p>
        </footer>

        <script>
          ${audioScript}

          // Fetch GitHub repos for developer specialization
          const githubUsername = "${cv.githubUsername || ""}";
          const accentColor = "${accentColor}";
          if (githubUsername) {
            fetch("https://api.github.com/users/" + githubUsername + "/repos?sort=updated&per_page=6")
              .then(res => res.json())
              .then(repos => {
                const grid = document.getElementById("github-grid");
                if (!grid) return;
                
                if (Array.isArray(repos) && repos.length > 0) {
                  grid.innerHTML = repos.map(repo => {
                    return '<a href="' + repo.html_url + '" target="_blank" class="github-card">' +
                      '<div class="github-card-title">' +
                        '<svg style="width:16px; height:16px; fill:' + accentColor + ';" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>' +
                        '<span>' + repo.name + '</span>' +
                      '</div>' +
                      '<p class="github-card-desc">' + (repo.description || "No description provided.") + '</p>' +
                      '<div class="github-card-meta">' +
                        '<span>' + (repo.language || "TypeScript") + '</span>' +
                        '<span class="github-star-icon">' +
                          '<svg style="width:12px; height:12px; fill:rgba(255,255,255,0.5);" viewBox="0 0 24 24"><path d="M12 .587l3.668 7.431 8.2 1.191-5.934 5.787 1.4 8.168L12 18.896l-7.334 3.857 1.4-8.168L.132 9.209l8.2-1.191L12 .587z"/></svg>' +
                          '<span>' + repo.stargazers_count + '</span>' +
                        '</span>' +
                      '</div>' +
                    '</a>';
                  }).join("");
                } else {
                  grid.innerHTML = '<div style="color: rgba(255,255,255,0.4); font-style: italic; font-size: 14px; text-align: center; width: 100%;">No public repositories found.</div>';
                }
              })
              .catch(err => {
                const grid = document.getElementById("github-grid");
                if (grid) {
                  grid.innerHTML = '<div style="color: rgba(255,255,255,0.4); font-style: italic; font-size: 14px; text-align: center; width: 100%;">Failed to load GitHub repositories.</div>';
                }
              });
          }
        </script>
      </body>
      </html>
    `);
  });

  // Vite integration for dev server or static files for prod
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`SmartCV server running on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start SmartCV server:", err);
});
