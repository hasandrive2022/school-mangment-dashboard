"use client";

import { PropsWithChildren } from "react";
import { AuthUserProvider } from "@/lib/auth/auth-user-context";
import { ConfirmProvider } from "@/components/ui/confirm-dialog";
import { ToastProvider } from "@/components/ui/toast";

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <AuthUserProvider>
      <ToastProvider>
        <ConfirmProvider>{children}</ConfirmProvider>
      </ToastProvider>
    </AuthUserProvider>
  );
}
