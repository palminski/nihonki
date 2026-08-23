import AsyncStorage from "@react-native-async-storage/async-storage";
import { fsrs, generatorParameters, Rating, State, createEmptyCard, Card as FSRSCard } from "ts-fsrs";
import { loadReviewDeck, updateReviewDeck, getCardKey } from "~/utils/deckManager";

// Default FSRS parameters, unmodified — no per-user optimization for now.
const scheduler = fsrs(generatorParameters());

const NEW_CARDS_PER_DAY_KEY_PREFIX = "newCardsPerDay_";
const NEW_CARDS_TODAY_KEY_PREFIX = "newCardsIntroducedToday_";
export const DEFAULT_NEW_CARDS_PER_DAY = 20;

export async function loadNewCardsPerDay(languageId: string): Promise<number> {
    try {
        const value = await AsyncStorage.getItem(NEW_CARDS_PER_DAY_KEY_PREFIX + languageId);
        const parsed = value != null ? parseInt(value, 10) : NaN;
        return Number.isFinite(parsed) ? parsed : DEFAULT_NEW_CARDS_PER_DAY;
    } catch (error) {
        console.error("Failed To Load New Cards Per Day Setting", error);
        return DEFAULT_NEW_CARDS_PER_DAY;
    }
}

export async function updateNewCardsPerDay(languageId: string, count: number) {
    try {
        await AsyncStorage.setItem(NEW_CARDS_PER_DAY_KEY_PREFIX + languageId, String(count));
    } catch (error) {
        console.error("Failed To Save New Cards Per Day Setting", error);
    }
}

