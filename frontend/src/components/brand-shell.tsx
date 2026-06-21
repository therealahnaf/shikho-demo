import { ArrowLeft, Orbit } from "lucide-react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type BrandShellProps = {
  children: React.ReactNode;
  backTo?: string;
  compact?: boolean;
};

export function BrandShell({ children, backTo, compact = false }: BrandShellProps) {
  return (
    <div className="app-canvas min-h-screen overflow-hidden">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <header className="relative z-20 mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-5 sm:px-8 sm:py-7">
        <Link to="/" className="group flex items-center gap-3" aria-label="StudyCircle home">
          <span className="grid h-10 w-10 place-items-center rounded-[14px] bg-[var(--brand-dark-blue)] text-white shadow-[0_10px_24px_rgba(45,71,151,.25)] transition group-hover:-rotate-6">
            <Orbit className="h-5 w-5" />
          </span>
          <span>
            <span className="block text-[10px] font-extrabold uppercase tracking-[0.25em] text-[var(--brand-pink)]">
              Shikho
            </span>
            <span className="block text-lg font-black tracking-[-0.04em] text-[var(--brand-dark-blue)]">
              StudyCircle
            </span>
          </span>
        </Link>
        {backTo ? (
          <Button asChild variant="ghost" size="sm">
            <Link to={backTo}>
              <ArrowLeft className="h-4 w-4" /> Back
            </Link>
          </Button>
        ) : (
          <span className="rounded-full border border-[#dfe5f5] bg-white/60 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.18em] text-[var(--brand-blue)] backdrop-blur">
            Community demo
          </span>
        )}
      </header>
      <main
        className={cn(
          "relative z-10 mx-auto w-full max-w-7xl px-5 pb-14 sm:px-8 sm:pb-20",
          compact ? "pt-2 sm:pt-6" : "pt-5 sm:pt-12",
        )}
      >
        {children}
      </main>
    </div>
  );
}

