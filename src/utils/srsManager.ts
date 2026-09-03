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

async function decrementNewCardsIntroducedToday(languageId: string) {
    try {
        const current = await loadNewCardsIntroducedToday(languageId);
        await AsyncStorage.setItem(
            NEW_CARDS_TODAY_KEY_PREFIX + languageId,
            JSON.stringify({ date: todayKey(), count: Math.max(0, current - 1) })
        );
    } catch (error) {
        console.error("Failed To Save New Cards Introduced Today", error);
    }
}

const MISSED_TODAY_KEY_PREFIX = "missedToday_";

// Log of card keys graded "Again" at least once today — separate from FSRS state, since
// by the time a session reaches "all done," every in-progress card has already been
// re-shown until it graduated, so there's nothing left to filter for by current state.
// This is purely for the optional "Review Forgotten Cards" extra-practice collection.
async function loadMissedTodayKeys(languageId: string): Promise<string[]> {
    try {
        const json = await AsyncStorage.getItem(MISSED_TODAY_KEY_PREFIX + languageId);
        if (!json) return [];
        const record = JSON.parse(json);
        return record.date === todayKey() ? record.keys : [];
    } catch (error) {
        console.error("Failed To Load Missed Today", error);
        return [];
    }
}

async function addMissedTodayKey(languageId: string, cardKey: string) {
    try {
        const keys = await loadMissedTodayKeys(languageId);
        if (!keys.includes(cardKey)) keys.push(cardKey);
        await AsyncStorage.setItem(
            MISSED_TODAY_KEY_PREFIX + languageId,
            JSON.stringify({ date: todayKey(), keys })
        );
    } catch (error) {
        console.error("Failed To Save Missed Today", error);
    }
}

// A card is "New" until its first grade, at which point it gets an `srs` sub-object
// (FSRS's Card state) attached. Cards saved before FSRS existed simply lack this field,
// so they're treated as New the first time they're encountered — no migration needed.
export function isCardNew(cardObject: any): boolean {
    return !cardObject.srs;
}

