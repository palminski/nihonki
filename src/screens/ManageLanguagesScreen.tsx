import { useCallback, useState } from "react";
import { View, Text, Switch, ScrollView, ActivityIndicator } from "react-native";
import ScreenWrapper from "~/components/ScreenWrapper";
import { useFocusEffect } from "@react-navigation/native";
import { LANGUAGE_CATALOG, loadEnabledLanguages, updateEnabledLanguages } from "~/utils/languageManager";

export default function ManageLanguagesScreen() {
    const [enabledIds, setEnabledIds] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);

    useFocusEffect(
        useCallback(() => {
            (async () => {
                const ids = await loadEnabledLanguages();
                setEnabledIds(ids);
                setLoading(false);
            })();
        }, [])
    );

    async function handleToggle(id: string, value: boolean) {
        const nextIds = value ? [...enabledIds, id] : enabledIds.filter((existingId) => existingId !== id);
        setEnabledIds(nextIds);
        await updateEnabledLanguages(nextIds);
    }

    if (loading) {
        return (
            <ScreenWrapper>
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size={50} color={"#A855F7"} />
                </View>
            </ScreenWrapper>
        );
    }

    return (
        <ScreenWrapper>
            <ScrollView className="flex-1 p-4" contentContainerStyle={{ paddingBottom: 20 }}>
                <Text className="text-purple-300/50 text-base mb-4">
                    Toggle which languages show up on your language select screen. Turning a language off will
                    not delete any cards you've already made for it.
                </Text>
                {LANGUAGE_CATALOG.map((language) => (
                    <View
                        key={language.id}
                        className="flex-row items-center justify-between bg-black rounded border mb-3 p-4 border-purple-800"
                    >
                        <View>
                            <Text className="text-white text-lg font-semibold">{language.label}</Text>
                            <Text className="text-purple-300/70 text-sm">{language.nativeLabel}</Text>
                        </View>
                        <Switch
                            value={enabledIds.includes(language.id)}
                            onValueChange={(value) => handleToggle(language.id, value)}
                            trackColor={{ false: "#3f3f46", true: "#7e22ce" }}
                            thumbColor="#e6b3ff"
                        />
                    </View>
                ))}
            </ScrollView>
        </ScreenWrapper>
    );
}
