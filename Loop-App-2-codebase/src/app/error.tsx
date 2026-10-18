"use client";

import { useEffect } from "react";
import Link from "next/link";
import { logger } from "@/lib/logger";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.captureException(error, { source: "app/error" });
  }, [error]);

  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center bg-black px-8 text-center text-white">
      <p className="text-xs font-black uppercase tracking-[0.3em] text-[#FFC554]">
        Something broke
      </p>
      <h1 className="mt-4 text-4xl font-black tracking-tighter">
        That was not supposed to happen.
      </h1>
      <p className="mt-3 max-w-xs text-sm font-medium text-white/60">
        A recoverable error interrupted this screen. Your data is safe — try
        again or head back home.
      </p>
      <div className="mt-8 flex w-full max-w-xs flex-col gap-3">
        <button
          type="button"
          onClick={reset}
          className="h-14 w-full rounded-full bg-[#FFC554] text-sm font-black text-black transition-transform active:scale-[0.98]"
        >
          Try again
        </button>
        <Link
          href="/"
          className="flex h-14 w-full items-center justify-center rounded-full border border-white/15 text-sm font-black text-white/80 transition-transform active:scale-[0.98]"
        >
          Back to home
        </Link>
      </div>
    </main>
  );
}
