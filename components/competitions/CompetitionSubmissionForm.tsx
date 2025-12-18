"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Send, Loader2, AlertCircle, CheckCircle, MessageSquare } from "lucide-react";

interface Props {
  competitionId: string;
  botId: string;
  allowedBotIds?: string[];
  maxSubmissions: number;
  currentSubmissions: number;
  botNamesById?: Record<string, string>;
}

interface CompetitionChat {
  id: string;
  title: string;
  bot_id: string;
  created_at: string;
  competition_id?: string | null;
  is_competition_chat?: boolean;
}

export default function CompetitionSubmissionForm({
  competitionId,
  botId,
  allowedBotIds = [],
  maxSubmissions,
  currentSubmissions,
  botNamesById = {},
}: Props) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [chats, setChats] = useState<CompetitionChat[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [loadingChats, setLoadingChats] = useState<boolean>(true);
  const [chatsError, setChatsError] = useState<string | null>(null);

  const allowedBotsKey = useMemo(() => allowedBotIds.join(","), [allowedBotIds]);

  const getErrorMessage = (error: unknown, fallback: string) => {
    if (error instanceof Error) return error.message;
    return fallback;
  };

  // Load eligible chats for this competition
  useEffect(() => {
    const fetchChats = async () => {
      try {
        setLoadingChats(true);
        setChatsError(null);

        const params = new URLSearchParams();
        params.set("competitionId", competitionId);

        const res = await fetch(`/api/chats?${params.toString()}`);
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Failed to load competition chats.");
        }

        const data = (await res.json()) as { chats?: CompetitionChat[] };
        let loadedChats = data.chats || [];

        // If competition restricts bots, filter to those
        if (allowedBotIds.length > 0) {
          const allowedSet = new Set(
            allowedBotIds.includes(botId) ? allowedBotIds : [...allowedBotIds, botId]
          );
          loadedChats = loadedChats.filter((c) => allowedSet.has(c.bot_id));
        }

        setChats(loadedChats);
        if (loadedChats.length > 0) {
          setSelectedChatId((current) => current ?? loadedChats[0].id);
        } else {
          setSelectedChatId(null);
        }
      } catch (error: unknown) {
        setChatsError(getErrorMessage(error, "Failed to load competition chats."));
      } finally {
        setLoadingChats(false);
      }
    };

    fetchChats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [competitionId, allowedBotsKey, botId]);

  const [formData, setFormData] = useState({
    title: "",
    methodology_notes: "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      if (!selectedChatId) {
        setError("Please select a chat to submit to the competition.");
        setSubmitting(false);
        return;
      }

      const response = await fetch(
        `/api/competitions/${competitionId}/submissions`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: formData.title,
            methodology_notes: formData.methodology_notes,
            chat_id: selectedChatId,
          }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to submit");
      }

      setSuccess(true);
      setFormData({
        title: "",
        methodology_notes: "",
      });
      setSelectedChatId(null);

      // Refresh the page to show the new submission
      setTimeout(() => {
        router.refresh();
      }, 2000);
    } catch (error: unknown) {
      setError(getErrorMessage(error, "Failed to submit"));
    } finally {
      setSubmitting(false);
    }
  };

  const remainingSubmissions = maxSubmissions - currentSubmissions;

  return (
    <div className="bg-white rounded-lg border p-6 space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-2">Submit Your Entry</h2>
        <p className="text-sm text-gray-600">
          You have <span className="font-semibold">{remainingSubmissions}</span>{" "}
          submission{remainingSubmissions !== 1 ? "s" : ""} remaining out of{" "}
          {maxSubmissions}.
        </p>
      </div>

      {success && (
        <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
          <div>
            <div className="font-semibold text-green-900">
              Submission successful!
            </div>
            <div className="text-sm text-green-700 mt-1">
              Your entry has been submitted and will be evaluated when the
              competition closes.
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <div className="text-sm text-red-800">{error}</div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Step 1: Choose a chat */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium">
              1. Choose a competition chat *
            </label>
            <Link
              href="#use-competition-bot"
              className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1"
            >
              <MessageSquare className="w-3 h-3" />
              Start a new competition chat
            </Link>
          </div>
          {loadingChats && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading your chats for this competition...
            </div>
          )}
          {chatsError && !loadingChats && (
            <div className="text-sm text-red-600">
              {chatsError}
            </div>
          )}
          {!loadingChats && !chatsError && chats.length === 0 && (
            <div className="text-sm text-gray-600">
              No chats found for this competition yet. Use the{" "}
              <span className="font-semibold">Start a Competition Chat</span>{" "}
              section above, then return here to submit.
            </div>
          )}
          {!loadingChats && chats.length > 0 && (
            <div className="space-y-2">
              {chats.map((chat) => (
                <label
                  key={chat.id}
                  className={`flex items-center justify-between p-3 border rounded-lg text-sm cursor-pointer transition-colors ${
                    selectedChatId === chat.id
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{chat.title}</div>
                    <div className="text-xs text-gray-500 mt-1 flex flex-wrap gap-2">
                      <span>
                        Bot: {botNamesById[chat.bot_id] || chat.bot_id}
                      </span>
                      <span>
                        Created{" "}
                        {new Date(chat.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <input
                    type="radio"
                    className="ml-3"
                    checked={selectedChatId === chat.id}
                    onChange={() => setSelectedChatId(chat.id)}
                  />
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Step 2: Submission metadata */}
        <div>
          <label className="block text-sm font-medium mb-1">
            2. Submission Title *
          </label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            required
            className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="My Amazing Solution"
          />
          <p className="text-xs text-gray-500 mt-1">
            Give your submission a descriptive title
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Methodology Notes (Optional)
          </label>
          <textarea
            name="methodology_notes"
            value={formData.methodology_notes}
            onChange={handleChange}
            rows={4}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Explain your approach, thought process, or any special techniques you used..."
          />
          <p className="text-xs text-gray-500 mt-1">
            Optional: Share your approach and strategy
          </p>
        </div>

        <div className="pt-4">
          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {submitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                Submit Entry
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
