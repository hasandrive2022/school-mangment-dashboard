"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";

type Props = {
  /** Short name of the record, shown in the confirm dialog. */
  itemLabel: string;
  /** Performs the DELETE call; must throw (with the server message) on failure. */
  onDelete: () => Promise<void>;
  /** Called after a successful delete (list refresh). */
  onDeleted?: () => void | Promise<void>;
  successMessage?: string;
  size?: "sm" | "icon";
  label?: string;
};

/**
 * The one delete affordance used across the admin panel: confirm dialog →
 * DELETE → success toast + refresh, or an error toast carrying the
 * backend's refusal message verbatim. Never a silent no-op.
 */
export function DeleteButton({
  itemLabel,
  onDelete,
  onDeleted,
  successMessage = "রেকর্ডটি মুছে ফেলা হয়েছে",
  size = "icon",
  label,
}: Props) {
  const confirm = useConfirm();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  async function handle() {
    const accepted = await confirm({
      title: "আপনি কি নিশ্চিত?",
      description: `“${itemLabel}” স্থায়ীভাবে মুছে ফেলা হবে। এই কাজটি ফিরিয়ে আনা যাবে না।`,
      confirmLabel: "হ্যাঁ, মুছুন",
    });
    if (!accepted) return;
    setBusy(true);
    try {
      await onDelete();
      toast.success(successMessage);
      await onDeleted?.();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "মুছে ফেলা যায়নি",
      );
    } finally {
      setBusy(false);
    }
  }

  if (size === "sm") {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="btn gho sm r6-delete-btn"
        disabled={busy}
        onClick={() => void handle()}
      >
        <Trash2 className="ic" data-icon="inline-start" />
        {label ?? "মুছুন"}
      </Button>
    );
  }
  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className="ibtn del"
      aria-label={`মুছুন — ${itemLabel}`}
      title="মুছুন"
      disabled={busy}
      onClick={() => void handle()}
    >
      <Trash2 className="ic" />
    </Button>
  );
}
