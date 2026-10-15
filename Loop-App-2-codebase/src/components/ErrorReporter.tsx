"use client";

import { useEffect } from "react";
import { logger, getDiagnosticLogs } from "@/lib/logger";

type ReporterProps = {
  error?: Error & { digest?: string };
  reset?: () => void;
};

export default function ErrorReporter({ error, reset }: ReporterProps) {
  useEffect(() => {
    if (error) {
      logger.captureException(error, { source: "ErrorReporter" });
    }
  }, [error]);

  if (!error) return null;

  return (
    <html lang="en">
      <body className="min-h-screen bg-black text-white flex items-center justify-center p-4 font-sans">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-red-500">
              Something went wrong
            </h1>
            <p className="text-zinc-400 text-sm">
              An unexpected error occurred. Please refresh or try again.
            </p>
          </div>
          {reset && (
            <button
              type="button"
              onClick={() => reset()}
              className="px-6 py-2.5 bg-[#FFC554] text-black font-semibold rounded-full hover:bg-[#FFC554]/90 transition-colors text-sm cursor-pointer"
            >
              Try again
            </button>
          )}
          {process.env.NODE_ENV === "development" && (
            <details className="mt-4 text-left border border-zinc-800 rounded-lg p-3 bg-zinc-950">
              <summary className="cursor-pointer text-xs text-zinc-400 hover:text-white">
                Error details (Development only)
              </summary>
              <pre className="mt-2 text-[11px] text-red-400 font-mono overflow-auto max-h-48 whitespace-pre-wrap">
                {error.message}
                {error.stack && (
                  <div className="mt-2 text-zinc-500">
                    {error.stack}
                  </div>
                )}
                {error.digest && (
                  <div className="mt-2 text-zinc-500">
                    Digest: {error.digest}
                  </div>
                )}
                {getDiagnosticLogs().length > 0 && (
                  <div className="mt-2 pt-2 border-t border-zinc-800 text-zinc-400 text-[10px]">
                    Recent Diagnostic Logs ({getDiagnosticLogs().length}):
                    {getDiagnosticLogs().map((d, i) => (
                      <div key={i} className="text-zinc-500 font-mono">
                        [{d.level.toUpperCase()}] {d.message}
                      </div>
                    ))}
                  </div>
                )}
              </pre>
            </details>
          )}
        </div>
      </body>
    </html>
  );
}
