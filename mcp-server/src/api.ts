/**
 * ClassSphere API client.
 *
 * The server keeps exactly one authenticated session in memory: an LLM client
 * signs in once with a campus account, and every later tool call reuses the
 * returned RS256 access token. Credentials never leave this process.
 */
import { API_BASE_URL, DEFAULT_INSTITUTION_CODE, REQUEST_TIMEOUT_MS } from "./constants.js";

export interface SessionUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
  roles?: string[];
  institutional_id?: string;
  department?: string | null;
  section?: string | null;
}

export interface Session {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  user: SessionUser;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  expires_in?: number;
  user: SessionUser;
}

let session: Session | null = null;

export function currentSession(): Session | null {
  return session;
}

export function clearSession(): void {
  session = null;
}

export function httpErrorMessage(status: number, detail?: string): string {
  const suffix = detail ? ` Upstream said: ${detail}` : "";
  switch (status) {
    case 401:
      return `ClassSphere rejected the session (HTTP 401). Call classsphere_login again with your institutional credentials.${suffix}`;
    case 403:
      return `Permission denied (HTTP 403). This account's role cannot read that console. Sign in as the role that owns the data (STUDENT, FACULTY or HOD).${suffix}`;
    case 404:
      return `Not found (HTTP 404). Check the identifier - use the list tools to find valid session/section IDs.${suffix}`;
    case 409:
      return `The request conflicts with the current record state (HTTP 409), for example a finalized attendance session.${suffix}`;
    case 422:
      return `The ClassSphere API rejected the arguments as invalid (HTTP 422).${suffix}`;
    case 503:
      return `ClassSphere is temporarily unavailable (HTTP 503). Retry shortly.${suffix}`;
    default:
      return `The ClassSphere API returned HTTP ${status}.${suffix}`;
  }
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    detail?: string
  ) {
    super(httpErrorMessage(status, detail));
    this.name = "ApiError";
  }
}

async function readErrorDetail(response: Response): Promise<string | undefined> {
  try {
    const body = (await response.json()) as { error?: { message?: string }; detail?: unknown };
    if (body?.error?.message) return body.error.message;
    if (typeof body?.detail === "string") return body.detail;
    return undefined;
  } catch {
    return undefined;
  }
}

export async function apiRequest<T>(
  path: string,
  options: { method?: "GET" | "POST" | "PATCH"; body?: unknown; signal: AbortSignal },
  authenticated = true
): Promise<T> {
  if (authenticated && !session) {
    throw new Error(
      "Not signed in to ClassSphere. Call classsphere_login first with an institutional account " +
        `(demo accounts: student@classsphere.edu / faculty@classsphere.edu / hod@classsphere.edu, ` +
        `institution code ${DEFAULT_INSTITUTION_CODE}).`
    );
  }

  const headers: Record<string, string> = { Accept: "application/json" };
  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  if (authenticated && session) headers.Authorization = `Bearer ${session.accessToken}`;

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: options.method ?? "GET",
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: AbortSignal.any([options.signal, AbortSignal.timeout(REQUEST_TIMEOUT_MS)])
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "TimeoutError") {
      throw new Error(
        `ClassSphere did not respond within ${REQUEST_TIMEOUT_MS / 1000}s. Check that the API is running at ${API_BASE_URL}.`
      );
    }
    if (error instanceof TypeError) {
      throw new Error(
        `Could not reach the ClassSphere API at ${API_BASE_URL}. Start the backend (uvicorn app.main:app) ` +
          "or set CLASSSPHERE_API_URL to the deployed API base URL."
      );
    }
    throw error;
  }

  if (!response.ok) {
    throw new ApiError(response.status, await readErrorDetail(response));
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export async function login(
  identifier: string,
  password: string,
  institutionCode: string,
  selectedRole?: string,
  signal?: AbortSignal
): Promise<Session> {
  const controller = new AbortController();
  const signalToUse = signal ?? controller.signal;
  const payload = {
    email_or_id: identifier,
    password,
    institution_code: institutionCode,
    ...(selectedRole ? { selected_role: selectedRole } : {})
  };
  const data = await apiRequest<LoginResponse>(
    "/auth/login",
    { method: "POST", body: payload, signal: signalToUse },
    false
  );
  session = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + (data.expires_in ?? 900) * 1000,
    user: data.user
  };
  return session;
}

/** Registers an externally minted token (useful for CI and hosted deployments). */
export function adoptToken(token: string, user: SessionUser, expiresIn = 900): Session {
  session = { accessToken: token, refreshToken: "", expiresAt: Date.now() + expiresIn * 1000, user };
  return session;
}

export function requireSession(): Session {
  if (!session) {
    throw new Error(
      "Not signed in. Call classsphere_login first. Demo accounts: student@classsphere.edu, " +
        "faculty@classsphere.edu, hod@classsphere.edu (institution INST-DEMO)."
    );
  }
  return session;
}
