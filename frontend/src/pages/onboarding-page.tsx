import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, CircleAlert, UserRoundPlus, Orbit, UsersRound, Map, Crown } from "lucide-react";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";

import { BrandShell } from "@/components/brand-shell";
import { DemoNotice } from "@/components/demo-notice";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api, ApiError } from "@/lib/api";
import { saveCredentials, getCredentials } from "@/lib/storage";

const benefits = [
  { icon: UsersRound, title: "Move together", copy: "Turn individual study into shared momentum." },
  { icon: Map, title: "See the path", copy: "A weekly roadmap keeps every member in view." },
  { icon: Crown, title: "Lead the circle", copy: "Consistent progress earns the Mentor spot." },
];

const schema = z.object({
  username: z
    .string()
    .trim()
    .min(3, "Use at least 3 characters.")
    .max(30, "Use no more than 30 characters.")
    .regex(/^[a-zA-Z0-9_]+$/, "Use letters, numbers, and underscores only."),
  display_name: z.string().trim().min(2, "Enter your display name.").max(80),
  school_name: z.string().trim().max(120, "Use no more than 120 characters.").optional(),
  class_level: z.literal("class_10"),
  curriculum: z.literal("nctb_bangla"),
  preferred_subject: z.literal("mathematics"),
});

type FormValues = z.infer<typeof schema>;

export function OnboardingPage() {
  const navigate = useNavigate();
  const [rootError, setRootError] = useState<string | null>(null);

  const credentials = getCredentials();
  const { data: user } = useQuery({
    queryKey: ["me"],
    queryFn: api.getMe,
    enabled: Boolean(credentials),
    retry: false,
  });

  useEffect(() => {
    if (user) {
      navigate("/app", { replace: true });
    }
  }, [user, navigate]);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      username: "",
      display_name: "",
      school_name: "",
      class_level: "class_10",
      curriculum: "nctb_bangla",
      preferred_subject: "mathematics",
    },
  });

  async function onSubmit(values: FormValues) {
    setRootError(null);
    try {
      const result = await api.createUser({
        ...values,
        username: values.username.trim().toLowerCase(),
        school_name: values.school_name?.trim() || null,
      });
      saveCredentials({ username: result.user.username, accessKey: result.access_key });
      navigate("/access-key");
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.fields.username) {
          form.setError("username", { message: error.fields.username });
        }
        setRootError(error.message);
      } else {
        setRootError("StudyCircle is unavailable right now. Please try again.");
      }
    }
  }

  return (
    <BrandShell compact>
      <div className="mx-auto max-w-4xl">
        <Card className="overflow-hidden border-[#dce2f1] shadow-xl bg-white">
          <CardContent className="grid p-0 md:grid-cols-2">
            <div className="p-6 sm:p-8 md:p-10 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eef3ff] text-[var(--brand-blue)]">
                    <UserRoundPlus className="h-6 w-6" />
                  </div>
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-[var(--brand-pink)] bg-[#fff1f9] px-2.5 py-1 rounded-full">
                    Step 1 of 2
                  </span>
                </div>
                
                <h1 className="text-2xl font-black tracking-tight text-[var(--brand-dark-blue)]">
                  Create your student identity
                </h1>
                <p className="text-sm text-[var(--muted-text)] mt-1.5 mb-6">
                  Your username and generated key will bring you back next time.
                </p>

                {rootError ? (
                  <Alert variant="destructive" className="mb-6">
                    <CircleAlert className="h-4 w-4" />
                    <AlertTitle>Could not create identity</AlertTitle>
                    <AlertDescription>{rootError}</AlertDescription>
                  </Alert>
                ) : null}

                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-semibold text-slate-700">Username</FormLabel>
                            <FormControl>
                              <Input autoComplete="username" placeholder="amina_rahman" className="border-slate-200" {...field} />
                            </FormControl>
                            <FormDescription className="text-[10px] text-slate-400">
                              Letters, numbers, underscores.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="display_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-semibold text-slate-700">Display name</FormLabel>
                            <FormControl>
                              <Input autoComplete="name" placeholder="Your name" className="border-slate-200" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="school_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-semibold text-slate-700">School name (optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="Example School" className="border-slate-200" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid gap-4 border-y border-[#e6eaf5] py-4 sm:grid-cols-3">
                      <FormField
                        control={form.control}
                        name="class_level"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-semibold text-slate-700 text-xs">Class</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl><SelectTrigger className="border-slate-200 h-9 text-xs"><SelectValue /></SelectTrigger></FormControl>
                              <SelectContent><SelectItem value="class_10" className="text-xs">Class 10</SelectItem></SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="curriculum"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-semibold text-slate-700 text-xs">Curriculum</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl><SelectTrigger className="border-slate-200 h-9 text-xs"><SelectValue /></SelectTrigger></FormControl>
                              <SelectContent><SelectItem value="nctb_bangla" className="text-xs">NCTB Bangla</SelectItem></SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="preferred_subject"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-semibold text-slate-700 text-xs">Subject</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl><SelectTrigger className="border-slate-200 h-9 text-xs"><SelectValue /></SelectTrigger></FormControl>
                              <SelectContent><SelectItem value="mathematics" className="text-xs">Mathematics</SelectItem></SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <Button type="submit" size="lg" className="w-full bg-[var(--brand-pink)] text-white hover:bg-[var(--brand-magenta)] font-bold transition-all duration-200 mt-2" disabled={form.formState.isSubmitting}>
                      {form.formState.isSubmitting ? "Creating your key…" : "Create student identity"}
                      {!form.formState.isSubmitting ? <ArrowRight className="ml-2 h-4 w-4" /> : null}
                    </Button>
                  </form>
                </Form>
                
                <div className="mt-4"><DemoNotice /></div>
              </div>

              <p className="mt-6 text-center text-sm text-[var(--muted-text)]">
                Already registered?{" "}
                <Link className="font-bold text-[var(--brand-blue)] hover:underline" to="/login">
                  Enter your access key
                </Link>
              </p>
            </div>

            {/* Right Side Brand Branding Panel */}
            <div className="relative hidden flex-col justify-between bg-gradient-to-br from-[var(--brand-dark-blue)] to-[#1a2d6b] p-10 text-white md:flex">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-[14px] bg-white/10 text-white shadow-sm">
                  <Orbit className="h-5 w-5 animate-pulse" />
                </span>
                <div>
                  <span className="block text-[10px] font-extrabold uppercase tracking-[0.25em] text-[var(--brand-pink)]">
                    Shikho
                  </span>
                  <span className="block text-lg font-black tracking-[-0.04em]">
                    StudyCircle
                  </span>
                </div>
              </div>

              <div className="space-y-6 my-auto pt-6">
                <h2 className="text-3xl font-black leading-tight tracking-tight">
                  Study feels <span className="text-[var(--brand-yellow)]">lighter</span> when progress is shared.
                </h2>
                <p className="text-sm text-slate-200">
                  Join a focused community space for Class 10 Mathematics students to build streaks, follow a roadmap, and learn side by side.
                </p>

                <div className="space-y-4 pt-6 border-t border-white/10">
                  {benefits.map(({ icon: Icon, title, copy }) => (
                    <div key={title} className="flex gap-4 items-start">
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/10 text-[var(--brand-yellow)]">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-sm">{title}</h3>
                        <p className="text-xs text-slate-300 mt-0.5">{copy}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="text-xs text-slate-400">
                © {new Date().getFullYear()} Shikho StudyCircle. All rights reserved.
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </BrandShell>
  );
}
