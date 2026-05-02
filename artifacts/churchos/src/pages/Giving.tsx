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

const CATEGORIES = ["Tithe", "Offering", "Building Project", "Missions", "Welfare"];

export default function Giving() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const list = useListGiving({ church: CHURCH });
  const summary = useGetGivingSummary({ church: CHURCH });

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: getListGivingQueryKey({ church: CHURCH }) });
    qc.invalidateQueries({ queryKey: getGetGivingSummaryQueryKey({ church: CHURCH }) });
    qc.invalidateQueries({ queryKey: getGetUnreadNotificationsCountQueryKey() });
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
    donorName: "",
    donorPhone: "",
    amount: "",
    category: "Tithe",
  });

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Church Giving</h1>
        <p className="text-slate-500 mt-1">Simulated mobile-money giving with receipts &amp; reports.</p>
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
            <div>
              <Label>Donor name</Label>
              <Input required value={form.donorName} onChange={(e) => setForm({ ...form, donorName: e.target.value })} data-testid="input-donor-name" />
            </div>
            <div>
              <Label>Phone</Label>
              <Input required value={form.donorPhone} onChange={(e) => setForm({ ...form, donorPhone: e.target.value })} data-testid="input-donor-phone" />
            </div>
            <div>
              <Label>Amount (₦)</Label>
              <Input required type="number" min="1" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} data-testid="input-amount" />
            </div>
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
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400">No giving recorded yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}
