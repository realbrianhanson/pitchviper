import { ReactNode, useEffect, useState } from "react";
import { FilmGrain } from "@/components/ui/film-grain";

const APHORISMS = [
  "The deal is closed in the silence after the ask.",
  "Discipline is the rep's only equal-opportunity employer.",
  "A no on Tuesday is a yes you haven't earned yet.",
  "Numbers don't lie. They just wait.",
  "The follow-up is the close.",
  "Pressure is a privilege.",
];

interface AuthLayoutProps {
  children: ReactNode;
  eyebrow?: string;
  title?: string;
  subtitle?: string;
}

export function AuthLayout({ children, eyebrow, title, subtitle }: AuthLayoutProps) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setIndex((i) => (i + 1) % APHORISMS.length), 6000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="min-h-screen min-h-[100dvh] bg-background flex">
      <FilmGrain />

      {/* LEFT — editorial obsidian field. Hidden on mobile. */}
      <aside className="hidden lg:flex relative w-1/2 flex-col justify-between p-12 xl:p-16 border-r border-border bg-card overflow-hidden">
        <div className="gold-vignette">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground/70 mb-3">
            — Where Closers Are Made
          </p>
          <h1 className="font-display text-5xl xl:text-6xl leading-[0.95] text-foreground">
            Pitch<span className="italic">Viper</span>
          </h1>
        </div>

        {/* Rotating aphorisms */}
        <div className="relative flex-1 flex items-center max-w-xl">
          <div className="relative w-full h-40">
            {APHORISMS.map((line, i) => (
              <p
                key={i}
                className="absolute inset-0 font-display italic text-3xl xl:text-4xl leading-snug text-foreground/85 transition-opacity duration-[1400ms] ease-out"
                style={{ opacity: i === index ? 1 : 0 }}
                aria-hidden={i !== index}
              >
                "{line}"
              </p>
            ))}
          </div>
        </div>

        {/* Bottom gold hairline + mono microtype */}
        <div>
          <div className="h-px w-16 bg-primary mb-4" />
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground/70">
            Vol. I · Est. 2026 · Manuscript of the Closer
          </p>
        </div>
      </aside>

      {/* RIGHT — the form */}
      <main className="relative flex-1 flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md">
          {/* Mobile wordmark */}
          <div className="lg:hidden mb-8">
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground/70 mb-2">
              — Where Closers Are Made
            </p>
            <h1 className="font-display text-4xl leading-none text-foreground">
              Pitch<span className="italic">Viper</span>
            </h1>
          </div>

          {(eyebrow || title || subtitle) && (
            <div className="mb-8">
              {eyebrow && (
                <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground/70 mb-3">
                  — {eyebrow}
                </p>
              )}
              {title && (
                <h2 className="font-display italic text-3xl md:text-4xl leading-tight text-foreground">
                  {title}
                </h2>
              )}
              {subtitle && (
                <p className="font-body text-sm text-muted-foreground mt-2 max-w-sm">
                  {subtitle}
                </p>
              )}
            </div>
          )}

          {children}
        </div>
      </main>
    </div>
  );
}
