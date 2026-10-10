export const TRAILSENSE_SYSTEM_PROMPT = `# SYSTEM PROMPT: TrailSense AI Field Guide

## ROLE & CONTEXT
You are TrailSense, an expert outdoors AI guide, botanist, zoologist, and trail safety specialist. 
Your core goal is to help hikers, backpackers, and nature explorers "touch grass" safely and responsibly.

---

## INPUT MODALITIES
The user will upload images in two distinct workflows:
1. Trailhead / Landscape / Route Image
2. Flora / Fauna / Organism Identification Image

---

## WORKFLOW 1: TRAIL & TERRAIN PRE-FLIGHT CHECK
When the user uploads a landscape, trailhead sign, or trail path:

1. Terrain & Hazard Assessment:
   - Identify terrain class (e.g., loose scree, wet granite, packed dirt, bog/marsh, technical scramble).
   - Detect visible hazards (steep drop-offs, fallen timber, erosion, river crossings, ice/snow remnants).
2. Essential Gear Checklist:
   - Footwear recommendation (stiff boots, trail runners, microspikes).
   - Critical pack items tailored to the visible conditions (poles, emergency bivvy, water purification).
3. Field Protocol & Safety:
   - Navigation risk (canopy coverage, trail markings clarity).
   - Baseline safety tips (weather watchpoints, wildlife encounter readiness, cell dead-zone warning).

---

## WORKFLOW 2: FLORA & FAUNA IDENTIFICATION & SAFETY
When the user uploads a plant, mushroom, insect, reptile, or animal:

1. Identification & Classification:
   - Common Name + Scientific (Binomial) Name.
   - Confidence Level: [High / Moderate / Low - Requires closer examination].
2. Safety Verdict:
   - Status Tag: [SAFE TO TOUCH / CAUTION / DANGEROUS / TOXIC / DEADLY].
   - Toxicity/Aggression Profile: Contact dermatitis, ingestion poison, defensive stings/bites, or completely harmless.
3. Field Description (2-3 sentences):
   - Key visual identifying marks, ecological role, and interesting natural history.
4. Leave No Trace & Handling Rule:
   - Clear directive on whether to observe from afar, avoid handling, or if it can be safely brushed past.

---

## TONE & OUTPUT FORMAT
- Tone: Grounded, sharp, encouraging, safety-first.
- Always output clean Markdown with scannable headers, risk badges (\`[🟢 SAFE]\`, \`[🟡 CAUTION]\`, \`[🔴 DANGER]\`), and concise bullet points.
- Never state 100% toxicity clearance on edible wild mushrooms or foraged plants; always append a strict disclaimer to never ingest unidentified wild plants.
- When uncertain between a safe species and a dangerous lookalike, ALWAYS downgrade confidence to "Low - Requires closer examination" and elevate the risk badge.`;

export const WORKFLOW_ROUTER_SCHEMA = {
  type: "object",
  properties: {
    detected_workflow: {
      type: "string",
      enum: ["trail_terrain", "flora_fauna"],
      description:
        "Select 'trail_terrain' if the image shows a landscape, trail path, mountain, river crossing, or trailhead sign. Select 'flora_fauna' if the image focuses on a specific plant, mushroom/fungus, insect, reptile, bird, or animal.",
    },
    routing_reason: {
      type: "string",
      description: "One brief sentence explaining why this workflow was selected.",
    },
  },
  required: ["detected_workflow", "routing_reason"],
};

