import React, { useState, useRef, useEffect } from "react";
import { Send, Sparkles, MessageSquare, Info, ShieldAlert, CornerDownLeft, HelpCircle, Volume2, VolumeX } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { ItemInfo, ChatMessage } from "../types";

interface SoulChatProps {
  item: ItemInfo;
  onReset: () => void;
}

export default function SoulChat({ item, onReset }: SoulChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [currentlySpeakingId, setCurrentlySpeakingId] = useState<string | null>(null);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load browser voices asynchronously
  useEffect(() => {
    if (!('speechSynthesis' in window)) return;
    const updateVoices = () => {
      const avail = window.speechSynthesis.getVoices();
      if (avail.length > 0) {
        setVoices(avail);
      }
    };
    updateVoices();
    window.speechSynthesis.onvoiceschanged = updateVoices;
  }, []);

  // Determine gender of character voice
  const getCharacterGender = (): "female" | "male" | "neutral" => {
    if (item.voiceGender) return item.voiceGender;

    const textToScan = `${item.title} ${item.description} ${item.soulProfile} ${item.creator}`.toLowerCase();
    
    const femaleKeywords = ["female", "woman", "she", "her", "heroine", "queen", "princess", "lady", "girl", "barbie", "elizabeth", "jane", "matilda", "katniss", "emma", "mulan", "wonder woman", "cinderella"];
    const maleKeywords = ["male", "man", "he", "his", "him", "hero", "king", "prince", "lord", "godfather", "batman", "sherlock", "hamlet", "macbeth", "iron man", "superman", "spider-man", "dracula", "frankenstein", "gatsy", "homer"];

    const femScore = femaleKeywords.filter(k => textToScan.includes(k)).length;
    const maleScore = maleKeywords.filter(k => textToScan.includes(k)).length;

    if (femScore > maleScore) return "female";
    if (maleScore > femScore) return "male";
    return "neutral";
  };

  // Select optimal voice from browser speech synthesis
  const selectVoice = (gender: "female" | "male" | "neutral"): { voice: SpeechSynthesisVoice | null; defaultPitch: number } => {
    if (!voices.length) return { voice: null, defaultPitch: 1.0 };

    const engVoices = voices.filter((v) => v.lang.startsWith("en"));
    const pool = engVoices.length ? engVoices : voices;

    const femaleNames = ["female", "zira", "samantha", "karen", "victoria", "jenny", "aria", "fiona", "moira", "susan", "ava", "emma", "hazel", "google us english", "google uk english female"];
    const maleNames = ["male", "david", "daniel", "alex", "mark", "guy", "ryan", "george", "fred", "steffan", "richard", "james", "thomas", "brian", "google uk english male", "google us english male"];
    const premiumQuality = ["natural", "google", "online", "neural", "premium", "enhanced", "apple"];

    if (gender === "female") {
      const premiumFem = pool.find((v) => 
        premiumQuality.some((pq) => v.name.toLowerCase().includes(pq)) &&
        femaleNames.some((fn) => v.name.toLowerCase().includes(fn))
      );
      if (premiumFem) return { voice: premiumFem, defaultPitch: 1.05 };

      const anyFem = pool.find((v) => femaleNames.some((fn) => v.name.toLowerCase().includes(fn)));
      if (anyFem) return { voice: anyFem, defaultPitch: 1.08 };
    } else if (gender === "male") {
      const premiumMale = pool.find((v) => 
        premiumQuality.some((pq) => v.name.toLowerCase().includes(pq)) &&
        maleNames.some((mn) => v.name.toLowerCase().includes(mn))
      );
      if (premiumMale) return { voice: premiumMale, defaultPitch: 0.92 };

      const anyMale = pool.find((v) => maleNames.some((mn) => v.name.toLowerCase().includes(mn)));
      if (anyMale) return { voice: anyMale, defaultPitch: 0.90 };
    }

    // High quality natural voice fallback
    const naturalVoice = pool.find((v) => premiumQuality.some((pq) => v.name.toLowerCase().includes(pq)));
    if (naturalVoice) {
      return { voice: naturalVoice, defaultPitch: gender === "female" ? 1.12 : gender === "male" ? 0.88 : 1.0 };
    }

    return { voice: pool[0] || null, defaultPitch: gender === "female" ? 1.15 : gender === "male" ? 0.85 : 1.0 };
  };

  // Helper function to synthesize humanized speech
  const speakMessage = (text: string, msgId?: string) => {
    if (!('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel();
    setCurrentlySpeakingId(null);

    if (!text) return;

    // Clean text of markdown formatting for natural reading
    const cleanedText = text
      .replace(/[*#_`~]/g, "")
      .replace(/\[(.*?)\]\(.*?\)/g, "$1")
      .replace(/\.\.\./g, ", ")
      .replace(/--/g, ", ")
      .trim();

    if (!cleanedText) return;

    const gender = getCharacterGender();
    const { voice, defaultPitch } = selectVoice(gender);

    // Calculate human speech rate and pitch based on vibes & character profile
    const vibes = (item.vibes || []).map((v) => v.toLowerCase());
    let pitch = item.voicePitch || defaultPitch;
    let rate = item.voiceRate || 0.96; // 0.96 is close to natural conversational speech rate

    if (vibes.some((v) => ["dark", "gritty", "tense", "melancholic", "serious", "heavy", "eerie"].includes(v))) {
      pitch *= 0.92;
      rate = 0.90;
    } else if (vibes.some((v) => ["witty", "energetic", "playful", "whimsical", "fast", "action"].includes(v))) {
      pitch *= 1.06;
      rate = 1.04;
    } else if (vibes.some((v) => ["calm", "mysterious", "contemplative", "quiet", "dreamy"].includes(v))) {
      pitch *= 0.96;
      rate = 0.88;
    }

    // Clamp pitch between 0.75 and 1.35 for realistic human range
    pitch = Math.max(0.75, Math.min(1.35, pitch));
    rate = Math.max(0.80, Math.min(1.15, rate));

    // Split text into natural sentence clauses for expressive human cadence
    const sentences = cleanedText.match(/[^.!?]+[.!?]+/g) || [cleanedText];

    if (msgId) setCurrentlySpeakingId(msgId);

    sentences.forEach((sentence, index) => {
      const utterance = new SpeechSynthesisUtterance(sentence.trim());
      if (voice) utterance.voice = voice;
      utterance.pitch = pitch;
      utterance.rate = rate;

      if (index === sentences.length - 1) {
        utterance.onend = () => setCurrentlySpeakingId(null);
        utterance.onerror = () => setCurrentlySpeakingId(null);
      }

      window.speechSynthesis.speak(utterance);
    });
  };

  const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setCurrentlySpeakingId(null);
  };

  // Initialize the conversation with a natural, atmospheric in-character greeting
  useEffect(() => {
    const vibesText = item.vibes && item.vibes.length > 0 
      ? `my atmosphere carries the tone of ${item.vibes.slice(0, 3).join(", ")}`
      : "my world is rich with depth and story";

    const customGreeting = `Welcome to the world of "${item.title}" (${item.year}) by ${item.creator}.

I embody the voice, tone, and universe of this creation. At this moment, ${vibesText}.

Core Overview: "${item.description}"

What would you like to explore or ask about my world, characters, or themes?`;

    const initialMsg: ChatMessage = {
      id: "welcome-local",
      role: "model",
      content: customGreeting,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setMessages([initialMsg]);
    setError(null);
  }, [item]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || isTyping) return;

    const userMsg: ChatMessage = {
      id: Math.random().toString(36).substring(7),
      role: "user",
      content: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);
    setError(null);

    try {
      // Build correct conversation payload
      const payloadMessages = [...messages, userMsg].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const response = await fetch("/api/chat-soul", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: payloadMessages,
          itemInfo: item,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errMsg = data.error || "The response could not be completed. Try asking again.";
        if (errMsg.includes("429") || errMsg.includes("quota") || errMsg.toLowerCase().includes("exhausted")) {
          throw new Error("QUOTA_LIMIT: Free Tier rate limit reached (20 requests/min). Please wait 30 seconds and click 'Retry Connection'.");
        }
        throw new Error(errMsg);
      }

      const soulMsg: ChatMessage = {
        id: Math.random().toString(36).substring(7),
        role: "model",
        content: data.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, soulMsg]);

      // Speak AI response if Voice Output is enabled
      if (voiceEnabled) {
        speakMessage(data.reply, soulMsg.id);
      }
    } catch (err: any) {
      setError(err.message || "A network disruption severed the psychic link.");
    } finally {
      setIsTyping(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendMessage(input);
  };

  // Extract primary vibe colors for the virtual cover card representation
  const getVibeColorClasses = () => {
    const defaultClasses = {
      bg: "bg-radial from-slate-900 to-zinc-950",
      accent: "border-slate-500 text-slate-300",
      glow: "shadow-slate-500/10",
      gradient: "from-zinc-900/80 via-slate-900/90 to-black/95",
    };

    if (!item.vibes || item.vibes.length === 0) return defaultClasses;
    const v = item.vibes.join(" ").toLowerCase();

    if (v.includes("dark") || v.includes("existential") || v.includes("scary") || v.includes("horror") || v.includes("gothic")) {
      return {
        bg: "bg-gradient-to-br from-neutral-900 via-stone-950 to-neutral-950",
        accent: "border-red-900/30 text-red-300 bg-red-950/20",
        glow: "shadow-red-900/10",
        gradient: "from-stone-900/80 via-neutral-950/90 to-black/95",
      };
    }
    if (v.includes("magic") || v.includes("fantasy") || v.includes("whimsical") || v.includes("cosmic") || v.includes("dreamy")) {
      return {
        bg: "bg-gradient-to-br from-indigo-950 via-purple-950 to-zinc-950",
        accent: "border-purple-800/30 text-purple-200 bg-purple-950/30",
        glow: "shadow-purple-500/10",
        gradient: "from-indigo-950/80 via-purple-950/90 to-black/95",
      };
    }
    if (v.includes("sci-fi") || v.includes("neon") || v.includes("cyberpunk") || v.includes("futuristic")) {
      return {
        bg: "bg-gradient-to-br from-cyan-950 via-zinc-900 to-black",
        accent: "border-cyan-800/30 text-cyan-300 bg-cyan-950/20",
        glow: "shadow-cyan-500/10",
        gradient: "from-cyan-950/70 via-zinc-900/90 to-black",
      };
    }
    if (v.includes("warm") || v.includes("romantic") || v.includes("nostalgic") || v.includes("melancholic") || v.includes("peaceful")) {
      return {
        bg: "bg-gradient-to-br from-amber-950/80 via-stone-900 to-zinc-950",
        accent: "border-amber-800/30 text-amber-200 bg-amber-950/20",
        glow: "shadow-amber-500/5",
        gradient: "from-amber-950/60 via-stone-900/90 to-black",
      };
    }
    return defaultClasses;
  };

  const styleTheme = getVibeColorClasses();

  return (
    <div id="soul-chat-interface" className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-[calc(100vh-210px)] min-h-[500px]">
      {/* LEFT COLUMN: The Soul Profile & Virtual Cover representation */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4 }}
        className="lg:col-span-4 flex flex-col gap-5 h-full overflow-y-auto pr-2"
      >
        {/* Abstract Book/Movie Cover Representation */}
        <div className={`relative p-6 rounded-2xl border border-white/5 shadow-xl ${styleTheme.bg} ${styleTheme.glow} overflow-hidden flex-shrink-0 group`}>
          {/* Cover glow abstract aura */}
          <div className="absolute -right-12 -top-12 w-40 h-40 rounded-full blur-3xl opacity-20 bg-white" />

          <div className="relative z-10 flex flex-col h-full min-h-[220px] justify-between">
            <div>
              <span className="text-[10px] tracking-widest uppercase font-mono font-bold opacity-60 px-2 py-0.5 rounded border border-white/10 bg-white/5">
                {item.type}
              </span>

              <h3 className="font-serif text-2xl font-bold mt-4 tracking-tight leading-tight text-white">
                {item.title}
              </h3>
              <p className="text-xs text-stone-400 font-sans mt-1">
                by <span className="font-semibold text-stone-200">{item.creator}</span> • {item.year}
              </p>
            </div>

            <div className="mt-6">
              <p className="text-xs text-stone-300 italic line-clamp-4 font-serif leading-relaxed">
                "{item.description}"
              </p>
            </div>

            <div className="flex flex-wrap gap-1.5 mt-4">
              {item.genres?.map((g) => (
                <span key={g} className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/5 text-stone-300 border border-white/5">
                  {g}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Work Profile Details */}
        <div className="bg-zinc-900/40 rounded-2xl border border-white/5 p-5 flex flex-col gap-4">
          <div className="flex items-center gap-2 border-b border-white/5 pb-2">
            <Info size={16} className="text-stone-400" />
            <h4 className="font-display font-medium text-sm text-stone-200 uppercase tracking-wider">
              Work Tone & Atmosphere
            </h4>
          </div>

          <div>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {item.vibes?.map((v) => (
                <span key={v} className={`text-[10px] font-mono font-medium tracking-wide uppercase px-2.5 py-0.5 rounded border ${styleTheme.accent}`}>
                  {v}
                </span>
              ))}
            </div>
            <p className="text-xs text-stone-400 leading-relaxed font-sans">
              You are conversing with the living personality of this work, reflecting its authentic dialogue style, atmosphere, and narrative world.
            </p>
          </div>

          {/* Aesthetic Cover Description */}
          {item.coverDescription && (
            <div className="bg-black/30 p-3 rounded-xl border border-white/5">
              <span className="text-[9px] uppercase font-mono font-semibold text-stone-400 tracking-wider block mb-1">
                Visual Aesthetic
              </span>
              <p className="text-[11px] text-stone-300 leading-relaxed font-serif italic">
                "{item.coverDescription}"
              </p>
            </div>
          )}

          {/* Verification source reset */}
          <button
            onClick={onReset}
            className="w-full mt-2 py-2 text-center rounded-xl border border-white/10 hover:border-white/20 hover:bg-white/5 text-stone-300 hover:text-white transition-all text-xs font-mono font-medium"
          >
            Change selected item
          </button>
        </div>
      </motion.div>

      {/* RIGHT COLUMN: The Chat Console */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4 }}
        className="lg:col-span-8 flex flex-col h-full bg-zinc-900/20 border border-white/5 rounded-2xl overflow-hidden shadow-2xl"
      >
        {/* Header indicator */}
        <div className="px-5 py-3.5 border-b border-white/5 flex items-center justify-between bg-black/10">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <div className="text-left">
              <p className="text-xs font-mono uppercase tracking-widest text-emerald-400 font-bold">
                In-Character Chat
              </p>
              <h4 className="text-sm font-serif font-semibold text-stone-100 line-clamp-1">
                {item.title} Persona
              </h4>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Voice Output Toggle */}
            <button
              onClick={() => {
                const nextState = !voiceEnabled;
                setVoiceEnabled(nextState);
                if (!nextState) stopSpeaking();
              }}
              title={voiceEnabled ? "Voice Output Active (Click to mute)" : "Enable Voice Output"}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono border transition-all cursor-pointer ${
                voiceEnabled
                  ? "bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm shadow-amber-500/10"
                  : "bg-white/5 text-stone-400 border-white/5 hover:bg-white/10"
              }`}
            >
              {voiceEnabled ? <Volume2 size={12} className="text-amber-400 animate-pulse" /> : <VolumeX size={12} />}
              <span>{voiceEnabled ? "Voice ON" : "Voice OFF"}</span>
            </button>

            <div className="flex items-center gap-1 bg-white/5 text-stone-400 text-[10px] font-mono px-2.5 py-1 rounded-full border border-white/5">
              <Sparkles size={11} className="text-stone-300" />
              Persona Active
            </div>
          </div>
        </div>

        {/* Message stream */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 font-sans text-sm">
          {messages.map((m) => {
            const isUser = m.role === "user";
            const isSpeakingThis = currentlySpeakingId === m.id;
            return (
              <div
                key={m.id}
                className={`flex ${isUser ? "justify-end" : "justify-start"} items-end gap-2.5`}
              >
                {!isUser && (
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center font-serif font-bold text-xs bg-white/5 border border-white/10 text-stone-300`}>
                    {item.title.charAt(0)}
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-2xl p-4 leading-relaxed relative ${
                    isUser
                      ? "bg-stone-100 text-stone-900 rounded-br-none font-medium"
                      : "bg-zinc-900/60 border border-white/5 text-stone-200 rounded-bl-none font-serif text-base font-light"
                  }`}
                >
                  {/* Message body */}
                  <div className="whitespace-pre-line">{m.content}</div>

                  {/* Message Footer: Timestamp & Speak button for model */}
                  <div className="flex items-center justify-between gap-3 mt-1.5">
                    {!isUser && (
                      <button
                        onClick={() => {
                          if (isSpeakingThis) {
                            stopSpeaking();
                          } else {
                            speakMessage(m.content, m.id);
                          }
                        }}
                        className={`text-[10px] font-mono flex items-center gap-1 transition-colors ${
                          isSpeakingThis ? "text-amber-400 font-bold" : "text-stone-500 hover:text-stone-300"
                        }`}
                        title={isSpeakingThis ? "Stop speaking" : "Listen to speech"}
                      >
                        {isSpeakingThis ? (
                          <>
                            <Volume2 size={11} className="animate-pulse" /> Speaking...
                          </>
                        ) : (
                          <>
                            <Volume2 size={11} /> Read aloud
                          </>
                        )}
                      </button>
                    )}
                    <span
                      className={`block text-[9px] opacity-60 ml-auto ${
                        isUser ? "text-stone-700" : "text-stone-500"
                      }`}
                    >
                      {m.timestamp}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}

          {isTyping && (
            <div className="flex justify-start items-center gap-2.5">
              <div className="w-7 h-7 rounded-full flex items-center justify-center bg-white/5 border border-white/10 text-stone-400 animate-pulse font-serif font-bold text-xs">
                {item.title.charAt(0)}
              </div>
              <div className="bg-zinc-900/60 border border-white/5 text-stone-400 p-4 rounded-2xl rounded-bl-none flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-stone-500 animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-stone-500 animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-stone-500 animate-bounce" style={{ animationDelay: "300ms" }} />
                <span className="text-[11px] ml-1.5 font-mono italic text-stone-500">Formulating response...</span>
              </div>
            </div>
          )}

          {error && (
            <div className="p-3.5 rounded-xl bg-red-950/20 border border-red-900/30 text-red-300 text-xs flex items-start gap-2.5 font-mono">
              <ShieldAlert size={16} className="mt-0.5 text-red-400 flex-shrink-0" />
              <div>
                <p className="font-bold uppercase tracking-wider mb-0.5">Connection Error</p>
                <p>{error}</p>
                <button
                  onClick={() => handleSendMessage(messages[messages.length - 1]?.content || "Hello")}
                  className="mt-1.5 text-red-200 underline hover:text-white cursor-pointer"
                >
                  Retry Connection
                </button>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggested questions container */}
        {messages.length === 1 && item.suggestedQuestions?.length > 0 && (
          <div className="px-5 py-3 bg-black/10 border-t border-white/5">
            <span className="text-[9px] uppercase font-mono tracking-wider text-stone-500 flex items-center gap-1.5 mb-2">
              <HelpCircle size={12} /> Suggested questions:
            </span>
            <div className="flex flex-col gap-1.5 md:flex-row md:flex-wrap">
              {item.suggestedQuestions.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(q)}
                  disabled={isTyping}
                  className="text-left text-xs bg-zinc-900/40 hover:bg-zinc-800 border border-white/5 hover:border-white/10 rounded-lg py-1.5 px-3 text-stone-300 transition-all font-serif italic cursor-pointer disabled:opacity-50 disabled:hover:bg-zinc-900/40"
                >
                  "{q}"
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Chat input box */}
        <div className="p-4 border-t border-white/5 bg-black/20">
          <form onSubmit={handleSubmit} className="relative flex items-center">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`Ask a question or speak with the world of ${item.title}...`}
              className="w-full bg-zinc-900/70 text-stone-200 border border-white/5 focus:border-white/20 focus:bg-zinc-900 rounded-xl py-3.5 pl-4 pr-12 text-sm outline-none placeholder-stone-500 font-sans transition-all"
              disabled={isTyping}
            />
            <button
              type="submit"
              disabled={!input.trim() || isTyping}
              className="absolute right-2 p-2 rounded-lg bg-stone-100 hover:bg-white text-stone-900 transition-all cursor-pointer disabled:opacity-30 disabled:hover:bg-stone-100"
            >
              <Send size={15} />
            </button>
          </form>
          <div className="flex justify-between items-center mt-2 px-1 text-[10px] text-stone-500 font-mono">
            <span>Press Enter to communicate</span>
            <span className="flex items-center gap-1 text-stone-600">
              <CornerDownLeft size={10} /> Shift+Enter for new line
            </span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
