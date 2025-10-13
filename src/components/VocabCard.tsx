import { View, Text, Pressable, NativeModules } from "react-native";
import LinearGradient from "react-native-linear-gradient";
import { ReactNode, useState } from "react";
import { StyleSheet } from "react-native";
import { Animated, Easing } from "react-native";
import { useEffect, useRef } from "react";
import { Ionicons } from "@expo/vector-icons";
import { loadDeckSetting, loadAPIKeySetting } from "~/utils/settingsManager";

interface VocabWord {
    kanji: string
    kana: string
    meaning: string
    furigana: string
    partOfSpeech: string
    exampleSentenceKanji: string
    exampleSentenceFurigana: string
    exampleSentenceKana: string
    exampleSentenceEnglish: string
}

interface VocabCardProps {
    vocabWord: VocabWord
    hasBeenSent?: boolean
}



export default function VocabCard({ vocabWord, hasBeenSent = false }: VocabCardProps) {

    const { AnkiModule } = NativeModules;

    const [isAdded, setIsAdded] = useState(hasBeenSent);
    const [isOpen, setIsOpen] = useState(false)

    async function handleSendToAnki(cardObject: VocabWord) {
        const deckToInsertInto = await loadDeckSetting();
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
            deckToInsertInto ? deckToInsertInto : "Nihonki"
        );
        setIsAdded(true)
    }

    useEffect(() => {
        setIsAdded(hasBeenSent);
    }, [hasBeenSent]);

    return (
        <View className="my-2 shadow-lg shadow-purple-800 border border-purple-500 p-3 bg-purple-950  rounded">
            <View className="flex flex-row justify-between items-end ">
                <Pressable onPress={() => setIsOpen(!isOpen)} className="flex-1 mr-2">
                    <Text className="text-purple-300 mb-1">
                        <Text className="text-2xl text-purple-200">{vocabWord.kanji}</Text> - <Text className="text text-purple-200">[ {vocabWord.kana} ] {isOpen ? "▼" : "▲"}</Text>
                    </Text>
                    <Text className=" text-purple-300 text-sm">
                        {vocabWord.meaning}
                    </Text>
                </Pressable>
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
            {
                isOpen &&
                <>
                    <View
                        className="my-3"
                    />
                    <View className="mb-2">
                        <Text className="text-purple-300"><Text className="font-semibold">Kanji: </Text>{vocabWord.kanji}</Text>
                        <Text className="text-purple-300"><Text className="font-semibold">Reading: </Text>{vocabWord.kana}</Text>
                        <Text className="text-purple-300"><Text className="font-semibold">Definition: </Text>{vocabWord.meaning}</Text>
                        <Text className="text-purple-300"><Text className="font-semibold">Part of Speach: </Text>{vocabWord.partOfSpeech}</Text>
                    </View>
                    <View className="">
                        <Text className="font-semibold text-purple-300 underline">Example Sentence: </Text>
                        <Text className="text-purple-300">{vocabWord.exampleSentenceKanji.replace("<b>", "").replace("</b>", "").replace("<span>", "").replace("</span>", "")}</Text>
                        <Text className="text-purple-300">{vocabWord.exampleSentenceEnglish}</Text>
                    </View>
                </>
            }

        </View>


    )
}