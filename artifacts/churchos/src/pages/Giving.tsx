import { useState } from "react";
import {
  useListGiving,
  useGetGivingSummary,
  useInitiateGiving,
  useConfirmGiving,
  getListGivingQueryKey,
  getGetGivingSummaryQueryKey,
  getGetUnreadNotificationsCountQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { CHURCH, formatDate, formatNaira } from "@/lib/format";
import { Brain, TrendingUp, AlertCircle, Users, RefreshCw } from "lucide-react";
import { GettingStartedBanner } from "@/components/GettingStartedBanner";

const CATEGORIES = ["Tithe", "Offering", "Building Project", "Missions", "Welfare"];

type GivingInsights = {
  totalGiving: number;
  totalGivers: number;
  totalTransactions: number;
  byCategory: { category: string; total: number; count: number }[];
  topGivers: any[];
  consistentGivers: any[];
  silentGivers: any[];
  pastoralFlags: number;
  aiSummary: string | null;
};

export default function Giving() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const list = useListGiving({ church: CHURCH });
  const summary = useGetGivingSummary({ church: CHURCH });
  const [insights, setInsights] = useState<GivingInsights | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: getListGivingQueryKey({ church: CHURCH }) });
    qc.invalidateQueries({ queryKey: getGetGivingSummaryQueryKey({ church: CHURCH }) });
    qc.invalidateQueries({ queryKey: getGetUnreadNotificationsCountQueryKey() });
  };

  const loadInsights = async () => {
    setInsightsLoading(true);
    try {
      const res = await fetch(`/api/giving/insights?church=${encodeURIComponent(CHURCH)}`);
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setInsights(data);
      if (data.pastoralFlags > 0) {
        qc.invalidateQueries({ queryKey: getGetUnreadNotificationsCountQueryKey() });
        toast({
          title: `${data.pastoralFlags} personal outreach alert${data.pastoralFlags > 1 ? "s" : ""} raised`,
          description: "Check Inbox to review before sending.",
        });
      }
    } catch {
      toast({ title: "Could not load insights", variant: "destructive" });
    } finally {
      setInsightsLoading(false);
    }
  };

  const initiate = useInitiateGiving({
    mutation: {
      onSuccess: () => {
        toast({ title: "Giving initiated", description: "Confirm to simulate payment." });
        setForm({ donorName: "", donorPhone: "", amount: "", category: "Tithe" });
        invalidateAll();
      },
    },
  });
  const confirm = useConfirmGiving({
    mutation: {
      onSuccess: () => {
        toast({ title: "Payment confirmed", description: "Receipt SMS captured to Inbox." });
        invalidateAll();
      },
    },
  });

  const [form, setForm] = useState({
    donorName: "", donorPhone: "", amount: "", category: "Tithe",
  });

  return (
    <Layout>
      <GettingStartedBanner />

      <div className="mb-6">
        <h1 className="text-3xl font-bold">Church Giving Summary</h1>
        <p className="text-slate-500 mt-1">Simple, trustworthy giving for your congregation.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-lg p-6">
          <div className="text-xs uppercase tracking-widest text-amber-400">This month</div>
          <div className="text-4xl font-bold mt-2">{summary.data ? formatNaira(summary.data.totalThisMonth) : "—"}</div>
          <div className="text-sm text-slate-300 mt-1">{summary.data ? formatNaira(summary.data.totalAllTime) : "—"} all-time</div>
        </div>
        <div className="bg-white rounded-lg p-6 border border-slate-200">
          <div className="text-xs uppercase tracking-widest text-slate-500 mb-3">By category</div>
          <ul className="space-y-2">
            {summary.data?.byCategory.map((c) => (
              <li key={c.category} className="flex justify-between text-sm">
                <span className="text-slate-700">{c.category}</span>
                <span className="font-bold">{formatNaira(c.total)}</span>
              </li>
            ))}
            {summary.data && summary.data.byCategory.length === 0 && (
              <li className="text-sm text-slate-400">No giving yet.</li>
            )}
          </ul>
        </div>
      </div>

      {/* ── Giving Insights ────────────────────────────────────────────── */}
      <div className="mb-6 bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-amber-500" />
            <div>
              <div className="font-bold">Giving Insights</div>
              <div className="text-xs text-slate-500">Member giving patterns and personal outreach signals</div>
            </div>
          </div>
          <Button
            onClick={loadInsights}
            disabled={insightsLoading}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
            data-testid="button-load-insights"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${insightsLoading ? "animate-spin" : ""}`} />
            {insightsLoading ? "Analysing…" : insights ? "Refresh" : "Run Analysis"}
          </Button>
        </div>

        {!insights && !insightsLoading && (
          <p className="text-sm text-slate-400 text-center py-4">
            Click "Run Analysis" to identify consistent givers and members who may need a personal check-in.
          </p>
        )}

        {insights && (
          <div className="space-y-4">
            {insights.aiSummary && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-amber-700 mb-1.5">Pastoral Summary</div>
                <p className="text-sm text-slate-800 leading-relaxed">{insights.aiSummary}</p>
              </div>
            )}

            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Total givers", value: insights.totalGivers, icon: Users },
                { label: "Consistent", value: insights.consistentGivers.length, icon: TrendingUp, color: "text-green-600" },
                { label: "Outreach Alerts", value: insights.silentGivers.length, icon: AlertCircle, color: "text-amber-600" },
              ].map((s) => {
                const Icon = s.icon;
                return (
                  <div key={s.label} className="bg-white rounded-lg p-3 border border-slate-200 text-center">
                    <Icon className={`w-4 h-4 mx-auto mb-1 ${s.color ?? "text-slate-500"}`} />
                    <div className={`text-xl font-bold ${s.color ?? "text-slate-900"}`}>{s.value}</div>
                    <div className="text-[10px] text-slate-500 uppercase tracking-wide">{s.label}</div>
                  </div>
                );
              })}
            </div>

            {insights.topGivers.length > 0 && (
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Top givers</div>
                <div className="space-y-1.5">
                  {insights.topGivers.map((g) => (
                    <div key={g.donorPhone} className="flex items-center justify-between bg-white rounded-lg px-4 py-2 border border-slate-200 text-sm">
                      <span className="font-medium">{g.donorName}</span>
                      <span className="font-bold text-slate-900">{formatNaira(g.totalGiven)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {insights.silentGivers.length > 0 && (
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-amber-600 mb-2 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> Members to check in with ({insights.silentGivers.length})
                </div>
                <div className="space-y-1.5">
                  {insights.silentGivers.map((g) => (
                    <div key={g.donorPhone} className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 text-sm">
                      <div className="font-medium text-slate-900">{g.donorName}</div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        Gave {g.givingCount}× · last gift {g.daysSinceLastGift} days ago · {formatNaira(g.totalGiven)} total
                      </div>
                      <div className="text-xs text-amber-700 mt-1">A personal call from the pastoral team this week would mean a lot to them.</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {insights.pastoralFlags > 0 && (
              <p className="text-xs text-slate-400">
                {insights.pastoralFlags} personal outreach notification{insights.pastoralFlags > 1 ? "s" : ""} added to Inbox for your review.
              </p>
            )}
          </div>
        )}
      </div>

      {/* ── giving form + table ──────────────────────────────────────────────── */}
      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg p-6 border border-slate-200 self-start">
          <h2 className="font-bold mb-4">New giving</h2>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              initiate.mutate({
                data: {
                  churchName: CHURCH,
                  donorName: form.donorName,
                  donorPhone: form.donorPhone,
                  amount: Number(form.amount),
                  category: form.category,
                },
              });
            }}
          >
            <div><Label>Donor name</Label><Input required value={form.donorName} onChange={(e) => setForm({ ...form, donorName: e.target.value })} data-testid="input-donor-name" /></div>
            <div><Label>Phone</Label><Input required value={form.donorPhone} onChange={(e) => setForm({ ...form, donorPhone: e.target.value })} data-testid="input-donor-phone" /></div>
            <div><Label>Amount (₦)</Label><Input required type="number" min="1" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} data-testid="input-amount" /></div>
            <div>
              <Label>Category</Label>
              <select
                className="w-full h-9 px-3 rounded border border-slate-300 bg-white text-sm"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                data-testid="select-category"
              >
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <Button type="submit" disabled={initiate.isPending} className="w-full bg-slate-900 hover:bg-slate-800 text-white" data-testid="button-initiate-giving">
              {initiate.isPending ? "Submitting…" : "Initiate giving"}
            </Button>
          </form>
        </div>

        <div className="md:col-span-2 bg-white rounded-lg border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="text-left px-4 py-3">Donor</th>
                <th className="text-left px-4 py-3">Category</th>
                <th className="text-right px-4 py-3">Amount</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {list.data?.map((g) => (
                <tr key={g.id} data-testid={`giving-row-${g.id}`}>
                  <td className="px-4 py-3">
                    <div className="font-medium">{g.donorName}</div>
                    <div className="text-xs text-slate-500">{formatDate(g.createdAt)}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{g.category}</td>
                  <td className="px-4 py-3 text-right font-bold">{formatNaira(g.amount)}</td>
                  <td className="px-4 py-3">
                    <Badge variant="secondary" className={g.status === "successful" ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}>
                      {g.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {g.status === "pending" && (
                      <Button
                        size="sm"
                        className="bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold"
                        onClick={() => confirm.mutate({ ref: g.ref })}
                        data-testid={`button-confirm-${g.id}`}
                      >
                        Confirm
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
              {list.data?.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">No giving recorded yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}
