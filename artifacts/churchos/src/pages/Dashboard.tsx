import { Link } from "wouter";
import {
  useGetVisitorsSummary,
  useGetGivingSummary,
  useGetMembersSummary,
  useListSermons,
} from "@workspace/api-client-react";
import { Layout } from "@/components/Layout";
import { CHURCH, formatNaira } from "@/lib/format";
import { UserPlus, Wallet, Users, Mic2, FileText, ArrowRight } from "lucide-react";

function Stat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-slate-500">{label}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
      {sub && <div className="text-xs text-slate-500 mt-0.5">{sub}</div>}
    </div>
  );
}

export default function Dashboard() {
  const v = useGetVisitorsSummary({ church: CHURCH });
  const g = useGetGivingSummary({ church: CHURCH });
  const m = useGetMembersSummary({ church: CHURCH });
  const s = useListSermons({ church: CHURCH });

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Welcome back</h1>
        <p className="text-slate-500 mt-1">Here's what's happening at {CHURCH} this week.</p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Link href="/app/visitors" className="bg-white rounded-lg p-5 border border-slate-200 shadow-sm hover-elevate" data-testid="dash-visitors">
          <div className="flex items-center justify-between mb-3">
            <UserPlus className="w-5 h-5 text-amber-500" />
            <ArrowRight className="w-4 h-4 text-slate-300" />
          </div>
          <Stat label="Visitors" value={v.data?.total ?? "—"} sub={`${v.data?.newCount ?? 0} new this period`} />
        </Link>
        <Link href="/app/giving" className="bg-white rounded-lg p-5 border border-slate-200 shadow-sm hover-elevate" data-testid="dash-giving">
          <div className="flex items-center justify-between mb-3">
            <Wallet className="w-5 h-5 text-amber-500" />
            <ArrowRight className="w-4 h-4 text-slate-300" />
          </div>
          <Stat label="Giving this month" value={g.data ? formatNaira(g.data.totalThisMonth) : "—"} sub={`${g.data ? formatNaira(g.data.totalAllTime) : "—"} all time`} />
        </Link>
        <Link href="/app/members" className="bg-white rounded-lg p-5 border border-slate-200 shadow-sm hover-elevate" data-testid="dash-members">
          <div className="flex items-center justify-between mb-3">
            <Users className="w-5 h-5 text-amber-500" />
            <ArrowRight className="w-4 h-4 text-slate-300" />
          </div>
          <Stat label="Members" value={m.data?.total ?? "—"} sub={`${m.data?.ghost ?? 0} ghost · ${m.data?.atRisk ?? 0} at-risk`} />
        </Link>
        <Link href="/app/sermons" className="bg-white rounded-lg p-5 border border-slate-200 shadow-sm hover-elevate" data-testid="dash-sermons">
          <div className="flex items-center justify-between mb-3">
            <Mic2 className="w-5 h-5 text-amber-500" />
            <ArrowRight className="w-4 h-4 text-slate-300" />
          </div>
          <Stat label="Sermons" value={s.data?.length ?? "—"} sub={`${s.data?.reduce((a, x) => a + (x.playCount ?? 0), 0) ?? 0} total plays`} />
        </Link>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Link href="/app/bulletin" className="bg-white rounded-lg p-6 border border-slate-200 shadow-sm hover-elevate flex items-start gap-4" data-testid="dash-bulletin">
          <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold">Generate Sunday bulletin</div>
            <div className="text-sm text-slate-500 mt-1">Create a printable order of service in under a minute.</div>
          </div>
        </Link>
        <Link href="/app/inbox" className="bg-slate-900 text-white rounded-lg p-6 border border-slate-200 shadow-sm hover-elevate" data-testid="dash-inbox">
          <div className="text-xs uppercase tracking-widest text-amber-400">Inbox</div>
          <div className="font-bold mt-1">Review notifications</div>
          <div className="text-sm text-slate-300 mt-1">All SMS &amp; email triggers captured here in demo mode.</div>
        </Link>
      </div>
    </Layout>
  );
}
