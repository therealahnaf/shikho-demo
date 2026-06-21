import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Crown, Plus, ShieldAlert, Trash2 } from "lucide-react";
import { useEffect } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { Link, useNavigate, useParams } from "react-router-dom";
import { z } from "zod";

import { AppPageLoading } from "@/components/app-page-state";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ApiError, api } from "@/lib/api";

const schema = z.object({
  title: z.string().trim().min(5, "Enter at least 5 characters.").max(80, "Keep title within 80 characters."),
  mentor_pick_note_id: z.string().nullable(),
  checkpoints: z.array(
    z.object({
      topic_key: z.string().min(1, "Topic is required."),
      activity_type: z.enum(["review", "lesson", "quiz", "challenge"]),
    })
  ).min(3, "Add at least 3 checkpoints.").max(5, "Keep within 5 checkpoints."),
});

type Values = z.infer<typeof schema>;

const ACTIVITY_TYPE_LABELS: Record<string, string> = {
  review: "Review",
  lesson: "Lesson",
  quiz: "Quiz",
  challenge: "Challenge",
};

export function MentorWorkspacePage() {
  const { circleId = "" } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: workspace, isPending, isError, error } = useQuery({
    queryKey: ["mentor-workspace", circleId],
    queryFn: () => api.getMentorWorkspace(circleId),
    retry: false,
  });

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      mentor_pick_note_id: null,
      checkpoints: [
        { topic_key: "algebra_basics", activity_type: "review" },
        { topic_key: "linear_equations", activity_type: "lesson" },
        { topic_key: "linear_equations", activity_type: "quiz" },
      ],
    },
  });

  const { fields, append, remove, move } = useFieldArray({
    control: form.control,
    name: "checkpoints",
  });

  // Prepopulate form if a planned roadmap already exists
  useEffect(() => {
    if (workspace?.planned_roadmap) {
      form.reset({
        title: workspace.planned_roadmap.title,
        mentor_pick_note_id: workspace.planned_roadmap.mentor_pick_note_id,
        checkpoints: workspace.planned_roadmap.checkpoints,
      });
    }
  }, [workspace, form]);

  const mutation = useMutation({
    mutationFn: (values: Values) => {
      return api.publishNextRoadmap(circleId, {
        title: values.title.trim(),
        mentor_pick_note_id: values.mentor_pick_note_id,
        checkpoints: values.checkpoints,
      }, crypto.randomUUID());
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["circle-home", circleId] }),
        queryClient.invalidateQueries({ queryKey: ["mentor-workspace", circleId] }),
      ]);
      navigate(`/app/study-circle/${circleId}`);
    },
  });

  if (isPending) return <AppPageLoading />;

  // Server-backed access gate (403 = User is not the crowned mentor)
  if (isError) {
    const is403 = error instanceof ApiError && error.status === 403;
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
        <div className="size-16 rounded-full bg-[#fef2f2] flex items-center justify-center text-red-500 mb-4 animate-bounce">
          <ShieldAlert className="size-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-800">
          {is403 ? "Access Denied" : "Something went wrong"}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground max-w-md">
          {is403
            ? "Only the crowned Mentor of the Week can access this workspace to publish next week's learning roadmap."
            : error.message}
        </p>
        <Button className="mt-6 bg-[var(--brand-dark-blue)] hover:bg-[var(--brand-blue)]" asChild>
          <Link to={`/app/study-circle/${circleId}`}>Return to Dashboard</Link>
        </Button>
      </div>
    );
  }

  const handlePreview = () => {
    const isValid = form.trigger();
    isValid.then((valid) => {
      if (valid) {
        const values = form.getValues();
        navigate(`/app/study-circle/${circleId}/mentor/preview`, {
          state: {
            title: values.title,
            mentor_pick_note_id: values.mentor_pick_note_id,
            checkpoints: values.checkpoints,
            workspace,
          },
        });
      }
    });
  };

  const serverError = mutation.error instanceof ApiError ? mutation.error.message : mutation.error?.message;

  return (
    <div className="w-full space-y-4">
      <Breadcrumb>
        <BreadcrumbList className="text-xs">
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to={`/app/study-circle/${circleId}`}>Dashboard</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Mentor Workspace</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Crown className="size-6 text-[var(--brand-yellow)] fill-[var(--brand-yellow)]" /> Mentor Workspace
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Plan, reorder, and publish the communal roadmap for next week.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="md:col-span-2 space-y-4">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base text-[var(--brand-dark-blue)]">Weekly Roadmap Builder</CardTitle>
              <CardDescription>
                Compose a custom roadmap containing 3 to 5 checkpoints based on Class 10 syllabus.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form className="space-y-6" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
                  {serverError ? (
                    <Alert variant="destructive">
                      <AlertTitle>Could not publish roadmap</AlertTitle>
                      <AlertDescription>{serverError}</AlertDescription>
                    </Alert>
                  ) : null}

                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Roadmap Title</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Algebra Momentum Week, Trigonometry Sprint" {...field} />
                        </FormControl>
                        <FormDescription>
                          A motivating title for the next learning cycle.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="space-y-4">
                    <div>
                      <FormLabel>Roadmap Checkpoints</FormLabel>
                      <FormDescription>
                        Predefined topics and activities in the order members will study them.
                      </FormDescription>
                    </div>

                    <div className="space-y-3">
                      {fields.map((item, index) => (
                        <div
                          key={item.id}
                          className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-[#f8fafc]"
                        >
                          <span className="grid size-6 place-items-center rounded-full bg-[var(--brand-dark-blue)] text-white text-xs font-bold">
                            {index + 1}
                          </span>

                          <div className="grid grid-cols-2 gap-2 flex-1">
                            <FormField
                              control={form.control}
                              name={`checkpoints.${index}.topic_key`}
                              render={({ field }) => (
                                <FormItem className="space-y-0">
                                  <Select value={field.value} onValueChange={field.onChange}>
                                    <FormControl>
                                      <SelectTrigger className="bg-white">
                                        <SelectValue placeholder="Select topic" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {workspace.topics.map((topic: any) => (
                                        <SelectItem key={topic.key} value={topic.key}>
                                          {topic.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name={`checkpoints.${index}.activity_type`}
                              render={({ field }) => (
                                <FormItem className="space-y-0">
                                  <Select value={field.value} onValueChange={field.onChange}>
                                    <FormControl>
                                      <SelectTrigger className="bg-white">
                                        <SelectValue placeholder="Select format" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {workspace.activity_types.map((type: string) => (
                                        <SelectItem key={type} value={type}>
                                          {ACTIVITY_TYPE_LABELS[type]}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </FormItem>
                              )}
                            />
                          </div>

                          <div className="flex gap-1">
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              disabled={index === 0}
                              onClick={() => move(index, index - 1)}
                              aria-label={`Move checkpoint ${index + 1} up`}
                            >
                              <ArrowUp className="size-4 text-muted-foreground" />
                            </Button>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              disabled={index === fields.length - 1}
                              onClick={() => move(index, index + 1)}
                              aria-label={`Move checkpoint ${index + 1} down`}
                            >
                              <ArrowDown className="size-4 text-muted-foreground" />
                            </Button>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="text-red-500 hover:text-red-600 hover:bg-red-50"
                              disabled={fields.length <= 3}
                              onClick={() => remove(index)}
                              aria-label={`Delete checkpoint ${index + 1}`}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {fields.length < 5 ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full border-dashed"
                        onClick={() => append({ topic_key: "algebra_basics", activity_type: "review" })}
                      >
                        <Plus className="mr-1 size-4" /> Add Checkpoint
                      </Button>
                    ) : null}
                  </div>

                  <FormField
                    control={form.control}
                    name="mentor_pick_note_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mentor&apos;s Pick Note</FormLabel>
                        <Select
                          value={field.value ?? ""}
                          onValueChange={(val) => field.onChange(val || null)}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a helpful resource for the circle..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="">(None)</SelectItem>
                            {workspace.notes.map((note: any) => (
                              <SelectItem key={note.id} value={note.id}>
                                {note.title} (by {note.author_name}) · {note.helpful_count} helpful votes
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Feature one highly helpful note in the Store to highlight peer contributions.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={handlePreview}>
                      Preview Roadmap
                    </Button>
                    <Button
                      disabled={mutation.isPending}
                      className="bg-[var(--brand-pink)] text-white hover:bg-[var(--brand-magenta)]"
                    >
                      {mutation.isPending ? "Publishing..." : "Publish Roadmap"}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className="border-0 shadow-sm bg-[#fafbfe]">
            <CardHeader>
              <CardTitle className="text-sm font-bold text-[var(--brand-dark-blue)]">Mentor Term Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-100">
                <Crown className="size-7 text-[var(--brand-yellow)] fill-[var(--brand-yellow)]" />
                <div>
                  <p className="text-sm font-bold text-slate-800">Rank #1 Leader</p>
                  <p className="text-xs text-muted-foreground">Your leadership term has started</p>
                </div>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="text-muted-foreground">Term Started:</span>
                  <span className="font-semibold text-slate-800">
                    {new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(
                      new Date(workspace.current_term.selected_at)
                    )}
                  </span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="text-muted-foreground">Leader Points:</span>
                  <span className="font-semibold text-slate-800">{workspace.current_term.final_points} pts</span>
                </div>
                <div className="flex justify-between pb-1">
                  <span className="text-muted-foreground">Cohort:</span>
                  <span className="font-semibold text-slate-800">Class 10 · Mathematics</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
