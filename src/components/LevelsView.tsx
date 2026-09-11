import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useMediaQuery } from "@mui/material";
import CheckRounded from "@mui/icons-material/CheckRounded";
import LockRounded from "@mui/icons-material/LockRounded";
import PlayArrowRounded from "@mui/icons-material/PlayArrowRounded";
import { REWARDS } from "../gameMechanics";
import { assetUrl } from "../categoryThemes";
import { REGIONS, regionForLevel, type RegionDefinition } from "../regions";
import { TRAIL_LAYOUT, type BiomeTransitionLayout, type HandleMap, type PathPointMap, type StoneMap } from "../data/trailLayout";
import { isTrailEditorRequested } from "../debug/debugMode";
import {
    LEVELS_PER_TILE, type OrientationKey, type Waypoint,
    buildBezierPath, defaultTransitionSpan, getStoneHandles,
    pathPointsAfterIndex, resolveTransitionCenter, resolveTransitionSpan,
} from "../trail/trailEditing";
import "./LevelsView.css";

// The editor's drag handlers, toolbar, and handle-marker rendering are real
// weight (Bezier math, a whole toolbar component, per-point hit-targets)
// that only a developer running `?trailEditor=true` ever touches. Gating
// the *lazy import itself* behind `import.meta.env.DEV` -- not just the
// element that renders it -- is what lets Rollup drop the chunk entirely in
// production, the same trick App.tsx uses for DebugPanel.
const TrailEditorOverlay = import.meta.env.DEV ? lazy(() => import("./TrailEditorOverlay")) : null;

type Props = { currentLevel: number; onSelectLevel: (level: number) => void };
// Region *identity* (id/name/tagline/level range/theme/category bias/reward
// data) lives in src/regions.ts (WSP-2.2) -- this view only adds the trail's
// own rendering geometry (offset/length/tileCount) on top of that shared
// data, so it no longer owns any region design decisions itself.
export type RegionComputed = RegionDefinition & { offset: number; length: number; tileCount: number };
export type RenderWaypoint = Waypoint & { key: string; afterLevel: number; isStone: boolean; regionId: string; level?: number; index?: number; id?: string };

const TILE_OVERLAP = 120;
const REGION_OVERLAP = 180;
const highResLevelAsset = (path: string) => path.replace(/(\.[^.]+)$/, "-3x$1");
export const shouldUseHighResLevelArt = (screenWidth: number, screenHeight: number, devicePixelRatio: number) =>
    Math.max(screenWidth, screenHeight) * devicePixelRatio >= 2800;

const scrollMap = (element: HTMLDivElement, options: ScrollToOptions) => {
    if (typeof element.scrollTo === "function") element.scrollTo(options);
    else { element.scrollTop = options.top ?? element.scrollTop; element.scrollLeft = options.left ?? element.scrollLeft; }
};
const cloneLayout = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

