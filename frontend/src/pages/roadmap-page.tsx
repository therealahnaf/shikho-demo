import { useQuery } from "@tanstack/react-query";
import { Check, LockKeyhole, Map, Play, UsersRound } from "lucide-react";
import { Link, useParams } from "react-router-dom";

import { AppPageError, AppPageLoading } from "@/components/app-page-state";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { api, type MemberUser } from "@/lib/api";
import { cn } from "@/lib/utils";

function initials(name: string) {
  return name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

function MemberPositionGroup({ members }: { members: MemberUser[] }) {
  if (!members.length) return <span className="text-xs text-muted-foreground">No members here</span>;
  return (
    <div className="flex -space-x-1.5" aria-label={`${members.length} members at this checkpoint`}>
      {members.slice(0, 5).map((member) => (
        <Avatar key={member.id} className="size-7 border-2 border-white">
          <AvatarFallback className="bg-[#e7eefc] text-[9px] font-bold text-[var(--brand-dark-blue)]">
            {initials(member.display_name)}
          </AvatarFallback>
        </Avatar>
      ))}
      {members.length > 5 ? (
        <Avatar className="size-7 border-2 border-white">
          <AvatarFallback className="bg-[var(--brand-dark-blue)] text-[9px] font-bold text-white">+{members.length - 5}</AvatarFallback>
        </Avatar>
      ) : null}
    </div>
  );
}

export function RoadmapPage() {
  const { circleId = "" } = useParams();
  const roadmapQuery = useQuery({
    queryKey: ["roadmap", circleId],
    queryFn: () => api.getRoadmap(circleId),
    enabled: Boolean(circleId),
    retry: false,
  });

  if (roadmapQuery.isPending) return <AppPageLoading />;
  if (roadmapQuery.isError) {
    return <AppPageError onRetry={() => void roadmapQuery.refetch()} />;
  }

  const data = roadmapQuery.data;
  const dates = new Intl.DateTimeFormat("en", { month: "short", day: "numeric" });

  return (
    <div className="w-full space-y-4">
        <Breadcrumb>
          <BreadcrumbList className="text-xs">
            <BreadcrumbItem>
              <BreadcrumbLink asChild><Link to="/app/study-circle/lobby">StudyCircle</Link></BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild><Link to={`/app/study-circle/${circleId}`}>{data.circle.name}</Link></BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem><BreadcrumbPage>Roadmap</BreadcrumbPage></BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Weekly Roadmap</h1>
            <p className="mt-1 text-sm text-muted-foreground">{data.roadmap.title} · {dates.format(new Date(data.cycle.starts_at))}–{dates.format(new Date(data.cycle.ends_at))}</p>
          </div>
          <Badge variant="secondary" className="bg-[#eef3ff] text-[var(--brand-dark-blue)]">
            {data.next_checkpoint ? `Position ${data.membership.roadmap_position + 1}` : "Roadmap complete"}
          </Badge>
        </div>

        {data.next_checkpoint === null ? (
          <Alert className="border-0 bg-[#eef3ff]">
            <Check />
            <AlertTitle>Roadmap complete</AlertTitle>
            <AlertDescription>You completed every activity in this week’s roadmap.</AlertDescription>
          </Alert>
        ) : null}

        <Card className="border-0 shadow-sm">
          <CardHeader className="p-4">
            <CardTitle className="flex items-center gap-2 text-sm text-[var(--brand-dark-blue)]"><Map className="size-4" /> Five focused checkpoints</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {data.roadmap.checkpoints.map((checkpoint, index) => {
              const members = data.roadmap.member_positions.filter((item) => item.position === checkpoint.position).map((item) => item.user);
              return (
                <div key={checkpoint.id}>
                  <div className="grid gap-3 p-4 sm:grid-cols-[44px_minmax(0,1fr)_auto] sm:items-center">
                    <span className={cn(
                      "grid size-9 place-items-center rounded-full text-sm font-bold",
                      checkpoint.status === "completed" && "bg-[var(--brand-blue)] text-white",
                      checkpoint.status === "current" && "bg-[var(--brand-pink)] text-white",
                      checkpoint.status === "locked" && "bg-[#eef0f5] text-muted-foreground",
                    )}>
                      {checkpoint.status === "completed" ? <Check className="size-4" /> : checkpoint.status === "locked" ? <LockKeyhole className="size-4" /> : checkpoint.position + 1}
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-semibold">{checkpoint.title}</h2>
                        <Badge variant="outline" className="capitalize">{checkpoint.activity_type}</Badge>
                        <Badge variant="secondary" className="capitalize">{checkpoint.status}</Badge>
                      </div>
                      <div className="mt-2 flex items-center gap-2"><UsersRound className="size-3.5 text-muted-foreground" /><MemberPositionGroup members={members} /></div>
                    </div>
                    {checkpoint.status === "current" ? (
                      <Button asChild size="sm"><Link to={`/app/study-circle/${circleId}/activity/${checkpoint.id}`}><Play /> Start simulation</Link></Button>
                    ) : (
                      <Button size="sm" variant="secondary" disabled className="disabled:opacity-100">{checkpoint.status === "completed" ? "Completed" : "Locked"}</Button>
                    )}
                  </div>
                  {index < data.roadmap.checkpoints.length - 1 ? <Separator /> : null}
                </div>
              );
            })}
            {data.roadmap.member_positions.some((item) => item.position >= data.roadmap.checkpoints.length) ? (
              <>
                <Separator />
                <div className="flex flex-wrap items-center justify-between gap-3 bg-[#eef3ff] p-4">
                  <div><p className="text-sm font-semibold text-[var(--brand-dark-blue)]">Roadmap finishers</p><p className="text-xs text-muted-foreground">Members who completed all five checkpoints.</p></div>
                  <MemberPositionGroup members={data.roadmap.member_positions.filter((item) => item.position >= data.roadmap.checkpoints.length).map((item) => item.user)} />
                </div>
              </>
            ) : null}
          </CardContent>
        </Card>
    </div>
  );
}
