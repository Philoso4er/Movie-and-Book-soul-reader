import React, { useState } from "react";
import { Sparkles, Search, Book, Clapperboard, HelpCircle, ArrowRight, MessageSquare, BookOpen, Compass, Info, Check, CornerDownLeft } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { ItemInfo } from "./types";
import SoulChat from "./components/SoulChat";
import EBookReader from "./components/EBookReader";
import InteractiveStory from "./components/InteractiveStory";

export default function App() {
  const [searchQuery, setSearchQuery] = useState("");
  const [itemType, setItemType] = useState<"book" | "movie">("book");
  // The search bar checkbox requested by the user
  const [deepResonance, setDeepResonance] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [verifiedItem, setVerifiedItem] = useState<ItemInfo | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Active Main Navigation: "dialogue" | "ebook" | "adventure"
  const [activeTab, setActiveTab] = useState<"dialogue" | "ebook" | "adventure">("dialogue");

  // Sample quick searches to help the user get started instantly
  const bookSuggestions = ["The Great Gatsby", "Frankenstein", "1984", "Dune", "Crime and Punishment"];
  const movieSuggestions = ["The Matrix", "Inception", "Interstellar", "Spirited Away", "Pulp Fiction"];

  const handleSearch = async (forcedQuery?: string) => {
    const finalQuery = forcedQuery || searchQuery;
    if (!finalQuery.trim()) return;

    setIsSearching(true);
    setSearchError(null);
    setVerifiedItem(null);

    try {
      const response = await fetch("/api/verify-item", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: finalQuery,
          type: itemType === "book" ? "book" : "movie",
        }),
      });

      if (!response.ok) {
        throw new Error("The cosmic library is unreachable. Please try again.");
      }

      const data: ItemInfo = await response.json();

      if (!data.verified) {
        // If unable to verify, we allow them to force connect by creating a simulated persona!
        setSearchError(
          `We couldn't verify "${finalQuery}" in our records, but you can still initiate a connection. Click below to chat with its simulated shadow.`
        );
        // Put a simulated item ready in case they want to proceed anyway
        setVerifiedItem({
          verified: false,
          title: finalQuery,
          type: itemType === "book" ? "book" : "movie",
          creator: "Custom Creation",
          year: "Contemporary",
          description: `A creative work titled "${finalQuery}".`,
          genres: ["Drama", "Custom"],
          vibes: ["engaging", "authentic", "expressive"],
          soulProfile: "An authentic, engaging narrative voice embodying the world and ideas of this creation.",
          suggestedQuestions: ["What is the central theme of your story?", "Who is your main protagonist?", "What message do you share with your audience?"],
          coverDescription: "A striking, minimalist book cover framing the bold title."
        });
        return;
      }

      // Add deep resonance effects if checkbox was checked
      if (deepResonance) {
        data.vibes = [...(data.vibes || []), "immersive"];
        data.soulProfile = `${data.soulProfile}\nSince Deep Persona Mode is active, adopt an exceptionally immersive, detailed in-character voice, incorporating rich lore details, scene descriptions, and thematic depth.`;
      }

      setVerifiedItem(data);
    } catch (err: any) {
      console.error(err);
      setSearchError(err.message || "Failed to find title details.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleForceProceed = () => {
    if (verifiedItem) {
      setSearchError(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#08080a] text-stone-300 font-sans antialiased selection:bg-amber-500/25 relative flex flex-col justify-between">
      {/* Background radial atmosphere */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] rounded-full bg-indigo-500/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-[400px] h-[400px] rounded-full bg-amber-500/5 blur-[120px] pointer-events-none" />

      {/* HEADER SECTION */}
      <header className="border-b border-white/5 bg-black/40 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-500 to-indigo-600 flex items-center justify-center text-zinc-950 font-serif font-black shadow-lg shadow-indigo-500/10">
              Ψ
            </div>
            <div className="text-left">
              <h1 className="font-serif text-base font-extrabold text-stone-100 tracking-tight leading-tight">
                Narrative Companion
              </h1>
              <p className="text-[9px] font-mono uppercase tracking-widest text-stone-500">
                Interactive Book & Movie Persona
              </p>
            </div>
          </div>

          {/* Core Tabs Navigator */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setActiveTab("dialogue")}
              className={`py-1.5 px-3.5 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === "dialogue"
                  ? "bg-white/5 text-stone-100 border border-white/10"
                  : "text-stone-400 hover:text-stone-200"
              }`}
            >
              <MessageSquare size={13} />
              In-Character Chat
            </button>

            <button
              onClick={() => setActiveTab("ebook")}
              className={`py-1.5 px-3.5 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === "ebook"
                  ? "bg-white/5 text-stone-100 border border-white/10"
                  : "text-stone-400 hover:text-stone-200"
              }`}
            >
              <BookOpen size={13} />
              eBook Generator
            </button>

            <button
              onClick={() => setActiveTab("adventure")}
              className={`py-1.5 px-3.5 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === "adventure"
                  ? "bg-white/5 text-stone-100 border border-white/10"
                  : "text-stone-400 hover:text-stone-200"
              }`}
            >
              <Compass size={13} />
              Interactive Story
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="max-w-6xl mx-auto px-6 py-8 flex-1 w-full relative z-10">
        <AnimatePresence mode="wait">
          {/* TAB 1: SOUL DIALOGUE (SEARCH + CHAT) */}
          {activeTab === "dialogue" && (
            <motion.div
              key="dialogue"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
              className="space-y-8"
            >
              {!verifiedItem ? (
                // SEARCH & SETUP ENGINE
                <div className="max-w-xl mx-auto space-y-8 text-center py-8">
                  {/* Title & Prompt */}
                  <div className="space-y-3">
                    <span className="text-xs font-mono uppercase tracking-widest text-amber-400 font-bold bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
                      In-Character Companion
                    </span>
                    <h2 className="font-serif text-3xl md:text-4xl font-black text-stone-100 tracking-tight leading-none pt-2">
                      Talk with Books & Movies
                    </h2>
                    <p className="text-sm text-stone-400 max-w-sm mx-auto leading-relaxed">
                      Select a media type, type any title, and speak directly with the authentic voice, atmosphere, and story world of that creation.
                    </p>
                  </div>

                  {/* Toggle Category */}
                  <div className="inline-flex border border-white/5 bg-black/40 rounded-xl p-1 w-full max-w-xs">
                    <button
                      onClick={() => setItemType("book")}
                      className={`flex-1 py-2.5 rounded-lg text-xs font-mono font-medium transition-all flex items-center justify-center gap-2 cursor-pointer ${
                        itemType === "book" ? "bg-white/5 text-white font-bold" : "text-stone-500 hover:text-stone-300"
                      }`}
                    >
                      <Book size={14} />
                      Books
                    </button>
                    <button
                      onClick={() => setItemType("movie")}
                      className={`flex-1 py-2.5 rounded-lg text-xs font-mono font-medium transition-all flex items-center justify-center gap-2 cursor-pointer ${
                        itemType === "movie" ? "bg-white/5 text-white font-bold" : "text-stone-500 hover:text-stone-300"
                      }`}
                    >
                      <Clapperboard size={14} />
                      Movies & Shows
                    </button>
                  </div>

                  {/* Search bar & Checkbox */}
                  <div className="bg-zinc-900/30 border border-white/5 rounded-2xl p-5 md:p-6 shadow-xl space-y-4">
                    <div className="relative flex items-center">
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={itemType === "book" ? "Enter book title... (e.g. Frankenstein)" : "Enter movie title... (e.g. Inception)"}
                        className="w-full bg-black/50 text-stone-200 border border-white/5 focus:border-white/10 rounded-xl py-3.5 pl-4 pr-12 text-sm outline-none placeholder-stone-600 transition-all font-serif"
                        onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                      />
                      <button
                        onClick={() => handleSearch()}
                        disabled={isSearching || !searchQuery.trim()}
                        className="absolute right-2 p-2 rounded-lg bg-stone-100 hover:bg-white text-stone-900 transition-all cursor-pointer disabled:opacity-35"
                      >
                        <Search size={16} />
                      </button>
                    </div>

                    {/* Search bar Checkbox */}
                    <div className="flex items-center justify-between px-1 text-left">
                      <label className="flex items-center gap-2.5 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={deepResonance}
                          onChange={(e) => setDeepResonance(e.target.checked)}
                          className="rounded bg-black border border-white/10 text-amber-500 focus:ring-0 focus:ring-offset-0 w-4 h-4"
                        />
                        <div className="text-left">
                          <span className="text-xs font-mono font-medium text-stone-400 group-hover:text-stone-200 transition-colors">
                            Deep Persona Mode
                          </span>
                          <span className="block text-[10px] text-stone-500 font-sans">
                            Adds richer worldbuilding context, lore details & thematic depth
                          </span>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Suggestions Carousel */}
                  <div className="space-y-2 px-2 text-left">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-stone-500">
                      Popular Links:
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {(itemType === "book" ? bookSuggestions : movieSuggestions).map((s) => (
                        <button
                          key={s}
                          onClick={() => {
                            setSearchQuery(s);
                            handleSearch(s);
                          }}
                          className="text-xs font-serif bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg px-3 py-1.5 transition-all text-stone-300 cursor-pointer"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Searching loader */}
                  {isSearching && (
                    <div className="py-6 flex flex-col items-center justify-center gap-3">
                      <div className="w-8 h-8 rounded-full border-2 border-stone-800 border-t-stone-200 animate-spin" />
                      <p className="text-xs font-mono text-stone-500 animate-pulse uppercase tracking-wider">
                        Finding title & character persona...
                      </p>
                    </div>
                  )}

                  {/* Verification or general Error */}
                  {searchError && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="p-5 rounded-2xl bg-zinc-900/80 border border-white/5 text-left space-y-4"
                    >
                      <div className="flex gap-2.5 text-stone-300 text-xs font-mono">
                        <Info size={16} className="text-amber-500 flex-shrink-0" />
                        <p>{searchError}</p>
                      </div>
                      {verifiedItem && (
                        <button
                          onClick={handleForceProceed}
                          className="w-full py-2.5 rounded-xl bg-stone-100 hover:bg-white text-stone-900 font-mono text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          Chat with this title anyway
                          <ArrowRight size={13} />
                        </button>
                      )}
                    </motion.div>
                  )}
                </div>
              ) : (
                // CONVERSE ENGINE
                <SoulChat item={verifiedItem} onReset={() => setVerifiedItem(null)} />
              )}
            </motion.div>
          )}

          {/* TAB 2: EBOOK SUMMONER */}
          {activeTab === "ebook" && (
            <motion.div
              key="ebook"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
            >
              <EBookReader />
            </motion.div>
          )}

          {/* TAB 3: INTERACTIVE STORIES */}
          {activeTab === "adventure" && (
            <motion.div
              key="adventure"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
            >
              <InteractiveStory />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-white/5 py-6 bg-black/20 text-center font-mono text-[10px] text-stone-600 relative z-10">
        <p>© Narrative Companion • Interactive Book & Movie Experience</p>
        <p className="mt-0.5 text-stone-700">Explore authentic book & movie story worlds</p>
      </footer>
    </div>
  );
}
