import { useCallback, useRef, useState } from "react";
import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import ScreenWrapper from "~/components/ScreenWrapper";
import SwipeCard, { SwipeCardHandle } from "~/components/SwipeCard";
import { loadReviewDeck, getCardKey } from "~/utils/deckManager";

export default function ReviewScreen() {
    const navigation = useNavigation();
    const route = useRoute();
    const { languageId = "japanese" } = (route.params as { languageId?: string } | undefined) ?? {};
    const [cards, setCards] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [index, setIndex] = useState(0);
    const [isCardFlipped, setIsCardFlipped] = useState(false);
    const cardRef = useRef<SwipeCardHandle>(null);

    useFocusEffect(
        useCallback(() => {
            (async () => {
                setLoading(true);
                const deck = await loadReviewDeck(languageId);
                setCards(Object.values(deck));
                setIndex(0);
                setIsCardFlipped(false);
                setLoading(false);
            })();
        }, [languageId])
    );

    function handleSwipe() {
        setIsCardFlipped(false);
        if (index + 1 >= cards.length) {
            navigation.goBack();
            return;
        }
        setIndex(index + 1);
    }

    const currentCard = cards[index];
    const remaining = cards.length - index;

    if (loading) {
        return (
            <ScreenWrapper>
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size={50} color={"#A855F7"} />
                </View>
            </ScreenWrapper>
        );
    }

    if (cards.length === 0) {
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

    return (
        <ScreenWrapper>
            <View className="flex-1 px-4 pb-4">
                <Text className="text-purple-300 text-lg text-center mt-2 mb-3">
                    {remaining} card{remaining === 1 ? "" : "s"} remaining
                </Text>

                <View style={{ flex: 1 }}>
                    {currentCard && (
                        <SwipeCard
                            key={getCardKey(currentCard)}
                            ref={cardRef}
                            vocabWord={currentCard}
                            onSwipeRight={handleSwipe}
                            onSwipeLeft={handleSwipe}
                            onFlipChange={setIsCardFlipped}
                        />
                    )}
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
                    </Pressable>
                </View>
            </View>
        </ScreenWrapper>
    );
}
