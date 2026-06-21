import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

import { AppRoutes } from "@/app";
import { ACCESS_KEY, USERNAME_KEY } from "@/lib/storage";

function renderApp(route: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[route]}>
        <AppRoutes />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve(
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );
}

const publicUser = {
  id: "b26d8606-c349-4a2d-b331-7737f36ef7c1",
  username: "amina_student",
  display_name: "Amina Rahman",
  class_level: "class_10",
  curriculum: "nctb_bangla",
  preferred_subject: "mathematics",
  school_name: null,
  created_at: "2026-06-21T10:00:00Z",
};

const circleId = "20000000-0000-0000-0000-000000000001";
const membership = {
  id: "30000000-0000-0000-0000-000000000099",
  circle_id: circleId,
  circle_name: "Math Champions",
  weekly_points: 0,
  roadmap_position: 0,
  personal_contribution: 0,
  joined_at: "2026-06-21T10:00:00Z",
};

const recommendation = {
  data: {
    id: circleId,
    name: "Math Champions",
    class_level: "class_10",
    subject: "mathematics",
    description: "A focused circle for Class 10 students.",
    member_count: 5,
    mission: { title: "Complete 50 roadmap activities together", target: 50, progress: 31 },
  },
  reason: null,
};

const circleHome = {
  circle: { ...recommendation.data, member_count: 6 },
  membership,
  mission: {
    title: "Complete 50 roadmap activities together",
    target: 50,
    progress: 31,
    percent_complete: 62,
    ends_at: "2026-06-30T18:00:00Z",
    student_contribution: 0,
  },
  daily_quest: {
    title: "Complete 5 roadmap activities today",
    target: 5,
    progress: 2,
    percent_complete: 40,
    local_date: "2026-06-21",
    is_complete: false,
    time_remaining_seconds: 21600,
  },
  streak: { days: 7 },
  mentor: { id: "1", username: "nabila_fixture", display_name: "Nabila" },
  roadmap: {
    id: "7",
    title: "Algebra Foundations Week",
    starts_at: "2026-06-15T18:00:00Z",
    ends_at: "2026-06-22T18:00:00Z",
    checkpoints: [
      { id: "81", position: 0, title: "Review Algebra Basics", activity_type: "review", topic_key: "algebra", status: "current" },
      { id: "82", position: 1, title: "Explore Linear Equations", activity_type: "lesson", topic_key: "linear", status: "locked" },
      { id: "83", position: 2, title: "Practice Quiz", activity_type: "quiz", topic_key: "quiz", status: "locked" },
      { id: "84", position: 3, title: "Review Common Mistakes", activity_type: "review", topic_key: "mistakes", status: "locked" },
      { id: "85", position: 4, title: "Weekly Algebra Challenge", activity_type: "challenge", topic_key: "challenge", status: "locked" },
    ],
    member_positions: [
      { user: { id: publicUser.id, username: publicUser.username, display_name: publicUser.display_name }, position: 0 },
      { user: { id: "1", username: "nabila_fixture", display_name: "Nabila" }, position: 4 },
    ],
  },
  leaderboard: {
    entries: [
      { rank: 1, user: { id: "1", username: "nabila_fixture", display_name: "Nabila" }, weekly_points: 240, is_current_user: false, is_mentor: true },
      { rank: 6, user: { id: publicUser.id, username: publicUser.username, display_name: publicUser.display_name }, weekly_points: 0, is_current_user: true, is_mentor: false },
    ],
    current_user_rank: 6,
  },
  activity_feed: [
    { id: "91", event_type: "checkpoint_completed", actor: { id: "1", username: "nabila_fixture", display_name: "Nabila" }, payload: { checkpoint_title: "Review Common Mistakes" }, created_at: new Date().toISOString() },
  ],
};

function setCredentials() {
  localStorage.setItem(USERNAME_KEY, publicUser.username);
  localStorage.setItem(ACCESS_KEY, "SC-ABCD-EFGH");
}

function mockAuthenticatedApi(options?: { membership?: boolean; home?: boolean }) {
  let joined = Boolean(options?.membership);
  return vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
    const url = String(input);
    if (url.endsWith("/api/v1/me")) return jsonResponse(publicUser);
    if (url.endsWith("/api/v1/me/circle-membership")) {
      return jsonResponse({ membership: joined ? membership : null });
    }
    if (url.endsWith("/api/v1/circles/recommended")) return jsonResponse(recommendation);
    if (url.endsWith(`/api/v1/circles/${circleId}/home`)) return jsonResponse(circleHome);
    if (url.endsWith(`/api/v1/circles/${circleId}/join`) && init?.method === "POST") {
      joined = true;
      return jsonResponse({ membership, circle_home_path: `/app/study-circle/${circleId}` }, 201);
    }
    throw new Error(`Unhandled request: ${url}`);
  });
}

test("uses production-facing copy and redirects legacy onboarding URL", async () => {
  renderApp("/demo/onboarding");
  expect(await screen.findByRole("heading", { name: "Tell your circle who you are." })).toBeInTheDocument();
  expect(screen.queryByText(/\bdemo\b/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/phase \d/i)).not.toBeInTheDocument();
});

