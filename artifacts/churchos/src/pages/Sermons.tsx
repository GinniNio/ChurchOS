import { useRef, useState } from "react";
import {
  useListSermons,
  useIncrementSermonPlay,
  getListSermonsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { CHURCH, formatDate } from "@/lib/format";
import { Mic2, Play, Rss, Send, RotateCcw } from "lucide-react";

type ChatSource = { id: number; title: string; preacher: string; sermonDate: string; scripture: string };
type ChatState =
  | { phase: "idle" }
  | { phase: "loading" }
  | { phase: "done"; answer: string; sources: ChatSource[] }
  | { phase: "error"; message: string };

export default function Sermons() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const list = useListSermons({ church: CHURCH });
  const play = useIncrementSermonPlay({
    mutation: {
      onSuccess: () => qc.invalidateQueries({ queryKey: getListSermonsQueryKey({ church: CHURCH }) }),
    },
  });

  // ── upload form ──────────────────────────────────────────────────────────
  const [form, setForm] = useState({
    title: "", preacher: "",
    sermonDate: new Date().toISOString().slice(0, 10),
    scripture: "", seriesName: "", description: "",
  });
  const [audio, setAudio] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const apiBase = "/api";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);
    const data = new FormData();
    data.append("churchName", CHURCH);
    data.append("title", form.title);
    data.append("preacher", form.preacher);
    data.append("sermonDate", form.sermonDate);
    data.append("scripture", form.scripture);
    if (form.seriesName) data.append("seriesName", form.seriesName);
    if (form.description) data.append("description", form.description);
    if (audio) data.append("audio", audio);
    try {
      const res = await fetch(`${apiBase}/sermons`, { method: "POST", body: data });
      if (!res.ok) throw new Error(await res.text());
      toast({ title: "Sermon uploaded", description: "Available in archive." });
      setForm({ title: "", preacher: "", sermonDate: new Date().toISOString().slice(0, 10), scripture: "", seriesName: "", description: "" });
      setAudio(null);
      qc.invalidateQueries({ queryKey: getListSermonsQueryKey({ church: CHURCH }) });
    } catch (err: any) {
      toast({ title: "Upload failed", description: String(err.message ?? err), variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  // ── sermon chat ──────────────────────────────────────────────────────────
  const [question, setQuestion] = useState("");
  const [chat, setChat] = useState<ChatState>({ phase: "idle" });
  const inputRef = useRef<HTMLInputElement>(null);
  const archiveRef = useRef<HTMLDivElement>(null);

  const askQuestion = async () => {
    const q = question.trim();
    if (!q) return;
    setChat({ phase: "loading" });
    try {
      const res = await fetch(`${apiBase}/ai/sermon-chat`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question: q, churchName: CHURCH }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setChat({ phase: "done", answer: data.answer, sources: data.sources ?? [] });
    } catch {
      setChat({ phase: "error", message: "Something went wrong. Try again." });
    }
  };

  const scrollToSermon = (id: number) => {
    const el = document.querySelector(`[data-testid="sermon-${id}"]`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const resetChat = () => {
    setChat({ phase: "idle" });
    setQuestion("");
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  return (
    <Layout>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">Sermon Archive</h1>
          <p className="text-slate-500 mt-1">Upload sermon audio, share, and auto-publish a podcast feed.</p>
        </div>
        <a
          href={`${apiBase}/sermons.rss?church=${encodeURIComponent(CHURCH)}`}
          target="_blank"
          rel="noreferrer"
          className="text-sm text-amber-600 hover:text-amber-700 flex items-center gap-2 px-3 py-2 rounded border border-amber-300"
          data-testid="link-rss"
        >
          <Rss className="w-4 h-4" /> Podcast RSS
        </a>
      </div>

      {/* ── AI Sermon Chat ─────────────────────────────────────────────────── */}
      <div className="mb-6 bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl border border-amber-200 p-6">
        <div className="text-lg font-bold mb-0.5">🤖 Ask Our Sermon Library</div>
        <p className="text-sm text-slate-600 mb-4">
          Ask anything — our AI answers from {CHURCH}'s own sermon content.
        </p>

        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && askQuestion()}
            placeholder="e.g. What has our pastor said about trusting God?"
            className="bg-white border-amber-300 focus-visible:ring-amber-400"
            disabled={chat.phase === "loading"}
            data-testid="input-sermon-question"
          />
          <Button
            onClick={askQuestion}
            disabled={chat.phase === "loading" || !question.trim()}
            className="bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold shrink-0"
            data-testid="button-ask-sermon"
          >
            <Send className="w-4 h-4 mr-1.5" /> Ask
          </Button>
        </div>

        {chat.phase === "loading" && (
          <div className="mt-4 flex items-center gap-2 text-amber-700 text-sm" data-testid="chat-loading">
            <span className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="w-2 h-2 bg-amber-500 rounded-full animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </span>
            Thinking…
          </div>
        )}

        {chat.phase === "done" && (
          <div className="mt-4 space-y-3" data-testid="chat-answer">
            <div className="bg-white border border-amber-200 rounded-lg p-4 shadow-sm">
              <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">{chat.answer}</p>

              {chat.sources.length > 0 && (
                <div className="mt-3 border-t border-amber-100 pt-3">
                  <div className="text-xs font-semibold uppercase tracking-wide text-amber-700 mb-2">Sources</div>
                  <div className="flex flex-wrap gap-2">
                    {chat.sources.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => scrollToSermon(s.id)}
                        className="text-xs bg-amber-100 hover:bg-amber-200 text-amber-900 px-2.5 py-1 rounded-full border border-amber-200 transition-colors"
                        data-testid={`source-chip-${s.id}`}
                      >
                        {s.title} — {s.preacher} · {formatDate(s.sermonDate)}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <button
              onClick={resetChat}
              className="text-xs text-amber-700 hover:text-amber-900 flex items-center gap-1"
              data-testid="button-ask-another"
            >
              <RotateCcw className="w-3 h-3" /> Ask another question
            </button>
          </div>
        )}

        {chat.phase === "error" && (
          <div className="mt-4 text-sm text-red-600 flex items-center gap-2" data-testid="chat-error">
            {chat.message}
            <button onClick={resetChat} className="underline text-xs">Try again</button>
          </div>
        )}
      </div>

      {/* ── existing upload + cards ────────────────────────────────────────── */}
      <div className="grid md:grid-cols-3 gap-6" ref={archiveRef}>
        <form className="bg-white rounded-lg p-6 border border-slate-200 space-y-3 self-start" onSubmit={submit}>
          <h2 className="font-bold mb-2">Upload sermon</h2>
          <div><Label>Title</Label><Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} data-testid="input-title" /></div>
          <div><Label>Preacher</Label><Input required value={form.preacher} onChange={(e) => setForm({ ...form, preacher: e.target.value })} data-testid="input-preacher-2" /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Date</Label><Input type="date" required value={form.sermonDate} onChange={(e) => setForm({ ...form, sermonDate: e.target.value })} /></div>
            <div><Label>Scripture</Label><Input required value={form.scripture} onChange={(e) => setForm({ ...form, scripture: e.target.value })} placeholder="John 3:16" data-testid="input-scripture" /></div>
          </div>
          <div><Label>Series (optional)</Label><Input value={form.seriesName} onChange={(e) => setForm({ ...form, seriesName: e.target.value })} /></div>
          <div><Label>Description</Label><Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div>
            <Label>Audio file (MP3, optional)</Label>
            <Input type="file" accept="audio/*" onChange={(e) => setAudio(e.target.files?.[0] ?? null)} data-testid="input-audio" />
            <div className="text-xs text-slate-500 mt-1">Files saved to /uploads. If none, plays a silent placeholder.</div>
          </div>
          <Button type="submit" disabled={uploading} className="w-full bg-slate-900 hover:bg-slate-800 text-white" data-testid="button-upload-sermon">
            {uploading ? "Uploading…" : "Upload sermon"}
          </Button>
        </form>

        <div className="md:col-span-2 space-y-3">
          {list.data?.map((s) => (
            <div key={s.id} className="bg-white rounded-lg p-5 border border-slate-200" data-testid={`sermon-${s.id}`}>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                  <Mic2 className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold">{s.title}</div>
                  <div className="text-sm text-slate-500">{s.preacher} · {formatDate(s.sermonDate)} · {s.scripture}</div>
                  {s.seriesName && <div className="text-xs text-amber-700 mt-0.5">{s.seriesName}</div>}
                  {s.description && <div className="text-sm text-slate-600 mt-2">{s.description}</div>}
                  <div className="mt-3 flex items-center gap-3">
                    <audio
                      controls
                      preload="none"
                      src={`${apiBase}/sermons/audio/${encodeURIComponent((s as any).audioFilename ?? "demo.mp3")}`}
                      onPlay={() => play.mutate({ id: s.id })}
                      className="h-9"
                      data-testid={`audio-${s.id}`}
                    />
                    <span className="text-xs text-slate-500 flex items-center gap-1">
                      <Play className="w-3 h-3" /> {s.playCount} plays
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {list.data?.length === 0 && (
            <div className="bg-white rounded-lg p-12 border border-slate-200 text-center text-slate-400">
              No sermons yet — upload your first.
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
