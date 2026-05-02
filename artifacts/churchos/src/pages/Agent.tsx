import { useState } from "react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { CHURCH } from "@/lib/format";

const API = "/api";

function nextSunday(): Date {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? 7 : 7 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(6, 0, 0, 0);
  return d;
}

function fmtDate(d: Date) {
  return d.toLocaleDateString("en-NG", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

type AgentResult = {
  birthdayReminders: number;
  sermonUploadReminders: number;
  serviceReminderSent: boolean;
  weeklyReportSent: boolean;
  durationMs: number;
  errors: string[];
};

type RecentRun = {
  id: number;
  type: string;
  subject: string;
  createdAt: string;
};

const RUN_TYPES = ["birthday-reminder", "service-reminder", "weekly-report", "post-service", "media-reminder"];

export default function Agent() {
  const { toast } = useToast();
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<AgentResult | null>(null);
  const [recentRuns, setRecentRuns] = useState<RecentRun[]>([]);
  const [logsLoaded, setLogsLoaded] = useState(false);

  async function loadRecentRuns() {
    try {
      const r = await fetch(`${API}/notifications`);
      const all: RecentRun[] = await r.json();
      setRecentRuns(
        all
          .filter((n) => RUN_TYPES.includes(n.type))
          .slice(0, 10),
      );
    } catch { /* ignore */ }
    setLogsLoaded(true);
  }

  async function runAgent() {
    setRunning(true);
    setResult(null);
    try {
      const r = await fetch(`${API}/agents/sunday-run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ churchName: CHURCH }),
      });
      const data: AgentResult = await r.json();
      setResult(data);
      toast({ title: "Agent run complete", description: `Completed in ${data.durationMs}ms` });
      loadRecentRuns();
    } catch (e: any) {
      toast({ title: "Agent error", description: e.message, variant: "destructive" });
    } finally {
      setRunning(false);
    }
  }

  const ns = nextSunday();

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Sunday Morning Agent</h1>
        <p className="text-slate-500 mt-1">
          Autonomous coordinator that runs every Sunday at 6:00am — no one has to remember.
        </p>
      </div>

      {/* Status + schedule card */}
      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg p-5 border border-slate-200 flex items-center gap-3">
          <span className="text-2xl">🤖</span>
          <div>
            <div className="text-xs text-slate-500 uppercase tracking-wider">Agent Status</div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="inline-block w-2 h-2 rounded-full bg-green-500" />
              <span className="font-semibold text-green-700">Active</span>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg p-5 border border-slate-200 md:col-span-2">
          <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Next Scheduled Run</div>
          <div className="font-semibold">{fmtDate(ns)} at 6:00am</div>
          <div className="text-xs text-slate-400 mt-0.5">Post-service upload prompt at 1:00pm the same day</div>
        </div>
      </div>

      {/* Manual trigger */}
      <div className="bg-white rounded-lg p-6 border border-slate-200 mb-6">
        <h2 className="font-bold mb-1">Run Agent Now</h2>
        <p className="text-sm text-slate-500 mb-4">
          Trigger all 4 Sunday morning actions immediately — useful for testing any day of the week.
        </p>
        <Button
          className="bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold"
          disabled={running}
          onClick={runAgent}
          data-testid="button-run-agent"
        >
          {running ? "Agent running…" : "▶ Run Agent Now"}
        </Button>

        {result && (
          <div className="mt-5 border border-green-200 bg-green-50 rounded-lg p-4 text-sm space-y-1">
            <div className="font-semibold text-green-800 mb-2">
              Agent completed in {result.durationMs}ms
            </div>
            {result.birthdayReminders > 0 && (
              <div className="flex items-center gap-2 text-green-700">
                <span>✅</span>
                <span>{result.birthdayReminders} birthday reminder{result.birthdayReminders > 1 ? "s" : ""} sent to pastor inbox</span>
              </div>
            )}
            {result.serviceReminderSent && (
              <div className="flex items-center gap-2 text-green-700">
                <span>✅</span>
                <span>Sunday service reminder sent to all active members</span>
              </div>
            )}
            {result.sermonUploadReminders > 0 && (
              <div className="flex items-center gap-2 text-amber-700">
                <span>⚠️</span>
                <span>Sermon upload reminder sent — last week's recording is missing</span>
              </div>
            )}
            {result.weeklyReportSent && (
              <div className="flex items-center gap-2 text-green-700">
                <span>📊</span>
                <span>Weekly congregation health report delivered to pastor inbox</span>
              </div>
            )}
            {result.errors.length > 0 && (
              <div className="mt-2 text-red-600">
                <div className="font-medium">Errors:</div>
                {result.errors.map((e, i) => <div key={i} className="ml-2">• {e}</div>)}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Recent runs log */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="text-sm font-semibold">Agent Activity Log</div>
          <Button size="sm" variant="outline" onClick={loadRecentRuns}>
            {logsLoaded ? "Refresh" : "Load Logs"}
          </Button>
        </div>
        {logsLoaded ? (
          recentRuns.length > 0 ? (
            <ul className="divide-y divide-slate-100">
              {recentRuns.map((n) => (
                <li key={n.id} className="px-4 py-3 flex items-start justify-between gap-3 text-sm">
                  <div>
                    <span className="font-medium">{n.subject}</span>
                    <div className="text-xs text-slate-400 mt-0.5">
                      type: {n.type}
                    </div>
                  </div>
                  <div className="text-xs text-slate-400 shrink-0">
                    {new Date(n.createdAt).toLocaleString("en-NG", { dateStyle: "short", timeStyle: "short" })}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-8 text-center text-slate-400 text-sm">
              No agent activity yet. Click "Run Agent Now" to create the first log entries.
            </div>
          )
        ) : (
          <div className="p-8 text-center text-slate-400 text-sm">Click "Load Logs" to view recent agent activity.</div>
        )}
      </div>
    </Layout>
  );
}
