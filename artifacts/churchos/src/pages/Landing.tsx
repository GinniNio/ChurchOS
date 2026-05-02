import { useState } from "react";
import { Link } from "wouter";
import { useJoinWaitlist } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, FileText, Wallet, Users, Mic2, Check } from "lucide-react";

const FEATURES = [
  { icon: UserPlus, title: "Visitor Follow-Up", desc: "Capture every first-time visitor and trigger automatic SMS welcome + cell-leader assignment so no soul falls through the cracks." },
  { icon: FileText, title: "Sunday Prep", desc: "Generate a clean printable Sunday bulletin in 60 seconds — sermon title, scripture readings, main points, announcements, offering theme." },
  { icon: Wallet, title: "Church Giving", desc: "Receive tithes, offerings, building project, and missions giving with simulated mobile-money confirmations and a category-by-category dashboard." },
  { icon: Users, title: "Member Tracker", desc: "Mark Sunday attendance, auto-detect ghost members after 6 missed services, and alert their cell leader by email instantly." },
  { icon: Mic2, title: "Sermon Archive", desc: "Upload sermon audio, share it with members, count plays, and auto-publish a podcast RSS feed for Apple/Google Podcasts." },
];

export default function Landing() {
  const [churchName, setChurchName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const { toast } = useToast();
  const join = useJoinWaitlist({
    mutation: {
      onSuccess: () => {
        toast({ title: "You're on the list!", description: "We'll be in touch shortly." });
        setChurchName("");
        setAdminEmail("");
      },
    },
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="bg-slate-900 text-white">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-widest text-amber-400">ChurchOS</div>
            <div className="text-sm text-slate-300">Software for Nigerian churches</div>
          </div>
          <Link
            href="/app"
            className="bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold px-4 py-2 rounded text-sm"
            data-testid="link-open-demo"
          >
            Open Demo →
          </Link>
        </div>
      </header>

      <section className="bg-gradient-to-b from-slate-900 to-slate-800 text-white">
        <div className="max-w-6xl mx-auto px-6 py-20 text-center">
          <h1 className="text-5xl md:text-6xl font-bold leading-tight">
            Run your church with <span className="text-amber-400">peace of mind</span>
          </h1>
          <p className="mt-6 text-lg text-slate-300 max-w-2xl mx-auto">
            ChurchOS is the all-in-one platform built for Nigerian churches — visitor follow-up,
            Sunday bulletins, giving, member tracking, and sermon archives.
          </p>
          <div className="mt-8 flex items-center justify-center gap-4 flex-wrap">
            <Link
              href="/app"
              className="bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold px-6 py-3 rounded text-base"
              data-testid="cta-try-demo"
            >
              Try the live demo
            </Link>
            <a
              href="#waitlist"
              className="border border-slate-600 hover:bg-slate-800 text-white px-6 py-3 rounded text-base"
            >
              Join the waitlist
            </a>
          </div>
          <div className="mt-6 text-xs text-slate-400">
            Demo mode · all SMS &amp; email captured to Inbox · no real messages sent
          </div>
        </div>
      </section>

      <section id="features" className="max-w-6xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold text-center mb-12">Everything your church needs, in one place</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className="bg-white rounded-lg p-6 border border-slate-200 shadow-sm"
                data-testid={`feature-${f.title.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-lg mb-2">{f.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="bg-white py-20">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold mb-4">Simple, transparent pricing</h2>
          <p className="text-slate-600 mb-12">Pay monthly. Cancel anytime. Free during early access.</p>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { name: "Starter", price: "₦5,000", per: "/mo", desc: "Up to 100 members", features: ["Visitor follow-up", "Sunday bulletins", "Inbox notifications"] },
              { name: "Growth", price: "₦15,000", per: "/mo", desc: "Up to 500 members", features: ["Everything in Starter", "Giving + reports", "Sermon archive + podcast", "Cell-group analytics"], featured: true },
              { name: "Diocese", price: "Custom", per: "", desc: "Unlimited members", features: ["Everything in Growth", "Multi-branch support", "Dedicated success manager", "Phone support"] },
            ].map((p) => (
              <div
                key={p.name}
                className={`rounded-lg p-6 border text-left ${p.featured ? "border-amber-500 ring-2 ring-amber-200 shadow-lg bg-white" : "border-slate-200 bg-white"}`}
              >
                {p.featured && (
                  <div className="text-xs font-bold uppercase tracking-wider text-amber-600 mb-2">Most popular</div>
                )}
                <div className="font-bold text-lg">{p.name}</div>
                <div className="mt-2 text-3xl font-bold">{p.price}<span className="text-sm font-normal text-slate-500">{p.per}</span></div>
                <div className="text-sm text-slate-600 mt-1">{p.desc}</div>
                <ul className="mt-4 space-y-2">
                  {p.features.map((f) => (
                    <li key={f} className="text-sm flex items-start gap-2">
                      <Check className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="waitlist" className="bg-slate-900 text-white py-20">
        <div className="max-w-xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold mb-3">Join the waitlist</h2>
          <p className="text-slate-300 mb-8">Be the first to know when ChurchOS launches in your city.</p>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (!churchName || !adminEmail) return;
              join.mutate({ data: { churchName, adminEmail } });
            }}
          >
            <Input
              required
              placeholder="Church name"
              value={churchName}
              onChange={(e) => setChurchName(e.target.value)}
              className="bg-slate-800 border-slate-700 text-white"
              data-testid="input-church-name"
            />
            <Input
              required
              type="email"
              placeholder="Admin email"
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              className="bg-slate-800 border-slate-700 text-white"
              data-testid="input-admin-email"
            />
            <Button
              type="submit"
              disabled={join.isPending}
              className="w-full bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold"
              data-testid="button-join-waitlist"
            >
              {join.isPending ? "Joining…" : "Join waitlist"}
            </Button>
          </form>
        </div>
      </section>

      <footer className="bg-slate-950 text-slate-500 py-8 text-center text-xs">
        © {new Date().getFullYear()} ChurchOS · Built for Nigerian churches · Demo mode
      </footer>
    </div>
  );
}
