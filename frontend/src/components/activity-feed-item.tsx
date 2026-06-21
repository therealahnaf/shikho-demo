import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { ActivityEvent } from "@/lib/api";

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function relativeTime(value: string) {
  const minutes = Math.max(
    1,
    Math.round((Date.now() - new Date(value).getTime()) / 60_000),
  );
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

function eventText(event: ActivityEvent) {
  const name = event.actor?.display_name ?? "The circle";
  switch (event.event_type) {
    case "member_joined":
      return `${name} joined the circle.`;
    case "rank_changed":
      return `${name} moved to rank ${String(event.payload.rank)}.`;
    case "checkpoint_completed":
      return `${name} completed ${String(event.payload.checkpoint_title ?? "a roadmap checkpoint")}.`;
    case "daily_quest_completed":
      return "The circle completed today’s quest.";
    case "streak_increased":
      return `The circle streak increased to ${String(event.payload.days)} days.`;
  }
}

export function ActivityFeedItem({ event }: { event: ActivityEvent }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <Avatar className="size-8">
        <AvatarFallback className="bg-[#e7eefc] text-[10px] font-bold text-[var(--brand-dark-blue)]">
          {event.actor ? initials(event.actor.display_name) : "SC"}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="text-xs leading-5">{eventText(event)}</p>
        <p className="text-[10px] text-muted-foreground">
          {relativeTime(event.created_at)}
        </p>
      </div>
    </div>
  );
}
