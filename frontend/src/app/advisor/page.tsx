"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  Brain,
  Send,
  Bot,
  User,
  Sparkles,
  ShieldCheck,
  Compass,
  AlertTriangle,
  Globe2,
  Cpu,
} from "lucide-react";
import {
  getAdvisorRecommendations,
  askCopilot,
  getCopilotStatus,
  type AdvisorResponse,
  type CopilotStatusResponse,
} from "@/lib/api";
import { useLocation } from "@/context/LocationContext";
import GlobalLocationBar from "@/components/GlobalLocationBar";

const DEMO_LOCATIONS = [
  { label: "Kansas Wheat Belt, USA", lat: 38.34, lon: -98.12, region: "North America" },
  { label: "Punjab Plain, India", lat: 30.73, lon: 76.78, region: "South Asia" },
  { label: "California Central Valley, USA", lat: 36.75, lon: -119.77, region: "North America" },
  { label: "Sahel Sudano-Sahelian Belt, Mali", lat: 14.5, lon: -4.0, region: "Sub-Saharan Africa" },
  { label: "Po Valley Cereal Plain, Italy", lat: 44.8, lon: 11.0, region: "Southern Europe" },
];

const SUGGESTED_PROMPTS = [
  "Should I plant maize or sorghum given recent root-zone moisture deficits?",
  "What cover crop is optimal for soil recovery and nitrogen fixing right now?",
  "How should I adapt my irrigation schedule based on NASA MERRA-2 soil data?",
  "What is the biophysical evidence behind the current agricultural stress alert?",
];

interface ChatMessage {
  id: string;
  sender: "user" | "copilot";
  text: string;
  evidenceBasis?: string;
  modelBadge?: string;
  isAi?: boolean;
  disclaimer?: string;
  timestamp?: string;
}

