"use client";

import React from "react";
import { Send } from "lucide-react";

interface ChatComposerProps {
  newMessage: string;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSendMessage: () => void;
  cardBg: string;
  border: string;
  isDark: boolean;
}

export function ChatComposer({
  newMessage,
  onInputChange,
  onSendMessage,
  cardBg,
  border,
  isDark,
}: ChatComposerProps) {
  return (
    <div className="shrink-0 px-4 pb-5 pt-2 z-20">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSendMessage();
        }}
        autoComplete="off"
        action="javascript:void(0);"
        className={`${cardBg} border ${border} rounded-[24px] p-1.5 flex gap-2 shadow-xl items-center`}
      >
        <input
          type="search"
          name="search"
          autoComplete="new-password"
          autoCorrect="off"
          autoCapitalize="sentences"
          spellCheck="false"
          data-lpignore="true"
          data-1p-ignore="true"
          data-form-type="other"
          aria-autocomplete="none"
          inputMode="text"
          value={newMessage}
          onChange={onInputChange}
          placeholder="Message..."
          className="flex-1 bg-transparent px-4 text-sm font-medium outline-none border-none ring-0 [&::-webkit-search-cancel-button]:hidden"
        />
        <button
          type="submit"
          disabled={!newMessage.trim()}
          className={`w-10 h-10 ${
            isDark ? "bg-[#FFC554] text-black" : "bg-[#881337] text-white"
          } rounded-[16px] flex items-center justify-center active:scale-90 shrink-0 disabled:opacity-40`}
        >
          <Send size={15} strokeWidth={2.5} />
        </button>
      </form>
    </div>
  );
}
