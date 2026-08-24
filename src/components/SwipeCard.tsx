import { forwardRef, useImperativeHandle, useRef, useEffect } from "react";
import { Animated, PanResponder, View, Text, Pressable, Dimensions, StyleSheet } from "react-native";
import FuriganaText from "~/components/FuriganaText";
import { VocabCard as VocabWord, normalizeCard } from "~/utils/cardTypes";
import { formatInterval } from "~/utils/srsManager";

interface SwipeCardProps {
    vocabWord: VocabWord;
    onSwipeRight: () => void;
    onSwipeLeft: () => void;
    onFlipChange?: (isFlipped: boolean) => void;
    // Next-due preview for a Good/Again grade — shown under the swipe stamps so users
    // can debug scheduling. Omitted (e.g. in Extra Review sessions) hides the labels.
    preview?: { again: Date; good: Date } | null;
}

export interface SwipeCardHandle {
    flip: () => void;
    swipeRight: () => void;
    swipeLeft: () => void;
}

const SCREEN_WIDTH = Dimensions.get("window").width;
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.3;

// Renders text containing <b></b> markers as nested Text spans, no furigana involved.
function renderBoldSegments(text: string, boldStyle: object) {
    const parts = text.split(/(<b>|<\/b>)/);
    let bold = false;
    return parts.map((part, i) => {
        if (part === "<b>") { bold = true; return null; }
        if (part === "</b>") { bold = false; return null; }
        if (!part) return null;
        return (
            <Text key={i} style={bold ? boldStyle : undefined}>
                {part}
            </Text>
        );
    });
}

const SwipeCard = forwardRef<SwipeCardHandle, SwipeCardProps>(function SwipeCard(
    { vocabWord, onSwipeRight, onSwipeLeft, onFlipChange, preview },
    ref
) {
    const position = useRef(new Animated.ValueXY()).current;
    const flipAnim = useRef(new Animated.Value(0)).current;
    const isFlippedRef = useRef(false);

    // A freshly-created Animated.Value's interpolated style (opacity/rotateY here) isn't
    // applied to the native view until an actual animation has run on it at least once —
    // the new card mounts with a correctly measured frame but nothing paints until *any*
    // animation starts on flipAnim. A real (if tiny) non-zero-duration no-op animation
    // "wakes up" that binding immediately on mount.
    useEffect(() => {
        Animated.timing(flipAnim, { toValue: 0, duration: 1, useNativeDriver: false }).start();
    }, []);

    function setFlipped(value: boolean) {
        isFlippedRef.current = value;
        onFlipChange?.(value);
        // JS-driven rather than native: a freshly-mounted native-driven Animated.Value's
        // initial interpolated style isn't always committed to the native view until an
        // animation actually runs on it, which was making brand-new card instances (this
        // component remounts per card via a changing `key`) render invisible until
        // something else happened to kick the driver. JS-driven values are recomputed
        // synchronously on every render, so this can't happen.
        Animated.timing(flipAnim, {
            toValue: value ? 1 : 0,
            duration: 350,
            useNativeDriver: false,
        }).start();
    }

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => false,
            onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 8,
            onPanResponderMove: Animated.event(
                [null, { dx: position.x, dy: position.y }],
                { useNativeDriver: false }
            ),
            onPanResponderRelease: (_, gesture) => {
                if (gesture.dx > SWIPE_THRESHOLD) {
                    forceSwipe("right");
                } else if (gesture.dx < -SWIPE_THRESHOLD) {
                    forceSwipe("left");
                } else {
                    resetPosition();
                }
            },
        })
    ).current;

    function forceSwipe(direction: "right" | "left") {
        const x = direction === "right" ? SCREEN_WIDTH * 1.5 : -SCREEN_WIDTH * 1.5;
        Animated.timing(position, {
            toValue: { x, y: 0 },
            duration: 250,
            useNativeDriver: false,
        }).start(() => {
            if (direction === "right") {
                onSwipeRight();
            } else {
                onSwipeLeft();
            }
        });
    }

    function resetPosition() {
        Animated.spring(position, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: false,
        }).start();
    }

    useImperativeHandle(ref, () => ({
        flip: () => setFlipped(!isFlippedRef.current),
        swipeRight: () => {
            if (isFlippedRef.current) forceSwipe("right");
        },
        swipeLeft: () => {
            if (isFlippedRef.current) forceSwipe("left");
        },
    }));

    const rotate = position.x.interpolate({
        inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
        outputRange: ["-10deg", "0deg", "10deg"],
    });

    const goodOpacity = position.x.interpolate({
        inputRange: [0, SWIPE_THRESHOLD],
        outputRange: [0, 1],
        extrapolate: "clamp",
    });

    const againOpacity = position.x.interpolate({
        inputRange: [-SWIPE_THRESHOLD, 0],
        outputRange: [1, 0],
        extrapolate: "clamp",
    });

    const cardStyle = {
        transform: [
            { translateX: position.x },
            { translateY: position.y },
            { rotate },
        ],
    };

    const frontRotateY = flipAnim.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "180deg"] });
    const backRotateY = flipAnim.interpolate({ inputRange: [0, 1], outputRange: ["180deg", "360deg"] });
    const frontFaceOpacity = flipAnim.interpolate({
        inputRange: [0, 0.5, 0.5001, 1],
        outputRange: [1, 1, 0, 0],
    });
    const backFaceOpacity = flipAnim.interpolate({
        inputRange: [0, 0.4999, 0.5, 1],
        outputRange: [0, 0, 1, 1],
    });

    const view = normalizeCard(vocabWord);

    return (
        <Animated.View
            {...panResponder.panHandlers}
            style={[styles.card, cardStyle]}
        >
            <Pressable style={{ flex: 1 }} onPress={() => setFlipped(!isFlippedRef.current)}>
                <Animated.View style={[styles.stamp, styles.goodStamp, { opacity: goodOpacity }]}>
                    <Text style={styles.stampKanjiGood}>正</Text>
                    {preview && <Text style={styles.stampIntervalGood}>{formatInterval(preview.good)}</Text>}
                </Animated.View>
                <Animated.View style={[styles.stamp, styles.againStamp, { opacity: againOpacity }]}>
                    <Text style={styles.stampKanjiBad}>誤</Text>
                    {preview && <Text style={styles.stampIntervalBad}>{formatInterval(preview.again)}</Text>}
                </Animated.View>

                <Animated.View
                    style={[
                        styles.cardFace,
                        {
                            opacity: frontFaceOpacity,
                            transform: [{ perspective: 1200 }, { rotateY: frontRotateY }],
                        },
                    ]}
                >
                    <Text style={styles.kanjiText}>{view.headword}</Text>
                    <Text style={styles.frontSentenceText}>
                        {renderBoldSegments(view.exampleSentencePlain, styles.sentenceBold)}
                    </Text>
                    <Text style={styles.hintText}>Tap to reveal</Text>
                </Animated.View>

                <Animated.View
                    style={[
                        styles.cardFace,
                        {
                            opacity: backFaceOpacity,
                            transform: [{ perspective: 1200 }, { rotateY: backRotateY }],
                        },
                    ]}
                >
                    {view.pronunciation ? (
                        <View style={{ marginBottom: 4 }}>
                            <FuriganaText
                                text={view.pronunciation}
                                textStyle={styles.backKanjiText}
                                furiganaStyle={styles.backFuriganaText}
                            />
                        </View>
                    ) : (
                        <Text style={styles.backKanjiText}>{view.headword}</Text>
                    )}
                    <Text style={styles.meaningText}>{view.meaning}</Text>
                    <Text style={styles.posText}>{view.partOfSpeech}</Text>

                    <View style={styles.divider} />

                    {view.exampleSentenceAnnotated ? (
                        <FuriganaText
                            text={view.exampleSentenceAnnotated}
                            textStyle={styles.sentenceText}
                            furiganaStyle={styles.furiganaText}
                            boldStyle={styles.sentenceBold}
                        />
                    ) : (
                        <Text style={styles.sentenceText}>
                            {renderBoldSegments(view.exampleSentencePlain, styles.sentenceBold)}
                        </Text>
                    )}
                    <Text style={styles.sentenceEnglish}>{view.exampleSentenceEnglish}</Text>
                </Animated.View>
            </Pressable>
        </Animated.View>
    );
});

