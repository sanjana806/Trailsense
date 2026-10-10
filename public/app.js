// TrailSense: Touch Grass Safely — "Moss & Granite" Interactive Field Guide UI

const WEATHER_STATIONS = [
  {
    id: "cascade-pass",
    name: "Cascade Pass • 6,200 ft",
    wind: "14 mph WNW",
    uv: "UV 6 (High)",
    sunsetOffsetSec: 6435,
  },
  {
    id: "redwood-ravine",
    name: "Redwood Understory • 840 ft",
    wind: "4 mph SW",
    uv: "UV 2 (Low)",
    sunsetOffsetSec: 8120,
  },
  {
    id: "sierra-granite",
    name: "Sierra High Route • 10,900 ft",
    wind: "24 mph NW",
    uv: "UV 9 (Very High)",
    sunsetOffsetSec: 4980,
  },
];

const state = {
  apiKey: sessionStorage.getItem("trailsense_api_key") || "",
  hasServerKey: false,
  selectedModel: "gemini-3.8-flash",
  useFlashLiteRouter: true,
  systemPrompt: "",
  defaultPrompt: "",
  fieldNotes: "",
  activeWorkflow: "trail_terrain",
  activePresetId: "alpine-scree",
  imageDataUrl: "",
  imageMimeType: "image/png",
  imageSourceLabel: "Alpine Scree Couloir • Optical Feed",
  assessment: null,
  loading: false,
  errorMsg: "",
  checkedGear: JSON.parse(localStorage.getItem("trailsense_checked_gear") || "{}"),
  stationIndex: 0,
  sunsetRemaining: WEATHER_STATIONS[0].sunsetOffsetSec,
  offlineMode: false,
  savedLogs: JSON.parse(localStorage.getItem("trailsense_field_logs") || "[]"),
  activeTab: "dashboard",
  showPromptModal: false,
  showLogbookModal: false,
  cameraTargetWorkflow: null,
  followupMessages: [],
  followupLoading: false,
  cameraStream: null,
};

