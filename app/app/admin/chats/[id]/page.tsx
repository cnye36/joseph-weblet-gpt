import { isAdmin } from "@/lib/admin";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import AppHeader from "@/components/header/AppHeader";
import Link from "next/link";
import { ArrowLeft, MessageSquare, User, Calendar } from "lucide-react";

function resolveMessageContent(message: {
  content: string | null;
  parts?: unknown[] | null;
}): string {
  if (message.content) return message.content;

  if (Array.isArray(message.parts)) {
    const texts = message.parts
      .filter(
        (p): p is { type: string; text?: string } =>
          typeof p === "object" && p !== null && "type" in p
      )
      .map((p) => (p.type === "text" && typeof p.text === "string" ? p.text : ""))
      .filter((text) => text.length > 0);

    if (texts.length > 0) {
      return texts.join("\n\n");
    }
  }

  return "";
}

export default async function AdminChatDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (!(await isAdmin())) {
    return <div className="p-6">Forbidden</div>;
  }

  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: chat, error: chatError } = await supabaseAdmin
    .from("chats")
    .select("id, title, bot_id, user_id, competition_id, created_at")
    .eq("id", id)
    .maybeSingle();

  if (chatError || !chat) {
    return (
      <>
        <AppHeader />
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center space-y-4">
            <MessageSquare className="w-12 h-12 mx-auto text-gray-400" />
            <div className="text-xl font-semibold">Chat not found</div>
            <Link
              href="/app/admin/competitions"
              className="text-blue-600 hover:underline"
            >
              Back to competitions
            </Link>
          </div>
        </div>
      </>
    );
  }

  const { data: user } = await supabaseAdmin
    .from("auth.users")
    .select("email")
    .eq("id", chat.user_id)
    .maybeSingle();

  const { data: messages } = await supabaseAdmin
    .from("messages")
    .select("id, role, content, parts, created_at")
    .eq("chat_id", id)
    .order("created_at", { ascending: true });

  return (
    <>
      <AppHeader />
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-5xl mx-auto p-6 space-y-6">
          <div className="flex items-center gap-4">
            <Link
              href="/app/admin/competitions"
              className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to competitions
            </Link>
          </div>

          <div className="bg-white rounded-lg border p-6 space-y-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-blue-600" />
              <h1 className="text-lg font-semibold text-gray-900">
                Chat: {chat.title}
              </h1>
            </div>
            <div className="flex flex-wrap gap-4 text-xs text-gray-600">
              <div className="flex items-center gap-1">
                <User className="w-3 h-3" />
                {user?.email ?? "Unknown user"}
              </div>
              <div>Bot: {chat.bot_id}</div>
              {chat.competition_id && (
                <div>Competition ID: {chat.competition_id}</div>
              )}
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Created {new Date(chat.created_at).toLocaleString()}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border p-6 max-h-[70vh] overflow-y-auto">
            {messages && messages.length > 0 ? (
              <div className="space-y-4">
                {messages.map((m) => {
                  const text = resolveMessageContent(m);
                  const isUser = m.role === "user";
                  return (
                    <div
                      key={m.id}
                      className={`flex ${
                        isUser ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg px-4 py-3 text-sm whitespace-pre-wrap ${
                          isUser
                            ? "bg-blue-600 text-white"
                            : "bg-gray-100 text-gray-900"
                        }`}
                      >
                        <div className="text-[10px] uppercase tracking-wide opacity-70 mb-1">
                          {m.role}
                        </div>
                        <div>{text}</div>
                        <div className="mt-2 text-[10px] opacity-60">
                          {new Date(m.created_at).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-sm text-gray-500">
                No messages found for this chat.
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}