// Local-midnight day boundary — good enough at this scale, no custom day-start-hour like Anki has.
function todayKey(): string {
    const now = new Date();
    return `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
}

async function loadNewCardsIntroducedToday(languageId: string): Promise<number> {
    try {
        const json = await AsyncStorage.getItem(NEW_CARDS_TODAY_KEY_PREFIX + languageId);
        if (!json) return 0;
        const record = JSON.parse(json);
        return record.date === todayKey() ? record.count : 0;
    } catch (error) {
        console.error("Failed To Load New Cards Introduced Today", error);
        return 0;
    }
}

async function incrementNewCardsIntroducedToday(languageId: string) {
    try {
        const current = await loadNewCardsIntroducedToday(languageId);
        await AsyncStorage.setItem(
            NEW_CARDS_TODAY_KEY_PREFIX + languageId,
            JSON.stringify({ date: todayKey(), count: current + 1 })
        );
    } catch (error) {
        console.error("Failed To Save New Cards Introduced Today", error);
    }
}

// A card is "New" until its first grade, at which point it gets an `srs` sub-object
// (FSRS's Card state) attached. Cards saved before FSRS existed simply lack this field,
// so they're treated as New the first time they're encountered — no migration needed.
export function isCardNew(cardObject: any): boolean {
    return !cardObject.srs;
}

export function isCardDue(cardObject: any, now: Date = new Date()): boolean {
    if (isCardNew(cardObject)) return false;
    return new Date(cardObject.srs.due).getTime() <= now.getTime();
}

// Builds today's review queue for a language's deck: due Review-state cards (earliest
// due first), then any Learning/Relearning cards — these are "still in progress for
// today" regardless of their exact due timestamp (their steps are always short), so they
// belong in the queue whenever Review is opened; pickNextCard decides whether to show
// them right on time or early, same as it would mid-session — then New cards up to
// whatever's left of today's new-card allowance.
export async function getDueQueue(languageId: string): Promise<any[]> {
    const deck = await loadReviewDeck(languageId);
    const allCards: any[] = Object.values(deck);
    const now = new Date();

    const dueReviewCards = allCards
        .filter((card) => !isCardNew(card) && card.srs.state === State.Review && isCardDue(card, now))
        .sort((a, b) => new Date(a.srs.due).getTime() - new Date(b.srs.due).getTime());

    const inProgressCards = allCards.filter(
        (card) => !isCardNew(card) && (card.srs.state === State.Learning || card.srs.state === State.Relearning)
    );

    const newCards = allCards.filter((card) => isCardNew(card));
    const newCardsPerDay = await loadNewCardsPerDay(languageId);
    const introducedToday = await loadNewCardsIntroducedToday(languageId);
    const newCardAllowance = Math.max(0, newCardsPerDay - introducedToday);

    return [...dueReviewCards, ...inProgressCards, ...newCards.slice(0, newCardAllowance)];
}

export interface DueCounts {
    newCount: number;
    learningCount: number;
    reviewCount: number;
}

export type CardQueueCategory = "new" | "learning" | "review";

// Anki-style classification for a single card: New (blue) — never graded; Learning (red)
// — currently in a (re)learning step, i.e. missed and awaiting another attempt; Review
// (green) — already graduated to normal long-term scheduling.
export function getCardQueueCategory(cardObject: any): CardQueueCategory {
    if (isCardNew(cardObject)) return "new";
    if (cardObject.srs.state === State.Learning || cardObject.srs.state === State.Relearning) return "learning";
    return "review";
}

export function getDueCountsFromCards(cards: any[]): DueCounts {
    const counts: DueCounts = { newCount: 0, learningCount: 0, reviewCount: 0 };
    for (const card of cards) {
        const category = getCardQueueCategory(card);
        if (category === "new") counts.newCount++;
        else if (category === "learning") counts.learningCount++;
        else counts.reviewCount++;
    }
    return counts;
}

// Anki-style deck counts: New (blue) — never-seen cards, capped by today's remaining
// allowance; Learning (red) — cards currently in a (re)learning step, regardless of their
// exact due timestamp (their steps are always short, so they're "in progress for today"
// the moment they enter that state, same as getDueQueue's treatment of them); Review
// (green) — previously-graduated cards actually due for their normal long-term review.
export async function getDueCounts(languageId: string): Promise<DueCounts> {
    const deck = await loadReviewDeck(languageId);
    const allCards: any[] = Object.values(deck);
    const now = new Date();

    const learningCount = allCards.filter(
        (card) => !isCardNew(card) && (card.srs.state === State.Learning || card.srs.state === State.Relearning)
    ).length;
    const reviewCount = allCards.filter(
        (card) => !isCardNew(card) && card.srs.state === State.Review && isCardDue(card, now)
    ).length;

    const newCardsInDeck = allCards.filter((card) => isCardNew(card)).length;
    const newCardsPerDay = await loadNewCardsPerDay(languageId);
    const introducedToday = await loadNewCardsIntroducedToday(languageId);
    const newCardAllowance = Math.max(0, newCardsPerDay - introducedToday);
    const newCount = Math.min(newCardsInDeck, newCardAllowance);

    return { newCount, learningCount, reviewCount };
}

// Picks which pooled card to show next: prefer a card that's actually ready right now
// (New, or due), in pool order. If nothing is ready but the pool isn't empty, fall back
// to whichever card is due soonest — mirroring Anki's behavior of showing a learning
// card early rather than ending the session when nothing else is left.
export function pickNextCard(pool: any[], now: Date = new Date()): any | null {
    if (pool.length === 0) return null;

    const ready = pool.find((card) => isCardNew(card) || isCardDue(card, now));
    if (ready) return ready;

    return pool.reduce((soonest, card) =>
        new Date(card.srs.due).getTime() < new Date(soonest.srs.due).getTime() ? card : soonest
    );
}

// Previews what a card's next due date would be for each grade, without persisting
// anything — used to show "next time you'll see this" under the grading buttons.
export function previewNextDue(cardObject: any, now: Date = new Date()): { again: Date; good: Date } {
    const currentSrsState: FSRSCard = isCardNew(cardObject) ? createEmptyCard(now) : cardObject.srs;
    const preview = scheduler.repeat(currentSrsState, now);
    return {
        again: preview[Rating.Again].card.due,
        good: preview[Rating.Good].card.due,
    };
}

// Formats a future Date as a short Anki-style relative label ("10m", "4d", "2mo", "1y").
export function formatInterval(due: Date, now: Date = new Date()): string {
    const diffMinutes = Math.max(0, Math.round((due.getTime() - now.getTime()) / (1000 * 60)));

    if (diffMinutes < 1) return "<1m";
    if (diffMinutes < 60) return `${diffMinutes}m`;

    const diffHours = diffMinutes / 60;
    if (diffHours < 24) return `${Math.round(diffHours)}h`;

    const diffDays = diffHours / 24;
    if (diffDays < 30) return `${Math.round(diffDays)}d`;

    const diffMonths = diffDays / 30;
    if (diffMonths < 12) return `${Math.round(diffMonths)}mo`;

    return `${(diffDays / 365).toFixed(1)}y`;
}

// Grades a card ("Again" or "Good" — Hard/Easy are unused, collapsed into this 2-way
// scale), advances its FSRS state accordingly, and persists the result back into its
// deck. New cards get their FSRS state created fresh on this, their first grade.
export async function gradeCard(languageId: string, cardObject: any, isGood: boolean): Promise<any> {
    const now = new Date();
    const wasNew = isCardNew(cardObject);
    const currentSrsState: FSRSCard = wasNew ? createEmptyCard(now) : cardObject.srs;

    const rating = isGood ? Rating.Good : Rating.Again;
    const { card: nextSrsState } = scheduler.next(currentSrsState, now, rating);

    const updatedCard = { ...cardObject, srs: nextSrsState };

    const deck = await loadReviewDeck(languageId);
    deck[getCardKey(updatedCard)] = updatedCard;
    await updateReviewDeck(languageId, deck);

    if (wasNew) {
        await incrementNewCardsIntroducedToday(languageId);
    }

    return updatedCard;
}
