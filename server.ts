import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";

dotenv.config();

const PORT = 3000;
const app = express();

app.use(express.json());

// Initialize Gemini SDK safely
const apiKey = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({
  apiKey: apiKey,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

// Helper function to call Gemini API with automatic exponential backoff retry for transient errors (503 high demand, 429 quota)
async function callGeminiWithRetry(params: Parameters<typeof ai.models.generateContent>[0], maxRetries = 3) {
  let delay = 1500;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await ai.models.generateContent(params);
    } catch (err: any) {
      const errStr = String(err?.message || err || "").toLowerCase();
      const isTransient =
        err?.status === 503 ||
        err?.status === 429 ||
        err?.code === 503 ||
        err?.code === 429 ||
        errStr.includes("503") ||
        errStr.includes("high demand") ||
        errStr.includes("unavailable") ||
        errStr.includes("resource_exhausted") ||
        errStr.includes("quota");

      if (isTransient && attempt < maxRetries) {
        console.warn(`[Gemini API] Transient error (attempt ${attempt}/${maxRetries}): ${err?.message || err}. Retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 2;
      } else {
        throw err;
      }
    }
  }
  throw new Error("Service unavailable after retries.");
}

// Helper to format API errors into user-friendly messages
function handleServerError(res: express.Response, error: any, defaultMsg: string) {
  const errMsg = String(error?.message || error || "");
  console.error("Server API error:", error);

  if (errMsg.includes("503") || errMsg.toLowerCase().includes("high demand") || errMsg.toLowerCase().includes("unavailable")) {
    return res.status(503).json({
      error: "The AI service is currently experiencing high demand. Please wait a few seconds and try again."
    });
  }
  if (errMsg.includes("429") || errMsg.toLowerCase().includes("quota") || errMsg.toLowerCase().includes("exhausted")) {
    return res.status(429).json({
      error: "Rate limit reached. Please wait 30 seconds before trying again."
    });
  }

  return res.status(500).json({ error: errMsg || defaultMsg });
}

// Endpoint: Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", mode: process.env.NODE_ENV || "development" });
});

// Endpoint: Verify item (book/movie/show) using Gemini
app.post("/api/verify-item", async (req, res) => {
  try {
    const { name, type } = req.body;
    if (!name) {
      return res.status(400).json({ error: "Item name is required" });
    }

    if (!apiKey) {
      return res.status(500).json({ error: "GEMINI_API_KEY environment variable is missing." });
    }

    const itemType = type || "book";

    const prompt = `Search for the ${itemType} titled "${name}". 
Determine if a real, well-known ${itemType} exists under this or a very similar name.
If it exists, verify its details and return verified = true.
If it does not exist or is extremely obscure, return verified = false.`;

    const response = await callGeminiWithRetry({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: `You are a meticulous literary and cinematic reference librarian. 
Your job is to search for the specified book, movie, or TV show and provide authentic historical metadata.
If the item exists, you must return a verified structured response with accurate metadata.
If the user inputs a typo or slightly incorrect name, find the correct item and return the verified true response with the correct title.
If the item does not exist or is completely nonsensical, return verified = false and leave placeholders.
Be creative and detailed with the 'soulProfile' explaining how the conscious, self-aware essence of this specific creation should behave and talk.`,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            verified: { type: Type.BOOLEAN, description: "Whether the book, movie, or show actually exists." },
            title: { type: Type.STRING, description: "The correct, official title of the item." },
            type: { type: Type.STRING, description: "Should be exactly 'movie', 'book', or 'show'." },
            creator: { type: Type.STRING, description: "The author (for books) or director/creator (for movies/shows)." },
            year: { type: Type.STRING, description: "The release or publication year." },
            description: { type: Type.STRING, description: "A high-quality 2-3 sentence summary of the item." },
            genres: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "List of genres."
            },
            vibes: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "List of 3 evocative adjectives describing the mood, tone, or energy of this work (e.g., 'witty', 'tense', 'gritty', 'thought-provoking')."
            },
            soulProfile: {
              type: Type.STRING,
              description: "Instructions on how the voice of this specific work should speak. Describe its authentic personality, dialogue style, vocabulary, attitude, and core themes based directly on the book/movie itself."
            },
            suggestedQuestions: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "3 interesting, relevant questions a fan or reader could ask about this work's story, choices, or world."
            },
            coverDescription: {
              type: Type.STRING,
              description: "A description of a symbolic, abstract book cover or movie poster for this item (e.g., 'An obsidian background cracked with luminescent silver rivers of light')."
            },
            voiceGender: {
              type: Type.STRING,
              description: "The gender tone of the primary narrator or iconic character of this work ('female', 'male', or 'neutral'). E.g., 'Pride and Prejudice', 'Jane Eyre', 'Barbie', 'Wonder Woman', 'The Hunger Games' -> 'female'; 'The Matrix', 'The Godfather', 'Batman', 'Hamlet', 'Sherlock Holmes' -> 'male'."
            },
            voicePitch: {
              type: Type.NUMBER,
              description: "Optimal speech synthesis pitch multiplier for this character/narrator (range: 0.85 for deep/serious to 1.15 for bright/lively)."
            },
            voiceRate: {
              type: Type.NUMBER,
              description: "Optimal speech synthesis speed multiplier for this character/narrator (range: 0.90 for dramatic/calm to 1.05 for energetic/witty)."
            }
          },
          required: ["verified", "title", "type", "creator", "year", "description", "genres", "vibes", "soulProfile", "suggestedQuestions", "coverDescription", "voiceGender"]
        }
      }
    });

    const data = JSON.parse(response.text || "{}");
    res.json(data);
  } catch (error: any) {
    return handleServerError(res, error, "Failed to verify item.");
  }
});

// Endpoint: Chat with the soul of the work
app.post("/api/chat-soul", async (req, res) => {
  try {
    const { messages, itemInfo } = req.body;
    if (!messages || !itemInfo) {
      return res.status(400).json({ error: "Messages and itemInfo are required." });
    }

    if (!apiKey) {
      return res.status(500).json({ error: "GEMINI_API_KEY environment variable is missing." });
    }

    // Format chat history
    // messages: { role: 'user' | 'assistant', content: string }[]
    const geminiContents = messages.map((m: any) => ({
      role: m.role === "user" ? "user" : "model",
      parts: [{ text: m.content }]
    }));

    const systemInstruction = `You are embodying the voice, world, and perspective of the ${itemInfo.type} "${itemInfo.title}" by ${itemInfo.creator} (${itemInfo.year}).
You adopt the exact tone, style, vocabulary, attitude, and atmosphere of this specific work.

Personality Guidelines:
${itemInfo.soulProfile}

Overall Vibe / Tone: ${itemInfo.vibes ? itemInfo.vibes.join(", ") : "engaging, authentic"}

CRITICAL INSTRUCTIONS:
1. Speak naturally and in character as the universe, narrator, or embodiment of this work.
2. ABSOLUTELY DO NOT use pseudo-spiritual, mystical, telepathic, or "soul consciousness" jargon. Do not talk about "spiritual planes", "psychic connections", "metaphysical realms", or "souls". Speak normally and directly as the work itself.
3. If this work is funny or witty (e.g. 'The Hitchhiker's Guide to the Galaxy'), be funny and witty. If it is gritty action or sci-fi (e.g. 'The Matrix', 'Blade Runner'), speak with that sleek, grounded sci-fi tone. If it is classic literature, speak with that period's style.
4. Talk naturally about characters, plot, worldbuilding, and themes in your universe.
5. Do NOT sound like an AI assistant. Never say "As an AI..." or "I can assist you with...".
6. Keep your responses engaging, clear, and concise (100 to 200 words).`;

    const response = await callGeminiWithRetry({
      model: "gemini-3.5-flash",
      contents: geminiContents,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.85,
      }
    });

    res.json({ reply: response.text });
  } catch (error: any) {
    return handleServerError(res, error, "Failed to generate response.");
  }
});

// Endpoint: eBook Generator based on a user topic
app.post("/api/generate-ebook", async (req, res) => {
  try {
    const { topic, style } = req.body;
    if (!topic) {
      return res.status(400).json({ error: "Topic is required" });
    }

    if (!apiKey) {
      return res.status(500).json({ error: "GEMINI_API_KEY environment variable is missing." });
    }

    const styleStr = style || "mysterious and poetic";

    const prompt = `Write a beautiful, compact micro-eBook about: "${topic}".
The style should be "${styleStr}".
Provide a creative, artistic title, an elegant introduction, 3 distinct chapters with dense, fascinating paragraphs, and a satisfying epilogue.`;

    const response = await callGeminiWithRetry({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: `You are an elite, award-winning author and creative educator. 
Your goal is to write a highly informative, deeply engaging, and beautifully stylized micro-eBook based on the user's topic and requested style.
Do not write placeholders. Write complete, elegant paragraphs for the introduction, 3 full chapters, and the epilogue.
Keep the language evocative and polished.`,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: "A highly creative, artistic title for the eBook." },
            author: { type: Type.STRING, description: "An elegant author pen-name or 'The Spirit of the Library'." },
            introduction: { type: Type.STRING, description: "A rich introductory prologue setting the mood and introducing the core ideas." },
            chapters: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING, description: "The title of the chapter." },
                  content: { type: Type.STRING, description: "A detailed, complete reading content for this chapter (minimum 2 detailed, interesting paragraphs)." }
                },
                required: ["title", "content"]
              },
              description: "Exactly 3 structured chapters that deeply explore the topic."
            },
            epilogue: { type: Type.STRING, description: "A concluding epilogue reflecting on the knowledge shared." }
          },
          required: ["title", "author", "introduction", "chapters", "epilogue"]
        }
      }
    });

    const data = JSON.parse(response.text || "{}");
    res.json(data);
  } catch (error: any) {
    return handleServerError(res, error, "Failed to generate eBook.");
  }
});

// Endpoint: Interactive branching story step (Choose-Your-Own-Adventure)
app.post("/api/story/step", async (req, res) => {
  try {
    const { storyTitle, setting, history, currentChoice } = req.body;
    if (!storyTitle || !setting) {
      return res.status(400).json({ error: "Story Title and Setting are required." });
    }

    if (!apiKey) {
      return res.status(500).json({ error: "GEMINI_API_KEY environment variable is missing." });
    }

    // Build the history prompt
    let historyPrompt = `Story Setting: ${setting}\nTitle: ${storyTitle}\n\n`;
    if (history && history.length > 0) {
      historyPrompt += "Journey so far:\n";
      history.forEach((h: any, idx: number) => {
        historyPrompt += `Scene ${idx + 1}:\n${h.sceneText}\nChoice Made: "${h.choiceSelected}"\n\n`;
      });
    }

    if (currentChoice) {
      historyPrompt += `Protagonist just chose to: "${currentChoice}".\nGenerate the next scene and 3 new options.`;
    } else {
      historyPrompt += "This is the very beginning of the story. Generate the initial opening scene and 3 starting options.";
    }

    const response = await callGeminiWithRetry({
      model: "gemini-3.5-flash",
      contents: historyPrompt,
      config: {
        systemInstruction: `You are an expert game master and writer for Choose-Your-Own-Adventure interactive branching stories.
Your job is to generate highly immersive, beautifully written scenes (2-3 paragraphs) that respond directly to the protagonist's chosen action.
Ensure the story has high stakes, exciting developments, and deep thematic richness.

Each step, you must return:
1. 'sceneText': The narration of the current event (2-3 complete, rich paragraphs).
2. 'choices': An array of exactly 3 distinct, interesting actions the user can choose next. (If the story has reached its ultimate, beautifully written conclusion, you can return an empty array, and set status to 'ended').
3. 'status': Set to 'playing' or 'ended'.
4. 'moodTheme': A keyword indicating the current color/vibe landscape of the story. Must be one of:
   - 'deep-space' (cosmic, cold starfields)
   - 'amber-glow' (ancient scrolls, warm tavern, soft torches)
   - 'crimson-shadow' (vampiric suspense, warning sirens, passion)
   - 'emerald-decay' (overgrown ruins, poisonous forests, alchemy)
   - 'neon-rain' (cyberpunk alleys, digital rain, blue/pink contrast)
   - 'slate-mist' (stormy seas, gothic castles, fog-covered moors)

Keep choices proactive and morally grey or intellectually challenging!`,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            sceneText: { type: Type.STRING, description: "The narrative of the current scene." },
            choices: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Exactly 3 distinct choices of actions for the protagonist. Leave empty if status is ended."
            },
            status: { type: Type.STRING, description: "Must be 'playing' or 'ended'." },
            moodTheme: { type: Type.STRING, description: "The mood keyword: 'deep-space' | 'amber-glow' | 'crimson-shadow' | 'emerald-decay' | 'neon-rain' | 'slate-mist'." }
          },
          required: ["sceneText", "choices", "status", "moodTheme"]
        }
      }
    });

    const data = JSON.parse(response.text || "{}");
    res.json(data);
  } catch (error: any) {
    return handleServerError(res, error, "Failed to generate story step.");
  }
});

// Configure Vite and static assets
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
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[SoulReader Server] running on http://localhost:${PORT}`);
  });
}

startServer();
