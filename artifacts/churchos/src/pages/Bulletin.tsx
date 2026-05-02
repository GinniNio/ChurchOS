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

  const create = useCreateProgram({
    mutation: {
      onSuccess: (p) => {
        toast({ title: "Bulletin generated", description: "Ready to print or share." });
        setPreview(p.generatedHtml);
        qc.invalidateQueries({ queryKey: getListProgramsQueryKey({ church: CHURCH }) });
      },
    },
  });

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
                    if (w) {
                      w.document.write(preview);
                      w.document.close();
                      w.print();
                    }
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
