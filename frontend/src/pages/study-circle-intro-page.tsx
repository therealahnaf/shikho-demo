import { ArrowRight, UsersRound } from "lucide-react";
import { Link } from "react-router-dom";

import { CohortBadge } from "@/components/app-shell";
import { AppPageHeader, pageActionClassName } from "@/components/app-page-header";
import { Button } from "@/components/ui/button";

export function StudyCircleIntroPage() {
  return (
    <div className="w-full space-y-6 py-3">
        <AppPageHeader title="Explore StudyCircle" description="Build momentum with students in your cohort." backTo="/app/home" actions={<Button asChild className={pageActionClassName}><Link to="/app/study-circle/recommended">Find my circle <ArrowRight /></Link></Button>} />
        <div className="text-center">
          <CohortBadge />
          <div className="mx-auto mt-6 grid h-16 w-16 place-items-center rounded-3xl bg-accent text-[var(--brand-pink)] shadow-sm">
            <UsersRound className="h-8 w-8" />
          </div>
          <h2 className="mx-auto mt-6 max-w-3xl text-4xl font-black tracking-[-0.055em] text-[var(--brand-dark-blue)] sm:text-6xl">
            Learning gets stronger when the circle moves together.
          </h2>
          <p className="mx-auto mt-5 max-w-2xl leading-7 text-muted-foreground">
            StudyCircle connects you with students in the same cohort around a shared weekly rhythm.
          </p>
        </div>
    </div>
  );
}
