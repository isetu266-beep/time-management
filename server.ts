import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import fs from "fs";

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "10mb" }));

// Local backup storage file path
const BACKUP_FILE = path.join(process.cwd(), ".local_backup.json");

// In-memory backup cache
let memoryBackup: any = null;

if (fs.existsSync(BACKUP_FILE)) {
  try {
    memoryBackup = JSON.parse(fs.readFileSync(BACKUP_FILE, "utf-8"));
  } catch (e) {
    console.error("Failed to load initial backup file", e);
  }
}

// Lazy initialization for Gemini
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

// 1. Health check
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
    timestamp: new Date().toISOString(),
  });
});

// 2. Cloud/Local Backup endpoint
app.post("/api/sync/backup", (req, res) => {
  try {
    const data = req.body;
    if (!data || typeof data !== "object") {
      return res.status(400).json({ error: "Invalid backup data" });
    }
    memoryBackup = {
      ...data,
      serverSavedAt: new Date().toISOString(),
    };
    try {
      fs.writeFileSync(BACKUP_FILE, JSON.stringify(memoryBackup, null, 2));
    } catch (err) {
      // silently keep in memory if file write fails in container
    }
    return res.json({
      success: true,
      timestamp: memoryBackup.serverSavedAt,
      message: "ডেটা সফলভাবে সার্ভার ক্লাউডে সংরক্ষিত হয়েছে",
    });
  } catch (err: any) {
    console.error("Backup error:", err);
    return res.status(500).json({ error: err.message || "Failed to save backup" });
  }
});

// 3. Cloud/Local Restore endpoint
app.get("/api/sync/restore", (_req, res) => {
  try {
    if (memoryBackup) {
      return res.json({ success: true, data: memoryBackup });
    }
    if (fs.existsSync(BACKUP_FILE)) {
      const content = fs.readFileSync(BACKUP_FILE, "utf-8");
      memoryBackup = JSON.parse(content);
      return res.json({ success: true, data: memoryBackup });
    }
    return res.status(404).json({
      success: false,
      message: "কোনো পূর্ববর্তী ব্যাকআপ ডেটা পাওয়া যায়নি",
    });
  } catch (err: any) {
    console.error("Restore error:", err);
    return res.status(500).json({ error: err.message || "Failed to restore backup" });
  }
});

// 4. AI Roadmap Generation (Gemini 3.8 Flash)
app.post("/api/ai/generate-roadmap", async (req, res) => {
  try {
    const { goal, timeframe, category } = req.body;
    if (!goal) {
      return res.status(400).json({ error: "Goal is required" });
    }

    const ai = getGeminiClient();

    // Fallback if no API key is provided
    if (!ai) {
      const fallbackPhases = [
        {
          phaseNumber: 1,
          title: "ভিত্তি মজবুত করা ও ফান্ডামেন্টালস শেখা",
          duration: "1ম মাস",
          description: "প্রতিদিন নির্দিষ্ট সময় দিয়ে মৌলিক বিষয়গুলো গভীরভাবে বোঝা।",
          milestones: [
            { title: "মৌলিক বিষয়গুলো 100% শেষ করা", targetDays: 15 },
            { title: "প্রথম বাস্তব অনুশীলন সম্পন্ন করা", targetDays: 30 },
          ],
        },
        {
          phaseNumber: 2,
          title: "বাস্তব প্রয়োগ ও প্রজেক্ট তৈরি",
          duration: "2য় মাস",
          description: "ছোট ছোট বাস্তব প্রজেক্ট তৈরি ও সমস্যার সমাধান করা।",
          milestones: [
            { title: "2টি মাঝারি মানের প্রজেক্ট তৈরি", targetDays: 45 },
            { title: "কাজের ভুলত্রুটি সংশোধন ও অপটিমাইজ করা", targetDays: 60 },
          ],
        },
        {
          phaseNumber: 3,
          title: "চূড়ান্ত দক্ষতা অর্জন ও ফলাফল লাভ",
          duration: "3য় মাস",
          description: "নিজের দক্ষতাকে প্রফেশনাল মানে উন্নীত করা ও কাঙ্ক্ষিত লক্ষ্যে পৌঁছানো।",
          milestones: [
            { title: "প্রধান পোর্টফোলিও বা কাজের ফলাফল প্রদর্শন", targetDays: 75 },
            { title: "চূড়ান্ত মাইলফলক অর্জন ও পরবর্তী পরিকল্পনা", targetDays: 90 },
          ],
        },
      ];

      return res.json({
        title: goal,
        timeframe: timeframe || "3 মাস",
        summary: `${goal} অর্জনের জন্য একটি ভারসাম্যপূর্ণ ও কার্যকর ধাপ-ভিত্তিক পরিকল্পনা।`,
        phases: fallbackPhases,
        dailyHabits: [
          { title: "প্রতিদিন 1 ঘণ্টা নিবিড় চর্চা", category: "Focus" },
          { title: "কাজের অগ্রগতির নোট নেওয়া", category: "Mind" },
          { title: "সোশ্যাল মিডিয়া অপচয় নিয়ন্ত্রণ", category: "Body" },
        ],
        advice: "ধারাবাহিকতাই সফলতার চাবিকাঠি। প্রতিদিন অন্তত একটি ছোট মাইলফলক অর্জন করুন।",
      });
    }

    const prompt = `তুমি একজন বিশ্বমানের টাইম ম্যানেজমেন্ট ও গোল-অ্যাচিভমেন্ট কোচ।
ইউজারের কাঙ্ক্ষিত লক্ষ্য: "${goal}"
ক্যাটাগরি: "${category || "সাধারণ"}"
সময়সীমা: "${timeframe || "3 মাস"}"

দয়া করে এই লক্ষ্যের জন্য একটি অত্যন্ত কার্যকর, ব্যবহারিক ও 3-পর্যায়ের (3 phases) রোডম্যাপ তৈরি করো বাংলায় (Bangla language)। সব সংখ্যা ইংরেজি ডিজিটে (0-9) লিখবে।
প্রতিটি ফেজে বাস্তবসম্মত মাইলফলক এবং লক্ষ্যটি অর্জনে সহায়ক দৈনিক অভ্যাস উল্লেখ করো।`;

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            timeframe: { type: Type.STRING },
            summary: { type: Type.STRING },
            phases: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  phaseNumber: { type: Type.INTEGER },
                  title: { type: Type.STRING },
                  duration: { type: Type.STRING },
                  description: { type: Type.STRING },
                  milestones: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        title: { type: Type.STRING },
                        targetDays: { type: Type.INTEGER },
                      },
                      required: ["title", "targetDays"],
                    },
                  },
                },
                required: ["phaseNumber", "title", "duration", "description", "milestones"],
              },
            },
            dailyHabits: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  category: { type: Type.STRING },
                },
                required: ["title", "category"],
              },
            },
            advice: { type: Type.STRING },
          },
          required: ["title", "timeframe", "summary", "phases", "dailyHabits", "advice"],
        },
      },
    });

    const parsed = JSON.parse(response.text?.trim() || "{}");
    return res.json(parsed);
  } catch (error: any) {
    console.error("Gemini Roadmap generation error:", error);
    return res.status(500).json({ error: error.message || "Failed to generate roadmap" });
  }
});

