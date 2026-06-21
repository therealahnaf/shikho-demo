import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, CircleAlert, UserRoundPlus } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { z } from "zod";

import { BrandShell } from "@/components/brand-shell";
import { DemoNotice } from "@/components/demo-notice";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api, ApiError } from "@/lib/api";
import { saveCredentials } from "@/lib/storage";

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
      const result = await api.createDemoUser({
        ...values,
        username: values.username.trim().toLowerCase(),
        school_name: values.school_name?.trim() || null,
      });
      saveCredentials({ username: result.user.username, accessKey: result.access_key });
      navigate("/demo/access-key");
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.fields.username) {
          form.setError("username", { message: error.fields.username });
        }
        setRootError(error.message);
      } else {
        setRootError("The demo service is unavailable. Please try again.");
      }
    }
  }

  return (
    <BrandShell backTo="/" compact>
      <div className="mx-auto grid min-w-0 max-w-5xl gap-8 lg:grid-cols-[minmax(0,.72fr)_minmax(0,1.28fr)] lg:items-start">
        <aside className="pt-3 lg:sticky lg:top-8">
          <span className="step-marker">Step 1 of 2</span>
          <h1 className="mt-5 text-4xl font-black leading-[1.02] tracking-[-0.055em] text-[var(--brand-dark-blue)] sm:text-5xl">
            Tell your circle who you are.
          </h1>
          <p className="mt-5 max-w-sm text-sm leading-7 text-[var(--muted-text)]">
            We only collect enough information to place you in this single Class 10 Mathematics
            demo cohort.
          </p>
          <div className="mt-7 hidden lg:block">
            <DemoNotice />
          </div>
        </aside>

        <Card>
          <CardHeader>
            <div className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-[#eef3ff] text-[var(--brand-blue)]">
              <UserRoundPlus className="h-6 w-6" />
            </div>
            <CardTitle>Create your demo identity</CardTitle>
            <CardDescription>Your username and generated key will bring you back next time.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-6 lg:hidden">
              <DemoNotice />
            </div>
            {rootError ? (
              <Alert variant="destructive" className="mb-6">
                <CircleAlert />
                <AlertTitle>Could not create identity</AlertTitle>
                <AlertDescription>{rootError}</AlertDescription>
              </Alert>
            ) : null}
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="min-w-0 space-y-5" noValidate>
                <div className="grid min-w-0 gap-5 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl>
                          <Input autoComplete="username" placeholder="demo_student" {...field} />
                        </FormControl>
                        <FormDescription>Letters, numbers, and underscores.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="display_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Display name</FormLabel>
                        <FormControl>
                          <Input autoComplete="name" placeholder="Your name" {...field} />
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
                      <FormLabel>School name (optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Example School" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid min-w-0 gap-5 border-y border-[#e6eaf5] py-5 sm:grid-cols-3">
                  <FormField
                    control={form.control}
                    name="class_level"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Class</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent><SelectItem value="class_10">Class 10</SelectItem></SelectContent>
                        </Select>
                        <FormDescription>Demo cohort</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="curriculum"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Curriculum</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent><SelectItem value="nctb_bangla">NCTB Bangla</SelectItem></SelectContent>
                        </Select>
                        <FormDescription>Demo cohort</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="preferred_subject"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Subject</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent><SelectItem value="mathematics">Mathematics</SelectItem></SelectContent>
                        </Select>
                        <FormDescription>Demo cohort</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? "Creating your key…" : "Create demo identity"}
                  {!form.formState.isSubmitting ? <ArrowRight className="h-4 w-4" /> : null}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </BrandShell>
  );
}
