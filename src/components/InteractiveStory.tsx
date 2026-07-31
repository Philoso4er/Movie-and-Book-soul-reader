import React, { useState } from "react";
import { Sparkles, ArrowRight, RotateCcw, History, Compass, ChevronDown, ChevronUp, Feather, BookOpenCheck } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { StoryState, StoryChoiceHistory } from "../types";

export default function InteractiveStory() {
  const [customPrompt, setCustomPrompt] = useState("");
  const [selectedSetting, setSelectedSetting] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [story, setStory] = useState<StoryState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const curatedSettings = [
    {
      id: "time-weaver",
      title: "The Time-Weaver's Paradox",
      description: "A decaying cyberpunk megalopolis where time is refined into a synthetic chemical drug. You are a street-level courier carrying a vial of 'Midnight'—the only drug that can pause a localized sector of space-time.",
      setting: "A neon-soaked cyberpunk city where time is a synthesized fluid chemical."
    },
    {
      id: "obsidian-monolith",
      title: "The Alchemist of the Silent Ruins",
      description: "An ancient forgotten empire overgrown with copper ivy. You are an alchemist seeking the Star Forge—a copper engine rumored to synthesize stars or erase cosmic elements.",
      setting: "Archaic clockwork ruins overgrown with copper vegetation, thick with mystery."
    },
    {
      id: "slate-cathedral",
      title: "Echoes of the Shadow Cathedral",
      description: "A dark gothic town locked in permanent twilight where citizens trade their reflections and shadows to a clockwork priest in exchange for eternal slumberless lives. You are the last mortal with a shadow.",
      setting: "Gothic cobblestone streets shrouded in heavy slate mist, governed by a mechanical priesthood."
    }
  ];

  const handleStartStory = async (settingText: string, titleText: string) => {
    setIsLoading(true);
    setError(null);
    setStory(null);

    try {
      const response = await fetch("/api/story/step", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storyTitle: titleText,
          setting: settingText,
          history: [],
          currentChoice: null
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        const errMsg = data.error || "Unable to generate story scene. Please try again.";
        if (errMsg.includes("429") || errMsg.includes("quota") || errMsg.toLowerCase().includes("exhausted")) {
          throw new Error("QUOTA_LIMIT: Free Tier rate limit reached (20 requests/min). Please wait 30 seconds before starting the story.");
        }
        throw new Error(errMsg);
      }
      setStory({
        title: titleText,
        setting: settingText,
        history: [],
        currentSceneText: data.sceneText,
        choices: data.choices || [],
        status: data.status || "playing",
        moodTheme: data.moodTheme || "slate-mist"
      });
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to summon story.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleMakeChoice = async (choiceText: string) => {
    if (!story || isLoading) return;

    // Save previous state to history log before moving forward
    const newHistoryEntry: StoryChoiceHistory = {
      sceneText: story.currentSceneText,
      choiceSelected: choiceText
    };

    const updatedHistory = [...story.history, newHistoryEntry];

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/story/step", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storyTitle: story.title,
          setting: story.setting,
          history: updatedHistory,
          currentChoice: choiceText
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        const errMsg = data.error || "Unable to process choice. Connection failed.";
        if (errMsg.includes("429") || errMsg.includes("quota") || errMsg.toLowerCase().includes("exhausted")) {
          throw new Error("QUOTA_LIMIT: Free Tier rate limit reached (20 requests/min). Please wait 30 seconds before choosing again.");
        }
        throw new Error(errMsg);
      }
      setStory({
        title: story.title,
        setting: story.setting,
        history: updatedHistory,
        currentSceneText: data.sceneText,
        choices: data.choices || [],
        status: data.status || "playing",
        moodTheme: data.moodTheme || "slate-mist"
      });
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to make choice. Try repeating that action.");
    } finally {
      setIsLoading(false);
    }
  };

  const getMoodColors = (mood: string) => {
    switch (mood) {
      case "deep-space":
        return {
          bg: "bg-radial from-[#040815] to-[#010206] border-indigo-950/40",
          accent: "text-indigo-400 bg-indigo-950/20 border-indigo-800/20 hover:bg-indigo-950/40",
          glow: "shadow-indigo-500/5",
          accentText: "text-indigo-300",
          badge: "bg-indigo-950/40 text-indigo-300 border-indigo-900/30",
          ambientGlow: "bg-indigo-500/5"
        };
      case "amber-glow":
        return {
          bg: "bg-gradient-to-b from-[#181005] to-[#080501] border-amber-900/30",
          accent: "text-amber-400 bg-amber-950/10 border-amber-800/20 hover:bg-amber-950/20",
          glow: "shadow-amber-500/5",
          accentText: "text-amber-300",
          badge: "bg-amber-950/20 text-amber-200 border-amber-900/20",
          ambientGlow: "bg-amber-500/5"
        };
      case "crimson-shadow":
        return {
          bg: "bg-gradient-to-b from-[#1c0707] to-[#080202] border-red-950/40",
          accent: "text-red-400 bg-red-950/20 border-red-900/20 hover:bg-red-950/35",
          glow: "shadow-red-500/5",
          accentText: "text-red-300",
          badge: "bg-red-950/30 text-red-300 border-red-900/20",
          ambientGlow: "bg-red-500/5"
        };
      case "emerald-decay":
        return {
          bg: "bg-gradient-to-b from-[#06150c] to-[#010502] border-emerald-950/35",
          accent: "text-emerald-400 bg-emerald-950/20 border-emerald-900/20 hover:bg-emerald-950/30",
          glow: "shadow-emerald-500/5",
          accentText: "text-emerald-300",
          badge: "bg-emerald-950/20 text-emerald-300 border-emerald-900/20",
          ambientGlow: "bg-emerald-500/5"
        };
      case "neon-rain":
        return {
          bg: "bg-radial from-[#120516] to-[#050107] border-purple-950/40",
          accent: "text-pink-400 bg-pink-950/15 border-pink-900/20 hover:bg-pink-950/30",
          glow: "shadow-pink-500/5",
          accentText: "text-pink-300",
          badge: "bg-pink-950/25 text-pink-300 border-pink-900/20",
          ambientGlow: "bg-pink-500/5"
        };
      case "slate-mist":
      default:
        return {
          bg: "bg-gradient-to-b from-stone-900/60 to-black/80 border-stone-800/45",
          accent: "text-stone-300 bg-white/5 border-white/5 hover:bg-white/10",
          glow: "shadow-white/5",
          accentText: "text-stone-100",
          badge: "bg-white/5 text-stone-300 border-white/5",
          ambientGlow: "bg-white/5"
        };
    }
  };

  const mood = story ? getMoodColors(story.moodTheme) : getMoodColors("slate-mist");

  return (
    <div id="interactive-adventure-canvas" className="max-w-4xl mx-auto py-2">
      {/* SECTION 1: Start/Choose setting */}
      {!story && !isLoading && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Header */}
          <div className="bg-zinc-900/30 border border-white/5 p-6 rounded-2xl text-left flex items-start gap-4">
            <div className="p-3 bg-amber-500/10 rounded-xl text-amber-400 border border-amber-500/20">
              <Compass size={22} />
            </div>
            <div>
              <h3 className="font-display font-medium text-lg text-stone-100">
                Choose Your Story Arc
              </h3>
              <p className="text-xs text-stone-400 mt-0.5 leading-relaxed">
                Step into a dynamic Choose-Your-Own-Adventure story engine where AI acts as your story master. Select a curated backdrop or define your own custom setting!
              </p>
            </div>
          </div>

          {/* Curated settings cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
            {curatedSettings.map((cs) => (
              <button
                key={cs.id}
                onClick={() => handleStartStory(cs.setting, cs.title)}
                className="bg-zinc-900/20 hover:bg-zinc-900/40 border border-white/5 hover:border-white/10 rounded-2xl p-5 flex flex-col justify-between text-left transition-all hover:scale-[1.01] group cursor-pointer"
              >
                <div>
                  <span className="text-[9px] font-mono tracking-widest text-stone-500 uppercase block mb-2">
                    STORY TEMPLATE
                  </span>
                  <h4 className="font-serif font-bold text-base text-stone-200 group-hover:text-white leading-snug">
                    {cs.title}
                  </h4>
                  <p className="text-xs text-stone-400 mt-2.5 leading-relaxed">
                    {cs.description}
                  </p>
                </div>

                <div className="mt-5 flex items-center gap-1.5 text-xs font-mono font-medium text-stone-300 group-hover:text-stone-100">
                  Enter Story
                  <ArrowRight size={13} className="transform group-hover:translate-x-1 transition-transform" />
                </div>
              </button>
            ))}
          </div>

          {/* Custom start prompt */}
          <div className="bg-zinc-900/40 border border-white/5 p-6 rounded-2xl text-left">
            <span className="text-[10px] font-mono tracking-widest uppercase text-stone-500 block mb-2">
              OR DEFINE YOUR OWN WORLD
            </span>
            <div className="flex flex-col gap-3">
              <textarea
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="e.g. A haunted lunar colony where the ghosts of former astronauts whisper through the static, or a medieval village besieged by clockwork insects..."
                rows={3}
                className="w-full bg-black/40 text-stone-200 border border-white/5 focus:border-white/10 rounded-xl p-3 text-xs outline-none placeholder-stone-600 transition-all font-serif"
              />
              <button
                onClick={() => handleStartStory(customPrompt, "A Custom Tale")}
                disabled={!customPrompt.trim()}
                className="py-3 px-5 self-end rounded-xl bg-stone-100 hover:bg-white text-stone-900 text-xs font-display font-semibold transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer"
              >
                <Sparkles size={13} />
                Start Custom Story
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* SECTION 2: Loading scene */}
      {isLoading && (
        <div className="bg-zinc-900/40 border border-white/5 rounded-2xl p-12 text-center shadow-2xl relative overflow-hidden flex flex-col items-center justify-center min-h-[400px]">
          {/* Ambient mood color background pulses */}
          <div className={`absolute w-40 h-40 rounded-full blur-3xl opacity-10 pointer-events-none animate-pulse ${mood.ambientGlow}`} />

          <div className="relative w-14 h-14 mb-6 flex items-center justify-center">
            <Feather size={24} className="text-stone-400 animate-bounce" />
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-2 max-w-sm"
          >
            <h4 className="font-serif text-base font-bold text-stone-200">Consulting the Game Master...</h4>
            <p className="font-mono text-[10px] text-stone-500 leading-relaxed animate-pulse">
              Tracing character paths, weaving outcomes, and stabilizing environments...
            </p>
          </motion.div>
        </div>
      )}

      {/* SECTION 3: Playing story step */}
      {story && !isLoading && (
        <motion.div
          initial={{ opacity: 0, scale: 0.99 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className={`border rounded-3xl p-6 md:p-8 relative overflow-hidden shadow-2xl ${mood.bg} ${mood.glow} transition-colors duration-500 flex flex-col gap-6 text-left`}
        >
          {/* Story stats header bar */}
          <div className="flex justify-between items-start border-b border-white/5 pb-4 mb-2">
            <div>
              <span className={`text-[9px] font-mono uppercase tracking-widest border rounded px-2 py-0.5 ${mood.badge}`}>
                {story.moodTheme}
              </span>
              <h2 className="font-serif text-xl md:text-2xl font-bold text-stone-100 mt-2.5">
                {story.title}
              </h2>
            </div>

            <div className="flex gap-2">
              {/* History Toggle button */}
              {story.history.length > 0 && (
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-stone-400 hover:text-white transition-all cursor-pointer flex items-center gap-1 font-mono text-[10px]"
                >
                  <History size={14} />
                  Log ({story.history.length})
                </button>
              )}

              {/* Reset button */}
              <button
                onClick={() => {
                  setStory(null);
                  setSelectedSetting(null);
                }}
                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-stone-400 hover:text-white transition-all cursor-pointer"
              >
                <RotateCcw size={14} />
              </button>
            </div>
          </div>

          {/* HISTORY DRAWER (Collapsible) */}
          {showHistory && story.history.length > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              className="bg-black/40 border border-white/5 rounded-2xl p-4 overflow-y-auto max-h-[220px] text-xs font-serif leading-relaxed space-y-4"
            >
              <h4 className="font-mono text-[9px] text-stone-500 uppercase tracking-widest border-b border-white/5 pb-1">
                Adventure Ledger
              </h4>
              {story.history.map((h, idx) => (
                <div key={idx} className="border-b border-white/5 pb-3 last:border-0 last:pb-0">
                  <span className="text-[9px] font-mono text-stone-500 block mb-1">SCENE {idx + 1}</span>
                  <p className="text-stone-400 italic font-light mb-2">"...{h.sceneText.substring(0, 180)}..."</p>
                  <p className="text-amber-400 font-mono text-[10px] font-semibold pl-2 border-l border-amber-500/20">
                    Action Selected: "{h.choiceSelected}"
                  </p>
                </div>
              ))}
            </motion.div>
          )}

          {/* Narrative description */}
          <div className="flex-1 space-y-5">
            <div className="font-serif text-base md:text-lg text-stone-200 font-light leading-relaxed whitespace-pre-wrap select-text">
              {story.currentSceneText}
            </div>
          </div>

          {/* Choices Options */}
          <div className="mt-4 pt-6 border-t border-white/5 space-y-3">
            {story.status === "playing" && story.choices.length > 0 ? (
              <>
                <span className="text-[9px] font-mono tracking-widest uppercase text-stone-500 block mb-2">
                  What will you do next?
                </span>
                <div className="grid grid-cols-1 gap-2.5">
                  {story.choices.map((choice, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleMakeChoice(choice)}
                      className={`text-left p-4 rounded-xl border border-white/5 text-stone-300 font-serif text-sm transition-all hover:scale-[1.005] flex justify-between items-center cursor-pointer group ${mood.accent}`}
                    >
                      <span className="pr-4 leading-snug">{choice}</span>
                      <ArrowRight size={14} className="transform group-hover:translate-x-1 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0" />
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-6 space-y-3">
                <div className="inline-flex p-3 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                  <BookOpenCheck size={20} />
                </div>
                <h4 className="font-serif text-lg font-bold text-stone-200">The Journey Concludes</h4>
                <p className="text-xs text-stone-400 max-w-sm mx-auto leading-relaxed">
                  Your path has led to its natural ending. Re-read your final Ledger using the Log button or start a brand new tale to see how other options guide the outcome!
                </p>
                <button
                  onClick={() => {
                    setStory(null);
                    setSelectedSetting(null);
                  }}
                  className="mt-4 py-2.5 px-5 rounded-xl bg-stone-100 hover:bg-white text-stone-900 text-xs font-mono font-bold transition-all cursor-pointer"
                >
                  Write a New Adventure
                </button>
              </div>
            )}
          </div>

          {error && (
            <div className="p-4 rounded-xl bg-red-950/20 border border-red-950/35 text-red-300 text-xs font-mono">
              {error}
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
