import { useEffect, useMemo, useRef, useState } from "react";
import { useMediaQuery } from "@mui/material";
import CheckRounded from "@mui/icons-material/CheckRounded";
import LockRounded from "@mui/icons-material/LockRounded";
import PlayArrowRounded from "@mui/icons-material/PlayArrowRounded";
import { REWARDS } from "../gameMechanics";
import { assetUrl } from "../categoryThemes";
import { TRAIL_LAYOUT, type BiomeTransitionLayout, type HandleMap, type PathPointMap, type StoneMap } from "../data/trailLayout";
import { isTrailEditorRequested } from "../debug/debugMode";
import {
    LEVELS_PER_TILE, type OrientationKey, type Waypoint,
    autoTangentOffset, buildBezierPath, clampPercent, defaultTransitionSpan,
    expandToTileCount, getStoneHandles, insertPathPoint, movePathPoint, negateAnchor,
    pathPointsAfterIndex, pathPointsForRegion, pxDeltaToPercent, removePathPoint,
    resolveTransitionCenter, resolveTransitionSpan, setPathPointHandle, setStoneHandle, snapValue,
} from "../trail/trailEditing";
import TrailEditorToolbar from "./TrailEditorToolbar";
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
type RegionComputed = Region & { offset: number; length: number; tileCount: number };

const TILE_OVERLAP = 120;
const REGION_OVERLAP = 180;
const HANDLE_OFFSET_LIMIT = 80;

// What's under the pointer while dragging. Positions (`startX/startY`) are
// always in the anchor's own percent space; tangent-handle offsets
// (`startOffset`) are percent deltas from that anchor. Transitions store
// their center/span directly in px, so those drags skip the percent
// conversion entirely.
type DragState =
    | { kind: "stone"; regionId: string; index: number; startClientX: number; startClientY: number; startX: number; startY: number }
    | { kind: "path"; regionId: string; id: string; startClientX: number; startClientY: number; startX: number; startY: number }
    | { kind: "stone-handle"; regionId: string; index: number; which: "in" | "out"; startClientX: number; startClientY: number; startOffset: [number, number]; mirror: boolean }
    | { kind: "path-handle"; regionId: string; id: string; which: "in" | "out"; startClientX: number; startClientY: number; startOffset: [number, number]; mirror: boolean }
    | { kind: "transition-center"; id: string; startClientX: number; startClientY: number; startOffset: number }
    | { kind: "transition-span"; id: string; edge: "start" | "end"; startClientX: number; startClientY: number; startSpan: number };

type EditorSelection =
    | { type: "stone"; level: number; regionId: string; index: number; part: "anchor" | "handleIn" | "handleOut" }
    | { type: "path"; regionId: string; id: string; part: "anchor" | "handleIn" | "handleOut" }
    | { type: "transition"; id: string; part: "center" | "span" };

export const regionForLevel = (level: number) => LEVEL_REGIONS.find(r => level >= r.start && level <= r.end) ?? LEVEL_REGIONS[LEVEL_REGIONS.length - 1];
const scrollMap = (element: HTMLDivElement, options: ScrollToOptions) => {
    if (typeof element.scrollTo === "function") element.scrollTo(options);
    else { element.scrollTop = options.top ?? element.scrollTop; element.scrollLeft = options.left ?? element.scrollLeft; }
};
const cloneLayout = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const clampOffset = (v: number) => Math.min(HANDLE_OFFSET_LIMIT, Math.max(-HANDLE_OFFSET_LIMIT, v));

