import { ACHIEVEMENTS } from "../achievements";
import { BOTANIST_RANKS } from "../botanistRanks";
import { assetUrl } from "../categoryThemes";
import { PLANTS_CATALOG } from "../plantsCatalog";
import { POWERUP_DEFINITIONS, type PowerupId } from "../powerups";
import ArrowBackRounded from "@mui/icons-material/ArrowBackRounded";

import dragSelectImage from "../../docs/screenshots/howto-drag-select.webp";
import progressionImage from "../../docs/screenshots/howto-progression.webp";
import rankImage from "../../docs/screenshots/howto-botanist-rank.webp";
import toolkitImage from "../../docs/screenshots/howto-toolkit-field-notes.webp";
import gardenImage from "../../docs/screenshots/howto-garden.webp";
import achievementsImage from "../../docs/screenshots/howto-achievements.webp";
import storeImage from "../../docs/screenshots/howto-store-cosmetics.webp";

type Callout = { x: string; y: string; label: string; direction?: "left" | "right" };

function GuideImage({ src, alt, caption, callouts = [] }: { src: string; alt: string; caption: string; callouts?: Callout[] }) {
    return <figure className="ws-howto-figure">
        <div className="ws-howto-figure__frame">
            <img src={src} alt={alt} />
            {callouts.map(callout => <span
                key={callout.label}
                className={`ws-howto-callout ws-howto-callout--${callout.direction ?? "right"}`}
                style={{ left: callout.x, top: callout.y }}
                aria-hidden="true"
            ><span>☝️</span><b>{callout.label}</b></span>)}
        </div>
        <figcaption>{caption}</figcaption>
    </figure>;
}

const powerupOrder = Object.keys(POWERUP_DEFINITIONS) as PowerupId[];

