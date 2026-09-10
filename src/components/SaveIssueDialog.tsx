import { useState } from "react";
import { Button, Dialog, DialogTitle, DialogContent, DialogActions, Typography } from "@mui/material";
import type { LoadIssue } from "../persistence";

type Props = {
    issue: LoadIssue;
    onReset: () => void;
};

// Surfaces WSP-0.3's "preserve raw data, surface a real error, only ever
// reset on explicit user action" guarantee. Rendered once at app startup
// when persistence.getLoadIssue() reports a problem -- see App.tsx. There
// is deliberately no "dismiss and continue" option: continuing to play
// would eventually autosave over whatever's still recoverable, which is
// exactly the silent-overwrite this dialog exists to prevent.
export default function SaveIssueDialog({ issue, onReset }: Props) {
    const [confirming, setConfirming] = useState(false);

    const title = issue.kind === "corrupted" ? "Your save couldn't be read" : "This save is from a newer version";
    const body = issue.kind === "corrupted"
        ? "Word Sprout found saved progress but couldn't make sense of it -- it may have been damaged by an interrupted write. Nothing has been deleted: a copy of the raw data is kept on this device in case it can be recovered later."
        : `This save was created by a newer version of Word Sprout (schema ${issue.foundVersion}) than the one currently running. To avoid losing anything, it hasn't been touched or changed in any way -- updating to the latest version of Word Sprout should let it load normally.`;

    return (
        // Must always sit above every other overlay -- including the
        // onboarding coachmark, which a corrupted/reverted-to-default save
        // can trigger at the same moment this dialog needs to block play.
        <Dialog open onClose={() => {}} sx={{ zIndex: (theme) => theme.zIndex.modal + 100 }}>
            <DialogTitle sx={{ fontFamily: "var(--font-headline)", fontWeight: 700 }}>
                {title}
            </DialogTitle>
            <DialogContent>
                <Typography variant="body2" sx={{ mb: confirming ? 2 : 0 }}>
                    {body}
                </Typography>
                {confirming && (
                    <Typography variant="body2" color="error">
                        Starting fresh replaces this save with a brand new one, right now. This can't be undone.
                    </Typography>
                )}
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
                {confirming ? (
                    <>
                        <Button onClick={() => setConfirming(false)} id="save-issue-cancel">
                            Cancel
                        </Button>
                        <Button variant="contained" color="error" onClick={onReset} id="save-issue-confirm-reset">
                            Start Fresh
                        </Button>
                    </>
                ) : (
                    <Button variant="outlined" color="error" onClick={() => setConfirming(true)} id="save-issue-reset">
                        Start Fresh Instead
                    </Button>
                )}
            </DialogActions>
        </Dialog>
    );
}
