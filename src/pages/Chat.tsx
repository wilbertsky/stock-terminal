import { useState, useRef, useEffect } from "react";
import { Send, Loader2, Bot, User, AlertTriangle, Sparkles, Trash2 } from "lucide-react";
import { chatApi, ChatMessage } from "../api/client";

const MAX_HISTORY = 12;

interface Message extends ChatMessage {
  consistencyWarnings?: string[];
}

// Module-level store so history survives React Router unmounting this page.
let chatHistory: Message[] = [];

function updateHistory(msgs: Message[]) {
  chatHistory = msgs;
}

export function Chat() {
  const [messages, setMessages] = useState<Message[]>(chatHistory);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  function setAndPersist(msgs: Message[]) {
    updateHistory(msgs);
    setMessages(msgs);
  }

  function clearChat() {
    setAndPersist([]);
    setError(null);
  }

  async function sendMessage(e?: React.FormEvent) {
    e?.preventDefault();
    const question = input.trim();
    if (!question || loading) return;
    if (question.length < 3) {
      setError("Question must be at least 3 characters.");
      return;
    }

    const userMsg: Message = { role: "user", content: question };
    const nextMessages = [...messages, userMsg];
    setAndPersist(nextMessages);
    setInput("");
    setError(null);
    setLoading(true);

    const history: ChatMessage[] = messages.slice(-MAX_HISTORY).map((m) => ({
      role: m.role,
      content: m.content,
    }));

    try {
      const data = await chatApi.send(question, history);
      const assistantMsg: Message = {
        role: "assistant",
        content: data.answer ?? "(no response)",
        consistencyWarnings: data.consistencyWarnings ?? [],
      };
      setAndPersist([...nextMessages, assistantMsg]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
      setAndPersist(messages);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <div className="max-w-3xl mx-auto flex flex-col h-[calc(100vh-6rem)] md:h-[calc(100vh-4rem)]">
      {/* Beta banner */}
      <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/25 rounded-xl px-4 py-3 mb-4 flex-shrink-0">
        <Sparkles size={16} className="text-amber-400 mt-0.5 flex-shrink-0" />
        <div className="text-xs text-amber-300 leading-relaxed flex-1">
          <span className="font-semibold text-amber-400">Beta &mdash; AI Chat</span>
          {" "}This assistant can answer questions about stocks surfaced by the screener &mdash; fundamentals,
          Graham Number context, and recent news. It does not have access to your saved portfolios.
          Not financial advice &mdash; always do your own research.
        </div>
        {messages.length > 0 && (
          <button
            onClick={clearChat}
            disabled={loading}
            title="Clear chat"
            className="flex-shrink-0 flex items-center gap-1.5 text-[11px] font-medium text-gray-500 hover:text-red-400 disabled:opacity-40 transition-colors ml-2"
          >
            <Trash2 size={13} />
            Clear
          </button>
        )}
      </div>

      {/* Message list */}
      <div className="flex-1 overflow-y-auto space-y-4 pb-2 pr-1">
        {messages.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center h-full text-center gap-3 py-16">
            <Bot size={40} className="text-gray-700" />
            <p className="text-gray-500 text-sm max-w-xs">
              Ask anything about stocks in the discovery index — fundamentals,
              Graham Number context, recent news, sector trends.
            </p>
            <div className="flex flex-wrap gap-2 justify-center mt-2">
              {[
                "What financials look close to their Graham Number?",
                "Any energy small-caps with strong Piotroski scores?",
                "What's the latest news on BOH?",
              ].map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => { setInput(prompt); textareaRef.current?.focus(); }}
                  className="text-xs bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-400 hover:text-gray-200 rounded-lg px-3 py-1.5 transition-colors"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.role === "assistant" && (
              <div className="flex-shrink-0 w-7 h-7 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mt-0.5">
                <Bot size={14} className="text-emerald-400" />
              </div>
            )}

            <div className={`max-w-[85%] ${msg.role === "user" ? "items-end" : "items-start"} flex flex-col gap-1`}>
              <div
                className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === "user"
                    ? "bg-emerald-500 text-gray-950 font-medium rounded-br-sm"
                    : "bg-gray-800 text-gray-100 rounded-bl-sm"
                }`}
              >
                {msg.content}
              </div>

              {msg.consistencyWarnings && msg.consistencyWarnings.length > 0 && (
                <div className="flex flex-col gap-1 mt-1">
                  {msg.consistencyWarnings.map((w, wi) => (
                    <div
                      key={wi}
                      className="flex items-start gap-1.5 text-[11px] text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-1.5"
                    >
                      <AlertTriangle size={11} className="mt-0.5 flex-shrink-0" />
                      {w}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {msg.role === "user" && (
              <div className="flex-shrink-0 w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center mt-0.5">
                <User size={14} className="text-gray-300" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex gap-3 justify-start">
            <div className="flex-shrink-0 w-7 h-7 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
              <Bot size={14} className="text-emerald-400" />
            </div>
            <div className="bg-gray-800 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-2">
              <Loader2 size={14} className="text-emerald-400 animate-spin" />
              <span className="text-gray-400 text-sm">Thinking…</span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 mb-2 flex-shrink-0">
          <AlertTriangle size={13} className="flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Input */}
      <form onSubmit={sendMessage} className="flex gap-2 flex-shrink-0 mt-2">
        <textarea
          ref={textareaRef}
          rows={1}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about stocks, fundamentals, news…"
          disabled={loading}
          className="flex-1 bg-gray-800 border border-gray-700 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 resize-none focus:outline-none transition-colors disabled:opacity-50"
          style={{ maxHeight: "120px", overflowY: "auto" }}
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="flex-shrink-0 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-gray-950 rounded-xl px-3 transition-colors"
        >
          <Send size={16} />
        </button>
      </form>

      <p className="text-[10px] text-gray-700 text-center mt-2 flex-shrink-0">
        Press Enter to send &middot; Shift+Enter for new line
      </p>
    </div>
  );
}
