"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  Brain,
  Send,
  Bot,
  User,
  ShieldCheck,
  MapPin,
  RefreshCw,
  Droplets,
  Thermometer,
  CloudRain,
  Activity,
  HelpCircle,
} from "lucide-react";
import {
  getAdvisorRecommendations,
  askCopilot,
  getCopilotStatus,
  type AdvisorResponse,
  type CopilotStatusResponse,
} from "@/lib/api";
import { useLocation } from "@/context/LocationContext";

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

function renderInlineText(text: string) {
  const clean = text.replace(/\\([*_`~])/g, "$1");
  const parts = clean.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold text-slate-900">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code key={i} className="font-mono text-emerald-800 bg-emerald-50 px-1 py-0.5 rounded text-[11px]">
          {part.slice(1, -1)}
        </code>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

function FormattedMessage({ text, isUser }: { text: string; isUser: boolean }) {
  if (isUser) {
    return <div className="whitespace-pre-wrap">{text}</div>;
  }

  const normalized = text.replace(/\\([*_`~])/g, "$1").trim();
  const paragraphs = normalized.split(/\n{2,}/);

  return (
    <div className="space-y-2.5 text-slate-800 text-xs">
      {paragraphs.map((p, pIdx) => {
        const lines = p.split("\n").map((l) => l.trim()).filter(Boolean);

        const isNumberedList = lines.length > 0 && lines.every((l) => /^\d+[\.\)]\s/.test(l));
        if (isNumberedList) {
          return (
            <ol key={pIdx} className="space-y-1.5 pl-1 my-1">
              {lines.map((item, i) => {
                const match = item.match(/^(\d+)[\.\)]\s*(.*)$/);
                const num = match ? match[1] : String(i + 1);
                const content = match ? match[2] : item;
                return (
                  <li key={i} className="flex items-start gap-2">
                    <span className="font-bold text-emerald-700 font-mono text-[11px] shrink-0 min-w-4">
                      {num}.
                    </span>
                    <span className="leading-relaxed flex-1">{renderInlineText(content)}</span>
                  </li>
                );
              })}
            </ol>
          );
        }

        const isBulletList = lines.length > 0 && lines.every((l) => /^([•\-\*]|\s*•)\s/.test(l));
        if (isBulletList) {
          return (
            <ul key={pIdx} className="space-y-1 pl-1 my-1">
              {lines.map((item, i) => {
                const content = item.replace(/^([•\-\*]|\s*•)\s*/, "");
                return (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-emerald-700 font-bold shrink-0 mt-0.5">•</span>
                    <span className="leading-relaxed flex-1">{renderInlineText(content)}</span>
                  </li>
                );
              })}
            </ul>
          );
        }

        if (p.startsWith("*") && p.endsWith("*") && !p.includes("\n")) {
          return (
            <p key={pIdx} className="text-[11px] italic text-slate-500 bg-slate-100/70 p-2 rounded border border-slate-200">
              {renderInlineText(p.slice(1, -1))}
            </p>
          );
        }

        return (
          <p key={pIdx} className="leading-relaxed">
            {lines.map((line, lIdx) => (
              <span key={lIdx}>
                {lIdx > 0 && <br />}
                {renderInlineText(line)}
              </span>
            ))}
          </p>
        );
      })}
    </div>
  );
}

