import { useEffect, useRef, useState } from "react";
import { View, Text, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import ScreenWrapper from "~/components/ScreenWrapper";
import SwipeCard, { SwipeCardHandle } from "~/components/SwipeCard";
import { getCardKey } from "~/utils/deckManager";
import { getRandomCardSample, getForgottenCards } from "~/utils/srsManager";
import { colors, withOpacity } from "~/utils/colors";

const RANDOM_SAMPLE_SIZE = 20;

type ExtraReviewMode = "random" | "forgotten";

export default function ExtraReviewScreen() {
    const navigation = useNavigation();
    const route = useRoute();
    const { languageId = "japanese", mode = "random" } =
        (route.params as { languageId?: string; languageLabel?: string; mode?: ExtraReviewMode } | undefined) ?? {};

    const [cards, setCards] = useState<any[]>([]);
    const [index, setIndex] = useState(0);
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
            setIndex(0);
            setIsCardFlipped(false);
            setLoading(false);
        })();
    }, [languageId, mode]);

    function handleNext() {
        setIsCardFlipped(false);
        setIndex((prev) => prev + 1);
    }

    const currentCard = cards[index];
    const remaining = cards.length - index;

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
                <Text style={styles.remainingText}>
                    {remaining} card{remaining === 1 ? "" : "s"} remaining
                </Text>

                <View style={{ flex: 1 }}>
                    <SwipeCard
                        key={`${getCardKey(currentCard)}_${index}`}
                        ref={cardRef}
                        vocabWord={currentCard}
                        onSwipeRight={handleNext}
                        onSwipeLeft={handleNext}
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
    remainingText: {
        color: colors.purple300,
        fontSize: 18,
        textAlign: 'center',
        marginTop: 8,
        marginBottom: 12,
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
