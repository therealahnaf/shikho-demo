import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpen, Check, CheckCircle2, ClipboardCheck, LockKeyhole, Trophy, Zap } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { AppPageError, AppPageLoading } from "@/components/app-page-state";
import { AppPageHeader } from "@/components/app-page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { api, ApiError, type ActivityType, type CompletionResult } from "@/lib/api";

const actionLabels: Record<ActivityType, string> = {
  review: "Mark review complete",
  lesson: "Finish simulated lesson",
  quiz: "Complete simulation",
  challenge: "Complete weekly challenge",
  assignment: "Submit simulated assignment",
  lab: "Complete simulated lab",
};

function SimulationBody({
  type,
  answer,
  setAnswer,
  confirmed,
  setConfirmed,
}: {
  type: ActivityType;
  answer: string;
  setAnswer: (value: string) => void;
  confirmed: boolean;
  setConfirmed: (value: boolean) => void;
}) {
  if (type === "review") {
    return (
      <div className="space-y-3 text-sm leading-7 text-muted-foreground">
        <p>Linear equations describe relationships where the highest variable power is one. Keep both sides balanced by applying the same operation to each side.</p>
        <p>This review is a short placeholder designed only to move your community progress forward.</p>
      </div>
    );
  }
  if (type === "lesson") {
    return (
      <div className="grid gap-4 sm:grid-cols-[160px_minmax(0,1fr)] sm:items-center">
        <div className="grid h-32 place-items-center rounded-xl bg-[#eef3ff] text-[var(--brand-dark-blue)]"><BookOpen className="size-12" /></div>
        <div><h2 className="font-semibold">Linear equations lesson preview</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">A real lesson would appear here. For this simulation, review the visual placeholder and finish the activity.</p></div>
      </div>
    );
  }
  if (type === "quiz") {
    return (
      <div>
        <h2 className="font-semibold">Sample question</h2>
        <p className="mt-2 text-sm text-muted-foreground">If x + 4 = 9, which value could x have? Any selection completes this simulation; correctness is not recorded.</p>
        <RadioGroup value={answer} onValueChange={setAnswer} className="mt-5 grid gap-3 sm:grid-cols-3">
          {["3", "5", "13"].map((option) => (
            <Label key={option} htmlFor={`answer-${option}`} className="flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-white p-4 text-foreground">
              <RadioGroupItem id={`answer-${option}`} value={option} />
              x = {option}
            </Label>
          ))}
        </RadioGroup>
      </div>
    );
  }
  const confirmationTitle = type === "assignment"
    ? "I have completed this simulated assignment"
    : type === "lab"
      ? "I have completed this simulated lab"
      : "I’m ready to complete this weekly challenge";
  return (
    <Label htmlFor="challenge-confirmation" className="flex cursor-pointer items-start gap-3 rounded-xl bg-[#eef3ff] p-4 text-foreground">
      <Checkbox id="challenge-confirmation" checked={confirmed} onCheckedChange={(value) => setConfirmed(value === true)} />
      <span><span className="block font-semibold">{confirmationTitle}</span><span className="mt-1 block text-sm font-normal leading-6 text-muted-foreground">This confirmation records one simulated roadmap completion for the community.</span></span>
    </Label>
  );
}

