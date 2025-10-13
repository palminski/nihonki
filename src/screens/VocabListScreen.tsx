
import { View, Text, Pressable, Alert, NativeModules, TextInput, ScrollView } from "react-native";
import OpenAI from "openai";

import ScreenWrapper from "~/components/ScreenWrapper";
import { useCallback, useState } from "react";
import { loadDeckSetting, loadAPIKeySetting } from "~/utils/settingsManager";
import { Ionicons } from "@expo/vector-icons";

import LinearGradient from "react-native-linear-gradient";
import { useFocusEffect } from "@react-navigation/native";
import { loadVocabList } from "~/utils/asyncStorageManager";
import VocabCard from "~/components/VocabCard";

const { AnkiModule } = NativeModules;


export default function VocabListScreen() {


    const [vocabList, setvocabList] = useState<Record<string, any>>({});
    const [addedKanjiMap, setAddedKanjiMap] = useState<Record<string, boolean>>({});

    useFocusEffect(
        useCallback(() => {
            (async () => {
                const fetchedVocabList = await loadVocabList();
                setvocabList(fetchedVocabList);

                let keysAlreadyInAnkiString = await AnkiModule.getDuplicateNotes("", Object.keys(fetchedVocabList));
                let keysAlreadyInAnki = JSON.parse(keysAlreadyInAnkiString);
                let mapToMerge = {};
                for (let index = 0; index < keysAlreadyInAnki.length; index++) {
                    const key = keysAlreadyInAnki[index];
                    mapToMerge = {
                        ...mapToMerge,
                        [key]: true
                    }
                }
                setAddedKanjiMap(mapToMerge);
            })();
        }, [])
    )

    async function handleSendToAnki(cardObject: any) {
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
            deckToInsertInto ? deckToInsertInto : "DEV DECK"
        );
        setAddedKanjiMap(map => ({
            ...map,
            [cardObject.kanji]: true,
        }))

    }


    return (
        <ScreenWrapper>
            <View className="flex-1 ">

                <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={{ paddingBottom: 20 }}
                    showsVerticalScrollIndicator={false}
                    className="p-4"
                >

                    {/* Kanji List */}
                    {Object.entries(vocabList).map(([keyName, kanji], keyIndex) => {

                        if (!kanji || !kanji.kanji) return null;
                        return (
                            <View key={keyName}>
                            <VocabCard vocabWord={kanji} hasBeenSent={addedKanjiMap[kanji.kanji]} />

                            </View>
                        )
                    })}
                    
                </ScrollView>
                
                <LinearGradient
                    style={{ position: 'absolute', bottom: 0, width: "100%", height: 50 }}
                    colors={['#52525200', '#050505']}
                    pointerEvents={'none'}
                />
            </View>


        </ScreenWrapper>
    )
}