export const TRAILSENSE_RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    workflow: {
      type: "string",
      enum: ["trail_terrain", "flora_fauna"],
      description: "Which TrailSense workflow applies to the image.",
    },
    title: {
      type: "string",
      description: "Short, sharp title for this field assessment.",
    },
    risk_badge: {
      type: "string",
      enum: ["[🟢 SAFE]", "[🟡 CAUTION]", "[🔴 DANGER]"],
      description: "Primary risk badge for the trail or organism.",
    },
    summary_tagline: {
      type: "string",
      description: "Grounded 1-sentence tactical summary of the scene or specimen.",
    },
    trail_assessment: {
      type: "object",
      description: "Populated when workflow is 'trail_terrain'.",
      properties: {
        terrain_class: {
          type: "string",
          description: "e.g., Loose Alpine Scree & Wet Granite, Packed Forest Loam, Bog/Marsh Boardwalk",
        },
        visible_hazards: {
          type: "array",
          items: {
            type: "object",
            properties: {
              hazard: { type: "string" },
              severity: { type: "string", enum: ["LOW", "MODERATE", "HIGH"] },
              mitigation: { type: "string" },
            },
            required: ["hazard", "severity", "mitigation"],
          },
        },
        footwear_recommendation: {
          type: "string",
          description: "Specific footwear recommendation (e.g., stiff mid-cut boots with Vibram lugs, trail runners, microspikes).",
        },
        gear_checklist: {
          type: "array",
          items: {
            type: "object",
            properties: {
              item: { type: "string" },
              category: { type: "string", enum: ["Footwear", "Traction & Stability", "Navigation", "Hydration & Shelter", "First Aid & Safety"] },
              reason: { type: "string" },
              essential: { type: "boolean" },
            },
            required: ["item", "category", "reason", "essential"],
          },
        },
        navigation_risk: {
          type: "string",
          description: "Assessment of canopy coverage, cairns/trail markings clarity, and off-trail drift risk.",
        },
        safety_protocol: {
          type: "array",
          items: { type: "string" },
          description: "Baseline safety tips: weather watchpoints, wildlife encounter readiness, cell dead-zone warning.",
        },
      },
      required: [
        "terrain_class",
        "visible_hazards",
        "footwear_recommendation",
        "gear_checklist",
        "navigation_risk",
        "safety_protocol",
      ],
    },
    organism_assessment: {
      type: "object",
      description: "Populated when workflow is 'flora_fauna'.",
      properties: {
        common_name: { type: "string" },
        scientific_name: { type: "string" },
        organism_group: {
          type: "string",
          enum: ["Plant / Flora", "Fungus / Mushroom", "Insect / Arachnid", "Reptile / Amphibian", "Mammal / Bird", "Other Organism"],
        },
        confidence_level: {
          type: "string",
          enum: ["High", "Moderate", "Low - Requires closer examination"],
        },
        status_tag: {
          type: "string",
          enum: ["SAFE TO TOUCH", "CAUTION", "DANGEROUS", "TOXIC", "DEADLY"],
        },
        toxicity_aggression_profile: {
          type: "string",
          description: "Contact dermatitis, ingestion poison, defensive stings/bites, or completely harmless.",
        },
        identifying_marks: {
          type: "array",
          items: { type: "string" },
          description: "2-4 key visual diagnostic features visible in the frame.",
        },
        field_description: {
          type: "string",
          description: "2-3 sentences covering key visual identifying marks, ecological role, and natural history.",
        },
        leave_no_trace_rule: {
          type: "string",
          description: "Clear directive on whether to observe from afar, avoid handling, or if it can be safely brushed past.",
        },
        safety_disclaimer: {
          type: "string",
          description: "Strict foraging/wildlife safety disclaimer. Never state 100% toxicity clearance on wild mushrooms or plants.",
        },
      },
      required: [
        "common_name",
        "scientific_name",
        "organism_group",
        "confidence_level",
        "status_tag",
        "toxicity_aggression_profile",
        "identifying_marks",
        "field_description",
        "leave_no_trace_rule",
        "safety_disclaimer",
      ],
    },
    markdown_report: {
      type: "string",
      description: "Complete, cleanly formatted Markdown field report with scannable headers, risk badges ([🟢 SAFE], [🟡 CAUTION], [🔴 DANGER]), bullet points, and mandatory safety disclaimer.",
    },
  },
  required: ["workflow", "title", "risk_badge", "summary_tagline", "markdown_report"],
};

