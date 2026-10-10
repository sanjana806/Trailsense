import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI } from "@google/genai";
import {
  TRAILSENSE_SYSTEM_PROMPT,
  TRAILSENSE_RESPONSE_SCHEMA,
  DEMO_PRESETS,
} from "./src/prompts.js";
import {
  analyzeFieldImage,
  ALLOWED_MODELS,
  isValidApiKey,
} from "./src/analyzer.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3456;

app.use(express.json({ limit: "25mb" }));

// Disable caching so browser always gets latest UI
app.use((_req, res, next) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  next();
});

app.use(express.static(path.join(__dirname, "public")));

app.get("/api/config", (_req, res) => {
  res.json({
    hasServerApiKey: isValidApiKey(process.env.GEMINI_API_KEY),
    defaultModel: "gemini-3.8-flash",
    allowedModels: ALLOWED_MODELS,
    systemPrompt: TRAILSENSE_SYSTEM_PROMPT,
    responseSchema: TRAILSENSE_RESPONSE_SCHEMA,
    presets: Object.values(DEMO_PRESETS).map((p) => ({
      id: p.id,
      label: p.label,
      subtitle: p.subtitle,
      workflow: p.workflow,
      risk_badge: p.risk_badge,
    })),
  });
});

app.get("/api/presets/:id", (req, res) => {
  const preset = DEMO_PRESETS[req.params.id];
  if (!preset) {
    return res.status(404).json({ error: "Preset not found" });
  }
  return res.json({
    ...preset,
    _meta: {
      interaction_id: `preset_${preset.id}_${Date.now()}`,
      model: "preset-simulation (gemini-3.8-flash schema)",
      router: {
        router_model: "gemini-3.5-flash-lite (simulated)",
        detected_workflow: preset.workflow,
        routing_reason:
          preset.workflow === "trail_terrain"
            ? "Detected high-altitude trail landscape and rock terrain."
            : "Detected close-up biological specimen in natural habitat.",
        latency_ms: 140,
      },
      total_latency_ms: 420,
    },
  });
});

app.post("/api/analyze", async (req, res) => {
  try {
    const {
      imageBase64,
      mimeType,
      workflow,
      model,
      useFlashLiteRouter,
      fieldNotes,
      apiKey,
      systemPrompt,
    } = req.body || {};

    if (!imageBase64) {
      return res.status(400).json({
        error: "Please upload or capture an image before running a field scan.",
      });
    }

    const cleanBase64 = imageBase64.replace(/^data:[^;]+;base64,/, "");

    const result = await analyzeFieldImage({
      apiKey,
      imageBase64: cleanBase64,
      mimeType: mimeType || "image/jpeg",
      workflow: workflow || "auto",
      model: model || "gemini-3.8-flash",
      useFlashLiteRouter: useFlashLiteRouter !== false,
      fieldNotes: fieldNotes || "",
      systemPrompt: systemPrompt || TRAILSENSE_SYSTEM_PROMPT,
    });

    return res.json(result);
  } catch (err) {
    console.error("[TrailSense Analyze Error]:", err);
    return res.status(500).json({
      error: err.message || "Failed to analyze field image with Gemini API.",
    });
  }
});

app.post("/api/followup", async (req, res) => {
  try {
    const {
      question,
      previousInteractionId,
      contextSummary,
      model = "gemini-3.8-flash",
      apiKey,
    } = req.body || {};

    if (!question?.trim()) {
      return res.status(400).json({ error: "Please enter a follow-up question." });
    }

    const resolvedApiKey = isValidApiKey(apiKey)
      ? apiKey.trim()
      : isValidApiKey(process.env.GEMINI_API_KEY)
        ? process.env.GEMINI_API_KEY.trim()
        : null;

    const selectedModel = ALLOWED_MODELS.includes(model)
      ? model
      : "gemini-3.8-flash";

    if (!resolvedApiKey) {
      return res.json({
        answer: `[Offline Field Kit Response • ${selectedModel}]: Based on your current field card, prioritize 3-point traction, keep pets leashed and away from unidentified specimens, and never ingest wild flora or fungi. (Paste a live GEMINI_API_KEY in the top bar for live multi-turn Gemini Interactions API responses.)`,
        interactionId: previousInteractionId || `offline_radio_${Date.now()}`,
        model: `${selectedModel} (Offline Field Kit)`,
      });
    }

    const client = new GoogleGenAI({ apiKey: resolvedApiKey });

    const canUsePreviousId =
      previousInteractionId &&
      !previousInteractionId.startsWith("preset_") &&
      !previousInteractionId.startsWith("local_sim_") &&
      !previousInteractionId.startsWith("offline_");

    const interactionParams = {
      model: selectedModel,
      system_instruction: TRAILSENSE_SYSTEM_PROMPT,
      input: canUsePreviousId
        ? question.trim()
        : `Context from current field assessment:\n${contextSummary || ""}\n\nHiker's follow-up question: ${question.trim()}`,
    };

    if (canUsePreviousId) {
      interactionParams.previous_interaction_id = previousInteractionId;
    }

    const interaction = await client.interactions.create(interactionParams);

    return res.json({
      answer: interaction.output_text || "No response received.",
      interactionId: interaction.id || null,
      model: selectedModel,
    });
  } catch (err) {
    console.error("[TrailSense Follow-up Error]:", err);
    return res.status(500).json({
      error: err.message || "Failed to run follow-up interaction.",
    });
  }
});

const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`\n🌲 TrailSense AI Field Guide running at:`);
  console.log(`   ➜ Local:   http://localhost:${PORT}`);
  console.log(`   ➜ Network: http://127.0.0.1:${PORT}\n`);
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.log(
      `\n🌲 TrailSense AI is already running on http://localhost:${PORT} — open it in your browser!`
    );
    process.exit(0);
  } else {
    console.error("Server error:", err);
    process.exit(1);
  }
});
