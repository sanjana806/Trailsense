import { GoogleGenAI } from "@google/genai";
import {
  TRAILSENSE_SYSTEM_PROMPT,
  TRAILSENSE_RESPONSE_SCHEMA,
  WORKFLOW_ROUTER_SCHEMA,
  DEMO_PRESETS,
} from "./prompts.js";

export const ALLOWED_MODELS = [
  "gemini-3.8-flash",
  "gemma-4-31b-it",
  "gemma-4-26b-a4b-it",
  "gemini-3.5-flash-lite",
];

export function isValidApiKey(key) {
  if (!key || typeof key !== "string") return false;
  const trimmed = key.trim();
  if (
    !trimmed ||
    trimmed === "your_api_key_here" ||
    trimmed === "YOUR_API_KEY" ||
    trimmed.length < 15
  ) {
    return false;
  }
  return true;
}

function extractInteractionText(interaction) {
  if (interaction?.output_text) {
    return interaction.output_text;
  }
  if (Array.isArray(interaction?.steps)) {
    for (let i = interaction.steps.length - 1; i >= 0; i--) {
      const step = interaction.steps[i];
      if (step?.type === "model_output" && Array.isArray(step.content)) {
        const textPart = step.content.find((c) => c.type === "text" && c.text);
        if (textPart) return textPart.text;
      }
    }
  }
  throw new Error("No text output returned from Gemini Interactions API.");
}

/**
 * Local fallback field analyzer when no live GEMINI_API_KEY is supplied yet,
 * so the user can test every workflow, custom image upload, and field note locally out-of-the-box.
 */
function buildLocalFieldSimulation({ workflow, model, fieldNotes }) {
  const notesLower = (fieldNotes || "").toLowerCase();
  let presetKey = "alpine-scree";

  if (workflow === "flora_fauna") {
    if (notesLower.includes("oak") || notesLower.includes("rash") || notesLower.includes("leaf")) {
      presetKey = "poison-oak";
    } else if (notesLower.includes("flower") || notesLower.includes("white") || notesLower.includes("safe")) {
      presetKey = "trillium-ovatum";
    } else {
      presetKey = "amanita-muscaria";
    }
  } else {
    if (notesLower.includes("river") || notesLower.includes("water") || notesLower.includes("ford") || notesLower.includes("log")) {
      presetKey = "river-crossing";
    } else {
      presetKey = "alpine-scree";
    }
  }

  const basePreset = JSON.parse(JSON.stringify(DEMO_PRESETS[presetKey]));
  if (fieldNotes?.trim()) {
    basePreset.summary_tagline += ` (Tailored for Hiker Field Notes: "${fieldNotes.trim()}")`;
  }

  return {
    ...basePreset,
    _meta: {
      interaction_id: `local_sim_${Date.now()}`,
      model: `${model} (Local Field Kit Simulation — Add real GEMINI_API_KEY for live vision)`,
      router: {
        router_model: "gemini-3.5-flash-lite (local router)",
        detected_workflow: basePreset.workflow,
        routing_reason: `Routed to ${basePreset.workflow} workflow.`,
        latency_ms: 85,
      },
      total_latency_ms: 260,
    },
  };
}

/**
 * Analyzes an outdoor image using the Gemini Interactions API (`client.interactions.create`).
 */
