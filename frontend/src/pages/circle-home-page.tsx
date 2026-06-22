import { useQuery } from "@tanstack/react-query";
import {
  BookOpenCheck,
  Check,
  Clock3,
  Crown,
  Flame,
  Info,
  LockKeyhole,
  LibraryBig,
  Map,
  Sparkles,
  Target,
  Trophy,
  UsersRound,
  Zap,
  HelpCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";

import { AppPageError, AppPageLoading } from "@/components/app-page-state";
import { AppPageHeader, pageActionClassName } from "@/components/app-page-header";
import { ActivityFeedItem } from "@/components/activity-feed-item";
import { useAppUser } from "@/components/app-layout";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCaption, TableCell, TableRow } from "@/components/ui/table";
import { api, ApiError, type MemberUser } from "@/lib/api";
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

interface InfoHoverCardProps {
  title: string;
  description: string;
  funFact?: string;
}

function InfoHoverCard({ title, description, funFact }: InfoHoverCardProps) {
  return (
    <HoverCard openDelay={150} closeDelay={150}>
      <HoverCardTrigger asChild>
        <button
          type="button"
          className="ml-1 inline-flex size-4 items-center justify-center rounded-full text-muted-foreground/60 hover:text-[var(--brand-blue)] hover:bg-[#eef3ff] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--brand-blue)] cursor-pointer"
          aria-label={`Information about ${title}`}
          onClick={(e) => e.stopPropagation()}
        >
          <Info className="size-3" />
        </button>
      </HoverCardTrigger>
      <HoverCardContent
        className="w-80 p-4 border border-slate-100 bg-white/95 backdrop-blur-md shadow-lg rounded-xl z-50 text-left animate-in fade-in-0 zoom-in-95 duration-150"
        side="top"
        align="start"
      >
        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--brand-blue)]">{title}</h4>
          <p className="text-sm text-[var(--brand-dark-blue)] leading-relaxed font-normal">{description}</p>
          {funFact && (
            <div className="mt-3 rounded-lg bg-[#fcf8ff] border border-[#f3e8ff] p-2.5">
              <p className="text-xs font-semibold text-[#6b21a8] flex items-center gap-1">
                <span>✨</span> Fun Fact
              </p>
              <p className="mt-1 text-[11px] text-[#7e22ce] leading-normal font-normal">{funFact}</p>
            </div>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}

interface TourStep {
  id: string;
  title: string;
  description: string;
  funFact: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    id: "tour-step-mission",
    title: "Monthly Circle Mission 🎯",
    description: "Collaborate with your 10 circle members to complete this major goal. Every single action counts towards your team points!",
    funFact: "Circles completing monthly missions gain a massive boost in the Subject leaderboards.",
  },
  {
    id: "tour-step-quest",
    title: "Daily Circle Quest ⚡",
    description: "A quick-fire goal for the entire circle that resets at midnight. Work together to finish it in time!",
    funFact: "Consistency is key: completing daily quests boosts your individual points by 15%!",
  },
  {
    id: "tour-step-streak",
    title: "Circle Streak 🔥",
    description: "Keep the fire burning! At least one member of your circle must complete an activity every day to keep the streak alive. If it hits 0, the circle dies.",
    funFact: "A dead circle cannot be revived. Work together to keep your community alive!",
  },
  {
    id: "tour-step-roadmap",
    title: "Weekly Roadmap 🗺️",
    description: "Your weekly study guide based on the syllabus. This is selected by the weekly Mentor to keep everyone focused.",
    funFact: "Completing roadmap milestones helps your circle progress faster.",
  },
  {
    id: "tour-step-mentor",
    title: "Mentor of the Week 👑",
    description: "The student placing 1st in the leaderboard last week becomes the Mentor. They hold the power to choose the next roadmap!",
    funFact: "With great power comes great responsibility. Lead your circle to victory!",
  },
  {
    id: "tour-step-leaderboard",
    title: "Leaderboard · This Week 🏆",
    description: "Check out the friendly competition inside your circle. The top student at the end of the week becomes next week's Mentor!",
    funFact: "Points are earned from daily quests, monthly missions, and roadmap progress.",
  },
  {
    id: "tour-step-activity",
    title: "Recent Activity ✨",
    description: "A live feed showing the latest study contributions, note uploads, and completions from your circle members.",
    funFact: "Support your peers! Head over to the Circle Store to upvote helpful notes.",
  },
];

