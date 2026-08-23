import { View, Text, Pressable, NativeModules, Alert } from "react-native";
import { useState } from "react";
import { useEffect, useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { loadDeckSetting, loadAnkiEnabledSetting } from "~/utils/settingsManager";
import { addCardToReviewDeck, isCardInReviewDeck } from "~/utils/deckManager";
import { VocabCard as VocabCardData, isJapaneseCard, isRomanizedCard } from "~/utils/cardTypes";

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
        if (!isJapaneseCard(cardObject)) return;
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

    return (
        <View className="my-2 shadow-lg shadow-purple-800 border border-purple-500 p-3 bg-purple-950  rounded">
            <View className="flex flex-row justify-between items-end ">
                <Pressable onPress={() => setIsOpen(!isOpen)} className="flex-1 mr-2">
                    <Text className="text-purple-300 mb-1">
                        <Text className="text-2xl text-purple-200">{headword}</Text> - <Text className="text text-purple-200">[ {subheading} ] {isOpen ? "▼" : "▲"}</Text>
                    </Text>
                    <Text className=" text-purple-300 text-sm">
                        {vocabWord.meaning}
                    </Text>
                </Pressable>
                <View className="items-end">
                    {
                        !isInDeck ?
                            <Pressable onPress={() => handleAddToDeck(vocabWord)} className="border p-2 bg-purple-800 border-purple-600 rounded flex-row items-center">
                                <Text className=" text-white">Add to Deck</Text>
                                <Ionicons className="ml-2" name="albums-outline" size={12} color={"#fff"} />
                            </Pressable>
                            :
                            <Pressable className="border p-2 border-purple-800 bg-purple-950 rounded flex-row items-center">
                                <Text className=" text-purple-400">In Deck!</Text>
                                <Ionicons className="ml-2" name="checkmark-outline" size={12} color={"#C084FC"} />
                            </Pressable>
                    }
                    {
                        isAnkiEnabled && isJapanese &&
                        <View className="mt-2">
                            {
                                !isAdded ?
                                    <Pressable onPress={() => handleSendToAnki(vocabWord)} className="border p-2 bg-purple-800 border-purple-600 rounded flex-row items-center">
                                        <Text className=" text-white">Send to Anki</Text>
                                        <Ionicons className="ml-2" name="send-outline" size={12} color={"#fff"} />
                                    </Pressable>
                                    :
                                    <Pressable className="border p-2 border-purple-800 bg-purple-950 rounded flex-row items-center">
                                        <Text className=" text-purple-400">Card Added!</Text>
                                        <Ionicons className="ml-2" name="checkmark-outline" size={12} color={"#C084FC"} />
                                    </Pressable>
                            }
                        </View>
                    }
                </View>
            </View>
            {
                isOpen &&
                <>
                    <View
                        className="my-3"
                    />
                    <View className="mb-2">
                        {isJapaneseCard(vocabWord) ? (
                            <>
                                <Text className="text-purple-300"><Text className="font-semibold">Kanji: </Text>{vocabWord.kanji}</Text>
                                <Text className="text-purple-300"><Text className="font-semibold">Reading: </Text>{vocabWord.kana}</Text>
                            </>
                        ) : isRomanizedCard(vocabWord) ? (
                            <>
                                <Text className="text-purple-300"><Text className="font-semibold">Word: </Text>{vocabWord.word}</Text>
                                <Text className="text-purple-300"><Text className="font-semibold">Pronunciation: </Text>{vocabWord.pronunciation}</Text>
                            </>
                        ) : (
                            <Text className="text-purple-300"><Text className="font-semibold">Word: </Text>{vocabWord.word}</Text>
                        )}
                        <Text className="text-purple-300"><Text className="font-semibold">Definition: </Text>{vocabWord.meaning}</Text>
                        <Text className="text-purple-300"><Text className="font-semibold">Part of Speach: </Text>{vocabWord.partOfSpeech}</Text>
                    </View>
                    <View className="">
                        <Text className="font-semibold text-purple-300 underline">Example Sentence: </Text>
                        <Text className="text-purple-300">{exampleSentence.replace("<b>", "").replace("</b>", "").replace("<span>", "").replace("</span>", "")}</Text>
                        <Text className="text-purple-300">{vocabWord.exampleSentenceEnglish}</Text>
                    </View>
                </>
            }

        </View>


    )
}
