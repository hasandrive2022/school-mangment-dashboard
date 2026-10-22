"use client";

import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type AuthUser = {
  id: string;
  schoolId: string;
  role: "ADMIN" | "TEACHER" | "STUDENT";
  displayNameBn: string;
  tokenType: "access";
};

type AuthUserContextValue = {
  user: AuthUser | null;
  isLoading: boolean;
  error: string | null;
  refreshUser: () => Promise<void>;
  clearUser: () => void;
};

let cachedUser: AuthUser | null = null;
let inFlightRequest: Promise<AuthUser | null> | null = null;

async function fetchMe(): Promise<AuthUser | null> {
  const response = await fetch("/api/auth/me", {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });

  if (response.status === 401) {
    return null;
  }

  if (!response.ok) {
    throw new Error("Failed to load authenticated user.");
  }

  const payload = (await response.json()) as { user?: AuthUser };
  if (!payload.user) {
    throw new Error("Invalid user payload.");
  }

  return payload.user;
}

async function getUserFresh(): Promise<AuthUser | null> {
  if (!inFlightRequest) {
    inFlightRequest = fetchMe()
      .then((user) => {
        cachedUser = user;
        return user;
      })
      .finally(() => {
        inFlightRequest = null;
      });
  }

  return inFlightRequest;
}

function resetCache() {
  cachedUser = null;
  inFlightRequest = null;
}

const AuthUserContext = createContext<AuthUserContextValue | null>(null);

export function AuthUserProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<AuthUser | null>(cachedUser);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadUser = useCallback(
    async (options?: { skipLoadingState?: boolean }) => {
      const skipLoadingState = options?.skipLoadingState ?? false;
      if (!skipLoadingState) {
        setIsLoading(true);
        setError(null);
      }

      try {
        const result = await getUserFresh();
        setUser(result);
      } catch {
        setError("Could not load user information.");
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadUser({ skipLoadingState: true });
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadUser]);

  const refreshUser = useCallback(async () => {
    await loadUser();
  }, [loadUser]);

  const clearUser = useCallback(() => {
    resetCache();
    setUser(null);
    setError(null);
    setIsLoading(false);
  }, []);

  const value = useMemo<AuthUserContextValue>(
    () => ({
      user,
      isLoading,
      error,
      refreshUser,
      clearUser,
    }),
    [user, isLoading, error, refreshUser, clearUser],
  );

  return (
    <AuthUserContext.Provider value={value}>
      {children}
    </AuthUserContext.Provider>
  );
}

export function useAuthUser() {
  const context = useContext(AuthUserContext);
  if (!context) {
    throw new Error("useAuthUser must be used within AuthUserProvider");
  }
  return context;
}
