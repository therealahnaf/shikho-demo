import { useQuery } from "@tanstack/react-query";
import { BookOpen, Plus } from "lucide-react";
import { Link, useParams, useSearchParams } from "react-router-dom";

import { AppPageError, AppPageLoading } from "@/components/app-page-state";
import { AppPageHeader, pageActionClassName } from "@/components/app-page-header";
import { NOTE_CATEGORY_LABELS, NoteCard } from "@/components/note-card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api, type NoteCategory } from "@/lib/api";

const categories = Object.keys(NOTE_CATEGORY_LABELS) as NoteCategory[];

export function CircleStorePage() {
  const { circleId = "" } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const rawCategory = searchParams.get("category");
  const category = categories.includes(rawCategory as NoteCategory) ? rawCategory as NoteCategory : undefined;
  const notesQuery = useQuery({ queryKey: ["circle-notes", circleId, category ?? "all"], queryFn: () => api.getNotes(circleId, category), enabled: Boolean(circleId), retry: false });
  
  const changeCategory = (value: string) => setSearchParams(value === "all" ? {} : { category: value });
  if (notesQuery.isPending) return <AppPageLoading />;
  if (notesQuery.isError) return <AppPageError onRetry={() => void notesQuery.refetch()} />;

  return (
    <div className="w-full space-y-4">
      <AppPageHeader title="Circle Store" description="Notes and study resources shared by your circle." backTo={`/app/study-circle/${circleId}`} actions={<Button asChild className={`${pageActionClassName} bg-[var(--brand-pink)] text-white hover:bg-[var(--brand-magenta)]`}><Link to={`/app/study-circle/${circleId}/store/new`}><Plus className="size-4" /> Add note</Link></Button>} />
      <div className="hidden overflow-x-auto md:block"><Tabs value={category ?? "all"} onValueChange={changeCategory}><TabsList className="h-10 bg-white shadow-sm"><TabsTrigger value="all">All notes</TabsTrigger>{categories.map((item) => <TabsTrigger key={item} value={item}>{NOTE_CATEGORY_LABELS[item]}</TabsTrigger>)}</TabsList></Tabs></div>
      <div className="md:hidden"><Select value={category ?? "all"} onValueChange={changeCategory}><SelectTrigger className="bg-white"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All notes</SelectItem>{categories.map((item) => <SelectItem key={item} value={item}>{NOTE_CATEGORY_LABELS[item]}</SelectItem>)}</SelectContent></Select></div>
      {notesQuery.data.notes.length ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">{notesQuery.data.notes.map((note) => <NoteCard key={note.id} note={note} circleId={circleId} />)}</div>
      ) : (
        <div className="rounded-xl bg-white px-6 py-14 text-center shadow-sm"><BookOpen className="mx-auto size-8 text-[var(--brand-blue)]" /><h2 className="mt-3 font-bold">No notes here yet</h2><p className="mt-1 text-sm text-muted-foreground">Share the first resource in this category.</p></div>
      )}
    </div>
  );
}
