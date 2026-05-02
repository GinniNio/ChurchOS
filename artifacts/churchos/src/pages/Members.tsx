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

const STATUS_STYLE: Record<string, string> = {
  active: "bg-green-100 text-green-800",
  atRisk: "bg-amber-100 text-amber-800",
  ghost: "bg-red-100 text-red-800",
  inactive: "bg-slate-200 text-slate-700",
};

export default function Members() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const list = useListMembers({ church: CHURCH });
  const summary = useGetMembersSummary({ church: CHURCH });
  const [present, setPresent] = useState<Record<number, boolean>>({});
  const [serviceDate, setServiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ fullName: "", phone: "", email: "", cellGroup: "Faith Cell", cellLeaderEmail: "" });

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
        setForm({ fullName: "", phone: "", email: "", cellGroup: "Faith Cell", cellLeaderEmail: "" });
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
          <div className="md:col-span-2"><Label>Cell leader email</Label><Input type="email" value={form.cellLeaderEmail} onChange={(e) => setForm({ ...form, cellLeaderEmail: e.target.value })} /></div>
          <div className="md:col-span-2"><Button type="submit" className="bg-slate-900 hover:bg-slate-800 text-white" data-testid="button-save-member">Save member</Button></div>
        </form>
      )}

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
    </Layout>
  );
}
