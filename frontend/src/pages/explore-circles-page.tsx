import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Trophy,
  UsersRound,
  ArrowLeft,
  Loader2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { api, ApiError, CircleLeaderboardEntry, MemberUser } from "@/lib/api";
import { cn } from "@/lib/utils";

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function AvatarStack({ users, max = 5 }: { users: MemberUser[]; max?: number }) {
  const visible = users.slice(0, max);
  return (
    <div className="flex -space-x-2" aria-label={`${users.length} circle members`}>
      {visible.map((member, index) => (
        <Avatar key={member.id} className="size-8 border-2 border-white ring-1 ring-slate-200">
          <AvatarFallback
            className={cn(
              "text-[10px] font-bold text-white",
              index % 5 === 0 && "bg-[#6366F1]", // Indigo
              index % 5 === 1 && "bg-[#EC4899]", // Pink
              index % 5 === 2 && "bg-[#10B981]", // Emerald
              index % 5 === 3 && "bg-[#F59E0B]", // Amber
              index % 5 === 4 && "bg-[#8B5CF6]"  // Violet
            )}
          >
            {initials(member.display_name)}
          </AvatarFallback>
        </Avatar>
      ))}
      {users.length > max ? (
        <Avatar className="size-8 border-2 border-white ring-1 ring-slate-200">
          <AvatarFallback className="bg-slate-800 text-[10px] font-bold text-white">
            +{users.length - max}
          </AvatarFallback>
        </Avatar>
      ) : null}
    </div>
  );
}

