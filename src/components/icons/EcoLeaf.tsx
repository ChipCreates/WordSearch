import { SvgIcon, SvgIconProps } from "@mui/material";

export default function EcoLeaf(props: SvgIconProps) {
    return (
        <SvgIcon {...props} viewBox="0 0 24 24">
            <path
                d="M12 3C7.03 3 3 7.03 3 12c0 2.12.74 4.07 1.97 5.61L3.5 19.1c-.39.39-.39 1.02 0 1.41.39.39 1.02.39 1.41 0l1.9-1.9C8.35 19.46 10.1 20 12 20c4.97 0 9-4.03 9-9 0-4.97-4.03-9-9-9zm0 15c-3.31 0-6-2.69-6-6 0-1.74.74-3.31 1.93-4.41L12 12l4.07-4.41C17.26 8.69 18 10.26 18 12c0 3.31-2.69 6-6 6z"
                fill="currentColor"
            />
        </SvgIcon>
    );
}