export default SwipeCard;

const styles = StyleSheet.create({
    // Plain flex fill rather than position:absolute + edges:0 — the parent (ReviewScreen's
    // wrapper View) only ever holds this one child, so there's no need to take it out of
    // flow at all.
    card: {
        flex: 1,
    },
    cardFace: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: "center",
        alignItems: "center",
        borderRadius: 16,
        backgroundColor: "#050505",
        borderWidth: 1,
        borderColor: "#6b21a8",
        shadowColor: "#a855f7",
        shadowOpacity: 0.4,
        shadowRadius: 10,
        padding: 20,
        backfaceVisibility: "hidden",
    },
    kanjiText: {
        color: "#fff",
        fontSize: 64,
        fontWeight: "600",
    },
    frontSentenceText: {
        color: "#e9d5ff",
        fontSize: 20,
        lineHeight: 26,
        textAlign: "center",
        marginTop: 24,
    },
    hintText: {
        color: "#c084fc80",
        marginTop: 20,
        fontSize: 14,
    },
    backKanjiText: {
        color: "#fff",
        fontSize: 48,
        fontWeight: "600",
    },
    backFuriganaText: {
        color: "#e6b3ff",
        fontSize: 16,
        lineHeight: 18,
    },
    meaningText: {
        color: "#fff",
        fontSize: 24,
        fontWeight: "600",
        textAlign: "center",
    },
    posText: {
        color: "#c084fc",
        fontSize: 14,
        marginTop: 4,
        fontStyle: "italic",
    },
    divider: {
        height: 1,
        width: "60%",
        backgroundColor: "#6b21a8",
        marginVertical: 20,
    },
    sentenceText: {
        color: "#e9d5ff",
        fontSize: 20,
        lineHeight: 20,
    },
    sentenceBold: {
        fontWeight: "bold",
        color: "#fff",
    },
    furiganaText: {
        color: "#c084fc",
        fontSize: 11,
        lineHeight: 13,
    },
    sentenceEnglish: {
        color: "#c084fc",
        marginTop: 14,
        fontSize: 15,
        textAlign: "center",
    },
    stamp: {
        position: "absolute",
        top: 20,
        width: 76,
        height: 76,
        borderRadius: 38,
        borderWidth: 3,
        alignItems: "center",
        justifyContent: "center",
        zIndex: 10,
    },
    goodStamp: {
        left: 20,
        borderColor: "#4ade80",
        transform: [{ rotate: "-15deg" }],
    },
    againStamp: {
        right: 20,
        borderColor: "#f87171",
        transform: [{ rotate: "15deg" }],
    },
    stampKanjiGood: {
        fontWeight: "bold",
        fontSize: 28,
        color: "#4ade80",
    },
    stampKanjiBad: {
        fontWeight: "bold",
        fontSize: 28,
        color: "#f87171",
    },
    stampIntervalGood: {
        fontWeight: "600",
        fontSize: 11,
        color: "#4ade80",
    },
    stampIntervalBad: {
        fontWeight: "600",
        fontSize: 11,
        color: "#f87171",
    },
});
