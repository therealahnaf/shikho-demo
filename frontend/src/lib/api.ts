import { getCredentials } from "@/lib/storage";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

export type DemoUser = {
  id: string;
  username: string;
  display_name: string;
  class_level: string;
  curriculum: string;
  preferred_subject: string;
  school_name: string | null;
  created_at: string;
};

export type CreateDemoUserInput = {
  username: string;
  display_name: string;
  class_level: "class_10";
  curriculum: "nctb_bangla";
  preferred_subject: "mathematics";
  school_name?: string | null;
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
  headers.set("Content-Type", "application/json");

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

export const api = {
  createDemoUser(input: CreateDemoUserInput) {
    return request<{ user: DemoUser; access_key: string }>("/api/v1/demo-users", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },
  verify(username: string, accessKey: string) {
    return request<DemoUser>("/api/v1/demo-sessions/verify", {
      method: "POST",
      body: JSON.stringify({ username, access_key: accessKey }),
    });
  },
  getMe() {
    return request<DemoUser>("/api/v1/me", {}, true);
  },
};