test("validates onboarding and maps duplicate username errors", async () => {
  const user = userEvent.setup();
  vi.spyOn(globalThis, "fetch").mockImplementation(() =>
    jsonResponse(
      { code: "username_taken", message: "That username is already in use.", fields: { username: "Choose a different username." } },
      409,
    ),
  );
  renderApp("/onboarding");
  await user.click(screen.getByRole("button", { name: /create student identity/i }));
  expect(await screen.findByText("Use at least 3 characters.")).toBeInTheDocument();
  await user.type(screen.getByLabelText("Username"), "amina_student");
  await user.type(screen.getByLabelText("Display name"), "Amina Rahman");
  await user.click(screen.getByRole("button", { name: /create student identity/i }));
  expect(await screen.findByText("Choose a different username.")).toBeInTheDocument();
});

test("creates identity and preserves the access-key acknowledgement", async () => {
  const user = userEvent.setup();
  vi.spyOn(globalThis, "fetch").mockImplementation(() => jsonResponse({ user: publicUser, access_key: "SC-ABCD-EFGH" }, 201));
  renderApp("/onboarding");
  await user.type(screen.getByLabelText("Username"), "Amina_Student");
  await user.type(screen.getByLabelText("Display name"), "Amina Rahman");
  await user.click(screen.getByRole("button", { name: /create student identity/i }));
  expect(await screen.findByText("Keep this key close.")).toBeInTheDocument();
  const enterButton = screen.getByRole("button", { name: /enter studycircle/i });
  expect(enterButton).toBeDisabled();
  await user.click(screen.getByRole("checkbox", { name: /i saved my access key/i }));
  expect(enterButton).toBeEnabled();
});

test("invalid login keeps the generic access error", async () => {
  const user = userEvent.setup();
  vi.spyOn(globalThis, "fetch").mockImplementation(() => jsonResponse({ code: "invalid_demo_access", message: "Username or key is incorrect.", fields: {} }, 401));
  renderApp("/login");
  await user.type(screen.getByLabelText("Username"), "amina_student");
  await user.type(screen.getByLabelText("Access key"), "SC-AAAA-AAAA");
  await user.click(screen.getByRole("button", { name: /enter studycircle/i }));
  expect(await screen.findByText("Username or key is incorrect.")).toBeInTheDocument();
});

test("membership resolver sends a new student to the application home", async () => {
  setCredentials();
  mockAuthenticatedApi();
  renderApp("/app");
  expect(await screen.findByText("Good to see you, Amina.")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /explore studycircle/i })).toBeInTheDocument();
});

test("shows recommendation and completes the join flow", async () => {
  setCredentials();
  mockAuthenticatedApi();
  const user = userEvent.setup();
  renderApp("/app/study-circle/recommended");
  expect(await screen.findByText("Math Champions")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: /join circle/i }));
  expect(await screen.findByText("You joined Math Champions.")).toBeInTheDocument();
});

test("renders every Circle Home section and disabled roadmap action", async () => {
  setCredentials();
  mockAuthenticatedApi({ membership: true, home: true });
  renderApp(`/app/study-circle/${circleId}`);
  expect(await screen.findByText("Math Champions")).toBeInTheDocument();
  expect(screen.getByText("Monthly Circle Mission")).toBeInTheDocument();
  expect(screen.getByText("Daily Circle Quest")).toBeInTheDocument();
  expect(screen.getByText("Circle Streak")).toBeInTheDocument();
  expect(screen.getByText("Algebra Foundations Week")).toBeInTheDocument();
  expect(screen.getByText("Leaderboard · This Week")).toBeInTheDocument();
  expect(screen.getByText("Recent Activity")).toBeInTheDocument();
  expect(screen.getByText("Mentor of the Week")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /continue roadmap/i })).toBeDisabled();
  expect(screen.getByText("Roadmap activities are not available yet.")).toBeInTheDocument();
});

test("shows a useful no-recommendation state", async () => {
  setCredentials();
  vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
    const url = String(input);
    if (url.endsWith("/api/v1/me")) return jsonResponse(publicUser);
    if (url.endsWith("/api/v1/circles/recommended")) {
      return jsonResponse({ data: null, reason: "No StudyCircle is available for your current class and subject." });
    }
    throw new Error(`Unhandled request: ${url}`);
  });
  renderApp("/app/study-circle/recommended");
  expect(await screen.findByText("No circle available yet")).toBeInTheDocument();
  expect(screen.getByText("No StudyCircle is available for your current class and subject.")).toBeInTheDocument();
});

test("invalid stored credentials are cleared and routed to login", async () => {
  setCredentials();
  vi.spyOn(globalThis, "fetch").mockImplementation(() => jsonResponse({ code: "invalid_demo_access", message: "Username or key is incorrect.", fields: {} }, 401));
  renderApp("/app");
  expect(await screen.findByText("Return to your circle")).toBeInTheDocument();
  await waitFor(() => expect(localStorage.getItem(USERNAME_KEY)).toBeNull());
  expect(localStorage.getItem(ACCESS_KEY)).toBeNull();
});