export default function AdvisorPage() {
  const { currentLocation, openModal } = useLocation();
  const [lat, setLat] = useState(() => (currentLocation ? String(currentLocation.latitude) : "38.34"));
  const [lon, setLon] = useState(() => (currentLocation ? String(currentLocation.longitude) : "-98.12"));
  const [label, setLabel] = useState(() => (currentLocation ? currentLocation.label : "Kansas Wheat Belt, USA"));
  const [loading, setLoading] = useState(false);
  const [copilotLoading, setCopilotLoading] = useState(false);
  const [copilotStatus, setCopilotStatus] = useState<CopilotStatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AdvisorResponse | null>(null);
  const activeRevisionRef = useRef(0);

  // Sync with universal LocationContext
  useEffect(() => {
    if (currentLocation && typeof currentLocation.latitude === "number" && typeof currentLocation.longitude === "number") {
      setData(null);
      activeRevisionRef.current += 1;
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
      text: "Greetings. I am your Farmer Action Copilot. Once you initialize telemetry for your target coordinates, you can query specific crop rotation, irrigation scheduling, and soil management strategies grounded directly in NASA Earth observations.",
      timestamp: "Ready",
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
    const thisRevision = ++activeRevisionRef.current;
    setLoading(true);
    setError(null);
    setData(null);

    try {
      const res = await getAdvisorRecommendations({
        latitude: latN,
        longitude: lonN,
        label: label || "Selected Location",
      });

      if (activeRevisionRef.current !== thisRevision) {
        return;
      }

      setData(res);

      setChatMessages((prev) => [
        ...prev,
        {
          id: `copilot-${msgCounter.current++}`,
          sender: "copilot",
          text: `Agroclimatological telemetry synchronized for **${res.location.label}** (${res.location.latitude.toFixed(2)}°N, ${res.location.longitude.toFixed(2)}°E). Identified **${res.adaptation_strategies.length}** evidence-grounded adaptation pathways from NASA POWER MERRA-2 observations. What specific guidance would you like?`,
          evidenceBasis: "NASA POWER MERRA-2 reanalysis (PRECTOTCORR, T2M, GWETROOT)",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } catch (e: unknown) {
      if (activeRevisionRef.current === thisRevision) {
        setError(e instanceof Error ? e.message : "Advisor analysis error.");
      }
    } finally {
      if (activeRevisionRef.current === thisRevision) {
        setLoading(false);
      }
    }
  }, [lat, lon, label]);

  // Check OpenRouter / Copilot status on mount
  useEffect(() => {
    getCopilotStatus()
      .then(setCopilotStatus)
      .catch(() => setCopilotStatus({ ai_powered: false, status: "fallback_mode", model: null }));
  }, []);

  // Auto-initialize selected location on initial load
  useEffect(() => {
    runAnalysis();
  }, [runAnalysis]);

  const handleSendQuestion = async (questionText?: string) => {
    const q = (questionText || inputQuestion).trim();
    if (!q || copilotLoading) return;

    const latN = parseFloat(lat);
    const lonN = parseFloat(lon);

    if (data && (Math.abs(data.location.latitude - latN) > 0.1 || Math.abs(data.location.longitude - lonN) > 0.1)) {
      setChatMessages((prev) => [
        ...prev,
        {
          id: `user-${msgCounter.current++}`,
          sender: "user",
          text: q,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
        {
          id: `copilot-mismatch-${msgCounter.current++}`,
          sender: "copilot",
          text: `⚠️ **Location Mismatch Guard Active**\n\nYour active coordinates are **${label} (${latN.toFixed(4)}, ${lonN.toFixed(4)})**, but the loaded dataset belongs to **${data.location.label} (${data.location.latitude.toFixed(4)}, ${data.location.longitude.toFixed(4)})**.\n\nPlease click **"Sync Location Telemetry"** in the sidebar to retrieve verified NASA observations for ${label}.`,
          modelBadge: "Location Integrity Engine",
          isAi: false,
          evidenceBasis: "Cross-location telemetry mismatch blocked",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
      setInputQuestion("");
      return;
    }

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
          text: `📍 **Please initialize telemetry for ${label} (${latN.toFixed(2)}°, ${lonN.toFixed(2)}°) first.**\n\nClick **"Sync Location Telemetry"** so I can ground recommendations in real NASA observations without substituting benchmark data.`,
          modelBadge: "Location Integrity Engine",
          isAi: false,
          evidenceBasis: "Awaiting telemetry synchronization",
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
      const res = await askCopilot({
        question: q,
        requested_latitude: latN,
        requested_longitude: lonN,
        canonical_location_label: label,
        location_revision: activeRevisionRef.current,
        data_latitude: data ? data.location.latitude : undefined,
        data_longitude: data ? data.location.longitude : undefined,
        data_retrieval_timestamp: data ? new Date().toISOString() : undefined,
        advisor_context: data as unknown as Record<string, unknown> | null,
      });

      setChatMessages((prev) => [
        ...prev,
        {
          id: `copilot-${msgCounter.current++}`,
          sender: "copilot",
          text: res.reply,
          modelBadge: res.mismatch_detected
            ? "Location Integrity Engine"
            : res.ai_powered
            ? res.model || "OpenRouter LLM"
            : "NASA Scientific Rules Engine",
          isAi: res.ai_powered,
          disclaimer: res.disclaimer,
          evidenceBasis: res.location_match && data
            ? `NASA POWER (${data.location.latitude.toFixed(2)}°N, ${data.location.longitude.toFixed(2)}°E)`
            : "Location Mismatch Guard Active",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } catch (err: unknown) {
      setChatMessages((prev) => [
        ...prev,
        {
          id: `copilot-err-${msgCounter.current++}`,
          sender: "copilot",
          text: `⚠️ Error contacting Copilot: ${err instanceof Error ? err.message : "Network error"}. Please check backend connection.`,
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
    <div className="max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-4">
      {/* ── Feature Discovery Banner: Farmer Action Copilot ─────────── */}
      <div className="grad-copilot rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-3xl">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-white/20 text-white backdrop-blur-sm border border-white/30">
                Conversational Agronomic Workspace
              </span>
              <span className="text-xs text-purple-200 font-mono">OpenRouter LLM · Strict 0.1° Guard</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              Evidence-Grounded AI Farming Advisor
            </h1>
            <p className="text-xs sm:text-sm text-purple-100/90 leading-relaxed">
              Consult with an agronomic copilot bounded strictly by empirical NASA Earth observations. Query crop rotation viability, deficit irrigation strategies, and heat stress mitigation with transparent data citation.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <span className="px-3 py-1.5 rounded-lg bg-black/25 backdrop-blur-md border border-white/20 text-xs font-mono text-purple-200">
              {copilotStatus?.ai_powered ? "AI Active" : "Rules Engine"} · Zero Stale Telemetry
            </span>
          </div>
        </div>
      </div>

      {/* ── Top Bar: Compact Status & Sync ──────────────────────────── */}
      <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#0d3b2e] flex items-center justify-center text-emerald-400 shrink-0">
            <Brain className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-900">Farmer Action Copilot</h1>
              <span className="text-[10px] font-semibold uppercase text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Evidence-Grounded AI
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Interactive agronomic intelligence strictly bounded by NASA Earth observations.
            </p>
          </div>
        </div>

        {/* Model Status Pill */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-50 border border-slate-200 text-xs">
            <span className={`w-2 h-2 rounded-full ${copilotStatus?.ai_powered ? "bg-emerald-500" : "bg-amber-500"}`} />
            <span className="font-semibold text-slate-800">
              {copilotStatus?.ai_powered ? "OpenRouter AI" : "Scientific Rules Fallback"}
            </span>
            {copilotStatus?.model && (
              <span className="text-[10px] text-slate-500 font-mono hidden md:inline">
                ({copilotStatus.model})
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Main Conversational Workspace (Chat + Context Sidebar) ───── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Central Chat Interface (8 cols / ~67%) */}
        <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200 shadow-2xs flex flex-col h-[700px] overflow-hidden">
          {/* Chat Stream Header */}
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
            <div className="flex items-center gap-2">
              <Bot className="w-4 h-4 text-[#0d3b2e]" />
              <span className="text-xs font-bold text-slate-800">
                Agronomic Consultation Stream
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                {data ? `&bull; ${data.location.label}` : "&bull; Awaiting Sync"}
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">
              Strict 0.1° Coordinate Verification
            </span>
          </div>

          {/* Messages Scroll Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {chatMessages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.sender === "copilot" && (
                  <div className="w-7 h-7 rounded-md bg-[#0d3b2e] text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-xl px-4 py-3 text-xs leading-relaxed ${
                    msg.sender === "user"
                      ? "bg-[#0d3b2e] text-white"
                      : "bg-slate-50 border border-slate-200 text-slate-800"
                  }`}
                >
                  <FormattedMessage text={msg.text} isUser={msg.sender === "user"} />

                  {/* Evidence & Provenance Footnotes */}
                  {(msg.evidenceBasis || msg.modelBadge) && (
                    <div className="mt-2 pt-2 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-1 text-[10px] text-slate-500">
                      {msg.modelBadge && (
                        <span className="font-mono font-medium text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                          {msg.modelBadge}
                        </span>
                      )}
                      {msg.evidenceBasis && (
                        <span className="truncate max-w-[280px]">
                          Basis: {msg.evidenceBasis}
                        </span>
                      )}
                      {msg.timestamp && (
                        <span className="font-mono text-slate-400">{msg.timestamp}</span>
                      )}
                    </div>
                  )}
                </div>

                {msg.sender === "user" && (
                  <div className="w-7 h-7 rounded-md bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))}

            {copilotLoading && (
              <div className="flex gap-3 items-center text-xs text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-200 w-fit">
                <Brain className="w-4 h-4 text-[#0d3b2e] animate-spin" />
                <span>Evaluating biophysical observations and formulating response...</span>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Suggested Prompts Strip */}
          <div className="px-4 py-2 border-t border-slate-100 bg-slate-50/50 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <span className="text-[10px] font-bold text-slate-400 uppercase shrink-0">Ask:</span>
            {SUGGESTED_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                onClick={() => handleSendQuestion(prompt)}
                disabled={copilotLoading}
                className="text-[11px] px-2.5 py-1 rounded-md border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 transition shrink-0 cursor-pointer"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Input Box */}
          <div className="p-3 border-t border-slate-200 bg-white">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendQuestion();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={inputQuestion}
                onChange={(e) => setInputQuestion(e.target.value)}
                placeholder="Ask about crop rotation viability, moisture stress, or irrigation timing..."
                disabled={copilotLoading}
                className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-md outline-none focus:border-[#0d3b2e] focus:bg-white transition"
              />
              <button
                type="submit"
                disabled={copilotLoading || !inputQuestion.trim()}
                className="px-4 py-2 bg-[#0d3b2e] hover:bg-[#134e39] text-white rounded-md text-xs font-semibold shadow-2xs transition disabled:opacity-40 flex items-center gap-1.5 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5 text-emerald-400" />
                <span>Send</span>
              </button>
            </form>
          </div>
        </div>

        {/* Dedicated Context & Evidence Sidebar (4 cols / ~33%) */}
        <div className="lg:col-span-4 space-y-3">
          {/* Active Target & Sync Card */}
          <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-2xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#0d3b2e]" />
                <span>Active Target Coordinate</span>
              </span>
              <button
                onClick={openModal}
                className="text-[11px] font-semibold text-[#0d3b2e] hover:underline"
              >
                Change
              </button>
            </div>

            <div>
              <div className="text-sm font-bold text-slate-900">{label}</div>
              <div className="text-xs font-mono text-slate-500 mt-0.5">
                {parseFloat(lat).toFixed(4)}°N, {parseFloat(lon).toFixed(4)}°E
              </div>
            </div>

            <button
              onClick={runAnalysis}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2 bg-slate-100 hover:bg-slate-200 text-slate-900 font-semibold text-xs rounded-md border border-slate-200 transition disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-[#0d3b2e]" : "text-slate-600"}`} />
              <span>{loading ? "Syncing Telemetry..." : "Sync Location Telemetry"}</span>
            </button>

            {error && (
              <div className="p-2 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-md">
                {error}
              </div>
            )}
          </div>

          {/* Environmental Evidence Metrics */}
          {data ? (
            <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-2xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-[#0d3b2e]" />
                  <span>Observed Evidence</span>
                </span>
                <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                  NASA Verified
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="p-2 rounded-md bg-slate-50 border border-slate-200">
                  <div className="text-[10px] text-slate-500 flex items-center gap-1">
                    <CloudRain className="w-3 h-3 text-blue-600" />
                    <span>Drought Index</span>
                  </div>
                  <div className="text-sm font-bold text-slate-900 mt-0.5">
                    SPI-3: {typeof data.environmental_context.spi_3_recent === "number" ? data.environmental_context.spi_3_recent.toFixed(2) : "N/A"}
                  </div>
                  <div className="text-[10px] text-slate-500 truncate">
                    {typeof data.environmental_context.precip_trend === "string" ? `Trend: ${data.environmental_context.precip_trend}` : "MERRA-2 Model"}
                  </div>
                </div>

                <div className="p-2 rounded-md bg-slate-50 border border-slate-200">
                  <div className="text-[10px] text-slate-500 flex items-center gap-1">
                    <Droplets className="w-3 h-3 text-cyan-600" />
                    <span>Root Wetness</span>
                  </div>
                  <div className="text-sm font-bold text-slate-900 mt-0.5">
                    {typeof data.environmental_context.root_zone_wetness === "number" ? `${(data.environmental_context.root_zone_wetness * 100).toFixed(1)}%` : "N/A"}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Threshold: 25%
                  </div>
                </div>

                <div className="p-2 rounded-md bg-slate-50 border border-slate-200">
                  <div className="text-[10px] text-slate-500 flex items-center gap-1">
                    <Thermometer className="w-3.5 h-3.5 text-amber-600" />
                    <span>Mean Temp</span>
                  </div>
                  <div className="text-sm font-bold text-slate-900 mt-0.5">
                    {typeof data.environmental_context.temperature_c === "number" ? `${data.environmental_context.temperature_c.toFixed(1)} °C` : "N/A"}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Daily 2m Air Temp
                  </div>
                </div>

                <div className="p-2 rounded-md bg-slate-50 border border-slate-200">
                  <div className="text-[10px] text-slate-500 flex items-center gap-1">
                    <Activity className="w-3 h-3 text-[#0d3b2e]" />
                    <span>GDD Total</span>
                  </div>
                  <div className="text-sm font-bold text-slate-900 mt-0.5">
                    {typeof data.environmental_context.cumulative_gdd === "number" ? `${data.environmental_context.cumulative_gdd.toFixed(0)} °C·d` : "N/A"}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Base 10°C
                  </div>
                </div>
              </div>

              {/* Recommended Strategies Preview */}
              {data.adaptation_strategies.length > 0 && (
                <div className="pt-2 border-t border-slate-100 space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                    Top Strategic Adaptation
                  </span>
                  <div className="p-2.5 rounded-md bg-slate-50 border border-slate-200 text-xs">
                    <div className="font-semibold text-slate-900">{data.adaptation_strategies[0].title}</div>
                    <div className="text-[11px] text-slate-600 mt-0.5 line-clamp-2">
                      {data.adaptation_strategies[0].strategies?.[0] || data.adaptation_strategies[0].data_basis}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-xl p-4 border border-slate-200 text-center text-xs text-slate-500 space-y-1 shadow-2xs">
              <HelpCircle className="w-6 h-6 text-slate-300 mx-auto" />
              <div>Telemetry uninitialized. Click sync to load NASA evidence.</div>
            </div>
          )}

          {/* Location Integrity Guard Info */}
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-[11px] text-slate-600 space-y-1">
            <div className="font-semibold text-slate-800 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[#0d3b2e]" />
              <span>Location Integrity Enforcement</span>
            </div>
            <p className="leading-relaxed">
              Every query verifies that requested coordinates match environmental telemetry within 0.1° (~11 km). Cross-location pollution is strictly blocked.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
