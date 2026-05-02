import { useState } from "react";
import {
  useListMembers,
  useGetMembersSummary,
  useSaveAttendance,
  useCreateMember,
  getListMembersQueryKey,
  getGetMembersSummaryQueryKey,
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

const API = "/api";

const STATUS_STYLE: Record<string, string> = {
  active: "bg-green-100 text-green-800",
  atRisk: "bg-amber-100 text-amber-800",
  ghost: "bg-red-100 text-red-800",
  inactive: "bg-slate-200 text-slate-700",
};

const DRIFT_STYLE: Record<string, string> = {
  Healthy: "bg-green-100 text-green-800",
  Watch: "bg-blue-100 text-blue-800",
  "Drift Risk": "bg-amber-100 text-amber-800",
  "High Risk": "bg-red-100 text-red-800",
};

type DriftMember = {
  id: number;
  fullName: string;
  cellGroup: string;
  lastAttendance: string | null;
  driftScore: number;
  driftLevel: string;
  suggestedMessage: string;
  phone: string;
};

type DriftResult = {
  totalMembers: number;
  healthy: DriftMember[];
  watch: DriftMember[];
  driftRisk: DriftMember[];
  highRisk: DriftMember[];
  newFlags: number;
};

function DriftScoreBar({ score }: { score: number }) {
  const pct = Math.min(100, Math.max(0, score));
  const color =
    pct <= 20 ? "bg-green-500" : pct <= 40 ? "bg-blue-500" : pct <= 60 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-bold text-slate-600 w-8 text-right">{score}</span>
    </div>
  );
}

function MemberDriftCard({ m }: { m: DriftMember }) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(m.suggestedMessage).then(
      () => { setCopied(true); setTimeout(() => setCopied(false), 2000); toast({ title: "Message copied!" }); },
      () => toast({ title: "Copy failed", variant: "destructive" }),
    );
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-semibold">{m.fullName}</div>
          <div className="text-xs text-slate-500">{m.cellGroup} · Last seen: {m.lastAttendance ? formatDate(m.lastAttendance) : "Never"}</div>
        </div>
        <Badge variant="secondary" className={DRIFT_STYLE[m.driftLevel] ?? "bg-slate-200"}>
          {m.driftLevel}
        </Badge>
      </div>
      <div>
        <div className="text-xs text-slate-500 mb-1">Drift Score</div>
        <DriftScoreBar score={m.driftScore} />
      </div>
      <div className="bg-slate-50 rounded p-3 text-sm text-slate-700 border border-slate-200">
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Suggested Message</div>
        {m.suggestedMessage}
      </div>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={copy} className="text-xs">
          {copied ? "Copied ✓" : "Copy Message"}
        </Button>
      </div>
    </div>
  );
}

