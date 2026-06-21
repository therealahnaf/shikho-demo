import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, CircleAlert, KeyRound } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";

import { BrandShell } from "@/components/brand-shell";
import { DemoNotice } from "@/components/demo-notice";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { saveCredentials } from "@/lib/storage";

const schema = z.object({
  username: z.string().trim().min(3, "Enter your username."),
  accessKey: z.string().trim().min(12, "Enter your complete access key."),
});
type FormValues = z.infer<typeof schema>;

export function LoginPage() {
  const navigate = useNavigate();
  const [rootError, setRootError] = useState<string | null>(null);
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
    <BrandShell backTo="/" compact>
      <div className="mx-auto max-w-xl">
        <Card>
          <CardHeader>
            <div className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-[#eef3ff] text-[var(--brand-blue)]">
              <KeyRound className="h-6 w-6" />
            </div>
            <CardTitle>Return to your circle</CardTitle>
            <CardDescription>Use the username and key from your first visit.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-6"><DemoNotice /></div>
            {rootError ? (
              <Alert variant="destructive" className="mb-6">
                <CircleAlert />
                <AlertTitle>Access not verified</AlertTitle>
                <AlertDescription>{rootError}</AlertDescription>
              </Alert>
            ) : null}
            <Form {...form}>
              <form className="space-y-5" onSubmit={form.handleSubmit(onSubmit)} noValidate>
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input autoComplete="username" placeholder="amina_rahman" {...field} />
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
                      <FormLabel>Access key</FormLabel>
                      <FormControl>
                        <Input
                          autoComplete="off"
                          autoCapitalize="characters"
                          placeholder="SC-XXXX-XXXX"
                          className="font-mono tracking-[0.08em] uppercase"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" size="lg" className="w-full" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? "Checking your key…" : "Enter StudyCircle"}
                  {!form.formState.isSubmitting ? <ArrowRight className="h-4 w-4" /> : null}
                </Button>
              </form>
            </Form>
            <p className="mt-7 text-center text-sm text-[var(--muted-text)]">
              New to StudyCircle?{" "}
              <Link className="font-bold text-[var(--brand-blue)] hover:underline" to="/onboarding">
                Create an identity
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </BrandShell>
  );
}
