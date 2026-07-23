import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, Activity, Radio, Target, Trophy, Phone, TrendingUp } from "lucide-react";

function useDocumentMeta(title: string, description: string) {
  useEffect(() => {
    const prevTitle = document.title;
    const descEl = document.querySelector('meta[name="description"]');
    const prevDesc = descEl?.getAttribute("content") ?? "";
    document.title = title;
    if (descEl) descEl.setAttribute("content", description);
    return () => {
      document.title = prevTitle;
      if (descEl) descEl.setAttribute("content", prevDesc);
    };
  }, [title, description]);
}

const STEPS = [
  { id: "floor", label: "Live Floor", icon: Activity },
  { id: "action", label: "Manager Action Center", icon: Radio },
  { id: "loop", label: "Call-to-Coaching Loop", icon: Target },
  { id: "recognition", label: "Competition & Recognition", icon: Trophy },
] as const;

// Fictional sample data — labeled as such throughout the UI.
const SAMPLE_REPS = [
  { name: "Rep Alpha", dials: 84, connects: 22, meetings: 4, revenue: 12400, streak: 6 },
  { name: "Rep Bravo", dials: 71, connects: 19, meetings: 3, revenue: 9800, streak: 4 },
  { name: "Rep Charlie", dials: 63, connects: 14, meetings: 2, revenue: 6100, streak: 2 },
  { name: "Rep Delta", dials: 52, connects: 9, meetings: 1, revenue: 3200, streak: 0 },
];

function SampleTag() {
  return (
    <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary/80 border border-primary/30 px-2 py-1">
      Sample workspace — no customer data
    </span>
  );
}

