"use client";

import { useState, useEffect, useRef, useCallback } from "react";

/* ─── Types ─── */
type Ambience = "forest" | "ocean" | "mountain";

interface Entry {
  id: number;
  createdAt: string;
  ambience: string;
  text: string;
  emotion: string;
  keywords: string[];
}

interface Analysis {
  emotion: string;
  keywords: string[];
  summary: string;
}

interface Insights {
  totalEntries: number;
  topEmotion: string | null;
  mostUsedAmbience: string | null;
  recentKeywords: string[];
}

/* ─── Theme config ─── */
const THEME: Record<
  Ambience,
  {
    icon: string;
    label: string;
    tagline: string;
    bg: string;
    particleColors: string[];
    accent: string;
    badge: string;
    headingColor: string;
    ring: string;
  }
> = {
  forest: {
    icon: "🌲",
    label: "Forest",
    tagline: "Among the ancient trees",
    bg: "bg-gradient-to-br from-forest-50 via-forest-100 to-forest-200",
    particleColors: ["#16a34a", "#22c55e", "#4ade80", "#86efac"],
    accent: "bg-forest-600 hover:bg-forest-700",
    badge: "bg-forest-100 text-forest-800",
    headingColor: "text-forest-900",
    ring: "focus:ring-forest-500/30",
  },
  ocean: {
    icon: "🌊",
    label: "Ocean",
    tagline: "By the endless waves",
    bg: "bg-gradient-to-br from-ocean-50 via-ocean-100 to-ocean-200",
    particleColors: ["#0891b2", "#06b6d4", "#22d3ee", "#67e8f9"],
    accent: "bg-ocean-600 hover:bg-ocean-700",
    badge: "bg-ocean-100 text-ocean-800",
    headingColor: "text-ocean-900",
    ring: "focus:ring-ocean-500/30",
  },
  mountain: {
    icon: "⛰️",
    label: "Mountain",
    tagline: "Above the clouds",
    bg: "bg-gradient-to-br from-mountain-50 via-mountain-100 to-mountain-200",
    particleColors: ["#9333ea", "#a855f7", "#c084fc", "#d8b4fe"],
    accent: "bg-mountain-600 hover:bg-mountain-700",
    badge: "bg-mountain-100 text-mountain-800",
    headingColor: "text-mountain-900",
    ring: "focus:ring-mountain-500/30",
  },
};

/* ─── Particles ─── */
function Particles({ ambience }: { ambience: Ambience }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.innerHTML = "";
    const colors = THEME[ambience].particleColors;
    for (let i = 0; i < 28; i++) {
      const dot = document.createElement("div");
      dot.className = "particle";
      const size = 4 + Math.random() * 10;
      dot.style.width = `${size}px`;
      dot.style.height = `${size}px`;
      dot.style.left = `${Math.random() * 100}%`;
      dot.style.background = colors[Math.floor(Math.random() * colors.length)];
      dot.style.animationDuration = `${8 + Math.random() * 14}s`;
      dot.style.animationDelay = `${Math.random() * 10}s`;
      el.appendChild(dot);
    }
  }, [ambience]);

  return (
    <div
      ref={ref}
      className="fixed inset-0 pointer-events-none overflow-hidden z-0"
    />
  );
}

/* ─── Glass Card ─── */
function Glass({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`bg-white/50 backdrop-blur-xl border border-black/[0.06] rounded-2xl shadow-lg
        hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 p-6 mb-6 ${className}`}
    >
      {children}
    </div>
  );
}

