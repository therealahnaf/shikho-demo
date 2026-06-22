from __future__ import annotations

import uuid
from datetime import date, datetime
from typing import Any, Literal

from pydantic import BaseModel, Field


class MemberUser(BaseModel):
    id: uuid.UUID
    username: str
    display_name: str


class MissionPreview(BaseModel):
    title: str
    target: int
    progress: int


class CircleRecommendation(BaseModel):
    id: uuid.UUID
    name: str
    class_level: str
    subject: str
    description: str
    member_count: int
    mission: MissionPreview


class RecommendedCircleResponse(BaseModel):
    data: CircleRecommendation | None
    reason: str | None


class MembershipSummary(BaseModel):
    id: uuid.UUID
    circle_id: uuid.UUID
    circle_name: str
    weekly_points: int
    roadmap_position: int
    personal_contribution: int
    joined_at: datetime


class MembershipLookupResponse(BaseModel):
    membership: MembershipSummary | None


class JoinCircleResponse(BaseModel):
    membership: MembershipSummary
    circle_home_path: str


class CircleSummary(BaseModel):
    id: uuid.UUID
    name: str
    class_level: str
    subject: str
    description: str
    member_count: int


class MissionView(BaseModel):
    title: str
    target: int
    progress: int
    percent_complete: int
    ends_at: datetime
    student_contribution: int


class DailyQuestView(BaseModel):
    title: str
    target: int
    progress: int
    percent_complete: int
    local_date: date
    is_complete: bool
    time_remaining_seconds: int


class CircleStreakView(BaseModel):
    days: int


class CheckpointView(BaseModel):
    id: uuid.UUID
    position: int
    title: str
    activity_type: Literal["review", "lesson", "quiz", "challenge", "assignment", "lab"]
    topic_key: str
    status: Literal["completed", "current", "locked"]


class MemberPositionView(BaseModel):
    user: MemberUser
    position: int


class RoadmapPreview(BaseModel):
    id: uuid.UUID
    title: str
    starts_at: datetime
    ends_at: datetime
    checkpoints: list[CheckpointView]
    member_positions: list[MemberPositionView]


class LeaderboardEntry(BaseModel):
    rank: int
    user: MemberUser
    weekly_points: int
    is_current_user: bool
    is_mentor: bool


class LeaderboardPreview(BaseModel):
    entries: list[LeaderboardEntry]
    current_user_rank: int


class ActivityEventView(BaseModel):
    id: uuid.UUID
    event_type: Literal[
        "checkpoint_completed",
        "rank_changed",
        "member_joined",
        "daily_quest_completed",
        "streak_increased",
        "note_created",
        "mentor_selected",
        "roadmap_published",
        "week_started",
    ]
    actor: MemberUser | None
    payload: dict[str, Any]
    created_at: datetime


class CircleHomeResponse(BaseModel):
    circle: CircleSummary
    membership: MembershipSummary
    mission: MissionView
    daily_quest: DailyQuestView
    streak: CircleStreakView
    mentor: MemberUser | None
    roadmap: RoadmapPreview
    leaderboard: LeaderboardPreview
    activity_feed: list[ActivityEventView]
    cycle_status: Literal["active", "finalized"]
    next_roadmap_published: bool


class WeeklyCycleView(BaseModel):
    id: uuid.UUID
    starts_at: datetime
    ends_at: datetime


class RoadmapDetailResponse(BaseModel):
    circle: CircleSummary
    membership: MembershipSummary
    cycle: WeeklyCycleView
    roadmap: RoadmapPreview
    next_checkpoint: CheckpointView | None


class LeaderboardResponse(BaseModel):
    circle: CircleSummary
    cycle: WeeklyCycleView
    entries: list[LeaderboardEntry]
    current_user_rank: int
    mentor: MemberUser | None


class ActivityFeedResponse(BaseModel):
    events: list[ActivityEventView]


class ActivityCompletionView(BaseModel):
    id: uuid.UUID
    checkpoint_id: uuid.UUID
    activity_type: Literal["review", "lesson", "quiz", "challenge", "assignment", "lab"]
    points_awarded: int
    completed_at: datetime


class CompletionResponse(BaseModel):
    completion: ActivityCompletionView
    points_added: int
    previous_rank: int
    current_rank: int
    membership: MembershipSummary
    mission: MissionView
    daily_quest: DailyQuestView
    streak: CircleStreakView
    streak_increased: bool
    next_checkpoint: CheckpointView | None


class MentorTermView(BaseModel):
    id: uuid.UUID
    circle_id: uuid.UUID
    weekly_cycle_id: uuid.UUID
    mentor_user_id: uuid.UUID
    final_rank: int
    final_points: int
    selected_at: datetime


class WorkspaceTopic(BaseModel):
    key: str
    name: str


class WorkspaceNote(BaseModel):
    id: uuid.UUID
    title: str
    category: str
    author_name: str
    helpful_count: int


class PlannedCheckpoint(BaseModel):
    topic_key: str
    activity_type: Literal["review", "lesson", "quiz", "challenge", "assignment", "lab"]


class PlannedRoadmapView(BaseModel):
    title: str
    mentor_pick_note_id: uuid.UUID | None
    checkpoints: list[PlannedCheckpoint]


class MentorWorkspaceResponse(BaseModel):
    current_term: MentorTermView
    topics: list[WorkspaceTopic]
    activity_types: list[str]
    notes: list[WorkspaceNote]
    planned_roadmap: PlannedRoadmapView | None


class PublishRoadmapCheckpoint(BaseModel):
    topic_key: str
    activity_type: Literal["review", "lesson", "quiz", "challenge", "assignment", "lab"]


class PublishRoadmapRequest(BaseModel):
    title: str
    mentor_pick_note_id: uuid.UUID | None
    checkpoints: list[PublishRoadmapCheckpoint]


class CircleLeaderboardEntry(BaseModel):
    id: uuid.UUID
    name: str
    description: str
    member_count: int
    points: int
    class_level: str
    subject: str


class CircleLeaderboardResponse(BaseModel):
    circles: list[CircleLeaderboardEntry]


class CreateCircleRequest(BaseModel):
    name: str
    description: str
    chapter_key: Literal[
        "real_numbers",
        "algebraic_expressions",
        "linear_equations",
        "geometry",
        "trigonometry",
    ]
    actions: list[Literal["review", "quiz", "assignment", "lab"]] = Field(
        min_length=1, max_length=5
    )


class LeaveCircleResponse(BaseModel):
    success: bool
    message: str


class CircleMembersResponse(BaseModel):
    members: list[MemberUser]