function EarlyWarningTab() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<DriftResult | null>(null);

  async function runAnalysis() {
    setLoading(true);
    try {
      const r = await fetch(`${API}/members/drift-risk?church=${encodeURIComponent(CHURCH)}`);
      const d: DriftResult = await r.json();
      setData(d);
      if (d.newFlags > 0) {
        toast({ title: `${d.newFlags} new High Risk flag${d.newFlags > 1 ? "s" : ""} created in Inbox` });
      }
    } catch (e: any) {
      toast({ title: "Analysis failed", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  const attention = data ? [...data.driftRisk, ...data.highRisk] : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-lg">AI Drift Risk Analysis — {CHURCH}</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Scores every member across attendance, tenure, and giving signals to predict who may be drifting.
          </p>
        </div>
        <Button
          className="bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold"
          disabled={loading}
          onClick={runAnalysis}
          data-testid="button-run-drift"
        >
          {loading ? "Analysing…" : "Run AI Analysis"}
        </Button>
      </div>

      {data && (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Healthy", value: data.healthy.length, color: "text-green-700", bg: "bg-green-50 border-green-200" },
              { label: "Watching", value: data.watch.length, color: "text-blue-700", bg: "bg-blue-50 border-blue-200" },
              { label: "Drift Risk", value: data.driftRisk.length, color: "text-amber-700", bg: "bg-amber-50 border-amber-200" },
              { label: "High Risk", value: data.highRisk.length, color: "text-red-700", bg: "bg-red-50 border-red-200" },
            ].map((s) => (
              <div key={s.label} className={`rounded-lg p-4 border ${s.bg}`}>
                <div className="text-xs uppercase tracking-wider text-slate-500">{s.label}</div>
                <div className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Congregation health bar */}
          {data.totalMembers > 0 && (
            <div>
              <div className="text-xs text-slate-500 mb-1.5 font-medium uppercase tracking-wider">Congregation Health</div>
              <div className="flex h-4 rounded-full overflow-hidden gap-px bg-slate-200">
                {data.healthy.length > 0 && (
                  <div
                    className="bg-green-500 h-full"
                    style={{ width: `${(data.healthy.length / data.totalMembers) * 100}%` }}
                    title={`Healthy: ${data.healthy.length}`}
                  />
                )}
                {data.watch.length > 0 && (
                  <div
                    className="bg-blue-400 h-full"
                    style={{ width: `${(data.watch.length / data.totalMembers) * 100}%` }}
                    title={`Watch: ${data.watch.length}`}
                  />
                )}
                {data.driftRisk.length > 0 && (
                  <div
                    className="bg-amber-400 h-full"
                    style={{ width: `${(data.driftRisk.length / data.totalMembers) * 100}%` }}
                    title={`Drift Risk: ${data.driftRisk.length}`}
                  />
                )}
                {data.highRisk.length > 0 && (
                  <div
                    className="bg-red-500 h-full"
                    style={{ width: `${(data.highRisk.length / data.totalMembers) * 100}%` }}
                    title={`High Risk: ${data.highRisk.length}`}
                  />
                )}
              </div>
              <div className="flex gap-4 mt-1.5 text-xs text-slate-400">
                <span><span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-1" />Healthy</span>
                <span><span className="inline-block w-2 h-2 rounded-full bg-blue-400 mr-1" />Watch</span>
                <span><span className="inline-block w-2 h-2 rounded-full bg-amber-400 mr-1" />Drift Risk</span>
                <span><span className="inline-block w-2 h-2 rounded-full bg-red-500 mr-1" />High Risk</span>
              </div>
            </div>
          )}

          {/* Members needing attention */}
          {attention.length > 0 ? (
            <div>
              <h3 className="font-semibold mb-3 text-slate-700">
                Members Needing Attention ({attention.length})
              </h3>
              <div className="grid md:grid-cols-2 gap-4">
                {attention.map((m) => (
                  <MemberDriftCard key={m.id} m={m} />
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-green-50 border border-green-200 rounded-lg p-8 text-center text-green-700">
              🎉 All members are healthy — no drift risk detected.
            </div>
          )}

          {/* Scoring explanation */}
          <details className="text-sm">
            <summary className="cursor-pointer text-slate-500 hover:text-slate-700 select-none">
              ℹ️ How is this score calculated?
            </summary>
            <div className="mt-2 bg-slate-50 rounded-lg p-4 border border-slate-200 text-slate-600 space-y-1">
              <p><strong>Attendance (40 pts max)</strong> — consecutive misses weighted by how many weeks missed</p>
              <p><strong>Tenure (30 pts max)</strong> — long-standing members who start missing are higher risk than new ones</p>
              <p><strong>Giving (30 pts max)</strong> — cross-referenced with giving history; sudden silence in giving is an early signal</p>
              <p className="mt-2 text-xs text-slate-400">Score 0-20: Healthy · 21-40: Watch · 41-60: Drift Risk · 61-100: High Risk</p>
            </div>
          </details>
        </>
      )}

      {!data && !loading && (
        <div className="bg-white rounded-lg border border-dashed border-slate-200 p-12 text-center text-slate-400 text-sm">
          Click "Run AI Analysis" to score every member for drift risk.
        </div>
      )}
    </div>
  );
}

export default function Members() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const list = useListMembers({ church: CHURCH });
  const summary = useGetMembersSummary({ church: CHURCH });
  const [present, setPresent] = useState<Record<number, boolean>>({});
  const [serviceDate, setServiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [showAdd, setShowAdd] = useState(false);
  const [tab, setTab] = useState<"attendance" | "early-warning">("attendance");
  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    email: "",
    cellGroup: "Faith Cell",
    cellLeaderEmail: "",
    preferredLanguage: "English",
  });

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: getListMembersQueryKey({ church: CHURCH }) });
    qc.invalidateQueries({ queryKey: getGetMembersSummaryQueryKey({ church: CHURCH }) });
    qc.invalidateQueries({ queryKey: getGetUnreadNotificationsCountQueryKey() });
  };

  const save = useSaveAttendance({
    mutation: {
      onSuccess: (r) => {
        toast({
          title: "Attendance saved",
          description: `${r.presentCount} present · ${r.absentCount} absent · ${r.alertsSent} alerts sent`,
        });
        setPresent({});
        invalidateAll();
      },
    },
  });

  const create = useCreateMember({
    mutation: {
      onSuccess: () => {
        toast({ title: "Member added" });
        setShowAdd(false);
        setForm({ fullName: "", phone: "", email: "", cellGroup: "Faith Cell", cellLeaderEmail: "", preferredLanguage: "English" });
        invalidateAll();
      },
    },
  });

  return (
    <Layout>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">Member Tracker</h1>
          <p className="text-slate-500 mt-1">Mark attendance, auto-detect ghost members, alert cell leaders.</p>
        </div>
        <Button variant="outline" onClick={() => setShowAdd(!showAdd)} data-testid="button-toggle-add-member">
          {showAdd ? "Close" : "+ Add member"}
        </Button>
      </div>

      <div className="grid md:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total", value: summary.data?.total ?? 0, color: "text-slate-900" },
          { label: "Active", value: summary.data?.active ?? 0, color: "text-green-700" },
          { label: "At-Risk", value: summary.data?.atRisk ?? 0, color: "text-amber-700" },
          { label: "Ghost", value: summary.data?.ghost ?? 0, color: "text-red-700" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-lg p-4 border border-slate-200">
            <div className="text-xs uppercase tracking-wider text-slate-500">{s.label}</div>
            <div className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</div>
          </div>
        ))}
      </div>

      {showAdd && (
        <form
          className="bg-white rounded-lg p-6 border border-slate-200 mb-6 grid md:grid-cols-2 gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate({
              data: {
                churchName: CHURCH,
                fullName: form.fullName,
                phone: form.phone,
                email: form.email || undefined,
                cellGroup: form.cellGroup,
                cellLeaderEmail: form.cellLeaderEmail || undefined,
              },
            });
          }}
        >
          <div><Label>Full name</Label><Input required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} data-testid="input-member-name" /></div>
          <div><Label>Phone</Label><Input required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} data-testid="input-member-phone" /></div>
          <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          <div><Label>Cell group</Label><Input required value={form.cellGroup} onChange={(e) => setForm({ ...form, cellGroup: e.target.value })} data-testid="input-cell-group" /></div>
          <div><Label>Cell leader email</Label><Input type="email" value={form.cellLeaderEmail} onChange={(e) => setForm({ ...form, cellLeaderEmail: e.target.value })} /></div>
          <div>
            <Label>Preferred language</Label>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
              value={form.preferredLanguage}
              onChange={(e) => setForm({ ...form, preferredLanguage: e.target.value })}
              data-testid="select-preferred-language"
            >
              <option>English</option>
              <option>Yoruba</option>
              <option>Igbo</option>
              <option>Hausa</option>
            </select>
          </div>
          <div className="md:col-span-2"><Button type="submit" className="bg-slate-900 hover:bg-slate-800 text-white" data-testid="button-save-member">Save member</Button></div>
        </form>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-slate-200">
        {[
          { key: "attendance", label: "Attendance" },
          { key: "early-warning", label: "🔮 Early Warning" },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key as typeof tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === key
                ? "border-amber-500 text-amber-600"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
            data-testid={`tab-${key}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "attendance" && (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between flex-wrap gap-3">
            <div className="text-sm font-semibold">Sunday attendance</div>
            <div className="flex items-center gap-2">
              <Label htmlFor="serviceDate" className="text-xs">Service date</Label>
              <Input id="serviceDate" type="date" value={serviceDate} onChange={(e) => setServiceDate(e.target.value)} className="h-8 w-40" data-testid="input-service-date" />
              <Button
                size="sm"
                className="bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold"
                disabled={save.isPending}
                onClick={() => {
                  const entries = (list.data ?? []).map((m) => ({ memberId: m.id, present: !!present[m.id] }));
                  save.mutate({ data: { serviceDate, entries } });
                }}
                data-testid="button-save-attendance"
              >
                {save.isPending ? "Saving…" : "Save attendance"}
              </Button>
            </div>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="text-left px-4 py-3">Member</th>
                <th className="text-left px-4 py-3">Cell</th>
                <th className="text-left px-4 py-3">Last seen</th>
                <th className="text-left px-4 py-3">Misses</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="px-4 py-3 text-center">Present?</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {list.data?.map((m) => (
                <tr key={m.id} data-testid={`member-row-${m.id}`}>
                  <td className="px-4 py-3">
                    <div className="font-medium">{m.fullName}</div>
                    <div className="text-xs text-slate-500">{m.phone}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{m.cellGroup}</td>
                  <td className="px-4 py-3 text-slate-600">{formatDate(m.lastAttendance)}</td>
                  <td className="px-4 py-3 font-bold">{m.consecutiveMisses}</td>
                  <td className="px-4 py-3">
                    <Badge variant="secondary" className={STATUS_STYLE[m.status] ?? "bg-slate-200"}>
                      {m.status === "atRisk" ? "at-risk" : m.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={!!present[m.id]}
                      onChange={(e) => setPresent({ ...present, [m.id]: e.target.checked })}
                      className="w-4 h-4"
                      data-testid={`check-present-${m.id}`}
                    />
                  </td>
                </tr>
              ))}
              {list.data?.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">No members yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === "early-warning" && <EarlyWarningTab />}
    </Layout>
  );
}
