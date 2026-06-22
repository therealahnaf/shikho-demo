import { useQuery } from "@tanstack/react-query";
import { Crown, Trophy } from "lucide-react";
import { Link, useParams } from "react-router-dom";

import { AppPageError, AppPageLoading } from "@/components/app-page-state";
import { AppPageHeader } from "@/components/app-page-header";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

function initials(name: string) {
  return name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

export function LeaderboardPage() {
  const { circleId = "" } = useParams();
  const leaderboardQuery = useQuery({
    queryKey: ["leaderboard", circleId],
    queryFn: () => api.getLeaderboard(circleId),
    enabled: Boolean(circleId),
    retry: false,
  });
  if (leaderboardQuery.isPending) return <AppPageLoading />;
  if (leaderboardQuery.isError) {
    return <AppPageError onRetry={() => void leaderboardQuery.refetch()} />;
  }

  const data = leaderboardQuery.data;
  const dates = new Intl.DateTimeFormat("en", { month: "short", day: "numeric" });
  return (
    <div className="w-full space-y-4">
        <AppPageHeader title="Weekly Leaderboard" description={`${dates.format(new Date(data.cycle.starts_at))}–${dates.format(new Date(data.cycle.ends_at))}`} backTo={`/app/study-circle/${circleId}`} actions={<Badge className="h-9 rounded-lg bg-[var(--brand-pink)] px-3 text-white hover:bg-[var(--brand-pink)]">Your rank #{data.current_user_rank}</Badge>} />
        <Card className="overflow-hidden border-0 shadow-sm">
          <CardHeader className="p-4"><CardTitle className="flex items-center gap-2 text-sm text-[var(--brand-dark-blue)]"><Trophy className="size-4" /> {data.circle.name}</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableCaption className="sr-only">Full weekly StudyCircle leaderboard</TableCaption>
              <TableHeader><TableRow><TableHead className="w-16 pl-4">Rank</TableHead><TableHead>Student</TableHead><TableHead className="text-right">Points</TableHead><TableHead className="w-28 pr-4 text-right">Role</TableHead></TableRow></TableHeader>
              <TableBody>
                {data.entries.map((entry) => (
                  <TableRow key={entry.user.id} className={cn(entry.is_current_user && "bg-[#eef3ff] hover:bg-[#eef3ff]")}>
                    <TableCell className="pl-4 text-center font-bold">{entry.rank === 1 ? <Crown className="mx-auto size-4 text-[var(--brand-yellow)]" /> : entry.rank}</TableCell>
                    <TableCell><div className="flex items-center gap-3"><Avatar className="size-9"><AvatarFallback className="bg-[var(--brand-dark-blue)] text-xs font-bold text-white">{initials(entry.user.display_name)}</AvatarFallback></Avatar><div><p className="font-semibold">{entry.user.display_name}{entry.is_current_user ? " (You)" : ""}</p><p className="text-xs text-muted-foreground">@{entry.user.username}</p></div></div></TableCell>
                    <TableCell className="text-right font-bold text-[var(--brand-dark-blue)]">{entry.weekly_points}</TableCell>
                    <TableCell className="pr-4 text-right">{entry.is_mentor ? <Badge className="bg-[var(--brand-yellow)] text-[#3d2a00] hover:bg-[var(--brand-yellow)]">Mentor</Badge> : "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
    </div>
  );
}
