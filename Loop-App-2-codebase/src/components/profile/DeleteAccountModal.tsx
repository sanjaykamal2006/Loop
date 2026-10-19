"use client";

import React, { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { logger } from "@/lib/logger";
import { toast } from "@/components/ui/NativeToast";
import { useModalA11y } from "@/lib/hooks/useModalA11y";

interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  cardBg: string;
  border: string;
  mutedText: string;
  isDark: boolean;
}

export default function DeleteAccountModal({
  isOpen,
  onClose,
  cardBg,
  border,
  mutedText,
  isDark,
}: DeleteAccountModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const modalRef = useModalA11y(isOpen, onClose);

  if (!isOpen) return null;

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("Please log in to delete your account.");

      const res = await fetch("/api/account/delete", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to delete account");
      }

      await supabase.auth.signOut({ scope: "global" });
      toast.success("Account permanently deleted.");
    } catch (error: unknown) {
      logger.error("Account delete error:", error);
      const message = error instanceof Error ? error.message : "Failed to delete account. Please try again.";
      toast.error(message);
    } finally {
      setIsDeleting(false);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-xl flex items-center justify-center p-5 animate-fade-in">
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label="Delete account"
        className={`w-full max-w-sm ${
          isDark ? "bg-[#121214]" : "bg-[#FFFFFF]"
        } border ${border} rounded-2xl p-5 space-y-3.5 shadow-2xl`}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-red-500/15 flex items-center justify-center">
            <AlertTriangle size={18} className="text-red-500" />
          </div>
          <h3 className="text-base font-black">Delete Account?</h3>
        </div>
        <p className={`text-xs font-semibold leading-relaxed ${mutedText}`}>
          This will permanently delete your profile, ride history, and trusted driver entries. This action cannot be
          undone.
        </p>
        <div className="flex gap-2 pt-1">
          <button
            onClick={onClose}
            disabled={isDeleting}
            className={`flex-1 py-2.5 ${cardBg} border ${border} rounded-xl text-xs font-black uppercase tracking-wider active:scale-[0.98] cursor-pointer`}
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-xs font-black uppercase tracking-wider active:scale-[0.98] disabled:opacity-50 cursor-pointer"
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}
