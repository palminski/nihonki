import { useEffect, useRef, useState } from "react";
import { Animated, View, Text, Pressable, ScrollView, ActivityIndicator, Image, StyleSheet, LayoutChangeEvent } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { manipulateAsync } from "expo-image-manipulator";
import { Ionicons } from "@expo/vector-icons";
import TextRecognition, { TextRecognitionScript, TextLine } from "@react-native-ml-kit/text-recognition";
import TinySegmenter from "~/utils/tinySegmenter";
import { colors, withOpacity } from "~/utils/colors";

interface CameraOcrViewProps {
    languageId: string;
    // Called with one recognized word per tap — the caller sends it through the exact
    // same single-word pipeline as manually typed text.
    onWordPress: (word: string) => void;
}

// ML Kit's Text Recognition v2 only ships dedicated models for these four scripts (plus
// Devanagari, unused here) — everything else (Spanish/French/German/Italian/Portuguese/
// Dutch, and Russian on a best-effort basis since Cyrillic has no dedicated model) falls
// back to the Latin recognizer.
const SCRIPT_FOR_LANGUAGE: Partial<Record<string, TextRecognitionScript>> = {
    japanese: TextRecognitionScript.JAPANESE,
    korean: TextRecognitionScript.KOREAN,
    mandarin: TextRecognitionScript.CHINESE,
    cantonese: TextRecognitionScript.CHINESE,
};

const segmenter = new TinySegmenter();

// Explicit \uXXXX code-point ranges rather than \p{Script=...} property escapes -- safer
// bet for broad JS-engine compatibility than relying on the JS engine's bundled Unicode
// script data, given this app has been bitten by engine/library compatibility gaps
// before. Used both to build Han-character chunks for Chinese and, below, to check
// whether a candidate word is actually written in the language being studied.
const HAN_RUN = /[\u4E00-\u9FFF\u3400-\u4DBF\uF900-\uFAFF]+/g;

const JAPANESE_SCRIPT_CHAR = /[\u3040-\u30FF\u4E00-\u9FFF\u3400-\u4DBF\uF900-\uFAFF]/;
const KOREAN_SCRIPT_CHAR = /[\uAC00-\uD7A3]/;
const HAN_SCRIPT_CHAR = /[\u4E00-\u9FFF\u3400-\u4DBF\uF900-\uFAFF]/;
const CYRILLIC_SCRIPT_CHAR = /[\u0400-\u04FF]/;
// Default for Spanish/French/German/Italian/Portuguese/Dutch.
const LATIN_SCRIPT_CHAR = /[a-zA-Z\u00C0-\u024F]/;

// A scanned line of "mostly-Japanese" text can still contain incidental Latin-script
// words (a brand name printed on a game box, e.g. "Nintendo") -- these aren't part of
// the language being studied, so require at least one character actually in the
// target script rather than just any non-punctuation character.
function matchesTargetScript(languageId: string, word: string): boolean {
    if (languageId === "japanese") return JAPANESE_SCRIPT_CHAR.test(word);
    if (languageId === "korean") return KOREAN_SCRIPT_CHAR.test(word);
    if (languageId === "mandarin" || languageId === "cantonese") return HAN_SCRIPT_CHAR.test(word);
    if (languageId === "russian") return CYRILLIC_SCRIPT_CHAR.test(word);
    return LATIN_SCRIPT_CHAR.test(word);
}

// Common single-character particles/function words -- grammatically real tokens, but
// essentially never worth their own flashcard, and the single biggest source of
// annoying noise from TinySegmenter's (correct) word-level segmentation.
// no, ha/wa, ga, wo, ni, de, to, mo, ya, ka, ne, yo, wa, he/e, zo, sa, ze
const JAPANESE_PARTICLES = new Set([
    "\u306E", "\u306F", "\u304C", "\u3092", "\u306B", "\u3067", "\u3068", "\u3082",
    "\u3084", "\u304B", "\u306D", "\u3088", "\u308F", "\u3078", "\u305E", "\u3055", "\u305C",
]);

