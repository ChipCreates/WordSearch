import { useEffect, useRef, useState } from "react";
import { useMediaQuery } from "@mui/material";
import CheckRounded from "@mui/icons-material/CheckRounded";
import LockRounded from "@mui/icons-material/LockRounded";
import PlayArrowRounded from "@mui/icons-material/PlayArrowRounded";
import { REWARDS } from "../gameMechanics";
import { assetUrl } from "../categoryThemes";
import "./LevelsView.css";

type Props = { currentLevel: number; onSelectLevel: (level: number) => void };
const LOAD_AHEAD = 64;
// Centers traced on the supplied artwork, expressed as percentages of one tile.
const PORTRAIT_STONES = [[74, 12], [30, 20], [28, 33], [78, 43], [73, 55], [19, 66], [52, 79], [76, 91]];
const LANDSCAPE_STONES = [[7, 55], [20, 61], [30, 75], [44, 64], [56, 55], [65, 69], [78, 73], [92, 60]];

export default function LevelsView({ currentLevel, onSelectLevel }: Props) {
    const landscape = useMediaQuery("(orientation: landscape)");
    const [selected, setSelected] = useState(currentLevel);
    const [levelCount, setLevelCount] = useState(currentLevel + LOAD_AHEAD);
    const [scrollPosition, setScrollPosition] = useState(0);
    const [viewportLength, setViewportLength] = useState(800);
    const scrollRef = useRef<HTMLDivElement>(null);
    const currentRef = useRef<HTMLButtonElement>(null);
    const [crossSize, setCrossSize] = useState(400);
    const tileLength = crossSize * 1376 / 768;
    const anchors = landscape ? LANDSCAPE_STONES : PORTRAIT_STONES;
    const point = (index: number) => {
        const [x, y] = anchors[index % anchors.length];
        const tileOffset = Math.floor(index / anchors.length) * tileLength;
        return landscape
            ? { x: tileOffset + x / 100 * tileLength, y: y / 100 * crossSize }
            : { x: x / 100 * crossSize, y: tileOffset + y / 100 * tileLength };
    };
    const count = Math.max(levelCount, currentLevel + LOAD_AHEAD);
    const length = Math.ceil(count / anchors.length) * tileLength;
    // Keep a small window of stones mounted, while the artwork scrolls continuously.
    const startIndex = Math.max(0, (Math.floor(scrollPosition / tileLength) - 1) * anchors.length);
    const endIndex = Math.min(count, (Math.ceil((scrollPosition + viewportLength) / tileLength) + 1) * anchors.length);
    const levels = [...new Set([
        ...Array.from({ length: Math.max(0, endIndex - startIndex) }, (_, i) => startIndex + i + 1),
        currentLevel, selected,
    ])].sort((a, b) => a - b);

    useEffect(() => {
        const scroller = scrollRef.current;
        if (!scroller) return;
        const measure = () => {
            setCrossSize(Math.max(1, landscape ? scroller.clientHeight : scroller.clientWidth));
            setViewportLength(landscape ? scroller.clientWidth : scroller.clientHeight);
        };
        const observer = new ResizeObserver(measure);
        observer.observe(scroller);
        measure();
        return () => observer.disconnect();
    }, [landscape]);

    useEffect(() => {
        setSelected(currentLevel);
    }, [currentLevel]);

    useEffect(() => {
        const scroller = scrollRef.current;
        if (!scroller) return;
        const target = currentRef.current
            ? Math.max(0, (landscape ? point(currentLevel - 1).x : point(currentLevel - 1).y) - (landscape ? scroller.clientWidth : scroller.clientHeight) * 0.4) : 0;
        scroller.scrollTop = landscape ? 0 : target;
        scroller.scrollLeft = landscape ? target : 0;
        setScrollPosition(target);
    }, [currentLevel, landscape, crossSize]);

    const handleScroll = () => {
        const scroller = scrollRef.current;
        if (!scroller) return;
        const position = landscape ? scroller.scrollLeft : scroller.scrollTop;
        const viewport = landscape ? scroller.clientWidth : scroller.clientHeight;
        setScrollPosition(position);
        if (position + viewport * 3 >= length) {
            setLevelCount(previous => Math.max(previous, count) + LOAD_AHEAD);
        }
    };

    const returnToCurrent = () => {
        setSelected(currentLevel);
        const scroller = scrollRef.current;
        if (scroller && currentRef.current) {
            const target = Math.max(0, (landscape ? point(currentLevel - 1).x : point(currentLevel - 1).y) - (landscape ? scroller.clientWidth : scroller.clientHeight) * 0.4);
            scroller.scrollTo({ top: landscape ? 0 : target, left: landscape ? target : 0, behavior: "smooth" });
        }
    };

    return (
        <section className={`ws-trail ${landscape ? "ws-trail--landscape" : "ws-trail--portrait"}`} aria-label="Level trail">
            <header className="ws-trail__header">
                <div><span className="ws-trail__eyebrow">YOUR WOODLAND JOURNEY</span><h2>The glowing grove</h2></div>
                <button className="ws-trail__locate" onClick={returnToCurrent}>Level {currentLevel} <span aria-hidden="true">↗</span></button>
            </header>
            <div className="ws-trail__layout">
                <div className="ws-trail__map-shell">
                    <div className="ws-trail__scroll" ref={scrollRef} onScroll={handleScroll} tabIndex={0} aria-label="Scroll through levels">
                        <div className="ws-trail__map" style={{
                            width: landscape ? length : crossSize,
                            height: landscape ? crossSize : length,
                            backgroundImage: `url("${assetUrl(`backgrounds/level-trail-${landscape ? "landscape" : "portrait-seamless"}.webp`)}")`,
                            backgroundSize: landscape ? `${tileLength}px ${crossSize}px` : `${crossSize}px ${tileLength}px`,
                        }}>
                            {levels.map(level => {
                                const p = point(level - 1);
                                const complete = level < currentLevel;
                                const active = level === currentLevel;
                                const locked = level > currentLevel;
                                return (
                                    <div key={level} className="ws-trail__stop" style={{ left: p.x, top: p.y }}>
                                        {active && <span className="ws-trail__here">YOU ARE HERE</span>}
                                        <button
                                            ref={active ? currentRef : undefined}
                                            className={`ws-trail__node ${active ? "is-current" : complete ? "is-complete" : "is-locked"} ${selected === level ? "is-selected" : ""}`}
                                            disabled={locked}
                                            aria-label={`Level ${level}, ${active ? "current" : complete ? "completed" : "locked"}`}
                                            aria-pressed={selected === level}
                                            aria-current={active ? "step" : undefined}
                                            onClick={() => setSelected(level)}
                                        >
                                            <span>{level}</span>
                                            {locked ? <LockRounded className="ws-trail__status" /> : complete ? <CheckRounded className="ws-trail__status" /> : null}
                                        </button>
                                        {active && <span className="ws-trail__next">Let it bloom</span>}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
                <aside className="ws-trail__detail" aria-label="Selected level">
                    <img className="ws-trail__sprout" src={assetUrl("plants/sprout.png")} alt="" />
                    <div className="ws-trail__detail-copy">
                        <span className="ws-trail__eyebrow">{selected < currentLevel ? "COMPLETED • PLAY AGAIN" : "YOUR NEXT ADVENTURE"}</span>
                        <h3>Level {selected}</h3>
                        <p>One more puzzle.<br />A little more growth.</p>
                    </div>
                    <div className="ws-trail__rewards">
                        <span><img src={assetUrl("seed.png")} alt="" /><b>+{REWARDS.LEVEL_COMPLETE_SEEDS}</b> completion</span>
                        <small>+{REWARDS.BONUS_WORD_SEEDS} Seeds for each bonus word</small>
                    </div>
                    <button className="ws-trail__play" onClick={() => onSelectLevel(selected)}><PlayArrowRounded />{selected < currentLevel ? "Replay level" : "Play level"}</button>
                    <p className="ws-trail__hint">Follow the light. Find every word to grow your trail.</p>
                </aside>
            </div>
        </section>
    );
}
