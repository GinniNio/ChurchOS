import { Link, useLocation } from "wouter";
import { useGetUnreadNotificationsCount } from "@workspace/api-client-react";
import { Bell, LayoutDashboard, UserPlus, FileText, Wallet, Users, Mic2, Inbox, Bot, Megaphone } from "lucide-react";
import { cn } from "@/lib/utils";
import { ReactNode, useState } from "react";

const NAV = [
  { href: "/app", label: "Dashboard", icon: LayoutDashboard },
  { href: "/app/visitors", label: "Visitors", icon: UserPlus, startHere: true },
  { href: "/app/bulletin", label: "Sunday Prep", icon: FileText },
  { href: "/app/giving", label: "Giving", icon: Wallet },
  { href: "/app/members", label: "Members", icon: Users },
  { href: "/app/sermons", label: "Sermons", icon: Mic2 },
  { href: "/app/agent", label: "Agent", icon: Bot },
  { href: "/app/announcements", label: "Announcements", icon: Megaphone },
];

export function Layout({ children }: { children: ReactNode }) {
  const [loc] = useLocation();
  const { data: unread } = useGetUnreadNotificationsCount({
    query: { refetchInterval: 5000 } as any,
  });
  const [showStartHere] = useState(() => !localStorage.getItem("churchos_tour_seen"));

  function markTourSeen() {
    localStorage.setItem("churchos_tour_seen", "1");
  }

  const pendingCount = unread?.unread ?? 0;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex">
      <aside className="w-60 bg-slate-900 text-slate-100 min-h-screen flex flex-col">
        <Link href="/app" className="px-6 py-5 border-b border-slate-800 block">
          <div className="text-xs uppercase tracking-widest text-amber-400">ChurchOS</div>
          <div className="text-sm text-slate-300 mt-1">Demo Church Lagos</div>
        </Link>
        <nav className="flex-1 py-4">
          {NAV.map((item) => {
            const active =
              loc === item.href ||
              (item.href !== "/app" && loc.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={item.startHere ? markTourSeen : undefined}
                className={cn(
                  "flex items-center gap-3 px-6 py-2.5 text-sm hover-elevate active-elevate-2 transition-colors",
                  active ? "bg-slate-800 text-amber-400 border-l-2 border-amber-400" : "text-slate-300",
                )}
                data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <Icon className="w-4 h-4" />
                <span className="flex-1">{item.label}</span>
                {item.startHere && showStartHere && (
                  <span className="text-[10px] text-amber-400 font-semibold">Start here →</span>
                )}
              </Link>
            );
          })}
        </nav>
        <Link
          href="/app/inbox"
          className={cn(
            "flex items-center justify-between px-6 py-3 border-t border-slate-800 text-sm hover-elevate active-elevate-2",
            loc.startsWith("/app/inbox") ? "bg-slate-800 text-amber-400" : "text-slate-300",
          )}
          data-testid="nav-inbox"
        >
          <span className="flex items-center gap-3">
            <Inbox className="w-4 h-4" /> Inbox
          </span>
          {pendingCount > 0 ? (
            <span
              className="bg-amber-500 text-slate-900 text-xs font-bold px-2 py-0.5 rounded-full min-w-[1.25rem] text-center"
              data-testid="inbox-badge"
            >
              {pendingCount}
            </span>
          ) : null}
        </Link>
        <div className="px-6 py-3 border-t border-slate-800 text-xs text-slate-500">
          Preview mode — go live to reach your members directly
        </div>
      </aside>
      <main className="flex-1">
        <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between">
          <div className="text-sm text-slate-500 flex items-center gap-2">
            <Bell className="w-4 h-4 text-amber-500" /> Messages only reach members after your approval
          </div>
          <Link
            href="/"
            className="text-xs text-slate-500 hover:text-slate-900"
            data-testid="link-landing"
          >
            ← Landing
          </Link>
        </header>
        <div className="p-8 max-w-6xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
