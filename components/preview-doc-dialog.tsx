"use client";

import React, { useEffect, useState, useMemo } from "react";
import { DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Loader2, Download, FileText, ExternalLink, AlertCircle, Sparkles } from "lucide-react";
import { Button } from "./ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import mammoth from "mammoth";
import * as XLSX from "xlsx";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface PreviewDocDialogProps {
  document: string; // This is the file URL
}

const previewCache = new Map<string, string>();

const PreviewDocDialog = ({ document: fileUrl }: PreviewDocDialogProps) => {
  const [content, setContent] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fileExtension = useMemo(() => fileUrl.split(".").pop()?.toLowerCase() || "", [fileUrl]);
  const fileName = useMemo(() => {
     try {
         const decoded = decodeURIComponent(fileUrl);
         return decoded.split("/").pop() || "Document Preview";
     } catch {
         return "Document Preview";
     }
  }, [fileUrl]);

  const isPdf = fileExtension === "pdf";
  const isWord = fileExtension === "docx";
  const isExcel = fileExtension === "xls" || fileExtension === "xlsx";
  const isMarkdown = fileExtension === "md";
  const isImage = ["png", "jpg", "jpeg", "gif", "svg", "webp"].includes(fileExtension);

  useEffect(() => {
    if (!fileUrl) {
      setError("Invalid document source URL");
      setLoading(false);
      return;
    }

    if (fileUrl.startsWith('{')) {
      setError(`Document data missing URL. Dump: ${fileUrl}`);
      setLoading(false);
      return;
    }

    if (isPdf || isImage) {
      setLoading(false);
      return;
    }

    if (previewCache.has(fileUrl)) {
      setContent(previewCache.get(fileUrl) || "");
      setLoading(false);
      return;
    }

    const fetchAndProcess = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(fileUrl);
        if (!response.ok) throw new Error(`Fetch failed: ${response.statusText}`);
        
        const blob = await response.blob();
        
        if (isWord) {
          const arrayBuffer = await blob.arrayBuffer();
          const result = await mammoth.convertToHtml({ arrayBuffer });
          const styledHtml = `<div class="prose prose-invert max-w-none p-8 font-sans">${result.value}</div>`;
          setContent(styledHtml);
          previewCache.set(fileUrl, styledHtml);
        } else if (isExcel) {
          const arrayBuffer = await blob.arrayBuffer();
          const data = new Uint8Array(arrayBuffer);
          const workbook = XLSX.read(data, { type: "array" });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const htmlString = XLSX.utils.sheet_to_html(firstSheet, { editable: false });
          const styledHtml = `<div class="excel-table-container p-4 overflow-auto bg-slate-900/50 rounded-xl">${htmlString}</div>`;
          setContent(styledHtml);
          previewCache.set(fileUrl, styledHtml);
        } else if (isMarkdown) {
          const text = await blob.text();
          setContent(text);
          previewCache.set(fileUrl, text);
        } else {
          // Fallback for text files
          const text = await blob.text();
          setContent(text);
        }
      } catch (err: any) {
        console.error("Preview error:", err);
        setError(err.message || "Failed to render document preview locally.");
      } finally {
        setLoading(false);
      }
    };

    fetchAndProcess();
  }, [fileUrl, isPdf, isWord, isExcel, isMarkdown, isImage]);

  const handleDownload = () => {
    const link = window.document.createElement("a");
    link.href = fileUrl;
    link.download = fileName;
    window.document.body.appendChild(link);
    link.click();
    window.document.body.removeChild(link);
  };

  return (
    <DialogContent className="sm:max-w-[90vw] h-[85vh] bg-[#0A0C14]/95 backdrop-blur-3xl border-white/10 p-0 overflow-hidden flex flex-col shadow-[0_0_100px_rgba(0,0,0,0.6)]">
      <DialogHeader className="p-6 border-b border-white/5 flex flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-blue-600/20 flex items-center justify-center border border-blue-500/30">
            <FileText className="w-5 h-5 text-blue-400" />
          </div>
          <div className="flex flex-col min-w-0">
            <DialogTitle className="text-white font-black italic uppercase tracking-tight truncate">
              {fileName}
            </DialogTitle>
            <div className="flex items-center gap-2">
               <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Neural Asset Explorer</span>
               <div className="w-1 h-1 rounded-full bg-slate-700" />
               <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest flex items-center gap-1">
                 <Sparkles className="w-2.5 h-2.5" /> Direct Ingest
               </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 mr-8">
           <Button 
            variant="outline" 
            size="sm" 
            onClick={handleDownload}
            className="h-9 rounded-xl border-white/10 bg-white/5 text-slate-400 hover:text-white font-black uppercase text-[10px] tracking-widest gap-2"
           >
             <Download className="w-4 h-4 text-blue-400" />
             Download
           </Button>
           <Button 
            variant="outline" 
            size="sm" 
            asChild
            className="h-9 rounded-xl border-white/10 bg-white/5 text-slate-400 hover:text-white font-black uppercase text-[10px] tracking-widest gap-2"
           >
             <a href={fileUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4 text-indigo-400" />
                Raw View
             </a>
           </Button>
        </div>
      </DialogHeader>

      <div className="flex-1 min-h-0 relative bg-black/20">
        {loading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/40 backdrop-blur-sm z-50">
            <div className="relative">
                <div className="absolute inset-x-0 bottom-0 h-1/2 bg-blue-500/20 blur-xl rounded-full" />
                <Loader2 className="w-12 h-12 text-blue-500 animate-spin relative z-10" />
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] animate-pulse">Syncing Neural Memory...</p>
          </div>
        ) : error ? (
          <div className="h-full flex flex-col items-center justify-center p-12 text-center gap-4">
             <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20">
                <AlertCircle className="w-8 h-8 text-red-500/60" />
             </div>
             <div className="space-y-2">
                <h3 className="text-white font-black uppercase italic text-lg">Transmission Error</h3>
                <p className="text-slate-500 text-sm max-w-md">{error}</p>
             </div>
             <Button 
              variant="outline" 
              onClick={() => window.location.reload()}
              className="mt-4 rounded-xl border-white/10 bg-white/5 text-slate-400 font-black uppercase text-[10px] tracking-widest"
             >
                Retry Direct Access
             </Button>
          </div>
        ) : isPdf ? (
          <iframe 
            src={fileUrl} 
            className="w-full h-full border-none invert-[0.9] hue-rotate-180 brightness-[1.1]" 
            title="PDF Preview"
          />
        ) : isImage ? (
          <div className="h-full flex items-center justify-center p-8">
             <img src={fileUrl} alt="Preview" className="max-w-full max-h-full rounded-2xl shadow-2xl border border-white/10" />
          </div>
        ) : isMarkdown ? (
          <ScrollArea className="h-full p-12">
            <div className="prose prose-invert max-w-4xl mx-auto">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
            </div>
          </ScrollArea>
        ) : isWord || isExcel ? (
          <ScrollArea className="h-full">
            <div 
              className={cn(
                "w-full preview-content text-slate-300",
                isExcel ? "excel-preview" : "word-preview"
              )}
              dangerouslySetInnerHTML={{ __html: content }} 
            />
            <style jsx global>{`
              .excel-table-container table {
                border-collapse: collapse;
                width: 100%;
                font-family: 'Inter', sans-serif;
                background: rgba(15, 23, 42, 0.4);
                border-radius: 12px;
                overflow: hidden;
              }
              .excel-table-container th, .excel-table-container td {
                border: 1px solid rgba(255, 255, 255, 0.05);
                padding: 12px 16px;
                text-align: left;
                font-size: 13px;
              }
              .excel-table-container th {
                background: rgba(30, 41, 59, 0.8);
                color: white;
                font-weight: 800;
                text-transform: uppercase;
                letter-spacing: 0.05em;
              }
              .word-preview p { margin-bottom: 1.5rem; line-height: 1.8; }
              .word-preview h1 { font-size: 2.5rem; font-weight: 900; color: white; margin-bottom: 2rem; }
              .word-preview h2 { font-size: 1.8rem; font-weight: 800; color: #60a5fa; margin-top: 2rem; margin-bottom: 1rem; }
            `}</style>
          </ScrollArea>
        ) : (
          <ScrollArea className="h-full p-8 font-mono text-sm text-emerald-400">
            <pre className="whitespace-pre-wrap">{content}</pre>
          </ScrollArea>
        )}
      </div>
    </DialogContent>
  );
};

export default PreviewDocDialog;
