import { useRef, useState, type Dispatch, type SetStateAction } from "react";
import { createPortal } from "react-dom";
import type { HandleMap, BiomeTransitionLayout, PathPointMap, StoneMap, TrailLayout } from "../data/trailLayout";
import type { RegionComputed, RenderWaypoint } from "./LevelsView";
import {
    type OrientationKey,
    autoTangentOffset, clampPercent, defaultTransitionSpan,
    expandToTileCount, getStoneHandles, insertPathPoint, movePathPoint, negateAnchor,
    pathPointsForRegion, pxDeltaToPercent, removePathPoint,
    resolveTransitionCenter, resolveTransitionSpan, setPathPointHandle, setStoneHandle, snapValue,
} from "../trail/trailEditing";
import TrailEditorToolbar from "./TrailEditorToolbar";
import "./TrailEditorOverlay.css";

const HANDLE_OFFSET_LIMIT = 80;
const clampOffset = (v: number) => Math.min(HANDLE_OFFSET_LIMIT, Math.max(-HANDLE_OFFSET_LIMIT, v));

// Mirrors LevelsView's own DragState/EditorSelection shapes -- kept here
// rather than shared because both are purely internal to the editor and
// this module is the only thing that ever constructs or reads them.
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

type Props = {
    regions: RegionComputed[];
    landscape: boolean;
    orientationKey: OrientationKey;
    onOrientationChange: (o: OrientationKey) => void;
    tileLength: number;
    crossSize: number;
    totalLength: number;
    maxLevel: number;
    seamBoundaries: number[];
    waypoints: RenderWaypoint[];
    stones: { portrait: StoneMap; landscape: StoneMap };
    setStones: Dispatch<SetStateAction<{ portrait: StoneMap; landscape: StoneMap }>>;
    stoneHandles: { portrait: HandleMap; landscape: HandleMap };
    setStoneHandles: Dispatch<SetStateAction<{ portrait: HandleMap; landscape: HandleMap }>>;
    pathPoints: { portrait: PathPointMap; landscape: PathPointMap };
    setPathPoints: Dispatch<SetStateAction<{ portrait: PathPointMap; landscape: PathPointMap }>>;
    transitions: BiomeTransitionLayout[];
    setTransitions: Dispatch<SetStateAction<BiomeTransitionLayout[]>>;
    originalLayout: TrailLayout;
    visibleRegionId: string;
    onSelectStone: (level: number) => void;
    onJump: (regionId: string, tile: number) => void;
    mapHostRef: React.RefObject<HTMLDivElement | null>;
};

const cloneLayout = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

