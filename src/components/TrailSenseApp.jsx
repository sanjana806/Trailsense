import React, { useState, useEffect, useRef, useMemo } from "react";

/**
 * TrailSense: Touch Grass Safely — "Moss & Granite" React + Tailwind CSS Component
 *
 * Palette:
 *  - Deep Forest Emerald: #1C3F2E (`forest`)
 *  - Hunter Green:        #2D5A43 (`hunter`)
 *  - Sunlit Lichen/Gold:  #E3B341 (`lichen`)
 *  - Terracotta Amber:    #C86D51 (`terracotta`)
 *  - Warm Sand/Parchment: #F9F8F3 (`parchment`)
 *  - Muted Slate/Granite: #2C3333 (`granite`)
 *  - Border Line:         #E2DFD2 (`sandline`)
 */
export const WEATHER_STATIONS = [
  {
    id: "cascade-pass",
    name: "Cascade Pass • 6,200 ft",
    wind: "14 mph WNW (Gusts 22)",
    temp: "46°F • Crisp Alpine",
    uv: "UV 6 (High)",
    sunsetOffsetSec: 6435,
  },
  {
    id: "redwood-ravine",
    name: "Redwood Understory • 840 ft",
    wind: "4 mph SW (Canopy Sheltered)",
    temp: "58°F • Damp Loam",
    uv: "UV 2 (Low)",
    sunsetOffsetSec: 8120,
  },
  {
    id: "sierra-granite",
    name: "Sierra High Route • 10,900 ft",
    wind: "24 mph NW (Ridge Advisory)",
    temp: "39°F • Freeze-Thaw",
    uv: "UV 9 (Very High)",
    sunsetOffsetSec: 4980,
  },
];

export default function TrailSenseApp({ apiBaseUrl = "" }) {
  const [stationIndex, setStationIndex] = useState(0);
  const [sunsetRemaining, setSunsetRemaining] = useState(
    WEATHER_STATIONS[0].sunsetOffsetSec
  );
  const [offlineMode, setOfflineMode] = useState(false);
  const [activeWorkflow, setActiveWorkflow] = useState("trail_terrain");
  const [assessment, setAssessment] = useState(null);
  const [checkedGear, setCheckedGear] = useState({});

  const currentStation = WEATHER_STATIONS[stationIndex];

  useEffect(() => {
    setSunsetRemaining(currentStation.sunsetOffsetSec);
  }, [stationIndex, currentStation.sunsetOffsetSec]);

  useEffect(() => {
    const timer = setInterval(() => {
      setSunsetRemaining((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetch(`${apiBaseUrl}/api/presets/alpine-scree`)
      .then((r) => r.json())
      .then((data) => setAssessment(data))
      .catch(() => {});
  }, [apiBaseUrl]);

  const activeGearList = useMemo(() => {
    return assessment?.trail_assessment?.gear_checklist || [];
  }, [assessment]);

  const checkedCount = useMemo(
    () => activeGearList.filter((g) => checkedGear[g.item]).length,
    [activeGearList, checkedGear]
  );

  const readinessScore = useMemo(() => {
    if (!activeGearList.length) return 82;
    return Math.min(
      99,
      50 + Math.round((checkedCount / activeGearList.length) * 49)
    );
  }, [activeGearList.length, checkedCount]);

  return (
    <div className="min-h-screen bg-[#F9F8F3] text-[#2C3333] font-sans">
      {/* See public/app.js for the full interactive browser bundle served at http://localhost:3456 */}
      <div className="max-w-6xl mx-auto p-6">
        <h1 className="font-serif text-3xl font-bold text-[#1C3F2E]">
          TrailSense: Touch Grass Safely ({readinessScore}% Ready)
        </h1>
        <p className="text-sm text-[#2C3333]/80 mt-1">
          Station: {currentStation.name} • {currentStation.wind} •{" "}
          {currentStation.uv} • {offlineMode ? "Offline Kit" : "Live Sync"} •
          Mode: {activeWorkflow}
        </p>
      </div>
    </div>
  );
}
