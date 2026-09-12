import { useCallback, useState } from "react";
import { View, Pressable, ScrollView, ActivityIndicator, StyleSheet } from "react-native";
import AppText from "~/components/AppText";
import { useFocusEffect, useNavigation, useRoute, NavigationProp } from "@react-navigation/native";
import ScreenWrapper from "~/components/ScreenWrapper";
import { loadReviewDeck } from "~/utils/deckManager";
import { isJapaneseCard } from "~/utils/cardTypes";
import { isCardNew, isCardDue, getCardQueueCategory, formatInterval, startOfDay } from "~/utils/srsManager";
import { colors, withOpacity } from "~/utils/colors";

// Debug-oriented "when will I see this again" label for the card list — mirrors the
// New/Learning/Review coloring used on the due-counts badges elsewhere.
function getNextDueInfo(card: any): { label: string; color: string } {
    if (isCardNew(card)) {
        return { label: "New", color: colors.blue400 };
    }
    const color = getCardQueueCategory(card) === "learning" ? colors.red400 : colors.green400;
    if (isCardDue(card)) {
        return { label: "Due", color };
    }
    // A Learning/Relearning step can land later today without being "due" yet (those use
    // exact-time comparison, unlike day-granular Review cards) — still worth calling out
    // as today rather than a countdown like "6h" that reads as further off than it is.
    const due = new Date(card.srs.due);
    const isDueToday = startOfDay(due).getTime() === startOfDay(new Date()).getTime();
    const label = isDueToday ? "Today" : formatInterval(due);
    return { label, color };
}

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
                    <AppText style={styles.emptyText}>
                        No cards in your deck yet.{"\n"}Add some from Add Words!
                    </AppText>
                </View>
            </ScreenWrapper>
        );
    }

    return (
        <ScreenWrapper>
            <View style={styles.container}>
                {languageId === "japanese" ? (
                    <View style={styles.headerRow}>
                        <AppText style={[styles.headerText, { width: 70 }]}>Kanji</AppText>
                        <AppText style={[styles.headerText, { width: 90 }]}>Kana</AppText>
                        <AppText style={[styles.headerText, { flex: 1 }]}>Meaning</AppText>
                        <AppText style={[styles.headerText, { width: 50, textAlign: 'right' }]}>Next</AppText>
                    </View>
                ) : (
                    <View style={styles.headerRow}>
                        <AppText style={[styles.headerText, { width: 110 }]}>Word</AppText>
                        <AppText style={[styles.headerText, { flex: 1 }]}>Meaning</AppText>
                        <AppText style={[styles.headerText, { width: 50, textAlign: 'right' }]}>Next</AppText>
                    </View>
                )}
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                    {cards.map(([key, card]) => (
                        <Pressable
                            key={key}
                            onPress={() => navigation.navigate("Edit Card", { cardKey: key, vocabWord: card, languageId })}
                            style={styles.cardRow}
                        >
                            {isJapaneseCard(card) ? (
                                <>
                                    <AppText style={[styles.cardText, { width: 70 }]}>{card.kanji}</AppText>
                                    <AppText style={[styles.cardSubText, { width: 90 }]}>{card.kana}</AppText>
                                </>
                            ) : (
                                <AppText style={[styles.cardText, { width: 110 }]}>{card.word}</AppText>
                            )}
                            <AppText style={[styles.cardSubText, { flex: 1 }]} numberOfLines={1}>{card.meaning}</AppText>
                            <AppText style={[styles.cardText, { width: 50, fontSize: 13, textAlign: 'right', color: getNextDueInfo(card).color }]}>
                                {getNextDueInfo(card).label}
                            </AppText>
                        </Pressable>
                    ))}
                </ScrollView>
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
    container: {
        flex: 1,
        paddingHorizontal: 16,
        paddingTop: 16,
    },
    headerRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderColor: colors.purple800,
        paddingBottom: 8,
        marginBottom: 4,
    },
    headerText: {
        color: withOpacity(colors.purple300, 0.7),
        fontWeight: '600',
    },
    cardRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderColor: colors.purple900,
    },
    cardText: {
        color: colors.white,
        fontSize: 18,
    },
    cardSubText: {
        color: colors.purple300,
    },
});
