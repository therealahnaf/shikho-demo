import { getCredentials } from "@/lib/storage";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

export type User = {
  id: string;
  username: string;
  display_name: string;
  class_level: string;
  curriculum: string;
  preferred_subject: string;
  school_name: string | null;
  created_at: string;
};

export type CreateUserInput = {
  username: string;
  display_name: string;
  class_level: "class_10";
  curriculum: "nctb_bangla";
  preferred_subject: "mathematics";
  school_name?: string | null;
};

export type MemberUser = Pick<User, "id" | "username" | "display_name">;

export type ActivityType = "review" | "lesson" | "quiz" | "challenge";

export type Checkpoint = {
  id: string;
  position: number;
  title: string;
  activity_type: ActivityType;
  topic_key: string;
  status: "completed" | "current" | "locked";
};

export type Membership = {
  id: string;
  circle_id: string;
  circle_name: string;
  weekly_points: number;
  roadmap_position: number;
  personal_contribution: number;
  joined_at: string;
};

export type CircleRecommendation = {
  id: string;
  name: string;
  class_level: string;
  subject: string;
  description: string;
  member_count: number;
  mission: { title: string; target: number; progress: number };
};

export type CircleHome = {
  circle: {
    id: string;
    name: string;
    class_level: string;
    subject: string;
    description: string;
    member_count: number;
  };
  membership: Membership;
  mission: {
    title: string;
    target: number;
    progress: number;
    percent_complete: number;
    ends_at: string;
    student_contribution: number;
  };
  daily_quest: {
    title: string;
    target: number;
    progress: number;
    percent_complete: number;
    local_date: string;
    is_complete: boolean;
    time_remaining_seconds: number;
  };
  streak: { days: number };
  mentor: MemberUser | null;
  roadmap: {
    id: string;
    title: string;
    starts_at: string;
    ends_at: string;
    checkpoints: Checkpoint[];
    member_positions: Array<{ user: MemberUser; position: number }>;
  };
  leaderboard: {
    entries: Array<{
      rank: number;
      user: MemberUser;
      weekly_points: number;
      is_current_user: boolean;
      is_mentor: boolean;
    }>;
    current_user_rank: number;
  };
  activity_feed: Array<{
    id: string;
    event_type:
      | "checkpoint_completed"
      | "rank_changed"
      | "member_joined"
      | "daily_quest_completed"
      | "streak_increased"
      | "note_created"
      | "mentor_selected"
      | "roadmap_published"
      | "week_started";
    actor: MemberUser | null;
    payload: Record<string, unknown>;
    created_at: string;
  }>;
  cycle_status: "active" | "finalized";
  next_roadmap_published: boolean;
};

export type RoadmapDetail = {
  circle: CircleHome["circle"];
  membership: Membership;
  cycle: { id: string; starts_at: string; ends_at: string };
  roadmap: CircleHome["roadmap"];
  next_checkpoint: Checkpoint | null;
};

export type LeaderboardDetail = {
  circle: CircleHome["circle"];
  cycle: { id: string; starts_at: string; ends_at: string };
  entries: CircleHome["leaderboard"]["entries"];
  current_user_rank: number;
  mentor: MemberUser | null;
};

export type ActivityFeed = { events: CircleHome["activity_feed"] };
export type ActivityEvent = CircleHome["activity_feed"][number];

export type CompletionResult = {
  completion: {
    id: string;
    checkpoint_id: string;
    activity_type: ActivityType;
    points_awarded: number;
    completed_at: string;
  };
  points_added: number;
  previous_rank: number;
  current_rank: number;
  membership: Membership;
  mission: CircleHome["mission"];
  daily_quest: CircleHome["daily_quest"];
  streak: CircleHome["streak"];
  streak_increased: boolean;
  next_checkpoint: Checkpoint | null;
};

export type ApiErrorBody = {
  code: string;
  message: string;
  fields: Record<string, string>;
};

export class ApiError extends Error {
  status: number;
  code: string;
  fields: Record<string, string>;

