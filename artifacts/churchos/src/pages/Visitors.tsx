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

const STATUS_COLORS: Record<string, string> = {
  new: "bg-amber-100 text-amber-800",
  contacted: "bg-blue-100 text-blue-800",
  returned: "bg-green-100 text-green-800",
  cold: "bg-slate-200 text-slate-700",
};

export default function Visitors() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const visitors = useListVisitors({ church: CHURCH });
  const summary = useGetVisitorsSummary({ church: CHURCH });

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: getListVisitorsQueryKey({ church: CHURCH }) });
    qc.invalidateQueries({ queryKey: getGetVisitorsSummaryQueryKey({ church: CHURCH }) });
    qc.invalidateQueries({ queryKey: getGetUnreadNotificationsCountQueryKey() });
  };

  const create = useCreateVisitor({
    mutation: {
      onSuccess: () => {
        toast({ title: "Visitor added", description: "Welcome SMS captured to Inbox." });
        setForm({ fullName: "", phone: "", email: "", howHeard: "Friend", firstTime: true });
        invalidateAll();
      },
    },
  });
  const updateStatus = useUpdateVisitorStatus({
    mutation: { onSuccess: () => invalidateAll() },
  });

  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    email: "",
    howHeard: "Friend",
    firstTime: true,
  });

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Visitor Follow-Up</h1>
        <p className="text-slate-500 mt-1">Capture first-time guests and trigger automatic welcome messages.</p>
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
              create.mutate({
                data: {
                  churchName: CHURCH,
                  fullName: form.fullName,
                  phone: form.phone,
                  email: form.email || undefined,
                  howHeard: form.howHeard || undefined,
                  firstTime: form.firstTime,
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
                  <td className="px-4 py-3 text-right">
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
    </Layout>
  );
}
