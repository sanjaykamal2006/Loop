"use client";

import { useEffect, useRef } from "react";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

/**
 * Shared modal accessibility contract:
 * - moves focus into the dialog when it opens
 * - traps Tab / Shift+Tab inside the dialog
 * - closes on Escape (when a close handler is supplied)
 * - restores focus to the trigger when it closes
 * - only the top-most modal reacts to keyboard events
 * - locks background scrolling while open
 */
export function useModalA11y(open: boolean, onClose?: () => void) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;

    const dialog = dialogRef.current;
    if (!dialog) return;

    const instanceId = Symbol("modal");
    modalStack.push(instanceId);

    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const getFocusable = () =>
      Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter((el) => {
        if (el.hasAttribute("disabled") || el.getAttribute("aria-hidden") === "true") {
          return false;
        }
        if (el.hidden) return false;
        const style = window.getComputedStyle(el);
        return style.display !== "none" && style.visibility !== "hidden";
      });

    const focusFirst = () => {
      const focusable = getFocusable();
      if (focusable.length > 0) {
        focusable[0].focus({ preventScroll: true });
      } else {
        if (!dialog.hasAttribute("tabindex")) dialog.setAttribute("tabindex", "-1");
        dialog.focus({ preventScroll: true });
      }
    };

    // Wait one frame so the dialog has painted (and portalled modals are in the DOM).
    const raf = requestAnimationFrame(focusFirst);

    const isTopMost = () => modalStack[modalStack.length - 1] === instanceId;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isTopMost()) return;

      if (event.key === "Escape" && onCloseRef.current) {
        event.preventDefault();
        event.stopPropagation();
        onCloseRef.current();
        return;
      }

      if (event.key !== "Tab") return;

      const focusable = getFocusable();
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (event.shiftKey) {
        if (active === first || !dialog.contains(active)) {
          event.preventDefault();
          last.focus();
        }
      } else if (active === last || !dialog.contains(active)) {
        event.preventDefault();
        first.focus();
      }
    };

    // If a pointer interaction moves focus outside the dialog, pull it back.
    const handleFocusIn = (event: FocusEvent) => {
      if (!isTopMost()) return;
      const target = event.target as Node | null;
      if (target && !dialog.contains(target)) {
        const focusable = getFocusable();
        (focusable[0] ?? dialog).focus({ preventScroll: true });
      }
    };

    document.addEventListener("keydown", handleKeyDown, true);
    document.addEventListener("focusin", handleFocusIn);

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("keydown", handleKeyDown, true);
      document.removeEventListener("focusin", handleFocusIn);
      const stackIndex = modalStack.lastIndexOf(instanceId);
      if (stackIndex >= 0) modalStack.splice(stackIndex, 1);
      document.body.style.overflow = previousOverflow;
      if (previouslyFocused && document.contains(previouslyFocused)) {
        previouslyFocused.focus({ preventScroll: true });
      }
    };
  }, [open]);

  return dialogRef;
}

// Tracks open dialogs so stacked modals do not fight over Escape/Tab.
const modalStack: symbol[] = [];