function LiveFloor() {
  const totals = SAMPLE_REPS.reduce(
    (acc, r) => ({
      dials: acc.dials + r.dials,
      connects: acc.connects + r.connects,
      meetings: acc.meetings + r.meetings,
      revenue: acc.revenue + r.revenue,
    }),
    { dials: 0, connects: 0, meetings: 0, revenue: 0 },
  );

  return (
    <div className="space-y-8">
      <div className="bento-grid grid-cols-2 md:grid-cols-4">
        {[
          { label: "Dials today", value: totals.dials.toLocaleString() },
          { label: "Connects", value: totals.connects.toLocaleString() },
          { label: "Meetings set", value: totals.meetings.toLocaleString() },
          { label: "Revenue", value: `$${totals.revenue.toLocaleString()}`, gold: true },
        ].map((k) => (
          <div key={k.label} className="bento-tile space-y-3">
            <div className="eyebrow">{k.label}</div>
            <div
              className={`font-display text-5xl tabular-nums ${k.gold ? "text-primary" : "text-foreground"}`}
            >
              {k.value}
            </div>
          </div>
        ))}
      </div>

      <div className="editorial-tile">
        <div className="p-5 border-b border-border flex items-center justify-between">
          <div className="eyebrow">Team pulse — sample</div>
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-success">Live</span>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left">
              {["Rep", "Dials", "Connects", "Meetings", "Revenue", "Streak"].map((h) => (
                <th
                  key={h}
                  className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground px-5 py-3 border-b border-border"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SAMPLE_REPS.map((r) => (
              <tr key={r.name} className="border-b border-border last:border-0">
                <td className="px-5 py-4 font-display text-lg">{r.name}</td>
                <td className="px-5 py-4 tabular-nums">{r.dials}</td>
                <td className="px-5 py-4 tabular-nums">{r.connects}</td>
                <td className="px-5 py-4 tabular-nums">{r.meetings}</td>
                <td className="px-5 py-4 tabular-nums text-primary">${r.revenue.toLocaleString()}</td>
                <td className="px-5 py-4 tabular-nums">{r.streak}d</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ManagerAction() {
  return (
    <div className="grid md:grid-cols-2 gap-px bg-border border border-border">
      {[
        {
          eyebrow: "Signal",
          title: "Rep Delta has 0 connects in 3 hours",
          body: "Dial volume normal, connect rate collapsed. Likely list quality or opening line.",
          action: "Assign discovery drill",
        },
        {
          eyebrow: "Signal",
          title: "Rep Alpha on a 6-deal streak",
          body: "Momentum window. Push into higher-ACV lane and broadcast to the floor.",
          action: "Send kudos broadcast",
        },
        {
          eyebrow: "Signal",
          title: "Objection cluster: pricing (14 today)",
          body: "Three reps hit the same wall. Team-wide pricing block recommended.",
          action: "Queue team drill",
        },
        {
          eyebrow: "Signal",
          title: "Deal stalled — Rep Bravo",
          body: "$18k opp, 9 days since last touch. Suggested next play attached.",
          action: "Open deal coach",
        },
      ].map((c) => (
        <div key={c.title} className="bg-card p-6 space-y-4">
          <div className="eyebrow">{c.eyebrow}</div>
          <h3 className="font-display text-2xl leading-tight">{c.title}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{c.body}</p>
          <div className="pt-3 border-t border-border">
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary">
              → {c.action}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function CallToCoaching() {
  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-3 gap-px bg-border border border-border">
        {[
          {
            step: "Call",
            icon: Phone,
            title: "Pricing pushback surfaced",
            body: "Call activity and recordings from the phone system land in call intelligence for review.",
          },
          {
            step: "Coaching",
            icon: Radio,
            title: "Manager notes the gap",
            body: "From the coaching console, the manager captures what they heard and points the rep at a relevant drill.",
          },
          {
            step: "Practice",
            icon: Target,
            title: "Rep runs the objection drill",
            body: "Voice or text roleplay in the arena — the same objection type, so the rep rehearses the relevant skill.",
          },
        ].map((s) => (
          <div key={s.step} className="bg-card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <span className="eyebrow">{s.step}</span>
              <s.icon className="w-4 h-4 text-primary" aria-hidden="true" />
            </div>
            <h3 className="font-display text-2xl leading-tight">{s.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{s.body}</p>
          </div>
        ))}
      </div>

      <div className="editorial-tile p-6 flex items-start gap-6">
        <TrendingUp className="w-5 h-5 text-success mt-1 shrink-0" aria-hidden="true" />
        <div>
          <div className="eyebrow mb-2">Illustrative workflow — not current automation</div>
          <p className="font-display text-2xl leading-tight">
            Insight, coaching, and practice sit in <span className="text-success">one operating system</span> instead of three tools.
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Sample workspace — no customer data. Not a benchmarked outcome.
          </p>
        </div>
      </div>
    </div>
  );
}

function Recognition() {
  const podium = SAMPLE_REPS.slice(0, 3);
  return (
    <div className="space-y-8">
      <div className="grid md:grid-cols-3 gap-px bg-border border border-border">
        {podium.map((r, i) => (
          <div key={r.name} className="bg-card p-8 space-y-3 text-center">
            <div className="eyebrow">Rank 0{i + 1}</div>
            <div className={`font-display text-4xl ${i === 0 ? "text-primary" : "text-foreground"}`}>
              {r.name}
            </div>
            <div className="font-mono text-xs uppercase tracking-[0.15em] text-muted-foreground">
              ${r.revenue.toLocaleString()} · {r.meetings} meetings
            </div>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-px bg-border border border-border">
        <div className="bg-card p-6 space-y-3">
          <div className="eyebrow">Active competition — sample</div>
          <h3 className="font-display text-2xl">Q-End Dial Sprint</h3>
          <p className="text-sm text-muted-foreground">
            48-hour push. Points on connects, meetings, and closed-won. Live to the floor.
          </p>
        </div>
        <div className="bg-card p-6 space-y-3">
          <div className="eyebrow">Recent recognition — sample</div>
          <ul className="space-y-2 text-sm">
            <li>— Rep Alpha earned <span className="text-primary">First Blood</span></li>
            <li>— Rep Bravo hit a <span className="text-primary">4-day streak</span></li>
            <li>— Team-wide kudos broadcast from the manager desk</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default function ProductDemo() {
  useDocumentMeta(
    "PitchViper — Product demo",
    "A four-step guided tour of the PitchViper daily execution system. No signup, no customer data — sample workspace only.",
  );

  const [active, setActive] = useState<(typeof STEPS)[number]["id"]>("floor");
  const activeIndex = STEPS.findIndex((s) => s.id === active);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto max-w-7xl px-6 md:px-10 h-16 flex items-center justify-between">
          <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="font-mono text-xs uppercase tracking-[0.2em]">Back to home</span>
          </Link>
          <Link
            to="/sign-in"
            className="font-mono text-xs uppercase tracking-[0.2em] text-foreground hover:text-primary transition-colors gold-underline"
          >
            Sign in
          </Link>
        </div>
      </header>

      <section className="border-b border-border">
        <div className="mx-auto max-w-7xl px-6 md:px-10 py-14 md:py-20 space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            <div className="eyebrow">Guided tour</div>
            <SampleTag />
          </div>
          <h1 className="font-display text-4xl md:text-6xl leading-[1.05] tracking-tight max-w-4xl">
            The <span className="italic text-primary">daily execution system</span>, in four moves.
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl leading-relaxed">
            Every screen below uses fictional sample data. Nothing here reflects a real customer
            or account.
          </p>
        </div>
      </section>

      {/* Step nav */}
      <nav
        aria-label="Demo steps"
        className="border-b border-border sticky top-0 bg-background z-20"
      >
        <div className="mx-auto max-w-7xl px-6 md:px-10">
          <ol className="flex flex-wrap gap-px">
            {STEPS.map((s, i) => {
              const isActive = s.id === active;
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => setActive(s.id)}
                    aria-current={isActive ? "step" : undefined}
                    className={`flex items-center gap-3 px-5 py-4 border-b-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                      isActive
                        ? "border-primary text-foreground"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <span className="font-mono text-[10px] uppercase tracking-[0.2em]">
                      0{i + 1}
                    </span>
                    <s.icon className="w-4 h-4" aria-hidden="true" />
                    <span className="font-display text-lg">{s.label}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        </div>
      </nav>

      <section className="mx-auto max-w-7xl px-6 md:px-10 py-12 md:py-16">
        {active === "floor" && <LiveFloor />}
        {active === "action" && <ManagerAction />}
        {active === "loop" && <CallToCoaching />}
        {active === "recognition" && <Recognition />}

        <div className="flex items-center justify-between mt-12 pt-6 border-t border-border">
          <button
            type="button"
            onClick={() => setActive(STEPS[Math.max(0, activeIndex - 1)].id)}
            disabled={activeIndex === 0}
            className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30 disabled:pointer-events-none"
          >
            <ArrowLeft className="w-4 h-4" /> Previous
          </button>
          {activeIndex < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={() => setActive(STEPS[activeIndex + 1].id)}
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-3 font-mono text-xs uppercase tracking-[0.2em] hover:brightness-110 transition-all"
            >
              Next: {STEPS[activeIndex + 1].label}
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <Link
              to="/sign-in"
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-3 font-mono text-xs uppercase tracking-[0.2em] hover:brightness-110 transition-all"
            >
              Sign in to your workspace
              <ArrowRight className="w-4 h-4" />
            </Link>
          )}
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto max-w-7xl px-6 md:px-10 py-8 flex flex-wrap items-center justify-between gap-4 text-xs font-mono uppercase tracking-[0.2em] text-muted-foreground">
          <Link to="/" className="hover:text-foreground transition-colors">← Home</Link>
          <span>Sample workspace — no customer data</span>
        </div>
      </footer>
    </div>
  );
}
