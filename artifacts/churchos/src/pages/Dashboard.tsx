import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Layout } from "@/components/Layout";
import { CHURCH, formatNaira } from "@/lib/format";
import { UserPlus, Wallet, Users, Inbox, ArrowRight, CheckCircle } from "lucide-react";

type GrowthData = {
  visitors: { total: number; thisMonth: number; retained: number; conversionRate: string };
  members: { total: number; active: number; needsAttention: number; lapsed: number; retentionRate: string; lapsedNames: string[] };
  giving: { totalThisMonth: number; totalGivers: number; topCategory: string };
  sermons: { total: number; totalPlays: number; mostPlayed: any; pendingUpload: string | null };
  inbox: { pendingApprovals: number };
};

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function Dashboard() {
  const [data, setData] = useState<GrowthData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/dashboard/growth?church=${encodeURIComponent(CHURCH)}`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const pending = data?.inbox.pendingApprovals ?? 0;

  const priorities: { icon: string; text: string; href: string }[] = [];
  if (data) {
    if (pending > 0) {
      priorities.push({
        icon: "📬",
        text: `${pending} outreach message${pending > 1 ? "s" : ""} need your review before they reach members`,
        href: "/app/inbox",
      });
    }
    if (data.members.lapsed > 0) {
      const names = data.members.lapsedNames.slice(0, 2).join(" and ");
      const others = data.members.lapsed - data.members.lapsedNames.slice(0, 2).length;
      const label = others > 0 ? `${names} and ${others} other${others > 1 ? "s" : ""}` : names;
      priorities.push({
        icon: "📞",
        text: `${label} haven't been seen in 4+ weeks`,
        href: "/app/members",
      });
    }
    if (data.sermons.pendingUpload) {
      priorities.push({
        icon: "🎙️",
        text: `Last Sunday's sermon isn't uploaded yet`,
        href: "/app/sermons",
      });
    }
    if (data.visitors.thisMonth > 0 && data.visitors.retained === 0) {
      priorities.push({
        icon: "👋",
        text: `You had ${data.visitors.thisMonth} visitor${data.visitors.thisMonth > 1 ? "s" : ""} this month — none have returned yet`,
        href: "/app/visitors",
      });
    }
  }

  return (
    <Layout>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold">{greeting()}, Pastor.</h1>
        <p className="text-slate-500 mt-1">Here's how {CHURCH} is growing.</p>
      </div>

      {/* Pending approvals banner */}
      {pending > 0 && (
        <Link
          href="/app/inbox"
          className="block mb-6 bg-amber-50 border border-amber-300 rounded-lg px-5 py-4 text-sm text-amber-900 hover:bg-amber-100 transition-colors"
          data-testid="banner-pending"
        >
          <span className="font-semibold">
            You have {pending} message{pending > 1 ? "s" : ""} waiting for your approval before {pending > 1 ? "they reach" : "it reaches"} members.
          </span>{" "}
          <span className="underline">Review now →</span>
        </Link>
      )}

      {/* 4 Growth Stat Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Link
          href="/app/visitors"
          className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-shadow"
          data-testid="dash-visitors"
        >
          <div className="flex items-center justify-between mb-3">
            <UserPlus className="w-5 h-5 text-amber-500" />
            <ArrowRight className="w-4 h-4 text-slate-300" />
          </div>
          <div className="text-3xl font-bold">
            {loading ? "—" : data?.visitors.thisMonth ?? 0}
          </div>
          <div className="text-xs uppercase tracking-wider text-slate-500 mt-1">Visitors This Month</div>
          {data && (
            <div className="text-xs text-slate-400 mt-1">{data.visitors.retained} retained</div>
          )}
        </Link>

        <Link
          href="/app/members"
          className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-shadow"
          data-testid="dash-members"
        >
          <div className="flex items-center justify-between mb-3">
            <Users className="w-5 h-5 text-amber-500" />
            <ArrowRight className="w-4 h-4 text-slate-300" />
          </div>
          <div className="text-3xl font-bold">
            {loading ? "—" : data?.members.active ?? 0}
          </div>
          <div className="text-xs uppercase tracking-wider text-slate-500 mt-1">Active Members</div>
          {data && (
            <div className="text-xs mt-1">
              <span className="bg-green-100 text-green-800 px-1.5 py-0.5 rounded text-[10px] font-semibold">
                {data.members.retentionRate} retained
              </span>
            </div>
          )}
        </Link>

        <Link
          href="/app/members"
          className={`bg-white rounded-xl p-5 border shadow-sm hover:shadow-md transition-shadow ${
            data && data.members.needsAttention > 0
              ? "border-amber-300"
              : "border-slate-200"
          }`}
          data-testid="dash-needs-call"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-lg">📞</span>
            <ArrowRight className="w-4 h-4 text-slate-300" />
          </div>
          <div className={`text-3xl font-bold ${data && data.members.needsAttention > 0 ? "text-amber-600" : "text-green-600"}`}>
            {loading ? "—" : data?.members.needsAttention ?? 0}
          </div>
          <div className="text-xs uppercase tracking-wider text-slate-500 mt-1">Members Needing a Call</div>
          {data && data.members.needsAttention === 0 && (
            <div className="text-xs text-green-600 mt-1">All engaged ✓</div>
          )}
        </Link>

        <Link
          href="/app/giving"
          className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-shadow"
          data-testid="dash-giving"
        >
          <div className="flex items-center justify-between mb-3">
            <Wallet className="w-5 h-5 text-amber-500" />
            <ArrowRight className="w-4 h-4 text-slate-300" />
          </div>
          <div className="text-3xl font-bold">
            {loading ? "—" : data ? formatNaira(data.giving.totalThisMonth) : "—"}
          </div>
          <div className="text-xs uppercase tracking-wider text-slate-500 mt-1">Giving This Month</div>
          {data && (
            <div className="text-xs text-slate-400 mt-1">{data.giving.totalGivers} givers</div>
          )}
        </Link>
      </div>

      {/* This Week's Priorities */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="font-bold text-lg mb-4">This Week's Priorities</h2>
        {loading ? (
          <div className="text-sm text-slate-400">Loading…</div>
        ) : priorities.length === 0 ? (
          <div className="flex items-center gap-3 text-green-700">
            <CheckCircle className="w-5 h-5 shrink-0" />
            <span className="font-medium">Everything looks healthy. Keep it up!</span>
          </div>
        ) : (
          <ul className="space-y-3">
            {priorities.map((p, i) => (
              <li key={i}>
                <Link
                  href={p.href}
                  className="flex items-start gap-3 text-sm p-3 rounded-lg hover:bg-slate-50 transition-colors group"
                >
                  <span className="text-lg shrink-0">{p.icon}</span>
                  <span className="text-slate-700 group-hover:text-slate-900">{p.text}</span>
                  <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-amber-500 ml-auto shrink-0 mt-0.5" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Quick links */}
      <div className="mt-6 grid md:grid-cols-2 gap-4">
        <Link href="/app/inbox" className="bg-slate-900 text-white rounded-xl p-5 flex items-center justify-between hover:bg-slate-800 transition-colors" data-testid="dash-inbox">
          <div>
            <div className="text-xs uppercase tracking-widest text-amber-400 mb-1">Inbox</div>
            <div className="font-bold">Review messages</div>
            <div className="text-sm text-slate-300 mt-0.5">Approve outreach before it reaches members</div>
          </div>
          {pending > 0 && (
            <span className="bg-amber-500 text-slate-900 text-sm font-bold px-3 py-1.5 rounded-full">
              {pending}
            </span>
          )}
          {pending === 0 && <Inbox className="w-5 h-5 text-slate-400" />}
        </Link>
        <Link href="/app/bulletin" className="bg-white rounded-xl p-5 border border-slate-200 flex items-center gap-4 hover:shadow-md transition-shadow" data-testid="dash-bulletin">
          <span className="text-2xl">📋</span>
          <div>
            <div className="font-bold">Generate Sunday bulletin</div>
            <div className="text-sm text-slate-500 mt-0.5">Professional Sundays in 20 minutes</div>
          </div>
        </Link>
      </div>
    </Layout>
  );
}
