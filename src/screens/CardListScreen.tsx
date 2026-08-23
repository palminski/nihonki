import { useCallback, useState } from "react";
import { View, Text, Pressable, ScrollView, ActivityIndicator } from "react-native";
import { useFocusEffect, useNavigation, useRoute, NavigationProp } from "@react-navigation/native";
import ScreenWrapper from "~/components/ScreenWrapper";
import { loadReviewDeck } from "~/utils/deckManager";
import { isJapaneseCard } from "~/utils/cardTypes";

export default function CardListScreen() {
    const navigation = useNavigation<NavigationProp<any>>();
    const route = useRoute();
    const { languageId = "japanese" } = (route.params as { languageId?: string } | undefined) ?? {};
    const [cards, setCards] = useState<[string, any][]>([]);
    const [loading, setLoading] = useState(true);

    useFocusEffect(
        useCallback(() => {
            (async () => {
                setLoading(true);
                const deck = await loadReviewDeck(languageId);
                setCards(Object.entries(deck));
                setLoading(false);
            })();
        }, [languageId])
    );

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
            <View className="flex-1 px-4 pt-4">
                {languageId === "japanese" ? (
                    <View className="flex-row border-b border-purple-800 pb-2 mb-1">
                        <Text className="text-purple-300/70 font-semibold" style={{ width: 70 }}>Kanji</Text>
                        <Text className="text-purple-300/70 font-semibold" style={{ width: 90 }}>Kana</Text>
                        <Text className="text-purple-300/70 font-semibold flex-1">Meaning</Text>
                    </View>
                ) : (
                    <View className="flex-row border-b border-purple-800 pb-2 mb-1">
                        <Text className="text-purple-300/70 font-semibold" style={{ width: 110 }}>Word</Text>
                        <Text className="text-purple-300/70 font-semibold flex-1">Meaning</Text>
                    </View>
                )}
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                    {cards.map(([key, card]) => (
                        <Pressable
                            key={key}
                            onPress={() => navigation.navigate("Edit Card", { cardKey: key, vocabWord: card, languageId })}
                            className="flex-row items-center py-3 border-b border-purple-900"
                        >
                            {isJapaneseCard(card) ? (
                                <>
                                    <Text className="text-white text-lg" style={{ width: 70 }}>{card.kanji}</Text>
                                    <Text className="text-purple-300" style={{ width: 90 }}>{card.kana}</Text>
                                </>
                            ) : (
                                <Text className="text-white text-lg" style={{ width: 110 }}>{card.word}</Text>
                            )}
                            <Text className="text-purple-300 flex-1" numberOfLines={1}>{card.meaning}</Text>
                        </Pressable>
                    ))}
                </ScrollView>
            </View>
        </ScreenWrapper>
    );
}