// 5. AI Productivity Analysis (Gemini 3.8 Flash)
app.post("/api/ai/analyze-productivity", async (req, res) => {
  try {
    const { productiveHours, wastedHours, neutralHours, entries, tasks } = req.body;
    const ai = getGeminiClient();

    const totalTracked = (productiveHours || 0) + (wastedHours || 0) + (neutralHours || 0);
    const prodPercent = totalTracked > 0 ? Math.round(((productiveHours || 0) / totalTracked) * 100) : 0;

    // Fallback if no API key is provided
    if (!ai) {
      let status = "উন্নতির সুযোগ রয়েছে";
      if (prodPercent >= 70) status = "চমৎকার ও দক্ষ প্রোডাক্টিভিটি!";
      else if (prodPercent >= 50) status = "মোটামুটি সন্তোষজনক, তবে আরও মনযোগী হতে হবে";

      return res.json({
        score: prodPercent,
        statusTitle: status,
        keyInsight: `আপনি মোট ${totalTracked.toFixed(1)} ঘণ্টার মধ্যে ${productiveHours.toFixed(1)} ঘণ্টা কার্যকর কাজ করেছেন এবং ${wastedHours.toFixed(1)} ঘণ্টা অপচয় হয়েছে।`,
        wastedAnalysis: wastedHours > 1.5
          ? "অতিরিক্ত সোশ্যাল মিডিয়া বা উদ্দেশ্যহীন ব্রাউজিং আপনার কাজের গতি মন্থর করছে।"
          : "আপনার সময় অপচয় নিয়ন্ত্রণে রয়েছে। এটি বজায় রাখুন।",
        actionableAdvice: [
          "সকালে সবচেয়ে কঠিন কাজ (P1) অন্তত 90 মিনিট কোনো নোটিফিকেশন ছাড়া শেষ করুন।",
          "সোশ্যাল মিডিয়া চেক করার জন্য দিনে নির্দিষ্ট 20 মিনিট সময় বরাদ্দ করুন।",
          "প্রতি 30 মিনিট কাজের পর 5 মিনিট বিরতি নিন (পমোডোরো টেকনিক)।",
        ],
        motivationQuote: "সময় অপচয় বন্ধ করলেই জীবনের সব লক্ষ্য হাতের নাগালে চলে আসে।",
      });
    }

    const prompt = `তুমি একজন শীর্ষ প্রোডাক্টিভিটি কনসালট্যান্ট।
ইউজারের বিগত সময়ের পরিসংখ্যান:
- প্রোডাক্টিভ সময়: ${productiveHours} ঘণ্টা
- অপচয় করা সময়: ${wastedHours} ঘণ্টা
- স্বাভাবিক সময়: ${neutralHours} ঘণ্টা
- প্রোডাক্টিভ হার: ${prodPercent}%
- সাম্প্রতিক কাজ ও টাইম লগ: ${JSON.stringify(entries || [])}
- টাস্ক তালিকা: ${JSON.stringify((tasks || []).slice(0, 10))}

ইউজারকে তার প্রোডাক্টিভিটি স্কোর, সময় অপচয়ের কারণ বিশ্লেষণ এবং সময় বাঁচিয়ে সফল হওয়ার জন্য বাস্তব পরামর্শ দাও বাংলায় (Bangla)।`;

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.INTEGER },
            statusTitle: { type: Type.STRING },
            keyInsight: { type: Type.STRING },
            wastedAnalysis: { type: Type.STRING },
            actionableAdvice: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            motivationQuote: { type: Type.STRING },
          },
          required: ["score", "statusTitle", "keyInsight", "wastedAnalysis", "actionableAdvice", "motivationQuote"],
        },
      },
    });

    const parsed = JSON.parse(response.text?.trim() || "{}");
    return res.json(parsed);
  } catch (error: any) {
    console.error("Gemini productivity analysis error:", error);
    return res.status(500).json({ error: error.message || "Failed to analyze productivity" });
  }
});

