import { Box, Chip } from "@mui/material";

type Props = {
    wordsToFind: string[];
    foundWords: Record<string, string>;
};

export default function WordList({ wordsToFind, foundWords }: Props) {
    return (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 1, mb: 3, maxWidth: 600, mx: 'auto' }}>
            {wordsToFind.map(word => (
                <Chip
                    key={word}
                    label={word}
                    sx={{
                        fontWeight: 'bold',
                        backgroundColor: foundWords[word] || undefined,
                        color: foundWords[word] ? '#121212' : 'inherit',
                        textDecoration: foundWords[word] ? 'line-through' : 'none',
                        opacity: foundWords[word] ? 0.8 : 1
                    }}
                />
            ))}
        </Box>
    );
}
