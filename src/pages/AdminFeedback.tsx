import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageSquare, Check, Loader2 } from "lucide-react";
import { feedbackApi, FeedbackRow } from "../api/client";

export function AdminFeedback() {
  const qc = useQueryClient();
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [markingId, setMarkingId] = useState<string | null>(null);

  const q = useQuery({
    queryKey: ["feedback", unreadOnly],
    queryFn: () => feedbackApi.list(unreadOnly),
  });

  async function markRead(id: string) {
    setMarkingId(id);
    try {
      await feedbackApi.markRead(id);
      qc.invalidateQueries({ queryKey: ["feedback"] });
    } finally {
      setMarkingId(null);
    }
  }

  const unreadCount = q.data?.filter((f) => !f.is_read).length ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <MessageSquare size={18} className="text-emerald-400" />
            <h2 className="text-xl font-bold text-white">Feedback</h2>
            {unreadCount > 0 && (
              <span className="text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                {unreadCount} unread
              </span>
            )}
          </div>
          <p className="text-gray-500 text-sm">User-submitted feedback and bug reports.</p>
        </div>

        {/* Filter */}
        <div className="flex gap-1.5">
          {[
            { label: "All", value: false },
            { label: "Unread", value: true },
          ].map(({ label, value }) => (
            <button
              key={label}
              onClick={() => setUnreadOnly(value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                unreadOnly === value
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                  : "bg-gray-900 text-gray-400 border border-gray-800 hover:border-gray-700 hover:text-gray-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {q.isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={24} className="text-emerald-400 animate-spin" />
        </div>
      )}

      {q.isError && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-400 text-sm">
          {(q.error as Error).message}
        </div>
      )}

      {q.data && q.data.length === 0 && (
        <div className="text-center py-16 text-gray-600 text-sm">
          {unreadOnly ? "No unread feedback." : "No feedback submitted yet."}
        </div>
      )}

      {q.data && q.data.length > 0 && (
        <div className="space-y-3">
          {q.data.map((item: FeedbackRow) => (
            <div
              key={item.id}
              className={`bg-gray-900 border rounded-xl p-4 transition-colors ${
                item.is_read
                  ? "border-gray-800"
                  : "border-emerald-500/20 bg-emerald-500/5"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="text-xs text-gray-400 font-mono">
                      {item.user_email ?? "deleted user"}
                    </span>
                    <span className="text-gray-700 text-xs">·</span>
                    <span className="text-xs text-gray-600">
                      {new Date(item.created_at).toLocaleString()}
                    </span>
                    {!item.is_read && (
                      <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded">
                        NEW
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-200 whitespace-pre-wrap leading-relaxed">
                    {item.message}
                  </p>
                </div>

                {!item.is_read && (
                  <button
                    onClick={() => markRead(item.id)}
                    disabled={markingId === item.id}
                    title="Mark as read"
                    className="flex-shrink-0 flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
                  >
                    {markingId === item.id ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <Check size={12} />
                    )}
                    Read
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
