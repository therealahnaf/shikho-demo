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
  username: "demo_student",
  display_name: "Demo Student",
  class_level: "class_10",
  curriculum: "nctb_bangla",
  preferred_subject: "mathematics",
  school_name: null,
  created_at: "2026-06-21T10:00:00Z",
};

test("validates onboarding and maps duplicate username errors", async () => {
  const user = userEvent.setup();
  vi.spyOn(globalThis, "fetch").mockImplementation(() =>
    jsonResponse(
      {
        code: "username_taken",
        message: "That username is already in use.",
        fields: { username: "Choose a different username." },
      },
      409,
    ),
  );
  renderApp("/demo/onboarding");

  await user.click(screen.getByRole("button", { name: /create demo identity/i }));
  expect(await screen.findByText("Use at least 3 characters.")).toBeInTheDocument();
  expect(screen.getByText("Enter your display name.")).toBeInTheDocument();

  await user.type(screen.getByLabelText("Username"), "demo_student");
  await user.type(screen.getByLabelText("Display name"), "Demo Student");
  await user.click(screen.getByRole("button", { name: /create demo identity/i }));
  expect(await screen.findByText("Choose a different username.")).toBeInTheDocument();
  expect(screen.getByText("That username is already in use.")).toBeInTheDocument();
});

test("creates identity and persists credentials", async () => {
  const user = userEvent.setup();
  vi.spyOn(globalThis, "fetch").mockImplementation(() =>
    jsonResponse({ user: publicUser, access_key: "SC-ABCD-EFGH" }, 201),
  );
  renderApp("/demo/onboarding");

  await user.type(screen.getByLabelText("Username"), "Demo_Student");
  await user.type(screen.getByLabelText("Display name"), "Demo Student");
  await user.click(screen.getByRole("button", { name: /create demo identity/i }));

  expect(await screen.findByText("Keep this key close.")).toBeInTheDocument();
  expect(localStorage.getItem(USERNAME_KEY)).toBe("demo_student");
  expect(localStorage.getItem(ACCESS_KEY)).toBe("SC-ABCD-EFGH");
});

test("requires key acknowledgement and copies the key", async () => {
  localStorage.setItem(USERNAME_KEY, "demo_student");
  localStorage.setItem(ACCESS_KEY, "SC-ABCD-EFGH");
  const user = userEvent.setup();
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
  renderApp("/demo/access-key");

  const enterButton = screen.getByRole("button", { name: /enter studycircle/i });
  expect(enterButton).toBeDisabled();
  await user.click(screen.getByRole("button", { name: /copy key/i }));
  expect(writeText).toHaveBeenCalledWith("SC-ABCD-EFGH");
  expect(await screen.findByText("Key copied to your clipboard.")).toBeInTheDocument();
  await user.click(screen.getByRole("checkbox", { name: /i saved my access key/i }));
  expect(enterButton).toBeEnabled();
});

test("shows the same login error for an invalid key", async () => {
  const user = userEvent.setup();
  vi.spyOn(globalThis, "fetch").mockImplementation(() =>
    jsonResponse(
      { code: "invalid_demo_access", message: "Username or key is incorrect.", fields: {} },
      401,
    ),
  );
  renderApp("/demo/login");

  await user.type(screen.getByLabelText("Username"), "demo_student");
  await user.type(screen.getByLabelText("Access key"), "SC-AAAA-AAAA");
  await user.click(screen.getByRole("button", { name: /enter studycircle/i }));
  expect(await screen.findByText("Username or key is incorrect.")).toBeInTheDocument();
  expect(localStorage.getItem(USERNAME_KEY)).toBeNull();
});

test("restores a valid identity and leave demo clears credentials", async () => {
  localStorage.setItem(USERNAME_KEY, "demo_student");
  localStorage.setItem(ACCESS_KEY, "SC-ABCD-EFGH");
  vi.spyOn(globalThis, "fetch").mockImplementation(() => jsonResponse(publicUser));
  const user = userEvent.setup();
  renderApp("/app");

  expect(await screen.findByText("Welcome, Demo Student.")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: /leave demo/i }));
  expect(localStorage.getItem(USERNAME_KEY)).toBeNull();
  expect(localStorage.getItem(ACCESS_KEY)).toBeNull();
  expect(await screen.findByText(/Study feels/i)).toBeInTheDocument();
});

test("invalid stored credentials are removed and routed to login", async () => {
  localStorage.setItem(USERNAME_KEY, "demo_student");
  localStorage.setItem(ACCESS_KEY, "SC-AAAA-AAAA");
  vi.spyOn(globalThis, "fetch").mockImplementation(() =>
    jsonResponse(
      { code: "invalid_demo_access", message: "Username or key is incorrect.", fields: {} },
      401,
    ),
  );
  renderApp("/app");

  expect(await screen.findByText("Return to your circle")).toBeInTheDocument();
  await waitFor(() => expect(localStorage.getItem(USERNAME_KEY)).toBeNull());
  expect(localStorage.getItem(ACCESS_KEY)).toBeNull();
});