export function startOfDay(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function isCardDue(cardObject: any, now: Date = new Date()): boolean {
    if (isCardNew(cardObject)) return false;
    const due = new Date(cardObject.srs.due);

    // Review-state cards are day-granular, Anki-style: once today's calendar day reaches
    // the due date, the card is due for the rest of that day regardless of what time of
    // day the FSRS algorithm happened to land the due timestamp on — otherwise a card due
    // at, say, 8pm today would keep showing "in 6h" all day instead of being reviewable
    // now, with no real midnight-rollover happening until that exact hour arrives.
    // Learning/Relearning steps are short (minutes), so those still need exact-time
    // comparison for the "come back in ~15m" cooldown to mean anything.
    if (cardObject.srs.state === State.Review) {
        return startOfDay(due).getTime() <= startOfDay(now).getTime();
    }
    return due.getTime() <= now.getTime();
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
    if (!isGood) {
        await addMissedTodayKey(languageId, getCardKey(updatedCard));
    }
    await recordReviewActivity(languageId, now);

    return updatedCard;
}

// --- Review activity history (for the "how many days have I reviewed" heatmap) ---

const REVIEW_HISTORY_KEY_PREFIX = "reviewHistory_";

// Zero-padded, unlike todayKey() above — this one needs to sort/parse back cleanly since
// it's read back as a whole history object and walked over a generated date range.
function dateKeyFor(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

// One count per calendar day a card was graded, keyed by dateKeyFor. Deliberately not
// touched by undoGradeCard — same accepted gap as the missed-today log, see memory.
async function recordReviewActivity(languageId: string, date: Date) {
    try {
        const key = REVIEW_HISTORY_KEY_PREFIX + languageId;
        const json = await AsyncStorage.getItem(key);
        const history: Record<string, number> = json ? JSON.parse(json) : {};
        const dateKey = dateKeyFor(date);
        history[dateKey] = (history[dateKey] ?? 0) + 1;
        await AsyncStorage.setItem(key, JSON.stringify(history));
    } catch (error) {
        console.error("Failed To Record Review Activity", error);
    }
}

// Every card's FSRS state already carries a `last_review` timestamp set the moment it's
// graded, independent of the log above — so it doubles as a backfill for any day the log
// itself can't vouch for (most notably "today", right after this log was first shipped,
// but also anyone's pre-existing review history). The log stays authoritative for volume
// on well-tracked days (a card graded twice today only has one last_review timestamp),
// so this only raises a day's count, never lowers it.
function backfillFromLastReview(deck: Record<string, any>, history: Record<string, number>): Record<string, number> {
    const derivedCounts: Record<string, number> = {};
    for (const card of Object.values(deck)) {
        const lastReview = (card as any)?.srs?.last_review;
        if (!lastReview) continue;
        const dateKey = dateKeyFor(new Date(lastReview));
        derivedCounts[dateKey] = (derivedCounts[dateKey] ?? 0) + 1;
    }

    const merged = { ...history };
    for (const [dateKey, derivedCount] of Object.entries(derivedCounts)) {
        merged[dateKey] = Math.max(merged[dateKey] ?? 0, derivedCount);
    }
    return merged;
}

export async function loadReviewActivity(languageId: string): Promise<Record<string, number>> {
    try {
        const json = await AsyncStorage.getItem(REVIEW_HISTORY_KEY_PREFIX + languageId);
        const history: Record<string, number> = json ? JSON.parse(json) : {};
        const deck = await loadReviewDeck(languageId);
        return backfillFromLastReview(deck, history);
    } catch (error) {
        console.error("Failed To Load Review Activity", error);
        return {};
    }
}

// Buckets currently-scheduled (non-New) cards by how many calendar days from now their
// `srs.due` falls on, for a "cards due" forecast graph. Anything already overdue counts
// toward "today" (bucket 0). New cards have no fixed due date, so instead of being
// excluded entirely, today's bucket also gets however many of them will actually be
// introduced today — i.e. today's remaining slice of the new-cards-per-day allowance,
// same computation getDueQueue uses.
export async function getForecastCounts(languageId: string, days: number = 30): Promise<number[]> {
    const deck = await loadReviewDeck(languageId);
    const allCards: any[] = Object.values(deck);
    const now = new Date();
    const startOfToday = startOfDay(now);

    const counts = new Array(days).fill(0);
    let newCardCount = 0;
    for (const card of allCards) {
        if (isCardNew(card)) {
            newCardCount++;
            continue;
        }
        const dayIndex = Math.max(0, Math.round((startOfDay(new Date(card.srs.due)).getTime() - startOfToday.getTime()) / (1000 * 60 * 60 * 24)));
        if (dayIndex < days) counts[dayIndex] += 1;
    }

    const newCardsPerDay = await loadNewCardsPerDay(languageId);
    const introducedToday = await loadNewCardsIntroducedToday(languageId);
    const newCardAllowance = Math.max(0, newCardsPerDay - introducedToday);
    counts[0] += Math.min(newCardCount, newCardAllowance);

    return counts;
}

// --- "Extra" review collections ---
// These are deliberately decoupled from the SRS system: they don't read or affect due
// dates/allowances, grading them doesn't persist anything, and the collection itself is
// just built fresh each time — nothing here needs to survive the session being closed.

function shuffled<T>(items: T[]): T[] {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}

export async function getRandomCardSample(languageId: string, count: number): Promise<any[]> {
    const deck = await loadReviewDeck(languageId);
    return shuffled(Object.values(deck)).slice(0, count);
}

// Cards graded "Again" at least once today, regardless of their current FSRS state.
export async function getForgottenCards(languageId: string): Promise<any[]> {
    const deck = await loadReviewDeck(languageId);
    const missedKeys = await loadMissedTodayKeys(languageId);
    return missedKeys.map((key) => deck[key]).filter(Boolean);
}

// Reverts gradeCard's effects for one card: restores its exact pre-grade stored state
// (removing `srs` entirely if it had been New) and, if that grade had counted against
// today's new-card allowance, gives that slot back.
export async function undoGradeCard(languageId: string, previousCard: any): Promise<void> {
    const deck = await loadReviewDeck(languageId);
    deck[getCardKey(previousCard)] = previousCard;
    await updateReviewDeck(languageId, deck);

    if (isCardNew(previousCard)) {
        await decrementNewCardsIntroducedToday(languageId);
    }
}
