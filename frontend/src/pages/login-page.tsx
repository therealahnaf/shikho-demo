import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, CircleAlert, KeyRound, Orbit, UsersRound, Map, Crown } from "lucide-react";
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { api, ApiError } from "@/lib/api";
import { saveCredentials, getCredentials } from "@/lib/storage";

const benefits = [
  { icon: UsersRound, title: "Move together", copy: "Turn individual study into shared momentum." },
  { icon: Map, title: "See the path", copy: "A weekly roadmap keeps every member in view." },
  { icon: Crown, title: "Lead the circle", copy: "Consistent progress earns the Mentor spot." },
];

const schema = z.object({
  username: z.string().trim().min(3, "Enter your username."),
  accessKey: z.string().trim().min(12, "Enter your complete access key."),
});
type FormValues = z.infer<typeof schema>;

export function LoginPage() {
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
    defaultValues: { username: "", accessKey: "" },
  });

  async function onSubmit(values: FormValues) {
    setRootError(null);
    try {
      const username = values.username.trim().toLowerCase();
      const accessKey = values.accessKey.trim().toUpperCase();
      await api.verify(username, accessKey);
      saveCredentials({ username, accessKey });
      navigate("/app");
    } catch (error) {
      setRootError(
        error instanceof ApiError
          ? error.message
          : "StudyCircle is unavailable right now. Please try again.",
      );
    }
  }

  return (
    <BrandShell compact>
      <div className="mx-auto max-w-4xl">
        <Card className="overflow-hidden border-[#dce2f1] shadow-xl bg-white">
          <CardContent className="grid p-0 md:grid-cols-2">
            <div className="p-6 sm:p-8 md:p-10 flex flex-col justify-between">
              <div>
                <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eef3ff] text-[var(--brand-blue)]">
                  <KeyRound className="h-6 w-6" />
                </div>
                <h1 className="text-2xl font-black tracking-tight text-[var(--brand-dark-blue)]">
                  Return to your circle
                </h1>
                <p className="text-sm text-[var(--muted-text)] mt-1.5 mb-6">
                  Use the username and key from your first visit.
                </p>

                <div className="mb-6"><DemoNotice /></div>

                {rootError ? (
                  <Alert variant="destructive" className="mb-6">
                    <CircleAlert className="h-4 w-4" />
                    <AlertTitle>Access not verified</AlertTitle>
                    <AlertDescription>{rootError}</AlertDescription>
                  </Alert>
                ) : null}

                <Form {...form}>
                  <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)} noValidate>
                    <FormField
                      control={form.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-semibold text-slate-700">Username</FormLabel>
                          <FormControl>
                            <Input autoComplete="username" placeholder="amina_rahman" className="border-slate-200" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="accessKey"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-semibold text-slate-700">Access key</FormLabel>
                          <FormControl>
                            <Input
                              autoComplete="off"
                              autoCapitalize="characters"
                              placeholder="SC-XXXX-XXXX"
                              className="font-mono tracking-[0.08em] uppercase border-slate-200"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" size="lg" className="w-full bg-[var(--brand-pink)] text-white hover:bg-[var(--brand-magenta)] font-bold transition-all duration-200 mt-2" disabled={form.formState.isSubmitting}>
                      {form.formState.isSubmitting ? "Checking your key…" : "Enter StudyCircle"}
                      {!form.formState.isSubmitting ? <ArrowRight className="ml-2 h-4 w-4" /> : null}
                    </Button>
                  </form>
                </Form>
              </div>

              <p className="mt-8 text-center text-sm text-[var(--muted-text)]">
                New to StudyCircle?{" "}
                <Link className="font-bold text-[var(--brand-blue)] hover:underline" to="/onboarding">
                  Create an identity
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
