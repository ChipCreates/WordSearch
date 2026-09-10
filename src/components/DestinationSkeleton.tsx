type Destination = "levels" | "garden" | "achievements" | "field-kit" | "settings" | "about" | "store";

type DestinationSkeletonProps = {
    destination: Destination;
    // Settings, About, and the Seed Store are all full-page destinations now
    // (same as Garden or Levels) -- this only needs to be true for the one
    // remaining call site that actually renders inside a centered MUI Dialog
    // (the desktop Settings modal). Inferring "dialog-shaped" from the
    // destination name alone made every other call site (the mobile
    // full-page Settings route included) show a small centered card
    // fallback that didn't match the full-width page it was about to become
    // -- the layout jump reads as a flash of missing content.
    dialog?: boolean;
};

const destinationLabels: Record<Destination, string> = {
    levels: "levels",
    garden: "garden",
    achievements: "trophies",
    "field-kit": "field kit",
    settings: "settings",
    about: "about",
    store: "seed store",
};

export default function DestinationSkeleton({ destination, dialog = false }: DestinationSkeletonProps) {
    const label = destinationLabels[destination];

    return (
        <section
            className={`ws-destination-skeleton ws-destination-skeleton--${destination}${dialog ? " ws-destination-skeleton--dialog" : ""}`}
            role="status"
            aria-label={`Loading ${label}`}
        >
            <div className="ws-destination-skeleton__heading">
                <span className="ws-skeleton-block ws-skeleton-block--icon" aria-hidden="true" />
                <div className="ws-destination-skeleton__heading-copy">
                    <span className="ws-skeleton-block ws-skeleton-block--title" aria-hidden="true" />
                    <span className="ws-skeleton-block ws-skeleton-block--subtitle" aria-hidden="true" />
                </div>
            </div>
            <div className="ws-destination-skeleton__cards" aria-hidden="true">
                {["one", "two", "three", "four"].map((card) => (
                    <div className="ws-destination-skeleton__card" key={card}>
                        <span className="ws-skeleton-block ws-skeleton-block--card-title" />
                        <span className="ws-skeleton-block ws-skeleton-block--card-line" />
                        <span className="ws-skeleton-block ws-skeleton-block--card-line ws-skeleton-block--short" />
                    </div>
                ))}
            </div>
        </section>
    );
}
