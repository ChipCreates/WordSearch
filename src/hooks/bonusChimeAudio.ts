// A short, bright arpeggio distinguishing a bonus-word find from the level-
// complete flourish in celebrationAudio.ts -- rising rather than sweeping, and
// far shorter, so it reads as "surprise bonus" without competing with
// continued play. Procedural (WebAudio) rather than a shipped asset, matching
// the existing celebration cue's placeholder approach -- see WSP-1.2.
export function playBonusChimeAudio(ctx: AudioContext, output: GainNode) {
    const start = ctx.currentTime;
    const nodes: AudioScheduledSourceNode[] = [];
    const notes = [880, 1174.7, 1568]; // A5, D6, G6 -- a quick bright triad
    notes.forEach((frequency, i) => {
        const offset = i * 0.06;
        const duration = 0.22;
        const oscillator = ctx.createOscillator();
        const envelope = ctx.createGain();
        oscillator.type = "triangle";
        oscillator.frequency.setValueAtTime(frequency, start + offset);
        envelope.gain.setValueAtTime(0, start + offset);
        envelope.gain.linearRampToValueAtTime(0.16, start + offset + 0.01);
        envelope.gain.exponentialRampToValueAtTime(0.001, start + offset + duration);
        oscillator.connect(envelope).connect(output);
        oscillator.start(start + offset);
        oscillator.stop(start + offset + duration);
        oscillator.onended = () => { oscillator.disconnect(); envelope.disconnect(); };
        nodes.push(oscillator);
    });
    return () => nodes.forEach(node => { try { node.stop(); } catch { /* Already ended. */ } });
}