export const DEMO_PRESETS = {
  "alpine-scree": {
    id: "alpine-scree",
    label: "Alpine Scree & Wet Granite",
    subtitle: "Workflow 1 • High-Altitude Pass",
    workflow: "trail_terrain",
    title: "High-Angle Talus & Wet Granite Couloir",
    risk_badge: "[🟡 CAUTION]",
    summary_tagline: "Exposed talus slope with residual snowmelt slicking granite slabs above treeline; ankle-roll and rockfall hazards present.",
    trail_assessment: {
      terrain_class: "Loose Alpine Scree / Wet Glaciated Granite (Class 2–3 Scramble)",
      visible_hazards: [
        {
          hazard: "Unstable talus & shifting scree",
          severity: "HIGH",
          mitigation: "Test handholds and weight placement before committing; maintain 15m spacing between hikers on steep gullies.",
        },
        {
          hazard: "Seepage-slicked granite slabs & lingering snowfield verglas",
          severity: "MODERATE",
          mitigation: "Step on rough crystalline rock textures rather than dark wet streaks or lichen patches.",
        },
        {
          hazard: "Zero canopy exposure above treeline",
          severity: "MODERATE",
          mitigation: "Set a strict 1:00 PM turnaround time before afternoon convective lightning builds.",
        },
      ],
      footwear_recommendation: "Stiff-soled mid/high-cut mountaineering or approach boots with deep Vibram lugs; pack light traction (microspikes) for shaded snow chutes.",
      gear_checklist: [
        {
          item: "Stiff-shanked hiking boots or approach shoes",
          category: "Footwear",
          reason: "Prevents torsional ankle fatigue and bruising on sharp angular talus.",
          essential: true,
        },
        {
          item: "Collapsible trekking poles with snow/rock baskets",
          category: "Traction & Stability",
          reason: "Critical for 3-point balance on loose descent scree.",
          essential: true,
        },
        {
          item: "Pocket microspikes / trail crampons",
          category: "Traction & Stability",
          reason: "Shaded north-facing gullies often hide freeze-thaw ice bridges.",
          essential: true,
        },
        {
          item: "Offline GPX map + compass/altimeter",
          category: "Navigation",
          reason: "Rock cairns blend into grey talus if valley fog rolls in.",
          essential: true,
        },
        {
          item: "Windproof hardshell + emergency ultralight bivvy",
          category: "Hydration & Shelter",
          reason: "Ridge windchill drops 15–20°F rapidly with zero natural windbreak.",
          essential: true,
        },
        {
          item: "2.5L water + Sawyer Squeeze / Katadyn BeFree filter",
          category: "Hydration & Shelter",
          reason: "Glacial meltwater streams carry Giardia and fine rock flour.",
          essential: false,
        },
      ],
      navigation_risk: "MODERATE-HIGH — Open sightlines in clear weather, but rock cairns are sparse across shifting scree fields and become invisible in cloud whiteouts.",
      safety_protocol: [
        "Weather Watchpoint: Watch cumulus vertical development over the ridge; descend immediately if thunder or static buzz occurs.",
        "Rockfall Protocol: Yell 'ROCK!' immediately if any stone is dislodged; never climb directly beneath another party.",
        "Cell Dead-Zone Warning: Ridge shadows block LTE signal; download offline topo tiles and trigger satellite SOS check-in before ascending.",
      ],
    },
    markdown_report: `## 🏔️ TrailSense Pre-Flight Check: High-Angle Talus & Wet Granite Couloir
**Overall Risk Status:** \`[🟡 CAUTION]\`  
**Terrain Class:** Loose Alpine Scree / Wet Glaciated Granite (Class 2–3 Scramble)

---

### 1. Terrain & Hazard Assessment
- **\`[🔴 HIGH]\` Unstable Talus & Shifting Scree:** Angular rock debris shifts underfoot; space hikers out to avoid kicking rocks onto lower party members.
- **\`[🟡 MODERATE]\` Wet Granite & Snowmelt Verglas:** Dark water streaks and black lichen on granite slabs act like grease; step on rough, dry quartz crystals.
- **\`[🟡 MODERATE]\` Exposed Ridge Above Treeline:** No lightning or wind shelter for the upper 1.5 miles.

### 2. Essential Gear Checklist
- **Footwear:** Stiff-soled mid/high-cut hiking or approach boots with aggressive lugs + pocket microspikes.
- **Critical Pack Items:**
  - [ ] Trekking poles (with rubber tips removed for rock bite)
  - [ ] Hardshell jacket & emergency Mylar/breathable bivvy
  - [ ] Offline topographic map downloaded + backup power bank
  - [ ] Water purification filter (snowmelt streams nearby)

### 3. Field Protocol & Safety
- **Navigation Risk:** Cairn-only routing across grey rock; high disorientation risk if fog drops into the basin.
- **Weather Watchpoint:** Enforce a hard **1:00 PM turnaround time** to clear the ridge before afternoon storms.
- **Cell Dead-Zone Warning:** Expect zero cellular reception in the cirque basin—share your route and ETA with an emergency contact before leaving the trailhead.`,
  },

  "river-crossing": {
    id: "river-crossing",
    label: "Glacial River & Log Jam",
    subtitle: "Workflow 1 • Unbridged Ford",
    workflow: "trail_terrain",
    title: "Braided Glacial Meltwater Ford & Wet Timber",
    risk_badge: "[🔴 DANGER]",
    summary_tagline: "Fast, turbid glacial snowmelt channel with submerged boulders and a slick barkless log jam; high sweep and hypothermia risk.",
    trail_assessment: {
      terrain_class: "Unbridged Glacial River Ford & Slick Alluvial Cobble",
      visible_hazards: [
        {
          hazard: "High-velocity glacial meltwater above knee depth",
          severity: "HIGH",
          mitigation: "Never cross above mid-thigh depth; unbuckle hip belt and sternum strap before stepping into current.",
        },
        {
          hazard: "Wet, barkless fallen timber spanning main channel",
          severity: "HIGH",
          mitigation: "Do not walk upright across wet deadfall over rapids; ford at the widest, slowest gravel riffle downstream instead.",
        },
        {
          hazard: "Opaque glacial rock flour hiding rolling cobbles",
          severity: "MODERATE",
          mitigation: "Probe each step with trekking poles and shuffle laterally facing upstream at a 45° angle.",
        },
      ],
      footwear_recommendation: "Keep trail runners or grippy amphibious sandals ON during the ford (never cross barefoot on sharp glacial cobble); pack dry wool socks for the far bank.",
      gear_checklist: [
        {
          item: "Dual locking trekking poles (extended 10cm)",
          category: "Traction & Stability",
          reason: "Provides a tripod stance against lateral current surge.",
          essential: true,
        },
        {
          item: "Waterproof pack liner / drybags for electronics & down",
          category: "Hydration & Shelter",
          reason: "Protects insulation layers and sleeping bag if a slip occurs.",
          essential: true,
        },
        {
          item: "Grippy trail runners or camp water sandals",
          category: "Footwear",
          reason: "Protects soles from sharp granite cobbles and prevents toe trauma.",
          essential: true,
        },
        {
          item: "Spare dry merino wool socks + microfiber towel",
          category: "Footwear",
          reason: "Restore foot warmth immediately after exiting 38°F glacial water.",
          essential: true,
        },
        {
          item: "Emergency thermal bivvy + fire starter",
          category: "First Aid & Safety",
          reason: "Rapid cold-water immersion safeguard.",
          essential: true,
        },
      ],
      navigation_risk: "MODERATE — Braided gravel bars shift seasonally; look for high-water cairns on the far willow bank before entering the water.",
      safety_protocol: [
        "Timing Watchpoint: Glacial rivers peak in late afternoon (3:00–6:00 PM) and run lowest at dawn (6:00–9:00 AM).",
        "Pack Strap Rule: Always unclip backpack hip belt and sternum strap before fording so you can ditch the pack if swept.",
        "Cell Dead-Zone Warning: Valley canyon walls block GPS and cell signal—verify far-bank trail exit before crossing.",
      ],
    },
    markdown_report: `## 🌊 TrailSense Pre-Flight Check: Braided Glacial Meltwater Ford
**Overall Risk Status:** \`[🔴 DANGER]\`  
**Terrain Class:** Unbridged Glacial River Ford & Slick Alluvial Cobble

---

### 1. Terrain & Hazard Assessment
- **\`[🔴 HIGH]\` Turbid Glacial Surge:**Afternoon snowmelt raises channel velocity; opaque water hides shifting river cobbles.
- **\`[🔴 HIGH]\` Slick Fallen Timber:** Wet deadfall logs over whitewater pose severe fall and entrapment hazards.
- **\`[🟡 MODERATE]\` Cold-Shock & Numbness:** 38°F meltwater numbs feet within 90 seconds.

### 2. Essential Gear Checklist
- **Footwear:** Keep trail runners or strapped river sandals ON (never ford barefoot).
- **Critical Pack Items:**
  - [ ] Dual trekking poles for 3-point upstream tripod stability
  - [ ] Drybag pack liner sealing down jacket, sleeping bag, and phone
  - [ ] Dry wool socks & camp towel at top of pack
  - [ ] Emergency thermal bivvy

### 3. Field Protocol & Safety
- **Pack Protocol:** **Unbuckle your hip belt and sternum strap** before stepping into the river.
- **Crossing Technique:** Ford at the widest, shallowest braided riffle (not the narrowest chute); face upstream and angle 45° diagonally with the current.`,
  },

  "amanita-muscaria": {
    id: "amanita-muscaria",
    label: "Fly Agaric Mushroom",
    subtitle: "Workflow 2 • Mycology & Toxicity Check",
    workflow: "flora_fauna",
    title: "Fly Agaric (Amanita muscaria)",
    risk_badge: "[🔴 DANGER]",
    summary_tagline: "Iconic scarlet-capped basidiomycete mushroom containing potent neurotoxins (ibotenic acid and muscimol)—toxic if ingested.",
    organism_assessment: {
      common_name: "Fly Agaric",
      scientific_name: "Amanita muscaria",
      organism_group: "Fungus / Mushroom",
      confidence_level: "High",
      status_tag: "TOXIC",
      toxicity_aggression_profile: "INGESTION POISON (Neurotoxic) — Contains ibotenic acid and muscimol causing severe gastrointestinal distress, delirium, ataxia, and seizures if consumed. Safe to observe; wash hands after incidental contact.",
      identifying_marks: [
        "Bright scarlet-red to orange-red cap (pileus) dotted with white pyramidal universal veil warts",
        "Free white gills (lamellae) that do not attach to the stem",
        "Prominent skirt-like white ring (annulus) on the upper stipe",
        "Bulbous basal volva with concentric shaggy rings at soil level",
      ],
      field_description: "A striking ectomycorrhizal basidiomycete mushroom displaying a crimson cap flecked with white veil remnants and a skirted white stipe. It forms vital symbiotic partnerships with the roots of birch, pine, fir, and spruce trees, exchanging soil minerals for host carbohydrates. Heavy rain can wash away the white warts, making it resemble other gilled species.",
      leave_no_trace_rule: "OBSERVE & PHOTOGRAPH ONLY — Leave fruiting bodies intact so they can finish dispersing spores and supporting forest root networks. Keep dogs and children strictly away.",
      safety_disclaimer: "⚠️ STRICT FORAGING DISCLAIMER: TrailSense never states 100% toxicity clearance on wild mushrooms or foraged plants. Heavy rain can wash warts off Amanita species, and deadly amatoxin-containing Amanitas (Death Cap / Destroying Angel) share the same genus. NEVER ingest any wild fungus or plant based on AI or photo identification.",
    },
    markdown_report: `## 🍄 TrailSense Organism ID: Fly Agaric (*Amanita muscaria*)
**Safety Verdict:** \`[🔴 DANGER]\` • **Status Tag:** \`[TOXIC]\`  
**Confidence Level:** \`[High]\`

---

### 1. Identification & Classification
- **Common Name:** Fly Agaric
- **Scientific Name:** *Amanita muscaria*
- **Group:** Fungus / Mushroom (Basidiomycota)

### 2. Safety Verdict & Toxicity Profile
- **Status:** \`[TOXIC — DO NOT INGEST]\`
- **Toxicity Profile:** Contains the psychoactive neurotoxins **ibotenic acid** and **muscimol**. Ingestion causes nausea, muscle twitching, confusion, delirium, and potential coma. Incidental skin contact is not systemically absorbed, but avoid touching eyes/mouth after handling.

### 3. Field Description
Recognizable by its vivid scarlet-to-orange cap studded with white universal veil warts, free white gills, and a shaggy bulbous base (*volva*). Ecologically, *Amanita muscaria* is a powerhouse ectomycorrhizal partner to conifers and birches, helping trees absorb nitrogen and phosphorus in nutrient-poor forest soils.

### 4. Leave No Trace & Handling Rule
- **Directive:** **Observe from afar and do not pick or kick over.** Fruiting bodies are critical to forest nutrient cycling. Keep trail dogs leashed and away from the specimen.

> ⚠️ **STRICT SAFETY DISCLAIMER:** Never state or assume 100% toxicity clearance on wild mushrooms or foraged plants. Never ingest any wild mushroom or plant based on digital photo analysis.`,
  },

  "poison-oak": {
    id: "poison-oak",
    label: "Western Poison Oak",
    subtitle: "Workflow 2 • Trailside Flora Hazard",
    workflow: "flora_fauna",
    title: "Western Poison Oak (Toxicodendron diversilobum)",
    risk_badge: "[🔴 DANGER]",
    summary_tagline: "High-risk trailside shrub coated in urushiol oil; causes blistering allergic contact dermatitis from direct touch or contaminated gear.",
    organism_assessment: {
      common_name: "Western Poison Oak",
      scientific_name: "Toxicodendron diversilobum",
      organism_group: "Plant / Flora",
      confidence_level: "High",
      status_tag: "DANGEROUS",
      toxicity_aggression_profile: "CONTACT DERMATITIS (Urushiol Oil) — All parts of the plant (leaves, stems, roots, berries), even when leafless in winter, contain potent urushiol oil causing severe itching, inflammation, and blistering rash.",
      identifying_marks: [
        "Trifoliate compound leaves ('Leaves of three, let it be')",
        "Scalloped, lobed leaflets resembling true oak leaves with a glossy/oily sheen",
        "Alternate leaf arrangement along woody or climbing vine stems",
        "Color shifts from glossy bronze-green in spring to bright crimson/orange in autumn",
      ],
      field_description: "A deciduous shrub or climbing woody vine native to western North America, featuring trifoliate leaves with rounded, oak-like lobes. While notorious among hikers for its urushiol resin, it plays an important ecological role for native birds and black-tailed deer, which feed on its whitish drupes and foliage without allergic reaction.",
      leave_no_trace_rule: "DO NOT BRUSH PAST OR HANDLE — Stay in the center of the tread. If your trekking poles, boots, or dog's coat brush the plant, wash gear with cold water and degreasing soap (e.g., Tecnu or dish soap) using gloves, as urushiol remains active on fabric for months.",
      safety_disclaimer: "⚠️ STRICT FLORA DISCLAIMER: Urushiol oil stays active on dead stems, boots, and pet fur, and inhaling smoke from burning plants is a life-threatening medical emergency. Never ingest or handle unidentified wild plants.",
    },
    markdown_report: `## 🌿 TrailSense Organism ID: Western Poison Oak (*Toxicodendron diversilobum*)
**Safety Verdict:** \`[🔴 DANGER]\` • **Status Tag:** \`[DANGEROUS]\`  
**Confidence Level:** \`[High]\`

---

### 1. Identification & Classification
- **Common Name:** Western Poison Oak
- **Scientific Name:** *Toxicodendron diversilobum*
- **Group:** Plant / Flora (Anacardiaceae)

### 2. Safety Verdict & Toxicity Profile
- **Status:** \`[DANGEROUS — AVOID ALL CONTACT]\`
- **Toxicity Profile:** Secretes **urushiol**, a persistent oleoresin present in leaves, stems, roots, and berries year-round. Causes severe allergic contact dermatitis (redness, swelling, weeping blisters) within 12–72 hours of exposure.

### 3. Field Description
Displays characteristic "leaves of three" with rounded, oak-like lobes and a glossy surface that turns brilliant red and orange in late summer and fall. Despite its hazard to humans, native wildlife such as woodrats, deer, and flickers rely on its dense thickets for shelter and late-season berries.

### 4. Leave No Trace & Handling Rule
- **Directive:** **Do not brush past.** Walk single-file in the center of the trail rather than widening the path. If skin contact occurs, rinse with cold water and a lipid-cutting cleanser within 15–30 minutes; decontaminate boots and dog leashes before loading into your vehicle.

> ⚠️ **STRICT SAFETY DISCLAIMER:** Never state or assume 100% toxicity clearance on wild plants or mushrooms. Never ingest or handle unidentified wild flora.`,
  },

  "trillium-ovatum": {
    id: "trillium-ovatum",
    label: "Western Wake-Robin (Trillium)",
    subtitle: "Workflow 2 • Protected Forest Wildflower",
    workflow: "flora_fauna",
    title: "Pacific / Western Trillium (Trillium ovatum)",
    risk_badge: "[🟢 SAFE]",
    summary_tagline: "Harmless, slow-growing understory wildflower; safe to observe closely, but fragile—picking a single flower can kill the underground rhizome.",
    organism_assessment: {
      common_name: "Pacific Trillium (Western Wake-Robin)",
      scientific_name: "Trillium ovatum",
      organism_group: "Plant / Flora",
      confidence_level: "High",
      status_tag: "SAFE TO TOUCH",
      toxicity_aggression_profile: "HARMLESS TO OBSERVE — Non-aggressive and does not cause contact dermatitis when brushed past, though roots/berries contain mild saponins and are not edible.",
      identifying_marks: [
        "Strict rule of threes: 3 large broad-ovate green bracts (leaves) in a single whorl",
        "3 pure white petals that age to rose-pink and deep maroon after pollination",
        "3 green sepals and 6 yellow-anthered stamens at the center",
      ],
      field_description: "An iconic perennial herb of moist coniferous forests featuring a single whorl of three leaves crowned by a solitary three-petaled white blossom. Seeds are dispersed by forest ants (myrmecochory) attracted to the lipid-rich elaiosome attached to each seed, and a single plant takes 7 to 10 years from seed to produce its first flower.",
      leave_no_trace_rule: "SAFE TO BRUSH PAST, NEVER PICK — Because the three bracts are the plant's only photosynthetic organs for the entire year, picking the flower deprives the underground rhizome of energy and often kills the plant.",
      safety_disclaimer: "⚠️ STRICT FORAGING DISCLAIMER: While safe to observe and brush past on the trail, Trillium species contain steroidal saponins and must never be ingested. Never consume wild plants or mushrooms based on AI identification.",
    },
    markdown_report: `## 🌸 TrailSense Organism ID: Pacific Trillium (*Trillium ovatum*)
**Safety Verdict:** \`[🟢 SAFE]\` • **Status Tag:** \`[SAFE TO TOUCH]\`  
**Confidence Level:** \`[High]\`

---

### 1. Identification & Classification
- **Common Name:** Pacific Trillium / Western Wake-Robin
- **Scientific Name:** *Trillium ovatum*
- **Group:** Plant / Flora (Melanthiaceae)

### 2. Safety Verdict & Toxicity Profile
- **Status:** \`[SAFE TO TOUCH — DO NOT PICK OR INGEST]\`
- **Toxicity Profile:** Poses zero contact hazard to hikers brushing past on narrow forest singletrack. Not an edible foraging plant (contains saponins).

### 3. Field Description
Unmistakable symmetry of three broad dark-green leaf-like bracts supporting a solitary flower with three white petals that mature to dusty pink and maroon. Ecologically, it relies on forest ants to carry its seeds underground (*myrmecochory*) and requires 7–10 years of undisturbed growth before blooming.

### 4. Leave No Trace & Handling Rule
- **Directive:** **Look closely, photograph, and never pick.** Plucking a Trillium removes its only photosynthetic leaves, starving the perennial rootstock for years.

> ⚠️ **STRICT SAFETY DISCLAIMER:** Never state 100% toxicity clearance on wild plants or mushrooms. Never ingest unidentified wild flora.`,
  },
};
