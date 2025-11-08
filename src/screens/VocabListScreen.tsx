
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
    const [loading, setLoading] = useState(true);

    useFocusEffect(
        useCallback(() => {
            (async () => {
                setLoading(true);
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
                setLoading(false);
            })();
        }, [])
    )

    return (
        <ScreenWrapper>
            <View className="flex-1 ">

                <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={{ paddingBottom: 20 }}
                    showsVerticalScrollIndicator={false}
                    className="p-4"
                >
                    {
                        loading ?
                            <View>
                                <Text className="mt-6 text-xl font-semibold text-purple-300/50 mx-auto">Loading</Text>
                            </View>
                            :
                            <>
                                {/* Kanji List */}
                                {Object.entries(vocabList).toReversed().map(([keyName, kanji], keyIndex) => {

                                    if (!kanji || !kanji.kanji) return null;
                                    return (
                                        <View key={keyName}>
                                            <VocabCard vocabWord={kanji} hasBeenSent={addedKanjiMap[kanji.kanji + "_" + kanji.kana]} />
                                        </View>
                                    )
                                })}
                            </>
                    }

                </ScrollView>

                <LinearGradient
                    style={{ position: 'absolute', bottom: 0, width: "100%", height: 50 }}
                    colors={['#52525200', '#000000']}
                    pointerEvents={'none'}
                />
            </View>


        </ScreenWrapper>
    )
}