export default function AboutView({ onReplayOnboarding, onBack }: { onReplayOnboarding: () => void; onBack?: () => void }) {
    return <div className="ws-about-view">
        <header className="ws-about-hero">
            {onBack && <button className="ws-round-icon-btn ws-about-back" onClick={onBack} aria-label="Back"><ArrowBackRounded /></button>}
            <img className="ws-about-logo" src={assetUrl("branding/word-sprout-logo.webp")} alt="Word Sprout" />
            <span className="ws-about-eyebrow">Field Guide</span>
            <h1>About &amp; How to Play</h1>
            <p>Trace hidden words, gather Seeds, and turn every solved puzzle into a thriving botanical collection.</p>
        </header>

        <div className="ws-about-layout">
            <nav className="ws-about-rail" aria-label="How to play sections">
                <a href="#basics">Basics</a>
                <a href="#progression">Progression</a>
                <a href="#field-kit">Field Kit</a>
                <a href="#garden">Garden</a>
                <a href="#trophies">Trophies</a>
                <a href="#cosmetics">Cosmetics</a>
                <a href="#credits">Credits</a>
            </nav>

            <article className="ws-about-content">
                <section id="basics" className="ws-about-section">
                    <span className="ws-about-section__number">01</span>
                    <h2>Find every target word</h2>
                    <p>Press or tap the first letter, then drag in a straight line to the last letter. Words can run horizontally, vertically, diagonally, forward, or backward. Release to submit your selection.</p>
                    <p>The Found Words panel tracks the required words. Each board also guarantees a small, optional set of hidden Bonus Sprouts based on its difficulty and open space. They do not finish the level, but every valid extra word awards Seeds.</p>
                    <GuideImage
                        src={dragSelectImage}
                        alt="A Word Sprout board with GROVE traced diagonally and the target list beside it"
                        caption="Trace from G to E in one continuous gesture; the live path shows exactly what will be submitted."
                        callouts={[
                            { x: "46%", y: "38%", label: "Release here" },
                            { x: "80%", y: "14%", label: "Track targets", direction: "left" },
                        ]}
                    />
                </section>

                <section id="progression" className="ws-about-section">
                    <span className="ws-about-section__number">02</span>
                    <h2>Grow through the journey</h2>
                    <p>Completing a level opens the next stop on the trail. Use Levels to replay any unlocked puzzle. Difficulty changes board density and vocabulary, while favorite categories let you steer future puzzles toward subjects you enjoy.</p>
                    <GuideImage src={progressionImage} alt="The Word Sprout level trail with completed, current, and locked levels" caption="Completed clearings stay replayable; the glowing frontier marks your next challenge." callouts={[{ x: "51%", y: "42%", label: "Current frontier" }]} />
                    <h3>Botanist ranks</h3>
                    <p>Your highest unlocked level determines your title. There are {BOTANIST_RANKS.length} ranks, from Seedling Scout to Cosmic Conservator, with a new portrait and promotion moment at each milestone.</p>
                    <GuideImage src={rankImage} alt="A Botanist rank promotion in Word Sprout" caption="Rank promotions celebrate long-term progress; your current rank is always visible in the profile area." />
                </section>

                <section id="field-kit" className="ws-about-section">
                    <span className="ws-about-section__number">03</span>
                    <h2>Use the Field Kit</h2>
                    <p>Your first letter hint each level is free. Other tools spend charges purchased with Seeds. Field Notes sit below the tools and award one-time Seed bonuses when their discovery conditions are met.</p>
                    <GuideImage src={toolkitImage} alt="The Word Sprout Field Kit and Field Notes in the sidebar" caption="Charge counts appear on each tool; dimmed tools need another charge from the Seed Store." callouts={[{ x: "38%", y: "29%", label: "Tool charges" }, { x: "42%", y: "68%", label: "Track discoveries" }]} />
                    <div className="ws-powerup-guide" aria-label="Power-up reference">
                        {powerupOrder.map(id => {
                            const item = POWERUP_DEFINITIONS[id];
                            return <div className="ws-powerup-guide__item" key={id}>
                                <img src={assetUrl(item.image.replace(/^\//, ""))} alt="" />
                                <div><h3>{item.title}</h3><p>{item.description}.</p><small>{item.cost} Seeds per charge</small></div>
                            </div>;
                        })}
                    </div>
                </section>

                <section id="garden" className="ws-about-section">
                    <span className="ws-about-section__number">04</span>
                    <h2>Cultivate your garden</h2>
                    <p>Spend Seeds to acquire plants, then return to water them when they are ready. Every species has its own four-stage artwork—empty vessel, new sprout, young plant, and full bloom—and mature plants add to your collection progress.</p>
                    <GuideImage src={gardenImage} alt="The Garden showing plants at several growth stages" caption={`The Garden contains ${PLANTS_CATALOG.length} plants, each with its own rarity, watering rhythm, and bloom reward.`} callouts={[{ x: "22%", y: "47%", label: "Water when ready" }, { x: "73%", y: "31%", label: "Growth stage", direction: "left" }]} />
                </section>

                <section id="trophies" className="ws-about-section">
                    <span className="ws-about-section__number">05</span>
                    <h2>Record discoveries</h2>
                    <p>{ACHIEVEMENTS.length} achievements recognize puzzle streaks, diagonal and reverse finds, Bonus Sprouts, category exploration, power-up use, and garden milestones. Open Trophies to see your nearest goals and completed badges.</p>
                    <GuideImage src={achievementsImage} alt="The Word Sprout trophy collection with achievement badges" caption="Every badge shows its requirement; unlocked achievements keep their full illustrated color." callouts={[{ x: "76%", y: "8%", label: "Overall progress", direction: "left" }]} />
                </section>

                <section id="cosmetics" className="ws-about-section">
                    <span className="ws-about-section__number">06</span>
                    <h2>Spend Seeds your way</h2>
                    <p>The Seed Store offers plants, power-up charges, seasonal themes, and prestige cosmetics. Purchases never block the main journey: replay levels and find Bonus Sprouts to keep earning Seeds.</p>
                    <GuideImage src={storeImage} alt="The Seed Store showing illustrated power-ups and cosmetic unlocks" caption="Each store card states its effect and Seed price before you buy." callouts={[{ x: "18%", y: "38%", label: "Power-up art" }, { x: "74%", y: "76%", label: "Theme unlocks", direction: "left" }]} />
                </section>

                <section id="credits" className="ws-about-section ws-about-credits">
                    <span className="ws-about-section__number">07</span>
                    <h2>About Word Sprout</h2>
                    <p>Word Sprout is a calm word-search game about curiosity, collection, and steady growth. Built with Tauri, React, and Rust.</p>
                    <p><strong>Word Sprout v{typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "0.2.3"}</strong></p>
                    <div className="ws-about-actions">
                        <button className="ws-primary-action-btn" onClick={onReplayOnboarding}>Replay welcome tips</button>
                        <a className="ws-control-btn" href="https://github.com/ChipCreates/WordSprout" target="_blank" rel="noreferrer">View source on GitHub</a>
                    </div>
                </section>
            </article>
        </div>
    </div>;
}
