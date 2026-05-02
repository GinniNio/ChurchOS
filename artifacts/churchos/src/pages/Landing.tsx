import { useState } from "react";
import { Link } from "wouter";
import { useJoinWaitlist } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, FileText, Wallet, Users, Mic2, Check, AlertCircle } from "lucide-react";

const FEATURES = [
  {
    icon: UserPlus,
    title: "Visitor Follow-Up",
    desc: "Turn first-time visitors into lifelong members",
    primary: true,
  },
  {
    icon: FileText,
    title: "Sunday Prep",
    desc: "Professional Sundays in 20 minutes",
  },
  {
    icon: Wallet,
    title: "Church Giving",
    desc: "Simple, trustworthy giving for your congregation",
  },
  {
    icon: Users,
    title: "Member Tracker",
    desc: "Know who needs a call before they slip away",
  },
  {
    icon: Mic2,
    title: "Sermon Archive",
    desc: "Every sermon. Findable. Shareable. Forever.",
  },
];

const PROBLEMS = [
  {
    title: "Visitors leave and never come back",
    body: "Most churches have no system for following up. The first Sunday is the only Sunday they ever see.",
  },
  {
    title: "Members drift away unnoticed",
    body: "By the time you realise someone is gone, they already left. No one saw it coming.",
  },
  {
    title: "Sundays take all week to prepare",
    body: "Bulletins, slides, announcements — every week someone spends hours on things that should take minutes.",
  },
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

      {/* HERO */}
      <section className="bg-gradient-to-b from-slate-900 to-slate-800 text-white">
        <div className="max-w-6xl mx-auto px-6 py-24 text-center">
          <h1 className="text-5xl md:text-6xl font-bold leading-tight">
            Grow Your Church.<br />
            <span className="text-amber-400">Keep Every Member.</span>
          </h1>
          <p className="mt-6 text-lg text-slate-300 max-w-2xl mx-auto">
            The all-in-one tool for Nigerian churches — visitor follow-up, member retention, giving, sermons, and Sunday prep.
            Everything in one place. Built for how Nigerian churches actually work.
          </p>

          <div className="mt-10 flex flex-col items-center gap-4">
            <Link
              href="/app"
              className="bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold px-8 py-4 rounded-lg text-lg"
              data-testid="cta-try-demo"
            >
              Try ChurchOS Free →
            </Link>
            <a
              href={`/visitor/form?church=Demo+Church+Lagos`}
              className="text-slate-300 hover:text-white text-sm underline"
            >
              See a live demo →
            </a>
          </div>

          <div className="mt-6 text-sm text-slate-400">
            Join churches across Nigeria using ChurchOS to grow their congregation
          </div>

          <div className="mt-8 text-xs text-slate-500 border border-slate-700 rounded-lg px-4 py-2 inline-block">
            Preview mode — go live to reach your members directly
          </div>
        </div>
      </section>

      {/* THE PROBLEM */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold text-center mb-4">Sound familiar?</h2>
        <p className="text-slate-500 text-center mb-12 max-w-xl mx-auto">Every church faces these challenges. ChurchOS is built to solve them.</p>
        <div className="grid md:grid-cols-3 gap-6">
          {PROBLEMS.map((p) => (
            <div key={p.title} className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
              <AlertCircle className="w-6 h-6 text-amber-500 mb-3" />
              <h3 className="font-bold text-base mb-2">{p.title}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{p.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* VISITOR FOCUS — Primary CTA */}
      <section className="bg-amber-500">
        <div className="max-w-4xl mx-auto px-6 py-16 text-center">
          <div className="inline-block bg-amber-600 text-amber-100 text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-4">
            Start here
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
            Turn first-time visitors into lifelong members
          </h2>
          <p className="text-slate-800 mb-6 text-lg">
            Set up your visitor follow-up page in under 5 minutes. Capture every guest, send a welcome message, and start a 14-day nurture sequence — automatically.
          </p>
          <Link
            href="/app/visitors"
            className="inline-block bg-slate-900 hover:bg-slate-800 text-white font-bold px-8 py-4 rounded-lg text-base"
          >
            Set Up Your Visitor Page →
          </Link>
          <div className="mt-4 text-sm text-slate-700">
            Start free with visitor follow-up. Unlock the full suite as you grow.
          </div>
        </div>
      </section>

      {/* WHAT'S INCLUDED */}
      <section id="features" className="max-w-6xl mx-auto px-6 py-20">
        <h2 className="text-2xl font-bold text-center mb-3">What's included</h2>
        <p className="text-slate-500 text-center mb-12">Five tools. One platform. Everything your church needs to grow.</p>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className={`rounded-xl p-6 border shadow-sm ${f.primary ? "border-amber-300 bg-amber-50" : "bg-white border-slate-200"}`}
                data-testid={`feature-${f.title.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-4 ${f.primary ? "bg-amber-500 text-white" : "bg-amber-100 text-amber-600"}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-base mb-1">{f.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* TRUST SIGNAL */}
      <section className="bg-white py-16">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <p className="text-xl text-slate-700 font-medium leading-relaxed mb-6">
            "ChurchOS is built on a simple belief: a well-organised church is a church that can focus on what matters — people."
          </p>
          <div className="grid md:grid-cols-2 gap-4 text-sm text-slate-600">
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
              <strong className="block text-slate-900 mb-1">Your data stays yours</strong>
              No ads. No data selling. Your congregation's information never leaves ChurchOS.
            </div>
            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <strong className="block text-green-900 mb-1">You control every message</strong>
              Messages only reach your members when you approve them. ChurchOS never sends automatically.
            </div>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="bg-slate-50 py-20">
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
                className={`rounded-xl p-6 border text-left ${p.featured ? "border-amber-500 ring-2 ring-amber-200 shadow-lg bg-white" : "border-slate-200 bg-white"}`}
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

      {/* WAITLIST */}
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
        © {new Date().getFullYear()} ChurchOS · Built for Nigerian churches · Trusted Church
      </footer>
    </div>
  );
}