function CompletionSummary({ result, circleId }: { result: CompletionResult; circleId: string }) {
  const headingRef = useRef<HTMLDivElement>(null);
  useEffect(() => { headingRef.current?.focus(); }, []);
  const rankChanged = result.previous_rank !== result.current_rank;
  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="p-5">
        <Badge className="w-fit bg-[var(--brand-pink)] text-white hover:bg-[var(--brand-pink)]"><CheckCircle2 className="mr-1 size-3.5" /> Progress updated</Badge>
        <CardTitle ref={headingRef} tabIndex={-1} className="pt-3 text-2xl outline-none">Checkpoint complete</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5 p-5 pt-0">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl bg-[#eef3ff] p-4"><p className="text-xs text-muted-foreground">Points added</p><p className="mt-1 text-2xl font-bold text-[var(--brand-dark-blue)]">+{result.points_added}</p></div>
          <div className="rounded-xl bg-[#eef3ff] p-4"><p className="text-xs text-muted-foreground">Roadmap position</p><p className="mt-1 text-2xl font-bold text-[var(--brand-dark-blue)]">{result.membership.roadmap_position}</p></div>
          <div className="rounded-xl bg-[#eef3ff] p-4"><p className="text-xs text-muted-foreground">Weekly rank</p><p className="mt-1 text-2xl font-bold text-[var(--brand-dark-blue)]">#{result.current_rank}</p>{rankChanged ? <p className="text-xs text-[var(--brand-pink)]">Moved from #{result.previous_rank}</p> : null}</div>
          <div className="rounded-xl bg-[#fff0cc] p-4"><p className="text-xs text-[#725000]">Circle streak</p><p className="mt-1 text-2xl font-bold text-[#725000]">{result.streak.days} days</p>{result.streak_increased ? <p className="text-xs text-[#725000]">Streak increased</p> : null}</div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><div className="flex justify-between text-sm"><span>Monthly mission</span><strong>{result.mission.progress}/{result.mission.target}</strong></div><Progress value={result.mission.percent_complete} className="mt-2 bg-[#e7eaf2] [&>div]:bg-[var(--brand-pink)]" /></div>
          <div><div className="flex justify-between text-sm"><span>Daily quest</span><strong>{result.daily_quest.progress}/{result.daily_quest.target}</strong></div><Progress value={result.daily_quest.percent_complete} className="mt-2 bg-[#e7eaf2] [&>div]:bg-[var(--brand-blue)]" /></div>
        </div>
        <Separator />
        <div className="flex flex-wrap gap-3">
          <Button asChild variant="outline"><Link to={`/app/study-circle/${circleId}`}>Back to Circle</Link></Button>
          {result.next_checkpoint ? (
            <Button asChild><Link to={`/app/study-circle/${circleId}/activity/${result.next_checkpoint.id}`}>Continue Roadmap</Link></Button>
          ) : (
            <Button asChild><Link to={`/app/study-circle/${circleId}/roadmap`}><Trophy /> Roadmap complete</Link></Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function ActivityPage() {
  const { circleId = "", checkpointId = "" } = useParams();
  const queryClient = useQueryClient();
  const roadmapQuery = useQuery({ queryKey: ["roadmap", circleId], queryFn: () => api.getRoadmap(circleId), enabled: Boolean(circleId), retry: false });
  const [answer, setAnswer] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [result, setResult] = useState<CompletionResult | null>(null);

  const mutation = useMutation({
    mutationFn: () => api.completeCheckpoint(circleId, checkpointId),
    onSuccess: (completion) => {
      setResult(completion);
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: ["circle-home", circleId] }),
        queryClient.invalidateQueries({ queryKey: ["roadmap", circleId] }),
        queryClient.invalidateQueries({ queryKey: ["leaderboard", circleId] }),
        queryClient.invalidateQueries({ queryKey: ["activity-feed", circleId] }),
        queryClient.invalidateQueries({ queryKey: ["membership"] }),
      ]);
    },
    onError: (error) => {
      if (error instanceof ApiError && ["checkpoint_already_completed", "checkpoint_locked"].includes(error.code)) {
        void queryClient.invalidateQueries({ queryKey: ["roadmap", circleId] });
      }
    },
  });

  if (roadmapQuery.isPending) return <AppPageLoading />;
  if (roadmapQuery.isError) return <AppPageError onRetry={() => void roadmapQuery.refetch()} />;
  const checkpoint = roadmapQuery.data.roadmap.checkpoints.find((item) => item.id === checkpointId);
  if (!checkpoint) return <AppPageError onRetry={() => void roadmapQuery.refetch()} />;

  const prerequisiteMissing = checkpoint.activity_type === "quiz" ? !answer : ["challenge", "assignment", "lab"].includes(checkpoint.activity_type) ? !confirmed : false;
  const conflict = mutation.error instanceof ApiError && ["checkpoint_already_completed", "checkpoint_locked"].includes(mutation.error.code);

  return (
    <div className="w-full space-y-4">
        <AppPageHeader title={result ? "Checkpoint complete" : checkpoint.title} description={result ? "Your circle progress has been updated." : `${checkpoint.activity_type} simulation`} backTo={`/app/study-circle/${circleId}/roadmap`} />
        {result ? <CompletionSummary result={result} circleId={circleId} /> : (
          <Card className="border-0 shadow-sm">
            <CardHeader className="p-5">
              <Badge variant="secondary" className="w-fit bg-[#eef3ff] text-[var(--brand-dark-blue)]">Simulation only — no real lesson or score</Badge>
              <CardTitle className="pt-3 text-2xl">{checkpoint.title}</CardTitle>
              <div className="flex items-center gap-2 text-sm text-muted-foreground"><ClipboardCheck className="size-4" /><span className="capitalize">{checkpoint.activity_type} simulation</span></div>
            </CardHeader>
            <CardContent className="space-y-5 p-5 pt-0">
              {checkpoint.status !== "current" ? (
                <Alert className="border-0 bg-[#eef3ff]"><LockKeyhole /><AlertTitle>{checkpoint.status === "completed" ? "Checkpoint already completed" : "Checkpoint locked"}</AlertTitle><AlertDescription>Return to the roadmap to continue from your current position.</AlertDescription></Alert>
              ) : (
                <SimulationBody type={checkpoint.activity_type} answer={answer} setAnswer={setAnswer} confirmed={confirmed} setConfirmed={setConfirmed} />
              )}
              {mutation.isError ? (
                <Alert variant="destructive"><Zap /><AlertTitle>{conflict ? "Progress already moved" : "Could not complete activity"}</AlertTitle><AlertDescription>{conflict ? "Your latest roadmap state is being refreshed. Return to the roadmap to continue." : mutation.error.message}</AlertDescription></Alert>
              ) : null}
              <div className="flex flex-wrap gap-3">
                <Button asChild variant="outline"><Link to={`/app/study-circle/${circleId}/roadmap`}>Back to Roadmap</Link></Button>
                {checkpoint.status === "current" ? <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || prerequisiteMissing}>{mutation.isPending ? "Updating progress…" : actionLabels[checkpoint.activity_type]} <Check /></Button> : null}
              </div>
            </CardContent>
          </Card>
        )}
    </div>
  );
}
