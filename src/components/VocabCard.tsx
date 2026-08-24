import { View, Text, Pressable, NativeModules, Alert, Platform, StyleSheet } from "react-native";
import { useState } from "react";
import { useEffect, useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { loadDeckSetting, loadAnkiEnabledSetting } from "~/utils/settingsManager";
import { addCardToReviewDeck, isCardInReviewDeck } from "~/utils/deckManager";
import { VocabCard as VocabCardData, isJapaneseCard, isRomanizedCard } from "~/utils/cardTypes";
import { colors } from "~/utils/colors";

interface VocabCardProps {
    vocabWord: VocabCardData
    hasBeenSent?: boolean
    languageId?: string
}

export default function VocabCard({ vocabWord, hasBeenSent = false, languageId = "japanese" }: VocabCardProps) {

    const { AnkiModule } = NativeModules;

    const [isAdded, setIsAdded] = useState(hasBeenSent);
    const [isOpen, setIsOpen] = useState(false)
    const [isAnkiEnabled, setIsAnkiEnabled] = useState(false)
    const [isInDeck, setIsInDeck] = useState(false)

    const isJapanese = isJapaneseCard(vocabWord);

    useFocusEffect(
        useCallback(() => {
            (async () => {
                setIsAnkiEnabled(await loadAnkiEnabledSetting(languageId));
                setIsInDeck(await isCardInReviewDeck(languageId, vocabWord));
            })();
        }, [vocabWord, languageId])
    )

    async function handleAddToDeck(cardObject: VocabCardData) {
        await addCardToReviewDeck(languageId, cardObject);
        setIsInDeck(true);
    }

    async function handleSendToAnki(cardObject: VocabCardData) {
        if (Platform.OS !== "android" || !isJapaneseCard(cardObject)) return;
        const deckToInsertInto = await loadDeckSetting(languageId);
        try {
            const result = await AnkiModule.addNote(
                cardObject.kanji,
                cardObject.kana,
                cardObject.furigana,
                cardObject.meaning,
                cardObject.partOfSpeech,
                cardObject.exampleSentenceKanji,
                cardObject.exampleSentenceFurigana,
                cardObject.exampleSentenceKana,
                cardObject.exampleSentenceEnglish,
                deckToInsertInto ? deckToInsertInto : "Umeboshi"
            );
            setIsAdded(true)
        } catch (error: any) {
            Alert.alert("AnkiDroid Could Not Be Reached", error?.message);
        }

    }

    useEffect(() => {
        setIsAdded(hasBeenSent);
    }, [hasBeenSent]);

    const headword = isJapaneseCard(vocabWord) ? vocabWord.kanji : vocabWord.word;
    const subheading = isJapaneseCard(vocabWord) ? vocabWord.kana : vocabWord.partOfSpeech;
    const exampleSentence = isJapaneseCard(vocabWord) ? vocabWord.exampleSentenceKanji : vocabWord.exampleSentence;

    // With Anki enabled there are two action buttons instead of one — stacking both next
    // to the headword/meaning text crowds them into a narrow column, so they move to a
    // full-width row under the card instead. With just "Add to Deck" alone, the header
    // corner still has plenty of room.
    const ankiSendAvailable = Platform.OS === "android" && isAnkiEnabled && isJapanese;

    const addToDeckButton = !isInDeck ? (
        <Pressable onPress={() => handleAddToDeck(vocabWord)} style={[styles.actionButton, ankiSendAvailable && { flex: 1, justifyContent: 'center' }]}>
            <Text style={styles.actionButtonText}>Add to Deck</Text>
            <Ionicons style={{ marginLeft: 8 }} name="albums-outline" size={12} color={"#fff"} />
        </Pressable>
    ) : (
        <Pressable style={[styles.doneButton, ankiSendAvailable && { flex: 1, justifyContent: 'center' }]}>
            <Text style={styles.doneButtonText}>In Deck!</Text>
            <Ionicons style={{ marginLeft: 8 }} name="checkmark-outline" size={12} color={"#C084FC"} />
        </Pressable>
    );

    return (
        <View style={styles.card}>
            <View style={styles.headerRow}>
                <Pressable onPress={() => setIsOpen(!isOpen)} style={{ flex: 1, marginRight: 8 }}>
                    <Text style={styles.headwordLine}>
                        <Text style={styles.headword}>{headword}</Text> - <Text style={styles.headword}>[ {subheading} ] {isOpen ? "▼" : "▲"}</Text>
                    </Text>
                    <Text style={styles.meaningText}>
                        {vocabWord.meaning}
                    </Text>
                </Pressable>
                {!ankiSendAvailable && (
                    <View style={{ alignItems: 'flex-end' }}>
                        {addToDeckButton}
                    </View>
                )}
            </View>
            {
                isOpen &&
                <>
                    <View style={{ marginVertical: 12 }} />
                    <View style={{ marginBottom: 8 }}>
                        {isJapaneseCard(vocabWord) ? (
                            <>
                                <Text style={styles.detailText}><Text style={styles.detailLabel}>Kanji: </Text>{vocabWord.kanji}</Text>
                                <Text style={styles.detailText}><Text style={styles.detailLabel}>Reading: </Text>{vocabWord.kana}</Text>
                            </>
                        ) : isRomanizedCard(vocabWord) ? (
                            <>
                                <Text style={styles.detailText}><Text style={styles.detailLabel}>Word: </Text>{vocabWord.word}</Text>
                                <Text style={styles.detailText}><Text style={styles.detailLabel}>Pronunciation: </Text>{vocabWord.pronunciation}</Text>
                            </>
                        ) : (
                            <Text style={styles.detailText}><Text style={styles.detailLabel}>Word: </Text>{vocabWord.word}</Text>
                        )}
                        <Text style={styles.detailText}><Text style={styles.detailLabel}>Definition: </Text>{vocabWord.meaning}</Text>
                        <Text style={styles.detailText}><Text style={styles.detailLabel}>Part of Speach: </Text>{vocabWord.partOfSpeech}</Text>
                    </View>
                    <View>
                        <Text style={styles.exampleLabel}>Example Sentence: </Text>
                        <Text style={styles.detailText}>{exampleSentence.replace("<b>", "").replace("</b>", "").replace("<span>", "").replace("</span>", "")}</Text>
                        <Text style={styles.detailText}>{vocabWord.exampleSentenceEnglish}</Text>
                    </View>
                </>
            }

            {ankiSendAvailable && (
                <View style={styles.footerRow}>
                    {addToDeckButton}
                    {
                        !isAdded ?
                            <Pressable onPress={() => handleSendToAnki(vocabWord)} style={[styles.actionButton, { flex: 1, justifyContent: 'center' }]}>
                                <Text style={styles.actionButtonText}>Send to Anki</Text>
                                <Ionicons style={{ marginLeft: 8 }} name="send-outline" size={12} color={"#fff"} />
                            </Pressable>
                            :
                            <Pressable style={[styles.doneButton, { flex: 1, justifyContent: 'center' }]}>
                                <Text style={styles.doneButtonText}>Card Added!</Text>
                                <Ionicons style={{ marginLeft: 8 }} name="checkmark-outline" size={12} color={"#C084FC"} />
                            </Pressable>
                    }
                </View>
            )}

        </View>


    )
}

const styles = StyleSheet.create({
    card: {
        marginVertical: 8,
        shadowColor: colors.purple800,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.15,
        shadowRadius: 15,
        elevation: 6,
        borderWidth: 1,
        borderColor: colors.purple500,
        padding: 12,
        backgroundColor: colors.purple950,
        borderRadius: 4,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
    },
    footerRow: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 12,
    },
    headwordLine: {
        color: colors.purple300,
        marginBottom: 4,
    },
    headword: {
        fontSize: 24,
        color: '#e9d5ff',
    },
    meaningText: {
        color: colors.purple300,
        fontSize: 14,
    },
    actionButton: {
        borderWidth: 1,
        padding: 8,
        backgroundColor: colors.purple800,
        borderColor: colors.purple600,
        borderRadius: 4,
        flexDirection: 'row',
        alignItems: 'center',
    },
    actionButtonText: {
        color: colors.white,
    },
    doneButton: {
        borderWidth: 1,
        padding: 8,
        borderColor: colors.purple800,
        backgroundColor: colors.purple950,
        borderRadius: 4,
        flexDirection: 'row',
        alignItems: 'center',
    },
    doneButtonText: {
        color: colors.purple400,
    },
    detailText: {
        color: colors.purple300,
    },
    detailLabel: {
        fontWeight: '600',
    },
    exampleLabel: {
        fontWeight: '600',
        color: colors.purple300,
        textDecorationLine: 'underline',
    },
});