export async function analyzeFieldImage({
  apiKey,
  imageBase64,
  mimeType = "image/jpeg",
  workflow = "auto",
  model = "gemini-3.8-flash",
  useFlashLiteRouter = true,
  fieldNotes = "",
  systemPrompt = TRAILSENSE_SYSTEM_PROMPT,
}) {
  const selectedModel = ALLOWED_MODELS.includes(model)
    ? model
    : "gemini-3.8-flash";

  const candidateKey = isValidApiKey(apiKey)
    ? apiKey.trim()
    : isValidApiKey(process.env.GEMINI_API_KEY)
      ? process.env.GEMINI_API_KEY.trim()
      : null;

  // If no valid Gemini API key is configured yet, return a rich local simulation instead of failing
  if (!candidateKey) {
    return buildLocalFieldSimulation({
      workflow: workflow === "auto" ? "trail_terrain" : workflow,
      model: selectedModel,
      fieldNotes,
    });
  }

  const client = new GoogleGenAI({ apiKey: candidateKey });
  const startTime = Date.now();

  let targetWorkflow = workflow;
  let routerMetadata = null;

  // Stage 1: Optional fast pre-flight modality routing via gemini-3.5-flash-lite
  if (targetWorkflow === "auto" && useFlashLiteRouter) {
    const routerStart = Date.now();
    try {
      const routerInteraction = await client.interactions.create({
        model: "gemini-3.5-flash-lite",
        input: [
          {
            type: "image",
            mime_type: mimeType,
            data: imageBase64,
          },
          {
            type: "text",
            text: "Classify whether this outdoor field photo belongs to Workflow 1 ('trail_terrain': landscape, trail path, mountain, river crossing, trailhead sign) or Workflow 2 ('flora_fauna': plant, mushroom/fungus, insect, reptile, bird, or animal).",
          },
        ],
        response_format: [
          {
            type: "text",
            mime_type: "application/json",
            schema: WORKFLOW_ROUTER_SCHEMA,
          },
        ],
      });

      const routerJson = JSON.parse(extractInteractionText(routerInteraction));
      if (
        routerJson.detected_workflow === "trail_terrain" ||
        routerJson.detected_workflow === "flora_fauna"
      ) {
        targetWorkflow = routerJson.detected_workflow;
        routerMetadata = {
          router_model: "gemini-3.5-flash-lite",
          detected_workflow: routerJson.detected_workflow,
          routing_reason: routerJson.routing_reason,
          latency_ms: Date.now() - routerStart,
        };
      }
    } catch (routerErr) {
      routerMetadata = {
        router_model: "gemini-3.5-flash-lite",
        fallback: true,
        note: routerErr.message,
      };
    }
  }

  const workflowDirective =
    targetWorkflow === "trail_terrain"
      ? "Execute WORKFLOW 1: TRAIL & TERRAIN PRE-FLIGHT CHECK. Populate `trail_assessment` completely and generate a detailed `markdown_report`."
      : targetWorkflow === "flora_fauna"
        ? "Execute WORKFLOW 2: FLORA & FAUNA IDENTIFICATION & SAFETY. Populate `organism_assessment` completely and generate a detailed `markdown_report` including the strict non-ingestion disclaimer."
        : "Automatically determine whether this image is a Trail/Landscape (Workflow 1 -> populate `trail_assessment`) or a Flora/Fauna/Organism specimen (Workflow 2 -> populate `organism_assessment`), and generate the corresponding structured assessment and `markdown_report`.";

  const notesDirective = fieldNotes?.trim()
    ? `\n\nHiker's Field Notes / Context: "${fieldNotes.trim()}"`
    : "";

  const interaction = await client.interactions.create({
    model: selectedModel,
    system_instruction: systemPrompt || TRAILSENSE_SYSTEM_PROMPT,
    input: [
      {
        type: "image",
        mime_type: mimeType,
        data: imageBase64,
      },
      {
        type: "text",
        text: `${workflowDirective}${notesDirective}`,
      },
    ],
    response_format: [
      {
        type: "text",
        mime_type: "application/json",
        schema: TRAILSENSE_RESPONSE_SCHEMA,
      },
    ],
  });

  const rawText = extractInteractionText(interaction);
  const parsedResult = JSON.parse(rawText);

  return {
    ...parsedResult,
    _meta: {
      interaction_id: interaction.id || null,
      model: selectedModel,
      router: routerMetadata,
      total_latency_ms: Date.now() - startTime,
      usage: interaction.usage || null,
    },
  };
}
