import { AlertCircle } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export function AppPageLoading() {
  return (
    <div className="w-full space-y-5" aria-label="Loading StudyCircle">
      <Skeleton className="h-8 w-52" />
      <Skeleton className="h-52 w-full rounded-[2rem]" />
      <div className="grid gap-5 md:grid-cols-2">
        <Skeleton className="h-56 rounded-[2rem]" />
        <Skeleton className="h-56 rounded-[2rem]" />
      </div>
    </div>
  );
}

export function AppPageError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="mx-auto max-w-xl py-12">
      <Alert variant="destructive">
        <AlertCircle />
        <AlertTitle>StudyCircle could not load</AlertTitle>
        <AlertDescription>Check the API connection and try again.</AlertDescription>
      </Alert>
      <Button className="mt-5" onClick={onRetry}>Try again</Button>
    </div>
  );
}
