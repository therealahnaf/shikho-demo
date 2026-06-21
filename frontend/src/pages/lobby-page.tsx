import { useState } from "react";
import { PlusCircle, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { api, ApiError, CircleLeaderboardEntry } from "@/lib/api";
import { useAppUser } from "@/components/app-layout";

const BUBBLE_COLORS = [
  "#6366F1", // Indigo
  "#0EA5E9", // Sky
  "#10B981", // Emerald
  "#F59E0B", // Amber
  "#EC4899", // Pink
  "#8B5CF6", // Violet
];

const truncate = (str: string, maxLen: number) => {
  return str.length > maxLen ? str.slice(0, maxLen - 1) + "…" : str;
};

export function LobbyPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAppUser();

  // Circles Leaderboard State
  const { data: circlesData, isLoading: circlesLoading } = useQuery({
    queryKey: ["circles"],
    queryFn: api.getCircles,
  });

  // Recommended Circle State
  const { data: recData, isLoading: recLoading } = useQuery({
    queryKey: ["recommendedCircle"],
    queryFn: api.getRecommendedCircle,
  });

  // Dialog States
  const [selectedCircle, setSelectedCircle] = useState<CircleLeaderboardEntry | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Form states for creating circle
  const [newCircleName, setNewCircleName] = useState("");
  const [newCircleDesc, setNewCircleDesc] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);

  // Handle joining a circle
  const handleJoinCircle = async (circleId: string) => {
    setIsJoining(true);
    try {
      const res = await api.joinCircle(circleId);
      queryClient.invalidateQueries({ queryKey: ["membership"] });
      navigate(res.circle_home_path);
    } catch (err) {
      console.error(err);
    } finally {
      setIsJoining(false);
      setSelectedCircle(null);
    }
  };

  // Handle creating a circle
  const handleCreateCircleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCircleName.trim() || !newCircleDesc.trim()) return;
    setIsCreating(true);
    setCreateError(null);
    try {
      const res = await api.createCircle(newCircleName.trim(), newCircleDesc.trim());
      queryClient.invalidateQueries({ queryKey: ["membership"] });
      navigate(res.circle_home_path);
    } catch (err) {
      setCreateError(err instanceof ApiError ? err.message : "Failed to create circle.");
    } finally {
      setIsCreating(false);
    }
  };

  if (circlesLoading || recLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent mx-auto" />
          <p className="mt-4 text-sm font-semibold text-slate-500">Loading circles...</p>
        </div>
      </div>
    );
  }

  const circles = circlesData?.circles ?? [];
  const recommendedCircle = recData?.data;

  // Constellation placement logic
  const centerX = 400;
  const centerY = 250;
  const positions = circles.map((circle, index) => {
    const presetPositions = [
      { x: 220, y: 220 }, // Math Champions
      { x: 450, y: 150 }, // Pi Squad
      { x: 430, y: 350 }, // Equation Elites
      { x: 620, y: 240 }, // Trigonometry Titans
    ];
    if (index < presetPositions.length) {
      return { ...circle, ...presetPositions[index], r: index === 0 ? 90 : index === 1 ? 75 : index === 2 ? 65 : 55 };
    }
    const i = index - presetPositions.length + 1;
    const angle = i * 2.4;
    const dist = 280 + i * 60;
    return {
      ...circle,
      x: centerX + Math.cos(angle) * dist,
      y: centerY + Math.sin(angle) * dist,
      r: 50,
    };
  });

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_2fr] lg:items-start max-w-7xl mx-auto">
      {/* Controls Panel */}
      <div className="space-y-6">
        <Card className="border-slate-200 shadow-sm bg-white text-slate-900">
          <CardHeader className="pb-4">
            <Badge className="w-fit bg-indigo-50 text-indigo-700 hover:bg-indigo-50 border-none font-bold uppercase tracking-wider text-[10px] px-2 py-0.5">
              Lobby
            </Badge>
            <CardTitle className="text-2xl font-black tracking-tight text-slate-900 mt-2">
              Welcome, {user.display_name}!
            </CardTitle>
            <CardDescription className="text-slate-500 mt-1">
              You are not in a StudyCircle yet. Choose one from the leaderboard constellation or start your own.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={() => setIsCreateOpen(true)}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-11"
            >
              <PlusCircle className="mr-2 h-4 w-4" /> Create a Circle
            </Button>
          </CardContent>
        </Card>

        {/* Recommended Circle Card */}
        {recommendedCircle && (
          <Card className="border-indigo-100 shadow-sm bg-indigo-50 text-indigo-950">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2 text-indigo-700">
                <Sparkles className="h-4 w-4 fill-indigo-700" />
                <span className="text-xs font-bold uppercase tracking-wider">Recommended Circle</span>
              </div>
              <CardTitle className="text-xl font-extrabold tracking-tight mt-1 text-indigo-950">
                {recommendedCircle.name}
              </CardTitle>
              <CardDescription className="text-indigo-800/80">
                {recommendedCircle.member_count}/10 members · Class 10
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm leading-relaxed text-indigo-900">
                "{recommendedCircle.description}"
              </p>
              <Button
                onClick={() => handleJoinCircle(recommendedCircle.id)}
                disabled={isJoining}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-10"
              >
                {isJoining ? "Joining..." : "Join Recommended Circle"}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Interactive Constellation Leaderboard */}
      <div className="space-y-4">
        <div className="flex justify-between items-center px-2">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900">StudyCircles Leaderboard</h2>
            <p className="text-xs text-slate-500 mt-0.5">Sized by circle points. Click a bubble to view details and join.</p>
          </div>
        </div>

        <Card className="border-slate-800 overflow-hidden bg-[#0B132B] shadow-2xl">
          <div className="relative w-full aspect-[8/5] min-h-[350px]">
            {circles.length === 0 ? (
              <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-sm font-semibold">
                No StudyCircles found. Create the first one!
              </div>
            ) : (
              <svg
                viewBox="0 0 800 500"
                className="w-full h-full select-none"
                xmlns="http://www.w3.org/2000/svg"
              >
                {/* Constellation Connection Lines */}
                {positions.map((node, i) => {
                  if (positions.length < 2) return null;
                  const nextNode = positions[(i + 1) % positions.length];
                  return (
                    <line
                      key={`line-${i}`}
                      x1={node.x}
                      y1={node.y}
                      x2={nextNode.x}
                      y2={nextNode.y}
                      className="stroke-indigo-900/50 stroke-[3]"
                      strokeDasharray="6 6"
                    />
                  );
                })}

                {/* Interactive Circle Bubbles */}
                {positions.map((node, index) => {
                  const color = BUBBLE_COLORS[index % BUBBLE_COLORS.length];
                  return (
                    <g
                      key={node.id}
                      className="transition-transform duration-300 hover:scale-[1.05] cursor-pointer origin-center"
                      style={{
                        transformBox: "fill-box",
                        transformOrigin: "center",
                      }}
                      onClick={() => setSelectedCircle(node)}
                    >
                      <circle
                        cx={node.x}
                        cy={node.y}
                        r={node.r}
                        fill={color}
                        className="stroke-[#0B132B] stroke-[4]"
                      />
                      <text
                        x={node.x}
                        y={node.y}
                        textAnchor="middle"
                        className="fill-white font-bold select-none pointer-events-none"
                      >
                        <tspan x={node.x} dy="-0.4em" className="text-sm font-black tracking-tight">
                          {truncate(node.name, 12)}
                        </tspan>
                        <tspan x={node.x} dy="1.3em" className="text-xs font-semibold fill-slate-100">
                          {node.points} pts
                        </tspan>
                      </text>
                    </g>
                  );
                })}
              </svg>
            )}
          </div>
        </Card>
      </div>

      {/* Dialog: Confirm Join */}
      <Dialog open={selectedCircle !== null} onOpenChange={(open) => { if (!open) setSelectedCircle(null); }}>
        {selectedCircle && (
          <DialogContent className="bg-white border-slate-200 text-slate-900 rounded-2xl p-6 max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold tracking-tight text-slate-900">
                Join {selectedCircle.name}
              </DialogTitle>
              <DialogDescription className="text-slate-500 mt-2">
                Are you sure you want to join this StudyCircle? You'll collaborate on roadmaps, daily quests, and monthly missions.
              </DialogDescription>
            </DialogHeader>

            <div className="my-5 p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold text-slate-500">Points</span>
                <span className="text-sm font-bold text-slate-900">{selectedCircle.points} pts</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold text-slate-500">Members</span>
                <span className="text-sm font-bold text-slate-900">{selectedCircle.member_count} / 10</span>
              </div>
              <p className="text-sm text-slate-700 mt-2 italic">
                "{selectedCircle.description}"
              </p>
            </div>

            <DialogFooter className="flex gap-2 sm:justify-end">
              <Button variant="outline" onClick={() => setSelectedCircle(null)} className="border-slate-200 text-slate-700 hover:bg-slate-50">
                Cancel
              </Button>
              <Button
                onClick={() => handleJoinCircle(selectedCircle.id)}
                disabled={isJoining || selectedCircle.member_count >= 10}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
              >
                {isJoining ? "Joining..." : selectedCircle.member_count >= 10 ? "Circle Full" : "Confirm Join"}
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>

      {/* Dialog: Create Circle */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="bg-white border-slate-200 text-slate-900 rounded-2xl p-6 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold tracking-tight text-slate-900">
              Create a new StudyCircle
            </DialogTitle>
            <DialogDescription className="text-slate-500 mt-2">
              Start a new circle for Class 10 Mathematics. You will be the creator and first member.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateCircleSubmit} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="circle-name" className="text-sm font-semibold text-slate-700">
                Circle Name
              </Label>
              <Input
                id="circle-name"
                required
                placeholder="e.g. Math Mavericks"
                value={newCircleName}
                onChange={(e) => setNewCircleName(e.target.value)}
                className="border-slate-200 focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="circle-desc" className="text-sm font-semibold text-slate-700">
                Description
              </Label>
              <textarea
                id="circle-desc"
                required
                placeholder="e.g. Master trigonometry and algebra together."
                value={newCircleDesc}
                onChange={(e) => setNewCircleDesc(e.target.value)}
                className="w-full min-h-[80px] p-3 rounded-md border border-slate-200 text-sm focus:border-indigo-500 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            {createError && (
              <Alert variant="destructive" className="mt-2">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{createError}</AlertDescription>
              </Alert>
            )}

            <DialogFooter className="flex gap-2 sm:justify-end pt-4">
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)} className="border-slate-200 text-slate-700 hover:bg-slate-50">
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isCreating}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
              >
                {isCreating ? "Creating..." : "Create Circle"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
