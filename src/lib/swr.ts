import useSWR from "swr";

export async function adminFetcher<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    credentials: "include",
    cache: "no-store",
  });
  const payload = (await response.json().catch(() => null)) as
    | (T & {
        message?: string | string[];
      })
    | null;
  if (!response.ok) {
    const message = Array.isArray(payload?.message)
      ? payload.message.join(" ")
      : payload?.message;
    throw new Error(message || "ডেটা লোড করা যায়নি");
  }
  return payload as T;
}

export function useAdminSWR<T>(
  key: string | null,
  options?: Parameters<typeof useSWR<T>>[2],
) {
  return useSWR<T>(key, adminFetcher, {
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    ...options,
  });
}
