import React, { useState } from "react";
import { BookOpen, Download, ChevronRight, ChevronLeft, Sparkles, AlertCircle, RefreshCw, Feather, CheckCircle, FileText } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import jsPDF from "jspdf";
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from "docx";
import { EBook } from "../types";

export default function EBookReader() {
  const [topic, setTopic] = useState("");
  const [style, setStyle] = useState("Philosophical & Evocative");
  const [isLoading, setIsLoading] = useState(false);
  const [ebook, setEbook] = useState<EBook | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0); // 0: Intro, 1: Ch1, 2: Ch2, 3: Ch3, 4: Epilogue
  const [fontSize, setFontSize] = useState<"sm" | "md" | "lg">("md");
  const [exportFormat, setExportFormat] = useState<"pdf" | "docx" | "md">("pdf");

  const styleOptions = [
    "Philosophical & Evocative",
    "Whimsical & Fairy-Tale",
    "Dark & Gothic Horror",
    "High-Tech & Cyberpunk",
    "Academic & Piercing",
    "Classic Victoriana Literary"
  ];

  const suggestedTopics = [
    "The Alchemy of Time & Memory",
    "A Guide to Cybernetic Dreamscapes",
    "The Secret History of Forgotten Lighthouses",
    "Gothic Architecture and Haunted Geometry",
    "Quantum Mechanics for Nomadic Poets",
    "The Botanical Whispers of Ancient Forests"
  ];

  const handleGenerate = async (selectedTopic?: string) => {
    const finalTopic = selectedTopic || topic;
    if (!finalTopic.trim()) return;

    setIsLoading(true);
    setError(null);
    setEbook(null);
    setCurrentPage(0);

    try {
      const response = await fetch("/api/generate-ebook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: finalTopic,
          style: style,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        const errMsg = data.error || "Unable to generate eBook right now. Please try again.";
        if (errMsg.includes("429") || errMsg.includes("quota") || errMsg.toLowerCase().includes("exhausted")) {
          throw new Error("QUOTA_LIMIT: Free Tier rate limit reached (20 requests/min). Please wait 30 seconds before generating again.");
        }
        throw new Error(errMsg);
      }

      if (!data.title || !data.chapters || data.chapters.length !== 3) {
        throw new Error("Invalid manuscript format returned. Please retry.");
      }

      setEbook(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to generate the eBook.");
    } finally {
      setIsLoading(false);
    }
  };

  // PDF Exporter
  const exportToPDF = (item: EBook) => {
    const doc = new jsPDF({ unit: "pt", format: "letter" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 54; // 0.75 in
    const maxLineWidth = pageWidth - margin * 2;
    let y = margin;

    const checkPageBreak = (neededHeight: number) => {
      if (y + neededHeight > pageHeight - margin) {
        doc.addPage();
        y = margin;
      }
    };

    // Title
    doc.setFont("times", "bold");
    doc.setFontSize(22);
    const titleLines = doc.splitTextToSize(item.title, maxLineWidth);
    doc.text(titleLines, margin, y);
    y += titleLines.length * 26 + 10;

    // Author & Subtitle
    doc.setFont("times", "italic");
    doc.setFontSize(12);
    doc.text(`By ${item.author}`, margin, y);
    y += 18;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text(`Topic: ${topic || "Custom Concept"}  |  Style: ${style}`, margin, y);
    y += 20;

    // Divider Line
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, y, pageWidth - margin, y);
    y += 25;

    // Content sections
    const sections = [
      { title: "Introduction", content: item.introduction },
      ...item.chapters.map((ch, i) => ({ title: `Chapter ${i + 1}: ${ch.title}`, content: ch.content })),
      { title: "Epilogue", content: item.epilogue }
    ];

    doc.setTextColor(0, 0, 0);

    sections.forEach((sec, idx) => {
      if (idx > 0) {
        checkPageBreak(70);
      }

      doc.setFont("times", "bold");
      doc.setFontSize(15);
      doc.text(sec.title, margin, y);
      y += 22;

      doc.setFont("times", "normal");
      doc.setFontSize(11);

      const paragraphs = sec.content.split("\n\n");
      paragraphs.forEach((para) => {
        const cleanPara = para.trim();
        if (!cleanPara) return;
        const lines = doc.splitTextToSize(cleanPara, maxLineWidth);
        const needed = lines.length * 15 + 10;
        checkPageBreak(needed);
        doc.text(lines, margin, y);
        y += lines.length * 15 + 10;
      });

      y += 15;
    });

    // Add page numbers
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(150, 150, 150);
      doc.text(`${item.title}  -  Page ${i} of ${totalPages}`, pageWidth / 2, pageHeight - 30, { align: "center" });
    }

    const safeTitle = item.title.toLowerCase().replace(/[^a-z0-9]+/g, "_");
    doc.save(`${safeTitle}.pdf`);
  };

  // Word Document (.docx) Exporter
  const exportToWordDoc = async (item: EBook) => {
    const children: Paragraph[] = [];

    // Title
    children.push(
      new Paragraph({
        text: item.title,
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 }
      })
    );

    // Author
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: `By ${item.author}`, italics: true, bold: true, size: 24 }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 }
      })
    );

    // Topic & Style
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: `Topic: ${topic || "Custom Concept"}  |  Style: ${style}`, size: 18, color: "666666" }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 }
      })
    );

    // Sections
    const sections = [
      { title: "Introduction", content: item.introduction },
      ...item.chapters.map((ch, i) => ({ title: `Chapter ${i + 1}: ${ch.title}`, content: ch.content })),
      { title: "Epilogue", content: item.epilogue }
    ];

    sections.forEach((sec) => {
      children.push(
        new Paragraph({
          text: sec.title,
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 300, after: 150 }
        })
      );

      sec.content.split("\n\n").forEach((para) => {
        if (para.trim()) {
          children.push(
            new Paragraph({
              children: [new TextRun({ text: para.trim(), size: 22 })],
              spacing: { after: 180, line: 360 }
            })
          );
        }
      });
    });

    const doc = new Document({
      sections: [{ properties: {}, children }]
    });

    const blob = await Packer.toBlob(doc);
    const safeTitle = item.title.toLowerCase().replace(/[^a-z0-9]+/g, "_");
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${safeTitle}.docx`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Markdown (.md) Exporter
  const exportToMarkdown = (item: EBook) => {
    let mdContent = `# ${item.title}\n`;
    mdContent += `### Written by: ${item.author}\n`;
    mdContent += `*Generated under topic: "${topic || "Custom Topic"}" with style: "${style}"*\n\n`;
    mdContent += `---\n\n`;
    mdContent += `## Introduction\n\n${item.introduction}\n\n`;
    mdContent += `---\n\n`;

    item.chapters.forEach((ch, idx) => {
      mdContent += `## Chapter ${idx + 1}: ${ch.title}\n\n${ch.content}\n\n`;
      mdContent += `---\n\n`;
    });

    mdContent += `## Epilogue\n\n${item.epilogue}\n\n`;
    mdContent += `---\n*Generated by Narrative Companion.*`;

    const blob = new Blob([mdContent], { type: "text/markdown;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const safeTitle = item.title.toLowerCase().replace(/[^a-z0-9]+/g, "_");
    link.setAttribute("download", `${safeTitle}.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadEBook = (overrideFormat?: "pdf" | "docx" | "md") => {
    if (!ebook) return;
    const targetFmt = overrideFormat || exportFormat;
    if (targetFmt === "pdf") {
      exportToPDF(ebook);
    } else if (targetFmt === "docx") {
      exportToWordDoc(ebook);
    } else {
      exportToMarkdown(ebook);
    }
  };

  const getPageTitle = () => {
    if (!ebook) return "";
    if (currentPage === 0) return "Introduction";
    if (currentPage === 4) return "Epilogue";
    return `Chapter ${currentPage}: ${ebook.chapters[currentPage - 1].title}`;
  };

  const getPageContent = () => {
    if (!ebook) return "";
    if (currentPage === 0) return ebook.introduction;
    if (currentPage === 4) return ebook.epilogue;
    return ebook.chapters[currentPage - 1].content;
  };

  const getFontSizeClass = () => {
    if (fontSize === "sm") return "text-sm md:text-base leading-relaxed";
    if (fontSize === "lg") return "text-lg md:text-xl leading-loose";
    return "text-base md:text-lg leading-relaxed";
  };

  return (
    <div id="ebook-generator-workspace" className="max-w-4xl mx-auto py-4">
      {/* SECTION 1: Form to Generate EBook */}
      {!ebook && !isLoading && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-zinc-900/40 border border-white/5 rounded-2xl p-6 md:p-8 shadow-2xl relative overflow-hidden"
        >
          {/* Subtle decoration */}
          <div className="absolute right-0 top-0 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shadow-inner">
              <Feather size={20} />
            </div>
            <div className="text-left">
              <h3 className="font-display font-medium text-lg text-stone-100 tracking-tight">
                Generate Custom eBook
              </h3>
              <p className="text-xs text-stone-400">
                Input any topic and let AI craft an original multi-chapter eBook in your chosen style.
              </p>
            </div>
          </div>

          <div className="space-y-5 text-left">
            {/* Input topic */}
            <div>
              <label className="block text-xs font-mono uppercase tracking-widest text-stone-400 mb-2">
                Manuscript Topic
              </label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g., The Alchemy of Time and Forgotten Libraries, Secrets of Deep Sea Coral..."
                className="w-full bg-black/40 text-stone-200 border border-white/5 focus:border-amber-500/30 rounded-xl py-3 px-4 text-sm outline-none placeholder-stone-600 transition-all"
              />
            </div>

            {/* Presets and suggested topics */}
            <div>
              <span className="block text-[10px] font-mono uppercase tracking-wider text-stone-500 mb-2">
                Or choose a curated topic preset:
              </span>
              <div className="flex flex-wrap gap-2">
                {suggestedTopics.map((st) => (
                  <button
                    key={st}
                    onClick={() => {
                      setTopic(st);
                    }}
                    className="text-xs font-serif bg-white/5 hover:bg-white/10 text-stone-300 border border-white/5 rounded-lg px-3 py-1.5 transition-all text-left"
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Select Style Preset */}
            <div>
              <label className="block text-xs font-mono uppercase tracking-widest text-stone-400 mb-2">
                Literary Style Preset
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {styleOptions.map((so) => (
                  <button
                    key={so}
                    onClick={() => setStyle(so)}
                    className={`py-2.5 px-3 rounded-xl text-xs font-sans font-medium border text-center transition-all ${
                      style === so
                        ? "bg-amber-500/10 border-amber-500/40 text-amber-300 shadow-md shadow-amber-500/5"
                        : "bg-black/20 border-white/5 text-stone-400 hover:text-stone-300 hover:bg-white/5"
                    }`}
                  >
                    {so}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div className="p-4 rounded-xl bg-red-950/20 border border-red-950/40 text-red-300 text-xs flex gap-2.5">
                <AlertCircle size={16} className="mt-0.5 text-red-400 flex-shrink-0" />
                <p className="font-mono">{error}</p>
              </div>
            )}

            <button
              onClick={() => handleGenerate()}
              disabled={!topic.trim()}
              className="w-full mt-2 py-4 rounded-xl bg-amber-500 text-stone-950 font-display font-semibold hover:bg-amber-400 hover:shadow-lg hover:shadow-amber-500/10 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              <Sparkles size={16} />
              Generate eBook
            </button>
          </div>
        </motion.div>
      )}

      {/* LOADING STATE */}
      {isLoading && (
        <div className="bg-zinc-900/40 border border-white/5 rounded-2xl p-12 text-center shadow-2xl relative overflow-hidden flex flex-col items-center justify-center min-h-[400px]">
          <div className="relative w-16 h-16 mb-6">
            {/* Spinning ring */}
            <div className="absolute inset-0 rounded-full border-4 border-amber-500/20 border-t-amber-500 animate-spin" />
            <div className="absolute inset-2 rounded-full border-4 border-amber-500/10 border-b-amber-500 animate-spin" style={{ animationDirection: "reverse" }} />
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-2 max-w-md"
          >
            <h4 className="font-serif text-lg font-bold text-stone-200">Writing the eBook...</h4>
            <div className="font-mono text-[11px] text-stone-500 space-y-1">
              <p className="animate-pulse">Analyzing topic details...</p>
              <p className="animate-pulse" style={{ animationDelay: "600ms" }}>Formatting chapters with style: {style}</p>
              <p className="animate-pulse" style={{ animationDelay: "1200ms" }}>Drafting narrative sections...</p>
            </div>
          </motion.div>
        </div>
      )}

      {/* READING ROOM (EBOOK MANUSCRIPT VIEWED) */}
      {ebook && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col gap-6"
        >
          {/* Controls Bar */}
          <div className="flex flex-wrap justify-between items-center gap-4 bg-zinc-900/50 border border-white/5 rounded-2xl p-4">
            <div className="flex items-center gap-2">
              <BookOpen size={18} className="text-amber-400" />
              <div className="text-left">
                <span className="text-[10px] font-mono text-amber-500 block">MANUSCRIPT COMPLETE</span>
                <span className="text-xs text-stone-300 font-serif font-medium line-clamp-1">{ebook.title}</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Font Size controls */}
              <div className="flex border border-white/5 rounded-lg overflow-hidden bg-black/40">
                {(["sm", "md", "lg"] as const).map((sz) => (
                  <button
                    key={sz}
                    onClick={() => setFontSize(sz)}
                    className={`text-xs font-mono py-1.5 px-3 uppercase tracking-wider transition-all ${
                      fontSize === sz ? "bg-amber-500/10 text-amber-400 font-bold" : "text-stone-400 hover:text-stone-200"
                    }`}
                  >
                    {sz}
                  </button>
                ))}
              </div>

              {/* Format Selector Toggle */}
              <div className="flex border border-white/10 rounded-lg overflow-hidden bg-black/40 p-0.5">
                <button
                  onClick={() => setExportFormat("pdf")}
                  title="PDF Document format (.pdf)"
                  className={`text-[11px] font-mono py-1 px-2.5 rounded-md transition-all flex items-center gap-1 cursor-pointer ${
                    exportFormat === "pdf"
                      ? "bg-amber-500 text-zinc-950 font-bold shadow-sm"
                      : "text-stone-400 hover:text-stone-200"
                  }`}
                >
                  <FileText size={11} />
                  PDF
                </button>
                <button
                  onClick={() => setExportFormat("docx")}
                  title="Microsoft Word format (.docx)"
                  className={`text-[11px] font-mono py-1 px-2.5 rounded-md transition-all flex items-center gap-1 cursor-pointer ${
                    exportFormat === "docx"
                      ? "bg-amber-500 text-zinc-950 font-bold shadow-sm"
                      : "text-stone-400 hover:text-stone-200"
                  }`}
                >
                  <FileText size={11} />
                  Word (.docx)
                </button>
                <button
                  onClick={() => setExportFormat("md")}
                  title="Markdown text format (.md)"
                  className={`text-[11px] font-mono py-1 px-2.5 rounded-md transition-all flex items-center gap-1 cursor-pointer ${
                    exportFormat === "md"
                      ? "bg-amber-500 text-zinc-950 font-bold shadow-sm"
                      : "text-stone-400 hover:text-stone-200"
                  }`}
                >
                  Markdown
                </button>
              </div>

              {/* Download button */}
              <button
                onClick={() => downloadEBook()}
                className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-mono text-xs font-bold rounded-lg py-1.5 px-3.5 transition-all shadow-md cursor-pointer"
              >
                <Download size={13} />
                Download ({exportFormat.toUpperCase()})
              </button>

              {/* Discard / Write New */}
              <button
                onClick={() => setEbook(null)}
                className="py-1.5 px-3.5 border border-white/10 hover:border-white/20 hover:bg-white/5 text-stone-300 hover:text-white transition-all text-xs font-mono rounded-lg cursor-pointer"
              >
                New Topic
              </button>
            </div>
          </div>

          {/* Book Canvas page layout */}
          <div className="bg-gradient-to-br from-[#121212] via-[#1a1a1a] to-[#141414] border border-stone-800 rounded-2xl shadow-2xl relative overflow-hidden flex flex-col min-h-[500px]">
            {/* Header pagination strip */}
            <div className="px-6 md:px-8 py-4 border-b border-stone-800/60 flex justify-between items-center bg-black/20 font-mono text-[10px] tracking-widest text-stone-500 uppercase">
              <span>{ebook.title}</span>
              <span>Page {currentPage + 1} of 5</span>
            </div>

            {/* Actual Book Content */}
            <div className="flex-1 px-6 md:px-12 py-10 flex flex-col justify-between">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentPage}
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-6 text-left max-w-2xl mx-auto"
                >
                  {/* Page Title */}
                  {currentPage === 0 ? (
                    <div className="border-b border-stone-800/40 pb-4 mb-6">
                      <h1 className="font-serif text-3xl md:text-4xl font-extrabold text-stone-100 tracking-tight leading-tight">
                        {ebook.title}
                      </h1>
                      <p className="text-xs font-mono text-amber-500/80 mt-2 tracking-widest uppercase">
                        By {ebook.author}
                      </p>
                      <p className="text-[10px] text-stone-500 font-mono mt-0.5 uppercase tracking-wider">
                        Topic Preset: {topic || "Custom Concept"} • Style Presets: {style}
                      </p>
                    </div>
                  ) : (
                    <h2 className="font-serif text-2xl md:text-3xl font-bold text-stone-100 tracking-tight border-b border-stone-800/20 pb-2">
                      {getPageTitle()}
                    </h2>
                  )}

                  {/* Body Text */}
                  <div className={`font-serif text-stone-300 whitespace-pre-wrap select-text selection:bg-amber-500/20 ${getFontSizeClass()}`}>
                    {/* First chapter word drop cap (only for start of introduction or chapters) */}
                    {getPageContent()}
                  </div>
                </motion.div>
              </AnimatePresence>

              {/* Page footer navigator buttons */}
              <div className="mt-12 pt-6 border-t border-stone-800/40 flex justify-between items-center">
                <button
                  disabled={currentPage === 0}
                  onClick={() => setCurrentPage((p) => p - 1)}
                  className="flex items-center gap-1 font-mono text-xs text-stone-400 hover:text-stone-100 cursor-pointer disabled:opacity-20 disabled:hover:text-stone-400"
                >
                  <ChevronLeft size={16} />
                  Prev Section
                </button>

                {/* Progress dot indicators */}
                <div className="flex items-center gap-1.5">
                  {[0, 1, 2, 3, 4].map((idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentPage(idx)}
                      className={`w-1.5 h-1.5 rounded-full transition-all ${
                        currentPage === idx ? "bg-amber-500 scale-125" : "bg-stone-700 hover:bg-stone-500"
                      }`}
                    />
                  ))}
                </div>

                {currentPage < 4 ? (
                  <button
                    onClick={() => setCurrentPage((p) => p + 1)}
                    className="flex items-center gap-1 font-mono text-xs text-stone-400 hover:text-stone-100 cursor-pointer"
                  >
                    Next Section
                    <ChevronRight size={16} />
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => downloadEBook("pdf")}
                      className="flex items-center gap-1 font-mono text-xs bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold px-3 py-1.5 rounded-lg shadow cursor-pointer transition-all"
                    >
                      <Download size={13} />
                      Download PDF
                    </button>
                    <button
                      onClick={() => downloadEBook("docx")}
                      className="flex items-center gap-1 font-mono text-xs bg-white/10 hover:bg-white/20 text-stone-200 border border-white/10 font-medium px-3 py-1.5 rounded-lg cursor-pointer transition-all"
                    >
                      <FileText size={13} />
                      Word (.docx)
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
