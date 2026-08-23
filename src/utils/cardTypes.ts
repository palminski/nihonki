// Japanese needs multiple parallel representations of the same sentence (kanji/furigana/kana)
// to stay readable to a learner and to keep exporting correctly to AnkiDroid. Languages like
// Mandarin/Cantonese don't need the Anki-specific kana variant, but still need a romanization
// aid (their script doesn't reliably indicate pronunciation either). Everything else uses a
// plain word + sentence with no pronunciation aid at all. Modeled as a discriminated union
// instead of one flat interface with a pile of optional fields.
export interface JapaneseCard {
    languageId: "japanese";
    kanji: string;
    kana: string;
    furigana: string;
    meaning: string;
    partOfSpeech: string;
    exampleSentenceKanji: string;
    exampleSentenceFurigana: string;
    exampleSentenceKana: string;
    exampleSentenceEnglish: string;
}

export interface RomanizedCard {
    languageId: string;
    word: string;
    pronunciation: string;
    meaning: string;
    partOfSpeech: string;
    exampleSentence: string;
    exampleSentencePronunciation: string;
    exampleSentenceEnglish: string;
}

export interface SimpleWordCard {
    languageId: string;
    word: string;
    meaning: string;
    partOfSpeech: string;
    exampleSentence: string;
    exampleSentenceEnglish: string;
}

export type VocabCard = JapaneseCard | RomanizedCard | SimpleWordCard;

// Languages whose script doesn't reliably indicate pronunciation to a learner, and so need
// a romanization aid the way Japanese needs furigana. Add a language here (and give it an
// entry in ROMANIZATION_SYSTEMS below) to get the pronunciation-aware card shape.
const ROMANIZED_LANGUAGE_IDS = ["mandarin", "cantonese"];

const ROMANIZATION_SYSTEMS: Record<string, string> = {
    mandarin: "Hanyu Pinyin with tone marks (ā á ǎ à)",
    cantonese: "Jyutping with tone numbers (1-6)",
};

export function getCardShape(languageId: string): "japanese" | "romanized" | "simple" {
    if (languageId === "japanese") return "japanese";
    if (ROMANIZED_LANGUAGE_IDS.includes(languageId)) return "romanized";
    return "simple";
}

export function getRomanizationSystem(languageId: string): string {
    return ROMANIZATION_SYSTEMS[languageId] ?? "a standard romanization system";
}

// Checked structurally (presence of `kanji`/`kana`, or `pronunciation`) rather than via
// `languageId` alone, since a card can end up filed under the wrong language's deck (e.g.
// manually, or from data saved before per-language decks/shapes existed) — the shape of the
// data is what actually determines how it must be rendered, regardless of which deck it's in.
export function isJapaneseCard(card: VocabCard): card is JapaneseCard {
    return "kanji" in card && "kana" in card;
}

export function isRomanizedCard(card: VocabCard): card is RomanizedCard {
    return "pronunciation" in card && !isJapaneseCard(card);
}

export const JAPANESE_CARD_FIELDS: { key: keyof JapaneseCard; label: string; multiline?: boolean }[] = [
    { key: "kanji", label: "Kanji" },
    { key: "kana", label: "Kana" },
    { key: "furigana", label: "Furigana (e.g. 犬[いぬ])" },
    { key: "meaning", label: "Meaning" },
    { key: "partOfSpeech", label: "Part of Speech" },
    { key: "exampleSentenceKanji", label: "Example Sentence (Kanji)", multiline: true },
    { key: "exampleSentenceFurigana", label: "Example Sentence (Furigana)", multiline: true },
    { key: "exampleSentenceKana", label: "Example Sentence (Kana)", multiline: true },
    { key: "exampleSentenceEnglish", label: "Example Sentence (English)", multiline: true },
];

export const ROMANIZED_CARD_FIELDS: { key: keyof RomanizedCard; label: string; multiline?: boolean }[] = [
    { key: "word", label: "Word" },
    { key: "pronunciation", label: "Pronunciation (e.g. 你[nǐ]好[hǎo])" },
    { key: "meaning", label: "Meaning" },
    { key: "partOfSpeech", label: "Part of Speech" },
    { key: "exampleSentence", label: "Example Sentence", multiline: true },
    { key: "exampleSentencePronunciation", label: "Example Sentence (Pronunciation)", multiline: true },
    { key: "exampleSentenceEnglish", label: "Example Sentence (English)", multiline: true },
];

export const SIMPLE_CARD_FIELDS: { key: keyof SimpleWordCard; label: string; multiline?: boolean }[] = [
    { key: "word", label: "Word" },
    { key: "meaning", label: "Meaning" },
    { key: "partOfSpeech", label: "Part of Speech" },
    { key: "exampleSentence", label: "Example Sentence", multiline: true },
    { key: "exampleSentenceEnglish", label: "Example Sentence (English)", multiline: true },
];

export function getCardFields(languageId: string) {
    const shape = getCardShape(languageId);
    if (shape === "japanese") return JAPANESE_CARD_FIELDS;
    if (shape === "romanized") return ROMANIZED_CARD_FIELDS;
    return SIMPLE_CARD_FIELDS;
}

export function getRequiredCardFields(languageId: string): string[] {
    return getCardFields(languageId).map((field) => field.key as string);
}

// Normalizes any card shape into the handful of fields the flip-card review UI actually
// needs, so that UI doesn't have to branch on all three shapes itself — it only needs to
// know whether a pronunciation aid exists, not which shape provided it.
export interface NormalizedCardView {
    headword: string;
    pronunciation: string | null;
    meaning: string;
    partOfSpeech: string;
    exampleSentencePlain: string;
    exampleSentenceAnnotated: string | null;
    exampleSentenceEnglish: string;
}

export function normalizeCard(card: VocabCard): NormalizedCardView {
    if (isJapaneseCard(card)) {
        return {
            headword: card.kanji,
            pronunciation: card.furigana,
            meaning: card.meaning,
            partOfSpeech: card.partOfSpeech,
            exampleSentencePlain: card.exampleSentenceKanji,
            exampleSentenceAnnotated: card.exampleSentenceFurigana,
            exampleSentenceEnglish: card.exampleSentenceEnglish,
        };
    }
    if (isRomanizedCard(card)) {
        return {
            headword: card.word,
            pronunciation: card.pronunciation,
            meaning: card.meaning,
            partOfSpeech: card.partOfSpeech,
            exampleSentencePlain: card.exampleSentence,
            exampleSentenceAnnotated: card.exampleSentencePronunciation,
            exampleSentenceEnglish: card.exampleSentenceEnglish,
        };
    }
    return {
        headword: card.word,
        pronunciation: null,
        meaning: card.meaning,
        partOfSpeech: card.partOfSpeech,
        exampleSentencePlain: card.exampleSentence,
        exampleSentenceAnnotated: null,
        exampleSentenceEnglish: card.exampleSentenceEnglish,
    };
}
