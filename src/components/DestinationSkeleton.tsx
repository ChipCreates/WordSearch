type Destination = "levels" | "garden" | "achievements" | "field-kit" | "settings" | "about" | "store";

type DestinationSkeletonProps = {
    destination: Destination;
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

export default function DestinationSkeleton({ destination }: DestinationSkeletonProps) {
    const label = destinationLabels[destination];
    const isDialog = destination === "settings" || destination === "about" || destination === "store";

    return (
        <section
            className={`ws-destination-skeleton ws-destination-skeleton--${destination}${isDialog ? " ws-destination-skeleton--dialog" : ""}`}
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
