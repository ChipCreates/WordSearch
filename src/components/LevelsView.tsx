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
const LEVELS_PER_TILE = 10;
const PORTRAIT_STONES: Record<string, TrailAnchor[]> = {
    "glowing-grove": [[50, 95], [68, 86], [48, 77], [30, 68], [44, 58], [68, 49], [76, 39], [56, 29], [38, 19], [50, 8]],
    "sunlit-falls": [[50, 95], [68, 86], [45, 76], [26, 66], [42, 56], [70, 47], [75, 37], [55, 28], [36, 18], [51, 8]],
    "crystal-conservatory": [[50, 95], [52, 84], [67, 73], [42, 63], [58, 53], [48, 43], [36, 33], [55, 24], [44, 15], [42, 6]],
    "mosswood-hollows": [[50, 95], [67, 85], [74, 74], [52, 64], [34, 54], [58, 44], [68, 34], [48, 24], [36, 15], [43, 7]],
    "cloudreach-summit": [[50, 95], [30, 84], [56, 73], [74, 62], [52, 51], [38, 41], [58, 31], [68, 22], [54, 14], [50, 7]],
    "verdant-beyond": [[50, 95], [34, 84], [60, 73], [78, 62], [50, 51], [32, 41], [52, 31], [65, 22], [48, 14], [48, 7]],
};
const LANDSCAPE_STONES: Record<string, TrailAnchor[]> = {
    "glowing-grove": [[6, 50], [16, 50], [26, 54], [36, 58], [47, 62], [58, 64], [67, 64], [76, 64], [85, 64], [92, 65]],
    "sunlit-falls": [[7, 68], [9, 58], [15, 50], [28, 55], [42, 61], [56, 62], [70, 61], [80, 59], [90, 57], [97, 55]],
    "crystal-conservatory": [[6, 48], [15, 52], [25, 56], [35, 60], [46, 58], [58, 58], [67, 56], [76, 52], [84, 60], [90, 75]],
    "mosswood-hollows": [[9, 84], [22, 82], [37, 73], [50, 66], [62, 66], [72, 66], [80, 65], [88, 64], [94, 62], [98, 60]],
    "cloudreach-summit": [
        [5, 41], [13, 35], [21, 30], [29, 20], [36, 15], [44, 25], [53, 35], [63, 37], [77, 47], [90, 40],
        [5, 41], [13, 35], [21, 30], [29, 20], [36, 15], [44, 25], [53, 35], [63, 37], [77, 47], [88, 67],
    ],
    "verdant-beyond": [
        // Tile 0 (Levels 71–80: starts at bridge from Cloudreach Summit landing)
        [6, 60], [16, 47], [27, 45], [38, 46], [49, 56], [60, 56], [71, 52], [81, 46], [90, 40], [96, 36],
        // Tile 1 (Levels 81–90: continuous golden path across the floating islands)
        [6, 44], [16, 45], [27, 45], [38, 46], [49, 56], [60, 56], [71, 52], [81, 46], [90, 40], [96, 36],
        // Tile 2 (Levels 91–100: continuous golden path across the floating islands)
        [6, 44], [16, 45], [27, 45], [38, 46], [49, 56], [60, 56], [71, 52], [81, 46], [90, 40], [96, 36],
    ],
};

const TILE_OVERLAP = 120;
const REGION_OVERLAP = 180;

