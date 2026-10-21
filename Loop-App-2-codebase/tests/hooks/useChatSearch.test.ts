import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useChatSearch } from "@/components/chat/useChatSearch";
import type { Message } from "@/lib/types";

function makeMsg(id: string, userId: string, content: string): Message {
  return {
    id,
    loop_id: "loop-1",
    user_id: userId,
    content,
    created_at: new Date().toISOString(),
    reactions: {},
    profiles: { display_name: userId === "u1" ? "Sanjay" : "Priya", avatar_url: null },
  } as Message;
}

describe("useChatSearch", () => {
  const messages = [
    makeMsg("m-1", "u1", "Leaving the main gate"),
    makeMsg("m-2", "u2", "Station in ten minutes"),
    makeMsg("m-3", "u2", "Gate is crowded today"),
  ];

  it("matches nothing when the query is empty or whitespace", () => {
    const { result } = renderHook(() => useChatSearch(messages, "u1", "Sanjay"));
    expect(result.current.searchQuery).toBe("");
    expect(result.current.matchingMsgIds.size).toBe(0);

    act(() => result.current.setSearchQuery("   "));
    expect(result.current.matchingMsgIds.size).toBe(0);
  });

  it("matches message content case-insensitively, including own name via display fallback", () => {
    const { result } = renderHook(() => useChatSearch(messages, "u1", "Sanjay"));

    act(() => result.current.setSearchQuery("GATE"));
    expect([...result.current.matchingMsgIds]).toEqual(["m-1", "m-3"]);

    // "Sanjay" only resolves through the passed display name for own messages.
    act(() => result.current.setSearchQuery("sanjay"));
    expect([...result.current.matchingMsgIds]).toEqual(["m-1"]);

    act(() => result.current.setSearchQuery("priya"));
    expect([...result.current.matchingMsgIds]).toEqual(["m-2", "m-3"]);
  });

  it("keeps results incremental with `'You'`-label for own messages when display is missing", () => {
    const { result } = renderHook(() => useChatSearch(messages, "u1", null));
    act(() => result.current.setSearchQuery("you"));
    expect([...result.current.matchingMsgIds]).toEqual(["m-1"]);
  });
});
