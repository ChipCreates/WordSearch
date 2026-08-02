import { Dialog, DialogTitle, DialogContent, IconButton, Box, Typography, Divider, Link } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

type Props = {
    open: boolean;
    onClose: () => void;
};

function Step({ icon, children }: { icon: string; children: React.ReactNode }) {
    return (
        <Box sx={{ display: 'flex', gap: 1.5, mb: 1.5 }}>
            <Typography sx={{ fontSize: '1.3rem', lineHeight: 1.4 }}>{icon}</Typography>
            <Typography variant="body2" sx={{ lineHeight: 1.5 }}>{children}</Typography>
        </Box>
    );
}

export default function AboutDialog({ open, onClose }: Props) {
    return (
        <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                About &amp; How to Play
                <IconButton onClick={onClose} size="small">
                    <CloseIcon />
                </IconButton>
            </DialogTitle>
            <DialogContent dividers>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
                    Word Sprout is a themed word search game: drag across letters to find every
                    word in the list, level up, and see how many extra words you can spot along
                    the way.
                </Typography>

                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1.5 }}>
                    How to play
                </Typography>
                <Step icon="👆">
                    Drag from the first letter of a word to its last letter — across, up, down,
                    or diagonally, in either direction.
                </Step>
                <Step icon="✅">
                    Find every word on the list to complete the level. The grid grows and the
                    word list gets longer as you climb higher.
                </Step>
                <Step icon="✨">
                    Bonus words: any real English word you drag out of the grid earns a bonus
                    star, even if it isn't on the list.
                </Step>
                <Step icon="🏆">
                    10 achievements unlock as you play — check your progress from the trophy
                    button in the header.
                </Step>
                <Step icon="🎚️">
                    Switch between Standard and Challenging word categories anytime from
                    Settings.
                </Step>

                <Divider sx={{ my: 2.5 }} />

                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    Built with Tauri, React, and Rust.{" "}
                    <Link
                        href="https://github.com/ChipCreates/WordSearch"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        Source on GitHub
                    </Link>
                </Typography>
            </DialogContent>
        </Dialog>
    );
}