// 6. Magic Brain Dump Parser (Gemini 3.8 Flash + Offline Fallback)
app.post("/api/ai/parse-braindump", async (req, res) => {
  try {
    const { text, targetDate } = req.body;
    if (!text || typeof text !== "string") {
      return res.status(400).json({ error: "Text is required" });
    }

    const ai = getGeminiClient();

    // Fallback if no Gemini client
    if (!ai) {
      const lines = text
        .split(/[\n,;।]+/)
        .map((l) => l.trim())
        .filter((l) => l.length > 2);

      const parsedTasks = lines.map((line, idx) => {
        let time = "";
        let durationMinutes = 30;
        let priority: "P1" | "P2" | "P3" | "P4" = "P2";
        let category = "General";

        // basic regex for time
        const timeMatch = line.match(/(\d{1,2})(:|\.)?(\d{2})?\s*(টা|am|pm|am|pm)?/i);
        if (timeMatch) {
          const hour = parseInt(timeMatch[1], 10);
          const formattedHour = hour < 10 ? `0${hour}` : `${hour}`;
          time = `${formattedHour}:00`;
        }

        if (line.includes("জরুরি") || line.includes("urgent") || idx === 0) {
          priority = "P1";
        } else if (line.includes("মিটিং") || line.includes("কাজ") || line.includes("অফিস")) {
          priority = "P2";
          category = "Work";
        } else if (line.includes("পড়া") || line.includes("স্টাডি") || line.includes("বই")) {
          category = "Study";
        } else if (line.includes("জিম") || line.includes("ব্যায়াম") || line.includes("ওষুধ")) {
          category = "Health";
        }

        return {
          title: line.replace(/(\d{1,2})\s*টায়?/g, "").trim(),
          time: time || "10:00",
          durationMinutes,
          priority,
          category,
        };
      });

      return res.json({ tasks: parsedTasks });
    }

    const prompt = `তুমি একজন এক্সপার্ট টাস্ক পার্সার এবং শিডিউলার।
ইউজার তার সারাদিনের কাজ বা এলোমেলো চিন্তা (Brain Dump) বাংলায় লিখেছে:
"${text}"

দয়া করে এই লেখাটি বিশ্লেষণ করে সুশৃঙ্খল টাস্ক লিস্ট তৈরি করো।
প্রতিটি টাস্কের জন্য:
- title: পরিষ্কার ও অর্থবোধক বাংলা শিরোনাম
- time: সময় (HH:mm ফরম্যাটে, 24-hour clock, যেমন "09:00", "14:30")
- durationMinutes: আনুমানিক কাজের ব্যাপ্তি (যেমন 15, 30, 45, 60, 90, 120 ইত্যাদি)
- priority: আইজেনহাওয়ার প্রায়োরিটি ("P1" = জরুরি ও গুরুত্বপূর্ণ, "P2" = গুরুত্বপূর্ণ, "P3" = দ্রুত সারা কাজ, "P4" = সাধারণ রুটিন)
- category: ক্যাটাগরি (Work, Study, Health, Personal, Finance, Family, General)

JSON ফরম্যাটে রিটার্ন করো।`;

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            tasks: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  time: { type: Type.STRING },
                  durationMinutes: { type: Type.INTEGER },
                  priority: { type: Type.STRING, enum: ["P1", "P2", "P3", "P4"] },
                  category: { type: Type.STRING },
                },
                required: ["title", "time", "durationMinutes", "priority", "category"],
              },
            },
          },
          required: ["tasks"],
        },
      },
    });

    const parsed = JSON.parse(response.text?.trim() || '{"tasks":[]}');
    return res.json(parsed);
  } catch (err: any) {
    console.error("Brain dump parse error:", err);
    return res.status(500).json({ error: err.message || "Failed to parse brain dump" });
  }
});

// Vite middleware & Static SPA handling
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