  constructor(status: number, body: ApiErrorBody) {
    super(body.message);
    this.name = "ApiError";
    this.status = status;
    this.code = body.code;
    this.fields = body.fields;
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  protectedRequest = false,
): Promise<T> {
  const headers = new Headers(options.headers);
  if (!(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  if (protectedRequest) {
    const credentials = getCredentials();
    if (credentials) {
      headers.set("X-Demo-Username", credentials.username);
      headers.set("X-Demo-Access-Key", credentials.accessKey);
    }
  }

  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const fallback: ApiErrorBody = {
      code: "request_failed",
      message: "We could not complete that request. Please try again.",
      fields: {},
    };
    throw new ApiError(response.status, body ?? fallback);
  }
  return body as T;
}

async function requestBlob(path: string): Promise<Blob> {
  const headers = new Headers();
  const credentials = getCredentials();
  if (credentials) {
    headers.set("X-Demo-Username", credentials.username);
    headers.set("X-Demo-Access-Key", credentials.accessKey);
  }
  const response = await fetch(`${API_BASE_URL}${path}`, { headers });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new ApiError(response.status, body ?? { code: "request_failed", message: "We could not load that image.", fields: {} });
  }
  return response.blob();
}

export type NoteCategory = "chapter_1" | "chapter_2" | "formulas" | "revision_notes" | "important_questions";
export type CircleNote = {
  id: string;
  title: string;
  category: NoteCategory;
  content_type: "text" | "image";
  author: MemberUser;
  helpful_count: number;
  helpful_by_me: boolean;
  is_own_note: boolean;
  created_at: string;
};
export type CircleNoteDetail = CircleNote & { text_content: string | null; image_url: string | null };
export type CreateNoteResult = { note: CircleNoteDetail; points_added: number; previous_rank: number; current_rank: number };

export const api = {
  createUser(input: CreateUserInput) {
    return request<{ user: User; access_key: string }>("/api/v1/demo-users", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },
  verify(username: string, accessKey: string) {
    return request<User>("/api/v1/demo-sessions/verify", {
      method: "POST",
      body: JSON.stringify({ username, access_key: accessKey }),
    });
  },
  getMe() {
    return request<User>("/api/v1/me", {}, true);
  },
  getMembership() {
    return request<{ membership: Membership | null }>(
      "/api/v1/me/circle-membership",
      {},
      true,
    );
  },
  getRecommendedCircle() {
    return request<{ data: CircleRecommendation | null; reason: string | null }>(
      "/api/v1/circles/recommended",
      {},
      true,
    );
  },
  joinCircle(circleId: string) {
    return request<{ membership: Membership; circle_home_path: string }>(
      `/api/v1/circles/${circleId}/join`,
      { method: "POST" },
      true,
    );
  },
  getCircleHome(circleId: string) {
    return request<CircleHome>(`/api/v1/circles/${circleId}/home`, {}, true);
  },
  getRoadmap(circleId: string) {
    return request<RoadmapDetail>(
      `/api/v1/circles/${circleId}/roadmap`,
      {},
      true,
    );
  },
  getLeaderboard(circleId: string) {
    return request<LeaderboardDetail>(
      `/api/v1/circles/${circleId}/leaderboard`,
      {},
      true,
    );
  },
  getActivityFeed(circleId: string, limit = 20) {
    return request<ActivityFeed>(
      `/api/v1/circles/${circleId}/activity-feed?limit=${limit}`,
      {},
      true,
    );
  },
  completeCheckpoint(circleId: string, checkpointId: string) {
    return request<CompletionResult>(
      `/api/v1/circles/${circleId}/checkpoints/${checkpointId}/complete`,
      { method: "POST" },
      true,
    );
  },
  getNotes(circleId: string, category?: NoteCategory) {
    const query = category ? `?category=${category}` : "";
    return request<{ notes: CircleNote[] }>(`/api/v1/circles/${circleId}/notes${query}`, {}, true);
  },
  getNote(circleId: string, noteId: string) {
    return request<CircleNoteDetail>(`/api/v1/circles/${circleId}/notes/${noteId}`, {}, true);
  },
  createNote(circleId: string, data: FormData, idempotencyKey: string) {
    return request<CreateNoteResult>(`/api/v1/circles/${circleId}/notes`, {
      method: "POST",
      headers: { "Idempotency-Key": idempotencyKey },
      body: data,
    }, true);
  },
  getNoteImage(path: string) {
    return requestBlob(path);
  },
  setNoteHelpful(circleId: string, noteId: string, helpful: boolean) {
    return request<{ note_id: string; helpful_count: number; helpful_by_me: boolean }>(
      `/api/v1/circles/${circleId}/notes/${noteId}/helpful`,
      { method: helpful ? "PUT" : "DELETE" },
      true,
    );
  },
  finalizeWeek(circleId: string) {
    return request<MentorTerm>(`/api/v1/demo/circles/${circleId}/finalize-week`, {
      method: "POST"
    }, true);
  },
  getMentorWorkspace(circleId: string) {
    return request<MentorWorkspace>(`/api/v1/circles/${circleId}/mentor-workspace`, {}, true);
  },
  publishNextRoadmap(circleId: string, input: PublishRoadmapInput, idempotencyKey?: string) {
    const headers: Record<string, string> = {};
    if (idempotencyKey) {
      headers["Idempotency-Key"] = idempotencyKey;
    }
    return request<PlannedRoadmap>(`/api/v1/circles/${circleId}/next-roadmap`, {
      method: "POST",
      headers,
      body: JSON.stringify(input),
    }, true);
  },
  startNextWeek(circleId: string) {
    return request<CircleHome>(`/api/v1/demo/circles/${circleId}/start-next-week`, {
      method: "POST"
    }, true);
  },
};

export type MentorTerm = {
  id: string;
  circle_id: string;
  weekly_cycle_id: string;
  mentor_user_id: string;
  final_rank: number;
  final_points: number;
  selected_at: string;
};

export type WorkspaceTopic = {
  key: string;
  name: string;
};

export type WorkspaceNote = {
  id: string;
  title: string;
  category: string;
  author_name: string;
  helpful_count: number;
};

export type PlannedCheckpoint = {
  topic_key: string;
  activity_type: ActivityType;
};

export type PlannedRoadmap = {
  title: string;
  mentor_pick_note_id: string | null;
  checkpoints: PlannedCheckpoint[];
};

export type MentorWorkspace = {
  current_term: MentorTerm;
  topics: WorkspaceTopic[];
  activity_types: string[];
  notes: WorkspaceNote[];
  planned_roadmap: PlannedRoadmap | null;
};

export type PublishRoadmapInput = {
  title: string;
  mentor_pick_note_id: string | null;
  checkpoints: PlannedCheckpoint[];
};

