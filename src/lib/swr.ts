import useSWR from "swr";

export async function adminFetcher<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    credentials: "include",
    cache: "no-store",
  });
  const payload = (await response.json().catch(() => null)) as T;
  if (!response.ok) {
    throw new Error("ডেটা লোড করা যায়নি");
  }
  return payload;
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
