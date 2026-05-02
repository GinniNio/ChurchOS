import { useState } from "react";
import {
  useListVisitors,
  useCreateVisitor,
  useUpdateVisitorStatus,
  useGetVisitorsSummary,
  getListVisitorsQueryKey,
  getGetVisitorsSummaryQueryKey,
  getGetUnreadNotificationsCountQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { CHURCH, formatDate } from "@/lib/format";
import { X, CalendarCheck } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  new: "bg-amber-100 text-amber-800",
  contacted: "bg-blue-100 text-blue-800",
  returned: "bg-green-100 text-green-800",
  cold: "bg-slate-200 text-slate-700",
};

const MSG_TYPE_BADGE: Record<string, string> = {
  sms: "bg-blue-100 text-blue-800",
  "cell-leader-alert": "bg-amber-100 text-amber-800",
  pastoral: "bg-purple-100 text-purple-800",
  "sequence-scheduled": "bg-slate-100 text-slate-700",
};

const DAY_MAP: Record<number, number> = { 1: 0, 2: 3, 3: 7, 4: 10, 5: 14 };

type SequenceStep = {
  id: number;
  step: number;
  scheduledAt: string;
  messageType: string;
  recipient: string;
  subject: string;
  body: string;
  status: string;
  sentAt: string | null;
};