export default function AdvisorPage() {
  const { currentLocation } = useLocation();
  const [lat, setLat] = useState(() => (currentLocation ? String(currentLocation.latitude) : "38.34"));
  const [lon, setLon] = useState(() => (currentLocation ? String(currentLocation.longitude) : "-98.12"));
  const [label, setLabel] = useState(() => (currentLocation ? currentLocation.label : "Kansas Wheat Belt, USA"));
  const [loading, setLoading] = useState(false);
  const [copilotLoading, setCopilotLoading] = useState(false);
  const [copilotStatus, setCopilotStatus] = useState<CopilotStatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AdvisorResponse | null>(null);

  // Sync with universal LocationContext
  useEffect(() => {
    if (currentLocation && typeof currentLocation.latitude === "number" && typeof currentLocation.longitude === "number") {
      setLat(String(currentLocation.latitude));
      setLon(String(currentLocation.longitude));
      if (currentLocation.label) setLabel(currentLocation.label);
    }
  }, [currentLocation]);

  // Copilot Chat State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      sender: "copilot",
      text: "Greetings. I am your Farmer Action Copilot. Once you analyze a field location, you can query specific crop rotation, irrigation scheduling, and soil management strategies grounded directly in NASA Earth observations.",
      timestamp: "System Initialized",
    },
  ]);
  const [inputQuestion, setInputQuestion] = useState("");
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const msgCounter = useRef(1);

  const runAnalysis = useCallback(async () => {
    const latN = parseFloat(lat);
    const lonN = parseFloat(lon);
    if (isNaN(latN) || isNaN(lonN)) {
      setError("Please enter valid latitude and longitude coordinates.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await getAdvisorRecommendations({
        latitude: latN,
        longitude: lonN,
        label: label || "Selected Location",
      });
      setData(res);

      setChatMessages((prev) => [
        ...prev,
        {
          id: `copilot-${msgCounter.current++}`,
          sender: "copilot",
          text: `Agroclimatological audit completed for ${res.location.label} (${res.location.latitude.toFixed(2)}°N, ${res.location.longitude.toFixed(2)}°E). Identified ${res.adaptation_strategies.length} tailored adaptation pathways grounded in NASA POWER MERRA-2 observations. How can I assist your farm management plan?`,
          evidenceBasis: "NASA POWER MERRA-2 reanalysis (PRECTOTCORR, T2M, GWETROOT)",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Advisor analysis error.");
    } finally {
      setLoading(false);
    }
  }, [lat, lon, label]);

  // Check OpenRouter / Copilot status on mount
  useEffect(() => {
    getCopilotStatus()
      .then(setCopilotStatus)
      .catch(() => setCopilotStatus({ ai_powered: false, status: "fallback_mode", model: null }));
  }, []);

  // Auto-initialize selected location on initial load or change if not yet loaded
  useEffect(() => {
    runAnalysis();
  }, [runAnalysis]);

  const handleSendQuestion = async (questionText?: string) => {
    const q = (questionText || inputQuestion).trim();
    if (!q || copilotLoading) return;

    if (!data) {
      setChatMessages((prev) => [
        ...prev,
        {
          id: `user-${msgCounter.current++}`,
          sender: "user",
          text: q,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
        {
          id: `copilot-notice-${msgCounter.current++}`,
          sender: "copilot",
          text: "📍 **Please select and initialize a field location first.**\n\nClick **\"Initialize Field Copilot\"** above or choose one of the benchmark basins so I can ground recommendations in real NASA POWER and MERRA-2 agroclimatology observations for your exact coordinates.",
          modelBadge: "System",
          isAi: false,
          evidenceBasis: "Location uninitialized — awaiting coordinate selection",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
      setInputQuestion("");
      return;
    }

    const userMsg: ChatMessage = {
      id: `user-${msgCounter.current++}`,
      sender: "user",
      text: q,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setChatMessages((prev) => [...prev, userMsg]);
    setInputQuestion("");
    setCopilotLoading(true);

    try {
      // Call backend server-side OpenRouter / fallback endpoint
      const res = await askCopilot(q, data as unknown as Record<string, unknown> | null);

      setChatMessages((prev) => [
        ...prev,
        {
          id: `copilot-${msgCounter.current++}`,
          sender: "copilot",
          text: res.reply,
          modelBadge: res.ai_powered ? res.model || "OpenRouter AI" : "NASA Scientific Rules Engine",
          isAi: res.ai_powered,
          disclaimer: res.disclaimer,
          evidenceBasis: data
            ? `NASA POWER (${data.location.latitude.toFixed(2)}°N, ${data.location.longitude.toFixed(2)}°E)`
            : currentLocation
            ? `NASA POWER (${currentLocation.latitude.toFixed(2)}°N, ${currentLocation.longitude.toFixed(2)}°E)`
            : "No field initialized yet",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } catch (err: unknown) {
      setChatMessages((prev) => [
        ...prev,
        {
          id: `copilot-err-${msgCounter.current++}`,
          sender: "copilot",
          text: `⚠️ Error contacting Copilot: ${err instanceof Error ? err.message : "Network error"}. Please check the backend connection.`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setCopilotLoading(false);
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#dce8da] shadow-xs relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-[#0b3d91]/10 via-[#2d7a3a]/5 to-transparent rounded-full blur-2xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-xs font-bold text-[#0b3d91]">
              <Brain className="h-3.5 w-3.5" />
              <span>Evidence-Grounded Agronomic Research Assistant</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-[#1a2e1a] tracking-tight">
              Farmer Action Copilot
            </h1>
            <p className="text-sm sm:text-base text-[#4a6741] leading-relaxed">
              Consult an AI agronomist strictly bounded by observed NASA Earth observations.
              Receive evidence-cited recommendations for crop rotation, deficit irrigation, and soil conservation.
            </p>
          </div>

          <button
            onClick={runAnalysis}
            disabled={loading}
            className="inline-flex items-center gap-2 px-6 py-3.5 bg-[#2d7a3a] hover:bg-[#23602d] text-white font-bold text-sm rounded-2xl shadow-md shadow-[#2d7a3a]/20 transition disabled:opacity-50 shrink-0"
          >
            {loading ? (
              <>
                <Globe2 className="h-4 w-4 animate-spin" />
                <span>Querying NASA Observations...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                <span>Initialize Field Copilot</span>
              </>
            )}
          </button>
        </div>

        {/* Location presets */}
        <div className="pt-6 mt-6 border-t border-[#eef4ed] flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-gray-500 mr-1 flex items-center gap-1">
            <Compass className="h-3.5 w-3.5 text-[#2d7a3a]" /> Benchmark Basins:
          </span>
          {DEMO_LOCATIONS.map((l) => (
            <button
              key={l.label}
              onClick={() => {
                setLat(String(l.lat));
                setLon(String(l.lon));
                setLabel(l.label);
              }}
              className={`text-xs px-3 py-1 rounded-xl font-medium transition border ${
                lat === String(l.lat) && lon === String(l.lon)
                  ? "bg-[#2d7a3a] text-white border-[#2d7a3a] shadow-xs"
                  : "bg-[#f8faf7] text-gray-700 border-[#dce8da] hover:bg-[#eef7ec] hover:text-[#2d7a3a]"
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>

      {/* Universal Global Location Context Bar */}
      <GlobalLocationBar />

      {/* Spatial Controls */}
      <div className="bg-white rounded-3xl p-6 border border-[#dce8da] shadow-xs space-y-4">
        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Spatial Target Coordinates</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Target Latitude</label>
            <input
              type="number"
              step="0.0001"
              value={lat}
              onChange={(e) => setLat(e.target.value)}
              className="w-full px-3 py-2 text-xs font-mono bg-[#fbfdfb] border border-[#d2e4d0] rounded-xl outline-none focus:border-[#2d7a3a]"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Target Longitude</label>
            <input
              type="number"
              step="0.0001"
              value={lon}
              onChange={(e) => setLon(e.target.value)}
              className="w-full px-3 py-2 text-xs font-mono bg-[#fbfdfb] border border-[#d2e4d0] rounded-xl outline-none focus:border-[#2d7a3a]"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Field Identifier</label>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="w-full px-3 py-2 text-xs font-bold bg-[#fbfdfb] border border-[#d2e4d0] rounded-xl outline-none focus:border-[#2d7a3a]"
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Copilot Workspace (Chat + Data Basis) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Conversational AI Thread (7 Cols) */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-[#dce8da] shadow-xs flex flex-col h-[620px]">
          {/* Thread Header */}
          <div className="p-4 border-b border-[#eef4ed] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${copilotStatus?.ai_powered ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`}></span>
              <span className="text-xs font-bold text-[#1a2e1a]">
                {copilotStatus?.ai_powered ? "OpenRouter AI Copilot Active" : "Farmer Action Copilot (Rules Engine)"}
              </span>
              <span className="text-[10px] text-gray-400 font-mono">
                {data ? `(Grounded on ${data.location.label})` : "(Awaiting Field Init)"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {copilotStatus?.model && (
                <span className="text-[9px] font-mono text-gray-600 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                  <Cpu className="h-2.5 w-2.5 text-gray-500" />
                  {copilotStatus.model}
                </span>
              )}
              <span className="text-[10px] text-[#2d7a3a] font-bold bg-[#eef7ec] px-2.5 py-0.5 rounded-full">
                {copilotStatus?.ai_powered ? "NASA Grounded LLM" : "NASA Scientific Model"}
              </span>
            </div>
          </div>

          {/* Messages Scroller */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {chatMessages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 text-xs leading-relaxed ${
                  msg.sender === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {msg.sender === "copilot" && (
                  <div className="w-8 h-8 rounded-xl bg-[#2d7a3a] text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Bot className="h-4 w-4" />
                  </div>
                )}

                <div
                  className={`max-w-[80%] rounded-2xl p-4 space-y-2 ${
                    msg.sender === "user"
                      ? "bg-[#2d7a3a] text-white rounded-br-none shadow-xs"
                      : "bg-[#f8faf7] text-[#1a2e1a] border border-[#e2ece0] rounded-bl-none shadow-xs"
                  }`}
                >
                  <p className="whitespace-pre-line">{msg.text}</p>

                  {msg.modelBadge && (
                    <div className="pt-1 text-[9px] font-mono text-gray-500 flex items-center gap-1">
                      <Cpu className="h-2.5 w-2.5 text-[#2d7a3a]" />
                      <span>Generated by: {msg.modelBadge}</span>
                    </div>
                  )}

                  {msg.evidenceBasis && (
                    <div className="pt-2 border-t border-[#dce8da] text-[10px] flex items-center gap-1.5 text-[#2d7a3a] font-semibold">
                      <ShieldCheck className="h-3.5 w-3.5 text-[#2d7a3a] shrink-0" />
                      <span>Evidence Basis: {msg.evidenceBasis}</span>
                    </div>
                  )}

                  {msg.disclaimer && (
                    <div className="text-[9px] text-amber-700 italic">
                      {msg.disclaimer}
                    </div>
                  )}

                  {msg.timestamp && (
                    <div className={`text-[9px] ${msg.sender === "user" ? "text-green-200" : "text-gray-400"} text-right`}>
                      {msg.timestamp}
                    </div>
                  )}
                </div>

                {msg.sender === "user" && (
                  <div className="w-8 h-8 rounded-xl bg-slate-800 text-white flex items-center justify-center shrink-0">
                    <User className="h-4 w-4" />
                  </div>
                )}
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* Suggested Quick Prompts */}
          <div className="p-3 bg-[#f8faf7] border-t border-[#eef4ed] space-y-1.5">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
              Suggested Agronomic Inquiries:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {SUGGESTED_PROMPTS.map((p, i) => (
                <button
                  key={i}
                  onClick={() => handleSendQuestion(p)}
                  className="text-[11px] px-2.5 py-1 bg-white hover:bg-[#eef7ec] hover:text-[#2d7a3a] border border-[#d2e4d0] rounded-lg transition text-left text-gray-700"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Input Box */}
          <div className="p-3 bg-white border-t border-[#eef4ed] rounded-b-3xl">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendQuestion();
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                value={inputQuestion}
                onChange={(e) => setInputQuestion(e.target.value)}
                placeholder={
                  copilotLoading
                    ? "Consulting Copilot..."
                    : "Ask your agronomic Copilot about irrigation, soil wetness, or crop rotation..."
                }
                disabled={copilotLoading}
                className="flex-1 px-4 py-2.5 text-xs bg-[#fbfdfb] border border-[#d2e4d0] rounded-xl outline-none focus:ring-2 focus:ring-[#2d7a3a]/20 focus:border-[#2d7a3a] disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={!inputQuestion.trim() || copilotLoading}
                className="px-4 py-2.5 bg-[#2d7a3a] hover:bg-[#23602d] text-white rounded-xl text-xs font-bold transition disabled:opacity-40 flex items-center gap-1.5"
              >
                <span>{copilotLoading ? "Analyzing..." : "Send"}</span>
                {copilotLoading ? (
                  <Globe2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Grounded Environmental Context & Adaptation Pathways (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          {data ? (
            <div className="space-y-6">
              {/* Evidence Summary Card */}
              <div className="bg-white rounded-3xl p-6 border border-[#dce8da] shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-[#eef4ed] pb-3">
                  <h3 className="text-sm font-bold text-[#1a2e1a]">Biophysical Evidence Context</h3>
                  <span className="text-[10px] font-mono text-[#2d7a3a] bg-[#eef7ec] px-2 py-0.5 rounded-full">
                    NASA POWER
                  </span>
                </div>

                <div className="space-y-2">
                  {data.evidence_summary.map((ev, i) => (
                    <div
                      key={i}
                      className="p-3 bg-[#f8faf7] rounded-xl text-xs text-gray-700 flex items-start gap-2 border border-[#eef4ed]"
                    >
                      <ShieldCheck className="h-4 w-4 text-[#2d7a3a] shrink-0 mt-0.5" />
                      <span>{ev}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Adaptation Pathways */}
              <div className="bg-white rounded-3xl p-6 border border-[#dce8da] shadow-xs space-y-4">
                <h3 className="text-sm font-bold text-[#1a2e1a] border-b border-[#eef4ed] pb-3">
                  Synthesized Adaptation Pathways
                </h3>

                <div className="space-y-3">
                  {data.adaptation_strategies.map((strat, i) => (
                    <div key={i} className="p-4 rounded-2xl bg-[#fafcf9] border border-[#e2ece0] space-y-2">
                      <div className="text-xs font-bold text-[#2d7a3a]">{strat.title}</div>
                      <ul className="space-y-1 text-xs text-gray-600 list-disc list-inside">
                        {strat.strategies.map((s, si) => (
                          <li key={si}>{s}</li>
                        ))}
                      </ul>
                      <div className="text-[10px] text-gray-400 font-mono pt-1">Basis: {strat.data_basis}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-center p-8 bg-white rounded-3xl border border-dashed border-[#cfe0cc] space-y-3">
              <div className="p-4 rounded-full bg-[#f0f7ee] text-[#2d7a3a]">
                <Brain className="h-8 w-8" />
              </div>
              <h3 className="font-bold text-[#1a2e1a] text-sm">Copilot Telemetry Inactive</h3>
              <p className="text-xs text-[#4a6741] max-w-xs">
                Click &quot;Initialize Field Copilot&quot; to fetch NASA agroclimatology for the specified location coordinates.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
