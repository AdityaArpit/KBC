import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, X, Bot, User, Loader2 } from 'lucide-react';
import { CampusEvent } from '../../shared/types.ts';

interface AICopilotDrawerProps {
  event: CampusEvent;
  isOpen: boolean;
  onClose: () => void;
}

export const AICopilotDrawer: React.FC<AICopilotDrawerProps> = ({
  event,
  isOpen,
  onClose,
}) => {
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'model'; text: string }>>([
    {
      role: 'model',
      text: `Hello! I am your AI Operations Copilot for **${event.name}**. I have real-time visibility into the schedule, venue (${event.venue}), tasks, and capacity. How can I assist your command center?`,
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  if (!isOpen) return null;

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    setInput('');
    const newMessages = [...messages, { role: 'user' as const, text: userMsg }];
    setMessages(newMessages);

    try {
      setLoading(true);

      const historyFormatted = messages.map((m) => ({
        role: m.role,
        parts: [{ text: m.text }],
      }));

      const res = await fetch('/api/v1/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMsg,
          history: historyFormatted,
          eventContext: {
            name: event.name,
            status: event.status,
            venue: event.venue,
            health: event.health,
            sessionsCount: event.sessions?.length || 2,
            tasksCount: 4,
            registeredCount: event.registeredCount || 0,
          },
        }),
      });

      if (!res.ok) throw new Error('Copilot response error');
      const data = await res.json();

      setMessages((prev) => [...prev, { role: 'model', text: data.reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'model',
          text: `[Offline Mode] For ${event.name}: Currently assigned to ${event.venue}. Event status is ${event.status} with health ${event.health}.`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white shadow-2xl border-l border-slate-200 flex flex-col animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-400/30">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-white">Operations Copilot</h3>
            <p className="text-[11px] text-slate-400">{event.name}</p>
          </div>
        </div>
        <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Message history */}
      <div ref={scrollRef} className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50">
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`flex items-start gap-2.5 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {m.role === 'model' && (
              <div className="w-7 h-7 rounded-lg bg-purple-700 text-white flex items-center justify-center shrink-0 text-xs">
                <Bot className="w-4 h-4" />
              </div>
            )}
            <div
              className={`max-w-[82%] p-3 rounded-2xl text-xs leading-relaxed ${
                m.role === 'user'
                  ? 'bg-emerald-600 text-white rounded-tr-none'
                  : 'bg-white text-slate-800 border border-slate-200 shadow-sm rounded-tl-none'
              }`}
            >
              {m.text}
            </div>
            {m.role === 'user' && (
              <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 text-xs">
                <User className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 text-xs text-purple-600 p-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Analyzing event dependencies & generating response...</span>
          </div>
        )}
      </div>

      {/* Quick Prompts */}
      <div className="px-4 py-2 bg-white border-t border-slate-100 flex gap-1.5 overflow-x-auto text-[11px]">
        <button
          onClick={() => setInput('What are the top risks right now?')}
          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full shrink-0 font-medium"
        >
          Top Risks?
        </button>
        <button
          onClick={() => setInput('What happens if we move venue?')}
          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full shrink-0 font-medium"
        >
          Venue impact?
        </button>
        <button
          onClick={() => setInput('Summarize pending tasks for today')}
          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full shrink-0 font-medium"
        >
          Pending tasks?
        </button>
      </div>

      {/* Input */}
      <div className="p-3 bg-white border-t border-slate-200 flex items-center gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Ask about schedule, resources, tasks, or risks..."
          className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-purple-500"
        />
        <button
          onClick={handleSend}
          disabled={loading || !input.trim()}
          className="p-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl shadow transition-colors"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