// TinySegmenter's raw output includes plenty of tokens that are technically real but
// unhelpful as flashcards: bare grammatical particles, and single kana leftover from
// over-segmentation (unlike a single kanji -- e.g. \u76EE/\u624B/\u6C34 -- a lone hiragana
// or katakana character is essentially never a complete word on its own). Also rejects
// tokens where OCR/segmentation noise has fused a stray Latin letter onto otherwise-
// Japanese text.
function isUsefulJapaneseToken(word: string): boolean {
    if (!JAPANESE_SCRIPT_CHAR.test(word)) return false;
    if (LATIN_SCRIPT_CHAR.test(word)) return false;
    if (JAPANESE_PARTICLES.has(word)) return false;
    if (word.length === 1 && !HAN_SCRIPT_CHAR.test(word)) return false;
    return true;
}

function extractWordsFromLine(languageId: string, line: TextLine): string[] {
    if (languageId === "japanese") {
        return segmenter
            .segment(line.text)
            .map((word: string) => word.trim())
            .filter((word: string) => isUsefulJapaneseToken(word));
    }

    if (languageId === "mandarin" || languageId === "cantonese") {
        const chunks: string[] = [];
        const runs = line.text.match(HAN_RUN) ?? [];
        for (const run of runs) {
            for (let i = 0; i < run.length; i += 2) {
                chunks.push(run.slice(i, i + 2));
            }
        }
        return chunks;
    }

    return line.elements
        .map((element) => element.text.trim())
        .filter((word) => matchesTargetScript(languageId, word));
}

// A newly-recognized word chip slides in from the left rather than just popping into
// place, so a stream of new words reads as things arriving rather than the list quietly
// changing underneath you.
function AnimatedChip({ word, isSent, onPress }: { word: string; isSent: boolean; onPress: () => void }) {
    const translateX = useRef(new Animated.Value(-48)).current;
    const opacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(translateX, { toValue: 0, duration: 280, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 1, duration: 280, useNativeDriver: true }),
        ]).start();
    }, []);

    return (
        <Animated.View style={{ transform: [{ translateX }], opacity }}>
            <Pressable onPress={onPress} style={[styles.chip, isSent && styles.chipSent]}>
                {isSent && <Ionicons name="checkmark-circle" size={20} color={colors.green400} style={styles.chipSentIcon} />}
                <Text style={[styles.chipText, isSent && styles.chipTextSent]}>{word}</Text>
            </Pressable>
        </Animated.View>
    );
}

interface CapturedPhoto {
    uri: string;
    width: number;
    height: number;
}

