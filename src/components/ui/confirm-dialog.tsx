"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export type ConfirmOptions = {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
};

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((options) => {
    setPending(options);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const settle = useCallback((value: boolean) => {
    resolver.current?.(value);
    resolver.current = null;
    setPending(null);
  }, []);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {pending && (
        <div className="r6-confirm-wrap" role="presentation">
          <div
            className="r6-confirm"
            role="alertdialog"
            aria-modal="true"
            aria-label={pending.title}
          >
            <div className="r6-confirm-head">
              <span className="r6-confirm-icon">
                <AlertTriangle className="ic" />
              </span>
              <h3>{pending.title}</h3>
            </div>
            {pending.description && (
              <p className="r6-confirm-body">{pending.description}</p>
            )}
            <div className="r6-confirm-actions">
              <Button
                type="button"
                variant="outline"
                className="btn gho"
                onClick={() => settle(false)}
              >
                {pending.cancelLabel ?? "বাতিল"}
              </Button>
              <Button
                type="button"
                variant="destructive"
                className="btn dgr"
                onClick={() => settle(true)}
                autoFocus
              >
                {pending.confirmLabel ?? "মুছে ফেলুন"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  const context = useContext(ConfirmContext);
  if (!context)
    throw new Error("useConfirm must be used inside ConfirmProvider");
  return context;
}
