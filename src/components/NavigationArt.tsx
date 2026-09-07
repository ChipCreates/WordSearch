import { assetUrl } from "../categoryThemes";

type Props = { name: "play" | "levels" | "garden" | "trophies" | "settings" | "theme" | "help" };

// Labels belong to the surrounding button, so the artwork is decorative.
export default function NavigationArt({ name }: Props) {
    return <img className="ws-navigation-art" src={assetUrl(`navigation/${name}.webp`)} alt="" aria-hidden="true" draggable={false} />;
}
