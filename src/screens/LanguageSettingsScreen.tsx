import { useCallback, useState } from "react";
import { View, Text, Pressable, TextInput, Alert, ScrollView, ActivityIndicator, Switch, Platform, StyleSheet } from "react-native";
import { useFocusEffect, useRoute } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import ScreenWrapper from "~/components/ScreenWrapper";
import { loadDeckSetting, updateDeckSetting, loadAnkiEnabledSetting, updateAnkiEnabledSetting } from "~/utils/settingsManager";
import { loadNewCardsPerDay, updateNewCardsPerDay, DEFAULT_NEW_CARDS_PER_DAY } from "~/utils/srsManager";
import { colors, withOpacity } from "~/utils/colors";

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
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                    <ActivityIndicator size={50} color={"#A855F7"} />
                </View>
            </ScreenWrapper>
        );
    }

    return (
        <ScreenWrapper>
            <ScrollView style={{ padding: 16 }} contentContainerStyle={{ paddingBottom: 40 }}>
                <Text style={styles.heading}>{languageLabel} Settings</Text>

                <View style={{ marginBottom: 12 }}>
                    <View style={styles.row}>
                        <Text style={styles.label}>New Cards Per Day</Text>
                        <Pressable
                            onPress={() =>
                                Alert.alert(
                                    "New Cards Per Day",
                                    "The maximum number of brand-new cards introduced into your review queue each day for this language. Cards already due for review are not affected by this limit."
                                )
                            }
                            style={{ alignItems: 'center' }}
                        >
                            <Ionicons name="help-circle-outline" size={18} color={"#fff"} />
                        </Pressable>
                    </View>
                    <TextInput
                        style={styles.textInput}
                        placeholderTextColor={withOpacity(colors.purple300, 0.5)}
                        value={settingForm.newCardsPerDay}
                        onChangeText={(text) => handleFormChange("newCardsPerDay", text.replace(/[^0-9]/g, ""))}
                        keyboardType="number-pad"
                        placeholder={String(DEFAULT_NEW_CARDS_PER_DAY)}
                    />
                </View>

                {showAnkiSettings && (
                    <>
                        <View style={{ marginBottom: 12 }}>
                            <View style={[styles.row, { justifyContent: 'space-between' }]}>
                                <View style={styles.row}>
                                    <Text style={styles.label}>Enable AnkiDroid Communication</Text>
                                    <Pressable
                                        onPress={() =>
                                            Alert.alert(
                                                "Enable AnkiDroid Communication",
                                                "When enabled, cards can be sent directly to the AnkiDroid app on your device. Requires AnkiDroid to be installed."
                                            )
                                        }
                                        style={{ alignItems: 'center' }}
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
                            <View style={{ marginBottom: 12 }}>
                                <View style={styles.row}>
                                    <Text style={styles.label}>Anki Deck To Insert Into</Text>
                                    <Pressable
                                        onPress={() =>
                                            Alert.alert(
                                                "Anki Deck To Insert Into",
                                                "When send to anki is clicked this is the deck new cards will be inserted into. If no deck with the given name exists a new one will be made. If no text is entered here it will default to Umeboshi"
                                            )
                                        }
                                        style={{ alignItems: 'center' }}
                                    >
                                        <Ionicons name="help-circle-outline" size={18} color={"#fff"} />
                                    </Pressable>
                                </View>
                                <TextInput
                                    style={styles.textInput}
                                    placeholderTextColor={withOpacity(colors.purple300, 0.5)}
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
                    style={styles.saveButton}
                >
                    <Text style={styles.saveButtonText}>{saving ? "Saving..." : "Save Settings"}</Text>
                </Pressable>
            </ScrollView>
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    heading: {
        color: withOpacity(colors.purple300, 0.5),
        fontSize: 18,
        marginBottom: 16,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    label: {
        color: colors.white,
        fontSize: 18,
        marginRight: 8,
    },
    textInput: {
        backgroundColor: colors.black,
        borderWidth: 1,
        borderColor: colors.purple800,
        marginVertical: 4,
        marginBottom: 8,
        borderRadius: 4,
        color: colors.purple300,
        padding: 8,
        shadowColor: colors.purple300,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 15,
        elevation: 4,
    },
    saveButton: {
        borderWidth: 1,
        padding: 12,
        backgroundColor: colors.purple800,
        borderColor: colors.purple600,
        borderRadius: 4,
        alignItems: 'center',
        marginTop: 8,
    },
    saveButtonText: {
        color: colors.white,
        fontSize: 18,
    },
});
