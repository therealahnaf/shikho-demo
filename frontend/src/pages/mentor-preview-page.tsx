import { Award, Check, Crown, BookOpen, Map } from "lucide-react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";

import { AppPageHeader } from "@/components/app-page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const TOPIC_NAMES: Record<string, string> = {
  algebra_basics: "Algebra Basics",
  linear_equations: "Linear Equations",
  geometry: "Geometry",
  trigonometry: "Trigonometry",
  revision: "Revision"
};

function generateCheckpointTitle(topicKey: string, activityType: string): string {
  const topicName = TOPIC_NAMES[topicKey] || topicKey.replace("_", " ").replace(/\b\w/g, c => c.toUpperCase());
  if (activityType === "review") {
    return `Review ${topicName}`;
  } else if (activityType === "lesson") {
    return `Explore ${topicName}`;
  } else if (activityType === "quiz") {
    if (topicKey === "linear_equations") {
      return "Practice Quiz";
    }
    return `Practice Quiz: ${topicName}`;
  } else if (activityType === "challenge") {
    if (topicKey === "weekly_challenge" || topicKey === "revision") {
      return "Weekly Algebra Challenge";
    }
    return `Weekly ${topicName} Challenge`;
  }
  return `${activityType.charAt(0).toUpperCase() + activityType.slice(1)} ${topicName}`;
}

export function MentorPreviewPage() {
  const { circleId = "" } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const data = location.state as {
    title: string;
    mentor_pick_note_id: string | null;
    checkpoints: Array<{ topic_key: string; activity_type: "review" | "lesson" | "quiz" | "challenge" }>;
    workspace: any;
  } | null;

  if (!data) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
        <h2 className="text-xl font-bold text-slate-800">No Preview Data</h2>
        <p className="mt-2 text-sm text-muted-foreground">Go back to the workspace to design your roadmap first.</p>
        <Button className="mt-6 bg-[var(--brand-dark-blue)]" asChild>
          <Link to={`/app/study-circle/${circleId}/mentor`}>Go to Workspace</Link>
        </Button>
      </div>
    );
  }

  const selectedNote = data.workspace?.notes.find((n: any) => n.id === data.mentor_pick_note_id);

  return (
    <div className="w-full space-y-4">
      <AppPageHeader title="Roadmap Preview" description="Review how your published roadmap will look to other circle members." backTo={`/app/study-circle/${circleId}/mentor`} />

      <div className="grid gap-4 md:grid-cols-3">
        <div className="md:col-span-2 space-y-4">
          <div className="p-4 bg-[var(--brand-dark-blue)] text-white rounded-2xl shadow-sm">
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#dce4ff]">Weekly Roadmap Title</span>
            <h2 className="text-xl font-bold mt-1">{data.title}</h2>
          </div>

          <Card className="border-0 shadow-sm">
            <CardHeader className="p-4">
              <CardTitle className="flex items-center gap-2 text-sm text-[var(--brand-dark-blue)]">
                <Map className="size-4" /> {data.checkpoints.length} Checkpoints Preview
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {data.checkpoints.map((checkpoint, index) => {
                const title = generateCheckpointTitle(checkpoint.topic_key, checkpoint.activity_type);
                const isFirst = index === 0;

                return (
                  <div key={index}>
                    <div className="grid gap-3 p-4 sm:grid-cols-[44px_minmax(0,1fr)_auto] sm:items-center">
                      <span className={cn(
                        "grid size-9 place-items-center rounded-full text-sm font-bold",
                        isFirst ? "bg-[var(--brand-pink)] text-white" : "bg-[#eef0f5] text-muted-foreground",
                      )}>
                        {isFirst ? <Check className="size-4" /> : index + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="font-semibold">{title}</h2>
                          <Badge variant="outline" className="capitalize">
                            {checkpoint.activity_type}
                          </Badge>
                          {isFirst ? <Badge className="bg-[var(--brand-pink)] text-white">Starts Here</Badge> : null}
                        </div>
                      </div>
                      <Button size="sm" variant="secondary" disabled className="disabled:opacity-100">
                        {isFirst ? "Available" : "Locked"}
                      </Button>
                    </div>
                    {index < data.checkpoints.length - 1 ? <Separator /> : null}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="border-0 shadow-sm bg-[#fffbeb] border-dashed border-[var(--brand-yellow)]">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-bold text-[#78350f] flex items-center gap-1.5">
                <Crown className="size-4 text-[var(--brand-yellow)] fill-[var(--brand-yellow)]" /> Mentor&apos;s Pick Highlight
              </CardTitle>
              <CardDescription className="text-xs text-[#92400e]">
                This note will be highlighted for all members to study.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-2">
              {selectedNote ? (
                <div className="p-3 bg-white rounded-xl border border-slate-100 space-y-2">
                  <span className="text-[10px] font-bold text-[#7e22ce] uppercase bg-[#faf5ff] border border-[#f3e8ff] px-1.5 py-0.5 rounded-full">
                    {selectedNote.category.replace("_", " ")}
                  </span>
                  <h4 className="text-sm font-bold text-slate-800">{selectedNote.title}</h4>
                  <div className="flex justify-between items-center text-xs text-muted-foreground pt-1">
                    <span>By {selectedNote.author_name}</span>
                    <span className="font-semibold text-[var(--brand-blue)] flex items-center gap-1">
                      <span>👍</span> {selectedNote.helpful_count} votes
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-4 text-center text-xs text-muted-foreground bg-white/50 rounded-xl border border-dashed border-slate-200">
                  No Mentor&apos;s Pick note selected.
                </div>
              )}
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}

function Badge({ className, children, variant }: { className?: string; children: React.ReactNode; variant?: "outline" | "secondary" }) {
  return (
    <span className={cn(
      "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
      variant === "outline" && "border border-slate-200 text-slate-900",
      variant === "secondary" && "border-transparent bg-slate-100 text-slate-900 hover:bg-slate-100/80",
      !variant && "border-transparent bg-[var(--brand-blue)] text-white",
      className
    )}>
      {children}
    </span>
  );
}
