import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, FileImage, HandHeart, Medal } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";

import { AppPageError, AppPageLoading } from "@/components/app-page-state";
import { NOTE_CATEGORY_LABELS } from "@/components/note-card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { api, type CircleNoteDetail, type CreateNoteResult } from "@/lib/api";

function initials(name: string) { return name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase(); }

export function NoteDetailPage() {
  const { circleId = "", noteId = "" } = useParams();
  const location = useLocation();
  const created = (location.state as { created?: CreateNoteResult } | null)?.created;
  const queryClient = useQueryClient();
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const noteQuery = useQuery({ queryKey: ["circle-note", circleId, noteId], queryFn: () => api.getNote(circleId, noteId), enabled: Boolean(circleId && noteId), retry: false });
  const imageQuery = useQuery({ queryKey: ["circle-note-image", circleId, noteId], queryFn: () => api.getNoteImage(noteQuery.data!.image_url!), enabled: Boolean(noteQuery.data?.image_url), retry: false });
  useEffect(() => { if (!imageQuery.data) { setImageUrl(null); return; } const url = URL.createObjectURL(imageQuery.data); setImageUrl(url); return () => URL.revokeObjectURL(url); }, [imageQuery.data]);
  const helpfulMutation = useMutation({
    mutationFn: (helpful: boolean) => api.setNoteHelpful(circleId, noteId, helpful),
    onSuccess: (result) => {
      queryClient.setQueryData<CircleNoteDetail>(["circle-note", circleId, noteId], (current) => current ? { ...current, helpful_count: result.helpful_count, helpful_by_me: result.helpful_by_me } : current);
      void queryClient.invalidateQueries({ queryKey: ["circle-notes", circleId] });
    },
  });
  if (noteQuery.isPending) return <AppPageLoading />;
  if (noteQuery.isError) return <AppPageError onRetry={() => void noteQuery.refetch()} />;
  const note = noteQuery.data;

  return (
    <div className="w-full space-y-4">
      <Breadcrumb><BreadcrumbList className="text-xs"><BreadcrumbItem><BreadcrumbLink asChild><Link to={`/app/study-circle/${circleId}/store`}>Circle Store</Link></BreadcrumbLink></BreadcrumbItem><BreadcrumbSeparator /><BreadcrumbItem><BreadcrumbPage>Note</BreadcrumbPage></BreadcrumbItem></BreadcrumbList></Breadcrumb>
      {created ? <Alert className="border-0 bg-[#eef3ff]"><Medal className="text-[var(--brand-blue)]" /><AlertTitle>Note shared · +{created.points_added} points</AlertTitle><AlertDescription>{created.current_rank < created.previous_rank ? `You moved from rank #${created.previous_rank} to #${created.current_rank}.` : `You remain at rank #${created.current_rank}.`}</AlertDescription></Alert> : null}
      <Card className="border-0 shadow-sm"><CardContent className="p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><Badge variant="secondary" className="bg-[#eef3ff] text-[var(--brand-dark-blue)]">{NOTE_CATEGORY_LABELS[note.category]}</Badge>{note.content_type === "image" ? <Badge variant="outline"><FileImage className="size-3" /> Image note</Badge> : null}</div><h1 className="mt-3 text-2xl font-bold leading-tight">{note.title}</h1></div>
          <Button variant={note.helpful_by_me ? "default" : "outline"} className={note.helpful_by_me ? "bg-[var(--brand-pink)] text-white hover:bg-[var(--brand-magenta)]" : ""} disabled={note.is_own_note || helpfulMutation.isPending} aria-pressed={note.helpful_by_me} title={note.is_own_note ? "You cannot mark your own note as helpful" : undefined} onClick={() => helpfulMutation.mutate(!note.helpful_by_me)}><HandHeart className="size-4" /> Helpful · {note.helpful_count}</Button>
        </div>
        <div className="mt-5 flex items-center gap-3"><Avatar className="size-9"><AvatarFallback className="bg-[var(--brand-dark-blue)] text-xs font-bold text-white">{initials(note.author.display_name)}</AvatarFallback></Avatar><div><p className="text-sm font-semibold">{note.author.display_name}{note.is_own_note ? " (You)" : ""}</p><p className="text-xs text-muted-foreground">{new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(note.created_at))}</p></div></div>
        <Separator className="my-6" />
        {note.content_type === "text" ? <p className="max-w-4xl whitespace-pre-wrap text-[15px] leading-7">{note.text_content}</p> : imageQuery.isPending ? <div className="flex min-h-64 items-center justify-center rounded-lg bg-[#f7f8fc] text-sm text-muted-foreground">Loading image...</div> : imageUrl ? <div className="rounded-lg bg-[#f7f8fc] p-3"><img src={imageUrl} alt={note.title} className="max-h-[65vh] w-full object-contain" /></div> : <Alert variant="destructive"><AlertTitle>Image could not load</AlertTitle><AlertDescription>Try refreshing this note.</AlertDescription></Alert>}
      </CardContent></Card>
      <Button variant="outline" asChild><Link to={`/app/study-circle/${circleId}/store`}><ArrowLeft className="size-4" /> Back to Circle Store</Link></Button>
    </div>
  );
}