export default function LevelsView({ currentLevel, onSelectLevel }: Props) {
    const mediaLandscape = useMediaQuery("(orientation: landscape)");
    const editMode = useMemo(() => isTrailEditorRequested(), []);
    const [orientationOverride, setOrientationOverride] = useState(mediaLandscape);
    const landscape = editMode ? orientationOverride : mediaLandscape;
    const orientationKey: OrientationKey = landscape ? "landscape" : "portrait";
    const useHighResArt = useMemo(() => shouldUseHighResLevelArt(window.screen.width, window.screen.height, window.devicePixelRatio || 1), []);
    const levelAsset = (path: string) => assetUrl(useHighResArt ? highResLevelAsset(path) : path);

    const originalLayout = useRef(cloneLayout(TRAIL_LAYOUT)).current;
    const [stones, setStones] = useState<{ portrait: StoneMap; landscape: StoneMap }>(() => cloneLayout(TRAIL_LAYOUT.stones));
    const [stoneHandles, setStoneHandles] = useState<{ portrait: HandleMap; landscape: HandleMap }>(() => cloneLayout(TRAIL_LAYOUT.stoneHandles));
    const [pathPoints, setPathPoints] = useState<{ portrait: PathPointMap; landscape: PathPointMap }>(() => cloneLayout(TRAIL_LAYOUT.pathPoints));
    const [transitions, setTransitions] = useState<BiomeTransitionLayout[]>(() => cloneLayout(TRAIL_LAYOUT.transitions));

    const [selected, setSelected] = useState(currentLevel);
    const [crossSize, setCrossSize] = useState(400);
    const scrollRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<HTMLDivElement>(null);
    const tileLength = crossSize * 1376 / 768;
    const maxLevel = Math.max(100, currentLevel + 20);
    const effectiveTileLength = Math.max(1, tileLength - TILE_OVERLAP);

    const regions = useMemo(() => {
        let offset = 0;
        return REGIONS.map((base, index) => {
            const end = index === REGIONS.length - 1 ? Math.max(base.end, maxLevel) : base.end;
            const tileCount = Math.ceil((end - base.start + 1) / LEVELS_PER_TILE);
            const rawLength = tileCount * effectiveTileLength + TILE_OVERLAP;
            const regionOffset = index === 0 ? 0 : offset - REGION_OVERLAP;
            const regionLength = index === 0 ? rawLength : rawLength + REGION_OVERLAP;
            offset = regionOffset + regionLength;
            return { ...base, end, offset: regionOffset, length: regionLength, tileCount };
        });
    }, [maxLevel, effectiveTileLength]);

    const totalLength = regions.reduce((max, r) => Math.max(max, r.offset + r.length), 0);
    const seamBoundaries = useMemo(() => regions.slice(0, -1).map(region => region.offset + region.length - REGION_OVERLAP / 2), [regions]);

    const toScreen = (region: RegionComputed, tile: number, baseX: number, baseY: number) => landscape
        ? { x: region.offset + tile * effectiveTileLength + (baseX / 100) * tileLength, y: (baseY / 100) * crossSize }
        : { x: (baseX / 100) * crossSize, y: totalLength - region.offset - tile * effectiveTileLength - (1 - baseY / 100) * tileLength };

    const percentOffsetToScreen = (offset: [number, number]): [number, number] => landscape
        ? [(offset[0] / 100) * tileLength, (offset[1] / 100) * crossSize]
        : [(offset[0] / 100) * crossSize, (offset[1] / 100) * tileLength];

    const resolveStoneAnchor = (level: number) => {
        const region = regions.find(r => level >= r.start && level <= r.end) ?? regions[regions.length - 1];
        const anchors = stones[orientationKey][region.id] ?? [];
        const local = Math.max(0, level - region.start);
        const tile = Math.floor(local / LEVELS_PER_TILE);
        const index = local < anchors.length ? local : local % LEVELS_PER_TILE;
        const [baseX, baseY] = anchors[index] ?? [50, 50];
        return { region, tile, local, index, baseX, baseY };
    };

    const point = (level: number) => {
        const { region, tile, baseX, baseY } = resolveStoneAnchor(level);
        return toScreen(region, tile, baseX, baseY);
    };

    const waypoints = useMemo(() => {
        const list: RenderWaypoint[] = [];
        for (let level = 1; level <= maxLevel; level++) {
            const { region, tile, local, index, baseX, baseY } = resolveStoneAnchor(level);
            const screen = toScreen(region, tile, baseX, baseY);
            const handles = getStoneHandles(stoneHandles[orientationKey], region.id, index);
            list.push({
                key: `stone:${level}`, afterLevel: level, isStone: true, regionId: region.id, level, index,
                x: screen.x, y: screen.y,
                handleOut: handles.out ? percentOffsetToScreen(handles.out) : undefined,
                handleIn: handles.in ? percentOffsetToScreen(handles.in) : undefined,
            });
            pathPointsAfterIndex(pathPoints[orientationKey], region.id, local).forEach(ep => {
                const epScreen = toScreen(region, tile, ep.x, ep.y);
                list.push({
                    key: `path:${ep.id}`, afterLevel: level, isStone: false, regionId: region.id, id: ep.id,
                    x: epScreen.x, y: epScreen.y,
                    handleOut: ep.handleOut ? percentOffsetToScreen(ep.handleOut) : undefined,
                    handleIn: ep.handleIn ? percentOffsetToScreen(ep.handleIn) : undefined,
                });
            });
        }
        return list;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [maxLevel, regions, stones, stoneHandles, pathPoints, orientationKey, landscape, tileLength, crossSize, effectiveTileLength, totalLength]);

    useEffect(() => {
        const el = scrollRef.current; if (!el) return;
        const measure = () => setCrossSize(Math.max(1, landscape ? el.clientHeight : el.clientWidth));
        const observer = new ResizeObserver(measure); observer.observe(el); measure(); return () => observer.disconnect();
    }, [landscape]);

    useEffect(() => setSelected(currentLevel), [currentLevel]);

    useEffect(() => {
        const el = scrollRef.current; if (!el) return; const p = point(currentLevel);
        scrollMap(el, { top: landscape ? 0 : Math.max(0, p.y - el.clientHeight * .42), left: landscape ? Math.max(0, p.x - el.clientWidth * .42) : 0 });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentLevel, landscape, crossSize, totalLength]);

    const returnToCurrent = () => {
        setSelected(currentLevel); const el = scrollRef.current; if (!el) return; const p = point(currentLevel);
        scrollMap(el, { top: landscape ? 0 : Math.max(0, p.y - el.clientHeight * .42), left: landscape ? Math.max(0, p.x - el.clientWidth * .42) : 0, behavior: "smooth" });
    };

    const scrollToRegionTile = (regionId: string, tile: number) => {
        const region = regions.find(r => r.id === regionId); const el = scrollRef.current;
        if (!region || !el) return;
        const level = Math.min(region.end, region.start + tile * LEVELS_PER_TILE);
        const p = point(level);
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
    const activeWaypoints = waypoints.filter(w => w.afterLevel < currentLevel || (w.afterLevel === currentLevel && w.isStone));
    const lockedWaypoints = waypoints.filter(w => w.afterLevel >= currentLevel);
    const activeRoutePath = buildBezierPath(activeWaypoints);
    const lockedRoutePath = buildBezierPath(lockedWaypoints);

    return <section className={`ws-trail ws-trail--${landscape ? "landscape" : "portrait"}`} aria-label="Level trail">
        <header className="ws-trail__header">
            <div>
                <span className="ws-trail__eyebrow">YOUR WOODLAND JOURNEY</span>
                <h2>{visibleRegion.name}</h2>
            </div>
            <button className="ws-trail__locate" onClick={returnToCurrent}>Level {currentLevel} <span aria-hidden="true">↗</span></button>
        </header>
        <div className="ws-trail__layout"><div className="ws-trail__map-shell"><div
            className="ws-trail__scroll"
            ref={scrollRef}
            tabIndex={0}
            aria-label="Scroll through levels"
        ><div
            ref={mapRef}
            className="ws-trail__map"
            style={{ width: landscape ? totalLength : crossSize, height: landscape ? crossSize : totalLength }}
        >
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
                                backgroundImage: `url("${levelAsset(`backgrounds/levels/${region.id}-${landscape ? "landscape" : "portrait"}.webp`)}")`,
                                WebkitMaskImage: tileMask,
                                maskImage: tileMask,
                            }}
                        />;
                    })}
                </div>;
            })}
            {regions.slice(0, -1).map((_region, idx) => {
                const transDef = transitions[idx] ?? { id: `seam-${idx}`, mistColor: "#2db38d" };
                const override = transDef[orientationKey];
                const transitionImage = landscape ? transDef.imageLandscape : transDef.imagePortrait;
                const baseSpan = defaultTransitionSpan(!!transitionImage, tileLength);
                const span = resolveTransitionSpan(baseSpan, tileLength, override);
                const center = resolveTransitionCenter(seamBoundaries[idx], tileLength, override);
                const transitionWidth = landscape ? span : crossSize;
                const transitionHeight = landscape ? crossSize : span;
                return <div
                    key={transDef.id}
                    className={`ws-trail__seam-blend ws-trail__seam-blend--${transDef.id}`}
                    aria-hidden="true"
                    style={{
                        position: "absolute",
                        zIndex: 1,
                        pointerEvents: "none",
                        ...(landscape ? {
                            left: center - transitionWidth / 2,
                            top: 0,
                            width: transitionWidth,
                            height: crossSize,
                        } : {
                            left: 0,
                            top: totalLength - center - transitionHeight / 2,
                            width: crossSize,
                            height: transitionHeight,
                        }),
                    }}
                >
                    {transitionImage && (
                        <div
                            className="ws-trail__transition-pano"
                            style={{
                                position: "absolute",
                                inset: 0,
                                backgroundImage: `url("${levelAsset(`backgrounds/levels/${transitionImage}`)}")`,
                                backgroundSize: "cover",
                                backgroundPosition: "center",
                                WebkitMaskImage: `linear-gradient(to ${landscape ? "right" : "top"}, transparent 0%, black 22%, black 78%, transparent 100%)`,
                                maskImage: `linear-gradient(to ${landscape ? "right" : "top"}, transparent 0%, black 22%, black 78%, transparent 100%)`,
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
            {Array.from({ length: maxLevel }, (_, i) => i + 1).map(level => {
                const p = point(level), complete = level < currentLevel, active = level === currentLevel, locked = level > currentLevel;
                return <div key={level} className="ws-trail__stop" style={{ left: p.x, top: p.y }}>
                    {active && <span className="ws-trail__here">YOU ARE HERE</span>}
                    <button
                        className={`ws-trail__node ${active ? "is-current" : complete ? "is-complete" : "is-locked"} ${selected === level ? "is-selected" : ""}`}
                        disabled={locked}
                        aria-label={`Level ${level}, ${active ? "current" : complete ? "completed" : "locked"}`}
                        aria-pressed={selected === level}
                        aria-current={active ? "step" : undefined}
                        onClick={() => setSelected(level)}
                    ><span>{level}</span>{locked ? <LockRounded className="ws-trail__status" /> : complete ? <CheckRounded className="ws-trail__status" /> : null}</button>
                    {active && <span className="ws-trail__next">Let it bloom</span>}
                </div>;
            })}
        </div></div></div></div>
        <aside className="ws-trail__detail" aria-label="Selected level"><img className="ws-trail__sprout" src={assetUrl("plants/sprout.png")} alt="" /><div className="ws-trail__detail-copy"><span className="ws-trail__eyebrow">{selected < currentLevel ? "COMPLETED • PLAY AGAIN" : "YOUR NEXT ADVENTURE"}</span><h3>Level {selected}</h3><p>{selectedRegion.name}<br />{selectedRegion.tagline}</p></div><div className="ws-trail__rewards"><span><img src={assetUrl("seed.png")} alt="" /><b>+{REWARDS.LEVEL_COMPLETE_SEEDS}</b> completion</span><small>+{REWARDS.BONUS_WORD_SEEDS} Seeds for each bonus word</small></div><button className="ws-trail__play" onClick={() => onSelectLevel(selected)}><PlayArrowRounded />{selected < currentLevel ? "Replay level" : "Play level"}</button><p className="ws-trail__hint">Follow the light. Find every word to grow your trail.</p></aside>
        {editMode && TrailEditorOverlay && <Suspense fallback={null}>
            <TrailEditorOverlay
                regions={regions}
                landscape={landscape}
                orientationKey={orientationKey}
                onOrientationChange={o => setOrientationOverride(o === "landscape")}
                tileLength={tileLength}
                crossSize={crossSize}
                totalLength={totalLength}
                maxLevel={maxLevel}
                seamBoundaries={seamBoundaries}
                waypoints={waypoints}
                stones={stones} setStones={setStones}
                stoneHandles={stoneHandles} setStoneHandles={setStoneHandles}
                pathPoints={pathPoints} setPathPoints={setPathPoints}
                transitions={transitions} setTransitions={setTransitions}
                originalLayout={originalLayout}
                visibleRegionId={visibleRegion.id}
                onSelectStone={setSelected}
                onJump={scrollToRegionTile}
                mapHostRef={mapRef}
            />
        </Suspense>}
    </section>;
}
