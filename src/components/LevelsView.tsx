import { useEffect, useMemo, useRef, useState } from "react";
import { useMediaQuery } from "@mui/material";
import CheckRounded from "@mui/icons-material/CheckRounded";
import LockRounded from "@mui/icons-material/LockRounded";
import PlayArrowRounded from "@mui/icons-material/PlayArrowRounded";
import { REWARDS } from "../gameMechanics";
import { assetUrl } from "../categoryThemes";
import "./LevelsView.css";

type Props = { currentLevel: number; onSelectLevel: (level: number) => void };
type Region = { id: string; start: number; end: number; name: string; tagline: string };
export const LEVEL_REGIONS: Region[] = [
    { id: "glowing-grove", start: 1, end: 20, name: "The Glowing Grove", tagline: "Where curiosity takes root." },
    { id: "sunlit-falls", start: 21, end: 30, name: "Sunlit Falls", tagline: "Let curiosity flow further." },
    { id: "crystal-conservatory", start: 31, end: 40, name: "The Crystal Conservatory", tagline: "Rare words. Extraordinary growth." },
    { id: "mosswood-hollows", start: 41, end: 50, name: "Mosswood Hollows", tagline: "Deeper words. Wilder wonders." },
    { id: "cloudreach-summit", start: 51, end: 70, name: "Cloudreach Summit", tagline: "Higher thinking. Greater horizons." },
    { id: "verdant-beyond", start: 71, end: 100, name: "The Verdant Beyond", tagline: "A lifetime of words still to grow." },
];
type TrailAnchor = [number, number];
const PORTRAIT_STONES: Record<string, TrailAnchor[]> = {
    "glowing-grove": [[50, 91], [48, 80], [40, 68], [45, 57], [65, 45], [45, 33], [58, 21], [52, 8]],
    "sunlit-falls": [[55, 91], [50, 80], [60, 68], [50, 57], [65, 45], [35, 33], [45, 21], [55, 8]],
    "crystal-conservatory": [[50, 91], [48, 80], [40, 68], [55, 57], [58, 45], [38, 33], [50, 21], [47, 8]],
    "mosswood-hollows": [[50, 91], [50, 80], [50, 68], [38, 57], [55, 45], [40, 33], [55, 21], [42, 8]],
    "cloudreach-summit": [[50, 91], [45, 80], [35, 68], [40, 57], [60, 45], [45, 33], [60, 21], [50, 8]],
    "verdant-beyond": [[45, 91], [45, 80], [40, 68], [65, 57], [62, 45], [42, 33], [52, 21], [50, 8]],
};
const LANDSCAPE_STONES: Record<string, TrailAnchor[]> = {
    "glowing-grove": [[7, 51], [20, 50], [32, 53], [44, 60], [56, 65], [68, 64], [81, 60], [93, 64]],
    "sunlit-falls": [[7, 82], [20, 77], [32, 70], [44, 64], [56, 62], [68, 59], [81, 56], [93, 53]],
    "crystal-conservatory": [[7, 46], [20, 50], [32, 61], [44, 69], [56, 57], [68, 45], [81, 49], [93, 46]],
    "mosswood-hollows": [[7, 82], [20, 78], [32, 72], [44, 68], [56, 65], [68, 63], [81, 61], [93, 58]],
    "cloudreach-summit": [[7, 78], [20, 74], [32, 68], [44, 60], [56, 58], [68, 54], [81, 48], [93, 43]],
    "verdant-beyond": [[7, 72], [20, 67], [32, 61], [44, 58], [56, 57], [68, 59], [81, 61], [93, 63]],
};
export const regionForLevel = (level: number) => LEVEL_REGIONS.find(r => level >= r.start && level <= r.end) ?? LEVEL_REGIONS[LEVEL_REGIONS.length - 1];
const scrollMap = (element: HTMLDivElement, options: ScrollToOptions) => {
    if (typeof element.scrollTo === "function") element.scrollTo(options);
    else { element.scrollTop = options.top ?? element.scrollTop; element.scrollLeft = options.left ?? element.scrollLeft; }
};
const smoothTrailPath = (points: Array<{ x: number; y: number }>) => {
    if (points.length < 2) return "";
    let path = `M ${points[0].x} ${points[0].y}`;
    for (let index = 0; index < points.length - 1; index++) {
        const before = points[index - 1] ?? points[index];
        const current = points[index];
        const next = points[index + 1];
        const after = points[index + 2] ?? next;
        const c1 = { x: current.x + (next.x - before.x) / 6, y: current.y + (next.y - before.y) / 6 };
        const c2 = { x: next.x - (after.x - current.x) / 6, y: next.y - (after.y - current.y) / 6 };
        path += ` C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${next.x} ${next.y}`;
    }
    return path;
};