export function ExploreCirclesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Dialog State
  const [selectedCircle, setSelectedCircle] = useState<CircleLeaderboardEntry | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;

  // Retrieve Cohort Circles
  const { data: circlesData, isLoading: circlesLoading, isError: circlesError, refetch } = useQuery({
    queryKey: ["circles"],
    queryFn: api.getCircles,
  });

  // Retrieve Selected Circle Members
  const { data: membersData, isLoading: membersLoading } = useQuery({
    queryKey: ["circle-members", selectedCircle?.id],
    queryFn: () => selectedCircle ? api.getCircleMembers(selectedCircle.id) : Promise.resolve({ members: [] }),
    enabled: !!selectedCircle,
  });

  if (circlesLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mx-auto" />
          <p className="mt-4 text-sm font-semibold text-slate-500">Loading circles...</p>
        </div>
      </div>
    );
  }

  if (circlesError) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-red-500 font-semibold">Failed to load study circles.</p>
          <Button onClick={() => void refetch()} className="bg-indigo-600 hover:bg-indigo-700">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const circles = circlesData?.circles ?? [];

  // Client-side Pagination logic
  const totalPages = Math.max(1, Math.ceil(circles.length / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedCircles = circles.slice(startIndex, startIndex + pageSize);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handleJoinCircle = async (circleId: string) => {
    setIsJoining(true);
    setJoinError(null);
    try {
      const res = await api.joinCircle(circleId);
      await queryClient.invalidateQueries({ queryKey: ["membership"] });
      navigate(res.circle_home_path);
    } catch (err) {
      setJoinError(err instanceof ApiError ? err.message : "Failed to join this circle.");
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-6 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <Button
            variant="ghost"
            onClick={() => navigate("/app/study-circle/lobby")}
            className="pl-0 text-slate-600 hover:text-indigo-600 hover:bg-transparent -ml-1 flex items-center gap-1.5"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Lobby
          </Button>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 flex items-center gap-2">
            <UsersRound className="h-8 w-8 text-indigo-600" /> Explore Study Circles
          </h1>
          <p className="text-slate-500">
            Discover cohorts and study circles in Class 10 Mathematics. Click a row to view details.
          </p>
        </div>
      </div>

      {/* Circles Table Card */}
      <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
        <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-bold text-slate-900">Active Study Circles</CardTitle>
              <CardDescription>Currently accepting members in Class 10</CardDescription>
            </div>
            <Badge className="bg-indigo-50 text-indigo-700 border-none font-bold uppercase tracking-wider text-[10px] px-2.5 py-1">
              {circles.length} Total Circles
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {circles.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              No StudyCircles found. Create the first one in the lobby!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/75">
                  <TableRow className="border-slate-200 hover:bg-transparent">
                    <TableHead className="font-semibold text-slate-600 h-11 pl-6">Name</TableHead>
                    <TableHead className="font-semibold text-slate-600 h-11">Description</TableHead>
                    <TableHead className="font-semibold text-slate-600 h-11 text-center w-32">Members</TableHead>
                    <TableHead className="font-semibold text-slate-600 h-11 text-right pr-6 w-32">Points</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedCircles.map((circle) => (
                    <TableRow
                      key={circle.id}
                      onClick={() => {
                        setJoinError(null);
                        setSelectedCircle(circle);
                      }}
                      className="cursor-pointer border-slate-100 hover:bg-slate-50/80 transition-colors"
                    >
                      <TableCell className="font-bold text-slate-950 pl-6 py-4">
                        {circle.name}
                      </TableCell>
                      <TableCell className="text-slate-600 py-4 max-w-md truncate">
                        {circle.description}
                      </TableCell>
                      <TableCell className="text-center py-4">
                        <Badge variant="secondary" className="bg-slate-100 text-slate-800 border-none font-semibold">
                          {circle.member_count} / 10
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right py-4 pr-6 font-bold text-indigo-600">
                        {circle.points} pts
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-2">
          <div className="text-sm text-slate-500">
            Showing <span className="font-semibold text-slate-800">{startIndex + 1}</span> to{" "}
            <span className="font-semibold text-slate-800">
              {Math.min(startIndex + pageSize, circles.length)}
            </span>{" "}
            of <span className="font-semibold text-slate-800">{circles.length}</span> circles
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4 mr-1" /> Previous
            </Button>
            <div className="text-sm font-medium text-slate-700">
              Page {currentPage} of {totalPages}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Details Dialog */}
      <Dialog
        open={selectedCircle !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedCircle(null);
            setJoinError(null);
          }
        }}
      >
        {selectedCircle && (
          <DialogContent className="bg-white border-slate-200 text-slate-900 rounded-2xl p-6 max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black tracking-tight text-slate-950">
                {selectedCircle.name}
              </DialogTitle>
              <DialogDescription className="text-slate-500 mt-1">
                Class 10 · Mathematics Cohort
              </DialogDescription>
            </DialogHeader>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="p-4 rounded-xl bg-indigo-50/70 border border-indigo-100/50 flex flex-col justify-between">
                <span className="text-xs font-semibold text-indigo-700 uppercase tracking-wider">Points</span>
                <span className="text-2xl font-black text-indigo-950 flex items-center gap-1.5 mt-1">
                  <Trophy className="h-5 w-5 text-amber-500 fill-amber-500" /> {selectedCircle.points} pts
                </span>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex flex-col justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Capacity</span>
                <span className="text-2xl font-black text-slate-950 flex items-center gap-1.5 mt-1">
                  <UsersRound className="h-5 w-5 text-slate-500" /> {selectedCircle.member_count} / 10
                </span>
              </div>
            </div>

            {/* Description */}
            <div className="mt-4 space-y-1.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">About the Circle</h4>
              <p className="text-sm text-slate-700 leading-relaxed bg-slate-50/55 p-3 rounded-lg border border-slate-100">
                "{selectedCircle.description}"
              </p>
            </div>

            {/* Members Section */}
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Circle Members</h4>
                {!membersLoading && membersData && (
                  <AvatarStack users={membersData.members} max={5} />
                )}
              </div>

              {membersLoading ? (
                <div className="py-8 flex items-center justify-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                  <span className="text-sm text-slate-400 font-semibold">Loading members...</span>
                </div>
              ) : (
                <div className="max-h-[160px] overflow-y-auto space-y-2 pr-1">
                  {membersData?.members.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50/50 transition-colors"
                    >
                      <Avatar className="size-8">
                        <AvatarFallback className="bg-indigo-50 text-indigo-700 font-bold text-xs">
                          {initials(member.display_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="text-sm font-bold text-slate-900">{member.display_name}</div>
                        <div className="text-xs text-slate-400">@{member.username}</div>
                      </div>
                    </div>
                  ))}
                  {(!membersData || membersData.members.length === 0) && (
                    <p className="text-sm text-slate-500 text-center py-4">No members in this circle yet.</p>
                  )}
                </div>
              )}
            </div>

            {joinError && (
              <Alert variant="destructive" className="mt-4">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{joinError}</AlertDescription>
              </Alert>
            )}

            <DialogFooter className="flex gap-2 sm:justify-end mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedCircle(null);
                  setJoinError(null);
                }}
                className="border-slate-200 text-slate-700 hover:bg-slate-50"
              >
                Close
              </Button>
              <Button
                onClick={() => handleJoinCircle(selectedCircle.id)}
                disabled={isJoining || selectedCircle.member_count >= 10}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold flex items-center gap-1.5"
              >
                {isJoining && <Loader2 className="h-4 w-4 animate-spin" />}
                {isJoining ? "Joining..." : selectedCircle.member_count >= 10 ? "Circle Full" : "Join Circle"}
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
