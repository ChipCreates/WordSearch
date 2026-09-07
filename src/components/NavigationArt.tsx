import { assetUrl } from "../categoryThemes";

type Props = { name: "play" | "levels" | "garden" | "trophies" | "field-kit" | "settings" | "theme" | "help" };

// Labels belong to the surrounding button, so the artwork is decorative.
export default function NavigationArt({ name }: Props) {
    const extension = name === "field-kit" ? "svg" : "webp";
    return <img className="ws-navigation-art" src={assetUrl(`navigation/${name}.${extension}`)} alt="" aria-hidden="true" draggable={false} />;
}
