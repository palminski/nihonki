import { useCallback, useRef, useState } from "react";
import { View, Text, Pressable, ActivityIndicator, Linking, StyleSheet } from "react-native";
import { useFocusEffect, useNavigation, useRoute, NavigationProp } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import ScreenWrapper from "~/components/ScreenWrapper";
import SwipeCard, { SwipeCardHandle } from "~/components/SwipeCard";
import { loadReviewDeck, getCardKey } from "~/utils/deckManager";
import { normalizeCard } from "~/utils/cardTypes";
import { getDueQueue, gradeCard, undoGradeCard, getDueCountsFromCards, getCardQueueCategory, pickNextCard, previewNextDue, formatInterval } from "~/utils/srsManager";
import { colors, withOpacity } from "~/utils/colors";

interface LastAction {
    previousCard: any;
    previousPool: any[];
}

export default function ReviewScreen() {
    const navigation = useNavigation<NavigationProp<any>>();
    const route = useRoute();
    const { languageId = "japanese", languageLabel } =
        (route.params as { languageId?: string; languageLabel?: string } | undefined) ?? {};
    const [deckSize, setDeckSize] = useState(0);
    const [pool, setPool] = useState<any[]>([]);
    const [currentCard, setCurrentCard] = useState<any | null>(null);
    // Bumped on every pick so SwipeCard always gets a fresh instance — otherwise picking
    // the same card again (e.g. it's the only one left) reuses the prior instance, whose
    // position is still animated off-screen from the swipe that just happened.
    const [attempt, setAttempt] = useState(0);
    // Snapshot of pool/currentCard from right before the most recent grade — lets Undo roll
    // back exactly one step. Cleared on undo or on a fresh focus, so only one level deep.
    const [lastAction, setLastAction] = useState<LastAction | null>(null);
    const [loading, setLoading] = useState(true);
    const [isCardFlipped, setIsCardFlipped] = useState(false);
    const cardRef = useRef<SwipeCardHandle>(null);

    useFocusEffect(
        useCallback(() => {
            (async () => {
                setLoading(true);
                const deck = await loadReviewDeck(languageId);
                setDeckSize(Object.keys(deck).length);
                const queue = await getDueQueue(languageId);
                setPool(queue);
                setCurrentCard(pickNextCard(queue));
                setAttempt((prev) => prev + 1);
                setLastAction(null);
                setIsCardFlipped(false);
                setLoading(false);
            })();
        }, [languageId])
    );

    async function handleGrade(isGood: boolean) {
        if (!currentCard) return;
        setLastAction({ previousCard: currentCard, previousPool: pool });

        // Awaited so each card's read-modify-write cycle against the deck fully completes
        // before the next one starts — otherwise rapid swipes could race and clobber
        // each other's updates in the underlying AsyncStorage blob.
        const updatedCard = await gradeCard(languageId, currentCard, isGood);
        setIsCardFlipped(false);

        const currentKey = getCardKey(currentCard);
        // Whether a card stays in today's session depends on whether it's still mid-way
        // through (re)learning steps, NOT on whether this particular answer was correct —
        // a new card graded "Good" often just advances to its next (still short) learning
        // step rather than graduating, so it needs to stay in the pool exactly like a
        // wrong answer would, resurfacing once its fresh due time actually passes.
        const stillInProgress = getCardQueueCategory(updatedCard) === "learning";
        const nextPool = stillInProgress
            ? pool.map((card) => (getCardKey(card) === currentKey ? updatedCard : card))
            : pool.filter((card) => getCardKey(card) !== currentKey);

        setPool(nextPool);
        setCurrentCard(pickNextCard(nextPool));
        setAttempt((prev) => prev + 1);
    }

    async function handleUndo() {
        if (!lastAction) return;
        await undoGradeCard(languageId, lastAction.previousCard);

        setPool(lastAction.previousPool);
        setCurrentCard(lastAction.previousCard);
        setAttempt((prev) => prev + 1);
        setIsCardFlipped(false);
        setLastAction(null);
    }

    function handleLookUpInGoogleTranslate() {
        if (!currentCard) return;
        const headword = normalizeCard(currentCard).headword;
        Linking.openURL(`https://translate.google.com/?sl=auto&tl=en&text=${encodeURIComponent(headword)}&op=translate`);
    }

    const remainingCounts = getDueCountsFromCards(pool);
    const preview = currentCard ? previewNextDue(currentCard) : null;

    if (loading) {
        return (
            <ScreenWrapper>
                <View style={styles.centered}>
                    <ActivityIndicator size={50} color={"#A855F7"} />
                </View>
            </ScreenWrapper>
        );
    }

    if (deckSize === 0) {
        return (
            <ScreenWrapper>
                <View style={[styles.centered, { paddingHorizontal: 16 }]}>
                    <Text style={styles.emptyText}>
                        No cards in your deck yet.{"\n"}Add some from Add Words!
                    </Text>
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
                        You're all caught up!{"\n"}Nothing due right now — check back later.
                    </Text>

                    <Pressable
                        onPress={() => navigation.navigate("Extra Review", { languageId, languageLabel, mode: "random" })}
                        style={[styles.extraReviewButton, { marginBottom: 12 }]}
                    >
                        <Text style={styles.extraReviewButtonText}>Review Random Set</Text>
                    </Pressable>

                    <Pressable
                        onPress={() => navigation.navigate("Extra Review", { languageId, languageLabel, mode: "forgotten" })}
                        style={[styles.extraReviewButton, { marginBottom: 24 }]}
                    >
                        <Text style={styles.extraReviewButtonText}>Review Forgotten Cards</Text>
                    </Pressable>

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
                            <Text style={[styles.dueCountNumber, { color: colors.blue400 }]}>{remainingCounts.newCount}</Text>
                            <Text style={styles.dueCountLabel}>New</Text>
                        </View>
                        <View style={styles.dueCountItem}>
                            <Text style={[styles.dueCountNumber, { color: colors.red400 }]}>{remainingCounts.learningCount}</Text>
                            <Text style={styles.dueCountLabel}>Learning</Text>
                        </View>
                        <View style={styles.dueCountItem}>
                            <Text style={[styles.dueCountNumber, { color: colors.green400 }]}>{remainingCounts.reviewCount}</Text>
                            <Text style={styles.dueCountLabel}>Review</Text>
                        </View>
                    </View>

                    <Pressable
                        onPress={handleUndo}
                        disabled={!lastAction}
                        style={[styles.roundIconButton, !lastAction && { borderColor: colors.purple900, opacity: 0.3 }]}
                    >
                        <Ionicons name="arrow-undo-outline" size={20} color={lastAction ? "#e6b3ff" : "#6b7280"} />
                    </Pressable>
                </View>

                <View style={{ flex: 1 }}>
                    <SwipeCard
                        key={`${getCardKey(currentCard)}_${attempt}`}
                        ref={cardRef}
                        vocabWord={currentCard}
                        onSwipeRight={() => handleGrade(true)}
                        onSwipeLeft={() => handleGrade(false)}
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
                        {preview && <Text style={[styles.intervalText, { color: colors.red400 }]}>{formatInterval(preview.again)}</Text>}
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
                        {preview && <Text style={[styles.intervalText, { color: colors.green400 }]}>{formatInterval(preview.good)}</Text>}
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
    extraReviewButton: {
        borderWidth: 1,
        padding: 12,
        backgroundColor: colors.black,
        borderColor: colors.purple600,
        borderRadius: 4,
        alignItems: 'center',
        paddingHorizontal: 24,
        width: '100%',
    },
    extraReviewButtonText: {
        color: colors.purple300,
        fontSize: 18,
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
    intervalText: {
        fontSize: 12,
        marginTop: 4,
    },
});
