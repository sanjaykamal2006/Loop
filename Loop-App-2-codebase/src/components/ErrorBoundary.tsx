"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { RefreshCw, AlertTriangle } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Uncaught error caught by LOOP ErrorBoundary:", error, errorInfo);
    }
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 text-center select-none font-sans">
          <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-6 text-red-400">
            <AlertTriangle size={32} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight mb-2">Something went wrong</h1>
          <p className="text-zinc-400 text-sm max-w-sm mb-6 leading-relaxed">
            LOOP encountered an unexpected display issue. Your rides and coordinates are safe.
          </p>
          <button
            onClick={this.handleReset}
            className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-[#FFC554] text-black font-semibold text-sm hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer shadow-lg shadow-[#FFC554]/10"
          >
            <RefreshCw size={16} />
            <span>Reload LOOP</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
