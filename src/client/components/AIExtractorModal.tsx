import React, { useState } from 'react';
import { Sparkles, X, Loader2, Check, AlertCircle, FileText } from 'lucide-react';

interface AIExtractorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExtracted?: (data: any) => void;
  onApply?: (data: any) => void;
}

export const AIExtractorModal: React.FC<AIExtractorModalProps> = ({
  isOpen,
  onClose,
  onExtracted,
  onApply,
}) => {
  const [rawText, setRawText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleExtract = async () => {
    if (!rawText.trim()) return;

    try {
      setLoading(true);
      setError(null);

      const res = await fetch('/api/v1/ai/extract-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawText }),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || 'Failed to extract event proposal.');
      }

      const data = await res.json();
      if (onApply) {
        onApply(data.data);
      } else if (onExtracted) {
        onExtracted(data.data);
      }
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInsertSample = () => {
    setRawText(`🌟 KIIT Web3 & AI Hackfest 2026 🌟
Calling all students across campuses! GDSC KIIT is organizing a 24-hour hackathon on Autonomous Agents and Blockchain at Campus 15 Lab Complex.
Date: Next Friday, Oct 16th, starting 9:00 AM to 6:00 PM.
Keynote by Prof. Mishra on 'Decentralized Intelligence'.
Prizes worth ₹1,00,000! Free food, swag kits, and certificates.
Max capacity: 250 students. Eligibility: All KIIT B.Tech/M.Tech students with valid ID.
Strict rule: Code must be built during the hackathon. Contact: dsc.kiit@kiit.ac.in.`);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0a0908] rounded-3xl shadow-2xl border border-[#a9927d]/30 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 bg-[#141210] border-b border-[#a9927d]/20 text-[#f2f4f3] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#49111c]/60 text-[#a9927d] border border-[#a9927d]/40">
              <Sparkles className="w-5 h-5 text-[#a9927d]" />
            </div>
            <div>
              <h3 className="font-bold text-base text-[#f2f4f3]">Gemini Event Proposal Extractor</h3>
              <p className="text-xs text-[#a9927d]">Paste unstructured circulars, messages, or drafts</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-[#a9927d] hover:text-[#f2f4f3] hover:bg-[#5e503f]/30 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-[#a9927d]">
              Raw Circular / Draft Notice Text
            </label>
            <button
              onClick={handleInsertSample}
              className="text-xs text-[#a9927d] hover:text-[#f2f4f3] hover:underline font-semibold flex items-center gap-1 cursor-pointer transition-colors"
            >
              <FileText className="w-3.5 h-3.5" />
              Insert Sample Notice
            </button>
          </div>

          <textarea
            rows={8}
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            className="w-full p-3 bg-[#141210] border border-[#a9927d]/30 text-[#f2f4f3] rounded-xl text-xs font-mono placeholder-[#a9927d]/40 focus:border-[#a9927d] outline-none"
            placeholder="Paste raw unformatted text from WhatsApp, email circular, or student club note..."
          />

          <div className="p-3 bg-[#49111c]/20 rounded-xl text-xs text-[#a9927d] border border-[#a9927d]/30 flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-[#a9927d] shrink-0 mt-0.5" />
            <span>
              Gemini will parse dates, venue, capacity, rules, and extract suggested sessions and resource requirements into the proposal form for your review before submission.
            </span>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#a9927d]/20">
            <button
              onClick={onClose}
              className="px-4 py-2 text-[#a9927d] hover:text-[#f2f4f3] hover:bg-[#5e503f]/20 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleExtract}
              disabled={loading || !rawText.trim()}
              className="flex items-center gap-2 px-6 py-2.5 bg-[#49111c] hover:bg-[#631726] border border-[#a9927d]/40 disabled:opacity-50 text-[#f2f4f3] rounded-xl text-xs font-bold shadow-lg transition-all cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#a9927d]" />
                  Extracting Structured Fields...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-[#a9927d]" />
                  Parse & Fill Form
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
