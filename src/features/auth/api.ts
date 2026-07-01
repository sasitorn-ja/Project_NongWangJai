import type { AuthSessionResponse } from "./types";
import { apiPath } from "@/lib/base-path";

export async function fetchAuthSession() {
  const response = await fetch(apiPath("/auth/session"), {
    credentials: "same-origin",
    headers: { Accept: "application/json" }
  });

  if (response.status === 401) {
    return { authenticated: false } satisfies AuthSessionResponse;
  }

  if (!response.ok) {
    throw new Error(`Session check failed with status ${response.status}`);
  }

  return (await response.json()) as AuthSessionResponse;
}
