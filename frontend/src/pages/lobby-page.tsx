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
import { cn } from "@/lib/utils";

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

  // Membership State
  const { data: membershipData, isLoading: membershipLoading } = useQuery({
    queryKey: ["membership"],
    queryFn: api.getMembership,
  });
  const membership = membershipData?.membership;

  // Dialog States
  const [selectedCircle, setSelectedCircle] = useState<CircleLeaderboardEntry | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Form states for creating circle
  const [newCircleName, setNewCircleName] = useState("");
  const [newCircleDesc, setNewCircleDesc] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);

  // Hover state for constellation (must be declared before early returns)
  const [hoveredNode, setHoveredNode] = useState<number | null>(null);

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

  if (circlesLoading || membershipLoading) {
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

  // Clustered Constellation Leaderboard Placement Logic
  const displayCircles = circles.slice(0, 35);
  
  const positions = displayCircles.map((circle, index) => {
    // Deterministic placement for clustered network
    if (index === 0) {
      return { ...circle, x: 330, y: 170, r: 42, color: "#4F46E5", cluster: 0 }; // Indigo
    }
    if (index === 1) {
      return { ...circle, x: 470, y: 200, r: 42, color: "#0EA5E9", cluster: 0 }; // Sky Blue
    }
    if (index === 2) {
      return { ...circle, x: 400, y: 275, r: 42, color: "#10B981", cluster: 0 }; // Emerald
    }
    
    // Distribute into 3 clusters
    const clusterId = (index % 3) + 1;
    const clusterIndex = Math.floor((index - 3) / 3); // 0, 1, 2, ...
    
    let cx = 0, cy = 0;
    let color = "";
    let innerOffset = 0;
    let outerOffset = 0;
    
    if (clusterId === 1) {
      // Cluster 1: Purple (Left side)
      cx = 160;
      cy = 210;
      color = index % 2 === 0 ? "#8B5CF6" : "#A78BFA";
      innerOffset = 0;
      outerOffset = 0;
    } else if (clusterId === 2) {
      // Cluster 2: Blue (Right side)
      cx = 640;
      cy = 210;
      color = index % 2 === 0 ? "#2563EB" : "#60A5FA";
      innerOffset = 0;
      outerOffset = 0;
    } else {
      // Cluster 3: Pink/Cyan (Bottom/Center)
      cx = 400;
      cy = 380;
      color = index % 2 === 0 ? "#EC4899" : "#06B6D4";
      innerOffset = Math.PI / 4; // rotate to avoid straight up overlap
      outerOffset = Math.PI / 6;
    }
    
    let angle = 0;
    let dist = 0;
    let r = 18;
    
    if (clusterIndex < 4) {
      // Inner ring (4 nodes)
      angle = (clusterIndex * Math.PI) / 2 + innerOffset;
      dist = 52;
      r = 20;
    } else {
      // Outer ring (remaining nodes)
      const outerIndex = clusterIndex - 4;
      angle = (outerIndex * Math.PI) / 3.5 + outerOffset;
      dist = 92;
      r = 16;
    }
    
    const x = cx + Math.cos(angle) * dist;
    const y = cy + Math.sin(angle) * dist;
    
    return {
      ...circle,
      x,
      y,
      r,
      color,
      cluster: clusterId,
    };
  });

  const connections: Array<{ from: number; to: number }> = [];
  if (positions.length > 0) {
    // 1. Connect central nodes
    if (positions.length > 1) connections.push({ from: 0, to: 1 });
    if (positions.length > 2) {
      connections.push({ from: 0, to: 2 });
      connections.push({ from: 1, to: 2 });
    }
    
    // 2. Connect clusters to central nodes
    if (positions.length > 3) connections.push({ from: 0, to: 3 });
    if (positions.length > 4) connections.push({ from: 1, to: 4 });
    if (positions.length > 5) connections.push({ from: 2, to: 5 });
    
    // 3. Connect nodes within clusters
    for (let i = 3; i < positions.length; i++) {
      if (i + 3 < positions.length) {
        connections.push({ from: i, to: i + 3 });
      }
      if (i + 6 < positions.length && i % 2 === 0) {
        connections.push({ from: i, to: i + 6 });
      }
    }
  }



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
              {membership ? (
                `You are a member of ${membership.circle_name}. You can explore other circles or return to your dashboard.`
              ) : (
                "You are not in a StudyCircle yet. Choose one from the leaderboard constellation or start your own."
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {membership ? (
              <Button
                onClick={() => navigate(`/app/study-circle/${membership.circle_id}`)}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-11"
              >
                Go to My Circle
              </Button>
            ) : (
              <Button
                onClick={() => setIsCreateOpen(true)}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-11"
              >
                <PlusCircle className="mr-2 h-4 w-4" /> Create a Circle
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Explore Circles Card */}
        <Card className="border-indigo-100 shadow-sm bg-indigo-50 text-indigo-950">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2 text-indigo-700">
              <Sparkles className="h-4 w-4 fill-indigo-700" />
              <span className="text-xs font-bold uppercase tracking-wider">Discover Cohorts</span>
            </div>
            <CardTitle className="text-xl font-extrabold tracking-tight mt-1 text-indigo-950">
              Explore Study Circles
            </CardTitle>
            <CardDescription className="text-indigo-800/80">
              Find and join existing study circles in Class 10 Mathematics.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm leading-relaxed text-indigo-900">
              Browse the list of all available circles, check their active members, see points leaderboards, and find the perfect team to study with.
            </p>
            <Button
              onClick={() => navigate("/app/study-circle/explore")}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-10"
            >
              Explore Circles
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Interactive Constellation Leaderboard */}
      <div className="space-y-4">
        <div className="flex justify-between items-center px-2">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900">StudyCircles Leaderboard</h2>
            <p className="text-xs text-slate-500 mt-0.5">Sized by circle points. Click a bubble to view details and join.</p>
          </div>
        </div>

        <Card className="border-slate-200 overflow-hidden bg-slate-50/50 shadow-sm relative">
          <div className="relative w-full aspect-[8/5] min-h-[350px]">
            {circles.length === 0 ? (
              <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-sm font-semibold">
                No StudyCircles found. Create the first one!
              </div>
            ) : (
              <>
                <svg
                  viewBox="0 0 800 500"
                  className="w-full h-full select-none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  {/* Constellation Connection Lines */}
                  {connections.map((conn, idx) => {
                    const fromNode = positions[conn.from];
                    const toNode = positions[conn.to];
                    if (!fromNode || !toNode) return null;
                    
                    const isHighlighted = hoveredNode === conn.from || hoveredNode === conn.to;
                    return (
                      <line
                        key={`link-${idx}`}
                        x1={fromNode.x}
                        y1={fromNode.y}
                        x2={toNode.x}
                        y2={toNode.y}
                        className={cn(
                          "transition-all duration-300",
                          isHighlighted ? "stroke-indigo-500 stroke-[2]" : "stroke-slate-200/80 stroke-[1.5]"
                        )}
                      />
                    );
                  })}

                  {/* Interactive Circle Bubbles */}
                  {positions.map((node, index) => {
                    const isHovered = hoveredNode === index;
                    return (
                      <g
                        key={node.id}
                        className="transition-transform duration-300 hover:scale-[1.08] cursor-pointer origin-center"
                        style={{
                          transformBox: "fill-box",
                          transformOrigin: "center",
                        }}
                        onMouseEnter={() => setHoveredNode(index)}
                        onMouseLeave={() => setHoveredNode(null)}
                        onClick={() => setSelectedCircle(node)}
                      >
                        <circle
                          cx={node.x}
                          cy={node.y}
                          r={node.r}
                          fill={node.color}
                          className="stroke-white stroke-[3] transition-all duration-300"
                        />
                        
                        {/* Display text inside circles only if they are medium/large */}
                        {node.r >= 32 ? (
                          <text
                            x={node.x}
                            y={node.y}
                            textAnchor="middle"
                            className="fill-white font-bold select-none pointer-events-none text-center"
                          >
                            <tspan x={node.x} dy="-0.3em" className="text-[10px] font-black tracking-tight">
                              {truncate(node.name, 10)}
                            </tspan>
                            <tspan x={node.x} dy="1.2em" className="text-[9px] font-bold fill-slate-100">
                              {node.points} pts
                            </tspan>
                          </text>
                        ) : (
                          // For small circles, show their rank
                          <text
                            x={node.x}
                            y={node.y + 3.5}
                            textAnchor="middle"
                            className="fill-white font-black text-[9px] select-none pointer-events-none"
                          >
                            {index + 1}
                          </text>
                        )}
                      </g>
                    );
                  })}
                </svg>

                {/* Floating Tooltip */}
                {hoveredNode !== null && positions[hoveredNode] && (
                  <div
                    className="absolute bg-slate-900 text-white text-xs rounded-lg py-1.5 px-3 pointer-events-none shadow-md z-10 -translate-x-1/2 -translate-y-full flex flex-col gap-0.5 border border-slate-800 transition-all duration-200"
                    style={{
                      left: `${positions[hoveredNode].x}px`,
                      top: `${positions[hoveredNode].y - positions[hoveredNode].r - 6}px`,
                    }}
                  >
                    <span className="font-bold text-slate-100">{positions[hoveredNode].name}</span>
                    <span className="text-[10px] text-indigo-300 font-semibold">
                      Rank #{hoveredNode + 1} · {positions[hoveredNode].points} pts · {positions[hoveredNode].member_count}/10 members
                    </span>
                  </div>
                )}
              </>
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
                disabled={isJoining || selectedCircle.member_count >= 10 || !!membership}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
              >
                {isJoining ? "Joining..." : selectedCircle.member_count >= 10 ? "Circle Full" : membership ? "Already in a Circle" : "Confirm Join"}
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
