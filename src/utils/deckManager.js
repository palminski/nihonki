import AsyncStorage from "@react-native-async-storage/async-storage";

const REVIEW_DECK_KEY_PREFIX = "review_deck_";
// Cards saved before decks were split out per-language lived under this single key.
const LEGACY_REVIEW_DECK_KEY = "review_deck";
const LEGACY_LANGUAGE_ID = "japanese";

function getReviewDeckStorageKey(languageId) {
    return REVIEW_DECK_KEY_PREFIX + languageId;
}

// Japanese cards are keyed by kanji+kana since kanji alone can be ambiguous between
// readings; every other language's cards are keyed by their single `word` field.
// Checked structurally rather than via languageId, since a card can be sitting in the
// wrong deck (e.g. filed there before per-language decks/shapes existed) and the shape
// of the data is what actually determines its key, not which deck it happens to be in.
export function getCardKey(cardObject) {
    if ("kanji" in cardObject && "kana" in cardObject) {
        return cardObject.kanji + "_" + cardObject.kana;
    }
    return cardObject.word;
}

export async function updateReviewDeck(languageId, reviewDeck) {
    try {
        const reviewDeckJSON = JSON.stringify(reviewDeck);
        await AsyncStorage.setItem(getReviewDeckStorageKey(languageId), reviewDeckJSON);
    } catch (error) {
        console.error("Failed To Save Review Deck");
    }
}

export async function loadReviewDeck(languageId) {
    try {
        const storageKey = getReviewDeckStorageKey(languageId);
        let reviewDeckJSON = await AsyncStorage.getItem(storageKey);

        if (!reviewDeckJSON && languageId === LEGACY_LANGUAGE_ID) {
            const legacyJSON = await AsyncStorage.getItem(LEGACY_REVIEW_DECK_KEY);
            if (legacyJSON) {
                await AsyncStorage.setItem(storageKey, legacyJSON);
                reviewDeckJSON = legacyJSON;
            }
        }

        if (!reviewDeckJSON) return {};
        const reviewDeck = JSON.parse(reviewDeckJSON);

        // Cards saved before per-card languageId tagging don't carry the field themselves;
        // since a deck only ever holds cards for the language it's keyed under, backfill it.
        Object.values(reviewDeck).forEach((card) => {
            if (!card.languageId) card.languageId = languageId;
        });

        return reviewDeck;
    } catch (error) {
        console.error("Failed To Load Review Deck");
        return {};
    }
}

export async function addCardToReviewDeck(languageId, cardObject) {
    const reviewDeck = await loadReviewDeck(languageId);
    const cardToStore = { ...cardObject, languageId };
    reviewDeck[getCardKey(cardToStore)] = cardToStore;
    await updateReviewDeck(languageId, reviewDeck);
    return reviewDeck;
}

export async function isCardInReviewDeck(languageId, cardObject) {
    const reviewDeck = await loadReviewDeck(languageId);
    return Boolean(reviewDeck[getCardKey(cardObject)]);
}

export async function removeCardFromReviewDeck(languageId, key) {
    const reviewDeck = await loadReviewDeck(languageId);
    delete reviewDeck[key];
    await updateReviewDeck(languageId, reviewDeck);
    return reviewDeck;
}
