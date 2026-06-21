import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileImage, FileText, ImagePlus, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Link, useNavigate, useParams } from "react-router-dom";
import { z } from "zod";

import { NOTE_CATEGORY_LABELS } from "@/components/note-card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ApiError, api, type NoteCategory } from "@/lib/api";

const categories = Object.keys(NOTE_CATEGORY_LABELS) as NoteCategory[];
const schema = z.object({
  title: z.string().trim().min(3, "Enter at least 3 characters.").max(120),
  category: z.enum(["chapter_1", "chapter_2", "formulas", "revision_notes", "important_questions"]),
  contentType: z.enum(["text", "image"]),
  textContent: z.string().optional(),
}).superRefine((value, context) => {
  if (value.contentType === "text" && (value.textContent?.trim().length ?? 0) < 20) context.addIssue({ code: "custom", path: ["textContent"], message: "Write at least 20 characters." });
  if (value.contentType === "text" && (value.textContent?.trim().length ?? 0) > 2000) context.addIssue({ code: "custom", path: ["textContent"], message: "Keep the note within 2000 characters." });
});
type Values = z.infer<typeof schema>;

export function NewNotePage() {
  const { circleId = "" } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [image, setImage] = useState<File | null>(null);
  const [imageError, setImageError] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const idempotencyKey = useRef(crypto.randomUUID());
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { title: "", category: "chapter_1", contentType: "text", textContent: "" } });
  const mode = form.watch("contentType");
  useEffect(() => { if (!image) { setPreviewUrl(null); return; } const url = URL.createObjectURL(image); setPreviewUrl(url); return () => URL.revokeObjectURL(url); }, [image]);

  const mutation = useMutation({
    mutationFn: (values: Values) => {
      if (values.contentType === "image" && !image) throw new Error("Choose an image.");
      const data = new FormData();
      data.set("title", values.title.trim()); data.set("category", values.category); data.set("content_type", values.contentType);
      if (values.contentType === "text") data.set("text_content", values.textContent?.trim() ?? "");
      if (values.contentType === "image" && image) data.set("image", image);
      return api.createNote(circleId, data, idempotencyKey.current);
    },
    onSuccess: async (result) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["circle-notes", circleId] }),
        queryClient.invalidateQueries({ queryKey: ["circle-home", circleId] }),
        queryClient.invalidateQueries({ queryKey: ["leaderboard", circleId] }),
        queryClient.invalidateQueries({ queryKey: ["activity-feed", circleId] }),
      ]);
      navigate(`/app/study-circle/${circleId}/store/${result.note.id}`, { state: { created: result } });
    },
  });

  function chooseImage(file: File | undefined) {
    setImageError("");
    if (!file) { setImage(null); return; }
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) { setImageError("Use a JPEG, PNG, or WebP image."); return; }
    if (file.size > 2 * 1024 * 1024) { setImageError("Images must be 2 MB or smaller."); return; }
    setImage(file);
  }

  const { data: membershipData } = useQuery({
    queryKey: ["membership"],
    queryFn: api.getMembership,
  });
  const circleName = membershipData?.membership?.circle_name || "My Circle";

  const serverError = mutation.error instanceof ApiError ? mutation.error.message : mutation.error?.message;
  return (
    <div className="w-full space-y-4">
      <Breadcrumb>
        <BreadcrumbList className="text-xs">
          <BreadcrumbItem>
            <BreadcrumbLink asChild><Link to="/app/study-circle/lobby">StudyCircle</Link></BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild><Link to={`/app/study-circle/${circleId}`}>{circleName}</Link></BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild><Link to={`/app/study-circle/${circleId}/store`}>Circle Store</Link></BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbPage>Add note</BreadcrumbPage></BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <div><h1 className="text-2xl font-bold">Share a note</h1><p className="mt-1 text-sm text-muted-foreground">Useful study material earns 10 weekly points.</p></div>
      <Card className="max-w-3xl border-0 shadow-sm"><CardHeader><CardTitle className="text-base text-[var(--brand-dark-blue)]">Note details</CardTitle></CardHeader><CardContent>
        <Form {...form}><form className="space-y-5" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
          {serverError ? <Alert variant="destructive"><AlertTitle>Note could not be shared</AlertTitle><AlertDescription>{serverError}</AlertDescription></Alert> : null}
          <FormField control={form.control} name="title" render={({ field }) => <FormItem><FormLabel>Title</FormLabel><FormControl><Input placeholder="What will this note help with?" {...field} /></FormControl><FormMessage /></FormItem>} />
          <FormField control={form.control} name="category" render={({ field }) => <FormItem><FormLabel>Category</FormLabel><Select value={field.value} onValueChange={field.onChange}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{categories.map((item) => <SelectItem key={item} value={item}>{NOTE_CATEGORY_LABELS[item]}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>} />
          <Controller control={form.control} name="contentType" render={({ field }) => <FormItem><FormLabel>Note format</FormLabel><RadioGroup value={field.value} onValueChange={(value) => { field.onChange(value); setImageError(""); }} className="grid gap-3 sm:grid-cols-2"><label className="flex cursor-pointer items-center gap-3 rounded-lg bg-[#f7f8fc] p-4 has-[[data-state=checked]]:ring-2 has-[[data-state=checked]]:ring-[var(--brand-blue)]"><RadioGroupItem value="text" /><FileText className="size-4 text-[var(--brand-blue)]" /><span className="font-semibold">Text note</span></label><label className="flex cursor-pointer items-center gap-3 rounded-lg bg-[#f7f8fc] p-4 has-[[data-state=checked]]:ring-2 has-[[data-state=checked]]:ring-[var(--brand-blue)]"><RadioGroupItem value="image" /><FileImage className="size-4 text-[var(--brand-pink)]" /><span className="font-semibold">Image note</span></label></RadioGroup></FormItem>} />
          {mode === "text" ? <FormField control={form.control} name="textContent" render={({ field }) => <FormItem><FormLabel>Note</FormLabel><FormControl><Textarea className="min-h-48 resize-y" placeholder="Write the explanation or study steps you want to share..." {...field} /></FormControl><div className="flex justify-between"><FormMessage /><span className="text-xs text-muted-foreground">{field.value?.length ?? 0}/2000</span></div></FormItem>} /> : <div className="space-y-2"><FormLabel>Image</FormLabel>{previewUrl ? <div className="relative overflow-hidden rounded-lg bg-[#f7f8fc] p-3"><img src={previewUrl} alt="Selected note preview" className="max-h-80 w-full object-contain" /><Button type="button" size="icon" variant="secondary" className="absolute right-3 top-3" onClick={() => setImage(null)}><X className="size-4" /><span className="sr-only">Remove image</span></Button></div> : <label className="flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-lg bg-[#f7f8fc] p-5 text-center"><ImagePlus className="size-7 text-[var(--brand-blue)]" /><span className="mt-2 text-sm font-semibold">Choose an image</span><span className="mt-1 text-xs text-muted-foreground">JPEG, PNG, or WebP · up to 2 MB</span><Input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => chooseImage(event.target.files?.[0])} /></label>} {imageError ? <p className="text-sm text-destructive">{imageError}</p> : null}</div>}
          <div className="flex justify-end gap-2"><Button type="button" variant="outline" asChild><Link to={`/app/study-circle/${circleId}/store`}>Cancel</Link></Button><Button disabled={mutation.isPending || (mode === "image" && !image)} className="bg-[var(--brand-pink)] text-white hover:bg-[var(--brand-magenta)]">{mutation.isPending ? "Sharing..." : "Share note"}</Button></div>
        </form></Form>
      </CardContent></Card>
    </div>
  );
}
