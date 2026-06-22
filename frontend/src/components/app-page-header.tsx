import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type AppPageHeaderProps = {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  backTo?: string;
  backLabel?: string;
  className?: string;
};

export const pageActionClassName =
  "h-9 rounded-lg px-3 text-sm font-semibold shadow-none";

export function AppPageHeader({
  title,
  description,
  actions,
  backTo,
  backLabel = "Back",
  className,
}: AppPageHeaderProps) {
  const navigate = useNavigate();

  return (
    <div className={cn("flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between", className)}>
      <div className="flex min-w-0 items-start gap-3">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="mt-0.5 size-9 shrink-0 rounded-lg bg-white shadow-none"
          aria-label={backLabel}
          title={backLabel}
          onClick={() => backTo ? navigate(backTo) : navigate(-1)}
        >
          <ArrowLeft className="size-4" />
        </Button>
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold tracking-tight text-foreground">{title}</h1>
          {description ? <div className="mt-1 text-sm text-muted-foreground">{description}</div> : null}
        </div>
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2 pl-12 sm:pl-0">{actions}</div> : null}
    </div>
  );
}