export default function TrailEditorOverlay(props: Props) {
    const {
        regions, landscape, orientationKey, onOrientationChange, tileLength, crossSize, totalLength, maxLevel,
        seamBoundaries, waypoints, stones, setStones, stoneHandles, setStoneHandles, pathPoints, setPathPoints,
        transitions, setTransitions, originalLayout, visibleRegionId, onSelectStone, onJump, mapHostRef,
    } = props;

    const [selection, setSelection] = useState<EditorSelection | null>(null);
    const [snapEnabled, setSnapEnabled] = useState(false);
    const [snapSize, setSnapSize] = useState(25);
    const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
    const dragRef = useRef<DragState | null>(null);

    const stoneByLevel = new Map(waypoints.filter(w => w.isStone).map(w => [w.level!, w]));

    const ensureRegionExpanded = (region: RegionComputed) => {
        const current = stones[orientationKey][region.id] ?? [];
        const expanded = expandToTileCount(current, region.tileCount);
        if (expanded !== current) {
            setStones(prev => ({ ...prev, [orientationKey]: { ...prev[orientationKey], [region.id]: expanded } }));
        }
        return expanded;
    };

    const beginStoneDrag = (level: number, e: React.PointerEvent) => {
        e.preventDefault(); e.stopPropagation();
        const region = regions.find(r => level >= r.start && level <= r.end) ?? regions[regions.length - 1];
        const local = level - region.start;
        const expanded = ensureRegionExpanded(region);
        const [startX, startY] = expanded[local] ?? [50, 50];
        dragRef.current = { kind: "stone", regionId: region.id, index: local, startClientX: e.clientX, startClientY: e.clientY, startX, startY };
        setSelection({ type: "stone", level, regionId: region.id, index: local, part: "anchor" });
        onSelectStone(level);
        (e.currentTarget as Element).setPointerCapture(e.pointerId);
    };

    const beginPathDrag = (regionId: string, id: string, e: React.PointerEvent) => {
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
        e.preventDefault(); e.stopPropagation();
        const t = transitions.find(t => t.id === id);
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
        if (!selection) return;
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
        const regionId = visibleRegionId;
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

    const selectedTransition = selection?.type === "transition" ? transitions.find(t => t.id === selection.id) ?? null : null;
    const selectedTransitionSpan = selectedTransition ? resolveTransitionSpan(defaultTransitionSpan(!!selectedTransition.imageLandscape, tileLength), selectedTransition[orientationKey]) : null;
    const selectedTransitionOffset = selectedTransition ? (selectedTransition[orientationKey]?.centerOffset ?? 0) : null;
    const selectedStoneCoords = selection?.type === "stone" ? (stones[orientationKey][selection.regionId]?.[selection.index] ?? null) : null;
    const selectedPathCoords = selection?.type === "path"
        ? (() => { const p = pathPointsForRegion(pathPoints[orientationKey], selection.regionId).find(pp => pp.id === selection.id); return p ? [p.x, p.y] as [number, number] : null; })()
        : null;
    const selectionLabel = !selection ? null
        : selection.type === "stone" ? `Level ${selection.level}${selection.part !== "anchor" ? ` (${selection.part === "handleIn" ? "in" : "out"} handle)` : ""}`
        : selection.type === "path" ? `Path point${selection.part !== "anchor" ? ` (${selection.part === "handleIn" ? "in" : "out"} handle)` : ""}`
        : `Seam · ${selection.id}`;

    const selectedWaypoint = selection && (selection.type === "stone" || selection.type === "path")
        ? waypoints.find(w => w.key === (selection.type === "stone" ? `stone:${selection.level}` : `path:${selection.id}`))
        : undefined;

    return <>
        <TrailEditorToolbar
            regions={regions.map(r => ({ id: r.id, name: r.name, tileCount: r.tileCount }))}
            orientation={orientationKey}
            onOrientationChange={onOrientationChange}
            onJump={onJump}
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
        />
        {mapHostRef.current && createPortal(
            <div
                className="ws-trail-overlay"
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                onKeyDown={handleEditorKeyDown}
            >
                <svg className="ws-trail-overlay__guides" aria-hidden="true" viewBox={`0 0 ${landscape ? totalLength : crossSize} ${landscape ? crossSize : totalLength}`} preserveAspectRatio="none">
                    {selectedWaypoint && (() => {
                        const w = selectedWaypoint;
                        const idx = waypoints.indexOf(w);
                        const prevW = waypoints[idx - 1] ?? w;
                        const nextW = waypoints[idx + 1] ?? w;
                        const autoOut = autoTangentOffset(prevW, nextW);
                        const outPt = w.handleOut ? { x: w.x + w.handleOut[0], y: w.y + w.handleOut[1] } : { x: w.x + autoOut[0], y: w.y + autoOut[1] };
                        const inOffset = w.handleIn ?? negateAnchor(autoOut);
                        const inPt = { x: w.x + inOffset[0], y: w.y + inOffset[1] };
                        return <g>
                            <line x1={w.x} y1={w.y} x2={outPt.x} y2={outPt.y} className="ws-trail__bezier-line" />
                            <line x1={w.x} y1={w.y} x2={inPt.x} y2={inPt.y} className="ws-trail__bezier-line" />
                        </g>;
                    })()}
                </svg>
                {Array.from({ length: maxLevel }, (_, i) => i + 1).map(level => {
                    const w = stoneByLevel.get(level);
                    if (!w) return null;
                    const isActive = selection?.type === "stone" && selection.level === level && selection.part === "anchor";
                    return <button
                        key={level}
                        type="button"
                        className={`ws-trail-overlay__stone-hit ${isActive ? "is-editor-active" : ""}`}
                        style={{ left: w.x, top: w.y }}
                        aria-label={`Edit level ${level} stone`}
                        onPointerDown={e => beginStoneDrag(level, e)}
                    />;
                })}
                {waypoints.filter(w => !w.isStone).map(w => {
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
                {selectedWaypoint && (() => {
                    const w = selectedWaypoint;
                    const idx = waypoints.indexOf(w);
                    const prevW = waypoints[idx - 1] ?? w;
                    const nextW = waypoints[idx + 1] ?? w;
                    const autoOut = autoTangentOffset(prevW, nextW);
                    const outPt = w.handleOut ? { x: w.x + w.handleOut[0], y: w.y + w.handleOut[1] } : { x: w.x + autoOut[0], y: w.y + autoOut[1] };
                    const inOffset = w.handleIn ?? negateAnchor(autoOut);
                    const inPt = { x: w.x + inOffset[0], y: w.y + inOffset[1] };
                    const beginHandle = (which: "in" | "out", e: React.PointerEvent) => selection!.type === "stone"
                        ? beginStoneHandleDrag((selection as { type: "stone"; level: number }).level, which, e)
                        : beginPathHandleDrag((selection as { type: "path"; regionId: string; id: string }).regionId, (selection as { type: "path"; regionId: string; id: string }).id, which, e);
                    return <>
                        <button type="button" className={`ws-trail__bezier-handle ${selection?.part === "handleOut" ? "is-editor-active" : ""}`} style={{ left: outPt.x, top: outPt.y }} aria-label="Curve handle (out)" onPointerDown={e => beginHandle("out", e)} />
                        <button type="button" className={`ws-trail__bezier-handle ${selection?.part === "handleIn" ? "is-editor-active" : ""}`} style={{ left: inPt.x, top: inPt.y }} aria-label="Curve handle (in)" onPointerDown={e => beginHandle("in", e)} />
                    </>;
                })()}
                {regions.slice(0, -1).map((_region, idx) => {
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
            </div>,
            mapHostRef.current,
        )}
    </>;
}
