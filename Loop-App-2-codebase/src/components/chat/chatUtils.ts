export const parseReturnTripMessage = (content: string) => {
  const match = content.match(/\[return_loop:([a-zA-Z0-9-]+)\]/);
  if (match) {
    const returnLoopId = match[1];
    const displayText = content.replace(/\[return_loop:[a-zA-Z0-9-]+\]/, "").trim();
    return { isReturn: true, displayText, returnLoopId };
  }
  return { isReturn: false, displayText: content, returnLoopId: null };
};

export const playNotificationChime = () => {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1174.66, ctx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.25);
  } catch {
    // Autoplay restrictions or unavailable audio context
  }
};
