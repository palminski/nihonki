import { useCallback, useState } from "react";
import { View, Text, Pressable, TextInput, Alert, ScrollView, ActivityIndicator, Switch, Platform } from "react-native";
import { useFocusEffect, useRoute } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import ScreenWrapper from "~/components/ScreenWrapper";
import { loadDeckSetting, updateDeckSetting, loadAnkiEnabledSetting, updateAnkiEnabledSetting } from "~/utils/settingsManager";
import { loadNewCardsPerDay, updateNewCardsPerDay, DEFAULT_NEW_CARDS_PER_DAY } from "~/utils/srsManager";

export default function LanguageSettingsScreen() {
    const route = useRoute();
    const { languageId = "japanese", languageLabel = "Japanese" } =
        (route.params as { languageId?: string; languageLabel?: string } | undefined) ?? {};
    const isJapanese = languageId === "japanese";
    // AnkiDroid is Android-only and (for now) only ever wired up for Japanese.
    const showAnkiSettings = isJapanese && Platform.OS === "android";

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [settingForm, setSettingForm] = useState({
        newCardsPerDay: String(DEFAULT_NEW_CARDS_PER_DAY),
        ankiEnabled: false,
        insertDeck: "",
    });

    useFocusEffect(
        useCallback(() => {
            (async () => {
                setLoading(true);
                const newCardsPerDay = await loadNewCardsPerDay(languageId);
                const ankiEnabled = showAnkiSettings ? await loadAnkiEnabledSetting(languageId) : false;
                const insertDeck = showAnkiSettings ? await loadDeckSetting(languageId) : "";
                setSettingForm({
                    newCardsPerDay: String(newCardsPerDay),
                    ankiEnabled,
                    insertDeck: insertDeck ?? "",
                });
                setLoading(false);
            })();
        }, [languageId])
    );

    function handleFormChange(key: string, value: string | boolean) {
        setSettingForm((prev) => ({ ...prev, [key]: value }));
    }

    async function handleFormSubmit() {
        if (saving) return;
        setSaving(true);

        const parsedNewCardsPerDay = parseInt(settingForm.newCardsPerDay, 10);
        await updateNewCardsPerDay(
            languageId,
            Number.isFinite(parsedNewCardsPerDay) && parsedNewCardsPerDay >= 0
                ? parsedNewCardsPerDay
                : DEFAULT_NEW_CARDS_PER_DAY
        );

        if (showAnkiSettings) {
            await updateAnkiEnabledSetting(languageId, settingForm.ankiEnabled);
            await updateDeckSetting(languageId, settingForm.insertDeck);
        }

        setSaving(false);
        Alert.alert("Setting Saved!");
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
            <ScrollView className="p-4" contentContainerStyle={{ paddingBottom: 40 }}>
                <Text className="text-purple-300/50 text-lg mb-4">{languageLabel} Settings</Text>

                <View className="mb-3">
                    <View className="flex-row items-center">
                        <Text className="text-white text-lg mr-2">New Cards Per Day</Text>
                        <Pressable
                            onPress={() =>
                                Alert.alert(
                                    "New Cards Per Day",
                                    "The maximum number of brand-new cards introduced into your review queue each day for this language. Cards already due for review are not affected by this limit."
                                )
                            }
                            className="items-center"
                        >
                            <Ionicons name="help-circle-outline" size={18} color={"#fff"} />
                        </Pressable>
                    </View>
                    <TextInput
                        className="bg-black border mb-2 shadow-lg shadow-purple-300 border-purple-800 my-1 rounded text-purple-300 placeholder:text-purple-300/50 p-2"
                        value={settingForm.newCardsPerDay}
                        onChangeText={(text) => handleFormChange("newCardsPerDay", text.replace(/[^0-9]/g, ""))}
                        keyboardType="number-pad"
                        placeholder={String(DEFAULT_NEW_CARDS_PER_DAY)}
                    />
                </View>

                {showAnkiSettings && (
                    <>
                        <View className="mb-3">
                            <View className="flex-row items-center justify-between">
                                <View className="flex-row items-center">
                                    <Text className="text-white text-lg mr-2">Enable AnkiDroid Communication</Text>
                                    <Pressable
                                        onPress={() =>
                                            Alert.alert(
                                                "Enable AnkiDroid Communication",
                                                "When enabled, cards can be sent directly to the AnkiDroid app on your device. Requires AnkiDroid to be installed."
                                            )
                                        }
                                        className="items-center"
                                    >
                                        <Ionicons name="help-circle-outline" size={18} color={"#fff"} />
                                    </Pressable>
                                </View>
                                <Switch
                                    value={settingForm.ankiEnabled}
                                    onValueChange={(value) => handleFormChange("ankiEnabled", value)}
                                    trackColor={{ false: "#3f3f46", true: "#7e22ce" }}
                                    thumbColor={"#e6b3ff"}
                                />
                            </View>
                        </View>

                        {settingForm.ankiEnabled && (
                            <View className="mb-3">
                                <View className="flex-row items-center">
                                    <Text className="text-white text-lg mr-2">Anki Deck To Insert Into</Text>
                                    <Pressable
                                        onPress={() =>
                                            Alert.alert(
                                                "Anki Deck To Insert Into",
                                                "When send to anki is clicked this is the deck new cards will be inserted into. If no deck with the given name exists a new one will be made. If no text is entered here it will default to Umeboshi"
                                            )
                                        }
                                        className="items-center"
                                    >
                                        <Ionicons name="help-circle-outline" size={18} color={"#fff"} />
                                    </Pressable>
                                </View>
                                <TextInput
                                    className="bg-black border mb-2 shadow-lg shadow-purple-300 border-purple-800 my-1 rounded text-purple-300 placeholder:text-purple-300/50 p-2"
                                    value={settingForm.insertDeck}
                                    onChangeText={(text) => handleFormChange("insertDeck", text)}
                                    placeholder="Deck Name (Defaults to Umeboshi)"
                                />
                            </View>
                        )}
                    </>
                )}

                <Pressable
                    onPress={handleFormSubmit}
                    disabled={saving}
                    className="border p-3 bg-purple-800 border-purple-600 rounded items-center mt-2"
                >
                    <Text className="text-white text-lg">{saving ? "Saving..." : "Save Settings"}</Text>
                </Pressable>
            </ScrollView>
        </ScreenWrapper>
    );
}
