import { Button, Dialog, DialogActions, DialogContent, DialogTitle } from "@mui/material";
import type { OnboardingStep } from "../onboarding";

type Props = { step: OnboardingStep | null; onDismiss: () => void };

export default function OnboardingCoachmark({ step, onDismiss }: Props) {
    if (!step) return null;
    return (
        <Dialog open onClose={onDismiss} aria-labelledby="onboarding-title" maxWidth="xs" fullWidth>
            <DialogTitle id="onboarding-title" sx={{ fontFamily: "var(--font-headline)", fontWeight: 800 }}>{step.title}</DialogTitle>
            <DialogContent dividers>{step.body}</DialogContent>
            <DialogActions sx={{ p: 2 }}>
                <Button autoFocus variant="contained" onClick={onDismiss}>Got it</Button>
            </DialogActions>
        </Dialog>
    );
}
