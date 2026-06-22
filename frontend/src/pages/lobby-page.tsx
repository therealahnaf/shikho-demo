import { useState } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Crown, Plus, PlusCircle, Trash2, UsersRound } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { AppPageHeader } from "@/components/app-page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { api, ApiError, CircleLeaderboardEntry } from "@/lib/api";
import shikhoBanner from "@/public/shikho-banner.png";
import shikhoCircleStore from "@/public/shikho-circle-store.png";
import shikhoMentor from "@/public/shikho-mentor.png";
import shikhoRoadmap from "@/public/shikho-roadmap.png";
import shikhoStreaks from "@/public/shikho-streaks.png";

type CreatorAction = "review" | "quiz" | "assignment" | "lab";

const CREATOR_ACTIONS: Array<{ value: CreatorAction; label: string }> = [
  { value: "review", label: "Review" },
  { value: "quiz", label: "Quiz" },
  { value: "assignment", label: "Assignment" },
  { value: "lab", label: "Lab" },
];

const COURSE_CHAPTERS = [
  { value: "real_numbers", label: "Real Numbers" },
  { value: "algebraic_expressions", label: "Algebraic Expressions" },
  { value: "linear_equations", label: "Linear Equations" },
  { value: "geometry", label: "Geometry" },
  { value: "trigonometry", label: "Trigonometry" },
];

