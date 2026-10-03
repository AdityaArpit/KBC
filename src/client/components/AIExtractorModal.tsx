import React, { useState } from 'react';
import { Sparkles, X, Loader2, Check, AlertCircle, FileText } from 'lucide-react';

interface AIExtractorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExtracted: (data: any) => void;
}

export const AIExtractorModal: React.FC<AIExtractorModalProps> = ({
  isOpen,
  onClose,
  onExtracted,
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
      onExtracted(data.data);
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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 bg-purple-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-800 text-purple-300">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Gemini Event Proposal Extractor</h3>
              <p className="text-xs text-purple-200">Paste unstructured circulars, messages, or drafts</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-purple-300 hover:text-white hover:bg-purple-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Raw Circular / Draft Notice Text
            </label>
            <button
              onClick={handleInsertSample}
              className="text-xs text-purple-700 hover:underline font-semibold flex items-center gap-1"
            >
              <FileText className="w-3.5 h-3.5" />
              Insert Sample Notice
            </button>
          </div>

          <textarea
            rows={8}
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-800 focus:bg-white focus:ring-2 focus:ring-purple-500 outline-none"
            placeholder="Paste raw unformatted text from WhatsApp, email circular, or student club note..."
          />

          <div className="p-3 bg-purple-50 rounded-xl text-xs text-purple-900 border border-purple-200 flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
            <span>
              Gemini will parse dates, venue, capacity, rules, and extract suggested sessions and resource requirements into the proposal form for your review before submission.
            </span>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              onClick={handleExtract}
              disabled={loading || !rawText.trim()}
              className="flex items-center gap-2 px-6 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-600/20 transition-all cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Extracting Structured Fields...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
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