export default function CameraOcrView({ languageId, onWordPress }: CameraOcrViewProps) {
    const [permission, requestPermission] = useCameraPermissions();
    const cameraRef = useRef<CameraView>(null);
    const [photo, setPhoto] = useState<CapturedPhoto | null>(null);
    const [isRecognizing, setIsRecognizing] = useState(false);
    const [lines, setLines] = useState<TextLine[]>([]);
    const [containerSize, setContainerSize] = useState<{ width: number; height: number } | null>(null);
    const [selectedLineIndex, setSelectedLineIndex] = useState<number | null>(null);
    const [wordCandidates, setWordCandidates] = useState<string[]>([]);
    const [sentWords, setSentWords] = useState<Set<string>>(new Set());

    const script = SCRIPT_FOR_LANGUAGE[languageId] ?? TextRecognitionScript.LATIN;

    useEffect(() => {
        if (permission && !permission.granted && permission.canAskAgain) {
            requestPermission();
        }
    }, [permission]);

    async function handleCapture() {
        if (!cameraRef.current) return;
        const captured = await cameraRef.current.takePictureAsync({ quality: 0.8, shutterSound: false });
        if (!captured?.uri) return;

        // The captured file's width/height (from expo-camera) reflect the orientation-
        // corrected, displayed image, but ML Kit's recognizer reads it as the raw
        // unrotated sensor buffer -- producing bounding boxes rotated 90deg from what's
        // actually shown. Re-encoding with zero actions bakes the correct orientation
        // into real pixel data, so the file we display and the file ML Kit reads are
        // identically oriented and the same width/height apply to both.
        const normalized = await manipulateAsync(captured.uri, [], { compress: 1 });

        setPhoto({ uri: normalized.uri, width: normalized.width, height: normalized.height });
        setContainerSize(null);
        setLines([]);
        setSelectedLineIndex(null);
        setWordCandidates([]);
        setSentWords(new Set());
        setIsRecognizing(true);
        try {
            const result = await TextRecognition.recognize(normalized.uri, script);
            // Only keep lines that will actually yield at least one word -- otherwise
            // you get highlighted regions that just dead-end when tapped.
            const recognizedLines = result.blocks
                .flatMap((block) => block.lines)
                .filter((line) => line.frame && extractWordsFromLine(languageId, line).length > 0);
            setLines(recognizedLines);
        } catch (error) {
            console.error("Failed To Recognize Text", error);
        } finally {
            setIsRecognizing(false);
        }
    }

    function handleRetake() {
        setPhoto(null);
        setLines([]);
        setSelectedLineIndex(null);
        setWordCandidates([]);
        setSentWords(new Set());
    }

    function handleLinePress(index: number) {
        setSelectedLineIndex(index);
        setWordCandidates(extractWordsFromLine(languageId, lines[index]));
    }

    function handleWordPress(word: string) {
        onWordPress(word);
        setSentWords((prev) => new Set(prev).add(word));
    }

    function handlePhotoLayout(event: LayoutChangeEvent) {
        const { width, height } = event.nativeEvent.layout;
        setContainerSize({ width, height });
    }

    // Maps one recognized line's bounding box -- reported in the photo's own pixel
    // space -- onto where that region actually renders on screen, given the photo is
    // displayed with resizeMode="contain" (uniformly scaled and letterboxed to fit).
    function getLineOverlayRect(line: TextLine) {
        if (!photo || !containerSize || !line.frame) return null;
        const scale = Math.min(containerSize.width / photo.width, containerSize.height / photo.height);
        const offsetX = (containerSize.width - photo.width * scale) / 2;
        const offsetY = (containerSize.height - photo.height * scale) / 2;
        return {
            left: offsetX + line.frame.left * scale,
            top: offsetY + line.frame.top * scale,
            width: line.frame.width * scale,
            height: line.frame.height * scale,
        };
    }

    if (!permission) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size={40} color={colors.purple500} />
            </View>
        );
    }

    if (!permission.granted) {
        return (
            <View style={styles.centered}>
                <Text style={styles.permissionText}>Camera access is needed to scan text.</Text>
                <Pressable onPress={requestPermission} style={styles.permissionButton}>
                    <Text style={styles.permissionButtonText}>Grant Permission</Text>
                </Pressable>
            </View>
        );
    }

    if (!photo) {
        return (
            <View style={styles.container}>
                <CameraView ref={cameraRef} style={styles.camera} facing="back" />
                <View style={styles.captureBar}>
                    <Pressable onPress={handleCapture} style={styles.shutterButton}>
                        <View style={styles.shutterInner} />
                    </Pressable>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.photoContainer} onLayout={handlePhotoLayout}>
                <Image source={{ uri: photo.uri }} style={styles.photo} resizeMode="contain" />
                {lines.map((line, index) => {
                    const rect = getLineOverlayRect(line);
                    if (!rect) return null;
                    return (
                        <Pressable
                            key={index}
                            onPress={() => handleLinePress(index)}
                            style={[styles.lineOverlay, rect, index === selectedLineIndex && styles.lineOverlaySelected]}
                        />
                    );
                })}
                {isRecognizing && (
                    <View style={styles.recognizingOverlay}>
                        <ActivityIndicator size={40} color={colors.purple500} />
                    </View>
                )}
            </View>

            <View style={styles.wordBar}>
                <View style={styles.wordBarHeader}>
                    <Text style={styles.wordBarTitle}>
                        {selectedLineIndex === null ? "Tap a highlighted line" : "Tap a word to add it"}
                    </Text>
                    <Pressable onPress={handleRetake} style={styles.retakeButton}>
                        <Text style={styles.retakeButtonText}>Retake</Text>
                    </Pressable>
                </View>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.chipRow}
                >
                    {selectedLineIndex === null ? (
                        <Text style={styles.placeholderText}>
                            {isRecognizing
                                ? "Reading text..."
                                : lines.length === 0
                                    ? "No text found -- try retaking the photo."
                                    : "Tap a highlighted line above"}
                        </Text>
                    ) : wordCandidates.length === 0 ? (
                        <Text style={styles.placeholderText}>No words found in this line</Text>
                    ) : (
                        wordCandidates.map((word, index) => (
                            <AnimatedChip
                                key={`${word}_${index}`}
                                word={word}
                                isSent={sentWords.has(word)}
                                onPress={() => handleWordPress(word)}
                            />
                        ))
                    )}
                </ScrollView>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    centered: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 24,
    },
    permissionText: {
        color: withOpacity(colors.purple300, 0.7),
        fontSize: 16,
        textAlign: "center",
        marginBottom: 16,
    },
    permissionButton: {
        borderWidth: 1,
        borderColor: colors.purple600,
        backgroundColor: colors.purple800,
        borderRadius: 4,
        paddingHorizontal: 24,
        paddingVertical: 12,
    },
    permissionButtonText: {
        color: colors.white,
        fontSize: 16,
    },
    camera: {
        flex: 1,
    },
    captureBar: {
        position: "absolute",
        bottom: 24,
        left: 0,
        right: 0,
        alignItems: "center",
    },
    shutterButton: {
        width: 72,
        height: 72,
        borderRadius: 36,
        borderWidth: 4,
        borderColor: colors.white,
        alignItems: "center",
        justifyContent: "center",
    },
    shutterInner: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: colors.white,
    },
    photoContainer: {
        flex: 1,
        backgroundColor: colors.black,
    },
    photo: {
        width: "100%",
        height: "100%",
    },
    lineOverlay: {
        position: "absolute",
        borderWidth: 2,
        borderColor: withOpacity(colors.purple400, 0.8),
        backgroundColor: withOpacity(colors.purple500, 0.15),
        borderRadius: 4,
    },
    lineOverlaySelected: {
        borderColor: colors.green400,
        backgroundColor: withOpacity(colors.green500, 0.25),
    },
    recognizingOverlay: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: withOpacity(colors.black, 0.4),
    },
    wordBar: {
        backgroundColor: colors.black,
        borderTopWidth: 1,
        borderColor: colors.purple800,
        paddingTop: 8,
        paddingBottom: 8,
    },
    wordBarHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 12,
        marginBottom: 6,
    },
    wordBarTitle: {
        color: withOpacity(colors.purple300, 0.7),
        fontSize: 12,
        fontWeight: "600",
    },
    retakeButton: {
        borderWidth: 1,
        borderColor: colors.purple600,
        backgroundColor: colors.purple800,
        borderRadius: 9999,
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    retakeButtonText: {
        color: colors.white,
        fontSize: 16,
        fontWeight: "600",
    },
    chipRow: {
        paddingHorizontal: 12,
        alignItems: "center",
        minHeight: 66,
    },
    placeholderText: {
        color: withOpacity(colors.purple300, 0.4),
        fontSize: 13,
    },
    chip: {
        flexDirection: "row",
        alignItems: "center",
        borderWidth: 1,
        borderColor: colors.purple600,
        backgroundColor: colors.purple800,
        borderRadius: 9999,
        paddingHorizontal: 24,
        paddingVertical: 14,
        marginRight: 12,
    },
    chipSent: {
        borderColor: colors.green500,
        backgroundColor: withOpacity(colors.green500, 0.15),
    },
    chipSentIcon: {
        marginRight: 6,
    },
    chipText: {
        color: colors.white,
        fontSize: 24,
        fontWeight: "600",
    },
    chipTextSent: {
        color: colors.green400,
    },
});
