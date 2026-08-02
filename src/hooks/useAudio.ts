import { useCallback, useEffect, useRef, useState } from "react";
import { assetUrl } from "../categoryThemes";

const MUTED_STORAGE_KEY = "wordsearch.audioMuted";

const MUSIC_TRACKS = [
    "sounds/background-music/lotus-meditation.mp3",
    "sounds/background-music/quiet-quest.mp3",
    "sounds/background-music/word-search-zen.mp3",
].map(assetUrl);

// Keys are the correctly-spelled name the rest of the app uses; only the
// shipped file itself (acheivement.mp3) carries the typo.
const SFX_FILES = {
    swipe: "sounds/sound-effects/swipe.mp3",
    click: "sounds/sound-effects/click.mp3",
    cheering: "sounds/sound-effects/cheering.mp3",
    award: "sounds/sound-effects/award.mp3",
    achievement: "sounds/sound-effects/acheivement.mp3",
} as const;
export type SfxName = keyof typeof SFX_FILES;

// Rapid repeats of the same effect (swipe especially) shouldn't cut each
// other off -- each sound gets a small round-robin pool of <audio>
// elements instead of one shared instance.
const SFX_POOL_SIZE = 4;

function shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

// WebKitGTK's <audio>/<video> playback runs through GStreamer, which has no
// source handler for Tauri's custom "tauri://" protocol -- so on the Linux
// desktop build, media elements pointed straight at an assetUrl() silently
// fail to play (fetch/XHR aren't affected; only the GStreamer pipeline is).
// Fetching the bytes ourselves and handing the element a blob: URL routes
// around it, and is a no-op on platforms that don't need it.
const blobUrlCache = new Map<string, Promise<string>>();
function toBlobUrl(url: string): Promise<string> {
    let cached = blobUrlCache.get(url);
    if (!cached) {
        cached = fetch(url).then(r => r.blob()).then(b => URL.createObjectURL(b));
        blobUrlCache.set(url, cached);
    }
    return cached;
}

export function useAudio() {
    const [muted, setMuted] = useState(() => localStorage.getItem(MUTED_STORAGE_KEY) === "true");
    const mutedRef = useRef(muted);
    const musicRef = useRef<HTMLAudioElement | null>(null);
    const sfxPoolsRef = useRef<Map<SfxName, HTMLAudioElement[]>>(new Map());
    const sfxCursorRef = useRef<Map<SfxName, number>>(new Map());
    const sfxBlobUrlsRef = useRef<Map<SfxName, string>>(new Map());

    useEffect(() => {
        mutedRef.current = muted;
        localStorage.setItem(MUTED_STORAGE_KEY, String(muted));
        if (musicRef.current) musicRef.current.muted = muted;
    }, [muted]);

    useEffect(() => {
        (Object.keys(SFX_FILES) as SfxName[]).forEach(name => {
            toBlobUrl(assetUrl(SFX_FILES[name]))
                .then(blobUrl => {
                    sfxBlobUrlsRef.current.set(name, blobUrl);
                })
                .catch(e => console.error(`useAudio: failed to fetch sfx "${name}"`, e));
        });
    }, []);

    useEffect(() => {
        let cancelled = false;
        let audio: HTMLAudioElement | null = null;

        // Browsers block unmuted autoplay before a user gesture -- rather
        // than fight that, just start on the first pointer/keyboard
        // interaction with the page (in practice: the first tap/drag on
        // the grid), which is imperceptible as a delay.
        const start = () => {
            audio?.play().catch(e => console.error("useAudio: music play() failed", e));
            window.removeEventListener("pointerdown", start);
            window.removeEventListener("keydown", start);
        };

        (async () => {
            try {
                const order = shuffle(MUSIC_TRACKS);
                const blobUrls = await Promise.all(order.map(toBlobUrl));
                if (cancelled) return;

                let trackIndex = 0;
                audio = new Audio(blobUrls[trackIndex]);
                audio.muted = mutedRef.current;
                audio.addEventListener("ended", () => {
                    trackIndex = (trackIndex + 1) % blobUrls.length;
                    audio!.src = blobUrls[trackIndex];
                    audio!.play().catch(e => console.error("useAudio: music play() failed", e));
                });
                musicRef.current = audio;

                window.addEventListener("pointerdown", start);
                window.addEventListener("keydown", start);
            } catch (e) {
                console.error("useAudio: failed to fetch music tracks", e);
            }
        })();

        return () => {
            cancelled = true;
            window.removeEventListener("pointerdown", start);
            window.removeEventListener("keydown", start);
            audio?.pause();
            musicRef.current = null;
        };
    }, []);

    const playSfx = useCallback((name: SfxName) => {
        if (mutedRef.current) return;
        let pool = sfxPoolsRef.current.get(name);
        if (!pool) {
            const blobUrl = sfxBlobUrlsRef.current.get(name);
            if (!blobUrl) return; // still fetching; drop this one play
            pool = Array.from({ length: SFX_POOL_SIZE }, () => new Audio(blobUrl));
            sfxPoolsRef.current.set(name, pool);
            sfxCursorRef.current.set(name, 0);
        }
        const cursor = sfxCursorRef.current.get(name)!;
        const el = pool[cursor];
        sfxCursorRef.current.set(name, (cursor + 1) % pool.length);
        el.currentTime = 0;
        el.play().catch(() => {});
    }, []);

    const toggleMuted = useCallback(() => setMuted(m => !m), []);

    return { muted, toggleMuted, playSfx };
}