export function LobbyPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  // Circles Leaderboard State
  const { data: circlesData, isLoading: circlesLoading } = useQuery({
    queryKey: ["circles"],
    queryFn: api.getCircles,
  });

  // Membership State
  const { data: membershipData, isLoading: membershipLoading } = useQuery({
    queryKey: ["membership"],
    queryFn: api.getMembership,
  });
  const membership = membershipData?.membership;

  // Dialog States
  const [selectedCircle, setSelectedCircle] = useState<CircleLeaderboardEntry | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Form states for creating circle
  const [newCircleName, setNewCircleName] = useState("");
  const [newCircleDesc, setNewCircleDesc] = useState("");
  const [createStep, setCreateStep] = useState<1 | 2>(1);
  const [chapterKey, setChapterKey] = useState("linear_equations");
  const [roadmapActions, setRoadmapActions] = useState<CreatorAction[]>(["review", "quiz"]);
  const [createError, setCreateError] = useState<string | null>(null);

  // Handle joining a circle
  const handleJoinCircle = async (circleId: string) => {
    setIsJoining(true);
    try {
      const res = await api.joinCircle(circleId);
      queryClient.invalidateQueries({ queryKey: ["membership"] });
      navigate(res.circle_home_path);
    } catch (err) {
      console.error(err);
    } finally {
      setIsJoining(false);
      setSelectedCircle(null);
    }
  };

  // Handle creating a circle
  const handleCreateCircleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCircleName.trim() || !newCircleDesc.trim()) return;
    if (createStep === 1) {
      setCreateStep(2);
      return;
    }
    setIsCreating(true);
    setCreateError(null);
    try {
      const res = await api.createCircle(
        newCircleName.trim(),
        newCircleDesc.trim(),
        chapterKey,
        roadmapActions,
      );
      queryClient.invalidateQueries({ queryKey: ["membership"] });
      navigate(res.circle_home_path);
    } catch (err) {
      setCreateError(err instanceof ApiError ? err.message : "Failed to create circle.");
    } finally {
      setIsCreating(false);
    }
  };

  if (circlesLoading || membershipLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-[var(--brand-dark-blue)] border-t-white" />
          <p className="mt-4 text-sm font-semibold text-slate-500">Loading circles...</p>
        </div>
      </div>
    );
  }

  const circles = circlesData?.circles ?? [];

  const topCircles = circles.slice(0, 3);
  const remainingCircles = circles.slice(3, 8);



  return (
    <div className="w-full space-y-4">
      <AppPageHeader
        title="StudyCircle"
        description="Compete individually. Progress together. Keep your circle alive."
        backTo="/app/home"
      />
      <div className="grid w-full gap-4 lg:grid-cols-[1.08fr_0.92fr] lg:items-stretch">
      {/* Controls Panel */}
      <div className="h-full">
        <Card
          className="relative h-full min-h-[560px] overflow-hidden border-0 bg-[#123894] bg-cover bg-right-top text-white shadow-sm lg:min-h-[620px]"
          style={{ backgroundImage: `url(${shikhoBanner})` }}
        >
          <div className="absolute inset-0 bg-[#071b52]/35" />
          <div className="relative z-10 flex h-full min-h-[560px] w-full flex-col justify-start p-6 lg:min-h-[620px] lg:p-8">
            <div className="w-full">
              <h2 className="max-w-[760px] text-4xl font-black leading-[1.04] tracking-tight [text-shadow:0_4px_18px_rgba(0,0,0,0.65)] xl:text-5xl">Stay ahead of the competition by moving forward together.</h2>
            </div>

            <div className="flex flex-1 items-center justify-center py-6">
              <div className="flex items-center gap-4">
                <Button className="bg-white font-semibold text-[var(--brand-dark-blue)] shadow-[0_4px_18px_rgba(0,0,0,0.65)] hover:bg-white" onClick={() => navigate("/app/study-circle/explore")}>
                  Explore circles <ArrowRight className="size-4" />
                </Button>
                <Separator orientation="vertical" className="h-8 bg-white/70" />
                {membership ? (
                  <Button className="bg-[var(--brand-pink)] font-semibold text-white shadow-[0_4px_18px_rgba(0,0,0,0.65)] hover:bg-[var(--brand-magenta)]" onClick={() => navigate(`/app/study-circle/${membership.circle_id}`)}>Go to my circle</Button>
                ) : (
                  <Button className="bg-[var(--brand-pink)] font-semibold text-white shadow-[0_4px_18px_rgba(0,0,0,0.65)] hover:bg-[var(--brand-magenta)]" onClick={() => setIsCreateOpen(true)}><PlusCircle className="size-4" /> Create circle</Button>
                )}
              </div>
            </div>

            <div className="mt-auto flex w-full flex-wrap gap-2">
              <Badge className="border-0 bg-[var(--brand-pink)] px-3 py-1 text-white shadow-lg hover:bg-[var(--brand-pink)]">A new way to stay ahead</Badge>
              {["Mathematics", "Physics", "Chemistry"].map((subject) => <Badge key={subject} variant="outline" className="border-white bg-white/90 px-3 py-1 text-[var(--brand-dark-blue)] shadow-md">{subject}</Badge>)}
            </div>
          </div>
        </Card>

      </div>

      {/* Interactive Constellation Leaderboard */}
      <div className="h-full">
        <Card className="flex h-full flex-col overflow-hidden border-0 bg-white shadow-sm">
          <CardHeader className="flex-row items-start justify-between space-y-0 pb-2">
            <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--brand-pink)]">Mathematics subject area</p><CardTitle className="mt-1 text-2xl">Circles leaderboard</CardTitle><CardDescription className="mt-1 leading-5">Rankings use the shared points earned by circles in the same subject.</CardDescription></div>
            <Select defaultValue="mathematics"><SelectTrigger className="w-[135px] shadow-none"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="mathematics">Mathematics</SelectItem><SelectItem value="physics">Physics</SelectItem><SelectItem value="chemistry">Chemistry</SelectItem></SelectContent></Select>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col space-y-4 p-4 pt-2">
            {circles.length === 0 ? <div className="flex min-h-72 items-center justify-center text-sm font-medium text-muted-foreground">No circles found in this subject.</div> : <>
              <div className="grid grid-cols-3 items-end gap-2 border-b border-[#e5e9f2] pb-4">
                {[topCircles[1], topCircles[0], topCircles[2]].map((circle, podiumIndex) => circle ? <button key={circle.id} type="button" onClick={() => setSelectedCircle(circle)} className={`rounded-xl p-3 text-center hover:bg-[#F2F5FC] ${podiumIndex === 1 ? "bg-[#F2F5FC]" : ""}`}>
                  <div className={`mx-auto flex items-center justify-center rounded-full font-black text-white ${podiumIndex === 1 ? "size-16 bg-[var(--brand-pink)] text-2xl" : "size-12 bg-[var(--brand-dark-blue)] text-lg"}`}>{circle.name.slice(0, 1).toUpperCase()}</div>
                  <span className={`mt-2 block truncate text-sm font-bold ${podiumIndex === 1 ? "text-[var(--brand-pink)]" : ""}`}>{circle.name}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">{circle.points.toLocaleString()} pts</span>
                  <Badge className={`mt-2 ${podiumIndex === 1 ? "bg-[var(--brand-yellow)] text-black" : "bg-[#E8EDF8] text-[var(--brand-dark-blue)]"}`}>#{podiumIndex === 0 ? 2 : podiumIndex === 1 ? 1 : 3}</Badge>
                </button> : <div key={podiumIndex} />)}
              </div>
              <div className="overflow-hidden rounded-lg bg-[#f8f9fc]">
                <Table><TableBody>{remainingCircles.map((circle, index) => <TableRow key={circle.id} className="cursor-pointer border-b border-[#e5e9f2] last:border-0" onClick={() => setSelectedCircle(circle)}><TableCell className="w-10 font-bold">{index + 4}</TableCell><TableCell><div className="flex items-center gap-2"><div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--brand-dark-blue)] text-xs font-bold text-white">{circle.name.slice(0, 1).toUpperCase()}</div><span className="truncate font-medium">{circle.name}</span></div></TableCell><TableCell className="text-right text-muted-foreground">{circle.points.toLocaleString()} pts</TableCell><TableCell className="w-8">{index % 3 === 0 ? <ArrowUp className="size-4 text-green-600" /> : index % 3 === 1 ? <ArrowDown className="size-4 text-[var(--brand-pink)]" /> : <span className="text-muted-foreground">—</span>}</TableCell></TableRow>)}</TableBody></Table>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-[#F2F5FC] px-3 py-2 text-xs"><span className="flex items-center gap-2 text-muted-foreground"><UsersRound className="size-4 text-[var(--brand-dark-blue)]" /> New rankings every week</span><Button variant="link" className="h-auto p-0 text-xs" onClick={() => navigate("/app/study-circle/explore")}>View all circles <ArrowRight className="size-3" /></Button></div>
            </>}
          </CardContent>
        </Card>
      </div>
      </div>

      <section className="space-y-5 pt-2" aria-labelledby="how-circles-work">
        <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--brand-pink)]">Built for shared momentum</p>
            <h2 id="how-circles-work" className="mt-2 text-3xl font-black tracking-tight text-[var(--brand-dark-blue)]">How circles keep you ahead</h2>
          </div>
          <p className="max-w-3xl text-base leading-7 text-muted-foreground">A StudyCircle turns competition into a team advantage. Join up to nine students in your subject, work toward the same goals, and build a circle score that proves how consistently your group is moving forward.</p>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <Card className="overflow-hidden border-0 bg-white shadow-sm">
            <div className="grid min-h-[300px] sm:grid-cols-[0.9fr_1.1fr]">
              <div className="flex flex-col justify-center p-6">
                <Badge className="w-fit bg-[var(--brand-dark-blue)] text-white hover:bg-[var(--brand-dark-blue)]">01 · Follow the week</Badge>
                <CardTitle className="mt-4 text-2xl leading-tight">A roadmap that matches what you are learning now</CardTitle>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">Every circle receives a focused weekly roadmap built from the current syllabus. Everyone can see the same destination, the next activity, and how far the group has progressed—so nobody has to guess what to study next.</p>
              </div>
              <div className="bg-[#F2F5FC] p-4"><img src={shikhoRoadmap} alt="Students following a shared weekly learning roadmap" className="size-full object-contain" /></div>
            </div>
          </Card>

          <Card className="overflow-hidden border-0 bg-white shadow-sm">
            <div className="grid min-h-[300px] sm:grid-cols-[0.9fr_1.1fr]">
              <div className="flex flex-col justify-center p-6">
                <Badge className="w-fit bg-[var(--brand-pink)] text-white hover:bg-[var(--brand-pink)]">02 · Earn the lead</Badge>
                <CardTitle className="mt-4 text-2xl leading-tight">First place becomes next week’s Mentor</CardTitle>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">Leadership is earned through contribution. The student who finishes first on the previous week’s member leaderboard becomes the next Mentor and selects the syllabus-based roadmap the circle will tackle together.</p>
              </div>
              <div className="bg-[#F2F5FC] p-4"><img src={shikhoMentor} alt="A student Mentor guiding the circle through its roadmap" className="size-full object-contain" /></div>
            </div>
          </Card>

          <Card className="overflow-hidden border-0 bg-white shadow-sm">
            <div className="grid min-h-[300px] sm:grid-cols-[0.9fr_1.1fr]">
              <div className="flex flex-col justify-center p-6">
                <Badge className="w-fit bg-[var(--brand-yellow)] text-black hover:bg-[var(--brand-yellow)]">03 · Win together</Badge>
                <CardTitle className="mt-4 text-2xl leading-tight">Turn daily effort into circle power</CardTitle>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">Daily quests create quick wins while monthly missions reward sustained teamwork. Every completed goal adds to the circle’s shared points. At least one member must complete an activity each day to protect the streak—if it reaches zero, the circle dies.</p>
              </div>
              <div className="bg-[#F2F5FC] p-4"><img src={shikhoStreaks} alt="Circle members combining daily activity to maintain their streak" className="size-full object-contain" /></div>
            </div>
          </Card>

          <Card className="overflow-hidden border-0 bg-white shadow-sm">
            <div className="grid min-h-[300px] sm:grid-cols-[0.9fr_1.1fr]">
              <div className="flex flex-col justify-center p-6">
                <Badge className="w-fit bg-[var(--brand-blue)] text-white hover:bg-[var(--brand-blue)]">04 · Build the library</Badge>
                <CardTitle className="mt-4 text-2xl leading-tight">Your circle’s best resources, in one place</CardTitle>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">The Circle Store is a shared home for notes and study resources. Every member can upload and view material, then upvote or downvote it so the most useful explanations rise to the top for the whole circle.</p>
              </div>
              <div className="bg-[#F2F5FC] p-4"><img src={shikhoCircleStore} alt="Students sharing and rating resources in the Circle Store" className="size-full object-contain" /></div>
            </div>
          </Card>
        </div>

        <Card className="border-0 bg-[var(--brand-dark-blue)] text-white shadow-sm">
          <CardContent className="grid gap-5 p-6 md:grid-cols-[1fr_auto] md:items-center">
            <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--brand-yellow)]">Your subject. Your league.</p><h3 className="mt-2 text-2xl font-black">Compete against circles learning the same subject</h3><p className="mt-2 max-w-3xl text-sm leading-6 text-white">Mathematics circles compete with Mathematics circles, Physics with Physics, and Chemistry with Chemistry. Each subject has its own leaderboard, making every ranking relevant and every point meaningful.</p></div>
            <div className="flex flex-wrap gap-2">{["Mathematics", "Physics", "Chemistry"].map((subject) => <Badge key={subject} className="bg-white text-[var(--brand-dark-blue)] hover:bg-white">{subject}</Badge>)}</div>
          </CardContent>
        </Card>
      </section>

      {/* Dialog: Confirm Join */}
      <Dialog open={selectedCircle !== null} onOpenChange={(open) => { if (!open) setSelectedCircle(null); }}>
        {selectedCircle && (
          <DialogContent className="bg-white border-slate-200 text-slate-900 rounded-2xl p-6 max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold tracking-tight text-slate-900">
                Join {selectedCircle.name}
              </DialogTitle>
              <DialogDescription className="text-slate-500 mt-2">
                Are you sure you want to join this StudyCircle? You'll collaborate on roadmaps, daily quests, and monthly missions.
              </DialogDescription>
            </DialogHeader>

            <div className="my-5 p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold text-slate-500">Points</span>
                <span className="text-sm font-bold text-slate-900">{selectedCircle.points} pts</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold text-slate-500">Members</span>
                <span className="text-sm font-bold text-slate-900">{selectedCircle.member_count} / 10</span>
              </div>
              <p className="text-sm text-slate-700 mt-2 italic">
                "{selectedCircle.description}"
              </p>
            </div>

            <DialogFooter className="flex gap-2 sm:justify-end">
              <Button variant="outline" onClick={() => setSelectedCircle(null)} className="border-slate-200 text-slate-700 hover:bg-slate-50">
                Cancel
              </Button>
              <Button
                onClick={() => handleJoinCircle(selectedCircle.id)}
                disabled={isJoining || selectedCircle.member_count >= 10 || !!membership}
                className="bg-[var(--brand-dark-blue)] font-semibold text-white hover:bg-[var(--brand-blue)]"
              >
                {isJoining ? "Joining..." : selectedCircle.member_count >= 10 ? "Circle Full" : membership ? "Already in a Circle" : "Confirm Join"}
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>

      {/* Dialog: Create Circle */}
      <Dialog open={isCreateOpen} onOpenChange={(open) => { setIsCreateOpen(open); if (!open) setCreateStep(1); }}>
        <DialogContent className="max-w-lg rounded-2xl border-slate-200 bg-white p-6 text-slate-900">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold tracking-tight text-slate-900">
              {createStep === 1 ? "Create a new StudyCircle" : "Build your first weekly roadmap"}
            </DialogTitle>
            <DialogDescription className="text-slate-500 mt-2">
              {createStep === 1
                ? "Start a Class 10 Mathematics circle. You will become its first member and Mentor of the Week."
                : "As the founding Mentor, choose the chapter and activities your circle will complete this week."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateCircleSubmit} className="space-y-4 mt-4">
            {createStep === 1 ? <>
            <div className="space-y-2">
              <Label htmlFor="circle-name" className="text-sm font-semibold text-slate-700">
                Circle Name
              </Label>
              <Input
                id="circle-name"
                required
                placeholder="e.g. Math Mavericks"
                value={newCircleName}
                onChange={(e) => setNewCircleName(e.target.value)}
                className="border-slate-200 focus:border-[var(--brand-dark-blue)] focus:ring-[var(--brand-dark-blue)]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="circle-desc" className="text-sm font-semibold text-slate-700">
                Description
              </Label>
              <textarea
                id="circle-desc"
                required
                placeholder="e.g. Master trigonometry and algebra together."
                value={newCircleDesc}
                onChange={(e) => setNewCircleDesc(e.target.value)}
                className="min-h-[80px] w-full rounded-md border border-slate-200 p-3 text-sm focus:border-[var(--brand-dark-blue)] focus:outline-none focus:ring-[var(--brand-dark-blue)]"
              />
            </div>
            </> : <>
              <div className="flex items-start gap-3 rounded-xl bg-[#fff6dc] p-4 text-[#624500]">
                <Crown className="mt-0.5 size-5 shrink-0 text-[var(--brand-yellow)]" />
                <div><p className="text-sm font-bold">You are this week’s Mentor</p><p className="mt-1 text-xs leading-5">The founding Mentor sets the circle’s first syllabus roadmap. Future Mentors are selected from the previous week’s #1 student.</p></div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="roadmap-chapter" className="text-sm font-semibold text-slate-700">Course chapter</Label>
                <Select value={chapterKey} onValueChange={setChapterKey}>
                  <SelectTrigger id="roadmap-chapter" className="bg-white"><SelectValue placeholder="Choose a chapter" /></SelectTrigger>
                  <SelectContent>{COURSE_CHAPTERS.map((chapter) => <SelectItem key={chapter.value} value={chapter.value}>{chapter.label}</SelectItem>)}</SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Static Class 10 Mathematics chapters for the current product preview.</p>
              </div>

              <div className="space-y-3">
                <div><Label className="text-sm font-semibold text-slate-700">Roadmap actions</Label><p className="mt-1 text-xs text-muted-foreground">Members complete these actions in order.</p></div>
                {roadmapActions.map((action, index) => (
                  <div key={`${index}-${action}`} className="flex items-center gap-2">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[var(--brand-dark-blue)] text-xs font-bold text-white">{index + 1}</span>
                    <Select value={action} onValueChange={(value: CreatorAction) => setRoadmapActions((current) => current.map((item, itemIndex) => itemIndex === index ? value : item))}>
                      <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                      <SelectContent>{CREATOR_ACTIONS.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent>
                    </Select>
                    <Button type="button" variant="ghost" size="icon" disabled={roadmapActions.length === 1} onClick={() => setRoadmapActions((current) => current.filter((_, itemIndex) => itemIndex !== index))} aria-label={`Remove action ${index + 1}`}><Trash2 className="size-4 text-red-500" /></Button>
                  </div>
                ))}
                {roadmapActions.length < 5 ? <Button type="button" variant="outline" className="w-full border-dashed" onClick={() => setRoadmapActions((current) => [...current, "review"])}><Plus className="size-4" /> Add action</Button> : null}
              </div>
            </>}

            {createError && (
              <Alert variant="destructive" className="mt-2">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{createError}</AlertDescription>
              </Alert>
            )}

            <DialogFooter className="flex gap-2 sm:justify-end pt-4">
              {createStep === 1 ? <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)} className="border-slate-200 text-slate-700 hover:bg-slate-50">Cancel</Button> : <Button type="button" variant="outline" onClick={() => setCreateStep(1)}><ArrowLeft className="size-4" /> Back</Button>}
              <Button
                type="submit"
                disabled={isCreating}
                className="bg-[var(--brand-dark-blue)] font-semibold text-white hover:bg-[var(--brand-blue)]"
              >
                {isCreating ? "Creating..." : createStep === 1 ? <>Continue <ArrowRight className="size-4" /></> : "Create circle and publish roadmap"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
