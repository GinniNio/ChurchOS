import { useState } from "react";
import {
  useListPrograms,
  useCreateProgram,
  getListProgramsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { CHURCH, formatDate } from "@/lib/format";

const API = "/api";
const LANGS = ["Yoruba", "Igbo", "Hausa"] as const;
type Lang = typeof LANGS[number];

export default function Bulletin() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const programs = useListPrograms({ church: CHURCH });
  const [preview, setPreview] = useState<string | null>(null);
  const [form, setForm] = useState({
    sermonTitle: "",
    preacher: "",
    serviceDate: new Date().toISOString().slice(0, 10),
    scripture1: "",
    scripture2: "",
    scripture3: "",
    mainPoints: "",
    announcements: "",
    offeringTheme: "",
  });

  // AI Context (Feature 7)
  const [contextOpen, setContextOpen] = useState(false);
  const [contextLoading, setContextLoading] = useState(false);
  const [aiContext, setAiContext] = useState<string | null>(null);

  // Translation (Feature 6)
  const [transLoading, setTransLoading] = useState(false);
  const [transLangs, setTransLangs] = useState<Set<Lang>>(new Set(["Yoruba", "Igbo", "Hausa"]));
  const [translations, setTranslations] = useState<Record<string, string | null> | null>(null);

  const create = useCreateProgram({
    mutation: {
      onSuccess: (p) => {
        toast({ title: "Bulletin generated", description: "Ready to print or share." });
        setPreview(p.generatedHtml);
        qc.invalidateQueries({ queryKey: getListProgramsQueryKey({ church: CHURCH }) });
      },
    },
  });

  async function fetchContext() {
    if (!form.sermonTitle || !form.scripture1) {
      toast({ title: "Enter sermon title and at least one scripture first", variant: "destructive" });
      return;
    }
    setContextLoading(true);
    try {
      const r = await fetch(`${API}/ai/sermon-context`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scripture: form.scripture1,
          sermonTitle: form.sermonTitle,
          mainPoints: form.mainPoints,
          churchName: CHURCH,
        }),
      });
      const d = await r.json();
      setAiContext(d.context ?? null);
    } catch (e: any) {
      toast({ title: "Context fetch failed", description: e.message, variant: "destructive" });
    } finally {
      setContextLoading(false);
    }
  }

  function insertContextIntoPoints() {
    if (!aiContext) return;
    setForm((f) => ({ ...f, mainPoints: f.mainPoints ? `${f.mainPoints}\n\n--- AI Context ---\n${aiContext}` : aiContext }));
    toast({ title: "Context inserted into Main Points" });
  }

  function copyAll() {
    if (!aiContext) return;
    navigator.clipboard.writeText(aiContext).then(
      () => toast({ title: "Copied!" }),
      () => toast({ title: "Copy failed", variant: "destructive" }),
    );
  }

  async function translateAnnouncements() {
    if (!form.announcements.trim()) {
      toast({ title: "Enter announcements first", variant: "destructive" });
      return;
    }
    setTransLoading(true);
    setTranslations(null);
    try {
      const r = await fetch(`${API}/ai/translate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: form.announcements, targetLanguages: Array.from(transLangs) }),
      });
      const d = await r.json();
      setTranslations(d.translations ?? null);
    } catch (e: any) {
      toast({ title: "Translation failed", description: e.message, variant: "destructive" });
    } finally {
      setTransLoading(false);
    }
  }

  function copyTrans(t: string) {
    navigator.clipboard.writeText(t).then(
      () => toast({ title: "Copied!" }),
      () => toast({ title: "Copy failed", variant: "destructive" }),
    );
  }

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Sunday Prep</h1>
        <p className="text-slate-500 mt-1">Generate a printable bulletin in under a minute.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg p-6 border border-slate-200">
          <h2 className="font-bold mb-4">Service details</h2>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              create.mutate({
                data: {
                  churchName: CHURCH,
                  sermonTitle: form.sermonTitle,
                  preacher: form.preacher,
                  serviceDate: form.serviceDate,
                  scripture1: form.scripture1 || undefined,
                  scripture2: form.scripture2 || undefined,
                  scripture3: form.scripture3 || undefined,
                  mainPoints: form.mainPoints || undefined,
                  announcements: form.announcements || undefined,
                  offeringTheme: form.offeringTheme || undefined,
                },
              });
            }}
          >
            <div>
              <Label>Sermon title</Label>
              <Input required value={form.sermonTitle} onChange={(e) => setForm({ ...form, sermonTitle: e.target.value })} data-testid="input-sermon-title" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Preacher</Label>
                <Input required value={form.preacher} onChange={(e) => setForm({ ...form, preacher: e.target.value })} data-testid="input-preacher" />
              </div>
              <div>
                <Label>Service date</Label>
                <Input type="date" required value={form.serviceDate} onChange={(e) => setForm({ ...form, serviceDate: e.target.value })} data-testid="input-service-date" />
              </div>
            </div>
            <div>
              <Label>Scripture readings</Label>
              <Input className="mb-2" placeholder="e.g. John 3:16-21" value={form.scripture1} onChange={(e) => setForm({ ...form, scripture1: e.target.value })} data-testid="input-scripture-1" />
              <Input className="mb-2" placeholder="Optional" value={form.scripture2} onChange={(e) => setForm({ ...form, scripture2: e.target.value })} />
              <Input placeholder="Optional" value={form.scripture3} onChange={(e) => setForm({ ...form, scripture3: e.target.value })} />
            </div>
            <div>
              <Label>Main points (one per line)</Label>
              <Textarea rows={4} value={form.mainPoints} onChange={(e) => setForm({ ...form, mainPoints: e.target.value })} data-testid="input-main-points" />
            </div>
            <div>
              <Label>Announcements (one per line)</Label>
              <Textarea rows={3} value={form.announcements} onChange={(e) => setForm({ ...form, announcements: e.target.value })} data-testid="input-announcements" />
            </div>
            <div>
              <Label>Offering theme</Label>
              <Input value={form.offeringTheme} onChange={(e) => setForm({ ...form, offeringTheme: e.target.value })} data-testid="input-offering-theme" />
            </div>

            {/* ── AI Nigerian Context Panel (Feature 7) ─────────────────── */}
            <div className="border border-amber-200 rounded-lg overflow-hidden">
              <button
                type="button"
                className="w-full flex items-center justify-between px-4 py-3 bg-amber-50 text-sm font-semibold text-amber-800 hover:bg-amber-100 transition-colors"
                onClick={() => setContextOpen((o) => !o)}
                data-testid="button-toggle-context"
              >
                <span>✨ Get Nigerian Context (AI)</span>
                <span className="text-xs">{contextOpen ? "▲" : "▼"}</span>
              </button>

              {contextOpen && (
                <div className="p-4 bg-white space-y-3">
                  <Button
                    type="button"
                    className="bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold w-full"
                    disabled={contextLoading}
                    onClick={fetchContext}
                    data-testid="button-generate-context"
                  >
                    {contextLoading ? (
                      <span className="flex items-center gap-2">
                        <span className="animate-pulse">Finding Nigerian connections for your text</span>
                        <span className="animate-bounce">…</span>
                      </span>
                    ) : (
                      "Generate Illustrations"
                    )}
                  </Button>

                  {aiContext && (
                    <div className="border-l-4 border-amber-400 bg-amber-50 rounded-r-lg p-4 text-sm space-y-2">
                      <pre className="whitespace-pre-wrap font-sans leading-relaxed text-slate-700 text-xs">{aiContext}</pre>
                      <div className="flex gap-2 pt-1">
                        <Button type="button" size="sm" variant="outline" className="text-xs" onClick={copyAll}>
                          Copy All Context
                        </Button>
                        <Button type="button" size="sm" variant="outline" className="text-xs" onClick={insertContextIntoPoints}>
                          Insert into Main Points
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <Button type="submit" disabled={create.isPending} className="w-full bg-slate-900 hover:bg-slate-800 text-white" data-testid="button-generate-bulletin">
              {create.isPending ? "Generating…" : "Generate bulletin"}
            </Button>
          </form>
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="text-sm font-semibold">Preview</div>
              {preview && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const w = window.open("", "_blank");
                    if (w) { w.document.write(preview); w.document.close(); w.print(); }
                  }}
                  data-testid="button-print-bulletin"
                >
                  Print
                </Button>
              )}
            </div>
            {preview ? (
              <iframe srcDoc={preview} className="w-full h-[500px] bg-white" title="Bulletin preview" data-testid="iframe-preview" />
            ) : (
              <div className="p-12 text-center text-sm text-slate-400">Generate a bulletin to preview it here.</div>
            )}
          </div>

          {/* ── Announcement Translation Panel (Feature 6) ───────────────── */}
          {form.announcements.trim() && (
            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
                <div className="text-sm font-semibold">📢 Translate Announcements</div>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex gap-2 flex-wrap">
                  {LANGS.map((lang) => (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => {
                        const next = new Set(transLangs);
                        if (next.has(lang)) next.delete(lang);
                        else next.add(lang);
                        setTransLangs(next);
                      }}
                      className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                        transLangs.has(lang)
                          ? "bg-amber-500 border-amber-500 text-slate-900"
                          : "bg-white border-slate-300 text-slate-600 hover:border-amber-400"
                      }`}
                    >
                      {lang}
                    </button>
                  ))}
                  <Button
                    type="button"
                    size="sm"
                    className="bg-slate-900 hover:bg-slate-800 text-white"
                    disabled={transLoading || transLangs.size === 0}
                    onClick={translateAnnouncements}
                    data-testid="button-translate-bulletin"
                  >
                    {transLoading ? "Translating…" : "Translate"}
                  </Button>
                </div>

                {translations && (
                  <div className="space-y-2">
                    {LANGS.filter((l) => transLangs.has(l)).map((lang) => (
                      <div key={lang} className="bg-slate-50 rounded p-3 border border-slate-100">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold text-slate-500">{lang}</span>
                          {translations[lang] && (
                            <button
                              className="text-xs text-amber-600 hover:underline"
                              onClick={() => copyTrans(translations[lang]!)}
                            >
                              Copy
                            </button>
                          )}
                        </div>
                        <p className="text-sm text-slate-700 leading-relaxed">
                          {translations[lang] ?? <span className="text-red-400 italic">Translation unavailable</span>}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="bg-white rounded-lg p-4 border border-slate-200">
            <div className="text-sm font-semibold mb-3">Recent bulletins</div>
            <ul className="space-y-2">
              {programs.data?.slice(0, 5).map((p) => (
                <li key={p.id}>
                  <button
                    className="w-full text-left text-sm hover-elevate active-elevate-2 px-3 py-2 rounded"
                    onClick={() => setPreview(p.generatedHtml)}
                    data-testid={`button-recent-${p.id}`}
                  >
                    <div className="font-medium">{p.sermonTitle}</div>
                    <div className="text-xs text-slate-500">{formatDate(p.serviceDate)} · {p.preacher}</div>
                  </button>
                </li>
              ))}
              {programs.data?.length === 0 && (
                <li className="text-sm text-slate-400 px-3 py-2">No bulletins yet.</li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </Layout>
  );
}
