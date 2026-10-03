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
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-[#0a0908] shadow-2xl border-l border-[#a9927d]/30 flex flex-col animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="px-5 py-4 bg-[#141210] border-b border-[#a9927d]/20 text-[#f2f4f3] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-[#49111c]/60 text-[#a9927d] border border-[#a9927d]/40">
            <Sparkles className="w-5 h-5 text-[#a9927d]" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-[#f2f4f3]">Operations Copilot</h3>
            <p className="text-[11px] text-[#a9927d]">{event.name}</p>
          </div>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg text-[#a9927d] hover:text-[#f2f4f3] hover:bg-[#5e503f]/30 transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Message history */}
      <div ref={scrollRef} className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#0a0908]">
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`flex items-start gap-2.5 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {m.role === 'model' && (
              <div className="w-7 h-7 rounded-lg bg-[#49111c] text-[#f2f4f3] flex items-center justify-center shrink-0 text-xs border border-[#a9927d]/30">
                <Bot className="w-4 h-4 text-[#a9927d]" />
              </div>
            )}
            <div
              className={`max-w-[82%] p-3 rounded-2xl text-xs leading-relaxed ${
                m.role === 'user'
                  ? 'bg-[#49111c] text-[#f2f4f3] rounded-tr-none border border-[#a9927d]/40'
                  : 'bg-[#151312] text-[#f2f4f3] border border-[#a9927d]/25 shadow-sm rounded-tl-none'
              }`}
            >
              {m.text}
            </div>
            {m.role === 'user' && (
              <div className="w-7 h-7 rounded-lg bg-[#5e503f] text-[#f2f4f3] flex items-center justify-center shrink-0 text-xs border border-[#a9927d]/30">
                <User className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 text-xs text-[#a9927d] p-2">
            <Loader2 className="w-4 h-4 animate-spin text-[#a9927d]" />
            <span>Analyzing event dependencies & generating response...</span>
          </div>
        )}
      </div>

      {/* Quick Prompts */}
      <div className="px-4 py-2 bg-[#12100e] border-t border-[#a9927d]/20 flex gap-1.5 overflow-x-auto text-[11px]">
        <button
          onClick={() => setInput('What are the top risks right now?')}
          className="px-2.5 py-1 bg-[#1a1715] hover:bg-[#5e503f]/40 text-[#a9927d] hover:text-[#f2f4f3] border border-[#a9927d]/20 rounded-full shrink-0 font-medium transition-colors"
        >
          Top Risks?
        </button>
        <button
          onClick={() => setInput('What happens if we move venue?')}
          className="px-2.5 py-1 bg-[#1a1715] hover:bg-[#5e503f]/40 text-[#a9927d] hover:text-[#f2f4f3] border border-[#a9927d]/20 rounded-full shrink-0 font-medium transition-colors"
        >
          Venue impact?
        </button>
        <button
          onClick={() => setInput('Summarize pending tasks for today')}
          className="px-2.5 py-1 bg-[#1a1715] hover:bg-[#5e503f]/40 text-[#a9927d] hover:text-[#f2f4f3] border border-[#a9927d]/20 rounded-full shrink-0 font-medium transition-colors"
        >
          Pending tasks?
        </button>
      </div>

      {/* Input */}
      <div className="p-3 bg-[#141210] border-t border-[#a9927d]/20 flex items-center gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Ask about schedule, resources, tasks, or risks..."
          className="flex-1 p-2.5 bg-[#0a0908] border border-[#a9927d]/30 text-[#f2f4f3] placeholder-[#a9927d]/50 rounded-xl text-xs outline-none focus:border-[#a9927d]"
        />
        <button
          onClick={handleSend}
          disabled={loading || !input.trim()}
          className="p-2.5 bg-[#49111c] hover:bg-[#631726] border border-[#a9927d]/40 disabled:opacity-50 text-[#f2f4f3] rounded-xl shadow transition-colors"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
