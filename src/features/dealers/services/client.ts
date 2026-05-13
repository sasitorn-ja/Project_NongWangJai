function toReadableMessage(value: unknown): string | undefined {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || undefined;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (value && typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }

  return undefined;
}

async function extractErrorMessage(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";

  try {
    if (contentType.includes("application/json")) {
      const payload = (await response.json()) as { error?: unknown; message?: unknown; details?: unknown };
      const message =
        toReadableMessage(payload.error) ??
        toReadableMessage(payload.message) ??
        toReadableMessage(payload.details) ??
        toReadableMessage(payload);

      if (message) return message;
    } else {
      const text = (await response.text()).trim();
      if (text) return text;
    }
  } catch {
    // Ignore body parsing issues and fall back to status-based messaging.
  }

  return `API responded ${response.status}`;
}

export async function requestJson<T>(input: string): Promise<T> {
  const response = await fetch(input, {
    headers: { Accept: "application/json" }
  });

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response));
  }

  return (await response.json()) as T;
}
