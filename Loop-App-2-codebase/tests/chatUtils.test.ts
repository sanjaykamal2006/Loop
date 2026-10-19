import { describe, it, expect, vi, afterEach } from "vitest";
import { parseReturnTripMessage, playNotificationChime } from "@/components/chat/chatUtils";

describe("parseReturnTripMessage", () => {
  it("treats a normal message as non-return", () => {
    expect(parseReturnTripMessage("Heading home now")).toEqual({
      isReturn: false,
      displayText: "Heading home now",
      returnLoopId: null,
    });
  });

  it("parses a standalone return-trip token to an empty display string", () => {
    expect(parseReturnTripMessage("[return_loop:abc-123]")).toEqual({
      isReturn: true,
      displayText: "",
      returnLoopId: "abc-123",
    });
  });

  it("strips the token and trims surrounding whitespace", () => {
    expect(parseReturnTripMessage("Heading back [return_loop:loop-42]")).toEqual({
      isReturn: true,
      displayText: "Heading back",
      returnLoopId: "loop-42",
    });
  });

  it("preserves inner text when the token sits in the middle", () => {
    expect(parseReturnTripMessage("A [return_loop:id1] B")).toEqual({
      isReturn: true,
      displayText: "A  B",
      returnLoopId: "id1",
    });
  });

  it("only consumes the first token when several are present", () => {
    expect(parseReturnTripMessage("[return_loop:a] [return_loop:b]")).toEqual({
      isReturn: true,
      displayText: "[return_loop:b]",
      returnLoopId: "a",
    });
  });

  it("does not match ids containing characters outside [a-zA-Z0-9-]", () => {
    expect(parseReturnTripMessage("[return_loop:abc_def]")).toEqual({
      isReturn: false,
      displayText: "[return_loop:abc_def]",
      returnLoopId: null,
    });
  });

  it("handles an empty string safely", () => {
    expect(parseReturnTripMessage("")).toEqual({
      isReturn: false,
      displayText: "",
      returnLoopId: null,
    });
  });
});

describe("playNotificationChime", () => {
  const originalAudioContext = (window as any).AudioContext;
  const originalWebkitAudioContext = (window as any).webkitAudioContext;

  afterEach(() => {
    (window as any).AudioContext = originalAudioContext;
    (window as any).webkitAudioContext = originalWebkitAudioContext;
    vi.restoreAllMocks();
  });

  it("does not throw when no AudioContext is available", () => {
    (window as any).AudioContext = undefined;
    (window as any).webkitAudioContext = undefined;
    expect(() => playNotificationChime()).not.toThrow();
  });

  it("creates, wires and starts an oscillator when AudioContext exists", () => {
    const start = vi.fn();
    const stop = vi.fn();
    const oscillatorConnect = vi.fn();
    const oscillator = {
      type: "",
      frequency: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
      connect: oscillatorConnect,
      start,
      stop,
    };
    const gainConnect = vi.fn();
    const gain = {
      gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
      connect: gainConnect,
    };
    const context = {
      currentTime: 0,
      destination: {},
      createOscillator: () => oscillator,
      createGain: () => gain,
    };
    const AudioContextCtor = vi.fn(function AudioContextMock() {
      return context;
    });
    (window as any).AudioContext = AudioContextCtor;

    playNotificationChime();

    expect(AudioContextCtor).toHaveBeenCalledTimes(1);
    expect(oscillatorConnect).toHaveBeenCalledWith(gain);
    expect(gainConnect).toHaveBeenCalledWith(context.destination);
    expect(start).toHaveBeenCalledTimes(1);
    expect(stop).toHaveBeenCalledTimes(1);
  });
});
