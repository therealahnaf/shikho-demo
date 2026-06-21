import { FileImage, FileText, HandHeart } from "lucide-react";
import { Link } from "react-router-dom";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { CircleNote, NoteCategory } from "@/lib/api";

export const NOTE_CATEGORY_LABELS: Record<NoteCategory, string> = {
  chapter_1: "Chapter 1",
  chapter_2: "Chapter 2",
  formulas: "Formulas",
  revision_notes: "Revision notes",
  important_questions: "Important questions",
};

function initials(name: string) {
  return name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

export function NoteCard({ note, circleId }: { note: CircleNote; circleId: string }) {
  const TypeIcon = note.content_type === "image" ? FileImage : FileText;
  return (
    <Link className="group block h-full rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" to={`/app/study-circle/${circleId}/store/${note.id}`}>
      <Card className="h-full border-0 shadow-sm transition-shadow group-hover:shadow-md">
        <CardContent className="flex h-full flex-col p-4">
          <div className="flex items-start justify-between gap-3">
            <Badge variant="secondary" className="bg-[#eef3ff] text-[var(--brand-dark-blue)] hover:bg-[#eef3ff]">{NOTE_CATEGORY_LABELS[note.category]}</Badge>
            <TypeIcon className="size-4 text-[var(--brand-pink)]" aria-label={`${note.content_type} note`} />
          </div>
          <h2 className="mt-4 line-clamp-2 text-base font-bold leading-snug group-hover:text-[var(--brand-dark-blue)]">{note.title}</h2>
          <div className="mt-auto flex items-end justify-between gap-3 pt-5">
            <div className="flex min-w-0 items-center gap-2">
              <Avatar className="size-7"><AvatarFallback className="bg-[var(--brand-dark-blue)] text-[9px] font-bold text-white">{initials(note.author.display_name)}</AvatarFallback></Avatar>
              <div className="min-w-0"><p className="truncate text-xs font-semibold">{note.author.display_name}</p><p className="text-[10px] text-muted-foreground">{new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(note.created_at))}</p></div>
            </div>
            <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-muted-foreground"><HandHeart className="size-3.5" /> {note.helpful_count}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
