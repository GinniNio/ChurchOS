import { useState } from "react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { CHURCH } from "@/lib/format";

const API = "/api";
const LANGS = ["Yoruba", "Igbo", "Hausa"] as const;
type Lang = typeof LANGS[number];

type Translations = {
  original: string;
  translations: Record<string, string | null>;
};

const FLAG: Record<Lang, string> = {
  Yoruba: "🟢",
  Igbo: "🔵",
  Hausa: "🔴",
};

export default function Announcements() {
  const { toast } = useToast();
  const [text, setText] = useState("");
  const [selected, setSelected] = useState<Set<Lang>>(new Set(["Yoruba", "Igbo", "Hausa"]));
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Translations | null>(null);
  const [sendingInbox, setSendingInbox] = useState(false);

  function toggleLang(lang: Lang) {
    const next = new Set(selected);
    if (next.has(lang)) next.delete(lang);
    else next.add(lang);
    setSelected(next);
  }

  async function translate() {
    if (!text.trim()) {
      toast({ title: "Please enter an announcement", variant: "destructive" });
      return;
    }
    if (selected.size === 0) {
      toast({ title: "Select at least one language", variant: "destructive" });
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const r = await fetch(`${API}/ai/translate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, targetLanguages: Array.from(selected) }),
      });
      const data: Translations = await r.json();
      setResult(data);
    } catch (e: any) {
      toast({ title: "Translation failed", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function sendToInbox() {
    if (!result) return;
    setSendingInbox(true);
    try {
      const langs = Object.entries(result.translations);
      for (const [lang, body] of langs) {
        if (!body) continue;
        await fetch(`${API}/notifications`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "announcement",
            recipient: `${lang.toLowerCase()}-group`,
            subject: `📢 ${lang} Announcement — ${CHURCH}`,
            body: body,
          }),
        }).catch(() => {});
      }
      toast({ title: "Sent to Inbox (demo)", description: `${langs.length} language versions logged` });
    } finally {
      setSendingInbox(false);
    }
  }

  function copyText(t: string) {
    navigator.clipboard.writeText(t).then(
      () => toast({ title: "Copied!" }),
      () => toast({ title: "Copy failed", variant: "destructive" }),
    );
  }

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">📢 Announcements</h1>
        <p className="text-slate-500 mt-1">
          Write once in English — translate instantly to Yoruba, Igbo, and Hausa.
        </p>
      </div>

      <div className="grid md:grid-cols-5 gap-6">
        {/* Input panel */}
        <div className="md:col-span-2 bg-white rounded-lg p-6 border border-slate-200 space-y-4">
          <div>
            <Label className="mb-1 block">Announcement (English)</Label>
            <Textarea
              rows={6}
              placeholder="e.g. Sunday service this week will begin at 9am. We will also be having a special thanksgiving offering. All are welcome."
              value={text}
              onChange={(e) => setText(e.target.value)}
              data-testid="input-announcement"
            />
          </div>

          <div>
            <Label className="mb-2 block text-sm">Translate to</Label>
            <div className="flex gap-2 flex-wrap">
              {LANGS.map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => toggleLang(lang)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                    selected.has(lang)
                      ? "bg-amber-500 border-amber-500 text-slate-900"
                      : "bg-white border-slate-300 text-slate-600 hover:border-amber-400"
                  }`}
                  data-testid={`toggle-${lang.toLowerCase()}`}
                >
                  {FLAG[lang]} {lang}
                </button>
              ))}
            </div>
          </div>

          <Button
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold"
            disabled={loading}
            onClick={translate}
            data-testid="button-translate"
          >
            {loading ? "Translating…" : "Translate"}
          </Button>
        </div>

        {/* Results panel */}
        <div className="md:col-span-3 space-y-4">
          {result ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                {/* English original */}
                <div className="col-span-2 bg-white rounded-lg p-4 border border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">🇬🇧 English (Original)</span>
                    <button className="text-xs text-amber-600 hover:underline" onClick={() => copyText(result.original)}>
                      Copy
                    </button>
                  </div>
                  <p className="text-sm leading-relaxed">{result.original}</p>
                </div>

                {LANGS.map((lang) => {
                  const t = result.translations[lang];
                  const active = selected.has(lang);
                  return (
                    <div
                      key={lang}
                      className={`bg-white rounded-lg p-4 border ${active ? "border-slate-200" : "border-dashed border-slate-200"}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                          {FLAG[lang]} {lang}
                        </span>
                        {t && active && (
                          <button
                            className="text-xs text-amber-600 hover:underline"
                            onClick={() => copyText(t)}
                          >
                            Copy
                          </button>
                        )}
                      </div>
                      {!active ? (
                        <p className="text-xs text-slate-400 italic">Not selected</p>
                      ) : t ? (
                        <p className="text-sm leading-relaxed">{t}</p>
                      ) : (
                        <p className="text-xs text-red-400 italic">Translation unavailable</p>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Send to inbox */}
              <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                <div className="text-sm font-semibold mb-1">Send to Members (Demo)</div>
                <p className="text-xs text-slate-500 mb-3">
                  Each translated version will be logged to the Inbox as if broadcast to that language group.
                </p>
                <Button
                  size="sm"
                  className="bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold"
                  disabled={sendingInbox}
                  onClick={sendToInbox}
                  data-testid="button-send-inbox"
                >
                  {sendingInbox ? "Sending…" : "Send to Inbox (Demo)"}
                </Button>
              </div>
            </>
          ) : (
            <div className="bg-white rounded-lg border border-dashed border-slate-200 p-12 text-center text-slate-400 text-sm">
              Translation results will appear here after you click Translate.
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
