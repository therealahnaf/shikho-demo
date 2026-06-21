import { AlertCircle, ArrowRight, CheckCircle2, LogOut, Sparkles } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

import { BrandShell } from "@/components/brand-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api, ApiError } from "@/lib/api";
import { clearCredentials, getCredentials } from "@/lib/storage";

export function AppPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const credentials = getCredentials();
  const userQuery = useQuery({
    queryKey: ["me"],
    queryFn: api.getMe,
    enabled: Boolean(credentials),
    retry: false,
  });

  useEffect(() => {
    if (!credentials) {
      navigate("/demo/login", { replace: true });
    } else if (userQuery.error instanceof ApiError && userQuery.error.status === 401) {
      clearCredentials();
      queryClient.clear();
      navigate("/demo/login", { replace: true });
    }
  }, [credentials, navigate, queryClient, userQuery.error]);

  function leaveDemo() {
    clearCredentials();
    queryClient.clear();
    navigate("/");
  }

  if (!credentials || userQuery.isPending) {
    return (
      <BrandShell compact>
        <div className="mx-auto max-w-4xl space-y-4" aria-label="Verifying demo access">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 w-full rounded-[2rem]" />
        </div>
      </BrandShell>
    );
  }

  if (userQuery.isError) {
    return (
      <BrandShell compact>
        <div className="mx-auto max-w-xl">
          <Alert variant="destructive">
            <AlertCircle />
            <AlertTitle>Could not verify access</AlertTitle>
            <AlertDescription>Check the API connection and try again.</AlertDescription>
          </Alert>
          <Button className="mt-5" onClick={() => userQuery.refetch()}>Try again</Button>
        </div>
      </BrandShell>
    );
  }

  const user = userQuery.data;
  return (
    <BrandShell compact>
      <div className="mx-auto max-w-5xl">
        <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="eyebrow">Identity verified</span>
            <h1 className="mt-3 text-4xl font-black tracking-[-0.055em] text-[var(--brand-dark-blue)] sm:text-5xl">
              Welcome, {user.display_name}.
            </h1>
          </div>
          <Button variant="outline" onClick={leaveDemo}>
            <LogOut className="h-4 w-4" /> Leave demo
          </Button>
        </div>

        <Card className="overflow-hidden">
          <div className="phase-banner">
            <span>Phase 0 complete</span>
            <Sparkles className="h-5 w-5" />
          </div>
          <CardHeader>
            <CardTitle>Your place is ready.</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-8 lg:grid-cols-[1.1fr_.9fr]">
              <div>
                <p className="max-w-xl text-base leading-8 text-[var(--muted-text)]">
                  Your demo identity is stored in PostgreSQL and this browser knows how to return
                  with your key. Circle discovery and joining are intentionally reserved for Phase 1.
                </p>
                <Alert className="mt-6 max-w-xl border-[#bde5d8] bg-[#effbf7] text-[#185c49] [&>svg]:text-[#185c49]">
                  <CheckCircle2 />
                  <AlertTitle>Persistent access is working</AlertTitle>
                  <AlertDescription>
                    Refresh this page or restart the API — your identity remains available.
                  </AlertDescription>
                </Alert>
              </div>
              <div className="identity-ticket">
                <span className="ticket-label">Demo identity</span>
                <strong>{user.display_name}</strong>
                <span>@{user.username}</span>
                <div className="ticket-rule" />
                <dl>
                  <div><dt>Class</dt><dd>10</dd></div>
                  <div><dt>Subject</dt><dd>Mathematics</dd></div>
                  <div><dt>Curriculum</dt><dd>NCTB Bangla</dd></div>
                </dl>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="mt-5 flex items-center justify-between rounded-2xl border border-dashed border-[#bfc8e4] px-5 py-4 text-sm text-[var(--muted-text)]">
          <span>Next: find and join Math Champions.</span>
          <span className="flex items-center gap-2 font-bold text-[var(--brand-blue)]">
            Phase 1 <ArrowRight className="h-4 w-4" />
          </span>
        </div>
      </div>
    </BrandShell>
  );
}