export function CircleHomePage() {
  const { circleId = "" } = useParams();
  const navigate = useNavigate();
  const user = useAppUser();
  const queryClient = useQueryClient();
  const [isLeaveOpen, setIsLeaveOpen] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [tourStep, setTourStep] = useState<number | null>(null);

  const handleNextStep = () => {
    if (tourStep === null) return;
    if (tourStep < TOUR_STEPS.length - 1) {
      setTourStep(tourStep + 1);
    } else {
      handleCompleteTour();
    }
  };

  const handlePrevStep = () => {
    if (tourStep === null) return;
    if (tourStep > 0) {
      setTourStep(tourStep - 1);
    }
  };

  const handleCompleteTour = () => {
    setTourStep(null);
    localStorage.setItem(`shikho_circle_dashboard_tutorial_completed_${user.username}`, "true");
  };

  const scrollToStep = (index: number) => {
    const step = TOUR_STEPS[index];
    setTimeout(() => {
      const el = document.getElementById(step.id);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 100);
  };

  const homeQuery = useQuery({
    queryKey: ["circle-home", circleId],
    queryFn: () => api.getCircleHome(circleId),
    enabled: Boolean(circleId),
    retry: false,
  });

  useEffect(() => {
    if (tourStep !== null) {
      scrollToStep(tourStep);
    }
  }, [tourStep]);

  useEffect(() => {
    if (homeQuery.data) {
      const completed = localStorage.getItem(`shikho_circle_dashboard_tutorial_completed_${user.username}`);
      if (!completed) {
        const timer = setTimeout(() => {
          setTourStep(0);
        }, 800);
        return () => clearTimeout(timer);
      }
    }
  }, [homeQuery.data, user.username]);

  useEffect(() => {
    if (homeQuery.error instanceof ApiError && homeQuery.error.status === 403) {
      navigate("/app/study-circle/recommended", { replace: true });
    }
  }, [homeQuery.error, navigate]);

  if (homeQuery.isPending) return <AppPageLoading />;
  if (homeQuery.isError) {
    return <AppPageError onRetry={() => void homeQuery.refetch()} />;
  }

  const data = homeQuery.data;

  const handleLeave = async () => {
    setIsLeaving(true);
    try {
      await api.leaveCircle(circleId);
      queryClient.invalidateQueries({ queryKey: ["membership"] });
      queryClient.invalidateQueries({ queryKey: ["circle-home", circleId] });
      navigate("/app", { replace: true });
    } catch (err) {
      console.error("Failed to leave circle:", err);
    } finally {
      setIsLeaving(false);
      setIsLeaveOpen(false);
    }
  };

  const firstName = user.display_name.split(/\s+/)[0];
  const endDate = new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(
    new Date(data.mission.ends_at),
  );

  return (
    <div className="w-full space-y-4">
        <AppPageHeader
          title={`Welcome back, ${firstName}! 👋`}
          description={`${data.circle.name} · Class 10 Mathematics`}
          backTo="/app/study-circle/lobby"
          actions={<><Button size="sm" variant="outline" className={`${pageActionClassName} bg-white text-[var(--brand-dark-blue)]`} onClick={() => setTourStep(0)}><HelpCircle className="size-4" /> Tutorial</Button><Button asChild size="sm" variant="outline" className={`${pageActionClassName} bg-white text-[var(--brand-dark-blue)]`}><Link to={`/app/study-circle/${circleId}/store`}><LibraryBig className="size-4" /> Circle Store</Link></Button><Button size="sm" variant="outline" className={`${pageActionClassName} border-red-200 bg-white text-red-600 hover:bg-red-50 hover:text-red-700`} onClick={() => setIsLeaveOpen(true)}>Leave Circle</Button></>}
        />

        <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_180px]">
          <Card
            id="tour-step-mission"
            className={cn(
              "border-0 shadow-sm transition-all duration-300",
              tourStep === 0 ? "relative z-50 bg-white ring-4 ring-[var(--brand-pink)] ring-offset-2 scale-[1.02] shadow-2xl" : ""
            )}
          >
            <CardHeader className="p-4 pb-2">
              <div className="flex items-center justify-between gap-3">
                <CardLabel icon={Target}>
                  Monthly Circle Mission
                  <InfoHoverCard
                    title="Monthly Mission"
                    description="Collaborate with your 10 circle members to complete this major goal. Every single action counts towards your team points!"
                    funFact="Circles completing monthly missions gain a massive boost in the Subject leaderboards."
                  />
                </CardLabel>
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

          <Card
            id="tour-step-quest"
            className={cn(
              "border-0 shadow-sm transition-all duration-300",
              tourStep === 1 ? "relative z-50 bg-white ring-4 ring-[var(--brand-pink)] ring-offset-2 scale-[1.02] shadow-2xl" : ""
            )}
          >
            <CardHeader className="p-4 pb-2">
              <div className="flex items-center justify-between gap-3">
                <CardLabel icon={Zap}>
                  Daily Circle Quest
                  <InfoHoverCard
                    title="Daily Quest"
                    description="A quick-fire goal for the entire circle that resets at midnight. Work together to finish it in time!"
                    funFact="Consistency is key: completing daily quests boosts your individual points by 15%!"
                  />
                </CardLabel>
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

          <Card
            id="tour-step-streak"
            className={cn(
              "border-0 shadow-sm lg:col-span-2 xl:col-span-1 transition-all duration-300",
              tourStep === 2 ? "relative z-50 bg-white ring-4 ring-[var(--brand-pink)] ring-offset-2 scale-[1.02] shadow-2xl" : ""
            )}
          >
            <CardContent className="flex h-full min-h-40 flex-col items-center justify-center p-4 text-center">
              <CardLabel icon={Flame}>
                Circle Streak
                <InfoHoverCard
                  title="Circle Streak"
                  description="Keep the fire burning! At least one member of your circle must complete an activity every day to keep the streak alive. If it hits 0, the circle dies."
                  funFact="A dead circle cannot be revived. Work together to keep your community alive!"
                />
              </CardLabel>
              <Flame className="mt-3 size-7 text-[var(--brand-yellow)]" />
              <p className="mt-1 text-3xl font-black text-[var(--brand-dark-blue)]">{data.streak.days}</p>
              <p className="text-xs font-semibold text-muted-foreground">days together</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_220px]">
          <Card
            id="tour-step-roadmap"
            className={cn(
              "border-0 shadow-sm transition-all duration-300",
              tourStep === 3 ? "relative z-50 bg-white ring-4 ring-[var(--brand-pink)] ring-offset-2 scale-[1.02] shadow-2xl" : ""
            )}
          >
            <CardHeader className="flex-row items-center justify-between space-y-0 p-4 pb-2">
              <div>
                <CardLabel icon={Map}>
                  Weekly Roadmap
                  <InfoHoverCard
                    title="Weekly Roadmap"
                    description="Your weekly study guide based on the syllabus. This is selected by the weekly Mentor to keep everyone focused."
                    funFact="Completing roadmap milestones helps your circle progress faster."
                  />
                </CardLabel>
                <CardTitle className="mt-2 text-sm">{data.roadmap.title}</CardTitle>
              </div>
              {data.cycle_status === "finalized" ? (
                <div className="flex flex-col items-end gap-1.5">
                  <Button size="sm" disabled className="disabled:opacity-50">
                    <BookOpenCheck /> Continue Roadmap
                  </Button>
                  <span className="text-[10px] text-muted-foreground font-medium">
                    Roadmap activities are not available yet.
                  </span>
                </div>
              ) : (
                <Button asChild size="sm">
                  <Link to={`/app/study-circle/${circleId}/roadmap`}><BookOpenCheck /> Continue Roadmap</Link>
                </Button>
              )}
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
            </CardContent>
          </Card>

          <Card
            id="tour-step-mentor"
            className={cn(
              "border-0 shadow-sm transition-all duration-300",
              tourStep === 4 ? "relative z-50 bg-white ring-4 ring-[var(--brand-pink)] ring-offset-2 scale-[1.02] shadow-2xl" : ""
            )}
          >
            <CardContent className="flex h-full min-h-52 flex-col items-center justify-center p-4 text-center">
              <CardLabel icon={Crown}>
                Mentor of the Week
                <InfoHoverCard
                  title="Weekly Mentor"
                  description="The student placing 1st in the leaderboard last week becomes the Mentor. They hold the power to choose the next roadmap!"
                  funFact="With great power comes great responsibility. Lead your circle to victory!"
                />
              </CardLabel>
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
          <Card
            id="tour-step-leaderboard"
            className={cn(
              "overflow-hidden border-0 shadow-sm transition-all duration-300",
              tourStep === 5 ? "relative z-50 bg-white ring-4 ring-[var(--brand-pink)] ring-offset-2 scale-[1.02] shadow-2xl" : ""
            )}
          >
            <CardHeader className="flex-row items-center justify-between space-y-0 p-4 pb-2">
              <CardLabel icon={Trophy}>
                Leaderboard · This Week
                <InfoHoverCard
                  title="Weekly Standings"
                  description="Check out the friendly competition inside your circle. The top student at the end of the week becomes next week's Mentor!"
                  funFact="Points are earned from daily quests, monthly missions, and roadmap progress."
                />
              </CardLabel>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-[#eef3ff] text-[var(--brand-dark-blue)]">Your rank #{data.leaderboard.current_user_rank}</Badge>
                <Button asChild size="sm" variant="outline"><Link to={`/app/study-circle/${circleId}/leaderboard`}>View full leaderboard</Link></Button>
              </div>
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

          <Card
            id="tour-step-activity"
            className={cn(
              "overflow-hidden border-0 shadow-sm transition-all duration-300",
              tourStep === 6 ? "relative z-50 bg-white ring-4 ring-[var(--brand-pink)] ring-offset-2 scale-[1.02] shadow-2xl" : ""
            )}
          >
            <CardHeader className="p-4 pb-2">
              <CardLabel icon={Sparkles}>
                Recent Activity
                <InfoHoverCard
                  title="Circle Activity"
                  description="A live feed showing the latest study contributions, note uploads, and completions from your circle members."
                  funFact="Support your peers! Head over to the Circle Store to upvote helpful notes."
                />
              </CardLabel>
            </CardHeader>
            <CardContent className="p-0">
              {data.activity_feed.length ? data.activity_feed.map((event, index) => (
                <div key={event.id}>
                  <ActivityFeedItem event={event} />
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

        <Dialog open={isLeaveOpen} onOpenChange={setIsLeaveOpen}>
          <DialogContent className="bg-white border-slate-200 text-slate-900 rounded-2xl p-6 max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold tracking-tight text-slate-900">
                Leave StudyCircle
              </DialogTitle>
              <DialogDescription className="text-slate-500 mt-2">
                Are you sure you want to leave <strong>{data.circle.name}</strong>? You will lose your membership standing and progress in this circle.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex gap-2 sm:justify-end pt-4">
              <Button type="button" variant="outline" onClick={() => setIsLeaveOpen(false)} className="border-slate-200 text-slate-700 hover:bg-slate-50">
                Cancel
              </Button>
              <Button
                onClick={handleLeave}
                disabled={isLeaving}
                className="bg-red-600 hover:bg-red-700 text-white font-semibold"
              >
                {isLeaving ? "Leaving..." : "Leave Circle"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {tourStep !== null && (
          <>
            {/* Backdrop overlay */}
            <div 
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-[2px] z-40 transition-opacity duration-300"
              onClick={handleCompleteTour}
            />
            
            {/* Onboarding Dialog */}
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-lg bg-white border border-slate-200/80 shadow-2xl rounded-2xl p-6 z-50 transition-all duration-300 flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[var(--brand-pink)] uppercase tracking-wider">
                  Dashboard Tour · Step {tourStep + 1} of {TOUR_STEPS.length}
                </span>
                <button 
                  onClick={handleCompleteTour}
                  className="text-slate-400 hover:text-slate-600 text-sm font-semibold transition-colors cursor-pointer"
                >
                  Skip Tour
                </button>
              </div>
              
              <div>
                <h3 className="text-lg font-extrabold text-slate-900">
                  {TOUR_STEPS[tourStep].title}
                </h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                  {TOUR_STEPS[tourStep].description}
                </p>
              </div>
              
              <div className="rounded-xl bg-[#fcf8ff] border border-[#f3e8ff] p-3 text-left">
                <p className="text-xs font-bold text-[#6b21a8] flex items-center gap-1.5">
                  <span>✨</span> Did you know?
                </p>
                <p className="mt-1 text-xs text-[#7e22ce] leading-relaxed">
                  {TOUR_STEPS[tourStep].funFact}
                </p>
              </div>
              
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <div className="flex gap-1">
                  {TOUR_STEPS.map((_, i) => (
                    <span 
                      key={i} 
                      className={cn(
                        "size-2 rounded-full transition-all",
                        i === tourStep ? "bg-[var(--brand-pink)] w-4" : "bg-slate-200"
                      )}
                    />
                  ))}
                </div>
                
                <div className="flex gap-2">
                  {tourStep > 0 && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handlePrevStep}
                      className="border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold"
                    >
                      Back
                    </Button>
                  )}
                  <Button 
                    size="sm" 
                    onClick={handleNextStep}
                    className="bg-[var(--brand-pink)] text-white hover:bg-[var(--brand-magenta)] font-semibold"
                  >
                    {tourStep === TOUR_STEPS.length - 1 ? "Finish" : "Next"}
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
    </div>
  );
}
