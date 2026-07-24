import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Activity, Radio, Target, Trophy, CheckCircle2 } from "lucide-react";
import { PLANS, MIN_SEATS, TRIAL_DAYS, formatUSD, annualSavingsPerSeat } from "@/lib/billingPlans";

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

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <div className="eyebrow">{children}</div>;
}

function SectionHeading({
  eyebrow,
  title,
  lede,
}: {
  eyebrow: string;
  title: React.ReactNode;
  lede?: string;
}) {
  return (
    <div className="max-w-3xl space-y-4">
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="font-display text-4xl md:text-5xl leading-[1.05] tracking-tight text-foreground">
        {title}
      </h2>
      {lede ? <p className="text-muted-foreground text-lg leading-relaxed">{lede}</p> : null}
    </div>
  );
}

export default function Landing() {
  useDocumentMeta(
    "PitchViper — The daily execution system for high-velocity sales teams",
    "One operating system for live floor activity, manager coaching, and rep practice — so sales teams can act on what's happening today.",
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top bar */}
      <header className="border-b border-border">
        <div className="mx-auto max-w-7xl px-6 md:px-10 h-16 flex items-center justify-between">
          <Link to="/" className="font-display text-xl tracking-tight">
            PitchViper
          </Link>
          <nav className="flex items-center gap-6 text-sm">
            <a href="#loop" className="text-muted-foreground hover:text-foreground transition-colors hidden md:inline">
              The loop
            </a>
            <a href="#surfaces" className="text-muted-foreground hover:text-foreground transition-colors hidden md:inline">
              Surfaces
            </a>
            <a href="#integrations" className="text-muted-foreground hover:text-foreground transition-colors hidden md:inline">
              Integrations
            </a>
            <Link
              to="/sign-in"
              className="text-foreground hover:text-primary transition-colors gold-underline"
            >
              Sign in
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="gold-vignette border-b border-border overflow-hidden">
        <div className="mx-auto max-w-7xl px-6 md:px-10 py-24 md:py-36">
          <div className="max-w-4xl space-y-8">
            <Eyebrow>PitchViper — Sovereign Sales OS</Eyebrow>
            <h1 className="font-display text-5xl md:text-7xl leading-[1.02] tracking-tight text-foreground">
              The daily execution system for{" "}
              <span className="italic text-primary">high-velocity sales teams</span>.
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl leading-relaxed">
              One operating system for the sales floor: live activity, manager coaching, and
              targeted practice — so insight from calls, decisions from managers, and reps'
              drills all live in the same place.
            </p>
            <div className="flex flex-wrap items-center gap-4 pt-4">
              <Link
                to="/demo"
                className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 font-mono text-xs uppercase tracking-[0.2em] hover:brightness-110 transition-all"
              >
                See the product
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/sign-in"
                className="inline-flex items-center gap-2 border border-border text-foreground px-6 py-3 font-mono text-xs uppercase tracking-[0.2em] hover:border-primary transition-colors"
              >
                Sign in
              </Link>
              <Link
                to="/sign-up"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors gold-underline ml-2"
              >
                Have an access code? Create account
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Problem */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-7xl px-6 md:px-10 py-20 md:py-28 grid md:grid-cols-2 gap-12">
          <SectionHeading
            eyebrow="The problem"
            title={<>Sales floors run <span className="italic">blind between reviews</span>.</>}
          />
          <div className="space-y-6 text-muted-foreground text-lg leading-relaxed">
            <p>
              Dashboards report yesterday. Managers coach on gut feel. Reps practice objections
              they've already mastered and skip the ones costing them the deal.
            </p>
            <p>
              The distance between a coaching insight and the right drill for it is measured in
              weeks. By then the pipeline has moved on and the lesson is lost.
            </p>
          </div>
        </div>
      </section>

      {/* The Loop */}
      <section id="loop" className="border-b border-border">
        <div className="mx-auto max-w-7xl px-6 md:px-10 py-20 md:py-28 space-y-16">
          <SectionHeading
            eyebrow="The operating loop"
            title={<>Four moves. <span className="italic">One operating system.</span></>}
            lede="Call insight, manager action, and rep practice under one roof — so the path from a coaching moment to the relevant drill is short instead of scattered across tools."
          />

          <div className="bento-grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
            {[
              {
                n: "01",
                icon: Activity,
                title: "Live activity",
                body: "Dials, connects, meetings and revenue land on the floor as they happen — without a manual CSV reporting workflow.",
              },
              {
                n: "02",
                icon: Radio,
                title: "Manager action",
                body: "Coaches see who's stalled, who's on fire, and where a nudge changes the day — not the quarter.",
              },
              {
                n: "03",
                icon: Target,
                title: "Targeted practice",
                body: "Roleplay and objection drills sit next to the call intelligence, so managers can point reps at the skill that matters right now.",
              },
              {
                n: "04",
                icon: Trophy,
                title: "Momentum you can see",
                body: "Personal scorecards, streaks, leaderboards and recognition make progress visible to the whole floor.",
              },
            ].map((step) => (
              <div key={step.n} className="bento-tile space-y-4">
                <div className="flex items-center justify-between">
                  <span className="eyebrow">{step.n}</span>
                  <step.icon className="w-4 h-4 text-primary" aria-hidden="true" />
                </div>
                <h3 className="font-display text-2xl leading-tight">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Surfaces */}
      <section id="surfaces" className="border-b border-border">
        <div className="mx-auto max-w-7xl px-6 md:px-10 py-20 md:py-28 space-y-16">
          <SectionHeading
            eyebrow="Three surfaces, one system"
            title={<>Built for the <span className="italic">rep, the manager, and the floor</span>.</>}
          />
          <div className="grid md:grid-cols-3 gap-px bg-border border border-border">
            {[
              {
                label: "For the rep",
                title: "Daily command",
                body: "Today's calls, next best action, targeted drills, and a live scorecard that reflects the last hour — not last week.",
                items: ["Voice + text roleplay", "Objection vault", "Personal scorecard"],
              },
              {
                label: "For the manager",
                title: "Coaching console",
                body: "See the team the way the floor sees itself. Intervene when it matters. Move from a rep or call insight to the right coaching and practice workflow.",
                items: ["Rep deep-dives", "Coach-to-practice workflow", "AI recommendations"],
              },
              {
                label: "For the floor",
                title: "War room",
                body: "Live leaderboard, deal celebrations, SOS alerts. A trading-floor atmosphere without the noise.",
                items: ["Live leaderboard", "Deal celebrations", "Team pulse"],
              },
            ].map((s) => (
              <div key={s.title} className="bg-card p-8 space-y-5">
                <Eyebrow>{s.label}</Eyebrow>
                <h3 className="font-display text-3xl leading-tight">{s.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{s.body}</p>
                <ul className="pt-2 space-y-2 border-t border-border">
                  {s.items.map((it) => (
                    <li key={it} className="font-mono text-xs uppercase tracking-[0.15em] text-muted-foreground pt-2">
                      — {it}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Integrations */}
      <section id="integrations" className="border-b border-border">
        <div className="mx-auto max-w-7xl px-6 md:px-10 py-20 md:py-28 grid md:grid-cols-2 gap-16 items-start">
          <SectionHeading
            eyebrow="Integrations"
            title={<>Plugs into the <span className="italic">stack you already run</span>.</>}
            lede="No parallel system. No manual entry. Calls and pipeline flow in from where your team already works."
          />
          <div className="space-y-px bg-border border border-border">
            {[
              {
                name: "GoHighLevel",
                role: "Source of truth for pipeline, opportunities and revenue activity.",
              },
              {
                name: "Aloware",
                role: "Live call and SMS telemetry — dials, connects, dispositions, recordings.",
              },
            ].map((i) => (
              <div key={i.name} className="bg-card p-6 flex items-start justify-between gap-6">
                <div>
                  <h3 className="font-display text-2xl">{i.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{i.role}</p>
                </div>
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary shrink-0 mt-2">
                  Connected
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="border-t border-border">
        <div className="mx-auto max-w-7xl px-6 md:px-10 py-24 md:py-32 space-y-12">
          <SectionHeading
            eyebrow="Pricing"
            title={<>Simple <span className="italic text-primary">per-seat</span> pricing.</>}
            lede={`Start with a ${TRIAL_DAYS}-day full-feature trial — no card required. ${MIN_SEATS}-seat minimum. Cancel anytime.`}
          />
          <div className="grid gap-6 md:grid-cols-3">
            {PLANS.map((plan) => (
              <div
                key={plan.id}
                className={`bg-card p-6 flex flex-col gap-5 border ${plan.recommended ? "border-primary" : "border-border"}`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="eyebrow">{plan.name}</div>
                    <p className="text-sm text-muted-foreground mt-2 max-w-[28ch]">{plan.tagline}</p>
                  </div>
                  {plan.recommended && (
                    <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary">
                      Recommended
                    </span>
                  )}
                </div>
                <div>
                  <div className="font-display text-4xl tabular-nums">
                    {formatUSD(plan.monthlyPerSeat)}
                    <span className="text-sm text-muted-foreground font-body ml-1">/seat/mo</span>
                  </div>
                  <div className="text-xs font-mono uppercase tracking-[0.2em] text-muted-foreground mt-1">
                    or {formatUSD(plan.annualPerSeat)}/seat/yr · save {formatUSD(annualSavingsPerSeat(plan))} annually
                  </div>
                </div>
                <ul className="space-y-2 text-sm">
                  {plan.features.map((f) => (
                    <li key={f} className="flex gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  to="/sign-up"
                  className="mt-auto text-center bg-primary text-primary-foreground px-4 py-3 font-mono text-xs uppercase tracking-[0.2em] hover:brightness-110 transition-all"
                >
                  Start {TRIAL_DAYS}-day trial
                </Link>
              </div>
            ))}
            <div className="bg-card border border-border p-6 flex flex-col gap-5">
              <div>
                <div className="eyebrow">Enterprise</div>
                <p className="text-sm text-muted-foreground mt-2 max-w-[28ch]">
                  Custom onboarding and terms for larger sales orgs.
                </p>
              </div>
              <div className="font-display text-4xl">Custom</div>
              <ul className="space-y-2 text-sm">
                {[
                  "Guided onboarding & data mapping",
                  "Integration assistance",
                  "Extended audit history",
                  "Priority support",
                  "Volume pricing",
                ].map((f) => (
                  <li key={f} className="flex gap-2">
                    <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <a
                href="mailto:sales@pitchviper.com?subject=Enterprise%20inquiry"
                className="mt-auto text-center border border-border px-4 py-3 font-mono text-xs uppercase tracking-[0.2em] hover:border-primary transition-colors"
              >
                Talk to sales
              </a>
            </div>
          </div>
          <p className="text-xs font-mono uppercase tracking-[0.2em] text-muted-foreground">
            {MIN_SEATS}-seat minimum · Annual plans include 2 months free · Cancel anytime
          </p>
        </div>
      </section>

      {/* Final CTA */}
      <section className="gold-vignette overflow-hidden">
        <div className="mx-auto max-w-7xl px-6 md:px-10 py-24 md:py-32 text-center space-y-8">
          <Eyebrow>Enter the floor</Eyebrow>
          <h2 className="font-display text-4xl md:text-6xl leading-[1.05] tracking-tight max-w-3xl mx-auto">
            See the <span className="italic text-primary">daily execution system</span> in motion.
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            A four-step guided tour. No signup, no sales call, no customer data.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <Link
              to="/demo"
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 font-mono text-xs uppercase tracking-[0.2em] hover:brightness-110 transition-all"
            >
              Walk the product
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/sign-in"
              className="inline-flex items-center gap-2 border border-border text-foreground px-6 py-3 font-mono text-xs uppercase tracking-[0.2em] hover:border-primary transition-colors"
            >
              Sign in
            </Link>
          </div>
          <div className="pt-4">
            <Link
              to="/sign-up"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors gold-underline"
            >
              Have an access code? Create account
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto max-w-7xl px-6 md:px-10 py-8 flex flex-wrap items-center justify-between gap-4 text-xs font-mono uppercase tracking-[0.2em] text-muted-foreground">
          <span>© {new Date().getFullYear()} PitchViper</span>
          <span>Where closers are made</span>
        </div>
      </footer>
    </div>
  );
}
