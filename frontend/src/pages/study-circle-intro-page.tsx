import { ArrowRight, UsersRound } from "lucide-react";
import { Link } from "react-router-dom";

import { AppPageError, AppPageLoading } from "@/components/app-page-state";
import { AppShell, CohortBadge } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/hooks/use-current-user";

export function StudyCircleIntroPage() {
  const userQuery = useCurrentUser();
  if (userQuery.isPending) return <AppPageLoading />;
  if (userQuery.isError) return <AppPageError onRetry={() => void userQuery.refetch()} />;

  return (
    <AppShell user={userQuery.data}>
      <div className="mx-auto max-w-5xl py-3">
        <div className="text-center">
          <CohortBadge />
          <div className="mx-auto mt-6 grid h-16 w-16 place-items-center rounded-3xl bg-accent text-[var(--brand-pink)] shadow-sm">
            <UsersRound className="h-8 w-8" />
          </div>
          <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-black tracking-[-0.055em] text-[var(--brand-dark-blue)] sm:text-6xl">
            Learning gets stronger when the circle moves together.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl leading-7 text-muted-foreground">
            StudyCircle connects you with students in the same cohort around a shared weekly rhythm.
          </p>
        </div>
        <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
          <Button asChild size="lg">
            <Link to="/app/study-circle/recommended">Find my circle <ArrowRight /></Link>
          </Button>
          <Button asChild size="lg" variant="ghost"><Link to="/app/home">Not now</Link></Button>
        </div>
      </div>
    </AppShell>
  );
}