type BiomeTransition = { id: string; imageLandscape?: string; mistColor: string };
const BIOME_TRANSITIONS: BiomeTransition[] = [
    { id: "grove-to-falls", mistColor: "#2db38d" },
    { id: "falls-to-conservatory", imageLandscape: "transitions/falls-to-conservatory-landscape.webp", mistColor: "#935fe0" },
    { id: "conservatory-to-hollows", imageLandscape: "transitions/conservatory-to-hollows-landscape.webp", mistColor: "#4272a8" },
    { id: "hollows-to-summit", imageLandscape: "transitions/hollows-to-summit-landscape.webp", mistColor: "#d8ecfb" },
    { id: "summit-to-beyond", imageLandscape: "transitions/summit-to-beyond-landscape.webp", mistColor: "#f7a86b" },
];

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
    const effectiveTileLength = Math.max(1, tileLength - TILE_OVERLAP);

    const regions = useMemo(() => {
        let offset = 0;
        return LEVEL_REGIONS.map((base, index) => {
            const end = index === LEVEL_REGIONS.length - 1 ? Math.max(base.end, maxLevel) : base.end;
            const tileCount = Math.ceil((end - base.start + 1) / LEVELS_PER_TILE);
            const rawLength = tileCount * effectiveTileLength + TILE_OVERLAP;
            const regionOffset = index === 0 ? 0 : offset - REGION_OVERLAP;
            const regionLength = index === 0 ? rawLength : rawLength + REGION_OVERLAP;
            offset = regionOffset + regionLength;
            return { ...base, end, offset: regionOffset, length: regionLength, tileCount };
        });
    }, [maxLevel, effectiveTileLength]);

    const totalLength = regions.reduce((max, r) => Math.max(max, r.offset + r.length), 0);

    const point = (level: number) => {
        const region = regions.find(r => level >= r.start && level <= r.end) ?? regions[regions.length - 1];
        const anchors = (landscape ? LANDSCAPE_STONES : PORTRAIT_STONES)[region.id];
        const local = Math.max(0, level - region.start);
        const tile = Math.floor(local / LEVELS_PER_TILE);
        const slot = local % LEVELS_PER_TILE;
        const [baseX, baseY] = anchors[local] ?? anchors[slot];
        if (landscape) {
            return {
                x: region.offset + tile * effectiveTileLength + (baseX / 100) * tileLength,
                y: (baseY / 100) * crossSize,
            };
        }
        return {
            x: (baseX / 100) * crossSize,
            y: totalLength - region.offset - tile * effectiveTileLength - (1 - baseY / 100) * tileLength,
        };
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

    const [visibleRegion, setVisibleRegion] = useState(() => regionForLevel(currentLevel));
    useEffect(() => {
        const el = scrollRef.current; if (!el) return;
        const handleScroll = () => {
            const center = landscape
                ? el.scrollLeft + el.clientWidth * 0.4
                : totalLength - (el.scrollTop + el.clientHeight * 0.4);
            const found = regions.find(r => center >= r.offset && center <= r.offset + r.length);
            if (found && found.id !== visibleRegion.id) {
                setVisibleRegion(found);
            }
        };
        el.addEventListener("scroll", handleScroll, { passive: true });
        return () => el.removeEventListener("scroll", handleScroll);
    }, [landscape, totalLength, regions, visibleRegion.id]);

    const selectedRegion = regionForLevel(selected);
    const trailPoints = Array.from({ length: maxLevel }, (_, index) => point(index + 1));
    const activeRoutePoints = trailPoints.slice(0, currentLevel);
    const lockedRoutePoints = trailPoints.slice(Math.max(0, currentLevel - 1));
    const activeRoutePath = smoothTrailPath(activeRoutePoints);
    const lockedRoutePath = smoothTrailPath(lockedRoutePoints);

    return <section className={`ws-trail ws-trail--${landscape ? "landscape" : "portrait"}`} aria-label="Level trail">
        <header className="ws-trail__header">
            <div>
                <span className="ws-trail__eyebrow">YOUR WOODLAND JOURNEY</span>
                <h2>{visibleRegion.name}</h2>
            </div>
            <button className="ws-trail__locate" onClick={returnToCurrent}>Level {currentLevel} <span aria-hidden="true">↗</span></button>
        </header>
        <div className="ws-trail__layout"><div className="ws-trail__map-shell"><div className="ws-trail__scroll" ref={scrollRef} tabIndex={0} aria-label="Scroll through levels"><div className="ws-trail__map" style={{ width: landscape ? totalLength : crossSize, height: landscape ? crossSize : totalLength }}>
            {regions.map((region, rIdx) => {
                const isFirst = rIdx === 0;
                const isLast = rIdx === regions.length - 1;
                const regionMask = landscape
                    ? `linear-gradient(to right, ${isFirst ? "black" : "transparent"} 0px, black ${isFirst ? "0px" : `${REGION_OVERLAP}px`}, black calc(100% - ${isLast ? "0px" : `${REGION_OVERLAP}px`}), ${isLast ? "black" : "transparent"} 100%)`
                    : `linear-gradient(to top, ${isFirst ? "black" : "transparent"} 0px, black ${isFirst ? "0px" : `${REGION_OVERLAP}px`}, black calc(100% - ${isLast ? "0px" : `${REGION_OVERLAP}px`}), ${isLast ? "black" : "transparent"} 100%)`;

                return <div
                    key={region.id}
                    className="ws-trail__region"
                    aria-hidden="true"
                    style={{
                        left: landscape ? region.offset : 0,
                        top: landscape ? 0 : totalLength - region.offset - region.length,
                        width: landscape ? region.length : crossSize,
                        height: landscape ? crossSize : region.length,
                        WebkitMaskImage: regionMask,
                        maskImage: regionMask,
                    }}
                >
                    {Array.from({ length: region.tileCount }, (_, tile) => {
                        const isFirstTile = tile === 0;
                        const tileMask = isFirstTile ? undefined : landscape
                            ? `linear-gradient(to right, transparent 0px, black ${TILE_OVERLAP}px, black 100%)`
                            : `linear-gradient(to top, transparent 0px, black ${TILE_OVERLAP}px, black 100%)`;

                        return <div
                            key={tile}
                            className="ws-trail__tile"
                            style={{
                                left: landscape ? tile * effectiveTileLength : 0,
                                top: landscape ? 0 : region.length - (tile + 1) * tileLength + tile * TILE_OVERLAP,
                                width: landscape ? tileLength : crossSize,
                                height: landscape ? crossSize : tileLength,
                                backgroundImage: `url("${assetUrl(`backgrounds/levels/${region.id}-${landscape ? "landscape" : "portrait"}.webp`)}")`,
                                WebkitMaskImage: tileMask,
                                maskImage: tileMask,
                            }}
                        />;
                    })}
                </div>;
            })}
            {regions.slice(0, -1).map((region, idx) => {
                const transDef = BIOME_TRANSITIONS[idx] ?? { id: `seam-${idx}`, mistColor: "#2db38d" };
                const boundary = region.offset + region.length - REGION_OVERLAP / 2;
                const transitionWidth = landscape ? (transDef.imageLandscape ? Math.min(tileLength * 1.05, 1300) : 240) : crossSize;
                const transitionHeight = landscape ? crossSize : (transDef.imageLandscape ? Math.min(tileLength * 1.05, 1300) : 240);
                return <div
                    key={transDef.id}
                    className={`ws-trail__seam-blend ws-trail__seam-blend--${transDef.id}`}
                    aria-hidden="true"
                    style={{
                        position: "absolute",
                        zIndex: 1,
                        pointerEvents: "none",
                        ...(landscape ? {
                            left: boundary - transitionWidth / 2,
                            top: 0,
                            width: transitionWidth,
                            height: crossSize,
                        } : {
                            left: 0,
                            top: totalLength - boundary - transitionHeight / 2,
                            width: crossSize,
                            height: transitionHeight,
                        }),
                    }}
                >
                    {transDef.imageLandscape && landscape && (
                        <div
                            className="ws-trail__transition-pano"
                            style={{
                                position: "absolute",
                                inset: 0,
                                backgroundImage: `url("${assetUrl(`backgrounds/levels/${transDef.imageLandscape}`)}")`,
                                backgroundSize: "cover",
                                backgroundPosition: "center",
                                WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 22%, black 78%, transparent 100%)",
                                maskImage: "linear-gradient(to right, transparent 0%, black 22%, black 78%, transparent 100%)",
                            }}
                        />
                    )}
                    <div
                        className="ws-trail__seam-mist"
                        style={{
                            position: "absolute",
                            inset: 0,
                            background: `radial-gradient(ellipse at center, ${transDef.mistColor}33 0%, transparent 75%)`,
                        }}
                    />
                </div>;
            })}
            <svg className="ws-trail__route" aria-hidden="true" viewBox={`0 0 ${landscape ? totalLength : crossSize} ${landscape ? crossSize : totalLength}`} preserveAspectRatio="none">
                <defs>
                    <linearGradient id="ws-trail-glow-active" x1="0%" y1="0%" x2={landscape ? "100%" : "0%"} y2={landscape ? "0%" : "100%"}>
                        <stop offset="0%" stopColor="#00e479" stopOpacity="0.8" />
                        <stop offset="50%" stopColor="#45e695" stopOpacity="0.85" />
                        <stop offset="100%" stopColor="#f4c95d" stopOpacity="0.9" />
                    </linearGradient>
                    <linearGradient id="ws-trail-core-active" x1="0%" y1="0%" x2={landscape ? "100%" : "0%"} y2={landscape ? "0%" : "100%"}>
                        <stop offset="0%" stopColor="#d4ff96" stopOpacity="0.75" />
                        <stop offset="100%" stopColor="#fff8b8" stopOpacity="0.9" />
                    </linearGradient>
                </defs>
                {lockedRoutePath && <g className="ws-trail__route-locked">
                    <path className="ws-trail__route-shadow ws-trail__route-shadow--locked" d={lockedRoutePath} />
                    <path className="ws-trail__route-stone ws-trail__route-stone--locked" d={lockedRoutePath} />
                    <path className="ws-trail__route-light ws-trail__route-light--locked" d={lockedRoutePath} />
                </g>}
                {activeRoutePath && <g className="ws-trail__route-active">
                    <path className="ws-trail__route-shadow ws-trail__route-shadow--active" d={activeRoutePath} />
                    <path className="ws-trail__route-stone ws-trail__route-stone--active" d={activeRoutePath} />
                    <path className="ws-trail__route-light ws-trail__route-light--active" d={activeRoutePath} />
                </g>}
            </svg>
            {Array.from({ length: maxLevel }, (_, i) => i + 1).map(level => { const p = point(level), complete = level < currentLevel, active = level === currentLevel, locked = level > currentLevel; return <div key={level} className="ws-trail__stop" style={{ left: p.x, top: p.y }}>{active && <span className="ws-trail__here">YOU ARE HERE</span>}<button className={`ws-trail__node ${active ? "is-current" : complete ? "is-complete" : "is-locked"} ${selected === level ? "is-selected" : ""}`} disabled={locked} aria-label={`Level ${level}, ${active ? "current" : complete ? "completed" : "locked"}`} aria-pressed={selected === level} aria-current={active ? "step" : undefined} onClick={() => setSelected(level)}><span>{level}</span>{locked ? <LockRounded className="ws-trail__status" /> : complete ? <CheckRounded className="ws-trail__status" /> : null}</button>{active && <span className="ws-trail__next">Let it bloom</span>}</div>; })}
        </div></div></div></div>
        <aside className="ws-trail__detail" aria-label="Selected level"><img className="ws-trail__sprout" src={assetUrl("plants/sprout.png")} alt="" /><div className="ws-trail__detail-copy"><span className="ws-trail__eyebrow">{selected < currentLevel ? "COMPLETED • PLAY AGAIN" : "YOUR NEXT ADVENTURE"}</span><h3>Level {selected}</h3><p>{selectedRegion.name}<br />{selectedRegion.tagline}</p></div><div className="ws-trail__rewards"><span><img src={assetUrl("seed.png")} alt="" /><b>+{REWARDS.LEVEL_COMPLETE_SEEDS}</b> completion</span><small>+{REWARDS.BONUS_WORD_SEEDS} Seeds for each bonus word</small></div><button className="ws-trail__play" onClick={() => onSelectLevel(selected)}><PlayArrowRounded />{selected < currentLevel ? "Replay level" : "Play level"}</button><p className="ws-trail__hint">Follow the light. Find every word to grow your trail.</p></aside>
    </section>;
}
