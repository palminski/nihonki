import { useCallback, useRef, useState } from "react";
import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import ScreenWrapper from "~/components/ScreenWrapper";
import SwipeCard, { SwipeCardHandle } from "~/components/SwipeCard";
import { loadReviewDeck, getCardKey } from "~/utils/deckManager";
import { getDueQueue, gradeCard, getDueCountsFromCards, getCardQueueCategory, pickNextCard, previewNextDue, formatInterval } from "~/utils/srsManager";

export default function ReviewScreen() {
    const navigation = useNavigation();
    const route = useRoute();
    const { languageId = "japanese" } = (route.params as { languageId?: string } | undefined) ?? {};
    const [deckSize, setDeckSize] = useState(0);
    const [pool, setPool] = useState<any[]>([]);
    const [currentCard, setCurrentCard] = useState<any | null>(null);
    // Bumped on every pick so SwipeCard always gets a fresh instance — otherwise picking
    // the same card again (e.g. it's the only one left) reuses the prior instance, whose
    // position is still animated off-screen from the swipe that just happened.
    const [attempt, setAttempt] = useState(0);
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
                setIsCardFlipped(false);
                setLoading(false);
            })();
        }, [languageId])
    );

    async function handleGrade(isGood: boolean) {
        if (!currentCard) return;
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

    const remainingCounts = getDueCountsFromCards(pool);
    const preview = currentCard ? previewNextDue(currentCard) : null;

    if (loading) {
        return (
            <ScreenWrapper>
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size={50} color={"#A855F7"} />
                </View>
            </ScreenWrapper>
        );
    }

    if (deckSize === 0) {
        return (
            <ScreenWrapper>
                <View className="flex-1 items-center justify-center px-4">
                    <Text className="text-xl font-semibold text-purple-300/50 text-center">
                        No cards in your deck yet.{"\n"}Add some from Add Words!
                    </Text>
                </View>
            </ScreenWrapper>
        );
    }

    if (!currentCard) {
        return (
            <ScreenWrapper>
                <View className="flex-1 items-center justify-center px-4">
                    <Ionicons name="checkmark-done-circle-outline" size={56} color="#c084fc80" style={{ marginBottom: 12 }} />
                    <Text className="text-xl font-semibold text-purple-300/50 text-center mb-6">
                        You're all caught up!{"\n"}Nothing due right now — check back later.
                    </Text>
                    <Pressable
                        onPress={() => navigation.goBack()}
                        className="border p-3 bg-purple-800 border-purple-600 rounded items-center px-6"
                    >
                        <Text className="text-white text-lg">Back</Text>
                    </Pressable>
                </View>
            </ScreenWrapper>
        );
    }

    return (
        <ScreenWrapper>
            <View className="flex-1 px-4 pb-4">
                <View className="flex-row items-center justify-center bg-black rounded border border-purple-800 self-center px-4 py-2 mt-2 mb-3">
                    <View className="items-center mx-3">
                        <Text className="text-blue-400 font-semibold text-lg">{remainingCounts.newCount}</Text>
                        <Text className="text-purple-300/50 text-xs">New</Text>
                    </View>
                    <View className="items-center mx-3">
                        <Text className="text-red-400 font-semibold text-lg">{remainingCounts.learningCount}</Text>
                        <Text className="text-purple-300/50 text-xs">Learning</Text>
                    </View>
                    <View className="items-center mx-3">
                        <Text className="text-green-400 font-semibold text-lg">{remainingCounts.reviewCount}</Text>
                        <Text className="text-purple-300/50 text-xs">Review</Text>
                    </View>
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

                <View className="flex-row justify-around items-center pt-4">
                    <Pressable
                        onPress={() => cardRef.current?.swipeLeft()}
                        disabled={!isCardFlipped}
                        className={isCardFlipped ? "items-center" : "items-center opacity-30"}
                    >
                        <View className="border-2 border-red-500 bg-black rounded-full p-4">
                            <Ionicons name="close" size={32} color="#f87171" />
                        </View>
                        {preview && <Text className="text-red-400 text-xs mt-1">{formatInterval(preview.again)}</Text>}
                    </Pressable>
                    <Pressable onPress={() => cardRef.current?.flip()} className="items-center">
                        <View className="border-2 border-purple-500 bg-black rounded-full p-6">
                            <Ionicons name="sync-outline" size={38} color="#e6b3ff" />
                        </View>
                    </Pressable>
                    <Pressable
                        onPress={() => cardRef.current?.swipeRight()}
                        disabled={!isCardFlipped}
                        className={isCardFlipped ? "items-center" : "items-center opacity-30"}
                    >
                        <View className="border-2 border-green-500 bg-black rounded-full p-4">
                            <Ionicons name="checkmark" size={32} color="#4ade80" />
                        </View>
                        {preview && <Text className="text-green-400 text-xs mt-1">{formatInterval(preview.good)}</Text>}
                    </Pressable>
                </View>
            </View>
        </ScreenWrapper>
    );
}