/* ─── Main App ─── */
export default function Home() {
  const [userId, setUserId] = useState("123");
  const [ambience, setAmbience] = useState<Ambience>("forest");
  const [text, setText] = useState("");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [insights, setInsights] = useState<Insights | null>(null);
  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  const t = THEME[ambience];

  const loadEntries = useCallback(async () => {
    const res = await fetch(`/api/journal/${encodeURIComponent(userId)}`);
    setEntries(await res.json());
  }, [userId]);

  const loadInsights = useCallback(async () => {
    const res = await fetch(
      `/api/journal/insights/${encodeURIComponent(userId)}`
    );
    setInsights(await res.json());
  }, [userId]);

  const submitEntry = async () => {
    if (!text.trim()) return;
    setSaving(true);
    await fetch("/api/journal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, ambience, text }),
    });
    setText("");
    setSaving(false);
    loadEntries();
    loadInsights();
  };

  const analyzeText = async () => {
    if (!text.trim()) return;
    setAnalyzing(true);
    const res = await fetch("/api/journal/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    setAnalysis(await res.json());
    setAnalyzing(false);
  };

  useEffect(() => {
    loadEntries();
    loadInsights();
  }, [loadEntries, loadInsights]);

  return (
    <div
      className={`min-h-screen transition-all duration-700 ${t.bg}`}
      style={{ fontFamily: "var(--font-inter), sans-serif" }}
    >
      <Particles ambience={ambience} />

      <div className="relative z-10 max-w-3xl mx-auto px-5 pt-10 pb-16">
        {/* ── Header ── */}
        <header className="text-center mb-10 animate-fade-in-up">
          <h1
            className={`text-4xl md:text-5xl font-bold tracking-tight ${t.headingColor}`}
            style={{ fontFamily: "var(--font-playfair), serif" }}
          >
            {t.icon} ArvyaX Journal
          </h1>
          <p className="mt-2 text-sm italic opacity-60">{t.tagline}</p>
        </header>

        {/* ── Compose Card ── */}
        <Glass>
          <h2
            className={`text-xl font-semibold mb-5 flex items-center gap-2 ${t.headingColor}`}
            style={{ fontFamily: "var(--font-playfair), serif" }}
          >
            ✍️ New Entry
          </h2>

          {/* User ID */}
          <div className="mb-4">
            <label className="block text-xs uppercase tracking-widest opacity-60 mb-1.5">
              Your ID
            </label>
            <input
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="Enter your user ID"
              className={`w-full px-4 py-3 rounded-xl bg-white/60 border border-black/[0.08]
                text-gray-800 placeholder-gray-400 outline-none transition-all
                focus:bg-white/80 focus:border-black/15 focus:ring-2 ${t.ring}`}
            />
          </div>

          {/* Ambience picker */}
          <div className="mb-4">
            <label className="block text-xs uppercase tracking-widest opacity-60 mb-1.5">
              Choose Ambience
            </label>
            <div className="grid grid-cols-3 gap-3">
              {(["forest", "ocean", "mountain"] as Ambience[]).map((a) => (
                <button
                  key={a}
                  onClick={() => setAmbience(a)}
                  className={`flex flex-col items-center gap-1 py-3 rounded-xl border-2 transition-all duration-300 cursor-pointer
                    ${
                      ambience === a
                        ? `border-current ${THEME[a].badge} shadow-md`
                        : "border-transparent bg-white/40 hover:bg-white/60 text-gray-500"
                    }`}
                >
                  <span className="text-2xl">{THEME[a].icon}</span>
                  <span className="text-xs font-semibold uppercase tracking-wide">
                    {THEME[a].label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Text area */}
          <div className="mb-4">
            <label className="block text-xs uppercase tracking-widest opacity-60 mb-1.5">
              Your Thoughts
            </label>
            <textarea
              rows={5}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Let nature inspire your words…"
              className={`w-full px-4 py-3 rounded-xl bg-white/60 border border-black/[0.08]
                text-gray-800 placeholder-gray-400 outline-none transition-all resize-y min-h-[130px] leading-relaxed
                focus:bg-white/80 focus:border-black/15 focus:ring-2 ${t.ring}`}
            />
          </div>

          {/* Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={submitEntry}
              disabled={saving || !text.trim()}
              className={`flex items-center justify-center gap-2 py-3 rounded-xl text-white font-semibold
                transition-all duration-300 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${t.accent}`}
            >
              💾 {saving ? "Saving…" : "Save Entry"}
            </button>
            <button
              onClick={analyzeText}
              disabled={analyzing || !text.trim()}
              className="flex items-center justify-center gap-2 py-3 rounded-xl bg-white/50 border border-black/[0.08]
                text-gray-600 font-semibold transition-all duration-300 hover:bg-white/70 hover:text-gray-900
                disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              🔬 {analyzing ? "Analyzing…" : "Analyze"}
            </button>
          </div>
        </Glass>

        {/* ── Analysis ── */}
        {analysis && (
          <Glass className="animate-fade-in-up">
            <h2
              className={`text-xl font-semibold mb-4 flex items-center gap-2 ${t.headingColor}`}
              style={{ fontFamily: "var(--font-playfair), serif" }}
            >
              🧠 Analysis
            </h2>
            <div className="flex flex-wrap gap-2 mb-3">
              <span
                className={`px-3 py-1.5 rounded-full text-xs font-medium ${t.badge}`}
              >
                🎭 {analysis.emotion}
              </span>
              {(analysis.keywords || []).map((kw, i) => (
                <span
                  key={i}
                  className="px-3 py-1.5 rounded-full text-xs font-medium bg-white/50 border border-black/[0.06] text-gray-600"
                >
                  🏷️ {kw}
                </span>
              ))}
            </div>
            <p className="text-sm italic text-gray-500 leading-relaxed">
              {analysis.summary}
            </p>
          </Glass>
        )}

        {/* ── Insights ── */}
        {insights && (
          <Glass className="animate-fade-in-up">
            <h2
              className={`text-xl font-semibold mb-5 flex items-center gap-2 ${t.headingColor}`}
              style={{ fontFamily: "var(--font-playfair), serif" }}
            >
              📊 Insights
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { value: insights.totalEntries, label: "Entries" },
                { value: insights.topEmotion || "—", label: "Top Emotion" },
                {
                  value: insights.mostUsedAmbience
                    ? THEME[insights.mostUsedAmbience as Ambience]?.icon ??
                      insights.mostUsedAmbience
                    : "—",
                  label: "Fav Ambience",
                },
                {
                  value: (insights.recentKeywords || []).length,
                  label: "Keywords",
                },
              ].map((tile, i) => (
                <div
                  key={i}
                  className="bg-white/40 rounded-xl p-4 text-center border border-black/[0.04]"
                >
                  <div
                    className={`text-2xl font-bold ${t.headingColor}`}
                    style={{ fontFamily: "var(--font-playfair), serif" }}
                  >
                    {tile.value}
                  </div>
                  <div className="text-[0.65rem] uppercase tracking-widest opacity-50 mt-1">
                    {tile.label}
                  </div>
                </div>
              ))}
            </div>

            {(insights.recentKeywords || []).length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {insights.recentKeywords.map((kw, i) => (
                  <span
                    key={i}
                    className="px-3 py-1 rounded-full text-xs bg-white/50 border border-black/[0.06] text-gray-600"
                  >
                    {kw}
                  </span>
                ))}
              </div>
            )}
          </Glass>
        )}

        {/* ── Previous Entries ── */}
        <h2
          className={`text-xl font-semibold mt-2 mb-5 flex items-center gap-2 ${t.headingColor}`}
          style={{ fontFamily: "var(--font-playfair), serif" }}
        >
          📖 Previous Entries
        </h2>

        {entries.length === 0 && (
          <div className="text-center py-12 opacity-45">
            <div className="text-4xl mb-2">🍃</div>
            <p className="text-sm">No entries yet. Start writing!</p>
          </div>
        )}

        <div className="space-y-4">
          {entries.map((e) => (
            <div
              key={e.id}
              className="bg-white/50 backdrop-blur-lg border border-black/[0.06] rounded-2xl
                p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg animate-fade-in-up"
            >
              <div className="flex items-center gap-3 text-xs text-gray-400 mb-3">
                <span>{e.createdAt}</span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[0.65rem] font-semibold uppercase tracking-wide ${
                    THEME[e.ambience as Ambience]?.badge ??
                    "bg-gray-100 text-gray-600"
                  }`}
                >
                  {THEME[e.ambience as Ambience]?.icon ?? ""} {e.ambience}
                </span>
              </div>
              <p className="text-gray-700 leading-relaxed mb-2">{e.text}</p>
              <p className="text-xs text-gray-400">🎭 {e.emotion}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
