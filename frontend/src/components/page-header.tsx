import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import type { ReactNode } from "react";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";

export type BreadcrumbSegment = {
  label: string;
  href?: string; // if undefined, rendered as the current page (last item)
};

type PageHeaderProps = {
  /** Ordered breadcrumb segments. The last one is always rendered as the current page. */
  breadcrumbs: BreadcrumbSegment[];
  /** Main title text */
  title: string;
  /** Optional icon placed before the title */
  titleIcon?: ReactNode;
  /** Optional subtitle shown below the title */
  subtitle?: string;
  /** Where the back arrow navigates to. Defaults to the second-to-last breadcrumb href. */
  backTo?: string;
  /** Action buttons rendered on the right side */
  actions?: ReactNode;
};

/**
 * Shared page-level header shell.
 * Renders breadcrumbs, a back button, title/subtitle on the left, and action buttons on the right.
 */
export function PageHeader({
  breadcrumbs,
  title,
  titleIcon,
  subtitle,
  backTo,
  actions,
}: PageHeaderProps) {
  // Determine back link: explicit backTo > second-to-last breadcrumb > first breadcrumb
  const backHref =
    backTo ??
    (breadcrumbs.length >= 2
      ? breadcrumbs[breadcrumbs.length - 2].href
      : breadcrumbs[0]?.href) ??
    "/app";

  return (
    <div className="space-y-2">
      {/* Breadcrumbs */}
      <Breadcrumb>
        <BreadcrumbList className="text-xs">
          {breadcrumbs.map((segment, index) => {
            const isLast = index === breadcrumbs.length - 1;
            return (
              <span key={segment.label + index} className="contents">
                {index > 0 && <BreadcrumbSeparator />}
                <BreadcrumbItem>
                  {isLast || !segment.href ? (
                    <BreadcrumbPage>{segment.label}</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink asChild>
                      <Link to={segment.href}>{segment.label}</Link>
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
              </span>
            );
          })}
        </BreadcrumbList>
      </Breadcrumb>

      {/* Title row: back + title on left, actions on right */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button
            asChild
            size="icon"
            variant="outline"
            className="size-8 shrink-0 rounded-lg bg-white"
          >
            <Link to={backHref}>
              <ArrowLeft className="size-4" />
              <span className="sr-only">Back</span>
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              {titleIcon}
              {title}
            </h1>
            {subtitle && (
              <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>
            )}
          </div>
        </div>
        {actions && (
          <div className="flex flex-wrap items-center gap-2">{actions}</div>
        )}
      </div>
    </div>
  );
}