export default function LevelsView({ currentLevel, onSelectLevel }: Props) {
    const landscape = useMediaQuery("(orientation: landscape)");
    const [selected, setSelected] = useState(currentLevel);
    const [crossSize, setCrossSize] = useState(400);
    const scrollRef = useRef<HTMLDivElement>(null);
    const tileLength = crossSize * 1376 / 768;
    const maxLevel = Math.max(100, currentLevel + 20);
    const regions = useMemo(() => {
        let offset = 0;
        return LEVEL_REGIONS.map((base, index) => {
            const end = index === LEVEL_REGIONS.length - 1 ? Math.max(base.end, maxLevel) : base.end;
            const length = Math.ceil((end - base.start + 1) / 8) * tileLength;
            const region = { ...base, end, offset, length }; offset += length; return region;
        });
    }, [maxLevel, tileLength]);
    const totalLength = regions.reduce((sum, region) => sum + region.length, 0);
    const point = (level: number) => {
        const region = regions.find(r => level >= r.start && level <= r.end) ?? regions[regions.length - 1];
        const anchors = (landscape ? LANDSCAPE_STONES : PORTRAIT_STONES)[region.id];
        const local = Math.max(0, level - region.start), tile = Math.floor(local / 8);
        const mirrored = tile % 2 === 1;
        const slot = local % 8;
        const [baseX, baseY] = anchors[mirrored ? 7 - slot : slot];
        const x = landscape && mirrored ? 100 - baseX : baseX;
        const y = !landscape && mirrored ? 100 - baseY : baseY;
        if (landscape) return { x: region.offset + tile * tileLength + x / 100 * tileLength, y: y / 100 * crossSize };
        return { x: x / 100 * crossSize, y: totalLength - region.offset - tile * tileLength - (1 - y / 100) * tileLength };
    };
    useEffect(() => {
        const el = scrollRef.current; if (!el) return;
        const measure = () => setCrossSize(Math.max(1, landscape ? el.clientHeight : el.clientWidth));
        const observer = new ResizeObserver(measure); observer.observe(el); measure(); return () => observer.disconnect();
    }, [landscape]);
    useEffect(() => setSelected(currentLevel), [currentLevel]);
    useEffect(() => {
        const el = scrollRef.current; if (!el) return; const p = point(currentLevel);
        scrollMap(el, { top: landscape ? 0 : Math.max(0, p.y - el.clientHeight * .42), left: landscape ? Math.max(0, p.x - el.clientWidth * .42) : 0 });
    }, [currentLevel, landscape, crossSize, totalLength]);
    const returnToCurrent = () => {
        setSelected(currentLevel); const el = scrollRef.current; if (!el) return; const p = point(currentLevel);
        scrollMap(el, { top: landscape ? 0 : Math.max(0, p.y - el.clientHeight * .42), left: landscape ? Math.max(0, p.x - el.clientWidth * .42) : 0, behavior: "smooth" });
    };
    const selectedRegion = regionForLevel(selected);
    const trailPoints = Array.from({ length: maxLevel }, (_, index) => point(index + 1));
    const routePath = smoothTrailPath(trailPoints);
    return <section className={`ws-trail ws-trail--${landscape ? "landscape" : "portrait"}`} aria-label="Level trail">
        <header className="ws-trail__header"><div><span className="ws-trail__eyebrow">YOUR WOODLAND JOURNEY</span><h2>{selectedRegion.name}</h2></div><button className="ws-trail__locate" onClick={returnToCurrent}>Level {currentLevel} <span aria-hidden="true">↗</span></button></header>
        <div className="ws-trail__layout"><div className="ws-trail__map-shell"><div className="ws-trail__scroll" ref={scrollRef} tabIndex={0} aria-label="Scroll through levels"><div className="ws-trail__map" style={{ width: landscape ? totalLength : crossSize, height: landscape ? crossSize : totalLength }}>
            {regions.map(region => <div key={region.id} className="ws-trail__region" aria-hidden="true" style={{ left: landscape ? region.offset : 0, top: landscape ? 0 : totalLength - region.offset - region.length, width: landscape ? region.length : crossSize, height: landscape ? crossSize : region.length }}>
                {Array.from({ length: Math.ceil((region.end - region.start + 1) / 8) }, (_, tile) => <div
                    key={tile}
                    className="ws-trail__tile"
                    style={{
                        left: landscape ? tile * tileLength : 0,
                        top: landscape ? 0 : region.length - (tile + 1) * tileLength,
                        width: landscape ? tileLength : crossSize,
                        height: landscape ? crossSize : tileLength,
                        backgroundImage: `url("${assetUrl(`backgrounds/levels/${region.id}-${landscape ? "landscape" : "portrait"}.webp`)}")`,
                        transform: tile % 2 ? (landscape ? "scaleX(-1)" : "scaleY(-1)") : undefined,
                    }}
                />)}
            </div>)}
            <svg className="ws-trail__route" aria-hidden="true" viewBox={`0 0 ${landscape ? totalLength : crossSize} ${landscape ? crossSize : totalLength}`} preserveAspectRatio="none">
                <path className="ws-trail__route-shadow" d={routePath} />
                <path className="ws-trail__route-stone" d={routePath} />
                <path className="ws-trail__route-light" d={routePath} />
            </svg>
            {Array.from({ length: maxLevel }, (_, i) => i + 1).map(level => { const p = point(level), complete = level < currentLevel, active = level === currentLevel, locked = level > currentLevel; return <div key={level} className="ws-trail__stop" style={{ left: p.x, top: p.y }}>{active && <span className="ws-trail__here">YOU ARE HERE</span>}<button className={`ws-trail__node ${active ? "is-current" : complete ? "is-complete" : "is-locked"} ${selected === level ? "is-selected" : ""}`} disabled={locked} aria-label={`Level ${level}, ${active ? "current" : complete ? "completed" : "locked"}`} aria-pressed={selected === level} aria-current={active ? "step" : undefined} onClick={() => setSelected(level)}><span>{level}</span>{locked ? <LockRounded className="ws-trail__status" /> : complete ? <CheckRounded className="ws-trail__status" /> : null}</button>{active && <span className="ws-trail__next">Let it bloom</span>}</div>; })}
        </div></div></div></div>
        <aside className="ws-trail__detail" aria-label="Selected level"><img className="ws-trail__sprout" src={assetUrl("plants/sprout.png")} alt="" /><div className="ws-trail__detail-copy"><span className="ws-trail__eyebrow">{selected < currentLevel ? "COMPLETED • PLAY AGAIN" : "YOUR NEXT ADVENTURE"}</span><h3>Level {selected}</h3><p>{selectedRegion.name}<br />{selectedRegion.tagline}</p></div><div className="ws-trail__rewards"><span><img src={assetUrl("seed.png")} alt="" /><b>+{REWARDS.LEVEL_COMPLETE_SEEDS}</b> completion</span><small>+{REWARDS.BONUS_WORD_SEEDS} Seeds for each bonus word</small></div><button className="ws-trail__play" onClick={() => onSelectLevel(selected)}><PlayArrowRounded />{selected < currentLevel ? "Replay level" : "Play level"}</button><p className="ws-trail__hint">Follow the light. Find every word to grow your trail.</p></aside>
    </section>;
}
