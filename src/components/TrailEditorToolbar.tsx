import { useRef, useState } from "react";
import type { OrientationKey, TrailAnchor } from "../trail/trailEditing";
import type { BiomeTransitionLayout } from "../data/trailLayout";
import "./TrailEditorToolbar.css";

export type RegionSummary = { id: string; name: string; tileCount: number };

type Props = {
    regions: RegionSummary[];
    orientation: OrientationKey;
    onOrientationChange: (o: OrientationKey) => void;
    onJump: (regionId: string, tile: number) => void;
    snapEnabled: boolean;
    onSnapEnabledChange: (v: boolean) => void;
    snapSize: number;
    onSnapSizeChange: (v: number) => void;
    selectionLabel: string | null;
    stoneCoords: TrailAnchor | null;
    pathCoords: TrailAnchor | null;
    transition: BiomeTransitionLayout | null;
    transitionOffset: number | null;
    transitionSpan: number | null;
    onMistColorChange: (c: string) => void;
    canAddPathPoint: boolean;
    onAddPathPoint: () => void;
    canRemovePathPoint: boolean;
    onRemovePathPoint: () => void;
    onResetRegion: () => void;
    onResetAll: () => void;
    onSave: () => void;
    saveStatus: "idle" | "saving" | "saved" | "error";
};

export default function TrailEditorToolbar(props: Props) {
    const [jumpRegion, setJumpRegion] = useState(props.regions[0]?.id ?? "");
    const [jumpTile, setJumpTile] = useState(0);
    const jumpRegionTileCount = props.regions.find(r => r.id === jumpRegion)?.tileCount ?? 1;

    // The panel starts pinned at its CSS left/top; dragging just layers a
    // translate on top so it can be pulled off whatever stones it's
    // covering without fighting the stylesheet's positioning.
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const dragStart = useRef<{ pointerX: number; pointerY: number; baseX: number; baseY: number } | null>(null);

    const onTitlePointerDown = (e: React.PointerEvent) => {
        dragStart.current = { pointerX: e.clientX, pointerY: e.clientY, baseX: dragOffset.x, baseY: dragOffset.y };
        (e.currentTarget as Element).setPointerCapture(e.pointerId);
    };
    const onTitlePointerMove = (e: React.PointerEvent) => {
        if (!dragStart.current) return;
        const { pointerX, pointerY, baseX, baseY } = dragStart.current;
        setDragOffset({ x: baseX + (e.clientX - pointerX), y: baseY + (e.clientY - pointerY) });
    };
    const onTitlePointerUp = () => { dragStart.current = null; };

    return (
        <div className="ws-trail-editor" role="region" aria-label="Trail editor" style={{ transform: `translate(${dragOffset.x}px, ${dragOffset.y}px)` }}>
            <div
                className="ws-trail-editor__row ws-trail-editor__row--title"
                onPointerDown={onTitlePointerDown}
                onPointerMove={onTitlePointerMove}
                onPointerUp={onTitlePointerUp}
                onPointerCancel={onTitlePointerUp}
            >
                <strong>⠿ Trail Editor</strong>
                <span className={`ws-trail-editor__status ws-trail-editor__status--${props.saveStatus}`}>
                    {props.saveStatus === "saving" ? "Saving…" : props.saveStatus === "saved" ? "Saved" : props.saveStatus === "error" ? "Save failed" : ""}
                </span>
            </div>

            <div className="ws-trail-editor__row">
                <span className="ws-trail-editor__label">View</span>
                <div className="ws-trail-editor__seg">
                    <button type="button" className={props.orientation === "portrait" ? "is-active" : ""} onClick={() => props.onOrientationChange("portrait")}>Portrait</button>
                    <button type="button" className={props.orientation === "landscape" ? "is-active" : ""} onClick={() => props.onOrientationChange("landscape")}>Landscape</button>
                </div>
            </div>

            <div className="ws-trail-editor__row">
                <span className="ws-trail-editor__label">Jump</span>
                <select value={jumpRegion} onChange={e => { setJumpRegion(e.target.value); setJumpTile(0); }}>
                    {props.regions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
                <select value={jumpTile} onChange={e => setJumpTile(Number(e.target.value))}>
                    {Array.from({ length: jumpRegionTileCount }, (_, i) => <option key={i} value={i}>Tile {i + 1}</option>)}
                </select>
                <button type="button" onClick={() => props.onJump(jumpRegion, jumpTile)}>Go</button>
            </div>

            <div className="ws-trail-editor__row">
                <label className="ws-trail-editor__label">
                    <input type="checkbox" checked={props.snapEnabled} onChange={e => props.onSnapEnabledChange(e.target.checked)} /> Snap
                </label>
                <input
                    type="number"
                    min={5}
                    max={100}
                    step={5}
                    value={props.snapSize}
                    disabled={!props.snapEnabled}
                    onChange={e => props.onSnapSizeChange(Math.max(5, Number(e.target.value) || 25))}
                    style={{ width: 56 }}
                />
                <span className="ws-trail-editor__hint">px</span>
            </div>

            <div className="ws-trail-editor__divider" />

            {props.selectionLabel ? (
                <div className="ws-trail-editor__selection">
                    <div className="ws-trail-editor__row"><strong>{props.selectionLabel}</strong></div>
                    {props.stoneCoords && (
                        <div className="ws-trail-editor__row ws-trail-editor__hint">x {props.stoneCoords[0].toFixed(1)}% · y {props.stoneCoords[1].toFixed(1)}%</div>
                    )}
                    {props.pathCoords && (
                        <div className="ws-trail-editor__row ws-trail-editor__hint">x {props.pathCoords[0].toFixed(1)}% · y {props.pathCoords[1].toFixed(1)}%</div>
                    )}
                    {props.transition && (
                        <>
                            <div className="ws-trail-editor__row ws-trail-editor__hint">
                                offset {props.transitionOffset?.toFixed(0) ?? 0}px · span {props.transitionSpan?.toFixed(0) ?? 0}px
                            </div>
                            <div className="ws-trail-editor__row">
                                <span className="ws-trail-editor__label">Mist</span>
                                <input type="color" value={props.transition.mistColor} onChange={e => props.onMistColorChange(e.target.value)} />
                            </div>
                        </>
                    )}
                    <div className="ws-trail-editor__row">
                        {props.canAddPathPoint && <button type="button" onClick={props.onAddPathPoint}>+ Add point after</button>}
                        {props.canRemovePathPoint && <button type="button" onClick={props.onRemovePathPoint}>Remove point</button>}
                    </div>
                </div>
            ) : (
                <p className="ws-trail-editor__hint">Drag a stone, path point, or seam handle to select it. Alt-drag a curve handle to break its mirror.</p>
            )}

            <div className="ws-trail-editor__divider" />

            <div className="ws-trail-editor__row">
                <button type="button" onClick={props.onResetRegion}>Reset region</button>
                <button type="button" onClick={props.onResetAll}>Reset all</button>
                <button type="button" className="ws-trail-editor__save" onClick={props.onSave}>Save to disk</button>
            </div>
        </div>
    );
}
