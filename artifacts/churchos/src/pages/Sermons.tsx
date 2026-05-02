import { useState } from "react";
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
import { Mic2, Play, Rss } from "lucide-react";

export default function Sermons() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const list = useListSermons({ church: CHURCH });
  const play = useIncrementSermonPlay({
    mutation: {
      onSuccess: () => qc.invalidateQueries({ queryKey: getListSermonsQueryKey({ church: CHURCH }) }),
    },
  });
  const [form, setForm] = useState({
    title: "",
    preacher: "",
    sermonDate: new Date().toISOString().slice(0, 10),
    scripture: "",
    seriesName: "",
    description: "",
  });
  const [audio, setAudio] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const baseUrl = import.meta.env.BASE_URL;
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

  void baseUrl;

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
          className="text-sm text-amber-600 hover:text-amber-700 flex items-center gap-2 px-3 py-2 rounded border border-amber-300 hover-elevate"
          data-testid="link-rss"
        >
          <Rss className="w-4 h-4" /> Podcast RSS
        </a>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
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
                      src={`${apiBase}/sermons/audio/${encodeURIComponent(s.audioFilename ?? "demo.mp3")}`}
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
