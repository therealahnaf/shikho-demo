import { ArrowRight, Target, UserRoundCheck, UsersRound } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { AppPageError, AppPageLoading } from "@/components/app-page-state";
import { CohortBadge } from "@/components/app-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { api, ApiError } from "@/lib/api";

export function RecommendedCirclePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [joinError, setJoinError] = useState<string | null>(null);
  const recommendationQuery = useQuery({
    queryKey: ["recommended-circle"],
    queryFn: api.getRecommendedCircle,
    retry: false,
  });
  const joinMutation = useMutation({
    mutationFn: api.joinCircle,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["membership"] });
      navigate("/app/study-circle/joined");
    },
    onError: (error) => setJoinError(error instanceof ApiError ? error.message : "Could not join the circle."),
  });

  if (recommendationQuery.isPending) return <AppPageLoading />;
  if (recommendationQuery.isError) {
    return <AppPageError onRetry={() => void recommendationQuery.refetch()} />;
  }

  const circle = recommendationQuery.data.data;
  return (
    <div className="w-full py-4">
        <div className="text-center">
          <CohortBadge />
          <h1 className="mt-5 text-4xl font-black tracking-[-0.05em] text-[var(--brand-dark-blue)] sm:text-5xl">
            Your recommended circle
          </h1>
          <p className="mt-3 text-muted-foreground">Matched using your current class and subject.</p>
        </div>

        {!circle ? (
          <Alert className="mx-auto mt-9 max-w-xl">
            <UsersRound />
            <AlertTitle>No circle available yet</AlertTitle>
            <AlertDescription>{recommendationQuery.data.reason}</AlertDescription>
          </Alert>
        ) : (
          <Card className="mt-9 overflow-hidden border border-border shadow-sm">
            <div className="h-2 bg-[var(--brand-pink)]" />
            <CardContent className="p-7 sm:p-9">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <Badge variant="secondary" className="rounded-full">Class 10 · Mathematics</Badge>
                  <h2 className="mt-4 text-3xl font-black tracking-[-0.04em] text-[var(--brand-dark-blue)]">
                    {circle.name}
                  </h2>
                  <p className="mt-3 max-w-xl leading-7 text-muted-foreground">{circle.description}</p>
                </div>
                <div className="flex shrink-0 -space-x-2">
                  {["N", "R", "S"].map((name, index) => (
                    <Avatar key={name} className="border-2 border-white">
                      <AvatarFallback className={index === 0 ? "bg-accent text-[var(--brand-pink)]" : "bg-secondary text-primary"}>{name}</AvatarFallback>
                    </Avatar>
                  ))}
                  <Avatar className="border-2 border-white"><AvatarFallback className="bg-[var(--brand-yellow)] text-[#523600]">+{Math.max(0, circle.member_count - 3)}</AvatarFallback></Avatar>
                </div>
              </div>

              <div className="mt-7 grid gap-4 rounded-3xl bg-[#f7f9fe] p-5 sm:grid-cols-[1fr_auto] sm:items-center">
                <div>
                  <div className="flex items-center gap-2 text-sm font-bold text-[var(--brand-dark-blue)]"><Target className="h-4 w-4 text-[var(--brand-pink)]" /> Monthly mission</div>
                  <p className="mt-2 text-sm text-muted-foreground">{circle.mission.title}</p>
                  <Progress value={(circle.mission.progress / circle.mission.target) * 100} className="mt-3 h-2 [&>div]:bg-[var(--brand-pink)]" />
                </div>
                <div className="text-left sm:text-right">
                  <strong className="text-2xl text-[var(--brand-dark-blue)]">{circle.mission.progress}/{circle.mission.target}</strong>
                  <p className="text-xs text-muted-foreground">activities complete</p>
                </div>
              </div>

              {joinError ? (
                <Alert variant="destructive" className="mt-5">
                  <UserRoundCheck /><AlertTitle>Could not join</AlertTitle><AlertDescription>{joinError}</AlertDescription>
                </Alert>
              ) : null}

              <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="flex items-center gap-2 text-sm font-semibold text-muted-foreground"><UsersRound className="h-4 w-4" /> {circle.member_count} students</p>
                <Button size="lg" onClick={() => joinMutation.mutate(circle.id)} disabled={joinMutation.isPending}>
                  {joinMutation.isPending ? "Joining…" : "Join circle"}
                  {!joinMutation.isPending ? <ArrowRight /> : null}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
    </div>
  );
}