function escapeHtml(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatCountdown(totalSec) {
  const s = Math.max(0, totalSec);
  const hrs = String(Math.floor(s / 3600)).padStart(2, "0");
  const mins = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const secs = String(s % 60).padStart(2, "0");
  return `${hrs}h ${mins}m ${secs}s`;
}

function getOrganismFieldChecklist(organismAssessment) {
  if (!organismAssessment) return [];
  const isHazardous = ["DANGEROUS", "TOXIC", "DEADLY", "CAUTION"].includes(
    organismAssessment.status_tag
  );
  return [
    {
      item: isHazardous
        ? "Tecnu / Lipid-cutting decontamination wash & nitrile gloves"
        : "10x Botanist hand lens / macro clip-on lens",
      category: "First Aid & Safety",
      reason: isHazardous
        ? `Critical for decontaminating skin, boots, or trekking poles after ${organismAssessment.common_name} exposure.`
        : `Observe diagnostic structures (${(organismAssessment.identifying_marks || [])[0] || "venation and spore print"}) without picking.`,
      essential: true,
    },
    {
      item: "6-ft non-retractable dog leash & trail watch",
      category: "First Aid & Safety",
      reason:
        "Prevents trail dogs from brushing urushiol oil onto fur or ingesting toxic fruiting bodies.",
      essential: true,
    },
    {
      item: "Long-stride brush gaiters / abrasion-resistant hiking pants",
      category: "Footwear",
      reason:
        "Shields lower legs from trailside contact dermatitis and thorny understory.",
      essential: isHazardous,
    },
    {
      item: "Offline regional field guide + GPS waypoint marker",
      category: "Navigation",
      reason:
        "Log specimen coordinates for iNaturalist / ranger hazard reporting without picking.",
      essential: false,
    },
  ];
}

function renderFieldIllustrationToDataUrl(presetId) {
  const canvas = document.createElement("canvas");
  canvas.width = 900;
  canvas.height = 620;
  const ctx = canvas.getContext("2d");

  if (presetId === "alpine-scree") {
    const grad = ctx.createLinearGradient(0, 0, 0, 620);
    grad.addColorStop(0, "#1C3F2E");
    grad.addColorStop(0.48, "#3B5949");
    grad.addColorStop(1, "#2C3333");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 900, 620);

    ctx.fillStyle = "rgba(227, 179, 65, 0.22)";
    ctx.beginPath();
    ctx.arc(700, 130, 140, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#3E4747";
    ctx.beginPath();
    ctx.moveTo(0, 440);
    ctx.lineTo(210, 140);
    ctx.lineTo(410, 310);
    ctx.lineTo(620, 95);
    ctx.lineTo(810, 270);
    ctx.lineTo(900, 190);
    ctx.lineTo(900, 620);
    ctx.lineTo(0, 620);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#F9F8F3";
    ctx.beginPath();
    ctx.moveTo(620, 102);
    ctx.lineTo(545, 395);
    ctx.lineTo(645, 420);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = "#E3B341";
    ctx.lineWidth = 5;
    ctx.setLineDash([12, 8]);
    ctx.beginPath();
    ctx.moveTo(220, 600);
    ctx.quadraticCurveTo(470, 500, 410, 415);
    ctx.quadraticCurveTo(360, 340, 580, 250);
    ctx.stroke();
    ctx.setLineDash([]);

    for (let i = 0; i < 42; i++) {
      ctx.fillStyle = i % 3 === 0 ? "#525B5B" : i % 2 === 0 ? "#2C3333" : "#687373";
      const x = (i * 83) % 860;
      const y = 400 + ((i * 47) % 190);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 34, y - 16);
      ctx.lineTo(x + 54, y + 18);
      ctx.closePath();
      ctx.fill();
    }
  } else if (presetId === "river-crossing") {
    const grad = ctx.createLinearGradient(0, 0, 0, 620);
    grad.addColorStop(0, "#1C3F2E");
    grad.addColorStop(0.5, "#2D5A43");
    grad.addColorStop(1, "#1e2d26");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 900, 620);

    ctx.fillStyle = "#5B8A85";
    ctx.beginPath();
    ctx.moveTo(390, 160);
    ctx.bezierCurveTo(210, 310, 650, 420, 180, 620);
    ctx.lineTo(690, 620);
    ctx.bezierCurveTo(820, 410, 430, 290, 520, 160);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = "#F9F8F3";
    ctx.lineWidth = 3;
    for (let i = 0; i < 8; i++) {
      ctx.beginPath();
      ctx.moveTo(320 + i * 22, 340 + i * 28);
      ctx.lineTo(440 + i * 18, 350 + i * 28);
      ctx.stroke();
    }

    ctx.fillStyle = "#8C583A";
    ctx.save();
    ctx.translate(450, 410);
    ctx.rotate(-0.18);
    ctx.fillRect(-320, -18, 640, 36);
    ctx.restore();
  } else if (presetId === "amanita-muscaria") {
    const grad = ctx.createRadialGradient(450, 300, 60, 450, 310, 480);
    grad.addColorStop(0, "#2D5A43");
    grad.addColorStop(1, "#1C3F2E");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 900, 620);

    ctx.fillStyle = "#163325";
    ctx.fillRect(0, 460, 900, 160);

    ctx.fillStyle = "#F9F8F3";
    ctx.fillRect(412, 260, 76, 225);
    ctx.beginPath();
    ctx.arc(450, 480, 62, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#E2DFD2";
    ctx.beginPath();
    ctx.moveTo(395, 315);
    ctx.lineTo(505, 315);
    ctx.lineTo(525, 355);
    ctx.lineTo(375, 355);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#C86D51";
    ctx.beginPath();
    ctx.ellipse(450, 255, 210, 110, 0, Math.PI, 0, false);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#F9F8F3";
    const warts = [
      [325, 215], [380, 180], [450, 170], [520, 182], [575, 218],
      [360, 232], [435, 212], [505, 228], [295, 240], [605, 238],
    ];
    warts.forEach(([wx, wy]) => {
      ctx.beginPath();
      ctx.arc(wx, wy, 11, 0, Math.PI * 2);
      ctx.fill();
    });
  } else if (presetId === "poison-oak") {
    ctx.fillStyle = "#1C3F2E";
    ctx.fillRect(0, 0, 900, 620);

    ctx.strokeStyle = "#7C4D34";
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.moveTo(450, 580);
    ctx.lineTo(450, 290);
    ctx.stroke();

    const drawOakLeaflet = (cx, cy, angle, fill) => {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(angle);
      ctx.fillStyle = fill;
      ctx.beginPath();
      ctx.ellipse(0, -95, 68, 112, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#E3B341";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -185);
      ctx.stroke();
      ctx.restore();
    };
    drawOakLeaflet(450, 310, -0.88, "#C86D51");
    drawOakLeaflet(450, 310, 0.88, "#E3B341");
    drawOakLeaflet(450, 290, 0, "#2D5A43");
  } else {
    ctx.fillStyle = "#1C3F2E";
    ctx.fillRect(0, 0, 900, 620);

    for (let i = 0; i < 3; i++) {
      ctx.save();
      ctx.translate(450, 310);
      ctx.rotate((i * Math.PI * 2) / 3 + Math.PI / 6);
      ctx.fillStyle = "#2D5A43";
      ctx.beginPath();
      ctx.ellipse(0, -120, 74, 125, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    for (let i = 0; i < 3; i++) {
      ctx.save();
      ctx.translate(450, 310);
      ctx.rotate((i * Math.PI * 2) / 3);
      ctx.fillStyle = "#F9F8F3";
      ctx.beginPath();
      ctx.ellipse(0, -95, 46, 98, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.fillStyle = "#E3B341";
    ctx.beginPath();
    ctx.arc(450, 310, 22, 0, Math.PI * 2);
    ctx.fill();
  }

  return canvas.toDataURL("image/png");
}

function getActiveGearList() {
  const a = state.assessment;
  if (!a) return [];
  if (a.workflow === "trail_terrain" && a.trail_assessment?.gear_checklist) {
    return a.trail_assessment.gear_checklist;
  }
  return getOrganismFieldChecklist(a.organism_assessment);
}

function computeSafetyMeter() {
  const a = state.assessment;
  const gearList = getActiveGearList();
  const checkedCount = gearList.filter((g) => state.checkedGear[g.item]).length;
  const gearPct = gearList.length
    ? Math.round((checkedCount / gearList.length) * 100)
    : 0;

  if (!a) {
    return {
      mode: "TRAIL READINESS SCORE",
      score: 85,
      label: "STANDING BY",
      sublabel: "Upload a route or organism photo",
      color: "#2D5A43",
      badgeTone: "safe",
      checkedCount,
      totalGear: gearList.length,
      gearPct,
    };
  }

  const badge = a.risk_badge || "[🟢 SAFE]";
  const isDanger = badge.includes("DANGER") || badge.includes("🔴");
  const isCaution = badge.includes("CAUTION") || badge.includes("🟡");

  if (a.workflow === "trail_terrain") {
    const baseTerrainScore = isDanger ? 28 : isCaution ? 52 : 76;
    const gearBoost = Math.round((gearPct / 100) * (isDanger ? 52 : 44));
    const totalReadiness = Math.min(99, baseTerrainScore + gearBoost);

    let color = "#2D5A43";
    let statusText = "TRAIL READY • CLEAR TO PROCEED";
    if (totalReadiness < 55) {
      color = "#C86D51";
      statusText = "HIGH HAZARD • PACK ESSENTIAL GEAR";
    } else if (totalReadiness < 80) {
      color = "#E3B341";
      statusText = "MODERATE CAUTION • VERIFY CHECKLIST";
    }

    return {
      mode: "TRAIL READINESS SCORE",
      score: totalReadiness,
      label: statusText,
      sublabel: `Base Terrain + ${checkedCount}/${gearList.length} Essential Gear Checked`,
      color,
      badgeTone: isDanger ? "danger" : isCaution ? "caution" : "safe",
      checkedCount,
      totalGear: gearList.length,
      gearPct,
    };
  } else {
    const org = a.organism_assessment || {};
    const statusTag = org.status_tag || "CAUTION";
    let safetyScore = 92;
    let color = "#2D5A43";

    if (["DEADLY", "TOXIC"].includes(statusTag)) {
      safetyScore = 14;
      color = "#C86D51";
    } else if (statusTag === "DANGEROUS") {
      safetyScore = 24;
      color = "#C86D51";
    } else if (statusTag === "CAUTION") {
      safetyScore = 58;
      color = "#E3B341";
    }

    return {
      mode: "ORGANISM SAFETY INDEX",
      score: safetyScore,
      label: `VERDICT: ${statusTag}`,
      sublabel: `Confidence: ${org.confidence_level || "High"} • ${
        org.organism_group || "Specimen"
      }`,
      color,
      badgeTone: isDanger ? "danger" : isCaution ? "caution" : "safe",
      checkedCount,
      totalGear: gearList.length,
      gearPct,
    };
  }
}

async function loadPreset(presetId) {
  state.errorMsg = "";
  state.activePresetId = presetId;
  state.imageDataUrl = renderFieldIllustrationToDataUrl(presetId);
  state.imageMimeType = "image/png";

  try {
    const res = await fetch(`/api/presets/${presetId}`);
    const data = await res.json();
    state.activeWorkflow = data.workflow;
    state.imageSourceLabel = `${data.label || presetId} • Field Specimen`;
    state.assessment = data;
    state.followupMessages = [];
  } catch (err) {
    state.errorMsg = "Could not load preset data.";
  }
  renderApp();
}

async function triggerGeminiScan(
  overrideDataUrl = state.imageDataUrl,
  overrideMime = state.imageMimeType,
  overrideWorkflow = state.activeWorkflow
) {
  if (!overrideDataUrl) {
    state.errorMsg = "Upload or capture a photo in one of the dropzones first.";
    renderApp();
    return;
  }

  if (state.offlineMode) {
    state.errorMsg =
      "Offline Field Kit Mode is active. Click the 'Offline Field Kit Active' pill in the header to re-enable live API scans.";
    renderApp();
    return;
  }

  state.loading = true;
  state.errorMsg = "";
  renderApp();

  try {
    const base64Clean = overrideDataUrl.replace(/^data:[^;]+;base64,/, "");
    const res = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        imageBase64: base64Clean,
        mimeType: overrideMime,
        workflow: overrideWorkflow,
        model: state.selectedModel,
        useFlashLiteRouter: state.useFlashLiteRouter,
        fieldNotes: state.fieldNotes,
        apiKey: state.apiKey.trim(),
        systemPrompt: state.systemPrompt,
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Gemini API request failed.");

    state.assessment = data;
    state.activeWorkflow = data.workflow || overrideWorkflow;
    state.followupMessages = [];
  } catch (err) {
    state.errorMsg = err.message;
  } finally {
    state.loading = false;
    renderApp();
  }
}

function handleImageFile(file, workflowType) {
  if (!file || !file.type.startsWith("image/")) {
    state.errorMsg = "Please select a valid image file (JPG, PNG, WEBP, HEIC).";
    renderApp();
    return;
  }

  state.errorMsg = "";
  state.activeWorkflow = workflowType;
  state.activePresetId = null;

  const reader = new FileReader();
  reader.onload = async (e) => {
    const dataUrl = e.target.result;
    state.imageDataUrl = dataUrl;
    state.imageMimeType = file.type || "image/jpeg";
    state.imageSourceLabel = `${file.name} • ${
      workflowType === "trail_terrain" ? "Route / Trail Scan" : "Organism Macro"
    }`;
    await triggerGeminiScan(dataUrl, state.imageMimeType, workflowType);
  };
  reader.readAsDataURL(file);
}

async function startCamera(workflowType) {
  state.errorMsg = "";
  state.cameraTargetWorkflow = workflowType;
  renderApp();

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" },
      audio: false,
    });
    state.cameraStream = stream;
    const videoEl = document.getElementById("liveCameraVideo");
    if (videoEl) {
      videoEl.srcObject = stream;
    }
  } catch (err) {
    state.cameraTargetWorkflow = null;
    state.errorMsg = `Camera access unavailable (${err.message}). Upload a photo or select a field preset instead.`;
    renderApp();
  }
}

function stopCamera() {
  if (state.cameraStream) {
    state.cameraStream.getTracks().forEach((t) => t.stop());
    state.cameraStream = null;
  }
  state.cameraTargetWorkflow = null;
  renderApp();
}

async function captureCameraFrame() {
  const videoEl = document.getElementById("liveCameraVideo");
  if (!videoEl) return;
  const canvas = document.createElement("canvas");
  canvas.width = videoEl.videoWidth || 800;
  canvas.height = videoEl.videoHeight || 600;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
  const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
  const targetWf = state.cameraTargetWorkflow || "trail_terrain";
  stopCamera();

  state.activeWorkflow = targetWf;
  state.imageDataUrl = dataUrl;
  state.imageMimeType = "image/jpeg";
  state.imageSourceLabel = `Live Field Camera • ${
    targetWf === "trail_terrain" ? "Route Ahead" : "Specimen Macro"
  }`;
  await triggerGeminiScan(dataUrl, "image/jpeg", targetWf);
}

function renderApp() {
  const root = document.getElementById("root");
  if (!root) return;

  const currentStation = WEATHER_STATIONS[state.stationIndex];
  const a = state.assessment;
  const gearList = getActiveGearList();
  const meter = computeSafetyMeter();

  const radius = 58;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset =
    circumference - (meter.score / 100) * circumference;

  root.innerHTML = `
    <div class="min-h-screen flex flex-col pb-16">
      <!-- FLOATING QUICK-TOGGLES & HEADER BAR -->
      <header class="sticky top-0 z-40 glass-parchment border-b border-sandline shadow-sm">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
          <div class="flex items-center gap-3.5">
            <div class="w-11 h-11 rounded-2xl bg-topo-forest text-parchment flex items-center justify-center shadow-md border border-hunter">
              <span class="text-xl" aria-hidden="true">🧭</span>
            </div>
            <div>
              <div class="flex items-center gap-2 flex-wrap">
                <h1 class="font-serif-organic text-xl sm:text-2xl font-bold text-forest tracking-tight">
                  TrailSense
                </h1>
                <span class="rounded-full bg-forest text-parchment px-2.5 py-0.5 text-[11px] font-semibold tracking-wide uppercase">
                  Touch Grass Safely
                </span>
                <span class="hidden sm:inline-block rounded-full bg-lichen/25 text-forest border border-lichen/60 px-2.5 py-0.5 text-[11px] font-mono-field font-semibold">
                  Moss &amp; Granite Field Kit
                </span>
              </div>
              <p class="text-xs text-granite/75">
                AI Botanist, Zoologist &amp; Trail Pre-Flight Safety Specialist
              </p>
            </div>
          </div>

          <!-- Floating Quick-Toggles -->
          <div class="flex items-center gap-2.5 flex-wrap">
            <!-- Weather Sync Snippet -->
            <button
              type="button"
              id="weatherSyncBtn"
              title="Click to cycle backcountry weather stations"
              class="flex items-center gap-2.5 rounded-full bg-white/90 hover:bg-white border border-sandline px-3.5 py-1.5 text-xs shadow-sm transition-all"
            >
              <span class="font-semibold text-forest">🌤️ ${escapeHtml(currentStation.name)}</span>
              <span class="text-granite/85 font-medium">💨 ${escapeHtml(currentStation.wind)}</span>
              <span class="rounded-full bg-lichen/30 text-granite font-semibold px-2 py-0.5 text-[11px]">
                ☀️ ${escapeHtml(currentStation.uv)}
              </span>
              <span id="sunsetTimerText" class="font-mono-field text-[11px] font-semibold text-terracotta">
                🌅 ${formatCountdown(state.sunsetRemaining)}
              </span>
            </button>

            <!-- Offline Mode Indicator Badge -->
            <button
              type="button"
              id="offlineToggleBtn"
              class="flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold border transition-all shadow-sm ${
                state.offlineMode
                  ? "bg-lichen text-forest border-forest"
                  : "bg-forest text-parchment border-hunter hover:bg-hunter"
              }"
            >
              <span class="w-2 h-2 rounded-full ${
                state.offlineMode ? "bg-terracotta" : "bg-lichen"
              }"></span>
              <span>${
                state.offlineMode
                  ? "Offline Field Kit Active"
                  : "Offline-ready field kit"
              }</span>
            </button>

            <button
              type="button"
              id="openLogbookBtn"
              class="rounded-full bg-white/90 hover:bg-white border border-sandline px-3 py-1.5 text-xs font-semibold text-forest shadow-sm transition"
            >
              📓 Field Kit (${state.savedLogs.length})
            </button>

            <button
              type="button"
              id="openPromptBtn"
              class="rounded-full bg-white/90 hover:bg-white border border-sandline px-3 py-1.5 text-xs font-semibold text-granite shadow-sm transition"
            >
              📜 Prompt
            </button>
          </div>
        </div>
      </header>

      <!-- MAIN WORKSPACE -->
      <main class="max-w-7xl w-full mx-auto px-4 sm:px-6 pt-6 space-y-6">
        <!-- Top Control Strip -->
        <section class="glass-parchment rounded-2xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
          <div class="flex items-center gap-2.5 flex-wrap flex-1 min-w-[260px]">
            <div class="flex items-center gap-2 bg-white rounded-xl border border-sandline px-3 py-1.5 flex-1 max-w-xs">
              <span class="w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                state.apiKey.trim() || state.hasServerKey ? "bg-hunter" : "bg-lichen"
              }"></span>
              <input
                id="apiKeyInput"
                type="password"
                value="${escapeHtml(state.apiKey)}"
                placeholder="GEMINI_API_KEY (optional for presets)"
                class="text-xs font-mono-field bg-transparent outline-none w-full text-granite"
              />
            </div>

            <div class="flex items-center gap-2 bg-white rounded-xl border border-sandline px-3 py-1.5">
              <label for="modelSelect" class="text-[11px] font-bold uppercase tracking-wider text-hunter">Model:</label>
              <select id="modelSelect" class="text-xs font-semibold bg-transparent text-forest outline-none cursor-pointer">
                <option value="gemini-3.8-flash" ${state.selectedModel === "gemini-3.8-flash" ? "selected" : ""}>gemini-3.8-flash (1M Multimodal)</option>
                <option value="gemma-4-31b-it" ${state.selectedModel === "gemma-4-31b-it" ? "selected" : ""}>gemma-4-31b-it (Open-Weight Gemma 4)</option>
                <option value="gemma-4-26b-a4b-it" ${state.selectedModel === "gemma-4-26b-a4b-it" ? "selected" : ""}>gemma-4-26b-a4b-it (Gemma 4 MoE)</option>
                <option value="gemini-3.5-flash-lite" ${state.selectedModel === "gemini-3.5-flash-lite" ? "selected" : ""}>gemini-3.5-flash-lite (Fast Triage)</option>
              </select>
            </div>

            <input
              id="fieldNotesInput"
              type="text"
              value="${escapeHtml(state.fieldNotes)}"
              placeholder="Optional field notes (e.g., 9,200ft, wet granite, dog on trail)..."
              class="text-xs bg-white rounded-xl border border-sandline px-3 py-2 flex-1 min-w-[200px] outline-none focus:border-hunter"
            />
          </div>

          <button
            type="button"
            id="runScanBtn"
            ${state.loading ? "disabled" : ""}
            class="rounded-xl bg-forest hover:bg-hunter disabled:opacity-50 text-parchment font-semibold text-xs px-4 py-2.5 shadow-sm transition flex items-center gap-2"
          >
            <span>⚡</span>
            <span>${state.loading ? "Scanning..." : "Run Field Scan"}</span>
          </button>
        </section>

        <!-- MODULE 1: DUAL UPLOAD DROPZONES -->
        <section class="grid grid-cols-1 md:grid-cols-2 gap-5">
          <!-- Dropzone 1: Analyze Route / Trail Ahead -->
          <div
            id="dropzoneTrail"
            class="dropzone-card rounded-3xl p-5 border-2 transition-all relative overflow-hidden ${
              state.activeWorkflow === "trail_terrain"
                ? "bg-topo-forest text-parchment border-hunter shadow-lg"
                : "glass-parchment text-granite border-sandline hover:border-hunter"
            }"
          >
            <div class="flex items-start justify-between gap-3 mb-3">
              <div class="flex items-center gap-3">
                <span class="w-11 h-11 rounded-2xl bg-hunter/90 text-parchment flex items-center justify-center text-xl shadow-inner border border-parchment/15">
                  🏔️
                </span>
                <div>
                  <span class="inline-block text-[10px] font-mono-field uppercase tracking-widest px-2.5 py-0.5 rounded-full mb-1 ${
                    state.activeWorkflow === "trail_terrain"
                      ? "bg-lichen text-forest font-bold"
                      : "bg-hunter/15 text-hunter font-semibold"
                  }">
                    Workflow 1 • Pre-Flight Check
                  </span>
                  <h2 class="font-serif-organic text-lg sm:text-xl font-bold leading-snug">
                    Analyze Route / Trail Ahead
                  </h2>
                </div>
              </div>
              <span class="text-xs font-mono-field px-2.5 py-1 rounded-full ${
                state.activeWorkflow === "trail_terrain"
                  ? "bg-parchment/15 text-lichen"
                  : "bg-sandline/60 text-granite/70"
              }">
                Terrain &amp; Hazards
              </span>
            </div>

            <p class="text-xs mb-4 leading-relaxed ${
              state.activeWorkflow === "trail_terrain"
                ? "text-parchment/85"
                : "text-granite/75"
            }">
              Drop a trailhead sign, mountain pass, river crossing, or scramble photo to assess terrain class, visible hazards, and required footwear.
            </p>

            <div class="flex flex-wrap items-center gap-2.5 mb-4">
              <input id="trailFileInput" type="file" accept="image/*" class="hidden" />
              <button
                type="button"
                id="uploadTrailBtn"
                class="rounded-xl px-3.5 py-2 text-xs font-semibold transition flex items-center gap-1.5 shadow-sm ${
                  state.activeWorkflow === "trail_terrain"
                    ? "bg-lichen text-forest hover:bg-lichen/90"
                    : "bg-forest text-parchment hover:bg-hunter"
                }"
              >
                <span>📤</span>
                <span>Upload Trail / Map Photo</span>
              </button>

              <button
                type="button"
                id="cameraTrailBtn"
                class="rounded-xl px-3.5 py-2 text-xs font-semibold border transition flex items-center gap-1.5 ${
                  state.activeWorkflow === "trail_terrain"
                    ? "border-parchment/30 text-parchment hover:bg-parchment/10"
                    : "border-sandline bg-white text-forest hover:border-hunter"
                }"
              >
                <span>📷</span>
                <span>Trail Camera</span>
              </button>
            </div>

            <div class="pt-3 border-t border-current/10 flex items-center justify-between flex-wrap gap-2">
              <span class="text-[11px] font-medium opacity-75">Quick Route Presets:</span>
              <div class="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  data-preset="alpine-scree"
                  class="preset-trigger rounded-full px-3 py-1 text-xs font-semibold transition ${
                    state.activePresetId === "alpine-scree"
                      ? "bg-lichen text-forest shadow-sm"
                      : state.activeWorkflow === "trail_terrain"
                        ? "bg-parchment/15 text-parchment hover:bg-parchment/25"
                        : "bg-white border border-sandline text-granite hover:border-hunter"
                  }"
                >
                  🟡 Alpine Scree Couloir
                </button>
                <button
                  type="button"
                  data-preset="river-crossing"
                  class="preset-trigger rounded-full px-3 py-1 text-xs font-semibold transition ${
                    state.activePresetId === "river-crossing"
                      ? "bg-terracotta text-parchment shadow-sm"
                      : state.activeWorkflow === "trail_terrain"
                        ? "bg-parchment/15 text-parchment hover:bg-parchment/25"
                        : "bg-white border border-sandline text-granite hover:border-hunter"
                  }"
                >
                  🔴 Glacial River Ford
                </button>
              </div>
            </div>
          </div>

          <!-- Dropzone 2: Identify Plant / Critter -->
          <div
            id="dropzoneCritter"
            class="dropzone-card rounded-3xl p-5 border-2 transition-all relative overflow-hidden ${
              state.activeWorkflow === "flora_fauna"
                ? "bg-topo-forest text-parchment border-hunter shadow-lg"
                : "glass-parchment text-granite border-sandline hover:border-hunter"
            }"
          >
            <div class="flex items-start justify-between gap-3 mb-3">
              <div class="flex items-center gap-3">
                <span class="w-11 h-11 rounded-2xl bg-terracotta text-parchment flex items-center justify-center text-xl shadow-inner border border-parchment/15">
                  🍄
                </span>
                <div>
                  <span class="inline-block text-[10px] font-mono-field uppercase tracking-widest px-2.5 py-0.5 rounded-full mb-1 ${
                    state.activeWorkflow === "flora_fauna"
                      ? "bg-lichen text-forest font-bold"
                      : "bg-terracotta/15 text-terracotta font-semibold"
                  }">
                    Workflow 2 • Bio-Safety &amp; Taxonomy
                  </span>
                  <h2 class="font-serif-organic text-lg sm:text-xl font-bold leading-snug">
                    Identify Plant / Critter
                  </h2>
                </div>
              </div>
              <span class="text-xs font-mono-field px-2.5 py-1 rounded-full ${
                state.activeWorkflow === "flora_fauna"
                  ? "bg-parchment/15 text-lichen"
                  : "bg-sandline/60 text-granite/70"
              }">
                Flora, Fungi &amp; Fauna
              </span>
            </div>

            <p class="text-xs mb-4 leading-relaxed ${
              state.activeWorkflow === "flora_fauna"
                ? "text-parchment/85"
                : "text-granite/75"
            }">
              Drop a macro photo of a wild mushroom, berry, trailside shrub, insect, or reptile for binomial ID, toxicity verdict, and Leave No Trace rules.
            </p>

            <div class="flex flex-wrap items-center gap-2.5 mb-4">
              <input id="critterFileInput" type="file" accept="image/*" class="hidden" />
              <button
                type="button"
                id="uploadCritterBtn"
                class="rounded-xl px-3.5 py-2 text-xs font-semibold transition flex items-center gap-1.5 shadow-sm ${
                  state.activeWorkflow === "flora_fauna"
                    ? "bg-lichen text-forest hover:bg-lichen/90"
                    : "bg-terracotta text-parchment hover:bg-terracotta/90"
                }"
              >
                <span>🔍</span>
                <span>Upload Macro Photo</span>
              </button>

              <button
                type="button"
                id="cameraCritterBtn"
                class="rounded-xl px-3.5 py-2 text-xs font-semibold border transition flex items-center gap-1.5 ${
                  state.activeWorkflow === "flora_fauna"
                    ? "border-parchment/30 text-parchment hover:bg-parchment/10"
                    : "border-sandline bg-white text-forest hover:border-hunter"
                }"
              >
                <span>📸</span>
                <span>Macro Camera</span>
              </button>
            </div>

            <div class="pt-3 border-t border-current/10 flex items-center justify-between flex-wrap gap-2">
              <span class="text-[11px] font-medium opacity-75">Quick Specimen Presets:</span>
              <div class="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  data-preset="amanita-muscaria"
                  class="preset-trigger rounded-full px-2.5 py-1 text-xs font-semibold transition ${
                    state.activePresetId === "amanita-muscaria"
                      ? "bg-terracotta text-parchment shadow-sm"
                      : state.activeWorkflow === "flora_fauna"
                        ? "bg-parchment/15 text-parchment hover:bg-parchment/25"
                        : "bg-white border border-sandline text-granite hover:border-hunter"
                  }"
                >
                  🔴 Fly Agaric
                </button>
                <button
                  type="button"
                  data-preset="poison-oak"
                  class="preset-trigger rounded-full px-2.5 py-1 text-xs font-semibold transition ${
                    state.activePresetId === "poison-oak"
                      ? "bg-terracotta text-parchment shadow-sm"
                      : state.activeWorkflow === "flora_fauna"
                        ? "bg-parchment/15 text-parchment hover:bg-parchment/25"
                        : "bg-white border border-sandline text-granite hover:border-hunter"
                  }"
                >
                  🔴 Poison Oak
                </button>
                <button
                  type="button"
                  data-preset="trillium-ovatum"
                  class="preset-trigger rounded-full px-2.5 py-1 text-xs font-semibold transition ${
                    state.activePresetId === "trillium-ovatum"
                      ? "bg-hunter text-parchment shadow-sm"
                      : state.activeWorkflow === "flora_fauna"
                        ? "bg-parchment/15 text-parchment hover:bg-parchment/25"
                        : "bg-white border border-sandline text-granite hover:border-hunter"
                  }"
                >
                  🟢 Trillium
                </button>
              </div>
            </div>
          </div>
        </section>

        <!-- LIVE CAMERA VIEWFINDER -->
        ${
          state.cameraTargetWorkflow
            ? `
          <section class="glass-forest text-parchment rounded-3xl p-5 shadow-xl">
            <div class="flex items-center justify-between mb-3">
              <h3 class="font-serif-organic text-lg font-bold">
                🎥 Live Field Optical Viewfinder (${
                  state.cameraTargetWorkflow === "trail_terrain"
                    ? "Route / Trail Ahead"
                    : "Plant / Critter Macro"
                })
              </h3>
              <button type="button" id="closeCameraBtn" class="rounded-full bg-parchment/15 px-3 py-1 text-xs font-semibold hover:bg-parchment/25">
                ✕ Close Camera
              </button>
            </div>
            <div class="relative rounded-2xl overflow-hidden bg-black max-h-80 flex items-center justify-center">
              <video id="liveCameraVideo" autoplay playsinline muted class="w-full max-h-80 object-cover"></video>
              <div class="absolute inset-6 border-2 border-dashed border-lichen/70 rounded-xl pointer-events-none"></div>
            </div>
            <div class="mt-4 flex justify-center">
              <button type="button" id="snapFrameBtn" class="rounded-full bg-lichen text-forest font-bold text-sm px-6 py-2.5 shadow-md hover:brightness-105">
                📸 Capture &amp; Analyze Frame
              </button>
            </div>
          </section>
        `
            : ""
        }

        <!-- ERROR BANNER -->
        ${
          state.errorMsg
            ? `
          <div role="alert" class="rounded-2xl bg-terracotta/15 border border-terracotta text-granite px-4 py-3 text-xs sm:text-sm font-medium flex items-center justify-between">
            <span>⚠️ ${escapeHtml(state.errorMsg)}</span>
            <button type="button" id="dismissErrorBtn" class="text-xs font-bold underline ml-4">Dismiss</button>
          </div>
        `
            : ""
        }

        <!-- MODULE 2: DYNAMIC RESULTS DASHBOARD -->
        ${
          a
            ? `
          <section class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <!-- LEFT COLUMN (5 Cols): Polaroid Field Card Display + Safety Meter -->
            <div class="lg:col-span-5 space-y-5">
              <!-- POLAROID-STYLE FIELD CARD DISPLAY -->
              <div class="polaroid-card rounded-3xl p-4 pb-6 relative rotate-[-0.6deg]">
                <div aria-hidden="true" class="specimen-tape w-32 h-6 mx-auto -mt-6 mb-3 rounded-sm rotate-[1.2deg]"></div>

                <div class="relative rounded-2xl overflow-hidden bg-forest aspect-[16/11] border border-sandline">
                  <img src="${state.imageDataUrl}" alt="${escapeHtml(a.title)}" class="w-full h-full object-cover" />

                  <div class="absolute top-3 left-3 flex flex-wrap gap-1.5">
                    <span class="rounded-full px-3 py-1 text-xs font-mono-field font-bold shadow-md backdrop-blur-md ${
                      meter.badgeTone === "danger"
                        ? "bg-terracotta text-parchment"
                        : meter.badgeTone === "caution"
                          ? "bg-lichen text-forest"
                          : "bg-hunter text-parchment"
                    }">
                      ${escapeHtml(a.risk_badge)}
                    </span>
                    ${
                      a.organism_assessment?.status_tag
                        ? `<span class="rounded-full bg-forest/90 text-parchment border border-parchment/20 px-3 py-1 text-xs font-mono-field font-semibold shadow-md">${escapeHtml(a.organism_assessment.status_tag)}</span>`
                        : ""
                    }
                  </div>

                  <div class="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2 bg-forest/85 backdrop-blur-md text-parchment px-3.5 py-2 rounded-xl border border-parchment/15">
                    <div class="truncate">
                      <span class="block text-[10px] font-mono-field uppercase tracking-wider text-lichen">
                        ${a.workflow === "trail_terrain" ? "Pinned Terrain Class" : "Pinned Binomial Nomenclature"}
                      </span>
                      <span class="text-xs sm:text-sm font-serif-organic italic font-semibold truncate">
                        ${
                          a.workflow === "trail_terrain"
                            ? escapeHtml(a.trail_assessment?.terrain_class)
                            : `${escapeHtml(a.organism_assessment?.scientific_name)} (${escapeHtml(a.organism_assessment?.common_name)})`
                        }
                      </span>
                    </div>
                    <span class="rounded-full bg-parchment/15 px-2.5 py-0.5 text-[11px] font-mono-field flex-shrink-0">
                      ${
                        a.workflow === "trail_terrain"
                          ? `${(a.trail_assessment?.visible_hazards || []).length} Hazards`
                          : `${escapeHtml(a.organism_assessment?.confidence_level)} ID`
                      }
                    </span>
                  </div>
                </div>

                <div class="mt-4 px-1">
                  <div class="flex items-center justify-between text-[11px] font-mono-field text-granite/65 mb-1">
                    <span>📍 ${escapeHtml(state.imageSourceLabel)}</span>
                    <span>${escapeHtml(currentStation.name.split(" • ")[1] || "Field Scan")}</span>
                  </div>
                  <h3 class="font-serif-organic text-xl font-bold text-forest leading-snug">
                    ${escapeHtml(a.title)}
                  </h3>
                  <p class="text-xs text-granite/85 mt-1.5 leading-relaxed">
                    ${escapeHtml(a.summary_tagline)}
                  </p>

                  <div class="mt-3.5 pt-3 border-t border-sandline flex items-center justify-between gap-2 flex-wrap">
                    <span class="rounded-full bg-parchment border border-sandline px-2.5 py-1 text-[11px] font-medium text-forest">
                      ${
                        a.workflow === "trail_terrain"
                          ? `🥾 ${escapeHtml(a.trail_assessment?.footwear_recommendation?.split(";")[0] || "Stiff lugs recommended")}`
                          : `🌿 ${escapeHtml(a.organism_assessment?.organism_group || "Field Specimen")}`
                      }
                    </span>
                    <button
                      type="button"
                      id="pinToKitBtn"
                      class="rounded-full bg-hunter/10 hover:bg-hunter hover:text-parchment text-hunter border border-hunter/30 px-3 py-1 text-xs font-semibold transition"
                    >
                      📌 Pin to Field Kit
                    </button>
                  </div>
                </div>
              </div>

              <!-- SAFETY METER: INTERACTIVE RADIAL GAUGE CARD -->
              <div class="glass-parchment rounded-3xl p-5 shadow-sm">
                <div class="flex items-center justify-between mb-3">
                  <div>
                    <span class="text-[11px] font-mono-field uppercase tracking-wider font-bold text-hunter">
                      ${escapeHtml(meter.mode)}
                    </span>
                    <h4 class="font-serif-organic text-lg font-bold text-forest">
                      Dynamic Safety Meter
                    </h4>
                  </div>
                  <span class="rounded-full px-3 py-1 text-xs font-mono-field font-bold text-parchment" style="background-color: ${meter.color}">
                    ${meter.score} / 100
                  </span>
                </div>

                <div class="flex items-center gap-5">
                  <div class="relative w-32 h-32 flex-shrink-0 flex items-center justify-center">
                    <svg class="w-32 h-32 -rotate-90" viewBox="0 0 140 140">
                      <circle cx="70" cy="70" r="${radius}" stroke="#E2DFD2" stroke-width="12" fill="transparent"></circle>
                      <circle
                        cx="70"
                        cy="70"
                        r="${radius}"
                        stroke="${meter.color}"
                        stroke-width="12"
                        stroke-dasharray="${circumference}"
                        stroke-dashoffset="${strokeDashoffset}"
                        stroke-linecap="round"
                        fill="transparent"
                        class="gauge-arc"
                      ></circle>
                    </svg>
                    <div class="absolute inset-0 flex flex-col items-center justify-center text-center">
                      <span class="font-serif-organic text-2xl font-bold text-forest">${meter.score}%</span>
                      <span class="text-[10px] font-mono-field uppercase text-granite/70">
                        ${a.workflow === "trail_terrain" ? "Readiness" : "Bio-Safe"}
                      </span>
                    </div>
                  </div>

                  <div class="space-y-1.5">
                    <div class="text-xs font-bold uppercase tracking-wide" style="color: ${meter.color}">
                      ${escapeHtml(meter.label)}
                    </div>
                    <p class="text-xs text-granite/80 leading-relaxed">
                      ${escapeHtml(meter.sublabel)}
                    </p>
                    <p class="text-[11px] text-granite/65 italic">
                      ${
                        a.workflow === "trail_terrain"
                          ? "💡 Check off items in the Gear Checklist to raise your live Trail Readiness Score."
                          : "💡 Never assume 100% toxicity clearance on wild mushrooms or plants."
                      }
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <!-- RIGHT COLUMN (7 Cols): Detailed Analysis, Interactive Gear Checklist, Markdown & Field Radio -->
            <div class="lg:col-span-7 space-y-5">
              <div class="glass-parchment rounded-2xl p-2.5 flex items-center justify-between flex-wrap gap-2">
                <div class="flex items-center gap-1.5">
                  <button type="button" data-tab="dashboard" class="tab-trigger rounded-xl px-3.5 py-1.5 text-xs font-semibold transition ${
                    state.activeTab === "dashboard" ? "bg-forest text-parchment shadow-sm" : "text-granite hover:bg-sandline/50"
                  }">
                    🧭 Field Intelligence &amp; Checklist
                  </button>
                  <button type="button" data-tab="markdown" class="tab-trigger rounded-xl px-3.5 py-1.5 text-xs font-semibold transition ${
                    state.activeTab === "markdown" ? "bg-forest text-parchment shadow-sm" : "text-granite hover:bg-sandline/50"
                  }">
                    📄 Markdown Report
                  </button>
                  <button type="button" data-tab="radio" class="tab-trigger rounded-xl px-3.5 py-1.5 text-xs font-semibold transition ${
                    state.activeTab === "radio" ? "bg-forest text-parchment shadow-sm" : "text-granite hover:bg-sandline/50"
                  }">
                    💬 Field Radio Q&amp;A (${state.followupMessages.length})
                  </button>
                </div>
                <span class="text-[11px] font-mono-field text-granite/70 px-2">
                  ${escapeHtml(a._meta?.model || state.selectedModel)}
                </span>
              </div>

              ${
                state.loading
                  ? `
                <div class="glass-parchment rounded-3xl p-12 text-center space-y-3">
                  <div class="w-12 h-12 rounded-full border-4 border-sandline border-t-forest animate-spin mx-auto"></div>
                  <h3 class="font-serif-organic text-lg font-bold text-forest">
                    Analyzing Optical Feed with ${escapeHtml(state.selectedModel)}...
                  </h3>
                  <p class="text-xs text-granite/75">
                    Synthesizing terrain hazards, taxonomy markers, and safety checklist
                  </p>
                </div>
              `
                  : state.activeTab === "dashboard"
                    ? `
                ${
                  a.workflow === "trail_terrain" && a.trail_assessment
                    ? `
                  <div class="glass-parchment rounded-3xl p-5 shadow-sm space-y-4">
                    <div class="flex items-center justify-between border-b border-sandline pb-3">
                      <div>
                        <span class="text-[11px] font-mono-field uppercase tracking-wider text-hunter font-bold">
                          Workflow 1 • Terrain &amp; Hazard Matrix
                        </span>
                        <h3 class="font-serif-organic text-lg font-bold text-forest">
                          Visible Route Hazards &amp; Mitigations
                        </h3>
                      </div>
                      <span class="rounded-full bg-forest/10 text-forest px-3 py-1 text-xs font-semibold">
                        ${(a.trail_assessment.visible_hazards || []).length} Hazards Logged
                      </span>
                    </div>

                    <div class="space-y-3">
                      ${(a.trail_assessment.visible_hazards || [])
                        .map(
                          (h) => `
                        <div class="rounded-2xl bg-white p-3.5 border border-sandline flex flex-col gap-1.5 shadow-sm">
                          <div class="flex items-center justify-between gap-2">
                            <span class="font-bold text-sm text-forest">${escapeHtml(h.hazard)}</span>
                            <span class="rounded-full px-2.5 py-0.5 text-[11px] font-mono-field font-bold ${
                              h.severity === "HIGH"
                                ? "bg-terracotta/20 text-terracotta"
                                : h.severity === "MODERATE"
                                  ? "bg-lichen/30 text-forest"
                                  : "bg-hunter/15 text-hunter"
                            }">
                              ${escapeHtml(h.severity)} RISK
                            </span>
                          </div>
                          <p class="text-xs text-granite/85 leading-relaxed">
                            <strong class="text-hunter">Field Mitigation:</strong> ${escapeHtml(h.mitigation)}
                          </p>
                        </div>
                      `
                        )
                        .join("")}
                    </div>

                    <div class="rounded-2xl bg-forest text-parchment p-4 space-y-2">
                      <div class="text-xs font-mono-field text-lichen uppercase tracking-wider font-bold">
                        📡 Navigation &amp; Field Protocol
                      </div>
                      <p class="text-xs text-parchment/90">
                        <strong>Navigation Risk:</strong> ${escapeHtml(a.trail_assessment.navigation_risk)}
                      </p>
                      <ul class="list-disc pl-5 text-xs text-parchment/85 space-y-1">
                        ${(a.trail_assessment.safety_protocol || [])
                          .map((tip) => `<li>${escapeHtml(tip)}</li>`)
                          .join("")}
                      </ul>
                    </div>
                  </div>
                `
                    : a.organism_assessment
                      ? `
                  <div class="glass-parchment rounded-3xl p-5 shadow-sm space-y-4">
                    <div class="flex items-center justify-between border-b border-sandline pb-3 flex-wrap gap-2">
                      <div>
                        <span class="text-[11px] font-mono-field uppercase tracking-wider text-terracotta font-bold">
                          Workflow 2 • Botanical &amp; Zoological Profile
                        </span>
                        <h3 class="font-serif-organic text-lg font-bold text-forest">
                          ${escapeHtml(a.organism_assessment.common_name)}
                          <span class="italic font-normal text-hunter">(${escapeHtml(a.organism_assessment.scientific_name)})</span>
                        </h3>
                      </div>
                      <span class="rounded-full bg-terracotta/15 text-terracotta border border-terracotta/30 px-3 py-1 text-xs font-mono-field font-bold">
                        ${escapeHtml(a.organism_assessment.status_tag)}
                      </span>
                    </div>

                    <div class="rounded-2xl bg-white p-4 border border-sandline space-y-2">
                      <div class="text-xs font-bold uppercase tracking-wider text-terracotta">
                        🧪 Toxicity &amp; Aggression Profile
                      </div>
                      <p class="text-xs sm:text-sm font-medium text-granite leading-relaxed">
                        ${escapeHtml(a.organism_assessment.toxicity_aggression_profile)}
                      </p>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div class="rounded-2xl bg-white p-4 border border-sandline">
                        <div class="text-xs font-bold uppercase tracking-wider text-hunter mb-2">
                          🔍 Key Visual Identifying Marks
                        </div>
                        <ul class="list-disc pl-4 text-xs text-granite/90 space-y-1.5">
                          ${(a.organism_assessment.identifying_marks || [])
                            .map((m) => `<li>${escapeHtml(m)}</li>`)
                            .join("")}
                        </ul>
                      </div>

                      <div class="rounded-2xl bg-white p-4 border border-sandline flex flex-col justify-between">
                        <div>
                          <div class="text-xs font-bold uppercase tracking-wider text-hunter mb-2">
                            📖 Field Ecology &amp; Natural History
                          </div>
                          <p class="text-xs text-granite/85 leading-relaxed">
                            ${escapeHtml(a.organism_assessment.field_description)}
                          </p>
                        </div>
                        <div class="mt-3 pt-2.5 border-t border-sandline text-xs font-semibold text-forest">
                          🌿 LNT Rule: ${escapeHtml(a.organism_assessment.leave_no_trace_rule)}
                        </div>
                      </div>
                    </div>

                    <div class="rounded-2xl bg-lichen/25 border border-lichen px-4 py-3 text-xs text-forest font-medium">
                      ${escapeHtml(a.organism_assessment.safety_disclaimer)}
                    </div>
                  </div>
                `
                      : ""
                }

                <!-- INTERACTIVE GEAR CHECKLIST MODULE -->
                <div class="glass-parchment rounded-3xl p-5 shadow-sm space-y-4">
                  <div class="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <span class="text-[11px] font-mono-field uppercase tracking-wider text-hunter font-bold">
                        Interactive Field Readiness Kit
                      </span>
                      <h3 class="font-serif-organic text-lg font-bold text-forest">
                        ${
                          a.workflow === "trail_terrain"
                            ? "Essential Trail &amp; Footwear Checklist"
                            : "Field Observation &amp; Exposure Safety Checklist"
                        }
                      </h3>
                    </div>
                    <span class="rounded-full bg-forest text-parchment px-3 py-1 text-xs font-mono-field font-semibold">
                      ${meter.checkedCount} / ${meter.totalGear} Checked (${meter.gearPct}%)
                    </span>
                  </div>

                  <div class="w-full h-2.5 bg-sandline rounded-full overflow-hidden">
                    <div
                      class="h-full transition-all duration-300 rounded-full"
                      style="width: ${meter.gearPct}%; background-color: ${meter.gearPct === 100 ? "#2D5A43" : "#E3B341"}"
                    ></div>
                  </div>

                  <div class="space-y-2.5">
                    ${gearList
                      .map((g) => {
                        const isChecked = Boolean(state.checkedGear[g.item]);
                        return `
                        <label class="flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all ${
                          isChecked
                            ? "bg-hunter/10 border-hunter/40 opacity-80"
                            : "bg-white border-sandline hover:border-hunter"
                        }">
                          <input
                            type="checkbox"
                            data-gear-item="${escapeHtml(g.item)}"
                            ${isChecked ? "checked" : ""}
                            class="moss-checkbox mt-0.5"
                          />
                          <div class="flex-1">
                            <div class="flex items-center gap-2 flex-wrap">
                              <span class="text-xs sm:text-sm font-bold ${
                                isChecked ? "line-through text-granite/60" : "text-forest"
                              }">
                                ${escapeHtml(g.item)}
                              </span>
                              <span class="rounded-full bg-parchment border border-sandline px-2 py-0.5 text-[10px] font-mono-field text-granite/80">
                                ${escapeHtml(g.category)}
                              </span>
                              ${
                                g.essential
                                  ? `<span class="rounded-full bg-terracotta/15 text-terracotta px-2 py-0.5 text-[10px] font-mono-field font-bold">ESSENTIAL</span>`
                                  : ""
                              }
                            </div>
                            <p class="text-xs text-granite/75 mt-1">${escapeHtml(g.reason)}</p>
                          </div>
                        </label>
                      `;
                      })
                      .join("")}
                  </div>

                  <form id="addGearForm" class="flex items-center gap-2 pt-1">
                    <input
                      id="customGearInput"
                      type="text"
                      placeholder="Add custom pack item (e.g., Garmin inReach, Bear Spray, Electrolytes)..."
                      class="flex-1 rounded-xl bg-white border border-sandline px-3.5 py-2 text-xs outline-none focus:border-hunter"
                    />
                    <button type="submit" class="rounded-xl bg-hunter hover:bg-forest text-parchment font-semibold text-xs px-4 py-2 transition">
                      + Add Gear
                    </button>
                  </form>
                </div>
              `
                    : state.activeTab === "markdown"
                      ? `
                <div class="glass-parchment rounded-3xl p-5 shadow-sm space-y-3">
                  <div class="flex items-center justify-between border-b border-sandline pb-3">
                    <div>
                      <span class="text-[11px] font-mono-field uppercase text-hunter font-bold">TrailSense Output Format</span>
                      <h3 class="font-serif-organic text-lg font-bold text-forest">Scannable Markdown Field Report</h3>
                    </div>
                    <button type="button" id="copyMdBtn" class="rounded-full bg-forest text-parchment px-3.5 py-1.5 text-xs font-semibold hover:bg-hunter transition">
                      📋 Copy Markdown
                    </button>
                  </div>
                  <pre class="rounded-2xl bg-forest text-parchment p-4 font-mono-field text-xs whitespace-pre-wrap overflow-x-auto leading-relaxed">${escapeHtml(a.markdown_report)}</pre>
                </div>
              `
                      : `
                <div class="glass-parchment rounded-3xl p-5 shadow-sm space-y-4">
                  <div class="flex items-center justify-between border-b border-sandline pb-3">
                    <div>
                      <span class="text-[11px] font-mono-field uppercase text-hunter font-bold">Stateful Gemini Interactions API</span>
                      <h3 class="font-serif-organic text-lg font-bold text-forest">Field Radio Follow-Up Q&amp;A</h3>
                    </div>
                    <span class="text-[11px] font-mono-field text-granite/65">previous_interaction_id Linked</span>
                  </div>

                  <div class="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                    ${
                      state.followupMessages.length === 0
                        ? `<p class="text-xs text-granite/70 italic py-4 text-center">Ask a follow-up question about this route or organism (e.g., "What lookalikes grow nearby?" or "How should I adjust if rain starts?").</p>`
                        : state.followupMessages
                            .map(
                              (m) => `
                          <div class="rounded-2xl p-3 text-xs leading-relaxed ${
                            m.role === "user"
                              ? "bg-hunter text-parchment ml-8"
                              : "bg-white border border-sandline text-granite mr-8"
                          }">
                            <div class="font-bold mb-1">${
                              m.role === "user" ? "Hiker" : `TrailSense (${escapeHtml(m.model || state.selectedModel)})`
                            }</div>
                            <div class="whitespace-pre-wrap">${escapeHtml(m.text)}</div>
                          </div>
                        `
                            )
                            .join("")
                    }
                  </div>

                  <form id="followupForm" class="flex items-center gap-2">
                    <input
                      id="followupInput"
                      type="text"
                      placeholder="Transmit follow-up question to TrailSense..."
                      class="flex-1 rounded-xl bg-white border border-sandline px-3.5 py-2.5 text-xs outline-none focus:border-hunter"
                    />
                    <button type="submit" ${state.followupLoading ? "disabled" : ""} class="rounded-xl bg-forest hover:bg-hunter text-parchment font-semibold text-xs px-4 py-2.5 transition">
                      ${state.followupLoading ? "Sending..." : "Transmit"}
                    </button>
                  </form>
                </div>
              `
              }
            </div>
          </section>
        `
            : ""
        }
      </main>

      <!-- SYSTEM PROMPT MODAL -->
      ${
        state.showPromptModal
          ? `
        <div class="fixed inset-0 z-50 bg-forest/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div class="glass-parchment rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-4">
            <div class="flex items-center justify-between">
              <h3 class="font-serif-organic text-xl font-bold text-forest">📜 TrailSense AI System Prompt</h3>
              <button type="button" id="closePromptModalBtn" class="rounded-full bg-sandline px-3 py-1 text-xs font-bold">✕ Close</button>
            </div>
            <textarea id="promptTextarea" rows="14" class="w-full rounded-2xl bg-white border border-sandline p-3.5 font-mono-field text-xs text-granite outline-none">${escapeHtml(state.systemPrompt)}</textarea>
            <div class="flex justify-end gap-2.5">
              <button type="button" id="resetPromptBtn" class="rounded-xl border border-sandline bg-white px-4 py-2 text-xs font-semibold">Reset Default</button>
              <button type="button" id="savePromptModalBtn" class="rounded-xl bg-forest text-parchment px-5 py-2 text-xs font-semibold">Save &amp; Apply</button>
            </div>
          </div>
        </div>
      `
          : ""
      }

      <!-- OFFLINE LOGBOOK MODAL -->
      ${
        state.showLogbookModal
          ? `
        <div class="fixed inset-0 z-50 bg-forest/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div class="glass-parchment rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-4">
            <div class="flex items-center justify-between">
              <div>
                <span class="text-[10px] font-mono-field uppercase tracking-wider text-hunter font-bold">Zero-Signal Backcountry Cache</span>
                <h3 class="font-serif-organic text-xl font-bold text-forest">📓 Offline-Ready Field Kit Logbook</h3>
              </div>
              <button type="button" id="closeLogbookModalBtn" class="rounded-full bg-sandline px-3 py-1 text-xs font-bold">✕ Close</button>
            </div>
            <div class="space-y-2.5 max-h-80 overflow-y-auto">
              ${
                state.savedLogs.length === 0
                  ? `<p class="text-xs text-granite/70 py-6 text-center">No field cards pinned yet. Click "📌 Pin to Field Kit" on any Polaroid card to store it for offline backcountry use.</p>`
                  : state.savedLogs
                      .map(
                        (item, idx) => `
                    <div data-log-index="${idx}" class="saved-log-item rounded-2xl bg-white border border-sandline hover:border-hunter p-3.5 flex items-center justify-between cursor-pointer transition">
                      <div>
                        <div class="text-xs font-bold text-forest">${escapeHtml(item.risk_badge)} ${escapeHtml(item.title)}</div>
                        <div class="text-[11px] text-granite/65">Pinned at ${escapeHtml(item.savedAt)} • ${item.workflow === "trail_terrain" ? "Route Check" : "Organism ID"}</div>
                      </div>
                      <span class="rounded-full bg-parchment border border-sandline px-3 py-1 text-xs font-semibold text-hunter">Open Card →</span>
                    </div>
                  `
                      )
                      .join("")
              }
            </div>
          </div>
        </div>
      `
          : ""
      }
    </div>
  `;

  bindEvents();
}

