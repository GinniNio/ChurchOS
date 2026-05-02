import { useEffect, useState } from "react";
import { Link } from "wouter";
import { CHURCH } from "@/lib/format";

export function GettingStartedBanner() {
  const [hasVisitors, setHasVisitors] = useState<boolean | null>(null);

  useEffect(() => {
    fetch(`/api/visitors/summary?church=${encodeURIComponent(CHURCH)}`)
      .then((r) => r.json())
      .then((d) => setHasVisitors(d.total > 0))
      .catch(() => setHasVisitors(true));
  }, []);

  if (hasVisitors !== false) return null;

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 flex items-start gap-3 text-sm">
      <span className="text-lg shrink-0">💡</span>
      <div className="text-slate-700">
        Most churches start with the Visitor Follow-Up tool — it's the fastest way to see ChurchOS working for your church.{" "}
        <Link href="/app/visitors" className="text-amber-700 font-semibold underline">
          Set it up first →
        </Link>
      </div>
    </div>
  );
}
