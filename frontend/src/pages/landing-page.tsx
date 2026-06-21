import { ArrowRight, CircleAlert, Crown, Map, UsersRound } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";

import { BrandShell } from "@/components/brand-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

import { api, ApiError } from "@/lib/api";
import { getCredentials, saveCredentials } from "@/lib/storage";

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
});

type FormValues = z.infer<typeof schema>;

export function LandingPage() {
  const navigate = useNavigate();
  const credentials = getCredentials();

  // Authentication State
  const { data: user } = useQuery({
    queryKey: ["me"],
    queryFn: api.getMe,
    enabled: Boolean(credentials),
    retry: false,
  });

  // Redirect to app if already logged in
  useEffect(() => {
    if (user) {
      navigate("/app", { replace: true });
    }
  }, [user, navigate]);

  // Registration Form State
  const [registerError, setRegisterError] = useState<string | null>(null);
  const registerForm = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      username: "",
      display_name: "",
      school_name: "",
    },
  });

  // Submit Handler for Profile Creation
  async function onRegisterSubmit(values: FormValues) {
    setRegisterError(null);
    try {
      const result = await api.createUser({
        ...values,
        username: values.username.trim().toLowerCase(),
        school_name: values.school_name?.trim() || null,
        class_level: "class_10",
        curriculum: "nctb_bangla",
        preferred_subject: "mathematics",
      });
      saveCredentials({ username: result.user.username, accessKey: result.access_key });
      navigate("/access-key");
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.fields.username) {
          registerForm.setError("username", { message: error.fields.username });
        }
        setRegisterError(error.message);
      } else {
        setRegisterError("StudyCircle is unavailable right now. Please try again.");
      }
    }
  }

  return (
    <BrandShell>
      <section className="grid items-center gap-12 lg:grid-cols-[1.1fr_.9fr] lg:gap-8">
        <div className="max-w-2xl">
          <span className="eyebrow">A social layer for learning</span>
          <h1 className="mt-6 text-[clamp(2.75rem,6.5vw,5.5rem)] font-black leading-[0.88] tracking-[-0.075em] text-[var(--brand-dark-blue)]">
            Study feels
            <span className="relative ml-3 inline-block text-[var(--brand-pink)] sm:ml-5">
              lighter
              <span className="absolute -bottom-2 left-1 h-2 w-[96%] -rotate-2 rounded-full bg-[var(--brand-yellow)]" />
            </span>
            <br />
            when progress is shared.
          </h1>
          <p className="mt-8 max-w-xl text-base leading-7 text-[var(--muted-text)] sm:text-lg sm:leading-8">
            Meet StudyCircle — a focused community space for Class 10 Mathematics students
            to build streaks, follow a roadmap, and learn side by side.
          </p>

          <section className="mt-12 grid gap-3 sm:grid-cols-3">
            {benefits.map(({ icon: Icon, title, copy }, index) => (
              <article key={title} className="benefit-strip" style={{ animationDelay: `${index * 90}ms` }}>
                <span className="benefit-number">0{index + 1}</span>
                <Icon className="h-5 w-5 text-[var(--brand-pink)] flex-shrink-0" />
                <div>
                  <h2 className="font-extrabold tracking-[-0.02em] text-[var(--brand-dark-blue)]">
                    {title}
                  </h2>
                  <p className="mt-1 text-xs leading-5 text-[var(--muted-text)]">{copy}</p>
                </div>
              </article>
            ))}
          </section>
        </div>

        {/* Profile Creation Card */}
        <div className="w-full">
          <Card className="border-slate-200 shadow-xl bg-white text-slate-900">
            <CardHeader>
              <CardTitle className="text-2xl font-black tracking-tight text-slate-900">
                Create your student profile
              </CardTitle>
              <CardDescription className="text-slate-500">
                Join the current Class 10 Mathematics cohort.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {registerError ? (
                <Alert variant="destructive" className="mb-5">
                  <CircleAlert className="h-4 w-4" />
                  <AlertTitle>Could not create profile</AlertTitle>
                  <AlertDescription>{registerError}</AlertDescription>
                </Alert>
              ) : null}

              <Form {...registerForm}>
                <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4" noValidate>
                  <FormField
                    control={registerForm.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-700 font-semibold">Username</FormLabel>
                        <FormControl>
                          <Input
                            autoComplete="username"
                            placeholder="amina_rahman"
                            className="border-slate-200 focus:border-indigo-500 focus:ring-indigo-500"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription className="text-slate-400 text-xs">
                          Letters, numbers, and underscores only.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={registerForm.control}
                    name="display_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-700 font-semibold">Display name</FormLabel>
                        <FormControl>
                          <Input
                            autoComplete="name"
                            placeholder="Amina Rahman"
                            className="border-slate-200 focus:border-indigo-500 focus:ring-indigo-500"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={registerForm.control}
                    name="school_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-700 font-semibold">School name (optional)</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Example High School"
                            className="border-slate-200 focus:border-indigo-500 focus:ring-indigo-500"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    size="lg"
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-11 mt-2"
                    disabled={registerForm.formState.isSubmitting}
                  >
                    {registerForm.formState.isSubmitting ? "Creating profile…" : "Get Access Key"}
                    {!registerForm.formState.isSubmitting ? <ArrowRight className="ml-2 h-4 w-4" /> : null}
                  </Button>
                </form>
              </Form>

              <div className="mt-6 pt-5 border-t border-slate-100 text-center text-sm">
                <span className="text-slate-500">Already registered? </span>
                <Link to="/login" className="font-extrabold text-indigo-600 hover:underline">
                  Enter your access key
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </BrandShell>
  );
}