export default function Visitors() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const visitors = useListVisitors({ church: CHURCH });
  const summary = useGetVisitorsSummary({ church: CHURCH });
  const [seqModal, setSeqModal] = useState<{ visitor: any; steps: SequenceStep[] } | null>(null);
  const [seqLoading, setSeqLoading] = useState<number | null>(null);
  const [seqStats, setSeqStats] = useState<{ active: number; sentThisWeek: number } | null>(null);

  useState(() => {
    fetch(`/api/visitors/sequences/stats?church=${encodeURIComponent(CHURCH)}`)
      .then((r) => r.json())
      .then(setSeqStats)
      .catch(() => {});
  });

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: getListVisitorsQueryKey({ church: CHURCH }) });
    qc.invalidateQueries({ queryKey: getGetVisitorsSummaryQueryKey({ church: CHURCH }) });
    qc.invalidateQueries({ queryKey: getGetUnreadNotificationsCountQueryKey() });
  };

  const create = useCreateVisitor({
    mutation: {
      onSuccess: () => {
        toast({ title: "Visitor added", description: "Welcome SMS + 14-day nurture sequence queued for approval." });
        setForm({ fullName: "", phone: "", email: "", howHeard: "Friend", firstTime: true, consentGiven: false });
        invalidateAll();
        fetch(`/api/visitors/sequences/stats?church=${encodeURIComponent(CHURCH)}`)
          .then((r) => r.json()).then(setSeqStats).catch(() => {});
      },
    },
  });

  const updateStatus = useUpdateVisitorStatus({
    mutation: { onSuccess: () => invalidateAll() },
  });

  const [form, setForm] = useState({
    fullName: "", phone: "", email: "", howHeard: "Friend", firstTime: true, consentGiven: false,
  });

  const openSequence = async (visitor: any) => {
    setSeqLoading(visitor.id);
    try {
      const res = await fetch(`/api/visitors/sequences?visitorId=${visitor.id}`);
      const steps: SequenceStep[] = await res.json();
      setSeqModal({ visitor, steps });
    } catch {
      toast({ title: "Could not load sequence", variant: "destructive" });
    } finally {
      setSeqLoading(null);
    }
  };

  return (
    <Layout>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">Visitor Follow-Up</h1>
          <p className="text-slate-500 mt-1">Capture first-time guests and turn them into lifelong members.</p>
        </div>
        {seqStats && (
          <div className="text-sm text-slate-500 bg-white border border-slate-200 rounded-lg px-4 py-2 flex items-center gap-2">
            <CalendarCheck className="w-4 h-4 text-amber-500" />
            <span>
              <strong className="text-slate-900">{seqStats.active}</strong> sequences active ·{" "}
              <strong className="text-slate-900">{seqStats.sentThisWeek}</strong> messages sent this week
            </span>
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total", value: summary.data?.total ?? 0 },
          { label: "New", value: summary.data?.newCount ?? 0 },
          { label: "Contacted", value: summary.data?.contactedCount ?? 0 },
          { label: "Returned", value: summary.data?.returnedCount ?? 0 },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-lg p-4 border border-slate-200">
            <div className="text-xs uppercase tracking-wider text-slate-500">{s.label}</div>
            <div className="text-2xl font-bold mt-1">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-1 bg-white rounded-lg p-6 border border-slate-200 self-start">
          <h2 className="font-bold mb-4">Add visitor</h2>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              (create.mutate as any)({
                data: {
                  churchName: CHURCH,
                  fullName: form.fullName,
                  phone: form.phone,
                  email: form.email || undefined,
                  howHeard: form.howHeard || undefined,
                  firstTime: form.firstTime,
                  consentGiven: form.consentGiven ? 1 : 0,
                },
              });
            }}
          >
            <div>
              <Label htmlFor="fullName">Full name</Label>
              <Input id="fullName" required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} data-testid="input-visitor-name" />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+234…" data-testid="input-visitor-phone" />
            </div>
            <div>
              <Label htmlFor="email">Email (optional)</Label>
              <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} data-testid="input-visitor-email" />
            </div>
            <div>
              <Label htmlFor="howHeard">How did they hear?</Label>
              <select
                id="howHeard"
                className="w-full h-9 px-3 rounded border border-slate-300 bg-white text-sm"
                value={form.howHeard}
                onChange={(e) => setForm({ ...form, howHeard: e.target.value })}
                data-testid="select-how-heard"
              >
                <option>Friend</option>
                <option>Instagram</option>
                <option>Radio</option>
                <option>Walked in</option>
                <option>Other</option>
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.firstTime}
                onChange={(e) => setForm({ ...form, firstTime: e.target.checked })}
                data-testid="check-first-time"
              />
              First-time visitor
            </label>
            <label className="flex items-start gap-2 text-sm text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={form.consentGiven}
                onChange={(e) => setForm({ ...form, consentGiven: e.target.checked })}
                className="mt-0.5 w-4 h-4"
                data-testid="check-consent"
              />
              I'd like to receive updates and messages from {CHURCH} about services, events and community news.
            </label>
            <Button type="submit" disabled={create.isPending} className="w-full bg-slate-900 hover:bg-slate-800 text-white" data-testid="button-add-visitor">
              {create.isPending ? "Adding…" : "Add visitor + send welcome"}
            </Button>
          </form>
        </div>

        <div className="md:col-span-2 bg-white rounded-lg border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="text-left px-4 py-3">Name</th>
                <th className="text-left px-4 py-3">Phone</th>
                <th className="text-left px-4 py-3">Visited</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visitors.data?.map((v) => (
                <tr key={v.id} data-testid={`visitor-row-${v.id}`}>
                  <td className="px-4 py-3">
                    <div className="font-medium">{v.fullName}</div>
                    <div className="text-xs text-slate-500">{v.howHeard ?? "—"}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{v.phone}</td>
                  <td className="px-4 py-3 text-slate-600">{formatDate(v.visitDate)}</td>
                  <td className="px-4 py-3">
                    <Badge className={`${STATUS_COLORS[v.status] ?? "bg-slate-200 text-slate-700"} capitalize`} variant="secondary">
                      {v.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right flex items-center justify-end gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openSequence(v)}
                      disabled={seqLoading === v.id}
                      data-testid={`button-sequence-${v.id}`}
                      className="text-xs"
                    >
                      {seqLoading === v.id ? "…" : "Sequence"}
                    </Button>
                    <select
                      className="h-8 text-xs rounded border border-slate-300 bg-white px-2"
                      value={v.status}
                      onChange={(e) => updateStatus.mutate({ id: v.id, data: { status: e.target.value } })}
                      data-testid={`select-status-${v.id}`}
                    >
                      <option value="new">new</option>
                      <option value="contacted">contacted</option>
                      <option value="returned">returned</option>
                      <option value="cold">cold</option>
                    </select>
                  </td>
                </tr>
              ))}
              {visitors.data?.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                    No visitors yet — add your first above.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {seqModal && (
        <div
          className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4"
          onClick={(e) => e.target === e.currentTarget && setSeqModal(null)}
        >
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <div>
                <div className="font-bold text-base">14-Day Nurture Sequence</div>
                <div className="text-sm text-amber-600">{seqModal.visitor.fullName}</div>
              </div>
              <button onClick={() => setSeqModal(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 px-6 py-4 space-y-3">
              {seqModal.steps.length === 0 && (
                <p className="text-sm text-slate-400 text-center py-8">
                  No sequence steps yet.<br />
                  <button
                    className="text-amber-600 underline mt-2 text-xs"
                    onClick={async () => {
                      await fetch(`/api/visitors/${seqModal.visitor.id}/start-sequence`, { method: "POST" });
                      openSequence(seqModal.visitor);
                    }}
                  >
                    Start sequence now
                  </button>
                </p>
              )}
              {seqModal.steps.map((s) => (
                <div
                  key={s.id}
                  className={`rounded-lg border p-4 ${s.status === "sent" ? "bg-green-50 border-green-200" : "bg-slate-50 border-slate-200"}`}
                  data-testid={`seq-step-${s.step}`}
                >
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-xs font-bold text-slate-700">Step {s.step}</span>
                    <span className="text-xs text-slate-500">Day {DAY_MAP[s.step] ?? "?"}</span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${MSG_TYPE_BADGE[s.messageType] ?? "bg-slate-100 text-slate-600"}`}>
                      {s.messageType === "cell-leader-alert" ? "Alert" : s.messageType.toUpperCase()}
                    </span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ml-auto ${s.status === "sent" ? "bg-green-100 text-green-800" : "bg-slate-200 text-slate-600"}`}>
                      {s.status === "sent" ? "✓ Sent" : "Pending"}
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-slate-700 mb-1">{s.subject}</div>
                  <div className="text-xs text-slate-600 leading-relaxed line-clamp-3">{s.body}</div>
                  <div className="text-[10px] text-slate-400 mt-2">
                    Scheduled: {formatDate(s.scheduledAt)}
                    {s.sentAt && ` · Sent: ${formatDate(s.sentAt)}`}
                  </div>
                </div>
              ))}
            </div>

            <div className="px-6 py-3 border-t border-slate-200 text-xs text-slate-400">
              Messages require approval in Inbox before reaching visitors
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
