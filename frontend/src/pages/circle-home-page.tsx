import { useQuery } from "@tanstack/react-query";
import {
  BookOpenCheck,
  Check,
  Clock3,
  Crown,
  Flame,
  LockKeyhole,
  Map,
  Sparkles,
  Target,
  Trophy,
  UsersRound,
  Zap,
} from "lucide-react";
import { useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { AppPageError, AppPageLoading } from "@/components/app-page-state";
import { AppShell } from "@/components/app-shell";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCaption, TableCell, TableRow } from "@/components/ui/table";
import { useCurrentUser } from "@/hooks/use-current-user";
import { api, ApiError, type CircleHome, type MemberUser } from "@/lib/api";
import { cn } from "@/lib/utils";

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatTimeRemaining(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return hours > 0 ? `${hours}h ${minutes}m` : `${Math.max(1, minutes)}m`;
}

function relativeTime(value: string) {
  const minutes = Math.max(1, Math.round((Date.now() - new Date(value).getTime()) / 60_000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

function activityText(event: CircleHome["activity_feed"][number]) {
  const name = event.actor?.display_name ?? "The circle";
  if (event.event_type === "member_joined") return `${name} joined the circle.`;
  if (event.event_type === "rank_changed") return `${name} moved to rank ${String(event.payload.rank)}.`;
  return `${name} completed ${String(event.payload.checkpoint_title ?? "a roadmap checkpoint")}.`;
}

function AvatarStack({ users, max = 3 }: { users: MemberUser[]; max?: number }) {
  const visible = users.slice(0, max);
  return (
    <div className="flex -space-x-1.5" aria-label={`${users.length} circle members`}>
      {visible.map((member, index) => (
        <Avatar key={member.id} className="size-7 border-2 border-white">
          <AvatarFallback
            className={cn(
              "text-[9px] font-bold",
              index % 3 === 0 && "bg-[#ffe5f4] text-[var(--brand-pink)]",
              index % 3 === 1 && "bg-[#e7eefc] text-[var(--brand-dark-blue)]",
              index % 3 === 2 && "bg-[#fff0cc] text-[#725000]",
            )}
          >
            {initials(member.display_name)}
          </AvatarFallback>
        </Avatar>
      ))}
      {users.length > max ? (
        <Avatar className="size-7 border-2 border-white">
          <AvatarFallback className="bg-[var(--brand-dark-blue)] text-[9px] font-bold text-white">
            +{users.length - max}
          </AvatarFallback>
        </Avatar>
      ) : null}
    </div>
  );
}

function CardLabel({ icon: Icon, children }: { icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-xs font-bold text-[var(--brand-dark-blue)]">
      <span className="grid size-6 place-items-center rounded-md bg-[#eef3ff] text-[var(--brand-blue)]">
        <Icon className="size-3.5" />
      </span>
      {children}
    </div>
  );
}

export function CircleHomePage() {
  const { circleId = "" } = useParams();
  const navigate = useNavigate();
  const userQuery = useCurrentUser();
  const homeQuery = useQuery({
    queryKey: ["circle-home", circleId],
    queryFn: () => api.getCircleHome(circleId),
    enabled: userQuery.isSuccess && Boolean(circleId),
    retry: false,
  });

  useEffect(() => {
    if (homeQuery.error instanceof ApiError && homeQuery.error.status === 403) {
      navigate("/app/study-circle/recommended", { replace: true });
    }
  }, [homeQuery.error, navigate]);

  if (userQuery.isPending || homeQuery.isPending) return <AppPageLoading />;
  if (userQuery.isError || homeQuery.isError) {
    return <AppPageError onRetry={() => void (userQuery.refetch(), homeQuery.refetch())} />;
  }

  const data = homeQuery.data;
  const firstName = userQuery.data.display_name.split(/\s+/)[0];
  const endDate = new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(
    new Date(data.mission.ends_at),
  );

  return (
    <AppShell user={userQuery.data}>
      <div className="w-full space-y-4">
        <div className="space-y-2">
          <Breadcrumb>
            <BreadcrumbList className="text-xs">
              <BreadcrumbItem>
                <BreadcrumbLink asChild><Link to="/app">StudyCircle</Link></BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem><BreadcrumbPage>{data.circle.name}</BreadcrumbPage></BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Welcome back, {firstName}! 👋</h1>
              <p className="mt-1 text-sm text-muted-foreground">Let&apos;s learn and win together.</p>
            </div>
            <Badge variant="outline" className="border-[#b7c6e8] bg-white text-[var(--brand-dark-blue)]">
              Class 10 · Mathematics
            </Badge>
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_180px]">
          <Card className="border-0 shadow-sm">
            <CardHeader className="p-4 pb-2">
              <div className="flex items-center justify-between gap-3">
                <CardLabel icon={Target}>Monthly Circle Mission</CardLabel>
                <Badge variant="secondary" className="bg-[#eef3ff] text-[var(--brand-dark-blue)]">Ends {endDate}</Badge>
              </div>
              <CardTitle className="pt-1 text-sm font-medium leading-5">{data.mission.title}</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-2">
              <div className="flex items-end justify-between">
                <p><strong className="text-2xl">{data.mission.progress}</strong><span className="text-sm text-muted-foreground"> / {data.mission.target}</span></p>
                <span className="text-sm font-bold">{data.mission.percent_complete}%</span>
              </div>
              <Progress value={data.mission.percent_complete} className="mt-2 h-2 bg-[#e7eaf2] [&>div]:bg-[var(--brand-pink)]" />
              <p className="mt-2 text-xs text-muted-foreground">Your contribution: <strong className="text-[var(--brand-pink)]">{data.mission.student_contribution} activities</strong></p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader className="p-4 pb-2">
              <div className="flex items-center justify-between gap-3">
                <CardLabel icon={Zap}>Daily Circle Quest</CardLabel>
                <Badge className="bg-[var(--brand-yellow)] text-[#3d2a00] hover:bg-[var(--brand-yellow)]">
                  <Clock3 className="mr-1 size-3" /> {formatTimeRemaining(data.daily_quest.time_remaining_seconds)} left
                </Badge>
              </div>
              <CardTitle className="pt-1 text-sm font-medium leading-5">{data.daily_quest.title}</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-2">
              <div className="flex items-end justify-between">
                <p><strong className="text-2xl">{data.daily_quest.progress}</strong><span className="text-sm text-muted-foreground"> / {data.daily_quest.target}</span></p>
                <span className="text-sm font-bold">{data.daily_quest.percent_complete}%</span>
              </div>
              <Progress value={data.daily_quest.percent_complete} className="mt-2 h-2 bg-[#e7eaf2] [&>div]:bg-[var(--brand-blue)]" />
              <p className="mt-2 text-xs text-muted-foreground">Quest resets at midnight</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm lg:col-span-2 xl:col-span-1">
            <CardContent className="flex h-full min-h-40 flex-col items-center justify-center p-4 text-center">
              <CardLabel icon={Flame}>Circle Streak</CardLabel>
              <Flame className="mt-3 size-7 text-[var(--brand-yellow)]" />
              <p className="mt-1 text-3xl font-black text-[var(--brand-dark-blue)]">{data.streak.days}</p>
              <p className="text-xs font-semibold text-muted-foreground">days together</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_220px]">
          <Card className="border-0 shadow-sm">
            <CardHeader className="flex-row items-center justify-between space-y-0 p-4 pb-2">
              <div>
                <CardLabel icon={Map}>Weekly Roadmap</CardLabel>
                <CardTitle className="mt-2 text-sm">{data.roadmap.title}</CardTitle>
              </div>
              <Button size="sm" disabled className="disabled:bg-[#e7eaf2] disabled:text-muted-foreground disabled:opacity-100">
                <BookOpenCheck /> Continue Roadmap
              </Button>
            </CardHeader>
            <CardContent className="p-4 pt-3">
              <div className="overflow-x-auto pb-2">
                <div className="grid min-w-[680px] grid-cols-5">
                  {data.roadmap.checkpoints.map((checkpoint, index) => {
                    const membersHere = data.roadmap.member_positions
                      .filter((member) => member.position === checkpoint.position)
                      .map((member) => member.user);
                    const isCurrent = checkpoint.status === "current";
                    const isComplete = checkpoint.status === "completed";
                    return (
                      <div key={checkpoint.id} className="relative px-2 text-center">
                        {index < data.roadmap.checkpoints.length - 1 ? (
                          <span className="absolute left-[calc(50%+18px)] right-[calc(-50%+18px)] top-4 h-px bg-border" />
                        ) : null}
                        <Badge
                          variant="outline"
                          className={cn(
                            "relative z-10 mx-auto grid size-8 place-items-center rounded-full p-0",
                            isCurrent && "border-[var(--brand-pink)] bg-[var(--brand-pink)] text-white",
                            isComplete && "border-[var(--brand-blue)] bg-[var(--brand-blue)] text-white",
                            !isCurrent && !isComplete && "border-border bg-[#f1f3f8] text-muted-foreground",
                          )}
                        >
                          {isComplete ? <Check className="size-4" /> : isCurrent ? checkpoint.position + 1 : <LockKeyhole className="size-3.5" />}
                        </Badge>
                        <p className={cn("mt-2 text-xs font-semibold", isCurrent ? "text-[var(--brand-pink)]" : "text-foreground")}>{checkpoint.title}</p>
                        <p className="mt-1 text-[10px] capitalize text-muted-foreground">{checkpoint.activity_type}</p>
                        <div className="mt-2 flex justify-center">
                          {membersHere.length ? <AvatarStack users={membersHere} /> : <span className="h-7 text-[10px] text-muted-foreground">No members</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <Alert className="mt-2 border-[#ccd7ef] bg-[#eef3ff] py-2 text-[var(--brand-dark-blue)]">
                <LockKeyhole />
                <AlertDescription>Roadmap activities are not available yet.</AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="flex h-full min-h-52 flex-col items-center justify-center p-4 text-center">
              <CardLabel icon={Crown}>Mentor of the Week</CardLabel>
              <Avatar className="mt-4 size-14 border-2 border-[var(--brand-yellow)]">
                <AvatarFallback className="bg-[var(--brand-dark-blue)] text-base font-bold text-white">
                  {data.mentor ? initials(data.mentor.display_name) : "—"}
                </AvatarFallback>
              </Avatar>
              <p className="mt-2 font-bold">{data.mentor?.display_name ?? "To be announced"}</p>
              <p className="text-xs text-muted-foreground">Leading the circle this week</p>
              <Badge className="mt-2 bg-[var(--brand-yellow)] text-[#3d2a00] hover:bg-[var(--brand-yellow)]">Mentor</Badge>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-3 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,.8fr)]">
          <Card className="overflow-hidden border-0 shadow-sm">
            <CardHeader className="flex-row items-center justify-between space-y-0 p-4 pb-2">
              <CardLabel icon={Trophy}>Leaderboard · This Week</CardLabel>
              <Badge variant="secondary" className="bg-[#eef3ff] text-[var(--brand-dark-blue)]">Your rank #{data.leaderboard.current_user_rank}</Badge>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableCaption className="sr-only">Weekly StudyCircle leaderboard</TableCaption>
                <TableBody>
                  {data.leaderboard.entries.map((entry) => (
                    <TableRow key={entry.user.id} className={cn("hover:bg-[#f7f8fc]", entry.is_current_user && "bg-[#eef3ff] hover:bg-[#eef3ff]")}>
                      <TableCell className="w-12 pl-4 text-center font-bold">
                        {entry.rank === 1 ? <Crown className="mx-auto size-4 text-[var(--brand-yellow)]" /> : entry.rank}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="size-8">
                            <AvatarFallback className="bg-[var(--brand-dark-blue)] text-[10px] font-bold text-white">{initials(entry.user.display_name)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-semibold">{entry.user.display_name}{entry.is_current_user ? " (You)" : ""}</p>
                            {entry.is_mentor ? <Badge variant="outline" className="mt-1 h-4 border-[var(--brand-yellow)] px-1 text-[9px] text-[#725000]">Mentor</Badge> : null}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="pr-4 text-right font-bold text-[var(--brand-dark-blue)]">{entry.weekly_points} pts</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-0 shadow-sm">
            <CardHeader className="p-4 pb-2">
              <CardLabel icon={Sparkles}>Recent Activity</CardLabel>
            </CardHeader>
            <CardContent className="p-0">
              {data.activity_feed.length ? data.activity_feed.map((event, index) => (
                <div key={event.id}>
                  <div className="flex items-center gap-3 px-4 py-3">
                    <Avatar className="size-8">
                      <AvatarFallback className="bg-[#e7eefc] text-[10px] font-bold text-[var(--brand-dark-blue)]">
                        {event.actor ? initials(event.actor.display_name) : "SC"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs leading-5">{activityText(event)}</p>
                      <p className="text-[10px] text-muted-foreground">{relativeTime(event.created_at)}</p>
                    </div>
                  </div>
                  {index < data.activity_feed.length - 1 ? <Separator /> : null}
                </div>
              )) : (
                <div className="p-6 text-center">
                  <UsersRound className="mx-auto size-6 text-muted-foreground" />
                  <p className="mt-2 text-sm font-semibold">Activity will appear here</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