export default function LevelsView({ currentLevel, onSelectLevel }: Props) {
    const mediaLandscape = useMediaQuery("(orientation: landscape)");
    const editMode = useMemo(() => isTrailEditorRequested(), []);
    const [orientationOverride, setOrientationOverride] = useState(mediaLandscape);
    const landscape = editMode ? orientationOverride : mediaLandscape;
    const orientationKey: OrientationKey = landscape ? "landscape" : "portrait";

    const originalLayout = useRef(cloneLayout(TRAIL_LAYOUT)).current;
    const [stones, setStones] = useState<{ portrait: StoneMap; landscape: StoneMap }>(() => cloneLayout(TRAIL_LAYOUT.stones));
    const [stoneHandles, setStoneHandles] = useState<{ portrait: HandleMap; landscape: HandleMap }>(() => cloneLayout(TRAIL_LAYOUT.stoneHandles));
    const [pathPoints, setPathPoints] = useState<{ portrait: PathPointMap; landscape: PathPointMap }>(() => cloneLayout(TRAIL_LAYOUT.pathPoints));
    const [transitions, setTransitions] = useState<BiomeTransitionLayout[]>(() => cloneLayout(TRAIL_LAYOUT.transitions));

    const [selected, setSelected] = useState(currentLevel);
    const [crossSize, setCrossSize] = useState(400);
    const scrollRef = useRef<HTMLDivElement>(null);
    const tileLength = crossSize * 1376 / 768;
    const maxLevel = Math.max(100, currentLevel + 20);
    const effectiveTileLength = Math.max(1, tileLength - TILE_OVERLAP);

    const [selection, setSelection] = useState<EditorSelection | null>(null);
    const [snapEnabled, setSnapEnabled] = useState(false);
    const [snapSize, setSnapSize] = useState(25);
    const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
    const dragRef = useRef<DragState | null>(null);

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

    const ensureRegionExpanded = (region: RegionComputed) => {
        const current = stones[orientationKey][region.id] ?? [];
        const expanded = expandToTileCount(current, region.tileCount);
        if (expanded !== current) {
            setStones(prev => ({ ...prev, [orientationKey]: { ...prev[orientationKey], [region.id]: expanded } }));
        }
        return expanded;
    };

    type RenderWaypoint = Waypoint & { key: string; afterLevel: number; isStone: boolean; regionId: string; level?: number; index?: number; id?: string };

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

    // --- Editor: drag lifecycle -------------------------------------------------

    const beginStoneDrag = (level: number, e: React.PointerEvent) => {
        if (!editMode) return;
        e.preventDefault(); e.stopPropagation();
        const region = regions.find(r => level >= r.start && level <= r.end) ?? regions[regions.length - 1];
        const local = level - region.start;
        const expanded = ensureRegionExpanded(region);
        const [startX, startY] = expanded[local] ?? [50, 50];
        dragRef.current = { kind: "stone", regionId: region.id, index: local, startClientX: e.clientX, startClientY: e.clientY, startX, startY };
        setSelection({ type: "stone", level, regionId: region.id, index: local, part: "anchor" });
        (e.currentTarget as Element).setPointerCapture(e.pointerId);
    };

    const beginPathDrag = (regionId: string, id: string, e: React.PointerEvent) => {
        if (!editMode) return;
        e.preventDefault(); e.stopPropagation();
        const p = pathPointsForRegion(pathPoints[orientationKey], regionId).find(pp => pp.id === id);
        if (!p) return;
        dragRef.current = { kind: "path", regionId, id, startClientX: e.clientX, startClientY: e.clientY, startX: p.x, startY: p.y };
        setSelection({ type: "path", regionId, id, part: "anchor" });
        (e.currentTarget as Element).setPointerCapture(e.pointerId);
    };

    const autoHandleOutFor = (key: string): [number, number] => {
        const idx = waypoints.findIndex(w => w.key === key);
        if (idx < 0) return [0, 0];
        const w = waypoints[idx];
        const prevW = waypoints[idx - 1] ?? w;
        const nextW = waypoints[idx + 1] ?? w;
        const screenOffset = autoTangentOffset(prevW, nextW);
        const { dx, dy } = pxDeltaToPercent(screenOffset[0], screenOffset[1], landscape, tileLength, crossSize);
        return [dx, dy];
    };

    const beginStoneHandleDrag = (level: number, which: "in" | "out", e: React.PointerEvent) => {
        if (!editMode) return;
        e.preventDefault(); e.stopPropagation();
        const region = regions.find(r => level >= r.start && level <= r.end) ?? regions[regions.length - 1];
        const local = level - region.start;
        ensureRegionExpanded(region);
        const explicit = getStoneHandles(stoneHandles[orientationKey], region.id, local)[which];
        const autoOut = autoHandleOutFor(`stone:${level}`);
        const startOffset: [number, number] = explicit ?? (which === "out" ? autoOut : negateAnchor(autoOut));
        dragRef.current = { kind: "stone-handle", regionId: region.id, index: local, which, startClientX: e.clientX, startClientY: e.clientY, startOffset, mirror: !e.altKey };
        setSelection({ type: "stone", level, regionId: region.id, index: local, part: which === "in" ? "handleIn" : "handleOut" });
        (e.currentTarget as Element).setPointerCapture(e.pointerId);
    };

    const beginPathHandleDrag = (regionId: string, id: string, which: "in" | "out", e: React.PointerEvent) => {
        if (!editMode) return;
        e.preventDefault(); e.stopPropagation();
        const p = pathPointsForRegion(pathPoints[orientationKey], regionId).find(pp => pp.id === id);
        if (!p) return;
        const explicit = which === "out" ? p.handleOut : p.handleIn;
        const autoOut = autoHandleOutFor(`path:${id}`);
        const startOffset: [number, number] = explicit ?? (which === "out" ? autoOut : negateAnchor(autoOut));
        dragRef.current = { kind: "path-handle", regionId, id, which, startClientX: e.clientX, startClientY: e.clientY, startOffset, mirror: !e.altKey };
        setSelection({ type: "path", regionId, id, part: which === "in" ? "handleIn" : "handleOut" });
        (e.currentTarget as Element).setPointerCapture(e.pointerId);
    };

    const beginTransitionDrag = (id: string, part: "center" | "span", edge: "start" | "end", e: React.PointerEvent) => {
        if (!editMode) return;
        e.preventDefault(); e.stopPropagation();
        const idx = transitions.findIndex(t => t.id === id);
        const t = transitions[idx];
        if (!t) return;
        const baseSpan = defaultTransitionSpan(!!t.imageLandscape, tileLength);
        const override = t[orientationKey];
        if (part === "center") {
            dragRef.current = { kind: "transition-center", id, startClientX: e.clientX, startClientY: e.clientY, startOffset: override?.centerOffset ?? 0 };
        } else {
            dragRef.current = { kind: "transition-span", id, edge, startClientX: e.clientX, startClientY: e.clientY, startSpan: resolveTransitionSpan(baseSpan, override) };
        }
        setSelection({ type: "transition", id, part });
        (e.currentTarget as Element).setPointerCapture(e.pointerId);
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        const drag = dragRef.current;
        if (!drag) return;
        const rawDx = e.clientX - drag.startClientX;
        const rawDy = e.clientY - drag.startClientY;
        const dxPx = snapEnabled ? snapValue(rawDx, snapSize) : rawDx;
        const dyPx = snapEnabled ? snapValue(rawDy, snapSize) : rawDy;

        if (drag.kind === "stone") {
            const { dx, dy } = pxDeltaToPercent(dxPx, dyPx, landscape, tileLength, crossSize);
            const newX = clampPercent(drag.startX + dx), newY = clampPercent(drag.startY + dy);
            setStones(prev => {
                const arr = [...(prev[orientationKey][drag.regionId] ?? [])];
                arr[drag.index] = [newX, newY];
                return { ...prev, [orientationKey]: { ...prev[orientationKey], [drag.regionId]: arr } };
            });
        } else if (drag.kind === "path") {
            const { dx, dy } = pxDeltaToPercent(dxPx, dyPx, landscape, tileLength, crossSize);
            setPathPoints(prev => ({ ...prev, [orientationKey]: movePathPoint(prev[orientationKey], drag.regionId, drag.id, drag.startX + dx, drag.startY + dy) }));
        } else if (drag.kind === "stone-handle") {
            const { dx, dy } = pxDeltaToPercent(dxPx, dyPx, landscape, tileLength, crossSize);
            const newOffset: [number, number] = [clampOffset(drag.startOffset[0] + dx), clampOffset(drag.startOffset[1] + dy)];
            setStoneHandles(prev => {
                let next = { ...prev, [orientationKey]: setStoneHandle(prev[orientationKey], drag.regionId, drag.index, drag.which, newOffset) };
                if (drag.mirror) {
                    const opposite = drag.which === "out" ? "in" : "out";
                    next = { ...next, [orientationKey]: setStoneHandle(next[orientationKey], drag.regionId, drag.index, opposite, negateAnchor(newOffset)) };
                }
                return next;
            });
        } else if (drag.kind === "path-handle") {
            const { dx, dy } = pxDeltaToPercent(dxPx, dyPx, landscape, tileLength, crossSize);
            const newOffset: [number, number] = [clampOffset(drag.startOffset[0] + dx), clampOffset(drag.startOffset[1] + dy)];
            setPathPoints(prev => {
                let next = { ...prev, [orientationKey]: setPathPointHandle(prev[orientationKey], drag.regionId, drag.id, drag.which, newOffset) };
                if (drag.mirror) {
                    const opposite = drag.which === "out" ? "in" : "out";
                    next = { ...next, [orientationKey]: setPathPointHandle(next[orientationKey], drag.regionId, drag.id, opposite, negateAnchor(newOffset)) };
                }
                return next;
            });
        } else if (drag.kind === "transition-center") {
            const deltaPx = landscape ? dxPx : dyPx;
            setTransitions(prev => prev.map(t => {
                if (t.id !== drag.id) return t;
                const baseSpan = defaultTransitionSpan(!!t.imageLandscape, tileLength);
                return { ...t, [orientationKey]: { span: t[orientationKey]?.span ?? baseSpan, centerOffset: drag.startOffset + deltaPx } };
            }));
        } else if (drag.kind === "transition-span") {
            const deltaPx = landscape ? dxPx : dyPx;
            const signed = drag.edge === "end" ? deltaPx : -deltaPx;
            setTransitions(prev => prev.map(t => {
                if (t.id !== drag.id) return t;
                const newSpan = Math.max(60, drag.startSpan + signed * 2);
                return { ...t, [orientationKey]: { centerOffset: t[orientationKey]?.centerOffset ?? 0, span: newSpan } };
            }));
        }
    };

    const handlePointerUp = () => { dragRef.current = null; };

    const handleEditorKeyDown = (e: React.KeyboardEvent) => {
        if (!editMode || !selection) return;
        if (selection.type === "path" && selection.part === "anchor" && (e.key === "Delete" || e.key === "Backspace")) {
            e.preventDefault();
            setPathPoints(prev => ({ ...prev, [orientationKey]: removePathPoint(prev[orientationKey], selection.regionId, selection.id) }));
            setSelection(null);
            return;
        }
        const arrows: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
        const delta = arrows[e.key];
        if (!delta || selection.part !== "anchor") return;
        e.preventDefault();
        const step = e.shiftKey ? snapSize : 1;
        const { dx, dy } = pxDeltaToPercent(delta[0] * step, delta[1] * step, landscape, tileLength, crossSize);
        if (selection.type === "stone") {
            setStones(prev => {
                const arr = [...(prev[orientationKey][selection.regionId] ?? [])];
                const [cx, cy] = arr[selection.index] ?? [50, 50];
                arr[selection.index] = [clampPercent(cx + dx), clampPercent(cy + dy)];
                return { ...prev, [orientationKey]: { ...prev[orientationKey], [selection.regionId]: arr } };
            });
        } else if (selection.type === "path") {
            const p = pathPointsForRegion(pathPoints[orientationKey], selection.regionId).find(pp => pp.id === selection.id);
            if (!p) return;
            setPathPoints(prev => ({ ...prev, [orientationKey]: movePathPoint(prev[orientationKey], selection.regionId, selection.id, p.x + dx, p.y + dy) }));
        }
    };

    const handleAddPathPoint = () => {
        if (!selection || selection.type !== "stone" || selection.level >= maxLevel) return;
        const { regionId, index } = selection;
        const region = regions.find(r => r.id === regionId);
        if (!region) return;
        const expanded = ensureRegionExpanded(region);
        const [x1, y1] = expanded[index] ?? [50, 50];
        const [x2, y2] = expanded[index + 1] ?? [x1, y1];
        const id = `pp-${Date.now()}-${Math.floor(Math.random() * 1e4)}`;
        setPathPoints(prev => ({ ...prev, [orientationKey]: insertPathPoint(prev[orientationKey], regionId, index, (x1 + x2) / 2, (y1 + y2) / 2, id) }));
        setSelection({ type: "path", regionId, id, part: "anchor" });
    };

    const handleRemovePathPoint = () => {
        if (!selection || selection.type !== "path") return;
        setPathPoints(prev => ({ ...prev, [orientationKey]: removePathPoint(prev[orientationKey], selection.regionId, selection.id) }));
        setSelection(null);
    };

    const handleResetRegion = () => {
        const regionId = visibleRegion.id;
        setStones(prev => ({ ...prev, [orientationKey]: { ...prev[orientationKey], [regionId]: cloneLayout(originalLayout.stones[orientationKey][regionId] ?? []) } }));
        setStoneHandles(prev => ({ ...prev, [orientationKey]: { ...prev[orientationKey], [regionId]: cloneLayout(originalLayout.stoneHandles[orientationKey][regionId] ?? {}) } }));
        setPathPoints(prev => ({ ...prev, [orientationKey]: { ...prev[orientationKey], [regionId]: cloneLayout(originalLayout.pathPoints[orientationKey][regionId] ?? []) } }));
        setSelection(null);
    };

    const handleResetAll = () => {
        setStones(cloneLayout(originalLayout.stones));
        setStoneHandles(cloneLayout(originalLayout.stoneHandles));
        setPathPoints(cloneLayout(originalLayout.pathPoints));
        setTransitions(cloneLayout(originalLayout.transitions));
        setSelection(null);
    };

    const handleSave = async () => {
        setSaveStatus("saving");
        try {
            const payload = { stones, stoneHandles, pathPoints, transitions };
            const res = await fetch("/__ws-trail-editor/save", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
            if (!res.ok) {
                const body = await res.json().catch(() => null);
                throw new Error(body?.error ?? res.statusText);
            }
            setSaveStatus("saved");
            window.setTimeout(() => setSaveStatus(s => s === "saved" ? "idle" : s), 2500);
        } catch (err) {
            console.error("Trail editor save failed", err);
            setSaveStatus("error");
        }
    };

    const handleMistColorChange = (color: string) => {
        if (!selection || selection.type !== "transition") return;
        setTransitions(prev => prev.map(t => t.id === selection.id ? { ...t, mistColor: color } : t));
    };

    // --- Render ------------------------------------------------------------

    const selectedRegion = regionForLevel(selected);
    const activeWaypoints = waypoints.filter(w => w.afterLevel < currentLevel || (w.afterLevel === currentLevel && w.isStone));
    const lockedWaypoints = waypoints.filter(w => w.afterLevel >= currentLevel);
    const activeRoutePath = buildBezierPath(activeWaypoints);
    const lockedRoutePath = buildBezierPath(lockedWaypoints);

    const selectedTransition = selection?.type === "transition" ? transitions.find(t => t.id === selection.id) ?? null : null;
    const selectedTransitionSpan = selectedTransition ? resolveTransitionSpan(defaultTransitionSpan(!!selectedTransition.imageLandscape, tileLength), selectedTransition[orientationKey]) : null;
    const selectedTransitionOffset = selectedTransition ? (selectedTransition[orientationKey]?.centerOffset ?? 0) : null;
    const selectedStoneCoords = selection?.type === "stone" ? (stones[orientationKey][selection.regionId]?.[selection.index] ?? null) : null;
    const selectedPathCoords = selection?.type === "path"
        ? (() => { const p = pathPointsForRegion(pathPoints[orientationKey], selection.regionId).find(pp => pp.id === selection.id); return p ? [p.x, p.y] as [number, number] : null; })()
        : null;
    const selectionLabel = !selection ? null
        : selection.type === "stone" ? `Level ${selection.level} · ${regionForLevel(selection.level).name}${selection.part !== "anchor" ? ` (${selection.part === "handleIn" ? "in" : "out"} handle)` : ""}`
        : selection.type === "path" ? `Path point${selection.part !== "anchor" ? ` (${selection.part === "handleIn" ? "in" : "out"} handle)` : ""}`
        : `Seam · ${selection.id}`;

    return <section className={`ws-trail ws-trail--${landscape ? "landscape" : "portrait"}${editMode ? " ws-trail--editing" : ""}`} aria-label="Level trail">
        <header className="ws-trail__header">
            <div>
                <span className="ws-trail__eyebrow">YOUR WOODLAND JOURNEY</span>
                <h2>{visibleRegion.name}</h2>
            </div>
            <button className="ws-trail__locate" onClick={returnToCurrent}>Level {currentLevel} <span aria-hidden="true">↗</span></button>
        </header>
        {editMode && <TrailEditorToolbar
            regions={regions.map(r => ({ id: r.id, name: r.name, tileCount: r.tileCount }))}
            orientation={orientationKey}
            onOrientationChange={o => setOrientationOverride(o === "landscape")}
            onJump={scrollToRegionTile}
            snapEnabled={snapEnabled}
            onSnapEnabledChange={setSnapEnabled}
            snapSize={snapSize}
            onSnapSizeChange={setSnapSize}
            selectionLabel={selectionLabel}
            stoneCoords={selectedStoneCoords}
            pathCoords={selectedPathCoords}
            transition={selectedTransition}
            transitionOffset={selectedTransitionOffset}
            transitionSpan={selectedTransitionSpan}
            onMistColorChange={handleMistColorChange}
            canAddPathPoint={selection?.type === "stone" && selection.part === "anchor" && selection.level < maxLevel}
            onAddPathPoint={handleAddPathPoint}
            canRemovePathPoint={selection?.type === "path" && selection.part === "anchor"}
            onRemovePathPoint={handleRemovePathPoint}
            onResetRegion={handleResetRegion}
            onResetAll={handleResetAll}
            onSave={handleSave}
            saveStatus={saveStatus}
        />}
        <div className="ws-trail__layout"><div className="ws-trail__map-shell"><div
            className="ws-trail__scroll"
            ref={scrollRef}
            tabIndex={0}
            aria-label="Scroll through levels"
            onKeyDown={editMode ? handleEditorKeyDown : undefined}
        ><div
            className="ws-trail__map"
            style={{ width: landscape ? totalLength : crossSize, height: landscape ? crossSize : totalLength }}
            onPointerMove={editMode ? handlePointerMove : undefined}
            onPointerUp={editMode ? handlePointerUp : undefined}
            onPointerCancel={editMode ? handlePointerUp : undefined}
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
                                backgroundImage: `url("${assetUrl(`backgrounds/levels/${region.id}-${landscape ? "landscape" : "portrait"}.webp`)}")`,
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
                const baseSpan = defaultTransitionSpan(!!transDef.imageLandscape, tileLength);
                const span = resolveTransitionSpan(baseSpan, override);
                const center = resolveTransitionCenter(seamBoundaries[idx], override);
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
                {editMode && selection && (selection.type === "stone" || selection.type === "path") && (() => {
                    const key = selection.type === "stone" ? `stone:${selection.level}` : `path:${selection.id}`;
                    const w = waypoints.find(wp => wp.key === key);
                    if (!w) return null;
                    const idx = waypoints.indexOf(w);
                    const prevW = waypoints[idx - 1] ?? w;
                    const nextW = waypoints[idx + 1] ?? w;
                    const autoOut = autoTangentOffset(prevW, nextW);
                    const outPt = w.handleOut ? { x: w.x + w.handleOut[0], y: w.y + w.handleOut[1] } : { x: w.x + autoOut[0], y: w.y + autoOut[1] };
                    const inOffset = w.handleIn ?? negateAnchor(autoOut);
                    const inPt = { x: w.x + inOffset[0], y: w.y + inOffset[1] };
                    return <g className="ws-trail__bezier-guides">
                        <line x1={w.x} y1={w.y} x2={outPt.x} y2={outPt.y} className="ws-trail__bezier-line" />
                        <line x1={w.x} y1={w.y} x2={inPt.x} y2={inPt.y} className="ws-trail__bezier-line" />
                    </g>;
                })()}
            </svg>
            {Array.from({ length: maxLevel }, (_, i) => i + 1).map(level => {
                const p = point(level), complete = level < currentLevel, active = level === currentLevel, locked = level > currentLevel;
                const isEditorActive = editMode && selection?.type === "stone" && selection.level === level && selection.part === "anchor";
                return <div key={level} className="ws-trail__stop" style={{ left: p.x, top: p.y }}>
                    {active && <span className="ws-trail__here">YOU ARE HERE</span>}
                    <button
                        className={`ws-trail__node ${active ? "is-current" : complete ? "is-complete" : "is-locked"} ${selected === level ? "is-selected" : ""} ${isEditorActive ? "is-editor-active" : ""} ${editMode ? "ws-trail__node--editable" : ""}`}
                        disabled={locked && !editMode}
                        aria-label={`Level ${level}, ${active ? "current" : complete ? "completed" : "locked"}`}
                        aria-pressed={selected === level}
                        aria-current={active ? "step" : undefined}
                        onClick={() => { setSelected(level); if (editMode) { const anchor = resolveStoneAnchor(level); setSelection({ type: "stone", level, regionId: anchor.region.id, index: anchor.index, part: "anchor" }); } }}
                        onPointerDown={editMode ? e => beginStoneDrag(level, e) : undefined}
                    ><span>{level}</span>{locked ? <LockRounded className="ws-trail__status" /> : complete ? <CheckRounded className="ws-trail__status" /> : null}</button>
                    {active && <span className="ws-trail__next">Let it bloom</span>}
                </div>;
            })}
            {editMode && waypoints.filter(w => !w.isStone).map(w => {
                const isActive = selection?.type === "path" && selection.id === w.id && selection.part === "anchor";
                return <button
                    key={w.key}
                    type="button"
                    className={`ws-trail__path-handle ${isActive ? "is-editor-active" : ""}`}
                    style={{ left: w.x, top: w.y }}
                    aria-label="Path point"
                    onPointerDown={e => beginPathDrag(w.regionId, w.id!, e)}
                />;
            })}
            {editMode && selection && (selection.type === "stone" || selection.type === "path") && (() => {
                const key = selection.type === "stone" ? `stone:${selection.level}` : `path:${selection.id}`;
                const w = waypoints.find(wp => wp.key === key);
                if (!w) return null;
                const idx = waypoints.indexOf(w);
                const prevW = waypoints[idx - 1] ?? w;
                const nextW = waypoints[idx + 1] ?? w;
                const autoOut = autoTangentOffset(prevW, nextW);
                const outPt = w.handleOut ? { x: w.x + w.handleOut[0], y: w.y + w.handleOut[1] } : { x: w.x + autoOut[0], y: w.y + autoOut[1] };
                const inOffset = w.handleIn ?? negateAnchor(autoOut);
                const inPt = { x: w.x + inOffset[0], y: w.y + inOffset[1] };
                const beginHandle = (which: "in" | "out", e: React.PointerEvent) => selection.type === "stone"
                    ? beginStoneHandleDrag(selection.level, which, e)
                    : beginPathHandleDrag(selection.regionId, selection.id, which, e);
                return <>
                    <button type="button" className={`ws-trail__bezier-handle ${selection.part === "handleOut" ? "is-editor-active" : ""}`} style={{ left: outPt.x, top: outPt.y }} aria-label="Curve handle (out)" onPointerDown={e => beginHandle("out", e)} />
                    <button type="button" className={`ws-trail__bezier-handle ${selection.part === "handleIn" ? "is-editor-active" : ""}`} style={{ left: inPt.x, top: inPt.y }} aria-label="Curve handle (in)" onPointerDown={e => beginHandle("in", e)} />
                </>;
            })()}
            {editMode && regions.slice(0, -1).map((_region, idx) => {
                const transDef = transitions[idx];
                if (!transDef) return null;
                const override = transDef[orientationKey];
                const baseSpan = defaultTransitionSpan(!!transDef.imageLandscape, tileLength);
                const span = resolveTransitionSpan(baseSpan, override);
                const center = resolveTransitionCenter(seamBoundaries[idx], override);
                const centerPos = landscape ? { left: center, top: crossSize / 2 } : { left: crossSize / 2, top: totalLength - center };
                const spanPos = landscape ? { left: center + span / 2, top: crossSize * 0.25 } : { left: crossSize * 0.25, top: totalLength - center - span / 2 };
                const isSel = selection?.type === "transition" && selection.id === transDef.id;
                return <div key={`handle-${transDef.id}`}>
                    <button type="button" className={`ws-trail__seam-handle ws-trail__seam-handle--center ${isSel && selection.part === "center" ? "is-editor-active" : ""}`} style={centerPos} aria-label={`Move ${transDef.id} seam`} onPointerDown={e => beginTransitionDrag(transDef.id, "center", "end", e)} />
                    <button type="button" className={`ws-trail__seam-handle ws-trail__seam-handle--span ${isSel && selection.part === "span" ? "is-editor-active" : ""}`} style={spanPos} aria-label={`Resize ${transDef.id} seam`} onPointerDown={e => beginTransitionDrag(transDef.id, "span", "end", e)} />
                </div>;
            })}
        </div></div></div></div>
        <aside className="ws-trail__detail" aria-label="Selected level"><img className="ws-trail__sprout" src={assetUrl("plants/sprout.png")} alt="" /><div className="ws-trail__detail-copy"><span className="ws-trail__eyebrow">{selected < currentLevel ? "COMPLETED • PLAY AGAIN" : "YOUR NEXT ADVENTURE"}</span><h3>Level {selected}</h3><p>{selectedRegion.name}<br />{selectedRegion.tagline}</p></div><div className="ws-trail__rewards"><span><img src={assetUrl("seed.png")} alt="" /><b>+{REWARDS.LEVEL_COMPLETE_SEEDS}</b> completion</span><small>+{REWARDS.BONUS_WORD_SEEDS} Seeds for each bonus word</small></div><button className="ws-trail__play" onClick={() => onSelectLevel(selected)}><PlayArrowRounded />{selected < currentLevel ? "Replay level" : "Play level"}</button><p className="ws-trail__hint">Follow the light. Find every word to grow your trail.</p></aside>
    </section>;
}
