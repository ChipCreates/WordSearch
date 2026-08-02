type Props = {
    wordsToFind: string[];
    foundWords: Record<string, string>;
};

export default function WordList({ wordsToFind, foundWords }: Props) {
    return (
        <div className="ws-word-list">
            {wordsToFind.map(word => {
                const found = !!foundWords[word];
                return (
                    <span
                        key={word}
                        className={`ws-word-chip${found ? " ws-word-chip--found" : ""}`}
                    >
                        {word}
                        {found && (
                            <span className="ws-word-chip__leaf" aria-hidden="true">
                                🍃
                            </span>
                        )}
                    </span>
                );
            })}
        </div>
    );
}
