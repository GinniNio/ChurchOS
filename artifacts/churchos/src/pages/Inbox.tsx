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
import { MessageSquare, Mail } from "lucide-react";
import { formatDate } from "@/lib/format";

export default function Inbox() {
  const qc = useQueryClient();
  const list = useListNotifications();
  const mark = useMarkNotificationRead({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListNotificationsQueryKey() });
        qc.invalidateQueries({ queryKey: getGetUnreadNotificationsCountQueryKey() });
      },
    },
  });

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Inbox</h1>
        <p className="text-slate-500 mt-1">All SMS and email triggers captured here in demo mode — no real messages sent.</p>
      </div>

      <div className="space-y-2">
        {list.data?.map((n) => (
          <div
            key={n.id}
            className={`bg-white rounded-lg p-4 border ${n.read ? "border-slate-200" : "border-amber-300 ring-1 ring-amber-100"} flex items-start gap-4`}
            data-testid={`notification-${n.id}`}
          >
            <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
              {n.type === "sms" ? <MessageSquare className="w-4 h-4" /> : <Mail className="w-4 h-4" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold">{n.subject}</span>
                <Badge variant="secondary" className="uppercase text-[10px]">{n.type}</Badge>
                {!n.read && <Badge className="bg-amber-500 text-slate-900 text-[10px]">NEW</Badge>}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">to {n.recipient} · {formatDate(n.sentAt)}</div>
              <p className="text-sm text-slate-700 mt-2 whitespace-pre-wrap">{n.body}</p>
            </div>
            {!n.read && (
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
        {list.data?.length === 0 && (
          <div className="bg-white rounded-lg p-12 border border-slate-200 text-center text-slate-400">
            No notifications yet. Trigger one by adding a visitor or recording attendance.
          </div>
        )}
      </div>
    </Layout>
  );
}
