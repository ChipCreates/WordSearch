import { CELEBRATE_DOTS_FORM_MS, CELEBRATE_TRAIL_MS } from "../constants";

// Schedule against the audio clock so the short flourish stays tightly timed.
export function playCelebrationAudio(ctx: AudioContext, output: GainNode) {
    const start = ctx.currentTime;
    const collapse = CELEBRATE_DOTS_FORM_MS / 1000;
    const sweep = CELEBRATE_TRAIL_MS / 1000;
    const nodes: AudioScheduledSourceNode[] = [];
    const tone = (offset: number, duration: number, from: number, to: number, volume: number) => {
        const oscillator = ctx.createOscillator();
        const envelope = ctx.createGain();
        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(from, start + offset);
        oscillator.frequency.exponentialRampToValueAtTime(to, start + offset + duration);
        envelope.gain.setValueAtTime(0, start + offset);
        envelope.gain.linearRampToValueAtTime(volume, start + offset + 0.012);
        envelope.gain.exponentialRampToValueAtTime(0.001, start + offset + duration);
        oscillator.connect(envelope).connect(output);
        oscillator.start(start + offset);
        oscillator.stop(start + offset + duration);
        oscillator.onended = () => { oscillator.disconnect(); envelope.disconnect(); };
        nodes.push(oscillator);
    };
    tone(0, collapse, 440, 1100, 0.14);
    tone(collapse, sweep, 650, 2000, 0.12);
    // Airy filtered noise under the rising beam.
    const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * sweep), ctx.sampleRate);
    const samples = buffer.getChannelData(0);
    for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(800, start + collapse);
    filter.frequency.exponentialRampToValueAtTime(4500, start + collapse + sweep);
    const air = ctx.createGain();
    air.gain.setValueAtTime(0, start + collapse);
    air.gain.linearRampToValueAtTime(0.16, start + collapse + sweep / 2);
    air.gain.linearRampToValueAtTime(0, start + collapse + sweep);
    noise.connect(filter).connect(air).connect(output);
    noise.start(start + collapse);
    noise.stop(start + collapse + sweep);
    noise.onended = () => { noise.disconnect(); filter.disconnect(); air.disconnect(); };
    nodes.push(noise);
    [1046.5, 1318.5, 1568].forEach((frequency, i) => {
        tone(collapse + sweep + i * 0.012, 0.18, frequency, frequency, 0.09);
    });
    return () => nodes.forEach(node => { try { node.stop(); } catch { /* Already ended. */ } });
}
