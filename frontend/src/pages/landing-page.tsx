import { ArrowRight, Crown, Map, UsersRound } from "lucide-react";
import { Link } from "react-router-dom";

import { BrandShell } from "@/components/brand-shell";
import { Button } from "@/components/ui/button";

const benefits = [
  { icon: UsersRound, title: "Move together", copy: "Turn individual study into shared momentum." },
  { icon: Map, title: "See the path", copy: "A weekly roadmap keeps every member in view." },
  { icon: Crown, title: "Lead the circle", copy: "Consistent progress earns the Mentor spot." },
];

export function LandingPage() {
  return (
    <BrandShell>
      <section className="grid items-center gap-12 lg:grid-cols-[1.05fr_.95fr] lg:gap-8">
        <div className="max-w-2xl">
          <span className="eyebrow">A social layer for learning</span>
          <h1 className="mt-6 text-[clamp(3.35rem,8vw,6.7rem)] font-black leading-[0.88] tracking-[-0.075em] text-[var(--brand-dark-blue)]">
            Study feels
            <span className="relative ml-3 inline-block text-[var(--brand-pink)] sm:ml-5">
              lighter
              <span className="absolute -bottom-2 left-1 h-2 w-[96%] -rotate-2 rounded-full bg-[var(--brand-yellow)]" />
            </span>
            <br />
            when progress is shared.
          </h1>
          <p className="mt-8 max-w-xl text-base leading-7 text-[var(--muted-text)] sm:text-lg sm:leading-8">
            Meet StudyCircle — a focused community space for Class 10 Mathematics students
            to build streaks, follow a roadmap, and learn side by side.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Button
              asChild
              size="lg"
              className="rounded-full bg-[var(--brand-pink)] font-bold shadow-sm hover:bg-[var(--brand-magenta)]"
            >
              <Link to="/onboarding">
                Explore StudyCircle <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="rounded-full font-bold">
              <Link to="/login">I already have a key</Link>
            </Button>
          </div>
          <p className="mt-4 text-xs font-semibold text-[#737b9d]">
            Use your student access key to return anytime.
          </p>
        </div>

        <div className="constellation-panel" aria-hidden="true">
          <div className="orbit-ring orbit-ring-one" />
          <div className="orbit-ring orbit-ring-two" />
          <div className="orbit-core">
            <span className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#dce4ff]">
              Your circle
            </span>
            <strong>Math Champions</strong>
            <span>Class 10 · Mathematics</span>
          </div>
          <div className="member-dot member-one">R</div>
          <div className="member-dot member-two">N</div>
          <div className="member-dot member-three">S</div>
          <div className="member-dot member-four">You</div>
          <div className="quest-pill">Weekly roadmap · 5 stops</div>
        </div>
      </section>

      <section className="mt-20 grid gap-3 sm:grid-cols-3 lg:mt-28">
        {benefits.map(({ icon: Icon, title, copy }, index) => (
          <article key={title} className="benefit-strip" style={{ animationDelay: `${index * 90}ms` }}>
            <span className="benefit-number">0{index + 1}</span>
            <Icon className="h-5 w-5 text-[var(--brand-pink)]" />
            <div>
              <h2 className="font-extrabold tracking-[-0.02em] text-[var(--brand-dark-blue)]">
                {title}
              </h2>
              <p className="mt-1 text-sm leading-6 text-[var(--muted-text)]">{copy}</p>
            </div>
          </article>
        ))}
      </section>
    </BrandShell>
  );
}
