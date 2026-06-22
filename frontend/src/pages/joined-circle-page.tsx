import { ArrowRight, Check, Sparkles } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { useEffect } from "react";

import { AppPageError, AppPageLoading } from "@/components/app-page-state";
import { AppPageHeader, pageActionClassName } from "@/components/app-page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/lib/api";

export function JoinedCirclePage() {
  const navigate = useNavigate();
  const membershipQuery = useQuery({
    queryKey: ["membership"],
    queryFn: api.getMembership,
    retry: false,
  });
  useEffect(() => {
    if (membershipQuery.isSuccess && !membershipQuery.data.membership) {
      navigate("/app/study-circle/recommended", { replace: true });
    }
  }, [membershipQuery.data, membershipQuery.isSuccess, navigate]);

  if (membershipQuery.isPending) return <AppPageLoading />;
  if (membershipQuery.isError) {
    return <AppPageError onRetry={() => void membershipQuery.refetch()} />;
  }
  const membership = membershipQuery.data.membership;
  if (!membership) return null;

  return (
    <div className="w-full space-y-4 py-4">
        <AppPageHeader title={`You joined ${membership.circle_name}.`} description="Your StudyCircle membership is ready." backTo="/app/study-circle/lobby" actions={<Button asChild className={pageActionClassName}><Link to={`/app/study-circle/${membership.circle_id}`}>Enter StudyCircle <ArrowRight /></Link></Button>} />
        <Card className="overflow-hidden border border-border shadow-sm">
          <CardContent className="p-8 text-center sm:p-12">
            <div className="relative mx-auto grid h-20 w-20 place-items-center rounded-full bg-[#ecfaf5] text-[#16785d]">
              <Check className="h-9 w-9 stroke-[3]" />
              <Sparkles className="absolute -right-2 -top-1 h-6 w-6 text-[var(--brand-yellow)]" />
            </div>
            <p className="mt-7 text-xs font-black uppercase tracking-[0.18em] text-[var(--brand-pink)]">Welcome to the circle</p>
            <h2 className="mt-3 text-4xl font-black tracking-[-0.05em] text-[var(--brand-dark-blue)] sm:text-5xl">
              You joined {membership.circle_name}.
            </h2>
            <p className="mx-auto mt-5 max-w-lg leading-7 text-muted-foreground">
              Your roadmap position, contribution, and weekly points will stay connected to this account.
            </p>
          </CardContent>
        </Card>
    </div>
  );
}
