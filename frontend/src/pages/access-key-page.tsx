import { Check, Copy, KeyRound, ShieldAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { BrandShell } from "@/components/brand-shell";
import { DemoNotice } from "@/components/demo-notice";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { getCredentials } from "@/lib/storage";

export function AccessKeyPage() {
  const navigate = useNavigate();
  const credentials = getCredentials();
  const [acknowledged, setAcknowledged] = useState(false);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");

  useEffect(() => {
    if (!credentials) navigate("/onboarding", { replace: true });
  }, [credentials, navigate]);

  if (!credentials) return null;

  async function copyKey() {
    try {
      await navigator.clipboard.writeText(credentials!.accessKey);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
  }

  return (
    <BrandShell compact>
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 text-center">
          <span className="step-marker">Step 2 of 2</span>
          <h1 className="mt-5 text-4xl font-black tracking-[-0.05em] text-[var(--brand-dark-blue)] sm:text-5xl">
            Keep this key close.
          </h1>
          <p className="mt-3 text-sm leading-6 text-[var(--muted-text)]">
            It is the only way to return as <strong>{credentials.username}</strong>.
          </p>
        </div>
        <Card className="key-card overflow-hidden">
          <CardHeader className="relative">
            <div className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-[#fff1f9] text-[var(--brand-pink)]">
              <KeyRound className="h-6 w-6" />
            </div>
            <CardTitle>Your StudyCircle access key</CardTitle>
            <CardDescription>Copy it somewhere safe before you continue.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="access-key-display">
              <code aria-label="Your access key">{credentials.accessKey}</code>
              <Button type="button" variant="outline" size="sm" onClick={copyKey}>
                {copyState === "copied" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copyState === "copied" ? "Copied" : "Copy key"}
              </Button>
            </div>
            <p className="min-h-5 text-center text-xs font-semibold text-[var(--muted-text)]" aria-live="polite">
              {copyState === "copied"
                ? "Key copied to your clipboard."
                : copyState === "failed"
                  ? "Copy was blocked. Select the key above and copy it manually."
                  : "The key remains visible if you refresh this page."}
            </p>
            <DemoNotice />
            <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-[#e3e7f2] bg-[#fafbff] p-4 text-sm leading-6 text-[var(--text)]">
              <Checkbox
                checked={acknowledged}
                onCheckedChange={(value) => setAcknowledged(value === true)}
                aria-label="I saved my access key"
                className="mt-0.5"
              />
              <span>I saved my access key and understand that there is no recovery process.</span>
            </label>
            <Button className="w-full" size="lg" disabled={!acknowledged} onClick={() => navigate("/app") }>
              Enter StudyCircle
            </Button>
          </CardContent>
        </Card>
        <Alert className="mt-5">
          <ShieldAlert />
          <AlertTitle>What happens next?</AlertTitle>
          <AlertDescription>
            Your identity is ready. Continue to find the StudyCircle for your cohort.
          </AlertDescription>
        </Alert>
      </div>
    </BrandShell>
  );
}
