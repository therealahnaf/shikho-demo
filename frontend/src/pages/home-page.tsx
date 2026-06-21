import { ArrowRight, CircleDot, Sparkles } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";

import { AppPageError, AppPageLoading } from "@/components/app-page-state";
import { AppShell, CohortBadge } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useCurrentUser } from "@/hooks/use-current-user";
import { api } from "@/lib/api";

export function HomePage() {
  const navigate = useNavigate();
  const userQuery = useCurrentUser();
  const membershipQuery = useQuery({
    queryKey: ["membership"],
    queryFn: api.getMembership,
    enabled: userQuery.isSuccess,
    retry: false,
  });

  useEffect(() => {
    const membership = membershipQuery.data?.membership;
    if (membership) navigate(`/app/study-circle/${membership.circle_id}`, { replace: true });
  }, [membershipQuery.data, navigate]);

  if (userQuery.isPending || membershipQuery.isPending) return <AppPageLoading />;
  if (userQuery.isError || membershipQuery.isError) {
    return <AppPageError onRetry={() => void (userQuery.refetch(), membershipQuery.refetch())} />;
  }

  const user = userQuery.data;
  return (
    <AppShell user={user}>
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <CohortBadge />
            <h1 className="mt-4 text-4xl font-black tracking-[-0.05em] text-[var(--brand-dark-blue)] sm:text-5xl">
              Good to see you, {user.display_name.split(" ")[0]}.
            </h1>
            <p className="mt-3 text-muted-foreground">Your community learning space is ready.</p>
          </div>
          <Badge className="w-fit rounded-full bg-[#fff3d6] px-3 py-1 text-[#7a5200] hover:bg-[#fff3d6]">
            <Sparkles className="mr-1 h-3.5 w-3.5" /> New community feature
          </Badge>
        </div>

        <Card className="overflow-hidden border-0 bg-[var(--brand-dark-blue)] text-white shadow-sm">
          <CardContent className="relative p-7 sm:p-10">
            <div className="community-orbit" aria-hidden="true" />
            <div className="relative z-10 max-w-2xl">
              <span className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.18em] text-[#dce4ff]">
                <CircleDot className="h-4 w-4 text-[var(--brand-pink)]" /> StudyCircle
              </span>
              <h2 className="mt-5 text-3xl font-black tracking-[-0.045em] text-white sm:text-5xl">
                Build momentum with students on the same path.
              </h2>
              <p className="mt-5 max-w-xl leading-7 text-white">
                Follow a shared weekly roadmap, contribute to circle goals, and earn the chance to
                lead your community.
              </p>
              <Button asChild size="lg" className="mt-7 bg-[var(--brand-pink)] hover:bg-[var(--brand-magenta)]">
                <Link to="/app/study-circle/intro">
                  Explore StudyCircle <ArrowRight />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
