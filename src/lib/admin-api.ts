/**
 * Shared client helpers for admin API calls.
 *
 * Every helper throws an Error whose message is the backend's own message
 * (verbatim) whenever the server provides one, so refusal reasons such as
 * "এই ফি ইভেন্টে পেমেন্ট থাকায় মোছা যাবে না" reach the admin unchanged.
 */

export async function readPayload(response: Response): Promise<unknown> {
  return response.json().catch(() => null);
}

export function payloadMessage(payload: unknown, fallback: string): string {
  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    const candidate = record.message ?? record.error;
    if (typeof candidate === "string" && candidate.trim()) return candidate;
    if (Array.isArray(candidate) && candidate.length) {
      const first = candidate.find((item) => typeof item === "string");
      if (typeof first === "string") return first;
    }
  }
  return fallback;
}

export async function apiRequest<T = unknown>(
  url: string,
  init: RequestInit & { fallbackMessage?: string } = {},
): Promise<T> {
  const { fallbackMessage = "অনুরোধ সম্পন্ন করা যায়নি", ...rest } = init;
  let response: Response;
  try {
    response = await fetch(url, {
      cache: "no-store",
      ...rest,
      headers: {
        ...(rest.body ? { "Content-Type": "application/json" } : {}),
        ...rest.headers,
      },
    });
  } catch {
    throw new Error("সার্ভারের সঙ্গে সংযোগ করা যায়নি। আবার চেষ্টা করুন।");
  }
  const payload = await readPayload(response);
  if (!response.ok) {
    throw new Error(payloadMessage(payload, fallbackMessage));
  }
  return payload as T;
}

export function apiGet<T = unknown>(url: string): Promise<T> {
  return apiRequest<T>(url, { fallbackMessage: "ডেটা লোড করা যায়নি" });
}

export function apiPost<T = unknown>(
  url: string,
  body: unknown,
  fallbackMessage?: string,
): Promise<T> {
  return apiRequest<T>(url, {
    method: "POST",
    body: JSON.stringify(body),
    fallbackMessage,
  });
}

export function apiPatch<T = unknown>(
  url: string,
  body: unknown,
  fallbackMessage?: string,
): Promise<T> {
  return apiRequest<T>(url, {
    method: "PATCH",
    body: JSON.stringify(body),
    fallbackMessage,
  });
}

/** DELETE helper — resolves on success, throws with the server's message on refusal. */
export function apiDelete<T = unknown>(
  url: string,
  fallbackMessage = "মুছে ফেলা যায়নি",
): Promise<T> {
  return apiRequest<T>(url, { method: "DELETE", fallbackMessage });
}
