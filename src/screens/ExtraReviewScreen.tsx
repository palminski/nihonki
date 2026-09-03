import { useEffect, useRef, useState } from "react";
import { View, Text, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import ScreenWrapper from "~/components/ScreenWrapper";
import SwipeCard, { SwipeCardHandle } from "~/components/SwipeCard";
import { getCardKey } from "~/utils/deckManager";
import { normalizeCard } from "~/utils/cardTypes";
import { getRandomCardSample, getForgottenCards } from "~/utils/srsManager";
import { colors, withOpacity } from "~/utils/colors";

const RANDOM_SAMPLE_SIZE = 20;

type ExtraReviewMode = "random" | "forgotten";

export default function ExtraReviewScreen() {
    const navigation = useNavigation();
    const route = useRoute();
    const { languageId = "japanese", mode = "random" } =
        (route.params as { languageId?: string; languageLabel?: string; mode?: ExtraReviewMode } | undefined) ?? {};

    // `cards` is the original loaded set, kept immutable — only used to tell "this deck has
    // nothing in it" apart from "the working queue below just emptied out". `queue` is the
    // actual working set: swiping right drops the front card, swiping left rotates it to
    // the back instead of discarding it, so a missed card keeps resurfacing later in the
    // same session rather than counting as done.
    const [cards, setCards] = useState<any[]>([]);
    const [queue, setQueue] = useState<any[]>([]);
    // Card keys swiped incorrect at least once this session — separate from the cards'
    // real FSRS state (which never changes here), purely so a requeued card highlights the
    // Learning (red) count when it comes back up, marking it as "missed this round".
    const [missedKeys, setMissedKeys] = useState<Set<string>>(new Set());
    // Stack of pre-swipe {queue, missedKeys} snapshots, most recent last — since nothing
    // here persists to storage (see srsManager's comment on why), undo just restores a
    // prior snapshot wholesale, with no depth limit needed the way ReviewScreen's undo
    // requires one.
    const [history, setHistory] = useState<{ queue: any[]; missedKeys: Set<string> }[]>([]);
    // Bumped on every swipe/undo so SwipeCard always gets a fresh instance — otherwise a
    // requeued card resurfacing as the sole remaining card would reuse its prior instance,
    // whose position is still animated off-screen from the swipe that just happened.
    const [attempt, setAttempt] = useState(0);
    const [loading, setLoading] = useState(true);
    const [isCardFlipped, setIsCardFlipped] = useState(false);
    const cardRef = useRef<SwipeCardHandle>(null);

    useEffect(() => {
        (async () => {
            setLoading(true);
            const selected =
                mode === "forgotten"
                    ? await getForgottenCards(languageId)
                    : await getRandomCardSample(languageId, RANDOM_SAMPLE_SIZE);
            setCards(selected);
            setQueue(selected);
            setMissedKeys(new Set());
            setHistory([]);
            setAttempt((prev) => prev + 1);
            setIsCardFlipped(false);
            setLoading(false);
        })();
    }, [languageId, mode]);

    function handleCorrect() {
        if (queue.length === 0) return;
        setHistory((prev) => [...prev, { queue, missedKeys }]);
        setIsCardFlipped(false);
        setQueue((prev) => prev.slice(1));
        setAttempt((prev) => prev + 1);
    }

    function handleIncorrect() {
        if (queue.length === 0) return;
        setHistory((prev) => [...prev, { queue, missedKeys }]);
        setIsCardFlipped(false);
        setQueue((prev) => [...prev.slice(1), prev[0]]);
        setMissedKeys((prev) => new Set(prev).add(getCardKey(queue[0])));
        setAttempt((prev) => prev + 1);
    }

    function handleUndo() {
        if (history.length === 0) return;
        const previousSnapshot = history[history.length - 1];
        setQueue(previousSnapshot.queue);
        setMissedKeys(previousSnapshot.missedKeys);
        setHistory((prev) => prev.slice(0, -1));
        setIsCardFlipped(false);
        setAttempt((prev) => prev + 1);
    }

    function handleLookUpInGoogleTranslate() {
        if (!currentCard) return;
        const headword = normalizeCard(currentCard).headword;
        // See ReviewScreen's identical lookup for why this uses an in-app browser instead
        // of Linking.openURL (the installed Google Translate app hijacks the plain link).
        WebBrowser.openBrowserAsync(`https://translate.google.com/?sl=auto&tl=en&text=${encodeURIComponent(headword)}&op=translate`);
    }

    const currentCard = queue[0];
    // These counts are session-local ("missed at least once this round" vs. "not yet
    // missed this round"), not the cards' real FSRS category — that state never changes
    // in this decoupled extra-review flow (see srsManager's comment on why), so counting
    // by it would leave Learning permanently at 0 regardless of what's actually happened
    // in the session.
    const missedInQueueCount = queue.filter((card) => missedKeys.has(getCardKey(card))).length;
    const remainingCounts = {
        learningCount: missedInQueueCount,
        reviewCount: queue.length - missedInQueueCount,
    };
    const isCurrentMissed = currentCard ? missedKeys.has(getCardKey(currentCard)) : false;

    if (loading) {
        return (
            <ScreenWrapper>
                <View style={styles.centered}>
                    <ActivityIndicator size={50} color={"#A855F7"} />
                </View>
            </ScreenWrapper>
        );
    }

    if (cards.length === 0) {
        return (
            <ScreenWrapper>
                <View style={[styles.centered, { paddingHorizontal: 16 }]}>
                    <Text style={[styles.emptyText, { marginBottom: 24 }]}>
                        {mode === "forgotten"
                            ? "You haven't missed any cards today!"
                            : "There aren't any cards in this deck yet."}
                    </Text>
                    <Pressable
                        onPress={() => navigation.goBack()}
                        style={styles.backButton}
                    >
                        <Text style={styles.backButtonText}>Back</Text>
                    </Pressable>
                </View>
            </ScreenWrapper>
        );
    }

    if (!currentCard) {
        return (
            <ScreenWrapper>
                <View style={[styles.centered, { paddingHorizontal: 16 }]}>
                    <Ionicons name="checkmark-done-circle-outline" size={56} color="#c084fc80" style={{ marginBottom: 12 }} />
                    <Text style={[styles.emptyText, { marginBottom: 24 }]}>
                        Done!
                    </Text>
                    <Pressable
                        onPress={() => navigation.goBack()}
                        style={styles.backButton}
                    >
                        <Text style={styles.backButtonText}>Back</Text>
                    </Pressable>
                </View>
            </ScreenWrapper>
        );
    }

    return (
        <ScreenWrapper>
            <View style={styles.container}>
                <View style={styles.topRow}>
                    <Pressable
                        onPress={handleLookUpInGoogleTranslate}
                        style={styles.roundIconButton}
                    >
                        <Ionicons name="language-outline" size={20} color="#e6b3ff" />
                    </Pressable>

                    <View style={styles.dueCountsBox}>
                        <View style={styles.dueCountItem}>
                            <Text style={[styles.dueCountNumber, { color: colors.red400 }, isCurrentMissed && styles.dueCountActive]}>{remainingCounts.learningCount}</Text>
                            <Text style={styles.dueCountLabel}>Learning</Text>
                        </View>
                        <View style={styles.dueCountItem}>
                            <Text style={[styles.dueCountNumber, { color: colors.green400 }, !isCurrentMissed && styles.dueCountActive]}>{remainingCounts.reviewCount}</Text>
                            <Text style={styles.dueCountLabel}>Review</Text>
                        </View>
                    </View>

                    <Pressable
                        onPress={handleUndo}
                        disabled={history.length === 0}
                        style={[styles.roundIconButton, history.length === 0 && { borderColor: colors.purple900, opacity: 0.3 }]}
                    >
                        <Ionicons name="arrow-undo-outline" size={20} color={history.length > 0 ? "#e6b3ff" : "#6b7280"} />
                    </Pressable>
                </View>

                <View style={{ flex: 1 }}>
                    <SwipeCard
                        key={`${getCardKey(currentCard)}_${attempt}`}
                        ref={cardRef}
                        vocabWord={currentCard}
                        onSwipeRight={handleCorrect}
                        onSwipeLeft={handleIncorrect}
                        onFlipChange={setIsCardFlipped}
                    />
                </View>

                <View style={styles.gradeRow}>
                    <Pressable
                        onPress={() => cardRef.current?.swipeLeft()}
                        disabled={!isCardFlipped}
                        style={isCardFlipped ? styles.gradeButton : [styles.gradeButton, { opacity: 0.3 }]}
                    >
                        <View style={[styles.gradeCircle, { borderColor: colors.red500 }]}>
                            <Ionicons name="close" size={32} color="#f87171" />
                        </View>
                    </Pressable>
                    <Pressable onPress={() => cardRef.current?.flip()} style={styles.gradeButton}>
                        <View style={[styles.gradeCircle, { borderColor: colors.purple500, padding: 24 }]}>
                            <Ionicons name="sync-outline" size={38} color="#e6b3ff" />
                        </View>
                    </Pressable>
                    <Pressable
                        onPress={() => cardRef.current?.swipeRight()}
                        disabled={!isCardFlipped}
                        style={isCardFlipped ? styles.gradeButton : [styles.gradeButton, { opacity: 0.3 }]}
                    >
                        <View style={[styles.gradeCircle, { borderColor: colors.green500 }]}>
                            <Ionicons name="checkmark" size={32} color="#4ade80" />
                        </View>
                    </Pressable>
                </View>
            </View>
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    centered: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyText: {
        fontSize: 20,
        fontWeight: '600',
        color: withOpacity(colors.purple300, 0.5),
        textAlign: 'center',
    },
    backButton: {
        borderWidth: 1,
        padding: 12,
        backgroundColor: colors.purple800,
        borderColor: colors.purple600,
        borderRadius: 4,
        alignItems: 'center',
        paddingHorizontal: 24,
    },
    backButtonText: {
        color: colors.white,
        fontSize: 18,
    },
    container: {
        flex: 1,
        paddingHorizontal: 16,
        paddingBottom: 16,
    },
    topRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 8,
        marginBottom: 12,
    },
    roundIconButton: {
        borderWidth: 1,
        borderColor: colors.purple500,
        borderRadius: 9999,
        padding: 12,
        backgroundColor: colors.black,
    },
    dueCountsBox: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.black,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: colors.purple800,
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    dueCountItem: {
        alignItems: 'center',
        marginHorizontal: 12,
    },
    dueCountNumber: {
        fontWeight: '600',
        fontSize: 18,
    },
    dueCountActive: {
        textDecorationLine: 'underline',
    },
    dueCountLabel: {
        color: withOpacity(colors.purple300, 0.5),
        fontSize: 12,
    },
    gradeRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingTop: 16,
    },
    gradeButton: {
        alignItems: 'center',
    },
    gradeCircle: {
        borderWidth: 2,
        backgroundColor: colors.black,
        borderRadius: 9999,
        padding: 16,
    },
});