function bindEvents() {
  document.getElementById("weatherSyncBtn")?.addEventListener("click", () => {
    state.stationIndex = (state.stationIndex + 1) % WEATHER_STATIONS.length;
    state.sunsetRemaining = WEATHER_STATIONS[state.stationIndex].sunsetOffsetSec;
    renderApp();
  });

  document.getElementById("offlineToggleBtn")?.addEventListener("click", () => {
    state.offlineMode = !state.offlineMode;
    renderApp();
  });

  document.getElementById("openLogbookBtn")?.addEventListener("click", () => {
    state.showLogbookModal = true;
    renderApp();
  });

  document.getElementById("closeLogbookModalBtn")?.addEventListener("click", () => {
    state.showLogbookModal = false;
    renderApp();
  });

  document.getElementById("openPromptBtn")?.addEventListener("click", () => {
    state.showPromptModal = true;
    renderApp();
  });

  document.getElementById("closePromptModalBtn")?.addEventListener("click", () => {
    state.showPromptModal = false;
    renderApp();
  });

  document.getElementById("resetPromptBtn")?.addEventListener("click", () => {
    state.systemPrompt = state.defaultPrompt;
    renderApp();
  });

  document.getElementById("savePromptModalBtn")?.addEventListener("click", () => {
    const val = document.getElementById("promptTextarea")?.value || "";
    state.systemPrompt = val;
    state.showPromptModal = false;
    renderApp();
  });

  document.getElementById("apiKeyInput")?.addEventListener("input", (e) => {
    state.apiKey = e.target.value;
    sessionStorage.setItem("trailsense_api_key", state.apiKey.trim());
  });

  document.getElementById("modelSelect")?.addEventListener("change", (e) => {
    state.selectedModel = e.target.value;
  });

  document.getElementById("fieldNotesInput")?.addEventListener("input", (e) => {
    state.fieldNotes = e.target.value;
  });

  document.getElementById("runScanBtn")?.addEventListener("click", () => {
    triggerGeminiScan();
  });

  // Dropzone 1 & 2 File Uploads
  const trailFileInput = document.getElementById("trailFileInput");
  const critterFileInput = document.getElementById("critterFileInput");

  document.getElementById("uploadTrailBtn")?.addEventListener("click", () => {
    trailFileInput?.click();
  });
  document.getElementById("uploadCritterBtn")?.addEventListener("click", () => {
    critterFileInput?.click();
  });

  trailFileInput?.addEventListener("change", (e) => {
    if (e.target.files?.[0]) handleImageFile(e.target.files[0], "trail_terrain");
  });
  critterFileInput?.addEventListener("change", (e) => {
    if (e.target.files?.[0]) handleImageFile(e.target.files[0], "flora_fauna");
  });

  const dzTrail = document.getElementById("dropzoneTrail");
  const dzCritter = document.getElementById("dropzoneCritter");

  dzTrail?.addEventListener("dragover", (e) => e.preventDefault());
  dzTrail?.addEventListener("drop", (e) => {
    e.preventDefault();
    if (e.dataTransfer.files?.[0]) handleImageFile(e.dataTransfer.files[0], "trail_terrain");
  });

  dzCritter?.addEventListener("dragover", (e) => e.preventDefault());
  dzCritter?.addEventListener("drop", (e) => {
    e.preventDefault();
    if (e.dataTransfer.files?.[0]) handleImageFile(e.dataTransfer.files[0], "flora_fauna");
  });

  // Camera buttons
  document.getElementById("cameraTrailBtn")?.addEventListener("click", () => {
    startCamera("trail_terrain");
  });
  document.getElementById("cameraCritterBtn")?.addEventListener("click", () => {
    startCamera("flora_fauna");
  });
  document.getElementById("closeCameraBtn")?.addEventListener("click", stopCamera);
  document.getElementById("snapFrameBtn")?.addEventListener("click", captureCameraFrame);

  document.getElementById("dismissErrorBtn")?.addEventListener("click", () => {
    state.errorMsg = "";
    renderApp();
  });

  // Presets
  document.querySelectorAll(".preset-trigger").forEach((btn) => {
    btn.addEventListener("click", () => {
      loadPreset(btn.getAttribute("data-preset"));
    });
  });

  // Tabs
  document.querySelectorAll(".tab-trigger").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.activeTab = btn.getAttribute("data-tab");
      renderApp();
    });
  });

  // Gear checkboxes
  document.querySelectorAll("input[data-gear-item]").forEach((cb) => {
    cb.addEventListener("change", (e) => {
      const item = e.target.getAttribute("data-gear-item");
      state.checkedGear[item] = e.target.checked;
      localStorage.setItem("trailsense_checked_gear", JSON.stringify(state.checkedGear));
      renderApp();
    });
  });

  // Add Custom Gear
  document.getElementById("addGearForm")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const input = document.getElementById("customGearInput");
    const val = input?.value.trim();
    if (!val || !state.assessment) return;

    const newItem = {
      item: val,
      category: "Custom Field Kit",
      reason: "Added by hiker during pre-flight inspection",
      essential: true,
    };

    if (state.assessment.workflow === "trail_terrain" && state.assessment.trail_assessment) {
      state.assessment.trail_assessment.gear_checklist.push(newItem);
    }
    state.checkedGear[val] = true;
    localStorage.setItem("trailsense_checked_gear", JSON.stringify(state.checkedGear));
    renderApp();
  });

  // Pin to Field Kit
  document.getElementById("pinToKitBtn")?.addEventListener("click", (e) => {
    if (!state.assessment) return;
    const entry = {
      ...state.assessment,
      savedAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      previewUrl: state.imageDataUrl,
    };
    state.savedLogs = [entry, ...state.savedLogs].slice(0, 20);
    localStorage.setItem("trailsense_field_logs", JSON.stringify(state.savedLogs));
    e.target.textContent = "✅ Pinned to Kit!";
    setTimeout(() => renderApp(), 900);
  });

  // Copy Markdown
  document.getElementById("copyMdBtn")?.addEventListener("click", async (e) => {
    await navigator.clipboard.writeText(state.assessment?.markdown_report || "");
    e.target.textContent = "✅ Copied!";
    setTimeout(() => {
      e.target.textContent = "📋 Copy Markdown";
    }, 1500);
  });

  // Followup Form
  document.getElementById("followupForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const input = document.getElementById("followupInput");
    const q = input?.value.trim();
    if (!q) return;

    state.followupMessages.push({ role: "user", text: q });
    state.followupLoading = true;
    renderApp();

    try {
      const res = await fetch("/api/followup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: q,
          previousInteractionId: state.assessment?._meta?.interaction_id,
          contextSummary: state.assessment?.markdown_report || "",
          model: state.selectedModel,
          apiKey: state.apiKey.trim(),
        }),
      });
      const data = await res.json();
      state.followupMessages.push({
        role: "assistant",
        text: data.answer || data.error,
        model: data.model,
      });
    } catch (err) {
      state.followupMessages.push({ role: "assistant", text: err.message });
    } finally {
      state.followupLoading = false;
      renderApp();
    }
  });

  // Saved Logbook Items
  document.querySelectorAll(".saved-log-item").forEach((el) => {
    el.addEventListener("click", () => {
      const idx = Number(el.getAttribute("data-log-index"));
      const item = state.savedLogs[idx];
      if (item) {
        state.assessment = item;
        if (item.previewUrl) state.imageDataUrl = item.previewUrl;
        state.showLogbookModal = false;
        renderApp();
      }
    });
  });
}

// Live Sunset Countdown Interval (Updates DOM timer without re-rendering whole page)
setInterval(() => {
  if (state.sunsetRemaining > 0) {
    state.sunsetRemaining -= 1;
    const timerEl = document.getElementById("sunsetTimerText");
    if (timerEl) {
      timerEl.textContent = `🌅 ${formatCountdown(state.sunsetRemaining)}`;
    }
  }
}, 1000);

async function init() {
  try {
    const res = await fetch("/api/config");
    const cfg = await res.json();
    state.hasServerKey = Boolean(cfg.hasServerApiKey);
    state.systemPrompt = cfg.systemPrompt || "";
    state.defaultPrompt = cfg.systemPrompt || "";
  } catch (err) {
    console.warn("Config load warning:", err);
  }
  await loadPreset("alpine-scree");
}

init();
