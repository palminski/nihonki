import { useCallback, useState } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import ScreenWrapper from "~/components/ScreenWrapper";
import { NavigationProp, useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { LANGUAGE_CATALOG, Language, loadEnabledLanguages } from "~/utils/languageManager";
import { getDueCounts, DueCounts } from "~/utils/srsManager";

const EMPTY_DUE_COUNTS: DueCounts = { newCount: 0, learningCount: 0, reviewCount: 0 };

export default function LanguageSelectScreen({ navigation }: { navigation: NavigationProp<any> }) {
    const [enabledLanguages, setEnabledLanguages] = useState<Language[]>(
        LANGUAGE_CATALOG.filter((language) => language.id === "japanese")
    );
    const [dueCounts, setDueCounts] = useState<Record<string, DueCounts>>({});

    useFocusEffect(
        useCallback(() => {
            (async () => {
                const enabledIds = await loadEnabledLanguages();
                const languages = LANGUAGE_CATALOG.filter((language) => enabledIds.includes(language.id));
                setEnabledLanguages(languages);

                const counts: Record<string, DueCounts> = {};
                await Promise.all(
                    languages.map(async (language) => {
                        counts[language.id] = await getDueCounts(language.id);
                    })
                );
                setDueCounts(counts);
            })();
        }, [])
    );

    return (
        <ScreenWrapper>
            <View className="flex-1 p-4">
                <Text className="text-purple-300/50 text-lg mb-4">Select a language to study</Text>

                <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
                    {enabledLanguages.length === 0 && (
                        <Text className="text-purple-300/50 text-base text-center mt-6">
                            No languages added yet.{"\n"}Tap "Add Language" below to get started.
                        </Text>
                    )}
                    {enabledLanguages.map((language) => (
                        <Pressable
                            key={language.id}
                            onPress={() =>
                                navigation.navigate("Japanese", {
                                    languageId: language.id,
                                    languageLabel: language.label,
                                })
                            }
                            className="flex-row items-center bg-black rounded border mb-3 p-4 shadow-lg shadow-purple-300 border-purple-800"
                        >
                            <Ionicons name={language.icon} size={32} color="#e6b3ff" />
                            <View className="ml-4 flex-1">
                                <Text className="text-white text-xl font-semibold">{language.label}</Text>
                                <Text className="text-purple-300/70 text-base">{language.nativeLabel}</Text>
                            </View>
                            <View className="flex-row items-center">
                                <Text className="text-blue-400 font-semibold text-sm">
                                    {(dueCounts[language.id] ?? EMPTY_DUE_COUNTS).newCount}
                                </Text>
                                <Text className="text-purple-300/30 mx-1">/</Text>
                                <Text className="text-red-400 font-semibold text-sm">
                                    {(dueCounts[language.id] ?? EMPTY_DUE_COUNTS).learningCount}
                                </Text>
                                <Text className="text-purple-300/30 mx-1">/</Text>
                                <Text className="text-green-400 font-semibold text-sm">
                                    {(dueCounts[language.id] ?? EMPTY_DUE_COUNTS).reviewCount}
                                </Text>
                            </View>
                        </Pressable>
                    ))}
                </ScrollView>

                <Pressable
                    onPress={() => navigation.navigate("Manage Languages")}
                    className="flex-row items-center justify-center bg-black rounded border mt-3 p-4 border-purple-800"
                >
                    <Ionicons name="add" size={22} color="#e6b3ff" />
                    <Text className="text-purple-300 text-base font-semibold ml-2">Add Language</Text>
                </Pressable>
            </View>
        </ScreenWrapper>
    );
}
