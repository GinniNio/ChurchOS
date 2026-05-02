import { useState } from "react";
import {
  useListNotifications,
  useMarkNotificationRead,
  getListNotificationsQueryKey,
  getGetUnreadNotificationsCountQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MessageSquare, Mail, CheckCircle, Edit2, X } from "lucide-react";
import { formatDate } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";

type Tab = "pending" | "all";

type NotifWithApproval = {
  id: number;
  type: string;
  recipient: string;
  subject: string;
  body: string;
  sentAt: string;
  read: boolean;
  approvalStatus: string;
};

function PendingCard({ n, onAction }: { n: NotifWithApproval; onAction: () => void }) {
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [editBody, setEditBody] = useState(n.body);
  const [loading, setLoading] = useState(false);

  async function approve() {
    setLoading(true);
    try {
      const r = await fetch(`/api/notifications/${n.id}/approve`, { method: "POST" });
      if (!r.ok) throw new Error();
      toast({ title: "Message approved", description: "Marked as sent to member." });
      onAction();
    } catch {
      toast({ title: "Failed to approve", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function editAndApprove() {
    if (!editing) { setEditing(true); return; }
    setLoading(true);
    try {
      const r = await fetch(`/api/notifications/${n.id}/edit-and-approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: editBody }),
      });
      if (!r.ok) throw new Error();
      toast({ title: "Message edited and approved." });
      onAction();
    } catch {
      toast({ title: "Failed to approve", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function dismiss() {
    setLoading(true);
    try {
      const r = await fetch(`/api/notifications/${n.id}/dismiss`, { method: "POST" });
      if (!r.ok) throw new Error();
      toast({ title: "Message dismissed." });
      onAction();
    } catch {
      toast({ title: "Failed to dismiss", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-lg border border-amber-300 ring-1 ring-amber-100 p-4 space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
          AI Suggested · Awaiting your approval
        </span>
        <Badge variant="secondary" className="uppercase text-[10px]">{n.type}</Badge>
      </div>
      <div>
        <div className="font-bold text-sm">{n.subject}</div>
        <div className="text-xs text-slate-500 mt-0.5">to {n.recipient}</div>
      </div>
      {editing ? (
        <textarea
          className="w-full text-sm text-slate-700 bg-slate-50 border border-amber-300 rounded p-3 min-h-[100px] focus:outline-none focus:ring-2 focus:ring-amber-400"
          value={editBody}
          onChange={(e) => setEditBody(e.target.value)}
        />
      ) : (
        <p className="text-sm text-slate-700 bg-slate-50 rounded p-3 border border-slate-200 whitespace-pre-wrap">
          {n.body}
        </p>
      )}
      <div className="flex gap-2 flex-wrap">
        <Button
          size="sm"
          className="bg-green-600 hover:bg-green-500 text-white gap-1"
          onClick={approve}
          disabled={loading || editing}
          data-testid={`button-approve-${n.id}`}
        >
          <CheckCircle className="w-3.5 h-3.5" /> Approve & Send
        </Button>
        <Button
          size="sm"
          className="bg-amber-500 hover:bg-amber-400 text-slate-900 gap-1"
          onClick={editAndApprove}
          disabled={loading}
          data-testid={`button-edit-approve-${n.id}`}
        >
          <Edit2 className="w-3.5 h-3.5" /> {editing ? "Save & Send" : "Edit & Send"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="gap-1"
          onClick={dismiss}
          disabled={loading}
          data-testid={`button-dismiss-${n.id}`}
        >
          <X className="w-3.5 h-3.5" /> Dismiss
        </Button>
        {editing && (
          <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setEditBody(n.body); }}>
            Cancel
          </Button>
        )}
      </div>
    </div>
  );
}

export default function Inbox() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("pending");

  const list = useListNotifications();
  const mark = useMarkNotificationRead({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListNotificationsQueryKey() });
        qc.invalidateQueries({ queryKey: getGetUnreadNotificationsCountQueryKey() });
      },
    },
  });

  function invalidateAll() {
    qc.invalidateQueries({ queryKey: getListNotificationsQueryKey() });
    qc.invalidateQueries({ queryKey: getGetUnreadNotificationsCountQueryKey() });
  }

  const all = (list.data ?? []) as NotifWithApproval[];
  const pending = all.filter((n) => n.approvalStatus === "pending");

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Inbox</h1>
        <p className="text-slate-500 mt-1">Review and approve outreach messages before they reach your members.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-slate-200">
        {([
          { key: "pending" as Tab, label: `Needs Review${pending.length > 0 ? ` (${pending.length})` : ""}` },
          { key: "all" as Tab, label: "All Activity" },
        ] as { key: Tab; label: string }[]).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
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

      {/* Trust signal */}
      <div className="mb-4 flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-2">
        <CheckCircle className="w-4 h-4 shrink-0" />
        Messages only reach members after you approve them. ChurchOS never sends automatically.
      </div>

      {tab === "pending" && (
        <div className="space-y-3">
          {pending.length === 0 && (
            <div className="bg-white rounded-lg p-12 border border-slate-200 text-center text-slate-400">
              No messages waiting for review. You're all caught up!
            </div>
          )}
          {pending.map((n) => (
            <PendingCard key={n.id} n={n} onAction={invalidateAll} />
          ))}
        </div>
      )}

      {tab === "all" && (
        <div className="space-y-2">
          {all.map((n) => (
            <div
              key={n.id}
              className={`bg-white rounded-lg p-4 border ${
                n.approvalStatus === "pending"
                  ? "border-amber-300 ring-1 ring-amber-100"
                  : n.approvalStatus === "dismissed"
                  ? "border-slate-200 opacity-60"
                  : "border-slate-200"
              } flex items-start gap-4`}
              data-testid={`notification-${n.id}`}
            >
              <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                {n.type === "sms" ? <MessageSquare className="w-4 h-4" /> : <Mail className="w-4 h-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold">{n.subject}</span>
                  <Badge variant="secondary" className="uppercase text-[10px]">{n.type}</Badge>
                  {n.approvalStatus === "pending" && (
                    <Badge className="bg-amber-100 text-amber-800 text-[10px]">Awaiting Review</Badge>
                  )}
                  {n.approvalStatus === "approved" && (
                    <Badge className="bg-green-100 text-green-800 text-[10px]">Approved</Badge>
                  )}
                  {n.approvalStatus === "dismissed" && (
                    <Badge className="bg-slate-200 text-slate-600 text-[10px]">Dismissed</Badge>
                  )}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">to {n.recipient} · {formatDate(n.sentAt)}</div>
                <p className="text-sm text-slate-700 mt-2 whitespace-pre-wrap">{n.body}</p>
              </div>
              {n.approvalStatus === "auto" && !n.read && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => mark.mutate({ id: n.id })}
                  data-testid={`button-mark-read-${n.id}`}
                >
                  Mark read
                </Button>
              )}
            </div>
          ))}
          {all.length === 0 && (
            <div className="bg-white rounded-lg p-12 border border-slate-200 text-center text-slate-400">
              No notifications yet. Trigger one by adding a visitor or recording attendance.
            </div>
          )}
        </div>
      )}
    </Layout>
  );
}
